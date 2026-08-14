// Compatibility facade for older callers. This module no longer synchronizes
// user data or treats a browser host as an authoritative database.
import { CURRENT_RELEASE } from '../generated/release';
import { checkForReleaseUpdate, getReleaseUpdateState } from './releaseUpdateService';

export const MASTER_WEB_VERSION = CURRENT_RELEASE.version;
export const MASTER_BUILD_NUMBER = CURRENT_RELEASE.buildNumber;
export const MASTER_SYNC_EVENT = 'release_client_status_changed';
export const MASTER_SYNC_DATA_MERGED_EVENT = 'legacy_master_data_merge_disabled';

export interface ConnectedDevice {
  deviceId: string;
  platform: string;
  clientVersion: string;
  userEmail: string;
  lastSyncTime: string;
  status: 'synced' | 'updating' | 'outdated';
}

export interface MasterSyncStatus {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  masterVersion: string;
  buildNumber: number;
  inSync: boolean;
  platform: string;
  connectedClients: ConnectedDevice[];
  syncError: string | null;
  changelog: string[];
}

const platform = () => typeof navigator === 'undefined' ? 'Server' : /android/i.test(navigator.userAgent) ? 'Android' : /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'iOS' : 'Web';

class ReleaseCompatibilityService {
  private listeners = new Set<(status: MasterSyncStatus) => void>();

  getStatus(): MasterSyncStatus {
    const release = getReleaseUpdateState();
    return {
      isSyncing: release.checking,
      lastSyncedAt: release.lastCheckedAt,
      masterVersion: release.latest?.version || CURRENT_RELEASE.version,
      buildNumber: release.latest?.buildNumber || CURRENT_RELEASE.buildNumber,
      inSync: !release.updateAvailable && !release.error,
      platform: platform(),
      connectedClients: [],
      syncError: release.error,
      changelog: ['Release status only. Account data synchronization is handled by Firebase/Firestore.'],
    };
  }

  subscribe(listener: (status: MasterSyncStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => { this.listeners.delete(listener); };
  }

  async syncWithMasterWeb(): Promise<boolean> {
    const release = await checkForReleaseUpdate();
    const status = this.getStatus();
    this.listeners.forEach((listener) => listener(status));
    return !release.error;
  }

  async forceAlignWithMasterWeb(): Promise<boolean> {
    return this.syncWithMasterWeb();
  }
}

export const masterVersionSyncService = new ReleaseCompatibilityService();
export const MasterSyncEngine = masterVersionSyncService;
export const triggerMasterVersionSync = () => masterVersionSyncService.syncWithMasterWeb();
