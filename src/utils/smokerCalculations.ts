import { SmokerProfile, CookLog, CustomSmokerSpec, ManufacturerSmokerSpec, SmokerModItem } from '../types';
import { KNOWN_SMOKER_MODS } from '../data/smokerModsDatabase';
import { calculateBlendPhysics } from './fuelBlendPhysics';

export interface EffectiveSmokerSpecs {
  displayName: string;
  brandOrBuilder: string;
  modelOrType: string;
  category: string;
  fuelType: 'Pellets' | 'Charcoal' | 'Wood Splits' | 'Electric' | 'Gas';
  baselineBurnRateLbsHr: number; // lbs/hr at 225°F (with mods & fuel blend applied)
  highHeatBurnRateLbsHr: number; // lbs/hr at 350°F (with mods & fuel blend applied)
  unmodifiedBaselineBurnRateLbsHr: number;
  unmodifiedHighHeatBurnRateLbsHr: number;
  hopperCapacityLbs: number; // (with mods applied)
  unmodifiedHopperCapacityLbs: number;
  cookingAreaSqIn: number; // (with mods applied)
  unmodifiedCookingAreaSqIn: number;
  thermalEfficiencyRating: 'Extreme' | 'High' | 'Standard' | 'Moderate';
  thermalEfficiencyMultiplier: number;
  unmodifiedThermalEfficiencyMultiplier: number;
  metalGaugeOrInsulation: string;
  draftOrController: string;
  isCustom: boolean;
  isVerifiedMfg: boolean;
  // Mod metrics
  activeModsCount: number;
  activeModItems: SmokerModItem[];
  modBurnRateMultiplier: number;
  fuelSavingsPercent: number;
  tempStabilityVarianceDegrees: number;
  tempStabilitySummary: string;
  heatLossReductionPct: number;
  // Fuel blend impact metrics
  activeFuelBlendName?: string;
  activeFuelBlendBtuPerLb?: number;
  activeFuelBlendEfficiencyRating?: number;
  blendBurnRateMultiplier?: number;
  // Global Fuel Burn & Thermal Efficiency Rates
  globalFuelBurnRateLbsHr: number;
  globalThermalEfficiencyRate: number;
  globalBurnEfficiencyPercent: number;
  globalBurnEfficiencyGrade: 'S+' | 'A+' | 'A' | 'B' | 'C';
  globalBurnEfficiencyStatus: string;
  globalBurnEfficiencySummary: string;
}

/**
 * Extracts and returns all enabled SmokerModItem objects for a profile.
 */
export function getActiveModItemsForProfile(profile?: SmokerProfile | null): SmokerModItem[] {
  if (!profile) return [];

  const activeIds = new Set<string>();

  if (profile.appliedMods) {
    profile.appliedMods.filter((m) => m.enabled).forEach((m) => activeIds.add(m.modId));
  }
  if (profile.appliedModIds) {
    profile.appliedModIds.forEach((id) => activeIds.add(id));
  }

  if (profile.isCustomBuilt && profile.customSpecs) {
    if (profile.customSpecs.appliedMods) {
      profile.customSpecs.appliedMods.filter((m) => m.enabled).forEach((m) => activeIds.add(m.modId));
    }
    if (profile.customSpecs.appliedModIds) {
      profile.customSpecs.appliedModIds.forEach((id) => activeIds.add(id));
    }
  }

  if (!profile.isCustomBuilt && profile.manufacturerSpecs) {
    if (profile.manufacturerSpecs.appliedMods) {
      profile.manufacturerSpecs.appliedMods.filter((m) => m.enabled).forEach((m) => activeIds.add(m.modId));
    }
    if (profile.manufacturerSpecs.appliedModIds) {
      profile.manufacturerSpecs.appliedModIds.forEach((id) => activeIds.add(id));
    }
  }

  return KNOWN_SMOKER_MODS.filter((m) => activeIds.has(m.id));
}

/**
 * Calculates and returns the global effective smoker specs based on the active SmokerProfile and any enabled modifications.
 */
export function getEffectiveSmokerSpecs(profile?: SmokerProfile | null): EffectiveSmokerSpecs {
  const activeMods = getActiveModItemsForProfile(profile);

  let modBurnMultiplier = 1.0;
  let modEfficiencyBoost = 0.0;
  let modCapacityAdd = 0;
  let modCookingAreaAdd = 0;
  let modTempStabilityDelta = 0;
  let modHeatLossReduction = 0;

  activeMods.forEach((mod) => {
    modBurnMultiplier *= mod.burnRateMultiplier || 1.0;
    modEfficiencyBoost += mod.thermalEfficiencyBoost || 0;
    modCapacityAdd += mod.capacityAddLbs || 0;
    modCookingAreaAdd += mod.cookingAreaAddSqIn || 0;
    modTempStabilityDelta += mod.tempStabilityDeltaDegrees || 0;
    modHeatLossReduction += mod.heatLossReductionPct || 0;
  });

  const fuelSavingsPercent = Math.max(0, Math.round((1 - modBurnMultiplier) * 100));
  const heatLossReductionPct = Math.min(75, Math.round(modHeatLossReduction));

  let baseDisplayName = 'Standard Pit';
  let baseBrandOrBuilder = 'Generic Manufacturer';
  let baseModelOrType = 'Pellet Smoker / Grill';
  let baseCategory = 'Pellet Smoker / Grill';
  let baseFuelType: 'Pellets' | 'Charcoal' | 'Wood Splits' | 'Electric' | 'Gas' = 'Pellets';
  let baseBurnRate = 1.20;
  let baseHighHeatBurnRate = 2.50;
  let baseHopperCapacity = 20;
  let baseCookingArea = 800;
  let baseThermalRating: 'Extreme' | 'High' | 'Standard' | 'Moderate' = 'High';
  let baseThermalMultiplier = 1.0;
  let baseMetalGaugeOrInsulation = 'Double-Wall Insulated Steel';
  let baseDraftOrController = 'PID Wi-Fi Controller';
  let isCustom = false;
  let isVerifiedMfg = false;

  if (profile) {
    if (profile.isCustomBuilt && profile.customSpecs) {
      const spec = profile.customSpecs;
      baseDisplayName = spec.name;
      baseBrandOrBuilder = spec.builderName || 'Custom Built';
      baseModelOrType = spec.smokerType || 'Custom Smoker';
      baseCategory = spec.smokerType || 'Custom Smoker';
      baseFuelType = spec.fuelType || 'Wood Splits';
      baseBurnRate = spec.baselineBurnRateLbsHr || 1.25;
      baseHighHeatBurnRate = Number((spec.baselineBurnRateLbsHr * 2.0).toFixed(2)) || 2.50;
      baseHopperCapacity = spec.hopperCapacityLbs || profile.pelletHopperCapacityLbs || 30;
      baseCookingArea = spec.chamberVolumeSqIn || 1200;
      baseThermalRating = 'High';
      baseThermalMultiplier = 1.05;
      baseMetalGaugeOrInsulation = spec.metalGauge || 'Heavy Steel Plate';
      baseDraftOrController = spec.draftType || 'Reverse Flow Airflow';
      isCustom = true;
      isVerifiedMfg = false;
    } else if (profile.manufacturerSpecs) {
      const spec = profile.manufacturerSpecs;
      const ratingMap: Record<string, number> = {
        Extreme: 1.20,
        High: 1.10,
        Standard: 1.00,
        Moderate: 0.85,
      };
      baseDisplayName = `${spec.brand} ${spec.model}`;
      baseBrandOrBuilder = spec.brand;
      baseModelOrType = spec.model;
      baseCategory = spec.category || 'Manufacturer Smoker';
      baseFuelType = spec.fuelType || profile.fuelType || 'Pellets';
      baseBurnRate = spec.factoryBaselineBurnRateLbsHr || 1.20;
      baseHighHeatBurnRate = spec.factoryHighHeatBurnRateLbsHr || 2.50;
      baseHopperCapacity = spec.hopperCapacityLbs || profile.pelletHopperCapacityLbs || 22;
      baseCookingArea = spec.cookingAreaSqIn || 850;
      baseThermalRating = spec.thermalEfficiencyRating || 'High';
      baseThermalMultiplier = ratingMap[spec.thermalEfficiencyRating] || 1.0;
      baseMetalGaugeOrInsulation = spec.insulationType || 'Double-Wall Insulated Steel';
      baseDraftOrController = spec.controllerType || 'Digital Controller';
      isCustom = false;
      isVerifiedMfg = !!spec.isVerifiedManufacturerData;
    } else {
      baseDisplayName = profile.name || 'Active Smoker';
      baseBrandOrBuilder = profile.name || 'Pit Brand';
      baseModelOrType = profile.model || profile.smokerType || 'Smoker';
      baseCategory = profile.smokerType || 'Vertical Pellet Smoker';
      baseFuelType = profile.fuelType || 'Pellets';
      baseHopperCapacity = profile.pelletHopperCapacityLbs || 20;
      isCustom = false;
      isVerifiedMfg = false;
    }
  }

  // Fuel Blend Physics Impact
  let blendBurnRateMultiplier = 1.0;
  let blendThermalMultiplier = 1.0;
  let activeFuelBlendName: string | undefined = undefined;
  let activeFuelBlendBtuPerLb: number | undefined = undefined;
  let activeFuelBlendEfficiencyRating: number | undefined = undefined;

  if (profile?.activeBlendComponents && profile.activeBlendComponents.length > 0) {
    const physics = calculateBlendPhysics(profile.activeBlendComponents);
    activeFuelBlendName = profile.fuelOnHand || 'Custom Wood Blend';
    activeFuelBlendBtuPerLb = physics.weightedBtuPerLb;
    activeFuelBlendEfficiencyRating = physics.calculatedEfficiencyRating;

    // Standard baseline pellet fuel is ~8,500 BTU/lb and 90.0% efficiency
    // Higher BTU fuel (e.g. 10,200 BTU charcoal pellets) burns less mass per hour
    blendBurnRateMultiplier = Number((physics.estimatedLbsPerHourAt225F / 1.18).toFixed(3));
    blendThermalMultiplier = Number((physics.calculatedEfficiencyRating / 90.0).toFixed(3));
  }

  // Calculate modded & fuel-blend effective values
  const effectiveBaselineBurnRate = Number((baseBurnRate * modBurnMultiplier * blendBurnRateMultiplier).toFixed(2));
  const effectiveHighHeatBurnRate = Number((baseHighHeatBurnRate * modBurnMultiplier * blendBurnRateMultiplier).toFixed(2));
  const effectiveHopperCapacity = baseHopperCapacity + modCapacityAdd;
  const effectiveCookingArea = baseCookingArea + modCookingAreaAdd;
  const effectiveThermalMultiplier = Number(((baseThermalMultiplier + modEfficiencyBoost) * blendThermalMultiplier).toFixed(2));

  // Determine temperature stability rating
  const unmoddedVariance = isCustom ? 18 : 12;
  const moddedVariance = Math.max(2, unmoddedVariance - modTempStabilityDelta);
  let tempStabilitySummary = `±${moddedVariance}°F Pit Temp Stability`;
  if (activeMods.length > 0) {
    tempStabilitySummary += ` (${fuelSavingsPercent}% fuel saved via ${activeMods.length} mod${activeMods.length > 1 ? 's' : ''})`;
  }

  // Global Fuel Burn & Thermal Efficiency Rate Calculations
  const rawEfficiency = (baseBurnRate / (effectiveBaselineBurnRate || 0.01)) * effectiveThermalMultiplier * 100;
  const globalBurnEfficiencyPercent = Math.min(150, Math.max(60, Math.round(rawEfficiency)));

  let globalBurnEfficiencyGrade: 'S+' | 'A+' | 'A' | 'B' | 'C' = 'A';
  let globalBurnEfficiencyStatus = 'Factory Optimum';
  if (globalBurnEfficiencyPercent >= 115) {
    globalBurnEfficiencyGrade = 'S+';
    globalBurnEfficiencyStatus = 'Peak Thermal Retention';
  } else if (globalBurnEfficiencyPercent >= 100) {
    globalBurnEfficiencyGrade = 'A+';
    globalBurnEfficiencyStatus = 'Above Spec Efficiency';
  } else if (globalBurnEfficiencyPercent >= 88) {
    globalBurnEfficiencyGrade = 'A';
    globalBurnEfficiencyStatus = 'Matched Spec Efficiency';
  } else if (globalBurnEfficiencyPercent >= 75) {
    globalBurnEfficiencyGrade = 'B';
    globalBurnEfficiencyStatus = 'Moderate Burn Rate';
  } else {
    globalBurnEfficiencyGrade = 'C';
    globalBurnEfficiencyStatus = 'High Consumption Alert';
  }

  let globalBurnEfficiencySummary = `${globalBurnEfficiencyPercent}% Global Burn Efficiency Rate (${effectiveBaselineBurnRate.toFixed(2)} lbs/hr baseline, ${effectiveThermalMultiplier.toFixed(2)}x thermal retention rating)`;
  if (activeFuelBlendName) {
    globalBurnEfficiencySummary += ` • Fuel: ${activeFuelBlendName} (${activeFuelBlendBtuPerLb} BTU/lb, ${activeFuelBlendEfficiencyRating}% blend efficiency)`;
  }

  return {
    displayName: activeMods.length > 0 ? `${baseDisplayName} (Modded)` : baseDisplayName,
    brandOrBuilder: baseBrandOrBuilder,
    modelOrType: baseModelOrType,
    category: baseCategory,
    fuelType: baseFuelType,
    baselineBurnRateLbsHr: effectiveBaselineBurnRate,
    highHeatBurnRateLbsHr: effectiveHighHeatBurnRate,
    unmodifiedBaselineBurnRateLbsHr: baseBurnRate,
    unmodifiedHighHeatBurnRateLbsHr: baseHighHeatBurnRate,
    hopperCapacityLbs: effectiveHopperCapacity,
    unmodifiedHopperCapacityLbs: baseHopperCapacity,
    cookingAreaSqIn: effectiveCookingArea,
    unmodifiedCookingAreaSqIn: baseCookingArea,
    thermalEfficiencyRating: baseThermalRating,
    thermalEfficiencyMultiplier: effectiveThermalMultiplier,
    unmodifiedThermalEfficiencyMultiplier: baseThermalMultiplier,
    metalGaugeOrInsulation: baseMetalGaugeOrInsulation,
    draftOrController: baseDraftOrController,
    isCustom,
    isVerifiedMfg,
    // Mod metrics
    activeModsCount: activeMods.length,
    activeModItems: activeMods,
    modBurnRateMultiplier: modBurnMultiplier,
    fuelSavingsPercent,
    tempStabilityVarianceDegrees: moddedVariance,
    tempStabilitySummary,
    heatLossReductionPct,
    // Fuel blend metrics
    activeFuelBlendName,
    activeFuelBlendBtuPerLb,
    activeFuelBlendEfficiencyRating,
    blendBurnRateMultiplier,
    // Global Fuel Burn & Thermal Efficiency Rates
    globalFuelBurnRateLbsHr: effectiveBaselineBurnRate,
    globalThermalEfficiencyRate: effectiveThermalMultiplier,
    globalBurnEfficiencyPercent,
    globalBurnEfficiencyGrade,
    globalBurnEfficiencyStatus,
    globalBurnEfficiencySummary,
  };
}

/**
 * Global helper function to calculate dynamic global burn efficiency rate with optional cook logs.
 */
export function calculateGlobalBurnEfficiencyRate(
  profile?: SmokerProfile | null,
  cookLogs?: CookLog[]
) {
  const specs = getEffectiveSmokerSpecs(profile);

  let actualRate = specs.baselineBurnRateLbsHr;
  if (cookLogs && cookLogs.length > 0) {
    const valid = cookLogs.filter((c) => c.hoursLogged > 0 && c.fuelLbsConsumed > 0);
    const totalHours = valid.reduce((acc, c) => acc + c.hoursLogged, 0);
    const totalFuel = valid.reduce((acc, c) => acc + c.fuelLbsConsumed, 0);
    if (totalHours > 0) {
      actualRate = Number((totalFuel / totalHours).toFixed(2));
    }
  }

  const efficiencyPercent = Math.round((specs.unmodifiedBaselineBurnRateLbsHr / (actualRate || 0.01)) * specs.thermalEfficiencyMultiplier * 100);

  return {
    globalFuelBurnRateLbsHr: actualRate,
    globalThermalEfficiencyRate: specs.thermalEfficiencyMultiplier,
    globalBurnEfficiencyPercent: efficiencyPercent,
    globalBurnEfficiencyGrade: specs.globalBurnEfficiencyGrade,
    globalBurnEfficiencyStatus: specs.globalBurnEfficiencyStatus,
    globalBurnEfficiencySummary: `${efficiencyPercent}% Burn Efficiency Rate (${actualRate.toFixed(2)} lbs/hr fuel demand)`,
  };
}

/**
 * Calculates estimated cook runtime (hours) from available fuel using the active smoker specs.
 */
export function calculateRunTimeHoursFromFuel(
  fuelLbs: number,
  cookTempF: number = 225,
  profile?: SmokerProfile | null
): number {
  const specs = getEffectiveSmokerSpecs(profile);
  let burnRate = specs.baselineBurnRateLbsHr;
  if (cookTempF > 225) {
    const tempRatio = Math.min(2.5, (cookTempF - 225) / 125);
    burnRate = specs.baselineBurnRateLbsHr + tempRatio * (specs.highHeatBurnRateLbsHr - specs.baselineBurnRateLbsHr);
  }
  burnRate = burnRate / (specs.thermalEfficiencyMultiplier || 1.0);
  if (burnRate <= 0) burnRate = 1.0;

  return Number((fuelLbs / burnRate).toFixed(2));
}

/**
 * Calculates estimated fuel consumption (lbs) for a cook duration using the active smoker specs.
 */
export function calculateFuelConsumptionLbs(
  durationHours: number,
  cookTempF: number = 225,
  profile?: SmokerProfile | null
): number {
  const specs = getEffectiveSmokerSpecs(profile);
  let burnRate = specs.baselineBurnRateLbsHr;
  if (cookTempF > 225) {
    const tempRatio = Math.min(2.5, (cookTempF - 225) / 125);
    burnRate = specs.baselineBurnRateLbsHr + tempRatio * (specs.highHeatBurnRateLbsHr - specs.baselineBurnRateLbsHr);
  }
  burnRate = burnRate / (specs.thermalEfficiencyMultiplier || 1.0);

  return Number((durationHours * burnRate).toFixed(2));
}
