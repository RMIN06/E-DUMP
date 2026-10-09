# M3 verification — 9 October 2026

M3 implements PRD MAT-1 through MAT-8. M4 and P1 material editing/recent uploads
have not been started. M2 verification remains in [M2Verification.md](M2Verification.md).

The backend uses protected material routes, MongoDB repositories, upload validation
and a private R2 integration. The mobile routes compose the subject material list,
upload form and material details. Dependencies are limited to the documented stack.
The owner retained M1 authentication behavior: offline reading covers an active
signed-in session; failed session restoration after an offline restart goes to sign-in.

| PRD requirement | Evidence |
|---|---|
| MAT-1 newest-first list and cursor pages | Integration tests cover 45 records across three pages, including timestamp ties; mobile retains at most two pages |
| MAT-2 kind and chapter filters | Combined filter integration and screen tests; chapter choices come from the full subject |
| MAT-3 subject-scoped search | Title, chapter and original filename search; escaped metacharacters; Android F1 searches `3` |
| MAT-4 upload | All seven extensions, metadata, size counters, MIME/magic checks, macro rejection, quota, rate limit and rollback tests; Android native picker uploads a PDF to live R2 |
| MAT-5 download/open/cache | Authorized ten-minute signed GET, progress/cancel, partial cleanup, 500 MB LRU cache, image preview and device document viewer; cached PDF reopened with the API stopped |
| MAT-6 delete | Owner/admin/other-student matrix; retry after R2 failure; Android confirmation removes both synthetic fixtures and their R2 objects |
| MAT-7 report | Fixed reasons, bounded optional note, per-user uniqueness and rate limit; Android report receipt |
| MAT-8 duplicate guard | Same-subject SHA-256 rejection, concurrent upload race, cross-subject allowance; Android F2 links to existing material after the second PDF upload |

Every material endpoint is tested for anonymous, enabled student, admin and disabled
student access. Delete additionally tests ownership. Public material metadata excludes
emails, R2 object keys and internal search/hash fields. Download responses are not
query-persisted and carry `Cache-Control: no-store`.

`make verify` passed with exit code 0. Full output: [M3Verify.log](M3Verify.log).

| Check | Result |
|---|---|
| Ruff, formatting and strict mypy | Passed |
| ESLint and strict TypeScript | Passed; existing Jest mock setup has one lint warning |
| Backend | 179 passed; app coverage rounds to 97% |
| Services/deps | Coverage rounds to 96%; required 90% gate passed |
| Mobile | 171 passed; required global/auth/lib coverage gates passed |
| Audit-policy tests | 6 passed |
| Slop and generated API schema checks | Passed |
| Backend dependency audit and secret scan | Passed |
| Mobile dependency audit | No unaccepted findings; existing scoped exceptions expire 8 November 2026 |
| Local Android debug build | `assembleDebug` succeeded for x86_64; APK installed on emulator |

The backend warning comes from the intentionally wrong-algorithm JWT test. No
new audit exceptions were added. R2 keys remain in ignored `backend/.env` and are
not in screenshots, logs, seed files or this report.

The live Cloudflare setup is `edump-files`, Standard storage in APAC, public access
disabled, and an Object Read & Write token restricted to this bucket. Incomplete
multipart uploads abort after one day. Students use their normal app session to
upload through the API; they need no Cloudflare account or individual R2 permission
grant. Cloudflare credentials stay on the backend.

`uv run python scripts/check_r2.py` separately verified signed download bytes, MIME,
attachment disposition, ten-minute expiry metadata and an expired one-second URL.
An unsigned S3 request returned HTTP 400 without file bytes; Cloudflare's endpoint
rejects missing authentication this way. The expired signed URL returned HTTP 403.
The disposable check object was removed in `finally`. Automated tests use fake R2;
they never use the live bucket.

Upload validation uses bounded reads and temporary disk storage. OOXML checks reject
macros, encrypted ZIP entries, XML entity declarations and incorrect manifests, with
resource ceilings of 4,096 entries, 100 MB total uncompressed data and a 64 KB content
type manifest. The hourly single-instance sweeper removes stale pending orphans and
recovers pending records that already have an active material reference.

Android native checks used a synthetic development student and two disposable
fixtures, without real class material. The PDF was uploaded using the native picker,
searched, opened in the OS viewer, reported and deleted. A tiny solid-colour PNG
verified image decoding and internal display. Both fixtures were removed through
the app; the Cloudflare Objects page subsequently showed an empty bucket. Me's
Clear downloads removed `cache/files` on the emulator.

Visual checks covered regular Android width and 320 dp at 1.6× text scale. Headings
wrap, filter text scrolls horizontally, the focused field stays above the keyboard,
and the form scrolls to its remaining fields and action. Short text actions and
filters have at least 48 dp width and height. Styling uses theme tokens, hairlines
and text hierarchy. The floating gear in development screenshots belongs to Expo
dev tools; the PDF viewer and keyboard belong to Android.

Screenshots:

- [Native upload](screenshots/M3-android-upload.png), [material list](screenshots/M3-android-materials.png), [duplicate recovery](screenshots/M3-android-duplicate.png)
- [PDF viewer](screenshots/M3-android-pdf-viewer.png), [image display](screenshots/M3-android-image.png)
- [Offline detail](screenshots/M3-android-offline-material.png), [offline PDF reopening](screenshots/M3-android-offline-pdf-viewer.png)
- [Compact image](screenshots/M3-android-compact-image.png), [keyboard](screenshots/M3-android-compact-keyboard.png), [form scrolling](screenshots/M3-android-compact-form-scroll.png), [delete confirmation](screenshots/M3-android-compact-delete.png)
- [Private bucket](screenshots/M3-r2-private-bucket.jpg), [token scope](screenshots/M3-r2-token-scope.jpg), [active token](screenshots/M3-r2-token-active.jpg), [one-day cleanup](screenshots/M3-r2-one-day-cleanup.jpg), [empty after checks](screenshots/M3-r2-empty-after-checks.jpg)

Acceptance limits remain explicit: physical Android phone acceptance is deferred to
M7 by the owner; iOS acceptance is deferred because no Mac/signing environment is
available. Development fonts use approved platform fallbacks; licensed fonts are
still required by the release gate. Full device-matrix, landscape, screen-reader,
motion and accessibility polish remain M6; hosted preview and release hardening are
M7. The local development APK requires this PC's API and Metro and is not the hosted
APK link requested for later phone testing.
