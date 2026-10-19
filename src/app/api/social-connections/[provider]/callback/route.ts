import { NextRequest, NextResponse } from 'next/server';
import { configuration, isProvider } from '@/lib/social-connections/config';
import { browserCookie, privateHeaders, reply } from '@/lib/social-connections/http';
import { fetchSnapshot } from '@/lib/social-connections/provider';
import { consume, save } from '@/lib/social-connections/store';
export const runtime = 'nodejs';
export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (!isProvider(provider)) return reply({ error: 'Nepoznata mreža.' }, 400);
  const config = configuration(provider);
  if (!config) return reply({ error: 'Pilot nije konfigurisan.' }, 503);
  const query = request.nextUrl.searchParams;
  const state = query.get('state') ?? '';
  const browser = request.cookies.get(browserCookie(provider))?.value ?? '';
  const userId = state.length <= 128 && browser ? consume(state, browser, provider) : null;
  const finish = (status: string) => {
    const response = NextResponse.redirect(`${config.origin}/social-connections?result=${status}`, { status: 303, headers: privateHeaders });
    response.cookies.set(browserCookie(provider), '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
    return response;
  };
  if (!userId) return finish('invalid_state');
  if (query.has('error')) return finish('consent_denied');
  const code = query.get('code');
  if (!code || code.length > 4096) return finish('invalid_code');
  try {
    const snapshot = await fetchSnapshot(provider, code, config);
    // Local deletion/revocation during the provider request must not recreate a snapshot.
    // Consent completion records only a short-lived observation, never an ongoing token grant.
    save(userId, snapshot, state);
    return finish('snapshot_ready');
  } catch { return finish('provider_failed'); }
}
