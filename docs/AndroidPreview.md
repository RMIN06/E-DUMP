# Android preview 0.1.4

Published 10 October 2026 (Asia/Karachi), Android version code `5`. Welcome/logo source `80570df`; local build memory controls `83ec939`.

- [Download for most Android phones (ARM64)](https://pub-b29fbdc2dd2240a29913bd5614807f9e.r2.dev/edump-0.1.4-arm64.apk)
- [Download for older 32-bit Android phones (ARMv7)](https://pub-b29fbdc2dd2240a29913bd5614807f9e.r2.dev/edump-0.1.4-armv7.apk)

This update adds the palette-matched open-book E-DUMP logo to the launcher, splash and welcome screen. The welcome screen appears once per installation; Continue persists the choice before opening sign-in. Returning signed-in students open their existing app session directly. The existing responsive layout, font scaling, reduced-motion feedback and features remain in place.

Android push is enabled with Firebase Cloud Messaging v1 in the existing Expo project. Sign in and choose Allow notifications, or enable notifications in Me. Other users' admin announcements trigger class alerts; the posting admin's devices are excluded. Notification taps open the matching update. The dedicated messaging credential stays in Expo and the private release directory, outside Git and the APK. Google OAuth and FCM v1 validation passed; physical receipt and tap acceptance remain pending.

Install over the previous preview using the same signing certificate. Android 8 or later is required. The bundled API remains `https://edump-api.onrender.com/api/v1`. Both anonymous public downloads returned HTTP 200 and matched their signed local APKs:

| APK | Bytes | SHA-256 |
| --- | ---: | --- |
| ARM64 | 43737815 | `2a13c58a0a80d7d2e6be94104b1675ef568030e623723fa94d0ac57bd11284a8` |
| ARMv7 | 37493453 | `1ce66c0c772b45111b806834d0aa2a7666520bc79a3990a707f423e3ba787249` |

Release compilation succeeded in 1h 4s. APK signature/package/version checks, native Firebase resource checks, hosted API and welcome bundle checks, and scans against actual private credentials passed. `make verify` checks passed after rerunning its repaired security target: 227 backend tests, 21 mobile suites / 204 tests, lint, strict types, coverage gates, generated API types, slop check and security checks with the approved tooling advisory exception. GitHub CI passed all four jobs at `6453249`; its lockfile repair completes existing optional resolver peers without changing direct app dependencies. Physical Android visual, functional and notification acceptance remain pending. Preview fallback fonts and free API cold starts still apply; iOS remains deferred.

Local evidence is under ignored `artifacts/release`: `android-build-0.1.4.log`, `verify-complete-0.1.4.log`, `fcm-validation-0.1.4.json`, `apks-0.1.4.json`, `public-download-verification-0.1.4.json` and `upload-confirmation-0.1.4.png`.

## Archived Android preview 0.1.3

Published 10 October 2026 (Asia/Karachi), from source `aea794a`, Android version code `4`.

- [Download for most Android phones (ARM64, 43.72 MB)](https://pub-b29fbdc2dd2240a29913bd5614807f9e.r2.dev/edump-0.1.3-arm64.apk)
- [Download for older 32-bit Android phones (ARMv7, 37.47 MB)](https://pub-b29fbdc2dd2240a29913bd5614807f9e.r2.dev/edump-0.1.3-armv7.apk)

This UI update adapts the compact headers, grouped lists and action hierarchy of [Task manager Mobile app UI by Rohan Kumar](https://www.figma.com/community/file/1025672621370192050/task-manager-mobile-app-ui) to E-DUMP. All screens now use a consistent moss context header. Profile actions use filled setting rows; course icons, file counts, list spacing and selected navigation labels establish a clearer hierarchy. Forms and detail screens share the same layout. The assigned palette, feature scope, permissions, API behavior, native upload picker, scalable text and reduced-motion feedback are preserved. No template assets or new dependencies were added.

Install over the existing preview using the same signing certificate. Android 8 or later is required. The bundled API remains `https://edump-api.onrender.com/api/v1`. Both public URLs returned HTTP 200 without authentication, and complete downloads matched the signed local APKs:

| APK | Bytes | SHA-256 |
| --- | ---: | --- |
| ARM64 | 43716794 | `cd7095ebb46feadb78c334f7dbf656f01e9233c4c7c09d5223cd175873d193a1` |
| ARMv7 | 37472432 | `61616237c5eb349e642cfdb1ba458c567a0f164d72e3da535bc98396f8ad6424` |

`assembleRelease` succeeded in 8m 11s with one Metro worker and the existing one-job native compilation limits. Both APK signatures passed; AAPT confirmed package `com.edump.bcs3e`, version `0.1.3`, version code `4`, Android API floor 26, target 36 and no debuggable flag. The context-header bundle and hosted API checks passed, along with scans against actual private credential values.

Frontend `make verify -o lint-backend -o test-backend -o check-types -o security` passed: 20 suites / 202 tests, lint, strict TypeScript, audit-policy tests and slop check. Backend checks were not repeated for this UI-only update. Native visual, keyboard, screen-reader and physical-phone acceptance remain pending. Approved preview font fallbacks, free API cold starts, deferred push and iOS still apply.

Local evidence: ignored `artifacts/release/android-build-0.1.3-final.log`, `frontend-verify-0.1.3.log`, `apks-0.1.3.json`, `public-download-verification-0.1.3.json` and `upload-confirmation-0.1.3.png`.

## Archived Android preview 0.1.2

Published 10 October 2026 (Asia/Karachi), from source `d1ffb09`, Android version code `3`.

- [Download for most Android phones (ARM64, 43.72 MB)](https://pub-b29fbdc2dd2240a29913bd5614807f9e.r2.dev/edump-0.1.2-arm64.apk)
- [Download for older 32-bit Android phones (ARMv7, 37.47 MB)](https://pub-b29fbdc2dd2240a29913bd5614807f9e.r2.dev/edump-0.1.2-armv7.apk)

The owner-requested redesign replaces oversized serif preview headings with mobile-sized system sans typography, filled rounded rows and inputs, filled selected filters, sculpted functional icons, a filled upload selector and tactile button scale feedback. Schedule rows share the new surfaces and highlight the current class. All styling uses the assigned palette and theme tokens, remains single-column and respects font scaling and reduced motion. The 21st AI generation attempt returned HTTP 401; no generated draft was retrieved. Existing native dependencies were used.

Install over the earlier preview with the same signing certificate. Android 8 or later is required. The hosted API remains `https://edump-api.onrender.com/api/v1`. Both public URLs returned HTTP 200 without authentication; complete downloads matched these signed local files:

| APK | Bytes | SHA-256 |
| --- | ---: | --- |
| ARM64 | 43716226 | `a852986537c5259cb0e795ed42585c0048c10d7ed01fbbeaca56390b30b620bf` |
| ARMv7 | 37471864 | `fc59fbd6ef583413406957475907d6554cb400af96edb1c504df8053161e681d` |

`assembleRelease` succeeded in 9m 10s. Both signatures passed, version/package checks passed, the new icon/surface tokens and HTTPS API are present in the bundle, and private-credential scans passed. Frontend `make verify -o lint-backend -o test-backend -o check-types -o security` passed: 20 suites / 202 tests, strict TypeScript, lint and slop check. After the schedule surface change, lint/TypeScript/slop verification passed again while reusing those tests. No backend tests ran. Native visual, keyboard, screen-reader and physical-phone acceptance remain pending. Existing preview exceptions for platform fonts, free API cold starts, deferred push and iOS continue to apply.

Local evidence: ignored `artifacts/release/android-build-0.1.2.log`, `frontend-verify-0.1.2.log`, `frontend-final-verify-0.1.2.log`, `apks-0.1.2.json` and `public-download-verification-0.1.2.json`.

## Archived Android preview 0.1.1

Published 10 October 2026 (Asia/Karachi), from source commit `af38ee4`. Android version code: `2`.

- [Download for most Android phones (ARM64, 45.23 MB)](https://pub-b29fbdc2dd2240a29913bd5614807f9e.r2.dev/edump-0.1.1-arm64.apk)
- [Download for older 32-bit Android phones (ARMv7, 38.98 MB)](https://pub-b29fbdc2dd2240a29913bd5614807f9e.r2.dev/edump-0.1.1-armv7.apk)

This update adds smooth button feedback, animated tab underlines, clearer upload sections, wrapping filenames and actual upload percentages. It retains the assigned theme, preview font fallbacks and reduced-motion support. Install over 0.1.0; both builds use the same signing certificate. Android 8 or later is required. The bundled HTTPS API remains `https://edump-api.onrender.com/api/v1`.

Both public URLs returned HTTP 200 without authentication. Complete downloads matched the signed local APKs:

| APK | Bytes | SHA-256 |
| --- | ---: | --- |
| ARM64 | 45226302 | `bb6c7995802ce3eeb87eaec36143232b4a7d113656634287c9b09771da9f1d8c` |
| ARMv7 | 38981940 | `eeb799f27d45b86d2a988d37b32265e3f8526d3371668fe8eff48569e8772d23` |

The signed build, hosted API bundle, polished UI bundle and private-credential scan passed. Frontend verification passed 202 tests, lint, strict TypeScript and the slop check; backend tests were not repeated for this UI-only update. Phone, keyboard and screen-reader acceptance remain pending. The existing preview exceptions for fallback fonts, free API cold starts, deferred push and iOS still apply.

The installers are also published in the private repository's [0.1.1 preview release](https://github.com/RMIN06/E-DUMP/releases/tag/v0.1.1-preview), with authenticated download checks passed. Public R2 links above are preferred for phone installation. Local publication evidence is recorded in ignored `artifacts/release/public-download-verification-0.1.1.json`, `github-download-verification-0.1.1.json` and `apks-0.1.1.json`. See AndroidPreviewVerification.md and FrontendPolish.md for build and UI checks.

## Archived Android preview 0.1.0

Published 10 October 2026 (Asia/Karachi), from source commit `5bda8ec`.

- [Download for most Android phones (ARM64, 45.22 MB)](https://pub-b29fbdc2dd2240a29913bd5614807f9e.r2.dev/edump-0.1.0-arm64.apk)
- [Download for older 32-bit Android phones (ARMv7, 38.98 MB)](https://pub-b29fbdc2dd2240a29913bd5614807f9e.r2.dev/edump-0.1.0-armv7.apk)

Requires Android 8 or later. Download on the phone and allow installation from the browser when Android asks. This standalone release includes JavaScript; Expo Go and a connection to the development PC are unnecessary. Sign in using the approved student email format and your name. If the first request times out, wait about a minute and retry while the free API wakes up.

Package: `com.edump.bcs3e`; version code: `1`. API: `https://edump-api.onrender.com/api/v1`. Only signed installers are in the public `edump-apk` bucket; class uploads and backups remain in private `edump-files`.

## Build evidence

Local `assembleRelease` succeeded. ARM64 signature verification passed with APK signature scheme v2, a 3072-bit RSA release key, and no debuggable application flag. Both APKs contain the hosted API address and bundled JavaScript, exclude the old localhost API address, and passed a scan against the actual private database, JWT and R2 credential values. Both are below the 60 MiB installer budget.

| APK | Bytes | SHA-256 |
| --- | ---: | --- |
| ARM64 | 45223350 | `6ede16341570db16ad00029ee5121cfdb4db9562fcb3f1387a4f4dacb2bda46a` |
| ARMv7 | 38978988 | `c5e302b58d331a89ccf5263049476d338e1f5ed9e7579f887e8fa71f57a903c6` |

Signing certificate SHA-256: `e7b47a76c855e2ee6f97f9f0db379e647e7e3363f21a3eda6d294c1de89994df`.

Both public download URLs returned HTTP 200. Complete unauthenticated downloads matched the byte counts and SHA-256 values above. Local evidence is under ignored `artifacts/release/`: `android-build.log`, `apk-upload.png` and `public-download-verification.json`.

Application verification and live API/backup evidence are recorded in AndroidPreviewVerification.md. This delivery is the first functional preview, with phone acceptance pending. The owner approved fallback fonts, free sleeping hosting and deferred push delivery; in-app Updates remain available. iOS, licensed production fonts, the complete native accessibility/responsiveness matrix, always-on backups and final class rollout remain pending. M6 motion polish still includes the active main-tab underline transition and deletion collapse animation; this preview does not certify every M6/M7 acceptance gate.
