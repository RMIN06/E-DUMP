# PRD — E-DUMP (BCS-3E Class Hub)

Status: v1.0 spec · Owner: Muhammad Ibrahim · Section: BCS-3E, BS-CS Semester 3, FAST-NUCES Lahore
Working name: **E-DUMP** (rename freely; it is only a string in `mobile/app.config.ts` and the UI copy).

Companion docs (read in this order): `PRD.md` → `Tech Stack.md` → `Architecture.md` → `Structure.md` → `UI.md` → `MobileResponsiveness.md` → `AntiAISlop.md` → `Security and Compliance.md` → `Testing&Authentication.md` → `FinalVerdict.md`.

---

## 1. Problem

The class WhatsApp group is the only place where course material, quiz announcements, weekly tasks and datesheets live. Everything is mixed in one chat. Finding "COAL chapter 3" means scrolling through weeks of messages. Important alerts get buried under shared PDFs and images.

## 2. Product in one sentence

A private mobile app for the ~60 students of BCS-3E where **material is organised per subject and searchable**, and **alerts can only be posted by admins**.

## 3. Goals

1. Find any shared file in under 15 seconds (subject → filter/search → open).
2. Admin alerts (quiz, task, datesheet, general) are never buried and arrive as push notifications.
3. Any student can contribute material; nothing else about the app is social.
4. Replace the WhatsApp material-dump group within 4 weeks of release.

## 4. Non-goals (hard scope boundary)

Not in v1, and Codex must not add them: chat or direct messages, comments, likes, reactions, feeds with algorithms, stories, AI features (summaries, chatbots, OCR), gamification or leaderboards, multiple sections or multiple semesters, a web app or web admin panel, payments, analytics dashboards, calendar sync, email notifications, in-app PDF annotation, file versioning, folders nested more than one level, user-to-user profiles, any content that is not course related.

## 5. Users and roles

| Role | Who | Can do |
|---|---|---|
| Student | Anyone who signs in with a matching student email | Read all subjects, announcements and schedule. Upload material. Delete own material. Report material. Manage own push toggle. Delete own account. |
| Admin | Class representative and a few trusted students (target 2–4) | Everything a student can, plus: post/edit/delete/pin announcements, delete any material, review reports, promote/demote admins, disable users. |

Capacity: max 60 users (design for 100 for headroom). One section only: BCS-3E.

## 6. Subjects (seed data)

| Slug | Name | Short | Credits | Teacher | Type |
|---|---|---|---|---|---|
| `ds` | Data Structures | DS | 3 | Mr. Muhammad Naveed | Theory |
| `ds-lab` | Data Structures Lab | DS Lab | 1 | Mr. Bilal Ahmad | Lab |
| `coal` | Computer Organization and Assembly Language | COAL | 3 | Ms. Aleena Ahmad | Theory |
| `coal-lab` | Computer Organization and Assembly Language Lab | COAL Lab | 1 | Ms. Amina Qaiser | Lab |
| `discrete` | Discrete Structures (also called Discrete Mathematics) | Discrete | 3 | Ms. Rubab Janjua | Theory |
| `linear-algebra` | Linear Algebra | Linear Algebra | 3 | Dr. Muzamil Hanif VF | Theory |
| `uhq` | Understanding of Holy Quran I / Ethics I | UHQ | not stated on timetable | not stated on timetable | Theory |

Subjects are seeded by a script, editable only in the database in v1 (no in-app subject management).

## 7. Weekly schedule (seed data, read-only in the app)

| Day | Subject | Time | Venue |
|---|---|---|---|
| Monday | UHQ / Ethics I | 08:30–10:20 | C-2 |
| Monday | Discrete | 11:30–12:50 | F-303 |
| Monday | Linear Algebra | 14:30–15:50 | C-13 |
| Tuesday | COAL | 08:30–09:50 | F-305 |
| Tuesday | DS Lab | 11:30–14:20 | Lab-14 |
| Tuesday | DS | 14:30–15:50 | F-203 |
| Wednesday | Discrete | 11:30–12:50 | F-303 |
| Wednesday | Linear Algebra | 14:30–15:50 | C-13 |
| Thursday | COAL | 08:30–09:50 | F-305 |
| Thursday | COAL Lab | 11:30–14:20 | Lab-17 |
| Thursday | DS | 14:30–15:50 | F-203 |

Timezone: `Asia/Karachi` (UTC+5, no DST). Store times as local `HH:mm` strings plus a weekday number.

## 8. Functional requirements

Priority: **P0** = must ship in v1.0, **P1** = ship if time allows, never at the cost of P0.

### 8.1 Authentication and access

| ID | Requirement | Pri |
|---|---|---|
| AUTH-1 | The sign-in screen asks for one thing: the student email. The backend trims and lowercases it, and accepts it only if it fully matches `ALLOWED_EMAIL_REGEX` (default `^l25\d{4}@lhr\.nu\.edu\.pk$`, i.e. `l25xxxx@lhr.nu.edu.pk`). A match signs the user in. No password, no verification code, no third-party login. | P0 |
| AUTH-2 | First sign-in creates the user. The app then asks once for a display name (2–40 characters), shown next to uploads and editable later in Me. | P0 |
| AUTH-3 | Session persists across app restarts (refresh token). Sign out clears it. | P0 |
| AUTH-4 | A non-matching email shows the inline message "Use your student email, like l25xxxx@lhr.nu.edu.pk". A disabled user sees an "Account disabled" screen with a Sign out action. | P0 |
| AUTH-5 | Delete my account: removes the user record, device tokens and refresh tokens. Uploaded material stays but is shown as "Former member". | P0 |
| AUTH-6 | Admin role is assigned by seed (`ADMIN_EMAILS` env) and afterwards by other admins. Owner decision, 9 Oct 2026: enabled seeded users regain admin on each login; disabled accounts remain blocked. | P0 |

Known trade-off: email-only login proves nothing about who is typing the email. See `Security and Compliance.md` §2.4 for the accepted risk and the upgrade path.

Owner extension, 10 October 2026: a branded welcome screen precedes sign-in once per installation. Continue saves the local preference and opens the existing student-email form. Returning signed-in students continue directly to Updates. The same palette-based logo is used for the launcher and splash; no onboarding tour or additional features are introduced.

### 8.2 Subjects and material

| ID | Requirement | Pri |
|---|---|---|
| SUB-1 | Subjects tab lists the 7 subjects with credit hours, teacher and material count. | P0 |
| MAT-1 | Subject screen lists material newest first, cursor paginated (20 per page). | P0 |
| MAT-2 | Filter by kind: Slides, Notes, Assignment, Past paper, Book, Other. Filter by chapter number. | P0 |
| MAT-3 | Search by title, chapter label and original filename within the subject. | P0 |
| MAT-4 | Upload one file per submission: allowed types PDF, PNG, JPG/JPEG, WEBP, PPTX, DOCX; max 25 MB. Required: title, kind. Optional: chapter number, short description (max 200 chars). | P0 |
| MAT-5 | Tapping a row downloads (with progress) and opens the file in the device viewer. Downloaded files are cached. | P0 |
| MAT-6 | Uploader can delete own material. Admin can delete any. | P0 |
| MAT-7 | Any user can report a material (reason from a fixed list + optional note). | P0 |
| MAT-8 | Duplicate guard: if the exact same file (SHA-256) already exists in the same subject, reject with a message that links to the existing item. | P0 |
| MAT-9 | Uploader can edit title, kind, chapter, description of own material. | P1 |
| MAT-10 | Home screen shows "Recently added" material across subjects (last 10). | P1 |

### 8.3 Announcements (admin only to write)

| ID | Requirement | Pri |
|---|---|---|
| ANN-1 | Admin creates an announcement: type (Quiz, Task, Datesheet, General), title (max 100), body (max 2000), optional subject, optional due date/time, up to 3 attachments (same file rules as material). | P0 |
| ANN-2 | Admin can edit, delete and pin/unpin. Pinned items sort first. | P0 |
| ANN-3 | On create, every active user's devices receive a push notification (title = type + subject, body = title). Edit has a "notify again" switch, default off. | P0 |
| ANN-4 | Updates tab lists announcements newest first, filterable by type and subject. | P0 |
| ANN-5 | "Coming up" list at the top of Updates shows the next 3 items with a future due date. | P0 |
| ANN-6 | Unread count badge on the Updates tab, based on `last_seen_updates_at`. | P0 |
| ANN-7 | Students cannot create, edit or delete announcements (enforced in the backend, not only hidden in the UI). | P0 |

### 8.4 Schedule

| ID | Requirement | Pri |
|---|---|---|
| SCH-1 | Read-only weekly schedule from seed data. Opens on today's day. Shows subject, time, venue, teacher. | P1 |

### 8.5 Admin tools (inside the same app, visible to admins only)

| ID | Requirement | Pri |
|---|---|---|
| ADM-1 | Users list: search by name or email; shows role, status and last sign-in. | P0 |
| ADM-2 | Reports queue: list open reports, open the material, "Remove material" or "Dismiss". | P0 |
| ADM-3 | Promote/demote admin; disable/enable a user (a disabled user is blocked on their next request). | P0 |

### 8.6 Notifications

| ID | Requirement | Pri |
|---|---|---|
| NOT-1 | Ask permission after first sign-in with a one-line reason. Register Expo push token to the backend. | P0 |
| NOT-2 | Me screen has a switch for announcement notifications (per device). | P0 |
| NOT-3 | Tapping a notification opens that announcement. | P0 |

## 9. Non-functional requirements

| Area | Target |
|---|---|
| Platforms | Android 8+ (APK) and iOS 15+ |
| Performance | Cold start to first usable screen < 3 s on a mid-range Android; list scroll at 60 fps; subject screen < 1 s on cached data |
| Availability | Best effort, 99% monthly; no data loss |
| Offline | Previously loaded lists and downloaded files readable offline; writes require network and show a clear message |
| Accessibility | WCAG AA contrast, dynamic type respected, minimum 44 pt touch targets, screen reader labels |
| Privacy | Collect only: name, email, push tokens, content the user uploads (see `Security and Compliance.md`) |
| Cost | Run on free tiers where possible; target ≤ US$5/month total |
| Language | English UI only |

## 10. Content rules (shown once at first launch and in Me → Rules)

1. Course-related material only.
2. Upload only what you are allowed to share. Do not upload leaked papers or solutions during an ongoing quiz or exam.
3. Admins may remove anything without notice.
4. Repeated violations lead to a disabled account.

## 11. Key user flows (acceptance criteria)

**F1 Find a file.** Open app → Subjects → COAL → type "3" in chapter filter or "chapter 3" in search → the matching items appear → tap → file opens. Done in ≤ 4 taps and < 15 s.

**F2 Upload a file.** Subject screen → Upload → pick file → title prefilled from filename, choose kind, optional chapter → Upload → progress → item appears at top of the list. Rejected cleanly for wrong type, > 25 MB, duplicate.

**F3 Admin posts a quiz alert.** Updates → Post → type Quiz, subject DS, due tomorrow 10:00, title and body → Publish → item appears pinned-eligible in the list, every other user receives a push within 60 s.

**F4 Student tries to post an alert.** No "Post" action visible; a direct API call returns `403 forbidden`.

**F5 Outsider tries to sign in.** An email that does not match the pattern is rejected inline; no user record is created.

## 12. Success metrics (checked 4 weeks after release)

- ≥ 50 of 60 students signed in.
- ≥ 80% of new material posted in the app instead of WhatsApp.
- Median time to open a searched file < 15 s (manual spot test with 5 students).
- Zero reports of a missed admin alert caused by the app.

## 13. Release

Single release v1.0 containing all P0. Android: sideload APK from an EAS build. iOS: TestFlight (requires an Apple Developer account). JS-only fixes ship through EAS Update. See `FinalVerdict.md` for the build order.

## 14. Open items for the owner

1. Confirm the exact email pattern with 2–3 real student emails (domain `lhr.nu.edu.pk`, `l25` + 4 digits).
2. Provide UHQ teacher and credit hours (the timetable says "Not Mentioned").
3. Provide 2–4 admin emails.
4. Provide licensed font files (Recoleta, Berthold) — see `UI.md`.

### Owner amendment � 11 October 2026

MAT-4 now supports selecting multiple files in one picker interaction on Android and web. Each file creates its own material record and editable title; type, chapter and note are shared. Existing per-file format, 25 MB, duplicate, quota and authorization rules apply. Partial failures remain visible and retry skips uploaded files. ANN-1 supports selecting several attachments within its existing three-file total. No new backend endpoint or dependency is required.

## Owner-approved notification and installed updates extension (11 October 2026)

Successful material uploads notify other active users through their enabled Android/browser devices. Tapping opens that material; the existing per-device toggle controls both material and announcement notifications. Compatible Android JavaScript/UI updates use expo-updates after one bootstrap APK installation. The Home Screen web companion displays an update notice with a safe restart. Native Android changes still require a new runtime and APK. These owner decisions supersede the earlier announcement-only push and APK-per-UI-release constraints.

## Owner deadline extension - 18 October 2026

ANN-8: Dated alerts leave Updates, subject update lists, Coming up and unread counts when their deadline is reached, including pinned items. Undated notices remain. Records and attachments are retained; existing authorized direct links and admin editing still work.

ANN-9: Every dated alert (Quiz, Task, Datesheet, General) receives a reminder at 24 hours remaining through the existing other-active-users/enabled-devices push path. The owner chose the existing API timer rather than a new scheduled worker and accepts reminders being late after free Render sleep. Check on startup and once per minute while running, skip expired deadlines, and do not send a second immediate reminder for a newly posted alert already inside 24 hours. Persist one marker per reminded deadline; editing the due time schedules that new deadline without erasing previous markers. Provider delivery remains best effort; late reminders say less than one day remains.

## Owner deadline ordering correction (23 October 2026)

ANN-2/ANN-4: Sort every Updates list by earliest future deadline first, across types, subjects and pagination. Undated updates follow dated updates, newest first. Equal deadlines use newest creation time then descending ID. Pinning remains visible metadata and does not override deadline order. Coming up retains its next-three ownership without duplicate rows. This supersedes pinned-first/newest-first ordering.
