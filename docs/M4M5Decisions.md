# M4 and M5 owner decisions

9 October 2026: focus on necessary authorization and feature tests during implementation. Keep milestone verification; defer the full native/device acceptance matrix to M7. Real Expo project/push provisioning is also deferred to M7. A missing project must leave notifications visibly unavailable rather than claim successful registration.

The owner asked us to select the best-fitting date input. Use the Expo-compatible native date/time picker required by UI.md, approved as an addition to Tech Stack.md.

Push small, substantive commits throughout the work. The target is at least 110 meaningful commits by M7, without empty commits or cosmetic changes to inflate history.

Announcement cursors include the pinned flag alongside creation time and ID so pagination follows the specified pinned-first ordering without dropping unpinned results.

The owner selected restoration of seeded admins on every login. Keep Testing&Authentication.md's bootstrap behavior: enabled users listed in ADMIN_EMAILS regain admin when signing in. Disabling still blocks login; bootstrap does not reactivate disabled accounts. In-app demotion of a seeded admin lasts until their next sign-in.
