import { SmokerProfile, CookLog, FuelLog, CharGPTMemory, CharGPTRule, FederatedLearningConfig } from '../types';
import { AI_NAME } from '../constants/appName';
import { INITIAL_SMOKER_PROFILE, INITIAL_COOK_LOGS, INITIAL_FUEL_LOGS } from '../data/mockData';

export const KEYS = {
  PROFILE: 'smoker_app_profile_v1',
  COOK_LOGS: 'smoker_app_cook_logs_v1',
  FUEL_LOGS: 'smoker_app_fuel_logs_v1',
  CHARGPT_MEMORY: 'chargpt_memory_v1',
  FEDERATED_LEARNING: 'federated_learning_config_v1',
  CUSTOM_SMOKERS: 'smoker_app_custom_smokers_v1',
  MANUFACTURER_SMOKERS: 'smoker_app_manufacturer_smokers_v1',
  CHARGPT_CHAT_HISTORY: 'chargpt_chat_history_v1',
  VERIFIED_MEAT_CUTS: 'smoker_app_verified_meat_cuts_v1',
  CUSTOM_FUEL_PRESETS: 'smoker_app_custom_fuel_presets_v1',
  LOW_POWER_MODE: 'smoker_app_low_power_mode_v1',
  AUTO_CLEAR_INTERVAL: 'smoker_app_auto_clear_interval_v1',
  LAST_AUTO_CLEAR_TIMESTAMP: 'smoker_app_last_auto_clear_timestamp_v1',
};

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
  shareProteinAndCuts: true,
  shareMeatWeightAndDimensions: true,
  shareSmokerSpecsAndMods: true,
  shareFuelAndWoodBlends: true,
  shareThermalTempCurves: true,
  shareRatingsAndFlavorScores: true,
  shareWeatherAndLocation: true,
  shareCustomRubRecipes: true,
  shareCookPhotos: true,
};

export const INITIAL_FEDERATED_LEARNING_CONFIG: FederatedLearningConfig = {
  enabled: true,
  anonymizeData: true,
  autoSyncContributions: true,
  contributedCount: 3,
  lastSyncedAt: new Date().toISOString(),
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
  totalInteractions: 5,
  totalLogsAnalyzed: 0,
  learnedRules: [
    {
      id: 'rule-initial-1',
      category: 'technique',
      title: 'Peach Butcher Paper Stall Protection',
      detail: 'Prefers wrapping brisket and pork butt at 160°F - 165°F in peach butcher paper with tallow for bark retention.',
      source: 'auto_analyzed',
      createdAt: new Date().toISOString(),
      confidenceScore: 92,
    },
    {
      id: 'rule-initial-2',
      category: 'wood_pairing',
      title: 'Pecan & Oak Hardwood Blend',
      detail: 'Highest ratings awarded when using 60/40 Pecan and Post Oak pellet blends for beef and pork.',
      source: 'cook_log_insight',
      createdAt: new Date().toISOString(),
      confidenceScore: 96,
    },
    {
      id: 'rule-initial-3',
      category: 'preference',
      title: 'Extended Insulated Cooler Rest',
      detail: 'Mandatory minimum 1.5 to 2.0 hour rest in faux-cambro/insulated cooler before slicing.',
      source: 'user_taught',
      createdAt: new Date().toISOString(),
      confidenceScore: 98,
    },
  ],
  favoriteProteins: ['Beef Brisket', 'Pork Shoulder', 'St. Louis Ribs'],
  preferredWoodTypes: ['Pecan', 'Post Oak', 'Hickory'],
  topTechniques: ['160°F Stall Wrap', 'Beef Tallow Spritz', '24hr Dry Brine'],
  lastEvolvedAt: new Date().toISOString(),
};

export function loadCharGPTMemory(): CharGPTMemory {
  try {
    const raw = localStorage.getItem(KEYS.CHARGPT_MEMORY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load CharGPT memory', e);
  }
  return INITIAL_CHARGPT_MEMORY;
}

export function saveCharGPTMemory(memory: CharGPTMemory): void {
  safeSetItem(KEYS.CHARGPT_MEMORY, JSON.stringify(memory));
}

export function autoEvolveCharGPTMemory(logs: CookLog[], currentMemory?: CharGPTMemory): CharGPTMemory {
  const baseMemory = currentMemory || loadCharGPTMemory();
  const existingRuleTitles = new Set(baseMemory.learnedRules.map((r) => r.title.toLowerCase()));

  const newRules: CharGPTRule[] = [...baseMemory.learnedRules];
  const woodCounts: Record<string, number> = {};
  const proteinCounts: Record<string, number> = {};

  logs.forEach((log) => {
    // Count fuel wood types
    if (log.fuelType) {
      woodCounts[log.fuelType] = (woodCounts[log.fuelType] || 0) + 1;
    }
    // Count protein cuts
    const proteinLabel = `${log.proteinType} (${log.proteinCut})`;
    proteinCounts[proteinLabel] = (proteinCounts[proteinLabel] || 0) + 1;

    // Analyze high rated logs for automatic rule creation
    if (log.ratings && log.ratings.overall >= 4) {
      if (log.seasoningRubs && !existingRuleTitles.has(`rub-${log.proteinCut.toLowerCase()}`)) {
        const title = `${log.proteinCut} Seasoning Preference`;
        if (!existingRuleTitles.has(title.toLowerCase())) {
          newRules.push({
            id: `rule-auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            category: 'rub_recipe',
            title,
            detail: `Learned rub profile for ${log.proteinCut}: "${log.seasoningRubs}". Awarded ${log.ratings.overall}/5 rating.`,
            source: 'cook_log_insight',
            createdAt: new Date().toISOString(),
            confidenceScore: 88,
          });
          existingRuleTitles.add(title.toLowerCase());
        }
      }

      if (log.nextTimeNotes && !existingRuleTitles.has(`next-time-${log.id}`)) {
        const title = `Insight from ${log.title}`;
        if (!existingRuleTitles.has(title.toLowerCase())) {
          newRules.push({
            id: `rule-insight-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            category: 'technique',
            title,
            detail: log.nextTimeNotes,
            source: 'cook_log_insight',
            createdAt: new Date().toISOString(),
            confidenceScore: 85,
          });
          existingRuleTitles.add(title.toLowerCase());
        }
      }
    }
  });

  // Top preferred wood types & proteins
  const sortedWood = Object.entries(woodCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([wood]) => wood)
    .slice(0, 4);

  const sortedProteins = Object.entries(proteinCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([p]) => p)
    .slice(0, 4);

  const updatedMemory: CharGPTMemory = {
    ...baseMemory,
    totalLogsAnalyzed: logs.length,
    learnedRules: newRules,
    preferredWoodTypes: sortedWood.length > 0 ? sortedWood : baseMemory.preferredWoodTypes,
    favoriteProteins: sortedProteins.length > 0 ? sortedProteins : baseMemory.favoriteProteins,
    lastEvolvedAt: new Date().toISOString(),
  };

  saveCharGPTMemory(updatedMemory);
  return updatedMemory;
}


export function loadSmokerProfile(): SmokerProfile {
  try {
    const raw = localStorage.getItem(KEYS.PROFILE);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load smoker profile', e);
  }
  return INITIAL_SMOKER_PROFILE;
}

export function saveSmokerProfile(profile: SmokerProfile): void {
  safeSetItem(KEYS.PROFILE, JSON.stringify(profile));
}

export function loadCookLogs(): CookLog[] {
  try {
    const raw = localStorage.getItem(KEYS.COOK_LOGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load cook logs', e);
  }
  return INITIAL_COOK_LOGS;
}

export function saveCookLogs(logs: CookLog[]): void {
  safeSetItem(KEYS.COOK_LOGS, JSON.stringify(logs));
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
  return [
    {
      id: 'preset-post-oak-pecan',
      title: 'Post Oak & Pecan Texas Blend (60/40)',
      brand: 'CharGPT Optimized Presets',
      description: 'Classic Texas beef brisket blend — Post Oak mahogany bark with smooth Pecan nuttiness.',
      components: [
        { woodType: 'Post Oak', percentage: 60, btuPerLb: 8600, costPerLb: 0.78, smokeProfile: 'Medium Mahogany' },
        { woodType: 'Pecan', percentage: 40, btuPerLb: 8700, costPerLb: 0.82, smokeProfile: 'Smooth Nutty' },
      ],
      btuPerLb: 8640,
      efficiencyRating: 91.8,
      costPerLb: 0.79,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'preset-competition-blend',
      title: 'CharGPT Competition Pork Blend (50/30/20)',
      brand: 'CharGPT Optimized Presets',
      description: 'Hickory backbone, Apple sweetness, and Cherry mahogany color accent for pork shoulder and ribs.',
      components: [
        { woodType: 'Hickory', percentage: 50, btuPerLb: 8800, costPerLb: 0.75, smokeProfile: 'Bold Bacon' },
        { woodType: 'Apple', percentage: 30, btuPerLb: 8300, costPerLb: 0.80, smokeProfile: 'Sweet Fruitwood' },
        { woodType: 'Cherry', percentage: 20, btuPerLb: 8200, costPerLb: 0.85, smokeProfile: 'Red Mahogany' },
      ],
      btuPerLb: 8530,
      efficiencyRating: 92.5,
      costPerLb: 0.78,
      createdAt: new Date().toISOString(),
    },
  ];
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

  const quota = 5 * 1024 * 1024; // Standard ~5MB browser localStorage quota
  const percentUsed = Math.min(100, Number(((usedBytes / quota) * 100).toFixed(1)));

  return {
    usedBytes,
    totalEstimatedQuotaBytes: quota,
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

  // 2. Optimize Cook Logs (strip redundant empty fields or excessive whitespace)
  try {
    const logs = loadCookLogs();
    const optimized = logs.map((log) => {
      const copy = { ...log };
      if (copy.photoUrls && copy.photoUrls.length === 0) delete copy.photoUrls;
      if (!copy.finishedNotes) delete (copy as any).finishedNotes;
      if (!copy.nextTimeNotes) delete (copy as any).nextTimeNotes;
      if (!copy.weatherConditions) delete copy.weatherConditions;
      return copy;
    });
    saveCookLogs(optimized);
  } catch (e) {}

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

export const INITIAL_VERIFIED_MEAT_CUTS: import('../types').VerifiedMeatCut[] = [
  {
    id: 'cut-120-brisket',
    name: 'Full Packer Brisket',
    aliases: ['Beef Brisket', 'Packer Cut', 'Whole Brisket'],
    proteinType: 'Beef',
    primalOrigin: 'Beef Breast / Anterior Ventral Subprimal',
    impsCode: 'IMPS 120 / 180',
    description: 'Consists of the flat (pectoralis profundus) and point (pectoralis superficialis) connected by a thick seam of hard fat (deckle).',
    visualKeyFeatures: ['Flat rectangular end with lean grain', 'Thick fat cap on top (1/4 inch)', 'Distinct deckle fat seam separating point and flat'],
    muscleAnatomy: 'M. Pectoralis Profundus & M. Pectoralis Superficialis',
    idealSmokeTempF: 225,
    targetInternalTempF: 203,
    cookingStrategy: 'Low & slow wood smoke. Option to wrap in peach butcher paper with tallow around 165°F stall. Probe-tender rest of 2+ hours.',
    verifiedStatus: 'Global Online Verified',
    onlineVerificationDate: new Date().toISOString(),
    onlineSourceCitations: ['USDA NAMP Meat Buyers Guide - IMPS 120', 'BBQ Pitmaster Standards Catalog'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cut-184d-picanha',
    name: 'Picanha / Coulotte',
    aliases: ['Top Sirloin Cap', 'Rump Cap', 'Coulotte Steak', 'Sirloin Cap'],
    proteinType: 'Beef',
    primalOrigin: 'Beef Loin / Top Sirloin Subprimal',
    impsCode: 'IMPS 184D',
    description: 'Triangular whole muscle cut from the top of the sirloin with a thick, iconic fat cap that renders during cooking.',
    visualKeyFeatures: ['Triangular slab profile', 'Thick uniform white fat cap (1/2 inch)', 'Coarse, pronounced grain direction running diagonally'],
    muscleAnatomy: 'M. Biceps Femoris',
    idealSmokeTempF: 225,
    targetInternalTempF: 132,
    cookingStrategy: 'Reverse sear on wood smoke to 125°F internal, then high-heat char or rotisserie skewer until fat cap renders crispy.',
    verifiedStatus: 'Global Online Verified',
    onlineVerificationDate: new Date().toISOString(),
    onlineSourceCitations: ['USDA NAMP Meat Buyers Guide - IMPS 184D', 'Churrasco Pitmaster Guild'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cut-406-pork-butt',
    name: 'Boston Pork Butt',
    aliases: ['Pork Shoulder', 'Boston Roast', 'Pork Butt'],
    proteinType: 'Pork',
    primalOrigin: 'Pork Shoulder Primal / Upper Blade',
    impsCode: 'IMPS 406',
    description: 'Upper portion of the pork shoulder containing the blade bone (scapula), heavily marbled with intramuscular fat and collagen.',
    visualKeyFeatures: ['Blocky rectangular mass', 'Intense intramuscular fat marbling', 'Blade bone exposed on one edge'],
    muscleAnatomy: 'M. Supraspinatus & M. Infraspinatus',
    idealSmokeTempF: 250,
    targetInternalTempF: 205,
    cookingStrategy: 'Heavy hickory/apple wood smoke. Wrap in foil/paper at 165°F with apple cider sauce until bone pulls clean.',
    verifiedStatus: 'Global Online Verified',
    onlineVerificationDate: new Date().toISOString(),
    onlineSourceCitations: ['USDA NAMP Meat Buyers Guide - IMPS 406'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cut-185d-tritip',
    name: 'Tri-Tip Roast',
    aliases: ['Santa Maria Cut', 'Triangle Roast', 'Bottom Sirloin Butt'],
    proteinType: 'Beef',
    primalOrigin: 'Beef Bottom Sirloin Subprimal',
    impsCode: 'IMPS 185D',
    description: 'A crescent/boomerang-shaped triangular roast with two distinct grain directions meeting in the corner.',
    visualKeyFeatures: ['Boomerang/triangle shape', 'Grain changes direction halfway through the roast', 'Lean with fine marbling'],
    muscleAnatomy: 'M. Tensor Fasciae Latae',
    idealSmokeTempF: 225,
    targetInternalTempF: 135,
    cookingStrategy: 'Oak smoke to 128°F internal, rest, then sear over red oak embers. Slice perpendicular to grain in two sections.',
    verifiedStatus: 'Global Online Verified',
    onlineVerificationDate: new Date().toISOString(),
    onlineSourceCitations: ['USDA NAMP Meat Buyers Guide - IMPS 185D', 'Santa Maria BBQ Society'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cut-116g-denver',
    name: 'Denver Cut / Chuck Flap',
    aliases: ['Underblade Steak', 'Chuck Flap Tail', 'Denver Steak'],
    proteinType: 'Beef',
    primalOrigin: 'Beef Chuck Subprimal / Underblade',
    impsCode: 'IMPS 116G',
    description: 'Extremely tender cut extracted from the chuck underblade, featuring intense Wagyu-like marbling.',
    visualKeyFeatures: ['Uniform flat rectangular slab', 'Fine spiderweb marbling throughout muscle', 'Parallel tender grain'],
    muscleAnatomy: 'M. Serratus Ventralis',
    idealSmokeTempF: 225,
    targetInternalTempF: 135,
    cookingStrategy: 'Light smoke finish or quick hot-and-fast sear. Slices like butter when cooked medium-rare.',
    verifiedStatus: 'Global Online Verified',
    onlineVerificationDate: new Date().toISOString(),
    onlineSourceCitations: ['USDA NAMP Meat Buyers Guide - IMPS 116G'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

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

  // 3. Purge temporary photo blobs & non-essential cached objects
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('temp_') || key.startsWith('cache_search_') || key.includes('_temp_blob'))) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {}

  // 4. Run storage compaction
  compactAndOptimizeStorage();

  const nowTs = Date.now();
  safeSetItem(KEYS.LAST_AUTO_CLEAR_TIMESTAMP, nowTs.toString());

  const afterStats = getStorageStats();
  const freedBytes = Math.max(0, initialBytes - afterStats.usedBytes);
  const freedFormatted = formatBytes(freedBytes);

  return {
    freedBytes,
    freedFormatted,
    message: `Cache cleared! Optimized ${freedFormatted} of mobile storage space. Core profile, custom smokers & cook logs preserved.`,
  };
}

export function checkAndRunAutoCacheClear(): { ran: boolean; message?: string } {
  const interval = getAutoClearInterval();
  if (interval === 'never') return { ran: false };

  let days = 30;
  if (interval === '7_days') days = 7;
  if (interval === '90_days') days = 90;

  const intervalMs = days * 24 * 60 * 60 * 1000;
  const lastTs = getLastAutoClearTimestamp();
  const now = Date.now();

  if (lastTs === 0) {
    // First run initialization
    safeSetItem(KEYS.LAST_AUTO_CLEAR_TIMESTAMP, now.toString());
    return { ran: false };
  }

  if (now - lastTs >= intervalMs) {
    const result = executeCacheClear();
    return {
      ran: true,
      message: `[Auto Storage Maintenance] ${result.message}`,
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
    version: '2.5.0',
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



