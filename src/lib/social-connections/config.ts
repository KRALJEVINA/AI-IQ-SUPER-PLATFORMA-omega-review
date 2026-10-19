export const providers = ['facebook', 'instagram', 'tiktok'] as const;
export type Provider = typeof providers[number];
export function isProvider(value: string): value is Provider {
  return providers.includes(value as Provider);
}
export const scopes: Record<Provider, readonly string[]> = {
  facebook: ['pages_show_list', 'pages_read_engagement'],
  // Instagram via Facebook Login: only professional accounts linked to Pages.
  instagram: ['pages_show_list', 'pages_read_engagement', 'instagram_basic'],
  tiktok: ['user.info.basic'],
};
export function configuration(provider: Provider, env = process.env) {
  // This bounded in-memory pilot must never silently become a production store.
  if (env.NODE_ENV === 'production' || env.SOCIAL_CONNECTIONS_PILOT !== 'true') return null;
  if (!env.OMEGA_JWT_SECRET || env.OMEGA_JWT_SECRET.length < 32 || !env.SOCIAL_OWNER_IDS) return null;
  try {
    const origin = new URL(env.SOCIAL_OAUTH_ORIGIN ?? '');
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) return null;
    const prefix = provider === 'tiktok' ? 'TIKTOK' : 'META';
    const clientId = env[`${prefix}_CLIENT_ID`];
    const secret = env[`${prefix}_CLIENT_SECRET`];
    const approved = new Set((env[`${prefix}_APPROVED_SCOPES`] ?? '').split(',').map(s => s.trim()));
    if (!clientId || !secret || !scopes[provider].every(s => approved.has(s))) return null;
    const version = env.META_GRAPH_VERSION ?? '';
    if (provider !== 'tiktok' && !/^v\d+\.\d+$/.test(version)) return null;
    return { origin: origin.origin, clientId, secret, version,
      redirectUri: `${origin.origin}/api/social-connections/${provider}/callback` };
  } catch { return null; }
}
export function authorizationUrl(provider: Provider, state: string, config: NonNullable<ReturnType<typeof configuration>>) {
  const url = new URL(provider === 'tiktok' ? 'https://www.tiktok.com/v2/auth/authorize/' : `https://www.facebook.com/${config.version}/dialog/oauth`);
  url.searchParams.set(provider === 'tiktok' ? 'client_key' : 'client_id', config.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('scope', scopes[provider].join(','));
  url.searchParams.set('state', state);
  return url.toString();
}
