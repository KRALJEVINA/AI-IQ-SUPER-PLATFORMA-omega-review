import { configuration, scopes, type Provider } from './config';
import type { Snapshot } from './store';
// Never return raw provider responses or errors: these may contain credentials.
async function json(fetcher: typeof fetch, url: string, init: RequestInit = {}) {
  const response = await fetcher(url, { ...init, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error('provider_failed');
  const value = await response.json();
  if (value.error && value.error.code !== 'ok') throw new Error('provider_failed');
  return value;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value || value.length > 300) throw new Error('invalid_profile');
  return value;
}
export async function fetchSnapshot(provider: Provider, code: string, config: NonNullable<ReturnType<typeof configuration>>, fetcher = fetch): Promise<Snapshot> {
  const body = new URLSearchParams({ code, redirect_uri: config.redirectUri, client_secret: config.secret });
  body.set(provider === 'tiktok' ? 'client_key' : 'client_id', config.clientId);
  if (provider === 'tiktok') body.set('grant_type', 'authorization_code');
  const base = `https://graph.facebook.com/${config.version}`;
  const token = await json(fetcher, provider === 'tiktok' ? 'https://open.tiktokapis.com/v2/oauth/token/' : `${base}/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  const accessToken: unknown = token.access_token;
  if (typeof accessToken !== 'string' || !accessToken || accessToken.length > 8192 || /[\r\n]/.test(accessToken)) throw new Error('invalid_token');
  const headers = { Authorization: `Bearer ${accessToken}` };
  let grantedScopes: string[];
  let accounts: Snapshot['accounts'];
  if (provider === 'tiktok') {
    grantedScopes = String(token.scope ?? '').split(',');
    if (!scopes[provider].every(s => grantedScopes.includes(s))) throw new Error('missing_permission');
    const profile = await json(fetcher, 'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name', { headers });
    const user = profile.data?.user;
    if (user?.open_id !== token.open_id) throw new Error('invalid_profile');
    accounts = [{ id: text(user?.open_id), name: text(user?.display_name) }];
  } else {
    const permissions = await json(fetcher, `${base}/me/permissions`, { headers });
    if (!Array.isArray(permissions.data)) throw new Error('missing_permission');
    grantedScopes = permissions.data.filter((p: { status?: string }) => p.status === 'granted').map((p: { permission: string }) => p.permission);
    if (!scopes[provider].every(s => grantedScopes.includes(s))) throw new Error('missing_permission');
    const fields = provider === 'instagram' ? 'id,name,instagram_business_account{id,username}' : 'id,name';
    const pages = await json(fetcher, `${base}/me/accounts?fields=${encodeURIComponent(fields)}&limit=100`, { headers });
    if (!Array.isArray(pages.data)) throw new Error('invalid_profile');
    // First page only; never follow arbitrary provider paging URLs containing tokens.
    accounts = pages.data.flatMap((p: { id?: unknown; name?: unknown; instagram_business_account?: { id?: unknown; username?: unknown } }) => {
      const a = provider === 'instagram' ? p.instagram_business_account : p;
      return a ? [{ id: text(a.id), name: text('username' in a ? a.username : p.name) }] : [];
    });
    if (!accounts.length) throw new Error('no_business_accounts');
  }
  return { provider, accounts, grantedScopes: scopes[provider].filter(s => grantedScopes.includes(s)),
    observedAt: new Date().toISOString(), expiresAt: Date.now() + 900_000 };
  // Access and refresh tokens are deliberately discarded, never persisted.
}
