# FinalVerdict — E-DUMP

The decisions, assumptions, risks, build order and kickoff prompt. If any other doc disagrees with this one on a *decision*, this file wins; on *detail*, the specific doc wins.

---

## 1. Verdict

Build it. The scope is small and well bounded: 4 tabs, 7 subjects, one material list pattern, one admin-only announcement pattern, email-only sign-in. One developer with Codex can ship v1.0 in about 4–6 focused weeks. Running cost is near zero (Atlas M0, R2 free tier, Expo free tier) plus a small API host (~US$5/month) and, for iOS, the Apple Developer fee.

## 2. Decisions made on the owner's behalf

| # | Topic | Decision | Owner can change by |
|---|---|---|---|
| D1 | Framework | React Native + Expo (owner's answer) | — |
| D2 | Login | Email-only: the student enters their email and is signed in if it matches `l25xxxx@lhr.nu.edu.pk` (owner's revised choice). No password, code, roster or Google | Add an email code later (see R1) |
| D3 | File storage | Cloudflare R2, private bucket | Swap `integrations/r2.py` for any S3-compatible store |
| D4 | Uploads | Proxied through the API (server validates + dedupes) | Revisit if files exceed 50 MB |
| D5 | Opening files | System viewer for PDF/PPTX/DOCX, in-app view for images | In-app PDF viewer is a later add-on |
| D6 | Push | Expo Push Service | — |
| D7 | API host | Fly.io or Railway, Docker | Any container host |
| D8 | Motion | Specs from motion.dev MCP, implemented with Reanimated (motion.dev cannot run natively in React Native) | — |
| D9 | Theme | Dark only for v1 | Light theme later via tokens |
| D10 | Functional colour | One extra colour `#C46A4A` for destructive/error text | **Veto it** and errors become bone text with wording only |
| D11 | Discrete naming | App uses the timetable name "Discrete Structures" and lists "Discrete Mathematics" as an alias | Edit `seeds/subjects.json` |
| D12 | Berthold family | Assumed Akzidenz-Grotesk BQ (Berthold) | Change font filenames in `typography.ts` |
| D13 | Schedule screen | Included as P1 because the timetable was supplied | Cut it if you want strictly material + alerts |
| D14 | Duplicate guard | Exact-file duplicate rejection per subject (direct answer to the "messy dump" problem) | — |
| D15 | Display name | One-time "Your name" screen after first sign-in, because email-only login gives no profile name | Derive from email instead (shows `l251234`) |

## 3. Risks and what to do

| ID | Risk | Likelihood | Mitigation |
|---|---|---|---|
| R1 | **Impersonation.** Email-only login proves nothing: anyone can type a classmate's or an admin's email and act as them (fake quiz alerts, deleting material). The pattern is guessable, so other sections can also join | **High** | Built in: admin disable, rate limits, admin emails hidden from students. Strongly recommended before launch: email a 6-digit code, at least for admins (small change, isolated in `auth_service.login_with_email`). See `Security and Compliance.md` §2.4 |
| R2 | iOS distribution needs an Apple Developer account (US$99/year); push on iOS also needs it | Certain | Decide now. If no account: Android-only v1, iOS students use a later TestFlight |
| R3 | Recoleta and Berthold are paid fonts; wrong family guessed | Medium | Buy licences, confirm the Berthold family, place files before UI work |
| R4 | Free hosting sleeps, causing slow first requests | Low | Use an always-on small plan, not a sleeping free tier |
| R5 | Copyrighted books or leaked papers get uploaded | Medium | Rules screen, report flow, admin removal, `copyright` report reason |
| R6 | Students keep using WhatsApp | Medium | Pin a WhatsApp message "Material lives in E-DUMP now", admins repost every alert only in the app for 2 weeks, seed the app with existing PDFs on day 1 |
| R7 | Sideloaded APK warnings and update friction on Android | Low | Host the APK at a stable link, use EAS Update for JS fixes |
| R8 | Single admin dependency | Medium | Seed 2–4 admins; last-admin protection is built in |
| R9 | Scope creep (chat, comments, AI) | High | `AntiAISlop.md` §5 scope guard and `AGENTS.md` rule 1 |

## 4. Inputs the owner must provide before or during build

1. Exact email pattern confirmed with 2–3 real student emails (`l25` + 4 digits, domain `lhr.nu.edu.pk`).
2. Admin emails (2–4).
3. UHQ teacher name and credit hours (timetable says "Not Mentioned").
4. Font files (Recoleta, Berthold) with embedding licence.
5. Accounts: MongoDB Atlas, Cloudflare R2, Expo/EAS, Fly.io or Railway, Apple Developer (if iOS).
6. A contact email for takedown and deletion requests (shown in Rules).
7. App name and icon (defaults: "E-DUMP", text-only icon).

## 5. Build order for Codex

Each milestone ends with `make verify` green and a short demo note. Do not start a milestone before the previous one is accepted.

| M | Name | Deliverables | Acceptance |
|---|---|---|---|
| M0 | Foundations | Repo layout per `Structure.md`, `AGENTS.md`, Makefile, CI skeleton, Docker for backend, Expo app with fonts/tokens/`Screen`/`Heading`/`Text`, `check-slop.sh` | `make verify` passes on empty app; Android + iOS dev builds launch |
| M1 | Auth | Email-pattern login, JWT + refresh rotation, `/me`, sign-in, name and blocked screens, session restore, sign-out | AUTH-1…AUTH-4 tests pass; a real student email signs in on a phone |
| M2 | Subjects + schedule | Seed script, `/subjects`, `/schedule`, Subjects tab, Schedule tab | SUB-1, SCH-1 |
| M3 | Material | Upload pipeline, validation, dedupe, list/filter/search/pagination, download + open, delete, report | MAT-1…MAT-8; F1 and F2 flows pass |
| M4 | Announcements + push | CRUD, attachments, pin, upcoming, unread badge, device registration, push send, tap-to-open | ANN-1…ANN-7, NOT-1…NOT-3; F3 and F4 pass; push < 60 s on real devices |
| M5 | Admin tools | Users and reports screens and endpoints | ADM-1…ADM-3, AUTH-5, AUTH-6 |
| M6 | Polish, motion and responsiveness | Motion tuned via motion.dev MCP and implemented, empty/error/offline states, accessibility pass, Rules screen | `UI.md` §7–§10 and `MobileResponsiveness.md` §13 checked on the §12 device matrix, slop self-review screenshots |
| M7 | Hardening and release | `Security and Compliance.md` §10, backups, EAS preview APK, TestFlight, seed real data, onboarding message to class | Release gate in `Testing&Authentication.md` Part C |
| M8 (P1) | Extras if time | MAT-9 edit own material, MAT-10 recently added | Only after M7 |

## 6. Definition of done (every task)

1. Maps to a PRD requirement ID.
2. Tests added and passing; `make verify` green.
3. UI tasks: slop self-review and `MobileResponsiveness.md` §13 checklist passed, with screenshots from Android and iOS.
4. No new dependency, endpoint, collection, screen or component outside the docs without owner approval.
5. No TODO/FIXME, no commented-out code, no secrets, no emojis.

## 7. Kickoff prompt for Codex (paste as the first task)

```
You are building E-DUMP, a private class app for BCS-3E (≤60 students).
Read, in order: docs/PRD.md, docs/Tech Stack.md, docs/Architecture.md, docs/Structure.md,
docs/UI.md, docs/MobileResponsiveness.md, docs/AntiAISlop.md, docs/Security and Compliance.md,
docs/Testing&Authentication.md, docs/FinalVerdict.md.

Rules: stay strictly inside PRD scope; use only the listed dependencies; follow the layer and
import rules in Structure.md; obey AntiAISlop.md (no grids, boxes, irregular spacing, glowing
circles, neon, gradients, shadows, emojis); every route is authorised and tested.
If anything is ambiguous or you lack a decision, stop and ask me instead of guessing.

Task now: complete milestone M0 only. Create AGENTS.md from Structure.md §6, the monorepo
skeleton, Makefile, CI workflow, backend Dockerfile and health endpoints, the Expo app shell with
theme tokens (colours #121A1B #505039 #A7AA63 #EAE6D2, Recoleta + Berthold with dev fallbacks),
the Screen/Heading/Text components, and scripts/check-slop.sh. Run make verify and report the
result. Do not start M1.
```

## 8. After release

- Week 1: collect issues in one list, fix with EAS Update where JS-only.
- Week 4: measure the success metrics in `PRD.md` §12.
- Semester end: decide archive or wipe, announce it, and take a final `mongodump` plus R2 listing.
- Next semester: duplicate the repo for the new section or generalise to multiple sections as a **separate** PRD. Do not retrofit it into v1.
