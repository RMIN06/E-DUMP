# Preview operations

The API uses one worker and one instance. Its in-process upload and last-admin locks must not be bypassed by adding workers. Render runs the production Docker image and checks `/readyz`; MongoDB and private R2 hold all durable data. Render's ephemeral disk stores upload scratch files only.

## Backups and recovery

Install official MongoDB Database Tools. With backend secrets set privately, `bash scripts/backup.sh` creates a gzip mongodump archive under `backups/` in the private class bucket. It cleans local temporary files on success or failure and never prints the connection string. Schedule daily on a trusted runner. Configure the R2 lifecycle for the **backups/** prefix to expire archives after 30 days; never apply this rule to **files/**.

Restore drills use a disposable database only: download one private archive, run `mongorestore --archive=PATH --gzip --nsFrom='edump.*' --nsTo='edump_restore_drill.*'` using a private connection configuration, then compare subject/schedule counts and indexes. A backup contains metadata and account records; removed R2 file bytes cannot be recovered from a database archive. Do not use `--drop` against the live database. Remove local archives after the drill. Record the tested archive, date and outcome before final rollout.

## Credentials and incidents

Keep the Android signing key and password from `%LOCALAPPDATA%/EDUMP-release` in an owner-controlled encrypted backup. All updates must use that key. Store Expo FCM service account credentials in EAS, not in the app. The APK contains only the API URL and public project identifiers.

If credentials leak: revoke refresh tokens, rotate JWT/R2/Atlas credentials, rebuild the backend secrets, and notify affected users through an admin announcement and the owner's email process within 72 hours of confirmation. Do not publish tokens or full-email logs. Retain service logs for at most 14 days.

The owner decides archive or wipe at semester end before either is executed. Until that decision, preserve active class content. Android preview delivery does not authorize sending classmates an onboarding message or destructive semester cleanup.
