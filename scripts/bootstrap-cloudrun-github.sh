#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-smoker-log-app}"
PROJECT_NUMBER="${PROJECT_NUMBER:-}"
REGION="${REGION:-us-central1}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-jonathanblunt1214-lgtm/Smoker-Hours-Tracker}"
POOL_ID="${POOL_ID:-github}"
PROVIDER_ID="${PROVIDER_ID:-smokestack}"
ARTIFACT_REPOSITORY="${ARTIFACT_REPOSITORY:-smokestack}"
BACKUP_BUCKET="${BACKUP_BUCKET:-${PROJECT_ID}-firestore-backups}"
BACKUP_LOCATION="${BACKUP_LOCATION:-us-central1}"
DEPLOYER_NAME="${DEPLOYER_NAME:-smokestack-github}"
RUNTIME_NAME="${RUNTIME_NAME:-smokestack-runtime}"

DEPLOYER_EMAIL="${DEPLOYER_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
RUNTIME_EMAIL="${RUNTIME_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

active_account="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n 1)"
if [[ -z "${active_account}" ]]; then
  echo "No active gcloud account. Authorize Cloud Shell, then run this script again." >&2
  exit 1
fi

actual_project_number="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
if [[ -n "${PROJECT_NUMBER}" && "${actual_project_number}" != "${PROJECT_NUMBER}" ]]; then
  echo "Project number mismatch: expected ${PROJECT_NUMBER}, received ${actual_project_number}." >&2
  exit 1
fi
PROJECT_NUMBER="${actual_project_number}"

echo "Configuring ${PROJECT_ID} as ${active_account}..."
gcloud config set project "${PROJECT_ID}"
gcloud services enable \
  artifactregistry.googleapis.com \
  compute.googleapis.com \
  firebase.googleapis.com \
  firebaserules.googleapis.com \
  firestore.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  identitytoolkit.googleapis.com \
  run.googleapis.com \
  storage.googleapis.com \
  sts.googleapis.com \
  aiplatform.googleapis.com

if ! gcloud iam service-accounts describe "${DEPLOYER_EMAIL}" >/dev/null 2>&1; then
  gcloud iam service-accounts create "${DEPLOYER_NAME}" \
    --display-name="Smoke Stack GitHub deployer"
fi

if ! gcloud iam service-accounts describe "${RUNTIME_EMAIL}" >/dev/null 2>&1; then
  gcloud iam service-accounts create "${RUNTIME_NAME}" \
    --display-name="Smoke Stack Cloud Run runtime"
fi

if ! gcloud artifacts repositories describe "${ARTIFACT_REPOSITORY}" --location="${REGION}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${ARTIFACT_REPOSITORY}" \
    --location="${REGION}" \
    --repository-format=docker \
    --description="Reviewed Smoke Stack production images"
fi

if ! gcloud storage buckets describe "gs://${BACKUP_BUCKET}" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://${BACKUP_BUCKET}" \
    --project="${PROJECT_ID}" \
    --location="${BACKUP_LOCATION}" \
    --uniform-bucket-level-access
fi

gcloud beta services identity create \
  --service=firestore.googleapis.com \
  --project="${PROJECT_ID}" \
  --quiet >/dev/null

if ! gcloud iam workload-identity-pools describe "${POOL_ID}" --location=global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "${POOL_ID}" \
    --location=global \
    --display-name="GitHub Actions"
fi

provider_condition="assertion.repository=='${GITHUB_REPOSITORY}' && assertion.ref=='refs/heads/main'"
provider_mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref"

if gcloud iam workload-identity-pools providers describe "${PROVIDER_ID}" \
  --location=global --workload-identity-pool="${POOL_ID}" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers update-oidc "${PROVIDER_ID}" \
    --location=global \
    --workload-identity-pool="${POOL_ID}" \
    --issuer-uri="https://token.actions.githubusercontent.com/" \
    --attribute-mapping="${provider_mapping}" \
    --attribute-condition="${provider_condition}"
else
  gcloud iam workload-identity-pools providers create-oidc "${PROVIDER_ID}" \
    --location=global \
    --workload-identity-pool="${POOL_ID}" \
    --issuer-uri="https://token.actions.githubusercontent.com/" \
    --attribute-mapping="${provider_mapping}" \
    --attribute-condition="${provider_condition}"
fi

principal="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${GITHUB_REPOSITORY}"
gcloud iam service-accounts add-iam-policy-binding "${DEPLOYER_EMAIL}" \
  --member="${principal}" \
  --role=roles/iam.workloadIdentityUser

for role in \
  roles/artifactregistry.writer \
  roles/datastore.importExportAdmin \
  roles/datastore.indexAdmin \
  roles/firebase.viewer \
  roles/firebaserules.admin \
  roles/run.admin \
  roles/serviceusage.serviceUsageConsumer
do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${DEPLOYER_EMAIL}" \
    --role="${role}" \
    --condition=None
done

FIRESTORE_SERVICE_AGENT="service-${PROJECT_NUMBER}@gcp-sa-firestore.iam.gserviceaccount.com"
for principal_email in "${DEPLOYER_EMAIL}" "${FIRESTORE_SERVICE_AGENT}"
do
  gcloud storage buckets add-iam-policy-binding "gs://${BACKUP_BUCKET}" \
    --member="serviceAccount:${principal_email}" \
    --role=roles/storage.admin
done

gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_EMAIL}" \
  --member="serviceAccount:${DEPLOYER_EMAIL}" \
  --role=roles/iam.serviceAccountUser

for role in \
  roles/aiplatform.user \
  roles/datastore.user \
  roles/firebaseauth.admin
do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${RUNTIME_EMAIL}" \
    --role="${role}" \
    --condition=None
done

echo
echo "Permanent keyless deployment access is configured."
echo "Repository: ${GITHUB_REPOSITORY}"
echo "Allowed ref: refs/heads/main"
echo "Provider: projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}"
echo "Deployer: ${DEPLOYER_EMAIL}"
echo "Runtime: ${RUNTIME_EMAIL}"
echo "Artifact Registry: ${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPOSITORY}"
echo "Firebase config: reviewed Firestore rules and indexes deploy from main"
echo "Firestore backups: gs://${BACKUP_BUCKET}/scheduled (weekly and manual)"
echo
echo "Merge the reviewed deployment workflow to main to start the first deployment."
