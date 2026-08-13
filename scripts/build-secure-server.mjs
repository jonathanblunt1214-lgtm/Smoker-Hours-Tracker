import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'server.ts');
const outputPath = path.join(root, 'server.secure.generated.ts');

let source = fs.readFileSync(sourcePath, 'utf8');

function replaceRequired(input, needle, replacement, label) {
  if (!input.includes(needle)) throw new Error(`[secure-server] Required source pattern not found: ${label}`);
  return input.replace(needle, replacement);
}

function replaceRange(input, startMarker, endMarker, replacement, label) {
  const start = input.indexOf(startMarker);
  const end = input.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0 || end <= start) throw new Error(`[secure-server] Required range not found: ${label}`);
  return input.slice(0, start) + replacement + '\n' + input.slice(end);
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
  `app.use(express.json({ limit: '10mb' }));

// Production authorization routes: Firebase token + server-side role claims.
app.use('/api/admin', adminRolesRouter);

// Phase-0 trust firewall. These legacy routes either used global in-memory state,
// simulated integrations, or client-supplied account identity. The trusted
// client no longer depends on them; keep them unavailable until replaced by
// verified implementations.
const disabledLegacyPrefixes = [
  '/api/master-version',
  '/api/cook-logs',
  '/sync/hours',
  '/api/sync/hours',
  '/api/v1/smoker/sync',
  '/smoker/sync',
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

// Protect OWNER-only code draft generation and remove client-email authorization.
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
const catchStart = route.indexOf('  } catch (err: any) {', fallbackStart);
if (fallbackStart < 0 || catchStart < 0) throw new Error('[secure-server] Legacy code fallback boundary not found.');
route = `${route.slice(0, fallbackStart)}    return res.status(503).json({\n      success: false,\n      deploymentState: 'not_generated',\n      error: 'Owner code generation is unavailable because the configured AI service did not return a valid draft. No code was generated or deployed.',\n    });\n${route.slice(catchStart)}`;
if (route.includes('userEmail')) throw new Error('[secure-server] Client-supplied userEmail remains in protected owner route.');
if (route.includes('Applied Live') || route.includes('Ready to deploy live')) throw new Error('[secure-server] Fake deployment language remains in protected owner route.');
if (!route.includes('requireOwner as any')) throw new Error('[secure-server] OWNER middleware missing.');
source = source.slice(0, routeStart) + route + source.slice(routeEnd);

// CharGPT must never fabricate an offline answer or claim a memory update when
// the model call failed. Replace the legacy fallback and catch behavior.
const charFallback = source.indexOf('    // Fallback response for offline or unauthenticated mode');
const charCatch = source.indexOf('  } catch (err: any) {', charFallback);
if (charFallback < 0 || charCatch < 0) throw new Error('[secure-server] CharGPT fallback boundary not found.');
source = source.slice(0, charFallback) + `    return res.status(503).json({\n      error: 'CharGPT is temporarily unavailable. No AI response or memory update was generated.',\n      availability: 'unavailable',\n    });\n` + source.slice(charCatch);

const oldCatch = `  } catch (err: any) {\n    console.error('Error in CharGPT endpoint:', err);\n    return res.status(200).json({\n      text: \`🔎 CharGPT Recipe & Technique Guide:\n• Maintain 225°F - 250°F smoker temperature.\n• Use 16-mesh black pepper and coarse kosher salt for a clean bark.\n• Wrap at 160°F - 165°F stall to protect moisture.\n• Rest minimum 45 minutes in a warm cooler.\`,\n      groundingChunks: [],\n      searchEntryPoint: '',\n    });\n  }`;
const newCatch = `  } catch (err: any) {\n    console.error('Error in CharGPT endpoint:', err);\n    return res.status(503).json({\n      error: 'CharGPT request failed. No fallback cooking advice was fabricated.',\n      availability: 'error',\n    });\n  }`;
source = replaceRequired(source, oldCatch, newCatch, 'truthful CharGPT error handling');

fs.writeFileSync(outputPath, source, 'utf8');
console.log(`[secure-server] Generated ${path.relative(root, outputPath)}`);
console.log('[secure-server] Verified: OWNER auth, legacy simulated routes disabled, no fake code deployment, truthful CharGPT failures.');
