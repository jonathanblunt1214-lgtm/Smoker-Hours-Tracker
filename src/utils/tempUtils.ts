export type TempUnit = 'F' | 'C';

export function convertTemp(tempF: number, unit: TempUnit): number {
  if (unit === 'C') {
    return Math.round(((tempF - 32) * 5) / 9);
  }
  return Math.round(tempF);
}

export function formatTemp(tempF: number, unit: TempUnit): string {
  return `${convertTemp(tempF, unit)}°${unit}`;
}

export function convertWeightLbs(lbsValue: number, unit: TempUnit): { value: number; unitStr: string } {
  if (unit === 'C') {
    const kg = lbsValue * 0.45359237;
    const roundedKg = Math.round(kg * 10) / 10;
    return { value: roundedKg, unitStr: 'kg' };
  }
  const roundedLbs = Math.round(lbsValue * 10) / 10;
  return { value: roundedLbs, unitStr: 'lbs' };
}

export function formatFuelOnHandWeight(rawInput: string | number | undefined | null, unit: TempUnit): string {
  const isMetric = unit === 'C';
  if (rawInput === undefined || rawInput === null) {
    return isMetric ? '0 kg' : '0 lbs';
  }
  const str = String(rawInput).trim();
  if (!str) {
    return isMetric ? '0 kg' : '0 lbs';
  }

  // Check if string starts with or contains numeric weight
  const match = str.match(/^([\d.]+)\s*(lbs|lb|kg|kilos|kilograms)?(.*)$/i);
  if (match) {
    const val = parseFloat(match[1]);
    if (isNaN(val)) return str;

    const unitInInput = (match[2] || '').toLowerCase();
    const rest = match[3] ? match[3].trim() : '';

    const isInputKg = unitInInput.includes('kg') || unitInInput.includes('kilo');

    // Calculate base lbs
    const baseLbs = isInputKg ? val * 2.20462262 : val;

    if (isMetric) {
      const kgVal = baseLbs * 0.45359237;
      const nearestInt = Math.round(kgVal);
      let formattedKg: string;
      if (Math.abs(kgVal - nearestInt) < 0.15) {
        formattedKg = nearestInt.toString();
      } else {
        const rounded = Math.round(kgVal * 10) / 10;
        formattedKg = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
      }
      return rest ? `${formattedKg} kg ${rest}` : `${formattedKg} kg`;
    } else {
      const nearestInt = Math.round(baseLbs);
      let formattedLbs: string;
      if (Math.abs(baseLbs - nearestInt) < 0.15) {
        formattedLbs = nearestInt.toString();
      } else {
        const rounded = Math.round(baseLbs * 10) / 10;
        formattedLbs = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
      }
      return rest ? `${formattedLbs} lbs ${rest}` : `${formattedLbs} lbs`;
    }
  }

  return str;
}

