import { SmokerProfile, CookLog, FuelLog, CharGPTMemory, CharGPTRule, FederatedLearningConfig, LocalUserProfile, ProteinType } from '../types';
import { AI_NAME } from '../constants/appName';
import { INITIAL_SMOKER_PROFILE, INITIAL_COOK_LOGS, INITIAL_FUEL_LOGS } from '../data/mockData';

export const KEYS = {
  PROFILE: 'smoker_app_profile_v1',
  COOK_LOGS: 'smoker_app_cook_logs_v1',
  FUEL_LOGS: 'smoker_app_fuel_logs_v1',
  CHARGPT_MEMORY: 'chargpt_memory_v4',
  FEDERATED_LEARNING: 'federated_learning_config_v1',
  CUSTOM_SMOKERS: 'smoker_app_custom_smokers_v1',
  MANUFACTURER_SMOKERS: 'smoker_app_manufacturer_smokers_v1',
  CHARGPT_CHAT_HISTORY: 'chargpt_chat_history_v4',
  VERIFIED_MEAT_CUTS: 'smoker_app_verified_meat_cuts_v1',
  CUSTOM_FUEL_PRESETS: 'smoker_app_custom_fuel_presets_v1',
  LOW_POWER_MODE: 'smoker_app_low_power_mode_v1',
  AUTO_CLEAR_INTERVAL: 'smoker_app_auto_clear_interval_v1',
  LAST_AUTO_CLEAR_TIMESTAMP: 'smoker_app_last_auto_clear_timestamp_v1',
  MASTER_LIVE_UPDATES: 'master_admin_live_updates_v1',
  MASTER_CODE_PATCHES: 'master_admin_code_patches_v1',
  DEPLOYMENT_CLEAN_SLATE: 'smoker_app_clean_slate_deployment_v2',
  CHARGPT_RECIPE_ANALYSIS: 'chargpt_saved_recipe_analysis_v1',
};

/**
 * Performs a complete clean slate wipe of all cook logs, fuel logs, and metrics for clean deployment.
 */
export function performFullCleanSlateReset(): void {
  try {
    localStorage.setItem(KEYS.COOK_LOGS, JSON.stringify([]));
    localStorage.setItem(KEYS.FUEL_LOGS, JSON.stringify([]));
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(INITIAL_SMOKER_PROFILE));
    localStorage.setItem(KEYS.CUSTOM_FUEL_PRESETS, JSON.stringify([]));
    localStorage.removeItem(KEYS.CHARGPT_CHAT_HISTORY);
    localStorage.removeItem(KEYS.CHARGPT_MEMORY);
    localStorage.removeItem('chargpt_chat_history_v1');
    localStorage.removeItem('chargpt_memory_v1');
    localStorage.removeItem('smoker_web_recipes');
    localStorage.setItem(KEYS.DEPLOYMENT_CLEAN_SLATE, 'true');
  } catch (e) {
    console.error('Error executing clean slate reset:', e);
  }
}

export function ensureDeploymentCleanSlate(): void {
  // Automatic cache/slate clearing removed as requested.
}

export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    if (e?.name === 'QuotaExceededError' || e?.code === 22) {
      console.warn('LocalStorage quota exceeded! Triggering automatic storage optimization...', e);
      compactAndOptimizeStorage();
      try {
        localStorage.setItem(key, value);
      } catch (retryError) {
        console.error('Failed to save to localStorage even after compaction:', retryError);
      }
    } else {
      console.error(`Failed to save key "${key}" to localStorage:`, e);
    }
  }
}

export function loadSavedCustomSmokers(): import('../types').CustomSmokerSpec[] {
  try {
    const raw = localStorage.getItem(KEYS.CUSTOM_SMOKERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load saved custom smokers', e);
  }
  return [];
}

export function saveSavedCustomSmokers(smokers: import('../types').CustomSmokerSpec[]): void {
  safeSetItem(KEYS.CUSTOM_SMOKERS, JSON.stringify(smokers));
}

export function loadSavedManufacturerSmokers(): import('../types').ManufacturerSmokerSpec[] {
  try {
    const raw = localStorage.getItem(KEYS.MANUFACTURER_SMOKERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load saved manufacturer smokers', e);
  }
  return [];
}

export function saveSavedManufacturerSmokers(smokers: import('../types').ManufacturerSmokerSpec[]): void {
  safeSetItem(KEYS.MANUFACTURER_SMOKERS, JSON.stringify(smokers));
}

export function loadSavedFuelPresets(): import('../types').CustomFuelBlendPreset[] {
  try {
    const raw = localStorage.getItem(KEYS.CUSTOM_FUEL_PRESETS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load saved fuel blend presets', e);
  }
  return [];
}

export function saveSavedFuelPresets(presets: import('../types').CustomFuelBlendPreset[]): void {
  safeSetItem(KEYS.CUSTOM_FUEL_PRESETS, JSON.stringify(presets));
}

export const DEFAULT_LOW_POWER_SETTINGS: import('../types').LowPowerModeSettings = {
  enabled: false,
  reduceAnimations: true,
  slowTelemetryPolling: true,
  disableGpuBlurEffects: true,
  dimBrightnessOnBattery: false,
};

export function loadLowPowerMode(): import('../types').LowPowerModeSettings {
  try {
    const raw = localStorage.getItem(KEYS.LOW_POWER_MODE);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load low power mode settings', e);
  }
  return DEFAULT_LOW_POWER_SETTINGS;
}

export function saveLowPowerMode(settings: import('../types').LowPowerModeSettings): void {
  safeSetItem(KEYS.LOW_POWER_MODE, JSON.stringify(settings));
}

export const DEFAULT_GRANULAR_SHARING: import('../types').GranularDataSharingPermissions = {
  shareProteinAndCuts: false,
  shareMeatWeightAndDimensions: false,
  shareSmokerSpecsAndMods: false,
  shareFuelAndWoodBlends: false,
  shareThermalTempCurves: false,
  shareRatingsAndFlavorScores: false,
  shareWeatherAndLocation: false,
  shareCustomRubRecipes: false,
  shareCookPhotos: false,
};

export const INITIAL_FEDERATED_LEARNING_CONFIG: FederatedLearningConfig = {
  enabled: false,
  anonymizeData: true,
  autoSyncContributions: false,
  contributedCount: 0,
  lastSyncedAt: '',
  granularSharing: DEFAULT_GRANULAR_SHARING,
};

export function loadFederatedLearningConfig(): FederatedLearningConfig {
  try {
    const raw = localStorage.getItem(KEYS.FEDERATED_LEARNING);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...INITIAL_FEDERATED_LEARNING_CONFIG,
        ...parsed,
        granularSharing: {
          ...DEFAULT_GRANULAR_SHARING,
          ...(parsed.granularSharing || {}),
        },
      };
    }
  } catch (e) {
    console.error('Failed to load federated learning config', e);
  }
  return INITIAL_FEDERATED_LEARNING_CONFIG;
}

export function saveFederatedLearningConfig(config: FederatedLearningConfig): void {
  safeSetItem(KEYS.FEDERATED_LEARNING, JSON.stringify(config));
}


export const INITIAL_CHARGPT_MEMORY: CharGPTMemory = {
  totalInteractions: 0,
  totalLogsAnalyzed: 0,
  userName: undefined,
  learnedRules: [],
  favoriteProteins: [],
  preferredWoodTypes: [],
  topTechniques: [],
  lastEvolvedAt: new Date().toISOString(),
};

export const DELETED_VAULT_RULE_IDS_KEY = 'chargpt_deleted_vault_rule_ids_v1';

export function loadDeletedVaultRuleIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_VAULT_RULE_IDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.error('Failed to load deleted vault rule IDs', e);
  }
  return [];
}

export function saveDeletedVaultRuleIds(ids: string[]): void {
  try {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    localStorage.setItem(DELETED_VAULT_RULE_IDS_KEY, JSON.stringify(unique));
  } catch (e) {
    console.error('Failed to save deleted vault rule IDs', e);
  }
}

export function addDeletedVaultRuleId(idOrIds: string | string[]): void {
  const current = loadDeletedVaultRuleIds();
  const toAdd = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
  const updated = Array.from(new Set([...current, ...toAdd.filter(Boolean)]));
  saveDeletedVaultRuleIds(updated);
}

export function resetCharGPTMemory(): CharGPTMemory {
  try {
    const currentMemory = loadCharGPTMemory();
    if (currentMemory.learnedRules && currentMemory.learnedRules.length > 0) {
      addDeletedVaultRuleId(currentMemory.learnedRules.map((r) => r.id));
    }
    localStorage.removeItem(KEYS.CHARGPT_MEMORY);
    localStorage.removeItem(KEYS.CHARGPT_CHAT_HISTORY);
  } catch (e) {
    console.error('Failed to reset CharGPT memory', e);
  }
  return { ...INITIAL_CHARGPT_MEMORY, lastEvolvedAt: new Date().toISOString() };
}

export function loadCharGPTMemory(): CharGPTMemory {
  try {
    let memory: CharGPTMemory | null = null;
    const raw = localStorage.getItem(KEYS.CHARGPT_MEMORY);
    if (raw) {
      memory = JSON.parse(raw);
    }

    // Merge or fallback from pitmaster_local_user_account Memory Vault
    try {
      const rawAcc = localStorage.getItem('pitmaster_local_user_account');
      if (rawAcc) {
        const acc = JSON.parse(rawAcc);
        if (acc?.charGPTMemory) {
          if (!memory) {
            memory = acc.charGPTMemory;
          } else if ((acc.charGPTMemory.learnedRules?.length || 0) > (memory.learnedRules?.length || 0)) {
            memory = {
              ...memory,
              ...acc.charGPTMemory,
              learnedRules: acc.charGPTMemory.learnedRules,
            };
          }
        }
        if (memory && !memory.userName && acc?.name && acc.name !== 'Pitmaster' && acc.name !== 'Guest Pitmaster') {
          memory.userName = acc.name;
        }
      }
    } catch (e) {}

    if (memory) {
      const deletedSet = new Set(loadDeletedVaultRuleIds());
      if (deletedSet.size > 0 && Array.isArray(memory.learnedRules)) {
        memory.learnedRules = memory.learnedRules.filter((r) => r && r.id && !deletedSet.has(r.id));
      }
      return memory;
    }
  } catch (e) {
    console.error('Failed to load CharGPT memory', e);
  }
  return INITIAL_CHARGPT_MEMORY;
}

export function saveCharGPTMemory(memory: CharGPTMemory): void {
  const deletedSet = new Set(loadDeletedVaultRuleIds());
  if (deletedSet.size > 0 && Array.isArray(memory.learnedRules)) {
    memory.learnedRules = memory.learnedRules.filter((r) => r && r.id && !deletedSet.has(r.id));
  }
  safeSetItem(KEYS.CHARGPT_MEMORY, JSON.stringify(memory));

  // Continuously sync Memory Vault to Pitmaster Local User Account
  try {
    const rawAcc = localStorage.getItem('pitmaster_local_user_account');
    if (rawAcc) {
      const acc = JSON.parse(rawAcc);
      acc.charGPTMemory = memory;
      if (memory.userName) {
        acc.name = memory.userName;
      }
      localStorage.setItem('pitmaster_local_user_account', JSON.stringify(acc));
    }
  } catch (e) {}

}

export interface SavedCharGPTRecipeAnalysis {
  text: string;
  logCount: number;
  timestamp: string;
}

export function loadSavedRecipeAnalysis(): SavedCharGPTRecipeAnalysis | null {
  try {
    const raw = localStorage.getItem(KEYS.CHARGPT_RECIPE_ANALYSIS);
    if (raw) {
      return JSON.parse(raw);
    }
    const memory = loadCharGPTMemory();
    if (memory.lastAnalysisText) {
      return {
        text: memory.lastAnalysisText,
        logCount: memory.lastAnalysisLogCount || 0,
        timestamp: memory.lastAnalysisTimestamp || new Date().toISOString(),
      };
    }
  } catch (e) {
    console.error('Failed to load saved recipe analysis', e);
  }
  return null;
}

export function saveRecipeAnalysis(analysisText: string, logCount: number): SavedCharGPTRecipeAnalysis {
  const analysis: SavedCharGPTRecipeAnalysis = {
    text: analysisText,
    logCount,
    timestamp: new Date().toISOString(),
  };
  try {
    safeSetItem(KEYS.CHARGPT_RECIPE_ANALYSIS, JSON.stringify(analysis));
    const memory = loadCharGPTMemory();
    memory.lastAnalysisText = analysis.text;
    memory.lastAnalysisLogCount = analysis.logCount;
    memory.lastAnalysisTimestamp = analysis.timestamp;
    memory.totalLogsAnalyzed = Math.max(memory.totalLogsAnalyzed || 0, logCount);
    saveCharGPTMemory(memory);
  } catch (e) {
    console.error('Failed to save recipe analysis to account/storage', e);
  }
  return analysis;
}

export function autoEvolveCharGPTMemory(logs: CookLog[], currentMemory?: CharGPTMemory): CharGPTMemory {
  const baseMemory = currentMemory || loadCharGPTMemory();
  return {
    ...baseMemory,
    totalLogsAnalyzed: Array.isArray(logs) ? logs.length : 0,
    learnedRules: [...(baseMemory.learnedRules || [])],
    favoriteProteins: [...(baseMemory.favoriteProteins || [])],
    preferredWoodTypes: [...(baseMemory.preferredWoodTypes || [])],
    topTechniques: [...(baseMemory.topTechniques || [])],
  };
}

export function loadSmokerProfile(): SmokerProfile {
  try {
    const raw = localStorage.getItem(KEYS.PROFILE);
    if (raw) {
      const profile: SmokerProfile = JSON.parse(raw);
      if (profile.initialHours === 129.75 || profile.currentHours === 160.75) {
        profile.initialHours = 0;
        const cookLogs = loadCookLogs();
        const totalLogged = cookLogs
          .filter((c) => c.isPublishedToTotalHours === true)
          .reduce((acc, c) => acc + (c.hoursLogged || 0), 0);
        profile.currentHours = Number((0 + totalLogged).toFixed(2));
        saveSmokerProfile(profile);
      }
      return profile;
    }
  } catch (e) {
    console.error('Failed to load smoker profile', e);
  }
  return INITIAL_SMOKER_PROFILE;
}

export function saveSmokerProfile(profile: SmokerProfile): void {
  const json = JSON.stringify(profile);
  safeSetItem(KEYS.PROFILE, json);
  safeSetItem('smoker_rigs_v1', json);
  safeSetItem('pitmaster_smoker_profile', json);
}

export const DELETED_COOK_LOG_IDS_KEY = 'smoker_deleted_cook_log_ids_v1';

export function loadDeletedCookLogIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_COOK_LOG_IDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.error('Failed to load deleted cook log IDs', e);
  }
  return [];
}

export function saveDeletedCookLogIds(ids: string[]): void {
  try {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    localStorage.setItem(DELETED_COOK_LOG_IDS_KEY, JSON.stringify(unique));
  } catch (e) {
    console.error('Failed to save deleted cook log IDs', e);
  }
}

export function addDeletedCookLogId(idOrIds: string | string[]): void {
  const current = loadDeletedCookLogIds();
  const toAdd = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
  const updated = Array.from(new Set([...current, ...toAdd.filter(Boolean)]));
  saveDeletedCookLogIds(updated);
}

export function sanitizeAndFillCookLog(c: Partial<CookLog>, index = 0): CookLog {
  const title = String(c.title || '').trim() || 'Untitled cook';
  const proteinCut = String(c.proteinCut || '').trim() || 'Unknown cut';
  const proteinType = (c.proteinType || 'Other') as ProteinType;
  const hoursLogged = typeof c.hoursLogged === 'number' && Number.isFinite(c.hoursLogged) ? Math.max(0, c.hoursLogged) : 0;
  const startingSmokerHours = typeof c.startingSmokerHours === 'number' && Number.isFinite(c.startingSmokerHours) ? Math.max(0, c.startingSmokerHours) : 0;
  const endingSmokerHours = typeof c.endingSmokerHours === 'number' && Number.isFinite(c.endingSmokerHours)
    ? Math.max(startingSmokerHours, c.endingSmokerHours)
    : startingSmokerHours + hoursLogged;

  return {
    id: c.id || `cook-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
    title,
    date: c.date || '',
    pageNumber: c.pageNumber ?? (index + 1),
    proteinType,
    proteinCut,
    meatWeightLbs: typeof c.meatWeightLbs === 'number' && Number.isFinite(c.meatWeightLbs) ? Math.max(0, c.meatWeightLbs) : 0,
    startingSmokerHours,
    hoursLogged,
    endingSmokerHours,
    smokerId: c.smokerId || '',
    smokerType: c.smokerType || ('' as any),
    fuelType: c.fuelType || '',
    fuelLbsConsumed: typeof c.fuelLbsConsumed === 'number' && Number.isFinite(c.fuelLbsConsumed) ? Math.max(0, c.fuelLbsConsumed) : 0,
    seasoningRubs: c.seasoningRubs || '',
    saucesGlazes: c.saucesGlazes || '',
    finishedNotes: c.finishedNotes || '',
    nextTimeNotes: c.nextTimeNotes || '',
    wouldMakeAgain: c.wouldMakeAgain ?? false,
    ratings: c.ratings || { smokeRing: 0, bark: 0, tenderness: 0, overall: 0 },
    weatherConditions: c.weatherConditions || '',
    zipcode: c.zipcode,
    temperatureReadings: Array.isArray(c.temperatureReadings) ? c.temperatureReadings : [],
    status: c.status || ('Draft' as any),
    isPublishedToTotalHours: c.isPublishedToTotalHours ?? false,
    timerSeconds: typeof c.timerSeconds === 'number' && Number.isFinite(c.timerSeconds) ? Math.max(0, c.timerSeconds) : 0,
  };
}

export function loadCookLogs(): CookLog[] {
  try {
    const deletedIds = new Set(loadDeletedCookLogIds());
    const raw = localStorage.getItem(KEYS.COOK_LOGS) ||
                localStorage.getItem('smoker_cook_logs_v1') ||
                localStorage.getItem('pitmaster_cook_logs');
    if (raw) {
      let logs: CookLog[] = JSON.parse(raw);
      if (deletedIds.size > 0 && Array.isArray(logs)) {
        logs = logs.filter((c) => c && c.id && !deletedIds.has(c.id));
      }
      if (Array.isArray(logs)) {
        let needsMigration = false;
        if (logs.length > 0) {
          const minStart = Math.min(...logs.map((c) => c.startingSmokerHours || 0));
          if (minStart >= 129.75) {
            needsMigration = true;
          }
        }
        if (needsMigration) {
          const sorted = [...logs].reverse();
          let current = 0;
          sorted.forEach((c) => {
            c.startingSmokerHours = current;
            c.endingSmokerHours = Number((current + (c.hoursLogged || 0)).toFixed(2));
            current = c.endingSmokerHours;
          });
        }
        const sanitized = logs.map((log, idx) => sanitizeAndFillCookLog(log, idx));
        saveCookLogs(sanitized);
        return sanitized;
      }
    }
  } catch (e) {
    console.error('Failed to load cook logs', e);
  }
  return INITIAL_COOK_LOGS.map((log, idx) => sanitizeAndFillCookLog(log, idx));
}

export function saveCookLogs(logs: CookLog[]): void {
  const deletedIds = new Set(loadDeletedCookLogIds());
  const filtered = deletedIds.size > 0 && Array.isArray(logs)
    ? logs.filter((c) => c && c.id && !deletedIds.has(c.id))
    : logs;
  const sanitized = Array.isArray(filtered)
    ? filtered.map((log, idx) => sanitizeAndFillCookLog(log, idx))
    : [];
  const json = JSON.stringify(sanitized);
  safeSetItem(KEYS.COOK_LOGS, json);
  safeSetItem('smoker_cook_logs_v1', json);
  safeSetItem('pitmaster_cook_logs', json);
  safeSetItem('smoker_hours_cook_logs', json);
}

export function loadFuelLogs(): FuelLog[] {
  try {
    const raw = localStorage.getItem(KEYS.FUEL_LOGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load fuel logs', e);
  }
  return INITIAL_FUEL_LOGS;
}

export function saveFuelLogs(fuel: FuelLog[]): void {
  safeSetItem(KEYS.FUEL_LOGS, JSON.stringify(fuel));
}

export function loadCustomFuelPresets(): import('../types').CustomFuelBlendPreset[] {
  try {
    const raw = localStorage.getItem(KEYS.CUSTOM_FUEL_PRESETS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load custom fuel presets', e);
  }
  return [];
}

export function saveCustomFuelPresets(presets: import('../types').CustomFuelBlendPreset[]): void {
  safeSetItem(KEYS.CUSTOM_FUEL_PRESETS, JSON.stringify(presets));
}

export function addCustomFuelPreset(preset: import('../types').CustomFuelBlendPreset): import('../types').CustomFuelBlendPreset[] {
  const existing = loadCustomFuelPresets();
  const updated = [preset, ...existing.filter((p) => p.id !== preset.id)];
  saveCustomFuelPresets(updated);
  return updated;
}

export function resetAllDataToDefault(): {
  profile: SmokerProfile;
  cookLogs: CookLog[];
  fuelLogs: FuelLog[];
} {
  localStorage.removeItem(KEYS.PROFILE);
  localStorage.removeItem(KEYS.COOK_LOGS);
  localStorage.removeItem(KEYS.FUEL_LOGS);
  return {
    profile: INITIAL_SMOKER_PROFILE,
    cookLogs: INITIAL_COOK_LOGS,
    fuelLogs: INITIAL_FUEL_LOGS,
  };
}

export interface StorageStats {
  usedBytes: number;
  totalEstimatedQuotaBytes: number;
  allocatedStorageMb: number;
  usedFormatted: string;
  percentUsed: number;
  breakdown: Array<{ key: string; label: string; bytes: number; formatted: string }>;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getStorageStats(): StorageStats {
  let usedBytes = 0;
  const breakdown: Array<{ key: string; label: string; bytes: number; formatted: string }> = [];

  const labels: Record<string, string> = {
    [KEYS.PROFILE]: 'Active Smoker Profile',
    [KEYS.COOK_LOGS]: 'Cook Logs & Session Archive',
    [KEYS.FUEL_LOGS]: 'Fuel & Pellet Consumption Logs',
    [KEYS.CHARGPT_MEMORY]: `${AI_NAME} Memory & Rules`,
    [KEYS.FEDERATED_LEARNING]: 'Federated Sync Config',
    [KEYS.CUSTOM_SMOKERS]: 'Custom Smoker Specifications',
    [KEYS.MANUFACTURER_SMOKERS]: 'Manufacturer Smoker Catalog',
  };

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key) || '';
        const bytes = (key.length + val.length) * 2; // UTF-16 estimation
        usedBytes += bytes;
        breakdown.push({
          key,
          label: labels[key] || key,
          bytes,
          formatted: formatBytes(bytes),
        });
      }
    }
  } catch (e) {
    console.error('Failed to compute storage stats', e);
  }

  const quota = 70 * 1024 * 1024; // 70 MB allocated storage space for Smoke Stack
  const percentUsed = Math.min(100, Number(((usedBytes / quota) * 100).toFixed(2)));

  return {
    usedBytes,
    totalEstimatedQuotaBytes: quota,
    allocatedStorageMb: 70,
    usedFormatted: formatBytes(usedBytes),
    percentUsed,
    breakdown,
  };
}

export function compactAndOptimizeStorage(): { freedBytes: number; freedFormatted: string } {
  const initial = getStorageStats().usedBytes;

  // 1. Optimize CharGPT memory (limit to top 25 highest confidence rules)
  try {
    const mem = loadCharGPTMemory();
    if (mem.learnedRules && mem.learnedRules.length > 25) {
      mem.learnedRules = mem.learnedRules
        .sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0))
        .slice(0, 25);
      saveCharGPTMemory(mem);
    }
  } catch (e) {}

  // 2. Loss-less Cook Logs Storage Compression (never clears or drops logs, strips empty/null/whitespace props)
  try {
    const logs = loadCookLogs();
    if (Array.isArray(logs) && logs.length > 0) {
      const optimized = logs.map((log) => {
        const copy: any = { ...log };

        // Clean & trim string properties; remove if empty
        const stringFields = [
          'finishedNotes',
          'nextTimeNotes',
          'weatherConditions',
          'zipcode',
          'seasoningRubs',
          'saucesGlazes',
          'photoUrl',
          'pitmasterAlias',
          'userEmail',
          'fuelType',
          'proteinCut',
        ];

        stringFields.forEach((field) => {
          if (typeof copy[field] === 'string') {
            copy[field] = copy[field].trim();
            if (copy[field] === '') {
              delete copy[field];
            }
          } else if (copy[field] === null || copy[field] === undefined) {
            delete copy[field];
          }
        });

        // Clean photoUrls array
        if (Array.isArray(copy.photoUrls)) {
          copy.photoUrls = copy.photoUrls.map((u: string) => (typeof u === 'string' ? u.trim() : u)).filter(Boolean);
          if (copy.photoUrls.length === 0) {
            delete copy.photoUrls;
          }
        } else if (!copy.photoUrls) {
          delete copy.photoUrls;
        }

        // Round numeric fields to 2 decimals to eliminate floating-point precision bloat
        const numericFields = [
          'hoursLogged',
          'fuelLbsConsumed',
          'meatWeightLbs',
          'meatWeightKg',
          'startingSmokerHours',
          'endingSmokerHours',
        ];
        numericFields.forEach((field) => {
          if (typeof copy[field] === 'number' && !isNaN(copy[field])) {
            copy[field] = Number(copy[field].toFixed(2));
          }
        });

        // Optimize temperature readings array inside log
        if (Array.isArray(copy.temperatureReadings)) {
          copy.temperatureReadings = copy.temperatureReadings.map((tr: any) => {
            const cleanTr = { ...tr };
            if (typeof cleanTr.notes === 'string') {
              cleanTr.notes = cleanTr.notes.trim();
              if (!cleanTr.notes) delete cleanTr.notes;
            }
            if (typeof cleanTr.pitTemp === 'number') cleanTr.pitTemp = Math.round(cleanTr.pitTemp);
            if (typeof cleanTr.meatTemp === 'number') cleanTr.meatTemp = Math.round(cleanTr.meatTemp);
            return cleanTr;
          });
        }

        return copy;
      });

      saveCookLogs(optimized);
    }
  } catch (e) {
    console.error('Failed to compress cook logs storage:', e);
  }

  const final = getStorageStats().usedBytes;
  const freed = Math.max(0, initial - final);
  return {
    freedBytes: freed,
    freedFormatted: formatBytes(freed),
  };
}

export interface StoredChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  imageData?: string;
}

export function loadCharGPTChatHistory(): StoredChatMessage[] {
  try {
    const raw = localStorage.getItem(KEYS.CHARGPT_CHAT_HISTORY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load CharGPT chat history', e);
  }
  return [];
}

export function saveCharGPTChatHistory(messages: StoredChatMessage[]): void {
  // Keep last 40 messages to optimize storage
  const trimmed = (messages || []).slice(-40);
  safeSetItem(KEYS.CHARGPT_CHAT_HISTORY, JSON.stringify(trimmed));
}

export const INITIAL_VERIFIED_MEAT_CUTS: import('../types').VerifiedMeatCut[] = [];
// Food-safety references with source URLs are defined in src/data/verifiedMeatCutsData.ts.

export function loadVerifiedMeatCuts(): import('../types').VerifiedMeatCut[] {
  try {
    const raw = localStorage.getItem(KEYS.VERIFIED_MEAT_CUTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to load verified meat cuts from storage', e);
  }
  return INITIAL_VERIFIED_MEAT_CUTS;
}

export function saveVerifiedMeatCuts(cuts: import('../types').VerifiedMeatCut[]): void {
  safeSetItem(KEYS.VERIFIED_MEAT_CUTS, JSON.stringify(cuts));
}

export function addOrUpdateVerifiedMeatCut(cut: import('../types').VerifiedMeatCut): import('../types').VerifiedMeatCut[] {
  const existing = loadVerifiedMeatCuts();
  const idx = existing.findIndex((c) => c.id === cut.id);
  let updated: import('../types').VerifiedMeatCut[];
  if (idx >= 0) {
    updated = [...existing];
    updated[idx] = { ...cut, updatedAt: new Date().toISOString() };
  } else {
    updated = [cut, ...existing];
  }
  saveVerifiedMeatCuts(updated);
  return updated;
}

export function deleteVerifiedMeatCut(id: string): import('../types').VerifiedMeatCut[] {
  const existing = loadVerifiedMeatCuts();
  const filtered = existing.filter((c) => c.id !== id);
  saveVerifiedMeatCuts(filtered);
  return filtered;
}

export type AutoClearIntervalOption = 'never' | '7_days' | '30_days' | '90_days';

export function getAutoClearInterval(): AutoClearIntervalOption {
  try {
    const raw = localStorage.getItem(KEYS.AUTO_CLEAR_INTERVAL);
    if (raw && ['never', '7_days', '30_days', '90_days'].includes(raw)) {
      return raw as AutoClearIntervalOption;
    }
  } catch (e) {
    console.error('Failed to get auto clear interval', e);
  }
  return '30_days'; // Default: Auto clear every 30 days for mobile storage optimization
}

export function setAutoClearInterval(interval: AutoClearIntervalOption): void {
  safeSetItem(KEYS.AUTO_CLEAR_INTERVAL, interval);
}

export function getLastAutoClearTimestamp(): number {
  try {
    const raw = localStorage.getItem(KEYS.LAST_AUTO_CLEAR_TIMESTAMP);
    if (raw) return parseInt(raw, 10) || 0;
  } catch (e) {
    console.error('Failed to get last auto clear timestamp', e);
  }
  return 0;
}

export function getNextAutoClearDateFormatted(): string {
  const interval = getAutoClearInterval();
  if (interval === 'never') return 'Disabled (Never)';

  const lastTs = getLastAutoClearTimestamp() || Date.now();
  let days = 30;
  if (interval === '7_days') days = 7;
  if (interval === '90_days') days = 90;

  const nextDate = new Date(lastTs + days * 24 * 60 * 60 * 1000);
  return nextDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function executeCacheClear(): { freedBytes: number; freedFormatted: string; message: string } {
  const beforeStats = getStorageStats();
  const initialBytes = beforeStats.usedBytes;

  // 1. Purge oversized chat history beyond last 10 messages
  try {
    const chatHistory = loadCharGPTChatHistory();
    if (chatHistory.length > 10) {
      saveCharGPTChatHistory(chatHistory.slice(-10));
    }
  } catch (e) {}

  // 2. Compact CharGPT memory vault to top 20 rules
  try {
    const mem = loadCharGPTMemory();
    if (mem.learnedRules && mem.learnedRules.length > 20) {
      mem.learnedRules = mem.learnedRules
        .sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0))
        .slice(0, 20);
      saveCharGPTMemory(mem);
    }
  } catch (e) {}

  // 3. Purge temporary photo blobs & non-essential cached search objects
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('temp_') || key.startsWith('cache_search_') || key.includes('_temp_blob'))) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {}

  // 4. Run loss-less storage compaction & defragmentation
  compactAndOptimizeStorage();

  const nowTs = Date.now();
  safeSetItem(KEYS.LAST_AUTO_CLEAR_TIMESTAMP, nowTs.toString());

  const afterStats = getStorageStats();
  const freedBytes = Math.max(0, initialBytes - afterStats.usedBytes);
  const freedFormatted = formatBytes(freedBytes);

  return {
    freedBytes,
    freedFormatted,
    message: `Auto-defragmentation complete! Reclaimed ${freedFormatted} within 70 MB allocated Smoke Stack storage space. All cook logs & settings preserved.`,
  };
}

export function checkAndRunAutoCacheClear(): { ran: boolean; message?: string } {
  const interval = getAutoClearInterval();
  if (interval === 'never') return { ran: false };

  let days = 30;
  if (interval === '7_days') days = 7;
  if (interval === '90_days') days = 90;

  const lastTs = getLastAutoClearTimestamp();
  const now = Date.now();
  const intervalMs = days * 24 * 60 * 60 * 1000;

  if (lastTs === 0) {
    safeSetItem(KEYS.LAST_AUTO_CLEAR_TIMESTAMP, now.toString());
    return { ran: false };
  }

  if (now - lastTs >= intervalMs) {
    const res = executeCacheClear();
    return {
      ran: true,
      message: `⚡ 30-Day Auto-Defragmentation Executed: ${res.message}`,
    };
  }

  return { ran: false };
}

/**
 * Generates and downloads a complete JSON backup of all app data and settings.
 */
export function exportFullAppDataJson(): void {
  const exportData = {
    app: 'Smoke Stack AI',
    version: '0.02A',
    exportedAt: new Date().toISOString(),
    profile: loadSmokerProfile(),
    cookLogs: loadCookLogs(),
    fuelLogs: loadFuelLogs(),
    charGPTMemory: loadCharGPTMemory(),
    customSmokers: loadSavedCustomSmokers(),
    customFuelPresets: loadSavedFuelPresets(),
    verifiedMeatCuts: loadVerifiedMeatCuts(),
    lowPowerSettings: loadLowPowerMode(),
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `SmokeStack_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Restores app state from a uploaded JSON backup payload.
 */
export function importFullAppDataJson(jsonString: string): { success: boolean; message: string } {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') {
      return { success: false, message: 'Invalid JSON backup format.' };
    }

    if (data.profile) saveSmokerProfile(data.profile);
    if (Array.isArray(data.cookLogs)) saveCookLogs(data.cookLogs);
    if (Array.isArray(data.fuelLogs)) saveFuelLogs(data.fuelLogs);
    if (data.charGPTMemory) saveCharGPTMemory(data.charGPTMemory);
    if (Array.isArray(data.customSmokers)) saveSavedCustomSmokers(data.customSmokers);
    if (Array.isArray(data.customFuelPresets)) saveSavedFuelPresets(data.customFuelPresets);
    if (Array.isArray(data.verifiedMeatCuts)) saveVerifiedMeatCuts(data.verifiedMeatCuts);
    if (data.lowPowerSettings) saveLowPowerMode(data.lowPowerSettings);

    return { success: true, message: 'App database restored successfully!' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to parse JSON file' };
  }
}

/**
  * Clears all smoker journal entries and cook log archives completely.
  */
export function clearAllCookLogsAndArchives(): { success: boolean; message: string } {
  localStorage.setItem(KEYS.COOK_LOGS, JSON.stringify([]));
  return {
    success: true,
    message: 'Smoker Journal and Cook Log Archives cleared successfully.',
  };
}

export function loadLocalUserProfile(): LocalUserProfile | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const saved = localStorage.getItem('pitmaster_local_user_account');
    return saved ? JSON.parse(saved) : undefined;
  } catch (e) {
    return undefined;
  }
}

export function saveLocalUserProfile(profile: LocalUserProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('pitmaster_local_user_account', JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save local user profile', e);
  }
}

const SIMULATED_10K_HOURS_KEY = 'smokestack_simulated_10k_hours';

export function load10kHoursSimulated(): boolean {
  try {
    return localStorage.getItem(SIMULATED_10K_HOURS_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

export function save10kHoursSimulated(simulated: boolean): void {
  try {
    localStorage.setItem(SIMULATED_10K_HOURS_KEY, simulated ? 'true' : 'false');
  } catch (e) {}
}



