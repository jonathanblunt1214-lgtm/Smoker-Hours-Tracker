import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebaseAdmin';
import { AuthenticatedRequest, requireAdmin, requireAuth } from './authMiddleware';
import { harvestMeatKnowledge } from './meatKnowledgeHarvester';

export const meatKnowledgeRouter = Router();

const MEAT_DOMAINS = ['fsis.usda.gov','usda.gov','ciachef.edu','meat.tamu.edu','beefitswhatsfordinner.com','pork.org'];
function clean(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function host(url: string): string { try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } }
function approvedMeatUrl(url: string): boolean { const h = host(url); return MEAT_DOMAINS.some((domain) => h === domain || h.endsWith(`.${domain}`)); }
function claimText(claim: any): string { const unit = claim?.unit ? ` ${claim.unit}` : ''; return `${claim?.kind || 'claim'}: ${claim?.value ?? ''}${unit} — Evidence: ${claim?.evidence || ''}`.trim(); }

async function saveCandidate(req: AuthenticatedRequest, res: any, sourceUrl: string) {
  try {
    const candidate = await harvestMeatKnowledge({ sourceUrl });
    const existing = await adminDb.collection('verifiedKnowledge').limit(500).get();
    const duplicate = existing.docs.find((doc) => { const data: any = doc.data(); return clean(data?.source?.url) === candidate.sourceUrl && clean(data?.title).toLowerCase() === candidate.title.toLowerCase() && data?.status !== 'rejected'; });
    if (duplicate) return res.status(409).json({ error: 'This meat source/title already exists in Pending Review or the published catalog.', id: duplicate.id });
    const sourceType = candidate.sourceType === 'government' ? 'government' : 'verified_publisher';
    const ref = await adminDb.collection('verifiedKnowledge').add({
      type: 'meat', title: candidate.title, claims: candidate.claims.map(claimText), claimDetails: candidate.claims, structuredSpecs: {},
      source: { url: candidate.sourceUrl, type: sourceType, publisher: candidate.publisher, retrievedAt: candidate.harvestedAt, harvested: true, harvester: 'meat', sourceClass: candidate.sourceType, constitutionAmendment: 'docs/constitution/AMENDMENT-BBQ-VS-GRILLING.md' },
      status: 'pending_review', verificationState: 'candidate_review_required', submittedBy: req.user!.uid, submittedAt: FieldValue.serverTimestamp(), reviewedBy: null, reviewedAt: null, reviewNote: null,
    });
    return res.status(201).json({ ok: true, id: ref.id, status: 'pending_review', candidate });
  } catch (error: any) { return res.status(422).json({ error: error?.message || 'Meat harvest failed. Nothing was saved.' }); }
}

meatKnowledgeRouter.post('/harvest', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res, next) => {
  const mode = clean(req.body?.mode);
  const value = clean(req.body?.value);
  if (mode !== 'url' || !approvedMeatUrl(value)) return next();
  return saveCandidate(req, res, value);
});

meatKnowledgeRouter.post('/harvest-meat', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const sourceUrl = clean(req.body?.sourceUrl || req.body?.value);
  if (!sourceUrl) return res.status(400).json({ error: 'An approved HTTPS meat-source URL is required.' });
  return saveCandidate(req, res, sourceUrl);
});
