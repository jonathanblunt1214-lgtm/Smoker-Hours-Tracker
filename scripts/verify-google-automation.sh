#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-smoker-log-app}"
REGION="${REGION:-us-central1}"
POOL_ID="${POOL_ID:-github}"
PROVIDER_ID="${PROVIDER_ID:-smokestack}"
DEPLOYER_EMAIL="${DEPLOYER_EMAIL:-smokestack-github@${PROJECT_ID}.iam.gserviceaccount.com}"
RUNTIME_EMAIL="${RUNTIME_EMAIL:-smokestack-runtime@${PROJECT_ID}.iam.gserviceaccount.com}"
BACKUP_BUCKET="${BACKUP_BUCKET:-${PROJECT_ID}-firestore-backups}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-jonathanblunt1214-lgtm/Smoker-Hours-Tracker}"

project_number="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
expected_condition="assertion.repository=='${GITHUB_REPOSITORY}' && assertion.ref=='refs/heads/main'"

gcloud iam service-accounts describe "${DEPLOYER_EMAIL}" --project="${PROJECT_ID}" >/dev/null
gcloud iam service-accounts describe "${RUNTIME_EMAIL}" --project="${PROJECT_ID}" >/dev/null
provider_condition="$(gcloud iam workload-identity-pools providers describe "${PROVIDER_ID}" \
  --project="${PROJECT_ID}" \
  --location=global \
  --workload-identity-pool="${POOL_ID}" \
  --format='value(attributeCondition)')"
if [[ "${provider_condition}" != "${expected_condition}" ]]; then
  echo "Unexpected workload identity condition: ${provider_condition}" >&2
  exit 1
fi

project_roles="$(gcloud projects get-iam-policy "${PROJECT_ID}" \
  --flatten='bindings[].members' \
  --filter="bindings.members:serviceAccount:${DEPLOYER_EMAIL}" \
  --format='value(bindings.role)')"
for required_role in \
  roles/artifactregistry.writer \
  roles/datastore.importExportAdmin \
  roles/datastore.indexAdmin \
  roles/firebase.viewer \
  roles/firebaserules.admin \
  roles/run.admin \
  roles/serviceusage.serviceUsageConsumer
do
  if ! grep -Fxq "${required_role}" <<<"${project_roles}"; then
    echo "Missing deployer role: ${required_role}" >&2
    exit 1
  fi
done

gcloud run services describe smoke-stack \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format='value(status.url)'
gcloud firestore databases describe \
  --project="${PROJECT_ID}" \
  --database='(default)' \
  --format='value(name,locationId,type)'
gcloud storage buckets describe "gs://${BACKUP_BUCKET}" --project="${PROJECT_ID}" >/dev/null

bucket_admins="$(gcloud storage buckets get-iam-policy "gs://${BACKUP_BUCKET}" \
  --flatten='bindings[].members' \
  --filter='bindings.role:roles/storage.admin' \
  --format='value(bindings.members)')"
for required_principal in \
  "serviceAccount:${DEPLOYER_EMAIL}" \
  "serviceAccount:service-${project_number}@gcp-sa-firestore.iam.gserviceaccount.com"
do
  if ! grep -Fxq "${required_principal}" <<<"${bucket_admins}"; then
    echo "Missing backup bucket principal: ${required_principal}" >&2
    exit 1
  fi
done

echo "Verified project ${PROJECT_ID} (${project_number})."
echo "Verified keyless GitHub provider, deployer/runtime service accounts, Cloud Run, Firestore, and backup bucket."
