import { CookLog, SmokerProfile, FuelLog } from '../types';

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

export const MANUFACTURER_DATABASE: SmokerManufacturerSpec[] = [
  {
    brandModel: 'Pit Boss Copperhead 5-Series / Vertical Series',
    category: 'Vertical Pellet Smoker',
    smokerTypeKey: 'Vertical Pellet Smoker',
    factoryBaselineBurnRateLbsHr: 1.00,
    factoryHighHeatBurnRateLbsHr: 2.20,
    standardCapacityLbs: 60,
    insulationType: 'Double-Wall Insulated Cabinet',
    thermalEfficiencyRating: 'High',
    manufacturerNotes: 'Vertical cabinet retains heat efficiently due to top gravity drafting and double-wall door seals.',
  },
  {
    brandModel: 'Traeger Pro / Ironwood / Timberline Series',
    category: 'Horizontal Pellet Grill / Smoker',
    smokerTypeKey: 'Horizontal Pellet Grill / Smoker',
    factoryBaselineBurnRateLbsHr: 1.50,
    factoryHighHeatBurnRateLbsHr: 3.00,
    standardCapacityLbs: 20,
    insulationType: 'Single-Wall Barrel / Downdraft Exhaust',
    thermalEfficiencyRating: 'Standard',
    manufacturerNotes: 'Horizontal barrel layout exposes more surface area to ambient wind; downdraft circulation balances heat.',
  },
  {
    brandModel: 'Camp Chef Woodwind / SmokePro / XXL Vertical',
    category: 'Pellet Smoker / Grill',
    smokerTypeKey: 'Pellet Smoker / Grill',
    factoryBaselineBurnRateLbsHr: 1.25,
    factoryHighHeatBurnRateLbsHr: 2.50,
    standardCapacityLbs: 22,
    insulationType: 'Insulated Lid & PID Controller',
    thermalEfficiencyRating: 'High',
    manufacturerNotes: 'PID temperature algorithms maintain steady auger feed rates within ±5°F of set point.',
  },
  {
    brandModel: 'Masterbuilt Gravity Series (560 / 800 / 1050)',
    category: 'Gravity Series Digital Charcoal Smoker',
    smokerTypeKey: 'Gravity Series Digital Charcoal Smoker',
    factoryBaselineBurnRateLbsHr: 1.35,
    factoryHighHeatBurnRateLbsHr: 3.20,
    standardCapacityLbs: 16,
    insulationType: 'Chamber Heat Shield & Fan Forced Draft',
    thermalEfficiencyRating: 'Standard',
    manufacturerNotes: 'Digital fan maintains high precision charcoal combustion; higher energy output per pound of lump charcoal.',
  },
  {
    brandModel: 'Oklahoma Joe / Yoder / Offset Stickburner',
    category: 'Offset Wood & Charcoal Smoker',
    smokerTypeKey: 'Offset Wood & Charcoal Smoker',
    factoryBaselineBurnRateLbsHr: 2.25,
    factoryHighHeatBurnRateLbsHr: 4.50,
    standardCapacityLbs: 25,
    insulationType: 'Heavy Gauge Rolled Steel (1/4")',
    thermalEfficiencyRating: 'Moderate',
    manufacturerNotes: 'Open airflow draft requires steady log additions; high radiant thermal mass once steel chamber heat-saturates.',
  },
  {
    brandModel: 'Kamado Joe / Big Green Egg / Primo Ceramic',
    category: 'Kamado Ceramic Charcoal Cooker',
    smokerTypeKey: 'Kamado Ceramic Charcoal Cooker',
    factoryBaselineBurnRateLbsHr: 0.65,
    factoryHighHeatBurnRateLbsHr: 1.80,
    standardCapacityLbs: 10,
    insulationType: 'Thick Ceramic Thermal Mass Core',
    thermalEfficiencyRating: 'Extreme',
    manufacturerNotes: 'Industry-leading thermal retention; holds 225°F for 18+ hours on a single 10lb load of lump charcoal.',
  },
  {
    brandModel: 'Pit Barrel Cooker / Drum Smoker',
    category: 'Ugly Drum Smoker (UDS)',
    smokerTypeKey: 'Ugly Drum Smoker (UDS)',
    factoryBaselineBurnRateLbsHr: 0.85,
    factoryHighHeatBurnRateLbsHr: 2.00,
    standardCapacityLbs: 8,
    insulationType: 'Convection Airflow Steel Cylinder',
    thermalEfficiencyRating: 'High',
    manufacturerNotes: 'Vertical hanging method and sealed intake creates natural convection currents with minimal charcoal loss.',
  },
  {
    brandModel: 'Weber Smokey Mountain (WSM 18" / 22")',
    category: 'Water Smoker / Charcoal Bullet',
    smokerTypeKey: 'Water Smoker / Charcoal Bullet',
    factoryBaselineBurnRateLbsHr: 1.10,
    factoryHighHeatBurnRateLbsHr: 2.40,
    standardCapacityLbs: 12,
    insulationType: 'Porcelain-Enameled Steel with Water Pan Heat Sink',
    thermalEfficiencyRating: 'Standard',
    manufacturerNotes: 'Water bowl acts as a thermal buffer to regulate pit temperatures at 225°F.',
  },
  {
    brandModel: 'Masterbuilt 30" / Bradley Electric Smoker',
    category: 'Electric Smoker',
    smokerTypeKey: 'Electric Smoker',
    factoryBaselineBurnRateLbsHr: 0.35,
    factoryHighHeatBurnRateLbsHr: 0.80,
    standardCapacityLbs: 5,
    insulationType: 'Fully Insulated Refrigerator Style Cabinet',
    thermalEfficiencyRating: 'Extreme',
    manufacturerNotes: 'Electric element supplies primary thermal heat; wood chips/bisquettes used solely for smoke generation.',
  },
  {
    brandModel: 'Camp Chef Smoke Vault / Gas Propane Smoker',
    category: 'Gas / Propane Smoker',
    smokerTypeKey: 'Gas / Propane Smoker',
    factoryBaselineBurnRateLbsHr: 0.45,
    factoryHighHeatBurnRateLbsHr: 1.10,
    standardCapacityLbs: 20,
    insulationType: 'Ventilated Metal Cabinet',
    thermalEfficiencyRating: 'High',
    manufacturerNotes: 'LP gas burner supplies baseline BTUs while wood chunks smolder in a dedicated cast-iron tray.',
  },
];

/**
 * Intelligent lookup function matching smoker name / model / type input string to manufacturer specification specs.
 */
export function getManufacturerSpecs(
  smokerName: string,
  smokerModel: string,
  smokerType: string
): SmokerManufacturerSpec {
  const query = `${smokerName} ${smokerModel} ${smokerType}`.toLowerCase();

  // 1. Direct model keyword matching
  if (query.includes('copperhead') || query.includes('pit boss') || query.includes('vertical pellet')) {
    return MANUFACTURER_DATABASE[0];
  }
  if (query.includes('traeger') || query.includes('ironwood') || query.includes('timberline') || query.includes('horizontal pellet')) {
    return MANUFACTURER_DATABASE[1];
  }
  if (query.includes('camp chef') || query.includes('woodwind')) {
    return MANUFACTURER_DATABASE[2];
  }
  if (query.includes('gravity') || query.includes('masterbuilt 560') || query.includes('masterbuilt 1050')) {
    return MANUFACTURER_DATABASE[3];
  }
  if (query.includes('offset') || query.includes('oklahoma') || query.includes('yoder') || query.includes('stickburner')) {
    return MANUFACTURER_DATABASE[4];
  }
  if (query.includes('kamado') || query.includes('green egg') || query.includes('primo') || query.includes('ceramic')) {
    return MANUFACTURER_DATABASE[5];
  }
  if (query.includes('drum') || query.includes('pit barrel') || query.includes('uds')) {
    return MANUFACTURER_DATABASE[6];
  }
  if (query.includes('weber') || query.includes('wsm') || query.includes('smokey mountain') || query.includes('water smoker')) {
    return MANUFACTURER_DATABASE[7];
  }
  if (query.includes('electric') || query.includes('bradley')) {
    return MANUFACTURER_DATABASE[8];
  }
  if (query.includes('gas') || query.includes('propane') || query.includes('smoke vault')) {
    return MANUFACTURER_DATABASE[9];
  }

  // 2. Fallback matching by smokerType string
  const matchedType = MANUFACTURER_DATABASE.find(
    (spec) => spec.smokerTypeKey.toLowerCase() === smokerType.toLowerCase()
  );

  if (matchedType) {
    return matchedType;
  }

  // 3. Generic default fallback (Standard Vertical Pellet Spec)
  return MANUFACTURER_DATABASE[0];
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

  // Calculate actual user burn rate from logged cooks
  const validCooks = cookLogs.filter((c) => c.hoursLogged > 0 && c.fuelLbsConsumed > 0);
  const totalHours = validCooks.reduce((sum, c) => sum + c.hoursLogged, 0);
  const totalFuelLbs = validCooks.reduce((sum, c) => sum + c.fuelLbsConsumed, 0);

  const actualBurnRateLbsHr = totalHours > 0 ? totalFuelLbs / totalHours : mfrSpec.factoryBaselineBurnRateLbsHr;

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

  const weatherAdjustedBaselineBurnRateLbsHr = Number((mfrSpec.factoryBaselineBurnRateLbsHr * weatherFactor).toFixed(2));
  const factoryBaselineBurnRateLbsHr = mfrSpec.factoryBaselineBurnRateLbsHr;

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
  overrideHoursSinceRefill?: number
): RefillPelletUsageResult {
  const burnSync = calculateBurnEfficiencySync(profile, cookLogs);
  const mfrBurnRate = burnSync.weatherAdjustedBaselineBurnRateLbsHr || burnSync.factoryBaselineBurnRateLbsHr || 1.0;
  const hopperCapacityLbs = burnSync.mfrSpec.standardCapacityLbs || profile.pelletHopperCapacityLbs || 60;

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
  const remainingPelletsLbs = Math.max(0, Number((hopperCapacityLbs - pelletUsageLbs).toFixed(2)));
  const hopperPercentFull = Math.max(0, Math.min(100, Math.round((remainingPelletsLbs / hopperCapacityLbs) * 100)));
  const hoursUntilEmpty = mfrBurnRate > 0 ? Number((remainingPelletsLbs / mfrBurnRate).toFixed(1)) : 0;
  const isLowPelletWarning = hopperPercentFull <= 20;

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
