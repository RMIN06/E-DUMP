# M1 Android phone test

The owner deferred physical-phone acceptance until the M7 hosted preview on
9 October 2026. The steps below remain available for optional local testing.
No public APK link or hosted API has been created. A link-only phone test will
use the M7 preview APK with bundled JavaScript and the deployed HTTPS API.

The development APK supports Android 8+ on 32-bit and 64-bit ARM. It is a local
development client, so keep this PC, the USB connection, MongoDB, API and Metro
running while testing. No EAS account, hosting service or payment is needed.
The APK is in `mobile/.expo/edump-m1-development.apk` (ignored build output).

1. Enable Developer options and USB debugging on the Android phone, connect it
   to this PC by USB, and accept its debugging prompt.
2. Keep the local MongoDB 7 instance running. Configure `backend/.env` with its
   URI, database, a base64 secret of at least 32 random bytes, and the owner's
   admin addresses. Configure `mobile/.env` with
   `EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8080/api/v1`.
3. From `backend`, run `uv run uvicorn app.main:app --host 127.0.0.1 --port 8080`.
4. In another PowerShell terminal, from `mobile`, run:

   ```powershell
   $env:REACT_NATIVE_PACKAGER_HOSTNAME='127.0.0.1'
   npm run start -- --lan --port 8081 --max-workers 1
   ```

5. From the repository root, run `./scripts/android-m1-demo.ps1`. It installs
   only to the single connected physical phone and forwards the two local
   services over USB. If more than one phone is connected, pass `-Serial` with
   the intended phone's ADB serial.
6. Dismiss Expo's development-menu introduction if shown. Enter a personal
   email: E-DUMP should show the student-email message without contacting the API.
7. Enter your confirmed student email, continue, enter your own display name,
   and save. Me should show your name and your own email.
8. Close the app through the phone's recent-apps screen and reopen E-DUMP.
   Session restore should return to Me without asking for your email.
9. Tap Name, update it, and save. Tap Sign out; the sign-in screen should return.
   Reopening after sign-out should remain signed out.
10. Confirm the physical-phone acceptance check. It remains deferred until M7;
    iOS acceptance remains explicitly deferred as well.

Only Name and Sign out are present in Me for M1. Subjects, schedule, class
updates, push registration, admin tools and account deletion belong to later
milestones. The documented email-only ownership risk remains unchanged.

For a fresh local build, use JDK 17 and the SDK from M0. Run Expo prebuild, then
Gradle `:app:assembleDebug` with `-PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86_64`.
The M0 report records the compatible Gradle pin and memory settings.
