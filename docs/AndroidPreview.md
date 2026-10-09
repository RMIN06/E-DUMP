# Android preview 0.1.0

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
