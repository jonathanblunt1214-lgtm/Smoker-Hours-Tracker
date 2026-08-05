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
