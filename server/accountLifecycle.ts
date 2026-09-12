import { Router } from 'express';
import { adminAuth, adminDb } from './firebaseAdmin';
import { AuthenticatedRequest, requireAuth } from './authMiddleware';
import { isIdentifiableCommunitySubmission } from './accountDeletionPolicy';
import { getCharGPTDisclosure } from './charGPTProvider';

export const accountLifecycleRouter = Router();

async function deleteQueryByField(collection: string, field: string, uid: string): Promise<number> {
  let deleted = 0;
  while (true) {
    const snapshot = await adminDb.collection(collection).where(field, '==', uid).limit(400).get();
    if (snapshot.empty) return deleted;
    const batch = adminDb.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
    deleted += snapshot.size;
  }
}

async function deleteIdentifiableCommunitySubmissions(uid: string): Promise<number> {
  let deleted = 0;
  while (true) {
    const snapshot = await adminDb.collection('verifiedKnowledge').where('submittedBy', '==', uid).limit(400).get();
    const matching = snapshot.docs.filter((document) => isIdentifiableCommunitySubmission(document.data()));
    if (matching.length === 0) return deleted;
    const batch = adminDb.batch();
    matching.forEach((document) => batch.delete(document.ref));
    await batch.commit();
    deleted += matching.length;
    if (snapshot.size < 400) return deleted;
  }
}

accountLifecycleRouter.get('/ai-disclosure', (_req, res) => {
  res.json({ disclosure: getCharGPTDisclosure() });
});

accountLifecycleRouter.post('/ai-consent', requireAuth, async (req: AuthenticatedRequest, res) => {
  const disclosure = getCharGPTDisclosure();
  // The client must echo the disclosure it actually displayed. A mismatch means
  // the user read something other than what is now in force, so it is refused
  // rather than recorded against the wrong text.
  if (req.body?.version !== disclosure.version || req.body?.provider !== disclosure.provider) {
    return res.status(409).json({
      error: 'The disclosure shown does not match the processing currently in force. Review the current disclosure and accept again.',
      disclosure,
    });
  }

  try {
    await adminDb.collection('users').doc(req.user!.uid).set({
      aiProcessingConsent: {
        version: disclosure.version,
        provider: disclosure.provider,
        acceptedAt: new Date().toISOString(),
      },
    }, { merge: true });
    return res.json({ recorded: true, disclosure });
  } catch {
    return res.status(503).json({ error: 'Consent could not be recorded. No account data is sent until it is.' });
  }
});

accountLifecycleRouter.delete('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (req.body?.confirmation !== 'DELETE MY ACCOUNT') {
    return res.status(400).json({ error: 'Type DELETE MY ACCOUNT to confirm permanent account deletion.' });
  }

  const uid = req.user!.uid;
  const authenticatedAt = Number(req.user!.claims.auth_time || 0) * 1000;
  if (!authenticatedAt || Date.now() - authenticatedAt > 10 * 60 * 1000) {
    return res.status(403).json({ error: 'Recent authentication is required before account deletion.' });
  }

  try {
    await adminDb.recursiveDelete(adminDb.collection('users').doc(uid));
    await deleteIdentifiableCommunitySubmissions(uid);
    await adminDb.collection('adminRoles').doc(uid).delete().catch(() => undefined);
    await adminAuth.deleteUser(uid);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ ok: true, accountDeleted: true, userDataDeleted: true, externalBackupsDeleted: false });
  } catch (error: any) {
    console.error('[Account deletion] Failed', { uid, message: error?.message });
    return res.status(503).json({ error: 'Account deletion could not be completed. No success was recorded.' });
  }
});
