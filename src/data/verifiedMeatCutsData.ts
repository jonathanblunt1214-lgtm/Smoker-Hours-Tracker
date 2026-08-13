export interface ConstitutionVerifiedMeatCut {
  id: string;
  name: string;
  aliases: string[];
  proteinGroup: string;
  verificationScope: 'food_safety';
  verifiedClaims: string[];
  safeMinimumInternalTempF: number;
  restTimeMinutes?: number;
  source: {
    publisher: 'USDA Food Safety and Inspection Service';
    title: string;
    url: string;
    sourceType: 'government';
    retrievedAt: string;
  };
  notes: string[];
}

const source = {
  publisher: 'USDA Food Safety and Inspection Service' as const,
  title: 'Safe Minimum Internal Temperature Chart',
  url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart',
  sourceType: 'government' as const,
  retrievedAt: '2026-08-13',
};

export const CONSTITUTION_VERIFIED_MEAT_CUTS: ConstitutionVerifiedMeatCut[] = [
  { id: 'usda-whole-red-meat', name: 'Whole cuts of beef, pork, veal, and lamb', aliases: ['Steaks','Chops','Roasts'], proteinGroup: 'Beef / Pork / Veal / Lamb', verificationScope: 'food_safety', verifiedClaims: ['Minimum internal temperature: 145°F.','Rest at least 3 minutes.'], safeMinimumInternalTempF: 145, restTimeMinutes: 3, source, notes: ['Safety minimum only; BBQ doneness, tenderness, smoke temperature, wrapping, wood pairing, and cook duration are not verified by this record.'] },
  { id: 'usda-ground-meat', name: 'Ground meats', aliases: ['Ground beef','Ground pork','Ground veal','Ground lamb'], proteinGroup: 'Ground Meat', verificationScope: 'food_safety', verifiedClaims: ['Minimum internal temperature: 160°F.'], safeMinimumInternalTempF: 160, source, notes: ['Safety minimum only.'] },
  { id: 'usda-poultry', name: 'All poultry', aliases: ['Chicken','Turkey','Whole bird','Breasts','Legs','Thighs','Wings','Ground poultry','Giblets','Stuffing'], proteinGroup: 'Poultry', verificationScope: 'food_safety', verifiedClaims: ['Minimum internal temperature: 165°F.'], safeMinimumInternalTempF: 165, source, notes: ['Safety minimum only; texture targets may be higher.'] },
  { id: 'usda-fish-shellfish', name: 'Fish and shellfish', aliases: ['Fish','Shellfish','Seafood'], proteinGroup: 'Seafood', verificationScope: 'food_safety', verifiedClaims: ['Minimum internal temperature: 145°F.'], safeMinimumInternalTempF: 145, source, notes: ['Safety minimum only.'] },
  { id: 'usda-uncooked-ham', name: 'Ham, fresh or smoked (uncooked)', aliases: ['Fresh ham','Uncooked smoked ham'], proteinGroup: 'Pork', verificationScope: 'food_safety', verifiedClaims: ['Minimum internal temperature: 145°F.','Rest at least 3 minutes.'], safeMinimumInternalTempF: 145, restTimeMinutes: 3, source, notes: ['Does not apply to reheating fully cooked ham.'] },
  { id: 'usda-leftovers', name: 'Leftovers', aliases: ['Cooked leftovers','Reheated leftovers'], proteinGroup: 'Prepared Food', verificationScope: 'food_safety', verifiedClaims: ['Minimum reheating internal temperature: 165°F.'], safeMinimumInternalTempF: 165, source, notes: ['Reheating safety rule only.'] },
  { id: 'usda-casseroles', name: 'Casseroles', aliases: ['Casserole'], proteinGroup: 'Prepared Food', verificationScope: 'food_safety', verifiedClaims: ['Minimum internal temperature: 165°F.'], safeMinimumInternalTempF: 165, source, notes: ['Safety minimum only.'] },
];

export function findVerifiedMeatSafetyRecord(query: string): ConstitutionVerifiedMeatCut | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  return CONSTITUTION_VERIFIED_MEAT_CUTS.find((record) => [record.name, record.proteinGroup, ...record.aliases].some((term) => q.includes(term.toLowerCase()) || term.toLowerCase().includes(q))) || null;
}
