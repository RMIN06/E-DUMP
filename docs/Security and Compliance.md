# Security and Compliance — E-DUMP

Scope: a private app for ≤ 60 students handling names, FAST emails, push tokens and course files. Risk is low in volume but the app is internet-facing, so the basics are mandatory. This is engineering guidance, not legal advice.

---

## 1. Assets and threats

| Asset | Threat | Control |
|---|---|---|
| Access to the class space | Outsiders joining; anyone typing a classmate's or admin's email | Email pattern check, admin disable, rate limits (§2); **impersonation is an accepted risk (§2.4)** |
| Admin powers (alerts, deletes) | Student escalates privileges | Server-side role checks on every route, role loaded from DB per request (§3) |
| Sessions | Token theft, replay | Short access JWT, rotating refresh with reuse detection, SecureStore (§2.3) |
| Uploaded files | Malware, spoofed types, oversized files, storage abuse | Allowlist, magic-byte check, size cap, quotas, private bucket, no inline execution (§4) |
| API availability | Abuse, brute force, scraping | Rate limits, request size limits (§5) |
| Secrets | Leak via repo or logs | Env-only secrets, scans, no secrets in `EXPO_PUBLIC_*` (§6) |
| Personal data | Over-collection, no deletion | Data minimisation, delete-account, retention rules (§7) |

## 2. Authentication controls

### 2.1 Login check (the only gate)
1. Normalise: trim, lowercase; reject if longer than 64 characters, non-ASCII, or containing whitespace or control characters.
2. `re.fullmatch(ALLOWED_EMAIL_REGEX, email, re.ASCII)`; default `^l25\d{4}@lhr\.nu\.edu\.pk$`. Always `fullmatch`, never `search`. The pattern must stay linear (no nested quantifiers).
3. Find or create the user. Reject if `is_active=false` with `account_disabled`.
4. Pattern mismatch returns `invalid_email` with the message "Use your student email, like l25xxxx@lhr.nu.edu.pk".
5. Rate limits: 10 attempts/min/IP, 5/min/email, 20 new accounts/hour/IP.
The mobile client mirrors the regex for instant feedback; it is a UX aid, not a control.

### 2.2 Own tokens
- Access token: JWT HS256, 15 min, claims `sub`, `iat`, `exp`, `typ=access`. Secret ≥ 32 random bytes. Reject `alg=none` and any alg other than HS256 explicitly.
- Refresh token: 256-bit random, URL-safe, stored **hashed** (SHA-256) with `family_id`, expiry 30 days, TTL index.
- Rotation on every refresh. If a revoked/replaced token is presented, revoke the whole family and require sign-in.
- Logout revokes the family. Account deletion and user disable revoke all families.

### 2.3 Client storage
- Refresh token in `expo-secure-store` (Keychain / Keystore). Access token in memory only.
- Never store tokens in AsyncStorage, logs, or query cache persistence. The persisted query cache must exclude auth data.
- Clear the persisted query cache and cached files on sign-out and account deletion.

### 2.4 Accepted risk: no proof of email ownership
The owner chose email-only login. Consequences, stated plainly:
- Anyone can type any matching email and sign in as that person. That includes an admin's email, which would allow fake quiz alerts, deleting material and disabling users.
- The pattern is guessable (`l25` + 4 digits is about 10,000 addresses), so students from other sections or batches can join and read all material.
- Admin emails must therefore never be shown to students: the API returns `author_name` only.

Controls kept: admins can disable any user (effective on the next request), rate limits (§2.1), per-item `author_id` and `uploader_id` for accountability, reports and admin removal.

Recommended hardening (needs owner approval, small change): email a 6-digit code (10 min expiry, 5 attempts) through a transactional email provider, at minimum for admin accounts. Keep the login logic isolated in `auth_service.login_with_email` so this is a contained change. Not part of v1 as specified.

## 3. Authorization matrix (enforced server-side, tested)

| Action | Student | Admin | Owner of item |
|---|---|---|---|
| Read subjects, materials, announcements, schedule | yes | yes | — |
| Upload material | yes | yes | — |
| Edit/delete own material | — | yes (any) | yes |
| Report material | yes | yes | — |
| Create/edit/delete/pin announcement | **no** | yes | — |
| Upload announcement attachment | **no** | yes | — |
| Users and reports endpoints | **no** | yes | — |
| Demote/disable self | — | **no** | — |
| Delete own account | yes | yes (must remain ≥ 1 admin) | — |

Implementation: `deps.get_current_user` (loads user, rejects disabled), `deps.require_admin`. Object-level checks live in services (e.g. `material_service.delete(user, id)`), never only in routers. Return `404` instead of `403` for resources the user must not know exist (none today, keep the pattern available).

## 4. File upload security

| Control | Rule |
|---|---|
| Allowlist | Extensions `pdf, png, jpg, jpeg, webp, pptx, docx` only |
| Size | ≤ 25 MB, enforced by `Content-Length` pre-check **and** streaming counter |
| Type verification | Magic-byte sniff (`filetype`) must match the extension and declared MIME. OOXML (`pptx`, `docx`) must be a valid ZIP containing `[Content_Types].xml` and must not contain `vbaProject.bin` (no macros) |
| PDFs | Reject if the file does not start with `%PDF-`; do not parse or render server-side |
| Filename | Never used as a storage path. Store original name only as display metadata after stripping control characters, path separators and truncating to 150 chars |
| Storage key | `files/{yyyy}/{mm}/{uuid4}.{ext}` |
| Bucket | Private. No public URL. API token scoped to the single bucket |
| Download | Presigned GET, 10 min, with `ResponseContentDisposition=attachment; filename*=UTF-8''…` and `ResponseContentType` set from our stored MIME (never from the client) |
| Quotas | 20 uploads per user per hour, 500 MB per user in total (configurable) |
| Duplicates | SHA-256 per subject rejects exact repeats |
| Removal | Delete object and mark `files.status=deleted` when material is removed; orphan sweeper hourly |
| Malware | No server-side AV in v1 (accepted risk: files are opened by students in the OS viewer). Mitigations: allowlist, no macros, reports, admin removal. Add ClamAV only if the class grows |

## 5. API hardening

- HTTPS only (HSTS at the host). No HTTP listener on the public interface.
- CORS: disabled (mobile client does not need it). If a web admin is ever added, allowlist its origin explicitly.
- Request body limit 26 MB globally on upload routes, 64 KB on all JSON routes.
- Pydantic validation on every input; max lengths on all strings (title 100, body 2000, note 200, emails list ≤ 100 per call).
- Rate limits per `Architecture.md` §6; return `429` with `Retry-After`.
- Mongo injection: never pass client-supplied dicts into queries; build queries from typed fields; escape regex input in search (`re.escape`).
- Disable OpenAPI docs in production (`docs_url=None`, `openapi_url=None`) unless `APP_ENV=development`.
- Security headers on all responses: `X-Content-Type-Options: nosniff`, `Cache-Control: no-store` on auth/me endpoints.
- Dependency hygiene: `uv pip audit`/`pip-audit` and `npm audit --omit=dev` in CI; Dependabot or Renovate enabled; no unpinned versions.

## 6. Secrets and configuration

- All secrets only in host secret store and local `.env` (git-ignored). `.env.example` has names only.
- Pre-commit secret scan (`gitleaks`) and CI scan.
- Rotate `JWT_SECRET` and R2 keys if ever exposed; rotation of `JWT_SECRET` logs everyone out (acceptable).
- Mongo user has least privilege (readWrite on one database). R2 token limited to one bucket with object read/write.
- Keep EAS credentials (Android keystore, iOS certificates) backed up.
- Mobile app contains no secrets.

## 7. Privacy and data handling

Data collected: display name (typed by the user), email, derived roll number, role, push tokens, timestamps, and content users upload or post. No location, contacts, phone number, device advertising ID, or analytics.

| Topic | Rule |
|---|---|
| Purpose | Operate the class app only; no sale or sharing; the Expo push service necessarily processes push tokens |
| Minimisation | No third-party identity provider; only email and a typed display name are collected |
| Visibility | Other students see name on uploads. They do not see emails (admins can) |
| Deletion | Self-service delete account removes the user, devices and refresh tokens. Uploads remain, attributed to "Former member"; the user may first delete their own uploads. Provide an admin email in Rules for deletion help |
| Retention | At semester end the owner decides: archive (read-only) or wipe. Document the choice in `README.md`. Backups kept 30 days |
| Logs | Keep ≤ 14 days, no tokens, no full emails (mask as `a***@domain`) |
| Breach handling | Revoke all refresh tokens, rotate secrets, notify users in-app announcement and by email within 72 hours of confirmation |
| Pakistan law | Treat the proposed Personal Data Protection framework and GDPR-style principles as the target (minimise, purpose-limit, delete on request). Verify current legal requirements before any wider release |

Child/minor data: students may be under 18 in rare cases; no special data is collected, no advertising.

## 8. Store and platform compliance checklist

| Requirement | Action |
|---|---|
| Apple 5.1.1(v) / Google Play account deletion | In-app Delete account (AUTH-5). For Play, also state the deletion path in the Data safety form and a short page or email for requests |
| Apple 1.2 user-generated content | Report mechanism (MAT-7), admin removal, content rules shown in app, support contact in Rules and in App Store/TestFlight metadata |
| Apple 4.8 login services | Not applicable: no third-party or social login is used |
| Apple review access | Reviewers must sign in. Put a demo email that matches the pattern (for example `l250000@lhr.nu.edu.pk`) in the review notes; no special code path. Recommended: TestFlight only, no public App Store listing |
| Push notifications | Ask permission in context with a one-line reason; honour OS denial gracefully |
| Google Play (if ever listed) | Data safety form, target current API level. Not needed for APK sideloading |
| Fonts | Keep licence receipts in a private note; fonts in a private repo only |
| Third-party licences | `licenses` report generated from npm/uv in release notes; all dependencies must be permissive (MIT/Apache/BSD) |

## 9. Content and copyright policy

- Course slides and books belong to their authors. The app is a private study aid inside one class; it is not public distribution. Material marked "Book" must not be an infringing scan of a commercially sold book if a legal copy exists; admins remove reported items.
- Report reason `copyright` triggers priority admin review. Removed items are deleted from storage, not hidden.
- Academic integrity: no uploading of live exam/quiz papers or answers while the assessment is in progress (rule 2 in `PRD.md` §10). Admins may remove and disable.
- Provide a contact email in the Rules screen for takedown requests from teachers.

## 10. Security verification (done before release)

1. All authorization-matrix cases pass in `Testing&Authentication.md`.
2. `pip-audit`, `npm audit --omit=dev`, `gitleaks` clean.
3. Manual: a non-matching email (`someone@gmail.com`, `l26xxxx`, `l25123`) is rejected with no user created; a disabled user is rejected immediately even with a valid access token.
4. Manual: upload a `.exe` renamed to `.pdf`, an oversized file, a macro `.docx` → all rejected with the correct error codes.
5. Manual: presigned URL expires after the TTL; bucket URL without signature returns 403.
6. Run the API with `APP_ENV=production` and confirm docs endpoints are off and error responses contain no stack traces.
7. Confirm the app build contains no `.env` secrets (`EXPO_PUBLIC_*` values are only public identifiers).
