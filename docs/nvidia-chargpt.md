# NVIDIA internal CharGPT integration

OWNER approval required: this change follows task branch -> SmokeStack-development -> OWNER-reviewed promotion -> main. Do not merge the task directly into main or deploy before adding the secret.

## Architecture and scope

The existing trusted client sends a Firebase ID token and selected cook ID. Server middleware verifies identity, reads account-owned Firestore context, and supplies published knowledge. CharGPT consumes that context without writing cook history or durable memory. The generator retains authentication, constitutional prompts and grounding rejection/retry. The new adapter changes only transport for `/api/chargpt` and `/api/ai-pitmaster`.

Cook creation/save/sync remains through the trusted client and account Firestore data layer; analytics and AI remain derived consumers. Existing storage, offline queues, IDs, deletion tombstones and mobile/web paths are unchanged. No new store, sync path or data migration is introduced. The existing Phase 0 audit is historical; this scoped change does not certify all its broader release gates or production behavior.

`CHARGPT_PROVIDER=nvidia` selects NVIDIA, `CHARGPT_MODEL` retains its name, and `CHARGPT_BASE_URL=https://integrate.api.nvidia.com/v1` selects the hosted endpoint. The server alone reads `NVIDIA_API_KEY`. Requests have a 30-second timeout, prohibit redirects, and return sanitized failures without upstream response bodies. Unsupported providers/configuration fail closed. There is no automatic Gemini fallback for NVIDIA failures.

The default `meta/llama-3.1-70b-instruct` integration supports text chat. Image input is rejected rather than silently discarded. NVIDIA requests do not use Gemini Google Search tools or fabricate search grounding. Published SmokeStack knowledge remains available in the prompt. Verify model availability with the real key after setup; configuration checks do not prove entitlement or successful inference.

Vertex environment variables remain because `getGeminiClient` and other Gemini features still consume them. `GEMINI_MODEL` remains separate and no longer inherits an NVIDIA `CHARGPT_MODEL`.

## Prepare the secret, then stop before entering the key

From a reviewed checkout in authenticated Google Cloud Shell, run:

```bash
bash scripts/prepare-nvidia-secret.sh
```

This enables Secret Manager, creates the `NVIDIA_API_KEY` container if missing, and grants only `smokestack-runtime@smoker-log-app.iam.gserviceaccount.com` secret-access permission on that secret. It never reads key material or creates a version. Existing secret versions are preserved. This needs an authorized Cloud administrator and is not automatically run by the deployer.

The final credential step is to open [NVIDIA_API_KEY in Secret Manager](https://console.cloud.google.com/security/secret-manager/secret/NVIDIA_API_KEY/versions?project=smoker-log-app), choose **New version**, paste the NVIDIA API key there, and enable that version. Never paste the key into chat, GitHub, source files or logs.

After required review and promotion, Cloud Run maps `NVIDIA_API_KEY:latest` to the server environment using `--update-secrets` (preserving unrelated secret mappings). A valid enabled version and runtime access must exist before deployment. Each new key version requires a new Cloud Run revision to pick it up reliably.

`/api/health` remains a liveness probe and includes only provider/configuration readiness and `connectivity: not_checked`; it does not expose credentials or perform billable inference. Deployment checks require NVIDIA configuration. Authenticated Operations health reports the same readiness. After deployment, a real text chat is still required to verify NVIDIA credentials, model access and end-to-end inference.

References: [NVIDIA chat API](https://docs.api.nvidia.com/nim/reference/llm-apis), [Cloud Run secrets](https://cloud.google.com/run/docs/configuring/services/secrets).
