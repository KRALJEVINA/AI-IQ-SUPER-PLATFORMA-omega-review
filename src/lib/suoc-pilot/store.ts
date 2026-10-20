import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { PILOT_LIMITS, validatePlan, type PilotRun, type StepState } from './plan';
import type { PetljaResult } from '../petlje/types';
import { isCompleteVrhResult } from '../spaja-ultra-core/vrh';

type Event = { seq: number; run_id: string; time: string; kind: string; detail: string; state_hash: string; previous_hash: string; hash: string };
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const eventHash = (e: Omit<Event, 'hash'>) => digest(JSON.stringify([e.seq, e.run_id, e.time, e.kind, e.detail, e.state_hash, e.previous_hash]));
const terminal = new Set(['succeeded', 'failed', 'interrupted', 'canceled']);

/** One local service owns this database. OS SQLite locks release even on SIGKILL. */
export class PilotStore {
  private db!: DatabaseSync;
  private readonly lock: DatabaseSync;

  constructor(path: string) {
    const filename = resolve(path);
    mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
    this.lock = new DatabaseSync(`${filename}.lock`, { timeout: 0 });
    try { this.lock.exec('BEGIN EXCLUSIVE'); }
    catch { this.lock.close(); throw new Error('Pilot baza je već otvorena u drugom procesu.'); }
    try {
      this.db = new DatabaseSync(filename, { timeout: 1000 });
      chmodSync(filename, 0o600);
      chmodSync(`${filename}.lock`, 0o600);
      this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;
        CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, document TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), time TEXT NOT NULL, kind TEXT NOT NULL, detail TEXT NOT NULL, state_hash TEXT NOT NULL, previous_hash TEXT NOT NULL, hash TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS event_run ON events(run_id, seq);`);
      if (this.db.prepare('PRAGMA quick_check').get()?.quick_check !== 'ok') throw new Error('SQLite provera integriteta nije prošla.');
      for (const run of this.list()) {
        if (run.status === 'running' || run.steps.some(step => step.status === 'running')) {
          for (const step of run.steps) if (step.status === 'running') { step.status = 'interrupted'; step.error = 'Proces je prekinut pre potvrde rezultata.'; }
          run.status = 'interrupted';
          this.save(run, 'recovered', 'Potreban je izričit retry; uspešni koraci ostaju sačuvani.');
        }
      }
    } catch (error) {
      this.db?.close(); this.lock.close(); throw error;
    }
  }

  private transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const value = fn(); this.db.exec('COMMIT'); return value; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  events(id: string): Event[] {
    return this.db.prepare('SELECT * FROM events WHERE run_id=? ORDER BY seq').all(id) as unknown as Event[];
  }

  get(id: string): PilotRun {
    const row = this.db.prepare('SELECT document FROM runs WHERE id=?').get(id);
    if (!row) throw new Error('Zadatak nije pronađen.');
    const document = String(row.document);
    const events = this.events(id);
    let previous = '';
    for (const event of events) {
      if (event.previous_hash !== previous || event.hash !== eventHash(event)) throw new Error('Revizijski lanac nije ispravan.');
      previous = event.hash;
    }
    if (!events.length || events.at(-1)!.state_hash !== digest(document)) throw new Error('Stanje zadatka ne odgovara revizijskom zapisu.');
    return JSON.parse(document) as PilotRun;
  }

  list(): PilotRun[] {
    return this.db.prepare('SELECT id FROM runs ORDER BY rowid DESC').all().map(row => this.get(String(row.id)));
  }

  private save(run: PilotRun, kind: string, detail: string): void {
    this.transaction(() => {
      const exists = this.db.prepare('SELECT id FROM runs WHERE id=?').get(run.id);
      if (exists) this.get(run.id); // Refuse to extend a corrupted state/history.
      run.updatedAt = new Date().toISOString();
      const document = JSON.stringify(run);
      const previous = this.db.prepare('SELECT hash FROM events WHERE run_id=? ORDER BY seq DESC LIMIT 1').get(run.id);
      const seq = Number(this.db.prepare('SELECT COALESCE(MAX(seq),0)+1 AS next FROM events').get()!.next);
      const event = { seq, run_id: run.id, time: run.updatedAt, kind, detail, state_hash: digest(document), previous_hash: String(previous?.hash ?? '') };
      this.db.prepare('INSERT INTO runs(id,document) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document').run(run.id, document);
      this.db.prepare('INSERT INTO events VALUES(?,?,?,?,?,?,?,?)').run(event.seq, event.run_id, event.time, event.kind, event.detail, event.state_hash, event.previous_hash, eventHash(event));
    });
  }

  create(value: unknown): PilotRun {
    const plan = validatePlan(value);
    if (Number(this.db.prepare('SELECT COUNT(*) AS count FROM runs').get()!.count) >= PILOT_LIMITS.runs) throw new Error('Pilot je dostigao ograničenje od 100 zadataka.');
    const now = new Date().toISOString();
    const run: PilotRun = { id: randomUUID(), name: plan.name, createdAt: now, updatedAt: now, status: 'paused', steps: plan.steps.map(step => ({ ...step, status: 'queued', attempts: 0 })) };
    this.save(run, 'created', 'Sačuvan plan; pokretanje zahteva Resume.');
    return this.get(run.id);
  }

  control(id: string, action: 'pause' | 'resume' | 'cancel' | 'retry'): PilotRun {
    const run = this.get(id);
    if (action === 'retry') {
      if (!['failed', 'interrupted'].includes(run.status)) throw new Error('Retry je moguć samo za neuspešan ili prekinut zadatak.');
      for (const step of run.steps) if (['failed', 'interrupted'].includes(step.status)) {
        if (step.attempts >= PILOT_LIMITS.attempts) throw new Error('Dostignut je limit od 3 pokušaja.');
        step.status = 'queued'; delete step.error; delete step.result;
      }
      run.status = 'paused'; // Never auto-execute a retry.
    } else {
      if (terminal.has(run.status)) throw new Error('Završeni zadatak se ne menja ovom komandom.');
      if (run.steps.some(step => step.status === 'running')) throw new Error('Sačekajte granicu koraka.');
      if (action === 'cancel') {
        run.status = 'canceled';
        run.steps.forEach(step => { if (step.status === 'queued') step.status = 'canceled'; });
      } else run.status = action === 'pause' ? 'paused' : 'queued';
    }
    if (this.events(id).length >= 500) throw new Error('Dostignut je limit od 500 događaja; napravite novi zadatak.');
    this.save(run, action, 'Komanda lokalnog operatera.');
    return this.get(id);
  }

  claim(): { run: PilotRun; step: StepState } | undefined {
    // Oldest first, one step at a time; the service holds the exclusive ownership lock.
    for (const run of this.list().reverse()) {
      if (run.status !== 'queued') continue;
      const step = run.steps.find(step => step.status === 'queued' && step.dependsOn.every(id => run.steps.find(item => item.id === id)?.status === 'succeeded'));
      if (!step) throw new Error('Nema spremnog koraka u aktivnom zadatku.');
      step.status = 'running'; step.attempts++; run.status = 'running';
      this.save(run, 'claimed', step.id);
      return { run, step };
    }
    return undefined;
  }

  finish(id: string, stepId: string, result?: PetljaResult, error?: string): PilotRun {
    const run = this.get(id);
    const step = run.steps.find(step => step.id === stepId);
    if (!step || step.status !== 'running' || run.status !== 'running') throw new Error('Rezultat nema aktivan korak.');
    if (result && Buffer.byteLength(JSON.stringify(result)) > PILOT_LIMITS.resultBytes) { result = undefined; error = 'Rezultat prelazi 256 KiB.'; }
    const success = !error && !!result && isCompleteVrhResult(result);
    step.status = success ? 'succeeded' : 'failed';
    if (result) step.result = result;
    if (!success) step.error = (error || 'VRH nije završio uspešno.').slice(0, 500);
    run.status = success ? (run.steps.every(step => step.status === 'succeeded') ? 'succeeded' : 'queued') : 'failed';
    this.save(run, step.status, step.id);
    return this.get(id);
  }

  close(): void { this.db.close(); this.lock.close(); }
}
