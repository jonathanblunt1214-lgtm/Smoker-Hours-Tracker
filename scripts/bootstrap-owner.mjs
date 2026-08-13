import 'dotenv/config';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const credential = rawServiceAccount ? cert(JSON.parse(rawServiceAccount)) : applicationDefault();
const app = getApps()[0] ?? initializeApp({
  credential,
  projectId: process.env.FIREBASE_PROJECT_ID || undefined,
});
const auth = getAuth(app);

const ownerUid = process.env.SMOKESTACK_OWNER_UID?.trim();
const ownerEmail = process.env.SMOKESTACK_OWNER_EMAIL?.trim().toLowerCase();

if (!ownerUid && !ownerEmail) {
  throw new Error('Set SMOKESTACK_OWNER_UID or SMOKESTACK_OWNER_EMAIL before running npm run bootstrap:owner.');
}

const user = ownerUid ? await auth.getUser(ownerUid) : await auth.getUserByEmail(ownerEmail);
if (!user.emailVerified && ownerEmail) {
  throw new Error(`Refusing owner bootstrap: Firebase email is not verified for ${user.email || user.uid}.`);
}

await auth.setCustomUserClaims(user.uid, {
  ...(user.customClaims || {}),
  role: 'owner',
  owner: true,
  admin: true,
  developer: true,
});

console.log(`SmokeStack OWNER role assigned to Firebase UID ${user.uid}.`);
console.log('Sign out/in or force an ID-token refresh before opening SmokeStack Operations.');
