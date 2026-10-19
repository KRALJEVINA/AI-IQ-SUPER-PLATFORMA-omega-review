import type { Metadata } from 'next';
import Link from 'next/link';
import { StranicaRenderer } from '@/components/sekvence';
import { igriceSekvence } from '@/lib/sekvence/igrice-page';
import { TOTAL_IGRICA } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Igrice',
  description: `${TOTAL_IGRICA} igrica u 18 kategorija — SPAJA Gaming ekosistem`,
};

export default function Igrice() {
  return <>
    <div className="bg-slate-950 px-6 py-4 text-cyan-300"><Link className="underline" href="/transformers">TRANSFORMERS 1350 — otvori lokalni prototip →</Link></div>
    <StranicaRenderer sekvence={igriceSekvence} />
  </>;
}
