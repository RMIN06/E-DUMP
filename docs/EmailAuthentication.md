# Email-code authentication

Owner approved on 21 October 2026: student email plus a verification code, with no password. Mailjet's free HTTPS transactional API is approved. Everyone verifies once, including admins and existing installations. This supersedes the historical pattern-only login sections in PRD, Architecture, Security and Testing docs.

## Flow and contract

- `POST /api/v1/auth/login {email}` normalizes and validates the existing student-email pattern, reserves a delivery and returns `{challenge_id, expires_in: 600, retry_after: 60}`. It never creates a user or returns tokens. Mailjet receives only the destination address and the sign-in email content.
- `POST /api/v1/auth/verify {email, challenge_id, code}` requires six ASCII digits and a matching, delivered, unexpired challenge. Successful verification consumes it atomically, then uses the existing active-account check, admin bootstrap, account creation and name onboarding. Invalid, expired, exhausted, replaced and reused codes return `400 invalid_code`. Disabled accounts remain blocked after proof.
- A code works once, expires in ten minutes, and permits five guesses. Resend replaces the old challenge. Delivery is limited to once per minute and five times per hour per normalized email, plus 180 reservations per UTC day globally to remain below Mailjet's free daily allowance. Existing IP/minute and new-account/IP/hour limits remain. Delivery failure issues no session; no production bypass or fixed code exists.
- Email challenge state and delivery counters live in Mongo. Codes use an HMAC-SHA256 digest keyed by the existing server JWT secret with a separate purpose prefix and email/challenge binding. Plain codes are never stored in Mongo, returned by the API or logged. Challenge/cooldown records are TTL-purged after a day; daily quota records after two days. Expiry is checked explicitly, independently of asynchronous TTL cleanup.
- API credentials stay in private environment variables `MAILJET_API_KEY`, `MAILJET_SECRET_KEY` and `EMAIL_SENDER`, never in Git, Expo public configuration or bundles. The backend uses the already approved httpx dependency. Provider errors are reduced to the existing safe unavailable response.

## Existing installations

Verified access JWTs and refresh records carry `auth_version=2`. Missing/legacy versions are rejected; refresh attempts revoke the legacy family. Device registration through a verified session marks the registration with the same version. Notification recipient queries exclude legacy registrations, including browser subscriptions, until the device registers after verified sign-in. Existing class records, account names and roles remain intact.

After verification, refresh rotation, replay detection, saved sign-in, recovery on transient failures, secure native storage and browser HttpOnly cookies retain their current behavior. Browser verification responses strip the refresh credential into the same Secure/HttpOnly/SameSite cookie. Requesting a code requires no refresh cookie and never creates one.

## Release and acceptance

Configure and verify the Mailjet sender, confirm transactional delivery is enabled and store the API key privately. Complete automated verification before switching the hosted API. Coordinate API, web worker/UI and Android preview OTA publication on the existing runtime; no native dependency or APK installation is required. Keep the existing service-worker safe update flow; never restart an active form automatically.

Automated coverage must exercise normalized addresses, no access before proof, wrong/expired/replaced/reused codes, five-guess exhaustion, atomic concurrent verification, durable resend/hour/day limits, delivery failure, disabled accounts, admin bootstrap, rejection of old access/refresh/device registrations, secure browser cookies and client resend/paste/error flows. Real mailbox delivery and a complete owner sign-in remain required before calling the hosted rollout complete.

## Verification and activation status (21 October 2026)

The automated verification gate passed: 274 backend tests, 241 mobile tests and 16 edge/audit contract tests, plus lint, strict typing, generated-schema consistency and slop checks. The security stage passed after updating the existing certifi lock to 2026.10.19; the three previously approved tooling exceptions remain unchanged. Web and Android JavaScript exports completed, and both actual-private-credential export scans passed.

Activation is pending. Brevo signup failed and was replaced with Mailjet, whose signup currently also reports a reCAPTCHA connection failure. Provider account creation, sender verification, private hosted credentials, actual mailbox delivery and the owner's complete sign-in remain unverified. No authentication enforcement, web export or Android OTA from this feature has been published; production sign-in remains unchanged until delivery is ready. No new APK is required for the prepared compatible update.
