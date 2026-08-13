import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { SmokerProfile, CookLog, FuelLog, LocalUserProfile, CharGPTMemory } from '../types';

export interface UserFirestoreBundle {
  profile?: SmokerProfile;
  cookLogs?: CookLog[];
  fuelLogs?: FuelLog[];
  userAccount?: LocalUserProfile;
  charGPTMemory?: CharGPTMemory;
  deletedCookLogIds?: string[];
  lastSyncedAt?: string;
}

export type SyncStateStatus = 'synced' | 'syncing' | 'pending' | 'offline' | 'error';

/**
 * Loads authoritative user data from Firestore for the verified Firebase UID.
 * A missing sync timestamp stays missing; loading data must not fabricate a
 * successful sync event.
 */
export async function loadUserBundleFromFirestore(uid: string): Promise<UserFirestoreBundle | null> {
  if (!uid) return null;
  try {
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) return null;

    const userData = userSnap.data() as UserFirestoreBundle;
    const syncMetaRef = doc(db, 'users', uid, 'meta', 'sync');
    const syncMetaSnap = await getDoc(syncMetaRef);
    const syncMeta = syncMetaSnap.exists() ? (syncMetaSnap.data() as any) : {};

    const deletedCookLogIds = Array.from(new Set([
      ...(Array.isArray(userData.deletedCookLogIds) ? userData.deletedCookLogIds : []),
      ...(Array.isArray(syncMeta.deletedCookLogIds) ? syncMeta.deletedCookLogIds : []),
    ].filter(Boolean)));
    const deletedSet = new Set(deletedCookLogIds);

    const cookLogsRef = collection(db, 'users', uid, 'cookLogs');
    const cookLogsSnap = await getDocs(cookLogsRef);
    const cookLogs: CookLog[] = [];
    cookLogsSnap.forEach((d) => {
      const value = d.data() as CookLog;
      if (value?.id && !deletedSet.has(value.id)) cookLogs.push(value);
    });

    const fuelLogsRef = collection(db, 'users', uid, 'fuelLogs');
    const fuelLogsSnap = await getDocs(fuelLogsRef);
    const fuelLogs: FuelLog[] = [];
    fuelLogsSnap.forEach((d) => fuelLogs.push(d.data() as FuelLog));

    return {
      profile: userData.profile,
      userAccount: userData.userAccount,
      charGPTMemory: userData.charGPTMemory,
      cookLogs: cookLogs.length > 0 ? cookLogs : (userData.cookLogs || []).filter((c) => c?.id && !deletedSet.has(c.id)),
      fuelLogs: fuelLogs.length > 0 ? fuelLogs : userData.fuelLogs || [],
      deletedCookLogIds,
      lastSyncedAt: userData.lastSyncedAt || syncMeta.lastSyncedAt || undefined,
    };
  } catch (error) {
    console.error('[Firestore] Error loading user bundle:', error);
    throw error;
  }
}

/**
 * Saves authoritative user data for the verified Firebase UID. Firestore rules
 * independently enforce request.auth.uid == uid. Cook tombstones are persisted
 * so a deleted record cannot reappear on the next load.
 */
export async function saveUserBundleToFirestore(uid: string, bundle: UserFirestoreBundle): Promise<boolean> {
  if (!uid) return false;
  try {
    const userDocRef = doc(db, 'users', uid);
    const nowIso = new Date().toISOString();
    const deletedCookLogIds = Array.from(new Set((bundle.deletedCookLogIds || []).filter(Boolean)));
    const deletedSet = new Set(deletedCookLogIds);

    await setDoc(
      userDocRef,
      {
        profile: bundle.profile || null,
        userAccount: bundle.userAccount || null,
        charGPTMemory: bundle.charGPTMemory || null,
        deletedCookLogIds,
        lastSyncedAt: nowIso,
        schemaVersion: '0.03',
      },
      { merge: true }
    );

    if (Array.isArray(bundle.cookLogs)) {
      for (const cook of bundle.cookLogs) {
        if (cook?.id && !deletedSet.has(cook.id)) {
          const cookDocRef = doc(db, 'users', uid, 'cookLogs', cook.id);
          await setDoc(cookDocRef, cook, { merge: true });
        }
      }
    }

    for (const deletedId of deletedCookLogIds) {
      await deleteDoc(doc(db, 'users', uid, 'cookLogs', deletedId));
    }

    if (Array.isArray(bundle.fuelLogs)) {
      for (const fuel of bundle.fuelLogs) {
        if (fuel?.id) {
          const fuelDocRef = doc(db, 'users', uid, 'fuelLogs', fuel.id);
          await setDoc(fuelDocRef, fuel, { merge: true });
        }
      }
    }

    const syncMetaRef = doc(db, 'users', uid, 'meta', 'sync');
    await setDoc(syncMetaRef, {
      lastSyncedAt: nowIso,
      schemaVersion: '0.03',
      deletedCookLogIds,
    }, { merge: true });

    return true;
  } catch (error) {
    console.error('[Firestore] Error saving user bundle:', error);
    return false;
  }
}
