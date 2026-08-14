# Mobile/web release parity

Smoke Stack ships one responsive web client. The supported no-manual-update mobile path is the installed Progressive Web App (PWA), which uses the same deployed assets, Firebase account boundary, navigation, and release manifest as the desktop web app.

## Release flow

1. `npm run build` generates `public/version.json` and `src/generated/release.ts` from `package.json` plus the Git commit.
2. The deployment publishes the hashed Vite assets, service worker, manifest, icons, and `version.json` together.
3. Installed clients check `version.json` at startup, when the app regains focus/connectivity, and every 15 minutes.
4. A newer deployed build refreshes automatically unless a New Cook form is active. An active form gets an update banner so the user can save before refreshing.
5. Application refresh only changes client code. It never force-aligns, merges, or overwrites account data.

## Android launcher

The PWA manifest now points to the Smoke Stack launcher assets in `public/`. `assets/icon.png` and `assets/icon-maskable.png` are the source images for native packaging.

The existing blue launcher image is Capacitor's default asset. It cannot be changed on an already-installed APK without installing a replacement once. Install Smoke Stack from the deployed site's browser install action to replace that wrapper with the branded, automatically updating PWA.

If a Google Play wrapper is later required, package the deployed PWA as a Trusted Web Activity and verify it with Digital Asset Links. The signing certificate fingerprint must come from the actual release key; do not commit a guessed `assetlinks.json`. A Capacitor `server.url` override is intentionally not used because Capacitor documents that option as live-reload-only and not for production.

## Release metadata rules

- `package.json.version` is the displayed client version.
- `package.json.smokestack.buildNumber` is the monotonically increasing release build.
- The Git commit is the build ID.
- Do not label the app `0.03A` until the update directive's implementation and release gates pass.
- Account sync (Firestore), backup (Google Drive), and app-code release status remain separate operations.
