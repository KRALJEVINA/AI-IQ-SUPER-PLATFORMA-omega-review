import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { proxy } from '../../proxy';
import config from '../../../next.config';
import { applyOmegaStudioMediaPolicy, OMEGA_STUDIO_PATH } from '../../lib/omegatrojektorijum/media-policy';

async function main() {
  for (const path of ['/login', '/bank-prototype', '/omegatrojektorijum', `${OMEGA_STUDIO_PATH}-other`]) {
    const headers = new Headers({ 'Permissions-Policy': 'camera=(), microphone=()', 'Content-Security-Policy': "default-src 'self'" });
    applyOmegaStudioMediaPolicy(headers, path);
    assert.equal(headers.get('Permissions-Policy'), 'camera=(), microphone=()');
    const response = proxy(new NextRequest(`https://local.test${path}`));
    assert(response.headers.get('Permissions-Policy')?.includes('camera=()'));
    assert(!response.headers.get('Content-Security-Policy')?.includes('media-src'));
  }
  for (const path of [OMEGA_STUDIO_PATH, `${OMEGA_STUDIO_PATH}/`]) {
    const response = proxy(new NextRequest(`https://local.test${path}`));
    assert(response.headers.get('Permissions-Policy')?.includes('camera=(self), microphone=(self)'));
    assert(response.headers.get('Content-Security-Policy')?.includes("media-src 'self' blob:"));
  }
  const rules = await config.headers?.();
  const rule = rules?.find(entry => entry.source === OMEGA_STUDIO_PATH);
  assert(rule?.headers.some(header => header.key === 'Permissions-Policy' && header.value.includes('camera=(self)')));
  assert(rule?.headers.some(header => header.key === 'Content-Security-Policy' && header.value.includes("media-src 'self' blob:")));
  console.log('PASS: studio-only media policy in Next config and proxy; login, bank and lookalike paths remain restricted');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
