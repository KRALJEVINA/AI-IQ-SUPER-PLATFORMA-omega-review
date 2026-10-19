import { NextRequest } from 'next/server';
import { authorizationUrl, configuration, isProvider } from '@/lib/social-connections/config';
import { browserCookie, owner, reply } from '@/lib/social-connections/http';
import { begin } from '@/lib/social-connections/store';
export const runtime = 'nodejs';
export async function POST(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const userId = await owner(request);
  if (!userId) return reply({ error: 'Prijava ovlašćenog vlasnika je obavezna.' }, 401);
  const { provider } = await context.params;
  if (!isProvider(provider)) return reply({ error: 'Nepoznata mreža.' }, 400);
  const config = configuration(provider);
  if (!config) return reply({ error: 'Pilot nije konfigurisan ili dozvole nisu potvrđene.' }, 503);
  if (request.headers.get('origin') !== config.origin) return reply({ error: 'Nedozvoljeno poreklo zahteva.' }, 403);
  try {
    const { state, browser } = begin(userId, provider);
    const response = reply({ authorizationUrl: authorizationUrl(provider, state, config) });
    response.cookies.set(browserCookie(provider), browser, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 300 });
    return response;
  } catch { return reply({ error: 'Pokušajte kasnije.' }, 429); }
}
