import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildDokerKuratIzekDokarGovernanceTrack,
  buildDokerKuratIzekDokarPublicBoundaryStatus,
} from '../../lib/extrimli-doker-kurat-izek-dokar-track';
import { buildExtrimliInnovationRegistry } from '../../lib/extrimli-innovation-registry';
import { getExtrimliVersionRoadmap, isExtrimliDeveloperCreateLockAligned } from '../../lib/extrimli-version-roadmap';
import { getExtrimliExtremProfilerReport } from '../../lib/extrimli-extrem';
import { assertReflectionInitialized } from '../../lib/extrimli-extrem/initialization';
import { getExtrimliExtrondolReport } from '../../lib/extrimli-extrondol';

function readyTrack() {
  return buildDokerKuratIzekDokarGovernanceTrack({
    technicalRiskStatus: 'READY', promotionFreeze: false, releaseAuditStatus: 'READY',
    downstreamSyncComplete: true, humanReviewComplete: true, rollbackPlanRequired: false,
  });
}

test('public boundary preserves ready, review and freeze states', () => {
  const track = readyTrack();
  const boundary = (promotionFreeze = false) => buildDokerKuratIzekDokarPublicBoundaryStatus({
    sequenceStates: track.sequenceStates, promotionFreeze,
  });
  assert.equal(boundary().publicStatus, 'READY');
  track.sequenceStates[1].status = 'WATCH';
  assert.equal(boundary().publicStatus, 'WATCH');
  assert.equal(boundary(true).publicStatus, 'BLOCKED');
  assert.ok(boundary(true).tokenSummaries.every(token => token.status === 'BLOCKED'));
});

test('malformed runtime status still fails closed', () => {
  const track = readyTrack();
  // Simulate an untyped caller; production types remain exhaustive.
  Object.assign(track.sequenceStates[1], { status: 'UNRECOGNIZED' });
  const result = buildDokerKuratIzekDokarPublicBoundaryStatus({
    sequenceStates: track.sequenceStates, promotionFreeze: false,
  });
  assert.equal(result.publicStatus, 'BLOCKED');
  assert.equal(result.tokenSummaries[1].status, 'BLOCKED');
});

test('canonical roadmap lock includes the daily cadence', () => {
  const lock = getExtrimliVersionRoadmap().developerCreateLock;
  assert.equal(isExtrimliDeveloperCreateLockAligned(lock), true);
  const altered = structuredClone(lock);
  altered.dailyOperationalCadence.taskTemplate[0].focus += ' drift';
  assert.equal(isExtrimliDeveloperCreateLockAligned(altered), false);
  const extraKey = structuredClone(lock);
  Object.assign(extraKey, { unexpected: true });
  assert.equal(isExtrimliDeveloperCreateLockAligned(extraKey), false);
});

test('innovation registry keeps its fixed matrix and immutable caches', () => {
  const summary = buildExtrimliInnovationRegistry({ materializeInnovations: false });
  const full = buildExtrimliInnovationRegistry({ materializeInnovations: true });
  assert.equal(full.matrix.targetInnovationCount, full.matrix.clusterCount * full.matrix.innovationsPerCluster);
  assert.equal(full.innovations.length, full.matrix.targetInnovationCount);
  assert.equal(summary.innovations.length, 0);
  assert.equal(summary.innovationsMaterialized, false);
  assert.ok(Object.isFrozen(summary.matrix));
  assert.ok(Object.isFrozen(full.innovations[0]));
});

test('incomplete staged reflections cannot be published as complete reports', () => {
  const report = getExtrimliExtremProfilerReport();
  assert.doesNotThrow(() => assertReflectionInitialized(report.dokDikDakDukConsistencyHealth));
  for (const field of ['technicalReadinessProfile', 'implementationPackage', 'aiIdentityFinanceGovernance']) {
    const incomplete = structuredClone(report.dokDikDakDukConsistencyHealth);
    Reflect.deleteProperty(incomplete.developerAndCreateRepoWideReflection, field);
    assert.throws(() => assertReflectionInitialized(incomplete), /Incomplete Developer\/Create reflection/);
  }
});

test('cadence and gaming summary use actual typed source signals', () => {
  const report = getExtrimliExtremProfilerReport();
  const health = report.dokDikDakDukConsistencyHealth;
  assert.ok(['READY', 'WATCH', 'BLOCKED'].includes(health.developerAndCreateRepoWideReflection.dailyOperationalCadence.status));
  assert.equal(health.programskiJezikSpecijalizovanZaIgrice.consolidatedStatus, report.programskiJezikSpecijalizovanZaIgrice.readiness.status);
  assert.equal(health.programskiJezikSpecijalizovanZaIgrice.domainMetrics.runnerCompatibilityScore, report.programskiJezikSpecijalizovanZaIgrice.gamingDomainCoverage.runnerCompatibilityScore);
  assert.equal(health.programskiJezikSpecijalizovanZaIgrice.domainMetrics.dokStatus, health.signals.dok.status);
  assert.equal(health.programskiJezikSpecijalizovanZaIgrice.domainMetrics.dikStatus, health.signals.dik.status);
});

test('governance projections retain canonical metadata and the public boundary', () => {
  const report = getExtrimliExtrondolReport();
  const technical = report.extremProfiler.dokDikDakDukConsistencyHealth.developerAndCreateRepoWideReflection;
  assert.equal(report.developerAndCreateRepoWideReflection.mainManifestDocument, technical.mainManifestDocument);
  assert.equal(report.developerAndCreateRepoWideReflection.canonicalNarrativeSentence, technical.canonicalNarrativeSentence);
  assert.deepEqual(report.b2bReadiness.governanceDecisions.developerAndCreateRepoWideReflectionGovernance.roadmapExecution,
    report.releaseAuditSummary.developerAndCreateRepoWideReflectionGovernance.roadmapExecution);
  assert.ok(report.dokDikDakDukConsistencyHealth.developerAndCreateRepoWideReflection.implementationPackage);
  assert.ok(report.developerAndCreateRepoWideReflection.pilotTrack);
  assert.ok(report.developerAndCreateRepoWideReflection.devastatorTrack);
  assert.equal('technicalReadinessBinding' in report.spajaKod.developerAndCreateVisualReflection, false);
});
