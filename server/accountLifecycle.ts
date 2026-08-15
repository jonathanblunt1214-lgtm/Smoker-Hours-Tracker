import { Router } from 'express';
import { adminAuth, adminDb } from './firebaseAdmin';
import { AuthenticatedRequest, requireAuth } from './authMiddleware';
import { isIdentifiableCommunitySubmission } from './accountDeletionPolicy';

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
  const snapshot = await adminDb.collection('verifiedKnowledge').where('submittedBy', '==', uid).get();
  const communityDocuments = snapshot.docs.filter((document) => isIdentifiableCommunitySubmission(document.data()));
  for (let index = 0; index < communityDocuments.length; index += 400) {
    const batch = adminDb.batch();
    communityDocuments.slice(index, index + 400).forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
  return communityDocuments.length;
}

accountLifecycleRouter.delete('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (req.body?.confirmation !== 'DELETE MY ACCOUNT') {
    return res.status(400).json({ error: 'Type DELETE MY ACCOUNT to confirm permanent account deletion.' });
  }

  const uid = req.user!.uid;
  try {
    await adminDb.recursiveDelete(adminDb.collection('users').doc(uid));
    await deleteIdentifiableCommunitySubmissions(uid);
    await deleteQueryByField('adminAudit', 'actorUid', uid);
    await deleteQueryByField('adminAudit', 'targetUid', uid);
    await adminDb.collection('adminRoles').doc(uid).delete().catch(() => undefined);
    await adminAuth.deleteUser(uid);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ ok: true, accountDeleted: true, userDataDeleted: true });
  } catch (error: any) {
    console.error('[Account deletion] Failed', error);
    return res.status(503).json({ error: error?.message || 'Account deletion could not be completed.' });
  }
});
