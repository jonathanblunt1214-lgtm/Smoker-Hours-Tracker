import { CookLog, SmokerProfile, FuelLog } from '../types';
import { getEffectiveSmokerSpecs, calculateGlobalBurnEfficiencyRate } from './smokerCalculations';
import { ALL_SMOKERS_DATABASE, findSmokerSpecInDatabase, ExtendedSmokerSpec } from '../data/smokerDatabases';

export interface SmokerManufacturerSpec {
  brandModel: string;
  category: string;
  smokerTypeKey: string;
  factoryBaselineBurnRateLbsHr: number; // At 225°F-250°F standard low & slow in 70°F ambient
  factoryHighHeatBurnRateLbsHr: number; // At 350°F+
  standardCapacityLbs: number;
  insulationType: string;
  thermalEfficiencyRating: 'Extreme' | 'High' | 'Standard' | 'Moderate';
  manufacturerNotes: string;
}

export const MANUFACTURER_DATABASE: SmokerManufacturerSpec[] = ALL_SMOKERS_DATABASE.map((s) => ({
  brandModel: s.brandModel,
  category: s.category,
  smokerTypeKey: s.smokerTypeKey,
  factoryBaselineBurnRateLbsHr: s.factoryBaselineBurnRateLbsHr,
  factoryHighHeatBurnRateLbsHr: s.factoryHighHeatBurnRateLbsHr,
  standardCapacityLbs: s.standardCapacityLbs,
  insulationType: s.insulationType,
  thermalEfficiencyRating: s.thermalEfficiencyRating,
  manufacturerNotes: s.manufacturerNotes,
}));

/**
 * Intelligent lookup function matching smoker name / model / type input string to manufacturer specification specs.
 */
export function getManufacturerSpecs(
  smokerName: string,
  smokerModel: string,
  smokerType: string
): SmokerManufacturerSpec {
  const matched = findSmokerSpecInDatabase(smokerName, smokerModel, smokerType);
  return {
    brandModel: matched.brandModel,
    category: matched.category,
    smokerTypeKey: matched.smokerTypeKey,
    factoryBaselineBurnRateLbsHr: matched.factoryBaselineBurnRateLbsHr,
    factoryHighHeatBurnRateLbsHr: matched.factoryHighHeatBurnRateLbsHr,
    standardCapacityLbs: matched.standardCapacityLbs,
    insulationType: matched.insulationType,
    thermalEfficiencyRating: matched.thermalEfficiencyRating,
    manufacturerNotes: matched.manufacturerNotes,
  };
}

export interface BurnEfficiencyResult {
  mfrSpec: SmokerManufacturerSpec;
  actualBurnRateLbsHr: number;
  factoryBaselineBurnRateLbsHr: number;
  weatherAdjustedBaselineBurnRateLbsHr: number;
  efficiencyPercentage: number; // e.g. 108% (8% more efficient than factory rating)
  varianceLbsHr: number; // Actual - Factory Baseline
  avgAmbientTempF: number;
  efficiencyGrade: 'S+' | 'A+' | 'A' | 'B' | 'C';
  efficiencyStatusLabel: string;
  efficiencySummary: string;
  weatherImpactNotes: string;
}

/**
 * Calculates complete burn efficiency synchronized to manufacturer baseline data.
 */
export function calculateBurnEfficiencySync(
  profile: SmokerProfile,
  cookLogs: CookLog[]
): BurnEfficiencyResult {
  const mfrSpec = getManufacturerSpecs(profile.name, profile.model, profile.smokerType || '');
  const effectiveSpecs = getEffectiveSmokerSpecs(profile);

  // Calculate actual user burn rate from logged cooks (published or local draft)
  const validCooks = cookLogs.filter((c) => c.hoursLogged > 0 && c.fuelLbsConsumed > 0);
  const totalHours = validCooks.reduce((sum, c) => sum + c.hoursLogged, 0);
  const totalFuelLbs = validCooks.reduce((sum, c) => sum + c.fuelLbsConsumed, 0);

  const actualBurnRateLbsHr = totalHours > 0 ? totalFuelLbs / totalHours : effectiveSpecs.baselineBurnRateLbsHr;

  // Average outdoor ambient temp across logged cooks
  const ambientTemps: number[] = [];
  cookLogs.forEach((cook) => {
    cook.temperatureReadings?.forEach((r) => {
      if (r.ambientTemp) ambientTemps.push(r.ambientTemp);
    });
  });

  const avgAmbientTempF = ambientTemps.length > 0
    ? Math.round(ambientTemps.reduce((a, b) => a + b, 0) / ambientTemps.length)
    : 72;

  // Factory baseline assumes ~72°F ambient. Cold ambient requires more fuel BTUs.
  // Temperature adjustment factor: +1% fuel demand per 3°F drop below 70°F
  let weatherFactor = 1.0;
  if (avgAmbientTempF < 70) {
    const tempDrop = 70 - avgAmbientTempF;
    weatherFactor += (tempDrop * 0.005); // e.g., 40°F drop -> +20% fuel expected
  } else if (avgAmbientTempF > 85) {
    const tempRise = avgAmbientTempF - 85;
    weatherFactor -= Math.min(0.10, tempRise * 0.003); // Warm ambient reduces fuel demand slightly
  }

  const factoryBaselineBurnRateLbsHr = effectiveSpecs.baselineBurnRateLbsHr;
  const weatherAdjustedBaselineBurnRateLbsHr = Number((factoryBaselineBurnRateLbsHr * weatherFactor).toFixed(2));

  // Efficiency % = (Weather Adjusted Baseline / Actual Burn Rate) * 100
  // Higher percentage = burning LESS fuel than expected (higher efficiency)
  const efficiencyPercentage = Math.round((weatherAdjustedBaselineBurnRateLbsHr / actualBurnRateLbsHr) * 100);
  const varianceLbsHr = Number((actualBurnRateLbsHr - factoryBaselineBurnRateLbsHr).toFixed(2));

  // Determine Grade & Label
  let efficiencyGrade: 'S+' | 'A+' | 'A' | 'B' | 'C' = 'A';
  let efficiencyStatusLabel = 'Factory Optimum';
  let efficiencySummary = '';

  if (efficiencyPercentage >= 115) {
    efficiencyGrade = 'S+';
    efficiencyStatusLabel = 'Peak Thermal Retention';
    efficiencySummary = `Operating ${efficiencyPercentage - 100}% more fuel-efficient than factory testing standards. Superior chamber sealing & heat retention!`;
  } else if (efficiencyPercentage >= 100) {
    efficiencyGrade = 'A+';
    efficiencyStatusLabel = 'Above Manufacturer Spec';
    efficiencySummary = `Consuming fuel ${efficiencyPercentage - 100}% below typical manufacturer baseline specs under current operating conditions.`;
  } else if (efficiencyPercentage >= 88) {
    efficiencyGrade = 'A';
    efficiencyStatusLabel = 'Matched to Manufacturer Spec';
    efficiencySummary = `Fuel consumption aligns tightly with factory baseline metrics (${actualBurnRateLbsHr.toFixed(2)} lbs/hr vs spec ${factoryBaselineBurnRateLbsHr.toFixed(2)} lbs/hr).`;
  } else if (efficiencyPercentage >= 75) {
    efficiencyGrade = 'B';
    efficiencyStatusLabel = 'Moderate Fuel Variance';
    efficiencySummary = `Burning ~${Math.abs(varianceLbsHr)} lbs/hr more fuel than factory baseline specs, likely due to lid openings, high set temps, or wind exposure.`;
  } else {
    efficiencyGrade = 'C';
    efficiencyStatusLabel = 'High Consumption Alert';
    efficiencySummary = `Fuel burn rate is ${100 - efficiencyPercentage}% higher than manufacturer specs. Inspect door gasket seals and hopper feeding consistency.`;
  }

  let weatherImpactNotes = '';
  if (avgAmbientTempF < 55) {
    weatherImpactNotes = `Outdoor ambient average of ${avgAmbientTempF}°F increases baseline fuel demand by ~${Math.round((weatherFactor - 1) * 100)}% to offset chamber heat loss.`;
  } else if (avgAmbientTempF > 85) {
    weatherImpactNotes = `Warm ambient weather (${avgAmbientTempF}°F) improves natural heat retention, reducing baseline auger load.`;
  } else {
    weatherImpactNotes = `Ambient weather conditions (${avgAmbientTempF}°F) match standard manufacturer factory testing environments (70°F-75°F).`;
  }

  return {
    mfrSpec,
    actualBurnRateLbsHr: Number(actualBurnRateLbsHr.toFixed(2)),
    factoryBaselineBurnRateLbsHr,
    weatherAdjustedBaselineBurnRateLbsHr,
    efficiencyPercentage,
    varianceLbsHr,
    avgAmbientTempF,
    efficiencyGrade,
    efficiencyStatusLabel,
    efficiencySummary,
    weatherImpactNotes,
  };
}

export interface RefillPelletUsageResult {
  hoursSinceRefill: number;
  burnRateLbsHr: number; // manufacturer synced baseline burn rate
  effectiveBurnRateLbsHr: number; // weather adjusted mfr burn rate
  pelletUsageLbs: number; // hoursSinceRefill * effectiveBurnRateLbsHr
  hopperCapacityLbs: number;
  remainingPelletsLbs: number;
  hopperPercentFull: number;
  hoursUntilEmpty: number;
  isLowPelletWarning: boolean;
  brandModel: string;
  totalRestockedLbs: number;
  totalConsumedLbs: number;
  inventoryLbsOnHand: number;
  latestFuelRestockDate: string | null;
  cooksCountSinceRestock: number;
  isAutoCalculatedFromInventory: boolean;
}

/**
 * Calculates estimated pellet usage and remaining hopper fuel based on:
 * 1. Manufacturer-synced burn rate metric (lbs/hr)
 * 2. Hours elapsed automatically derived from Wood Pellets & Fuel Inventory restock dates and logged cook hours
 */
export function calculateRefillPelletUsage(
  profile: SmokerProfile,
  cookLogs: CookLog[],
  fuelLogs: FuelLog[] = [],
  overrideHoursSinceRefill?: number,
  warningThresholdPercent: number = 20
): RefillPelletUsageResult {
  const isUnassigned = !profile || !profile.name || profile.name.trim() === '' || profile.name === 'None Selected' || profile.name.includes('Unassigned Smoker');
  const burnSync = calculateBurnEfficiencySync(profile, cookLogs);
  const mfrBurnRate = isUnassigned ? 0 : (burnSync.weatherAdjustedBaselineBurnRateLbsHr || burnSync.factoryBaselineBurnRateLbsHr || 1.0);
  const hopperCapacityLbs = isUnassigned ? 0 : (burnSync.mfrSpec?.standardCapacityLbs || profile.pelletHopperCapacityLbs || 0);

  // Fuel Inventory Calculations
  const rawRestockedLbs = fuelLogs.reduce((sum, f) => sum + (f.quantityLbs || 0), 0);
  const totalRestockedLbs = Number((rawRestockedLbs > 0 ? rawRestockedLbs : hopperCapacityLbs).toFixed(1));
  const totalConsumedLbs = Number(cookLogs.reduce((sum, c) => sum + (c.fuelLbsConsumed || 0), 0).toFixed(1));
  const inventoryLbsOnHand = Math.max(0, Number((totalRestockedLbs - totalConsumedLbs).toFixed(1)));

  // Determine latest fuel restock log (if available)
  let latestFuelRestockDate: string | null = null;
  if (fuelLogs.length > 0) {
    const sortedFuelLogs = [...fuelLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    latestFuelRestockDate = sortedFuelLogs[0].date;
  }

  // Calculate hours since refill automatically
  let hoursSinceRefill: number;
  let cooksCountSinceRestock = 0;
  let isAutoCalculatedFromInventory = false;

  if (overrideHoursSinceRefill !== undefined && overrideHoursSinceRefill !== null) {
    hoursSinceRefill = Math.max(0, overrideHoursSinceRefill);
  } else if (latestFuelRestockDate && cookLogs.length > 0) {
    // Filter cooks on or after the latest fuel inventory restock date
    const cooksPostRestock = cookLogs.filter((c) => c.date >= (latestFuelRestockDate as string));
    cooksCountSinceRestock = cooksPostRestock.length;
    const hoursFromPostRestockCooks = cooksPostRestock.reduce((sum, c) => sum + (c.hoursLogged || 0), 0);

    if (cooksCountSinceRestock > 0 && hoursFromPostRestockCooks > 0) {
      hoursSinceRefill = Number(hoursFromPostRestockCooks.toFixed(2));
      isAutoCalculatedFromInventory = true;
    } else {
      const lastRefill = profile.lastRefillHours !== undefined ? profile.lastRefillHours : (profile.currentHours - 10);
      hoursSinceRefill = Math.max(0, Number((profile.currentHours - lastRefill).toFixed(2)));
    }
  } else {
    const lastRefill = profile.lastRefillHours !== undefined ? profile.lastRefillHours : (profile.currentHours - 10);
    hoursSinceRefill = Math.max(0, Number((profile.currentHours - lastRefill).toFixed(2)));
  }

  const pelletUsageLbs = Number((hoursSinceRefill * mfrBurnRate).toFixed(2));
  const remainingPelletsLbs = hopperCapacityLbs > 0 ? Math.max(0, Number((hopperCapacityLbs - pelletUsageLbs).toFixed(2))) : 0;
  const hopperPercentFull = hopperCapacityLbs > 0 ? Math.max(0, Math.min(100, Math.round((remainingPelletsLbs / hopperCapacityLbs) * 100))) : 0;
  const hoursUntilEmpty = mfrBurnRate > 0 ? Number((remainingPelletsLbs / mfrBurnRate).toFixed(1)) : 0;
  const isLowPelletWarning = hopperCapacityLbs > 0 && hopperPercentFull <= warningThresholdPercent;

  return {
    hoursSinceRefill,
    burnRateLbsHr: burnSync.factoryBaselineBurnRateLbsHr,
    effectiveBurnRateLbsHr: mfrBurnRate,
    pelletUsageLbs,
    hopperCapacityLbs,
    remainingPelletsLbs,
    hopperPercentFull,
    hoursUntilEmpty,
    isLowPelletWarning,
    brandModel: burnSync.mfrSpec.brandModel,
    totalRestockedLbs,
    totalConsumedLbs,
    inventoryLbsOnHand,
    latestFuelRestockDate,
    cooksCountSinceRestock,
    isAutoCalculatedFromInventory,
  };
}
