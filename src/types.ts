export type ProteinType =
  | 'Beef'
  | 'Pork'
  | 'Chicken'
  | 'Seafood'
  | 'Turkey'
  | 'Lamb'
  | 'Mutton'
  | 'Poultry'
  | 'Sausage'
  | 'Fish'
  | 'Ribs'
  | 'Pork Chops'
  | 'Salmon'
  | 'Prime Rib'
  | 'Venison'
  | 'Bear'
  | 'Wild Boar'
  | 'Duck'
  | 'Bison'
  | 'Elk'
  | 'Pheasant'
  | 'Rabbit'
  | 'Wild Game'
  | 'Game'
  | 'Other';

export type SmokerType = string;

export interface SmokerMaintenanceTask {
  id: string;
  title: string;
  intervalHours: number;
  lastPerformedHours: number;
  description: string;
}

export type SmokerModCategory =
  | 'Thermal & Insulation'
  | 'Seals & Airflow'
  | 'Electronics & Controllers'
  | 'Capacity & Racks'
  | 'Heat Mass & Distribution'
  | 'Combustion & Fuel';

export interface SmokerModItem {
  id: string;
  name: string;
  category: SmokerModCategory;
  targetSmokerType: 'manufactured' | 'custom' | 'both';
  applicableSmokerTypes?: string[]; // e.g. ['Pellet Smoker / Grill', 'Reverse Flow Offset', 'Insulated Cabinet Smoker']
  description: string;
  burnRateMultiplier: number; // e.g., 0.82 (18% reduction in fuel burn rate)
  thermalEfficiencyBoost: number; // e.g., +0.18 multiplier
  capacityAddLbs: number; // e.g., +18 lbs hopper or charcoal expansion
  cookingAreaAddSqIn: number; // e.g., +350 sq in upper shelf
  tempStabilityDeltaDegrees: number; // e.g., -8°F fluctuation (improves stability)
  heatLossReductionPct: number; // e.g., 25% reduction in heat loss
  estimatedCostRange: string; // e.g., "$30 - $65"
  popularBrandsOrBuilders?: string[]; // e.g., ["Traeger", "Yoder", "Pit Boss", "Camp Chef", "Custom Offsets"]
  difficultyLevel: 'Easy Tap/On' | 'Moderate Bolt-On' | 'Advanced Fabrication';
  benefitsList: string[];
}

export interface AppliedSmokerMod {
  modId: string;
  enabled: boolean;
  notes?: string;
  installedDate?: string;
  customCostPaid?: number;
}

export interface CustomSmokerSpec {
  id: string;
  name: string;
  builderName: string;
  smokerType: string;
  fuelType: 'Pellets' | 'Charcoal' | 'Wood Splits' | 'Electric' | 'Gas';
  metalGauge: string;
  chamberVolumeSqIn: number;
  hopperCapacityLbs: number;
  bowlCapacityLbs?: number;
  baselineBurnRateLbsHr: number;
  draftType: string;
  notes?: string;
  createdAt: string;
  pitmasterAlias?: string;
  isCommunityShared?: boolean;
  appliedModIds?: string[];
  appliedMods?: AppliedSmokerMod[];
}

export interface ManufacturerSmokerSpec {
  id: string;
  brand: string;
  model: string;
  category: string;
  fuelType: 'Pellets' | 'Charcoal' | 'Wood Splits' | 'Electric' | 'Gas';
  factoryBaselineBurnRateLbsHr: number;
  factoryHighHeatBurnRateLbsHr: number;
  hopperCapacityLbs: number;
  bowlCapacityLbs?: number;
  cookingAreaSqIn: number;
  insulationType: string;
  thermalEfficiencyRating: 'Extreme' | 'High' | 'Standard' | 'Moderate';
  controllerType?: string;
  notes?: string;
  createdAt: string;
  pitmasterAlias?: string;
  isVerifiedManufacturerData?: boolean;
  appliedModIds?: string[];
  appliedMods?: AppliedSmokerMod[];
}

export interface SmokerProfile {
  id: string;
  name: string;
  model: string;
  smokerType: SmokerType;
  fuelType: 'Pellets' | 'Charcoal' | 'Wood Splits' | 'Electric' | 'Gas';
  fuelOnHand?: string;
  activeFuelName?: string;
  initialHours: number; // e.g. 148.25 baseline from log sheet
  currentHours: number;
  pelletHopperCapacityLbs: number;
  bowlCapacityLbs?: number;
  charGPTPersona?: string;
  lastRefillHours?: number; // Runtime hours at last hopper refill
  maintenanceTasks: SmokerMaintenanceTask[];
  isCustomBuilt?: boolean;
  customSpecs?: CustomSmokerSpec;
  manufacturerSpecs?: ManufacturerSmokerSpec;
  appliedModIds?: string[];
  appliedMods?: AppliedSmokerMod[];
  activeBlendComponents?: FuelBlendComponent[];
  healthScore?: number; // 0 - 100
  healthScoreBreakdown?: {
    maintenanceScore: number;
    stabilityScore: number;
    efficiencyScore: number;
    ageScore: number;
  };
}

export interface LowPowerModeSettings {
  enabled: boolean;
  reduceAnimations: boolean;
  slowTelemetryPolling: boolean;
  disableGpuBlurEffects: boolean;
  dimBrightnessOnBattery?: boolean;
  raspberryPiMode?: boolean;
  piKioskTouchTargets?: boolean;
  piAggressiveGc?: boolean;
  piFpsLimit?: 30 | 60 | 15;
}

export interface RetailerFuelItem {
  id: string;
  retailerName: 'Home Depot' | "Lowe's" | 'Tractor Supply' | 'Amazon' | 'BBQGuys' | 'Walmart' | 'Academy Sports';
  productTitle: string;
  brand: string;
  category: 'Wood Pellets' | 'Charcoal Pellets' | 'Lump Charcoal' | 'Wood Chunks / Splits';
  bagWeightLbs: number;
  bagPrice: number;
  costPerLb: number;
  isAmazonBestSeller?: boolean;
  rating?: number;
  reviewCount?: number;
  retailerUrl?: string;
  inStock?: boolean;
  lastUpdatedDate: string;
}

export interface CustomFuelBlendPreset {
  id: string;
  title: string;
  brand?: string;
  description: string;
  components: FuelBlendComponent[];
  btuPerLb?: number;
  efficiencyRating?: number;
  costPerLb?: number;
  createdAt?: string;
}

export interface FuelBlendComponent {
  id?: string;
  species?: string;
  woodType?: string;
  percentage: number;
  costPerLb?: number;
  btuPerLb?: number;
  moisturePercent?: number;
  smokeProfile?: string;
}

export interface FuelLog {
  id: string;
  date: string;
  fuelBrand: string;
  woodType: string;
  quantityLbs: number;
  costPerLb: number;
  pricePaid?: number;
  notes?: string;
  userEmail?: string;
  userId?: string;
  // Custom Fuel Blend properties
  isBlend?: boolean;
  blendComponents?: FuelBlendComponent[];
  calculatedBtuPerLb?: number;
  calculatedEfficiencyRating?: number; // e.g. 92.5 (% efficiency)
  estimatedRunTimeHoursPer10Lbs?: number; // e.g. 8.8 hrs
}

export interface ProbeAlertConfig {
  id: string; // 'probe1', 'probe2', 'probe3', 'probe4'
  name: string; // e.g. "Probe 1: Brisket Flat"
  meatName: string; // "Flat"
  currentTemp: number;
  targetTemp: number; // e.g. 203°F
  highAlarmTemp: number; // e.g. 208°F
  lowAlarmTemp: number; // e.g. 140°F
  alarmEnabled: boolean;
  color: string; // CSS color string or hex
}

export interface TemperatureReading {
  id: string;
  time: string; // "0:00", "1:30", "5:00"
  timestampMinutes: number; // for chronological plotting
  targetTemp: number; // °F
  cookingTemp: number; // °F
  meatTemp: number; // °F (Probe 1 / Meat 1)
  meatTemp2?: number; // °F (Probe 2 / Meat 2)
  meatTemp3?: number; // °F (Probe 3 / Meat 3)
  meatTemp4?: number; // °F (Probe 4 / Meat 4)
  ambientTemp: number; // °F
  actionsTaken: string; // e.g. "Started smoker", "Spritzed", "Wrapped in butcher paper"
}

export interface ThermalCurveDataPoint {
  time: string;
  timestampMinutes: number;
  meatTemp: number;
  pitTemp: number;
  targetTemp: number;
  ambientTemp?: number;
  action?: string;
}

export interface ThermalCurveAnalytics {
  startingMeatTempF: number;
  peakMeatTempF: number;
  avgPitTempF: number;
  maxPitTempF: number;
  minPitTempF: number;
  totalCookDurationMinutes: number;
  tempRiseRateFPerHr: number;
  stallDetected: boolean;
  stallRangeF?: string;
  stallDurationMinutes?: number;
  thermalStabilityVarianceF: number;
  thermalStabilityRating: string;
  curveDataPoints: ThermalCurveDataPoint[];
  generatedAt: string;
}

export type StructuredEventType =
  | 'cook_started'
  | 'temperature_reading'
  | 'fuel_added'
  | 'spritz'
  | 'rotate'
  | 'flip'
  | 'wrap'
  | 'unwrap'
  | 'vent_adjustment'
  | 'probe_tender'
  | 'rest_started'
  | 'rest_completed'
  | 'cook_completed'
  | 'user_note'
  | 'custom_event';

export interface StructuredCookEvent {
  id: string;
  timestampMinutes: number;
  time: string;
  type: StructuredEventType;
  label: string;
  detail?: string;
  pitTemp?: number;
  meatTemp?: number;
  fuelLbs?: number;
}

export interface PostCookEvaluation {
  overallScore10?: number; // 1 - 10
  tendernessRating?: 'under' | 'slightly_under' | 'ideal' | 'slightly_over' | 'over';
  barkRating?: 'poor' | 'fair' | 'good' | 'excellent';
  smokeRating?: 'too_light' | 'preferred' | 'too_heavy';
  moistureRating?: 'dry' | 'acceptable' | 'juicy';
  whatToChangeNextTime?: string;
}

export interface CookLog {
  id: string;
  pageNumber?: number; // e.g. Page 48 as seen in prompt sheet
  date: string;
  title: string;
  smokerId: string;
  smokerType: SmokerType | string;
  proteinType: ProteinType;
  proteinCut: string;
  meatWeightLbs?: number;
  meatWeightKg?: number;
  startingSmokerHours: number;
  hoursLogged: number;
  endingSmokerHours: number;
  fuelLbsConsumed: number;
  fuelType: string;
  temperatureReadings: TemperatureReading[];
  seasoningRubs: string;
  saucesGlazes: string;
  wouldMakeAgain: boolean | null; // Yes / No
  ratings: {
    smokeRing: number; // 1-5
    bark: number; // 1-5
    tenderness: number; // 1-5
    overall: number; // 1-5
  };
  zipcode?: string;
  weatherConditions?: string;
  finishedNotes: string;
  nextTimeNotes: string;
  photoUrl?: string;
  photoUrls?: string[];
  status: 'In Progress' | 'Completed' | 'Draft';
  timerSeconds?: number;
  isTimerRunning?: boolean;
  isPublishedToTotalHours?: boolean;
  publishedAt?: string;
  thermalCurveAnalytics?: ThermalCurveAnalytics;
  pitmasterAlias?: string;
  userEmail?: string;
  userId?: string;
  // Lifecycle & Structured Extensions
  targetServingTime?: string; // e.g. "2026-08-13T18:00" or "6:00 PM"
  timelineEvents?: StructuredCookEvent[];
  postCookEvaluation?: PostCookEvaluation;
}

export interface LocalUserProfile {
  id?: string;
  name: string;
  email: string;
  title: string;
  createdAt: string;
  rememberMe?: boolean;
  unitSystem?: 'imperial' | 'metric';
  fuelOnHand?: string;
  rigs?: SmokerProfile[];
  activeRigId?: string;
  charGPTMemory?: CharGPTMemory;
  charGPTLinked?: boolean;
  charGPTProfileId?: string;
  charGPTLinkedAt?: string;
  charGPTAutoSyncMemory?: boolean;
  charGPTPersona?: 'Master Pitmaster' | 'Texas Offset Specialist' | 'Competition BBQ Judge' | 'Thermal Chemist & Science' | 'Kansas City Pit Master';
  charGPTCustomInstructions?: string;
}

export interface OneDriveAccount {
  connected: boolean;
  email: string;
  lastSync: string | null;
  autoSync: boolean;
}

export interface DailyConsumptionSummary {
  date: string;
  totalHours: number;
  totalFuelLbs: number;
  avgPitTemp: number;
  cooksCount: number;
}

export interface SmokerStats {
  totalHoursToDate: number;
  totalFuelLbsAllTime: number;
  totalCooksCompleted: number;
  avgCookDurationHours: number;
  lbsFuelPerHour: number;
  successRatePercent: number;
}

export interface CharGPTRule {
  id: string;
  category: 'preference' | 'technique' | 'rub_recipe' | 'wood_pairing' | 'smoker_quirk' | 'general';
  title: string;
  detail: string;
  source: 'user_taught' | 'auto_analyzed' | 'cook_log_insight';
  createdAt: string;
  confidenceScore?: number;
}

export interface CharGPTMemory {
  totalInteractions: number;
  totalLogsAnalyzed: number;
  userName?: string;
  lastAnalysisText?: string;
  lastAnalysisLogCount?: number;
  lastAnalysisTimestamp?: string;
  learnedRules: CharGPTRule[];
  favoriteProteins: string[];
  preferredWoodTypes: string[];
  topTechniques: string[];
  lastEvolvedAt?: string;
}

export interface UserAchievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface UserPitmasterAccount {
  name: string;
  title: string;
  email?: string;
  xp: number;
  level: number;
  levelTitle: string;
  nextLevelXp: number;
  achievements: UserAchievement[];
  createdAt: string;
  linkedSmokerId?: string;
  linkedSmokerName?: string;
  linkedSmokerModel?: string;
  linkedSmokerType?: string;
  linkedSmokerFuelType?: string;
  linkedSmokerHopperCapacityLbs?: number;
  linkedSmokerTotalHours?: number;
}

export interface GranularDataSharingPermissions {
  shareProteinAndCuts: boolean;        // Meat cuts, primal origins, protein categories
  shareMeatWeightAndDimensions: boolean; // Meat weight (lbs/kg), thickness, bone profile
  shareSmokerSpecsAndMods: boolean;     // Smoker model, custom mods, metal gauge, capacity
  shareFuelAndWoodBlends: boolean;      // Wood species/blend, pellet burn rates, fuel costs
  shareThermalTempCurves: boolean;      // Pit set temps, internal probe readings, stall duration
  shareRatingsAndFlavorScores: boolean;  // Smoke ring, bark rating, tenderness, overall score
  shareWeatherAndLocation: boolean;     // Zipcode, outdoor weather conditions
  shareCustomRubRecipes: boolean;       // Rub seasonings, glazes, mop sauces, notes
  shareCookPhotos: boolean;             // Meat scan photos & cook log photos
}

export interface FederatedLearningConfig {
  enabled: boolean;
  anonymizeData: boolean;
  autoSyncContributions: boolean;
  contributedCount: number;
  lastSyncedAt?: string;
  granularSharing?: GranularDataSharingPermissions;
}

export interface FederatedPoolStats {
  totalContributions: number;
  userContributions?: number;
  proteinsLearned: Record<string, number>;
  topPelletBlends: Array<{
    blend: string;
    rating: number;
    burnEfficiency: string;
    totalCooks: number;
  }>;
  averageStalls: Array<{
    protein: string;
    stallTemp: string;
    avgDurationHrs: number;
  }>;
  federatedAccuracyRating: string;
  lastPoolUpdate: string;
}

export interface VerifiedMeatCut {
  id: string;
  name: string;
  aliases: string[];
  proteinType: ProteinType;
  gameSubcategory?: string;
  proteinSubcategory?: string;
  primalOrigin: string;
  impsCode?: string;
  description: string;
  visualKeyFeatures: string[];
  muscleAnatomy?: string;
  idealSmokeTempF: number;
  targetInternalTempF: number;
  cookingStrategy: string;
  verifiedStatus: 'Local User Confirmed' | 'Global Online Verified' | 'Community Master Cut';
  onlineVerificationDate?: string;
  onlineSourceCitations?: string[];
  samplePhotoUrl?: string;
  userUploadedPhotos?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CutScanResult {
  identifiedCutName: string;
  confidenceScore: number;
  proteinType: ProteinType;
  primalOrigin: string;
  impsCode?: string;
  aliases: string[];
  visualMarkersDetected: string[];
  anatomyDetails: string;
  recommendedCookingStrategy: string;
  idealSmokeTempF: number;
  targetInternalTempF: number;
  matchedDatabaseCutId?: string;
  onlineVerificationDetails?: string;
  isUnknownOrRareCut: boolean;
  explanation: string;
}

