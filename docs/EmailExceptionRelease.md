# Exact student email exception - 25 October 2026

AUTH-1 owner request: allow only l242530@lhr.nu.edu.pk alongside the existing l25 pattern, with existing normalization, sessions, rate limits, disabled-account checks and ordinary student permissions. Other l24 addresses and email aliases remain rejected. No admin/support role is added.

Prepared source is on codex/student-email-exception. Backend tests: 263 passed. App tests: 247 passed, including another complete app run after the Zod patch. Lint, schema and slop checks passed. Web and Android exports and actual-private-credential scans passed. Source maps confirm root Zod v4 is bundled and Expo CLI's nested Zod is absent from both exports. Diagnostic source maps are retained privately in ignored release artifacts, outside published outputs.

The current security gate is blocked by GHSA-mrhx-c7xc-m3w5 in Expo CLI's nested zod 3.25.76. App Zod was patched from 4.6.5 to 4.6.6, and existing Python tooling filelock was patched from 4.0.12 to 4.2.1 for three reported CVEs. Python audit and secret scanning passed after these updates.

## Pending owner decision

Proposed temporary acceptance, not yet applied or approved: allow only GHSA-mrhx-c7xc-m3w5 for zod 3.25.76 at node_modules/expo/node_modules/zod until 8 November 2026, using the existing policy expiry. Reject any other advisory, version or installed path. Do not override Expo CLI's Zod dependency to a breaking major version. Keep tooling local and process only trusted project inputs. This accepts remaining build-tool memory-exhaustion risk; it does not fix the upstream CLI dependency. The app's own Zod must remain patched.

Prepared policy: artifacts/release/audit-policy-zod-proposal-2026-10-25.mjs (ignored, inactive). Owner action-time confirmation is also needed before the browser deploy grants this additional address access to private class data. Google currently requires the owner to sign in again for the Cloudflare account. No exception release has been activated yet.

Source: https://github.com/advisories/GHSA-mrhx-c7xc-m3w5
