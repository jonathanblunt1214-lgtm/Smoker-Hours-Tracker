import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'server.ts');
const outputDir = path.join(root, '.generated');
const outputPath = path.join(outputDir, 'server.secure.ts');

let source = fs.readFileSync(sourcePath, 'utf8');

function replaceRequired(input, needle, replacement, label) {
  if (!input.includes(needle)) {
    throw new Error(`[secure-server] Required source pattern not found: ${label}`);
  }
  return input.replace(needle, replacement);
}

source = replaceRequired(
  source,
  "import { requireAuth, AuthenticatedRequest } from './server/authMiddleware';",
  "import { requireAuth, requireOwner, AuthenticatedRequest } from './server/authMiddleware';\nimport { adminRolesRouter } from './server/adminRoles';",
  'secure auth imports',
);

source = replaceRequired(
  source,
  "app.use(express.json({ limit: '10mb' }));",
  "app.use(express.json({ limit: '10mb' }));\n\n// Production authorization routes: Firebase token + server-side role claims.\napp.use('/api/admin', adminRolesRouter);",
  'admin role router mount',
);

const routeStart = source.indexOf('// Master Admin Air-Gapped AI Code Generator Endpoint');
const routeEnd = source.indexOf('// Health check', routeStart);
if (routeStart < 0 || routeEnd < 0 || routeEnd <= routeStart) {
  throw new Error('[secure-server] Legacy master code generator route could not be isolated safely.');
}

let route = source.slice(routeStart, routeEnd);

route = replaceRequired(
  route,
  "app.post('/api/master/generate-code-patch', async (req, res) => {",
  "app.post('/api/master/generate-code-patch', requireAuth as any, requireOwner as any, async (req: AuthenticatedRequest, res) => {",
  'owner-only master code generator route',
);

route = replaceRequired(
  route,
  "    const { prompt, category, userEmail } = req.body;\n\n    if (userEmail && userEmail.trim().toLowerCase() !== 'jonathanblunt1214@gmail.com') {\n      return res.status(403).json({\n        success: false,\n        error: 'Forbidden: Only Master Admin (jonathanblunt1214@gmail.com) can access the Air-Gapped Code Generator.',\n      });\n    }\n",
  "    const { prompt, category } = req.body ?? {};\n",
  'remove client-supplied email authorization',
);

route = route.replace(
  'You are the Master Admin Air-Gapped AI Code Generator for the Smoker Hours live update system.',
  'You are the OWNER-only SmokeStack code draft generator. You generate reviewable draft patches; you do not deploy or apply code.',
);
route = route.replace(
  '1. AIR-GAPPED ISOLATION: This code generation engine is strictly isolated for Master Admin use. CharGPT users and public prompts CANNOT access or inspect this code space.',
  '1. OWNER AUTHORIZATION: The server has already verified an OWNER Firebase token before this request reaches you. Generate a draft only; never claim deployment or live application.',
);
route = route.replace(
  "          return res.json({ success: true, result: parsed });",
  "          return res.json({ success: true, deploymentState: 'draft', result: parsed });",
);
route = route.replace(
  "        console.warn('Gemini code generation call failed, returning smart offline code fallback:', err?.message || err);",
  "        console.warn('Owner code generation call failed:', err?.message || err);",
);

const fallbackStart = route.indexOf('    // Smart fallback code generator when offline');
if (fallbackStart < 0) {
  throw new Error('[secure-server] Legacy fake code-generation fallback was not found.');
}
const catchStart = route.indexOf('  } catch (err: any) {', fallbackStart);
if (catchStart < 0) {
  throw new Error('[secure-server] Code-generator catch boundary was not found.');
}

route = `${route.slice(0, fallbackStart)}    // No fabricated offline patch: unavailable generation is reported honestly.\n    return res.status(503).json({\n      success: false,\n      deploymentState: 'not_generated',\n      error: 'Owner code generation is unavailable because the configured AI service did not return a valid draft. No code was generated or deployed.',\n    });\n${route.slice(catchStart)}`;

if (route.includes('userEmail')) {
  throw new Error('[secure-server] Client-supplied userEmail remains in protected owner route.');
}
if (route.includes('Applied Live') || route.includes('Ready to deploy live')) {
  throw new Error('[secure-server] Fake deployment language remains in protected owner route.');
}
if (!route.includes("requireOwner as any")) {
  throw new Error('[secure-server] OWNER middleware was not applied to protected owner route.');
}

source = source.slice(0, routeStart) + route + source.slice(routeEnd);

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, source, 'utf8');

console.log(`[secure-server] Generated ${path.relative(root, outputPath)}`);
console.log('[secure-server] Verified: Firebase auth required, OWNER required, no client-email authorization, no fake Applied Live fallback.');
