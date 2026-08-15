import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targetPath = path.join(root, 'server.secure.generated.ts');
let source = fs.readFileSync(targetPath, 'utf8');

function replaceRequired(input, needle, replacement, label) {
  if (!input.includes(needle)) throw new Error(`[verified-knowledge] Required source pattern not found: ${label}`);
  return input.replace(needle, replacement);
}

source = replaceRequired(
  source,
  "import { adminRolesRouter } from './server/adminRoles';",
  "import { adminRolesRouter } from './server/adminRoles';\nimport { verifiedKnowledgeRouter, getPublishedKnowledgeForPrompt } from './server/verifiedKnowledge';\nimport { meatKnowledgeRouter } from './server/meatKnowledgeRoutes';\nimport { databaseHarvesterRouter } from './server/databaseHarvesterRoutes';",
  'verified knowledge imports',
);

source = replaceRequired(
  source,
  "app.use('/api/admin', adminRolesRouter);",
  "app.use('/api/admin', adminRolesRouter);\napp.use('/api/knowledge', verifiedKnowledgeRouter);\napp.use('/api/knowledge', meatKnowledgeRouter);\napp.use('/api/knowledge', databaseHarvesterRouter);",
  'verified knowledge router',
);

const retrievalBlock = `    let verifiedKnowledgeContextStr = '';
    try {
      const verifiedRecords = await getPublishedKnowledgeForPrompt(String(prompt || ''), 8);
      if (verifiedRecords.length > 0) {
        verifiedKnowledgeContextStr = \`\n=== VERIFIED SMOKESTACK KNOWLEDGE ===\nThe following records passed SmokeStack provenance and human review. Claims from these records may be labeled [VERIFIED]. Do not extend a verified claim beyond its exact wording.\n\n\${verifiedRecords.map((record: any, idx: number) => {
          const claims = Array.isArray(record.claims) ? record.claims : [];
          return \`[Verified Record #\${idx + 1}]\nType: \${record.type}\nTitle: \${record.title}\nPublisher: \${record.source?.publisher || 'Verified source'}\nSource: \${record.source?.url}\nClaims:\n\${claims.map((claim: string) => '- ' + claim).join('\\n')}\`;
        }).join('\\n\\n')}\n\`;
      }
    } catch (verifiedKnowledgeError: any) {
      console.warn('Verified knowledge retrieval unavailable; continuing without verified context:', verifiedKnowledgeError?.message || verifiedKnowledgeError);
    }

`;

source = replaceRequired(
  source,
  "    let userMessage = prompt || 'Please analyze my smoker logs and provide Smoke Stack pitmaster improvement recommendations.';",
  retrievalBlock + "    let userMessage = prompt || 'Please analyze my smoker logs and provide Smoke Stack pitmaster improvement recommendations.';\n\n    if (verifiedKnowledgeContextStr) {\n      userMessage = verifiedKnowledgeContextStr + '\\n\\nUser Question: ' + userMessage;\n    }",
  'CharGPT verified knowledge retrieval',
);

fs.writeFileSync(targetPath, source, 'utf8');
console.log('[verified-knowledge] Mounted provenance API, meat harvester review path, and published-only CharGPT retrieval.');
