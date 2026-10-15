# OMEGATROJEKTORIJUM — prvo izdanje

Razlog promene: korisnik traži konkretno prvo izdanje u postojećoj SPAJA platformi. Predloženo izdanje dodaje `/omegatrojektorijum` i `/omegatrojektorijum/studio`, vezu u navigaciji i veze ka postojećim `/bank-prototype` i `/login` stranicama. Ne uvodi nov način prijavljivanja ili vlasnička prava.

Katalog koristi prethodno pripremljenu matricu 25 oblasti × 53 pravca × 80 zajedničkih obrazaca: 1.325 stavki i 106.000 koncepata. Status svih zapisa je ideja, ne potvrđena implementacija ili dokaz originalnosti. Korisnik može da pretražuje, filtrira, otvori 80 koncepata i izveze odabran skup u JSON. Koncepti se proširuju iz kompaktnih podataka; ne šaljemo 106.000 gotovih zapisa prilikom otvaranja stranice.

Studio koristi lokalni MediaRecorder. Kamera i mikrofon se traže tek klikom korisnika. Snimak ostaje u memoriji pregledača i preuzima se na uređaj. Nema upload-a videa, serverskog snimanja, montaže, AI generisanja filma ili obećanja MP4 formata: koristi se podržani WebM ili MP4 format. Kratki kadrovi su početni slučaj; snimak se gubi ako se stranica zatvori bez preuzimanja. Potrebni su HTTPS, kompatibilan pregledač, kamera, mikrofon i korisnička dozvola.

## Bezbednosna granica

Globalna zabrana kamere i mikrofona ostaje na ostalim rutama. Samo tačna studio putanja (uz dozvoljeni završni slash u proksiju) dobija `camera=(self), microphone=(self)` i `media-src 'self' blob:`. Geolocation, payment i USB su zabranjeni u studiju. Politika se primenjuje i u Next headers i u proksiju; postojeća autentikacija i bankarske granice nisu menjane.

## Provere u ovom pokušaju

- Ciljani test kataloga prolazi: 1.325 stavki, 106.000 jedinstvenih oznaka, granice oznaka, pretraga/filter, JSON roundtrip i postojanje odredišnih ruta.
- Ciljani test politike prolazi: studio i završni slash, nepromenjene login/bank/katalog rute i odbijanje putanje sa sličnim prefiksom; Next konfiguracija i proksi su provereni.
- Ciljani ESLint prolazi. Izolovana TypeScript provera novih stranica, zavisnosti, proksija i Next konfiguracije prolazi bez dijagnostike.
- Postojeći smoke testovi: 43/43 prolazi kroz `node --import tsx src/tests/smoke/smoke.test.ts`.
- Postojeći auth testovi: 66/66 prolazi kroz `node --import tsx src/tests/auth/omega-auth.test.ts`.
- `npm run predeploy:check` završava kodom 0 sa statusom warning. To nije potvrda stvarne operativne dostupnosti.
- Standardni `npm test` i `npm run test:smoke` blokira lokalni tsx CLI IPC `listen EPERM`. Direktni Node loader izbegava taj IPC za gore navedene konkretne testove; puna test komanda nije potvrđena.
- Puni `tsc --noEmit` pada u drugim, nemenjanim modulima, uključujući extrimli-extrem. Nema uspešne pune provere tipova.
- `npm run build`: faza kompilacije prolazi (56 s); pokušaj je zaustavljen vremenskim ograničenjem od 75 s tokom TypeScript koraka. To nije uspešan produkcioni build.
- Pokušaj lokalnog browser testa nije izvršen: Chromium nije instaliran, a preuzimanje paketa vratilo je neispravnu arhivu. Snimanje stvarnog videa, izgled u pregledaču, deployment i korisnički tok prijave ostaju neprovereni.

## Rollout, trošak i rollback

Draft PR → ljudski pregled konfiguracije i dozvola → rešavanje punih quality gate blokera → preview → provera na telefonu i desktopu → produkciona odluka. Ne uključivati u produkciju na osnovu samo ovih ciljanih testova. Ne zaobilaziti CI, ne menjati dugovanja ili naloge i ne tvrditi da je nova mreža ili bankarska usluga aktivirana.

Nema novih plaćenih servisa, API modela, cloud video prostora ili migracija baze. Git/Vercel automatizacija može koristiti postojeću kvotu za build i preview; iznos troška nije izmeren. Nema potvrđenog prihoda ili otplate dugovanja. KPI za proveru: vreme otvaranja kataloga, odziv pretrage na telefonu i uspešno preuzimanje kratkog snimka.

Rollback: ukloniti novu navigacionu stavku i dve nove rute; vratiti prethodni proksi i Next konfiguraciju; ukloniti novi lib, podatke i testove. Nema promene podataka ili migracije. Cross-repo impact: No linked repo change required.
