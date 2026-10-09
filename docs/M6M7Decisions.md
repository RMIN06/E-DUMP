# Android preview decisions

Owner decisions, 9 October 2026:

- Complete M6 and M7 for Android. iOS is deferred.
- Commit and push 100 meaningful commits, superseding the earlier 110 target. No history padding.
- Publish an APK with bundled JavaScript and a hosted HTTPS API so testing needs neither Metro nor this PC.
- Platform fallback fonts are allowed for the test preview only. Production retains the licensed font gate.
- Render's free API and MongoDB Atlas free are approved. Render sleeps after 15 idle minutes; a cold start can take about a minute. This is a preview exception to the always-on host specification.
- Rules support, deletion and takedown contact is l250716@lhr.nu.edu.pk.
- Physical Android acceptance belongs to the owner after delivery. Pending acceptance is recorded honestly; this preview is not the final class rollout.

References: [Render free services](https://render.com/docs/free), [Atlas free limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/).
# First hosted preview decisions

- The owner approved a separate public `edump-apk` bucket containing only signed preview APKs.
- Firebase/Google Cloud repeatedly failed to load account resources. The owner approved publishing the first APK with push deferred; in-app Updates stays available.
- Atlas uses an API user restricted to `readWrite` on `edump`, and to the `edump-preview` cluster. Network access covers this PC and Render Singapore's two outbound ranges.
- Backend credentials are stored in Render's private environment and ignored local files, outside the APK and Git.
