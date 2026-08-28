# SmokeStack Engineering Constitution

**Project:** SmokeStack BBQ Cooking Platform  
**Repository:** `jonathanblunt1214-lgtm/Smoker-Hours-Tracker`

## 1. Constitutional authority

This document governs architecture, data integrity, persistence, synchronization, performance, mobile reliability, production reliability, AI correctness, analytics correctness, maintainability, UX, and regression prevention.

These rules outrank individual feature requests, UI preferences, implementation convenience, broken existing patterns, temporary workarounds, and performance shortcuts.

When a requested implementation conflicts with this Constitution:

1. Do not implement the conflicting architecture.
2. Identify and explain the conflict.
3. Propose an implementation that satisfies the Constitution.
4. Preserve legitimate user data.
5. Repair the authoritative system before adding another system whenever practical.
6. Create a new system only when its ownership and relationship to authoritative data are explicit.

Never make a feature appear functional by weakening architectural integrity.

## 2. Cornerstone

**ONE COOK -> ONE SOURCE OF TRUTH -> ONE SYNC PATH -> MANY EXPERIENCES**

Every cook has one authoritative account-owned record. Dashboard, Active Cook, History, Analytics, AI, Web, Mobile, QR Import, Physical Logs, Planner, Smoker Performance, Fuel Intelligence, and Reports are experiences over that record, not competing copies.

The same rule applies to Account, Smoker, Fuel, Maintenance, Planner, and Preferences.

Every persistent or computed value must be classified as exactly one of:

- **AUTHORITATIVE** — establishes truth and is persisted in the authoritative data layer.
- **DERIVED** — computed from authoritative data and rebuildable.
- **CACHED** — disposable acceleration; can be deleted and regenerated.
- **TEMPORARY** — workflow/UI/import state; must never silently replace authoritative data.

If two systems can independently claim to contain the truth, stop and repair the architecture before adding functionality.

## 3. Product mission

SmokeStack is a mobile-first BBQ cooking assistant that remembers every cook and smoker, tracks fuel and performance, learns from historical cooking data, helps the pitmaster make better decisions, survives refresh/login/device changes and connectivity interruptions, and becomes more useful as cooking history grows.

**Core promise:** “SmokeStack remembers every cook and helps you make the next one better.”

Features that do not materially improve reliability, workflow, historical understanding, decision support, learning, or future cooking performance should be questioned before becoming core functionality.

## 4. Data ownership

### Authoritative entities

- **Account:** identity, profile, preferences, pitmaster name.
- **Smoker:** identity, manufacturer/model, type, fuel type, specifications, modifications, tuning, maintenance relationship.
- **Cook:** identity, smoker relationship, meat/cut/weight, timestamps, status, temperatures/history, events, fuel/wood usage, weather, photos, ratings, finished product, next-time notes, timeline, cook hours.
- **Fuel:** inventory, fuel type/blend, additions, usage transactions, presets.
- **Maintenance:** maintenance events, schedules, history.
- **Planner:** planned cooks, schedules, planning metadata.
- **Preferences:** account-scoped user preferences.

### Derived systems

Analytics, AI Memory, predictions, personal bests, performance metrics, recommendations, correlations, charts, and statistics do not own cooks or other authoritative entities. They must be rebuildable from authoritative records.

## 5. Identity

Every persistent entity requires a stable unique ID, account ownership, created timestamp, and updated timestamp. Where applicable also maintain revision/version, provenance/source, deletion state, and sync state.

Never use an array index, display text, timestamp alone, or temporary UI identifier as persistent identity. Cook IDs must survive web/mobile, import/QR, refresh, logout/login, synchronization, and device changes.

## 6. Provenance and claim authority

**Authority is determined by the type of claim, not by the source globally.** Do not hard-code “manufacturer data always wins.”

Manufacturer specifications are authoritative for manufacturer claims. User measurements and observations are authoritative for the user's observed equipment/cooking behavior. Verified measurements are authoritative for the verified observation. Approved community evidence is evidence, not an automatic override. AI inferences and predictions are derived.

Conflicting claims with different provenance must be preserved and classified rather than silently overwritten.

Examples:

- Manufacturer claim: hopper capacity = 20 lb -> manufacturer provenance.
- User observation: this unit actually burns 1.7 lb/hr under specified conditions -> user observation provenance.
- AI estimate: expected burn rate 1.9–2.2 lb/hr -> derived prediction.

The system must never silently convert an observation into a manufacturer specification, or a prediction into a fact.

Every externally sourced or learned claim should carry provenance where practical: `source`, `sourceType`, `verified`, `confidence`, `observedAt`, `accountId`, and/or supporting record references.

## 7. Synchronization

There is one synchronization architecture shared by Web and Mobile: the same identity model, authoritative data model, persistence model, sync model, and conflict strategy.

Supported states: `synced`, `syncing`, `pending`, `offline`, `error`.

Required capabilities: optimistic UI where appropriate, authoritative persistence, retry, offline queue, reconnect synchronization, duplicate-write prevention, deterministic conflict handling, newer-data protection, data-loss protection, and visible sync state.

Never silently overwrite newer data, discard data, duplicate a cook, or create competing records. An import is not complete until its resulting authoritative record is persisted.

## 8. AI constitution

AI is a consumer of authoritative SmokeStack data, not a database. AI Memory is derived. AI must not invent user history, cook history, smoker specifications, measurements, ratings, fuel usage, or results.

AI responses must distinguish, when relevant:

- **KNOWN FACT**
- **USER HISTORY**
- **MANUFACTURER DATA**
- **VERIFIED DATA**
- **ESTIMATE**
- **INFERENCE**
- **RECOMMENDATION**

AI may reason over data and recommend actions. Recommendations do not become facts unless the user explicitly records or confirms them. AI must never rewrite authoritative history.

Deterministic logic or explicit user input must own values such as categorization and target-temperature extraction when the product requires them; AI must not silently fabricate them.

## 9. Analytics constitution

Analytics is derived and may be materialized/cached for performance. It never becomes a cook database. If analytics is deleted or corrupted, it must be rebuildable from authoritative data.

Analytics should update from authoritative create/edit/delete/import/sync events and must not maintain independent manually edited truth counters when the value can be derived.

## 10. Security and data safety

All user data is account-scoped. Authorization must be enforced at the persistence boundary, not only in the UI. Never expose another user's cooks, smokers, fuel, photos, analytics, planner data, or AI history.

Destructive operations require authorization, confirmation, and explicit scope. Deployment/admin cleanup must never delete legitimate user data. Sensitive user information must not be embedded directly in QR payloads.

## 11. Performance

Optimize for thousands of cooks without introducing a second authoritative store. Prefer incremental processing, selectors, memoization, lazy loading, virtualization, request cancellation/deduplication, IndexedDB/object storage where appropriate, caching, and isolated high-frequency state.

Avoid full-history serialization/processing for single-record changes, unnecessary localStorage writes, duplicate requests, uncancelled requests, huge image payloads, unnecessary chart recalculation, and AI calls on every keystroke.

Timers and live telemetry must not cause the entire application to render every second. Clean up timers, listeners, subscriptions, streams, Bluetooth, camera resources, and other asynchronous resources.

## 12. Engineering rules

1. Inspect before modifying.
2. Do not rewrite from scratch.
3. Preserve working functionality and legitimate user data.
4. Repair before replacing.
5. Never create fake persistence.
6. Never create competing truth.
7. Never silently discard data.
8. Never silently overwrite newer data.
9. Never use array position as identity.
10. Every feature uses the authoritative data layer.
11. Web and Mobile share the same data architecture.
12. AI does not invent facts.
13. Derived systems remain rebuildable.
14. Large photos do not belong in localStorage.
15. Avoid unnecessary full-dataset processing, renders, and network calls.
16. Cancel asynchronous work where appropriate and clean up resources.
17. Preserve offline behavior where practical.
18. Do not build new features on broken persistence.
19. P0 data integrity beats new features.
20. A UI-only implementation is not complete.
21. Do not remove functionality without identifying its replacement.

## 13. Implementation plan and gates

### Phase 0 — Reconnaissance

**No feature coding.** Inspect the entire repository and trace a cook through `CREATE -> STATE -> SAVE -> DATABASE -> SYNC -> READ -> ANALYTICS -> AI`.

Map framework/entry points, components, state management, types, database/backend/API, authentication, persistence, localStorage/IndexedDB/object storage, synchronization, AI, analytics, mobile/web differences, import/QR, deployment/environment, timers/listeners, network requests, duplicate implementations, performance risks, and data-loss risks.

Produce:

A. architecture map  
B. data model map  
C. source-of-truth map  
D. persistence map  
E. sync map  
F. authentication map  
G. AI map  
H. analytics map  
I. mobile/web differences  
J. performance risks  
K. data-loss risks  
L. duplicate implementations  
M. critical bugs  
N. target architecture  
O. migration sequence

**Gate 0:** Do not proceed until architecture, sources of truth, persistence failures, sync failures, major data-loss risks, and target architecture are understood.

### Phase 1 — P0 Data Integrity

Repair account ownership, cook/smoker/fuel/planner/settings/active-cook persistence, synchronization, offline queue, retries, duplicate prevention, and conflict handling.

Test: `CREATE -> SAVE -> REFRESH -> LOGOUT -> LOGIN -> SECOND DEVICE -> EDIT -> DELETE -> OFFLINE -> RECONNECT`.

**Gate 1:** Same stable identity survives every test; no competing cook database exists; sync status is visible.

### Phase 2 — Core Domain Architecture

Establish authoritative Account, Smoker, Cook, Fuel, Maintenance, Planner, and Preferences with stable IDs, ownership, persistence, synchronization, and explicit relationships.

**Gate 2:** For every entity answer: where is truth, who owns it, what is its ID, how does it sync, and what derives from it?

### Phase 3 — Web/Mobile Unification

Create a parity matrix covering authentication, account, pitmaster name, smokers, cooks, active cook, timer, temperature, events, photos, import, QR, fuel, planner, maintenance, analytics, AI, sync, offline, recovery, and notifications.

**Gate 3:** No mobile-only or web-only authoritative truth.

### Phase 4 — Cook Engine

Repair the authoritative Cook model and Active Cook workflow: `START -> MONITOR -> LOG -> FINISH -> REVIEW -> ANALYZE`. Autosave active cooks. Derive timer display from persistent cook state; timer state itself is never authoritative.

### Phase 5 — Cook Timeline

Persist editable timestamped events such as preheat, meat added, temperature changes, spritz, wrap/unwrap, fuel, wood, probe, stall, probe tender, remove, rest, and serve. Make timeline available to Analytics and AI.

### Phase 6 — Physical Logs + Import

Use the same Cook creation pipeline: `IMPORT -> EXTRACT -> VALIDATE -> REVIEW -> SAVE -> SYNC -> ANALYTICS`. Process each log independently. Never merge unrelated logs. Low confidence requires review; never invent missing values.

### Phase 7 — SmokeStack QR

QR is an input mechanism. Generated physical forms receive a SmokeStack QR footer. Mobile camera and desktop image/PDF/webcam inputs route through the same deterministic importer. Do not embed sensitive user data.

### Phase 8 — Smoker Engine

Maintain one authoritative smoker record per physical unit. Separate manufacturer claims, user observations, verified observations, community evidence, and AI-derived estimates by provenance. Community information must not affect calculations unless explicitly approved by product rules.

### Phase 9 — Fuel Engine

Track inventory, type/blend, additions, starting fuel, consumed fuel, burn rate, remaining fuel, and presets. Calculate observed burn rate and predicted remaining fuel/cook time using smoker, modifications, fuel, temperature, weather, and history. Use confidence ranges and provenance.

### Phase 10 — Analytics Engine

Derive total cooks/hours, fuel consumption, smoker/meat usage, average cook time/temperature/burn, ratings, personal bests, smoker/fuel performance, temperature stability, weather relationships, and consistency. Rebuild after any authoritative change.

### Phase 11 — Learning Analytics

Compare meat/cut/weight/smoker/fuel/wood/temperature/time/wrap/rest/weather/ratings and sensory outcomes. Report sample size. Never claim causation from correlation.

### Phase 12 — AI Pitmaster

Feed AI authoritative current/history/smoker/fuel/weather/timeline/rating data. Support decision questions such as what to do now, comparison to previous cooks, delay explanation, ETA, fuel needs, stall detection, best-cook differences, and next-time improvements. Clearly label fact/history/verified data/estimate/inference/recommendation.

### Phase 13 — Prediction Engine

Build ETA, stall detection, fuel prediction, temperature trend, and finish windows using ranges, confidence, reasoning, and historical evidence. Predictions never silently become authoritative facts.

### Phase 14 — Maintenance

Track cleaning, deep cleaning, ash/grate cleaning, gaskets, probe calibration, seasoning, rust, and parts replacement. Support calendar-, cook-hour-, and event-based schedules. Maintenance belongs to the smoker and syncs with it.

### Phase 15 — Mobile Pitmaster Experience

Optimize for outdoor one-handed use, gloves, sunlight, smoke, minimal typing, large touch targets, high contrast, vertical layouts, persistent critical controls, and immediate temperature visibility. Different experience; same data system.

### Phase 16 — Dashboard + Navigation

Prioritize Dashboard, Active Cook, History, Maintenance. During active cooking emphasize pit temp, target, meat temp, elapsed time, fuel, Add Log, Add Fuel, Finish Cook. Make Start a Cook dominant when idle.

### Phase 17 — Performance Engineering

Audit React renders, state architecture, storage, serialization, network requests, AI calls, images, charts, lists, timers, and subscriptions. Apply incremental processing, memoization, selectors, lazy loading, virtualization, cancellation/deduplication, isolated timer state, and suitable object/IndexedDB storage without creating competing truth.

### Phase 18 — Production Safety

Remove development-only destructive controls from production. Require authorization/confirmation for destructive operations. Investigate production errors and report what was saved, what failed, whether retry is active, and what the user should do.

## 14. Final release gates

A feature is complete only when applicable:

**WORKS -> SAVES -> SYNCS -> SURVIVES REFRESH -> SURVIVES LOGOUT/LOGIN -> WORKS ON ANOTHER DEVICE -> WORKS ON MOBILE -> APPEARS IN ANALYTICS -> WORKS IN PRODUCTION -> USES THE AUTHORITATIVE DATA MODEL**

Derived data must be rebuildable. No major render bottlenecks, memory leaks, unnecessary serialization, duplicate network calls, uncancelled requests, or runaway AI processing may remain.

For every major entity produce:

`ENTITY | OWNER | SOURCE OF TRUTH | STORAGE | STABLE ID | SYNC PATH | DERIVED SYSTEMS | CACHED SYSTEMS | TEMPORARY SYSTEMS | DUPLICATE COPIES | RISK | STATUS`

Any unresolved competing source of truth is a **CRITICAL ARCHITECTURAL FAILURE**.

## 15. Pitmaster acceptance test

Simulate a 4 AM brisket cook on a phone outdoors while wearing gloves: start quickly, see critical temperatures immediately, log events one-handed, add fuel quickly, survive interruption, save and sync the cook, view it on another device, feed it into Analytics and AI, and use the result to improve the next cook.

## 16. Execution rule

Do not implement all phases at once. Complete Phase 0 and produce its audit. Proceed sequentially only after the relevant gate passes. After each phase: inspect the implementation, run relevant tests, check regressions, verify the Constitution, verify no second source of truth was introduced, report what changed and what remains, then proceed.

When existing code conflicts with this Constitution, repair the architecture rather than working around it.
