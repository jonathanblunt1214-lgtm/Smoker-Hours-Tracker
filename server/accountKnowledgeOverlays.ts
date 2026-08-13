import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebaseAdmin';
import { KnowledgeEntityType, USER_FILLABLE_FIELDS, hasVerifiedMetric, isKnowledgeEntityType } from './manufacturerSpecSchema';

function docId(type: KnowledgeEntityType, recordId: string) {
  return `${type}__${recordId}`.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 240);
}

async function record(recordId: string) {
  const snap = await adminDb.collection('verifiedKnowledge').doc(recordId).get();
  if (!snap.exists || snap.data()?.status !== 'published') return null;
  return { id: snap.id, ...snap.data() } as any;
}

export async function readAccountOverlay(uid: string, typeRaw: unknown, recordId: string) {
  if (!isKnowledgeEntityType(typeRaw)) throw new Error('Unsupported entity type.');
  const type = typeRaw as KnowledgeEntityType;
  const base = await record(recordId);
  if (!base) throw new Error('Published knowledge record not found.');
  const snap = await adminDb.collection('users').doc(uid).collection('knowledgeMetricOverlays').doc(docId(type, recordId)).get();
  const stored: any = snap.exists ? snap.data() : {};
  const values = stored?.values || {};
  const resolved: Record<string, any> = {};
  for (const [field, entry] of Object.entries(values)) {
    resolved[field] = { ...(entry as any), active: !hasVerifiedMetric(base.structuredSpecs, field), supersededByVerified: hasVerifiedMetric(base.structuredSpecs, field) };
  }
  return {
    recordId,
    entityType: type,
    verifiedSpecs: base.structuredSpecs || {},
    allowedMissingFields: Array.from(USER_FILLABLE_FIELDS[type]).filter((field) => !hasVerifiedMetric(base.structuredSpecs, field)),
    accountValues: resolved,
    verificationState: 'account_linked_unverified',
  };
}

export async function writeAccountOverlay(uid: string, typeRaw: unknown, recordId: string, valuesRaw: unknown) {
  if (!isKnowledgeEntityType(typeRaw)) throw new Error('Unsupported entity type.');
  const type = typeRaw as KnowledgeEntityType;
  const base = await record(recordId);
  if (!base) throw new Error('Published knowledge record not found.');
  const input = valuesRaw && typeof valuesRaw === 'object' ? valuesRaw as Record<string, unknown> : {};
  const accepted: Record<string, any> = {};
  const rejected: Array<{ field: string; reason: string }> = [];
  for (const [field, value] of Object.entries(input)) {
    if (!USER_FILLABLE_FIELDS[type].has(field)) rejected.push({ field, reason: 'Field is not user-fillable.' });
    else if (hasVerifiedMetric(base.structuredSpecs, field)) rejected.push({ field, reason: 'Verified source data already exists.' });
    else if (value !== '' && value !== null && value !== undefined) accepted[field] = { value, provenance: 'user_provided', enteredAt: new Date().toISOString(), linkedRecordId: recordId };
  }
  if (!Object.keys(accepted).length) return { ok: false, accepted, rejected };
  const ref = adminDb.collection('users').doc(uid).collection('knowledgeMetricOverlays').doc(docId(type, recordId));
  const old = await ref.get();
  await ref.set({ entityType: type, recordId, values: { ...(old.data()?.values || {}), ...accepted }, verificationState: 'account_linked_unverified', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { ok: true, accepted, rejected };
}
