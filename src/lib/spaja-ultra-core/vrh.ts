import { dispatchVrhLoop, validateVrhLoopRequest } from '../petlje/vrh-dispatcher';
import { validateVrhProfileRequest } from '../petlje/vrh-individual-profiles';
import { validateVrhSpajaRequest } from '../petlje/vrh-spaja-profile';
import { validateVrhOrchestratorMusema } from '../petlje/vrh-orchestrator-musema';
import type { PetljaInput, PetljaKind, PetljaResult } from '../petlje/types';
import type { ASTNode } from './parser';

type SuocVrhCall = {
  kind: 'loop-call';
  version: '0.1' | '0.2' | '0.3' | '0.4';
  name: PetljaKind;
  input: PetljaInput;
};

/** Per AST/program, not a process-wide quota or a hard wall-clock timeout. */
export const SUOC_VRH_LIMITS = Object.freeze({
  maxArgumentLength: 16384,
  maxCalls: 10,
  maxDeclaredIterations: 1000,
  maxDeclaredDurationMs: 1000,
});

/** Literal JSON only. Existing profile validators own the numerical contract. */
export function parseSuocVrhCall(argument: string): SuocVrhCall {
  if (typeof argument !== 'string' || argument.length > SUOC_VRH_LIMITS.maxArgumentLength) {
    throw new Error('VRH JSON prelazi ograničenje od 16384 UTF-16 jedinice.');
  }
  let value: unknown;
  try { value = JSON.parse(argument); }
  catch { throw new Error('VRH očekuje doslovan JSON zahtev za petlju.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('VRH zahtev mora biti JSON objekat.');
  const version = (value as { version?: unknown }).version;
  if (version === '0.1') {
    const call = validateVrhLoopRequest(value);
    if (call.name !== 'FOR PETLJA') throw new Error('VRH profil 0.1 podržava samo FOR PETLJA.');
    return call;
  }
  if (version === '0.2') return validateVrhProfileRequest(value);
  if (version === '0.3') return { kind: 'loop-call', version, name: 'SPAJA PETLJA', input: validateVrhSpajaRequest(value) };
  if (version === '0.4') return { kind: 'loop-call', version, ...validateVrhOrchestratorMusema(value) };
  throw new Error('VRH podržava verzije profila 0.1, 0.2, 0.3 i 0.4.');
}

/** Preflight only: never calls a runner and never grants execution permission. */
export function validateSuocVrhCommands(ast: readonly ASTNode[]): void {
  let calls = 0, iterations = 0, durationMs = 0;
  for (const node of ast) {
    if (node.name.toLocaleUpperCase('sr-RS') !== 'VRH') continue;
    const call = parseSuocVrhCall(node.args.join(' '));
    calls++;
    // Every accepted profile requires these integer fields explicitly.
    iterations += call.input.maxIterations!;
    durationMs += call.input.maxDurationMs!;
    if (calls > SUOC_VRH_LIMITS.maxCalls || iterations > SUOC_VRH_LIMITS.maxDeclaredIterations || durationMs > SUOC_VRH_LIMITS.maxDeclaredDurationMs) {
      throw new Error('VRH program dozvoljava do 10 poziva, ukupno do 1000 deklarisanih iteracija i 1000 ms deklarisanog budžeta.');
    }
  }
}

export function executeSuocVrhCall(argument: string): PetljaResult {
  return dispatchVrhLoop(parseSuocVrhCall(argument), 'reference');
}

export function isCompleteVrhResult(result: PetljaResult): boolean {
  return result.completed && result.reason === 'completed' &&
    result.fallbackSummary?.successful !== false && Number.isFinite(result.output);
}

export const SUOC_VRH_EXAMPLE = `AKTIVIRAJ: jezgro
VRH: {"kind":"loop-call","version":"0.1","name":"FOR PETLJA","input":{"start":1,"end":3,"step":1,"maxIterations":10,"maxDurationMs":100,"status":"ACTIVATED"}}`;
