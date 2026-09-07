#!/usr/bin/env bash
set -euo pipefail

# Metadata/IAM only. This script never reads or creates a secret value/version.
project='smoker-log-app'
runtime='smokestack-runtime@smoker-log-app.iam.gserviceaccount.com'
gcloud services enable secretmanager.googleapis.com --project="${project}"
gcloud iam service-accounts describe "${runtime}" --project="${project}" >/dev/null
secrets="$(gcloud secrets list --project="${project}" --filter='name:NVIDIA_API_KEY' --format='value(name)')"
if ! printf '%s\n' "${secrets}" | grep -Eq '(^|/)NVIDIA_API_KEY$'; then
  gcloud secrets create NVIDIA_API_KEY --project="${project}" --replication-policy=automatic
fi
gcloud secrets add-iam-policy-binding NVIDIA_API_KEY --project="${project}" \
  --member="serviceAccount:${runtime}" --role=roles/secretmanager.secretAccessor >/dev/null
echo 'Secret container and runtime access prepared. Add an enabled NVIDIA_API_KEY version in Secret Manager before production deployment.'
