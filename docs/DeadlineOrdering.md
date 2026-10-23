# Deadline ordering release - 23 October 2026

Owner correction to ANN-2/ANN-4: every dated Updates row sorts by earliest future due time. Undated notices follow, newest first. Equal due times sort by newest creation time and descending ID. Pinned labels remain, but pinning does not move a later deadline above an earlier one. Existing expiry and Coming up duplicate exclusion remain.

The API applies this order before cursor pagination and type/subject filtering. The shared client sorts cached rows the same way and uses a fresh persisted feed key. Existing opaque cursors from the former ordering require a feed refresh. No dependency, endpoint, collection, native runtime or installation change was added.

Validation: 253 backend tests and 238 app tests passed, including mixed types, pinning, equal deadlines, dated-to-undated pagination, subject/type filters and duplicate cached pages. The 14 edge/audit contract checks, lint, strict typing and slop check passed. The make verify gate initially encountered Windows schema line endings; restoring the unchanged schema bytes and completing check-types/security passed. Private-credential scans passed for both exports. Existing approved tooling audit exceptions remain in effect; no new exception was added.

Published source: e999f111faeb9ae417e2094311e163f757acdf57. Render deploy dep-dbdil30n74is738ubsr0 is live. The published web HTML matches the export; security headers and anonymous profile denial were checked. The signed-in web feed was confirmed in increasing deadline order without duplicate rows.

Android preview OTA group: c38e3be2-7a39-4aa5-9547-46773ce38995. Update: 01a16820-21e7-7163-b54c-1edc55e9bdfb, runtime edump-android-1. The preview manifest serves this exact update. The first local Hermes export failed; the separate retry succeeded. Installed-device acceptance remains with the owner. Compatible updates apply through the existing update notice/restart flow; no new APK is needed.

The email-code authentication branch remains separate and unpublished while Mailjet sending is suspended.
