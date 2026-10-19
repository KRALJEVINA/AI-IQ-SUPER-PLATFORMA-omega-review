// Optional development-only browser acceptance checks. Requires Playwright + Chromium.
// node --test scripts/transformers-browser-qa.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = new URL(process.env.TRANSFORMERS_DEV_URL || 'http://127.0.0.1:3000');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'Local dev server required');
let browser;
before(async () => { browser = await chromium.launch({
  ...(process.env.TRANSFORMERS_CHROME_PATH ? { executablePath: process.env.TRANSFORMERS_CHROME_PATH } : {}),
}); });
after(async () => { await browser?.close(); });
const gameName = 'TRANSFORMERS lokalni prototip';
async function direct(t, options = {}) {
  const context = await browser.newContext(options);
  t.after(() => context.close());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], 'Unhandled browser exceptions'));
  await page.goto(new URL('/transformers', base).href);
  await page.getByRole('button', { name: 'Pokreni duel', exact: true }).waitFor();
  // Freeze timers only after hydration. Advance real interval callbacks, not reducer state.
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.getByRole('button', { name: 'Pokreni duel', exact: true }).click();
  return page;
}
const player = page => page.locator('svg text').filter({ hasText: /^TI ·/ });
async function position(page) {
  return player(page).evaluate(el => [el.getAttribute('x'), el.getAttribute('y')]);
}
async function hold(page, key, ms) {
  await page.getByRole('region', { name: gameName }).focus();
  await page.keyboard.down(key);
  await page.clock.runFor(ms);
  await page.keyboard.up(key);
}
test('direct: transformations, movement, key release, pause/resume and cameras', async t => {
  const page = await direct(t);
  await page.keyboard.press('t');
  await page.clock.runFor(700);
  assert.match(await page.getByRole('region', { name: gameName }).innerText(), /VOZILO/);
  assert.equal(await page.getByRole('button', { name: 'Napad · Space', exact: true }).isEnabled(), false);
  await page.keyboard.press('t');
  await page.clock.runFor(700);
  assert.equal(await page.getByRole('button', { name: 'Napad · Space', exact: true }).isEnabled(), true);
  const start = await position(page);
  await hold(page, 'a', 500);
  const moved = await position(page);
  assert.notDeepEqual(moved, start);
  await page.clock.runFor(500);
  assert.deepEqual(await position(page), moved);
  await page.keyboard.press('p');
  const paused = await page.getByRole('region', { name: gameName }).innerText();
  await page.clock.runFor(1500);
  assert.equal(await page.getByRole('region', { name: gameName }).innerText(), paused);
  await page.getByRole('button', { name: 'Nastavi duel', exact: true }).click();
  for (const id of ['2', '3', '1']) {
    await page.getByLabel('Pogled kamere').selectOption(id);
    assert.match(await page.getByRole('img').getAttribute('aria-label'), new RegExp(`kamera ${id},`));
  }
  assert.equal(await page.locator('select[aria-label="Pogled kamere"] option:disabled').count(), 20);
  await page.getByLabel('Pogled kamere').selectOption('3');
  const beforeOrbit = await position(page);
  await page.getByRole('button', { name: 'Rotiraj kameru udesno', exact: true }).click();
  assert.notDeepEqual(await position(page), beforeOrbit);
});
test('direct: keyboard movement stops at obstacle', async t => {
  const page = await direct(t);
  await hold(page, 'w', 1000);
  await hold(page, 'd', 2500);
  const stopped = await position(page);
  await hold(page, 'd', 1000);
  assert.deepEqual(await position(page), stopped);
});
test('direct: continuous attack wins duel, result is final, new duel resets', async t => {
  const page = await direct(t);
  await hold(page, ' ', 20000);
  assert.equal(await page.getByRole('status').innerText(), 'POBEDA');
  await page.clock.runFor(2000);
  assert.equal(await page.getByRole('status').innerText(), 'POBEDA');
  await page.getByRole('button', { name: 'Novi duel', exact: true }).click();
  assert.equal(await page.getByRole('status').innerText(), 'SPREMAN ZA DUEL?');
  assert.equal(await player(page).innerText(), 'TI · 100 HP');
});
test('direct: idle duel ends in loss', async t => {
  const page = await direct(t);
  await page.clock.runFor(25000);
  assert.equal(await page.getByRole('status').innerText(), 'PORAZ');
});
for (const route of ['/industrija', '/spaja-digitalni-brouvzer']) {
  test(`catalog click through ${route} reaches dedicated runner`, async t => {
    const context = await browser.newContext();
    t.after(() => context.close());
    const page = await context.newPage();
    await page.goto(new URL(route, base).href);
    const link = page.locator('a[href="/spaja-digitalni-brouvzer?igricaId=igrica-transformers-1350"]');
    assert.equal(await link.count(), 1, 'Unique native launch link');
    await link.click();
    assert.equal(new URL(page.url()).searchParams.get('igricaId'), 'igrica-transformers-1350');
    await page.getByRole('button', { name: /^360D/ }).click();
    await page.getByRole('button', { name: 'Pokreni duel', exact: true }).waitFor({ timeout: 30000 });
    assert.equal(await page.getByRole('heading', { name: 'Nedozvoljen URL', exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Pokreni duel', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Pauza', exact: true }).isEnabled(), true);
  });
}
test('mobile: real touch hold/release moves and stops; transform button works', async t => {
  const page = await direct(t, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const button = page.getByRole('button', { name: 'Kretanje →', exact: true });
  await button.scrollIntoViewIfNeeded();
  const rect = await button.boundingBox();
  assert.ok(rect);
  const cdp = await page.context().newCDPSession(page);
  const start = await position(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }] });
  await page.clock.runFor(500);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const moved = await position(page);
  assert.notDeepEqual(moved, start);
  await page.clock.runFor(500);
  assert.deepEqual(await position(page), moved);
  await page.getByRole('button', { name: 'T · Transformiši', exact: true }).tap();
  await page.clock.runFor(700);
  assert.match(await page.getByRole('region', { name: gameName }).innerText(), /VOZILO/);
});
