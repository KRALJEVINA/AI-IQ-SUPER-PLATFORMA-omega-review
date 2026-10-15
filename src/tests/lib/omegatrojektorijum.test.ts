import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { expandOmegaItem, findOmegaItems, omegaItems, omegaTemplates } from '../../lib/omegatrojektorijum';

assert.equal(omegaItems.length, 1325);
assert.equal(omegaTemplates.length, 80);
assert.equal(new Set(omegaItems.map(item => item.domain)).size, 25);
const expanded = omegaItems.map(expandOmegaItem);
const conceptIds = expanded.flatMap(item => item.concepts.map(concept => concept.id));
assert.equal(conceptIds.length, 106000);
assert.equal(new Set(conceptIds).size, 106000);
assert(expanded.every(item => item.status === 'ideja' && item.concepts.length === 80));
assert.equal(findOmegaItems('OMEGA-0001-K03', '').length, 1);
assert.equal(findOmegaItems('omega-1325-k80', '')[0].id, 'OMEGA-1325');
assert.equal(findOmegaItems('OMEGA-0001-K81', '').length, 0);
assert.equal(findOmegaItems('OMEGA-0001-K00', '').length, 0);
assert.equal(findOmegaItems('', omegaItems[0].domain).length, 53);
assert.equal(findOmegaItems('OMEGA-0001', omegaItems[53].domain).length, 0);
assert.equal(findOmegaItems('zxq-nepostojeci-upit', '').length, 0);
assert.equal(findOmegaItems('validacija ulaza', '').length, 1325);
assert.deepEqual(JSON.parse(JSON.stringify(expanded[0])), expanded[0]);
for (const route of ['bank-prototype', 'login', 'omegatrojektorijum/studio']) {
  assert(existsSync(`src/app/${route}/page.tsx`), `Missing destination: ${route}`);
}
console.log('PASS: 1325 items, 106000 concept IDs, scoped search, bounds, export roundtrip and linked routes');
