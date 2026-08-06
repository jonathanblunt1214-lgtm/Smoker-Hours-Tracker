import { SmokerModItem } from '../types';

export const KNOWN_SMOKER_MODS: SmokerModItem[] = [
  // ==========================================
  // MANUFACTURED SMOKER MODS
  // ==========================================
  {
    id: 'mfg-thermal-blanket',
    name: 'Insulated Thermal Blanket / Winter Jacket',
    category: 'Thermal & Insulation',
    targetSmokerType: 'manufactured',
    applicableSmokerTypes: ['Vertical Pellet Smoker / Grill', 'Pellet Smoker', 'Gravity Feed Charcoal Cabinet'],
    description: 'Custom-fit heavy silicone-coated fiberglass thermal cover wrapped around the cook chamber.',
    burnRateMultiplier: 0.78, // 22% fuel reduction
    thermalEfficiencyBoost: 0.22,
    capacityAddLbs: 0,
    cookingAreaAddSqIn: 0,
    tempStabilityDeltaDegrees: 12, // 12°F reduction in temp fluctuation
    heatLossReductionPct: 35,
    estimatedCostRange: '$65 - $120',
    popularBrandsOrBuilders: ['Traeger', 'Camp Chef', 'Pit Boss', 'Green Mountain Grills', 'Z Grills'],
    difficultyLevel: 'Easy Tap/On',
    benefitsList: [
      'Reduces pellet consumption by 20-30% in cold weather (<50°F)',
      'Maintains consistent pit temp during rain and wind',
      'Protects exterior powder coat finish from thermal degradation'
    ]
  },
  {
    id: 'mfg-lavalock-gasket',
    name: 'High-Temp Lava Lock / Nomex Door Gasket Seal',
    category: 'Seals & Airflow',
    targetSmokerType: 'both',
    description: 'Self-adhesive 500°F+ Nomex fiber tape around cook chamber lid and door perimeters.',
    burnRateMultiplier: 0.88, // 12% fuel reduction
    thermalEfficiencyBoost: 0.12,
    capacityAddLbs: 0,
    cookingAreaAddSqIn: 0,
    tempStabilityDeltaDegrees: 8,
    heatLossReductionPct: 20,
    estimatedCostRange: '$18 - $32',
    popularBrandsOrBuilders: ['Traeger', 'Pit Boss', 'Oklahoma Joe\'s', 'Weber SmokeFire', 'Masterbuilt', 'Custom Offsets'],
    difficultyLevel: 'Easy Tap/On',
    benefitsList: [
      'Stops smoke and heat escaping through door leaks',
      'Stabilizes internal chamber pressure and draft draw',
      'Prevents grease drips on outer cooker frame'
    ]
  },
  {
    id: 'mfg-hopper-topper',
    name: 'Hopper Topper / Pellet Capacity Extension (+20 lbs)',
    category: 'Capacity & Racks',
    targetSmokerType: 'manufactured',
    applicableSmokerTypes: ['Vertical Pellet Smoker / Grill', 'Pellet Smoker'],
    description: 'Heavy gauge steel hopper collar expansion box mounted on top of factory pellet hopper.',
    burnRateMultiplier: 1.0,
    thermalEfficiencyBoost: 0.0,
    capacityAddLbs: 20, // +20 lbs pellet capacity
    cookingAreaAddSqIn: 0,
    tempStabilityDeltaDegrees: 0,
    heatLossReductionPct: 0,
    estimatedCostRange: '$45 - $85',
    popularBrandsOrBuilders: ['Traeger', 'Camp Chef', 'Pit Boss', 'REC TEC / Recteq'],
    difficultyLevel: 'Moderate Bolt-On',
    benefitsList: [
      'Doubles total pellet fuel payload for 16+ hour overnight brisket cooks',
      'Prevents funneling and pellet bridging in auger trough',
      'Allows mixing two pellet varieties in layered hopper tiers'
    ]
  },
  {
    id: 'mfg-heavy-heat-baffle',
    name: 'Heavy-Duty 10-Gauge Lava Lock Heat Deflector / Diffuser',
    category: 'Heat Mass & Distribution',
    targetSmokerType: 'manufactured',
    applicableSmokerTypes: ['Vertical Pellet Smoker / Grill', 'Pellet Smoker'],
    description: 'Replaces flimsy factory drip tray/baffle with 1/8" heavy steel heat equalizer plate above firepot.',
    burnRateMultiplier: 0.92, // 8% fuel savings due to thermal mass
    thermalEfficiencyBoost: 0.10,
    capacityAddLbs: 0,
    cookingAreaAddSqIn: 0,
    tempStabilityDeltaDegrees: 15, // dramatically reduces hot spot variance
    heatLossReductionPct: 15,
    estimatedCostRange: '$55 - $110',
    popularBrandsOrBuilders: ['Traeger', 'Pit Boss', 'Camp Chef', 'Z Grills'],
    difficultyLevel: 'Moderate Bolt-On',
    benefitsList: [
      'Eliminates severe center firepot hot spot',
      'Adds heavy thermal mass for faster recovery after lid openings',
      'Diverts grease flare-ups away from direct fire'
    ]
  },
  {
    id: 'mfg-pid-wifi-controller',
    name: 'Savannah Creek / FireBoard / Flame Boss PID Digital Wi-Fi Retrofit',
    category: 'Electronics & Controllers',
    targetSmokerType: 'both',
    applicableSmokerTypes: ['Vertical Pellet Smoker / Grill', 'Gravity Feed Charcoal Cabinet', 'Drum Smoker'],
    description: 'Precision PID microcontroller with variable speed auger/blower control and multi-probe Wi-Fi sync.',
    burnRateMultiplier: 0.85, // 15% fuel reduction due to minimal temp overshoot
    thermalEfficiencyBoost: 0.15,
    capacityAddLbs: 0,
    cookingAreaAddSqIn: 0,
    tempStabilityDeltaDegrees: 18, // holds pit temp within ±3°F
    heatLossReductionPct: 18,
    estimatedCostRange: '$140 - $280',
    popularBrandsOrBuilders: ['Traeger', 'Pit Boss', 'Masterbuilt', 'Camp Chef', 'Custom Drums'],
    difficultyLevel: 'Moderate Bolt-On',
    benefitsList: [
      'Holds pit temperature within ultra-tight ±3°F range',
      'Prevents massive temperature swings and auger over-feeding',
      'Live cloud telematics and custom probe alarm curves'
    ]
  },
  {
    id: 'mfg-upper-rack-system',
    name: 'Slide-Out Stainless Steel Upper Cooking Shelf Expansion',
    category: 'Capacity & Racks',
    targetSmokerType: 'both',
    description: 'Multi-tier stainless steel slider rack system mounted inside cook chamber.',
    burnRateMultiplier: 1.0,
    thermalEfficiencyBoost: 0.0,
    capacityAddLbs: 0,
    cookingAreaAddSqIn: 380, // +380 sq in cooking grate area
    tempStabilityDeltaDegrees: 0,
    heatLossReductionPct: 0,
    estimatedCostRange: '$85 - $220',
    popularBrandsOrBuilders: ['Yoder Smokers', 'Traeger', 'Camp Chef', 'Oklahoma Joe\'s', 'Pimp My Grill'],
    difficultyLevel: 'Easy Tap/On',
    benefitsList: [
      'Increases usable grate area by 40-60%',
      'Elevates delicate proteins away from direct bottom heat reflector',
      'Smooth roller bearing slides for easy basting and spritzing'
    ]
  },
  {
    id: 'mfg-smokestack-extension',
    name: 'Adjustable Smokestack Damper & Lower Draft Extension',
    category: 'Seals & Airflow',
    targetSmokerType: 'both',
    description: '3" to 4" stainless steel exhaust pipe extension with adjustable top damper cap.',
    burnRateMultiplier: 0.94,
    thermalEfficiencyBoost: 0.08,
    capacityAddLbs: 0,
    cookingAreaAddSqIn: 0,
    tempStabilityDeltaDegrees: 6,
    heatLossReductionPct: 12,
    estimatedCostRange: '$28 - $55',
    popularBrandsOrBuilders: ['Oklahoma Joe\'s', 'Yoder', 'Traeger', 'Pit Boss'],
    difficultyLevel: 'Easy Tap/On',
    benefitsList: [
      'Lowers smoke exit level to force smoke recirculating down over grate level',
      'Increases blue smoke velocity and bark formation',
      'Adjustable damper allows tuning draft pull during windy days'
    ]
  },
  {
    id: 'mfg-grillgrates-panel',
    name: 'Anodized Hard-Coated Aluminum GrillGrate Searing Panels',
    category: 'Heat Mass & Distribution',
    targetSmokerType: 'both',
    description: 'Interlocking raised-rail hard-anodized aluminum panels placed on top of grates.',
    burnRateMultiplier: 0.95,
    thermalEfficiencyBoost: 0.08,
    capacityAddLbs: 0,
    cookingAreaAddSqIn: 0,
    tempStabilityDeltaDegrees: 10,
    heatLossReductionPct: 10,
    estimatedCostRange: '$75 - $160',
    popularBrandsOrBuilders: ['GrillGrate', 'Traeger', 'Green Mountain Grills', 'Weber SmokeFire'],
    difficultyLevel: 'Easy Tap/On',
    benefitsList: [
      'Amplifies surface temperature by +100°F to +150°F for high-heat steak searing',
      'Prevents flare-ups from dripping fats',
      'Flip upside down for a flat-top plancha smashburger surface'
    ]
  },

  // ==========================================
  // CUSTOM SMOKER MODS
  // ==========================================
  {
    id: 'cust-firebrick-lining',
    name: 'Firebox 1.25" High-Density Firebrick Lining',
    category: 'Thermal & Insulation',
    targetSmokerType: 'custom',
    applicableSmokerTypes: ['Reverse Flow Offset', 'Traditional Offset Pipe', 'Custom Builder Pit', 'Insulated Cabinet Smoker'],
    description: 'Floor and lower wall lining of firebox using heavy refractory firebricks embedded in high-temp mortar.',
    burnRateMultiplier: 0.75, // 25% wood/charcoal reduction
    thermalEfficiencyBoost: 0.28,
    capacityAddLbs: 0,
    cookingAreaAddSqIn: 0,
    tempStabilityDeltaDegrees: 22, // massive thermal inertia
    heatLossReductionPct: 40,
    estimatedCostRange: '$40 - $90',
    popularBrandsOrBuilders: ['Custom Handcrafted Offsets', 'Lone Star Grillz', 'Mill Scale', 'Workhorse Pits'],
    difficultyLevel: 'Moderate Bolt-On',
    benefitsList: [
      'Stores massive thermal energy, cutting log splits usage by 25%',
      'Protects bottom steel plate from rust out and direct flame warpage',
      'Keeps firebox coals hot for hours without constant stoking'
    ]
  },
  {
    id: 'cust-tuning-plates',
    name: 'Removable 1/4" Steel Baffle & Sliding Tuning Plates',
    category: 'Heat Mass & Distribution',
    targetSmokerType: 'custom',
    applicableSmokerTypes: ['Traditional Offset Pipe', 'Reverse Flow Offset', 'Custom Builder Pit'],
    description: 'Set of heavy 1/4" steel plates spanning the chamber bottom from firebox opening to stack.',
    burnRateMultiplier: 0.90,
    thermalEfficiencyBoost: 0.12,
    capacityAddLbs: 0,
    cookingAreaAddSqIn: 0,
    tempStabilityDeltaDegrees: 18,
    heatLossReductionPct: 15,
    estimatedCostRange: '$80 - $180',
    popularBrandsOrBuilders: ['Horizon Pits', 'Gator Pit', 'Custom DIY Offsets'],
    difficultyLevel: 'Moderate Bolt-On',
    benefitsList: [
      'Eliminates 50°F+ hot spot near firebox throat',
      'Equalizes chamber temperature within 5°F left-to-right',
      'Acts as a massive radiant heat reservoir'
    ]
  },
  {
    id: 'cust-expanded-metal-basket',
    name: 'Expanded Metal Charcoal & Wood Fire Basket + Ash Drawer',
    category: 'Combustion & Fuel',
    targetSmokerType: 'custom',
    applicableSmokerTypes: ['Traditional Offset Pipe', 'Reverse Flow Offset', 'Ugly Drum Smoker (UDS)', 'Insulated Cabinet Smoker'],
    description: 'Heavy #9 expanded metal mesh fuel box raised 2 inches above bottom plate with removable ash pan.',
    burnRateMultiplier: 0.86, // 14% cleaner burn & fuel savings
    thermalEfficiencyBoost: 0.12,
    capacityAddLbs: 15, // +15 lbs charcoal/split capacity
    cookingAreaAddSqIn: 0,
    tempStabilityDeltaDegrees: 10,
    heatLossReductionPct: 10,
    estimatedCostRange: '$45 - $95',
    popularBrandsOrBuilders: ['Custom Builder Pits', 'UDS Builds', 'Lone Star Grillz'],
    difficultyLevel: 'Moderate Bolt-On',
    benefitsList: [
      'Maximizes 360° airflow around wood logs and lump charcoal',
      'Prevents suffocating coals in accumulated wood ash',
      'Allows easy ash dump without interrupting 12-hour smoke'
    ]
  },
  {
    id: 'cust-double-wall-ceramic-wool',
    name: 'Double-Wall Insulated Firebox Jacket (1" Ceramic Fiber Wool)',
    category: 'Thermal & Insulation',
    targetSmokerType: 'custom',
    applicableSmokerTypes: ['Reverse Flow Offset', 'Traditional Offset Pipe', 'Insulated Cabinet Smoker', 'Custom Builder Pit'],
    description: 'Double steel skin filled with 2400°F rated Kaowool / ceramic fiber insulation around firebox.',
    burnRateMultiplier: 0.70, // 30% reduction in fuel consumption
    thermalEfficiencyBoost: 0.35,
    capacityAddLbs: 0,
    cookingAreaAddSqIn: 0,
    tempStabilityDeltaDegrees: 25,
    heatLossReductionPct: 50,
    estimatedCostRange: '$180 - $450',
    popularBrandsOrBuilders: ['Workhorse Pits', 'Mill Scale', 'Outlaw Smokers', 'Custom Shop'],
    difficultyLevel: 'Advanced Fabrication',
    benefitsList: [
      'Outer skin stays cool to touch, eliminating burn hazard',
      'Cuts fuel split consumption in half during winter sub-zero cooks',
      'Eliminates paint blistering on exterior firebox'
    ]
  },
  {
    id: 'cust-tel-tru-thermometers',
    name: 'Dual Tel-Tru BQ300 Precision Grate-Level Thermometers',
    category: 'Electronics & Controllers',
    targetSmokerType: 'both',
    description: 'Industrial-grade stainless steel bimetal thermometers calibrated to ±1% accuracy installed at grate level.',
    burnRateMultiplier: 0.98,
    thermalEfficiencyBoost: 0.02,
    capacityAddLbs: 0,
    cookingAreaAddSqIn: 0,
    tempStabilityDeltaDegrees: 5,
    heatLossReductionPct: 0,
    estimatedCostRange: '$65 - $110',
    popularBrandsOrBuilders: ['Tel-Tru', 'Custom Offsets', 'Yoder', 'Lone Star Grillz'],
    difficultyLevel: 'Moderate Bolt-On',
    benefitsList: [
      'Provides true cooking grate temperature instead of misleading dome temp',
      'Hermetically sealed anti-fog glass face',
      'Includes re-calibration reset screw'
    ]
  },
  {
    id: 'cust-pit-viper-blower-fan',
    name: 'BBQ Guru Pit Viper 10-50 CFM Forced Air Draft Fan Kit',
    category: 'Electronics & Controllers',
    targetSmokerType: 'custom',
    applicableSmokerTypes: ['Gravity Feed Charcoal Cabinet', 'Ugly Drum Smoker (UDS)', 'Insulated Cabinet Smoker', 'Kamado Ceramic'],
    description: 'Variable-speed damper blower fan mounted on intake valve controlled by digital pit controller.',
    burnRateMultiplier: 0.82, // 18% fuel savings
    thermalEfficiencyBoost: 0.18,
    capacityAddLbs: 0,
    cookingAreaAddSqIn: 0,
    tempStabilityDeltaDegrees: 20,
    heatLossReductionPct: 18,
    estimatedCostRange: '$120 - $220',
    popularBrandsOrBuilders: ['BBQ Guru', 'Flame Boss', 'FireBoard Drive', 'Custom Cabinets'],
    difficultyLevel: 'Moderate Bolt-On',
    benefitsList: [
      'Automates draft control for charcoal cabinet & drum pits',
      'Rapid 60-second temperature recovery after doors open',
      'Prevents oxygen starvation and bitter creosote smoke formation'
    ]
  },
  {
    id: 'cust-multi-drawer-slides',
    name: 'Heavy Steel Multi-Tier Slide-Out Cooking Drawers',
    category: 'Capacity & Racks',
    targetSmokerType: 'custom',
    applicableSmokerTypes: ['Reverse Flow Offset', 'Traditional Offset Pipe', 'Insulated Cabinet Smoker', 'Custom Builder Pit'],
    description: 'Industrial ball-bearing slider drawers holding up to 150 lbs of meat per grate.',
    burnRateMultiplier: 1.0,
    thermalEfficiencyBoost: 0.0,
    capacityAddLbs: 0,
    cookingAreaAddSqIn: 650, // +650 sq in cooking area
    tempStabilityDeltaDegrees: 0,
    heatLossReductionPct: 0,
    estimatedCostRange: '$150 - $380',
    popularBrandsOrBuilders: ['Lone Star Grillz', 'Gator Pit', 'Custom Fabrication'],
    difficultyLevel: 'Advanced Fabrication',
    benefitsList: [
      'Gives full unobstructed access to back corner briskets',
      'Adds massive cooking capacity for commercial catering loads',
      'Heavy duty 12-gauge framing prevents sag under 80 lb briskets'
    ]
  },
  {
    id: 'cust-water-pan-thermal-sink',
    name: 'Integrated Heavy Copper Water Pan & Thermal Mass Bar',
    category: 'Heat Mass & Distribution',
    targetSmokerType: 'both',
    description: 'Removable heavy stainless/copper liquid reservoir mounted in firebox throat.',
    burnRateMultiplier: 0.94,
    thermalEfficiencyBoost: 0.08,
    capacityAddLbs: 0,
    cookingAreaAddSqIn: 0,
    tempStabilityDeltaDegrees: 14,
    heatLossReductionPct: 10,
    estimatedCostRange: '$35 - $75',
    popularBrandsOrBuilders: ['Custom Offsets', 'UDS', 'Weber SmokeMountain', 'Insulated Cabinets'],
    difficultyLevel: 'Easy Tap/On',
    benefitsList: [
      'Adds humidity to promote heavy smoke ring and bark formation',
      'Water acts as a thermal buffer, dampening spike overshoots',
      'Catches grease drippings before burning on bottom plate'
    ]
  }
];

export function getModsBySmokerType(isCustom: boolean): SmokerModItem[] {
  return KNOWN_SMOKER_MODS.filter(
    (mod) => mod.targetSmokerType === 'both' || (isCustom ? mod.targetSmokerType === 'custom' : mod.targetSmokerType === 'manufactured')
  );
}

export function getModById(modId: string): SmokerModItem | undefined {
  return KNOWN_SMOKER_MODS.find((m) => m.id === modId);
}
