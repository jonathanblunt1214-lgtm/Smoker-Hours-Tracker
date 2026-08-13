# SmokeStack External Integration Trust Model

SmokeStack must never present a local simulator, browser preview, stored toggle, generated code, or unverified configuration value as a connected external platform.

## Integration states

Every external integration must report one of these states:

- `unconfigured` — required external credentials, developer-console registration, or OAuth configuration is absent.
- `configured_unverified` — required configuration is present, but SmokeStack has not completed a successful authenticated round-trip with the external platform.
- `connected_verified` — the current account completed the platform's required authorization flow and SmokeStack successfully completed an authenticated platform request that proves the connection.
- `preview_local` — a local-only simulator, browser notification, speech synthesis, or UI preview. This state is never equivalent to a connected external platform.
- `error` — a previously configured integration failed its latest authenticated verification attempt.

## Constitution rules

1. A UI toggle cannot upgrade an integration state.
2. Generated local identifiers, random codes, localStorage sessions, browser CustomEvents, speech synthesis, and simulated responses cannot be labeled as account linking, cloud sync, device delivery, or verified connectivity.
3. External credentials and refresh tokens must never be stored in client-visible source code or localStorage when a server-side token exchange/storage flow is required by the provider.
4. Alexa account linking must use the provider-supported OAuth 2.0 flow and validate Alexa-provided access tokens before reading account data.
5. Alexa proactive notifications require the provider-supported Proactive Events permission/token flow and user opt-in before SmokeStack may report proactive notifications as available.
6. Google Home access must use the supported Home APIs or Cloud-to-cloud flow, including OAuth and user-granted structure/device permissions. Browser speech synthesis is only a local preview.
7. Fire TV delivery must be implemented through a documented authenticated Amazon/device integration before SmokeStack may report delivery to a Fire TV device. In-app overlays remain local previews.
8. Verification status must be derived from real external responses, not inferred from configuration presence.
9. Failures must be surfaced truthfully and must not fall back to fabricated success.
