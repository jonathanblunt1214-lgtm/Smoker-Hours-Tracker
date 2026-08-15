import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebaseAdmin';
import { AuthenticatedRequest, requireAuth } from './authMiddleware';

export const communitySmokersRouter = Router();

const STRING_FIELDS = new Set([
  'name', 'builderName', 'smokerType', 'fuelType', 'metalGauge', 'draftType',
  'brand', 'model', 'category', 'insulationType', 'thermalEfficiencyRating',
  'controllerType', 'notes',
]);
const NUMBER_FIELDS = new Set([
  'chamberVolumeSqIn', 'hopperCapacityLbs', 'baselineBurnRateLbsHr',
  'factoryBaselineBurnRateLbsHr', 'factoryHighHeatBurnRateLbsHr',
  'bowlCapacityLbs', 'cookingAreaSqIn',
]);

function cleanText(value: unknown, max = 240): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function sanitizeSpecs(raw: unknown): Record<string, string | number> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<string, string | number> = {};
  for (const [field, value] of Object.entries(raw as Record<string, unknown>)) {
    if (STRING_FIELDS.has(field)) {
      const cleaned = cleanText(value, field === 'notes' ? 2000 : 240);
      if (cleaned) result[field] = cleaned;
    }
    if (NUMBER_FIELDS.has(field)) {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric >= 0) result[field] = numeric;
    }
  }
  return result;
}

communitySmokersRouter.post('/contribute', requireAuth, async (req: AuthenticatedRequest, res) => {
  const kind = req.body?.kind === 'manufacturer' ? 'manufacturer' : req.body?.kind === 'custom' ? 'custom' : null;
  if (!kind) return res.status(400).json({ error: 'kind must be custom or manufacturer.' });
  if (req.body?.consent !== true) return res.status(400).json({ error: 'Explicit community contribution consent is required.' });

  const specs = sanitizeSpecs(req.body?.specs);
  const title = kind === 'manufacturer'
    ? [specs.brand, specs.model].filter(Boolean).join(' ')
    : cleanText(specs.name);
  if (!title) return res.status(400).json({ error: 'A smoker name or manufacturer brand and model are required.' });

  const submittedAt = new Date().toISOString();
  const structuredSpecs = Object.fromEntries(Object.entries(specs).map(([field, value]) => [field, {
    value,
    unit: null,
    evidence: `Entered by an authenticated SmokeStack user for community review: ${field} = ${String(value)}`,
    sourceUrl: null,
    status: 'observed_candidate',
  }]));
  const claims = Object.entries(specs)
    .filter(([field]) => field !== 'notes')
    .map(([field, value]) => `Community submission states ${field}: ${String(value)}`);

  const ref = await adminDb.collection('verifiedKnowledge').add({
    type: 'smoker',
    title,
    claims,
    structuredSpecs,
    provenanceClass: 'USER_ENTERED',
    verificationScope: 'community_submission_pending',
    communityKind: kind,
    source: {
      url: null,
      type: 'user_observation',
      publisher: null,
      retrievedAt: submittedAt,
      harvested: false,
    },
    status: 'pending_review',
    submittedBy: req.user!.uid,
    submittedAt: FieldValue.serverTimestamp(),
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
  });

  res.status(201).json({ ok: true, id: ref.id, status: 'pending_review', provenanceClass: 'USER_ENTERED' });
});
