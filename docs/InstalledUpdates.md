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
