import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
import { getExtrimliExtrondolReport } from '../../lib/extrimli-extrondol';
import {
  EXTRONDOL_GOVERNANCE_ACCEPTANCE_EVIDENCE,
  EXTRONDOL_RELEASE_AUDIT_ACCEPTANCE_EVIDENCE,
} from '../../lib/extrimli-extrondol/acceptance-evidence';

const cases = [
  {
    key: 'governance',
    values: EXTRONDOL_GOVERNANCE_ACCEPTANCE_EVIDENCE,
    type: "ExtrimliExtrondolReport['developerAndCreateRepoWideReflection']['roadmapExecution']['acceptanceEvidence']",
    length: 61,
    digest: 'c38d66cc9906baa56be67097343bb01480c640d3df418259e11d9f9c9a88180f',
  },
  {
    key: 'releaseAudit',
    values: EXTRONDOL_RELEASE_AUDIT_ACCEPTANCE_EVIDENCE,
    type: "ExtrimliExtrondolReport['releaseAuditSummary']['developerAndCreateRepoWideReflectionGovernance']['roadmapExecution']['acceptanceEvidence']",
    length: 67,
    digest: '289172e8b593cbed8d308fa5104b0806aad9139c795816f00871737c65c31fd0',
  },
] as const;

test('report preserves evidence content and order observed on main 6235cb58', () => {
  const report = getExtrimliExtrondolReport();
  const actual = {
    governance: report.developerAndCreateRepoWideReflection.roadmapExecution.acceptanceEvidence,
    releaseAudit: report.releaseAuditSummary.developerAndCreateRepoWideReflectionGovernance.roadmapExecution.acceptanceEvidence,
  };
  for (const entry of cases) {
    const values = actual[entry.key];
    assert.equal(values.length, entry.length);
    assert.equal(createHash('sha256').update(JSON.stringify(values)).digest('hex'), entry.digest);
    assert.deepEqual(values, entry.values);
  }
});

test('actual report contracts accept complete evidence and reject dropped, extra, reordered or unknown paths', () => {
  // Compile a virtual consumer against the real report types, not a copy of their declarations.
  const fixture = resolve('src/tests/lib/acceptance-evidence-contract.fixture.ts');
  const lines = ["import type { ExtrimliExtrondolReport } from '../../lib/extrimli-extrondol/types';"];
  const expectations: { line: number; valid: boolean; name: string }[] = [];
  for (const entry of cases) {
    const values = [...entry.values];
    const variants = [
      ['complete', values, true],
      ['missing', values.slice(0, -1), false],
      ['extra', [...values, values[0]], false],
      ['reordered', [values[1], values[0], ...values.slice(2)], false],
      ['unknown', ['unknown.evidence.path', ...values.slice(1)], false],
    ] as const;
    for (const [name, value, valid] of variants) {
      lines.push(`const ${entry.key}_${name}: ${entry.type} = ${JSON.stringify(value)};`);
      expectations.push({ line: lines.length, valid, name: `${entry.key}/${name}` });
    }
  }
  const config = ts.readConfigFile(resolve('tsconfig.json'), ts.sys.readFile);
  assert.equal(config.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
  assert.equal(parsed.errors.length, 0);
  const options = { ...parsed.options, incremental: false, noEmit: true };
  const host = ts.createCompilerHost(options);
  const original = host.getSourceFile.bind(host);
  host.getSourceFile = (file, languageVersion, onError, shouldCreateNewSourceFile) =>
    file === fixture
      ? ts.createSourceFile(file, lines.join('\n'), languageVersion, true)
      : original(file, languageVersion, onError, shouldCreateNewSourceFile);
  const program = ts.createProgram([fixture], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  const consumerDiagnostics = diagnostics.filter(d => d.file?.fileName === fixture);
  for (const entry of expectations) {
    const errors = consumerDiagnostics.filter(d => d.file && d.start !== undefined
      && d.file.getLineAndCharacterOfPosition(d.start).line + 1 === entry.line);
    assert.equal(errors.length > 0, !entry.valid, entry.name);
    if (!entry.valid) assert.ok(errors.every(d => d.code === 2322), entry.name);
  }
  assert.ok(consumerDiagnostics.every(d => {
    if (!d.file || d.start === undefined) return false;
    const line = d.file.getLineAndCharacterOfPosition(d.start).line + 1;
    return expectations.some(e => !e.valid && e.line === line);
  }));
  // Transitive failures remain release blockers; this test makes no whole-repo success claim.
  console.log(`Transitive diagnostics outside contract fixture: ${diagnostics.length - consumerDiagnostics.length}`);
});
