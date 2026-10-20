import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextRequest } from 'next/server';
import { POST } from '../../app/api/auth/login/route';

for (const [index, credentials] of [
  { oauthProvider: 'github', oauthCode: 'unverified-code' },
  { oauthProvider: 'google', oauthCode: 'unverified-code' },
  { password: '', oauthCode: 'unverified-code' },
  { password: '   ', oauthCode: 'unverified-code' },
  { password: 12345678, oauthCode: 'unverified-code' },
].entries()) {
  test(`password login rejects unverified OAuth input ${index + 1}`, async () => {
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `192.0.2.${index + 1}` },
      body: JSON.stringify({ email: 'security-regression@example.test', ...credentials }),
    });
    const response = await POST(request);
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(typeof body.error, 'string');
    assert.equal(body.token, undefined);
    assert.equal(body.identity, undefined);
    assert.equal(response.headers.get('set-cookie'), null);
  });
}
