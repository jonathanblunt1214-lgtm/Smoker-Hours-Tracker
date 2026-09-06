import { VerifiedMeatCut, ProteinType } from '../types';

export type GameSubcategory =
  | 'Cervid (Venison / Elk)'
  | 'Bovid (Bison / Buffalo)'
  | 'Wild Swine (Wild Boar)'
  | 'Upland Birds & Waterfowl'
  | 'Small Mammals (Rabbit)'
  | 'Exotic Game (Bear / Alligator)';

export type BeefSubcategory =
  | 'Brisket & Chuck (BBQ / Braise)'
  | 'Rib & Loin (Steaks & Roasts)'
  | 'Plate & Flank (Fajitas / Skirt)'
  | 'Round & Shank (Slow Cook / Stew)'
  | 'Ground Beef & Burgers';

export type PorkSubcategory =
  | 'Shoulder & Butt (Pulled Pork)'
  | 'Ribs (Baby Back & St. Louis)'
  | 'Loin & Chops'
  | 'Belly & Cured (Bacon / Pork Belly)'
  | 'Ground Pork & Sausage';

export type PoultrySubcategory =
  | 'Whole Bird & Turkey'
  | 'Breasts & Tenderloins'
  | 'Thighs & Drumsticks'
  | 'Wings (High-Heat Smoke)'
  | 'Ground Poultry';

export type LambSubcategory =
  | 'Leg & Shoulder Roasts'
  | 'Chops & Rack of Lamb'
  | 'Shanks & Stew Meat'
  | 'Ground Lamb & Kababs';

export type SeafoodSubcategory =
  | 'Salmon & Fatty Fish'
  | 'White Fish & Fillets'
  | 'Shellfish & Crustaceans'
  | 'Whole Fish / Cedar Plank';

export function determineGameSubcategory(text: string): GameSubcategory {
  const q = text.toLowerCase();
  if (q.includes('bison') || q.includes('buffalo') || q.includes('yak')) {
    return 'Bovid (Bison / Buffalo)';
  }
  if (q.includes('boar') || q.includes('swine') || q.includes('hog') || q.includes('javelina') || q.includes('peccary')) {
    return 'Wild Swine (Wild Boar)';
  }
  if (
    q.includes('duck') ||
    q.includes('goose') ||
    q.includes('pheasant') ||
    q.includes('quail') ||
    q.includes('bird') ||
    q.includes('fowl') ||
    q.includes('grouse') ||
    q.includes('waterfowl') ||
    q.includes('upland')
  ) {
    return 'Upland Birds & Waterfowl';
  }
  if (q.includes('rabbit') || q.includes('hare') || q.includes('squirrel')) {
    return 'Small Mammals (Rabbit)';
  }
  if (
    q.includes('bear') ||
    q.includes('alligator') ||
    q.includes('gator') ||
    q.includes('kangaroo') ||
    q.includes('ostrich')
  ) {
    return 'Exotic Game (Bear / Alligator)';
  }
  return 'Cervid (Venison / Elk)';
}

export function determineBeefSubcategory(text: string): BeefSubcategory {
  const q = text.toLowerCase();
  if (q.includes('ground') || q.includes('burger') || q.includes('patty') || q.includes('meatball')) {
    return 'Ground Beef & Burgers';
  }
  if (q.includes('brisket') || q.includes('chuck') || q.includes('short rib') || q.includes('dino') || q.includes('clod') || q.includes('flat') || q.includes('point')) {
    return 'Brisket & Chuck (BBQ / Braise)';
  }
  if (q.includes('plate') || q.includes('flank') || q.includes('skirt') || q.includes('fajita') || q.includes('hanger') || q.includes('bavette') || q.includes('tri-tip') || q.includes('tritip')) {
    return 'Plate & Flank (Fajitas / Skirt)';
  }
  if (q.includes('round') || q.includes('shank') || q.includes('rump') || q.includes('sirloin tip') || q.includes('ox tail') || q.includes('oxtail')) {
    return 'Round & Shank (Slow Cook / Stew)';
  }
  return 'Rib & Loin (Steaks & Roasts)';
}

export function determinePorkSubcategory(text: string): PorkSubcategory {
  const q = text.toLowerCase();
  if (q.includes('ground') || q.includes('sausage') || q.includes('brat') || q.includes('chorizo') || q.includes('link')) {
    return 'Ground Pork & Sausage';
  }
  if (q.includes('shoulder') || q.includes('butt') || q.includes('boston') || q.includes('picnic') || q.includes('pulled')) {
    return 'Shoulder & Butt (Pulled Pork)';
  }
  if (q.includes('rib') || q.includes('baby back') || q.includes('spare') || q.includes('st. louis') || q.includes('riblet')) {
    return 'Ribs (Baby Back & St. Louis)';
  }
  if (q.includes('belly') || q.includes('bacon') || q.includes('burnt end') || q.includes('pancetta')) {
    return 'Belly & Cured (Bacon / Pork Belly)';
  }
  return 'Loin & Chops';
}

export function determinePoultrySubcategory(text: string): PoultrySubcategory {
  const q = text.toLowerCase();
  if (q.includes('ground') || q.includes('burger') || q.includes('sausage')) {
    return 'Ground Poultry';
  }
  if (q.includes('wing')) {
    return 'Wings (High-Heat Smoke)';
  }
  if (q.includes('thigh') || q.includes('drumstick') || q.includes('leg quarter') || q.includes('dark meat') || q.includes('leg')) {
    return 'Thighs & Drumsticks';
  }
  if (q.includes('breast') || q.includes('tender') || q.includes('white meat') || q.includes('cutlet')) {
    return 'Breasts & Tenderloins';
  }
  return 'Whole Bird & Turkey';
}

export function determineLambSubcategory(text: string): LambSubcategory {
  const q = text.toLowerCase();
  if (q.includes('ground') || q.includes('kabab') || q.includes('kebab') || q.includes('kofta') || q.includes('gyro') || q.includes('burger')) {
    return 'Ground Lamb & Kababs';
  }
  if (q.includes('shank') || q.includes('stew') || q.includes('neck') || q.includes('braise')) {
    return 'Shanks & Stew Meat';
  }
  if (q.includes('rack') || q.includes('chop') || q.includes('cutlet') || q.includes('loin')) {
    return 'Chops & Rack of Lamb';
  }
  return 'Leg & Shoulder Roasts';
}

export function determineSeafoodSubcategory(text: string): SeafoodSubcategory {
  const q = text.toLowerCase();
  if (q.includes('shrimp') || q.includes('prawn') || q.includes('lobster') || q.includes('crab') || q.includes('scallop') || q.includes('clam') || q.includes('oyster') || q.includes('mussel')) {
    return 'Shellfish & Crustaceans';
  }
  if (q.includes('salmon') || q.includes('trout') || q.includes('tuna') || q.includes('mackerel') || q.includes('char')) {
    return 'Salmon & Fatty Fish';
  }
  if (q.includes('whole') || q.includes('plank') || q.includes('snapper') || q.includes('bass')) {
    return 'Whole Fish / Cedar Plank';
  }
  return 'White Fish & Fillets';
}

export function determineProteinType(text: string): ProteinType {
  const q = text.toLowerCase();
  if (
    q.includes('venison') ||
    q.includes('elk') ||
    q.includes('bison') ||
    q.includes('buffalo') ||
    q.includes('boar') ||
    q.includes('duck') ||
    q.includes('pheasant') ||
    q.includes('quail') ||
    q.includes('rabbit') ||
    q.includes('gator') ||
    q.includes('alligator') ||
    q.includes('bear') ||
    q.includes('wild game') ||
    q.includes('game')
  ) {
    return 'Game';
  }
  if (
    q.includes('pork') ||
    q.includes('butt') ||
    q.includes('shoulder') ||
    q.includes('baby back') ||
    q.includes('st. louis') ||
    q.includes('ham') ||
    q.includes('bacon') ||
    q.includes('pork belly') ||
    q.includes('sausage') ||
    q.includes('swine') ||
    q.includes('carnitas')
  ) {
    return 'Pork';
  }
  if (
    q.includes('chicken') ||
    q.includes('poultry') ||
    q.includes('turkey') ||
    q.includes('wings') ||
    q.includes('thigh') ||
    q.includes('drumstick') ||
    q.includes('breast') ||
    q.includes('fowl')
  ) {
    return 'Poultry';
  }
  if (
    q.includes('lamb') ||
    q.includes('mutton')
  ) {
    return 'Lamb';
  }
  if (
    q.includes('fish') ||
    q.includes('salmon') ||
    q.includes('seafood') ||
    q.includes('shrimp') ||
    q.includes('lobster') ||
    q.includes('trout') ||
    q.includes('halibut') ||
    q.includes('tuna') ||
    q.includes('crab')
  ) {
    return 'Seafood';
  }
  return 'Beef';
}

export function determineProteinSubcategory(category: string, text: string): string {
  if (category === 'Beef') return determineBeefSubcategory(text);
  if (category === 'Pork') return determinePorkSubcategory(text);
  if (category === 'Poultry') return determinePoultrySubcategory(text);
  if (category === 'Lamb') return determineLambSubcategory(text);
  if (category === 'Fish/Seafood' || category === 'Seafood') return determineSeafoodSubcategory(text);
  if (category === 'Game' || category === 'Wild Game') return determineGameSubcategory(text);
  return 'General Cuts';
}

export interface ProteinGuide {
  proteinType: string;
  category: 'Beef' | 'Pork' | 'Poultry' | 'Lamb' | 'Fish/Seafood' | 'Game';
  proteinSubcategory?: string;
  gameSubcategory?: GameSubcategory;
  usdaMinSafeF: number;
  usdaNote: string;
  restTimeMinutes?: number;
  regulatoryCitation?: string;
  stallTempF?: number;
  wrapTempF?: number;
  targetFinishF: number;
  bbqTargetRangeF: string;
  donenessLevels: {
    label: string;
    tempF: number;
    description: string;
  }[];
  pitmasterTips: string;
  // Dynamic fields linking to Meat Cut Catalog
  linkedCutId?: string;
  impsCode?: string;
  primalOrigin?: string;
  verifiedStatus?: string;
  visualKeyFeatures?: string[];
  aliases?: string[];
  idealSmokeTempF?: number;
  muscleAnatomy?: string;
  cookingStrategy?: string;
  isCatalogCutLinked?: boolean;
}

export const REGULATORY_SAFETY_STANDARDS = {
  dangerZone: {
    rangeF: '40°F – 140°F (4.4°C – 60.0°C)',
    rule: 'Bacteria multiply rapidly between 40°F and 140°F. Never leave perishable food in the danger zone longer than 2 hours (or 1 hour if ambient temp exceeds 90°F / 32.2°C).',
    citations: ['USDA FSIS Food Safety Directive', 'FDA Food Code §3-501.16']
  },
  hotHolding: {
    minTempF: 135,
    rule: 'Maintain hot-held cooked foods at 135°F (FDA Food Code) or 140°F (USDA FSIS) or higher to prevent bacterial pathogen growth during buffet or catering service.',
    citations: ['FDA Food Code §3-501.16', 'USDA FSIS Guideline for Hot Holding']
  },
  restTime: {
    minutes: 3,
    rule: 'USDA FSIS mandates a 3-minute post-cook thermal rest for whole muscle beef, pork, lamb, and veal cooked to 145°F. Temperature continues to rise during rest while destroying harmful micro-organisms.',
    citations: ['USDA FSIS Compliance Guideline 9 CFR 318.17']
  },
  groundMeatsRule: {
    tempF: 160,
    rule: 'Ground beef, pork, lamb, and veal must reach 160°F (71.1°C) throughout to eliminate surface bacteria distributed during grinding.',
    citations: ['USDA FSIS Ground Meat Safety Standard', 'FDA Food Code §3-401.11']
  },
  poultryRule: {
    tempF: 165,
    rule: 'All poultry (whole birds, breasts, thighs, ground poultry, and stuffing) must reach a minimum internal temperature of 165°F (73.9°C) to eliminate Salmonella and Campylobacter.',
    citations: ['USDA FSIS Poultry Safety Standard 9 CFR 381.150', 'FDA Food Code §3-401.11']
  }
};

export const PROTEIN_SAFETY_AND_COOK_TEMPS: ProteinGuide[] = [
  {
    proteinType: 'Ground Meats (Beef, Pork, Lamb, Veal, Burgers)',
    category: 'Beef',
    usdaMinSafeF: 160,
    usdaNote: 'USDA FSIS & FDA MANDATE: Ground meats must reach 160°F (71.1°C) internal temp to destroy surface pathogens mixed throughout during grinding. Rest time is not required.',
    restTimeMinutes: 0,
    regulatoryCitation: 'USDA FSIS Ground Meat Safety & FDA Food Code §3-401.11',
    targetFinishF: 160,
    bbqTargetRangeF: '160°F - 165°F',
    donenessLevels: [
      { label: 'Unsafe / Below USDA Standard', tempF: 145, description: 'High pathogen risk for ground meats; avoid unless radiation pasteurized.' },
      { label: 'USDA Safe Minimum (Medium Well)', tempF: 160, description: 'Slight pink, fully pasteurized and juicy.' },
      { label: 'Well Done Burger', tempF: 165, description: 'No pink remaining, firm texture.' }
    ],
    pitmasterTips: 'Add 15-20% fat content (80/20 chuck blend) or pan-sear on a griddle at high heat to keep 160°F burgers tender and juicy.'
  },
  {
    proteinType: 'Beef Brisket / Chuck Roast (Low & Slow BBQ)',
    category: 'Beef',
    usdaMinSafeF: 145,
    usdaNote: 'USDA FSIS safe minimum is 145°F (62.8°C) + 3 min rest, but tough BBQ cuts require 198°-205°F to melt collagen into gelatin.',
    restTimeMinutes: 3,
    regulatoryCitation: 'USDA FSIS Directive 9 CFR 318.17',
    stallTempF: 155,
    wrapTempF: 165,
    targetFinishF: 203,
    bbqTargetRangeF: '198°F - 205°F',
    donenessLevels: [
      { label: 'USDA Safe Minimum (3-Min Rest)', tempF: 145, description: 'Pathogen free, but tough and chewy collagen.' },
      { label: 'Collagen Breakdown Begins', tempF: 160, description: 'Stall phase starts; sweat evaporative cooling.' },
      { label: 'Wrap Threshold (Peach Paper)', tempF: 165, description: 'Bark set; wrap to preserve moisture.' },
      { label: 'Probe Tender Finish (Sliced/Pulled)', tempF: 203, description: 'Butter-like probe feel; collagen fully liquid.' }
    ],
    pitmasterTips: 'Pull when thermal probe slides in with zero resistance like warm butter, usually between 202°F and 205°F.'
  },
  {
    proteinType: 'Beef Ribeye / Prime Rib / Tri-Tip / Steaks',
    category: 'Beef',
    usdaMinSafeF: 145,
    usdaNote: 'USDA FSIS & FDA require 145°F + 3 min rest for medium doneness. Reverse sear recommended: pull 10°F below target before high-heat searing.',
    restTimeMinutes: 3,
    regulatoryCitation: 'USDA FSIS & FDA Food Code §3-401.11(A)',
    targetFinishF: 135,
    bbqTargetRangeF: '125°F - 135°F',
    donenessLevels: [
      { label: 'Rare', tempF: 125, description: 'Cool red center, soft texture.' },
      { label: 'Medium Rare (Pitmaster Ideal)', tempF: 135, description: 'Warm pink center, juicy rendered fat.' },
      { label: 'USDA Safe Minimum / Medium', tempF: 145, description: 'Warm pink throughout + 3 min mandatory rest.' },
      { label: 'Well Done', tempF: 160, description: 'Little to no pink, firm.' }
    ],
    pitmasterTips: 'Smoke at 225°F until 120°F internal, then sear over high heat (500°F+) for 2 mins per side.'
  },
  {
    proteinType: 'Pork Shoulder / Boston Butt (Pulled Pork)',
    category: 'Pork',
    usdaMinSafeF: 145,
    usdaNote: 'USDA FSIS updated minimum is 145°F + 3 min rest for pork, but pulled pork requires 203°-208°F for full muscle shredding.',
    restTimeMinutes: 3,
    regulatoryCitation: 'USDA FSIS Revised Pork Guideline (2011)',
    stallTempF: 160,
    wrapTempF: 170,
    targetFinishF: 205,
    bbqTargetRangeF: '200°F - 208°F',
    donenessLevels: [
      { label: 'USDA Minimum Safe (3-Min Rest)', tempF: 145, description: 'Safe for chops/roasts, too tough for pulled pork.' },
      { label: 'Stall Zone', tempF: 160, description: 'Moisture pushes out; temp plateaus.' },
      { label: 'Foil Boat / Wrap', tempF: 170, description: 'Bark locked in; wrap with apple juice/cider vinegar.' },
      { label: 'Competition Shredding', tempF: 205, description: 'Bone pulls out clean without resistance.' }
    ],
    pitmasterTips: 'When the blade bone slides out completely clean with zero pull, it is done.'
  },
  {
    proteinType: 'Pork Spare Ribs / Baby Back Ribs',
    category: 'Pork',
    usdaMinSafeF: 145,
    usdaNote: 'USDA FSIS safe minimum is 145°F + 3 min rest, but ribs achieve fall-off-the-bone tenderness around 195°-202°F.',
    restTimeMinutes: 3,
    regulatoryCitation: 'USDA FSIS Revised Pork Guideline & FDA Food Code',
    wrapTempF: 165,
    targetFinishF: 198,
    bbqTargetRangeF: '195°F - 202°F',
    donenessLevels: [
      { label: 'USDA Safe Minimum', tempF: 145, description: 'Chewy, not tender.' },
      { label: 'Wrap Stage (3-2-1 Method)', tempF: 165, description: 'Wrap with butter, brown sugar, honey.' },
      { label: 'Bend Test Pass', tempF: 198, description: 'Rack cracks slightly when lifted with tongs.' }
    ],
    pitmasterTips: 'Rely on the bend test: pick up rack 1/3 down; if meat cracks visibly on surface, it is ready.'
  },
  {
    proteinType: 'Fresh Sausage (Pork, Beef, Italian, Bratwurst)',
    category: 'Pork',
    usdaMinSafeF: 160,
    usdaNote: 'USDA FSIS mandates 160°F (71.1°C) for fresh beef, pork, or lamb sausages. Fresh poultry sausage requires 165°F (73.9°C).',
    restTimeMinutes: 0,
    regulatoryCitation: 'USDA FSIS Sausage Food Safety Standard 9 CFR 318.17',
    targetFinishF: 160,
    bbqTargetRangeF: '160°F - 165°F',
    donenessLevels: [
      { label: 'Danger Zone', tempF: 140, description: 'Uncooked sausage casing; high pathogen risk.' },
      { label: 'USDA Safe Minimum (Pork/Beef)', tempF: 160, description: 'Juicy, casing snaps crisp, fully cooked.' },
      { label: 'Poultry Sausage Minimum', tempF: 165, description: 'Mandatory safe temp for chicken or turkey sausage.' }
    ],
    pitmasterTips: 'Smoke at low temp (200°-225°F) to prevent casings from bursting and releasing natural fats.'
  },
  {
    proteinType: 'Ham (Pre-Cooked Reheat vs. Fresh Uncured)',
    category: 'Pork',
    usdaMinSafeF: 140,
    usdaNote: 'USDA FSIS: Commercially pre-cooked ham requires reheating to 140°F (60°C). Fresh uncured ham requires 145°F (62.8°C) + 3 min rest.',
    restTimeMinutes: 3,
    regulatoryCitation: 'USDA FSIS Ham Safety Guidelines',
    targetFinishF: 140,
    bbqTargetRangeF: '140°F (Pre-Cooked) / 145°F (Fresh)',
    donenessLevels: [
      { label: 'USDA Pre-Cooked Reheat Target', tempF: 140, description: 'Commercially inspected ham warmed through without drying.' },
      { label: 'USDA Fresh Uncured Ham Minimum', tempF: 145, description: 'Fresh raw ham + 3 minute mandatory thermal rest.' }
    ],
    pitmasterTips: 'Score ham in a 1-inch diamond pattern and glaze during the last 30 minutes of smoking at 300°F.'
  },
  {
    proteinType: 'Poultry: Chicken Breast / Turkey Breast',
    category: 'Poultry',
    usdaMinSafeF: 165,
    usdaNote: 'CRITICAL SAFETY MANDATE: USDA FSIS 9 CFR 381.150 & FDA Food Code mandate 165°F (73.9°C) minimum internal temp for all poultry to eradicate Salmonella.',
    restTimeMinutes: 0,
    regulatoryCitation: 'USDA FSIS Poultry Safety Standard 9 CFR 381.150 & FDA Food Code §3-401.11',
    targetFinishF: 165,
    bbqTargetRangeF: '165°F - 168°F',
    donenessLevels: [
      { label: 'Raw Danger Zone', tempF: 140, description: 'Unsafe to consume; high Salmonella risk.' },
      { label: 'USDA Safe Minimum', tempF: 165, description: 'Juicy, safe, fully pasteurized.' },
      { label: 'Overcooked Breast', tempF: 175, description: 'Dry and stringy.' }
    ],
    pitmasterTips: 'Pull white meat at 162°F and allow carryover cooking to push it to 165°F during 10 min rest.'
  },
  {
    proteinType: 'Poultry: Chicken Thighs / Whole Bird / Wings',
    category: 'Poultry',
    usdaMinSafeF: 165,
    usdaNote: 'USDA FSIS minimum 165°F (73.9°C). Dark meat (thighs, legs, wings) achieves ideal tender texture at 175°-185°F.',
    restTimeMinutes: 0,
    regulatoryCitation: 'USDA FSIS Poultry Directive & FDA Food Code §3-401.11',
    targetFinishF: 178,
    bbqTargetRangeF: '175°F - 185°F',
    donenessLevels: [
      { label: 'USDA Minimum Safe', tempF: 165, description: 'Safe but dark meat can feel slightly rubbery.' },
      { label: 'Ideal Dark Meat Texture', tempF: 178, description: 'Tender connective tissue, crisp skin.' }
    ],
    pitmasterTips: 'Run smoker at 275°-325°F to crisp up chicken skin; low temps (225°F) cause rubbery skin.'
  },
  {
    proteinType: 'Lamb Rack / Leg of Lamb / Chops',
    category: 'Lamb',
    usdaMinSafeF: 145,
    usdaNote: 'USDA FSIS minimum safe temp for lamb cuts is 145°F (62.8°C) + 3 min rest.',
    restTimeMinutes: 3,
    regulatoryCitation: 'USDA FSIS Compliance Guideline & FDA Food Code §3-401.11',
    targetFinishF: 135,
    bbqTargetRangeF: '130°F - 140°F',
    donenessLevels: [
      { label: 'Medium Rare', tempF: 135, description: 'Pink, delicate game flavor.' },
      { label: 'USDA Safe Minimum (Medium)', tempF: 145, description: 'Warm pink + 3 min mandatory rest.' }
    ],
    pitmasterTips: 'Pair with rosemary and garlic rub; smoke with cherry wood for mild sweetness.'
  },
  {
    proteinType: 'Salmon Fillet / Trout / Fish & Seafood',
    category: 'Fish/Seafood',
    usdaMinSafeF: 145,
    usdaNote: 'USDA FSIS & FDA Food Code §3-401.11 require 145°F (62.8°C) or until fish flaking easily with a fork.',
    restTimeMinutes: 0,
    regulatoryCitation: 'FDA Food Code §3-401.11(A)(1) & USDA Seafood Directive',
    targetFinishF: 135,
    bbqTargetRangeF: '130°F - 140°F',
    donenessLevels: [
      { label: 'Medium (Silky)', tempF: 130, description: 'Moist and flaking.' },
      { label: 'USDA Safe / Well Done', tempF: 145, description: 'Fully firm, albacore flaking.' }
    ],
    pitmasterTips: 'Hot-smoke salmon at 180°-200°F over alder wood until white albumin barely begins to bead.'
  },
  {
    proteinType: 'Venison (Deer) / Elk Backstrap & Loin',
    category: 'Game',
    gameSubcategory: 'Cervid (Venison / Elk)',
    usdaMinSafeF: 145,
    usdaNote: 'USDA FSIS recommends 145°F (62.8°C) + 3 min rest for game roasts. Ultra-lean wild game dries out above 135°F.',
    restTimeMinutes: 3,
    regulatoryCitation: 'USDA FSIS Wild Game Guidelines',
    targetFinishF: 132,
    bbqTargetRangeF: '128°F - 135°F',
    donenessLevels: [
      { label: 'Rare', tempF: 125, description: 'Deep red, highly tender.' },
      { label: 'Medium Rare (Pitmaster Choice)', tempF: 132, description: 'Warm crimson center, juicy lean finish.' },
      { label: 'USDA Safe / Medium', tempF: 145, description: 'Loses juiciness quickly due to lack of intramuscular fat.' }
    ],
    pitmasterTips: 'Reverse-sear over oak or hickory. Baste generously with bacon fat or butter to compensate for zero fat marbling.'
  },
  {
    proteinType: 'Venison / Elk Shoulder Roast & Shank (BBQ Pulled Game)',
    category: 'Game',
    gameSubcategory: 'Cervid (Venison / Elk)',
    usdaMinSafeF: 160,
    usdaNote: 'USDA FSIS requires 160°F for ground game, but braised/smoked game shanks finish around 200°F.',
    restTimeMinutes: 0,
    regulatoryCitation: 'USDA FSIS Wild Game Guidelines',
    stallTempF: 155,
    wrapTempF: 165,
    targetFinishF: 200,
    bbqTargetRangeF: '198°F - 203°F',
    donenessLevels: [
      { label: 'USDA Ground/Roast Safe', tempF: 160, description: 'Tough if sliced without braising liquid.' },
      { label: 'Wrap with Beef Stock & Butter', tempF: 165, description: 'Prevent moisture loss in Dutch oven or foil.' },
      { label: 'Shredding Finish', tempF: 200, description: 'Collagen fully melted; easily shredded with forks.' }
    ],
    pitmasterTips: 'Smoke for 2 hours for smoke flavor, then wrap with beef broth, red wine, and butter in a covered foil pan until 200°F.'
  },
  {
    proteinType: 'Wild Boar Roast & Chops',
    category: 'Game',
    gameSubcategory: 'Wild Swine (Wild Boar)',
    usdaMinSafeF: 160,
    usdaNote: 'CRITICAL SAFETY WARNING: USDA FSIS mandates wild boar & wild game pork reach 160°F (71.1°C) to eliminate Trichinella spiralis parasites.',
    restTimeMinutes: 0,
    regulatoryCitation: 'USDA FSIS Parasite Safety Warning & Trichinosis Prevention',
    stallTempF: 155,
    wrapTempF: 165,
    targetFinishF: 160,
    bbqTargetRangeF: '160°F - 165°F (Roasts up to 200°F)',
    donenessLevels: [
      { label: 'Danger Zone (Raw)', tempF: 140, description: 'Unsafe due to trichinosis risk in wild boar.' },
      { label: 'USDA Safe Minimum (Chops)', tempF: 160, description: 'Fully safe, rich nutty pork-like flavor.' },
      { label: 'Pulled Wild Boar (Shoulder)', tempF: 202, description: 'Slow-braised or wrapped shoulder for shredding.' }
    ],
    pitmasterTips: 'Brine wild boar overnight in apple cider and brown sugar to tenderize lean muscular fibers.'
  },
  {
    proteinType: 'Bison / Buffalo Ribeye & Tenderloin',
    category: 'Game',
    gameSubcategory: 'Bovid (Bison / Buffalo)',
    usdaMinSafeF: 145,
    usdaNote: 'USDA FSIS minimum is 145°F + 3 min rest. Bison cooks ~30% faster than beef due to zero fat insulation.',
    restTimeMinutes: 3,
    regulatoryCitation: 'USDA FSIS Commercial Game Directive',
    targetFinishF: 132,
    bbqTargetRangeF: '128°F - 135°F',
    donenessLevels: [
      { label: 'Medium Rare (Peak Flavor)', tempF: 132, description: 'Juicy, rich, naturally sweet red meat.' },
      { label: 'Medium', tempF: 142, description: 'Starts drying out fast.' }
    ],
    pitmasterTips: 'Cook at lower smoker temps (200°-225°F) and pull 5°F earlier than beef steak; rest 10 minutes.'
  },
  {
    proteinType: 'Wild Duck & Goose Breast',
    category: 'Game',
    gameSubcategory: 'Upland Birds & Waterfowl',
    usdaMinSafeF: 165,
    usdaNote: 'USDA FSIS mandates 165°F (73.9°C) for all poultry and game birds to eliminate avian pathogens.',
    restTimeMinutes: 0,
    regulatoryCitation: 'USDA FSIS Game Bird Directive 9 CFR 381.150',
    targetFinishF: 140,
    bbqTargetRangeF: '135°F - 165°F',
    donenessLevels: [
      { label: 'Culinary Medium Rare Breast', tempF: 135, description: 'Rich steak-like texture (Check source).' },
      { label: 'USDA Safe Standard', tempF: 165, description: 'Fully safe for wild game birds.' }
    ],
    pitmasterTips: 'Score the fatty skin in a diamond pattern to render fat crisp before smoking over cherry wood.'
  },
  {
    proteinType: 'Wild Pheasant, Quail & Upland Birds',
    category: 'Game',
    gameSubcategory: 'Upland Birds & Waterfowl',
    usdaMinSafeF: 165,
    usdaNote: 'CRITICAL: 165°F (73.9°C) minimum internal temperature required for safety.',
    restTimeMinutes: 0,
    regulatoryCitation: 'USDA FSIS Game Bird Directive 9 CFR 381.150',
    targetFinishF: 165,
    bbqTargetRangeF: '165°F - 168°F',
    donenessLevels: [
      { label: 'USDA Minimum Safe', tempF: 165, description: 'Safe and juicy if wrapped or basted.' },
      { label: 'Overcooked', tempF: 175, description: 'Extremely dry.' }
    ],
    pitmasterTips: 'Wrap pheasant breasts in bacon or caul fat before smoking at 250°F to lock in natural juices.'
  },
  {
    proteinType: 'Rabbit (Whole / Hind Quarter)',
    category: 'Game',
    gameSubcategory: 'Small Mammals (Rabbit)',
    usdaMinSafeF: 160,
    usdaNote: 'USDA FSIS recommends 160°F (71.1°C) internal temperature for domestic and wild rabbit.',
    restTimeMinutes: 0,
    regulatoryCitation: 'USDA FSIS Rabbit Inspection Guidelines',
    targetFinishF: 160,
    bbqTargetRangeF: '160°F - 165°F',
    donenessLevels: [
      { label: 'USDA Safe Minimum', tempF: 160, description: 'Moist white meat akin to chicken thigh.' },
      { label: 'Braised Tender', tempF: 175, description: 'Fall-off-the-bone tender when braised with wine/stock.' }
    ],
    pitmasterTips: 'Smoke at 225°F until 140°F, then submerge in a butter-herbed bath to finish to 160°F.'
  },
  {
    proteinType: 'Black Bear Roast & Alligator Tail (Exotic Game)',
    category: 'Game',
    gameSubcategory: 'Exotic Game (Bear / Alligator)',
    usdaMinSafeF: 160,
    usdaNote: 'CRITICAL SAFETY MANDATE: Bear meat MUST reach 160°F (71.1°C) to eliminate Trichinella spiralis parasites. Alligator requires 145°F minimum.',
    restTimeMinutes: 0,
    regulatoryCitation: 'USDA FSIS Parasite Warning Directive & FDA Food Code §3-401.11',
    targetFinishF: 160,
    bbqTargetRangeF: '160°F - 165°F (Bear Roast up to 195°F)',
    donenessLevels: [
      { label: 'Reference Minimum (Bear)', tempF: 160, description: 'Reference value only; verify current authoritative wild-game guidance and measure with a calibrated thermometer.' },
      { label: 'BBQ Braised Bear Shoulder', tempF: 195, description: 'Rich, tender pulled roast wrapped in foil with dark beer.' }
    ],
    pitmasterTips: 'Slow-smoke bear shoulder at 225°F until 160°F, then wrap with onion, garlic, and Guinness stout to finish braising.'
  }
];

export interface CutUsdaSafetyCompliance {
  usdaMinSafeF: number;
  restTimeMinutes: number;
  usdaNote: string;
  regulatoryCitation: string;
  dangerZoneWarning: string;
  idealFinishRange: string;
}

/**
 * Calculates USDA food safety, mandatory thermal rest times, and regulatory compliance standards for a Meat Cut.
 */
export function getUsdaSafetyForMeatCut(cut: VerifiedMeatCut): CutUsdaSafetyCompliance {
  let usdaMinSafeF = 145;
  let restTimeMinutes = 3;
  let usdaNote = 'USDA FSIS Standard: Whole muscle cut requires minimum 145°F internal temperature with 3-minute post-cook thermal rest.';
  let regulatoryCitation = 'USDA FSIS Compliance Guideline 9 CFR 318.17';

  if (cut.proteinType === 'Chicken' || cut.proteinType === 'Turkey') {
    usdaMinSafeF = 165;
    restTimeMinutes = 0;
    usdaNote = 'USDA FSIS & FDA MANDATE: All poultry must reach 165°F (73.9°C) internal temp to destroy Salmonella & Campylobacter pathogens.';
    regulatoryCitation = 'USDA FSIS Poultry Safety Standard 9 CFR 381.150';
  } else if (
    cut.proteinType === 'Game' ||
    cut.proteinType === 'Wild Game' ||
    cut.proteinType === 'Venison' ||
    cut.proteinType === 'Elk' ||
    cut.proteinType === 'Bison' ||
    cut.proteinType === 'Bear'
  ) {
    usdaMinSafeF = 160;
    restTimeMinutes = 3;
    usdaNote = 'USDA FSIS Game Meat Standard: Wild/farmed game meats must reach 160°F internal temp to destroy pathogens.';
    regulatoryCitation = 'USDA FSIS Game Safety Standard';
  } else if (cut.proteinType === 'Seafood') {
    usdaMinSafeF = 145;
    restTimeMinutes = 0;
    usdaNote = 'FDA Food Code §3-401.11: Fish & seafood must reach 145°F internal temp until opaque and flaking.';
    regulatoryCitation = 'FDA Food Code §3-401.11';
  } else if (
    cut.name.toLowerCase().includes('ground') ||
    cut.name.toLowerCase().includes('sausage') ||
    cut.name.toLowerCase().includes('burger')
  ) {
    usdaMinSafeF = 160;
    restTimeMinutes = 0;
    usdaNote = 'USDA FSIS Ground Meat Standard: Ground meats must reach 160°F internal temp throughout.';
    regulatoryCitation = 'USDA FSIS Ground Meat Standard';
  }

  const dangerZoneWarning = 'Keep food out of 40°F – 140°F Danger Zone for longer than 2 hours (1 hr over 90°F ambient).';
  const finish = cut.targetInternalTempF || 203;
  const idealFinishRange = `${finish - 5}°F – ${finish + 5}°F`;

  return {
    usdaMinSafeF,
    restTimeMinutes,
    usdaNote,
    regulatoryCitation,
    dangerZoneWarning,
    idealFinishRange,
  };
}

/**
 * Dynamically links & merges the Meat Safety & Target Temps Guide system with the Confirmed Meat Cut Catalog.
 * Ensures that both systems learn, evolve, and grow together seamlessly!
 */
export function getMergedProteinSafetyAndTargetTempsGuides(verifiedCuts: VerifiedMeatCut[] = []): ProteinGuide[] {
  const merged: ProteinGuide[] = [...PROTEIN_SAFETY_AND_COOK_TEMPS];

  if (!verifiedCuts || verifiedCuts.length === 0) {
    return merged;
  }

  verifiedCuts.forEach((cut) => {
    let cat: 'Beef' | 'Pork' | 'Poultry' | 'Lamb' | 'Fish/Seafood' | 'Game' = 'Beef';
    if (cut.proteinType === 'Beef') cat = 'Beef';
    else if (cut.proteinType === 'Pork') cat = 'Pork';
    else if (cut.proteinType === 'Chicken' || cut.proteinType === 'Turkey') cat = 'Poultry';
    else if (cut.proteinType === 'Lamb') cat = 'Lamb';
    else if (cut.proteinType === 'Seafood') cat = 'Fish/Seafood';
    else if (
      cut.proteinType === 'Game' ||
      cut.proteinType === 'Wild Game' ||
      cut.proteinType === 'Venison' ||
      cut.proteinType === 'Elk' ||
      cut.proteinType === 'Bison' ||
      cut.proteinType === 'Bear'
    ) cat = 'Game';

    const compliance = getUsdaSafetyForMeatCut(cut);
    const targetFinishF = cut.targetInternalTempF || 203;
    const isLowSlowToughCut = targetFinishF >= 190;
    const bbqTargetRangeF = compliance.idealFinishRange;

    const stallTempF = isLowSlowToughCut ? 160 : undefined;
    const wrapTempF = isLowSlowToughCut ? 165 : undefined;

    const proteinSubcat = cut.proteinSubcategory || determineProteinSubcategory(cat, cut.name + ' ' + cut.proteinType + ' ' + cut.primalOrigin);
    const gameSubcat = cat === 'Game'
      ? (cut.gameSubcategory as GameSubcategory) || determineGameSubcategory(cut.name + ' ' + cut.proteinType + ' ' + cut.primalOrigin)
      : undefined;

    // Check if an existing guide matches this cut name or primary alias
    const existingIndex = merged.findIndex((g) => {
      const gName = g.proteinType.toLowerCase();
      const cName = cut.name.toLowerCase();
      if (gName.includes(cName) || cName.includes(gName)) return true;
      if (cut.aliases && cut.aliases.some((alias) => gName.includes(alias.toLowerCase()))) return true;
      return false;
    });

    if (existingIndex >= 0) {
      merged[existingIndex] = {
        ...merged[existingIndex],
        proteinSubcategory: merged[existingIndex].proteinSubcategory || proteinSubcat,
        gameSubcategory: merged[existingIndex].gameSubcategory || gameSubcat,
        linkedCutId: cut.id,
        impsCode: cut.impsCode || merged[existingIndex].impsCode,
        primalOrigin: cut.primalOrigin || merged[existingIndex].primalOrigin,
        verifiedStatus: cut.verifiedStatus,
        visualKeyFeatures: cut.visualKeyFeatures,
        aliases: cut.aliases,
        idealSmokeTempF: cut.idealSmokeTempF,
        muscleAnatomy: cut.muscleAnatomy,
        cookingStrategy: cut.cookingStrategy,
        isCatalogCutLinked: true,
      };
    } else {
      const newGuideEntry: ProteinGuide = {
        proteinType: `${cut.name}${cut.impsCode ? ` (${cut.impsCode})` : ''}`,
        category: cat,
        proteinSubcategory: proteinSubcat,
        gameSubcategory: gameSubcat,
        usdaMinSafeF: compliance.usdaMinSafeF,
        usdaNote: compliance.usdaNote,
        restTimeMinutes: compliance.restTimeMinutes,
        regulatoryCitation: compliance.regulatoryCitation,
        stallTempF,
        wrapTempF,
        targetFinishF,
        bbqTargetRangeF,
        donenessLevels: [
          { label: 'USDA Minimum Safe', tempF: compliance.usdaMinSafeF, description: `Pasteurized per ${compliance.regulatoryCitation}.` },
          { label: 'Pitmaster Target Finish', tempF: targetFinishF, description: cut.cookingStrategy || 'Ideal internal thermal finish for maximum tenderness and rendered fat.' },
          { label: 'Overcooked / Dry', tempF: targetFinishF + 10, description: 'Moisture loss accelerates beyond this point.' },
        ],
        pitmasterTips: `🍖 Cooking Strategy: ${cut.cookingStrategy}\n🥩 Subprimal: ${cut.primalOrigin}\n🔍 Key Features: ${cut.visualKeyFeatures.join(', ')}${cut.muscleAnatomy ? `\n🧬 Anatomy: ${cut.muscleAnatomy}` : ''}`,
        linkedCutId: cut.id,
        impsCode: cut.impsCode,
        primalOrigin: cut.primalOrigin,
        verifiedStatus: cut.verifiedStatus,
        visualKeyFeatures: cut.visualKeyFeatures,
        aliases: cut.aliases,
        idealSmokeTempF: cut.idealSmokeTempF,
        muscleAnatomy: cut.muscleAnatomy,
        cookingStrategy: cut.cookingStrategy,
        isCatalogCutLinked: true,
      };
      merged.push(newGuideEntry);
    }
  });

  // Ensure every item in merged guides has a computed proteinSubcategory if not already set
  return merged.map((guide) => ({
    ...guide,
    proteinSubcategory: guide.proteinSubcategory || determineProteinSubcategory(guide.category, guide.proteinType + ' ' + (guide.primalOrigin || '')),
  }));
}

export interface UsdaComplianceAuditReport {
  timestamp: string;
  totalCutsAnalyzed: number;
  compliancePassRatePercent: number;
  verifiedStatus: string;
  proteinCategoryBreakdown: Record<string, number>;
  subcategoryBreakdown: Record<string, Record<string, number>>;
  auditDetails: Array<{
    cutName: string;
    category: string;
    subcategory: string;
    targetTempF: number;
    usdaMinSafeF: number;
    restMinutes: number;
    regulatoryCitation: string;
    isCompliant: boolean;
    parasiteWarning?: string;
  }>;
}

/**
 * Live / Hourly Analysis Engine: Reruns subcategory divider analysis and verifies target temperatures
 * of every cut against USDA • FSIS • FDA Food Safety Standards & Regulatory Compliance.
 */
export function runLiveSubcategoryAndUsdaAnalysis(verifiedCuts: VerifiedMeatCut[] = []): UsdaComplianceAuditReport {
  const mergedGuides = getMergedProteinSafetyAndTargetTempsGuides(verifiedCuts);
  const totalCuts = mergedGuides.length;
  let compliantCount = 0;

  const proteinCategoryBreakdown: Record<string, number> = {};
  const subcategoryBreakdown: Record<string, Record<string, number>> = {};

  const auditDetails = mergedGuides.map((guide) => {
    const category = guide.category;
    const subcat = guide.proteinSubcategory || guide.gameSubcategory || 'General Cuts';

    proteinCategoryBreakdown[category] = (proteinCategoryBreakdown[category] || 0) + 1;
    if (!subcategoryBreakdown[category]) {
      subcategoryBreakdown[category] = {};
    }
    subcategoryBreakdown[category][subcat] = (subcategoryBreakdown[category][subcat] || 0) + 1;

    // Check USDA safe minimum
    const isCompliant = guide.targetFinishF >= guide.usdaMinSafeF;
    if (isCompliant) compliantCount++;

    let parasiteWarning: string | undefined = undefined;
    const nameLower = guide.proteinType.toLowerCase();
    if (
      nameLower.includes('bear') ||
      nameLower.includes('boar') ||
      nameLower.includes('swine') ||
      nameLower.includes('feral')
    ) {
      parasiteWarning = 'MANDATORY USDA PARASITE RULE: Must reach 160°F (71.1°C) internal temp to destroy Trichinella spiralis parasites.';
    }

    return {
      cutName: guide.proteinType,
      category,
      subcategory: subcat,
      targetTempF: guide.targetFinishF,
      usdaMinSafeF: guide.usdaMinSafeF,
      restMinutes: guide.restTimeMinutes || 0,
      regulatoryCitation: guide.regulatoryCitation || 'USDA FSIS Guideline 9 CFR 318.17',
      isCompliant,
      parasiteWarning,
    };
  });

  const compliancePassRatePercent = totalCuts > 0 ? Math.round((compliantCount / totalCuts) * 100) : 0;

  return {
    timestamp: new Date().toISOString(),
    totalCutsAnalyzed: totalCuts,
    compliancePassRatePercent,
    verifiedStatus: 'Internal reference-field completeness check only',
    proteinCategoryBreakdown,
    subcategoryBreakdown,
    auditDetails,
  };
}


