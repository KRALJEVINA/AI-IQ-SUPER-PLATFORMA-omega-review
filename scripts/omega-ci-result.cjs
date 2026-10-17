/* eslint-disable @typescript-eslint/no-require-imports -- Dependency-free CommonJS runner for Node CI. */
// Dependency-free CI evidence writer. Never publishes or changes repository files.
const fs = require('node:fs');
const path = require('node:path');
const gates = ['safety', 'install', 'types', 'lint', 'unit', 'smoke', 'predeploy', 'build'];
const outcomes = new Set(['success', 'failure', 'cancelled', 'skipped']);

function createResult(env, version, recordedAt = new Date().toISOString()) {
  const steps = JSON.parse(env.OMEGA_STEPS_JSON || '{}');
  const checks = Object.fromEntries(gates.map(id => [id,
    outcomes.has(steps[id]?.outcome) ? steps[id].outcome : 'unknown']));
  const status = env.OMEGA_JOB_STATUS === 'cancelled' || Object.values(checks).includes('cancelled')
    ? 'cancelled'
    : env.OMEGA_JOB_STATUS === 'failure' || Object.values(checks).includes('failure')
      ? 'failure'
      : env.OMEGA_JOB_STATUS === 'success' && Object.values(checks).every(v => v === 'success')
        ? 'success' : 'incomplete';
  return {
    schema_version: 1,
    evidence_kind: 'ci-quality-gates',
    timestamp: recordedAt, // Collection time, not workflow completion or deployment time.
    version,
    commit_sha: env.GITHUB_SHA || null, // Tested checkout: PR merge SHA for pull_request.
    source_commit_sha: env.OMEGA_HEAD_SHA || env.GITHUB_SHA || null,
    workflow_sha: env.GITHUB_WORKFLOW_SHA || null,
    ref: env.GITHUB_REF || null,
    branch: env.GITHUB_HEAD_REF || env.GITHUB_REF_NAME || null,
    event: env.GITHUB_EVENT_NAME || null,
    repository: env.GITHUB_REPOSITORY || null,
    run_id: env.GITHUB_RUN_ID || null,
    run_attempt: env.GITHUB_RUN_ATTEMPT || null,
    run_url: `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}/attempts/${env.GITHUB_RUN_ATTEMPT}`,
    actor: env.GITHUB_ACTOR || null,
    status,
    checks,
    production_deployment: { status: 'unknown', verified: false, checked_at: null, evidence_url: null },
    note: 'CI evidence only. Inspect the final Actions conclusion and artifact upload; production deployment is not verified.',
  };
}

if (require.main === module) {
  const result = createResult(process.env, JSON.parse(fs.readFileSync('package.json', 'utf8')).version);
  const directory = path.join(process.env.RUNNER_TEMP, 'omega-ci-result');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'ci-result.json'), JSON.stringify(result, null, 2) + '\n');
  if (process.env.GITHUB_STEP_SUMMARY) {
    // JSON code block prevents branch/actor data from becoming summary markup.
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      '## OMEGA CI evidence\n\nCI gates only; production deployment: **unknown / not verified**.\n\n```json\n'
      + JSON.stringify(result, null, 2).replace(/`/g, '\\u0060') + '\n```\n');
  }
}
module.exports = { createResult, gates };
