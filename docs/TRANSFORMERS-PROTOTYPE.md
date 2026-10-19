# TRANSFORMERS 1350 — lokalni prototip

Change driver: korisnik je 19. oktobra 2026. izabrao izradu prvog igrivog prototipa u postojećoj AI-IQ-SUPER-PLATFORMA aplikaciji.
Base revision: `b2d70356fa6cd5291dcf7a0ae810d80a0f482ecd`.

## Implementirano u ovom predlogu

- Ruta `/transformers` i direktan link na `/igrice`.
- Postojeći katalog `igrica-transformers-1350` koristi namenski runner i status `beta`.
- Jedna jedinica menja oblik robot ↔ vozilo kroz prelaz od 0,6 s; novi zahtev tokom prelaza se ignoriše. Vozilo je brže, ali ne puca.
- Lokalni duel protiv skriptovanog bota: početak, pauza, pobeda/poraz/nerešeno i potpuno resetovanje.
- Oba učesnika počinju sa 100 HP. Pogodak skida 10 HP. Domet je 26 jedinica (520 m u šematskoj razmeri). Robot puca na 0,8 s, bot na 1,2 s. Gađanje automatski cilja drugog učesnika. Prepreke blokiraju kretanje i liniju napada. Nema mrežnih igrača ili stvarnih nagrada.
- Vremensko ograničenje 90 s; istek bez eliminacije je nerešen ishod, bez obzira na preostali HP.
- Sektor 2 × 2 km oko približne oznake Smedereva (44,66 N / 20,93 E), sa dve prepreke. Teren je šematski; ne koristi stvarne geografske visine, ulice ili podatke o objektima.
- SVG prikaz sa ortografskom 2.5D projekcijom: pogled odozgo, praćenje iste jedinice i orbitalni pregled sa rotacijom. Ovo nije puna 3D simulacija ili VR prikaz.
- Katalog 23 jedinstvena ID-ja: 1–3 implementirana, 4–23 onemogućena i označena kao planirana. Namene budućih pogleda nisu izmišljene kao usvojena specifikacija.
- Tastatura i dodir: WASD/strelice, T za transformaciju, Space za napad, C za kameru, P/Escape za pauzu. Fokus mora biti na terenu; formularske kontrole čuvaju svoje standardno ponašanje. Gubitak fokusa otpušta komande, a skrivena kartica zaustavlja simulacione korake.

Dimenzionalne oznake kataloga ne menjaju ovaj prototip. Nema novih zavisnosti, infrastrukture, API upisa, finansijskih transakcija ili deployment konfiguracije.

## Planirano, nije implementirano

Liga, eliminacioni turnir, mrežni mečevi, rang-lista, ostale transformacije, AI personality, replay, cela Zemlja i kamere 4–23. Cilj velikog broja jedinica nije dokaz performansi ovog prototipa. Bot ima jednostavno praćenje i može zastati iza prepreke; nije navigacioni AI.

## Reprodukcija i provere

```sh
npm ci --ignore-scripts --no-audit --no-fund
node --import tsx --test src/tests/lib/transformers.test.ts
node --import tsx src/tests/lib/gaming-endzin.test.ts
node --import tsx src/tests/lib/gaming-api-consistency.test.ts
npm run dev
```

Otvoriti `/transformers`, ili pokrenuti TRANSFORMERS iz postojećeg Digitalnog Brouvzera. Proveriti 20 ciklusa transformacije, kretanje oba oblika i prepreke, sve tri kamere tokom transformacije, pauzu, pobedu/poraz/istek vremena i pet novih duela. Za mobilni prikaz proveriti dugmad na dodir, otpuštanje komande van dugmeta i odsustvo horizontalnog skrolovanja.

Potvrđeno 19. oktobra 2026:

- 13 novih testova logike prolazi, uključujući 20 povratnih transformacija, zaključavanje komande, kolizije, brzinu oblika, domet/cooldown/liniju napada, pauzu, oba pobednička ishoda, istek, pet resetovanja i katalog kamera.
- 5 postojećih gaming resolver testova i 5 gaming API consistency testova prolazi.
- ESLint prolazi za svih sedam novih/izmenjenih aplikacionih TS/TSX datoteka.
- Serversko renderovanje potvrđuje početni ekran, SVG i 23 opcije kamera, od kojih je 20 onemogućeno.
- `tsc --noEmit` prijavljuje 274 dijagnostike i u ovom predlogu i na čistoj osnovnoj reviziji. Normalizovani skup dijagnostika je identičan; nema novih TypeScript dijagnostika. Provera cele aplikacije ipak NE prolazi.
- Automatska provera interakcija u pregledaču nije potvrđena: Chromium nije instaliran, a preuzimanje browser paketa nije uspelo. Serversko renderovanje nije dokaz funkcionalnih interakcija u browseru.

## Cross-repo impact

Nema promene IO-OPENUI-AO repozitorijuma ili zajedničkih mrežnih ugovora. Promena kataloga odnosi se samo na centralnu aplikaciju. Stari razgovor kao istorijska referenca: https://chatgpt.com/g/g-p-67c080727f6c8191bba48cc3999f24e9-igrice/c/692376be-8280-8332-a476-5e3d619972cf .

## Review i povratak

Predlog zahteva ljudski pregled pre spajanja, u skladu sa AGENTS.md. Nije dokaz objavljene igre ili produkcione spremnosti. Povratak: revert predloga vraća opšti runner i prethodni kataloški zapis; nema migracija ili trajnih podataka za vraćanje.
