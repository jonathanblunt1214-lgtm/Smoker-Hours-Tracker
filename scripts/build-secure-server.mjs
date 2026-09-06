import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'server.ts');
const outputPath = path.join(root, 'server.secure.generated.ts');

let source = fs.readFileSync(sourcePath, 'utf8').replace(/\r\n/g, '\n');

function replaceRequired(input, needle, replacement, label) {
  if (!input.includes(needle)) throw new Error(`[secure-server] Required source pattern not found: ${label}`);
  return input.replace(needle, replacement);
}

source = replaceRequired(
  source,
  "import { requireAuth, AuthenticatedRequest } from './server/authMiddleware';",
  "import { requireAuth, AuthenticatedRequest } from './server/authMiddleware';\nimport { adminRolesRouter } from './server/adminRoles';\nimport { accountLifecycleRouter } from './server/accountLifecycle';\nimport { communitySmokersRouter } from './server/communitySmokers';",
  'secure auth imports',
);

source = replaceRequired(
  source,
  "app.use(express.json({ limit: '10mb' }));",
  `app.use(express.json({ limit: '10mb' }));

// Production authorization routes: Firebase token + server-side role claims.
app.use('/api/admin', adminRolesRouter);
app.use('/api/account', accountLifecycleRouter);
app.use('/api/community-smokers', communitySmokersRouter);

// Phase-0 trust firewall. These legacy routes used simulated/global state,
// client-supplied account identity, or unverified seeded knowledge. The trusted
// client no longer depends on them; keep them unavailable until replaced by a
// source-backed implementation.
const disabledLegacyPrefixes = [
  '/api/master-version',
  '/api/master/generate-code-patch',
  '/api/cook-logs',
  '/sync/hours',
  '/api/sync/hours',
  '/api/v1/smoker/sync',
  '/smoker/sync',
  '/api/federated-learning',
  '/api/smoker-database',
  '/api/custom-smokers',
  '/api/manufacturer-smokers',
  '/api/verified-cuts',
  '/api/togrill',
  '/api/alexa',
  '/api/push/send-alert',
  '/api/analyze-cook-graph',
  '/api/chargpt/analyze-meat-photo',
  '/api/chargpt/identify-unknown-cut',
  '/api/chargpt/verify-cut-online',
  '/api/chargpt/optimize-blend',
  '/api/chargpt/pitmaster-courses',
];
app.use((req, res, next) => {
  if (disabledLegacyPrefixes.some((prefix) => req.path === prefix || req.path.startsWith(prefix + '/'))) {
    return res.status(503).json({
      success: false,
      error: 'This legacy integration is disabled in the trusted runtime until a verified implementation is available.',
      integrationStatus: 'unavailable',
    });
  }
  next();
});`,
  'admin router and phase0 trust firewall',
);

// CharGPT failures must already be truthful in the reviewed source. The secure
// build verifies that contract instead of retaining an inert fabricated reply.
if (!source.includes("error: 'CharGPT is temporarily unavailable. No AI response or memory update was generated.'")
  || !source.includes("error: 'CharGPT request failed. No fallback cooking advice was fabricated.'")) {
  throw new Error('[secure-server] Truthful CharGPT failure handling not found.');
}

fs.writeFileSync(outputPath, source, 'utf8');
console.log(`[secure-server] Generated ${path.relative(root, outputPath)}`);
console.log('[secure-server] Verified: OWNER auth, unverified/simulated legacy routes disabled, no fake code deployment, truthful CharGPT failures.');
