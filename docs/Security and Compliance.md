# Security and Compliance — E-DUMP

Owner correction, 21 October 2026: every account must prove mailbox access through a six-digit emailed code. This supersedes the historical accepted risk of pattern-only sign-in. Mailjet receives the destination and code; Mongo stores a protected digest. Legacy sessions and unverified notification registrations are rejected. See EmailAuthentication.md.


Scope: a private app for ≤ 60 students handling names, FAST emails, push tokens and course files. Risk is low in volume but the app is internet-facing, so the basics are mandatory. This is engineering guidance, not legal advice.

---

## 1. Assets and threats

| Asset | Threat | Control |
|---|---|---|
| Access to the class space | Outsiders joining or impersonating another address | Student email pattern plus mailbox verification; admin disable; no class roster enforcement |
| Admin powers (alerts, deletes) | Student escalates privileges | Server-side role checks on every route, role loaded from DB per request (§3) |
| Sessions | Token theft, replay | Short access JWT, rotating refresh with reuse detection, SecureStore (§2.3) |
| Uploaded files | Malware, spoofed types, oversized files, storage abuse | Allowlist, magic-byte check, size cap, quotas, private bucket, no inline execution (§4) |
| API availability | Abuse, brute force, scraping | Rate limits, request size limits (§5) |
| Secrets | Leak via repo or logs | Env-only secrets, scans, no secrets in `EXPO_PUBLIC_*` (§6) |
| Personal data | Over-collection, no deletion | Data minimisation, delete-account, retention rules (§7) |

## 2. Authentication controls

### 2.1 Student email and mailbox proof

1. Trim and lowercase the address; retain the complete ASCII student pattern and rejection of control characters, suffixes and look-alikes.
2. POST /auth/login reserves a challenge and sends a six-digit code through Mailjet. It does not create a user or issue credentials.
3. POST /auth/verify checks the email-bound, delivered, unexpired challenge and consumes the code atomically. Only then apply active-account checks, admin bootstrap and find/create the account.
4. Codes expire in ten minutes, permit five guesses and work once. Resends replace old challenges. Store only an HMAC-SHA256 digest with purpose, email and challenge binding; never log/return raw codes or provider credentials.
5. Keep IP/new-account quotas; persist per-email cooldown/hour limits and a global daily delivery reservation cap in Mongo. Expiry checks do not rely on TTL deletion. See EmailAuthentication.md for limits and retention.

### 2.2 Own tokens
- Access token: JWT HS256, 15 min, claims `sub`, `iat`, `exp`, `typ=access`, `auth_version=2`. Secret ≥ 32 random bytes. Reject `alg=none` and any alg other than HS256 explicitly.
- Refresh token: 256-bit random, URL-safe, stored **hashed** (SHA-256) with `family_id`, expiry 30 days, TTL index.
- Rotation on every refresh. If a revoked/replaced token is presented, revoke the whole family and require sign-in.
- Logout revokes the family. Account deletion and user disable revoke all families.

### 2.3 Client storage
- Refresh token in `expo-secure-store` (Keychain / Keystore). Access token in memory only.
- Never store tokens in AsyncStorage, logs, or query cache persistence. The persisted query cache must exclude auth data.
- Clear the persisted query cache and cached files on sign-out and account deletion.

### 2.4 Email ownership required

The owner replaced the accepted pattern-only impersonation risk on 21 October 2026. Every account, including admins and existing installations, must verify once. Reject legacy access JWTs and refresh records without auth_version=2. Notify only device registrations made through verified sessions. After verification, saved sessions persist with the existing secure storage, rotation and revocation behavior.

Mailbox ownership confirms access to the student address; it does not establish class-section membership. Continue enforcing the existing role checks, active-account checks and student-email pattern. Brevo signup was abandoned; Mailjet is the chosen transactional provider. Open and click tracking are disabled for sign-in emails.

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
