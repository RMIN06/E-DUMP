# E-DUMP agent rules
Read docs/PRD.md, docs/Architecture.md, docs/UI.md, docs/MobileResponsiveness.md, docs/AntiAISlop.md before coding.
1. Stay strictly inside PRD.md scope. If a task is not in the PRD, do not build it; ask.
2. Never add dependencies not listed in docs/Tech Stack.md without asking.
3. All colours/spacing/type come from mobile/src/theme. No hex values elsewhere.
4. UI must pass docs/AntiAISlop.md. Run `make slop-check` before finishing any UI task.
5. Every backend route has an authorization check and a test (docs/Testing&Authentication.md).
6. Run `make verify` before declaring a task done; report the result.
7. Commit small. One feature per branch. No TODO/FIXME left behind.
8. If a requirement is ambiguous, stop and ask instead of guessing.
