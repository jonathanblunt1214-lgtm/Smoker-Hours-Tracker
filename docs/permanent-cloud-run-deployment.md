# Permanent GitHub-to-Cloud Run deployment

Smoke Stack production releases are deployed from reviewed commits on `main`. GitHub Actions authenticates to Google Cloud with an OpenID Connect token and Workload Identity Federation. No Google password, API key, or service-account JSON key is stored in GitHub.

## Fixed production target

- Google Cloud project: `smoker-log-app` (`618104708054`)
- Cloud Run service: `smoke-stack`
- Region: `us-central1`
- Artifact Registry repository: `smokestack`
- GitHub repository: `jonathanblunt1214-lgtm/Smoker-Hours-Tracker`
- Authorized deployment ref: `refs/heads/main`

## One-time bootstrap

Cloud Shell authorization cannot be permanent. Sign in to Cloud Shell in your own browser, authorize `gcloud`, and run the bootstrap once from this branch:

```bash
cd ~/Smoker-Hours-Tracker
git fetch origin
git checkout fix/mobile-web-parity-updater
git pull --ff-only origin fix/mobile-web-parity-updater
bash scripts/bootstrap-cloudrun-github.sh
```

The script is idempotent: rerunning it verifies or updates the same named service accounts, Artifact Registry repository, workload identity pool/provider, and IAM bindings.

## Permanent release flow

1. ChatGPT/Codex prepares repository changes.
2. A reviewed pull request is merged to `main`.
3. GitHub Actions runs the trusted-runtime checks and production build.
4. GitHub exchanges its repository/ref-scoped OIDC token for short-lived Google credentials.
5. The immutable commit-tagged container is pushed to Artifact Registry and deployed to Cloud Run.
6. The workflow verifies `/api/health` before reporting success.
7. Installed PWAs read `/version.json` from the same Cloud Run origin and update automatically.

## Security boundary

The workload identity provider accepts only this repository on `refs/heads/main`. The deployer can publish images and manage Cloud Run, but it cannot sign in as a user. The Cloud Run runtime uses a separate service account for Vertex AI, Firestore, and Firebase Authentication. Disable future deployments by disabling the provider or removing the deployer service account's workload identity binding.
