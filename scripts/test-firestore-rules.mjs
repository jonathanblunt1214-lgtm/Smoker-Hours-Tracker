import { readFile } from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const projectId = 'smokestack-rules-test';
const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
const testEnvironment = await initializeTestEnvironment({
  projectId,
  firestore: { rules },
});

try {
  const alice = testEnvironment.authenticatedContext('alice').firestore();
  const bob = testEnvironment.authenticatedContext('bob').firestore();
  const anonymous = testEnvironment.unauthenticatedContext().firestore();

  await assertSucceeds(setDoc(doc(alice, 'users/alice'), { owner: 'alice' }));
  await assertSucceeds(setDoc(doc(alice, 'users/alice/cookLogs/cook-1'), { id: 'cook-1' }));
  await assertSucceeds(getDoc(doc(alice, 'users/alice/cookLogs/cook-1')));

  await assertFails(getDoc(doc(bob, 'users/alice')));
  await assertFails(setDoc(doc(bob, 'users/alice/fuelLogs/fuel-1'), { id: 'fuel-1' }));
  await assertFails(getDoc(doc(anonymous, 'users/alice')));
  await assertFails(setDoc(doc(anonymous, 'users/alice/devices/browser-1'), { platform: 'web' }));
  await assertFails(setDoc(doc(alice, 'verifiedKnowledge/example'), { title: 'not user-owned' }));

  console.log('Firestore rules verified: authenticated owner access only.');
} finally {
  await testEnvironment.cleanup();
}
