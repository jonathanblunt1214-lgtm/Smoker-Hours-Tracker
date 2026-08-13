import { ProteinType } from '../types';

export interface ExtendedSmokerSpec {
  id: string;
  brandModel: string;
  brand: string;
  model: string;
  category: 'Stick-Burning Offset Wood Smoker' | 'Gas / Propane Smoker' | 'Pellet Smoker / Grill' | 'Charcoal & Kamado Smoker' | 'Electric Cabinet Smoker';
  smokerTypeKey: string;
  fuelType: 'Wood Splits' | 'Gas' | 'Pellets' | 'Charcoal' | 'Electric';
  factoryBaselineBurnRateLbsHr: number; // At 225°F-250°F
  factoryHighHeatBurnRateLbsHr: number; // At 350°F+
  standardCapacityLbs: number; // Capacity in Lbs of wood splits, LP gas tank lbs, or pellet hopper lbs
  fuelUnitLabel: 'Split Wood Logs' | '20lb LP Propane Tank' | 'Hardwood Pellets' | 'Lump Charcoal' | 'Wood Chips';
  secondaryUnitRate?: string; // e.g., "~1.0 split log / 50 mins" or "~0.106 Gallons LP / hr" or "~1.2 lbs pellets / hr"
  cookingAreaSqIn: number;
  insulationType: string;
  thermalEfficiencyRating: 'Extreme' | 'High' | 'Standard' | 'Moderate';
  recommendedWoodPairings: string[];
  recommendedProteins: ProteinType[];
  estimatedCostPerHourAt225F: number; // $ USD / hr
  manufacturerNotes: string;
  keyFeatures: string[];
}

// ============================================================================
// 1. STICK-BURNING SMOKERS DATABASE (OFFSET WOOD SMOKERS & LOG BURNERS)
// ============================================================================
export const STICK_BURNING_SMOKERS_DATABASE: ExtendedSmokerSpec[] = [
  {
    id: 'stick-oklahoma-joe-highland',
    brandModel: "Oklahoma Joe's Highland / Longhorn Reverse Flow Offset",
    brand: "Oklahoma Joe's",
    model: 'Highland / Longhorn Reverse Flow Offset',
    category: 'Stick-Burning Offset Wood Smoker',
    smokerTypeKey: 'Offset Wood Smoker',
    fuelType: 'Wood Splits',
    factoryBaselineBurnRateLbsHr: 2.25, // ~1 split log per 50-60 minutes
    factoryHighHeatBurnRateLbsHr: 4.50,
    standardCapacityLbs: 25, // Wood firebox holding capacity
    fuelUnitLabel: 'Split Wood Logs',
    secondaryUnitRate: '~0.9 split logs / hr (2.25 lbs wood/hr)',
    cookingAreaSqIn: 879,
    insulationType: 'Heavy Gauge Rolled Steel (12-Gauge Body / 10-Gauge Firebox)',
    thermalEfficiencyRating: 'Moderate',
    recommendedWoodPairings: ['Post Oak', 'Hickory', 'Pecan', 'Cherry'],
    recommendedProteins: ['Beef', 'Pork', 'Lamb', 'Bison'],
    estimatedCostPerHourAt225F: 1.35, // ~$1.35/hr based on wood cord prices
    manufacturerNotes: 'Classic offset configuration requiring direct fire management. Uses baffle plates and reverse flow dampers for even heat and rich convective smoke ring development.',
    keyFeatures: [
      'Heavy-gauge steel construction retains deep radiant thermal mass',
      'Reverse flow baffle plate redirects heat and smoke under cooking grates',
      'Damper air control allows fine-tuning firebox draft velocity'
    ]
  },
  {
    id: 'stick-yoder-wichita',
    brandModel: 'Yoder Smokers Wichita / Kingman 20" & 24" Offset',
    brand: 'Yoder Smokers',
    model: 'Wichita / Kingman 20" & 24" Offset',
    category: 'Stick-Burning Offset Wood Smoker',
    smokerTypeKey: 'Offset Wood Smoker',
    fuelType: 'Wood Splits',
    factoryBaselineBurnRateLbsHr: 2.80, // ~1.1 split logs per hour
    factoryHighHeatBurnRateLbsHr: 5.20,
    standardCapacityLbs: 35,
    fuelUnitLabel: 'Split Wood Logs',
    secondaryUnitRate: '~1.1 split logs / hr (2.80 lbs wood/hr)',
    cookingAreaSqIn: 1610,
    insulationType: '1/4" American Steel Plate (6.35mm Heavy Steel)',
    thermalEfficiencyRating: 'High',
    recommendedWoodPairings: ['Post Oak', 'Hickory', 'Mesquite', 'Sugar Maple'],
    recommendedProteins: ['Beef', 'Pork', 'Venison', 'Wild Boar'],
    estimatedCostPerHourAt225F: 1.68,
    manufacturerNotes: 'Handcrafted in Kansas with 1/4-inch heavy steel plate. Holds extreme thermal inertia once saturated, resisting wind and cold ambient weather.',
    keyFeatures: [
      '1/4" heavy steel plate eliminates rapid temperature drops',
      'Counterweight lid with heat-resistant silicone gasket options',
      'Precision tuned draft stack pulls clean blue smoke across brisket'
    ]
  },
  {
    id: 'stick-workhorse-1975',
    brandModel: 'Workhorse Pits 1975 / 1969 Heavy Steel Offset',
    brand: 'Workhorse Pits',
    model: '1975 / 1969 Heavy Steel Offset',
    category: 'Stick-Burning Offset Wood Smoker',
    smokerTypeKey: 'Offset Wood Smoker',
    fuelType: 'Wood Splits',
    factoryBaselineBurnRateLbsHr: 2.65,
    factoryHighHeatBurnRateLbsHr: 4.80,
    standardCapacityLbs: 30,
    fuelUnitLabel: 'Split Wood Logs',
    secondaryUnitRate: '~1.0 split log / hr (2.65 lbs wood/hr)',
    cookingAreaSqIn: 1250,
    insulationType: '3/8" Ultra-Heavy Steel Plate & Insulated Firebox',
    thermalEfficiencyRating: 'Extreme',
    recommendedWoodPairings: ['Post Oak', 'Pecan', 'Red Oak', 'Apple'],
    recommendedProteins: ['Beef', 'Pork', 'Bison', 'Lamb'],
    estimatedCostPerHourAt225F: 1.59,
    manufacturerNotes: 'Engineered using computational fluid dynamics (CFD) for laminar convective air draw. Operates effortlessly on split logs with zero soot buildup.',
    keyFeatures: [
      '3/8" thick firebox wall provides maximum thermal inertia',
      'True convective air draw produces clean, non-bitter smoke bark',
      'Custom slide-out grate system with heavy grease collector'
    ]
  },
  {
    id: 'stick-mill-scale-94',
    brandModel: 'Mill Scale 94 Gallon Texas Offset Smoker',
    brand: 'Mill Scale Metalworks',
    model: '94 Gallon Texas Offset Smoker',
    category: 'Stick-Burning Offset Wood Smoker',
    smokerTypeKey: 'Offset Wood Smoker',
    fuelType: 'Wood Splits',
    factoryBaselineBurnRateLbsHr: 3.20,
    factoryHighHeatBurnRateLbsHr: 6.00,
    standardCapacityLbs: 40,
    fuelUnitLabel: 'Split Wood Logs',
    secondaryUnitRate: '~1.3 split logs / hr (3.20 lbs wood/hr)',
    cookingAreaSqIn: 1850,
    insulationType: '3/8" Seamless Steel Pipe & Full-Length Collector Stack',
    thermalEfficiencyRating: 'High',
    recommendedWoodPairings: ['Post Oak', 'Mesquite', 'Hickory'],
    recommendedProteins: ['Beef', 'Pork', 'Mutton', 'Wild Game'],
    estimatedCostPerHourAt225F: 1.92,
    manufacturerNotes: 'Commercial pit design derived from Central Texas barbecue joints. Fits multiple full packer briskets and pork shoulders simultaneously.',
    keyFeatures: [
      'Central Texas commercial pipe pit drafting geometry',
      'Tel-Tru dual mechanical thermometers at grate level',
      'Extended firebox length accommodates 16" wood logs'
    ]
  },
  {
    id: 'stick-lone-star-2448',
    brandModel: 'Lone Star Grillz 24x48 Offset Wood Smoker',
    brand: 'Lone Star Grillz',
    model: '24x48 Offset Wood Smoker',
    category: 'Stick-Burning Offset Wood Smoker',
    smokerTypeKey: 'Offset Wood Smoker',
    fuelType: 'Wood Splits',
    factoryBaselineBurnRateLbsHr: 2.50,
    factoryHighHeatBurnRateLbsHr: 4.60,
    standardCapacityLbs: 30,
    fuelUnitLabel: 'Split Wood Logs',
    secondaryUnitRate: '~1.0 split log / hr (2.50 lbs wood/hr)',
    cookingAreaSqIn: 1400,
    insulationType: '1/4" Plate Steel with Optional Insulated Firebox',
    thermalEfficiencyRating: 'High',
    recommendedWoodPairings: ['Post Oak', 'Pecan', 'Hickory', 'Cherry'],
    recommendedProteins: ['Beef', 'Pork', 'Turkey', 'Chicken'],
    estimatedCostPerHourAt225F: 1.50,
    manufacturerNotes: 'Heavy 1/4" steel body with adjustable tuning plates. Maintains precise 225°F-275°F pit temperatures on split logs with minimal adjustment.',
    keyFeatures: [
      'Removable tuning plates for balanced heat across main chamber',
      'Brass ball valve drain system for easy grease management',
      'Heavy wood rack storage tray underneath'
    ]
  },
  {
    id: 'stick-horizon-20rd',
    brandModel: 'Horizon 20" RD Special Marshal Offset',
    brand: 'Horizon Smokers',
    model: '20" RD Special Marshal Offset',
    category: 'Stick-Burning Offset Wood Smoker',
    smokerTypeKey: 'Offset Wood Smoker',
    fuelType: 'Wood Splits',
    factoryBaselineBurnRateLbsHr: 2.40,
    factoryHighHeatBurnRateLbsHr: 4.40,
    standardCapacityLbs: 25,
    fuelUnitLabel: 'Split Wood Logs',
    secondaryUnitRate: '~0.9 split logs / hr (2.40 lbs wood/hr)',
    cookingAreaSqIn: 1100,
    insulationType: '1/4" Structural Steel Pipe',
    thermalEfficiencyRating: 'High',
    recommendedWoodPairings: ['Post Oak', 'Apple', 'Hickory'],
    recommendedProteins: ['Beef', 'Pork', 'Poultry'],
    estimatedCostPerHourAt225F: 1.44,
    manufacturerNotes: 'Built from structural steel pipe. Features a convection plate that distributes heat and smoke evenly while protecting meat from flame spikes.',
    keyFeatures: [
      'Seamless pipe construction prevents structural heat warping',
      'Factory-installed heat deflector plate',
      'Heavy fire grate handles high temperature embers'
    ]
  }
];

// ============================================================================
// 2. PROPANE & GAS SMOKERS DATABASE (LP GAS VERTICAL & CABINET SMOKERS)
// ============================================================================
export const PROPANE_GAS_SMOKERS_DATABASE: ExtendedSmokerSpec[] = [
  {
    id: 'gas-camp-chef-smoke-vault-24',
    brandModel: 'Camp Chef Smoke Vault 24" / 18" Propane Smoker',
    brand: 'Camp Chef',
    model: 'Smoke Vault 24" / 18" Propane Smoker',
    category: 'Gas / Propane Smoker',
    smokerTypeKey: 'Gas / Propane Smoker',
    fuelType: 'Gas',
    factoryBaselineBurnRateLbsHr: 0.45, // ~0.106 Gallons LP / hr (~44 hrs runtime on 20lb LP tank)
    factoryHighHeatBurnRateLbsHr: 1.10,
    standardCapacityLbs: 20, // Standard 20lb LP Gas Tank capacity
    fuelUnitLabel: '20lb LP Propane Tank',
    secondaryUnitRate: '~0.106 Gal LP / hr (0.45 lbs LP/hr)',
    cookingAreaSqIn: 900,
    insulationType: 'Heavy Metal Cabinet with Adjustable Chimney Damper',
    thermalEfficiencyRating: 'High',
    recommendedWoodPairings: ['Hickory Chunks', 'Post Oak Chunks', 'Apple Chunks', 'Pecan Chunks'],
    recommendedProteins: ['Pork', 'Poultry', 'Seafood', 'Beef'],
    estimatedCostPerHourAt225F: 0.52, // ~$0.52/hr LP Gas cost based on $22 tank refill
    manufacturerNotes: '18,000 BTU/hr heavy brass burner with needle valve adjustment. Includes heavy cast iron wood chip tray and porcelain water pan.',
    keyFeatures: [
      '18,000 BTU high-output cast iron LP gas burner',
      'Heavy cast iron wood chunk tray yields clean wood smoke',
      'Runs up to 44 continuous hours on a single 20lb propane tank'
    ]
  },
  {
    id: 'gas-masterbuilt-thermotemp-40',
    brandModel: 'Masterbuilt ThermoTemp 40" Propane Smoker',
    brand: 'Masterbuilt',
    model: 'ThermoTemp 40" Propane Smoker',
    category: 'Gas / Propane Smoker',
    smokerTypeKey: 'Gas / Propane Smoker',
    fuelType: 'Gas',
    factoryBaselineBurnRateLbsHr: 0.40, // ~0.094 Gallons LP / hr (~50 hrs runtime on 20lb LP tank)
    factoryHighHeatBurnRateLbsHr: 0.95,
    standardCapacityLbs: 20,
    fuelUnitLabel: '20lb LP Propane Tank',
    secondaryUnitRate: '~0.094 Gal LP / hr (0.40 lbs LP/hr)',
    cookingAreaSqIn: 1080,
    insulationType: 'Thermostat Controlled Dual-Wall Cabinet',
    thermalEfficiencyRating: 'Extreme',
    recommendedWoodPairings: ['Cherry Chunks', 'Hickory Chunks', 'Pecan Chunks'],
    recommendedProteins: ['Pork', 'Chicken', 'Turkey', 'Sausage'],
    estimatedCostPerHourAt225F: 0.46,
    manufacturerNotes: 'Patent-pending thermostat safety sensor regulates burner gas valve to maintain precise target pit temperature automatically without dial tweaking.',
    keyFeatures: [
      'Thermostatic dial automatically regulates propane burner flame',
      'Dual door design allows restocking wood chunks without losing chamber heat',
      'Safety auto-shutoff valve if burner flame extinguishes'
    ]
  },
  {
    id: 'gas-dyna-glo-36-lp',
    brandModel: 'Dyna-Glo 36" Vertical LP Gas Smoker',
    brand: 'Dyna-Glo',
    model: '36" Vertical LP Gas Smoker',
    category: 'Gas / Propane Smoker',
    smokerTypeKey: 'Gas / Propane Smoker',
    fuelType: 'Gas',
    factoryBaselineBurnRateLbsHr: 0.50, // ~0.118 Gallons LP / hr (~40 hrs runtime on 20lb tank)
    factoryHighHeatBurnRateLbsHr: 1.20,
    standardCapacityLbs: 20,
    fuelUnitLabel: '20lb LP Propane Tank',
    secondaryUnitRate: '~0.118 Gal LP / hr (0.50 lbs LP/hr)',
    cookingAreaSqIn: 784,
    insulationType: 'Double-Door Powder Coated Steel Cabinet',
    thermalEfficiencyRating: 'Standard',
    recommendedWoodPairings: ['Mesquite Chunks', 'Hickory Chunks', 'Apple Chunks'],
    recommendedProteins: ['Beef', 'Pork', 'Poultry', 'Fish'],
    estimatedCostPerHourAt225F: 0.58,
    manufacturerNotes: 'Dual cast-iron burners generating 20,000 BTU/hr total output. Electronic push-button ignition for reliable startups.',
    keyFeatures: [
      '20,000 BTU total capacity across dual stainless steel burners',
      'Porcelain-enameled steel wood chip box with lid',
      'Compact vertical footprint fits easily on residential patios'
    ]
  },
  {
    id: 'gas-pit-boss-vertical-gas',
    brandModel: 'Pit Boss Vertical LP Gas Smoker',
    brand: 'Pit Boss',
    model: 'Vertical LP Gas Smoker',
    category: 'Gas / Propane Smoker',
    smokerTypeKey: 'Gas / Propane Smoker',
    fuelType: 'Gas',
    factoryBaselineBurnRateLbsHr: 0.48,
    factoryHighHeatBurnRateLbsHr: 1.15,
    standardCapacityLbs: 20,
    fuelUnitLabel: '20lb LP Propane Tank',
    secondaryUnitRate: '~0.113 Gal LP / hr (0.48 lbs LP/hr)',
    cookingAreaSqIn: 880,
    insulationType: 'Dual Valve Gas Cabinet with Glass View Window',
    thermalEfficiencyRating: 'High',
    recommendedWoodPairings: ['Post Oak Chunks', 'Pecan Chunks', 'Cherry Chunks'],
    recommendedProteins: ['Pork', 'Beef', 'Chicken', 'Ribs'],
    estimatedCostPerHourAt225F: 0.55,
    manufacturerNotes: 'Dual burner controls allow separate management of smoker temperature and wood chunk smolder box.',
    keyFeatures: [
      'High-temp viewing glass door to inspect cook progress',
      'Dual burner controls for independent heat and smoke management',
      'Large front-access porcelain water pan'
    ]
  },
  {
    id: 'gas-cuisinart-cos244',
    brandModel: 'Cuisinart COS-244 Vertical Propane Smoker',
    brand: 'Cuisinart',
    model: 'COS-244 Vertical Propane Smoker',
    category: 'Gas / Propane Smoker',
    smokerTypeKey: 'Gas / Propane Smoker',
    fuelType: 'Gas',
    factoryBaselineBurnRateLbsHr: 0.38, // ~0.089 Gallons LP / hr (~52 hrs runtime on 20lb tank)
    factoryHighHeatBurnRateLbsHr: 0.85,
    standardCapacityLbs: 20,
    fuelUnitLabel: '20lb LP Propane Tank',
    secondaryUnitRate: '~0.089 Gal LP / hr (0.38 lbs LP/hr)',
    cookingAreaSqIn: 542,
    insulationType: 'Tight Seal Steel Cabinet with Twist Latch',
    thermalEfficiencyRating: 'High',
    recommendedWoodPairings: ['Apple Chunks', 'Maple Chunks', 'Hickory Chunks'],
    recommendedProteins: ['Chicken', 'Pork Chops', 'Seafood', 'Sausage'],
    estimatedCostPerHourAt225F: 0.44,
    manufacturerNotes: '12,000 BTU stainless steel burner optimized for low fuel consumption and tight temperature maintenance in compact backyards.',
    keyFeatures: [
      '12,000 BTU energy-efficient burner consumes under 0.4 lbs LP per hour',
      'Compact footprint with 4 chrome-plated cooking racks',
      'Easy twist-lock door handle keeps heat sealed tight'
    ]
  }
];

// ============================================================================
// 3. PELLET SMOKERS DATABASE (VERTICAL & HORIZONTAL PELLET SMOKERS & GRILLS)
// ============================================================================
export const PELLET_SMOKERS_DATABASE: ExtendedSmokerSpec[] = [
  {
    id: 'pellet-pit-boss-copperhead-5',
    brandModel: 'Pit Boss Copperhead 5-Series / Vertical Series',
    brand: 'Pit Boss',
    model: 'Copperhead 5-Series Vertical Pellet Smoker',
    category: 'Pellet Smoker / Grill',
    smokerTypeKey: 'Vertical Pellet Smoker',
    fuelType: 'Pellets',
    factoryBaselineBurnRateLbsHr: 1.00, // ~1 lb/hr at 225°F
    factoryHighHeatBurnRateLbsHr: 2.20,
    standardCapacityLbs: 60, // Massive 60lb hopper
    fuelUnitLabel: 'Hardwood Pellets',
    secondaryUnitRate: '~1.0 lb pellets / hr (60 hr max runtime)',
    cookingAreaSqIn: 1657,
    insulationType: 'Double-Wall Insulated Cabinet with Cold Weather Door Seal',
    thermalEfficiencyRating: 'High',
    recommendedWoodPairings: ['Competition Blend', 'Post Oak', 'Hickory', 'Pecan'],
    recommendedProteins: ['Pork', 'Beef', 'Chicken', 'Turkey', 'Ribs'],
    estimatedCostPerHourAt225F: 0.90, // ~$0.90/hr pellet fuel cost
    manufacturerNotes: 'Vertical cabinet retains heat efficiently due to top gravity drafting and double-wall door seals. Holds 60 lbs of hardwood pellets for 50+ hour cooks without refilling.',
    keyFeatures: [
      '60 lb hopper capacity provides industry-leading continuous runtime',
      'Double-wall insulated cabinet holds set point in freezing weather',
      'Large clear viewing window and porcelain-coated rack system'
    ]
  },
  {
    id: 'pellet-traeger-pro-ironwood',
    brandModel: 'Traeger Pro / Ironwood / Timberline Series',
    brand: 'Traeger',
    model: 'Pro / Ironwood / Timberline Series',
    category: 'Pellet Smoker / Grill',
    smokerTypeKey: 'Horizontal Pellet Grill / Smoker',
    fuelType: 'Pellets',
    factoryBaselineBurnRateLbsHr: 1.50,
    factoryHighHeatBurnRateLbsHr: 3.00,
    standardCapacityLbs: 20,
    fuelUnitLabel: 'Hardwood Pellets',
    secondaryUnitRate: '~1.5 lbs pellets / hr (13.3 hr max runtime)',
    cookingAreaSqIn: 885,
    insulationType: 'Double-Wall Sidewall Insulation & Downdraft Exhaust System',
    thermalEfficiencyRating: 'Standard',
    recommendedWoodPairings: ['Signature Blend', 'Hickory', 'Apple', 'Cherry'],
    recommendedProteins: ['Pork', 'Beef', 'Poultry', 'Seafood'],
    estimatedCostPerHourAt225F: 1.35,
    manufacturerNotes: 'D2 Direct Drive drivetrain with WiFIRE wireless control. Downdraft exhaust circulates blue smoke evenly before venting.',
    keyFeatures: [
      'D2 Direct Drive brushless motor for rapid auger feed recovery',
      'WiFIRE Wi-Fi controller with multi-probe monitoring',
      'Super Smoke Mode boosts wood smoke density between 165°F-225°F'
    ]
  },
  {
    id: 'pellet-camp-chef-woodwind-pro',
    brandModel: 'Camp Chef Woodwind Pro 24 / 36 & SmokePro',
    brand: 'Camp Chef',
    model: 'Woodwind Pro 24 / 36',
    category: 'Pellet Smoker / Grill',
    smokerTypeKey: 'Pellet Smoker / Grill',
    fuelType: 'Pellets',
    factoryBaselineBurnRateLbsHr: 1.25,
    factoryHighHeatBurnRateLbsHr: 2.50,
    standardCapacityLbs: 22,
    fuelUnitLabel: 'Hardwood Pellets',
    secondaryUnitRate: '~1.25 lbs pellets / hr (17.6 hr max runtime)',
    cookingAreaSqIn: 1236,
    insulationType: 'Insulated Lid & PID Gen 3 Controller with Smoke Box',
    thermalEfficiencyRating: 'High',
    recommendedWoodPairings: ['Fruitwood Blend', 'Charcoal Pellets', 'Oak', 'Hickory Chunks'],
    recommendedProteins: ['Pork', 'Beef', 'Chicken', 'Salmon'],
    estimatedCostPerHourAt225F: 1.12,
    manufacturerNotes: 'Features dedicated Smoke Box for adding real hardwood splits or wood chunks alongside hardwood pellets for authentic stick-burner smoke profiles.',
    keyFeatures: [
      'Smoke Box allows adding real wood split chunks directly over pellet firepot',
      'PID Gen 3 controller with 1-10 customizable smoke settings',
      'Ash Cleanout System allows dumping burn pot ash in seconds'
    ]
  },
  {
    id: 'pellet-yoder-ys640s',
    brandModel: 'Yoder Smokers YS640s / YS1500s Pellet Grill',
    brand: 'Yoder Smokers',
    model: 'YS640s / YS1500s Pellet Grill',
    category: 'Pellet Smoker / Grill',
    smokerTypeKey: 'Pellet Smoker / Grill',
    fuelType: 'Pellets',
    factoryBaselineBurnRateLbsHr: 1.80,
    factoryHighHeatBurnRateLbsHr: 3.80,
    standardCapacityLbs: 20,
    fuelUnitLabel: 'Hardwood Pellets',
    secondaryUnitRate: '~1.8 lbs pellets / hr (11.1 hr max runtime)',
    cookingAreaSqIn: 1070,
    insulationType: '10-Gauge Steel Body & 12-Gauge Lid (Heavy Commercial Steel)',
    thermalEfficiencyRating: 'Extreme',
    recommendedWoodPairings: ['Post Oak Pellets', 'Hickory Pellets', 'Pecan Pellets'],
    recommendedProteins: ['Beef', 'Pork', 'Prime Rib', 'Bison'],
    estimatedCostPerHourAt225F: 1.62,
    manufacturerNotes: 'Built like a tank with 10-gauge steel in Kansas. FireBoard Wi-Fi cloud technology built directly into the control panel.',
    keyFeatures: [
      '10-gauge heavy steel construction provides unmatched durability',
      'Integrated FireBoard Wi-Fi controller with Bluetooth & cloud sync',
      'Variable displacement damper for direct flame searing up to 700°F'
    ]
  },
  {
    id: 'pellet-recteq-flagship-1100',
    brandModel: 'Recteq Flagship 1100 / RT-700 Bull',
    brand: 'Recteq',
    model: 'Flagship 1100 / RT-700 Bull',
    category: 'Pellet Smoker / Grill',
    smokerTypeKey: 'Pellet Smoker / Grill',
    fuelType: 'Pellets',
    factoryBaselineBurnRateLbsHr: 1.20,
    factoryHighHeatBurnRateLbsHr: 2.60,
    standardCapacityLbs: 40,
    fuelUnitLabel: 'Hardwood Pellets',
    secondaryUnitRate: '~1.2 lbs pellets / hr (33.3 hr max runtime)',
    cookingAreaSqIn: 1100,
    insulationType: '304 Stainless Steel Firepot & Chamber Shell',
    thermalEfficiencyRating: 'High',
    recommendedWoodPairings: ['Ultimate Blend', 'Hickory', 'Mesquite', 'Apple'],
    recommendedProteins: ['Pork', 'Beef', 'Chicken', 'Turkey'],
    estimatedCostPerHourAt225F: 1.08,
    manufacturerNotes: '304 stainless steel interior components and massive 40 lb rear hopper. PID algorithm holds pit temp within 1°F precision.',
    keyFeatures: [
      '40 lb hopper capacity provides 30+ hours of continuous runtime',
      '304 stainless steel firepot, drip pan, and grate hardware',
      'Dual Wi-Fi PID controller with lifetime support'
    ]
  }
];

// Combined All Smokers Database
export const ALL_SMOKERS_DATABASE: ExtendedSmokerSpec[] = [
  ...STICK_BURNING_SMOKERS_DATABASE,
  ...PROPANE_GAS_SMOKERS_DATABASE,
  ...PELLET_SMOKERS_DATABASE,
];

/**
 * Utility lookup helper function to get smoker specification by ID or matching query
 */
export function findSmokerSpecInDatabase(
  smokerName: string,
  smokerModel: string,
  smokerType: string
): ExtendedSmokerSpec {
  const query = `${smokerName} ${smokerModel} ${smokerType}`.toLowerCase();

  // 1. Direct query matching
  const directMatch = ALL_SMOKERS_DATABASE.find((s) => {
    const specStr = `${s.brandModel} ${s.brand} ${s.model} ${s.category} ${s.smokerTypeKey}`.toLowerCase();
    return specStr.includes(query) || query.includes(s.brand.toLowerCase()) || query.includes(s.model.toLowerCase());
  });

  if (directMatch) return directMatch;

  // 2. Category matching
  if (query.includes('stick') || query.includes('offset') || query.includes('wood split') || query.includes('log')) {
    return STICK_BURNING_SMOKERS_DATABASE[0];
  }
  if (query.includes('gas') || query.includes('propane') || query.includes('lp') || query.includes('vault')) {
    return PROPANE_GAS_SMOKERS_DATABASE[0];
  }

  // Default fallback to Vertical Pellet Smoker
  return PELLET_SMOKERS_DATABASE[0];
}
