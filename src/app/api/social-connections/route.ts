import { NextRequest } from 'next/server';
import { configuration, isProvider, providers } from '@/lib/social-connections/config';
import { owner, reply } from '@/lib/social-connections/http';
import { forget, read } from '@/lib/social-connections/store';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const userId = await owner(request);
  if (!userId) return reply({ error: 'Prijava ovlašćenog vlasnika je obavezna.' }, 401);
  return reply({ mode: 'pilot_snapshot', integrations: providers.map(provider => ({ provider,
    status: read(userId, provider) ? 'authorized_snapshot' : configuration(provider) ? 'ready_for_consent' : 'not_configured',
    snapshot: read(userId, provider), revenue: { status: 'not_available', amount: null, currency: null }, payout: { status: 'not_implemented' },
  })) });
}
export async function DELETE(request: NextRequest) {
  const userId = await owner(request);
  if (!userId) return reply({ error: 'Prijava ovlašćenog vlasnika je obavezna.' }, 401);
  const provider = request.nextUrl.searchParams.get('provider') ?? '';
  if (!isProvider(provider)) return reply({ error: 'Nepoznata mreža.' }, 400);
  forget(userId, provider);
  return reply({ status: 'local_snapshot_removed', providerRevoked: false });
}
