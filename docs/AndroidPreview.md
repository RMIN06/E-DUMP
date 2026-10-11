# Android preview 0.1.7

Published 11 October 2026 (Asia/Karachi), Android version code `8`, native/application source `c24d4f5`; material-notification API source `578c42a` is live on Render.

- [Download for most Android phones (ARM64)](https://pub-b29fbdc2dd2240a29913bd5614807f9e.r2.dev/edump-0.1.7-arm64.apk)
- [Download for older 32-bit phones (ARMv7)](https://pub-b29fbdc2dd2240a29913bd5614807f9e.r2.dev/edump-0.1.7-armv7.apk)
- [Open the updated web companion](https://edump-preview.pages.dev)

Install this bootstrap APK once over the previous preview to enable compatible Android OTA updates. Future JavaScript/UI fixes use the existing app's update notice; native/SDK/plugin changes require a new runtime and APK. See InstalledUpdates.md for the publication command and safe-restart behavior. The browser/Home Screen app updates through its existing service worker and keeps the same Home Screen icon.

Successful material uploads now alert other active users through enabled Android/browser devices, including Apple Web Push subscriptions. Tapping opens the material. Duplicate/rejected uploads send no extra alerts, provider failures preserve uploaded records, and the existing per-device toggle controls material and announcement alerts. Announcements retain their existing feed behavior.

Safari uses the Apple system font fallback, fixed text-size adjustment, dynamic viewport height and notch/home-indicator insets. All phone-width rows place metadata below titles. Desktop and 428 px browser checks showed no horizontal overflow; the live web update notice restarted into the new release without losing the signed-in session. These Chrome checks do not certify physical Safari rendering or iPhone push delivery.

`make verify` ran backend/mobile lint, 245 backend tests, 224 app tests and 15 edge/audit contract tests with required coverage. The newly approved OTA package initially needed adding to the dependency allowlist; after that fix, `make verify -o lint -o test` completed the remaining slop/schema/security checks without repeating successful tests. Python audit and secret scanning passed; npm had no findings beyond the three existing owner-approved tooling exceptions. The native plugin change additionally passed mobile lint/typing. The 21st UI review reported zero findings in the four changed UI files.

The signed native build succeeded in 49m 15s after aligning local library NDK selection with React Native's installed version. During compilation, selected generated Ninja pools temporarily used two jobs after a memory check; their original one-job settings were restored afterward. Both APKs passed package/version/certificate and actual private-credential scans, include material tap routing and OTA UI, and remain below 60 MiB. The signing certificate is unchanged. The built manifest enables updates with runtime `edump-android-1` and channel `preview`; the live EAS manifest matches update `01a12a15-501f-7b50-9c12-672400db280d` in group `2e3ed5e8-950d-48ca-89e1-989e043d7fcc`.

Both full public downloads returned HTTP 200 without authentication and matched the signed local installers:

| APK | Bytes | SHA-256 |
| --- | ---: | --- |
| ARM64 | 47468964 | `8bd1ca5a5c81744832a4ec19bb7d93920fa00f7a15b15e4a655a098fcce8ffc5` |
| ARMv7 | 41175452 | `6dd668d77e391253244107de86c2c58958b66e1f4794ebf57dd7994c2d122d71` |

Physical Android OTA application, iPhone material notification delivery, keyboard and accessibility checks remain owner acceptance. Existing preview font fallbacks, free API cold starts and native iOS deferral still apply. Local release evidence is in ignored artifacts/release/.

## Archived Android preview 0.1.6

Published 11 October 2026 (Asia/Karachi), Android version code `7`, application source `ad4fdca`.

- [Download for most Android phones (ARM64)](https://pub-b29fbdc2dd2240a29913bd5614807f9e.r2.dev/edump-0.1.6-arm64.apk)
- [Download for older 32-bit Android phones (ARMv7)](https://pub-b29fbdc2dd2240a29913bd5614807f9e.r2.dev/edump-0.1.6-armv7.apk)
- [Open the updated web companion](https://edump-preview.pages.dev)

Shared Android/web scrolling now uses stable row layout without text-measurement state changes, bounded scroll viewports and retained animated views. FlatList virtualization remains enabled. Materials support selecting multiple files with independent titles and common type/chapter/note, per-file progress and errors, and retry that skips successful uploads. Announcement selection supports several attachments within the existing three-file total. Existing palette, features, authorization, formats, 25 MB per-file limit, server quotas and duplicate checks remain in place.

The signed native build succeeded in 8m 10s. Both APKs passed package/version/signature and actual private-credential scans, contain the new batch selection UI and hosted HTTPS API, and remain below 60 MB. The signing certificate is unchanged, allowing installation over the previous preview. Android 8 or later is required. Complete anonymous downloads returned HTTP 200 with matching hashes:

| APK | Bytes | SHA-256 |
| --- | ---: | --- |
| ARM64 | 43746931 | `1be5541ea2a71a6fa874b9d3a88acbc051b9307635fcb90537ebe101ea91c75f` |
| ARMv7 | 37502569 | `5c083308b335f0c3d2748aa20a85430cd7060e82ab3fcb95ce4cace094560134` |

The frontend verification gate passed: `make verify -o lint-backend -o test-backend -o check-types -o security` ran app lint/TypeScript, 222 app tests with coverage, 13 edge/audit contract checks and the slop check. Backend code/dependencies did not change; backend suites and security audits were not rerun for this frontend task. The 21st UI review reported zero findings; catalogue access returned HTTP 401, so existing primitives/design context were reused.

Signed-in browser checks at desktop and 390 px widths confirmed stable row heights/widths while scrolling and no horizontal overflow. The published browser picker accepted two files and presented independently editable titles; the test selection was closed without writing class files. Published HTML matches the new export; anonymous profile access returns 401 with no-store headers; the web export excludes actual private credentials. Physical Android/iPhone functional and accessibility acceptance remain pending the owner. Preview fallback fonts and free API cold starts continue to apply.

Ignored local evidence: artifacts/release/android-0.1.6.log, verify-ui-0.1.6.log, web-export-0.1.6.log, apks-0.1.6.json, public-download-verification-0.1.6.json, web-public-0.1.6.log, subjects-desktop-0.1.6.png, subjects-phone-scroll-0.1.6.png, batch-picker-phone-0.1.6.png, web-publish-0.1.6.png and apk-upload-0.1.6.png.

## Archived Android preview 0.1.5

Published 11 October 2026 (Asia/Karachi), Android version code `6`, application source `7b435e6`.

- [Download for most Android phones (ARM64)](https://pub-b29fbdc2dd2240a29913bd5614807f9e.r2.dev/edump-0.1.5-arm64.apk)
- [Download for older 32-bit Android phones (ARMv7)](https://pub-b29fbdc2dd2240a29913bd5614807f9e.r2.dev/edump-0.1.5-armv7.apk)
- [Open the responsive web companion](https://edump-preview.pages.dev)

Announcements appear once by ID: Coming up records are excluded from the remaining feed, overlapping pages are deduplicated, and filters apply to both sections. Both clients share the existing API/database and refresh active visible screens every 30 seconds. Rules lists l250716@lhr.nu.edu.pk and l250656@lhr.nu.edu.pk as support, deletion and takedown contacts. Native welcome, logo, file workflows, admin controls and Expo push remain available; browser platform adapters preserve the same features. See WebPreview.md for web storage, notification and hosting details.

The final signed release build succeeded in 7m 44s. Both APKs passed package/version/signature checks, contain both support contacts and the hosted HTTPS API, exclude localhost configuration, and passed scans against the actual private database, JWT, R2, Firebase and VAPID credentials. The unchanged signing certificate supports installing over the previous preview. Android 8 or later is required.

Both complete anonymous public downloads returned HTTP 200 and matched the signed local files:

| APK | Bytes | SHA-256 |
| --- | ---: | --- |
| ARM64 | 43740291 | `8c163b2c6ad1bbd260cd175efef192de16f2ea7b1d6dbd0e98a00a4759aecf30` |
| ARMv7 | 37495929 | `e6600cd9b6d0c416323570bd304ee8d597bef6619eb064b4ba8a45ef06b4a48a` |

`make verify` passed, including 243 backend tests and 214 mobile tests, coverage, lint, strict typing, schema, slop and security checks with the existing scoped tooling exception. After the direct-link navigation fix, the focused mobile/slop gate passed with 216 mobile tests and 13 edge/audit contract tests; backend code did not change. Signed-in desktop/narrow browser checks passed, browser push registration succeeded, and a provider accepted one owner-only test notification. Physical Android/iPhone functional, accessibility and notification receipt/tap acceptance remain pending the owner. Preview fallback fonts and free API cold starts continue to apply.

Local evidence is under ignored artifacts/release: android-0.1.5-final.log, verify-web-0.1.5.log, verify-web-navigation-final.log, apks-0.1.5.json, public-download-verification-0.1.5.json, browser-push-live.log, web-public-verification.log and apk-upload-0.1.5.png.

## Archived Android preview 0.1.4

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
