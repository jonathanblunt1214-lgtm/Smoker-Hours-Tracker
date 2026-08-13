import { NextFunction, Request, Response } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from './firebaseAdmin';

export type SmokeStackRole = 'owner' | 'admin' | 'user';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role: SmokeStackRole;
    claims: DecodedIdToken;
  };
}

function normalizedRole(token: DecodedIdToken): SmokeStackRole {
  if (token.role === 'owner' || token.owner === true) return 'owner';
  if (token.role === 'admin' || token.admin === true) return 'admin';
  return 'user';
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const token = await adminAuth.verifyIdToken(idToken, true);
    req.user = {
      uid: token.uid,
      email: token.email,
      role: normalizedRole(token),
      claims: token,
    };
    return next();
  } catch (error) {
    console.warn('[Auth] Firebase ID token rejected', error);
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access required.' });
  }
  return next();
}

export function requireOwner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Owner access required.' });
  }
  return next();
}

export function requireClaim(claim: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (req.user.role === 'owner' || req.user.claims[claim] === true) return next();
    return res.status(403).json({ error: `Required permission missing: ${claim}` });
  };
}
