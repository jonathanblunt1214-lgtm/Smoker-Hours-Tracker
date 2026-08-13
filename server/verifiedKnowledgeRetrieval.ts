import { adminDb } from './firebaseAdmin';

const STOP_WORDS = new Set([
  'the','and','for','with','from','that','this','what','when','where','which','who','why','how','can','tell','about','into','onto','your','you','are','was','were','has','have','had','its','our','their','them','they','but','not','all','any','per','via','use','uses','using','used','also','more','less','than','then','only','does','did','will','would','should','could','minimum','maximum',
]);

function keywords(text: string): string[] {
  return Array.from(new Set(text.toLowerCase().match(/[a-z0-9]+/g) || []))
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
    .slice(0, 60);
}

function exactIdentifiers(text: string): string[] {
  return Array.from(new Set((text.toUpperCase().match(/\b[A-Z0-9]+(?:[-_][A-Z0-9]+)*\d[A-Z0-9-]*\b/g) || [])))
    .filter((token) => token.length >= 4);
}

function scoreRecord(prompt: string, record: any): number {
  const promptWords = new Set(keywords(prompt));
  const titleWords = new Set(keywords(record?.title || ''));
  const claimWords = new Set(keywords(Array.isArray(record?.claims) ? record.claims.join(' ') : ''));
  const publisherWords = new Set(keywords(record?.source?.publisher || ''));

  let score = 0;
  for (const word of promptWords) {
    if (titleWords.has(word)) score += 4;
    if (claimWords.has(word)) score += 2;
    if (publisherWords.has(word)) score += 1;
  }

  const promptIds = new Set(exactIdentifiers(prompt));
  const recordIds = new Set(exactIdentifiers([
    record?.title,
    ...(Array.isArray(record?.claims) ? record.claims : []),
  ].filter(Boolean).join(' ')));
  for (const id of promptIds) if (recordIds.has(id)) score += 20;

  const p = prompt.toLowerCase();
  const type = String(record?.type || '').toLowerCase();
  if (/\b(safe|safety|internal temperature|food safety|cook temperature|minimum temp)\b/.test(p) && type === 'meat') score += 8;
  if (/\b(smoker|grill|pellet smoker|model|sku)\b/.test(p) && ['smoker', 'mod'].includes(type)) score += 4;
  if (/\b(pellet|fuel|wood blend|hardwood)\b/.test(p) && type === 'fuel') score += 4;

  return score;
}

export async function getPublishedKnowledgeForPrompt(prompt: string, limit = 8): Promise<any[]> {
  if (keywords(prompt).length === 0 && exactIdentifiers(prompt).length === 0) return [];

  const snapshot = await adminDb.collection('verifiedKnowledge')
    .where('status', '==', 'published')
    .limit(100)
    .get();

  const scored = snapshot.docs
    .map((doc: any) => ({ id: doc.id, ...doc.data() }))
    .filter((record: any) => record?.source?.url && record?.source?.type && Array.isArray(record?.claims))
    .map((record: any) => ({ record, score: scoreRecord(prompt, record) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return [];

  const topScore = scored[0].score;
  const threshold = Math.max(3, Math.ceil(topScore * 0.55));

  return scored
    .filter(({ score }) => score >= threshold)
    .slice(0, Math.max(1, Math.min(limit, 8)))
    .map(({ record }) => record);
}
