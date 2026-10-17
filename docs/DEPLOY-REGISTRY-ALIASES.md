# Deploy Registry identity contract

Reviewed against main `6235cb58d48e272fca2804845231b4afa373be13`, 17 October 2026.

## Mekartor evidence

`src/app/mekartor/page.tsx` and `src/app/api/mekartor/route.ts` implement routes inside this Next.js application. `platforms/mekartor/README.md` explicitly describes a repo-local surface, `/mekartor`, `/api/mekartor`, the parent production origin and an optional dedicated `VERCEL_DEPLOY_HOOK_MEKARTOR`. Root `vercel.json` selects Next.js. The existing registry assigns the parent's project ID to Mekartor. Together these support intentional shared-project representation in source; they do not verify live Vercel project ownership, hook destinations, deployment success or availability.

## Explicit rule

`DeployPlatformEntry.id` is the logical platformId and must remain unique. `vercelProjectId` is a physical project reference and may repeat only for a reviewed alias pair. `allowedDeployProjectAliases` pins exactly `mekartor -> ai-iq-super-platforma` to the existing project `ai-iq-super-platforma`. No new project IDs are introduced.

`validateDeployRegistryIdentity` rejects duplicate logical IDs, unrelated duplicate projects, third members of the approved project, missing alias endpoints and project drift of either or both endpoints. The checked-in rule is a single direct edge; extending it requires code review. Validation is enforced by the existing registry test, not by a new runtime request guard.

## Compatibility and security boundary

The registry's nine data records and helper outputs remain identical to base. No authorization, hooks, routes, manual-trigger flags, environment handling, history or production gates are redirected or deduplicated. The alias table is test validation metadata only. Mekartor continues to resolve its own hook; a missing Mekartor hook never falls back to the parent hook. Hook values remain outside Git.

Existing limitation: `isSpajaProductionGatePlatform` selects `ai-iq-super-platforma` and `kompanija-spaja`, not `mekartor`. All production requests still require `DEPLOY_PRODUCTION`, and the HTTP endpoint still requires signed ACCESS and ADMIN clearance. This PR preserves that behavior; it does not certify that distinct hooks point to separate physical projects or that governance coverage is sufficient for every shared-project route. A separate security review should assess this before production use.

## Local validation

- Original registry suite reproduced: **15 pass / 1 fail** (duplicate project).
- Updated registry: **24/24**; trigger/history: **16/16**; real trigger HTTP handler: **9/9**.
- Mekartor: **4/4**; deploy diagnostics: **5/5**; deploy UI contracts: **4/4**.
- Direct smoke runner: **43/43**. Its generic go-live message is not deployment readiness evidence.
- Focused ESLint: pass. Standalone strict TypeScript for registry, validator and registry tests: pass. `git diff --check`: pass.
- Full TypeScript: **288 diagnostics** in existing EXTRIMLI files; no touched-file diagnostics.
- `npm test`: blocked by local tsx CLI IPC `listen EPERM`; full suite not claimed passed. Direct runners use `node --import tsx <test-path>`.
- `npm run predeploy:check`: exit 0, warning status (existing configuration/contract warnings).
- Application build compiles, then exits 1 on existing EXTRIMLI type errors; no successful application build claimed. No production deployment, live hook, infrastructure change, auto-merge or release performed.

## Review, rollout and rollback

User change driver: fix Deploy Registry duplicate check without invented physical IDs; separate draft PR related to #1345, not stacked on its local-adapter changes. Proposed OKRID-2026-DEPLOYREGISTRY-001, release-governance, pending owner review @spaja86. KPI: approved source alias accepted; accidental duplicates rejected; zero changed runtime mappings.

Keep draft for human review and outstanding release gates. Rollback: revert this bounded validator/test/comment/doc change. No new service, runtime network request, dependency or paid resource. No linked-repo change required; `spaja86/IO-OPENUI-AO` is untouched and receives no new deployment jobs or metadata contract. No banking/payment changes.
