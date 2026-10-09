# M0 verification — 9 October 2026

Status: M0 complete for the owner's Android-first acceptance scope; iOS acceptance explicitly deferred. M1 is authorised to begin.

Scope: FinalVerdict.md M0 and PRD §9 platform, availability and accessibility requirements.
No authentication, private class content, seed data, uploads, announcements or admin functionality was added.

Implemented: AGENTS.md from Structure.md §6; monorepo directories; Makefile; four CI jobs;
backend Dockerfile and public /healthz and /readyz; Expo shell; theme, typography and responsive tokens;
Screen, Heading and Text; font preparation/release checks; slop checks; generated API types.
Empty directories reserve later milestones without registering inactive routes.

The owner approved required Expo peers and lint/test support dependencies, then delegated compatibility selection.
Expo SDK 55.0.31 with React Native 0.83.10 supports the selected Android 8+ and iOS 15.1+ floor.
iOS 15.0 needs a minor OS update; SDK 57 would require iOS 16.4.
TypeScript 5.9, ESLint 9 and test-renderer 1.2 satisfy these tools' peer requirements.
Commercial fonts are absent. Development uses platform fonts; preview/production builds fail without licensed files.
Motion values are the UI.md starting values only; tuning and animation implementation remain M6.

`make verify` ran with GNU Make 4.4.1, Git Bash, uv 0.12.24 and gitleaks on the local PATH.
It exited **0** after the owner approved the scoped, expiring tooling audit policy.

| Check | Result |
|---|---|
| Ruff lint and formatting, strict mypy | Passed |
| ESLint and strict TypeScript | Passed |
| Backend tests | 26 passed, none skipped; 100% app coverage |
| Services/deps coverage | 100%, above the 90% gate |
| Mobile tests | 30 passed; 97.22% src line coverage |
| Slop checker and rejection tests | Passed |
| Generated API types | Up to date |
| pip-audit | No known vulnerabilities |
| gitleaks | No leaks |
| npm production dependency audit | Passed policy: three owner-approved tooling advisories, no unaccepted findings |
| Audit policy guard tests | 6 passed |
| Android and iOS development JS bundle export | Passed |

The npm findings cascade from three upstream advisories with no patched npm releases:

- [braces: deeply nested pattern denial of service](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
- [node-forge: RSA signature verification](https://github.com/advisories/GHSA-86w9-cpqp-85rv)
- [sprintf-js: unbounded precision denial of service](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)

Available fixes for decode-uri-component and uuid were pinned through dependency overrides.
Audit enforcement remains enabled in Make and CI through `scripts/audit-policy.mjs`.
The owner approved only the three advisories above through 8 November 2026.
Their exact installed versions, dependency paths and residual risk are recorded in
[M0AuditDecision.md](M0AuditDecision.md). New advisories, version changes, expiry and
audit failures still fail verification. Native development source maps contain none
of these packages (1,243 Android sources and 1,220 iOS sources).
The suggested force fixes change the selected Expo/React Native major versions and were not applied.

The real MongoDB 7 ping test passed locally against a checksum-verified MongoDB 7.0.43
portable instance bound to 127.0.0.1:27018. CI retains its MongoDB 7 service.
The live Uvicorn server also returned HTTP 200 with `{"status":"ok"}` from both
health endpoints and the `X-Content-Type-Options: nosniff` header; `/readyz` used
the real database through the full application lifespan and dependency chain.
Docker image execution has not been verified (Docker is unavailable locally).
The Android development APK built successfully with JDK 17 and Gradle 8.14.6,
then installed and launched on the accelerated Android 36 x86_64 emulator.
The final build completed in 3m 57s, with 351 tasks (49 executed, 302 cached).
The local build used one worker, a 1536 MB heap and 768 MB metaspace after the
initial reduced-memory attempt exhausted its JVM limit. Metro used one worker.
Metro must bind IPv4 for ADB reverse forwarding; IPv6-only localhost did not work.
Prebuild pins Gradle 8.14.6 and its official distribution checksum through
`mobile/plugins/withCompatibleGradle.ts`. React Native 0.83's bundled Foojay resolver
references an API removed in Gradle 9. The build requires JDK 17; Android Studio's
bundled Java 25 is incompatible with this Gradle/Kotlin combination.
The owner approved `com.edump.bcs3e` for both native app identifiers.
The owner has an iPhone but no paid Apple membership or Mac, and explicitly deferred iOS acceptance
to continue Android first at $0. Free personal device signing needs Xcode on a Mac;
[Apple documents seven-day provisioning expiry](https://developer.apple.com/help/account/basics/about-your-developer-account).
EAS is not signed in; the local Android build requires no EAS account.
The successful exports check JS dependency resolution; they do not substitute for native builds,
device screenshots, measured text layout, or performance testing.

Expo's background-only Android splash references a missing drawable in SDK 55.
`mobile/plugins/withPlainSplash.cjs` supplies a transparent drawable in a finalized
mod. A subsequent prebuild confirmed the resource is recreated automatically.

Android screenshots were inspected at 411 pt / default text, 320 pt / 1.6x text,
and 800 pt / default text. The heading and body remain visible without clipping;
the tablet column remains centred and bounded by the 560 pt token. Safe areas
and the 24 pt content axis are visible. The gear overlay belongs to Expo's
development client, not E-DUMP's UI. Commercial font rendering, iOS layout,
screen-reader testing and the complete release device matrix remain deferred.

- [Regular Android](screenshots/M0-android-regular.png)
- [Compact Android, large text](screenshots/M0-android-compact-large-text.png)
- [Tablet Android](screenshots/M0-android-tablet.png)

The final `make verify` run after the splash fix exited 0; its output is saved in
`docs/M0Verify.log`. The owner authorised proceeding to M1 once M0 passed and
explicitly deferred iOS acceptance. This completes that agreed M0 gate.
