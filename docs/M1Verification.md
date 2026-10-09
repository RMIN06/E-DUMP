# M1 verification — 9 October 2026

Status: M1 implementation and local Android verification complete. The owner
explicitly deferred the physical-phone acceptance gate until M7. No M2 work began.

Scope: FinalVerdict.md M1; AUTH-1 through AUTH-4. No M2 routes, content or tabs
have been implemented. Physical-phone acceptance with a real student email is
explicitly deferred by the owner until the M7 hosted preview; iOS acceptance
remains deferred under the previously agreed Android-first scope.

Implemented: student-pattern email login, name entry/editing, blocked-account
screen, Me, rotating refresh tokens, bounded session restore and sign-out.
The owner confirmed the student email pattern and two initial admin addresses.
Actual addresses and the random signing secret are only in ignored local
environment files; committed tests use synthetic fixtures.

The API uses a fifteen-minute HS256 access token and a thirty-day rotating
refresh token. MongoDB stores refresh-token hashes, expiry/TTL indexes and
token-family metadata. Replay revokes the family. Active status and current
role are loaded from MongoDB for protected requests. Refresh operations use
an application lock plus conditional database replacement; this implementation
assumes the specified single API instance and one Uvicorn worker. Scaling to
multiple workers needs database-coordinated rotation before deployment.

| Route | Authorization |
|---|---|
| POST /api/v1/auth/login | Public, email validation and rate limits |
| POST /api/v1/auth/refresh | Public, valid rotating refresh token |
| POST /api/v1/auth/logout | Current user; token-family ownership enforced |
| GET /api/v1/me | Current active user |
| PATCH /api/v1/me | Current active user; own display name only |

All protected routes are tested with anonymous, student, admin and disabled
users. Tests also exercise invalid email, JWT expiry/algorithm/claims, unique
users, hashed refresh storage, rotation, concurrent replay, logout ownership,
name validation, dynamic role changes, rate limits and request-body limits.
Integration tests use real MongoDB 7 in isolated temporary databases, then
drop those databases.

Mobile access tokens remain in memory; only the refresh token is persisted
in SecureStore. Concurrent unauthorized requests share one refresh, retry once,
and cannot restore a session after sign-out. Restore has a three-second limit.
Sign-out clears session state, SecureStore, the query cache and local file cache,
including when the remote logout fails. Cleanup errors propagate to the UI.
Every M1 screen is guarded by session status. Me exposes only Name and Sign out.

Native Android development builds succeeded with JDK 17, Gradle 8.14.6 and one
worker. The APK includes armeabi-v7a, arm64-v8a and x86_64 and supports the
selected Android 8+ floor. It is in `mobile/.expo/edump-m1-development.apk`
(ignored build output, 137,037,808 bytes). This is a development client that
requires Metro and the local API. Its size does not establish the release APK
size budget, and its local file path is not a public download URL.

On the Android 36 emulator, a synthetic student account completed invalid-email
rejection, sign-in, initial name save, Me, session restore after stopping and
relaunching the app, name editing, and sign-out. Reopening after sign-out
remained signed out. The real owner's student-email phone check has not run.
Disabling only that synthetic account in the local database produced the
blocked screen. The account was re-enabled after the check.

The sign-in, Me and blocked layouts were inspected at default text and/or
320 dp with 1.6x body text. Name and sign-in inputs were checked with the
keyboard open at 320 dp / 1.6x. Native testing found that a multiline email
error hid Continue behind the keyboard. The single-field forms now reveal
their end after keyboard/layout changes; the final screenshot confirms the
field, full message and button remain reachable above the open keyboard.

The final `make verify` run after that fix exited **0**. Output is saved in
[M1Verify.log](M1Verify.log).

| Check | Result |
|---|---|
| Ruff, formatting, strict mypy | Passed |
| ESLint and strict TypeScript | Passed |
| Backend tests | 88 passed, none skipped; 98.72% app coverage |
| Services/deps coverage | 97.56%, above the 90% gate |
| Mobile tests | 99 passed; 97.35% src line coverage |
| Audit policy guard tests | 6 passed |
| Slop check and generated API types | Passed |
| pip-audit | No known vulnerabilities |
| gitleaks and tracked-environment-file guard | Passed |
| npm dependency audit | No unaccepted findings; three approved tooling exceptions through 8 November 2026 |
| Phone helper | PowerShell syntax passed; physical execution deferred |

The backend test warning comes from deliberately signing a wrong-algorithm
HS384 fixture with a 32-byte key. Application tokens use HS256 and reject that
fixture. It is not a production signing-algorithm change.

- [Sign-in](screenshots/M1-android-sign-in.png)
- [Invalid email](screenshots/M1-android-invalid-email.png)
- [Restored session](screenshots/M1-android-restored.png)
- [Compact Me, large text](screenshots/M1-android-compact-large-text.png)
- [Compact sign-in, open keyboard](screenshots/M1-android-compact-keyboard.png)
- [Compact name, open keyboard](screenshots/M1-android-name-large-text.png)
- [Blocked account, large text](screenshots/M1-android-blocked-large-text.png)

Screenshots use development font fallbacks. Commercial fonts remain required
by the preview/production gate. Expo's development overlay is separate from
the application UI. The complete M6 device/accessibility matrix, iOS screenshots,
Docker execution and M7 hosting/release checks have not been completed.

Optional local phone setup is documented in [M1PhoneTest.md](M1PhoneTest.md).
The PowerShell helper passed syntax parsing; no physical phone was connected
to execute it. M2 remains untouched.
