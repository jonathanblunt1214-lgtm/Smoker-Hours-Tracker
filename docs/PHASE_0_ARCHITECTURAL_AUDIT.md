# SmokeStack Phase 0 Architectural Audit — Initial

**Audit status:** Initial repository audit complete; implementation work intentionally not started.

## A. Repository architecture

The repository is a TypeScript/React/Vite-style web application with a substantial client application, an Express server, and Google GenAI integration. The repository contains `src/App.tsx`, a large component tree, `src/types.ts`, utility modules, data modules, `server.ts`, Vite configuration, a service worker/manifest, and Firebase-related configuration.

Relevant areas include:

- `src/App.tsx` — application-level orchestration/state.
- `src/types.ts` — domain type definitions.
- `src/utils/storage.ts` — current client persistence abstraction.
- `src/components/CookLogForm.tsx` / `CookLogList.tsx` — cook entry/history.
- `src/components/AIPitmasterModal.tsx` — AI experience and AI-adjacent persistence.
- `src/components/AnalyticsDashboard.tsx` — analytics experience.
- `src/components/CookPlanner.tsx` — planner.
- `src/components/FuelAndMaintenance.tsx` and fuel utilities — fuel/maintenance.
- `src/components/CustomSmokerModal.tsx`, `SmokerModManager.tsx`, `SmokerOverviewBanner.tsx` and smoker utilities — smoker domain.
- `src/lib/driveSync.ts` — Google Drive-related synchronization functionality.
- `server.ts` — Express backend, upload endpoints, federated-learning endpoints, smoker knowledge pools, and Google GenAI integration.

## B. Current source-of-truth findings

The current implementation does **not yet satisfy the Constitution**.

The most important finding is that `src/utils/storage.ts` currently persists core application records directly in browser `localStorage`, including profile, cook logs, fuel logs, custom/manufacturer smokers, custom fuel presets, CharGPT memory, ChatGPT history, and federated-learning configuration. The storage module also loads initial mock data when persisted data is absent. This makes local browser state a de facto authoritative store for several important domains.

The same file contains `loadCharGPTMemory` / `saveCharGPTMemory` and `autoEvolveCharGPTMemory`, meaning AI memory is currently independently persisted and mutated rather than being purely rebuildable derived state.

## C. Conflicting sources / architectural risks

### CRITICAL — Core persistence is browser-local

Cook logs, profile, fuel logs and related records are stored through localStorage. This does not provide the required account-owned authoritative persistence, cross-device synchronization, or deterministic offline reconciliation.

### CRITICAL — AI Memory is a second persistent history

CharGPT memory is stored independently in localStorage and evolved from cook logs. Under the Constitution, AI memory must be derived/rebuildable, not a competing history database.

### HIGH — Chat history is separately persisted

AI chat history has its own local persistence. This can be acceptable as temporary/user experience history only if explicitly classified and account-scoped; it must not be treated as cook truth or AI factual memory.

### HIGH — Mock/default data exists in the production code path

The storage layer imports initial mock data and returns it when persisted records do not exist. This must be classified as development/default seed data and must never be presented as a user's real history.

### HIGH — Smoker claims need provenance separation

The repository contains separate manufacturer/custom smoker data and smoker calculation utilities. The Constitution requires claim-level provenance rather than a universal manufacturer-wins rule. Manufacturer specifications, user observations, verified observations, community evidence, and AI predictions need explicit semantic separation.

### HIGH — Server contains in-memory federated pools

`server.ts` contains in-memory federated cook and smoker knowledge pools. These are not durable authoritative stores and include seeded values. They must not be confused with authoritative user data. Any production learning system needs explicit provenance, consent, account boundaries, persistence, and derived/knowledge semantics.

### MEDIUM/HIGH — Current synchronization is fragmented

The repository contains Google Drive synchronization code in addition to localStorage persistence and server endpoints. The Constitution requires one synchronization architecture for authoritative entities. Drive sync must therefore be classified as import/export/backup/cache or integrated into the single sync architecture; it cannot silently become a second authoritative database.

## D. AI data flow — current state

The AI UI receives `cookLogs` and `profile` as props, while AI memory and chat history are also loaded from local storage. The AI component can call server endpoints such as `/api/chargpt/optimize-blend`. This means the current system has a mixture of live application state, local persisted AI memory, and server AI operations.

Target flow:

`AUTHORITATIVE ACCOUNT DATA -> AI CONTEXT BUILDER -> AI -> LABELED FACT/ESTIMATE/INFERENCE/RECOMMENDATION`

AI Memory should become a rebuildable derived projection, not a separate authoritative record.

## E. Analytics data flow — target requirement

Analytics should consume authoritative cooks, smoker records, fuel records, maintenance records, and relevant events. Any materialized analytics cache must be disposable and rebuildable. The Phase 0 audit did not yet modify analytics behavior.

## F. Persistence migration target

Target:

`UI -> domain/data service -> authoritative account-scoped persistence -> database -> single sync layer -> local/offline cache/queue -> UI`

localStorage should be limited to lightweight preferences and safe metadata/cache state. Large photos should use object storage or an appropriate binary store, with references in authoritative cook data.

## G. Immediate Phase 1 priorities

1. Identify the existing backend database/authentication persistence path, if any, and verify whether it is actually authoritative.
2. Define account-scoped schemas/IDs for Account, Smoker, Cook, Fuel, Maintenance, Planner, and Preferences.
3. Replace localStorage authority for core records with the authoritative persistence path.
4. Introduce one sync abstraction and explicit sync state.
5. Preserve legacy localStorage data through a controlled migration rather than deleting it.
6. Convert AI Memory to derived/rebuildable state.
7. Separate seeded/mock/default data from real user data.
8. Define claim-level provenance for smoker/fuel/manufacturer/user observations.
9. Establish integration tests for refresh, logout/login, second device/session, edit/delete, offline/reconnect, and duplicate prevention.

## H. Gate 0 result

**STATUS: PASS WITH P0 BLOCKERS IDENTIFIED**

The architecture is sufficiently mapped to begin a dedicated P0 data-integrity repair, but **no feature implementation should proceed ahead of the persistence/sync work**. The findings above are the blockers that Phase 1 must address.

## Key evidence inspected

- Repository tree shows client, server, storage, AI, analytics, smoker, fuel, planner, and sync modules.
- `src/utils/storage.ts` persists core records and AI memory in localStorage.
- `src/components/AIPitmasterModal.tsx` loads/persists AI memory and calls server AI endpoints.
- `server.ts` contains Express APIs, Google GenAI integration, and in-memory seeded federated knowledge pools.
