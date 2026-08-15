import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const app = read('src/App.tsx');
const cookForm = read('src/components/CookLogForm.tsx');
const assistant = read('src/components/AIPitmasterModal.tsx');
const firestore = read('src/lib/firestoreData.ts');
const ownerApi = read('server/adminRoles.ts');
const serviceWorker = read('public/sw.js');
const server = read('server.ts');
const harvester = read('server/knowledgeHarvester.ts');
const knowledge = read('server/verifiedKnowledge.ts');
const community = read('server/communitySmokers.ts');

assert(!app.includes("useState<SyncStateStatus>('synced')"), 'signed-out startup may not claim a completed sync');
assert(!cookForm.includes('defaultMeatTemps'), 'cook form may not seed observed temperatures');
assert(!cookForm.includes('generateLocalFallbackNotes'), 'offline AI fallback advice is forbidden');
assert(!assistant.includes('autoEvolveCharGPTMemory'), 'automatic durable memory is forbidden');
assert(!server.includes('isMasterAdminEmail'), 'client-supplied email may not grant AI authority');
assert(server.includes("app.post('/api/chargpt', requireAuth"), 'CharGPT endpoint must require Firebase authentication');
assert(firestore.includes("syncState: 'writing'"), 'Firestore writes need a visible in-progress marker');
assert(firestore.includes('completionBatch.commit()'), 'Firestore writes need an atomic completion marker');
assert(ownerApi.includes("'/governance/:document', requireAuth, requireOwner"), 'governance downloads must require OWNER');
assert(serviceWorker.includes("caches.open(SMOKESTACK_RUNTIME_CACHE)"), 'runtime assets must be cached after first successful fetch');
assert(!serviceWorker.includes("action: 'snooze'"), 'notifications may not expose unimplemented actions');
assert(harvester.includes("createHash('sha256')"), 'manufacturer facts must retain a source content hash');
assert(knowledge.includes("verificationScope: isManufacturerFact ? 'manufacturer_stated_fact'"), 'manufacturer facts need an explicit verification scope');
assert(community.includes("status: 'pending_review'"), 'community submissions may not bypass review');
assert(community.includes("provenanceClass: 'USER_ENTERED'"), 'community submissions must retain user-entered provenance');

console.log('SmokeStack product contract tests passed.');
