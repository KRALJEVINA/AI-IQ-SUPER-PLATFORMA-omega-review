'use client';

import { useState } from 'react';
import { dohvatiSesiju } from '@/lib/auth/omega-session-client';
import { providers, type Provider } from '@/lib/social-connections/config';
import type { Snapshot } from '@/lib/social-connections/store';

type Integration = { provider: Provider; status: string; snapshot: Snapshot | null };
const labels: Record<Provider, string> = { facebook: 'Facebook stranice', instagram: 'Instagram profesionalni nalog', tiktok: 'TikTok' };
const statuses: Record<string, string> = { authorized_snapshot: 'Autorizovan snimak podataka', ready_for_consent: 'Spremno za saglasnost', not_configured: 'Potrebna konfiguracija aplikacije' };
export default function SocialConnectionsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [message, setMessage] = useState('Prijavite se svojim SPAJA nalogom, pa učitajte status.');
  const [busy, setBusy] = useState(false);
  async function call(path: string, method = 'GET') {
    const session = dohvatiSesiju();
    if (!session?.token) throw new Error('Potrebna je SPAJA prijava.');
    const response = await fetch(path, { method, cache: 'no-store', headers: { Authorization: `Bearer ${session.token}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Zahtev nije uspeo.');
    return data;
  }
  async function refresh() {
    const data = await call('/api/social-connections');
    setIntegrations(data.integrations);
    const outcomes: Record<string, string> = {
      snapshot_ready: 'Autorizacija je završena. Proverite očitane naloge.',
      consent_denied: 'Saglasnost je odbijena; novi podaci nisu preuzeti.',
      invalid_state: 'Zahtev je istekao ili nije prepoznat. Pokrenite povezivanje ponovo.',
      invalid_code: 'Autorizacija nije završena. Pokrenite povezivanje ponovo.',
      provider_failed: 'Mreža nije potvrdila dozvole ili nije vratila podržan poslovni nalog. Pokušajte ponovo.',
    };
    const result = new URLSearchParams(window.location.search).get('result') ?? '';
    setMessage(outcomes[result] ?? 'Status je učitan. Dostupni su samo podaci dobijeni uz saglasnost vlasnika.');
    if (result) window.history.replaceState(null, '', '/social-connections');
  }
  async function action(run: () => Promise<void>) {
    setBusy(true);
    try { await run(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Zahtev nije uspeo.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-4xl space-y-6 p-6">
    <h1 className="text-3xl font-bold">SPAJA — povezivanje društvenih naloga</h1>
    <p>Razvojni pilot: uz saglasnost preuzima jedan snimak identiteta naloga. Snimak ističe za 15 minuta i nestaje pri restartu servera. Nema trajnog povezivanja ni automatskog osvežavanja.</p>
    <p>Facebook: samo stranice kojima upravljate. Instagram: poslovni ili Creator nalog povezan sa Facebook stranicom. Javne adrese iz kontakt API-ja same ne potvrđuju vlasništvo ni monetizaciju.</p>
    <button className="rounded border px-4 py-2" disabled={busy} onClick={() => void action(refresh)}>Učitaj / osveži status</button>
    <p role="status" aria-live="polite">{message}</p>
    <div className="grid gap-4 md:grid-cols-3">{providers.map(provider => {
      const integration = integrations.find(i => i.provider === provider);
      return <section key={provider} className="space-y-3 rounded-xl border p-4">
        <h2 className="text-xl font-semibold">{labels[provider]}</h2>
        <p>{integration ? statuses[integration.status] ?? 'Nepoznat status' : 'Status nije učitan'}</p>
        <button className="rounded border px-3 py-2" disabled={busy || integration?.status !== 'ready_for_consent'} onClick={() => void action(async () => {
          const data = await call(`/api/social-connections/${provider}/start`, 'POST');
          const target = new URL(data.authorizationUrl);
          // Defense in depth: do not navigate to an arbitrary API-returned URL.
          if (target.protocol !== 'https:' || target.hostname !== (provider === 'tiktok' ? 'www.tiktok.com' : 'www.facebook.com')) throw new Error('Nevažeća adresa autorizacije.');
          window.location.assign(target.href);
        })}>Odobri čitanje naloga</button>
        {integration?.snapshot && <>
          <ul>{integration.snapshot.accounts.map(account => <li key={account.id}>{account.name} — ID: {account.id}</li>)}</ul>
          <p>Očitano: {integration.snapshot.observedAt}</p>
          <p>Dozvole: {integration.snapshot.grantedScopes.join(', ')}</p>
          <button className="rounded border px-3 py-2" disabled={busy} onClick={() => void action(async () => {
            await call(`/api/social-connections?provider=${provider}`, 'DELETE');
            await refresh();
            setMessage('Lokalni snimak je obrisan. Za opoziv dozvola koristite podešavanja aplikacija na društvenoj mreži.');
          })}>Obriši lokalni snimak</button>
        </>}
        <p>Prihod: nije dostupan kroz ovu integraciju.</p>
        <p>Isplata: nije implementirana.</p>
      </section>;
    })}</div>
    <p>Posle povratka sa mreže učitajte status. Ponovna autorizacija je potrebna za novi snimak. Tokeni društvenih mreža se ne čuvaju niti šalju pregledaču.</p>
  </main>;
}
