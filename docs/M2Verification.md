# M2 verification — 9 October 2026

M2 implements the seeded subject catalog and timetable, protected catalog APIs,
Subjects and Schedule tabs, and private persisted read caches. The owner chose
all seven day selectors: Friday through Sunday display no classes. The initial
day and current/next class use Asia/Karachi; the clock pauses in the background.

`make seed` inserted seven subjects and eleven timetable slots. Integration tests
verify idempotence, the exact PRD timetable, active-material counts, UHQ's missing
teacher/credits, anonymous/student/admin/disabled authorization, unknown subjects,
and the shared per-user read limit.

`make verify` passed with exit code 0. Full output: [M2Verify.log](M2Verify.log).

| Check | Result |
|---|---|
| Ruff, formatting and strict mypy | Passed |
| ESLint and strict TypeScript | Passed; one warning in the Jest mock setup |
| Backend | 107 passed; 98.98% app coverage |
| Services/deps | 98.04% coverage; 90% gate passed |
| Mobile | 130 passed; 88.81% src line coverage |
| Audit policy tests | 6 passed |
| Slop and generated API schema | Passed |
| pip-audit, gitleaks, environment-file guard | Passed |
| npm audit policy | No unaccepted findings; existing owner-approved tooling exceptions expire 8 November 2026 |

The Android development build succeeded for the x86_64 emulator. Native checks
covered catalog navigation, full long subject names, Thursday's three classes,
Friday's empty state, and 320-point width with increased system text size.
Stopping the local API while keeping the authenticated app running preserved
cached schedule rows and displayed the offline caption after refresh failure.
Persisted caches are user-scoped, exclude auth and signed URLs, retain at most
two pages of infinite lists, and clear on sign-out alongside downloaded files.

The owner explicitly confirmed active-session-only offline reading. Offline
cold-start authentication remains governed by M1: failed session restore
returns to sign-in. This native cache check covers an already authenticated session.
Physical-phone acceptance remains deferred to M7 by the owner, and iOS remains
deferred because no Mac is available. Licensed fonts and the complete M6 device
matrix are still pending; screenshots use approved development fallbacks.

- [Subjects](screenshots/M2-android-subjects.png)
- [Thursday schedule](screenshots/M2-android-thursday.png)
- [Friday](screenshots/M2-android-friday.png)
- [Compact Subjects](screenshots/M2-android-compact-subjects.png)
- [Compact Schedule](screenshots/M2-android-compact-schedule.png)
- [Cached schedule during API outage](screenshots/M2-android-offline-schedule.png)

M3 implementation starts after this verification; M4 is outside this task.
