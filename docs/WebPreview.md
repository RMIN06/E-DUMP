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


## Material alerts and installed updates - 11 October 2026

Preview 0.1.7 adds material notifications and validated material deep links to the existing Apple/FCM/Mozilla Web Push path. Only successful uploads alert other active, enabled devices. Safari text adjustment, the Apple system font stack, viewport-fit=cover and dynamic viewport bounds address the reported iPhone layout risks; phone metadata stacks beneath titles. The live service-worker update notice and safe restart passed with the existing signed-in session preserved. Published HTML/export equality, actual credential scans and anonymous profile rejection passed. Physical iPhone delivery and Safari/keyboard acceptance remain pending the owner. See AndroidPreview.md and InstalledUpdates.md for release checks and OTA limits.

## Persistent sign-in and text flow - 17 October 2026

Source: 718bfbb (session) and 147ba47 (layout). Successful device credentials survive temporary connection, storage and server failures. Startup shares one refresh, allows 75 seconds for a sleeping API and has a 90-second recovery deadline. A recoverable failure offers retry without exposing protected screens or erasing saved credentials; invalid/expired sessions, disabled accounts and explicit sign-out still clear private data. Browser auth writes use Web Locks to serialize shared HttpOnly cookie rotation across tabs. This supersedes the earlier three-second restoration behavior; offline restart does not grant access to private screens.

Typography keeps its natural line height in vertical stacks. Compact row titles no longer grow or shrink on the column axis; headers cannot collapse. Browser text/row entrance transforms and browser stack slides are disabled while native motion and button feedback remain. Captions use 14/20 and the original palette is retained.

The web export is published at https://edump-preview.pages.dev. Export equality, security headers, actual private-credential scans and anonymous profile rejection passed. A live signed-in update restart and full reload preserved the session. Chrome checks at 320, 428 and 1280 px showed no horizontal overflow; a wrapped course row retained its height and separated text bounds while scrolling. These checks do not certify physical iPhone Safari rendering.

Verification: the initial make verify passed lint, types, 245 backend tests, 231 app tests, 15 edge/audit tests, 95% service/dependency coverage, slop and schema checks. Security encountered a locked generated local test database and five false positives in a Gradle incremental ZIP cache. The test database was stopped and narrowly scoped generated-cache exclusions were added (2263e90); make verify -o lint -o test -o slop-check -o check-types completed with exit 0, reusing the completed checks. Python audit and secret scans passed; npm has no unaccepted findings under the existing three tooling exceptions through 8 November 2026. No new dependencies or native configuration changes were made.
