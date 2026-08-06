export interface WoodSpeciesData {
  name: string;
  category: 'Pure Wood Species' | 'Pure Wood Pellets' | 'Charcoal Pellets' | 'Brand & Competition Pellets';
  btuPerLb: number;
  moisturePercent: number;
  smokeDensity: 'Light' | 'Medium' | 'Heavy' | 'Bold';
  barkImpact: string;
  flavorNotes: string;
  recommendedProteins: string[];
}

export const WOOD_SPECIES_LIBRARY: Record<string, WoodSpeciesData> = {
  // --- PURE WOOD SPECIES & PURE WOOD PELLETS ---
  'Post Oak': {
    name: 'Post Oak',
    category: 'Pure Wood Species',
    btuPerLb: 8600,
    moisturePercent: 6.0,
    smokeDensity: 'Medium',
    barkImpact: 'Deep Mahogany & Firm Bark',
    flavorNotes: 'Clean, balanced, classic Central Texas smoke flavor that lets meat shine.',
    recommendedProteins: ['Beef Brisket', 'Beef Ribs', 'Pork Shoulder'],
  },
  'Hickory': {
    name: 'Hickory',
    category: 'Pure Wood Species',
    btuPerLb: 8800,
    moisturePercent: 6.5,
    smokeDensity: 'Bold',
    barkImpact: 'Dark Espresso & Heavy Bark',
    flavorNotes: 'Rich, pungent, bacon-like savory aroma. Classic Southern BBQ staple.',
    recommendedProteins: ['Pork Shoulder', 'St. Louis Ribs', 'Wild Boar', 'Poultry'],
  },
  'Pecan': {
    name: 'Pecan',
    category: 'Pure Wood Species',
    btuPerLb: 8700,
    moisturePercent: 6.2,
    smokeDensity: 'Medium',
    barkImpact: 'Golden Mahogany',
    flavorNotes: 'Smooth, sweet, nutty flavor without harshness. Excellent all-rounder.',
    recommendedProteins: ['Pork', 'Beef', 'Chicken', 'Turkey', 'Lamb'],
  },
  'Cherry': {
    name: 'Cherry',
    category: 'Pure Wood Species',
    btuPerLb: 8200,
    moisturePercent: 7.0,
    smokeDensity: 'Light',
    barkImpact: 'Vibrant Deep Red Mahogany',
    flavorNotes: 'Sweet, fruity, subtle smoke that gives meat an incredible reddish hue.',
    recommendedProteins: ['Pork Ribs', 'Chicken', 'Duck', 'Turkey', 'Salmon'],
  },
  'Apple': {
    name: 'Apple',
    category: 'Pure Wood Species',
    btuPerLb: 8100,
    moisturePercent: 7.2,
    smokeDensity: 'Light',
    barkImpact: 'Warm Light Amber',
    flavorNotes: 'Mildly sweet and mellow fruity notes. Takes time to build heavy smoke.',
    recommendedProteins: ['Pork Loin', 'Poultry', 'Seafood', 'Cheese'],
  },
  'Mesquite': {
    name: 'Mesquite',
    category: 'Pure Wood Species',
    btuPerLb: 9200,
    moisturePercent: 5.5,
    smokeDensity: 'Bold',
    barkImpact: 'Dark Black & Intense Sear',
    flavorNotes: 'Extremely hot burn, sharp earthy aroma. Best for fast sears or heavy cuts.',
    recommendedProteins: ['Beef Steaks', 'Bison', 'Elk', 'Fajitas', 'Wild Game'],
  },
  'Maple': {
    name: 'Maple',
    category: 'Pure Wood Species',
    btuPerLb: 8400,
    moisturePercent: 6.8,
    smokeDensity: 'Medium',
    barkImpact: 'Light Tan & Smooth Glaze',
    flavorNotes: 'Sweet, gentle wood smoke with delicate syrup undertones.',
    recommendedProteins: ['Poultry', 'Pork Chops', 'Ham', 'Vegetables'],
  },
  'Alder': {
    name: 'Alder',
    category: 'Pure Wood Species',
    btuPerLb: 8000,
    moisturePercent: 7.5,
    smokeDensity: 'Light',
    barkImpact: 'Subtle Bronze Finish',
    flavorNotes: 'Delicate, neutral sweetness with light smoke density. Traditional Pacific NW.',
    recommendedProteins: ['Salmon', 'Trout', 'Seafood', 'Pheasant'],
  },
  'Peach': {
    name: 'Peach',
    category: 'Pure Wood Species',
    btuPerLb: 8250,
    moisturePercent: 6.9,
    smokeDensity: 'Light',
    barkImpact: 'Golden Rose Mahogany',
    flavorNotes: 'Delicate fruity sweetness similar to hickory but milder and sweeter.',
    recommendedProteins: ['Pork', 'Chicken', 'Game Birds'],
  },
  'Almond Pellets': {
    name: 'Almond Pellets',
    category: 'Pure Wood Pellets',
    btuPerLb: 8850,
    moisturePercent: 5.8,
    smokeDensity: 'Medium',
    barkImpact: 'Deep Golden Walnut Bark',
    flavorNotes: '100% pure California almond wood. Unique sweet, nutty, clean-burning smoke with high heat.',
    recommendedProteins: ['Beef Brisket', 'Pork', 'Poultry', 'Seafood'],
  },
  'Plum Pellets': {
    name: 'Plum Pellets',
    category: 'Pure Wood Pellets',
    btuPerLb: 8350,
    moisturePercent: 6.4,
    smokeDensity: 'Medium',
    barkImpact: 'Rich Crimson Mahogany',
    flavorNotes: '100% pure plum wood pellets. Rich sweet fruit wood aroma with remarkable red color impact.',
    recommendedProteins: ['Pork Ribs', 'Poultry', 'Salmon'],
  },
  'Walnut Pellets': {
    name: 'Walnut Pellets',
    category: 'Pure Wood Pellets',
    btuPerLb: 8900,
    moisturePercent: 5.9,
    smokeDensity: 'Bold',
    barkImpact: 'Pitch Black Heavy Crust',
    flavorNotes: '100% Black Walnut pellets. Robust, intense, heavy savory wood flavor for red meats.',
    recommendedProteins: ['Beef Steaks', 'Venison', 'Wild Boar'],
  },

  // --- CHARCOAL PELLETS & PELLET CHARCOAL ---
  '100% Hardwood Charcoal Pellets': {
    name: '100% Hardwood Charcoal Pellets',
    category: 'Charcoal Pellets',
    btuPerLb: 9600,
    moisturePercent: 4.5,
    smokeDensity: 'Bold',
    barkImpact: 'Pitch Black Sear & Heavy Crust',
    flavorNotes: 'Condensed hardwood lump charcoal in pellet format. High heat, authentic steakhouse sear.',
    recommendedProteins: ['Beef Steaks', 'Brisket', 'Bison', 'Burgers'],
  },
  'Royal Oak Hardwood Charcoal Pellets': {
    name: 'Royal Oak Hardwood Charcoal Pellets',
    category: 'Charcoal Pellets',
    btuPerLb: 9650,
    moisturePercent: 4.2,
    smokeDensity: 'Bold',
    barkImpact: 'Heavy Dark Espresso Sear',
    flavorNotes: 'Made from real Royal Oak lump charcoal. Clean hot burn with classic charcoal flavor.',
    recommendedProteins: ['Beef', 'Pork', 'Burgers', 'Fajitas'],
  },
  'Jealous Devil Jax Charcoal Pellets': {
    name: 'Jealous Devil Jax Charcoal Pellets',
    category: 'Charcoal Pellets',
    btuPerLb: 9750,
    moisturePercent: 4.0,
    smokeDensity: 'Bold',
    barkImpact: 'Jet Black Intense Crust',
    flavorNotes: 'Ultra-dense South American hardwood charcoal pellets. Extreme BTU output and near-zero ash.',
    recommendedProteins: ['Prime Beef Steaks', 'Brisket', 'Wild Game'],
  },
  'B&B Hardwood Charcoal Pellets': {
    name: 'B&B Hardwood Charcoal Pellets',
    category: 'Charcoal Pellets',
    btuPerLb: 9550,
    moisturePercent: 4.8,
    smokeDensity: 'Bold',
    barkImpact: 'Dark Charcoal Bark',
    flavorNotes: 'Championship-grade Texas oak charcoal pellets. Delivers steady, high heat and deep mahogany bark.',
    recommendedProteins: ['Beef', 'Pork Chops', 'Chicken Wings'],
  },
  'Pit Boss Charcoal Hardwood Pellets': {
    name: 'Pit Boss Charcoal Hardwood Pellets',
    category: 'Charcoal Pellets',
    btuPerLb: 9500,
    moisturePercent: 5.0,
    smokeDensity: 'Medium',
    barkImpact: 'Dark Charbed Mahogany',
    flavorNotes: '100% natural oak hardwood charcoal pellets. Versatile high-heat and low-and-slow performer.',
    recommendedProteins: ['Beef', 'Pork', 'Poultry', 'Pizza'],
  },
  'Traeger Charcoal Pellets': {
    name: 'Traeger Charcoal Pellets',
    category: 'Charcoal Pellets',
    btuPerLb: 9450,
    moisturePercent: 5.1,
    smokeDensity: 'Medium',
    barkImpact: 'Charcoal Glaze & Dark Bark',
    flavorNotes: 'Natural oak charcoal blend engineered for pellet grill temperature stability and subtle smoke ring.',
    recommendedProteins: ['Beef', 'Pork', 'Burgers'],
  },

  // --- POPULAR BRAND & COMPETITION PELLETS ---
  'Lumber Jack Competition Blend': {
    name: 'Lumber Jack Competition Blend',
    category: 'Brand & Competition Pellets',
    btuPerLb: 8750,
    moisturePercent: 6.0,
    smokeDensity: 'Medium',
    barkImpact: 'Deep Mahogany & Red Hue',
    flavorNotes: '34% Maple, 33% Hickory, 33% Cherry with debarked virgin wood. Perfect all-round competition profile.',
    recommendedProteins: ['Beef Brisket', 'Pork Ribs', 'Chicken', 'Turkey'],
  },
  'Bear Mountain Bold BBQ Blend': {
    name: 'Bear Mountain Bold BBQ Blend',
    category: 'Brand & Competition Pellets',
    btuPerLb: 8800,
    moisturePercent: 5.9,
    smokeDensity: 'Bold',
    barkImpact: 'Espresso Dark Crust',
    flavorNotes: 'Master blend of Hickory, Oak, and Mesquite. Strong, savory smoke designed for hearty meats.',
    recommendedProteins: ['Beef Brisket', 'Pork Shoulder', 'Beef Ribs', 'Venison'],
  },
  'Bear Mountain Smooth Hickory': {
    name: 'Bear Mountain Smooth Hickory',
    category: 'Brand & Competition Pellets',
    btuPerLb: 8780,
    moisturePercent: 6.1,
    smokeDensity: 'Bold',
    barkImpact: 'Dark Mahogany Bark',
    flavorNotes: '100% natural hardwood with rich hickory flavor profile. Sweet bacon aroma without bitterness.',
    recommendedProteins: ['Pork Shoulder', 'Ribs', 'Poultry'],
  },
  'CookinPellets Perfect Mix': {
    name: 'CookinPellets Perfect Mix',
    category: 'Brand & Competition Pellets',
    btuPerLb: 8680,
    moisturePercent: 6.2,
    smokeDensity: 'Medium',
    barkImpact: 'Vibrant Mahogany & Red Bark',
    flavorNotes: '100% hardwood blend of Hickory, Cherry, Hard Maple, and Apple. No fillers, binders, or oil additives.',
    recommendedProteins: ['Beef', 'Pork', 'Chicken', 'Salmon'],
  },
  'Traeger Signature Blend': {
    name: 'Traeger Signature Blend',
    category: 'Brand & Competition Pellets',
    btuPerLb: 8550,
    moisturePercent: 6.5,
    smokeDensity: 'Medium',
    barkImpact: 'Classic Mahogany Bark',
    flavorNotes: 'Signature combination of Hickory, Maple, and Cherry. Balanced everyday smoke profile.',
    recommendedProteins: ['Beef', 'Pork', 'Chicken', 'Vegetables'],
  },
  'Pit Boss Competition Blend': {
    name: 'Pit Boss Competition Blend',
    category: 'Brand & Competition Pellets',
    btuPerLb: 8620,
    moisturePercent: 6.3,
    smokeDensity: 'Medium',
    barkImpact: 'Warm Mahogany Finish',
    flavorNotes: 'Versatile ratio of Maple, Hickory, and Apple hardwood pellets.',
    recommendedProteins: ['Beef', 'Pork', 'Poultry', 'Baking'],
  },
  'Jack Daniel\'s Whiskey Barrel Pellets': {
    name: 'Jack Daniel\'s Whiskey Barrel Pellets',
    category: 'Brand & Competition Pellets',
    btuPerLb: 8950,
    moisturePercent: 5.6,
    smokeDensity: 'Bold',
    barkImpact: 'Rich Charcoal Mahogany Bark',
    flavorNotes: 'Made from authentic white oak Jack Daniel\'s whiskey barrels. Sweet, oaky whiskey mash aroma.',
    recommendedProteins: ['Beef Steaks', 'Brisket', 'Pork Chops', 'Venison'],
  },
  'Camp Chef Competition Blend': {
    name: 'Camp Chef Competition Blend',
    category: 'Brand & Competition Pellets',
    btuPerLb: 8580,
    moisturePercent: 6.4,
    smokeDensity: 'Medium',
    barkImpact: 'Golden Mahogany',
    flavorNotes: 'Maple, Hickory, and Cherry blend for sweet, smooth competition barbecue.',
    recommendedProteins: ['Pork Ribs', 'Chicken', 'Turkey'],
  },
  'Green Mountain Grills Gold Blend': {
    name: 'Green Mountain Grills Gold Blend',
    category: 'Brand & Competition Pellets',
    btuPerLb: 8640,
    moisturePercent: 6.2,
    smokeDensity: 'Medium',
    barkImpact: 'Golden Red Mahogany',
    flavorNotes: 'Red Oak, Hickory, and Mountain Maple pellets. Clean burning with high heat yield.',
    recommendedProteins: ['Beef', 'Pork', 'Poultry'],
  },
  'Weber Academy Blend': {
    name: 'Weber Academy Blend',
    category: 'Brand & Competition Pellets',
    btuPerLb: 8600,
    moisturePercent: 6.3,
    smokeDensity: 'Medium',
    barkImpact: 'Firm Dark Mahogany',
    flavorNotes: '50% Maple, 25% Hickory, and 25% Cherry hardwood pellets.',
    recommendedProteins: ['Beef', 'Pork', 'Chicken'],
  },
};

export const AVAILABLE_WOOD_SPECIES = Object.keys(WOOD_SPECIES_LIBRARY);

export const PELLET_CATEGORIES_GROUPED = {
  ' Pure Wood Species & Pure Wood Pellets': AVAILABLE_WOOD_SPECIES.filter(
    (key) => WOOD_SPECIES_LIBRARY[key].category === 'Pure Wood Species' || WOOD_SPECIES_LIBRARY[key].category === 'Pure Wood Pellets'
  ),
  '⚡ Charcoal Pellets & Pellet Charcoal': AVAILABLE_WOOD_SPECIES.filter(
    (key) => WOOD_SPECIES_LIBRARY[key].category === 'Charcoal Pellets'
  ),
  ' Popular Brand & Competition Pellets': AVAILABLE_WOOD_SPECIES.filter(
    (key) => WOOD_SPECIES_LIBRARY[key].category === 'Brand & Competition Pellets'
  ),
};

export interface BlendPhysicsResult {
  btuPerLb: number;
  weightedBtuPerLb: number;
  avgMoisturePct: number;
  weightedMoisturePercent: number;
  weightedCostPerLb: number;
  costPerBurnHourAt225F: number;
  estimatedCostPer10HrCook: number;
  estimatedCostPer20LbBag: number;
  efficiencyRating: number;
  calculatedEfficiencyRating: number; // e.g. 92.4%
  estimatedRunTimeHoursPer10Lbs: number; // e.g. 9.1 hours at 225°F
  estimatedLbsPerHourAt225F: number; // e.g. 1.1 lbs/hr
  estimatedLbsPerHourAt275F: number; // e.g. 1.5 lbs/hr
  estimatedLbsPerHourAt350F: number; // e.g. 2.2 lbs/hr
  smokeProfile: string;
  smokeProfileSummary: string;
  barkImpact: string;
  barkImpactSummary: string;
  recommendedProteinsSummary: string[];
}

export function calculateBlendPhysics(
  components: Array<{ species?: string; woodType?: string; percentage: number; costPerLb?: number }>
): BlendPhysicsResult {
  if (!components || components.length === 0) {
    return {
      btuPerLb: 8500,
      weightedBtuPerLb: 8500,
      avgMoisturePct: 6.5,
      weightedMoisturePercent: 6.5,
      weightedCostPerLb: 0.85,
      costPerBurnHourAt225F: 1.00,
      estimatedCostPer10HrCook: 10.00,
      estimatedCostPer20LbBag: 17.00,
      efficiencyRating: 90.0,
      calculatedEfficiencyRating: 90.0,
      estimatedRunTimeHoursPer10Lbs: 8.5,
      estimatedLbsPerHourAt225F: 1.18,
      estimatedLbsPerHourAt275F: 1.55,
      estimatedLbsPerHourAt350F: 2.25,
      smokeProfile: 'Balanced Hardwood Blend',
      smokeProfileSummary: 'Balanced Hardwood Blend',
      barkImpact: 'Standard Mahogany Bark',
      barkImpactSummary: 'Standard Mahogany Bark',
      recommendedProteinsSummary: ['Beef', 'Pork', 'Poultry'],
    };
  }

  const totalPct = components.reduce((sum, c) => sum + c.percentage, 0) || 100;

  let totalBtu = 0;
  let totalMoisture = 0;
  let totalCost = 0;
  const flavorList: string[] = [];
  const barkList: string[] = [];
  const proteinSet = new Set<string>();

  components.forEach((comp) => {
    const speciesName = comp.species || comp.woodType || 'Hickory';
    const weight = comp.percentage / totalPct;
    const woodData = WOOD_SPECIES_LIBRARY[speciesName] || {
      name: speciesName,
      category: 'Pure Wood Pellets' as const,
      btuPerLb: 8500,
      moisturePercent: 6.5,
      smokeDensity: 'Medium' as const,
      barkImpact: 'Mahogany Bark',
      flavorNotes: 'Standard wood smoke',
      recommendedProteins: ['Beef', 'Pork'],
    };

    // Calculate default cost per lb based on category if comp.costPerLb not specified
    let defaultCompCost = 0.85;
    if (woodData.category === 'Charcoal Pellets') defaultCompCost = 1.15;
    else if (woodData.category === 'Brand & Competition Pellets') defaultCompCost = 0.95;
    else if (woodData.category === 'Pure Wood Species') defaultCompCost = 0.80;

    const effectiveCompCost = comp.costPerLb && comp.costPerLb > 0 ? comp.costPerLb : defaultCompCost;

    totalBtu += weight * woodData.btuPerLb;
    totalMoisture += weight * woodData.moisturePercent;
    totalCost += weight * effectiveCompCost;

    if (comp.percentage >= 10) {
      flavorList.push(`${comp.percentage}% ${woodData.name} (${woodData.flavorNotes})`);
      barkList.push(woodData.barkImpact);
      woodData.recommendedProteins.forEach((p) => proteinSet.add(p));
    }
  });

  const weightedBtuPerLb = Math.round(totalBtu);
  const weightedMoisturePercent = Number(totalMoisture.toFixed(1));
  const weightedCostPerLb = Number(totalCost.toFixed(2));

  // Thermal Burn Efficiency formula:
  const btuBonus = ((weightedBtuPerLb - 8000) / 1000) * 2.5;
  const efficiency = Math.min(97.5, Math.max(78.0, 100 - weightedMoisturePercent * 1.2 + btuBonus));
  const calculatedEfficiencyRating = Number(efficiency.toFixed(1));

  // Burn rate estimation at 225°F:
  const lbsPerHour225 = Number((1.15 * (8500 / weightedBtuPerLb) * (100 / calculatedEfficiencyRating)).toFixed(2));
  const lbsPerHour275 = Number((lbsPerHour225 * 1.35).toFixed(2));
  const lbsPerHour350 = Number((lbsPerHour225 * 1.95).toFixed(2));

  const runTime10Lbs = Number((10 / lbsPerHour225).toFixed(1));
  const costPerBurnHourAt225F = Number((lbsPerHour225 * weightedCostPerLb).toFixed(2));
  const estimatedCostPer10HrCook = Number((10 * lbsPerHour225 * weightedCostPerLb).toFixed(2));
  const estimatedCostPer20LbBag = Number((20 * weightedCostPerLb).toFixed(2));

  const smokeSummary = flavorList.join(' | ') || 'Custom Balanced Wood Blend';
  const barkSummary = Array.from(new Set(barkList)).join(' combined with ') || 'Rich Custom Bark';

  return {
    btuPerLb: weightedBtuPerLb,
    weightedBtuPerLb,
    avgMoisturePct: weightedMoisturePercent,
    weightedMoisturePercent,
    weightedCostPerLb,
    costPerBurnHourAt225F,
    estimatedCostPer10HrCook,
    estimatedCostPer20LbBag,
    efficiencyRating: calculatedEfficiencyRating,
    calculatedEfficiencyRating,
    estimatedRunTimeHoursPer10Lbs: runTime10Lbs,
    estimatedLbsPerHourAt225F: lbsPerHour225,
    estimatedLbsPerHourAt275F: lbsPerHour275,
    estimatedLbsPerHourAt350F: lbsPerHour350,
    smokeProfile: smokeSummary,
    smokeProfileSummary: smokeSummary,
    barkImpact: barkSummary,
    barkImpactSummary: barkSummary,
    recommendedProteinsSummary: Array.from(proteinSet),
  };
}
