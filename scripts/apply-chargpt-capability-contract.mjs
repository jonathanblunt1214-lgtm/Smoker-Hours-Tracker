import fs from 'node:fs';

const targetPath = 'server.secure.generated.ts';
let source = fs.readFileSync(targetPath, 'utf8');

function requiredReplace(needle, replacement, label) {
  if (!source.includes(needle)) throw new Error(`[chargpt-contract] Missing ${label}`);
  source = source.replace(needle, replacement);
}

function replaceRange(startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0 || end <= start) throw new Error(`[chargpt-contract] Missing range ${label}`);
  source = source.slice(0, start) + replacement + '\n\n' + source.slice(end);
}

requiredReplace(
  "import { requireAuth, AuthenticatedRequest } from './server/authMiddleware';",
  "import { requireAuth, optionalAuth, AuthenticatedRequest } from './server/authMiddleware';\nimport { hydrateAuthoritativeCharGPTContext } from './server/charGPTContext';\nimport { CHARGPT_CONSTITUTION } from './server/charGPTPolicy';",
  'CharGPT auth and contract imports',
);

requiredReplace(
  'const handleCharGPTRequest = async (req: express.Request, res: express.Response) => {',
  'const handleCharGPTRequest = async (req: AuthenticatedRequest, res: express.Response) => {',
  'authenticated request type',
);

requiredReplace(
  "    const isMasterAdminEmail = (userEmail || '').trim().toLowerCase() === 'jonathanblunt1214@gmail.com';\n    const isDevOverrideActive = isMasterAdminEmail && Boolean(isDevOverride);",
  "    const isDevOverrideActive = req.user?.role === 'owner' && Boolean(isDevOverride);",
  'server-verified owner override',
);

replaceRange(
  '    const verifiedPool = federatedCookPool.filter(',
  "    let smokerContextStr = '';",
  `    const federatedContextStr = \`
=== COMMUNITY SMOKER DATABASE POOL ===
Capability state: UNAVAILABLE FOR THIS REQUEST
No eligible aggregate with consent, minimum-sample, provenance, and privacy metadata was returned.
Do not make or imply any community-derived claim.
\`;`,
  'truthful community capability',
);

replaceRange(
  "    let smokerContextStr = '';",
  "    let memoryContextStr = '';",
  `    let smokerContextStr = '';
    const specs = effectiveSpecs || null;
    if (smokerProfile || userAccount || specs) {
      const activeMods = Array.isArray(specs?.activeModItems) ? specs.activeModItems : [];
      smokerContextStr = \`
=== AUTHORITATIVE USER EQUIPMENT CONTEXT ===
Every populated value is [USER DATA] unless a separate verified record says otherwise. Missing values remain unknown.
Smoker name: \${specs?.displayName ?? smokerProfile?.name ?? 'Not recorded'}
Brand / builder: \${specs?.brandOrBuilder ?? smokerProfile?.brand ?? 'Not recorded'}
Model / type: \${specs?.modelOrType ?? smokerProfile?.model ?? 'Not recorded'}
Category: \${specs?.category ?? smokerProfile?.smokerType ?? 'Not recorded'}
Fuel system: \${specs?.fuelType ?? smokerProfile?.fuelType ?? 'Not recorded'}
Runtime: \${Number.isFinite(smokerProfile?.currentHours) ? smokerProfile.currentHours + ' hours' : 'Not recorded'}
Hopper capacity: \${Number.isFinite(specs?.hopperCapacityLbs) ? specs.hopperCapacityLbs + ' lbs [CALCULATED]' : Number.isFinite(smokerProfile?.pelletHopperCapacityLbs) ? smokerProfile.pelletHopperCapacityLbs + ' lbs [USER DATA]' : 'Not recorded'}
Calculated equipment record: \${specs ? 'Present' : 'Not supplied'}
Active modification records: \${activeMods.length}
Account name: \${userAccount?.name || 'Not recorded'}
\`;
    }`,
  'non-fabricating smoker context',
);

source = source.replace("Preferred Wood Pellet Types: \${woods.join(', ') || 'Pecan, Post Oak'}", "Preferred Wood Pellet Types: \${woods.join(', ') || 'No approved preference recorded'}");
source = source.replace("Favorite Meat Cuts: \${proteins.join(', ') || 'Beef Brisket, Pork Butt'}", "Favorite Meat Cuts: \${proteins.join(', ') || 'No approved preference recorded'}");
source = source.replace('You are CharGPT — a self-learning, evolving BBQ Chatbot for the Smoke Stack app.', "You are CharGPT — SmokeStack's learning BBQ cooking assistant.");
source = source.replace('If the user\'s prompt teaches you a new rule, preference, or correction (e.g. "Remember that I like...", "Always...", "My family prefers..."), explicitly confirm that CharGPT has logged it into your BBQ Memory Vault!', 'If the user expresses a new preference or correction, propose it for explicit confirmation. Never claim chat stored it.');
source = source.replace(/- Whenever the user tells you their name[^\n]*/, '- If the user states a name, acknowledge it and ask whether they want SmokeStack to remember it. Never emit hidden memory tags or claim it was saved.');
source = source.replace('You have direct, full access to all details of the user\'s selected smoker profile and installed modifications:', 'Use only the equipment values explicitly present in the authoritative context. Missing values are unknown:');
source = source.replace('- Always evaluate whether the user\'s selected smoker is MODDED (active aftermarket modifications) or NON-MODDED (factory stock configuration).', '- Evaluate modification status only when authoritative modification records are present; otherwise state that it is unknown.');
source = source.replace('- Always customize your thermal curve advice, pellet consumption estimates, hopper runtime alerts, mod tuning recommendations, and recipe instructions directly to their specific selected smoker model and installed mods!', '- Personalize only from authoritative values supplied for this request. Keep unsupported equipment advice [GENERAL GUIDANCE].');

requiredReplace(
  "const systemInstruction = companionMissionContext + '\\n\\n' + ",
  "const systemInstruction = CHARGPT_CONSTITUTION + '\\n\\n' + companionMissionContext + '\\n\\n' + ",
  'constitutional system instruction',
);

source = source.replaceAll('c.ratings?.overall || 5', "c.ratings?.overall ?? 'not recorded'");
source = source.replaceAll('c.ratings?.tenderness || 5', "c.ratings?.tenderness ?? 'not recorded'");
source = source.replaceAll('c.ratings?.bark || 5', "c.ratings?.bark ?? 'not recorded'");
source = source.replaceAll('c.ratings?.juiciness || 5', "c.ratings?.juiciness ?? 'not recorded'");
source = source.replaceAll('c.ratings?.smokeFlavor || 5', "c.ratings?.smokeFlavor ?? 'not recorded'");
source = source.replace("!hasTrustedEquipment &&\n      (", "!hasTrustedEquipment &&\n      req.body?.charGPTContextMeta?.authenticated !== true &&\n      (");

requiredReplace(
  "app.post('/api/chargpt', handleCharGPTRequest);\napp.post('/api/ai-pitmaster', handleCharGPTRequest);",
  "app.post('/api/chargpt', optionalAuth, hydrateAuthoritativeCharGPTContext, handleCharGPTRequest);\napp.post('/api/ai-pitmaster', optionalAuth, hydrateAuthoritativeCharGPTContext, handleCharGPTRequest);",
  'authoritative CharGPT route chain',
);

for (const required of ['CHARGPT_CONSTITUTION', 'hydrateAuthoritativeCharGPTContext', "req.user?.role === 'owner'", 'UNAVAILABLE FOR THIS REQUEST']) {
  if (!source.includes(required)) throw new Error(`[chargpt-contract] Verification failed: ${required}`);
}

fs.writeFileSync(targetPath, source, 'utf8');
console.log('[chargpt-contract] Enforced account-scoped context, capability truth, constitutional prompts, and response validation.');
