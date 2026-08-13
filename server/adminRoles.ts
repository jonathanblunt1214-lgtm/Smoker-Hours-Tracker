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

  const vertexConfigured = process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true' || Boolean(process.env.K_SERVICE);
  const aiConfigured = vertexConfigured || Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY);
  const aiProvider = process.env.CHARGPT_PROVIDER || (vertexConfigured ? 'Vertex' : process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY ? 'Gemini' : process.env.API_KEY ? 'Configured provider' : null);
  const aiModel = process.env.CHARGPT_MODEL || null;
  const commit = process.env.GIT_COMMIT_SHA || process.env.COMMIT_SHA || process.env.SOURCE_VERSION || null;
  const revision = process.env.K_REVISION || null;

  const pipelineDefinitions = [
    { id: 'smoker', label: 'Smoker manufacturers', sourcePolicy: 'Manufacturer or verified source required' },
    { id: 'fuel', label: 'Fuel catalog', sourcePolicy: 'Verified product/manufacturer source required' },
    { id: 'meat', label: 'Meat & cut catalog', sourcePolicy: 'Verified food-safety/cooking source required' },
    { id: 'mod', label: 'Smoker modifications', sourcePolicy: 'Verified compatibility/source evidence required' },
  ];

  let publishedCounts: Record<string, number> = { smoker: 0, fuel: 0, meat: 0, mod: 0 };
  let pendingCount = 0;
  let knowledgeError: string | null = null;
  if (firestore === 'operational') {
    try {
      const snapshot = await adminDb.collection('verifiedKnowledge').limit(500).get();
      for (const doc of snapshot.docs) {
        const data: any = doc.data();
        if (data?.status === 'pending_review') pendingCount += 1;
        if (data?.status === 'published' && Object.prototype.hasOwnProperty.call(publishedCounts, data?.type)) {
          publishedCounts[data.type] += 1;
        }
      }
    } catch (error: any) {
      knowledgeError = error?.message || 'Verified knowledge status check failed.';
    }
  }

  const knowledgePipelines = pipelineDefinitions.map((pipeline) => ({
    ...pipeline,
    status: publishedCounts[pipeline.id] > 0 ? 'published' : 'ready_for_ingestion',
    publishedRecords: publishedCounts[pipeline.id],
  }));
  const totalPublished = Object.values(publishedCounts).reduce((sum, count) => sum + count, 0);
  const knowledgeStatus = knowledgeError ? 'degraded' : totalPublished > 0 ? 'published' : 'ready_for_ingestion';

  res.json({
    generatedAt: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    summary: {
      overall: firestore === 'operational' && aiConfigured && !knowledgeError ? 'healthy' : 'attention_required',
      attention: [
        ...(firestore === 'degraded' ? ['Firestore health check needs attention.'] : []),
        ...(!aiConfigured ? ['CharGPT server credential is not configured.'] : []),
        ...(knowledgeError ? ['Verified knowledge status check needs attention.'] : []),
        ...(totalPublished === 0 && !knowledgeError ? ['Verified knowledge is ready for source ingestion and review; no records are published yet.'] : []),
        ...(pendingCount > 0 ? [`${pendingCount} verified knowledge candidate(s) are awaiting review.`] : []),
      ],
    },
    services: {
      api: { status: 'operational', detail: 'Authenticated SmokeStack Operations API responded.' },
      authorization: { status: 'operational', detail: 'Firebase custom claims verified.' },
      firestore: { status: firestore, detail: firestoreError || 'Authoritative account data service responded.' },
      chargpt: {
        status: aiConfigured ? 'configured' : 'not_configured',
        detail: aiConfigured ? 'Server-side CharGPT model access is configured.' : 'No server-side AI access detected.',
      },
      sync: { status: firestore === 'operational' ? 'configured' : 'degraded', detail: 'Signed-in account data uses Firebase/Firestore. A separate fleet-wide sync operations service is not implemented.' },
      knowledgePipelines: {
        status: knowledgeStatus,
        detail: knowledgeError || (totalPublished > 0 ? `${totalPublished} reviewed provenance-backed record(s) are published.` : 'Provenance and human-review pipelines are implemented and ready for source ingestion.'),
      },
      backup: { status: 'client_managed', detail: 'Google Drive remains an optional user backup/export integration.' },
    },
    chargpt: {
      status: aiConfigured ? 'ready' : 'needs_setup',
      provider: aiProvider,
      model: aiModel,
      credentials: aiConfigured ? 'configured' : 'missing',
      retrieval: knowledgeError ? 'degraded' : 'published_only',
      evaluation: 'not_configured',
      feedbackReview: 'not_configured',
      durableLearning: 'approval_required',
      detail: aiConfigured
        ? 'CharGPT can call the configured server-side model and retrieve only reviewed, published knowledge records. Evaluation and learning review services still need production implementation.'
        : 'Configure the server-side AI provider before CharGPT can be considered production ready.',
    },
    knowledge: {
      status: knowledgeStatus,
      totalPublished,
      pendingReview: pendingCount,
      pipelines: knowledgePipelines,
      publishingPolicy: 'Only provenance-bearing records explicitly approved by an authenticated admin are published and eligible for CharGPT retrieval.',
      error: knowledgeError,
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
