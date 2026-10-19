/* eslint-disable @typescript-eslint/no-require-imports -- Dependency-free CommonJS runner for Node CI. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createResult, gates } = require('../omega-ci-result.cjs');
const workflow = fs.readFileSync('.github/workflows/omega-auto-build.yml', 'utf8');
const env = {
  OMEGA_JOB_STATUS: 'success',
  OMEGA_STEPS_JSON: JSON.stringify(Object.fromEntries(gates.map(id => [id, { outcome: 'success' }]))),
  GITHUB_SHA: 'a'.repeat(40), OMEGA_HEAD_SHA: 'b'.repeat(40), GITHUB_WORKFLOW_SHA: 'c'.repeat(40),
  GITHUB_REF: 'refs/pull/12/merge', GITHUB_HEAD_REF: 'feature/test', GITHUB_EVENT_NAME: 'pull_request',
  GITHUB_REPOSITORY: 'owner/repo', GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '2',
  GITHUB_SERVER_URL: 'https://github.com', GITHUB_ACTOR: 'tester',
};

test('OMEGA Build has no repository-write capability or alternate main publication path', () => {
  assert.match(workflow, /permissions:\n  contents: read\n  pull-requests: read\n/);
  assert.equal((workflow.match(/permissions:/g) || []).length, 1, 'no job permission escalation');
  assert.match(workflow, /persist-credentials: false/);
  assert.doesNotMatch(workflow, /:\s*write\b|write-all|secrets\.|pull_request_target|workflow_run:|git\s+(push|commit|merge|add|config)|continue-on-error|persist-credentials: true|gh\s|curl\s|github-script|public\/deploy_status\.json/);
  for (const use of workflow.matchAll(/uses:\s*(\S+)/g)) {
    assert.match(use[1], /^(actions\/(checkout|setup-node|upload-artifact)|dorny\/paths-filter)@[a-f0-9]{40}$/);
  }
  for (const id of gates) assert.match(workflow, new RegExp(`id: ${id}\\n`));
  assert.match(workflow, /node --test scripts\/tests\/omega-sync.test.cjs scripts\/tests\/omega-build.test.cjs/);
  assert.ok(workflow.indexOf('id: safety') < workflow.indexOf('run: npm ci'));
  assert.match(workflow, /id: evidence\n        if: always\(\)/);
  assert.match(workflow, /if: always\(\) && steps.evidence.outcome == 'success'/);
  assert.match(workflow, /OMEGA_STEPS_JSON: \$\{\{ toJSON\(steps\) }}/);
  assert.match(workflow, /name: omega-ci-\$\{\{ github.run_id }}-\$\{\{ github.run_attempt }}-\$\{\{ github.sha }}/);
  assert.match(workflow, /path: \$\{\{ runner.temp }}\/omega-ci-result\/ci-result.json/);
  assert.match(workflow, /if-no-files-found: error\n          retention-days: 30\n          overwrite: false/);
});

test('successful gates preserve exact tested SHA, PR head, version, time and run attempt without deployment claim', () => {
  const r = createResult(env, '42.35.0', '2026-10-17T15:00:00Z');
  assert.equal(r.status, 'success');
  assert.equal(r.version, '42.35.0');
  assert.equal(r.timestamp, '2026-10-17T15:00:00Z');
  assert.equal(r.commit_sha, env.GITHUB_SHA);
  assert.equal(r.source_commit_sha, env.OMEGA_HEAD_SHA);
  assert.equal(r.workflow_sha, env.GITHUB_WORKFLOW_SHA);
  assert.equal(r.run_url, 'https://github.com/owner/repo/actions/runs/123/attempts/2');
  assert.equal(r.actor, 'tester');
  assert.equal(r.branch, 'feature/test');
  assert.equal(r.production_deployment.status, 'unknown');
  assert.equal(r.production_deployment.verified, false);
});
for (const outcome of ['failure', 'cancelled', 'skipped', 'unknown']) {
  test(`${outcome} gate cannot be reported as successful CI`, () => {
    const steps = JSON.parse(env.OMEGA_STEPS_JSON);
    steps.types.outcome = outcome;
    const r = createResult({ ...env, OMEGA_STEPS_JSON: JSON.stringify(steps) }, '1');
    assert.equal(r.status, ['failure', 'cancelled'].includes(outcome) ? outcome : 'incomplete');
    assert.equal(r.checks.types, outcome);
    assert.equal(r.production_deployment.verified, false);
  });
}
test('missing gates, failed job, cancelled job, malformed evidence fail closed', () => {
  assert.equal(createResult({ ...env, OMEGA_STEPS_JSON: '{}' }, '1').status, 'incomplete');
  assert.equal(createResult({ ...env, OMEGA_JOB_STATUS: 'failure' }, '1').status, 'failure');
  assert.equal(createResult({ ...env, OMEGA_JOB_STATUS: 'cancelled' }, '1').status, 'cancelled');
  assert.throws(() => createResult({ ...env, OMEGA_STEPS_JSON: 'invalid' }, '1'));
  const push = { ...env, OMEGA_HEAD_SHA: '', GITHUB_HEAD_REF: '', GITHUB_REF_NAME: 'main' };
  assert.equal(createResult(push, '1').source_commit_sha, env.GITHUB_SHA);
  assert.equal(createResult(push, '1').branch, 'main');
});
test('writer saves only allowlisted metadata in runner temp; hostile strings remain data', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'omega-result-'));
  try {
    fs.writeFileSync(path.join(directory, 'package.json'), '{"version":"test"}');
    const summary = path.join(directory, 'summary.md');
    const child = spawnSync(process.execPath, [path.resolve('scripts/omega-ci-result.cjs')], {
      cwd: directory,
      env: { ...env, PATH: process.env.PATH, RUNNER_TEMP: path.join(directory, 'temp'),
        GITHUB_STEP_SUMMARY: summary, GITHUB_ACTOR: '```$(touch pwned)', SECRET_TOKEN: 'do-not-publish' },
      encoding: 'utf8',
    });
    assert.equal(child.status, 0, child.stderr);
    const raw = fs.readFileSync(path.join(directory, 'temp/omega-ci-result/ci-result.json'), 'utf8');
    assert.equal(JSON.parse(raw).actor, '```$(touch pwned)');
    assert.ok(!raw.includes('do-not-publish'));
    assert.ok(!fs.existsSync(path.join(directory, 'pwned')));
    assert.ok(!fs.existsSync(path.join(directory, 'public')));
    assert.equal((fs.readFileSync(summary, 'utf8').match(/```/g) || []).length, 2);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
test('legacy URL is explicitly historical, preserves original record, API exposes uncertainty', () => {
  const snapshot = JSON.parse(fs.readFileSync('public/deploy_status.json', 'utf8'));
  assert.equal(snapshot.status, 'historical');
  assert.equal(snapshot.timestamp, null);
  assert.equal(snapshot.current_ci.status, 'unknown');
  assert.equal(snapshot.production_deployment.verified, false);
  assert.equal(snapshot.historical_record.timestamp, '2026-08-01T22:17:00Z');
  assert.equal(snapshot.historical_record.status, 'success');
  assert.equal(snapshot.historical_record.commit_sha, 'maks-plan-nivo-levl');
  const route = fs.readFileSync('src/app/api/deploy-portfolio/route.ts', 'utf8');
  assert.match(route, /import deployEvidence from '\.\.\/\.\.\/\.\.\/\.\.\/public\/deploy_status.json'/);
  assert.match(route, /deployment_evidence: deployEvidence/);
  assert.match(route, /deploy_status_artifact: '\/deploy_status.json'/);
  const ui = fs.readFileSync('src/lib/sekvence/deploy-platforma-page.ts', 'utf8');
  assert.match(ui, /istorijski zapis/);
  assert.doesNotMatch(ui, /Javni artifact na \/deploy_status.json posle svakog CI run-a/);
});
