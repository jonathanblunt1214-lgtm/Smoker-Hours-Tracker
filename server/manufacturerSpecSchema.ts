export type KnowledgeEntityType = 'smoker' | 'fuel' | 'blend_component' | 'mod';

export type StructuredMetric = {
  value?: string | number | boolean | null;
  unit?: string | null;
  evidence?: string | null;
  sourceUrl?: string | null;
  status: 'candidate' | 'verified' | 'conflicting' | 'unavailable' | 'user_provided';
};

export type StructuredSpecMap = Record<string, StructuredMetric>;

export const ENTITY_FIELDS: Record<KnowledgeEntityType, Set<string>> = {
  smoker: new Set([
    'brand',
    'model',
    'category',
    'fuelType',
    'factoryBaselineBurnRateLbsHr',
    'factoryHighHeatBurnRateLbsHr',
    'hopperCapacityLbs',
    'bowlCapacityLbs',
    'cookingAreaSqIn',
    'insulationType',
    'thermalEfficiencyRating',
    'controllerType',
    'notes',
  ]),
  fuel: new Set([
    'brand',
    'productName',
    'category',
    'bagWeightLbs',
    'woodSpecies',
    'blendDescription',
    'btuPerLb',
    'moisturePercent',
    'ashPercent',
    'costPerLb',
    'smokeProfile',
    'manufacturerCompatibility',
    'notes',
  ]),
  blend_component: new Set([
    'species',
    'woodType',
    'percentage',
    'costPerLb',
    'btuPerLb',
    'moisturePercent',
    'smokeProfile',
    'notes',
  ]),
  mod: new Set([
    'name',
    'category',
    'targetSmokerType',
    'applicableSmokerTypes',
    'burnRateMultiplier',
    'thermalEfficiencyBoost',
    'capacityAddLbs',
    'cookingAreaAddSqIn',
    'tempStabilityDeltaDegrees',
    'heatLossReductionPct',
    'estimatedCostRange',
    'difficultyLevel',
    'benefitsList',
    'notes',
  ]),
};

export const USER_FILLABLE_FIELDS: Record<KnowledgeEntityType, Set<string>> = {
  smoker: new Set([
    'factoryBaselineBurnRateLbsHr',
    'factoryHighHeatBurnRateLbsHr',
    'hopperCapacityLbs',
    'bowlCapacityLbs',
    'cookingAreaSqIn',
    'insulationType',
    'thermalEfficiencyRating',
    'controllerType',
    'notes',
  ]),
  fuel: new Set([
    'bagWeightLbs',
    'woodSpecies',
    'blendDescription',
    'btuPerLb',
    'moisturePercent',
    'ashPercent',
    'costPerLb',
    'smokeProfile',
    'manufacturerCompatibility',
    'notes',
  ]),
  blend_component: new Set([
    'species',
    'woodType',
    'percentage',
    'costPerLb',
    'btuPerLb',
    'moisturePercent',
    'smokeProfile',
    'notes',
  ]),
  mod: new Set([
    'burnRateMultiplier',
    'thermalEfficiencyBoost',
    'capacityAddLbs',
    'cookingAreaAddSqIn',
    'tempStabilityDeltaDegrees',
    'heatLossReductionPct',
    'estimatedCostRange',
    'difficultyLevel',
    'benefitsList',
    'notes',
  ]),
};

export function isKnowledgeEntityType(value: unknown): value is KnowledgeEntityType {
  return value === 'smoker' || value === 'fuel' || value === 'blend_component' || value === 'mod';
}

export function hasVerifiedMetric(structuredSpecs: unknown, field: string): boolean {
  if (!structuredSpecs || typeof structuredSpecs !== 'object') return false;
  const metric = (structuredSpecs as StructuredSpecMap)[field];
  return !!metric && metric.status === 'verified' && metric.value !== undefined && metric.value !== null && metric.value !== '';
}
