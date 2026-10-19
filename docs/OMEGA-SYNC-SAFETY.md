# OMEGA synchronization review boundary

Change driver: prevent unreviewed development branches entering main.
Proposed governance ID: OKRID-2026-OMEGASAFETY-001 (release-governance).
Owner: repository maintainer. Status: proposed, pending human review.

## Verified starting state — 2026-10-16

- `omega-mega-merge.yml`: scheduled at 01:00, 07:00, 13:00, 19:00 UTC;
  push to `copilot/**` except `copilot/automate-merge-branches`; manual dispatch
  with `delete_merged` default true. Scans all branches except main/master/develop/
  staging/production, directly merges ahead branches, pushes main, and deletes
  branches already included in main. No approval or successful-CI gate.
- `omega-branch-sync.yml`: scheduled at 03:00 and 15:00 UTC and manual dispatch.
  Phase 1 merges ahead remote branches into main and pushes main. Phase 2 depends
  on phase 1 and merges main into copilot branches, pushing each. No review gate.
- Additional bypass: `omega-auto-merge.yml` merges labeled or bot-authored PRs.
  It checks only the first page of check runs, accepts skipped runs, and never
  checks human approvals. Its job runs for check_suite events regardless of
  suite conclusion, or successful Omega Build workflow_run events. The review
  event does not satisfy its job condition.
- Main at `a6c7c332a06698e04256ebf64f1c0cb4776ee46f` is reported by the branch
  API as `protected: false`, protection disabled, required checks empty.
- Detailed branch-protection GET returns 403, Resource not accessible by
  integration. This limits inspection; it does not prove absence by itself.
- Active ruleset 14223705 (`PASWORD`) has empty ref include/exclude lists,
  deletion/non-fast-forward restrictions and Copilot review; it contains neither
  required PR approvals nor required status checks. Copilot review is not human
  approval. Repository-level protections were not changed by this PR.
- No evidence here attributes PR #1340 or #1341 to an automatic workflow.

## Proposed behavior

Both scheduled discovery functions remain. Each direction now creates a draft PR
only when there are commits to propose, or reuses an open PR without modifying it.
`main -> copilot/*` synchronization also requires a reviewed PR, so it cannot
silently invalidate an existing review. No branches are pushed, merged or deleted.
The legacy automatic PR merger is retired to a manual informational workflow.

Only main schedule/manual executions run the proposal jobs. The previous
copilot push trigger is removed so privileged automation does not execute a
workflow definition from a development branch. Checkout reads main with persisted
credentials disabled. Tokens have contents read and pull-requests write only;
no PAT, custom token, deployment credential, or branch code execution is used.
Both proposal workflows serialize under one concurrency group. API errors fail
the job. Branch strings are API data, never interpolated into shell scripts.

Generated PRs remain drafts until a maintainer chooses to review them. Actions
must be permitted to create PRs in repository settings. If disabled, proposal
creation fails; there is no direct-write fallback. Events created using
GITHUB_TOKEN may not trigger further workflows: a maintainer must mark the PR
ready and ensure CI actually ran before merging. Main-to-copilot PRs require
applicable branch CI; the existing Omega Build PR trigger only targets main.

## Required administrator configuration before declaring main protected

The workflows never merge anything, even when approved and green. Server-side
rules are still needed to enforce approval/checks for every other actor:

1. Create an active branch ruleset explicitly including `refs/heads/main`.
2. Require a pull request, at least one eligible human approval, dismiss stale
   approvals on new commits, and require approval of the latest reviewable push.
   A PR author cannot satisfy their own approval requirement; use a separate
   eligible human reviewer. Require resolved review threads.
3. Require successful checks from the trusted GitHub Actions integration,
   including `Omega sync safety` and `🏗️ Build & Validate`, plus the repository's
   applicable security gate. Verify exact check names/app IDs from real runs.
   Require the branch to be up to date. Do not waive failing baseline checks.
4. Block force pushes/deletion and do not grant automation/admin bypasses.
5. Apply equivalent review protection to any development branches requiring
   enforced approvals for synchronization. Verify with a non-admin attempt that
   direct writes and unapproved/failed-check merges are rejected.

This PR does not claim those administrative settings have been applied. The
available integration cannot inspect the detailed protection endpoint or write
administrative settings. Until this PR is manually reviewed/merged and the rules
are enforced, the existing workflows on main remain active.

The residual direct writer in `omega-auto-build.yml` is removed by the separate
OMEGA CI evidence change (OKRID-2026-OMEGACI-001, proposed, owner @spaja86).
It uses contents/pull-requests read, disables persisted checkout credentials,
and uploads per-run CI evidence to Actions artifacts. No main write or bypass
is needed. `/deploy_status.json` is historical, not a deployment confirmation.
See [CI evidence and public status](DEPLOY-PORTFOLIO.md#ci-evidence-and-public-status).
Other cleanup automation and administrator protection enforcement remain outside
this change. Existing paused workflows must not be enabled for this rollout.

## Validation and rollout

Run `node --test scripts/tests/omega-sync.test.cjs` (no npm installation needed).
Tests cover both directions, existing drafts, no-op branches, API failure,
untrusted events/refs, invalid direction, hostile branch names, token restrictions
and removal of the legacy merge path. `Omega Sync Safety` runs for every PR and
main push with a read-only token; scheduled proposal jobs also run these tests.
Tests use mocked APIs and do not create or merge real synchronization PRs.

Rollout: review this draft PR, run required checks, apply administrator rules,
then manually merge. No production deployment is part of this change.
KPI: zero automatic branch merges/deletions from these three workflows; all
synchronization proposals have reviewable PRs. Downstream IO-OPENUI-AO: no source
changes or version changes; this policy is local to this repository.
Cost: one small dependency-free CI job per PR/main push, scheduled API scans
retain existing cadence; PR volume depends on pending branches.
Rollback: disable proposal workflows if noisy. Revert helper/test changes only
with review; preserve PR-only rules and never restore direct merge privileges.
