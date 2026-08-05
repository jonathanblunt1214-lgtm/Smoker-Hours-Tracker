import { SmokerProfile, CookLog, FuelLog } from '../types';
import { INITIAL_SMOKER_PROFILE, INITIAL_COOK_LOGS, INITIAL_FUEL_LOGS } from '../data/mockData';

const KEYS = {
  PROFILE: 'smoker_app_profile_v1',
  COOK_LOGS: 'smoker_app_cook_logs_v1',
  FUEL_LOGS: 'smoker_app_fuel_logs_v1',
};

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
  try {
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save smoker profile', e);
  }
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
  try {
    localStorage.setItem(KEYS.COOK_LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save cook logs', e);
  }
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
  try {
    localStorage.setItem(KEYS.FUEL_LOGS, JSON.stringify(fuel));
  } catch (e) {
    console.error('Failed to save fuel logs', e);
  }
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
