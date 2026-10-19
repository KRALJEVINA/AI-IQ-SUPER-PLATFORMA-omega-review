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
Human review is required. Rollback: remove this report and smoke script. OKRID: N/A.
