# Frontend polish — 10 October 2026

Scope: MAT-4 upload presentation and PRD §9 mobile accessibility/responsiveness. Existing features and shared primitives are retained; no dependency, endpoint, collection or route was added.

The upload form now separates the heading, file selection, metadata and submission into consistent sections. The file picker uses the existing full-width Row and its hairline instead of a bordered container. Selected filenames wrap as body text. The primary action shows actual upload percentages while busy, and file replacement is disabled during transfer.

Shared Buttons and TextActions use 80 ms opacity press feedback and a 160 ms eased release. Disabled text actions use the muted text token. Tab underlines settle using stiffness 260, damping 33, mass 1 and overshoot clamping. All motion respects the OS reduced-motion preference. Multiline fields reserve three lines, grow to six lines and then scroll; height tracks the capped system font scale.

Colours, typography, spacing and motion remain sourced from mobile/src/theme, with existing Recoleta/Berthold mappings and preview fallback fonts. The 21st UI build workflow established .21st design context. Catalogue search returned HTTP 401, so no catalogue components were retrieved; existing project primitives were reused. Local `21st review` of the changed production paths reported 23 files and zero findings. Motion MCP transitions and accessibility documentation informed the native Reanimated implementation.

Frontend verification uses `make verify -o lint-backend -o test-backend -o check-types -o security`; backend lint/tests, unchanged generated API contracts and full security checks are omitted for this frontend-only task at the owner's request. ESLint and Jest discovery exclude generated native build folders so checking source does not traverse release build output.

Result: exit 0. ESLint and strict TypeScript passed (three existing CommonJS test-mock warnings), all 20 mobile suites / 202 tests passed, six audit-policy tests passed, and `make slop-check` passed. No backend tests ran.

No Android device/emulator was connected for this task. Native visual, keyboard and screen-reader acceptance remain pending; automated checks do not establish native layout correctness. The polished UI was rebuilt as 0.1.1, Android version code 2, from source commit af38ee4. Both signed APKs passed signature verification, the bundle contains the new upload copy and hosted API address, and the private-credential scan passed. Download publication is tracked in AndroidPreview.md.
