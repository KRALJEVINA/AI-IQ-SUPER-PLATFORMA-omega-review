import { parseSuocVrhCall } from '../spaja-ultra-core/vrh';
import type { PetljaResult } from '../petlje/types';

export type VrhCall = ReturnType<typeof parseSuocVrhCall>;
export interface PilotStep { id: string; dependsOn: string[]; request: VrhCall; startFrom?: string }
export interface PilotPlan { name: string; steps: PilotStep[] }
export type StepStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'interrupted' | 'canceled';
export type RunStatus = StepStatus | 'paused';
export interface StepState extends PilotStep { status: StepStatus; attempts: number; result?: PetljaResult; error?: string }
export interface PilotRun { id: string; name: string; createdAt: string; updatedAt: string; status: RunStatus; steps: StepState[] }

export const PILOT_LIMITS = Object.freeze({ steps: 8, bodyBytes: 65536, iterations: 1000, durationMs: 1000, attempts: 3, runs: 100, resultBytes: 262144 });

function record(value: unknown, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Očekivan je JSON objekat.');
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error('Nepoznato polje plana.');
  return value as Record<string, unknown>;
}

export function validatePlan(value: unknown): PilotPlan {
  const plan = record(value, ['name', 'steps']);
  if (typeof plan.name !== 'string' || !plan.name.trim() || plan.name.length > 80) throw new Error('Naziv mora imati 1–80 znakova.');
  if (!Array.isArray(plan.steps) || !plan.steps.length || plan.steps.length > PILOT_LIMITS.steps) throw new Error('Plan mora imati 1–8 koraka.');
  let iterations = 0, duration = 0;
  const ids = new Set<string>();
  const steps: PilotStep[] = plan.steps.map(value => {
    const step = record(value, ['id', 'dependsOn', 'request', 'startFrom']);
    if (typeof step.id !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(step.id) || ids.has(step.id)) throw new Error('ID koraka mora biti jedinstven i imati do 32 znaka.');
    ids.add(step.id);
    const dependencies = step.dependsOn ?? [];
    if (!Array.isArray(dependencies) || dependencies.some(id => typeof id !== 'string') || new Set(dependencies).size !== dependencies.length) throw new Error('Zavisnosti moraju biti lista različitih ID vrednosti.');
    const request = parseSuocVrhCall(JSON.stringify(step.request));
    iterations += request.input.maxIterations!;
    duration += request.input.maxDurationMs!;
    if (step.startFrom !== undefined && (typeof step.startFrom !== 'string' || !dependencies.includes(step.startFrom) || request.version !== '0.1')) throw new Error('startFrom zahteva direktnu zavisnost i FOR profil 0.1.');
    return { id: step.id, dependsOn: dependencies as string[], request, ...(step.startFrom ? { startFrom: step.startFrom as string } : {}) };
  });
  if (iterations > PILOT_LIMITS.iterations || duration > PILOT_LIMITS.durationMs) throw new Error('Zbir budžeta plana prelazi 1000 iteracija ili 1000 ms.');
  for (const step of steps) if (step.dependsOn.some(id => !ids.has(id) || id === step.id)) throw new Error('Nepostojeća ili kružna zavisnost.');
  const visited = new Set<string>();
  while (visited.size < steps.length) {
    const ready = steps.filter(step => !visited.has(step.id) && step.dependsOn.every(id => visited.has(id)));
    if (!ready.length) throw new Error('Plan sadrži ciklus.');
    ready.forEach(step => visited.add(step.id));
  }
  return { name: plan.name.trim(), steps };
}

const request = (start: number, end: number) => ({ kind: 'loop-call', version: '0.1', name: 'FOR PETLJA', input: { start, end, step: 1, maxIterations: 20, maxDurationMs: 100, status: 'ACTIVATED' } });
export const PILOT_EXAMPLE = {
  name: 'A → B: sačuvan VRH rezultat',
  steps: [
    { id: 'A', request: request(1, 3) },
    { id: 'B', dependsOn: ['A'], startFrom: 'A', request: request(1, 8) },
  ],
};
