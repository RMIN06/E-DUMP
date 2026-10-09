# AntiAISlop — E-DUMP

Binding rules for every UI, copy, and code change. If a rule here conflicts with a "nicer" idea, this file wins. If it conflicts with `PRD.md` scope, ask the owner.

"AI slop" here means generic, decorative, over-built output that looks machine-made: card grids, glows, gradients, filler copy, speculative features, and needless abstraction.

---

## 1. Visual bans (never, anywhere in the app)

| Banned | Includes | Use instead |
|---|---|---|
| **Grids** | Multi-column layouts, tile galleries, bento layouts, `FlatList numColumns > 1`, `display: grid`, two-up stat blocks | Single-column list of `Row`s |
| **Boxes** | Cards, tiles, bordered containers, filled panels, boxed inputs, outlined chips, pill badges, box-shadowed anything, nested containers | Whitespace, hairline dividers, text weight |
| **Irregular divs** | Mixed paddings, arbitrary margins, off-axis alignment, ragged left edges, one-off magic numbers, containers wrapping a single child for no reason | One 24 pt left axis, spacing scale only (4/8/12/16/24/32/48/64), identical row structure everywhere |
| **Glowing circles** | Blurred blobs, radial gradients, halo rings, pulsing dots, orbs behind headings or buttons, avatar rings | Nothing. Plain content |
| **Neon** | Any saturated glow colour, text-shadow glow, outer glow, bright cyan/magenta/purple/lime accents | Only the palette in `UI.md` |
| Gradients | Linear/radial gradients, gradient text, gradient buttons, mesh backgrounds | Flat colours |
| Glass | Blur, frosted panels, translucent layered surfaces, `expo-blur` | Flat `ink` |
| Shadows and elevation | `shadow*`, `elevation`, drop shadows, inner shadows | Hairlines |
| Decorative illustration | Stock illustrations, 3D blobs, mascots, emoji as icons, lottie | Type only |
| Over-rounding | Large radii, pill buttons, circular icon buttons | Radius 4 on `Button` only; everything else 0 |
| Decorative motion | Looping animations, shimmer skeletons, bounce, confetti, parallax | See `UI.md` §7 |
| Generic hero patterns | "Welcome back 👋", three-feature columns, big empty icon above empty text, onboarding carousels | Direct, plain screens |
| Uppercase micro-labels | Tiny tracked all-caps section labels | Sentence-case `label`/`caption` |

Allowed visual elements (the complete list): text, 1 px hairlines, the one `Button`, text actions, underline inputs, text tabs/filters with underline, the bottom sheet, 22 pt Lucide icons in tab bar / back / file-kind, native switch, native pull-to-refresh, `ProgressLine`.

## 2. Layout discipline

1. Every screen: `Screen` → `Heading` → content. Content is a vertical stack. Nothing floats.
2. One left axis at 24 pt. Titles, rows, fields, buttons, captions all start there.
3. Every list item is a `Row`. Do not invent variant containers. If a `Row` cannot express it, ask.
4. Vertical rhythm: 24 between sections, 16 inside a row, 8 between a title and its caption.
5. Never nest a bordered/filled element inside another.
6. No absolute positioning except the bottom sheet and tab bar.
7. No hard-coded numbers: use tokens. A raw `margin: 13` is a defect.

## 3. Copy bans

- No emojis anywhere (UI, notifications, code comments, commit messages).
- No exclamation marks, "Oops", "Awesome", "Let's get started", "Welcome back", "Seamless", "Powerful", "Unlock", "Elevate", "Supercharge", "Journey".
- No lorem ipsum or "Sample item" in committed code (use seed data).
- Error messages say what happened and what to do, in one sentence.
- Headings are statements of place or content ("Updates", "COAL"), not slogans.

## 4. Code bans

| Banned | Reason |
|---|---|
| Features not in `PRD.md` (search suggestions, likes, comments, analytics, themes switcher, onboarding tours, "smart" anything) | Scope creep |
| Dependencies not in `Tech Stack.md` | Bloat, supply-chain risk |
| Hex/RGB colours outside `theme/tokens.ts` | Palette drift |
| Inline style objects with magic numbers | Irregular spacing |
| Abstractions with one user (factories, generic base classes, plugin systems, event buses) | Over-engineering |
| Comments that restate the code; commented-out code; `TODO`/`FIXME` left in commits | Noise |
| `any`, `@ts-ignore`, `# type: ignore` without a justification line | Type safety |
| Catch-all `except Exception: pass` / empty `catch {}` | Hidden failures |
| Mock data in production paths, fake success responses | Dishonest behaviour |
| Console/print debugging left in | Noise, leak risk |
| Placeholder screens/buttons that do nothing | Dead UI |
| Generated boilerplate files that are unused (default Expo example screens, template assets) | Clutter |

## 5. Scope guard

Before writing any code for a task, answer in the PR/commit description:
1. Which PRD requirement ID does this implement? (e.g. `MAT-4`)
2. Does it add a screen, component, dependency, endpoint or collection not named in the docs? If yes → stop and ask the owner.

If the answer to 1 is "none", do not build it.

## 6. Automated checks

Create `scripts/check-slop.sh`, run through `make slop-check`, and make CI fail on any hit. It must exit non-zero when a pattern is found.

```bash
#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/../mobile"
fail=0
check() { # description, pattern, extra grep args
  local out
  out=$(grep -rnE $3 --include='*.ts' --include='*.tsx' -e "$2" src app 2>/dev/null)
  if [ -n "$out" ]; then echo "SLOP: $1"; echo "$out"; fail=1; fi
}
check "shadows/elevation"        'shadow(Color|Offset|Opacity|Radius)|elevation\s*:|boxShadow|textShadow' ""
check "gradients/blur"           'expo-linear-gradient|LinearGradient|RadialGradient|expo-blur|BlurView|blurRadius|backdropFilter' ""
check "grid layouts"             'numColumns|display:\s*.grid|gridTemplate' ""
check "lottie/illustration libs" 'lottie|react-native-svg-transformer' ""
check "large radii"              'borderRadius:\s*([5-9]|[1-9][0-9]+)\b' ""
check "borders on containers"    'borderWidth:\s*[2-9]|borderColor' ""   # borders only via Divider/Field/Sheet components (allowlisted below)
# hex colours outside tokens
out=$(grep -rnE --include='*.ts' --include='*.tsx' '#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b|rgba?\(' src app | grep -v 'src/theme/tokens.ts')
[ -n "$out" ] && { echo "SLOP: colour literals outside tokens.ts"; echo "$out"; fail=1; }
# emoji
out=$(grep -rnP --include='*.ts' --include='*.tsx' '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]' src app)
[ -n "$out" ] && { echo "SLOP: emoji"; echo "$out"; fail=1; }
# banned copy
out=$(grep -rniE --include='*.ts' --include='*.tsx' "oops|awesome|seamless|supercharge|unlock|welcome back|let's get started|lorem ipsum|TODO|FIXME" src app)
[ -n "$out" ] && { echo "SLOP: banned copy/markers"; echo "$out"; fail=1; }
# dependency allowlist
node -e '
const p=require("./package.json");const bad=["expo-linear-gradient","expo-blur","lottie-react-native","nativewind","react-native-paper","native-base","tamagui","axios","redux","@reduxjs/toolkit","framer-motion","motion"];
const all={...p.dependencies,...p.devDependencies};const hit=bad.filter(b=>all[b]);
if(hit.length){console.log("SLOP: banned deps: "+hit.join(", "));process.exit(1)}' || fail=1
exit $fail
```

Notes for Codex: the `borderColor` check is intentionally strict; borders are implemented only inside `Divider`, `Field`, `Sheet` and `TabLabel`. Add those four file paths to a `grep -v` allowlist in the script rather than loosening the pattern. Also add the ESLint rules `no-restricted-imports` for the banned packages and `no-restricted-syntax` forbidding `numColumns` JSX props.

## 7. Visual self-review (run on every screen before "done")

Answer yes/no; any "yes" under A is a failure, any "no" under B is a failure.

A. Does it contain: a card or box? more than one column? a gradient, glow, blur or shadow? a coloured circle? a pill? an emoji? an illustration? a loop animation? a colour outside the palette?
B. Does every element sit on the 24 pt axis? Is every spacing value from the scale? Is the heading bold, large and left-aligned? Is every list item a `Row`? Do all texts come from the type scale? Does it work at 1.6× text size? Is the empty/error/offline state handled with plain text?

Attach a screenshot of each new screen (Android + iOS) to the task result.

## 8. Reviewer's rule of thumb

If a screenshot could belong to any generic "modern dashboard" template, it is wrong. This app should look like a typeset reading list: dark paper, bone ink, moss highlights, nothing else.
