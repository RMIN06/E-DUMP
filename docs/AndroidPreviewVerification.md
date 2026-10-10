# Android preview verification — 9 October 2026

`make verify` initially reached the mobile tests after backend lint, strict typing and all 227 backend tests passed (96.43% overall coverage). Two mobile test assertions failed: subscription mock history and an observer pagination timing assumption. Commit e1d3c6c corrected those assertions; application behavior was unchanged.

The remaining verification ran as `make verify -o lint-backend -o test-backend`, reusing the successful backend targets rather than repeating them. Exit status: **0**. Mobile lint passed with three existing CommonJS mock import warnings; all **20 suites / 199 tests** passed. The six audit-policy tests, visual style check, generated API type check, Python dependency audit and secret scan passed. Node audit found no unaccepted findings; the three owner-approved tooling exceptions expire on 8 November 2026.

Evidence: M6M7Verify.log records the initial run and backend results; M6M7VerifyRemaining.log records the corrected remaining run.

The production dependency-only environment imports the API successfully. Live HTTPS checks passed for health, readiness, disabled API docs, anonymous protected routes and rejected out-of-domain email. Seven subjects and eleven schedule slots were seeded in Atlas. A private R2 metadata backup and local restore drill matched all nine collection counts and index definitions; see Operations.md.

First-preview exceptions: push delivery is deferred by owner approval after Firebase resources failed to load; platform fonts are permitted; the free API sleeps while idle. Android device acceptance belongs to the owner after APK delivery. iOS, the full native accessibility/responsiveness matrix, licensed fonts, an always-on backup runner and final class rollout remain pending. The local daily backup task and approved 30-day private backup expiry are configured; see Operations.md. These automated results do not certify device acceptance.

Release tooling checks: the Expo annotation classpath alignment and local CMake one-job pool passed TypeScript checking. Their native behavior is validated by the APK build rather than repeating unrelated application tests. The pool follows [CMake job pool configuration](https://cmake.org/cmake/help/latest/prop_gbl/JOB_POOLS.html); the annotation fix aligns Expo's compile and runtime selections under [Gradle consistent resolution](https://docs.gradle.org/current/userguide/dependency_resolution_consistency.html).

## Polished UI rebuild — 10 October 2026

Version 0.1.1, Android version code 2, source af38ee4. `assembleRelease` succeeded in 13m 46s: 60 tasks executed and 786 up-to-date. Both ARM64 and ARMv7 APK signatures passed; the ARM64 certificate matches the existing preview signing certificate. AAPT confirms com.edump.bcs3e, Android API floor 26, and no debuggable flag. Both bundles contain the polished upload copy and hosted HTTPS API, exclude the localhost API, and passed scans against the actual private JWT, MongoDB and R2 values.

The UI verification passed 20 suites / 202 mobile tests. The release configuration check reran frontend lint, strict TypeScript and the slop check with `make verify -o lint-backend -o test-backend -o test-mobile -o check-types -o security`, exit 0; it reused the completed mobile tests. Backend checks were not repeated for this frontend-only change. Evidence: ignored artifacts/release/android-build-0.1.1.log, frontend-release-verify-0.1.1.log and apks-0.1.1.json. Native device acceptance remains pending.
