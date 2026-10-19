# TRANSFORMERS 1350 development verification — partial

Base: `b7634c174e399bfb74ac1866c6f91ba0c41abdc6` (main, includes merged #1351 and #1352).
Requested scope: direct route, industry/browser catalog launch, transformations, movement,
obstacles, attacks, cameras, pause, duel completion, reset and touch controls.

## Confirmed automated results

- `node --import tsx src/tests/lib/transformers.test.ts`: 13/13 pass.
- `node --import tsx src/tests/lib/transformers-launch.test.ts`: 4/4 pass.
- Next.js 16.4.1 development server, webpack, no production build/deployment.
- HTTP requests made in the same process environment as the dev server:

| Route | HTTP | Observed server-rendered evidence |
| --- | --- | --- |
| `/transformers` | 200 | `SPREMAN ZA DUEL?` appears |
| `/industrija` | 200 | Serialized native TRANSFORMERS launch data appears |
| `/spaja-digitalni-brouvzer` | 200 | Serialized native TRANSFORMERS launch data appears |
| `/spaja-digitalni-brouvzer?igricaId=igrica-transformers-1350` | 200 | Shell responds, no `Nedozvoljen URL`; client runner not verified |

Both catalogs serialize `/spaja-digitalni-brouvzer?igricaId=igrica-transformers-1350`.
An initial smoke assertion requiring a literal HTML anchor failed: streamed catalog data
must not be described as an observed clickable link. The revised smoke check inspects
serialized launch data only; actual DOM links remain a browser acceptance item.
HTTP success does not establish successful hydration or interaction.

## Browser evidence and blockers

No gameplay interaction was successfully observed in a browser in this session.
Local Playwright could not launch because its Chromium executable is absent.
The official Playwright installer received HTML instead of a ZIP archive and failed
with `End of central directory record signature not found`.
The separate cloud browser could not reach `http://localhost:3100/transformers`
and reported `net::ERR_CONNECTION_REFUSED`.
These are verification-environment failures, not reproduced game defects.

Follow-up on 19 October: Google Chrome stable was successfully downloaded from
the official `dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb`
source and extracted outside the repository. `chrome --version` reports
`Google Chrome 155.0.8059.84`. Playwright launch still fails before opening a page:
`FATAL:chrome/browser/process_singleton_posix.cc:297 ... socket() failed:
Operation not permitted (1)`. The remaining blocker is the execution environment's
socket restriction, rather than a missing browser binary. No network isolation or
OS security restriction was changed to bypass this failure.

| Behavior | Automated evidence | Browser status |
| --- | --- | --- |
| Direct route and both catalogs | HTTP/SSR and launch-builder checks pass | Hydration/click-through unconfirmed |
| Robot ↔ vehicle | Engine round trips and transition lock pass | Unconfirmed |
| Movement and obstacles | Normalization, stopping, boundaries and both forms pass | Unconfirmed |
| Attack | Range, cooldown, line of sight and vehicle restriction pass | Unconfirmed |
| Cameras | 3 enabled of 23; world identity preserved | Visual change/orbit unconfirmed |
| Pause | Health, movement, transition and clock freeze | Unconfirmed |
| Duel completion | Win, loss, timeout draw and terminal state pass | Unconfirmed |
| Reset | Five resets restore initial state | Unconfirmed |
| Touch controls | No executed UI test | Unconfirmed, including multi-touch/cancel |

## Repeatable HTTP smoke check

Start `npm run dev -- --webpack --hostname 127.0.0.1 --port 3000`, then run
`node scripts/transformers-dev-smoke.mjs` in the same network environment.
Optional `TRANSFORMERS_DEV_URL` must be a loopback URL; no production target is accepted.
This script deliberately reports HTTP/SSR results only.

## Prepared browser acceptance suite — NOT EXECUTED

`scripts/transformers-browser-qa.mjs` prepares seven browser scenarios: keyboard
transformation/movement/release/pause/cameras/orbit; obstacle movement blocking;
attack/win/final result/reset; idle loss; actual click-through from each of the two
catalogs including the dimension picker; mobile touch hold/release and transform.
It uses Playwright's controlled clock and rendered DOM, not direct reducer mutation.
The mobile scenario sends Chromium touch input; it is not a physical-device test.

Only JavaScript syntax/static checks are possible here. These seven scenarios have
NOT passed and must not be counted among the 17 passing engine/navigation tests.
Their assertions and selectors need validation in a working browser environment.
Timeout draw, shot obstruction, multi-touch, cancellation and focus changes still
require additional browser acceptance work beyond this prepared suite.

In a development checkout, install optional test tooling without changing tracked
dependencies: `npm install --no-save --package-lock=false playwright`, then
`npx playwright install chromium`. Start the local dev server and run
`node --test scripts/transformers-browser-qa.mjs` in the same network environment.
`TRANSFORMERS_DEV_URL` optionally selects another loopback dev URL;
`TRANSFORMERS_CHROME_PATH` optionally selects an already installed Chrome executable.
No CI, production target or runtime dependency is introduced by this suite.

## Remaining acceptance work

Use a development environment with an installed browser and network access to its local
server. Click the actual TRANSFORMERS card in each catalog and start a duel. Exercise
keyboard and touch movement (release, cancellation, simultaneous directions and focus
changes), transformation in both directions, obstacle/shot blocking, three camera
views and orbit, pause/resume, all duel outcomes and new-duel reset. Record browser
errors and screenshots. Add a regression test and fix only for an observed/reproduced
defect. Do not declare browser acceptance complete from the passing engine tests.

No gameplay fix is proposed because no game defect was reproduced. No production
deployment, merge, dependency, CI, infrastructure or linked-repository change is included.
Human review is required. Rollback: remove this report and both QA scripts. OKRID: N/A.
