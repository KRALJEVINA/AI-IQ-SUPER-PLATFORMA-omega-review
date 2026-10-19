import { NextRequest, NextResponse } from 'next/server';
import { ΩAuthProvider } from '@/lib/auth/omega-auth';
export const privateHeaders = { 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer' };
export function reply(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: privateHeaders }); }
export async function owner(request: NextRequest) {
  // Do not accept the repository's development fallback signing secret.
  if (!process.env.OMEGA_JWT_SECRET || process.env.OMEGA_JWT_SECRET.length < 32) return null;
  const token = ΩAuthProvider.extractTokenFromHeader(request.headers.get('authorization'));
  if (!token) return null;
  // Existing verifier also accepts refresh/API tokens; this surface requires an ACCESS JWT.
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    if (payload.type !== 'ACCESS' || !Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) return null;
  } catch { return null; }
  const identity = await ΩAuthProvider.verifyIdentity(token);
  const allowed = (process.env.SOCIAL_OWNER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return identity && allowed.includes(identity.id) ? identity.id : null;
}
export const browserCookie = (provider: string) => `__Host-spaja-social-${provider}`;
