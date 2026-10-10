# Web companion

Authorized by the owner on 10 October 2026 as the iPhone alternative. Expo web uses the same screens and class API/database as Android, including authentication, names, all four tabs, uploads, attachments, downloads, reports, admin controls, account deletion and notifications.

Lists remain a single column, centered within 960 px on desktop; forms within 640 px. At 900 px, navigation becomes a sidebar. Smaller browser windows retain bottom navigation. Existing palette, theme tokens, fallback fonts and reduced-motion behavior are retained.

## Shared data

Writes go to the existing Render API, MongoDB and private R2 bucket. Both clients refresh active queries every 30 seconds while visible and on foreground return. Background polling is disabled. A browser push message also invalidates active queries. This is bounded foreground synchronization, not a websocket guarantee.

Updates appear once by ID: records displayed in Coming up are excluded from the main list; overlapping pages are deduplicated. Filters apply to both sections. Distinct announcements may share a title.

## Browser platform adapters

Uploads use real Blob multipart files and XMLHttpRequest progress with the same formats, size limits and server checks. Date/time inputs interpret class deadlines in Asia/Karachi. Downloads retain private saved copies with a 500 MB cap, are available within an active signed-in offline session, and can be saved/opened with the browser or OS viewer. Sign-out/deletion clears private query and file caches. Offline restart retains M1 behavior: failed session restoration returns to sign-in. Browser/OS storage eviction can remove saved data.

The Pages edge proxies the existing authorized API. Refresh credentials stay in a Secure HttpOnly SameSite Strict host cookie; JavaScript retains only a presence marker and in-memory access token. The proxy rejects cross-origin writes, never forwards browser cookies to unrelated services, and only streams presigned class downloads from the existing private R2 host after checking the active session.

Browser notifications use a root service worker, VAPID and pywebpush. Subscription writes require authentication, provider URLs are allowlisted, delivery excludes the author, disabled devices and inactive accounts, and 404/410 subscriptions are removed. Native Expo push is unchanged. iPhone notifications require iOS 16.4+ and installation to the Home Screen through Safari; no Apple Developer membership is needed. Other browser features still work without notification support.

## Build and hosting

`cd mobile && npm run export:web` produces `mobile/dist`, including the advanced-mode Pages `_worker.js` API proxy. Upload a ZIP whose root contains those files to the free edump-preview Pages project. No private credentials belong in this bundle. Set WEB_PUSH_PUBLIC_KEY and WEB_PUSH_PRIVATE_KEY only in the Render API environment.

Device acceptance remains pending the owner's Android and iPhone testing. Automated checks and desktop/narrow browser smoke checks are reported separately.

## Preview validation â€” 10 October 2026

- Live web address: https://edump-preview.pages.dev.
- `make verify` passed: 243 backend tests, 214 app tests, edge/audit contract tests, lint, strict typing, schema checks, slop checks and security audits. After the direct-link navigation fix, the focused mobile/slop gate passed with 216 app tests and 13 edge/audit tests; backend code did not change.
- Signed-in desktop and 390 px browser checks covered Updates without repeated IDs, Subjects, private image download/viewing, Schedule, profile and both support contacts. Reloaded direct links return to their parent section.
- Browser push registration succeeded for the owner's account. Its provider accepted one owner-only test message with HTTP 201; no class announcement was created or broadcast.
- Published HTML matches the final export, anonymous profile access returns 401, security headers are present, and the web bundle excludes the actual database, JWT, R2, Firebase service-account and VAPID private credentials.
- Platform-specific physical-phone, iPhone Home Screen push, keyboard and accessibility acceptance remain pending the owner; automated browser adapter contracts do not certify those devices.

## Scrolling and batch uploads — 11 October 2026

Published preview 0.1.6 shares the Android scrolling fix: stable responsive row layout, bounded viewports, no content shrinking, retained animated native rows and the existing virtualized list limits. Materials now select multiple files, preserve independent titles and per-file results, and retry only unfinished files through the existing upload endpoint. Type/chapter/note are shared; existing per-file validations, quota/rate limits and duplicate checks apply. Updates can select several attachments within their three-file total.

Frontend verification passed with 222 app tests, 13 edge/audit contract tests, lint/strict typing and slop checks; backend code was unchanged and its suites were not rerun. Signed-in desktop and 390 px checks confirmed stable row dimensions during scrolling and no horizontal overflow. Live multi-file selection displayed two editable titles; no class files were created by this browser smoke check. Export credential scans, published HTML equality and anonymous-profile rejection passed. Physical-device acceptance remains pending the owner.
