# TypeScript build blocker investigation — 2026-10-17

Base main revision: `6235cb58d48e272fca2804845231b4afa373be13`.
Change driver: user's request to reproduce and group remaining TypeScript errors, fix a bounded contract cluster, add regressions, and prepare a separate review PR. Related context: draft PRs #1345 and #1347; neither is the base of this patch.

## Reproduction

Node 24.19.0, TypeScript 5.9.3, Next.js 16.4.1. Command, run before and after:

```sh
node node_modules/typescript/bin/tsc --noEmit --pretty false --incremental false
```

Both runs exit 2. Diagnostics: **288 → 274 (14 removed, zero new diagnostic messages)**. Counts match compiler diagnostic header lines, not continuation lines or unique bugs. Before/after message comparison ignores shifted source line numbers. Tests are excluded by the existing tsconfig; the new regression explicitly compiles a virtual consumer against the real report types.

Dependencies were reused from an existing local installation with byte-identical package-lock.json, initially linked for the baseline and locally hardlinked for the build. This is not a fresh npm ci verification. Lockfile SHA-256: `455872928ca1677f9e78715121ce3e869b65ce668bb0b7c2c73b65c65006c437`. No dependency/lockfile or compiler configuration change.

## By source file

| File | Before | After |
| --- | ---: | ---: |
| `src/lib/extrimli-doker-kurat-izek-dokar-track.ts` | 2 | 2 |
| `src/lib/extrimli-extrem/index.ts` | 30 | 30 |
| `src/lib/extrimli-extrondol/index.ts` | 250 | 236 |
| `src/lib/extrimli-innovation-registry.ts` | 5 | 5 |
| `src/lib/extrimli-version-roadmap.ts` | 1 | 1 |

## By compiler code

| Code | Before | After |
| --- | ---: | ---: |
| TS1117 | 3 | 3 |
| TS2322 | 260 | 246 |
| TS2339 | 6 | 6 |
| TS2345 | 4 | 4 |
| TS2353 | 2 | 2 |
| TS2367 | 2 | 2 |
| TS2561 | 3 | 3 |
| TS2739 | 3 | 3 |
| TS2740 | 1 | 1 |
| TS2741 | 4 | 4 |

TS2322 includes positional tuple drift, widened literals/booleans, nullability and readonly/mutable conflicts. TS2741/TS2739/TS2740 indicate missing required properties. TS2339 indicates absent members; TS2345 includes never/narrow argument contracts. TS2561/TS2353 flag unknown or misspelled fields; TS1117 flags duplicate object keys; TS2367 flags comparisons outside the inferred status domain. Counts alone do not decide whether implementation or contract is authoritative.

## First bounded fix: two roadmap acceptance-evidence contracts

The release audit runtime emits 67 ordered paths while its old type declares 48. The reflection governance runtime emits 61 paths while its old type declares 17. Newer bounded metadata additions were present in the values but absent in these tuple declarations, shifting the positional comparisons. Existing EXTRONDOL tests already expect newer entries such as AI IQ LABORATORIJA, DE VINČI KOD and MONTEZACIJA.

Move those two existing ordered value lists verbatim into `acceptance-evidence.ts`. Derive the two property types with `typeof` the corresponding readonly literal tuple; use the same constants at the existing call sites. The source strings, order and report JSON are preserved. No `any`, unchecked cast, suppression, `string[]` widening or global TypeScript bypass is introduced. `as const` preserves the exact literals; it does not cast the value to a mismatched contract.

Removed: one TS2322 for the 67/48 length mismatch and thirteen TS2322 positional errors for the reflection evidence list (base locations index.ts:299,307–319). The fix does not certify that any listed evidence path is complete, live, approved or independently verified. Existing path vocabulary is retained as compatibility metadata.

## Regression and validation

- New `node --import tsx src/tests/lib/extrimli-acceptance-evidence.test.ts`: **2/2 pass**. Runtime report hashes preserve the complete 61/67-element serialized arrays observed on the exact base. The TypeScript consumer accepts both complete lists and rejects missing, extra, reordered and unknown paths for each property (eight negative assignments). No assertion is used to force invalid tuples through.
- Regression rejection: original base index/types plus the new test and its constants dependency yield 1 pass / 1 fail at `governance/complete`. The baseline runtime hash passes, proving the test detects the old type drift rather than requiring changed runtime data.
- Existing EXTRONDOL suite, direct module runner: **64/64 pass**.
- Existing EXTRIMLI API route suite, direct module runner: **32/32 pass**.
- Direct smoke module runner: **43/43 pass**. Its generic go-live message is not evidence of production readiness.
- Focused ESLint on all four TS files and `git diff --check`: pass.
- Full ESLint: **30 errors / 91 warnings**, outside the changed/new files.
- Standard `npm test` and `npm run test:smoke`: fail before tests run because tsx CLI IPC listen returns local EPERM. The full repository test suite has not passed; direct targeted runners are reported separately.
- `npm run predeploy:check`: exit 0, **warning** status (missing operational environment and existing contract warnings).
- `npm run build`: application compiles (35.1s), then **fails TypeScript checking**. No successful production build.
- New contract fixture compilation still exposes 38 transitive diagnostics outside the fixture; those remain blockers and are not silently treated as success. The whole-project command above remains authoritative for the total 274.
- Dependency audit not rerun; no security clearance claimed. Remote CI not executed or confirmed for this unpublished patch.

## Remaining shared causes and priority

1. **Next contract review, high priority:** 196 TS2322 diagnostics in EXTRONDOL are concentrated in three positional lists: `developerAndCreateImplementationPackage.routeSummaryFields` (76), `downstreamSync.syncedContractFields` (63), and `startProject.mandatoryOutputs` (57). Compare intended required entries against existing output and documented consumers before changing either side. These lists contain both additions and omissions; copying the implementation into the type could erase intended requirements. Do not apply the first fix mechanically.
2. **Missing required fields, high priority:** inspect EXTREM's `developerAndCreateRepoWideReflection` (13 missing fields reported in one diagnostic), `packageOutputs.videoStoryboardSummary`, `kraljevskiProgramskiUneverzitetBoundary.boundedCivicTrack`; EXTRONDOL's `consumerAnchors.publicOutput` and `konstrukcijeIProjektovanjeSummary.nalazSummary`, plus multi-field TS2739 objects. Derive values from authoritative upstream contracts, preserving failure/fallback states rather than inventing readiness or approval.
3. **Other contract/behavior discrepancies:** EXTREM acceptance-evidence drift (16 TS2322) and syncedFields (2); EXTRONDOL misspelled currentWawe vs currentWave, absent members, nullable effectiveDate, narrowed booleans/statuses, duplicate object keys, and readonly surface snapshots. Innovation registry literal inference/null cache contract (5); DOKER status traversal narrowed to never (2); version roadmap Record<string, never> rejects a supplied daily cadence (1). Review duplicate keys before changes: their current last-write behavior can affect output.

Full remaining locations/messages are in `tsc-after.txt` and machine-readable `diagnostics.json` in the accompanying review package. `cause-groups.txt` groups the after diagnostics by enclosing source property and code; these are syntax locations, not a claim of independent root causes. The complete file/code tables above sum to 274.

## Review, publication and rollout

Prepared for a separate **draft** PR through the isolated fork `KRALJEVINA/AI-IQ-SUPER-PLATFORMA-omega-review`, branch `review/typescript-acceptance-evidence`, targeting `spaja86/AI-IQ-SUPER-PLATFORMA:main`. The user explicitly approved this destination on 2026-10-18 (Europe/Belgrade). GitHub connector branch writes returned 403; publication uses the authorized browser. No workflow enablement, merge or production deployment is dispatched. Remote CI results must be checked independently after publication.

AGENTS.md requires signed commits and human review before merge. No unsigned local commit was created. Keep the eventual PR draft until eligible human review and required gates are complete. No merge, deployment, infrastructure change or production promotion is authorized by this patch. Revert the five proposed files to undo it. No paid service or new runtime work is added. OKRID: N/A for this bounded type-contract repair; no config/deploy/security feature change.

## Cross-repo impact

No linked repository change required: this preserves the existing serialized evidence paths, values and order. IO-OPENUI-AO is untouched; no downstream sync, shared runtime protocol, secrets, payment or authorization logic is changed. Documentation references to that repo remain compatibility strings, not proof of a completed integration.
