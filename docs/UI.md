# UI — E-DUMP

Owner update, 10 October 2026: the Android preview now uses the requested filled, rounded native controls and sculpted functional icons. Screen titles are 32/38 (compact 28/34), section/subject titles 20/26 (compact 18/24), display 40/46 (compact 36/42). Body remains 16/24. Preview headings use the platform sans fallback instead of serif; licensed font mappings remain available. Controls use a 12 pt radius, rows/upload selector 16 pt, all defined in theme tokens. This owner-approved direction supersedes the older text-only and no-filled-container visual rules below and in AntiAISlop.md. Palette, feature scope, accessibility, single-column layout and other bans remain binding.

Design intent: a calm, typographic, editorial app. Big bold headings, generous space, one column, hairline dividers. Content (file names, announcements) is the hero; chrome is nearly invisible. Read `AntiAISlop.md` alongside this file: it is binding.

---

## 1. Colour tokens

Only these four brand colours plus opacity variants of them. Hex values live only in `mobile/src/theme/tokens.ts`.

| Token | Hex | Use |
|---|---|---|
| `ink` | `#121A1B` | App background, text on accent buttons |
| `olive` | `#505039` | Hairlines, dividers, inactive tab underline, disabled fills. **Never body text** (contrast ~1.9:1 on ink) |
| `moss` | `#A7AA63` | Accent: primary button fill, active states, type labels, links, progress line |
| `bone` | `#EAE6D2` | Primary text, headings |

Derived (opacity of the above, computed in tokens.ts, not new colours):
- `boneMuted` = bone at 68% → secondary text (≥ 7:1 on ink)
- `boneFaint` = bone at 45% → placeholders, timestamps on large text only (check ≥ 4.5:1 before use at body size; otherwise use `boneMuted`)
- `line` = olive at 100% (1 px), `lineSoft` = olive at 55%
- `pressed` = bone at 6% overlay on a row while pressed

**Single functional exception:** `danger` = `#C46A4A` (muted terracotta) used **only** for destructive text actions (Delete, Remove) and error text. Owner may veto; if vetoed, destructive/error text uses `bone` with a leading "Error:" or "Delete" wording and nothing else changes.

Contrast checks (must hold, verify in tests with a contrast helper): bone/ink ≥ 12:1, moss/ink ≥ 7:1, ink on moss ≥ 7:1, danger/ink ≥ 4.5:1.

Theme: **dark only** in v1. Tokens are read through a `useTheme()` hook so a light theme (bone background, ink text, olive accent) can be added later without touching components. Do not build the light theme now.

## 2. Typography

Fonts: **Recoleta** (headings) + **Berthold** (everything else).

Licensing and variants (owner action):
- Recoleta and Berthold are commercial fonts. The owner must purchase an app-embedding licence and place files in `mobile/assets/fonts/`.
- "Berthold" is a foundry with many families. **Assumption: Akzidenz-Grotesk BQ (Berthold)**, weights Regular/Medium/Bold. If a different Berthold family is intended, only the filenames in `typography.ts` change.
- Expected files: `Recoleta-Bold.otf`, `Recoleta-SemiBold.otf` (optional), `Berthold-Regular.otf`, `Berthold-Medium.otf`, `Berthold-Bold.otf`.
- Until files exist, `typography.ts` falls back to the platform fonts (`serif` bold for headings, system sans for body) so development is not blocked. Fallback is development-only; a release build must fail the `check-fonts` script if files are missing.

Scale (points; apply `allowFontScaling` with `maxFontSizeMultiplier` 1.3 on headings, 1.6 on body):

| Style | Font | Size / line | Weight | Letter spacing |
|---|---|---|---|---|
| `display` | Recoleta | 56 / 58 | Bold | -1.0 |
| `h1` (screen titles) | Recoleta | 44 / 48 | Bold | -0.6 |
| `h2` (subject names in lists, section titles) | Recoleta | 28 / 32 | Bold | -0.3 |
| `h3` (row titles that need weight) | Berthold | 18 / 24 | Bold | 0 |
| `body` | Berthold | 16 / 24 | Regular | 0 |
| `bodyStrong` | Berthold | 16 / 24 | Medium | 0 |
| `caption` | Berthold | 13 / 18 | Regular | 0.1 |
| `label` (type labels like "Quiz") | Berthold | 14 / 18 | Bold | 0 · sentence case, colour `moss` |

Headings are **bold, large, left-aligned, sentence case**. Never centre body copy. Never all-caps except none (do not use uppercase styling anywhere).

## 3. Layout and spacing

- One column. One left margin axis: **24 pt** side padding on every screen. Everything aligns to that axis.
- Spacing scale (only these): 4, 8, 12, 16, 24, 32, 48, 64.
- Screen title block: top padding 24 (below safe area), title `h1`, 8 gap, optional one-line `caption` in `boneMuted`, then 24 gap to content.
- List rows: min height 64, vertical padding 16, full-bleed hairline (`lineSoft`) under each row, inset 24 from the left, running to the right edge.
- No cards, no tiles, no boxes, no bordered containers, no multi-column layouts, no two-up arrangements. Side-by-side is allowed only for: a row's trailing meta text, the two text actions in a header, and tab labels.
- Safe areas respected on all edges; bottom tab bar sits on `ink` with a top hairline.
- Content max width on tablets: 560 pt, centred. Phones are the target.

## 4. Components (the complete set)

All live in `src/components`. Do not create others without asking.

| Component | Spec |
|---|---|
| `Screen` | Safe-area wrapper, `ink` background, status bar light |
| `Heading` | Variants `display`, `h1`, `h2`; Recoleta Bold, `bone` |
| `Text` | Variants `body`, `bodyStrong`, `caption`, `label`, tone `default|muted|accent|danger` |
| `Row` | Pressable list row: leading content (title + meta lines), optional trailing text, bottom hairline, pressed overlay. The only list item primitive |
| `Divider` | 1 px hairline, `lineSoft` |
| `Button` | **One variant**: full-width, height 52, fill `moss`, label `ink` Berthold Bold 16, radius 4. Disabled: fill `olive`, label `boneMuted`. Loading: label replaced by "Working…" (no spinner glow) |
| `TextAction` | Text-only action in `moss`, Berthold Bold 16, hit area ≥ 44. Destructive variant in `danger` |
| `Field` | Underline-only input: 1 px `olive` line, becomes 2 px `moss` on focus, label above in `caption` `boneMuted`, error text below in `danger`. No filled or bordered input boxes |
| `TabLabel` | Text tab (e.g. Material / Updates): active = `bone` + 2 px `moss` underline; inactive = `boneMuted`. Used inside subject screen and filters |
| `FilterText` | Horizontally scrolling single-line text filters, selected = `moss` with underline, others `boneMuted` |
| `Sheet` | Bottom sheet: `ink` background, 1 px `olive` top edge, drag handle omitted, no shadow, no backdrop blur, backdrop = ink at 60% |
| `EmptyState` | `h2` line + one `body` line + optional `TextAction`. No illustrations |
| `ErrorLine` | `danger` text with a plain message and a "Try again" `TextAction` |
| `ProgressLine` | 2 px line at the top of the content area; determinate fills with `moss`; indeterminate slides once left→right and repeats at ≥ 1.2 s period (no pulsing, no glow) |
| `Icon` | Lucide, stroke 1.5, size 22, colour `bone` or `moss`; only in tab bar, back chevron, overflow, file-kind marker |

Badges, pills, chips, avatars in circles with rings, floating action buttons and toasts-with-icons do **not** exist. Feedback uses inline text (e.g. "Uploaded" in `moss` replacing the button text for 1.5 s) and `ErrorLine`.

## 5. Navigation

Bottom tabs, four items, label under a 22 pt icon, active = `moss`, inactive = `boneMuted`:

1. **Updates** (badge = plain number in `moss` text beside the label, no circle)
2. **Subjects**
3. **Schedule**
4. **Me**

Stack screens push with a short horizontal slide; modals (Upload, New update) present from the bottom as full-height sheets with a "Close" `TextAction` top-left. Back affordance: chevron + parent title as text.

## 6. Screens

Wireframes are indicative layout only (single column, no boxes).

### 6.1 Sign in
```
BCS-3E                          ← display, bone
Class material and alerts,      ← body, boneMuted
in one place.

Student email                   ← Field label
l25xxxx@lhr.nu.edu.pk           ← underline input, placeholder

[ Continue ]                    ← Button (moss)
```
Field: email keyboard, no auto-capitalise, no auto-correct, `textContentType="emailAddress"`, return key submits. The client checks the pattern (`src/lib/email.ts`, a mirror of the server regex) for instant feedback; the server is the authority. Errors appear inline under the field via `ErrorLine`: pattern mismatch → "Use your student email, like l25xxxx@lhr.nu.edu.pk"; network → "Can't reach the server. Try again." The button reads "Working…" during the request.

### 6.1b Your name (first sign-in only)
`h1` "Your name" · body "Shown next to files you upload." · `Field` "Name" (2–40 characters) · `Button` "Save". Editable later from Me.

### 6.2 Blocked
`h1` "Account disabled" · body "Contact a class admin." · `TextAction` "Sign out".

### 6.3 Updates (tab)
```
Updates                              Post   ← h1 left; "Post" TextAction (admins only)
3 new                                       ← caption

Coming up                                   ← h2
Quiz · DS               Tomorrow, 10:00     ← label + subject, trailing due
Task · Discrete         Sun, 12 Oct
──────────────────────────────────────────
Quiz 2 on linked lists                      ← h3
Quiz · DS · Mr. Muhammad Naveed · 2h ago    ← caption (label colour moss on type)
──────────────────────────────────────────
```
Filters: `FilterText` row (All, Quiz, Task, Datesheet, General) under the title; subject filter via a second `FilterText` row only on the Subjects screen's Updates tab. Pinned items show the word "Pinned" in `moss` caption before the type. Pull-to-refresh uses the native control tinted `moss`.

### 6.4 Update detail
`label` type → `h1` title → caption (subject · author · date) → body text (selectable) → due line "Due Tue 14 Oct, 10:00" in `bodyStrong` `moss` → attachments as `Row`s (file name, size) → admin only: `TextAction` Edit, Pin/Unpin, Delete (danger).

### 6.5 Subjects (tab)
```
Subjects                                    ← h1
Seven courses this semester                 ← caption

Data Structures                  42 files   ← h2 + trailing caption
Mr. Muhammad Naveed · 3 credits             ← caption, boneMuted
──────────────────────────────────────────
Computer Organization and                   ← h2 wraps to 2 lines
Assembly Language                 18 files
Ms. Aleena Ahmad · 3 credits
```
Rows ordered by `sort_order` (theory then lab pairs: DS, DS Lab, COAL, COAL Lab, Discrete, Linear Algebra, UHQ). UHQ shows "Credits and teacher to be added" until data exists.

### 6.6 Subject screen
```
‹ Subjects
COAL                                  Upload  ← h1 (short name) + TextAction
Computer Organization and Assembly Language · Ms. Aleena Ahmad · 3 credits  ← caption

Material    Updates                          ← TabLabel pair
[ search…                                  ]  ← Field (underline), placeholder "Search COAL material"
All  Slides  Notes  Assignment  Past paper  Book  Other   ← FilterText
Chapter: Any  1  2  3  4  5 …                ← FilterText (numbers from existing data)
──────────────────────────────────────────
Chapter 3 – Addressing modes                 ← h3
Notes · Ch 3 · 1.2 MB · Ali Raza · 2d ago    ← caption
──────────────────────────────────────────
```
Row tap → download with `ProgressLine` and caption "Downloading 63%" then opens. Overflow for a row: long-press opens `Sheet` with Open, Report, and (owner/admin) Edit, Delete. Empty state: "Nothing here yet" / "Upload the first file for COAL." / `TextAction` Upload.

### 6.7 Upload (modal)
Title `h1` "Upload". Steps on one scroll: **File** (`TextAction` "Choose file", shows name + size once chosen), **Title** `Field` (prefilled from filename without extension), **Type** `FilterText`-style single choice (Slides, Notes, Assignment, Past paper, Book, Other), **Chapter** `Field` numeric (optional), **Note** `Field` (optional, 200 chars with counter in `caption`), then `Button` "Upload". During upload: button becomes "Uploading 40%" and `ProgressLine` fills. On duplicate: `ErrorLine` "Already uploaded as 'Chapter 3 notes'" with `TextAction` "View".

### 6.8 Schedule (tab)
Day selector as `FilterText` (Mon–Thu, today preselected, other days visible). List of `Row`s: time in `bodyStrong` (e.g. `11:30 – 12:50`), subject `h3`, caption "F-303 · Ms. Rubab Janjua". "Now" or "Next" shown as a `moss` word before the time on the current/next class.

### 6.9 Me (tab)
`h1` name, caption email. Rows: Name (tap to edit), Notifications (trailing native Switch tinted `moss`), Rules, Delete account (danger), Sign out. Admin section under an `h2` "Admin": Users, Reports (with open count).

### 6.10 Admin screens
- **Users**: search `Field`, `Row`s with name and email, trailing caption for role and status ("Admin", "Disabled"); long-press → Make admin / Remove admin / Disable / Enable.
- **Reports**: `Row`s (material title, reason, reporter, age); tap → detail with `TextAction` "Remove material" (danger) and "Dismiss".

### 6.11 New / edit update (admin modal)
`h1` "New update" · Type choice · Subject choice (All subjects default) · Title `Field` · Body `Field` multiline · Due date and time (native picker opened from a `TextAction` "Set due date") · Attachments (`TextAction` "Add file", list of chosen files) · `Button` "Publish".

## 7. Motion

Source of truth: tune with the **motion.dev MCP**, record final values in `src/theme/motion.ts`, implement with Reanimated. Starting values (replace with MCP-tuned ones):

| Name | Value |
|---|---|
| `durationFast` | 160 ms |
| `durationBase` | 260 ms |
| `durationSlow` | 420 ms |
| `easeOut` | `cubic-bezier(0.2, 0, 0, 1)` |
| `easeInOut` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `spring` | stiffness 260, damping 28, mass 1 |

Behaviours:
1. **Screen enter**: heading fades in and rises 12 pt (`durationBase`, `easeOut`).
2. **List enter**: rows fade/rise 8 pt with 28 ms stagger, max 8 rows animated, the rest appear instantly. Only on first mount of a screen, not on refetch.
3. **Press**: row background to `pressed` over 80 ms; buttons reduce opacity to 0.85. No scale bounce.
4. **Tab underline / filter underline**: slides to the new label with `spring`.
5. **Sheet**: translates from bottom with `spring`; backdrop fades `durationBase`.
6. **Progress**: `ProgressLine` width animates linearly with real progress values.
7. **Delete**: row collapses height to 0 over `durationBase` while fading.
8. **Reduce Motion**: when the OS setting is on, all of the above become instant opacity changes ≤ 100 ms.

Forbidden: looping decorative animation, pulsing, glow, shimmer skeletons, parallax, confetti, haptic spam. One light haptic on successful upload/publish only.

## 8. States

| State | Treatment |
|---|---|
| Loading first time | `ProgressLine` indeterminate + the screen heading already visible; no skeleton blocks |
| Loading more | "Loading more…" `caption` at list end |
| Empty | `EmptyState` with plain language |
| Error | `ErrorLine` inline with retry |
| Offline | `caption` "Offline. Showing saved data." under the heading; write actions show an `ErrorLine` instead of failing silently |
| Success | Inline text change for 1.5 s, never a modal |

## 9. Copy rules

- Plain, short, human: "Upload", "Open", "Report", "Account disabled".
- No exclamation marks, no emojis, no "Oops", no "Welcome back", no marketing words ("seamless", "powerful").
- Dates: "Today", "Tomorrow", otherwise "Tue 14 Oct"; times 24-hour is **not** used in UI: use "10:00 AM" format to match the timetable. Sizes: "1.2 MB".
- Relative time: "2h ago", "3d ago", after 7 days show the date.

## 10. Accessibility

- Every `Row` has `accessibilityRole="button"` and a label combining title and meta.
- Touch targets ≥ 44 × 44 pt (rows already ≥ 64).
- Dynamic type supported; layouts must not clip at 1.6× body scale (rows grow).
- Screen reader order follows visual order; headings use `accessibilityRole="header"`.
- Colour is never the only signal (type label words, "Pinned" word, underline plus colour for selection).
- Test with TalkBack and VoiceOver on one screen per release.

## 11. Platform notes

- Android: edge-to-edge, ink status/navigation bars, back gesture works on all stacks.
- iOS: large titles are **not** used (our `h1` is in-content), swipe-back enabled, status bar light.
- Icons and splash: ink background, "BCS-3E" set in Recoleta Bold bone, no logo mark or glow. Owner may supply a real icon later.
