# M4 and M5 verification — 9 October 2026

Implementation is complete through M5. M6 and M7 have not started. Owner-approved deferrals remain acceptance work for M7, rather than claims of verified native delivery.

## M4: announcements and notifications

- Admin-only create/edit/delete/pin, validated type/title/body/subject/due date and up to three attachments.
- Attachments share the existing signature checks, private R2 storage, upload rate limit and per-user quota. Only eligible uploads owned by the posting admin can be attached. Downloads verify the announcement/file relationship and use ten-minute signed URLs.
- Pinned-first cursor pagination, type/subject filtering, top-three future due dates and per-user unread/seen tracking.
- Updates is the first of four tabs; subject screens compose Material and Updates without cross-feature imports. Detail supports cached attachments, images and admin actions. Forms use the approved native date/time picker in Asia/Karachi and default “Notify again” off.
- Device registration and per-device opt-out, foreground notifications, validated tap-to-open IDs, best-effort unregister on sign-out, and protection against registration completing after sign-out.
- Background Expo sending batches at most 100 active, enabled devices, excluding the author. Unregistered tokens are removed; provider failures cannot roll back a published announcement and logs do not expose provider responses or tokens.

30 new backend checks cover the announcement authorization matrix, CRUD/pinning/pagination, attachment ownership/privacy/cleanup, unread updates, device ownership and push batching/failure behavior. Mobile checks cover student/admin actions, publication, edit defaults, attachment opening and confirmed deletion.

## M5: administration and deletion

- Private Users search by name/email with role, account status and last sign-in; promotion/demotion and enable/disable.
- Existing access tokens load current role/status on every request. Disabled users' refresh families are revoked. Admin mutations serialize and recheck the actor to prevent concurrent changes leaving zero active admins. Self-demotion and self-disable are rejected.
- Reports queue with material/reporter metadata, open-material navigation, removal and dismissal. Failed object deletion leaves the report open for retry; repeated resolution is rejected.
- Confirmed account deletion removes the user, devices and refresh tokens, anonymizes retained content name snapshots, and clears local private data. The last active admin must transfer access before deleting the account.
- Admin routes and links are hidden from students. A forbidden admin request refreshes the role and removes cached admin data without retrying the denied action. Admin users/reports are excluded from persisted offline queries.
- Enabled ADMIN_EMAILS accounts regain admin on each login, as selected by the owner. Bootstrap never reactivates disabled accounts.

18 new backend checks cover private route authorization, immediate role/status changes, concurrent reciprocal disable, seeded-admin recovery, account deletion/anonymization and report resolution/retry. Mobile checks cover role/status actions, reports, route guards, account confirmation and clearing private sessions.

## Verification result

`make verify`: **exit 0**, recorded in `M4M5Verify.log`.

The full backend run exercised 227 tests: 226 passed and the existing M3-only OpenAPI inventory assertion failed because M4/M5 added routes. Its expected inventory was corrected. To avoid repeating unrelated checks, the final verification used `PYTEST_ADDOPTS='--lf --cov-append'`: the single corrected test passed and retained coverage from the unchanged backend implementation's full run. This override was temporary and is not configured in the repository or CI. All 227 backend checks therefore have passing results across those runs; CI runs the full suite normally.

- Backend coverage: 96.43% overall; 94.58% services/dependencies, above the 90% service gate.
- Mobile: 193 tests passed in 18 suites; 82.12% line coverage overall, auth 100%, shared libraries 97.04%.
- Six dependency-audit policy tests passed.
- Ruff/format/mypy, ESLint/TypeScript, slop checks and generated API type consistency passed.
- pip-audit found no known vulnerabilities; gitleaks found no secrets. npm findings remain limited to the three owner-approved tooling exceptions through 8 November 2026.
- Existing non-failing ESLint test-helper warning remains. An intentional invalid-algorithm JWT test produces the existing test-only key-length warning.

## Deferred acceptance

The owner explicitly deferred Expo account/project provisioning, Android native push credentials and real-phone push delivery to M7. Until configured, the notification switch explains that notifications are unavailable. The new notification/picker native modules require a rebuilt development/preview app; no updated APK or native build success is claimed here.

Physical Android acceptance, iOS acceptance, final native/device responsiveness/accessibility matrix, screenshots and release checks remain deferred as requested. Automated R2 tests use the fake integration; M3's live private-bucket acceptance is already recorded separately. Licensed release fonts and a hosted preview remain M7 prerequisites.

Code has been pushed in feature branches. The current `codex/admin-tools` branch includes M0–M5 and the final M4 fixes. Its history reaches 68 commits including this evidence commit. Continue substantive commits toward the owner's minimum of 110 by M7; do not pad history with empty or cosmetic changes.
