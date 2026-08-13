export const POUNDS_PER_KILOGRAM = 2.2046226218487757;

function positiveFinite(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function calculateCostPerLb(totalPrice: unknown, weightLbs: unknown): number | null {
  const price = positiveFinite(totalPrice);
  const lbs = positiveFinite(weightLbs);
  if (price === null || lbs === null) return null;
  return price / lbs;
}

export function calculateCostPerKg(totalPrice: unknown, weightKg: unknown): number | null {
  const price = positiveFinite(totalPrice);
  const kg = positiveFinite(weightKg);
  if (price === null || kg === null) return null;
  return price / kg;
}

export function costPerLbToKg(costPerLb: unknown): number | null {
  const value = positiveFinite(costPerLb);
  return value === null ? null : value * POUNDS_PER_KILOGRAM;
}

export function costPerKgToLb(costPerKg: unknown): number | null {
  const value = positiveFinite(costPerKg);
  return value === null ? null : value / POUNDS_PER_KILOGRAM;
}

export function poundsToKilograms(weightLbs: unknown): number | null {
  const lbs = positiveFinite(weightLbs);
  return lbs === null ? null : lbs / POUNDS_PER_KILOGRAM;
}

export function kilogramsToPounds(weightKg: unknown): number | null {
  const kg = positiveFinite(weightKg);
  return kg === null ? null : kg * POUNDS_PER_KILOGRAM;
}
