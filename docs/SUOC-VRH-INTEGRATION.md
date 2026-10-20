# SUOC → postojeći VRH dispatcher

Razlog: Nikola Spajić je 20.10.2026. zatražio implementaciju VRH iz
`spaja86/AI-IQ-SUPER-PLATFORMA`. Osnova ove promene je GitHub `main` na
`7146d9797eb3f07e7f05ee865fbdf5a19b404709`.

Ova promena povezuje postojeći SUOC DSL sa postojećim numeričkim VRH profilima.
Ne prepisuje algoritme niti predstavlja nastavak nedostupnog lokalnog ZIP-a
v0.1.2: njegov raspoređivač, demo panel i importi infrastrukture nisu deo ove
GitHub osnove i nisu rekonstruisani iz opisa.

## Izvršavanje

```text
AKTIVIRAJ: jezgro
VRH: {"kind":"loop-call","version":"0.1","name":"FOR PETLJA","input":{"start":1,"end":3,"step":1,"maxIterations":10,"maxDurationMs":100,"status":"ACTIVATED"}}
```

Očekivani izlaz: `[VRH] FOR PETLJA: 6`.
Ista naredba može biti u `ctx.programi.demo`, uz uobičajeni
`AKTIVIRAJ → IZGRADI → POKRENI` tok. `IZGRADI` proverava ugovor i čuva izvor,
bez izvršavanja petlje. Neuspešna ponovna izgradnja čuva prethodni artefakt.

Na postojećoj stranici `/spaja-ultra-repl`, **Učitaj VRH primer** samo postavlja
tekst primera; korisnik bira **Pokreni**. Aktivacija i rezultat pripadaju tom
jednom pokretanju. Poslednji numerički rezultat prikazuje se i kada je nepotpun.

| Verzija ulaza | Postojeći validator / izvršavanje |
| --- | --- |
| `0.1` | FOR PETLJA, `validateVrhLoopRequest` |
| `0.2` | 35 individualnih profila, `validateVrhProfileRequest` |
| `0.3` | SPAJA PETLJA, `validateVrhSpajaRequest`, uključujući strict/fallback |
| `0.4` | UMBREL / DURMITOR, `validateVrhOrchestratorMusema` |

Svaki profil zadržava svoj tačan skup obaveznih polja i dozvoljenih petlji.
Izvršavanje ide isključivo kroz `dispatchVrhLoop(request, 'reference')`.
Nema Java cilja, novog numeričkog engine-a, shell-a, eval-a, mrežnog poziva,
automatske aktivacije servera ili promene baze.

## Rezultati, greške i ograničenja

- `VRH:` prihvata jedan doslovan JSON objekat na jednoj liniji. Nema zamene
  promenljivih, interpolacije, dinamičkog koda ili implicitnog cilja iz ctx.
- Najviše 16384 UTF-16 jedinice po argumentu, 10 VRH naredbi po proveravanom
  AST-u, zbir deklarisanih budžeta do 1000 iteracija i do 1000 ms. Postojeći
  validatori dodatno ograničavaju pojedinačne ulaze, sekvence i segmente.
- Cela grupa VRH naredbi proverava se pre prve akcije. I `transpile`, direktni
  `executeAst` i `IZGRADI` primenjuju ovu proveru; validacija ne izvršava petlje.
- To su ograničenja svakog AST-a/pripremljenog programa, ne globalna kvota
  za sve ponovljene `POKRENI` ili direktne JS pozive. Direktni `runtime.vrh`
  proverava jedan poziv. Numerički tajmeri su postojeće sinhrone provere,
  ne garantovani zidni timeout; nema prekida usred jednog sinhronog runner-a.
- Uspeh zahteva `completed`, razlog `completed`, konačan broj i odsustvo
  `fallbackSummary.successful === false`. Delimični fallback ili dostignut
  limit prekidaju SUOC tok; kasnije komande se ne izvršavaju, ne ispisuje se
  poruka sa numeričkim uspehom, a audit beleži grešku. Prethodni efekti ostaju.
- `getLastVrhResult()` vraća duboku kopiju celog poslednjeg `PetljaResult`, sa
  trace/statusTrail/transferEvents/fallbackSummary. Rezultati prethodnih
  poziva nisu nova istorijska baza. Nevalidan direktni pokušaj briše prethodni
  rezultat pre validacije da se ne prikaže kao rezultat novog pokušaja.
- Aktivacija nije prijava ili serverska autorizacija. Uloge iz JSON-a nisu
  bezbednosna granica. Audit i rezultat su u memoriji, bez WORM/durability
  garancije; ova promena ne predstavlja sandbox za nepoverljiv kod.

## Provere

`npm run test:suoc` pokreće postojeće osnovne i lifecycle testove i novi
`src/tests/spaja-ultra/vrh.test.ts`. Novi runner je uključen i u `test:core`.
Testira se veza parser → preflight → runtime → originalni dispatcher,
svih 38 imena sa odgovarajućim profilima, aktivacija, izgradnja bez izvršavanja,
čuvanje rezultata, prekid pri grešci, fallback, kopije i deklarisani budžeti.
Poređenje sa originalnim runnerom izuzima jedino promenljivo `durationMs`;
ono potvrđuje očuvanje ponašanja, ne nezavisnu matematičku ispravnost petlji.

Rezultati izvršenih provera i otvorene granice navode se u PR-u. Prolaznost
ovih testova nije procenat izgrađenosti cele SPAJA platforme.

Lokalno izvršeno 20.10.2026. na ovoj promeni, Node 24.19.0:

- Svež `npm ci --ignore-scripts --no-audit --no-fund`, bez promene lockfile-a.
- `npm run test:suoc`: osnovni 7/7, lifecycle 17/17, VRH integracija 49/49.
  Ukupno 73/73 u ovom SUOC skupu; nije isti obim kao raniji lokalni paket
  od 44 testa. Trideset osam integracionih slučajeva pokriva sva registrovana imena.
- Četrnaest postojećih VRH/Petlja/Spajascripte test datoteka prolazi,
  uključujući izvorni Petlja runner sa 153 unutrašnja slučaja.
- Puni TypeScript projekta, zasebni strogi TypeScript novog testa i ciljani
  ESLint prolaze. `git diff --check` prolazi.
- Selektivni Next.js webpack build za `/spaja-ultra-repl` prolazi, uključujući
  projektnu TypeScript proveru. HTTP odgovor je 200 i sadrži novu kontrolu i
  oznaku lokalnog izvršavanja. To nije puni build svih ruta.
- `npm run test:core` staje pre prvog testa na `tsx` IPC `listen EPERM`.
  Ekvivalentni direktni `node --import tsx` runneri prolaze: auth 66/66,
  glavni-endzin 61/61, API contracts 48/48; SUOC je zasebno prošao kao gore.
  Direktni smoke runner prolazi 43/43; njegova go-live poruka nije release dokaz.
- `predeploy:check` vraća 0 uz `warning`, nedostajuću lokalnu konfiguraciju
  i postojeće contract upozorenje. Produkcijska konfiguracija nije proveravana.
- Browser provera nije izvršena: Chromium nije instaliran, a pokušaj preuzimanja
  vratio je neispravnu/praznu ZIP arhivu. HTTP provera ne potvrđuje klikanje ili
  hidrataciju. Puni build, puni lint/test lanac, browser i udaljeni CI ostaju
  nepotvrđeni za ovu promenu. Nema tvrdnje o produkcionoj spremnosti.

## Pregled i povratak

Promena je namenjena draft PR-u i ljudskom pregledu prema `AGENTS.md`.
Nema automatskog merge-a, release-a, produkcione izmene ili povezivanja
naloga. Rollback vraća ovaj commit/PR; nema migracija podataka ili novih
zavisnosti. Izmenjen je samo lokalni SUOC/REPL i test komanda.

Cross-repo impact: IO-OPENUI-AO i drugi povezani repozitorijumi nisu izmenjeni
i ne dobijaju novu runtime integraciju. Postojeći Petlja i Spajascripte ugovori
ostaju neizmenjeni. SPAJA BAZA/SERVER i infrastruktura ostaju zaseban rad.
