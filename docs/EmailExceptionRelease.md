# Exact student email exception - 25 October 2026

AUTH-1 owner request: allow only l242530@lhr.nu.edu.pk alongside the existing l25 pattern, with existing normalization, sessions, rate limits, disabled-account checks and ordinary student permissions. Other l24 addresses and email aliases remain rejected. No admin/support role is added.

Prepared source is on codex/student-email-exception. Backend tests: 263 passed. App tests: 247 passed, including another complete app run after the Zod patch. Lint, schema and slop checks passed. Web and Android exports and actual-private-credential scans passed. Source maps confirm root Zod v4 is bundled and Expo CLI's nested Zod is absent from both exports. Diagnostic source maps are retained privately in ignored release artifacts, outside published outputs.

The security gate initially reported GHSA-mrhx-c7xc-m3w5 in Expo CLI's nested zod 3.25.76. App Zod was patched from 4.6.5 to 4.6.6, and existing Python tooling filelock was patched from 4.0.12 to 4.2.1 for three reported CVEs. Python audit and secret scanning passed after these updates.

## Owner approval

Owner approved temporary acceptance on 25 October 2026: allow only GHSA-mrhx-c7xc-m3w5 for zod 3.25.76 at node_modules/expo/node_modules/zod until 8 November 2026, using the existing policy expiry. Reject any other advisory, version or installed path. Do not override Expo CLI's Zod dependency to a breaking major version. Keep tooling local and process only trusted project inputs. This accepts remaining build-tool memory-exhaustion risk; it does not fix the upstream CLI dependency. The app's own Zod must remain patched.

The owner also confirmed deployment granting this exact address ordinary student access and restored the Cloudflare login. The scoped policy is implemented in scripts/audit-policy.mjs, with tests rejecting app/other package locations, version drift and expiry. Deployment verification follows below.

Source: https://github.com/advisories/GHSA-mrhx-c7xc-m3w5


## Published release

The approved security stage completed successfully after the previously passed verification targets; the full make verify gate is satisfied with the recorded owner-approved tooling exceptions. All 18 edge/audit policy contract tests pass, including the new path/version/expiry checks. App checks were repeated after patching Zod; no backend behavior changed after its 263 passing tests.

Source 389ba1ec4ed27f090180a89f57fe6d1da493c903 is live on Render deploy dep-dbesho29lscs73808tpg. Readiness is healthy. A live neighboring l24 login was rejected with 422 invalid_email; no production sign-in was performed as the newly allowed student.

The web companion is published at https://edump-preview.pages.dev. Its HTML and JavaScript match the prepared build, the exact exception appears in the served app bundle, security headers pass and anonymous profile requests return 401.

Android preview OTA group: 5ed0d8f8-6e5b-4853-b67b-b1727f4474d8. Update: 01a17258-845e-7644-b296-b1ee3fd831aa. The preview manifest serves this exact update on runtime edump-android-1. No new APK is required. Student/device acceptance remains with the owner; existing clients may need the available safe update/restart before entering the exception email.
