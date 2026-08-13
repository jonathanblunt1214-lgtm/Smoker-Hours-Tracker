import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from './firebaseAdmin';
import { AuthenticatedRequest, requireAdmin, requireAuth, requireOwner } from './authMiddleware';

export const adminRolesRouter = Router();

async function audit(req: AuthenticatedRequest, action: string, targetUid: string, metadata: Record<string, unknown> = {}) {
  await adminDb.collection('adminAudit').add({
    actorUid: req.user!.uid,
    actorRole: req.user!.role,
    action,
    targetUid,
    metadata,
    createdAt: FieldValue.serverTimestamp(),
  });
}

adminRolesRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({
    uid: req.user!.uid,
    email: req.user!.email ?? null,
    role: req.user!.role,
    permissions: {
      admin: req.user!.role === 'owner' || req.user!.role === 'admin',
      owner: req.user!.role === 'owner',
      developer: req.user!.role === 'owner' || req.user!.claims.developer === true,
    },
  });
});

adminRolesRouter.get('/health', requireAuth, requireAdmin, async (_req, res) => {
  let firestore: 'operational' | 'degraded' = 'operational';
  let firestoreError: string | null = null;
  try {
    await adminDb.collection('adminAudit').limit(1).get();
  } catch (error: any) {
    firestore = 'degraded';
    firestoreError = error?.message || 'Firestore health check failed.';
  }

  const aiConfigured = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY);
  const aiProvider = process.env.CHARGPT_PROVIDER || (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY ? 'Gemini' : process.env.API_KEY ? 'Configured provider' : null);
  const aiModel = process.env.CHARGPT_MODEL || null;
  const commit = process.env.GIT_COMMIT_SHA || process.env.COMMIT_SHA || process.env.SOURCE_VERSION || null;
  const revision = process.env.K_REVISION || null;

  const knowledgePipelines = [
    { id: 'smokers', label: 'Smoker manufacturers', status: 'needs_setup', sourcePolicy: 'Manufacturer or verified source required' },
    { id: 'fuels', label: 'Fuel catalog', status: 'needs_setup', sourcePolicy: 'Verified product/manufacturer source required' },
    { id: 'meats', label: 'Meat & cut catalog', status: 'needs_setup', sourcePolicy: 'Verified food-safety/cooking source required' },
    { id: 'mods', label: 'Smoker modifications', status: 'needs_setup', sourcePolicy: 'Verified compatibility/source evidence required' },
  ];

  res.json({
    generatedAt: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    summary: {
      overall: firestore === 'operational' && aiConfigured ? 'healthy' : 'attention_required',
      attention: [
        ...(firestore === 'degraded' ? ['Firestore health check needs attention.'] : []),
        ...(!aiConfigured ? ['CharGPT server credential is not configured.'] : []),
        'Verified knowledge ingestion pipelines are not published yet.',
      ],
    },
    services: {
      api: { status: 'operational', detail: 'Authenticated SmokeStack Operations API responded.' },
      authorization: { status: 'operational', detail: 'Firebase custom claims verified.' },
      firestore: { status: firestore, detail: firestoreError || 'Authoritative account data service responded.' },
      chargpt: {
        status: aiConfigured ? 'configured' : 'not_configured',
        detail: aiConfigured ? 'Server-side CharGPT credential is configured.' : 'No server-side AI credential detected.',
      },
      sync: { status: firestore === 'operational' ? 'configured' : 'degraded', detail: 'Signed-in account data uses Firebase/Firestore. A separate fleet-wide sync operations service is not implemented.' },
      knowledgePipelines: { status: 'needs_setup', detail: 'Verified smoker/fuel/meat/mod ingestion and approval pipelines have not been published yet.' },
      backup: { status: 'client_managed', detail: 'Google Drive remains an optional user backup/export integration.' },
    },
    chargpt: {
      status: aiConfigured ? 'ready' : 'needs_setup',
      provider: aiProvider,
      model: aiModel,
      credentials: aiConfigured ? 'configured' : 'missing',
      retrieval: 'not_configured',
      evaluation: 'not_configured',
      feedbackReview: 'not_configured',
      durableLearning: 'approval_required',
      detail: aiConfigured
        ? 'CharGPT can call the configured server-side model. Retrieval, evaluation, and learning review services still need production implementation.'
        : 'Configure the server-side AI provider before CharGPT can be considered production ready.',
    },
    knowledge: {
      status: 'needs_setup',
      pipelines: knowledgePipelines,
      publishingPolicy: 'No record is presented as verified until provenance and review gates pass.',
    },
    release: {
      appVersion: process.env.APP_VERSION || null,
      commit,
      revision,
      status: commit || revision ? 'metadata_available' : 'metadata_unavailable',
    },
  });
});

adminRolesRouter.get('/audit', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const snapshot = await adminDb.collection('adminAudit').orderBy('createdAt', 'desc').limit(50).get();
    const events = snapshot.docs.map((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() ?? null;
      return {
        id: doc.id,
        actorUid: data.actorUid ?? null,
        actorRole: data.actorRole ?? null,
        action: data.action ?? 'unknown',
        targetUid: data.targetUid ?? null,
        metadata: data.metadata ?? {},
        createdAt: createdAt ? createdAt.toISOString() : null,
      };
    });
    res.json({ events });
  } catch (error: any) {
    res.status(503).json({ error: error?.message || 'Audit log is unavailable.' });
  }
});

adminRolesRouter.get('/roles', requireAuth, requireOwner, async (_req, res) => {
  try {
    const snapshot = await adminDb.collection('adminRoles').orderBy('updatedAt', 'desc').limit(100).get();
    const roles = snapshot.docs.map((doc) => {
      const data = doc.data();
      const updatedAt = data.updatedAt?.toDate?.() ?? null;
      return {
        uid: data.uid ?? doc.id,
        email: data.email ?? null,
        role: data.role ?? 'user',
        developer: data.developer === true,
        updatedBy: data.updatedBy ?? null,
        updatedAt: updatedAt ? updatedAt.toISOString() : null,
      };
    });
    res.json({ roles });
  } catch (error: any) {
    res.status(503).json({ error: error?.message || 'Role directory is unavailable.' });
  }
});

adminRolesRouter.post('/grant', requireAuth, requireOwner, async (req: AuthenticatedRequest, res) => {
  const { uid, role = 'admin', developer = false } = req.body ?? {};
  if (!uid || (role !== 'admin' && role !== 'user')) {
    return res.status(400).json({ error: 'uid and a valid grantable role are required.' });
  }
  if (uid === req.user!.uid) return res.status(400).json({ error: 'Owner role cannot be changed here.' });

  const target = await adminAuth.getUser(uid);
  const existing = target.customClaims ?? {};
  await adminAuth.setCustomUserClaims(uid, {
    ...existing,
    role,
    admin: role === 'admin',
    owner: false,
    developer: role === 'admin' && developer === true,
  });
  await adminDb.collection('adminRoles').doc(uid).set({
    uid,
    email: target.email ?? null,
    role,
    developer: role === 'admin' && developer === true,
    updatedBy: req.user!.uid,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await audit(req, 'admin.role.granted', uid, { role, developer });
  res.json({ ok: true, uid, role, developer: role === 'admin' && developer === true });
});

adminRolesRouter.post('/revoke', requireAuth, requireOwner, async (req: AuthenticatedRequest, res) => {
  const { uid } = req.body ?? {};
  if (!uid) return res.status(400).json({ error: 'uid is required.' });
  if (uid === req.user!.uid) return res.status(400).json({ error: 'Owner role cannot be revoked here.' });

  const target = await adminAuth.getUser(uid);
  const existing = target.customClaims ?? {};
  await adminAuth.setCustomUserClaims(uid, {
    ...existing,
    role: 'user',
    admin: false,
    owner: false,
    developer: false,
  });
  await adminDb.collection('adminRoles').doc(uid).set({
    uid,
    email: target.email ?? null,
    role: 'user',
    developer: false,
    updatedBy: req.user!.uid,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await audit(req, 'admin.role.revoked', uid);
  res.json({ ok: true, uid, role: 'user' });
});
