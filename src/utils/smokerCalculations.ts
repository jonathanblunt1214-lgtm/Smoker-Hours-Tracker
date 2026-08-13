import { SmokerProfile, CookLog, FuelLog, CustomSmokerSpec, ManufacturerSmokerSpec, SmokerModItem } from '../types';
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
  bowlCapacityLbs: number;
  unmodifiedBowlCapacityLbs: number;
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

  const isProfileUnassigned = !profile?.name || profile.name.trim() === '' || profile.name === 'None Selected';

  let baseDisplayName = isProfileUnassigned ? 'None Selected' : (profile?.name || '');
  let baseBrandOrBuilder = isProfileUnassigned ? '' : (profile?.model || profile?.name || '');
  let baseModelOrType = isProfileUnassigned ? '' : (profile?.model || profile?.smokerType || '');
  let baseCategory = isProfileUnassigned ? '' : (profile?.smokerType || '');
  let baseFuelType: 'Pellets' | 'Charcoal' | 'Wood Splits' | 'Electric' | 'Gas' = profile?.fuelType || 'Pellets';
  let baseBurnRate = isProfileUnassigned ? 0 : 1.20;
  let baseHighHeatBurnRate = isProfileUnassigned ? 0 : 2.50;
  let baseHopperCapacity = profile?.pelletHopperCapacityLbs || 0;
  let baseBowlCapacity = profile?.bowlCapacityLbs || 0;
  let baseCookingArea = isProfileUnassigned ? 0 : 800;
  let baseThermalRating: 'Extreme' | 'High' | 'Standard' | 'Moderate' = 'Standard';
  let baseThermalMultiplier = 1.0;
  let baseMetalGaugeOrInsulation = isProfileUnassigned ? '' : 'Double-Wall Insulated Steel';
  let baseDraftOrController = isProfileUnassigned ? '' : 'PID Wi-Fi Controller';
  let isCustom = false;
  let isVerifiedMfg = false;

  if (profile && !isProfileUnassigned) {
    if (profile.isCustomBuilt && profile.customSpecs) {
      const spec = profile.customSpecs;
      baseDisplayName = spec.name || 'Custom Rig';
      baseBrandOrBuilder = spec.builderName || 'Custom Built';
      baseModelOrType = spec.smokerType || 'Custom Smoker';
      baseCategory = spec.smokerType || 'Custom Smoker';
      baseFuelType = spec.fuelType || 'Wood Splits';
      baseBurnRate = spec.baselineBurnRateLbsHr || 1.25;
      baseHighHeatBurnRate = Number((spec.baselineBurnRateLbsHr * 2.0).toFixed(2)) || 2.50;
      baseHopperCapacity = spec.hopperCapacityLbs ?? profile.pelletHopperCapacityLbs ?? 0;
      baseBowlCapacity = spec.bowlCapacityLbs ?? profile.bowlCapacityLbs ?? 0;
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
      baseDisplayName = `${spec.brand} ${spec.model}`.trim() || 'Manufacturer Rig';
      baseBrandOrBuilder = spec.brand;
      baseModelOrType = spec.model;
      baseCategory = spec.category || 'Manufacturer Smoker';
      baseFuelType = spec.fuelType || profile.fuelType || 'Pellets';
      baseBurnRate = spec.factoryBaselineBurnRateLbsHr || 1.20;
      baseHighHeatBurnRate = spec.factoryHighHeatBurnRateLbsHr || 2.50;
      baseHopperCapacity = spec.hopperCapacityLbs ?? profile.pelletHopperCapacityLbs ?? 0;
      baseBowlCapacity = spec.bowlCapacityLbs ?? profile.bowlCapacityLbs ?? 0;
      baseCookingArea = spec.cookingAreaSqIn || 850;
      baseThermalRating = spec.thermalEfficiencyRating || 'High';
      baseThermalMultiplier = ratingMap[spec.thermalEfficiencyRating] || 1.0;
      baseMetalGaugeOrInsulation = spec.insulationType || 'Double-Wall Insulated Steel';
      baseDraftOrController = spec.controllerType || 'Digital Controller';
      isCustom = false;
      isVerifiedMfg = !!spec.isVerifiedManufacturerData;
    } else {
      baseDisplayName = profile.name || 'Unassigned Rig';
      baseBrandOrBuilder = profile.name || 'Pit Brand';
      baseModelOrType = profile.model || profile.smokerType || 'Smoker';
      baseCategory = profile.smokerType || 'Vertical Pellet Smoker';
      baseFuelType = profile.fuelType || 'Pellets';
      baseHopperCapacity = profile.pelletHopperCapacityLbs || 0;
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
    activeFuelBlendName = profile.activeFuelName || (profile.fuelOnHand && !/^\d/.test(profile.fuelOnHand.trim()) ? profile.fuelOnHand : 'Custom Wood Blend');
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
    bowlCapacityLbs: baseBowlCapacity,
    unmodifiedBowlCapacityLbs: baseBowlCapacity,
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
    const valid = cookLogs.filter((c) => c.hoursLogged > 0 && c.fuelLbsConsumed > 0 && c.isPublishedToTotalHours === true);
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

export interface DetailedFuelTelemetry {
  fuelTypeKey: 'Wood Splits' | 'Gas' | 'Pellets' | 'Charcoal' | 'Electric';
  fuelTypeDisplayName: string;
  burnRateLbsHr: number;
  // Common metrics
  totalConsumedLbs: number;
  inventoryLbsOnHand: number;
  hoursUntilEmpty: number;
  costPerHour225F: number;
  // Propane / Gas specific
  lpGallonsConsumed?: number;
  lpGallonsOnHand?: number;
  tankCapacityLbs?: number;
  tankCapacityGallons?: number;
  tankPercentFull?: number;
  hoursRemainingOnTank?: number;
  estimated20lbTanksUsed?: number;
  // Stick-Burner / Wood Split specific
  splitLogsConsumed?: number;
  splitLogsOnHand?: number;
  splitLogsPerHour?: number;
  fireboxRestockIntervalMinutes?: number;
  // Pellet / Hopper specific
  hopperCapacityLbs?: number;
  hopperPercentFull?: number;
  // Summary
  telemetrySummaryLabel: string;
  telemetryStatusBadge: string;
}

/**
 * Calculates specialized multi-fuel telemetry based on selected smoker type and fuel type:
 * - Wood Splits (Stick-Burning Offset Wood Smokers)
 * - Gas (Propane / LP Gas Smokers)
 * - Pellets (Pellet Smokers & Grills)
 * - Charcoal & Electric
 */
export function calculateFuelTelemetryBySmokerType(
  profile?: SmokerProfile | null,
  cookLogs: CookLog[] = [],
  fuelLogs: FuelLog[] = []
): DetailedFuelTelemetry {
  const specs = getEffectiveSmokerSpecs(profile);
  const rawFuelType = specs.fuelType || profile?.fuelType || 'Pellets';

  let fuelTypeKey: 'Wood Splits' | 'Gas' | 'Pellets' | 'Charcoal' | 'Electric' = 'Pellets';
  if (rawFuelType === 'Wood Splits' || specs.category.includes('Stick-Burning') || specs.modelOrType.includes('Offset')) {
    fuelTypeKey = 'Wood Splits';
  } else if (rawFuelType === 'Gas' || specs.category.includes('Gas') || specs.modelOrType.includes('Propane')) {
    fuelTypeKey = 'Gas';
  } else if (rawFuelType === 'Charcoal' || specs.category.includes('Charcoal') || specs.category.includes('Kamado')) {
    fuelTypeKey = 'Charcoal';
  } else if (rawFuelType === 'Electric') {
    fuelTypeKey = 'Electric';
  }

  const burnRateLbsHr = specs.baselineBurnRateLbsHr || 1.20;

  // Inventory & Consumed Math
  const totalRestockedLbs = fuelLogs.reduce((sum, f) => sum + (f.quantityLbs || 0), 0);
  const totalConsumedLbs = cookLogs.filter((c) => c.isPublishedToTotalHours === true).reduce((sum, c) => sum + (c.fuelLbsConsumed || 0), 0);
  const isUnassignedSmoker = !specs.displayName || specs.displayName === 'None Selected' || specs.displayName.includes('Unassigned') || specs.hopperCapacityLbs === 0;
  const initialPayloadLbs = isUnassignedSmoker ? 0 : (specs.hopperCapacityLbs || 0);
  const effectiveRestockLbs = totalRestockedLbs > 0 ? totalRestockedLbs : initialPayloadLbs;
  const inventoryLbsOnHand = Math.max(0, Number((effectiveRestockLbs - totalConsumedLbs).toFixed(1)));

  const hoursUntilEmpty = burnRateLbsHr > 0 ? Number((inventoryLbsOnHand / burnRateLbsHr).toFixed(1)) : 0;

  // Propane calculations (1 Gallon LP = 4.24 Lbs LP)
  if (fuelTypeKey === 'Gas') {
    const tankCapacityLbs = specs.hopperCapacityLbs || 20; // 20 lb LP tank
    const tankCapacityGallons = Number((tankCapacityLbs / 4.24).toFixed(2)); // ~4.72 Gallons
    const lpGallonsConsumed = Number((totalConsumedLbs / 4.24).toFixed(2));
    const lpGallonsOnHand = Number((inventoryLbsOnHand / 4.24).toFixed(2));

    const latestCookLbs = cookLogs.length > 0 ? cookLogs[0].fuelLbsConsumed || 0 : 0;
    const currentTankLbsRemaining = Math.max(0, tankCapacityLbs - latestCookLbs);
    const tankPercentFull = Math.max(0, Math.min(100, Math.round((currentTankLbsRemaining / tankCapacityLbs) * 100)));
    const hoursRemainingOnTank = burnRateLbsHr > 0 ? Number((currentTankLbsRemaining / burnRateLbsHr).toFixed(1)) : 0;
    const estimated20lbTanksUsed = Number((totalConsumedLbs / 20).toFixed(1));
    const costPerHour225F = Number((burnRateLbsHr * 1.15).toFixed(2)); // ~$1.15/lb LP

    return {
      fuelTypeKey: 'Gas',
      fuelTypeDisplayName: 'LP Propane Gas Tank',
      burnRateLbsHr,
      totalConsumedLbs,
      inventoryLbsOnHand,
      hoursUntilEmpty,
      costPerHour225F,
      lpGallonsConsumed,
      lpGallonsOnHand,
      tankCapacityLbs,
      tankCapacityGallons,
      tankPercentFull,
      hoursRemainingOnTank,
      estimated20lbTanksUsed,
      telemetrySummaryLabel: `${tankPercentFull}% LP Propane Tank (${currentTankLbsRemaining.toFixed(1)} lbs / ${(currentTankLbsRemaining / 4.24).toFixed(1)} gal remaining)`,
      telemetryStatusBadge: `${hoursRemainingOnTank}h Continuous LP Burn Time`,
    };
  }

  // Stick-Burner / Wood Splits calculations (Average 1 split log = ~2.5 lbs)
  if (fuelTypeKey === 'Wood Splits') {
    const splitLogsConsumed = Math.round(totalConsumedLbs / 2.5);
    const splitLogsOnHand = Math.max(0, Math.round(inventoryLbsOnHand / 2.5));
    const splitLogsPerHour = Number((burnRateLbsHr / 2.5).toFixed(1));
    const fireboxRestockIntervalMinutes = burnRateLbsHr > 0 ? Math.round((2.5 / burnRateLbsHr) * 60) : 55;
    const costPerHour225F = Number((burnRateLbsHr * 0.60).toFixed(2)); // ~$0.60/lb cord wood

    return {
      fuelTypeKey: 'Wood Splits',
      fuelTypeDisplayName: 'Hardwood Split Logs (Stick Burner)',
      burnRateLbsHr,
      totalConsumedLbs,
      inventoryLbsOnHand,
      hoursUntilEmpty,
      costPerHour225F,
      splitLogsConsumed,
      splitLogsOnHand,
      splitLogsPerHour,
      fireboxRestockIntervalMinutes,
      telemetrySummaryLabel: `~${splitLogsPerHour} split log/hr (${fireboxRestockIntervalMinutes} min firebox restock rate)`,
      telemetryStatusBadge: `${splitLogsOnHand} Split Logs On Hand (${hoursUntilEmpty}h run time)`,
    };
  }

  // Pellet / Hardwood Pellet calculations
  const hopperCapacityLbs = isUnassignedSmoker ? 0 : (specs.hopperCapacityLbs || 0);
  const latestCookLbs = cookLogs.length > 0 ? cookLogs[0].fuelLbsConsumed || 0 : 0;
  const remainingHopperLbs = hopperCapacityLbs > 0 ? Math.max(0, hopperCapacityLbs - latestCookLbs) : 0;
  const hopperPercentFull = hopperCapacityLbs > 0 ? Math.max(0, Math.min(100, Math.round((remainingHopperLbs / hopperCapacityLbs) * 100))) : 0;
  const costPerHour225F = Number((burnRateLbsHr * 0.90).toFixed(2));

  return {
    fuelTypeKey: 'Pellets',
    fuelTypeDisplayName: 'Hardwood Pellets',
    burnRateLbsHr,
    totalConsumedLbs,
    inventoryLbsOnHand,
    hoursUntilEmpty,
    costPerHour225F,
    hopperCapacityLbs,
    hopperPercentFull,
    telemetrySummaryLabel: `${hopperPercentFull}% Hopper Level (${remainingHopperLbs.toFixed(1)} lbs pellets remaining)`,
    telemetryStatusBadge: `${hoursUntilEmpty}h Pellet Supply On Hand`,
  };
}

/**
 * Calculates a transparent, explainable Smoker Health Score (0 - 100%)
 * based on maintenance task status, thermal stability, burn efficiency, and operating age.
 */
export function calculateSmokerHealthScore(profile: SmokerProfile): {
  healthScore: number;
  maintenanceScore: number;
  stabilityScore: number;
  efficiencyScore: number;
  ageScore: number;
} {
  const tasks = profile.maintenanceTasks || [];
  const currentHours = profile.currentHours || 0;

  // 1. Maintenance Score (40%)
  let maintenanceScore = 90;
  if (tasks.length > 0) {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => {
      const hoursSince = currentHours - (t.lastPerformedHours || 0);
      return hoursSince <= (t.intervalHours || 50);
    }).length;
    maintenanceScore = Math.round((completedTasks / totalTasks) * 100);
  }

  // 2. Thermal Stability Score (30%)
  const specs = getEffectiveSmokerSpecs(profile);
  const variance = specs.tempStabilityVarianceDegrees || 12;
  let stabilityScore = 100;
  if (variance <= 5) stabilityScore = 100;
  else if (variance <= 10) stabilityScore = 92;
  else if (variance <= 18) stabilityScore = 82;
  else if (variance <= 25) stabilityScore = 70;
  else stabilityScore = 55;

  // 3. Burn Efficiency Score (20%)
  let efficiencyScore = 85;
  switch (specs.globalBurnEfficiencyGrade) {
    case 'S+': efficiencyScore = 100; break;
    case 'A+': efficiencyScore = 95; break;
    case 'A':  efficiencyScore = 88; break;
    case 'B':  efficiencyScore = 78; break;
    case 'C':  efficiencyScore = 65; break;
  }

  // 4. Age / Operating Hours Score (10%)
  let ageScore = 100;
  if (currentHours > 1000) ageScore = 80;
  else if (currentHours > 500) ageScore = 90;
  else if (currentHours > 200) ageScore = 95;

  const totalWeighted = Math.round(
    maintenanceScore * 0.40 +
    stabilityScore * 0.30 +
    efficiencyScore * 0.20 +
    ageScore * 0.10
  );

  const healthScore = Math.max(0, Math.min(100, totalWeighted));

  return {
    healthScore,
    maintenanceScore,
    stabilityScore,
    efficiencyScore,
    ageScore,
  };
}

