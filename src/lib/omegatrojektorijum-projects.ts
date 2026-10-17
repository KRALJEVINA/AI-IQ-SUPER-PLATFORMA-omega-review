/** Reviewed snapshot, not a live health check. Do not inherit platforme.ts active/progress claims. */
export type IntegrationStatus = 'local' | 'functional' | 'documented' | 'planned';
export const integrationLabels: Record<IntegrationStatus, string> = {
  local: 'Lokalna funkcija u kodu',
  functional: 'Funkcionalna integracija',
  documented: 'Dokumentaciona veza',
  planned: 'Budući plan',
};
export const projectsCheckedAt = '2026-10-16';
export const federationEvidence = 'https://github.com/spaja86/AI-IQ-SUPER-PLATFORMA/blob/a6c7c332a06698e04256ebf64f1c0cb4776ee46f/docs/MULTI-REPO-LINKS.md';
export type OmegaProject = {
  repository: `spaja86/${string}`;
  name: string;
  purpose: string;
  relationship: 'runtime-integrated' | 'summary-synced' | 'policy-linked' | 'narrative-only';
  status: IntegrationStatus;
  access: 'public' | 'private';
  evidence: string;
  boundary: string;
  nextStep: string;
};
export function githubProjectUrl(repository: OmegaProject['repository']) {
  return `https://github.com/${repository}`;
}
export const omegaProjects: readonly OmegaProject[] = [
  {
    repository: 'spaja86/AI-IQ-SUPER-PLATFORMA', name: 'AI IQ SUPER PLATFORMA',
    purpose: 'Centralna SPAJA aplikacija; katalog ideja, bankarski prototip i lokalni filmski studio.',
    relationship: 'runtime-integrated', status: 'local', access: 'public',
    evidence: 'https://github.com/spaja86/AI-IQ-SUPER-PLATFORMA/blob/a6c7c332a06698e04256ebf64f1c0cb4776ee46f/src/app/omegatrojektorijum/page.tsx',
    boundary: 'Postoje lokalne rute u izvornom kodu. Produkciona dostupnost nije potvrđena.',
    nextStep: 'Završiti pregled i proveru aplikacije pre odluke o objavljivanju.',
  },
  {
    repository: 'spaja86/IO-OPENUI-AO', name: 'IO-OPENUI-AO',
    purpose: 'Kod za glasovnu komunikaciju preko WebRTC i tekstualni chat preko SSE.',
    relationship: 'summary-synced', status: 'documented', access: 'public',
    evidence: 'https://github.com/spaja86/IO-OPENUI-AO/blob/main/README.md',
    boundary: 'Dokumentovana koordinacija i razmena samo bezbednih sažetaka; izvršavanje sinhronizacije i runtime veza nisu potvrđeni.',
    nextStep: 'Potvrditi usaglašen ugovor i test prenosa sažetka bez tajni i sirovih internih podataka.',
  },
  {
    repository: 'spaja86/Ai-Iq-World-Bank', name: 'AI IQ WORLD BANK',
    purpose: 'Javni informativni sajt u razvoju sa edukativnim anuitetskim kalkulatorom.',
    relationship: 'policy-linked', status: 'documented', access: 'public',
    evidence: 'https://github.com/spaja86/Ai-Iq-World-Bank/blob/main/README.md',
    boundary: 'Upravljačka veza; ne potvrđuje aktivno bankarstvo, plaćanja ili pristup računima.',
    nextStep: 'Dogovoriti bezbedna statusna polja i dokaz njihovog prihvatanja u povezanom projektu.',
  },
  {
    repository: 'spaja86/Ai-Iq-Menja-nica', name: 'AI IQ MENJAČNICA',
    purpose: 'Sajt i razvojni pravac za exchange, wallet, partnerstva i licencni okvir.',
    relationship: 'policy-linked', status: 'documented', access: 'public',
    evidence: 'https://github.com/spaja86/Ai-Iq-Menja-nica/blob/main/README.md',
    boundary: 'Dokumentaciono povezivanje; trgovanje, čuvanje sredstava i settlement nisu potvrđeni.',
    nextStep: 'Definisati i testirati ugovor za sažetak spremnosti, bez ledger podataka i wallet tajni.',
  },
  {
    repository: 'spaja86/Kompanija-SPAJA', name: 'KOMPANIJA SPAJA',
    purpose: 'Poslovni i operativni okvir SPAJA ekosistema prema javnom registru.',
    relationship: 'policy-linked', status: 'documented', access: 'private',
    evidence: federationEvidence,
    boundary: 'Privatan repozitorijum; GitHub veza zahteva ovlašćen pristup. Prikazana je samo već javno dokumentovana namena.',
    nextStep: 'Ljudski pregled javnog sažetka vlasništva i plana uvođenja; privatni sadržaj ostaje van registra.',
  },
  {
    repository: 'spaja86/SVETSKA-ORGANIZACIJA', name: 'SVETSKA ORGANIZACIJA',
    purpose: 'Strateška dokumentacija, pravila i tehnička osnova buduće platforme za znanje i kompetencije.',
    relationship: 'policy-linked', status: 'documented', access: 'public',
    evidence: 'https://github.com/spaja86/SVETSKA-ORGANIZACIJA/blob/main/README.md',
    boundary: 'Dokumentaciona i upravljačka veza; budući servisi i izdavanje licenci nisu potvrđeni.',
    nextStep: 'Usaglasiti javni institucionalni sažetak i kriterijume spremnosti.',
  },
  {
    repository: 'spaja86/SpajaNikOpenEvolution', name: 'SPAJANIKOPENEVOLUTION',
    purpose: 'Priprema migracije postojeće platforme i specifikacije povezivanja repozitorijuma.',
    relationship: 'narrative-only', status: 'planned', access: 'public',
    evidence: 'https://github.com/spaja86/SpajaNikOpenEvolution/blob/main/README.md',
    boundary: 'Narativna veza i budući plan; migracija platforme i operativno povezivanje nisu potvrđeni.',
    nextStep: 'Potvrditi migrirani kod i stvarne putanje. Zadržati narativnu granicu iz registra.',
  },
];
