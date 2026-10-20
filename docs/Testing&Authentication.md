# Testing and Authentication — E-DUMP

Owner correction, 21 October 2026: email-code verification is mandatory for all users and admins. Use the injected fake sender for automated tests, never a production bypass or fixed code. See EmailAuthentication.md for the current delivery and migration contract.


Part A defines the authentication implementation Codex must build. Part B defines the tests. Part C is the release gate.

---

# Part A — Authentication

## A1. Setup

Use Mailjet for transactional verification delivery with MAILJET_API_KEY, MAILJET_SECRET_KEY and EMAIL_SENDER. No external identity provider. Set `ALLOWED_EMAIL_REGEX` (default `^l25\d{4}@lhr\.nu\.edu\.pk$`) and `ADMIN_EMAILS` in the backend environment. Confirm the pattern with 2–3 real student emails before building the UI.

## A2. Mobile and web flow

Student email -> POST /auth/login -> code entry -> POST /auth/verify -> existing name onboarding or class tabs. Requesting a code does not save a session. Allow code paste, resend after the server cooldown and a Change email action. Incorrect/expired codes stay on the code form. Only successful verification saves native refresh credentials or the browser HttpOnly refresh cookie.

Session restoration shares concurrent work, retains credentials on temporary network/server/storage failure and validates with the server before opening private screens. Invalid/expired or legacy sessions require sign-in; disabled accounts remain blocked. Verified refresh sessions persist normally. Sign-out clears private local data and revokes its server session. See InstalledUpdates.md for the owner-approved restore behavior and update delivery.

## A3. Backend implementation checklist

- `services/auth_service.py`: `normalize_email`, `is_allowed_email`, `login_with_email(email) -> (user, tokens, needs_name)`, `issue_tokens`, `rotate_refresh`, `revoke_family`, `logout`. Only email_auth_service.verify_code calls login_with_email after consuming a matching proof.
- `deps.py`: `get_current_user` decodes the access JWT (HS256 only, `typ=access`, required claims), loads the user, raises `unauthorized` / `account_disabled`; `require_admin` wraps it.
- Admin bootstrap: a user whose email is in `ADMIN_EMAILS` gets `role=admin` on login (this also recovers a locked-out admin).
- Last-admin protection: refuse demote/disable/delete if it would leave zero active admins.
- Refresh token lookup by hash only, never by raw value.
- `needs_name` is true while `user.name` is null.

## A4. Error codes for auth

| Situation | HTTP | `error.code` |
|---|---|---|
| Missing/invalid/expired access token | 401 | `unauthorized` |
| Email does not match the pattern | 422 | `invalid_email` |
| Incorrect, expired, exhausted or reused verification code | 400 | `invalid_code` |
| Disabled user | 403 | `account_disabled` |
| Student calling admin route | 403 | `forbidden` |
| Refresh token reuse or expired | 401 | `invalid_token` |
| Too many attempts | 429 | `rate_limited` |

---

# Part B — Testing

## B1. Principles

- Every requirement ID in `PRD.md` has at least one automated test that names the ID in its docstring/describe block (e.g. `MAT-8`).
- Tests never call R2 or Expo for real. Use fakes injected via FastAPI `dependency_overrides` / jest mocks.
- Authorization tests are table-driven and run against **every** route.
- A bug fix starts with a failing test.

## B2. Backend tests (`pytest`)

Tooling: `pytest`, `pytest-asyncio`, `httpx.AsyncClient(ASGITransport(app))`, a real MongoDB 7 container (Docker service in CI, `docker compose` locally) with a unique database per test session and collections cleared per test. Fakes: `FakeR2` (in-memory dict), `FakePush` (records calls).

### Unit tests
| Area | Cases |
|---|---|
| `upload_validation` | accepts each allowed type; rejects `.exe` renamed `.pdf`; rejects MIME/extension mismatch; rejects > 25 MB (streamed); rejects docx with `vbaProject.bin`; sanitises filenames with `../` and control chars |
| email pattern | accepts `l251234@lhr.nu.edu.pk`, uppercase and padded variants; rejects `l25123@…`, `l261234@…`, `l251234@gmail.com`, `l251234@lhr.nu.edu.pk.evil.com`, `x@l251234@lhr.nu.edu.pk`, newline-suffixed input, unicode look-alikes |
| tokens | access JWT round trip; expired; wrong secret; `alg=none`; missing claims; refresh hash storage; rotation; reuse revokes family |
| search | token AND-matching; regex special characters escaped; numeric token matches chapter |
| pagination | cursor encode/decode; stable ordering with equal timestamps |
| push batching | 250 devices → 3 batches of ≤ 100; `DeviceNotRegistered` deletes token |

### Integration tests (per router)
**Auth**
- A1 matching email requests a code without creating a user; valid proof returns tokens and needs_name=true. After PATCH /me, a later verified login returns needs_name=false.
- A2 non-matching emails (see unit list) → 422 `invalid_email`, no user created.
- A3 uppercase and padded input is accepted, stored lowercase, and maps to the same user (no duplicates).
- A4 disabled user remains blocked with 403 account_disabled after correct mailbox proof.
- A5 email in `ADMIN_EMAILS` gets role admin; any other matching email is a student.
- A6 refresh rotates; old refresh token then fails and revokes the family.
- A7 deleting account revokes refresh tokens and removes devices.
- A8 role change or disable takes effect on the very next request with the same access token.
- A9 sixth login attempt within a minute for the same email → 429.

**Authorization matrix** (parametrised over route × role): anonymous → 401 everywhere except `/auth/*`, `/healthz`, `/readyz`; student → 403 on `POST/PATCH/DELETE /announcements*`, `/announcements/attachments`, all `/admin/*`; admin → success. Student cannot delete another student's material; uploader can delete own; admin can delete any. Admin cannot demote/disable self or the last admin.

**Materials**
- MAT-1 list newest first, cursor works across 3 pages.
- MAT-2 filters by kind and chapter combine correctly.
- MAT-3 search finds "chapter 3", filename fragment, and ignores other subjects.
- MAT-4 upload each allowed type succeeds; metadata stored; object key not derived from filename.
- MAT-4 validation: missing title, bad kind, chapter negative or > 99 → 422.
- MAT-8 duplicate in same subject → 409 `duplicate` with `existing_material_id`; same file in another subject succeeds.
- MAT-5 download endpoint returns presigned URL for existing item, 404 for removed.
- MAT-6/7 delete and report flows; double report by same user → 409.

**Announcements**
- ANN-1 admin creates each type; due date optional; > 3 attachments → 422.
- ANN-3 create triggers push to all enabled devices except the author's; disabled-notification devices skipped; push failure does not fail the request.
- ANN-2/4/5/6 pin ordering, filters, `upcoming` returns only future due items sorted ascending, unread count reflects `seen-updates`.
- ANN-7 student write attempts are 403.

**Ops/security**
- Docs endpoints absent when `APP_ENV=production`.
- 429 returned after exceeding upload rate limit.
- Body larger than limit rejected early.
- Responses never contain `token_hash` or other users' emails for student callers.

Coverage gates: backend line coverage ≥ 85%; `services/` and `deps.py` ≥ 90%.

## B3. Mobile tests

Tooling: `jest-expo`, `@testing-library/react-native`, `msw`-style fetch mocks (or a tiny fake `fetch`), `jest-mock` for native modules (SecureStore, Notifications, DocumentPicker, FileSystem).

| Area | Cases |
|---|---|
| Session store | restore success/failure, single-flight refresh with 5 concurrent 401s → one refresh call, sign-out clears secure store and cache |
| Sign-in screen | invalid pattern shows inline error with no network call; success goes to tabs (or the name screen when `needs_name`); `account_disabled` goes to blocked; network error shows `ErrorLine` |
| Role gating | "Post" and admin rows render only for admin; student has none (UI check only; real enforcement is server-side) |
| Subject screen | filters and search build the right query params; empty state; download progress text; opens file after download |
| Upload form | title prefill; validation messages; duplicate error shows "View"; disables button while uploading |
| Announcement form | type/subject/due validation; attachment limit |
| Theme/tokens | contrast helper asserts bone/ink ≥ 12:1, moss/ink ≥ 7:1, danger/ink ≥ 4.5:1 |
| Formatters | relative time, file size, dates in `Asia/Karachi` |
| Accessibility | every `Row` has a label; headings have header role |

Coverage gate: ≥ 70% lines on `src/`, 90% on `src/auth` and `src/lib`.

## B4. End-to-end (Maestro, on an Android emulator in CI, iOS locally)

No production bypass or fixed verification code is allowed. Device E2E signs in through a real test mailbox or an injected fake sender in an isolated test harness. Existing seeded test accounts still require proof. Physical-device mailbox acceptance is a separate release check.

Flows:
1. **F1 find a file**: sign in as student → Subjects → COAL → search "3" → open first result.
2. **F2 upload**: upload fixture PDF → appears at top → upload same PDF → duplicate message.
3. **F3 admin alert**: admin posts quiz → second emulator/user sees it in Updates and badge increments (push delivery verified manually, see B6).
4. **F4 student write attempt**: student has no "Post" action.
5. **F5 outsider**: `someone@gmail.com` → inline rejection message, no account created.
6. **Account delete** and **sign-out** flows return to sign-in.

## B5. Static checks (run in CI and `make verify`)

`ruff check`, `ruff format --check`, `mypy --strict`, `tsc --noEmit`, `eslint`, `scripts/check-slop.sh`, `pip-audit`, `npm audit --omit=dev`, `gitleaks`, generated API types are up to date (`make gen-types` produces no diff).

## B6. Manual test script (real devices, before each release)

Devices: one low-end Android, one recent Android, one iPhone.

| # | Check | Expected |
|---|---|---|
| 1 | Install fresh, sign in with a real student email | Name prompt, then Updates |
| 2 | Enter a personal Gmail address | Inline rejection, nothing created |
| 3 | Kill app, reopen | Session restored without sign-in |
| 4 | Admin posts quiz | Push arrives on both phones in < 60 s; tap opens that update |
| 5 | Turn off notifications switch | No push on that device |
| 6 | Upload PDF over 25 MB, wrong type, duplicate | Clear inline errors |
| 7 | Open PDF, image, PPTX from a subject | Opens in system viewer; second open is instant (cached) |
| 8 | Airplane mode | "Offline" caption, cached lists visible, upload shows error |
| 9 | Text size at maximum | No clipped text, rows grow |
| 10 | Screen reader on Subjects screen | Rows announce title and meta |
| 11 | Delete account | Signed out. Signing in again with the same email creates a fresh, empty user record |
| 12 | Disable a user while they are in the app | Their next request shows the blocked screen |

## B7. CI (GitHub Actions)

Jobs: `backend` (uv sync, services: mongo, ruff, mypy, pytest with coverage gate), `mobile` (npm ci, tsc, eslint, jest with coverage gate), `slop` (check-slop.sh), `security` (audits, gitleaks). All required to merge. EAS builds are manual (`workflow_dispatch`).

---

# Part C — Release gate

Ship only when: all CI jobs green; B6 manual script passed on three devices; `Security and Compliance.md` §10 completed; every P0 requirement in `PRD.md` has a passing test; slop self-review (§7 of `AntiAISlop.md`) screenshots attached for every screen.

## Owner session persistence correction (17 October 2026)

AUTH-3 retains the saved refresh credential when a cold server, lost connection or temporary storage error prevents restoration. The app displays connection/retry UI instead of erasing the session after three seconds. Refresh permits the free preview server to wake up; restoration is single-flight. Protected screens remain gated until server validation. Missing, invalid or expired sessions and disabled accounts still sign out or block; explicit sign-out clears local credentials. This replaces the earlier three-second restoration deadline and its blanket sign-out rule.
