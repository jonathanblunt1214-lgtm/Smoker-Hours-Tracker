import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebaseAdmin';
import { AuthenticatedRequest, requireAdmin, requireAuth } from './authMiddleware';

export const verifiedKnowledgeRouter = Router();

const TYPES = new Set(['smoker', 'fuel', 'meat', 'mod']);
const SOURCE_TYPES = new Set(['manufacturer', 'government', 'standards_body', 'verified_publisher']);

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

verifiedKnowledgeRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  const type = clean(req.query.type);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  try {
    let query: any = adminDb.collection('verifiedKnowledge').where('status', '==', 'published');
    if (type && TYPES.has(type)) query = query.where('type', '==', type);
    const snapshot = await query.limit(limit).get();
    const records = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    res.json({ records, verificationPolicy: 'Only reviewed records with source provenance are published.' });
  } catch (error: any) {
    res.status(503).json({ error: error?.message || 'Verified knowledge is unavailable.' });
  }
});

verifiedKnowledgeRouter.post('/candidates', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const body = req.body ?? {};
  const type = clean(body.type);
  const title = clean(body.title);
  const sourceUrl = clean(body.sourceUrl);
  const sourceType = clean(body.sourceType);
  const claims = Array.isArray(body.claims) ? body.claims.filter((v: unknown) => typeof v === 'string' && v.trim()).map((v: string) => v.trim()) : [];

  if (!TYPES.has(type) || !title || !sourceUrl || !SOURCE_TYPES.has(sourceType) || claims.length === 0) {
    return res.status(400).json({ error: 'type, title, approved sourceType, sourceUrl, and at least one claim are required.' });
  }
  if (!/^https:\/\//i.test(sourceUrl)) return res.status(400).json({ error: 'sourceUrl must use HTTPS.' });

  const ref = await adminDb.collection('verifiedKnowledge').add({
    type,
    title,
    claims,
    source: { url: sourceUrl, type: sourceType, publisher: clean(body.publisher) || null, retrievedAt: new Date().toISOString() },
    status: 'pending_review',
    submittedBy: req.user!.uid,
    submittedAt: FieldValue.serverTimestamp(),
    reviewedBy: null,
    reviewedAt: null,
  });
  res.status(201).json({ ok: true, id: ref.id, status: 'pending_review' });
});

verifiedKnowledgeRouter.post('/:id/review', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const decision = clean(req.body?.decision);
  if (decision !== 'publish' && decision !== 'reject') return res.status(400).json({ error: 'decision must be publish or reject.' });
  const ref = adminDb.collection('verifiedKnowledge').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: 'Knowledge candidate not found.' });
  const record: any = snap.data();
  if (!record?.source?.url || !record?.source?.type || !Array.isArray(record?.claims) || record.claims.length === 0) {
    return res.status(409).json({ error: 'Candidate is missing required provenance and cannot be published.' });
  }
  const status = decision === 'publish' ? 'published' : 'rejected';
  await ref.set({ status, reviewedBy: req.user!.uid, reviewedAt: FieldValue.serverTimestamp(), reviewNote: clean(req.body?.note) || null }, { merge: true });
  res.json({ ok: true, id: req.params.id, status });
});
