import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebaseAdmin';
import { AuthenticatedRequest, requireAdmin, requireAuth } from './authMiddleware';
import { harvestKnowledge } from './knowledgeHarvester';
import { revalidatePublishedKnowledge } from './knowledgeRevalidation';
import { readAccountOverlay, writeAccountOverlay } from './accountKnowledgeOverlays';

export { getPublishedKnowledgeForPrompt } from './verifiedKnowledgeRetrieval';
export const verifiedKnowledgeRouter = Router();

const TYPES = new Set(['smoker', 'fuel', 'meat', 'temperature', 'mod', 'recipe', 'retailer_price']);
const SOURCE_TYPES = new Set(['manufacturer', 'government', 'standards_body', 'verified_publisher']);
const STATUSES = new Set(['pending_review', 'published', 'rejected']);
const HARVEST_MODES = new Set(['url', 'smoker', 'fuel', 'mod']);

function clean(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function serializeRecord(doc: any) {
  const data = doc.data();
  const submittedAt = data.submittedAt?.toDate?.() ?? null;
  const reviewedAt = data.reviewedAt?.toDate?.() ?? null;
  return { id: doc.id, ...data, submittedAt: submittedAt ? submittedAt.toISOString() : data.submittedAt ?? null, reviewedAt: reviewedAt ? reviewedAt.toISOString() : data.reviewedAt ?? null };
}
function verifiedStructuredSpecs(specs: any) {
  if (!specs || typeof specs !== 'object') return {};
  return Object.fromEntries(Object.entries(specs).map(([field, metric]: any) => [field, metric?.status === 'candidate' ? { ...metric, status: 'verified', verifiedAt: new Date().toISOString() } : metric]));
}

verifiedKnowledgeRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  const type = clean(req.query.type);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  try {
    let query: any = adminDb.collection('verifiedKnowledge').where('status', '==', 'published');
    if (type && TYPES.has(type)) query = query.where('type', '==', type);
    const snapshot = await query.limit(limit).get();
    res.json({ records: snapshot.docs.map(serializeRecord), verificationPolicy: 'Only reviewed records with source provenance are published.' });
  } catch (error: any) { res.status(503).json({ error: error?.message || 'Verified knowledge is unavailable.' }); }
});

verifiedKnowledgeRouter.get('/candidates', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const requestedStatus = clean(req.query.status);
  const requestedType = clean(req.query.type);
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);
  try {
    const snapshot = await adminDb.collection('verifiedKnowledge').limit(500).get();
    let records = snapshot.docs.map(serializeRecord);
    if (requestedStatus && STATUSES.has(requestedStatus)) records = records.filter((record: any) => record.status === requestedStatus);
    if (requestedType && TYPES.has(requestedType)) records = records.filter((record: any) => record.type === requestedType);
    records.sort((a: any, b: any) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));
    res.json({ records: records.slice(0, limit) });
  } catch (error: any) { res.status(503).json({ error: error?.message || 'Verified knowledge review queue is unavailable.' }); }
});

verifiedKnowledgeRouter.post('/scheduler/revalidate', async (req, res) => {
  if (clean(req.header('x-cloudscheduler')).toLowerCase() !== 'true') return res.status(403).json({ error: 'Scheduler invocation required.' });
  try { res.json({ ok: true, ...(await revalidatePublishedKnowledge(200)) }); }
  catch (error: any) { res.status(503).json({ error: error?.message || 'Knowledge revalidation failed.' }); }
});

verifiedKnowledgeRouter.get('/account-metrics/:entityType/:recordId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try { res.json(await readAccountOverlay(req.user!.uid, req.params.entityType, req.params.recordId)); }
  catch (error: any) { res.status(404).json({ error: error?.message || 'Account-linked metrics unavailable.' }); }
});

verifiedKnowledgeRouter.post('/account-metrics/:entityType/:recordId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await writeAccountOverlay(req.user!.uid, req.params.entityType, req.params.recordId, req.body?.values);
    res.status(result.ok ? 200 : 409).json(result);
  } catch (error: any) { res.status(422).json({ error: error?.message || 'Account-linked metrics could not be saved.' }); }
});

verifiedKnowledgeRouter.post('/harvest', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const mode = clean(req.body?.mode), value = clean(req.body?.value);
  if (!HARVEST_MODES.has(mode) || !value) return res.status(400).json({ error: 'mode must be url, smoker, fuel, or mod, and value is required.' });
  try {
    const candidate = await harvestKnowledge({ mode: mode as 'url' | 'smoker' | 'fuel' | 'mod', value });
    const duplicateSnapshot = await adminDb.collection('verifiedKnowledge').limit(500).get();
    const duplicate = duplicateSnapshot.docs.find((doc: any) => { const record: any = doc.data(); return clean(record?.source?.url) === candidate.sourceUrl && clean(record?.title).toLowerCase() === candidate.title.toLowerCase() && record?.status !== 'rejected'; });
    if (duplicate) return res.status(409).json({ error: 'This source/title already exists in the knowledge queue or published catalog.', id: duplicate.id });
    const ref = await adminDb.collection('verifiedKnowledge').add({
      type: candidate.type, title: candidate.title, claims: candidate.claims, structuredSpecs: candidate.structuredSpecs,
      source: { url: candidate.sourceUrl, type: candidate.sourceType, publisher: candidate.publisher, retrievedAt: new Date().toISOString(), harvested: true, harvestQuery: { mode, value } },
      status: 'pending_review', submittedBy: req.user!.uid, submittedAt: FieldValue.serverTimestamp(), reviewedBy: null, reviewedAt: null, reviewNote: null,
    });
    res.status(201).json({ ok: true, id: ref.id, status: 'pending_review', candidate });
  } catch (error: any) { res.status(422).json({ error: error?.message || 'Knowledge harvest failed. Nothing was saved.' }); }
});

verifiedKnowledgeRouter.post('/candidates', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const body = req.body ?? {}, type = clean(body.type), title = clean(body.title), sourceUrl = clean(body.sourceUrl), sourceType = clean(body.sourceType);
  const claims = Array.isArray(body.claims) ? body.claims.filter((v: unknown) => typeof v === 'string' && v.trim()).map((v: string) => v.trim()) : [];
  if (!TYPES.has(type) || !title || !sourceUrl || !SOURCE_TYPES.has(sourceType) || claims.length === 0) return res.status(400).json({ error: 'type, title, approved sourceType, sourceUrl, and at least one claim are required.' });
  if (!/^https:\/\//i.test(sourceUrl)) return res.status(400).json({ error: 'sourceUrl must use HTTPS.' });
  const ref = await adminDb.collection('verifiedKnowledge').add({ type, title, claims, structuredSpecs: body.structuredSpecs || {}, source: { url: sourceUrl, type: sourceType, publisher: clean(body.publisher) || null, retrievedAt: new Date().toISOString() }, status: 'pending_review', submittedBy: req.user!.uid, submittedAt: FieldValue.serverTimestamp(), reviewedBy: null, reviewedAt: null, reviewNote: null });
  res.status(201).json({ ok: true, id: ref.id, status: 'pending_review' });
});

verifiedKnowledgeRouter.post('/:id/review', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const decision = clean(req.body?.decision);
  if (decision !== 'publish' && decision !== 'reject') return res.status(400).json({ error: 'decision must be publish or reject.' });
  const ref = adminDb.collection('verifiedKnowledge').doc(req.params.id), snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: 'Knowledge candidate not found.' });
  const record: any = snap.data();
  if (record?.status !== 'pending_review') return res.status(409).json({ error: `Only pending_review records can be reviewed. Current status: ${record?.status || 'unknown'}.` });
  if (!record?.source?.url || !record?.source?.type || (!Array.isArray(record?.claims) && !record?.structuredSpecs)) return res.status(409).json({ error: 'Candidate is missing required provenance and cannot be published.' });
  const status = decision === 'publish' ? 'published' : 'rejected';
  await ref.set({ status, structuredSpecs: decision === 'publish' ? verifiedStructuredSpecs(record.structuredSpecs) : record.structuredSpecs || {}, reviewedBy: req.user!.uid, reviewedAt: FieldValue.serverTimestamp(), reviewNote: clean(req.body?.note) || null }, { merge: true });
  res.json({ ok: true, id: req.params.id, status });
});
