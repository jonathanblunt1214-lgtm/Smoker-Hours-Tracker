# SMOKESTACK ENGINEERING CONSTITUTION

Status: Governing law
Revision: 3
Effective: 2026-08-14
Applies to: every client, server, background job, deployment, integration, AI response, administrator surface, data migration, and release artifact

## 1. Supremacy and scope

This Constitution governs all SmokeStack code and behavior. Product copy, feature requests, generated code, migrations, integrations, and release instructions are subordinate to it. A feature that cannot pass its constitutional gate remains unavailable and must be labeled unavailable.

## 2. Truth and non-fabrication

1. Unknown means unknown. Missing data may not be replaced by a plausible value.
2. SmokeStack must not fabricate cooks, smoker hours, fuel, prices, telemetry, device connections, identities, AI memory, verification, timestamps, backup success, synchronization, deployment, or store availability.
3. Demonstration and simulated data must be explicitly marked `DEMO` or `SIMULATED` at creation and retain that provenance everywhere it is displayed or analyzed.
4. Success language is allowed only after the corresponding operation succeeds and is verified.
5. Configuration is not connection. Network availability is not AI grounding. A selected catalog item is not a paired device.

## 3. Authoritative data and identity

1. Firebase Authentication establishes account identity. Client-supplied email addresses, device IDs, query parameters, and local storage never grant authority.
2. Firestore under the verified Firebase UID is authoritative for signed-in account data.
3. Local storage and browser caches may hold drafts and offline replicas, but may not silently overwrite newer authoritative records.
4. Google Drive is an explicit backup/export destination, not a competing synchronization authority.
5. Deletes require durable tombstones or an equivalent conflict-safe mechanism. Partial writes must be visible as incomplete and must never be reported as synchronized.
6. New accounts start empty. Account switching must not inherit another account's local data.

## 4. Consent, privacy, and permissions

1. Terms acceptance, privacy disclosure, optional data sharing, and device permissions are separate decisions.
2. Camera, Bluetooth, notifications, location, Google Drive, and similar permissions are requested contextually when the user invokes the relevant feature.
3. Optional permissions may not be described as globally required.
4. SmokeStack may not claim legal, regulatory, or platform-policy compliance without an approved, current review.
5. Data collection, retention, sharing, export, and deletion descriptions must match deployed behavior.

## 5. Evidence and provenance

1. Verified claims retain claim-level source, publisher, retrieval time, review status, and evidence.
2. AI output, community entries, retailer copy, search snippets, and user observations are not verified merely because they exist.
3. Manufacturer sources govern manufacturer specifications; government sources govern safety facts; user observations govern only that user's observations.
4. An exact specification or claim extracted from an approved manufacturer website is a `VERIFIED_SOURCE` manufacturer-stated fact when its URL, publisher, retrieval time, exact evidence, and content hash are retained. Inference beyond the extracted evidence is not a manufacturer fact.
5. Conflicting credible claims remain visible for review. SmokeStack does not silently choose a winner.
6. Food-safety minimums remain distinct from culinary tenderness or finish targets.

The culinary definitions amendment in `AMENDMENT-BBQ-VS-GRILLING.md` is incorporated into this Constitution.

## 6. CharGPT

1. CharGPT assists with interpretation and planning; it does not own authoritative records or application releases.
2. CharGPT may use account history only after verified retrieval and must distinguish account facts, calculations, verified references, user observations, and general suggestions.
3. Durable memory requires an explicit user save or approval action. Conversation text is not silently promoted into a rule.
4. CharGPT must expose uncertainty and must not claim grounding, analysis, learning, or memory that did not occur.
5. Direct forms and controls remain available without CharGPT.

## 7. Integrations and devices

1. Each integration has its own capability state: `unavailable`, `available`, `authorization_required`, `configured_unverified`, `verified`, or `error`.
2. Preview interfaces remain labeled preview and cannot create provider sessions, linking codes, telemetry, or success claims.
3. Real device telemetry requires a real supported protocol session and preserved provenance.

## 8. User experience, accessibility, and parity

1. Mobile, installed PWA, desktop web, and Android packaging use the same domain rules and authoritative data boundary.
2. Core workflows use progressive disclosure, autosaved drafts, clear recovery, and truthful empty states.
3. Every interactive control has a programmatic name, keyboard access, visible focus, and an adequate touch target.
4. Destructive operations are explicit and recoverable where practical.
5. Updates may refresh application code but may not merge, align, or overwrite account data.

## 9. Engineering and release governance

1. Canonical production behavior lives in canonical source files. Generated patch copies may not be the security boundary.
2. Reviewed GitHub commits, required CI gates, immutable build artifacts, and approved deployment workflows are the only production release path.
3. CI must test constitutional invariants, authentication rules, persistence, offline startup, accessibility, mobile layout, and critical user workflows.
4. Releases are versioned from one source. A roadmap version is not displayed until its implementation and gates pass.
5. Dependencies with known security findings are upgraded or explicitly risk-accepted before production release.

## 10. Gate and failure behavior

Every change is evaluated in this order:

`AUDIT -> REPAIR -> TEST -> GATE -> REPORT -> RELEASE`

If any gate fails, the release stops. The failure must remain visible; it may not be converted into simulated success, fallback data, or optimistic copy.
