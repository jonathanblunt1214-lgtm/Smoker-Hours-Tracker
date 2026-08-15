import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function requireText(relativePath, needle, reason) {
  if (!read(relativePath).includes(needle)) failures.push(`${relativePath}: ${reason}`);
}

function forbidText(relativePath, needle, reason) {
  if (read(relativePath).includes(needle)) failures.push(`${relativePath}: ${reason}`);
}

const forbiddenClaims = [
  ['src/components/TermsOfServiceModal.tsx', 'I Agree to Terms & Permissions', 'terms and permissions must not be bundled'],
  ['src/components/TermsOfServiceModal.tsx', '6 Essential Permissions', 'optional permissions must be contextual'],
  ['src/components/TermsOfServiceModal.tsx', 'AI Federated Pool', 'disabled sharing may not be advertised'],
  ['src/components/TermsOfServiceModal.tsx', 'Compliant with Google API Services User Data Policy', 'self-certified compliance claim is forbidden'],
  ['src/components/SmokerOverviewBanner.tsx', '100% Care Sync', 'maintenance status must be derived from real equipment state'],
  ['src/components/SmokerOverviewBanner.tsx', 'Upload to Profile', 'ambiguous upload language is forbidden'],
  ['src/components/AIPitmasterModal.tsx', 'Self-evolving BBQ Intelligence', 'AI may not claim unapproved durable learning'],
  ['src/components/AIPitmasterModal.tsx', 'Online (Gemini Grounded)', 'network state is not grounding verification'],
  ['src/components/AIPitmasterModal.tsx', 'Offline Mode (Local Engine)', 'no fabricated offline AI engine'],
  ['src/components/CookLogForm.tsx', 'hoursLogged: Number(hoursLogged) || 6', 'physical sheets may not fabricate six hours'],
  ['src/components/CookLogForm.tsx', "seasoningRubs: seasoningRubs || 'Standard Rub'", 'physical sheets may not fabricate rubs'],
];

for (const [file, phrase, reason] of forbiddenClaims) forbidText(file, phrase, reason);

for (const file of ['src/main.tsx', 'src/App.tsx', 'vite.config.ts', 'package.json']) {
  forbidText(file, '.trusted', 'production must use canonical source files');
}

forbidText('package.json', 'generate:trusted-runtime', 'build-time security patch generation is forbidden');
forbidText('src/App.tsx', 'MASTER_ADMIN_EMAIL', 'client-side owner identity is forbidden');
forbidText('src/App.tsx', 'autoEvolveCharGPTMemory', 'automatic durable AI memory is forbidden');
forbidText('server.ts', 'auth_token_default', 'default authentication tokens are forbidden');
forbidText('server.ts', 'Applied Live', 'unverified live deployment claims are forbidden');
forbidText('server.ts', 'isMasterAdminEmail', 'client-supplied email may not grant AI authority');
forbidText('src/utils/adminAuth.ts', 'MASTER_ADMIN_EMAIL', 'client code may not establish owner authority by email');
forbidText('src/utils/adminAuth.ts', 'localStorage', 'client storage may not establish administrator authority');

requireText('src/lib/constitution.ts', 'unknownMeansUnknown: true', 'constitutional runtime contract missing');
requireText('src/lib/constitution.ts', 'futureFeaturesInheritConstitution: true', 'future-feature inheritance contract missing');
requireText('docs/constitution/SMOKESTACK-APP-CONSTITUTION.txt', 'AUDIT -> REPAIR -> TEST -> GATE -> REPORT -> RELEASE', 'plain-text governing Constitution is missing');
requireText('docs/constitution/SMOKESTACK-APP-CONSTITUTION.txt', 'content hash are retained', 'manufacturer-site fact policy is missing');
requireText('docs/constitution/SMOKESTACK-APP-CONSTITUTION.txt', 'Existing protections are a', 'additive amendment protection is missing');
requireText('docs/constitution/SMOKESTACK-APP-CONSTITUTION.txt', 'AI may not modify this Constitution or grant itself authority.', 'future AI authority boundary is missing');
requireText('docs/constitution/SMOKESTACK-APP-CONSTITUTION.txt', 'Replacements must meet or exceed the protections they replace.', 'future architecture compatibility rule is missing');
requireText('docs/constitution/CHARGPT-CAPABILITIES.txt', 'It does not generate disguised fallback advice.', 'CharGPT capability contract is missing');
requireText('src/lib/firestoreData.ts', "schemaVersion: '0.03'", 'authoritative schema version missing');
requireText('src/lib/firestoreData.ts', 'deletedCookLogIds', 'delete tombstones missing');
requireText('src/App.tsx', "'/api/admin/me'", 'server-verified administrator role hydration missing');
requireText('server/adminRoles.ts', "requireAuth, requireOwner", 'governance downloads must be OWNER-only');
requireText('src/components/MasterAdminDashboardModal.tsx', '/api/admin/governance/', 'owner console governance downloads are missing');
requireText('server/knowledgeHarvester.ts', "createHash('sha256')", 'manufacturer data miner must retain a content hash');
requireText('server/verifiedKnowledge.ts', "verificationScope: isManufacturerFact ? 'manufacturer_stated_fact'", 'manufacturer-site facts must retain explicit scope');
requireText('server.ts', "app.post('/api/chargpt', requireAuth", 'CharGPT must require verified Firebase identity');
requireText('public/sw.js', 'SMOKESTACK_RUNTIME_CACHE', 'offline runtime asset caching gate missing');
requireText('.github/workflows/build-android.yml', 'npx cap sync android', 'repeatable Android build is missing');
requireText('.github/workflows/build-android.yml', 'Publish to Google Play internal track', 'automated Google Play update path is missing');

if (failures.length) {
  console.error('SmokeStack Constitution gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('SmokeStack Constitution revision 4 gate passed.');
