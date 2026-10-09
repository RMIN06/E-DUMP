# Android preview verification — 9 October 2026

`make verify` initially reached the mobile tests after backend lint, strict typing and all 227 backend tests passed (96.43% overall coverage). Two mobile test assertions failed: subscription mock history and an observer pagination timing assumption. Commit e1d3c6c corrected those assertions; application behavior was unchanged.

The remaining verification ran as `make verify -o lint-backend -o test-backend`, reusing the successful backend targets rather than repeating them. Exit status: **0**. Mobile lint passed with three existing CommonJS mock import warnings; all **20 suites / 199 tests** passed. The six audit-policy tests, visual style check, generated API type check, Python dependency audit and secret scan passed. Node audit found no unaccepted findings; the three owner-approved tooling exceptions expire on 8 November 2026.

Evidence: M6M7Verify.log records the initial run and backend results; M6M7VerifyRemaining.log records the corrected remaining run.

The production dependency-only environment imports the API successfully. Live HTTPS checks passed for health, readiness, disabled API docs, anonymous protected routes and rejected out-of-domain email. Seven subjects and eleven schedule slots were seeded in Atlas. A private R2 metadata backup and local restore drill matched all nine collection counts and index definitions; see Operations.md.

First-preview exceptions: push delivery is deferred by owner approval after Firebase resources failed to load; platform fonts are permitted; the free API sleeps while idle. Android device acceptance belongs to the owner after APK delivery. iOS, the full native accessibility/responsiveness matrix, licensed fonts, scheduled backup retention and final class rollout remain pending. These automated results do not certify device acceptance.
