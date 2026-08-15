import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
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
  syncState?: 'writing' | 'synced' | 'error';
  syncRevision?: string;
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
      syncState: userData.syncState || syncMeta.syncState || undefined,
      syncRevision: userData.syncRevision || syncMeta.syncRevision || undefined,
    };
  } catch (error) {
    console.error('[Firestore] Error loading user bundle:', error);
    throw error;
  }
}

async function resolveExistingTombstones(uid: string): Promise<string[]> {
  const userSnap = await getDoc(doc(db, 'users', uid));
  const metaSnap = await getDoc(doc(db, 'users', uid, 'meta', 'sync'));
  const userData: any = userSnap.exists() ? userSnap.data() : {};
  const metaData: any = metaSnap.exists() ? metaSnap.data() : {};
  return Array.from(new Set([
    ...(Array.isArray(userData.deletedCookLogIds) ? userData.deletedCookLogIds : []),
    ...(Array.isArray(metaData.deletedCookLogIds) ? metaData.deletedCookLogIds : []),
  ].filter(Boolean)));
}

/**
 * Saves authoritative user data for the verified Firebase UID. Firestore rules
 * independently enforce request.auth.uid == uid. Omitted root fields are left
 * untouched so a partial platform sync cannot silently erase account state.
 * Existing cook tombstones are preserved when a caller does not explicitly
 * supply them, preventing stale/offline clients from resurrecting deleted logs.
 */
export async function saveUserBundleToFirestore(uid: string, bundle: UserFirestoreBundle): Promise<boolean> {
  if (!uid) return false;
  const revision = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `sync-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  try {
    const userDocRef = doc(db, 'users', uid);
    const nowIso = new Date().toISOString();
    const hasOwn = (key: keyof UserFirestoreBundle) => Object.prototype.hasOwnProperty.call(bundle, key);

    let deletedCookLogIds: string[];
    if (hasOwn('deletedCookLogIds')) {
      deletedCookLogIds = Array.from(new Set((bundle.deletedCookLogIds || []).filter(Boolean)));
    } else if (Array.isArray(bundle.cookLogs)) {
      deletedCookLogIds = await resolveExistingTombstones(uid);
    } else {
      deletedCookLogIds = [];
    }
    const deletedSet = new Set(deletedCookLogIds);

    await setDoc(userDocRef, {
      schemaVersion: '0.03',
      syncState: 'writing',
      syncRevision: revision,
      syncStartedAt: nowIso,
    }, { merge: true });

    const rootPatch: Record<string, unknown> = {
      lastSyncedAt: nowIso,
      schemaVersion: '0.03',
      syncState: 'synced',
      syncRevision: revision,
      syncCompletedAt: nowIso,
    };
    if (hasOwn('profile')) rootPatch.profile = bundle.profile ?? null;
    if (hasOwn('userAccount')) rootPatch.userAccount = bundle.userAccount ?? null;
    if (hasOwn('charGPTMemory')) rootPatch.charGPTMemory = bundle.charGPTMemory ?? null;
    if (hasOwn('deletedCookLogIds')) rootPatch.deletedCookLogIds = deletedCookLogIds;

    type WriteOperation =
      | { kind: 'set'; reference: ReturnType<typeof doc>; value: Record<string, unknown> }
      | { kind: 'delete'; reference: ReturnType<typeof doc> };
    const operations: WriteOperation[] = [];
    if (Array.isArray(bundle.cookLogs)) {
      for (const cook of bundle.cookLogs) {
        if (cook?.id && !deletedSet.has(cook.id)) {
          operations.push({ kind: 'set', reference: doc(db, 'users', uid, 'cookLogs', cook.id), value: cook as unknown as Record<string, unknown> });
        }
      }
    }

    for (const deletedId of deletedCookLogIds) {
      operations.push({ kind: 'delete', reference: doc(db, 'users', uid, 'cookLogs', deletedId) });
    }

    if (Array.isArray(bundle.fuelLogs)) {
      for (const fuel of bundle.fuelLogs) {
        if (fuel?.id) {
          operations.push({ kind: 'set', reference: doc(db, 'users', uid, 'fuelLogs', fuel.id), value: fuel as unknown as Record<string, unknown> });
        }
      }
    }

    for (let index = 0; index < operations.length; index += 400) {
      const batch = writeBatch(db);
      for (const operation of operations.slice(index, index + 400)) {
        if (operation.kind === 'set') batch.set(operation.reference, operation.value, { merge: true });
        else batch.delete(operation.reference);
      }
      await batch.commit();
    }

    const syncMetaPatch: Record<string, unknown> = {
      lastSyncedAt: nowIso,
      schemaVersion: '0.03',
      syncState: 'synced',
      syncRevision: revision,
      syncCompletedAt: nowIso,
    };
    if (hasOwn('deletedCookLogIds') || Array.isArray(bundle.cookLogs)) {
      syncMetaPatch.deletedCookLogIds = deletedCookLogIds;
    }
    const completionBatch = writeBatch(db);
    completionBatch.set(userDocRef, rootPatch, { merge: true });
    completionBatch.set(doc(db, 'users', uid, 'meta', 'sync'), syncMetaPatch, { merge: true });
    await completionBatch.commit();

    return true;
  } catch (error) {
    console.error('[Firestore] Error saving user bundle:', error);
    await setDoc(doc(db, 'users', uid), {
      schemaVersion: '0.03',
      syncState: 'error',
      syncRevision: revision,
      syncErrorAt: new Date().toISOString(),
    }, { merge: true }).catch(() => undefined);
    return false;
  }
}
