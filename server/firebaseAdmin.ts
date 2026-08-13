import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function credentials() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return applicationDefault();
  const serviceAccount = JSON.parse(raw);
  return cert(serviceAccount);
}

export const firebaseAdminApp = getApps()[0] ?? initializeApp({
  credential: credentials(),
  projectId: process.env.FIREBASE_PROJECT_ID || undefined,
});

export const adminAuth = getAuth(firebaseAdminApp);
export const adminDb = getFirestore(firebaseAdminApp);
