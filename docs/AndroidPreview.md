# Android test preview

The owner will test the standalone APK on Android. iOS and the final class rollout are deferred. The preview uses platform fonts; production still requires licensed fonts. The free API sleeps when idle, so the first sign-in can need a retry after the API wakes.

Provisioning uses the owner's accounts: Render free Docker service, isolated Atlas free cluster, existing private R2 bucket and an Expo project with Android FCM credentials. No credentials are committed or included in the APK. APK distribution must use a separate public release artifact; class files remain private.

Before publishing: run `make verify`, verify the production API and readiness endpoint, seed the seven courses and eleven schedule slots, build with bundled JavaScript, verify APK signing and inspect its manifest and assets. Record the API URL, source commit, APK SHA-256, supported ABIs, size and download link with the build result.

Owner phone checks: Rules → sign-in → name → subjects/search/upload/open/cache → updates/post/attachments → schedule → notifications → admin users/reports → sign-out and account deletion. Record failures with the screen, steps and message shown. Installing later previews must preserve the same signing key.

Physical push delivery and the final device matrix are pending until exercised. Automated and emulator checks do not substitute for those results.
