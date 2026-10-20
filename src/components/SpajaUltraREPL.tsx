'use client';

import { useMemo, useState } from 'react';
import { createRuntime, executeSpajaUltra, SUOC_VRH_EXAMPLE, isCompleteVrhResult, type ASTNode, type AuditRecord, type BuildArtifact, type VrhResult } from '@/lib/spaja-ultra-core';
import Button from '@/components/Button';

const DEFAULT_CODE = `AKTIVIRAJ: jezgro
IZGRADI: demo
POKRENI: demo`;

const DEFAULT_CTX = {
  roles: ['user'],
  korisnik_ima_pravo: true,
  vreme: new Date().getHours(),
  programi: {
    demo: 'DO: ECHO Sistem se pokreće...\nASSERT: korisnik_ima_pravo == true\nPRIV: user\nDO: ECHO Sesija završena uspešno.',
  },
};

export default function SpajaUltraREPL() {
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [ctxJson, setCtxJson] = useState<string>(() => JSON.stringify(DEFAULT_CTX, null, 2));
  const [output, setOutput] = useState<string[]>([]);
  const [auditLog, setAuditLog] = useState<AuditRecord[]>([]);
  const [error, setError] = useState<string>('');
  const [latestAst, setLatestAst] = useState<ASTNode[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [builds, setBuilds] = useState<BuildArtifact[]>([]);
  const [vrhResult, setVrhResult] = useState<VrhResult>();

  const astJson = useMemo(() => JSON.stringify(latestAst, null, 2), [latestAst]);

  const runCode = async () => {
    setIsRunning(true);
    setError('');
    setLatestAst([]);
    setBuilds([]);
    setVrhResult(undefined);
    const runtime = createRuntime();
    const executionOutput: string[] = [];

    try {
      const parsedValue = JSON.parse(ctxJson) as unknown;
      if (typeof parsedValue !== 'object' || parsedValue === null || Array.isArray(parsedValue)) {
        throw new Error('Runtime ctx mora biti JSON objekat.');
      }

      const parsedCtx = parsedValue as Record<string, unknown>;

      const executionCtx = {
        ...parsedCtx,
        onOutput: (line: string) => executionOutput.push(line),
      };

      const ast = await executeSpajaUltra(code, runtime, executionCtx);
      setLatestAst(ast);

      setOutput(executionOutput.length > 0 ? executionOutput : ['✅ Izvršavanje završeno bez output poruka.']);
      setAuditLog(runtime.getAuditLog());
    } catch (e) {
      setOutput(executionOutput);
      setAuditLog(runtime.getAuditLog());
      setError(e instanceof Error ? e.message : 'Nepoznata greška pri izvršavanju.');
    } finally {
      setBuilds(runtime.getBuilds());
      setVrhResult(runtime.getLastVrhResult());
      setIsRunning(false);
    }
  };

  const clearAll = () => {
    setOutput([]);
    setAuditLog([]);
    setError('');
    setLatestAst([]);
    setBuilds([]);
    setVrhResult(undefined);
  };

  const copyAst = async () => {
    try {
      await navigator.clipboard.writeText(astJson);
      setError('');
    } catch {
      setError('Neuspelo kopiranje u clipboard.');
    }
  };

  const exportAudit = () => {
    const blob = new Blob([JSON.stringify(auditLog, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `spaja-audit-${Date.now()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 rounded-2xl border border-gray-800 bg-black p-6 text-gray-100 shadow-xl shadow-black/50">
      <p className="text-sm text-gray-300">
        Lokalna DSL sesija: AKTIVIRAJ: jezgro → IZGRADI: ime → POKRENI: ime.
        Program unesite u ctx.programi. Svako pokretanje otvara novu sesiju.
        IZGRADI priprema DSL, a DO ispisuje tekst. Ove komande ne objavljuju aplikaciju.
        Uloge u JSON polju služe lokalnoj proveri, ne prijavi na server.
        VRH poziva postojeće numeričke petlje lokalno; rezultat se ne čuva posle osvežavanja.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label htmlFor="spaja-ultra-kod" className="mb-2 block text-sm font-medium text-gray-300">SpajaUltra kod</label>
          <textarea
            id="spaja-ultra-kod"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            rows={14}
            className="w-full rounded-xl border border-gray-700 bg-gray-950 p-3 font-mono text-sm text-green-300 focus:border-[#e84393] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="spaja-ultra-ctx" className="mb-2 block text-sm font-medium text-gray-300">Runtime ctx (JSON)</label>
          <textarea
            id="spaja-ultra-ctx"
            value={ctxJson}
            onChange={(event) => setCtxJson(event.target.value)}
            rows={14}
            className="w-full rounded-xl border border-gray-700 bg-gray-950 p-3 font-mono text-sm text-gray-200 focus:border-[#e84393] focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={isRunning}
          onClick={() => { clearAll(); setCode(SUOC_VRH_EXAMPLE); }}
          className="rounded-lg border border-sky-700 bg-sky-950 px-4 py-2 text-sm text-sky-200 disabled:opacity-50"
        >
          Učitaj VRH primer
        </Button>
        <Button
          type="button"
          onClick={runCode}
          disabled={isRunning}
          className="rounded-lg bg-[#e84393] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#ff5ca9] disabled:cursor-not-allowed disabled:opacity-60"
        >
          ▶ Pokreni
        </Button>
        <Button
          type="button"
          onClick={clearAll}
          disabled={isRunning}
          className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-300 transition hover:border-gray-500 hover:text-white"
        >
          🗑 Obriši
        </Button>
        <Button
          type="button"
          onClick={copyAst}
          className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-300 transition hover:border-gray-500 hover:text-white"
        >
          📋 Kopiraj AST
        </Button>
        <Button
          type="button"
          onClick={exportAudit}
          disabled={auditLog.length === 0}
          className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-300 transition hover:border-gray-500 hover:text-white disabled:opacity-50"
        >
          📥 Eksport JSON
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-700 bg-red-950/60 px-4 py-3 text-sm text-red-300">
          ❌ {error}
        </div>
      )}

      {vrhResult && (
        <section aria-label="Poslednji VRH rezultat" className="rounded-xl border border-gray-800 bg-gray-950 p-4">
          <h3 className="text-sm font-semibold text-gray-200">Poslednji VRH rezultat · {vrhResult.kind}</h3>
          <p role="status" className={`mt-2 text-sm ${isCompleteVrhResult(vrhResult) ? 'text-green-300' : 'text-amber-300'}`}>
            {isCompleteVrhResult(vrhResult) ? '🟢 Završeno' : '🟡 Nepotpuno ili neuspešno'} · {vrhResult.reason}
          </p>
          <details className="mt-3 text-sm">
            <summary>Prikaži ceo rezultat i trag izvršavanja</summary>
            <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(vrhResult, null, 2)}</pre>
          </details>
        </section>
      )}

      {builds.length > 0 && (
        <section className="rounded-xl border border-gray-800 bg-gray-950 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-200">Pripremljeni DSL programi</h3>
          {builds.map((build) => (
            <details key={build.name} className="mb-2">
              <summary>{build.name} · {build.commandCount} naredbi</summary>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs">{build.javascript}</pre>
            </details>
          ))}
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-800 bg-gray-950 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-200">Output</h3>
          <div className="max-h-64 space-y-2 overflow-y-auto text-sm">
            {output.length === 0 ? (
              <p className="text-gray-500">Nema output-a.</p>
            ) : (
              output.map((line, index) => (
                <p key={index} className="text-green-400">{line}</p>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-gray-800 bg-gray-950 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-200">Audit Log</h3>
          <div className="max-h-64 space-y-2 overflow-y-auto text-xs">
            {auditLog.length === 0 ? (
              <p className="text-gray-500">Audit log je prazan.</p>
            ) : (
              auditLog.map((record) => (
                <div
                  key={record.id}
                  className={`rounded-lg border px-3 py-2 ${record.status === 'ok'
                    ? 'border-green-800 bg-green-950/30 text-green-300'
                    : 'border-red-800 bg-red-950/30 text-red-300'}`}
                >
                  <p><strong>{record.cmd}</strong>: {record.arg || '—'}</p>
                  <p>{record.timestamp}</p>
                  <p>Status: {record.status}{record.duration !== undefined ? ` · ${record.duration}ms` : ''}</p>
                  {record.message && <p>Poruka: {record.message}</p>}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
