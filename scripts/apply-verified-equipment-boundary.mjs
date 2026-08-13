import fs from 'node:fs';
import path from 'node:path';

const targetPath = path.join(process.cwd(), 'server.secure.generated.ts');
let source = fs.readFileSync(targetPath, 'utf8');

const retrievalNeedle = "    let verifiedKnowledgeContextStr = '';\n    try {\n      const verifiedRecords = await getPublishedKnowledgeForPrompt(String(prompt || ''), 8);\n      if (verifiedRecords.length > 0) {";
const retrievalReplacement = "    let verifiedKnowledgeContextStr = '';\n    let verifiedRecordsForRequest: any[] = [];\n    try {\n      verifiedRecordsForRequest = await getPublishedKnowledgeForPrompt(String(prompt || ''), 8);\n      if (verifiedRecordsForRequest.length > 0) {";

if (!source.includes(retrievalNeedle)) throw new Error('[verified-boundary] Retrieval hook not found.');
source = source.replace(retrievalNeedle, retrievalReplacement);
source = source.replaceAll('verifiedRecords.map((record: any, idx: number)', 'verifiedRecordsForRequest.map((record: any, idx: number)');

const responseNeedle = '    if (response?.text) {';
if (!source.includes(responseNeedle)) throw new Error('[verified-boundary] Response hook not found.');

const boundary = `    if (verifiedRecordsForRequest.length > 0) {
      const verifiedSections = verifiedRecordsForRequest.map((record: any) => {
        const claims = Array.isArray(record.claims) ? record.claims : [];
        const title = String(record.title || 'Verified SmokeStack record');
        const publisher = String(record.source?.publisher || 'Verified source');
        const sourceUrl = String(record.source?.url || '');
        const claimLines = claims.map((claim: string) => '- ' + claim + ' [VERIFIED]').join('\\n');
        return '### ' + title + '\\n\\n' + claimLines + '\\n\\nSource: ' + publisher + (sourceUrl ? ' — ' + sourceUrl : '');
      }).join('\\n\\n---\\n\\n');

      return res.json({
        text: verifiedSections + '\\n\\nSmokeStack is limiting model-specific facts to the reviewed claims above. Conflicting, unpublished, or unsupported equipment specifications are intentionally omitted. [VERIFIED]',
        groundingChunks: [],
        searchEntryPoint: '',
        groundingStatus: 'verified_claims_only',
        verifiedRecordCount: verifiedRecordsForRequest.length,
      });
    }

`;

source = source.replace(responseNeedle, boundary + responseNeedle);
fs.writeFileSync(targetPath, source, 'utf8');
console.log('[verified-boundary] Enforced deterministic published-claim responses for verified equipment.');
