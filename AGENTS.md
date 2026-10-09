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
- Rules support/deletion/takedown contact: l250716@lhr.nu.edu.pk.
- The owner will perform physical Android functional acceptance using the APK link. Do not label pending device acceptance as passed.
