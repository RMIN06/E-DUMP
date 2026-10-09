# Tech Stack — E-DUMP

Rule for versions: use the **latest stable** release of each tool at build time, pin exact versions in lockfiles (`package-lock.json` / `uv.lock`), and do not upgrade major versions mid-project. Do not copy version numbers from memory; read them from the registry when scaffolding.

---

## 1. Summary

| Layer | Choice | Why |
|---|---|---|
| Mobile | React Native with Expo (development builds via EAS), TypeScript strict, Expo Router | One codebase for Android + iOS, owner's choice |
| Backend | Python 3.12, FastAPI, Pydantic v2 | Owner's choice |
| Database | MongoDB (Atlas M0 free cluster), PyMongo **async** API | Owner's choice; 60 users fit easily |
| File storage | **Cloudflare R2** (S3-compatible, private bucket) | 10 GB free, no egress fees, presigned download URLs |
| Auth | Student email pattern check → backend issues own JWT + rotating refresh token | Owner's choice: email-only login, no third-party provider |
| Push | Expo Push Notifications service | No Firebase/APNs plumbing in our code; works on both platforms |
| Hosting (API) | Docker container on Fly.io or Railway (hobby tier) | Always-on, cheap, portable |
| Builds | EAS Build (`preview` profile → APK, `production` → iOS/TestFlight) + EAS Update for JS fixes | Standard Expo path |
| UI motion | **motion.dev MCP** as the design/spec source, implemented with **React Native Reanimated** | See §4 |

## 2. Mobile dependencies

Core: `expo`, `expo-router`, `react-native`, `typescript`, `expo-dev-client`, `expo-constants`.

| Concern | Package | Notes |
|---|---|---|
| Server state | `@tanstack/react-query` + `@tanstack/query-async-storage-persister` | Caching, pagination, offline reads |
| Local state | `zustand` | Only auth session and tiny UI state |
| Forms and validation | `react-hook-form`, `zod`, `@hookform/resolvers` | Upload form, announcement form |
| API client | thin `fetch` wrapper + types generated with `openapi-typescript` from FastAPI's OpenAPI | No hand-written DTO drift |
| Secure storage | `expo-secure-store` | Refresh token only |
| Push | `expo-notifications`, `expo-device` | Token registration + tap handling |
| File pick | `expo-document-picker`, `expo-image-picker` | |
| File IO | `expo-file-system`, `expo-sharing`, `expo-intent-launcher` | Download to cache, open in system viewer |
| Images | `expo-image` | Cached avatars and image previews |
| Animation | `react-native-reanimated`, `react-native-gesture-handler` | |
| Icons | `lucide-react-native`, `react-native-svg` | Stroke 1.5, used sparingly |
| Fonts | `expo-font` (config plugin), local files in `mobile/assets/fonts` | Recoleta + Berthold, see `UI.md` |
| Dates | `date-fns`, `date-fns-tz` | Fixed zone `Asia/Karachi` |
| Native due-date input | `@react-native-community/datetimepicker` | Owner-approved M4 addition, Expo-compatible version |
| Offline cache | `@react-native-async-storage/async-storage` | Query persistence |
| Lint/format | `eslint` (expo config + custom slop rules), `prettier` | |
| Tests | `jest`, `jest-expo`, `@testing-library/react-native`, `maestro` (E2E) | See `Testing&Authentication.md` |

Explicitly **not** used: Redux, NativeWind/Tailwind, UI kits (React Native Paper, NativeBase, Tamagui, gluestack), Lottie, `expo-linear-gradient`, `expo-blur`, Firebase SDK, Google Sign-In, Axios, any analytics SDK.

## 3. Backend dependencies

| Concern | Package |
|---|---|
| Framework | `fastapi`, `uvicorn[standard]` |
| Models/config | `pydantic`, `pydantic-settings` |
| MongoDB | `pymongo` (use `AsyncMongoClient`; do not use the deprecated Motor package) |
| JWT | `PyJWT` |
| Object storage | `boto3` (S3 API against R2; sync calls wrapped with `anyio.to_thread`) |
| File sniffing | `filetype` (magic bytes) |
| HTTP client (Expo push) | `httpx` |
| Rate limiting | `slowapi` |
| Multipart | `python-multipart` |
| Packaging | `uv` |
| Quality | `ruff` (lint + format), `mypy --strict`, `pytest`, `pytest-asyncio`, `pytest-cov`, `httpx` (test client), `respx` |

Not used: Celery, Redis, SQL/ORMs, Beanie/ODMantic, GraphQL, websockets.

## 4. Important note on motion.dev and React Native

motion.dev (Motion for JS/React/Vue) targets the web DOM and does **not** run natively inside React Native. Therefore:

1. Use the **motion.dev MCP** to design and tune motion: durations, springs, easing curves, stagger values, enter/exit choreography. Record the final numbers in `mobile/src/theme/motion.ts`.
2. Implement them with **Reanimated** (`withTiming`, `withSpring`, `Easing.bezier`, `entering`/`exiting` layout animations). Convert Motion spring parameters (stiffness, damping, mass) one-to-one into Reanimated's `withSpring` config.
3. Do not add a web renderer or `framer-motion`/`motion` package to the mobile app.

## 5. Infrastructure

| Item | Setup |
|---|---|
| MongoDB Atlas | M0 cluster, one database `edump`, user with readWrite on that database only, IP allowlist = hosting provider egress IPs (or 0.0.0.0/0 with strong credentials if the host has dynamic IPs; document the choice) |
| Cloudflare R2 | Bucket `edump-files`, **private**, no public access, API token scoped to this bucket, lifecycle rule deletes incomplete multipart uploads after 1 day |
| API host | Single container, 1 instance, region closest to Lahore with acceptable latency (Singapore/Mumbai-class region). Health check `GET /healthz` |
| Domain | Optional. Fly/Railway default domain is fine for v1; HTTPS mandatory |
| Expo/EAS | Project under the owner's Expo account, `eas.json` with `development`, `preview` (APK), `production` |
| Apple | Apple Developer Program account required for TestFlight and push on iOS |

## 6. Environment variables

Backend (`backend/.env`, never committed; `backend/.env.example` committed):

```
APP_ENV=development|production
MONGODB_URI=
MONGODB_DB=edump
JWT_SECRET=                 # 32+ random bytes, base64
ACCESS_TOKEN_TTL_MIN=15
REFRESH_TOKEN_TTL_DAYS=30
ALLOWED_EMAIL_REGEX=^l25\d{4}@lhr\.nu\.edu\.pk$   # full match after trim + lowercase
ADMIN_EMAILS=               # comma separated, seeded as admins on first run
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=edump-files
MAX_UPLOAD_MB=25
DOWNLOAD_URL_TTL_SEC=600
EXPO_PUSH_ACCESS_TOKEN=     # optional, enhanced push security
```

Mobile (`mobile/.env`, exposed values only, prefixed `EXPO_PUBLIC_`):

```
EXPO_PUBLIC_API_BASE_URL=
```

No secret ever goes into an `EXPO_PUBLIC_` variable.

## 7. Dev environment

- Node LTS, Python 3.12, `uv`, Docker (for local MongoDB in tests), EAS CLI, Android Studio emulator, Xcode (macOS only) or a physical iPhone via TestFlight.
- One command per task: `make dev-api`, `make dev-app`, `make test`, `make lint`, `make slop-check` (see `Structure.md`).
