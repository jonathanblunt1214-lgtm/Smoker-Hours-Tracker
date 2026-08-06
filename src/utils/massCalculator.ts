import { ProteinType, SmokerProfile } from '../types';
import { EffectiveSmokerSpecs, getEffectiveSmokerSpecs } from './smokerCalculations';

export interface MassCookInput {
  proteinType: ProteinType;
  proteinCut: string;
  weightValue: number; // e.g. 14
  weightUnit: 'lbs' | 'kg';
  pitTempF: number; // e.g. 225, 250, 275
  targetInternalTempF: number; // e.g. 203
  wrapStrategy: 'No Wrap' | 'Peach Butcher Paper' | 'Foil Boat' | 'Aluminum Foil' | 'Covered Pan';
  boneOption: 'Bone-In' | 'Boneless';
  thicknessProfile: 'Standard Whole Muscle' | 'Thick Uniform Mass' | 'Thin Flat Slab' | 'Compact Roast';
}

export interface MassCookResult {
  weightLbs: number;
  weightKg: number;
  estimatedCookHours: number;
  estimatedCookTimeFormatted: string;
  stallWindowStartTempF: number;
  stallWindowEndTempF: number;
  estimatedStallStartHour: number;
  estimatedWrapHour: number;
  recommendedWrapTempF: number;
  estimatedFuelLbs: number;
  spritzIntervalMinutes: number;
  spritzStartHour: number;
  recommendedRestMinutes: number;
  recommendedRestFormatted: string;
  recommendedWoodPairing: string;
  heatAbsorptionBtu: number;
  massCookSteps: Array<{
    phase: string;
    targetHourOrTemp: string;
    actionTitle: string;
    description: string;
  }>;
}

/**
 * Converts weight to lbs if provided in kg
 */
export function convertToLbs(value: number, unit: 'lbs' | 'kg'): number {
  if (unit === 'kg') return parseFloat((value * 2.20462).toFixed(2));
  return parseFloat(value.toFixed(2));
}

/**
 * Converts lbs to kg
 */
export function convertToKg(lbs: number): number {
  return parseFloat((lbs / 2.20462).toFixed(2));
}

/**
 * Core Mass & Weight Physics Calculator for Smoker Cooks
 */
export function calculateMassCookSchedule(
  input: MassCookInput,
  profile?: SmokerProfile | null
): MassCookResult {
  const weightLbs = convertToLbs(input.weightValue, input.weightUnit);
  const weightKg = convertToKg(weightLbs);

  const effectiveSpecs: EffectiveSmokerSpecs = getEffectiveSmokerSpecs(profile);
  const burnRateLbsHr = input.pitTempF >= 300 
    ? effectiveSpecs.highHeatBurnRateLbsHr 
    : effectiveSpecs.baselineBurnRateLbsHr;

  // Base hours per lb at standard 225°F
  let baseHoursPerLb = 1.25;
  let defaultTargetTemp = 203;
  let stallStart = 150;
  let stallEnd = 168;
  let woodPairing = 'Post Oak & Pecan Blend';

  const cutLower = (input.proteinCut || '').toLowerCase();
  const proteinLower = (input.proteinType || '').toLowerCase();

  if (proteinLower.includes('beef') || cutLower.includes('brisket')) {
    woodPairing = 'Texas Post Oak & Pecan Blend';
    if (cutLower.includes('brisket') || cutLower.includes('packer')) {
      baseHoursPerLb = 1.35;
      defaultTargetTemp = 203;
    } else if (cutLower.includes('short rib') || cutLower.includes('dino')) {
      baseHoursPerLb = 1.1;
      defaultTargetTemp = 202;
      stallStart = 155;
    } else if (cutLower.includes('tri-tip') || cutLower.includes('top round')) {
      baseHoursPerLb = 0.35;
      defaultTargetTemp = 132;
      stallStart = 120;
    } else if (cutLower.includes('prime rib') || cutLower.includes('ribeye roast')) {
      baseHoursPerLb = 0.45;
      defaultTargetTemp = 130;
      stallStart = 115;
    }
  } else if (proteinLower.includes('pork')) {
    woodPairing = 'Applewood & Hickory Blend';
    if (cutLower.includes('butt') || cutLower.includes('shoulder') || cutLower.includes('picnic')) {
      baseHoursPerLb = 1.30;
      defaultTargetTemp = 205;
      stallStart = 155;
      stallEnd = 170;
    } else if (cutLower.includes('rib') || cutLower.includes('spare') || cutLower.includes('st. louis')) {
      baseHoursPerLb = 1.20;
      defaultTargetTemp = 198;
      stallStart = 145;
    } else if (cutLower.includes('belly')) {
      baseHoursPerLb = 0.95;
      defaultTargetTemp = 200;
    } else if (cutLower.includes('loin') || cutLower.includes('tenderloin')) {
      baseHoursPerLb = 0.40;
      defaultTargetTemp = 145;
    }
  } else if (proteinLower.includes('poultry') || proteinLower.includes('chicken') || proteinLower.includes('turkey') || proteinLower.includes('duck')) {
    woodPairing = 'Cherrywood & Maple Blend';
    baseHoursPerLb = proteinLower.includes('turkey') ? 0.45 : 0.35;
    defaultTargetTemp = 165;
    stallStart = 140;
    stallEnd = 155;
  } else if (proteinLower.includes('game') || proteinLower.includes('venison') || proteinLower.includes('bison') || proteinLower.includes('elk')) {
    woodPairing = 'Hickory & Cherrywood Blend';
    baseHoursPerLb = 0.50;
    defaultTargetTemp = 140;
  }

  // Adjust hours per lb based on Pit Temp (°F)
  // Higher temp = faster heat transfer
  let tempFactor = 1.0;
  if (input.pitTempF >= 275) {
    tempFactor = 0.72; // ~28% faster at 275°F
  } else if (input.pitTempF >= 250) {
    tempFactor = 0.85; // ~15% faster at 250°F
  } else if (input.pitTempF <= 200) {
    tempFactor = 1.20; // 20% slower at 200°F
  }

  // Adjust for thickness profile
  let thicknessFactor = 1.0;
  if (input.thicknessProfile === 'Thick Uniform Mass') thicknessFactor = 1.15;
  if (input.thicknessProfile === 'Thin Flat Slab') thicknessFactor = 0.75;
  if (input.thicknessProfile === 'Compact Roast') thicknessFactor = 1.05;

  // Adjust for Boneless vs Bone-in
  const boneFactor = input.boneOption === 'Boneless' ? 1.05 : 0.95; // Bone conducts heat faster internally

  // Calculate total cook hours
  // Apply non-linear mass scaling (mass scaling factor exponent 0.82 to avoid overly long linear scaling for huge cuts like 18lb brisket)
  const effectiveMassExponent = Math.pow(Math.max(1, weightLbs), 0.88) / Math.max(1, weightLbs);
  let totalHours = weightLbs * baseHoursPerLb * tempFactor * thicknessFactor * boneFactor * effectiveMassExponent;
  
  // Wrap factor
  if (input.wrapStrategy === 'Aluminum Foil' || input.wrapStrategy === 'Covered Pan') {
    totalHours *= 0.88; // Foil speeds up stall completion
  } else if (input.wrapStrategy === 'Peach Butcher Paper' || input.wrapStrategy === 'Foil Boat') {
    totalHours *= 0.93;
  }

  totalHours = Math.max(0.75, parseFloat(totalHours.toFixed(2)));

  const hrsInt = Math.floor(totalHours);
  const minsInt = Math.round((totalHours - hrsInt) * 60);
  const estimatedCookTimeFormatted = hrsInt > 0 ? `${hrsInt}h ${minsInt}m` : `${minsInt} mins`;

  // Stall & Wrap estimates
  const estimatedStallStartHour = parseFloat((totalHours * 0.45).toFixed(1));
  const estimatedWrapHour = parseFloat((totalHours * 0.58).toFixed(1));
  const recommendedWrapTempF = stallStart + 10;

  // Estimated Fuel
  const estimatedFuelLbs = parseFloat((totalHours * burnRateLbsHr).toFixed(1));

  // Spritz
  const spritzStartHour = Math.max(1.5, parseFloat((totalHours * 0.30).toFixed(1)));
  const spritzIntervalMinutes = totalHours > 8 ? 60 : 45;

  // Rest
  let restMinutes = Math.round(weightLbs * 10);
  if (cutLower.includes('brisket')) restMinutes = Math.max(90, Math.round(weightLbs * 12));
  if (cutLower.includes('butt') || cutLower.includes('shoulder')) restMinutes = Math.max(45, Math.round(weightLbs * 8));
  if (proteinLower.includes('poultry') || proteinLower.includes('chicken')) restMinutes = Math.min(30, Math.max(15, Math.round(weightLbs * 3)));

  const restHrs = Math.floor(restMinutes / 60);
  const restMins = restMinutes % 60;
  const recommendedRestFormatted = restHrs > 0 ? `${restHrs}h ${restMins}m` : `${restMins} mins`;

  // Thermal heat absorption BTU estimation
  // Meat specific heat ~ 0.8 BTU/(lb·°F)
  const deltaT = (input.targetInternalTempF || defaultTargetTemp) - 40; // From 40°F fridge
  const heatAbsorptionBtu = Math.round(weightLbs * 0.82 * deltaT);

  const massCookSteps = [
    {
      phase: 'Phase 1: Pre-Cook & Seasoning',
      targetHourOrTemp: 'Hour 0.0 (Fridge Temp 40°F)',
      actionTitle: `Trim & Season Mass (${weightLbs} lbs / ${weightKg} kg)`,
      description: `Apply coarse rub evenly over all surface mass. Preheat smoker to ${input.pitTempF}°F with ${woodPairing}.`,
    },
    {
      phase: 'Phase 2: Initial Smoke & Bark Set',
      targetHourOrTemp: `Hours 0.0 - ${spritzStartHour} hrs`,
      actionTitle: 'Clean Smoke & Surface Gelatinization',
      description: `Run smoker at steady ${input.pitTempF}°F. Allow smoke ring & bark to set untouched before spritzing.`,
    },
    {
      phase: 'Phase 3: Thermal Stall Window',
      targetHourOrTemp: `Est. Hour ${estimatedStallStartHour} (${stallStart}°F - ${stallEnd}°F)`,
      actionTitle: 'Surface Evaporative Cooling Stall',
      description: `Mass of ${weightLbs} lbs will stall around ${stallStart}°F. Spritz every ${spritzIntervalMinutes} mins to prevent edge burning.`,
    },
    {
      phase: 'Phase 4: Wrap Strategy Execution',
      targetHourOrTemp: `Est. Hour ${estimatedWrapHour} (${recommendedWrapTempF}°F)`,
      actionTitle: `Wrap in ${input.wrapStrategy}`,
      description: `When bark is dark mahogany and fat renders, wrap tightly in ${input.wrapStrategy} to power through mass core stall.`,
    },
    {
      phase: 'Phase 5: Probe Tender Finish',
      targetHourOrTemp: `Est. Hour ${totalHours} (${input.targetInternalTempF || defaultTargetTemp}°F)`,
      actionTitle: 'Probe Tenderness Verification',
      description: `Probe center of thickest mass section. Thermometer probe should slide in like warm butter with zero resistance.`,
    },
    {
      phase: 'Phase 6: Mass Heat Equalization & Rest',
      targetHourOrTemp: `Post-Cook (${recommendedRestFormatted} Rest)`,
      actionTitle: 'Carryover Cooking & Juice Redistribution',
      description: `Vent wrap for 10 mins, then hold in insulated cooler/oven at 150°F for ${recommendedRestFormatted} before slicing.`,
    },
  ];

  return {
    weightLbs,
    weightKg,
    estimatedCookHours: totalHours,
    estimatedCookTimeFormatted,
    stallWindowStartTempF: stallStart,
    stallWindowEndTempF: stallEnd,
    estimatedStallStartHour,
    estimatedWrapHour,
    recommendedWrapTempF,
    estimatedFuelLbs,
    spritzIntervalMinutes,
    spritzStartHour,
    recommendedRestMinutes: restMinutes,
    recommendedRestFormatted,
    recommendedWoodPairing: woodPairing,
    heatAbsorptionBtu,
    massCookSteps,
  };
}
