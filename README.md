# E-DUMP
Private BCS-3E class app. M0 foundations, M1 authentication, M2 catalog/timetable,
and M3 class materials are implemented. Verification evidence is in `docs/M2Verification.md`
and `docs/M3Verification.md`.

Prerequisites: Node 24 LTS, Python 3.12, uv, GNU Make, Bash, gitleaks; Android builds need JDK 17 + SDK 36.
Windows: use Git Bash with Make, uv and gitleaks on PATH.

```sh
cd backend && uv sync --frozen && cd ..
cd mobile && npm ci && cd ..
make verify
make dev-api
make dev-app
```

Configure the ignored `.env` files from their examples; M1 needs MongoDB, JWT_SECRET and ADMIN_EMAILS.
`/healthz` is public liveness; `/readyz` returns 503 until MongoDB is configured and reachable.
Before `make verify`, set `TEST_MONGODB_URI` to a MongoDB 7 instance; integration tests require it.
CI provisions MongoDB 7. Unit readiness tests cover success and failure without Docker.

Compatibility decision: Expo SDK 55 / React Native 0.83, Android 8+, iOS 15.1+.
SDK 57 requires iOS 16.4. The owner delegated the choice of wider compatibility.
Required Expo peers and lint/test support packages were approved by the owner.
TypeScript 5.9 and ESLint 9 satisfy the selected SDK and API generator's peer requirements.
Licensed fonts go in `mobile/assets/fonts`; dev builds use platform fallbacks until supplied.
Preview/production builds reject missing required fonts; fonts stay untracked until repo privacy is confirmed.
Local Android dev build: `cd mobile && npm run android`; app identifier: `com.edump.bcs3e`.
Owner deferred iOS acceptance for a $0 Windows workflow; free iPhone signing needs a Mac/Xcode.
M1 implements AUTH-1…AUTH-4; phone testing steps are in `docs/M1PhoneTest.md`.
M2 seeds seven subjects and eleven slots with `make seed`; Schedule shows all seven days.
M3 needs a private R2 bucket and bucket-scoped Object Read & Write credentials in
`backend/.env`. Students upload through the authenticated API; no Cloudflare account
or repeated administrator grant is needed. Download links expire after ten minutes.
From `backend`, `uv run python scripts/check_r2.py` performs a disposable live check
and removes its own object. Automated tests use fake R2 and isolated MongoDB databases.
Cached reads work within an active signed-in session. Offline session restoration
keeps M1's sign-in behavior. Clear downloads is available in Me; sign-out clears
private query data and downloaded files. Physical phone acceptance remains deferred to M7.
Motion tuning is M6; theme motion values are the documented starting values only.
M4 adds Updates, coming-up dates, unread counts, private attachments and admin posting.
Notifications use the owner's Expo project through `Constants.easConfig.projectId`;
until the project and native push credentials are configured, Me explains that notifications
are unavailable. Real Android push delivery and the new native-module build are deferred to M7.
M5 adds private Users and Reports tools in Me for admins, immediate server-side role/status
checks, and confirmed account deletion. Deletion clears devices and sessions and anonymizes
retained uploads. An admin must transfer access before deleting the last active admin account.
Enabled accounts in ADMIN_EMAILS regain admin at each login, per the owner's decision.
Focused feature tests run during development; milestone verification remains required.
Semester-end archive/wipe decision is pending; backups are a release milestone.
