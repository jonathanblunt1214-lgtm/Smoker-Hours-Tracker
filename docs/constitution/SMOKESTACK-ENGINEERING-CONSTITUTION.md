# SMOKESTACK ENGINEERING CONSTITUTION

Status: Governing law
Revision: 5
Effective: 2026-08-15
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

## 11. Future features, platforms, and data models

Revision 4 is additive. Sections 1 through 10 and every incorporated amendment remain fully in force and establish the minimum protection for all future work.

1. Before a new capability can be enabled, its implementation declares its purpose, user benefit, authoritative data source, identity boundary, permissions, provenance, retention and deletion lifecycle, offline behavior, failure states, observability, tests, rollback path, and responsible owner.
2. A future feature, platform, device, model, agent, protocol, data source, plugin, marketplace, or business model inherits this Constitution even when it is not named here. New technology does not create an exception.
3. Schemas and stored records are versioned. Migrations are idempotent, checkpointed, tested against representative prior versions, and protected by a backup or rollback path. A migration never silently discards, reassigns, merges, or fabricates user data.
4. APIs, events, exports, and integration contracts are versioned or remain backward-compatible for a documented transition period. Secrets remain on trusted server boundaries, access is least-privilege, and each external integration has a disable or containment path.
5. Feature flags, experiments, staged rollouts, remote configuration, and administrator tools may limit availability but may not bypass authentication, authorization, consent, provenance, data integrity, or release gates. Disabled and partially available states are reported truthfully.
6. New AI models, tools, agents, retrieval systems, and automated actions are evaluated against constitutional tests before release. Consequential writes, deletes, purchases, sharing, device control, account changes, and releases require verified authority and an explicit confirmation appropriate to the risk. AI may not modify this Constitution or grant itself authority.
7. Telemetry and diagnostics collect the minimum data needed for a declared operational purpose. They exclude credentials and private content by default, honor retention and deletion rules, and never become a hidden authoritative record or advertising profile.
8. Experimental, beta, imported, legacy, and third-party data remain labeled and isolated until their contracts and provenance are verified. They may not silently contaminate production facts, account records, analytics, or CharGPT memory.
9. Deprecation includes notice, a supported migration or export path, and a defined end-of-support state. Removing a feature never strands authoritative user data or converts it into an inaccessible proprietary format.
10. Each new user-facing capability meets the same accessibility, mobile, desktop, PWA, Android, performance, recovery, and direct-control standards as existing core workflows unless its platform limitation is explicit and true.
11. Users retain access to, correction of, export of, and deletion of their data within the deployed retention and safety contract. Monetization, growth, or engagement goals never override consent, ownership, truth, safety, or portability.
12. SmokeStack architecture may evolve, but identity authority, data authority, provenance classes, truth rules, and the release gate remain stable contracts. Replacements must meet or exceed the protections they replace.

## 12. Constitutional continuity and amendment control

1. Future revisions are additive by default. Existing protections are a floor, not optional legacy behavior.
2. No feature, prompt, generated patch, migration, dependency, configuration, or amendment may silently or indirectly weaken an existing clause.
3. A proposed amendment identifies every affected clause, its rationale, data and migration impact, compatibility impact, new tests, rollback plan, approval record, effective date, and revision number.
4. When clauses appear to conflict, the stricter interpretation protecting truth, user authority, data integrity, privacy, safety, and recoverability governs until an explicit reviewed amendment resolves the conflict.
5. Emergency controls may disable or contain a feature, but may not bypass identity, authorization, truth, audit, or data-integrity requirements.
6. Prior revisions and approvals remain immutable and auditable. A release records the Constitution revision it passed and cannot claim compliance with a later revision it did not test.

## 13. Incorporated Terms of Service, privacy, and user data ownership

Revision 5 is additive. Sections 1 through 12 remain unchanged and fully in force. Those sections govern SmokeStack's conduct. This Section 13 states the user-facing service agreement and privacy terms for the currently implemented application.

1. **Acceptance and eligibility.** Using an account or selecting Accept Revision 5 records acceptance of Section 13. Acceptance never grants a device, Google, sharing, or AI permission. A user must be legally able to accept these terms; where applicable, a parent or guardian is responsible for an authorized minor's use. Material changes require a new numbered revision and renewed acceptance before the changed practice begins.
2. **Current service.** SmokeStack provides cook logging, equipment and fuel records, planning, analytics, maintenance tools, optional Firebase account synchronization, optional Google Drive backup, optional CharGPT assistance, and provenance-backed community smoker information as those features are actually available. Unavailable, preview, estimated, simulated, and pending-review states remain explicit.
3. **User data always belongs to the user.** SmokeStack receives no ownership interest in a user's cook logs, equipment records, photos, recipes, notes, preferences, backups, community submissions, or other account content. No term, feature, upload, synchronization, backup, analysis, or contribution transfers title to SmokeStack.
4. **Limited service permission.** The user grants only the limited, non-exclusive technical permission needed to store, process, synchronize, display, export, and delete that user's data on the user's instructions and to provide chosen features. This permission does not allow unrelated use and ends when the data or account is deleted, subject only to a specifically disclosed lawful retention requirement.
5. **No sale or unrequested sharing.** SmokeStack does not sell user data or use private account data for third-party advertising. Optional sharing remains off without the specific consent action for that contribution. Consent for one purpose or record is not consent for another.
6. **Identity, storage, and processing.** Firebase Authentication establishes identity. UID-scoped Firestore data is authoritative when signed in; signed-out data remains local. Firebase and Google Cloud process data for authentication, storage, security, server features, and selected CharGPT requests. A CharGPT request may include the prompt and the cook, smoker, photo, or preference context the user chooses to send.
7. **Access, correction, export, and deletion.** Users can correct records in the app and export JSON from Settings. Authenticated deletion removes the Firebase account, UID-scoped Firestore data and subcollections, account overlays, role records, and identifiable community submissions. It clears local SmokeStack data on the deleting device. External instructions are published at `/account-deletion.html`. Failure remains visible and is never reported as success.
8. **Google Drive backups.** Drive is a separate, optional, user-authorized backup. Disconnecting SmokeStack or deleting a SmokeStack account does not delete a backup already in the user's Drive; that file remains under the user's ownership and control.
9. **Community contributions.** Every Community Smoker Database contribution requires authenticated, submission-specific consent. It begins as `USER_ENTERED` pending review, not a manufacturer fact. The user retains ownership and grants only the limited permission to review, label, publish, and display the submission until withdrawal or associated account deletion. Broader federated cook-data sharing remains unavailable without a future granular consent workflow and separate acceptance.
10. **CharGPT and cooking safety.** CharGPT is optional informational assistance. Output can be incomplete or wrong and does not replace direct controls, authoritative records, professional advice, or user judgment. Users verify food-safety requirements with current authoritative sources and use appropriate care around heat, fire, electricity, fuel, sharp tools, allergens, smoke, and perishable food.
11. **Acceptable use and user content.** Users may not violate law, compromise services, upload malicious material, infringe rights, misrepresent unsafe or fabricated information as verified, or interfere with the service. Users are responsible for submitted content and the rights needed to submit it.
12. **Third-party services and sources.** Firebase, Google Cloud, Google Drive, Google AI, device platforms, manufacturer websites, and other external services have separate terms and availability. Manufacturer-stated facts remain governed by Section 5 and are not a SmokeStack product warranty.
13. **Availability and termination.** SmokeStack may change, suspend, contain, or discontinue a feature for safety, security, maintenance, legal, or technical reasons and may restrict abusive or unauthorized use. Truth, ownership, export, deletion, migration, and recovery protections continue. Discontinuation never transfers, strands, or silently destroys user-owned data.
14. **Warranty and liability limits.** To the extent permitted by law, SmokeStack is provided without a guarantee of uninterrupted or error-free operation and is not liable for indirect, incidental, special, consequential, or punitive losses. Nothing excludes non-waivable warranties, remedies, rights, or liability. These terms do not impose arbitration, waive non-waivable rights, or invent an operator jurisdiction.
15. **Changes, notice, and priority.** Material changes to data use, ownership, permissions, sharing, AI processing, or user rights require a new Constitution and acceptance revision plus notice before the changed practice begins. The stricter reviewed rule protecting ownership, consent, privacy, truth, integrity, safety, portability, and deletion governs any conflict.
16. **Support and legal contact.** Current support, operator, and legal contact information is published in the official SmokeStack app-store listing or support page. A store release is blocked until that contact and a public, accessible privacy/terms URL accurately identify the deployed app.
