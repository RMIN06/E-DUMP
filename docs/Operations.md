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

Keep the Android signing key and password from `%LOCALAPPDATA%/EDUMP-release` in an owner-controlled encrypted backup. All updates must use that key. Store Expo FCM service account credentials in EAS, not in the app. The APK contains only the API URL and public project identifiers.

If credentials leak: revoke refresh tokens, rotate JWT/R2/Atlas credentials, rebuild the backend secrets, and notify affected users through an admin announcement and the owner's email process within 72 hours of confirmation. Do not publish tokens or full-email logs. Retain service logs for at most 14 days.

The owner decides archive or wipe at semester end before either is executed. Until that decision, preserve active class content. Android preview delivery does not authorize sending classmates an onboarding message or destructive semester cleanup.
