import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGameLaunchHref } from '../../lib/gaming-launch';
import { igrice } from '../../lib/igrice';
import { industrijaSekvence } from '../../lib/sekvence/industrija';
import { spajaDigitalniBrouvzerSekvence } from '../../lib/sekvence/spaja-digitalni-brouvzer-page';

const game = igrice.find(g => g.id === 'igrica-transformers-1350')!;
test('native prototype launches by game identity, never through the external URL field', () => {
  const url = new URL(buildGameLaunchHref(game, 'https://example.com'), 'https://app.example');
  assert.equal(url.pathname, '/spaja-digitalni-brouvzer');
  assert.equal(url.searchParams.get('igricaId'), game.id);
  assert.equal(url.searchParams.has('url'), false);
});
test('external games keep their original URL and properly encoded display name', () => {
  const external = {id:'other', naziv:'A & B? #1', link:'https://example.com/play?a=1&b=2'};
  const url = new URL(buildGameLaunchHref(external, 'https://fallback.example'), 'https://app.example');
  assert.equal(url.searchParams.get('url'), external.link);
  assert.equal(url.searchParams.get('igra'), external.naziv);
  assert.equal(url.searchParams.has('igricaId'), false);
  assert.equal(new URL(buildGameLaunchHref({...external,link:undefined},'https://fallback.example'),'https://app.example').searchParams.get('url'),'https://fallback.example');
});
for (const [name, sequences, sectionId] of [
  ['industrija', industrijaSekvence, 'industrija-igrice'],
  ['brouvzer', spajaDigitalniBrouvzerSekvence, 'brouvzer-igrice'],
] as const) {
  test(`${name} renders a native launch link for TRANSFORMERS in the actual catalog`, () => {
    const section = sequences.find(s => s.id === sectionId);
    assert.ok(section);
    const cards = (section.podaci as {kartice: {naslov:string;href:string}[]}).kartice;
    const card = cards.find(c => c.naslov.includes('TRANSFORMERS 1350'));
    assert.ok(card);
    assert.equal(card.href, '/spaja-digitalni-brouvzer?igricaId=igrica-transformers-1350');
    assert.equal(cards.length, igrice.length);
  });
}
