import assert from 'node:assert/strict';
import test from 'node:test';
import { createRuntime, executeSpajaUltra, parseSpajaUltra, transpile } from '../../lib/spaja-ultra-core';
import { dispatchVrhLoop } from '../../lib/petlje/vrh-dispatcher';
import { VRH_INDIVIDUAL_PROFILES } from '../../lib/petlje/vrh-individual-profiles';
import type { PetljaResult } from '../../lib/petlje/types';

const budget = { maxIterations: 1000, maxDurationMs: 1000, status: 'ACTIVATED' };
const basic = { kind: 'loop-call', version: '0.1', name: 'FOR PETLJA', input: { start: 1, end: 3, step: 1, ...budget } };
const cmd = (value: unknown) => `VRH: ${JSON.stringify(value)}`;
const comparable = (r: PetljaResult | undefined) => r && { ...r, durationMs: 0 };

test('VRH runs the existing FOR implementation through SUOC', async () => {
  const runtime = createRuntime();
  const output: string[] = [];
  await executeSpajaUltra(`AKTIVIRAJ: jezgro\n${cmd(basic)}`, runtime, { onOutput: x => output.push(x) });
  assert.equal(runtime.getLastVrhResult()?.output, 6);
  assert.equal(runtime.getLastVrhResult()?.completed, true);
  assert.deepEqual(output, ['[VRH] FOR PETLJA: 6']);
  assert.deepEqual(runtime.getAuditLog().map(r => [r.cmd, r.status]), [['AKTIVIRAJ', 'ok'], ['VRH', 'ok']]);
});

const cases: { name: string; request: unknown }[] = Object.entries(VRH_INDIVIDUAL_PROFILES).map(([name, profile]) => ({
  name,
  request: { kind: 'loop-call', version: '0.2', name, input: {
    ...(profile === 'RANGE' ? { start: 3, end: 1, step: -1, target: 2 }
      : profile === 'TARGET' ? { start: 1, target: 3, step: 1 }
        : { start: 0, target: 2, sequence: [1, 3, 2] }), ...budget,
  } },
}));
const spajaInput = { start: 1, end: 3, step: 1, target: 3, sequence: [1, 2], ...budget,
  spajaTransferPolicy: 'strict', spajaExportFields: ['output'], spajaImportTarget: 'target',
  spajaSegments: [
    { segment: 'RANGE', loops: ['FOR PETLJA'], importFromPrevious: false },
    { segment: 'TARGET', loops: ['DOK PETLJA'], importFromPrevious: true },
  ],
};
cases.push({ name: 'SPAJA PETLJA', request: { kind: 'loop-call', version: '0.3', name: 'SPAJA PETLJA', input: spajaInput } });
for (const name of ['UMBREL PETLJA', 'DURMITOR PETLJA']) cases.push({ name, request: {
  kind: 'loop-call', version: '0.4', name, input: { start: 2, end: 2, step: 1, target: 2, sequence: [1, 2], ...budget },
} });

for (const { name, request } of cases) test(`VRH semantic parity: ${name}`, async () => {
  const expected = dispatchVrhLoop(request, 'reference');
  const runtime = createRuntime();
  const run = executeSpajaUltra(`AKTIVIRAJ: jezgro\n${cmd(request)}`, runtime, {});
  if (!expected.completed || expected.reason !== 'completed' || expected.fallbackSummary?.successful === false || !Number.isFinite(expected.output)) {
    await assert.rejects(run, /VRH/);
  } else await run;
  assert.deepEqual(comparable(runtime.getLastVrhResult()), comparable(expected));
});

test('VRH refuses execution until this runtime is activated', async () => {
  const runtime = createRuntime();
  await assert.rejects(runtime.vrh(JSON.stringify(basic), {}), /AKTIVIRAJ/);
  assert.equal(runtime.getLastVrhResult(), undefined);
  assert.equal(runtime.getAuditLog()[0].status, 'error');
});

test('VRH build validates without dispatch and uses the saved source', async () => {
  const runtime = createRuntime(); const output: string[] = [];
  const ctx = { programi: { demo: cmd(basic) }, onOutput: (x: string) => output.push(x) };
  await runtime.aktiviraj('jezgro', ctx); await runtime.izgradi('demo', ctx);
  assert.equal(runtime.getLastVrhResult(), undefined); assert.deepEqual(output, []);
  assert.match(runtime.getBuilds()[0].javascript, /runtime\.vrh/);
  ctx.programi.demo = 'ECHO: changed';
  await runtime.pokreni('demo', ctx);
  assert.equal(runtime.getLastVrhResult()?.output, 6);
  assert.equal(runtime.getAuditLog().at(-1)?.status, 'ok');
});

test('VRH invalid JSON, schema, target, name and budgets fail before any action', async () => {
  const invalid = [
    '{bad}', 'null', '[]', '{}', JSON.stringify({ ...basic, version: '0.5' }),
    JSON.stringify({ ...basic, target: 'java' }), JSON.stringify({ ...basic, name: 'NIK PETLJA' }),
    JSON.stringify({ ...basic, version: '0.2', name: '__proto__' }),
    JSON.stringify({ ...basic, input: { ...basic.input, maxIterations: 1001 } }),
    JSON.stringify({ ...basic, input: { ...basic.input, maxDurationMs: 0 } }),
    JSON.stringify({ ...basic, input: { ...basic.input, step: null } }),
    JSON.stringify({ ...basic, input: { ...basic.input, status: 'AKTIVEJT' } }),
  ];
  for (const value of invalid) {
    const runtime = createRuntime(); const output: string[] = [];
    await assert.rejects(executeSpajaUltra(`ECHO: forbidden\nVRH: ${value}`, runtime, { onOutput: x => output.push(x) }));
    assert.deepEqual(output, []); assert.deepEqual(runtime.getAuditLog(), []);
  }
});

test('VRH transpilation itself validates and never dispatches', () => {
  assert.match(transpile(parseSpajaUltra(cmd(basic))), /runtime\.vrh/);
  assert.throws(() => transpile(parseSpajaUltra('VRH: {}')));
});

test('VRH failure stops later commands and preserves the partial numerical result', async () => {
  const runtime = createRuntime(); const output: string[] = [];
  const partial = { ...basic, input: { ...basic.input, maxIterations: 1 } };
  await assert.rejects(executeSpajaUltra(`AKTIVIRAJ: jezgro\n${cmd(partial)}\nECHO: forbidden`, runtime, { onOutput: x => output.push(x) }), /VRH/);
  assert.deepEqual(output, []);
  assert.equal(runtime.getLastVrhResult()?.completed, false);
  assert.equal(runtime.getLastVrhResult()?.reason, 'max-iterations');
  assert.equal(runtime.getAuditLog().at(-1)?.status, 'error');
});

test('VRH fallback with skipped children cannot claim success', async () => {
  const request = { kind: 'loop-call', version: '0.3', name: 'SPAJA PETLJA', input: { ...spajaInput,
    spajaTransferPolicy: 'fallback', spajaSegments: [{ segment: 'RANGE', loops: ['FOR PETLJA', 'NIK PETLJA'], importFromPrevious: false }],
  } };
  const runtime = createRuntime();
  await assert.rejects(executeSpajaUltra(`AKTIVIRAJ: jezgro\n${cmd(request)}`, runtime, {}), /VRH/);
  assert.equal(runtime.getLastVrhResult()?.fallbackSummary?.successful, false);
  assert.ok(runtime.getLastVrhResult()?.fallbackSummary?.skipped.length);
});

test('VRH disabled status is retained and fails the surrounding program', async () => {
  const runtime = createRuntime(); await runtime.aktiviraj('jezgro', {});
  await runtime.izgradi('demo', { programi: { demo: cmd({ ...basic, input: { ...basic.input, status: 'DISABLED' } }) } });
  await assert.rejects(runtime.pokreni('demo', {}), /VRH/);
  assert.equal(runtime.getLastVrhResult()?.reason, 'blocked-status');
  assert.deepEqual(runtime.getAuditLog().slice(-2).map(x => [x.cmd, x.status]), [['VRH', 'error'], ['POKRENI', 'error']]);
});

test('VRH snapshots are isolated and invalid direct calls clear the last result', async () => {
  const runtime = createRuntime();
  await executeSpajaUltra(`AKTIVIRAJ: jezgro\n${cmd(cases.find(c => c.name === 'SPAJA PETLJA')!.request)}`, runtime, {});
  const original = runtime.getLastVrhResult()!; const modified = runtime.getLastVrhResult()!;
  modified.output = -1; modified.trace.length = 0; modified.input.sequence.push(999); modified.transferEvents!.length = 0;
  assert.deepEqual(runtime.getLastVrhResult(), original);
  assert.equal(createRuntime().getLastVrhResult(), undefined);
  await assert.rejects(runtime.vrh('{}', {})); assert.equal(runtime.getLastVrhResult(), undefined);
});

test('VRH program caps count and total declared iteration/time budgets before execution', async () => {
  const small = { ...basic, input: { ...basic.input, maxIterations: 10, maxDurationMs: 10 } };
  for (const source of [Array(11).fill(cmd(small)).join('\n'), [cmd(basic), cmd(small)].join('\n'),
    [cmd({ ...small, input: { ...small.input, maxDurationMs: 1000 } }), cmd(small)].join('\n')]) {
    const runtime = createRuntime();
    await assert.rejects(executeSpajaUltra(`AKTIVIRAJ: jezgro\n${source}`, runtime, {}), /VRH/);
    assert.deepEqual(runtime.getAuditLog(), []);
    await runtime.aktiviraj('jezgro', {});
    await assert.rejects(runtime.izgradi('demo', { programi: { demo: source } }), /VRH/);
    assert.deepEqual(runtime.getBuilds(), []);
  }
  const runtime = createRuntime();
  await executeSpajaUltra(`AKTIVIRAJ: jezgro\n${Array(10).fill(cmd(small)).join('\n')}`, runtime, {});
  assert.equal(runtime.getAuditLog().filter(x => x.cmd === 'VRH').length, 10);
});

test('VRH rejects oversized direct JSON and preserves a prior build after invalid rebuild', async () => {
  const runtime = createRuntime(); await runtime.aktiviraj('jezgro', {});
  await assert.rejects(runtime.vrh(' '.repeat(16385), {}), /VRH/);
  await runtime.izgradi('demo', { programi: { demo: cmd(basic) } });
  await assert.rejects(runtime.izgradi('demo', { programi: { demo: 'VRH: {}' } }));
  await runtime.pokreni('demo', {}); assert.equal(runtime.getLastVrhResult()?.output, 6);
});
