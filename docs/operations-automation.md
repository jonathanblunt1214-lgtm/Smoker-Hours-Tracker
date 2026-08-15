# SmokeStack operations automation

Routine repository operations are automated while destructive or credential-sensitive actions remain owner controlled.

## Automated now

- Pull requests targeting `main` run install, lint/type checks, the CharGPT contract tests when present, and the production build.
- Safe same-repository `agent/*` and `codex/*` pull requests can squash-merge after all required checks pass.
- Dependabot opens weekly npm dependency pull requests. Patch updates may enable squash auto-merge; minor and major updates stay open for owner review.
- Cloud Run deploys from `main` and verifies `/api/health` after deployment.
- The production monitor checks Cloud Run twice each hour. A failed check opens or updates one GitHub issue; recovery closes it.
- Firestore exports run weekly and must pass a metadata read-back check before the workflow reports success.
- Android changes run web validation, Capacitor sync, unit tests, and a debug APK build. Successful APKs are retained as GitHub Actions artifacts for 14 days.

## Owner exceptions

Automation intentionally stops for:

- merge conflicts;
- failed or pending required checks;
- workflow, authentication, security, Firebase, deployment, signing, environment, constitution, or CharGPT-policy changes;
- minor or major dependency upgrades;
- database restore operations;
- production store publishing and signing approvals.

## Android publishing boundary

The native Android project is not currently present on `main`. An existing Android branch must first be reconciled and merged. Google Play publishing also requires:

1. an Android signing keystore and passwords stored as GitHub secrets;
2. a Google Play service account credential stored as a GitHub secret;
3. the application to exist in Google Play Console;
4. a protected GitHub environment for the production release approval.

Until those prerequisites are complete, the repository builds a debug APK but does not claim to publish an app.

## Backup boundary

The weekly backup workflow proves that Firestore export metadata exists and can be read back from Cloud Storage. It does not automatically restore production data. Restore drills remain explicit owner-approved operations because they can overwrite or duplicate live data and incur cost.
