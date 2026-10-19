import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { authorizationUrl, configuration, scopes } from '../../lib/social-connections/config';
import { begin, consume, forget, read, save } from '../../lib/social-connections/store';
import { fetchSnapshot } from '../../lib/social-connections/provider';
import { GET, DELETE } from '../../app/api/social-connections/route';
import { POST } from '../../app/api/social-connections/[provider]/start/route';
import { GET as callback } from '../../app/api/social-connections/[provider]/callback/route';
const config = { origin: 'https://pilot.example', clientId: 'test-app', secret: 'test-only-secret', version: 'v25.0', redirectUri: 'https://pilot.example/api/social-connections/tiktok/callback' };
const env = { NODE_ENV: 'development', SOCIAL_CONNECTIONS_PILOT: 'true', OMEGA_JWT_SECRET: 'x'.repeat(40), SOCIAL_OWNER_IDS: 'owner', SOCIAL_OAUTH_ORIGIN: config.origin, TIKTOK_CLIENT_ID: config.clientId, TIKTOK_CLIENT_SECRET: config.secret, TIKTOK_APPROVED_SCOPES: 'user.info.basic' } as NodeJS.ProcessEnv;
const fixture = (provider: 'tiktok' | 'facebook' | 'instagram' = 'tiktok') => ({ provider, accounts: [{ id: '1', name: 'Owner' }], grantedScopes: [...scopes[provider]], observedAt: new Date().toISOString(), expiresAt: Date.now() + 900_000 });
test('pilot fails closed without approvals, secret, HTTPS or outside development', () => {
  assert.ok(configuration('tiktok', env));
  for (const patch of [{ NODE_ENV: 'production' }, { SOCIAL_CONNECTIONS_PILOT: '' }, { TIKTOK_APPROVED_SCOPES: '' }, { OMEGA_JWT_SECRET: '' }, { SOCIAL_OAUTH_ORIGIN: 'http://pilot.example' }, { SOCIAL_OAUTH_ORIGIN: 'https://pilot.example/evil' }]) assert.equal(configuration('tiktok', { ...env, ...patch }), null);
  assert.equal(configuration('facebook', env), null);
});
test('authorization uses fixed host, scope and redirect; no client secret', () => {
  const url = new URL(authorizationUrl('tiktok', 'random-state', config));
  assert.equal(url.hostname, 'www.tiktok.com');
  assert.equal(url.searchParams.get('scope'), 'user.info.basic');
  assert.equal(url.searchParams.get('redirect_uri'), config.redirectUri);
  assert.ok(!url.href.includes(config.secret));
});
test('state binds provider/browser/identity, expires and cannot replay', () => {
  const p = begin('one', 'tiktok');
  assert.equal(consume(p.state, 'wrong', 'tiktok'), null);
  assert.equal(consume(p.state, p.browser, 'facebook'), null);
  assert.equal(consume(p.state, p.browser, 'tiktok'), 'one');
  assert.equal(consume(p.state, p.browser, 'tiktok'), null);
  const expired = begin('one', 'tiktok', 0);
  assert.equal(consume(expired.state, expired.browser, 'tiktok', 300_001), null);
});
test('snapshots are isolated, expire and deletion cancels in-flight completion', () => {
  const p = begin('owner', 'tiktok');
  consume(p.state, p.browser, 'tiktok');
  save('owner', fixture(), p.state);
  assert.ok(read('owner', 'tiktok'));
  assert.equal(read('other', 'tiktok'), null);
  assert.equal(read('owner', 'facebook'), null);
  assert.equal(read('owner', 'tiktok', Date.now() + 900_001), null);
  const q = begin('owner', 'tiktok');
  consume(q.state, q.browser, 'tiktok');
  forget('owner', 'tiktok');
  assert.throws(() => save('owner', fixture(), q.state), /cancelled/);
});
test('TikTok adapter projects allowlisted data and discards tokens/revenue', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const mock = (async (url, init) => {
    calls.push({ url: String(url), init });
    return Response.json(calls.length === 1 ? { access_token: 'test-access', refresh_token: 'test-refresh', scope: 'user.info.basic', open_id: '1' } : { data: { user: { open_id: '1', display_name: 'Owner', access_token: 'must-not-leak', revenue: 999 } }, error: { code: 'ok' } });
  }) as typeof fetch;
  const result = await fetchSnapshot('tiktok', 'test-code', config, mock);
  assert.deepEqual(result.accounts, [{ id: '1', name: 'Owner' }]);
  assert.equal(calls[0].init?.method, 'POST');
  assert.ok(!calls.some(c => /test-secret|test-access|test-code/.test(c.url)));
  assert.ok(!/test-access|test-refresh|revenue|must-not-leak/.test(JSON.stringify(result)));
  assert.equal(calls[1].init?.redirect, 'error');
});
test('denied scope stops before profile fetch; provider HTTP errors fail closed', async () => {
  let calls = 0;
  await assert.rejects(fetchSnapshot('tiktok', 'code', config, (async () => { calls++; return Response.json({ access_token: 'test', scope: '' }); }) as typeof fetch), /missing_permission/);
  assert.equal(calls, 1);
  await assert.rejects(fetchSnapshot('tiktok', 'code', config, (async () => new Response('secret', { status: 429 })) as typeof fetch), /provider_failed/);
});
test('Meta requires granted permissions, projects Page/linked Instagram IDs, does not follow paging URLs', async () => {
  for (const provider of ['facebook', 'instagram'] as const) {
    let count = 0;
    const mock = (async () => Response.json(++count === 1 ? { access_token: 'test-meta' } : count === 2 ? { data: scopes[provider].map(permission => ({ permission, status: 'granted' })) } : { data: [{ id: 'page-id', name: 'Page', access_token: 'leak', instagram_business_account: { id: 'ig-id', username: 'owner' } }], paging: { next: 'https://evil.example/?access_token=leak' } })) as typeof fetch;
    const result = await fetchSnapshot(provider, 'code', config, mock);
    assert.equal(result.accounts[0].id, provider === 'facebook' ? 'page-id' : 'ig-id');
    assert.equal(count, 3);
    assert.ok(!JSON.stringify(result).includes('leak'));
  }
});
test('unauthorized routes reject without revealing profiles, state or credentials', async () => {
  for (const method of [GET, DELETE]) {
    const response = await method(new NextRequest('https://pilot.example/api/social-connections'));
    assert.equal(response.status, 401);
    assert.match(response.headers.get('cache-control') ?? '', /no-store/);
  }
  const response = await POST(new NextRequest('https://pilot.example/api/social-connections/tiktok/start', { method: 'POST' }), { params: Promise.resolve({ provider: 'tiktok' }) });
  assert.equal(response.status, 401);
});
test('callback blocks unknown providers and disabled configuration', async () => {
  const request = new NextRequest('https://pilot.example/api/social-connections/tiktok/callback?code=private');
  assert.equal((await callback(request, { params: Promise.resolve({ provider: 'evil' }) })).status, 400);
  assert.equal((await callback(request, { params: Promise.resolve({ provider: 'tiktok' }) })).status, 503);
});
test('authenticated start/callback/status/delete flow, denial, CSRF and replay', async () => {
  const { ΩAuthProvider } = await import('../../lib/auth/omega-auth');
  const previous = { ...process.env };
  const originalFetch = globalThis.fetch;
  Object.assign(process.env, env);
  try {
    const token = await ΩAuthProvider.issueToken({ id: 'owner', did: 'did:test:owner', publicKey: '', roles: [], clearanceLevel: 0, digitalIndustryAccess: false, mfaEnabled: false, createdAt: 0 }, ['digital_industry:read']);
    const auth = { Authorization: `Bearer ${token.value}`, Origin: config.origin };
    const context = { params: Promise.resolve({ provider: 'tiktok' }) };
    assert.equal((await POST(new NextRequest(`${config.origin}/api/social-connections/tiktok/start`, { method: 'POST', headers: { ...auth, Origin: 'https://evil.example' } }), context)).status, 403);
    const start = await POST(new NextRequest(`${config.origin}/api/social-connections/tiktok/start`, { method: 'POST', headers: auth }), context);
    assert.equal(start.status, 200);
    const cookie = start.headers.get('set-cookie')!;
    assert.match(cookie, /HttpOnly/); assert.match(cookie, /Secure/); assert.match(cookie, /SameSite=lax/i);
    const state = new URL((await start.json()).authorizationUrl).searchParams.get('state')!;
    const url = `${config.origin}/api/social-connections/tiktok/callback?code=private&state=${state}`;
    let calls = 0;
    globalThis.fetch = (async () => Response.json(++calls === 1 ? { access_token: 'test-provider-token', scope: 'user.info.basic', open_id: '1' } : { data: { user: { open_id: '1', display_name: 'Owner' } }, error: { code: 'ok' } })) as typeof fetch;
    const wrongBrowser = await callback(new NextRequest(url), context);
    assert.match(wrongBrowser.headers.get('location')!, /invalid_state/);
    assert.equal(calls, 0);
    const finish = await callback(new NextRequest(url, { headers: { Cookie: cookie.split(';')[0] } }), context);
    assert.match(finish.headers.get('location')!, /snapshot_ready/);
    assert.ok(!finish.headers.get('location')!.includes('private'));
    const replay = await callback(new NextRequest(url, { headers: { Cookie: cookie.split(';')[0] } }), context);
    assert.match(replay.headers.get('location')!, /invalid_state/);
    assert.equal(calls, 2);
    const result = await (await GET(new NextRequest(`${config.origin}/api/social-connections`, { headers: auth }))).json();
    assert.equal(result.integrations[2].status, 'authorized_snapshot');
    assert.equal(result.integrations[2].revenue.amount, null);
    assert.equal(result.integrations[2].payout.status, 'not_implemented');
    assert.ok(!JSON.stringify(result).includes('test-provider-token'));
    assert.equal((await DELETE(new NextRequest(`${config.origin}/api/social-connections?provider=tiktok`, { method: 'DELETE', headers: auth }))).status, 200);
    assert.equal(read('owner', 'tiktok'), null);
    const denyStart = await POST(new NextRequest(`${config.origin}/api/social-connections/tiktok/start`, { method: 'POST', headers: auth }), context);
    const denyState = new URL((await denyStart.json()).authorizationUrl).searchParams.get('state')!;
    const denied = await callback(new NextRequest(`${config.origin}/api/social-connections/tiktok/callback?error=access_denied&state=${denyState}`, { headers: { Cookie: denyStart.headers.get('set-cookie')!.split(';')[0] } }), context);
    assert.match(denied.headers.get('location')!, /consent_denied/);
    assert.equal(read('owner', 'tiktok'), null);
    assert.equal(calls, 2);
    const refreshToken = await ΩAuthProvider.issueToken({ id: 'owner', did: '', publicKey: '', roles: [], clearanceLevel: 0, digitalIndustryAccess: false, mfaEnabled: false, createdAt: 0 }, [], 'REFRESH');
    assert.equal((await GET(new NextRequest(`${config.origin}/api/social-connections`, { headers: { Authorization: `Bearer ${refreshToken.value}` } }))).status, 401);
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of Object.keys(process.env)) if (!(name in previous)) delete process.env[name];
    Object.assign(process.env, previous);
  }
});
