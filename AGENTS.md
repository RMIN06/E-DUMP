# E-DUMP agent rules
Read docs/PRD.md, docs/Architecture.md, docs/UI.md, docs/MobileResponsiveness.md, docs/AntiAISlop.md before coding.
1. Stay strictly inside PRD.md scope. If a task is not in the PRD, do not build it; ask.
2. Never add dependencies not listed in docs/Tech Stack.md without asking.
3. All colours/spacing/type come from mobile/src/theme. No hex values elsewhere.
4. UI must pass docs/AntiAISlop.md. Run `make slop-check` before finishing any UI task.
5. Every backend route has an authorization check and a test (docs/Testing&Authentication.md).
6. Run `make verify` before declaring a task done; report the result.
7. Commit small. One feature per branch. No TODO/FIXME left behind.
8. If a requirement is ambiguous, stop and ask instead of guessing.

## Owner decisions for M4 onward (9 October 2026)
- Run focused authorization and functional checks while building; run `make verify` at milestone completion. Defer the final native/device matrix through M7. Do not repeat full verification for every small commit.
- Push meaningful feature commits regularly. The owner's updated M7 target is 100 substantive commits; never create empty or cosmetic commits to meet the count.
- Use the Expo-compatible native date/time picker for announcement forms. This approved dependency extends the listed stack.
- Defer Expo project provisioning and real Android push delivery acceptance to M7; physical phone and iOS acceptance remain deferred as documented.

## Android preview decisions (9 October 2026)
- M6 and M7 are authorized. Publish a standalone Android APK connected to a hosted HTTPS API; defer iOS setup and acceptance.
- Use platform fallback fonts for the test preview only; production still requires licensed fonts.
- Render free hosting and MongoDB Atlas free are approved for the preview, including idle sleep and cold starts.
- Rules support/deletion/takedown contacts: l250716@lhr.nu.edu.pk and l250656@lhr.nu.edu.pk.
- The owner will perform physical Android functional acceptance using the APK link. Do not label pending device acceptance as passed.
- After each completed UI update, build and publish a new signed Android preview APK and provide its verified download link. Increment the app version and Android version code for each published build.

## Owner visual redesign decision (10 October 2026)
- The owner replaced the earlier text-only visual direction with filled controls and rows, sculpted functional icons, rounded surfaces and mobile-sized system fallback typography. These explicit exceptions supersede UI.md and AntiAISlop.md restrictions on filled panels, radii and functional icon style. Retain the assigned palette, single-column responsiveness, reduced-motion support, token-only styling and existing feature scope; do not add dependencies.

## Owner web companion decision (10 October 2026)
- A responsive browser companion is authorized, superseding the PRD web non-goal. Retain every class feature, existing palette, shared API/database and native Android app.
- Approved additions: react-dom, react-native-web, @expo/metro-runtime, pywebpush and free hosting.
- Each update renders once per Updates feed. Coming up owns its displayed records; the main feed excludes those IDs and overlapping pagination IDs.

## Owner batch upload decision (11 October 2026)
- Multiple-file selection is approved on Android and web. Material batches create individual records with independent titles through the existing authorized upload endpoint. Shared type/chapter/note apply to each file; size, format, duplicate, quota and rate checks remain per file. Retry skips successful records. Announcement multi-selection retains the existing three-attachment limit.
- Keep scroll rows stable without text-measurement-driven state changes; disable clipped-subview removal for animated rows while retaining list virtualization.

## Owner notification and installed-update decisions (11 October 2026)
- Successful material uploads notify other active users through their enabled devices; tapping opens the material. The existing notification toggle controls both material and announcement alerts.
- expo-updates is approved. Publish one final bootstrap APK; compatible JavaScript/UI changes thereafter use the preview OTA channel. Native/SDK/plugin changes require a new runtime and APK. This supersedes the earlier APK-per-UI-change rule for compatible updates.
- The Home Screen web companion offers an update notice and safe restart, without re-adding it. Never restart a form or upload automatically.
