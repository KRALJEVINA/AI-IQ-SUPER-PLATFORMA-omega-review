# SPAJA social connections — read-only authorization pilot

Review date: 2026-10-19. Origin: owner request to connect Facebook, Instagram and TikTok for available monetization data. This change does not establish that any named account is eligible for monetization or has earnings.

## Verified surface and limitations

| Network | Authorization / supported data | Revenue | Payout |
| --- | --- | --- | --- |
| Facebook | Facebook Login; approved `pages_show_list`, `pages_read_engagement`; first 100 managed Pages, ID/name | No general revenue endpoint verified for this app; not implemented | Not implemented |
| Instagram | Facebook Login; above permissions plus `instagram_basic`; professional accounts linked to managed Pages, ID/username | Insights/engagement are not earnings. No revenue endpoint verified for this app; not implemented | Not implemented |
| TikTok | Login Kit + `user.info.basic`; app-scoped open ID and display name | Display API does not expose creator earnings | Not implemented |

A Facebook profile URL does not establish that the account is a Page, nor that the user manages it. Instagram consumer accounts are not supported by this path. Handles in `/api/banka-kontakt-drustvene-mreze` remain public contact references, not verified OAuth identities. The OMEGA five-persona repository README is a concept statement and has no integration evidence.

TikTok also documents **mini-game** monetization and organization settlement, with business verification, contracts and payout setup. This is a different product; it must not be represented as an API to withdraw earnings from `@spaja.1986`. Marketing/ad spend also must not be represented as creator income. Any later revenue adapter requires a specific documented endpoint, approved product/scopes, unit/currency/period and account eligibility evidence. Missing revenue is `null`, never a fabricated zero.

## Sources

- TikTok Login Kit Web: https://developers.tiktok.com/doc/login-kit-web/
- TikTok token exchange/revocation: https://developers.tiktok.com/doc/oauth-user-access-token-management/
- TikTok Display API: https://developers.tiktok.com/doc/display-api-overview/
- TikTok user fields and scope table: https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info/
- TikTok mini-game monetization: https://developers.tiktok.com/docs/en/monetization-overview
- Official Meta-maintained API collection: https://www.postman.com/meta/instagram/collection/6yqw8pt/instagram-api
- Instagram with Facebook Login (professional accounts and Page prerequisite): https://www.postman.com/meta/instagram/folder/9cgqucg/instagram-api-with-facebook-login
- Meta managed Pages request: https://www.postman.com/meta/facebook/request/bqfxwbp/get-access-tokens-of-pages-you-manage
- Meta collection provenance: https://www.postman.com/meta
- Primary Meta docs attempted: https://developers.facebook.com/docs/pages-api/ and https://developers.facebook.com/docs/instagram-platform/insights returned HTTP 429 in this review. Meta-maintained Postman resources were used instead. Specific revenue entitlement remains unverified.

## Implementation and security

Page: `/social-connections`. Routes: authenticated `GET /api/social-connections`, `POST /api/social-connections/{provider}/start`, callback GET, authenticated `DELETE /api/social-connections?provider=...`.

This first version is an explicitly enabled **development pilot**, not a production account-linking service. It fails closed in production, without an explicit strong Omega JWT secret, without an allowlisted owner identity, without HTTPS origin or without configured approved scopes. It requires a signed, unexpired ACCESS JWT using the existing Omega verifier; refresh tokens are rejected. No ownership is inferred from public handles.

Start is a POST protected by Bearer authentication and exact Origin validation. OAuth uses 256-bit random state, five-minute expiry, single-use consumption, a separate Secure/HttpOnly/SameSite=Lax `__Host-` browser cookie, and server-side identity/provider binding. Redirect URI is server configured, never inferred from untrusted Host headers. Denied consent consumes the attempt. A wrong state/provider/browser cannot initiate an exchange. Deletion or a new attempt cancels an in-flight completion.

External requests use fixed provider hosts, no redirects, no cache and ten-second timeout. Secrets/codes are sent in POST bodies, bearer tokens in headers; raw responses and provider errors are never logged or returned. Granted scopes are verified before reading data. Only ID/name and the requested granted scopes enter snapshots. No Page access tokens are requested. No social access or refresh tokens are persisted, put in cookies, sent to clients or stored in the repository. Runtime token values exist only while fetching one profile snapshot. A returned refresh token is discarded.

State and snapshots use bounded process memory (maximum 1,000 each); state expires after five minutes and snapshots after 15 minutes. Restart loses all state. Use one process during pilot tests. No background refresh or ongoing authorized-link claim. `authorized_snapshot` means that authorization succeeded at the observation time, not that access is still valid. Deletion removes the local snapshot and pending attempt; it does not revoke the provider grant. The UI directs the owner to the provider's connected-app settings to revoke consent. The first 100 managed Pages are read; arbitrary paging URLs are never followed.

Before production: implement durable transactional single-use state and per-user records, vetted identity/session binding, encrypted token vault if ongoing access is required, refresh/revocation/deauthorization and deletion callbacks, retention/audit policy, rate limits, and approved provider App Review. Remove the production block only in a separately reviewed change. Configure callback proxy/access logs to redact query strings (OAuth providers send `code` and `state` there).

## Configuration (values belong only in secret management)

No real credentials are included. Required server-only variables:

- `SOCIAL_CONNECTIONS_PILOT=true` with `NODE_ENV=development`.
- `SOCIAL_OAUTH_ORIGIN`: exact HTTPS origin with no path/query/fragment.
- `OMEGA_JWT_SECRET`: private secret at least 32 characters; existing fallback is rejected.
- `SOCIAL_OWNER_IDS`: comma-separated actual Omega identity IDs allowed to use the pilot.
- Meta: `META_CLIENT_ID`, `META_CLIENT_SECRET`, `META_GRAPH_VERSION` (version supported by the registered app), `META_APPROVED_SCOPES` (actual approved scopes, comma separated). Instagram through Facebook Login requires a linked professional account; personal profiles alone do not qualify.
- TikTok: `TIKTOK_CLIENT_ID` (TikTok client key), `TIKTOK_CLIENT_SECRET`, `TIKTOK_APPROVED_SCOPES=user.info.basic` only after Login Kit/product approval.

Register exact callbacks `{SOCIAL_OAUTH_ORIGIN}/api/social-connections/{provider}/callback` with the corresponding provider. Configuration expresses an operator assertion of app approval; provider-side granted scopes are checked again. Do not claim approval just by setting env variables. Never use `NEXT_PUBLIC_` for these values.

## Review and manual acceptance

1. With no configuration, status must show configuration required, and start must return 503 for an authenticated owner.
2. In a single-process HTTPS development environment with registered apps, sign into an allowlisted Omega account; load status and initiate consent.
3. Deny consent: no snapshot. Accept consent: only actual managed Page/linked professional Instagram identities or TikTok open ID/display name appear. Wrong provider/browser, expired/replayed state and missing required scope must fail closed.
4. Inspect browser network: no social token or secret; revenue stays unavailable/null and no payout action exists. Delete local snapshot and confirm isolation from another SPAJA account.
5. Revoke app access in provider settings. Live provider acceptance, approval status and real account entitlements remain untested until the registered apps are available.

Run regression suite with `node --import tsx --test src/tests/social-connections/social-connections.test.ts`. It is separate from broad legacy route-fixture suites, which assume old public API patterns. No dependency, deployment config, production system or linked repository is changed. Rollback: remove this feature's new paths; no migrations or remote grants were performed by preparing this PR.

## Local verification

- `node --import tsx --test src/tests/social-connections/social-connections.test.ts`: 10/10 passing, including mocked end-to-end HTTP authorization/callback/status/deletion, denied consent, CSRF, replay, expired state, scope denial, identity isolation, refresh-token rejection and cancellation races.
- `npx tsc --noEmit`: passing.
- Targeted ESLint on changed TypeScript/TSX: passing.
- `npm run build`: passing; 1,421 prerender targets. Existing warnings include Edge Runtime deprecation and missing optional autofinish trigger configuration. No live provider authorization or revenue access was performed.
- The `tsx` CLI's IPC socket is unavailable in this runner; the equivalent Node `--import tsx --test` invocation above completes successfully.
