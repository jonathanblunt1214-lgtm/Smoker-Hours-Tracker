import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'src/utils/storage.ts');
const outputPath = path.join(root, 'src/utils/storage.trusted.ts');
let source = fs.readFileSync(sourcePath, 'utf8');

function replaceRange(input, startMarker, endMarker, replacement, label) {
  const start = input.indexOf(startMarker);
  const end = input.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0 || end <= start) throw new Error(`[trusted-storage] Range missing: ${label}`);
  return input.slice(0, start) + replacement + '\n\n' + input.slice(end);
}

source = replaceRange(
  source,
  'export function autoEvolveCharGPTMemory(logs: CookLog[], currentMemory?: CharGPTMemory): CharGPTMemory {',
  'export function loadSmokerProfile(): SmokerProfile {',
  `export function autoEvolveCharGPTMemory(logs: CookLog[], currentMemory?: CharGPTMemory): CharGPTMemory {
  const baseMemory = currentMemory || loadCharGPTMemory();
  return {
    ...baseMemory,
    totalLogsAnalyzed: Array.isArray(logs) ? logs.length : 0,
    learnedRules: [...(baseMemory.learnedRules || [])],
    favoriteProteins: [...(baseMemory.favoriteProteins || [])],
    preferredWoodTypes: [...(baseMemory.preferredWoodTypes || [])],
    topTechniques: [...(baseMemory.topTechniques || [])],
  };
}`,
  'automatic durable CharGPT learning',
);

source = replaceRange(
  source,
  'export function sanitizeAndFillCookLog(c: Partial<CookLog>, index = 0): CookLog {',
  'export function loadCookLogs(): CookLog[] {',
  `export function sanitizeAndFillCookLog(c: Partial<CookLog>, index = 0): CookLog {
  const title = String(c.title || '').trim() || 'Untitled cook';
  const proteinCut = String(c.proteinCut || '').trim() || 'Unknown cut';
  const proteinType = (c.proteinType || 'Other') as ProteinType;
  const hoursLogged = typeof c.hoursLogged === 'number' && Number.isFinite(c.hoursLogged) ? Math.max(0, c.hoursLogged) : 0;
  const startingSmokerHours = typeof c.startingSmokerHours === 'number' && Number.isFinite(c.startingSmokerHours) ? Math.max(0, c.startingSmokerHours) : 0;
  const endingSmokerHours = typeof c.endingSmokerHours === 'number' && Number.isFinite(c.endingSmokerHours)
    ? Math.max(startingSmokerHours, c.endingSmokerHours)
    : startingSmokerHours + hoursLogged;

  return {
    id: c.id || \`cook-\${Date.now()}-\${index}-\${Math.random().toString(36).substring(2, 6)}\`,
    title,
    date: c.date || '',
    pageNumber: c.pageNumber ?? (index + 1),
    proteinType,
    proteinCut,
    meatWeightLbs: typeof c.meatWeightLbs === 'number' && Number.isFinite(c.meatWeightLbs) ? Math.max(0, c.meatWeightLbs) : 0,
    startingSmokerHours,
    hoursLogged,
    endingSmokerHours,
    smokerId: c.smokerId || '',
    smokerType: c.smokerType || ('' as any),
    fuelType: c.fuelType || '',
    fuelLbsConsumed: typeof c.fuelLbsConsumed === 'number' && Number.isFinite(c.fuelLbsConsumed) ? Math.max(0, c.fuelLbsConsumed) : 0,
    seasoningRubs: c.seasoningRubs || '',
    saucesGlazes: c.saucesGlazes || '',
    finishedNotes: c.finishedNotes || '',
    nextTimeNotes: c.nextTimeNotes || '',
    wouldMakeAgain: c.wouldMakeAgain ?? false,
    ratings: c.ratings || { smokeRing: 0, bark: 0, tenderness: 0, overall: 0 },
    weatherConditions: c.weatherConditions || '',
    zipcode: c.zipcode,
    temperatureReadings: Array.isArray(c.temperatureReadings) ? c.temperatureReadings : [],
    status: c.status || ('Draft' as any),
    isPublishedToTotalHours: c.isPublishedToTotalHours ?? false,
    timerSeconds: typeof c.timerSeconds === 'number' && Number.isFinite(c.timerSeconds) ? Math.max(0, c.timerSeconds) : 0,
  };
}`,
  'cook log non-fabricating sanitizer',
);

source = replaceRange(
  source,
  'export const INITIAL_VERIFIED_MEAT_CUTS:',
  'export function loadVerifiedMeatCuts():',
  `export const INITIAL_VERIFIED_MEAT_CUTS: import('../types').VerifiedMeatCut[] = [];
// Food-safety references with source URLs are defined in src/data/verifiedMeatCutsData.ts.`,
  'legacy verified meat defaults',
);

if (source.includes('if (hoursLogged <= 0) hoursLogged = 6.0')) throw new Error('[trusted-storage] fabricated duration fallback remains');
if (source.includes("finishedNotes: c.finishedNotes || 'Excellent smoke ring")) throw new Error('[trusted-storage] fabricated finished notes remain');
if (source.includes("verifiedStatus: 'Global Online Verified'")) throw new Error('[trusted-storage] legacy meat verification remains');

fs.writeFileSync(outputPath, source, 'utf8');
console.log('[trusted-storage] Generated trusted storage without fabricated cook or meat verification defaults.');
