import { SmokerProfile, CookLog, FuelLog } from '../types';

export const INITIAL_SMOKER_PROFILE: SmokerProfile = {
  id: 'smoker-default-1',
  name: '',
  model: '',
  smokerType: '' as any,
  fuelType: '' as any,
  fuelOnHand: '',
  initialHours: 0, // Baseline starting hours
  currentHours: 0, // Clean slate 0 hours for app deployment
  pelletHopperCapacityLbs: 0,
  lastRefillHours: 0,
  maintenanceTasks: [
    {
      id: 'task-1',
      title: 'Clean Firepot Ash & Burn Pot',
      intervalHours: 12,
      lastPerformedHours: 0,
      description: 'Vacuum out ash buildup from burn pot to ensure smooth ignition.',
    },
    {
      id: 'task-2',
      title: 'Scrape Heat Shield & Grease Tray',
      intervalHours: 25,
      lastPerformedHours: 0,
      description: 'Remove grease residue and foil liner from heat deflector.',
    },
    {
      id: 'task-3',
      title: 'Calibrate RTD Temperature Probe',
      intervalHours: 50,
      lastPerformedHours: 0,
      description: 'Test RTD probe accuracy using ice water & boiling water tests.',
    },
    {
      id: 'task-4',
      title: 'Deep Chamber Clean & Door Seal Check',
      intervalHours: 100,
      lastPerformedHours: 0,
      description: 'Scrape interior walls, clean glass door, inspect gasket seal.',
    },
  ],
};

export const INITIAL_FUEL_LOGS: FuelLog[] = [];

export const INITIAL_COOK_LOGS: CookLog[] = [];
