import { createHash, randomBytes } from 'node:crypto';
import type { Provider } from './config';
export type Snapshot = { provider: Provider; accounts: { id: string; name: string }[]; grantedScopes: string[]; observedAt: string; expiresAt: number; consumed?: boolean };
type Pending = { userId: string; provider: Provider; browserHash: string; expiresAt: number; consumed?: boolean };
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const pending = new Map<string, Pending>();
const snapshots = new Map<string, Snapshot>();
const key = (userId: string, provider: Provider) => JSON.stringify([userId, provider]);
function cleanup(now: number) {
  for (const [id, value] of pending) if (value.expiresAt <= now) pending.delete(id);
  for (const [id, value] of snapshots) if (value.expiresAt <= now) snapshots.delete(id);
}
export function begin(userId: string, provider: Provider, now = Date.now()) {
  cleanup(now);
  if (pending.size >= 1000) throw new Error('capacity');
  // Replace previous attempts for this identity/provider.
  for (const [id, value] of pending) if (value.userId === userId && value.provider === provider) pending.delete(id);
  const state = randomBytes(32).toString('base64url');
  const browser = randomBytes(32).toString('base64url');
  pending.set(hash(state), { userId, provider, browserHash: hash(browser), expiresAt: now + 300_000 });
  return { state, browser };
}
export function consume(state: string, browser: string, provider: Provider, now = Date.now()) {
  cleanup(now);
  const id = hash(state);
  const value = pending.get(id);
  if (!value || value.consumed || value.provider !== provider || value.browserHash !== hash(browser)) return null;
  value.consumed = true; // single use, before any external request
  return value.userId;
}
export function save(userId: string, snapshot: Snapshot, state: string) {
  cleanup(Date.now());
  const attempt = pending.get(hash(state));
  if (!attempt?.consumed || attempt.userId !== userId || attempt.provider !== snapshot.provider) throw new Error('cancelled');
  pending.delete(hash(state));
  if (snapshots.size >= 1000 && !snapshots.has(key(userId, snapshot.provider))) throw new Error('capacity');
  snapshots.set(key(userId, snapshot.provider), snapshot);
}
export function read(userId: string, provider: Provider, now = Date.now()) {
  cleanup(now);
  return snapshots.get(key(userId, provider)) ?? null;
}
export function forget(userId: string, provider: Provider) {
  snapshots.delete(key(userId, provider));
  for (const [id, value] of pending) if (value.userId === userId && value.provider === provider) pending.delete(id);
}
