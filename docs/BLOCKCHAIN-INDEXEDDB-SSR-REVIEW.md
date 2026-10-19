# IndexedDB during SSR — 19 October 2026

Base: `b7634c174e399bfb74ac1866c6f91ba0c41abdc6` (PR #1353).

## Confirmed cause

The `/blockchain` page imports WagmiProviderWrapper and BlockchainTransakcije. Both reach `src/lib/blockchain/config.ts`, directly or through its barrel. Module evaluation calls createConfig, which eagerly calls connector.setup, even with `ssr: true`. A `use client` component still participates in Next.js prerendering.

Installed source path: `@wagmi/core/src/createConfig.ts` setup → `@wagmi/connectors` 5.7.12 walletConnect.setup/getProvider → EthereumProvider.init → UniversalProvider → SignClient → Core → `@walletconnect/keyvaluestorage` 1.1.1 bundled ESM/browser implementation. KeyValueStorage starts asynchronous migrate(local, indexed, ...) without awaiting it. Its synchronous try/catch cannot catch that rejection. IndexedDb.getItem → unstorage IndexedDB driver → idb-keyval.createStore/getDB → `indexedDB.open(dbName)`. Node has no indexedDB global.

A direct Node import did not reproduce this because entry resolution differs. Bundling the actual config using the existing transitive esbuild installation with `--bundle --platform=node --main-fields=module,main --format=cjs` reproduced the full stack. An unhandledRejection listener printing error.stack and exiting 1 exposed it. The identical diagnostic after this fix exits 0 without output. No production bundler settings or dependencies were changed.

## Fix and risk

Register WalletConnect only when window and indexedDB both exist, before createConfig can run its setup. Injected wallets, chains, RPC transports, contract addresses and SSR state handling remain unchanged. A supported browser creates its own config with WalletConnect and its project ID intact. Without IndexedDB, injected wallets remain available and WalletConnect is omitted. No polyfill, fake persistence, error suppression or SSR disabling is used.

The observed failure is a real unhandled asynchronous rejection, not a compiler warning. It interrupts server wallet storage initialization and can leave it waiting. Next.js nevertheless completed the observed baseline build with exit 0. That does not prove wallet persistence or production availability. No live transaction failure or user data loss was established. API presence does not guarantee database permission/quota, valid relay credentials or network access. Live wallet behavior remains unverified.

## Local checks

Node 24.19.0 / Next.js 16.4.1; existing installed dependencies copied into this isolated checkout, not a fresh npm ci.

| Check | Before | After |
| --- | --- | --- |
| npm run build | exit 0; 1419 pages; IndexedDB ReferenceError | exit 0; 1419 pages; no IndexedDB or ReferenceError diagnostic |
| Build TypeScript phase | pass | pass |
| Config bundle with actual dependencies | unhandled rejection, exit 1 | no diagnostic, exit 0 |
| Four targeted regressions | 3 fail, 1 pass | 4 pass |
| Focused ESLint on changed TS files | not claimed | 0 errors, 0 warnings |
| git diff --check | not applicable | pass |

Run targeted tests with `node --import tsx --test src/tests/lib/blockchain-ssr.test.ts`. They evaluate actual config in isolated VMs with real Wagmi createConfig and connector doubles: server (with configured project ID), IndexedDB without window, browser without IndexedDB, supported browser retaining WalletConnect setup and project ID. No real database, wallet, relay or RPC is opened; this is not a browser persistence or wallet end-to-end test.

`npm test` is blocked before its first core test by tsx CLI IPC `listen EPERM`. Full suite, full lint, remote CI, smoke tests and production availability are not claimed green. Existing Edge Runtime deprecation/static generation warnings and missing AUTOFINISH token diagnostics remain separate. A cached rebuild hit Turbopack persistence failure (`invalid digit found in string`); moving generated .next out and rebuilding from a clean cache passed.

## Review and rollback

User-requested follow-up to #1353. Human review required before merge. No linked-repo, billing, workflow, dependency, lockfile or production infrastructure changes. Revert this isolated change to roll back; no data migration is needed. No manual deployment or workflow retry was dispatched.
