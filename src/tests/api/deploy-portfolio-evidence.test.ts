import assert from 'node:assert/strict';
import { GET } from '../../app/api/deploy-portfolio/route';

async function main() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Status projection must not invoke providers'); };
  try {
    const response = await GET();
    assert.equal(response.status, 200);
    assert.match(response.headers.get('cache-control') ?? '', /no-store/);
    const body = await response.json();
    assert.equal(body.status, 'ok'); // Endpoint response status only.
    assert.equal(body.deploy_status_artifact, '/deploy_status.json');
    const evidence = body.deployment_evidence;
    assert.equal(evidence.schema_version, 2);
    assert.equal(evidence.status, 'historical');
    for (const key of ['timestamp', 'version', 'commit_sha', 'run_id', 'actor']) {
      assert.equal(evidence[key], null);
    }
    assert.deepEqual(evidence.current_ci, { status: 'unknown', checked_at: null, evidence_url: null });
    assert.deepEqual(evidence.production_deployment,
      { status: 'unknown', verified: false, checked_at: null, evidence_url: null });
    assert.equal(evidence.historical_record.timestamp, '2026-08-01T22:17:00Z');
    assert.equal(evidence.historical_record.status, 'success');
    assert.equal(evidence.historical_record.commit_sha, 'maks-plan-nivo-levl');
    assert.ok(body.portfolio.platforme.length > 0);
    assert.ok(evidence.ci_results_url.endsWith('/actions/workflows/omega-auto-build.yml'));
    console.log('PASS deploy portfolio: historical record, unknown CI/production, no provider requests');
  } finally { globalThis.fetch = originalFetch; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
