import { collection, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { CookLog, FuelLog, SmokerProfile } from '../types';
import { CURRENT_RELEASE } from '../generated/release';

export interface PlatformSyncHandlers {
  onProfile?: (profile: SmokerProfile) => void;
  onCookLogs?: (logs: CookLog[]) => void;
  onFuelLogs?: (logs: FuelLog[]) => void;
  onStatus?: (status: 'synced' | 'syncing' | 'pending' | 'offline' | 'error') => void;
  /** Fires once after the initial user, cook-log, and fuel-log snapshots resolve. */
  onHydrated?: () => void;
}

function getDeviceId(): string {
  const key = 'smokestack_device_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(key, created);
  return created;
}

function platformLabel(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('android')) return 'android';
  if (ua.includes('windows')) return 'windows';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';
  if (ua.includes('mac os')) return 'macos';
  if (ua.includes('linux')) return 'linux';
  return 'web';
}

function installMode(): string {
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches;
  return standalone ? 'installed_pwa_or_native_shell' : 'browser';
}

async function registerDevice(uid: string) {
  const deviceId = getDeviceId();
  await setDoc(doc(db, 'users', uid, 'devices', deviceId), {
    deviceId,
    platform: platformLabel(),
    installMode: installMode(),
    userAgent: navigator.userAgent,
    appVersion: CURRENT_RELEASE.version,
    lastSeenAt: serverTimestamp(),
  }, { merge: true });
}

export function startAuthoritativePlatformSync(uid: string, handlers: PlatformSyncHandlers): () => void {
  if (!uid) return () => {};
  handlers.onStatus?.(navigator.onLine ? 'syncing' : 'offline');
  void registerDevice(uid).catch(() => handlers.onStatus?.('error'));
  const heartbeat = window.setInterval(() => {
    if (navigator.onLine) void registerDevice(uid).catch(() => {});
  }, 5 * 60 * 1000);

  let tombstones = new Set<string>();
  let userReady = false;
  let cooksReady = false;
  let fuelReady = false;
  let hydrated = false;
  let authoritativeState: 'writing' | 'synced' | 'error' | 'unknown' = 'unknown';

  const emitSnapshotStatus = (metadata: { fromCache: boolean; hasPendingWrites: boolean }) => {
    if (!navigator.onLine && metadata.fromCache) return handlers.onStatus?.('offline');
    if (metadata.hasPendingWrites || authoritativeState === 'writing') return handlers.onStatus?.('syncing');
    if (authoritativeState === 'error') return handlers.onStatus?.('error');
    if (authoritativeState !== 'synced') return handlers.onStatus?.('pending');
    handlers.onStatus?.('synced');
  };

  const maybeHydrated = () => {
    if (hydrated || !userReady || !cooksReady || !fuelReady) return;
    hydrated = true;
    handlers.onHydrated?.();
  };

  const unsubUser = onSnapshot(doc(db, 'users', uid), { includeMetadataChanges: true }, (snap) => {
    if (snap.exists()) {
      const data: any = snap.data();
      authoritativeState = data.syncState === 'writing' || data.syncState === 'synced' || data.syncState === 'error'
        ? data.syncState
        : 'unknown';
      tombstones = new Set(Array.isArray(data.deletedCookLogIds) ? data.deletedCookLogIds : []);
      if (data.profile) handlers.onProfile?.(data.profile as SmokerProfile);
    }
    userReady = true;
    emitSnapshotStatus(snap.metadata);
    maybeHydrated();
  }, () => handlers.onStatus?.('error'));

  const unsubCooks = onSnapshot(collection(db, 'users', uid, 'cookLogs'), { includeMetadataChanges: true }, (snap) => {
    const logs = snap.docs
      .map((d) => d.data() as CookLog)
      .filter((log) => log?.id && !tombstones.has(log.id));
    handlers.onCookLogs?.(logs);
    cooksReady = true;
    emitSnapshotStatus(snap.metadata);
    maybeHydrated();
  }, () => handlers.onStatus?.('error'));

  const unsubFuel = onSnapshot(collection(db, 'users', uid, 'fuelLogs'), { includeMetadataChanges: true }, (snap) => {
    handlers.onFuelLogs?.(snap.docs.map((d) => d.data() as FuelLog).filter((log) => !!log?.id));
    fuelReady = true;
    emitSnapshotStatus(snap.metadata);
    maybeHydrated();
  }, () => handlers.onStatus?.('error'));

  return () => {
    window.clearInterval(heartbeat);
    unsubUser();
    unsubCooks();
    unsubFuel();
  };
}
