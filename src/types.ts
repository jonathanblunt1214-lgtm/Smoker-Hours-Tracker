export type ProteinType =
  | 'Beef'
  | 'Pork'
  | 'Chicken'
  | 'Seafood'
  | 'Turkey'
  | 'Lamb'
  | 'Venison'
  | 'Bear'
  | 'Wild Boar'
  | 'Duck'
  | 'Bison'
  | 'Elk'
  | 'Pheasant'
  | 'Rabbit'
  | 'Wild Game'
  | 'Other';

export type SmokerType = string;

export interface SmokerMaintenanceTask {
  id: string;
  title: string;
  intervalHours: number;
  lastPerformedHours: number;
  description: string;
}

export interface SmokerProfile {
  id: string;
  name: string;
  model: string;
  smokerType: SmokerType;
  fuelType: 'Pellets' | 'Charcoal' | 'Wood Splits' | 'Electric' | 'Gas';
  fuelOnHand?: string;
  initialHours: number; // e.g. 148.25 baseline from log sheet
  currentHours: number;
  pelletHopperCapacityLbs: number;
  lastRefillHours?: number; // Runtime hours at last hopper refill
  maintenanceTasks: SmokerMaintenanceTask[];
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

export interface CookLog {
  id: string;
  pageNumber?: number; // e.g. Page 48 as seen in prompt sheet
  date: string;
  title: string;
  smokerId: string;
  smokerType: SmokerType | string;
  proteinType: ProteinType;
  proteinCut: string;
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
