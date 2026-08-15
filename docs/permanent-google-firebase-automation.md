# Permanent Google Cloud and Firebase automation

Smoke Stack does not retain a personal Google password, OAuth refresh token, service-account key, or Cloud Shell session. GitHub Actions receives short-lived Google credentials through Workload Identity Federation, restricted to this repository and `refs/heads/main`.

## Automated operations

- Every push to `main` verifies, builds, publishes, and deploys the reviewed app to Cloud Run.
- Changes to `firestore.rules`, `firestore.indexes.json`, or `firebase.json` are tested with the Firestore emulator and deployed from `main`.
- The default Firestore database is exported every Sunday at 07:17 UTC and can also be backed up with a manual workflow dispatch.
- Pull requests test the application and enforce cross-account Firestore isolation before merge.

The workflows use `smokestack-github@smoker-log-app.iam.gserviceaccount.com`. It receives narrowly scoped deployment, Firebase Rules, Firestore index, and Firestore export roles. It is not an Owner and cannot impersonate a personal Google account.

## One-time authorization update

Before merging the workflow that introduces Firebase configuration deployment and backups, run the updated bootstrap once from a clean clone of its branch:

```bash
bash scripts/bootstrap-cloudrun-github.sh
bash scripts/verify-google-automation.sh
```

The bootstrap is idempotent. It enables the required APIs, updates the existing keyless provider, grants the required scoped roles, and creates `gs://smoker-log-app-firestore-backups` with uniform bucket-level access.

## Backup behavior and recovery

Backups are managed Firestore exports. Google bills managed exports as document reads, and billing must be enabled for the project. This repository intentionally does not delete backups automatically. Add a reviewed retention policy later if storage growth requires it.

Recovery is intentionally not automatic because importing an export can overwrite database state. Select the exact backup and run a reviewed, manually approved import procedure.

## Security boundaries

- Only GitHub's `main` branch can exchange an OIDC token for the deployer identity.
- GitHub stores no Google service-account JSON key.
- Runtime access remains separate in `smokestack-runtime@smoker-log-app.iam.gserviceaccount.com`.
- Firestore client access remains restricted to `/users/{authenticatedUid}` and descendants.
- Console-only or personal-account actions remain one-time human approvals; repeatable project work belongs in reviewed workflows.
