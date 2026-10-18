# Installed preview updates

Android preview 0.1.7 is the first bootstrap APK with `expo-updates`. Install it once over the previous signed preview. It checks the EAS `preview` channel at startup and when returning to the foreground, with foreground checks spaced at least five minutes apart. Downloaded compatible updates show an in-app notice. Restart is enabled only on the four read-only tab roots; forms and uploads are never interrupted. A downloaded update can also apply at the next cold start. Offline failures retain the last working app.

For future compatible JavaScript/UI changes, commit and verify the code, then run:

```powershell
./scripts/publish-android-update.ps1 -Message "Describe the completed fix"
```

The script exports Android with one worker into a separate ignored directory, preserving the browser export and original font mapping. It uses the existing Expo account and project; no application secrets enter the bundle. Check the resulting update group and channel before reporting publication.

The current runtime is `edump-android-1`. Native dependencies, Expo SDK upgrades, native plugins or runtime configuration changes require a new runtime string and signed APK before publishing updates for that runtime. Never publish incompatible native changes to the old runtime. The first verified update group is `2e3ed5e8-950d-48ca-89e1-989e043d7fcc`, Android update `01a12a15-501f-7b50-9c12-672400db280d`.

The Home Screen/browser app checks its service worker on opening, foregrounding and reconnecting. A newly downloaded shell waits for the same safe restart action; a fully closed app can activate it on reopening. Keep the existing Home Screen icon. Native Android installation and iPhone delivery/apply acceptance remain physical-device checks for the owner. App-update notices appear inside the app when it checks; they are separate from class-content push alerts.

## Published compatible update - 17 October 2026

Installed Android 0.1.7 / code 8 receives session persistence and text-flow fixes through the existing preview channel and edump-android-1 runtime. No replacement APK is needed. Update group: a86bd0fa-089e-4b4e-874a-1d5b11ffc8ee. Android update: 01a14ac1-ede1-7d6d-b303-5648bad08af6. The live Expo manifest returned that update for the existing runtime, and its exported bundle passed the actual private-credential scan. Open online and use Restart to update on a read-only tab, or reopen after the update downloads. Physical Android update/apply and iPhone Safari acceptance remain owner device checks.

The web shell is edump-shell-2026-10-17 at the existing Pages URL. It retains the same Home Screen installation and safe restart flow. The live update restart and a separate full reload restored the owner's existing signed-in profile. If an older version already removed a credential during a connection failure, one successful sign-in is needed to save it again. See WebPreview.md for verification and the recovery behavior.

## Deadline expiry and 24-hour reminders - 18 October 2026

The API runs source 2e7741f (including expiry 5eaddb4 and reminder service 5879bae); Render reported Deploy succeeded/Live. Every dated alert expires from lists and unread counts at its deadline, including pinned records. Internal records and attachments remain. The owner selected the existing API timer for all four alert types and accepted late reminders after idle sleep. Checks run at startup and each minute while running, using durable per-deadline claims, existing enabled-device/account filtering and announcement deep links. Expired alerts and newly posted alerts already inside the final 24 hours are skipped. Late reminders use accurate less-than-one-day copy. Delivery remains best effort; see Operations.md for claim/provider failure semantics.

Android 0.1.7 / code 8 remains the bootstrap APK; runtime edump-android-1 and preview channel are unchanged. Final source c1581df also anchors client expiry timers to the actual clock when later query data arrives. OTA group 8e09c6ff-9b4a-48ba-b12a-775ee4cbf0a8, Android update 01a14b5c-52b0-7f20-ab67-b723994de32b, supersedes the initial deadline release. The live Expo manifest served that final ID/runtime and the final Android export passed the actual private-credential scan. No native rebuild or replacement APK was made.

The companion at https://edump-preview.pages.dev uses shell edump-shell-2026-10-18.1 and the final export. Published HTML equality, actual credential scans, security headers and anonymous profile rejection passed. The signed-in live web check retained the session through safe restart and confirmed the previously displayed expired alert left Updates. No test announcements or class-wide test push messages were created.

make verify completed with exit 0: 252 backend tests, 232 initial app tests, 15 edge/audit tests, lint, types, schema, slop, Python audit, secret scan and accepted npm audit policy. After the final clock regression, make verify -o lint-backend -o test-backend -o check-types completed with exit 0, reusing the unchanged backend/schema checks and passing 233 app tests plus the remaining checks. Existing tooling exceptions still expire 8 November 2026. Evidence is under ignored artifacts/release/verify-2026-10-18.log and verify-clock-2026-10-18.log. Physical Android OTA application and Android/iPhone push receipt remain owner acceptance.

## Browser upload correction - 18 October 2026

MAT-4 / ANN-1, source e58f822 with complete typed regression metadata in 5cff0d5: preserve the document picker's browser File and append it directly to multipart FormData for material batches and announcement attachments. Upload no longer fetches the selected local object URL. A missing browser File asks for reselection; Android retains its existing native URI descriptor. Browser file size can use the picker File metadata. Original filename, progress, cancellation, server validation, batch retry and authorization behavior remain. No dependency, backend, native configuration or Content Security Policy changes were made.

Live browser diagnosis reproduced Failed to fetch using a deliberately invalid local PDF probe. With the published fix, selecting the same probe reached server-side content validation and returned The file type does not match its contents instead. The probe created no class material, R2 object or class notification. Valid-file multipart success is covered by the transport regression; physical Android/iPhone acceptance remains separate.

The final scoped make verify -o lint-backend -o test-backend -o check-types returned exit 0: 235 app tests, 15 edge/audit tests, lint/strict TypeScript, slop, Python audit, secret scan and accepted npm audit policy. Unchanged backend and generated-schema checks reuse the successful full 18 October verification. The initial gate caught missing lastModified in a test fixture; 5cff0d5 repaired it before final verification. Actual private-credential export scans, published web HTML equality, security headers and anonymous profile rejection passed.

Web shell edump-shell-2026-10-18.2 is live at https://edump-preview.pages.dev. Android OTA group d26863b8-67fb-45d2-850f-ea75ccc98503 / update 01a14e1c-b8e4-7616-ada7-5617d50070b7 is served on preview for edump-android-1; the live manifest matched. Installed Android 0.1.7 needs no replacement APK. Close an existing upload form, use Restart to update from a read-only tab, then select the files again.
