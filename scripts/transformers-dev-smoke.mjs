// Server-rendered route checks only. This does not validate browser hydration or inputs.
// Run against an existing local dev server: node scripts/transformers-dev-smoke.mjs
import assert from 'node:assert/strict';

const base = new URL(process.env.TRANSFORMERS_DEV_URL || 'http://127.0.0.1:3000');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'Use a local development server');
const launch = '/spaja-digitalni-brouvzer?igricaId=igrica-transformers-1350';
for (const route of ['/transformers', '/industrija', '/spaja-digitalni-brouvzer', launch]) {
  const response = await fetch(new URL(route, base), { signal: AbortSignal.timeout(60000), redirect: 'error' });
  assert.equal(response.status, 200, route);
  const html = await response.text();
  assert.ok(!html.includes('Nedozvoljen URL'), `${route}: invalid launch URL`);
  if (route === '/transformers') assert.ok(html.includes('SPREMAN ZA DUEL?'), 'Direct runner must render');
  if (route === '/industrija' || route === '/spaja-digitalni-brouvzer') {
    // Next streams catalog data to client components; this is not a DOM/link-click assertion.
    assert.ok(html.includes(launch), `${route}: serialized native launch data missing`);
  }
  console.log(`PASS HTTP/SSR ${route}`);
}
console.log('Browser interactions, hydration and touch controls remain separate checks.');
