<div align="center">

<img src="./assets/edump_banner.svg" alt="E-DUMP" width="100%" />

**The class material hub for BCS-3E, FAST-NUCES Lahore.**

Subject-organised material. Admin-only alerts. One private app instead of one noisy WhatsApp group.

![Status](https://img.shields.io/badge/Status-In_Development-A7AA63?style=for-the-badge&labelColor=121A1B)
![Platform](https://img.shields.io/badge/Platform-Android_%7C_iOS_%7C_Web_Companion-505039?style=for-the-badge&labelColor=121A1B)
![Access](https://img.shields.io/badge/Access-Private_Section_App-C46A4A?style=for-the-badge&labelColor=121A1B)

</div>

---

## Technology Stack

### Mobile

![Expo](https://img.shields.io/badge/Expo_SDK_55-000020?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native_0.83-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript_5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Expo Router](https://img.shields.io/badge/Expo_Router-000020?style=for-the-badge&logo=expo&logoColor=white)

### State, Forms and Motion

![TanStack Query](https://img.shields.io/badge/TanStack_Query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-433E38?style=for-the-badge&logo=react&logoColor=white)
![React Hook Form](https://img.shields.io/badge/React_Hook_Form-EC5990?style=for-the-badge&logo=reacthookform&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)
![Reanimated](https://img.shields.io/badge/Reanimated_4-A7AA63?style=for-the-badge&logo=react&logoColor=121A1B)

### Backend

![Python](https://img.shields.io/badge/Python_3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Pydantic](https://img.shields.io/badge/Pydantic_v2-E92063?style=for-the-badge&logo=pydantic&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![uv](https://img.shields.io/badge/uv-DE5FE9?style=for-the-badge&logo=uv&logoColor=white)

### Data and Storage

![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Cloudflare R2](https://img.shields.io/badge/Cloudflare_R2-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)

### Notifications, Build and Hosting

![Expo Push](https://img.shields.io/badge/Expo_Push-000020?style=for-the-badge&logo=expo&logoColor=white)
![EAS](https://img.shields.io/badge/EAS_Build_%26_Update-4630EB?style=for-the-badge&logo=expo&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)

### Quality and Security Tooling

![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)
![Pytest](https://img.shields.io/badge/Pytest-0A9EDC?style=for-the-badge&logo=pytest&logoColor=white)
![Ruff](https://img.shields.io/badge/Ruff-D7FF64?style=for-the-badge&logo=ruff&logoColor=black)
![mypy](https://img.shields.io/badge/mypy_strict-2A6DB2?style=for-the-badge&logo=python&logoColor=white)
![Gitleaks](https://img.shields.io/badge/Gitleaks-000000?style=for-the-badge&logo=git&logoColor=white)

---

## Overview

E-DUMP replaces the BCS-3E WhatsApp material dump group. In that group, course PDFs, images, quiz announcements, weekly tasks and datesheets all share one chat, so finding a single file such as COAL chapter 3 means scrolling through weeks of messages, and important alerts get buried under shared files.

E-DUMP separates the two problems:

- **Material** is organised per subject, filterable and searchable. Any student can contribute.
- **Alerts** are a separate channel that only admins can write to, delivered as push notifications.

The app is built for one section only, with a design capacity of 100 users (about 60 students in the section).

### Goals

| Goal | Target |
|---|---|
| Find any shared file | Under 15 seconds, in 4 taps or fewer (subject, filter or search, open) |
| Admin alerts | Never buried, delivered as push notifications |
| Contribution | Any student can upload course material; nothing else is social |
| Adoption | Replace the WhatsApp material dump group within 4 weeks of release |

---

## Features

### Authentication and Access

- Email-only sign-in. The student enters one thing, their university email, which the backend trims, lowercases and matches against a configurable pattern (`l25xxxx@lhr.nu.edu.pk`)
- No password, verification code or third-party login
- First sign-in creates the account and asks once for a display name (2 to 40 characters), editable later in Me
- Persistent session across app restarts using refresh tokens, with offline session restoration
- Inline guidance for rejected emails: "Use your student email, like l25xxxx@lhr.nu.edu.pk"
- Disabled accounts see an "Account disabled" screen with a sign out action
- Account self-deletion: removes the user record, device tokens and sessions, and anonymises retained uploads as "Former member"
- Branded welcome screen shown once per installation before sign-in, using the same palette-based logo as the launcher and splash screen
- Content rules shown at first launch and available later under Me, Rules

### Subjects

- Subjects tab listing all seven subjects with credit hours, teacher and material count
- Dedicated screen per subject

### Class Material

- Material listed newest first with cursor pagination (20 per page)
- Filter by kind: Slides, Notes, Assignment, Past paper, Book, Other
- Filter by chapter number
- Search by title, chapter label and original filename within a subject
- Upload with required title and kind, optional chapter number and short description (max 200 characters)
- Supported file types: PDF, PNG, JPG/JPEG, WEBP, PPTX, DOCX, up to 25 MB per file
- Multi-file upload in one picker interaction on Android and web. Each file becomes its own material record with an editable title, while type, chapter and note are shared. Partial failures stay visible and retry skips files already uploaded
- Duplicate guard using SHA-256: an identical file in the same subject is rejected with a link to the existing item
- Tap to download with progress, then open in the device viewer. Downloaded files are cached
- Uploaders can delete their own material; admins can delete any material
- Report any material using a fixed list of reasons plus an optional note
- Other active users are notified when new material is uploaded, and tapping the notification opens that material
- Cached reads work offline within an active signed-in session; writes require a network connection and show a clear message
- Clear downloads action in Me; signing out clears private query data and downloaded files

### Updates (Announcements)

- Four announcement types: Quiz, Task, Datesheet and General
- Admin-only creation with title (max 100 characters), body (max 2000 characters), optional subject, optional due date and time using the native date and time picker, and up to three attachments
- Admins can edit, delete, and pin or unpin announcements. Pinned items sort first
- Push notification to every active user on creation, with a per-edit "notify again" switch that defaults to off
- Updates tab lists announcements newest first, filterable by type and subject
- "Coming up" list at the top showing the next three items with a future due date
- Unread count badge on the Updates tab
- Private attachments served through short-lived links
- Students cannot create, edit or delete announcements. This is enforced in the backend, not only hidden in the interface

### Schedule

- Read-only weekly timetable for all seven days, opening on the current day
- Shows subject, time, venue and teacher for each slot
- Times stored as local `HH:mm` strings with a weekday number, in the `Asia/Karachi` timezone

### Notifications

- Permission requested after first sign-in with a one-line explanation
- Expo push tokens registered to the backend per device
- Per-device switch in Me controlling both material and announcement notifications
- Tapping a notification opens the related announcement or material

### Admin Tools

Visible to admins only, inside the same app, with server-side role and status checks on every request.

- Users: search by name or email, with role, status and last sign-in
- Reports queue: open reports, open the reported material, then remove it or dismiss the report
- Promote or demote admins, and disable or enable users. A disabled user is blocked on their next request
- Admin role is seeded from the `ADMIN_EMAILS` setting, and enabled seeded accounts regain admin at each login
- An admin must transfer access before deleting the last active admin account

### Web Companion

- Home Screen web companion exported from the same Expo codebase
- Update notice with a safe restart when a new version is available
- Browser notifications for enabled devices

---

## Subjects

| Subject | Short | Credits | Teacher | Type |
|---|---|---|---|---|
| Data Structures | DS | 3 | Mr. Muhammad Naveed | Theory |
| Data Structures Lab | DS Lab | 1 | Mr. Bilal Ahmad | Lab |
| Computer Organization and Assembly Language | COAL | 3 | Ms. Aleena Ahmad | Theory |
| Computer Organization and Assembly Language Lab | COAL Lab | 1 | Ms. Amina Qaiser | Lab |
| Discrete Structures | Discrete | 3 | Ms. Rubab Janjua | Theory |
| Linear Algebra | Linear Algebra | 3 | Dr. Muzamil Hanif VF | Theory |
| Understanding of Holy Quran I / Ethics I | UHQ | Not stated | Not stated | Theory |

## Weekly Schedule

| Day | Subject | Time | Venue |
|---|---|---|---|
| Monday | UHQ / Ethics I | 08:30 to 10:20 | C-2 |
| Monday | Discrete | 11:30 to 12:50 | F-303 |
| Monday | Linear Algebra | 14:30 to 15:50 | C-13 |
| Tuesday | COAL | 08:30 to 09:50 | F-305 |
| Tuesday | DS Lab | 11:30 to 14:20 | Lab-14 |
| Tuesday | DS | 14:30 to 15:50 | F-203 |
| Wednesday | Discrete | 11:30 to 12:50 | F-303 |
| Wednesday | Linear Algebra | 14:30 to 15:50 | C-13 |
| Thursday | COAL | 08:30 to 09:50 | F-305 |
| Thursday | COAL Lab | 11:30 to 14:20 | Lab-17 |
| Thursday | DS | 14:30 to 15:50 | F-203 |

---

## Roles

| Role | Who | Permissions |
|---|---|---|
| Student | Anyone who signs in with a matching student email | Read all subjects, updates and schedule. Upload material. Edit and delete own material. Report material. Manage own notification switch. Delete own account |
| Admin | Class representative and a few trusted students | Everything a student can do, plus post, edit, delete and pin announcements, delete any material, review reports, promote or demote admins, and disable users |

---

## Architecture

```
Expo app (Android, iOS, web companion)
   |  HTTPS JSON and multipart
   v
FastAPI API (Render, Docker, Singapore)
   |-- MongoDB Atlas          users, subjects, schedule, material, announcements, reports
   |-- Cloudflare R2          private bucket, files served by presigned links (10 minute expiry)
   '-- Expo Push Service      FCM and APNs delivery to devices
```

Design principles:

- The API is the only writer. The mobile app never talks to MongoDB
- Files are reached only through short-lived presigned download URLs issued by the API
- Every backend route has an authorization check and a test
- Health endpoints: `/healthz` for liveness and `/readyz`, which returns 503 until MongoDB is configured and reachable
- Rate limiting on the API, with admin emails hidden from students

---

## Design System

A strict token-only system. No colour, spacing or type value is written outside the theme module.

| Token | Hex | Role |
|---|---|---|
| Ink | `#121A1B` | Background and dark surfaces |
| Olive | `#505039` | Lines and borders |
| Moss | `#A7AA63` | Accent and active states |
| Bone | `#EAE6D2` | Primary text and light surfaces |
| Danger | `#C46A4A` | Destructive actions and errors |

- Typefaces: Recoleta and Berthold. Both are licensed fonts kept out of version control. Development builds use platform fallbacks, and preview and production builds reject missing required fonts
- Visual direction: filled controls and rows, sculpted functional icons, rounded surfaces and mobile-sized typography
- Single-column layouts designed mobile first, with minimum 44 pt touch targets
- Reduced-motion support throughout
- An automated slop check (`make slop-check`) runs as part of verification to keep the interface free of generic template patterns
- Accessibility targets: WCAG AA contrast, dynamic type respected, screen reader labels

---

## Quality and Security

Every milestone is gated by a single verification command covering linting, tests, interface checks, API type checks and security scans.

| Area | Tooling and Standard |
|---|---|
| Backend linting and typing | Ruff and mypy in strict mode |
| Backend tests | Pytest with a minimum 85 percent coverage gate and 90 percent on services and dependencies |
| Mobile checks | ESLint, TypeScript and Jest |
| API contract | Generated TypeScript types from the API schema, checked for drift |
| Dependency audit | pip-audit and an npm audit policy script |
| Secret scanning | Gitleaks, plus a guard that blocks tracked environment files |
| Integration tests | Run against an isolated MongoDB 7 instance, with a fake R2 in automated tests |
| Continuous integration | GitHub Actions with a provisioned MongoDB 7 service |

Privacy: the app collects only name, email, push tokens and content the user uploads. Course-related content only.

---

## Platform Support

| Platform | Status |
|---|---|
| Android 8 and above | Standalone preview APK connected to a hosted HTTPS API. Compatible JavaScript and interface updates are delivered through expo-updates after a single APK installation |
| iOS 15.1 and above | Supported by the codebase. Setup and acceptance are deferred |
| Web companion | Home Screen web build from the same codebase |

Compatibility decision: Expo SDK 55 and React Native 0.83, chosen over a newer SDK to keep the wider device range.

---

## Development Status

| Milestone | Scope | Status |
|---|---|---|
| M0 | Foundations | Implemented |
| M1 | Authentication | Implemented |
| M2 | Subjects, catalog and timetable | Implemented |
| M3 | Class material | Implemented |
| M4 | Updates, coming-up dates, unread counts, attachments and admin posting | Implemented |
| M5 | Admin Users and Reports tools, role and status checks, account deletion | Implemented |
| M6 | Motion tuning | In progress |
| M7 | Release, physical device acceptance, push delivery acceptance and backups | Pending |

---

## Out of Scope

By design, the following are not part of E-DUMP: chat or direct messages, comments, likes and reactions, algorithmic feeds, stories, AI features, gamification, multiple sections or semesters, a web admin panel, payments, analytics dashboards, calendar sync, email notifications, in-app PDF annotation, file versioning, deeply nested folders, user profiles and any content that is not course related.

---

## License and Usage Restrictions

This project is proprietary and is not licensed under MIT, Apache or any other open source license. It is a private application for the BCS-3E section. No permission is granted to use, copy, modify, distribute or deploy this codebase without prior written permission from the author. All rights are reserved.
