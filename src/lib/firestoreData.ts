import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { SmokerProfile, CookLog, FuelLog, LocalUserProfile, CharGPTMemory } from '../types';

export interface UserFirestoreBundle {
  profile?: SmokerProfile;
  cookLogs?: CookLog[];
  fuelLogs?: FuelLog[];
  userAccount?: LocalUserProfile;
  charGPTMemory?: CharGPTMemory;
  lastSyncedAt?: string;
}

export type SyncStateStatus = 'synced' | 'syncing' | 'pending' | 'offline' | 'error';

/**
 * Loads authoritative user data from Firestore for a given authenticated user ID.
 */
export async function loadUserBundleFromFirestore(uid: string): Promise<UserFirestoreBundle | null> {
  if (!uid) return null;
  try {
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      return null;
    }

    const userData = userSnap.data() as UserFirestoreBundle;

    // Load cook logs subcollection if exists
    const cookLogsRef = collection(db, 'users', uid, 'cookLogs');
    const cookLogsSnap = await getDocs(cookLogsRef);
    const cookLogs: CookLog[] = [];
    cookLogsSnap.forEach((d) => {
      cookLogs.push(d.data() as CookLog);
    });

    // Load fuel logs subcollection if exists
    const fuelLogsRef = collection(db, 'users', uid, 'fuelLogs');
    const fuelLogsSnap = await getDocs(fuelLogsRef);
    const fuelLogs: FuelLog[] = [];
    fuelLogsSnap.forEach((d) => {
      fuelLogs.push(d.data() as FuelLog);
    });

    return {
      profile: userData.profile,
      userAccount: userData.userAccount,
      charGPTMemory: userData.charGPTMemory,
      cookLogs: cookLogs.length > 0 ? cookLogs : userData.cookLogs || [],
      fuelLogs: fuelLogs.length > 0 ? fuelLogs : userData.fuelLogs || [],
      lastSyncedAt: userData.lastSyncedAt || new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Firestore] Error loading user bundle:', error);
    throw error;
  }
}

/**
 * Saves authoritative user data bundle to Firestore for a given authenticated user ID.
 */
export async function saveUserBundleToFirestore(uid: string, bundle: UserFirestoreBundle): Promise<boolean> {
  if (!uid) return false;
  try {
    const userDocRef = doc(db, 'users', uid);
    const nowIso = new Date().toISOString();

    await setDoc(
      userDocRef,
      {
        profile: bundle.profile || null,
        userAccount: bundle.userAccount || null,
        charGPTMemory: bundle.charGPTMemory || null,
        lastSyncedAt: nowIso,
        schemaVersion: '0.04A',
      },
      { merge: true }
    );

    // Save individual cook logs to subcollection for indexing and scale
    if (bundle.cookLogs && Array.isArray(bundle.cookLogs)) {
      for (const cook of bundle.cookLogs) {
        if (cook.id) {
          const cookDocRef = doc(db, 'users', uid, 'cookLogs', cook.id);
          await setDoc(cookDocRef, cook, { merge: true });
        }
      }
    }

    // Save fuel logs to subcollection
    if (bundle.fuelLogs && Array.isArray(bundle.fuelLogs)) {
      for (const fuel of bundle.fuelLogs) {
        if (fuel.id) {
          const fuelDocRef = doc(db, 'users', uid, 'fuelLogs', fuel.id);
          await setDoc(fuelDocRef, fuel, { merge: true });
        }
      }
    }

    // Update sync metadata
    const syncMetaRef = doc(db, 'users', uid, 'meta', 'sync');
    await setDoc(syncMetaRef, { lastSyncedAt: nowIso, schemaVersion: '0.04A' }, { merge: true });

    return true;
  } catch (error) {
    console.error('[Firestore] Error saving user bundle:', error);
    return false;
  }
}
