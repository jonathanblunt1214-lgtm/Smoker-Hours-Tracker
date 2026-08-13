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

adminRolesRouter.get('/health', requireAuth, requireAdmin, (_req, res) => {
  res.json({ status: 'operational', authorization: 'firebase-custom-claims' });
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
