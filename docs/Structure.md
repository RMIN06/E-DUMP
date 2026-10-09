# Structure — E-DUMP

Monorepo, two apps, no shared packages. Types flow from backend OpenAPI to mobile via generation.

## 1. Repository tree

```
edump/
├─ AGENTS.md                      # Codex entry point (see §6)
├─ README.md                      # how to run, 30 lines max
├─ Makefile
├─ .gitignore
├─ docs/
│  ├─ PRD.md
│  ├─ Tech Stack.md
│  ├─ Architecture.md
│  ├─ Structure.md
│  ├─ UI.md
│  ├─ MobileResponsiveness.md
│  ├─ AntiAISlop.md
│  ├─ Security and Compliance.md
│  ├─ Testing&Authentication.md
│  └─ FinalVerdict.md
├─ scripts/
│  ├─ check-slop.sh               # see AntiAISlop.md
│  ├─ backup.sh                   # mongodump → R2
│  └─ gen-api-types.sh            # openapi.json → mobile/src/api/schema.d.ts
├─ backend/
│  ├─ pyproject.toml
│  ├─ uv.lock
│  ├─ Dockerfile
│  ├─ .env.example
│  ├─ app/
│  │  ├─ main.py                  # app factory, lifespan, middleware, router mounting
│  │  ├─ config.py                # Settings (pydantic-settings)
│  │  ├─ deps.py                  # get_db, get_current_user, require_admin
│  │  ├─ errors.py                # domain errors + exception handlers
│  │  ├─ logging.py
│  │  ├─ db/
│  │  │  ├─ client.py             # AsyncMongoClient lifecycle
│  │  │  └─ indexes.py            # ensure_indexes() called at startup
│  │  ├─ models/                  # Pydantic: documents + request/response schemas
│  │  │  ├─ user.py  subject.py  schedule.py
│  │  │  ├─ file.py  material.py  announcement.py
│  │  │  ├─ report.py  device.py  auth.py  common.py
│  │  ├─ repositories/            # one file per collection, Mongo queries only
│  │  ├─ services/
│  │  │  ├─ auth_service.py       # email check, tokens, rotation
│  │  │  ├─ user_service.py
│  │  │  ├─ material_service.py
│  │  │  ├─ announcement_service.py
│  │  │  ├─ report_service.py
│  │  │  ├─ admin_service.py
│  │  │  ├─ upload_validation.py  # ext/mime/magic/size/hash
│  │  │  └─ push_service.py       # Expo push batching + receipts
│  │  ├─ integrations/
│  │  │  ├─ r2.py                 # put/delete/presign
│  │  │  └─ expo_push.py
│  │  ├─ routers/
│  │  │  ├─ auth.py  me.py  subjects.py  schedule.py
│  │  │  ├─ materials.py  announcements.py  admin.py  health.py
│  │  └─ tasks/
│  │     └─ housekeeping.py
│  ├─ seeds/
│  │  ├─ subjects.json
│  │  ├─ schedule.json
│  │  └─ seed.py                  # idempotent; run via `make seed`
│  └─ tests/
│     ├─ conftest.py              # test DB, fake R2, fake push
│     ├─ unit/
│     ├─ integration/
│     └─ fixtures/                # tiny valid pdf/png/jpg/pptx/docx + spoofed files
└─ mobile/
   ├─ package.json
   ├─ app.config.ts               # name, slug, bundle ids, plugins (fonts, notifications)
   ├─ eas.json
   ├─ tsconfig.json
   ├─ .env.example
   ├─ assets/
   │  ├─ fonts/                   # Recoleta-Bold.otf, Berthold-*.otf (owner supplies)
   │  └─ icon.png  splash.png  adaptive-icon.png
   ├─ app/                        # Expo Router (routes only, thin)
   │  ├─ _layout.tsx              # providers, fonts, auth gate
   │  ├─ index.tsx                # redirect by session state
   │  ├─ (auth)/
   │  │  ├─ sign-in.tsx
   │  │  ├─ name.tsx                 # first-login display name
   │  │  └─ blocked.tsx
   │  ├─ (tabs)/
   │  │  ├─ _layout.tsx
   │  │  ├─ updates.tsx
   │  │  ├─ subjects.tsx
   │  │  ├─ schedule.tsx
   │  │  └─ me.tsx
   │  ├─ subject/[slug].tsx
   │  ├─ upload/[slug].tsx        # presented as modal
   │  ├─ material/[id].tsx
   │  ├─ updates/[id].tsx
   │  ├─ updates/new.tsx          # admin
   │  ├─ admin/users.tsx          # admin
   │  ├─ admin/reports.tsx        # admin
   │  └─ rules.tsx
   ├─ src/
   │  ├─ api/                     # client.ts, schema.d.ts (generated), hooks per resource
   │  ├─ auth/                    # session store, token refresh interceptor
   │  ├─ features/
   │  │  ├─ subjects/  materials/  announcements/  schedule/  admin/  notifications/
   │  │  │   (each: components/, hooks/, utils/ as needed)
   │  ├─ components/              # shared primitives only: Text, Heading, Row, Divider,
   │  │                           # Button, TextAction, Field, Sheet, Screen, EmptyState,
   │  │                           # ErrorLine, ProgressLine, TabLabel
   │  ├─ theme/
   │  │  ├─ tokens.ts            # the ONLY file with hex colours
   │  │  ├─ typography.ts
   │  │  ├─ spacing.ts
│  │  ├─ responsive.ts        # useSizeClass(): compact|regular|large|tablet + fontScale
   │  │  └─ motion.ts            # numbers sourced via motion.dev MCP
   │  ├─ lib/                    # format.ts (dates, sizes), files.ts (download/open), storage.ts, email.ts (client-side pattern mirror)
   │  └─ types/
   └─ __tests__/                 # mirrors src/
```

## 2. Naming conventions

| Thing | Convention |
|---|---|
| Python files, functions, variables | `snake_case`; classes `PascalCase`; constants `UPPER_SNAKE` |
| Mongo collections | plural `snake_case` |
| API JSON keys | `snake_case` (mobile maps nothing; it uses the generated types as-is) |
| TS files | components `PascalCase.tsx`, everything else `camelCase.ts`; Expo Router route files follow the router's naming |
| TS | `strict: true`, no `any`, no non-null `!` without a comment explaining why |
| Git branches | `feat/<area>-<short>`, `fix/<short>`; commits in imperative mood (`Add duplicate guard`) |

## 3. Layer and import rules

Backend: `routers → services → repositories/integrations`. No upward imports. `models` importable from anywhere. Settings only via `config.get_settings()`.

Mobile:
- `app/*` (routes) import from `src/features`, `src/components`, never from `src/api` internals directly except through hooks.
- `src/components` may import `src/theme` only.
- `src/features/*` may import `src/components`, `src/api`, `src/theme`, `src/lib`; features never import other features (lift shared code to `components` or `lib`).
- Hex colours, font sizes and spacing numbers appear **only** in `src/theme`. Everywhere else uses tokens.
- Route files stay under ~80 lines: they compose feature components.

## 4. Makefile targets

```
make dev-api       # uv run uvicorn app.main:app --reload
make dev-app       # npx expo start --dev-client
make seed          # uv run python seeds/seed.py
make gen-types     # scripts/gen-api-types.sh
make test          # backend pytest + mobile jest
make lint          # ruff + mypy + eslint + tsc --noEmit
make slop-check    # scripts/check-slop.sh
make verify        # lint + test + slop-check (must pass before any PR/commit)
```

## 5. Environment files

`backend/.env`, `mobile/.env` are git-ignored. `.env.example` files list every variable with a one-line comment and no real values. Fonts in `mobile/assets/fonts` are licensed files: commit them only to a **private** repository.

## 6. AGENTS.md (create this first; Codex reads it)

```
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
```
