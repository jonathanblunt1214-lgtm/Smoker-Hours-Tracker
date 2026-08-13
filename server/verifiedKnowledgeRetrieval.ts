import { adminDb } from './firebaseAdmin';

function keywords(text: string): string[] {
  return Array.from(new Set(text.toLowerCase().match(/[a-z0-9]+/g) || []))
    .filter((word) => word.length >= 3)
    .slice(0, 40);
}

export async function getPublishedKnowledgeForPrompt(prompt: string, limit = 8): Promise<any[]> {
  const promptWords = new Set(keywords(prompt));
  if (promptWords.size === 0) return [];

  const snapshot = await adminDb.collection('verifiedKnowledge')
    .where('status', '==', 'published')
    .limit(100)
    .get();

  return snapshot.docs
    .map((doc: any) => ({ id: doc.id, ...doc.data() }))
    .filter((record: any) => {
      if (!record?.source?.url || !record?.source?.type || !Array.isArray(record?.claims)) return false;
      const haystack = [record.title, record.type, record.source?.publisher, ...record.claims].filter(Boolean).join(' ');
      return keywords(haystack).some((word) => promptWords.has(word));
    })
    .slice(0, Math.max(1, Math.min(limit, 20)));
}
