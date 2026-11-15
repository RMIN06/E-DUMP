# Preview operations

The API uses one worker and one instance. Its in-process upload and last-admin locks must not be bypassed by adding workers. Render runs the production Docker image and checks `/readyz`; MongoDB and private R2 hold all durable data. Render's ephemeral disk stores upload scratch files only.

## Backups and recovery

Install official MongoDB Database Tools. With backend secrets set privately, `bash scripts/backup.sh` creates a gzip mongodump archive under `backups/` in the private class bucket. It cleans local temporary files on success or failure and never prints the connection string. Schedule daily on a trusted runner. Configure the R2 lifecycle for the **backups/** prefix to expire archives after 30 days; never apply this rule to **files/**.

For this free preview, Windows task **E-DUMP Preview Database Backup** runs `scripts/backup-preview.ps1` daily at 02:00 Asia/Karachi with the owner's signed-in session. It uses the ignored `%LOCALAPPDATA%/EDUMP-release/preview.env`, official database tools and the locked Python environment. Missed starts run when available; failures retry twice at 15-minute intervals. The PC must be on, connected and on its Atlas-approved network. This is not an always-on backup runner; move scheduling to an always-on trusted runner before final class rollout. The runner passed a live backup on 9 October 2026 (`backups/2026/10/09/184452.archive.gz`). Private runner logs expire locally after 14 days.

The owner approved and enabled the Cloudflare lifecycle rule **Expire database backups after 30 days**, scoped exactly to **backups/** on the private `edump-files` bucket. Its existing one-day incomplete upload abort rule remains enabled. No expiry applies to class uploads.

Restore drills use a disposable database only: download one private archive, run `mongorestore --archive=PATH --gzip --nsFrom='edump.*' --nsTo='edump_restore_drill.*'` using a private connection configuration, then compare subject/schedule counts and indexes. A backup contains metadata and account records; removed R2 file bytes cannot be recovered from a database archive. Do not use `--drop` against the live database. Remove local archives after the drill. Record the tested archive, date and outcome before final rollout.

`uv run python scripts/restore_drill.py backups/...archive.gz` performs this comparison against a fresh database on local MongoDB (default port 27018). It rejects remote restore targets and removes only the database it creates. On 9 October 2026, `backups/2026/10/09/182057.archive.gz` restored successfully: all nine collection counts and index definitions matched Atlas. The compressed archive remained in private R2; local temporary files and the drill database were removed.

## Credentials and incidents

Android push was configured on 10 October 2026. Firebase project `e-dump-android-preview` uses the Spark free plan with Analytics disabled; Cloud Messaging API v1 is enabled (sender ID `234816031605`). Android package `com.edump.bcs3e` is registered. Its public client configuration is supplied through ignored `mobile/google-services.json` for native builds. Expo project `rmin06s-team/e-dump` (`37e1b246-6c7a-4c9c-926b-7a0be8095b02`) has the FCM v1 service credential assigned to this Android identifier.

Dedicated identity `edump-expo-push` has only the Firebase Cloud Messaging API Admin role on that Firebase project. Its private JSON key lives outside the repository in the owner's private release directory and in Expo's credential store. It is not an Android signing key and cannot operate the class database or R2 bucket. Google OAuth and an FCM v1 `validate_only` request passed without sending a notification. Real delivery and tap navigation remain for the owner's physical-phone acceptance.

The app asks for notification permission after sign-in, registers enabled devices, supports the Me notification switch, unregisters on sign-out and opens the corresponding update from a notification tap. Admin-created updates notify other active users' enabled devices; the posting admin's devices are excluded. Edit notifications require the existing Notify again switch. Expo tickets reject/prune unregistered devices; delivery failures do not undo a published announcement.

Class alerts use high delivery priority and the registered `default` Android channel. Expo's default priority is normal on Android, which can defer delivery while a phone sleeps; high priority supports ANN-3's timely class alerts. Provider acceptance does not certify a physical phone's receipt.

Keep the Android signing key and password from `%LOCALAPPDATA%/EDUMP-release` in an owner-controlled encrypted backup. All updates must use that key. Store Expo FCM service account credentials in EAS, not in the app. The APK contains only the API URL and public project identifiers.

If credentials leak: revoke refresh tokens, rotate JWT/R2/Atlas credentials, rebuild the backend secrets, and notify affected users through an admin announcement and the owner's email process within 72 hours of confirmation. Do not publish tokens or full-email logs. Retain service logs for at most 14 days.

The owner decides archive or wipe at semester end before either is executed. Until that decision, preserve active class content. Android preview delivery does not authorize sending classmates an onboarding message or destructive semester cleanup.

## Deadline expiry and reminders - 18 October 2026

ANN-8 removes due_at <= now from all update feed queries before cursor pagination and from unread counts. Clients also expire their cached rows at the next deadline and refresh that clock on foreground, including active-session offline reads. Undated notices remain; database records, attachments and authorized direct links are preserved.

ANN-9 checks all four dated alert types at API startup and every 60 seconds while running. The owner declined a separate scheduler and accepts late reminders after free-host sleep. A reminder is eligible once due_at - 24 hours is reached and before due_at; an alert created after that threshold gets its normal creation notification only. Catch-up reminders say less than one day remains. Reminders reuse existing other-active-users/enabled-device delivery and announcement deep links, with provider TTL capped at the remaining time. No new endpoints, credentials, dependencies or collections are needed.

The announcements collection stores internal reminded_deadlines UTC dates. Atomic conditional claims prevent repeated broadcast across concurrent checks and process restarts. Edits preserve these markers; a different due time is eligible separately, but switching back to an already reminded deadline is not. Claims happen before contacting providers: delivery is best effort, and an ambiguous provider failure or process interruption after claiming can lose that reminder rather than broadcast it twice. Provider failures remain logged without sensitive payloads. Expired deadlines are skipped on wakeup.

The free-service sleep behavior follows https://render.com/docs/free. Expo TTL semantics follow https://docs.expo.dev/push-notifications/sending-notifications/. Physical notification receipt remains device acceptance; automated tests use fake providers and never broadcast test alerts to classmates.


## Best-effort free API availability - 15 November 2026

Owner requested scheduled traffic to reduce Render idle sleep while retaining zero-cost hosting. The API availability GitHub workflow requests the public /healthz endpoint every ten minutes and supports a manual run. It uses no secrets, signs in as nobody, reads no class records and makes no database writes. The request permits a 75-second cold start and one bounded retry, and rejects non-JSON/error health responses. Failed runs appear in GitHub Actions; notification delivery follows the owner's GitHub settings.

This reduces idle gaps only while schedules execute. GitHub can delay schedules or disable inactive scheduled workflows; Render can still restart, throttle or suspend a free service. No always-on or outage-free guarantee is implied. Logs alone do not count as inbound traffic. Investigate readiness, database reachability and Render ingress whenever the health workflow fails; do not automatically redeploy or disable security controls.

Colleague revision d0336cf was fetched and inspected. It includes a 75-second login timeout, adjusted shared-IP login quotas, and two-minute active-client synchronization with outage backoff. On 15 November, public API health and database readiness returned 200; the web proxy returned 401 for anonymous profile access and 422 for an invalid-email login with the correct Origin header. These checks establish current reachability, not the deployed backend revision or successful student authentication.

Android preview OTA group 1d287009-896c-4943-9923-b7afe792eb9b was published from b2e92ce, containing d0336cf. The public preview manifest independently returned update 01a1df05-becd-7104-8d40-09e488150c6d for runtime edump-android-1. Existing compatible installations can download this update without another APK. Session tests (32), live-sync tests (2), and web worker tests (9) passed. GitHub Verify run 43708849790 passed backend, mobile, slop and security jobs; manually dispatched API availability run 43710192404 passed. Local make verify could not start because make is absent.

The provided compiled web folder contains 27 files, no sourcemaps, and a worker matching source after line-ending normalization. Web and Android exports passed credential-pattern scans; prior private credential files were unavailable for exact-value comparison. The prepared web ZIP is ignored at artifacts/release/edump-web-d0336cf-2026-11-15.zip.

Browser access recovered after extension reinstallation. Render deployment dep-dbspr9rl550s73950mgg succeeded at 16:56 Asia/Karachi on 15 November, running bce616e (a descendant containing all d0336cf fixes). Its dashboard reports Deploy succeeded | Live, and startup readiness checks returned 200. Public health/readiness and curl-based web login validation passed afterward.

After the owner restored Cloudflare sign-in and the extension's local-file upload permission, all 27 files uploaded and Cloudflare reported production deployment Success for https://edump-preview.pages.dev on 15 November. The public HTML, app script and service worker matched the prepared d0336cf release byte-for-byte. The live browser opened the student sign-in screen; public API health/readiness returned status ok and an invalid-email login through the web proxy returned the expected 422 invalid_email response. No student account was created and no class records were modified by these checks. Web, Android OTA and API publication are now confirmed; actual student sign-in and device notification receipt remain user acceptance, and free-host availability limitations still apply.

### Follow-up login interruption and recovery - 15 November 2026

The owner reported immediate login failures on Android and web after publication. The open browser showed the error; retrying its existing login reached Updates, and the owner confirmed the phone also opened afterward. A separate owner-account API probe returned 200 and its new probe session was revoked with 204. The current API login logs contained successful retries but did not establish the cause of the earlier interruption; do not describe idle sleep as the proven sole cause. No restart was needed for this recovery.

Only the manually dispatched GitHub health run had executed when the follow-up was investigated, despite the workflow being active. The dependency-free Cloudflare Worker edump-api-availability now has a persisted */5 * * * * Cron trigger, verified after reloading settings. scripts/api-availability-worker.mjs requests only public /readyz, permits 75 seconds for startup, checks JSON readiness, and logs no account details or credentials. It has no data bindings or HTTP handler and uses the existing Workers Free account. Configuration is verified; the first production Cron execution was not yet observed. Propagation can take time. GitHub remains a secondary best-effort check. This does not alter the owner-selected announcement reminder timer.

Login transport now retries only transient failures for /auth/login, with 5/15/30-second backoffs and an overall 90-second budget. Non-JSON gateway responses become typed errors. Account, validation, permission and rate-limit refusals are not retried; uploads, other writes and refresh-token rotation remain single-shot. A lost successful login response can leave an additional independent session until normal expiry, so the retry count is bounded and existing login quotas are unchanged.

Android preview OTA group 1e398543-b228-46c0-bd8f-15f1a2e2468e (update 01a1df45-0de9-7748-a706-298485930937, runtime edump-android-1) was published from 2dcc4f8 and independently verified through its public manifest. The matching web build was published successfully and its public HTML, JavaScript and new service worker matched local output byte-for-byte. The Home Screen shell version advances so installed web companions can offer a safe update notice. No APK installation is required.

Validation: 51 transport/session tests, 9 web worker tests, TypeScript and focused ESLint passed; the scheduler source passed a live readiness call under Node. GitHub Verify run 43716067390 passed for the shipped revision. Local make verify was attempted but could not start because Make is not installed. Simulated tests cover cold-start HTML/503/network recovery, the 90-second limit, refusal handling and single-shot refresh. Real hosting/network outages can still exceed the recovery window; uninterrupted free-host availability is not guaranteed.
