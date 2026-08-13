import { getSyncLogs, addSyncLog } from './smokerSyncService';
import { loadDeletedCookLogIds, saveCookLogs, loadVerifiedMeatCuts, saveVerifiedMeatCuts } from '../utils/storage';

export const MASTER_WEB_VERSION = '0.0.2A';
export const MASTER_BUILD_NUMBER = 2800;
export const MASTER_SYNC_EVENT = 'master_version_sync_changed';
export const MASTER_SYNC_DATA_MERGED_EVENT = 'master_sync_data_merged';

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

const DEVICE_ID_KEY = 'smoker_master_sync_device_id';

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'device-web';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `dev_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function detectPlatform(): string {
  if (typeof window === 'undefined') return 'Web Master';
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'Android App';
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'iOS App';
  if (/Macintosh|Mac OS X/.test(ua)) return 'Desktop Mac';
  if (/Windows/.test(ua)) return 'Desktop PC';
  if (/Linux/.test(ua)) return 'Linux Station';
  return 'Web Master';
}

class MasterVersionSyncEngine {
  private status: MasterSyncStatus = {
    isSyncing: false,
    lastSyncedAt: null,
    masterVersion: MASTER_WEB_VERSION,
    buildNumber: MASTER_BUILD_NUMBER,
    inSync: true,
    platform: detectPlatform(),
    connectedClients: [],
    syncError: null,
    changelog: [
      'Master Web Version v2.8.0 synchronization active',
      'Unified multi-device cloud backup & cook log reconciliation',
      'Real-time fleet, fuel inventory & CharGPT memory sync',
    ],
  };

  private listeners: Set<(status: MasterSyncStatus) => void> = new Set();
  private autoSyncInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAutoSync();
    }
  }

  private notify() {
    this.listeners.forEach((fn) => fn({ ...this.status }));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(MASTER_SYNC_EVENT, { detail: this.status }));
    }
  }

  public getStatus(): MasterSyncStatus {
    return { ...this.status };
  }

  public subscribe(listener: (status: MasterSyncStatus) => void): () => void {
    this.listeners.add(listener);
    listener({ ...this.status });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private initAutoSync() {
    // Initial sync after brief boot delay
    setTimeout(() => {
      this.syncWithMasterWeb();
    }, 1500);

    // Sync every 30 minutes (1,800,000 ms)
    this.autoSyncInterval = setInterval(() => {
      this.syncWithMasterWeb();
    }, 1800000);

    // Sync when tab gets focus or comes online
    window.addEventListener('focus', () => this.syncWithMasterWeb());
    window.addEventListener('online', () => this.syncWithMasterWeb());
  }

  public async syncWithMasterWeb(forceMasterOverwrite = false): Promise<boolean> {
    if (this.status.isSyncing) return false;

    this.status.isSyncing = true;
    this.status.syncError = null;
    this.notify();

    try {
      // Gather local storage data
      let cookLogs: any[] = [];
      let fuelLogs: any[] = [];
      let rigs: any[] = [];
      let userAccount: any = null;
      let charGPTMemory: any = null;
      let plannerSavedSessions: any[] = [];
      let customBlends: any[] = [];
      let settings: any = null;

      const deletedCookLogIds = loadDeletedCookLogIds();
      const deletedIdsSet = new Set(deletedCookLogIds);

      try {
        const rawLogs = localStorage.getItem('smoker_app_cook_logs_v1') || localStorage.getItem('smoker_cook_logs_v1') || localStorage.getItem('pitmaster_cook_logs');
        if (rawLogs) {
          const parsed = JSON.parse(rawLogs);
          const list = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
          cookLogs = list.filter((c: any) => c && c.id && !deletedIdsSet.has(c.id));
        }

        const rawFuel = localStorage.getItem('smoker_app_fuel_logs_v1') || localStorage.getItem('smoker_fuel_logs_v1') || localStorage.getItem('pitmaster_fuel_logs');
        if (rawFuel) {
          const parsed = JSON.parse(rawFuel);
          fuelLogs = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
        }

        const rawRigs = localStorage.getItem('smoker_app_custom_smokers_v1') || localStorage.getItem('smoker_rigs_v1');
        if (rawRigs) {
          const parsed = JSON.parse(rawRigs);
          rigs = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
        }

        const rawAccount = localStorage.getItem('pitmaster_local_user_account') || localStorage.getItem('smoker_user_account_v1') || localStorage.getItem('smoker_app_profile_v1');
        if (rawAccount) userAccount = JSON.parse(rawAccount);

        const rawMemory = localStorage.getItem('chargpt_memory_v4') || localStorage.getItem('chargpt_memory_vault_v1');
        if (rawMemory) {
          try {
            charGPTMemory = JSON.parse(rawMemory);
          } catch (e) {}
        }

        const rawPlannerSessions = localStorage.getItem('smoker_saved_cook_plans_v1');
        if (rawPlannerSessions) {
          try {
            plannerSavedSessions = JSON.parse(rawPlannerSessions);
          } catch (e) {}
        }

        const rawBlends = localStorage.getItem('smoker_app_custom_fuel_presets_v1') || localStorage.getItem('chargpt_custom_pellet_blends_v1');
        if (rawBlends) {
          const parsed = JSON.parse(rawBlends);
          customBlends = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
        }

        const isColorblind = localStorage.getItem('smoker_colorblind_mode') === 'true';
        const rawLowPower = localStorage.getItem('smoker_app_low_power_mode_v1');
        let lowPowerSettings = null;
        if (rawLowPower) {
          try { lowPowerSettings = JSON.parse(rawLowPower); } catch (e) {}
        }

        const rawFederated = localStorage.getItem('smoker_app_federated_ai_config_v1');
        let federatedLearningConfig = null;
        if (rawFederated) {
          try { federatedLearningConfig = JSON.parse(rawFederated); } catch (e) {}
        }

        settings = {
          isColorblind,
          lowPowerSettings,
          federatedLearningConfig,
          themeMode: localStorage.getItem('smoker_theme_mode') || 'dark',
          tempUnit: localStorage.getItem('smoker_temp_unit') || 'F',
          soundEnabled: localStorage.getItem('smoker_sound_enabled') !== 'false',
        };
      } catch (err) {
        console.warn('[MasterVersionSyncEngine] Error reading local state:', err);
      }

      const verifiedMeatCuts = loadVerifiedMeatCuts();

      const email = userAccount?.email || '';
      const payload = {
        deviceId: getDeviceId(),
        platform: detectPlatform(),
        clientVersion: MASTER_WEB_VERSION,
        userEmail: email,
        forceMasterOverwrite,
        localData: {
          userAccount,
          rigs,
          activeRigId: userAccount?.activeRigId || rigs[0]?.id || 'rig-1',
          cookLogs,
          deletedCookLogIds,
          fuelLogs,
          charGPTMemory,
          plannerSavedSessions,
          customBlends,
          settings,
          verifiedMeatCuts,
        },
      };

      const res = await fetch('/api/master-version/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Master Server responded with status ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        // Merge returned master data into local storage if provided
        if (data.mergedData) {
          const { mergedData } = data;
          if (Array.isArray(mergedData.cookLogs)) {
            const currentDeleted = new Set(loadDeletedCookLogIds());
            mergedData.cookLogs = mergedData.cookLogs.filter((c: any) => c && c.id && !currentDeleted.has(c.id));
            saveCookLogs(mergedData.cookLogs);
          }
          if (Array.isArray(mergedData.fuelLogs)) {
            localStorage.setItem('smoker_app_fuel_logs_v1', JSON.stringify(mergedData.fuelLogs));
            localStorage.setItem('smoker_fuel_logs_v1', JSON.stringify(mergedData.fuelLogs));
            localStorage.setItem('pitmaster_fuel_logs', JSON.stringify(mergedData.fuelLogs));
          }
          if (Array.isArray(mergedData.rigs)) {
            localStorage.setItem('smoker_app_custom_smokers_v1', JSON.stringify(mergedData.rigs));
            localStorage.setItem('smoker_rigs_v1', JSON.stringify(mergedData.rigs));
          }
          if (mergedData.userAccount) {
            localStorage.setItem('smoker_user_account_v1', JSON.stringify(mergedData.userAccount));
            localStorage.setItem('pitmaster_local_user_account', JSON.stringify(mergedData.userAccount));
          }
          if (mergedData.charGPTMemory && typeof mergedData.charGPTMemory === 'object') {
            localStorage.setItem('chargpt_memory_v4', JSON.stringify(mergedData.charGPTMemory));
            localStorage.setItem('chargpt_memory_vault_v1', JSON.stringify(mergedData.charGPTMemory));
          }
          if (Array.isArray(mergedData.plannerSavedSessions)) {
            localStorage.setItem('smoker_saved_cook_plans_v1', JSON.stringify(mergedData.plannerSavedSessions));
          }
          if (Array.isArray(mergedData.customBlends)) {
            localStorage.setItem('smoker_app_custom_fuel_presets_v1', JSON.stringify(mergedData.customBlends));
            localStorage.setItem('chargpt_custom_pellet_blends_v1', JSON.stringify(mergedData.customBlends));
          }
          if (mergedData.settings && typeof mergedData.settings === 'object') {
            if (typeof mergedData.settings.isColorblind === 'boolean') {
              localStorage.setItem('smoker_colorblind_mode', String(mergedData.settings.isColorblind));
            }
            if (mergedData.settings.lowPowerSettings) {
              localStorage.setItem('smoker_app_low_power_mode_v1', JSON.stringify(mergedData.settings.lowPowerSettings));
            }
            if (mergedData.settings.federatedLearningConfig) {
              localStorage.setItem('smoker_app_federated_ai_config_v1', JSON.stringify(mergedData.settings.federatedLearningConfig));
            }
          }
          if (Array.isArray(mergedData.verifiedMeatCuts)) {
            saveVerifiedMeatCuts(mergedData.verifiedMeatCuts);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('verified_meat_cuts_updated'));
            }
          }

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(MASTER_SYNC_DATA_MERGED_EVENT, { detail: mergedData }));
          }
        }

        this.status.isSyncing = false;
        this.status.lastSyncedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.status.inSync = true;
        this.status.masterVersion = data.masterVersion || MASTER_WEB_VERSION;
        this.status.buildNumber = data.buildNumber || MASTER_BUILD_NUMBER;
        this.status.connectedClients = data.connectedClients || [];
        if (data.changelog) this.status.changelog = data.changelog;

        const stats = data.reconciliationStats || {};
        const uploadSummary = stats.newUploadedLogsCount > 0
          ? `Uploaded ${stats.newUploadedLogsCount} new cook log(s) to Master Web Version. Total Master Logs: ${stats.totalMasterCookLogsCount}.`
          : `Synchronized with Master Web Version (${this.status.masterVersion}). Total Master Logs: ${stats.totalMasterCookLogsCount || cookLogs.length}.`;

        addSyncLog({
          type: 'auto_sync',
          status: 'success',
          summary: uploadSummary,
          details: {
            syncedEntriesCount: (cookLogs.length + fuelLogs.length + rigs.length),
            newUploadedLogsCount: stats.newUploadedLogsCount || 0,
            confirmedDuplicateCount: stats.confirmedDuplicateCount || 0,
            totalMasterCookLogsCount: stats.totalMasterCookLogsCount || cookLogs.length,
            deviceId: getDeviceId(),
          },
        });

        this.notify();
        return true;
      } else {
        throw new Error(data.error || 'Failed to sync with Master Web Version');
      }
    } catch (err: any) {
      console.warn('[MasterVersionSyncEngine] Web master sync warning:', err?.message || err);
      this.status.isSyncing = false;
      this.status.syncError = err?.message || 'Sync connection warning';
      this.status.inSync = false;

      addSyncLog({
        type: 'auto_sync',
        status: 'error',
        summary: `Master Web Version Sync Warning: ${err?.message || 'Offline fallback mode active'}`,
        details: { errorMsg: err?.message, deviceId: getDeviceId() },
      });

      this.notify();
      return false;
    }
  }

  public async forceAlignWithMasterWeb(): Promise<boolean> {
    return this.syncWithMasterWeb(true);
  }
}

export const MasterSyncEngine = new MasterVersionSyncEngine();
export const masterVersionSyncService = MasterSyncEngine;

export function triggerMasterVersionSync(forceMasterOverwrite = false): Promise<boolean> {
  return MasterSyncEngine.syncWithMasterWeb(forceMasterOverwrite);
}

export default MasterSyncEngine;
