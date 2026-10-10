# MobileResponsiveness — E-DUMP

The app is phone-first: almost every student will use it one-handed on a mid-range Android, often on a weak mobile connection. This file defines how every screen adapts to screen size, text size, keyboard, safe areas, performance and network. It extends `UI.md`; where the two conflict on **layout behaviour**, this file wins, on **look**, `UI.md` wins. `AntiAISlop.md` still applies (single column, no grids, no boxes).

---

## 1. Target devices

| Class | Width (dp) | Examples | Priority |
|---|---|---|---|
| Compact | 320–359 | Small/older Android, iPhone SE (1st gen widths) | Must work, no clipping |
| Regular | 360–429 | Most Android phones, iPhone SE (2nd/3rd gen), iPhone 15 | **Primary design target** (reference 360 × 800 and 390 × 844) |
| Large | 430–599 | Pro Max iPhones, large Androids, foldables (cover or unfolded narrow) | Must work |
| Tablet | ≥ 600 | iPad, Android tablets | Sanity only: content stays one centred column, max width 560 |

OS floor: Android 8 (API 26) and iOS 15. Android low-end reference: 3 GB RAM, Cortex-A53 class CPU, 720p screen.

## 2. Orientation

Portrait only in v1 (`orientation: "portrait"` in `app.config.ts`). Do not build landscape layouts. Image viewer may not rotate in v1.

## 3. Layout rules

1. **One column, always.** Width comes from the screen, never from fixed numbers. No fixed widths on text containers; use `flex: 1`, `alignSelf: stretch` and `maxWidth`.
2. Side padding is the 24 pt axis on every class. On tablets the column is centred with `maxWidth: 560`; the background stays full-bleed.
3. Never position by pixel offsets. Spacing comes from the scale in `UI.md` §3.
4. Use `useWindowDimensions()` through one hook, `useSizeClass()` in `src/theme/responsive.ts`, returning `compact | regular | large | tablet` and `fontScale`. Screens never read dimensions directly.
5. Only these things vary by size class:

| Token | Compact | Regular / Large / Tablet |
|---|---|---|
| `display` | 48 / 50 | 56 / 58 |
| `h1` | 38 / 42 | 44 / 48 |
| `h2` | 24 / 28 | 28 / 32 |
| Everything else | unchanged | unchanged |

6. **Long text wraps, it does not clip.** Headings (`h1`, `h2`) wrap to at most 3 lines, row titles to 2 lines then ellipsis, captions to 2 lines. Subject names such as "Computer Organization and Assembly Language" must wrap cleanly at 320 dp and at 1.6× text size.
7. **Trailing meta (due dates, file counts, sizes) drops below the title** when it does not fit on the same line, or whenever `fontScale > 1.3`. Implement in `Row` once; screens do not handle it.
8. `FilterText` and `TabLabel` rows scroll horizontally when they overflow; the last item must be partly visible to signal scrolling. Never wrap them into two lines.
9. Header text actions (Upload, Post) stay on the title line when they fit; otherwise move below the title, left-aligned.
10. Forms: labels above fields, one field per row, primary `Button` at the bottom of the scroll content and reachable without leaving the keyboard-open state (§6).

## 4. Safe areas and system bars

- Use `react-native-safe-area-context` insets (ships with Expo Router) in `Screen`; no hard-coded status-bar or notch heights.
- Android: edge-to-edge is on; draw `ink` behind status and navigation bars; apply bottom inset to the tab bar and to every bottom-pinned element. Test with 3-button navigation **and** gesture navigation.
- iOS: respect the home indicator inset on the tab bar and sheets; respect the Dynamic Island/notch top inset.
- Display cutouts (punch-hole cameras): nothing interactive within the top inset.
- Bottom sheets: max height 85% of the window height minus top inset; content scrolls inside.

## 5. Text size and display zoom

- `allowFontScaling` on; `maxFontSizeMultiplier` 1.3 for headings, 1.6 for body and captions (per `UI.md`).
- Test at system font scale 1.0, 1.3, 1.6 and with Android "Display size: Largest" / iOS "Display Zoom".
- At 1.6×, every screen must still be fully usable: nothing clipped, no overlapping text, no horizontally scrolling body content, buttons still ≥ 52 high (grow, not shrink).
- Row heights are **minimums**, never fixed: use `minHeight`, not `height`.
- Tab bar labels stay on one line and are always visible. Cap font scaling on the tab bar at 1.2 so the four labels fit at 320 dp.

## 6. Keyboard and input

- Wrap every screen with inputs in `KeyboardAvoidingView` (`padding` on iOS, `height`/resize behaviour on Android) around a `ScrollView` with `keyboardShouldPersistTaps="handled"` and `keyboardDismissMode="interactive"` (iOS) / `"on-drag"` (Android).
- The focused field scrolls into view above the keyboard, with the Button still reachable by scrolling.
- Email field: email keyboard, no auto-capitalise, no auto-correct, return key = "Go".
- Numeric chapter field: `keyboardType="number-pad"`; add a "Done" accessory via blur on tap outside (no custom toolbar).
- Multi-line fields grow up to 6 lines, then scroll inside.
- Never autofocus on screens that open from a list; autofocus only the email field on the sign-in screen and the name field on the name screen.

## 7. Touch and one-handed use

| Rule | Value |
|---|---|
| Minimum target | 48 dp (Android) / 44 pt (iOS); rows are ≥ 64 |
| Gap between adjacent targets | ≥ 8 |
| Gestures | Only platform-standard: tap, long-press, vertical scroll, horizontal scroll for filters, swipe-back, pull-to-refresh. No custom swipe-to-delete in v1 (long-press → Sheet instead) |
| Primary action placement | In forms, at the bottom of the content. In lists, the header text action plus the empty-state action |
| Long-press | Always has a visible alternative (the row opens a detail with the same actions) so it is discoverable |
| Hit slop | `TextAction` and tab labels get extra `hitSlop` to reach 44/48 |
| Double-tap protection | Disable `Button` while a request is in flight; ignore taps for 300 ms after navigation |

## 8. Performance budgets (low-end Android is the benchmark)

| Metric | Budget |
|---|---|
| Cold start to interactive (reference low-end device) | < 3 s with cached session |
| Subject screen first paint from cache | < 300 ms |
| List scroll | 60 fps target, no dropped-frame bursts when loading the next page |
| JS bundle (Hermes bytecode) | Track and keep < 3 MB; do not add dependencies outside `Tech Stack.md` |
| Memory | No unbounded lists in memory; no image decoding of files in lists |
| App install size | Android APK < 60 MB |

Implementation rules:
1. Hermes on; Reanimated animates `transform` and `opacity` only (no animating layout properties except the delete-row height collapse).
2. Lists use `FlatList` with `keyExtractor`, memoised `Row` items, `initialNumToRender` 12, `maxToRenderPerBatch` 10, `windowSize` 7, `removeClippedSubviews` on Android. Page size 20 with infinite scroll at 60% remaining.
3. No thumbnails or previews inside lists; rows show text only (a file-kind word, not an image). Files load only when tapped.
4. Staggered enter animation caps at 8 rows and is skipped when OS Reduce Motion is on.
5. Avoid re-renders: query hooks select only needed fields; no inline object/array props on `Row`.
6. Persisted query cache limited to the last 2 pages per list and 7 days.
7. Cached downloaded files: cap the cache at 500 MB, evict least-recently-opened; "Clear downloads" row in Me.

## 9. Network resilience (mobile data in Pakistan can be slow or flaky)

| Case | Behaviour |
|---|---|
| JSON requests | 15 s timeout; GETs retry twice with backoff (1 s, 3 s); POST/PATCH/DELETE never auto-retry |
| Uploads | 120 s timeout; progress shown; on failure show "Upload failed. Try again." with a retry `TextAction`; the chosen file stays selected |
| Downloads | Progress with percentage; cancel by leaving the screen; a partial file is deleted; second open uses the cache |
| Offline | Cached lists remain readable with "Offline. Showing saved data."; write actions show an inline error immediately instead of queuing |
| Slow connection | Skeleton-free: heading visible, `ProgressLine` indeterminate; never block the whole screen with a spinner |
| Data use | Nothing downloads automatically; file bytes only on tap; no background polling (push covers alerts); lists refetch on screen focus only when stale (> 60 s) |
| Token refresh | Single-flight, invisible to the user |
| App returns from background | Refetch the current screen's query if stale; keep scroll position |

## 10. Platform behaviours that must feel native

- Android hardware/gesture **Back**: closes sheets first, then pops the stack, and on the root tab asks nothing (exits to home). Never trap the user.
- iOS swipe-back enabled on every pushed screen.
- Pull-to-refresh uses the native control tinted `moss`.
- Share/open of files uses the system chooser/viewer.
- Status bar content light on both platforms; splash background `ink` to avoid a white flash.
- Push notification tap from killed, background and foreground states all open the same screen (`/updates/[id]`).
- Respect Android app-language/locale for date formatting only; the UI is English.

## 11. Accessibility on mobile (additions)

- TalkBack/VoiceOver reading order equals visual order; `Row` announces "title, meta, button".
- Focus moves to the screen heading after navigation and after a sheet opens.
- Contrast is verified for `boneMuted` and `moss` on `ink` in tests (see `Testing&Authentication.md` B3).
- Screens remain usable with "Bold text" (iOS) and "High contrast text" (Android) enabled.

## 12. Test matrix (Maestro screenshots + manual)

Every screen is checked on these configurations; attach screenshots to the task result.

| # | Device (emulator or real) | Size dp | Font scale | Notes |
|---|---|---|---|---|
| 1 | Android small (e.g. Pixel 3a / 320 dp width custom) | 320 × 640 | 1.0 and 1.6 | Compact class worst case |
| 2 | Android reference | 360 × 800 | 1.0, 1.3, 1.6 | Gesture nav and 3-button nav |
| 3 | Android large | 412 × 915 | 1.0 | |
| 4 | iPhone SE | 375 × 667 | 1.0, 1.6 | No notch, small height |
| 5 | iPhone 15 | 393 × 852 | 1.0 | Dynamic Island |
| 6 | iPhone Pro Max | 430 × 932 | 1.0 | |
| 7 | Tablet sanity | 800 × 1280 | 1.0 | Centred 560 column |
| 8 | Real low-end Android (3 GB RAM or less) | any | 1.0 | Performance budgets in §8 |

Throttle the network profile to "3G slow" for upload/download tests, and run once fully offline.

Automated checks to add:
- A Jest layout test renders `Row`, `Heading`, `FilterText` at widths 320, 360, 430 and font scales 1.0 / 1.6 and asserts no text node is clipped (no `numberOfLines` overrides beyond the allowed counts) and that trailing meta moves below the title when `fontScale > 1.3`.
- `scripts/check-slop.sh` additionally fails on `width:\s*[0-9]{3,}` or `height:\s*[0-9]{2,}` literals in screen/feature files (fixed dimensions are only allowed inside `src/components` and `src/theme`), and on `Dimensions.get`.

## 13. Definition of done (per screen)

- [ ] Works at 320, 360, 393, 430 dp widths with font scales 1.0 and 1.6 without clipping or overlap.
- [ ] Safe areas respected on notch, punch-hole, gesture-nav and 3-button-nav devices.
- [ ] Keyboard never hides the focused field or the primary button.
- [ ] All targets ≥ 44/48, gaps ≥ 8.
- [ ] No fixed widths/heights outside `components` and `theme`; no direct dimension reads.
- [ ] List scrolls smoothly on the low-end device; no per-row images.
- [ ] Offline, slow-network and error states shown in plain text.
- [ ] Android Back and iOS swipe-back behave as in §10.
- [ ] Reduce Motion respected.

## Scroll stability correction � 11 October 2026

Rows select inline or stacked trailing metadata from viewport class and font scale, never from repeated text measurements. The scroll viewport is bounded with flex and zero minimum height; content does not shrink into its viewport. Animated rows keep their native view and clipped-subview removal is disabled on Android/web to avoid losing translated content during scrolling. Existing FlatList window/batch limits remain; this overrides the earlier Android clipping recommendation.
