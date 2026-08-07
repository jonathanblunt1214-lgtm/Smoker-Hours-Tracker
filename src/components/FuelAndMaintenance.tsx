import React, { useState } from 'react';
import { SmokerProfile, FuelLog, CookLog, FuelBlendComponent, CustomFuelBlendPreset, RetailerFuelItem } from '../types';
import { loadSavedFuelPresets, saveSavedFuelPresets } from '../utils/storage';
import { TOP_RETAILER_FUEL_PRICES } from '../data/fuelPriceData';
import { getManufacturerSpecs, calculateRefillPelletUsage, calculateBurnEfficiencySync } from '../utils/smokerManufacturerData';
import { getEffectiveSmokerSpecs } from '../utils/smokerCalculations';
import { calculateBlendPhysics, AVAILABLE_WOOD_SPECIES, WOOD_SPECIES_LIBRARY, PELLET_CATEGORIES_GROUPED } from '../utils/fuelBlendPhysics';
import { SmokerModManager } from './SmokerModManager';
import { FuelDatabaseExplorer } from './FuelDatabaseExplorer';
import { Wrench, CheckCircle2, AlertTriangle, Flame, Plus, Scale, DollarSign, Calendar, ShieldCheck, Gauge, RefreshCw, Zap, Building2, CloudSun, Clock, BookOpen, ChevronDown, ChevronUp, Lightbulb, ShieldAlert, ListChecks, Info, CheckSquare, X, PlayCircle, Pencil, Trash2, FlaskConical, Sparkles, Layers, Activity, Search } from 'lucide-react';

export interface TutorialStep {
  stepNumber: number;
  title: string;
  details: string;
}

export interface MaintenanceTutorial {
  title: string;
  category: string;
  recommendedFrequency: string;
  summary: string;
  requiredTools: string[];
  safetyWarnings: string[];
  steps: TutorialStep[];
  pitmasterTips: string[];
}

export function getTaskTutorial(title: string, description: string): MaintenanceTutorial {
  const lower = title.toLowerCase();

  if (lower.includes('firepot') || lower.includes('ash') || lower.includes('burn pot')) {
    return {
      title: 'Firepot Ash & Burn Pot Cleanout Guide',
      category: 'Combustion & Ignition Maintenance',
      recommendedFrequency: 'Every 10–15 Operating Hours',
      summary: 'Wood ash accumulation in the firepot restricts forced airflow from the combustion fan, causing temperature drops, unburned pellet overflow, or ignition failure (Er1 / Er2 error codes).',
      requiredTools: ['Cold Wet/Dry Shop Vac', 'Soft Bristle Nylon Brush', 'Flashlight / Inspection Light'],
      safetyWarnings: [
        'DANGER: Always unplug the smoker and verify the burn pot is 100% cold (minimum 2 hours post-cook) before vacuuming ash. Hot embers inside a shop vac can cause a vacuum filter fire.',
      ],
      steps: [
        {
          stepNumber: 1,
          title: 'Power Down & Cool Disconnect',
          details: 'Switch main controller OFF, unplug power cord, and confirm the smoker barrel and firepot are completely cool to the touch.',
        },
        {
          stepNumber: 2,
          title: 'Remove Cooking Grates & Deflector Shields',
          details: 'Lift out porcelain/cast iron cooking grates, grease drip tray, and lower heavy-gauge curved heat deflector shield to access bottom barrel cavity.',
        },
        {
          stepNumber: 3,
          title: 'Vacuum Burn Pot & Barrel Floor',
          details: 'Position shop vac nozzle inside the circular burn pot and extract all wood ash, carbon crust, and unburned pellet fragments. Vacuum surrounding barrel floor.',
        },
        {
          stepNumber: 4,
          title: 'Inspect Igniter Hot Rod Tip',
          details: 'Locate the metal igniter hot rod extending into the side of the burn pot. Verify it protrudes 1/8" to 1/4" into the pot and gently brush off carbon buildup with a soft bristle brush.',
        },
        {
          stepNumber: 5,
          title: 'Reassemble Components',
          details: 'Replace heat shield, grease tray (check foil liner), and grates in correct orientation. Plug in power cord.',
        },
      ],
      pitmasterTips: [
        'Vacuuming the firepot before any 12+ hour overnight brisket or pork shoulder cook eliminates the #1 cause of middle-of-the-night flameouts.',
        'Never use water or wet cleaners inside the burn pot; moisture combines with ash to form corrosive lye.',
      ],
    };
  }

  if (lower.includes('heat shield') || lower.includes('grease') || lower.includes('drip')) {
    return {
      title: 'Heat Shield & Grease Drip Tray Care Guide',
      category: 'Fire Prevention & Hygiene',
      recommendedFrequency: 'Every 20–25 Operating Hours (or after heavy fatty cooks)',
      summary: 'Accumulated animal fat and rendering grease on heat shields create a major flare-up hazard and produce acrid, bitter smoke that ruins meat flavor.',
      requiredTools: ['18" Heavy-Duty Wide Aluminum Foil', 'Putty Knife / Plastic Scraper', 'Paper Towels', 'Citrus Food-Safe Degreaser'],
      safetyWarnings: [
        'WARNING: Never operate smoker with a grease-choked drain tube or heavy grease puddle in the tray; high pit temps (300°F+) will ignite grease fires.',
      ],
      steps: [
        {
          stepNumber: 1,
          title: 'Remove Cooking Grates',
          details: 'Set aside cooking grates and inspect grease drip tray surface.',
        },
        {
          stepNumber: 2,
          title: 'Peel Old Foil & Scrape Grease Trough',
          details: 'Peel off grease-covered foil liner carefully. Use a plastic putty knife to scrape remaining grease downward into the grease drain trough.',
        },
        {
          stepNumber: 3,
          title: 'Clear Grease Drain Tube',
          details: 'Push scraper or brush down the grease drain tube leading to the external bucket to ensure unobstructed gravity flow.',
        },
        {
          stepNumber: 4,
          title: 'Apply Fresh Heavy-Duty Foil',
          details: 'Wrap grease drip tray with 2 overlapping sheets of 18" heavy-duty aluminum foil. Press foil snugly into trough contours so grease slides freely.',
        },
        {
          stepNumber: 5,
          title: 'Verify Tray Slope Alignment',
          details: 'Reinstall drip tray on internal support brackets, ensuring the downward slope favors the grease drain chute.',
        },
      ],
      pitmasterTips: [
        'Heavy-duty foil (0.001" thick) prevents grease from leaking underneath to raw metal where it bakes on.',
        'Empty external grease catch bucket after every cook to prevent raccoons or pets from being attracted to your smoker.',
      ],
    };
  }

  if (lower.includes('rtd') || lower.includes('calibrate') || lower.includes('probe') || lower.includes('sensor')) {
    return {
      title: 'RTD Temperature Sensor Calibration & Cleaning',
      category: 'Precision Temperature Control',
      recommendedFrequency: 'Every 40–50 Operating Hours',
      summary: 'Black creosote soot coating the Resistance Temperature Detector (RTD) insulates the sensor tip, causing false low temperature readings and controller over-firing.',
      requiredTools: ['Isopropyl Alcohol (70%+)', 'Microfiber Cloth', 'Ice Water Bath (50% crushed ice, 50% water)', 'Calibrated Digital Thermometer'],
      safetyWarnings: [
        'CAUTION: Do not pull, twist, or bend the RTD probe wire sharply. Handle sensor tip with gentle care.',
      ],
      steps: [
        {
          stepNumber: 1,
          title: 'Locate Internal RTD Probe',
          details: 'Find the slim vertical metal sensor mounted on the interior left or rear wall of the main cooking chamber.',
        },
        {
          stepNumber: 2,
          title: 'Wipe Soot & Creosote Layer',
          details: 'Dampen a microfiber cloth with isopropyl alcohol or warm soapy water. Gently rub the metal probe until shiny stainless steel is fully visible.',
        },
        {
          stepNumber: 3,
          title: 'Inspect Mounting Bracket Clearance',
          details: 'Verify the probe does not touch adjacent metal walls directly, which could cause thermal bridging and false readings.',
        },
        {
          stepNumber: 4,
          title: 'Perform Ice Water Accuracy Test',
          details: 'Submerge meat probe / test sensor in a glass filled with crushed ice and water (32.0°F / 0°C baseline). Compare controller reading against digital reference thermometer.',
        },
        {
          stepNumber: 5,
          title: 'Adjust Controller Offset (If Supported)',
          details: 'If pit temp consistently drifts >10°F, use controller P-Set / Offset settings to calibrate reading matching actual chamber temperature.',
        },
      ],
      pitmasterTips: [
        'A clean RTD probe reacts 3x faster to lid openings, minimizing temperature recovery time during spritzing.',
      ],
    };
  }

  if (lower.includes('chamber') || lower.includes('deep') || lower.includes('door') || lower.includes('gasket') || lower.includes('glass')) {
    return {
      title: 'Deep Chamber Clean & Door Seal Inspection',
      category: 'Thermal Insulation & Structural Maintenance',
      recommendedFrequency: 'Every 75–100 Operating Hours',
      summary: 'Peeling creosote flakes from chamber ceilings can drop onto food. Worn door gaskets leak smoke and heat, driving up pellet consumption by up to 35%.',
      requiredTools: ['Plastic Scraper / Putty Knife', 'Glass Cleaner / Ash Paste', 'High-Temp Food-Safe Silicone Gasket (if replacing)', 'Nylon Scrub Brush'],
      safetyWarnings: [
        'WARNING: Do not use oven cleaner or caustic chemicals inside the smoker chamber; chemical fumes will contaminate meat during future cooks.',
      ],
      steps: [
        {
          stepNumber: 1,
          title: 'Scrape Interior Creosote Flakes',
          details: 'Use a plastic scraper to gently scrape flaking creosote off the chamber ceiling, walls, and lid interior.',
        },
        {
          stepNumber: 2,
          title: 'Clean Glass View Door',
          details: 'Dip a damp paper towel into clean wood ash (natural mild abrasive) or use citrus degreaser to wipe away dark smoke stain on door glass.',
        },
        {
          stepNumber: 3,
          title: 'Inspect Perimeter Gasket Seal',
          details: 'Examine high-temp door gasket tape for fraying, tears, or hardening. Press door shut and check for light or air gaps around frame.',
        },
        {
          stepNumber: 4,
          title: 'Check Door Latch Tension',
          details: 'Adjust door latch mechanism to maintain firm pressure against the gasket seal when closed.',
        },
        {
          stepNumber: 5,
          title: 'High-Temp Burn-Off Cycle',
          details: 'Run smoker at 350°F for 15 minutes post-cleaning to dry any moisture and sterilize internal surfaces.',
        },
      ],
      pitmasterTips: [
        'A tight door gasket maintains stable heat during cold weather and windy days, reducing pellet burn rate significantly.',
      ],
    };
  }

  return {
    title: `${title} - Step-by-Step Care Guide`,
    category: 'Preventative Smoker Care',
    recommendedFrequency: `Every ${description ? 'scheduled interval' : '25 operating hours'}`,
    summary: description || 'Routine care and inspection ensures peak smoker thermal efficiency, prevents flameouts, and extends equipment lifetime.',
    requiredTools: ['Basic Hand Tools / Screwdriver', 'Microfiber Cloth', 'Flashlight', 'Protection Gloves'],
    safetyWarnings: [
      'Always disconnect electrical power and allow smoker to cool completely prior to performing internal maintenance.',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Safety Power Disconnect',
        details: 'Switch off controller power switch and unplug power cord from wall outlet.',
      },
      {
        stepNumber: 2,
        title: 'Inspect Component Area',
        details: `Examine area related to "${title}" for wear, carbon buildup, or debris blockage.`,
      },
      {
        stepNumber: 3,
        title: 'Perform Cleaning / Servicing',
        details: `Follow manufacturer guidelines to clean, adjust, or service ${title.toLowerCase()}.`,
      },
      {
        stepNumber: 4,
        title: 'Inspect & Verify Alignment',
        details: 'Ensure all mechanical parts, heat shields, and sensors are reinstalled in original factory positions.',
      },
      {
        stepNumber: 5,
        title: 'Test Operation & Log Hours',
        details: 'Plug in power cord, run a brief startup diagnostic test, and mark task as serviced in your runtime log.',
      },
    ],
    pitmasterTips: [
      'Consistent operating hour maintenance logs preserve manufacturer warranty coverage and maintain high resale value.',
    ],
  };
}

interface FuelAndMaintenanceProps {
  profile: SmokerProfile;
  cookLogs?: CookLog[];
  fuelLogs: FuelLog[];
  onUpdateProfile: (updatedProfile: SmokerProfile) => void;
  onAddFuelLog: (newFuel: FuelLog) => void;
  onUpdateFuelLog?: (updatedFuel: FuelLog) => void;
  onDeleteFuelLog?: (id: string) => void;
}

export const FuelAndMaintenance: React.FC<FuelAndMaintenanceProps> = ({
  profile,
  cookLogs = [],
  fuelLogs,
  onUpdateProfile,
  onAddFuelLog,
  onUpdateFuelLog,
  onDeleteFuelLog,
}) => {
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingFuelLog, setEditingFuelLog] = useState<FuelLog | null>(null);

  // Fuel Section Tab: 'database' (Searchable database) vs 'inventory' (Restock logs)
  const [fuelTab, setFuelTab] = useState<'database' | 'inventory'>('database');

  // Collapsible Section & Sub-Tab Navigation State
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'hardware' | 'maintenance' | 'fuel' | 'mods' | 'blend'>('blend');
  const [expandedSections, setExpandedSections] = useState({
    hardware: false,
    maintenance: false,
    fuel: false,
    mods: false,
    blend: false,
  });

  // Inner Sub-Section Collapsible States
  const [isBurnSyncExpanded, setIsBurnSyncExpanded] = useState(false);
  const [isHopperSyncExpanded, setIsHopperSyncExpanded] = useState(false);
  const [isInventorySummaryExpanded, setIsInventorySummaryExpanded] = useState(false);

  // Inner Custom Fuel Blend Lab Collapsible Container States
  const [isBlendMixExpanded, setIsBlendMixExpanded] = useState(false);
  const [isBlendPhysicsExpanded, setIsBlendPhysicsExpanded] = useState(false);
  const [isBlendCostExpanded, setIsBlendCostExpanded] = useState(false);
  const [isBlendPresetsExpanded, setIsBlendPresetsExpanded] = useState(false);

  const toggleSection = (section: 'hardware' | 'maintenance' | 'fuel' | 'mods' | 'blend') => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const setAllSections = (expanded: boolean) => {
    setExpandedSections({
      hardware: expanded,
      maintenance: expanded,
      fuel: expanded,
      mods: expanded,
      blend: expanded,
    });
    setIsBurnSyncExpanded(expanded);
    setIsHopperSyncExpanded(expanded);
    setIsInventorySummaryExpanded(expanded);
    setIsBlendMixExpanded(expanded);
    setIsBlendPhysicsExpanded(expanded);
    setIsBlendCostExpanded(expanded);
    setIsBlendPresetsExpanded(expanded);
  };

  // Maintenance Tutorial State (multiple tasks can be expanded independently)
  const [openTutorialTaskIds, setOpenTutorialTaskIds] = useState<string[]>([]);
  const [selectedTutorialModal, setSelectedTutorialModal] = useState<MaintenanceTutorial | null>(null);
  const [activeModalTaskId, setActiveModalTaskId] = useState<string | null>(null);
  const [completedModalSteps, setCompletedModalSteps] = useState<number[]>([]);

  const toggleTutorialTaskId = (taskId: string) => {
    setOpenTutorialTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  // Profile Edit State
  const [smokerName, setSmokerName] = useState(profile.name);
  const [smokerModel, setSmokerModel] = useState(profile.model);
  const [smokerType, setSmokerType] = useState(profile.smokerType || 'Vertical Pellet Smoker');
  const [fuelType, setFuelType] = useState(profile.fuelType || 'Pellets');
  const [fuelOnHand, setFuelOnHand] = useState(profile.fuelOnHand || '120 lbs');

  const [fuelBrand, setFuelBrand] = useState('Bear Mountain Hickory');
  const [woodType, setWoodType] = useState('Hickory');
  const [quantityLbs, setQuantityLbs] = useState<number>(40);
  const [pricePaid, setPricePaid] = useState<number>(30.00);
  const [costPerLb, setCostPerLb] = useState<number>(0.75);

  const [editPricePaid, setEditPricePaid] = useState<number>(0);

  // Custom Fuel Blend Creator State
  const [savedPresets, setSavedPresets] = useState<CustomFuelBlendPreset[]>(() => loadSavedFuelPresets());
  const [showBlendModal, setShowBlendModal] = useState(false);
  const [blendName, setBlendName] = useState('Texas Competition Oak & Pecan');
  const [blendBrand, setBlendBrand] = useState('Pitmaster Custom Blend');
  const [blendQuantityLbs, setBlendQuantityLbs] = useState<number>(40);
  const [blendPricePaid, setBlendPricePaid] = useState<number>(34.00);
  const [blendComponents, setBlendComponents] = useState<FuelBlendComponent[]>([
    { species: 'Post Oak', percentage: 60 },
    { species: 'Pecan', percentage: 40 },
  ]);

  // Live Retailer Price Index & Amazon Sales Comparison State
  const [retailerSearch, setRetailerSearch] = useState('');
  const [selectedRetailerFilter, setSelectedRetailerFilter] = useState<string>('ALL');
  const [isRetailerPriceExpanded, setIsRetailerPriceExpanded] = useState(false);

  const handleAddBlendComponent = () => {
    if (blendComponents.length >= 5) return;
    const unusedSpecies = AVAILABLE_WOOD_SPECIES.find(
      (s) => !blendComponents.some((c) => c.species === s)
    ) || 'Hickory';
    setBlendComponents([...blendComponents, { species: unusedSpecies, percentage: 10 }]);
  };

  const handleRemoveBlendComponent = (index: number) => {
    if (blendComponents.length <= 1) return;
    setBlendComponents(blendComponents.filter((_, i) => i !== index));
  };

  const handleUpdateBlendComponentSpecies = (index: number, species: string) => {
    const updated = [...blendComponents];
    updated[index].species = species;
    setBlendComponents(updated);
  };

  const handleUpdateBlendComponentPct = (index: number, pct: number) => {
    const updated = [...blendComponents];
    updated[index].percentage = Math.max(0, Math.min(100, pct));
    setBlendComponents(updated);
  };

  const handleNormalizeBlendPct = () => {
    const total = blendComponents.reduce((acc, c) => acc + c.percentage, 0);
    if (total === 0) return;
    const normalized = blendComponents.map((c) => ({
      ...c,
      percentage: Math.round((c.percentage / total) * 100),
    }));
    setBlendComponents(normalized);
  };

  const [activeBlendSuccessMessage, setActiveBlendSuccessMessage] = useState<string | null>(null);

  const handleSetBlendAsActiveFuel = (
    customName?: string,
    customBrand?: string,
    customComponents?: FuelBlendComponent[],
    autoRefillHopper: boolean = true
  ) => {
    const nameToUse = customName || blendName || 'Custom Wood Blend';
    const brandToUse = customBrand || blendBrand || 'Pitmaster Lab';
    const componentsToUse = customComponents || blendComponents;

    const summaryWoodType = componentsToUse
      .map((c) => `${c.percentage}% ${c.species}`)
      .join(' / ');

    const activeFuelString = `${brandToUse ? brandToUse + ' - ' : ''}${nameToUse} (${summaryWoodType})`;

    const hasCharcoal = componentsToUse.some((c) => c.species.toLowerCase().includes('charcoal'));
    const updatedFuelType = hasCharcoal ? 'Pellets' : (profile.fuelType || 'Pellets');

    onUpdateProfile({
      ...profile,
      fuelOnHand: activeFuelString,
      fuelType: updatedFuelType as any,
      activeBlendComponents: componentsToUse,
      ...(autoRefillHopper ? { lastRefillHours: profile.currentHours } : {}),
    });

    setFuelOnHand(activeFuelString);

    setActiveBlendSuccessMessage(`🔥 "${nameToUse}" set as active fuel in ${profile.name || 'smoker'}!`);
    setTimeout(() => {
      setActiveBlendSuccessMessage(null);
    }, 5000);
  };

  const handleCreateCustomBlend = (e: React.FormEvent, andSetAsActive: boolean = false) => {
    e.preventDefault();
    const physics = calculateBlendPhysics(blendComponents);
    const costPerLbCalculated = blendQuantityLbs > 0 ? Number((blendPricePaid / blendQuantityLbs).toFixed(2)) : 0.85;

    const summaryWoodType = blendComponents
      .map((c) => `${c.percentage}% ${c.species}`)
      .join(' / ');

    const activeFuelString = `${blendBrand ? blendBrand + ' - ' : ''}${blendName} (${summaryWoodType})`;

    const newBlendLog: FuelLog = {
      id: `blend-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      fuelBrand: `${blendBrand} - ${blendName}`,
      woodType: summaryWoodType,
      quantityLbs: Number(blendQuantityLbs),
      costPerLb: costPerLbCalculated,
      pricePaid: Number(blendPricePaid),
      isBlend: true,
      blendComponents: blendComponents,
      calculatedBtuPerLb: physics.btuPerLb,
      calculatedEfficiencyRating: physics.efficiencyRating,
      estimatedRunTimeHoursPer10Lbs: physics.estimatedRunTimeHoursPer10Lbs,
    };

    onAddFuelLog(newBlendLog);

    const hasCharcoal = blendComponents.some((c) => c.species.toLowerCase().includes('charcoal'));
    const updatedFuelType = hasCharcoal ? 'Pellets' : (profile.fuelType || 'Pellets');

    onUpdateProfile({
      ...profile,
      ...(andSetAsActive ? { fuelOnHand: activeFuelString, fuelType: updatedFuelType as any, activeBlendComponents: blendComponents } : {}),
      lastRefillHours: profile.currentHours,
    });

    if (andSetAsActive) {
      setFuelOnHand(activeFuelString);
      setActiveBlendSuccessMessage(`🔥 Saved & set "${blendName}" as active fuel in ${profile.name || 'smoker'}!`);
      setTimeout(() => setActiveBlendSuccessMessage(null), 5000);
    }

    setShowBlendModal(false);
  };

  const handleSaveCustomPreset = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const physics = calculateBlendPhysics(blendComponents);
    const costPerLbCalculated = blendQuantityLbs > 0 ? Number((blendPricePaid / blendQuantityLbs).toFixed(2)) : physics.weightedCostPerLb;

    const newPreset: CustomFuelBlendPreset = {
      id: `preset-${Date.now()}`,
      title: blendName || 'Custom Wood Blend',
      brand: blendBrand || 'Custom Pitmaster Blend',
      description: blendComponents.map((c) => `${c.percentage}% ${c.species}`).join(' / '),
      components: blendComponents,
      btuPerLb: physics.btuPerLb,
      efficiencyRating: physics.efficiencyRating,
      costPerLb: costPerLbCalculated,
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updated = [newPreset, ...savedPresets];
    setSavedPresets(updated);
    saveSavedFuelPresets(updated);

    setActiveBlendSuccessMessage(`💾 Preset "${newPreset.title}" saved as Future Fuel Type ($${costPerLbCalculated.toFixed(2)}/lb)!`);
    setTimeout(() => setActiveBlendSuccessMessage(null), 5000);
  };

  const handleDeletePreset = (id: string) => {
    const updated = savedPresets.filter((p) => p.id !== id);
    setSavedPresets(updated);
    saveSavedFuelPresets(updated);
  };

  const handleQuantityLbsChange = (val: number) => {
    setQuantityLbs(val);
    if (val > 0 && pricePaid > 0) {
      setCostPerLb(Number((pricePaid / val).toFixed(2)));
    }
  };

  const handlePricePaidChange = (val: number) => {
    setPricePaid(val);
    if (quantityLbs > 0) {
      setCostPerLb(val > 0 ? Number((val / quantityLbs).toFixed(2)) : 0);
    }
  };

  const handleCostPerLbChange = (val: number) => {
    setCostPerLb(val);
    if (quantityLbs > 0) {
      setPricePaid(Number((val * quantityLbs).toFixed(2)));
    }
  };

  const handleStartEditFuelLog = (fuel: FuelLog) => {
    const calculatedPrice = fuel.pricePaid ?? Number((fuel.quantityLbs * fuel.costPerLb).toFixed(2));
    setEditPricePaid(calculatedPrice);
    setEditingFuelLog({
      ...fuel,
      pricePaid: calculatedPrice,
    });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const newMfrSpec = getManufacturerSpecs(smokerName, smokerModel, smokerType);
    onUpdateProfile({
      ...profile,
      name: smokerName,
      model: smokerModel,
      smokerType: smokerType as any,
      fuelType: fuelType as any,
      fuelOnHand,
      pelletHopperCapacityLbs: newMfrSpec.standardCapacityLbs,
    });
    setShowProfileModal(false);
  };

  const handleMarkMaintenanceDone = (taskId: string) => {
    const updatedTasks = profile.maintenanceTasks.map((t) => {
      if (t.id === taskId) {
        return { ...t, lastPerformedHours: profile.currentHours };
      }
      return t;
    });

    onUpdateProfile({
      ...profile,
      maintenanceTasks: updatedTasks,
    });
  };

  const handleCreateFuelLog = (e: React.FormEvent) => {
    e.preventDefault();
    const newFuel: FuelLog = {
      id: `fuel-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      fuelBrand,
      woodType,
      quantityLbs: Number(quantityLbs),
      costPerLb: Number(costPerLb),
      pricePaid: Number(pricePaid),
    };
    onAddFuelLog(newFuel);
    // Auto-sync hopper refill hours to current operating hours upon adding a fuel restock bag
    onUpdateProfile({
      ...profile,
      lastRefillHours: profile.currentHours,
    });
    setShowFuelModal(false);
  };

  const handleSaveEditedFuelLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFuelLog) return;
    if (onUpdateFuelLog) {
      onUpdateFuelLog(editingFuelLog);
    }
    setEditingFuelLog(null);
  };

  const handleDeleteFuelLogClick = (id: string) => {
    if (onDeleteFuelLog) {
      onDeleteFuelLog(id);
    }
  };

  const totalPelletsLbs = fuelLogs.reduce((acc, curr) => acc + curr.quantityLbs, 0);
  const effectiveSpecs = getEffectiveSmokerSpecs(profile);
  const mfrSpec = getManufacturerSpecs(profile.name, profile.model, profile.smokerType || '');
  const refillData = calculateRefillPelletUsage(profile, cookLogs, fuelLogs);
  const burnSync = calculateBurnEfficiencySync(profile, cookLogs);

  const handleResetRefill = () => {
    onUpdateProfile({
      ...profile,
      lastRefillHours: profile.currentHours,
    });
  };

  const handleHoursSinceRefillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hrs = parseFloat(e.target.value);
    if (!isNaN(hrs) && hrs >= 0) {
      onUpdateProfile({
        ...profile,
        lastRefillHours: Number((profile.currentHours - hrs).toFixed(2)),
      });
    }
  };

  const dueTasksCount = profile.maintenanceTasks.filter(
    (t) => profile.currentHours - t.lastPerformedHours >= t.intervalHours
  ).length;

  return (
    <div className="space-y-6 pb-12">
      {/* TOP CONTROL BAR & SUB-TAB NAVIGATION */}
      <div className="bg-[#181818] border border-[#2a2a2a] rounded-2xl p-3 sm:p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Smartphone View Dropdown Select (No Side Scrolling) */}
        <div className="sm:hidden w-full">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1 font-mono">
            Select Care Module
          </label>
          <div className="relative">
            <select
              value={activeSubTab}
              onChange={(e) => {
                const val = e.target.value as 'maintenance' | 'fuel' | 'blend' | 'hardware' | 'mods' | 'all';
                setActiveSubTab(val);
                if (val === 'all') setAllSections(true);
                else setExpandedSections((prev) => ({ ...prev, [val]: true }));
              }}
              className="w-full bg-[#121212] border border-orange-500/40 text-white font-bold text-xs rounded-xl px-3.5 py-2.5 pr-10 appearance-none cursor-pointer focus:outline-none focus:border-orange-500 shadow-md"
            >
              <option value="mods">🔧 Aftermarket Mods & Tuning Database ({effectiveSpecs.activeModsCount} Active)</option>
              <option value="maintenance">🧹 Maintenance Care & Clean Schedule ({dueTasksCount} Due)</option>
              <option value="fuel">🪵 Fuel, Pellets & Consumption Logs</option>
              <option value="blend">🧪 Custom Fuel Blend Lab (Pellet & Charcoal Physics)</option>
              <option value="hardware">🔧 Hardware Diagnostics & Burner Sync</option>
              <option value="all">✨ All Fuel & Care Views</option>
            </select>
            <ChevronDown className="w-4 h-4 text-orange-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="hidden sm:flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('maintenance');
              setExpandedSections((prev) => ({ ...prev, maintenance: true }));
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[38px] flex items-center space-x-1.5 border ${
              activeSubTab === 'maintenance'
                ? 'bg-orange-500 text-zinc-950 border-orange-400 shadow-lg shadow-orange-500/20 font-black'
                : 'bg-[#222222] hover:bg-[#2c2c2c] text-zinc-300 border-[#2a2a2a]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Maintenance Care</span>
            {dueTasksCount > 0 ? (
              <span className="ml-1 bg-red-500 text-white font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
                {dueTasksCount} Due
              </span>
            ) : (
              <span className="ml-1 bg-emerald-500/20 text-emerald-300 font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold border border-emerald-500/30">
                Current
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('fuel');
              setExpandedSections((prev) => ({ ...prev, fuel: true }));
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[38px] flex items-center space-x-1.5 border ${
              activeSubTab === 'fuel'
                ? 'bg-orange-500 text-zinc-950 border-orange-400 shadow-lg shadow-orange-500/20 font-black'
                : 'bg-[#222222] hover:bg-[#2c2c2c] text-zinc-300 border-[#2a2a2a]'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Fuel & Pellets</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('blend');
              setExpandedSections((prev) => ({ ...prev, blend: true }));
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[38px] flex items-center space-x-1.5 border ${
              activeSubTab === 'blend'
                ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-500/20 font-black'
                : 'bg-[#222222] hover:bg-[#2c2c2c] text-purple-300 border-[#2a2a2a]'
            }`}
          >
            <FlaskConical className="w-4 h-4 text-purple-300" />
            <span>Custom Fuel Blend Lab</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('hardware');
              setExpandedSections((prev) => ({ ...prev, hardware: true }));
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[38px] flex items-center space-x-1.5 border ${
              activeSubTab === 'hardware'
                ? 'bg-orange-500 text-zinc-950 border-orange-400 shadow-lg shadow-orange-500/20 font-black'
                : 'bg-[#222222] hover:bg-[#2c2c2c] text-zinc-300 border-[#2a2a2a]'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Hardware & Burn Sync</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('mods');
              setExpandedSections((prev) => ({ ...prev, mods: true }));
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[38px] flex items-center space-x-1.5 border ${
              activeSubTab === 'mods'
                ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20 font-black'
                : 'bg-[#222222] hover:bg-[#2c2c2c] text-zinc-300 border-[#2a2a2a]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Mods & Spec Tuning</span>
            {effectiveSpecs.activeModsCount > 0 && (
              <span className="ml-1 bg-amber-500/20 text-amber-300 font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold border border-amber-500/30">
                {effectiveSpecs.activeModsCount} Active
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('all');
              setAllSections(true);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[38px] flex items-center space-x-1.5 border ${
              activeSubTab === 'all'
                ? 'bg-orange-500 text-zinc-950 border-orange-400 shadow-lg shadow-orange-500/20 font-black'
                : 'bg-[#222222] hover:bg-[#2c2c2c] text-zinc-400 border-[#2a2a2a]'
            }`}
          >
            <span>✨ All Views</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setAllSections(true)}
            className="px-3 py-1.5 bg-[#222222] hover:bg-[#2c2c2c] text-zinc-300 font-medium rounded-lg border border-[#2a2a2a] cursor-pointer transition-colors"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={() => setAllSections(false)}
            className="px-3 py-1.5 bg-[#222222] hover:bg-[#2c2c2c] text-zinc-300 font-medium rounded-lg border border-[#2a2a2a] cursor-pointer transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* SECTION FOR SMOKER AFTERMARKET MODS & SPECIFICATION TUNING */}
      {(activeSubTab === 'all' || activeSubTab === 'mods') && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl shadow-xl overflow-hidden transition-all">
          <div
            onClick={() => toggleSection('mods')}
            className="p-5 bg-[#222222]/80 hover:bg-[#252525] border-b border-[#2a2a2a] flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <h2 className="text-base font-extrabold text-white">Aftermarket Mods & Specification Tuning</h2>
                  <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md">
                    {effectiveSpecs.activeModsCount} Active Mod{effectiveSpecs.activeModsCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Toggle aftermarket modifications to recalculate fuel burn rates, thermal efficiency, hopper capacity, and cooking area in real-time.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              {!expandedSections.mods && (
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="px-2.5 py-1 bg-[#121212] text-amber-400 border border-[#2a2a2a] rounded-lg">
                    {effectiveSpecs.activeModsCount} Mods Active
                  </span>
                </div>
              )}

              <div className="p-1.5 bg-[#181818] rounded-lg text-zinc-400 border border-[#2a2a2a]">
                {expandedSections.mods ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {expandedSections.mods && (
            <div className="p-4 sm:p-6">
              <SmokerModManager
                profile={profile}
                onUpdateProfile={onUpdateProfile}
              />
            </div>
          )}
        </div>
      )}

      {/* SECTION 0: SMOKER HARDWARE & TYPE CONFIGURATION CARD */}
      {(activeSubTab === 'all' || activeSubTab === 'hardware') && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl shadow-xl overflow-hidden transition-all">
          <div
            onClick={() => toggleSection('hardware')}
            className="p-5 bg-[#222222]/80 hover:bg-[#252525] border-b border-[#2a2a2a] flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400 shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <h2 className="text-base font-extrabold text-white">Smoker Hardware & Category Profile</h2>
                  <span className="text-[10px] font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-md">
                    {profile.name} ({profile.model})
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Configure primary smoker model, fuel source, factory specifications, and live burn efficiency metrics.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              {!expandedSections.hardware && (
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="px-2.5 py-1 bg-[#121212] text-emerald-400 border border-[#2a2a2a] rounded-lg">
                    Grade {burnSync.efficiencyGrade} ({burnSync.efficiencyPercentage}%)
                  </span>
                  <span className="px-2.5 py-1 bg-[#121212] text-amber-400 border border-[#2a2a2a] rounded-lg hidden md:inline-block">
                    Hopper: {refillData.remainingPelletsLbs}/{refillData.hopperCapacityLbs} lbs
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileModal(true);
                }}
                className="px-3.5 py-1.5 bg-[#2a2a2a] hover:bg-[#333333] text-orange-400 border border-[#3a3a3a] font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Edit Details
              </button>

              <div className="p-1.5 bg-[#181818] rounded-lg text-zinc-400 border border-[#2a2a2a]">
                {expandedSections.hardware ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {expandedSections.hardware && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono bg-[#121212] p-4 rounded-xl border border-[#2a2a2a]">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block font-sans font-semibold">Equipment Name</span>
                  <span className="text-white font-bold font-sans">{profile.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block font-sans font-semibold">Model / Brand</span>
                  <span className="text-zinc-300 font-sans">{profile.model}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block font-sans font-semibold">Smoker Type Field</span>
                  <span className="inline-block mt-0.5 px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md font-sans font-bold">
                    {profile.smokerType || 'Vertical Pellet Smoker'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block font-sans font-semibold">Primary Fuel Type</span>
                  <span className="text-amber-400 font-sans font-bold">{profile.fuelType}</span>
                </div>
              </div>

              {/* Active Smoker Specifications Banner */}
              <div className="bg-[#242424] border border-[#2a2a2a] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-400 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white">Active Global Pit Specification:</span>
                      <span className="text-orange-400 font-mono font-semibold">{effectiveSpecs.displayName}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Baseline Burn Rate: <strong className="text-zinc-200 font-mono">{effectiveSpecs.baselineBurnRateLbsHr} lbs/hr</strong> @ 225°F • Category: <strong className="text-zinc-200">{effectiveSpecs.category}</strong>
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center space-x-2 bg-[#121212] px-3 py-1.5 rounded-lg border border-[#2a2a2a]">
                  <Gauge className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] font-mono font-semibold text-emerald-400">
                    Thermal Rating: {effectiveSpecs.thermalEfficiencyRating}
                  </span>
                </div>
              </div>

              {/* MANUFACTURER BURN EFFICIENCY & PELLET USAGE SYNC SECTION */}
              <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl p-5 space-y-5">
                <div
                  onClick={() => setIsBurnSyncExpanded(!isBurnSyncExpanded)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2a2a2a] cursor-pointer select-none group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400">
                      <Gauge className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-bold text-white group-hover:text-orange-400 transition-colors">Manufacturer Burn Efficiency & Pellet Usage Sync</h3>
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold rounded-md flex items-center space-x-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Synced to {burnSync.mfrSpec.brandModel}</span>
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Burn efficiency metric synchronized to manufacturer baseline burn rates ({refillData.effectiveBurnRateLbsHr} lbs/hr) and hours elapsed since last refill ({refillData.hoursSinceRefill} hrs).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block">Efficiency Grade</span>
                      <span className="text-xs font-semibold text-orange-400">{burnSync.efficiencyStatusLabel}</span>
                    </div>
                    <div className="w-10 h-10 bg-orange-500/10 border-2 border-orange-500/40 rounded-xl flex items-center justify-center text-lg font-black font-mono text-orange-400 shadow-inner">
                      {burnSync.efficiencyGrade}
                    </div>
                    <div className="p-1.5 bg-[#181818] rounded-lg text-zinc-400 border border-[#2a2a2a]">
                      {isBurnSyncExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* 5 Synchronized Metric Cards */}
                {isBurnSyncExpanded && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 animate-fadeIn">
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-3.5 rounded-xl">
                      <div className="flex items-center justify-between text-zinc-400 mb-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Mfr Baseline Rate</span>
                        <Building2 className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-xl font-extrabold font-mono text-white">{burnSync.factoryBaselineBurnRateLbsHr}</span>
                        <span className="text-xs text-zinc-400 font-sans">lbs/hr</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1.5">Factory spec at 225°F baseline</p>
                    </div>

                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-3.5 rounded-xl">
                      <div className="flex items-center justify-between text-zinc-400 mb-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Weather Adjusted</span>
                        <CloudSun className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-xl font-extrabold font-mono text-blue-400">{burnSync.weatherAdjustedBaselineBurnRateLbsHr}</span>
                        <span className="text-xs text-zinc-400 font-sans">lbs/hr</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1.5">Factoring {burnSync.avgAmbientTempF}°F ambient weather</p>
                    </div>

                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-3.5 rounded-xl">
                      <div className="flex items-center justify-between text-zinc-400 mb-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Actual Logged Burn</span>
                        <Flame className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-xl font-extrabold font-mono text-orange-400">{burnSync.actualBurnRateLbsHr}</span>
                        <span className="text-xs text-zinc-400 font-sans">lbs/hr</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1.5">Calculated from logged cooks</p>
                    </div>

                    <div className="bg-[#1a1a1a] border border-orange-500/30 p-3.5 rounded-xl relative overflow-hidden">
                      <div className="flex items-center justify-between text-zinc-400 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Synced Pellet Usage</span>
                        <Clock className="w-4 h-4 text-orange-400" />
                      </div>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-xl font-extrabold font-mono text-white">{refillData.pelletUsageLbs}</span>
                        <span className="text-xs text-orange-400 font-sans font-bold">lbs</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1.5 font-mono">
                        {refillData.hoursSinceRefill} hrs × {refillData.effectiveBurnRateLbsHr} lbs/hr
                      </p>
                    </div>

                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-3.5 rounded-xl">
                      <div className="flex items-center justify-between text-zinc-400 mb-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Efficiency Ratio</span>
                        <Zap className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-xl font-extrabold font-mono text-emerald-400">{burnSync.efficiencyPercentage}%</span>
                      </div>
                      <p className="text-[10px] text-emerald-400/90 font-medium mt-1.5">
                        {burnSync.efficiencyPercentage >= 100
                          ? `${burnSync.efficiencyPercentage - 100}% higher efficiency`
                          : `${100 - burnSync.efficiencyPercentage}% below factory rating`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Dynamic Hopper Level & Pellet Usage Sync Card */}
                <div className="bg-[#181818] border border-[#2a2a2a] rounded-xl p-4 text-xs space-y-4">
                  <div
                    onClick={() => setIsHopperSyncExpanded(!isHopperSyncExpanded)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none group"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400 shrink-0">
                        <Gauge className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap gap-1">
                          <span className="font-bold text-white uppercase text-[11px] tracking-wider group-hover:text-orange-400 transition-colors">Hopper Level & Pellet Usage Sync</span>
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex items-center space-x-1">
                            <Zap className="w-3 h-3 text-emerald-400" />
                            <span>Auto-Calculated from Fuel Inventory</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Hours since refill automatically calculated from wood pellet restock inventory logs ({refillData.latestFuelRestockDate ? `last restock ${refillData.latestFuelRestockDate}` : 'no restocks logged'}) and logged cook sessions ({refillData.cooksCountSinceRestock} cook{refillData.cooksCountSinceRestock === 1 ? '' : 's'} post-restock).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <div className="flex items-center space-x-1.5 bg-[#121212] border border-[#2a2a2a] px-2.5 py-1.5 rounded-xl" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] text-zinc-400 font-semibold">Hours Since Refill:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={refillData.hoursSinceRefill}
                          onChange={handleHoursSinceRefillChange}
                          className="w-14 bg-[#1a1a1a] border border-[#2a2a2a] text-orange-400 font-mono font-bold text-xs rounded px-1.5 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                        <span className="text-[10px] text-zinc-400 font-mono">hrs</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetRefill();
                        }}
                        className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/30 transition-all cursor-pointer font-sans"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        Reset Refill
                      </button>

                      <div className="p-1.5 bg-[#121212] rounded-lg text-zinc-400 border border-[#2a2a2a]">
                        {isHopperSyncExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Math Formula Display & Visual Progress Gauge */}
                  {isHopperSyncExpanded && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[#2a2a2a]/60 animate-fadeIn">
                      <div className="bg-[#121212] p-3 rounded-xl border border-[#2a2a2a] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-400 font-semibold uppercase block">Estimated Pellet Usage</span>
                          <span className="text-zinc-400 font-mono text-[11px]">
                            {refillData.hoursSinceRefill} hrs × {refillData.effectiveBurnRateLbsHr} lbs/hr =
                          </span>
                        </div>
                        <span className="text-base font-extrabold font-mono text-orange-400">{refillData.pelletUsageLbs} lbs</span>
                      </div>

                      <div className="bg-[#121212] p-3 rounded-xl border border-[#2a2a2a] flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-400 font-semibold uppercase">Hopper Fill ({refillData.hopperCapacityLbs} lbs max)</span>
                          <span className={`font-mono font-bold text-xs ${refillData.isLowPelletWarning ? 'text-red-400' : 'text-emerald-400'}`}>
                            {refillData.remainingPelletsLbs} lbs ({refillData.hopperPercentFull}%)
                          </span>
                        </div>
                        <div className="w-full bg-[#1a1a1a] rounded-full h-2 mt-2 overflow-hidden border border-[#2a2a2a]">
                          <div
                            className={`h-full transition-all duration-500 ${
                              refillData.isLowPelletWarning ? 'bg-red-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${refillData.hopperPercentFull}%` }}
                          />
                        </div>
                      </div>

                      <div className="bg-[#121212] p-3 rounded-xl border border-[#2a2a2a] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-400 font-semibold uppercase block">Est Runtime Remaining</span>
                          <span className="text-zinc-400 text-[11px]">Before hopper empty</span>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-extrabold font-mono text-white">~{refillData.hoursUntilEmpty}</span>
                          <span className="text-[10px] text-zinc-400 font-sans ml-1">hrs</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* SECTION 1: SMOKER MAINTENANCE CHECKLIST */}
      {(activeSubTab === 'all' || activeSubTab === 'maintenance') && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl shadow-xl overflow-hidden transition-all">
          <div
            onClick={() => toggleSection('maintenance')}
            className="p-5 bg-[#222222]/80 hover:bg-[#252525] border-b border-[#2a2a2a] flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <h2 className="text-base font-extrabold text-white">Smoker Maintenance & Operating Hours Care</h2>
                  {dueTasksCount > 0 ? (
                    <span className="text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-md flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                      <span>{dueTasksCount} Service Due</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                      All Maintenance Current
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Prevent flameouts and temperature swings with operating hour checklists and interactive tutorials.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <div className="text-right">
                <span className="text-[10px] uppercase text-zinc-400 font-bold block">Current Runtime</span>
                <span className="font-mono text-base font-bold text-orange-400">{profile.currentHours.toFixed(2)} hrs</span>
              </div>

              <div className="p-1.5 bg-[#181818] rounded-lg text-zinc-400 border border-[#2a2a2a]">
                {expandedSections.maintenance ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {expandedSections.maintenance && (
            <div className="p-6">

        {/* Maintenance Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 items-start">
          {profile.maintenanceTasks.map((task) => {
            const hoursSinceService = profile.currentHours - task.lastPerformedHours;
            const hoursRemaining = task.intervalHours - hoursSinceService;
            const isDue = hoursRemaining <= 0;
            const isTutorialOpen = openTutorialTaskIds.includes(task.id);
            const tutorial = getTaskTutorial(task.title, task.description);

            return (
              <div
                key={task.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isDue
                    ? 'bg-orange-500/5 border-orange-500/40 shadow-lg shadow-orange-500/5'
                    : 'bg-[#242424] border-[#2a2a2a]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{task.title}</span>
                    {isDue ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 animate-pulse">
                        <AlertTriangle className="w-3 h-3 mr-1 text-orange-400" />
                        Service Due Now
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                        Good for {hoursRemaining.toFixed(1)} hrs
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 mt-2">{task.description}</p>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-mono bg-[#121212] p-3 rounded-xl border border-[#2a2a2a]">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase block font-sans font-semibold">Interval</span>
                      <span className="text-zinc-200 font-bold">Every {task.intervalHours} hrs</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase block font-sans font-semibold">Last Serviced</span>
                      <span className="text-zinc-300">{task.lastPerformedHours.toFixed(1)} hrs</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#2a2a2a] flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {hoursSinceService.toFixed(1)} hrs since service
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => toggleTutorialTaskId(task.id)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center space-x-1.5 ${
                        isTutorialOpen
                          ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                          : 'bg-[#121212] hover:bg-[#1a1a1a] text-zinc-300 hover:text-orange-400 border-[#2a2a2a]'
                      }`}
                      title="View step-by-step care tutorial guide"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-orange-400" />
                      <span>{isTutorialOpen ? 'Hide Tutorial' : 'Care Tutorial'}</span>
                      {isTutorialOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => handleMarkMaintenanceDone(task.id)}
                      className="px-3 py-1.5 bg-[#121212] hover:bg-[#2a2a2a] text-orange-400 hover:text-orange-300 text-xs font-semibold rounded-xl border border-[#2a2a2a] transition-all cursor-pointer"
                    >
                      Mark Serviced ({profile.currentHours.toFixed(1)} hrs)
                    </button>
                  </div>
                </div>

                {/* INLINE EXPANDABLE STEP-BY-STEP TUTORIAL */}
                {isTutorialOpen && (
                  <div className="mt-4 pt-4 border-t border-[#2a2a2a] bg-[#171717] p-4 rounded-xl space-y-4 text-xs animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-2">
                      <div>
                        <span className="text-[10px] uppercase font-mono font-bold text-orange-400 block tracking-wider">
                          {tutorial.category}
                        </span>
                        <h4 className="text-sm font-bold text-white flex items-center space-x-1.5 mt-0.5">
                          <BookOpen className="w-4 h-4 text-orange-400" />
                          <span>{tutorial.title}</span>
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTutorialModal(tutorial);
                          setActiveModalTaskId(task.id);
                          setCompletedModalSteps([]);
                        }}
                        className="px-2.5 py-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-[10px] font-bold font-mono flex items-center space-x-1 cursor-pointer transition-all"
                      >
                        <PlayCircle className="w-3 h-3" />
                        <span>Interactive Checklist</span>
                      </button>
                    </div>

                    <p className="text-zinc-300 leading-relaxed text-[11px] font-sans">
                      {tutorial.summary}
                    </p>

                    {/* Safety Alert */}
                    {tutorial.safetyWarnings.length > 0 && (
                      <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-red-300 text-[11px] flex items-start space-x-2">
                        <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold uppercase text-[10px] block text-red-400">Safety Warning</span>
                          <span>{tutorial.safetyWarnings[0]}</span>
                        </div>
                      </div>
                    )}

                    {/* Required Tools */}
                    <div>
                      <span className="text-[10px] font-bold uppercase text-zinc-400 block mb-1.5 font-mono">
                        Required Tools & Supplies:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {tutorial.requiredTools.map((tool, idx) => (
                          <span
                            key={idx}
                            className="bg-[#121212] border border-[#2a2a2a] text-zinc-200 px-2 py-1 rounded-md text-[10px] font-mono flex items-center space-x-1"
                          >
                            <Wrench className="w-2.5 h-2.5 text-orange-400" />
                            <span>{tool}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Step-by-Step Instructions */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase text-zinc-400 block font-mono">
                        Step-by-Step Care Procedure:
                      </span>

                      <div className="space-y-2">
                        {tutorial.steps.map((step) => (
                          <div
                            key={step.stepNumber}
                            className="bg-[#121212] border border-[#2a2a2a] p-3 rounded-xl space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="bg-orange-500 text-zinc-950 font-mono font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                {step.stepNumber}
                              </span>
                              <span className="font-bold text-white text-xs">{step.title}</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 pl-7 font-sans leading-relaxed">
                              {step.details}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pitmaster Pro Tips */}
                    {tutorial.pitmasterTips.length > 0 && (
                      <div className="bg-orange-500/5 border border-orange-500/20 p-3 rounded-xl space-y-1">
                        <div className="flex items-center space-x-1.5 text-orange-400 font-bold text-xs">
                          <Lightbulb className="w-3.5 h-3.5" />
                          <span>Pitmaster Pro-Tip</span>
                        </div>
                        <ul className="list-disc list-inside text-[11px] text-zinc-300 space-y-1 pl-1">
                          {tutorial.pitmasterTips.map((tip, idx) => (
                            <li key={idx}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: FUEL LOG & PELLET INVENTORY */}
      {(activeSubTab === 'all' || activeSubTab === 'fuel') && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl shadow-xl overflow-hidden transition-all">
          <div
            onClick={() => toggleSection('fuel')}
            className="p-5 bg-[#222222]/80 hover:bg-[#252525] border-b border-[#2a2a2a] flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-500 shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <h2 className="text-base font-extrabold text-white">Wood Pellets & Fuel Inventory</h2>
                  <span className="text-[10px] font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-md">
                    {refillData.inventoryLbsOnHand} lbs On Hand
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Track daily pellet consumption, fuel bag restocks, and wood species breakdown.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBlendModal(true);
                }}
                className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer border border-purple-400/30"
              >
                <FlaskConical className="w-3.5 h-3.5 mr-1 text-purple-200" />
                <span>Create Custom Blend</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const cap = refillData.hopperCapacityLbs || 40;
                  setQuantityLbs(cap);
                  const defaultPrice = Number((cap * 0.75).toFixed(2));
                  setPricePaid(defaultPrice);
                  setCostPerLb(0.75);
                  setShowFuelModal(true);
                }}
                className="inline-flex items-center px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Restock Bag
              </button>

              <div className="p-1.5 bg-[#181818] rounded-lg text-zinc-400 border border-[#2a2a2a]">
                {expandedSections.fuel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {expandedSections.fuel && (
            <div className="p-6">
              {/* FUEL SECTION VIEW SWITCHER TABS */}
              <div className="flex items-center space-x-2 border-b border-[#2a2a2a] pb-4 mb-5">
                <button
                  type="button"
                  onClick={() => setFuelTab('database')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 border ${
                    fuelTab === 'database'
                      ? 'bg-orange-500 text-zinc-950 border-orange-400 font-black shadow-md'
                      : 'bg-[#1e1e1e] hover:bg-[#282828] text-zinc-300 border-[#2a2a2a]'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Searchable Wood & Fuel Database</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFuelTab('inventory')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 border ${
                    fuelTab === 'inventory'
                      ? 'bg-orange-500 text-zinc-950 border-orange-400 font-black shadow-md'
                      : 'bg-[#1e1e1e] hover:bg-[#282828] text-zinc-300 border-[#2a2a2a]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>My Restock Logs & Inventory ({fuelLogs.length})</span>
                </button>
              </div>

              {fuelTab === 'database' ? (
                <FuelDatabaseExplorer
                  onAddFuelLog={(newFuel) => {
                    onAddFuelLog(newFuel);
                    setFuelTab('inventory');
                  }}
                  hopperCapacityLbs={refillData.hopperCapacityLbs}
                />
              ) : (
                <>
                  {/* Fuel Inventory Summary Bar Header & Collapsible Grid */}
                  <div className="my-4 bg-[#121212] border border-[#2a2a2a] rounded-xl p-3.5 space-y-3">
                    <div
                      onClick={() => setIsInventorySummaryExpanded(!isInventorySummaryExpanded)}
                      className="flex items-center justify-between cursor-pointer select-none group"
                    >
                      <div className="flex items-center space-x-2">
                        <Flame className="w-4 h-4 text-orange-400" />
                        <span className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors uppercase font-mono tracking-wider">
                          Fuel Inventory Metrics & Runtime Breakdown
                        </span>
                      </div>
                      <div className="p-1.5 bg-[#1a1a1a] rounded-lg text-zinc-400 border border-[#2a2a2a]">
                        {isInventorySummaryExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </div>
                    </div>

                    {isInventorySummaryExpanded && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#2a2a2a] font-mono text-xs animate-fadeIn">
                        <div className="bg-[#1a1a1a] p-3 rounded-xl border border-orange-500/30">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-orange-400 font-sans font-bold uppercase block">Total Restocked</span>
                            <span className="text-[9px] font-mono bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/20">
                              Hopper Cap: {refillData.hopperCapacityLbs} lbs
                            </span>
                          </div>
                          <div className="flex items-baseline space-x-1 mt-0.5">
                            <span className="text-lg font-bold text-white">{refillData.totalRestockedLbs}</span>
                            <span className="text-[10px] text-zinc-400 font-sans">lbs</span>
                          </div>
                          <span className="text-[10px] text-orange-300/90 font-sans font-medium mt-0.5 block">
                            {refillData.totalRestockedLbs === refillData.hopperCapacityLbs
                              ? `Equals Mfr ${refillData.brandModel} hopper capacity (${refillData.hopperCapacityLbs} lbs)`
                              : `Synced with ${refillData.brandModel} (${refillData.hopperCapacityLbs} lbs mfr capacity)`}
                          </span>
                        </div>

                        <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#2a2a2a]">
                          <span className="text-[10px] text-zinc-400 font-sans font-semibold uppercase block">Total Burned in Cooks</span>
                          <div className="flex items-baseline space-x-1 mt-0.5">
                            <span className="text-lg font-bold text-orange-400">{refillData.totalConsumedLbs}</span>
                            <span className="text-[10px] text-zinc-400 font-sans">lbs</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-sans font-normal mt-0.5 block">
                            Logged across {cookLogs.length} smoke session{cookLogs.length === 1 ? '' : 's'}
                          </span>
                        </div>

                        <div className="bg-[#1a1a1a] p-3 rounded-xl border border-emerald-500/30">
                          <span className="text-[10px] text-emerald-400 font-sans font-bold uppercase block">Net Inventory On Hand</span>
                          <div className="flex items-baseline space-x-1 mt-0.5">
                            <span className="text-lg font-bold text-emerald-400">{refillData.inventoryLbsOnHand}</span>
                            <span className="text-[10px] text-emerald-400/80 font-sans">lbs</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-sans font-normal mt-0.5 block">
                            Restocked minus consumed
                          </span>
                        </div>

                        <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#2a2a2a]">
                          <span className="text-[10px] text-zinc-400 font-sans font-semibold uppercase block">Available Runtime</span>
                          <div className="flex items-baseline space-x-1 mt-0.5">
                            <span className="text-lg font-bold text-white">
                              ~{refillData.effectiveBurnRateLbsHr > 0 ? (refillData.inventoryLbsOnHand / refillData.effectiveBurnRateLbsHr).toFixed(1) : 0}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-sans">hrs</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-sans font-normal mt-0.5 block">
                            At {refillData.effectiveBurnRateLbsHr} lbs/hr mfr burn rate
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Fuel Table */}
                  <div className="mt-6 overflow-x-auto border border-[#2a2a2a] rounded-xl bg-[#121212]">
                    <table className="w-full text-xs text-left text-zinc-200">
                      <thead className="bg-[#1a1a1a] text-zinc-400 uppercase font-semibold border-b border-[#2a2a2a]">
                        <tr>
                          <th className="p-3">Restock Date</th>
                          <th className="p-3">Fuel Brand / Blend</th>
                          <th className="p-3">Wood Species</th>
                          <th className="p-3">Bag Weight (lbs)</th>
                          <th className="p-3">Cost / lb</th>
                          <th className="p-3">Est. Total Cost</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2a2a2a] font-mono">
                        {fuelLogs.map((fuel) => {
                          const physics = fuel.isBlend && fuel.blendComponents
                            ? calculateBlendPhysics(fuel.blendComponents)
                            : null;

                          return (
                            <tr key={fuel.id} className="hover:bg-[#242424] transition-colors">
                              <td className="p-3 text-zinc-400">{fuel.date}</td>
                              <td className="p-3 font-sans">
                                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                  <span className="font-semibold text-white">{fuel.fuelBrand}</span>
                                  {fuel.isBlend && (
                                    <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold flex items-center space-x-0.5">
                                      <FlaskConical className="w-2.5 h-2.5 text-purple-300" />
                                      <span>Custom Blend</span>
                                    </span>
                                  )}
                                </div>
                                {physics && (
                                  <p className="text-[10px] text-purple-300/80 font-mono mt-0.5">
                                    ⚡ {physics.btuPerLb.toLocaleString()} BTU/lb • 🔥 {physics.efficiencyRating}% Eff. • ⏱️ ~{physics.estimatedRunTimeHoursPer10Lbs} hrs/10lbs
                                  </p>
                                )}
                              </td>
                              <td className="p-3">
                                {fuel.isBlend && fuel.blendComponents ? (
                                  <div className="flex flex-wrap gap-1 font-sans">
                                    {fuel.blendComponents.map((comp, idx) => (
                                      <span
                                        key={idx}
                                        className="bg-purple-500/10 text-purple-300 border border-purple-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold"
                                      >
                                        {comp.percentage}% {comp.species}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-md font-sans">
                                    {fuel.woodType}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-bold text-orange-400">{fuel.quantityLbs} lbs</td>
                              <td className="p-3 text-zinc-300">${fuel.costPerLb.toFixed(2)}/lb</td>
                              <td className="p-3 text-emerald-400 font-bold">
                                ${(fuel.quantityLbs * fuel.costPerLb).toFixed(2)}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end space-x-1.5 font-sans">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleSetBlendAsActiveFuel(
                                        fuel.fuelBrand,
                                        '',
                                        fuel.blendComponents,
                                        true
                                      );
                                    }}
                                    className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 transition-all flex items-center space-x-1 text-[11px] font-bold cursor-pointer"
                                    title="Set as active fuel in smoker hopper"
                                  >
                                    <Flame className="w-3.5 h-3.5 fill-orange-400" />
                                    <span>Set Active</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditFuelLog(fuel)}
                                    className="p-1.5 rounded-lg bg-[#242424] hover:bg-orange-500/20 text-zinc-300 hover:text-orange-400 border border-[#2a2a2a] hover:border-orange-500/30 transition-all flex items-center space-x-1 text-[11px] font-semibold cursor-pointer"
                                    title="Edit Fuel Log"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteFuelLogClick(fuel.id)}
                                    className="p-1.5 rounded-lg bg-[#242424] hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-[#2a2a2a] hover:border-red-500/30 transition-all cursor-pointer"
                                    title="Delete Fuel Log"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* CUSTOM FUEL BLEND LAB SECTION */}
      {(activeSubTab === 'all' || activeSubTab === 'blend') && (
        <div className="bg-[#1a1a1a] border border-purple-500/30 rounded-2xl shadow-xl overflow-hidden transition-all">
          {/* Main Header */}
          <div
            onClick={() => toggleSection('blend')}
            className="p-5 bg-gradient-to-r from-purple-950/40 via-[#222222] to-indigo-950/30 hover:bg-[#252525] border-b border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-purple-500/20 border border-purple-500/40 rounded-xl text-purple-300 shrink-0">
                <FlaskConical className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <h2 className="text-base sm:text-lg font-black text-white">Custom Fuel Blend Lab & Pellet Physics</h2>
                  <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-md">
                    Wood & Charcoal Pellets AI Physics
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Formulate custom wood pellet, charcoal pellet, and brand blends with live BTU density, moisture, and thermal burn efficiency calculations.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <div className="p-1.5 bg-[#181818] rounded-lg text-zinc-400 border border-[#2a2a2a]">
                {expandedSections.blend ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {expandedSections.blend && (
            <div className="p-4 sm:p-6 space-y-5">
              
              {/* ACTIVE SMOKER FUEL STATUS HEADER BANNER */}
              <div className="bg-[#121212] border border-purple-500/30 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400 shrink-0">
                    <Flame className="w-5 h-5 fill-orange-500/20" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-zinc-400 block">Current Active Fuel in {profile.name || 'Smoker'}</span>
                    <span className="font-extrabold text-white text-sm">{profile.fuelOnHand || 'Standard Wood Pellets'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSetBlendAsActiveFuel()}
                  className="px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1.5 shrink-0"
                >
                  <Flame className="w-4 h-4 fill-zinc-950" />
                  <span>⚡ Set Current Blend as Active Smoker Fuel</span>
                </button>
              </div>

              {activeBlendSuccessMessage && (
                <div className="bg-emerald-500/15 border border-emerald-500/40 p-3 rounded-xl text-emerald-300 text-xs font-bold flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{activeBlendSuccessMessage}</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                    Synced to Hopper
                  </span>
                </div>
              )}

              {/* COLLAPSIBLE CONTAINER 1: WOOD & PELLET SPECIES RATIO COMPONENT MIX */}
              <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-lg">
                <div
                  onClick={() => setIsBlendMixExpanded(!isBlendMixExpanded)}
                  className="p-3.5 bg-[#1a1a1a] hover:bg-[#222222] border-b border-[#2a2a2a] flex items-center justify-between cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-white text-xs uppercase tracking-wider font-mono">
                      1. Wood Species, Pellet & Charcoal Ratio Mix ({blendComponents.length} Components)
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNormalizeBlendPct();
                      }}
                      className="text-[10px] font-mono font-bold text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 px-2 py-1 rounded-lg transition-all cursor-pointer"
                      title="Normalize percentages to sum to 100%"
                    >
                      ⚖️ Normalize to 100%
                    </button>
                    <div className="p-1 bg-[#242424] rounded-md text-zinc-400 border border-[#2a2a2a]">
                      {isBlendMixExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>

                {isBlendMixExpanded && (
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-zinc-400">
                      Select from pure wood pellets, charcoal pellets / pellet charcoal, or popular commercial brand pellets:
                    </p>

                    <div className="space-y-2.5">
                      {blendComponents.map((comp, idx) => (
                        <div
                          key={idx}
                          className="bg-[#1a1a1a] border border-[#2a2a2a] p-3 rounded-xl flex items-center gap-3 flex-wrap sm:flex-nowrap"
                        >
                          <div className="w-full sm:w-7/12">
                            <label className="block text-[10px] text-zinc-400 font-semibold uppercase mb-1">
                              Pellet / Wood Component #{idx + 1}
                            </label>
                            <select
                              value={comp.species}
                              onChange={(e) => handleUpdateBlendComponentSpecies(idx, e.target.value)}
                              className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-lg px-2.5 py-2 text-xs focus:ring-2 focus:ring-purple-500 font-medium"
                            >
                              {Object.entries(PELLET_CATEGORIES_GROUPED).map(([groupName, speciesList]) => (
                                <optgroup key={groupName} label={groupName} className="bg-[#1a1a1a] text-purple-300 font-bold">
                                  {speciesList.map((s) => (
                                    <option key={s} value={s} className="bg-[#121212] text-white font-normal">
                                      {s} ({WOOD_SPECIES_LIBRARY[s]?.btuPerLb.toLocaleString()} BTU/lb)
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </div>

                          <div className="w-full sm:w-5/12 flex items-center space-x-2">
                            <div className="flex-1">
                              <div className="flex justify-between text-[10px] font-mono mb-1">
                                <span className="text-zinc-400 uppercase font-semibold">Ratio %</span>
                                <span className="text-purple-300 font-bold">{comp.percentage}%</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={comp.percentage}
                                onChange={(e) => handleUpdateBlendComponentPct(idx, parseInt(e.target.value) || 0)}
                                className="w-full accent-purple-500 h-1.5 bg-[#2a2a2a] rounded-lg cursor-pointer"
                              />
                            </div>

                            {blendComponents.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveBlendComponent(idx)}
                                className="p-1.5 text-zinc-500 hover:text-red-400 bg-[#242424] hover:bg-red-500/10 border border-[#2a2a2a] rounded-lg transition-colors cursor-pointer shrink-0 mt-3"
                                title="Remove component"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {blendComponents.length < 5 && (
                      <button
                        type="button"
                        onClick={handleAddBlendComponent}
                        className="w-full py-2 bg-[#1a1a1a] hover:bg-[#222222] border border-dashed border-[#3a3a3a] text-purple-300 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Wood / Charcoal Pellet Component</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* COLLAPSIBLE CONTAINER 2: REAL-TIME WOOD & PELLET PHYSICS CALCULATIONS */}
              {(() => {
                const physics = calculateBlendPhysics(blendComponents);
                const totalPct = blendComponents.reduce((a, b) => a + b.percentage, 0);

                return (
                  <div className="bg-[#121212] border border-purple-500/30 rounded-xl overflow-hidden shadow-lg">
                    <div
                      onClick={() => setIsBlendPhysicsExpanded(!isBlendPhysicsExpanded)}
                      className="p-3.5 bg-gradient-to-r from-purple-950/30 via-[#1a1a1a] to-indigo-950/20 hover:bg-[#222222] border-b border-purple-500/30 flex items-center justify-between cursor-pointer select-none transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                        <span className="font-bold text-white text-xs uppercase tracking-wider font-mono">
                          2. Real-Time Wood & Pellet Physics Engine Calculations
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            totalPct === 100
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {totalPct === 100 ? 'Ratio: 100% Balanced' : `Total: ${totalPct}% (Needs Normalization)`}
                        </span>
                        <div className="p-1 bg-[#242424] rounded-md text-zinc-400 border border-[#2a2a2a]">
                          {isBlendPhysicsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </div>

                    {isBlendPhysicsExpanded && (
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-center text-xs">
                          <div className="bg-[#1a1a1a] p-3 rounded-xl border border-purple-500/20">
                            <span className="text-[9px] text-zinc-400 uppercase block font-sans">Thermal Heat</span>
                            <span className="font-bold text-purple-300 text-base">{physics.btuPerLb.toLocaleString()}</span>
                            <span className="text-[9px] text-zinc-500 block">BTU / lb</span>
                          </div>

                          <div className="bg-[#1a1a1a] p-3 rounded-xl border border-purple-500/20">
                            <span className="text-[9px] text-zinc-400 uppercase block font-sans">Moisture Content</span>
                            <span className="font-bold text-sky-300 text-base">{physics.avgMoisturePct}%</span>
                            <span className="text-[9px] text-zinc-500 block">Water Vapor</span>
                          </div>

                          <div className="bg-[#1a1a1a] p-3 rounded-xl border border-purple-500/20">
                            <span className="text-[9px] text-zinc-400 uppercase block font-sans">Burn Efficiency</span>
                            <span className="font-bold text-emerald-400 text-base">{physics.efficiencyRating}%</span>
                            <span className="text-[9px] text-zinc-500 block">Thermal Yield</span>
                          </div>

                          <div className="bg-[#1a1a1a] p-3 rounded-xl border border-purple-500/20">
                            <span className="text-[9px] text-zinc-400 uppercase block font-sans">Run Time / 10lbs</span>
                            <span className="font-bold text-amber-300 text-base">~{physics.estimatedRunTimeHoursPer10Lbs}</span>
                            <span className="text-[9px] text-zinc-500 block">Hours at 225°F</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono bg-[#1a1a1a] p-2.5 rounded-xl border border-[#2a2a2a] text-center">
                          <div>
                            <span className="text-zinc-500 block text-[9px] uppercase font-sans">Burn Rate @ 225°F</span>
                            <span className="font-bold text-amber-300">{physics.estimatedLbsPerHourAt225F} lbs/hr</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[9px] uppercase font-sans">Burn Rate @ 275°F</span>
                            <span className="font-bold text-orange-400">{physics.estimatedLbsPerHourAt275F} lbs/hr</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[9px] uppercase font-sans">High Sear @ 350°F</span>
                            <span className="font-bold text-red-400">{physics.estimatedLbsPerHourAt350F} lbs/hr</span>
                          </div>
                        </div>

                        {/* Live Cost Per Pound & Fuel Economics Breakdown */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono text-center text-xs">
                          <div className="bg-[#1a1a1a] p-3 rounded-xl border border-emerald-500/30">
                            <span className="text-[9px] text-zinc-400 uppercase block font-sans font-bold">Calculated Blend Cost</span>
                            <span className="font-extrabold text-emerald-400 text-base">${physics.weightedCostPerLb.toFixed(2)} / lb</span>
                            <span className="text-[9px] text-zinc-500 block">Weighted Ratio Average</span>
                          </div>

                          <div className="bg-[#1a1a1a] p-3 rounded-xl border border-amber-500/30">
                            <span className="text-[9px] text-zinc-400 uppercase block font-sans font-bold">Hourly Burn Cost</span>
                            <span className="font-extrabold text-amber-300 text-base">${physics.costPerBurnHourAt225F.toFixed(2)} / hr</span>
                            <span className="text-[9px] text-zinc-500 block">At 225°F Low & Slow</span>
                          </div>

                          <div className="bg-[#1a1a1a] p-3 rounded-xl border border-purple-500/30 col-span-2 sm:col-span-1">
                            <span className="text-[9px] text-zinc-400 uppercase block font-sans font-bold">10-Hour Cook Cost</span>
                            <span className="font-extrabold text-purple-300 text-base">${physics.estimatedCostPer10HrCook.toFixed(2)}</span>
                            <span className="text-[9px] text-zinc-500 block">Estimated Brisket Session Cost</span>
                          </div>
                        </div>

                        {/* Live Burn Efficiency Impact Badge */}
                        {(() => {
                          const blendMultiplierPct = Math.round((physics.efficiencyRating / 90.0) * 100 - 100);
                          const burnSavingsLbs = Number((1.18 - physics.estimatedLbsPerHourAt225F).toFixed(2));
                          return (
                            <div className="bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-emerald-500/10 border border-orange-500/30 p-2.5 rounded-xl flex items-center justify-between text-[11px]">
                              <div className="flex items-center space-x-2 text-zinc-200">
                                <Flame className="w-4 h-4 text-orange-400 shrink-0 fill-orange-400/20" />
                                <span>
                                  <strong>Smoker Burn Efficiency Impact:</strong>{' '}
                                  {blendMultiplierPct >= 0 ? (
                                    <span className="text-emerald-400 font-bold">+{blendMultiplierPct}% Efficiency Boost</span>
                                  ) : (
                                    <span className="text-amber-400 font-bold">{blendMultiplierPct}% Efficiency Shift</span>
                                  )}{' '}
                                  ({burnSavingsLbs >= 0 ? `${burnSavingsLbs} lbs/hr fuel saved` : `+${Math.abs(burnSavingsLbs)} lbs/hr demand`})
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30 shrink-0 hidden sm:inline-block">
                                Influences Pit Burn Rate
                              </span>
                            </div>
                          );
                        })()}

                        <div className="space-y-1.5 text-[11px] font-sans bg-[#1a1a1a] p-3 rounded-xl border border-[#2a2a2a]">
                          <div>
                            <span className="text-purple-300 font-bold block">💨 Smoke Profile Summary:</span>
                            <span className="text-zinc-300">{physics.smokeProfile}</span>
                          </div>
                          <div>
                            <span className="text-amber-300 font-bold block">🥩 Bark Impact & Visual Color:</span>
                            <span className="text-zinc-300">{physics.barkImpact}</span>
                          </div>
                          <div>
                            <span className="text-emerald-300 font-bold block">🍖 Recommended Protein Pairings:</span>
                            <div className="flex flex-wrap gap-1 mt-1 font-mono text-[10px]">
                              {physics.recommendedProteinsSummary.map((prot, idx) => (
                                <span key={idx} className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                  {prot}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#2a2a2a]">
                          <button
                            type="button"
                            onClick={() => handleSetBlendAsActiveFuel()}
                            className="w-full py-2.5 bg-gradient-to-r from-orange-500 via-amber-500 to-purple-600 hover:from-orange-400 hover:to-purple-500 text-zinc-950 font-black rounded-xl text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2"
                          >
                            <Flame className="w-4 h-4 fill-zinc-950" />
                            <span>⚡ Load & Set This Custom Blend as Active Fuel in {profile.name || 'Smoker'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* COLLAPSIBLE CONTAINER 3: BAG WEIGHT, PRICING & INVENTORY SETUP */}
              <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-lg">
                <div
                  onClick={() => setIsBlendCostExpanded(!isBlendCostExpanded)}
                  className="p-3.5 bg-[#1a1a1a] hover:bg-[#222222] border-b border-[#2a2a2a] flex items-center justify-between cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Scale className="w-4 h-4 text-orange-400" />
                    <span className="font-bold text-white text-xs uppercase tracking-wider font-mono">
                      3. Custom Blend Bag Weight & Price Setup
                    </span>
                  </div>
                  <div className="p-1 bg-[#242424] rounded-md text-zinc-400 border border-[#2a2a2a]">
                    {isBlendCostExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {isBlendCostExpanded && (
                  <div className="p-4 space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">Custom Blend Name</label>
                        <input
                          type="text"
                          required
                          value={blendName}
                          onChange={(e) => setBlendName(e.target.value)}
                          placeholder="e.g. Texas Competition Oak & Charcoal Blend"
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">Brand / Origin Name</label>
                        <input
                          type="text"
                          required
                          value={blendBrand}
                          onChange={(e) => setBlendBrand(e.target.value)}
                          placeholder="e.g. Pitmaster Lab House Blend"
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">Bag Weight (lbs)</label>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          required
                          value={blendQuantityLbs}
                          onChange={(e) => setBlendQuantityLbs(parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-orange-400 font-mono font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">Total Price Paid ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={blendPricePaid}
                          onChange={(e) => setBlendPricePaid(parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-emerald-400 font-mono font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-300 font-semibold mb-1">Calculated Rate ($/lb)</label>
                        <div className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-amber-300 font-mono font-bold rounded-xl px-3 py-2 text-xs flex items-center justify-between">
                          <span>${blendQuantityLbs > 0 ? (blendPricePaid / blendQuantityLbs).toFixed(2) : '0.00'}</span>
                          <span className="text-[10px] text-zinc-500 font-normal">per lb</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={(e) => handleCreateCustomBlend(e, true)}
                        className="py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-extrabold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        <Flame className="w-4 h-4 fill-zinc-950" />
                        <span>🔥 Set Active Fuel</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleSaveCustomPreset(e)}
                        className="py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>💾 Save as Custom Fuel Preset</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleCreateCustomBlend(e, false)}
                        className="py-2.5 bg-[#1a1a1a] hover:bg-[#222222] text-purple-300 border border-purple-500/30 hover:border-purple-500/50 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Log to Inventory Only</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* COLLAPSIBLE CONTAINER 4: CUSTOM PELLET BLEND PRESETS & MASTER RECIPES */}
              <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-lg">
                <div
                  onClick={() => setIsBlendPresetsExpanded(!isBlendPresetsExpanded)}
                  className="p-3.5 bg-[#1a1a1a] hover:bg-[#222222] border-b border-[#2a2a2a] flex items-center justify-between cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-white text-xs uppercase tracking-wider font-mono">
                      4. Custom Pellet & Charcoal Blend Presets & Master Recipes
                    </span>
                  </div>
                  <div className="p-1 bg-[#242424] rounded-md text-zinc-400 border border-[#2a2a2a]">
                    {isBlendPresetsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {isBlendPresetsExpanded && (
                  <div className="p-4 space-y-4">
                    {savedPresets.length > 0 && (
                      <div className="space-y-2 pb-3 border-b border-[#2a2a2a]">
                        <h4 className="text-xs font-extrabold text-purple-300 uppercase tracking-wider flex items-center space-x-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                          <span>Your Saved Custom Fuel Types & Presets ({savedPresets.length})</span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {savedPresets.map((preset) => (
                            <div key={preset.id} className="bg-[#181818] border border-purple-500/30 p-3 rounded-xl flex items-center justify-between shadow-md">
                              <div className="space-y-1 pr-2">
                                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                  <h5 className="font-bold text-white text-xs">{preset.title}</h5>
                                  {preset.brand && (
                                    <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">
                                      {preset.brand}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-zinc-300 font-mono">{preset.description}</p>
                                <div className="flex items-center space-x-3 text-[10px] font-mono text-zinc-400">
                                  <span className="text-emerald-400 font-bold">${preset.costPerLb ? preset.costPerLb.toFixed(2) : '0.85'}/lb</span>
                                  <span>{preset.btuPerLb?.toLocaleString()} BTU/lb</span>
                                  <span className="text-purple-300">{preset.efficiencyRating}% Efficiency</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBlendName(preset.title);
                                    setBlendBrand(preset.brand || 'Custom Pitmaster Blend');
                                    setBlendComponents(preset.components);
                                  }}
                                  className="px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all"
                                  title="Load into blend calculator sliders"
                                >
                                  ⚡ Load
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBlendName(preset.title);
                                    setBlendBrand(preset.brand || 'Custom Pitmaster Blend');
                                    setBlendComponents(preset.components);
                                    handleSetBlendAsActiveFuel(preset.title, preset.brand || 'Custom Pitmaster Blend', preset.components);
                                  }}
                                  className="px-2 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/40 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center space-x-1"
                                  title="Set active fuel in smoker"
                                >
                                  <Flame className="w-3 h-3 fill-orange-400" />
                                  <span>Set Active</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePreset(preset.id)}
                                  className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border border-[#2a2a2a] rounded-lg transition-colors cursor-pointer"
                                  title="Delete saved preset"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-zinc-400">
                      Click any master recipe preset to load ratio components into the physics calculator instantly:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        {
                          title: 'Texas Competition Oak & Charcoal Blend',
                          desc: '40% Post Oak, 30% 100% Hardwood Charcoal Pellets, 30% Pecan',
                          components: [
                            { species: 'Post Oak', percentage: 40 },
                            { species: '100% Hardwood Charcoal Pellets', percentage: 30 },
                            { species: 'Pecan', percentage: 30 },
                          ],
                        },
                        {
                          title: 'Championship Cherry & Pecan Pellet Blend',
                          desc: '40% Cherry Pellets, 40% Pecan Pellets, 20% Sugar Maple',
                          components: [
                            { species: 'Cherry', percentage: 40 },
                            { species: 'Pecan', percentage: 40 },
                            { species: 'Maple', percentage: 20 },
                          ],
                        },
                        {
                          title: 'PNW Salmon Alder & Apple Pellet Blend',
                          desc: '60% Alder Pellets, 40% Apple Pellets',
                          components: [
                            { species: 'Alder', percentage: 60 },
                            { species: 'Apple', percentage: 40 },
                          ],
                        },
                        {
                          title: 'High-Sear Charcoal & Mesquite Pellet Blend',
                          desc: '50% Royal Oak Hardwood Charcoal Pellets, 30% Mesquite, 20% Post Oak',
                          components: [
                            { species: 'Royal Oak Hardwood Charcoal Pellets', percentage: 50 },
                            { species: 'Mesquite', percentage: 30 },
                            { species: 'Post Oak', percentage: 20 },
                          ],
                        },
                      ].map((preset, idx) => (
                        <div key={idx} className="bg-[#1a1a1a] border border-[#2a2a2a] p-3 rounded-xl flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-white text-xs flex items-center space-x-1.5">
                              <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
                              <span>{preset.title}</span>
                            </h4>
                            <p className="text-[11px] text-zinc-400 font-mono mt-1">{preset.desc}</p>
                          </div>
                          <div className="flex items-center space-x-1.5 ml-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setBlendName(preset.title);
                                setBlendComponents(preset.components);
                              }}
                              className="px-2.5 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all"
                              title="Load into blend calculator sliders"
                            >
                              ⚡ Load
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBlendName(preset.title);
                                setBlendComponents(preset.components);
                                handleSetBlendAsActiveFuel(preset.title, 'Pitmaster Master Preset', preset.components);
                              }}
                              className="px-2.5 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/40 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center space-x-1"
                              title="Load & set as active fuel in smoker"
                            >
                              <Flame className="w-3 h-3 fill-orange-400" />
                              <span>Set Active</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* COLLAPSIBLE CONTAINER 5: LIVE RETAILER FUEL PRICE INDEX & AMAZON SALES COMPARISON */}
              <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-lg">
                <div
                  onClick={() => setIsRetailerPriceExpanded(!isRetailerPriceExpanded)}
                  className="p-3.5 bg-[#1a1a1a] hover:bg-[#222222] border-b border-[#2a2a2a] flex items-center justify-between cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white text-xs uppercase tracking-wider font-mono">
                      5. Major Retailer Price Index & Amazon Benchmark Sales Comparison
                    </span>
                  </div>
                  <div className="p-1 bg-[#242424] rounded-md text-zinc-400 border border-[#2a2a2a]">
                    {isRetailerPriceExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {isRetailerPriceExpanded && (
                  <div className="p-4 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#181818] p-3 rounded-xl border border-[#2a2a2a]">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                        <input
                          type="text"
                          value={retailerSearch}
                          onChange={(e) => setRetailerSearch(e.target.value)}
                          placeholder="Search pellets by brand (Traeger, Bear Mountain, Pit Boss, Jealous Devil)..."
                          className="w-full pl-9 pr-3 py-1.5 bg-[#121212] border border-[#2a2a2a] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Retailer Filter Pills */}
                      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-mono">
                        {['ALL', 'Amazon', 'Home Depot', "Lowe's", 'Tractor Supply', 'BBQGuys', 'Walmart'].map((ret) => (
                          <button
                            key={ret}
                            type="button"
                            onClick={() => setSelectedRetailerFilter(ret)}
                            className={`px-2.5 py-1 rounded-lg border whitespace-nowrap transition-all cursor-pointer text-[11px] font-bold ${
                              selectedRetailerFilter === ret
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                                : 'bg-[#121212] text-zinc-400 border-[#2a2a2a] hover:text-white'
                            }`}
                          >
                            {ret}
                          </button>
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-zinc-400">
                      Top Google & retailer fuel pricing index. Select where you bought your wood/charcoal to automatically sync your purchase price, bag weight, and calculated $/lb into your active cost analysis!
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {TOP_RETAILER_FUEL_PRICES.filter((item) => {
                        const matchesSearch =
                          item.productTitle.toLowerCase().includes(retailerSearch.toLowerCase()) ||
                          item.brand.toLowerCase().includes(retailerSearch.toLowerCase()) ||
                          item.category.toLowerCase().includes(retailerSearch.toLowerCase());
                        const matchesRetailer =
                          selectedRetailerFilter === 'ALL' || item.retailerName === selectedRetailerFilter;
                        return matchesSearch && matchesRetailer;
                      }).map((item) => {
                        return (
                          <div
                            key={item.id}
                            className="bg-[#181818] border border-[#2a2a2a] hover:border-emerald-500/40 p-3.5 rounded-xl flex flex-col justify-between space-y-3 transition-all"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                                  item.retailerName === 'Amazon'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    : item.retailerName === 'Home Depot'
                                    ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                }`}>
                                  🏪 {item.retailerName}
                                </span>

                                {item.isAmazonBestSeller && (
                                  <span className="text-[10px] font-bold font-mono bg-amber-400 text-black px-2 py-0.5 rounded shadow-sm">
                                    ⭐ #1 Amazon Best Seller
                                  </span>
                                )}

                                <span className="text-[10px] text-zinc-400 font-mono">
                                  Updated {item.lastUpdatedDate}
                                </span>
                              </div>

                              <h4 className="text-xs font-bold text-white line-clamp-2">
                                {item.productTitle}
                              </h4>

                              <div className="flex items-center space-x-3 text-xs font-mono pt-1">
                                <span className="text-emerald-400 font-extrabold text-sm">
                                  ${item.bagPrice.toFixed(2)}
                                </span>
                                <span className="text-zinc-400">({item.bagWeightLbs} lb bag)</span>
                                <span className="text-purple-300 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                                  ${item.costPerLb.toFixed(2)} / lb
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-[#2a2a2a] gap-2">
                              {item.rating && (
                                <div className="text-[11px] font-mono text-amber-400 flex items-center space-x-1">
                                  <span>★ {item.rating}</span>
                                  <span className="text-zinc-500">({item.reviewCount?.toLocaleString()})</span>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setFuelBrand(`${item.brand} ${item.category}`);
                                  setQuantityLbs(item.bagWeightLbs);
                                  setPricePaid(item.bagPrice);
                                  setCostPerLb(item.costPerLb);

                                  setBlendBrand(item.brand);
                                  setBlendQuantityLbs(item.bagWeightLbs);
                                  setBlendPricePaid(item.bagPrice);

                                  setActiveBlendSuccessMessage(`🛒 Price Synced from ${item.retailerName}: $${item.bagPrice.toFixed(2)} for ${item.bagWeightLbs} lbs ($${item.costPerLb.toFixed(2)}/lb)!`);
                                  setTimeout(() => setActiveBlendSuccessMessage(null), 5000);
                                }}
                                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center space-x-1"
                              >
                                <span>🛒 Select Purchased Source</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* EDIT FUEL RESTOCK MODAL */}
      {editingFuelLog && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2a2a2a]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Pencil className="w-4 h-4 text-orange-400" />
                  <span>Edit Fuel Restock Entry</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Modify brand, species, quantity, or cost for this restock entry.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingFuelLog(null)}
                className="p-1.5 rounded-xl bg-[#242424] hover:bg-[#2a2a2a] text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedFuelLog} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Restock Date</label>
                <input
                  type="date"
                  required
                  value={editingFuelLog.date}
                  onChange={(e) => setEditingFuelLog({ ...editingFuelLog, date: e.target.value })}
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Fuel Brand & Name</label>
                <input
                  type="text"
                  required
                  value={editingFuelLog.fuelBrand}
                  onChange={(e) => setEditingFuelLog({ ...editingFuelLog, fuelBrand: e.target.value })}
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Wood Species / Flavor</label>
                <input
                  type="text"
                  required
                  value={editingFuelLog.woodType}
                  onChange={(e) => setEditingFuelLog({ ...editingFuelLog, woodType: e.target.value })}
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Bag Weight (lbs)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={editingFuelLog.quantityLbs}
                    onChange={(e) => {
                      const newWeight = parseFloat(e.target.value) || 0;
                      const newCost = newWeight > 0 && editPricePaid > 0 ? Number((editPricePaid / newWeight).toFixed(2)) : editingFuelLog.costPerLb;
                      setEditingFuelLog({
                        ...editingFuelLog,
                        quantityLbs: newWeight,
                        costPerLb: newCost,
                      });
                    }}
                    className="w-full bg-[#121212] border border-[#2a2a2a] text-orange-400 font-mono font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Price Paid ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPricePaid}
                    onChange={(e) => {
                      const newPrice = parseFloat(e.target.value) || 0;
                      setEditPricePaid(newPrice);
                      const newCost = editingFuelLog.quantityLbs > 0 ? Number((newPrice / editingFuelLog.quantityLbs).toFixed(2)) : 0;
                      setEditingFuelLog({
                        ...editingFuelLog,
                        pricePaid: newPrice,
                        costPerLb: newCost,
                      });
                    }}
                    className="w-full bg-[#121212] border border-[#2a2a2a] text-emerald-400 font-mono font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Cost / lb ($/lb)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingFuelLog.costPerLb}
                    onChange={(e) => {
                      const newCost = parseFloat(e.target.value) || 0;
                      const newPrice = Number((newCost * editingFuelLog.quantityLbs).toFixed(2));
                      setEditPricePaid(newPrice);
                      setEditingFuelLog({
                        ...editingFuelLog,
                        costPerLb: newCost,
                        pricePaid: newPrice,
                      });
                    }}
                    className="w-full bg-[#121212] border border-[#2a2a2a] text-amber-400 font-mono font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Calculated Rate Live Preview */}
              <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-2.5 flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-sans text-[11px]">Auto Cost / lb Formula:</span>
                <span className="font-mono text-amber-400 font-bold text-xs">
                  ${editingFuelLog.costPerLb.toFixed(2)} / lb
                  <span className="text-[10px] text-zinc-500 font-normal ml-1">
                    (${editPricePaid.toFixed(2)} ÷ {editingFuelLog.quantityLbs} lbs)
                  </span>
                </span>
              </div>

              <div className="pt-4 border-t border-[#2a2a2a] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteFuelLogClick(editingFuelLog.id);
                    setEditingFuelLog(null);
                  }}
                  className="px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Entry</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingFuelLog(null)}
                    className="px-4 py-2 bg-[#242424] text-zinc-300 border border-[#2a2a2a] rounded-xl text-xs font-semibold hover:bg-[#2a2a2a] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold rounded-xl text-xs shadow-md cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD FUEL RESTOCK MODAL */}
      {showFuelModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Add Pellet Restock Bag</h3>
            <p className="text-xs text-zinc-400 mb-4">Record new wood pellet or charcoal fuel additions.</p>

            <form onSubmit={handleCreateFuelLog} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Fuel Brand & Name</label>
                <input
                  type="text"
                  required
                  value={fuelBrand}
                  onChange={(e) => setFuelBrand(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Wood Species / Flavor</label>
                <input
                  type="text"
                  required
                  value={woodType}
                  onChange={(e) => setWoodType(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Bag Weight (lbs)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={quantityLbs}
                    onChange={(e) => handleQuantityLbsChange(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#121212] border border-[#2a2a2a] text-orange-400 font-mono font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Price Paid ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={pricePaid}
                    onChange={(e) => handlePricePaidChange(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#121212] border border-[#2a2a2a] text-emerald-400 font-mono font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Cost / lb ($/lb)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={costPerLb}
                    onChange={(e) => handleCostPerLbChange(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#121212] border border-[#2a2a2a] text-amber-400 font-mono font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Calculated Rate Live Preview */}
              <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-2.5 flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-sans text-[11px]">Auto Cost / lb Formula:</span>
                <span className="font-mono text-amber-400 font-bold text-xs">
                  ${costPerLb.toFixed(2)} / lb
                  <span className="text-[10px] text-zinc-500 font-normal ml-1">
                    (${pricePaid.toFixed(2)} ÷ {quantityLbs} lbs)
                  </span>
                </span>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowFuelModal(false)}
                  className="px-4 py-2 bg-[#242424] text-zinc-300 border border-[#2a2a2a] rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 text-zinc-950 font-bold rounded-xl text-xs shadow-md"
                >
                  Save Fuel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM FUEL BLEND CREATOR & PHYSICS CALCULATOR MODAL */}
      {showBlendModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-[#2a2a2a]">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 shrink-0">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>Custom Fuel Blend Lab</span>
                    <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                      Physics AI Engine
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Combine wood species to calculate BTU density, moisture, burn efficiency & run times.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowBlendModal(false)}
                className="p-1.5 rounded-xl bg-[#242424] hover:bg-[#2a2a2a] text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomBlend} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Blend Name</label>
                  <input
                    type="text"
                    required
                    value={blendName}
                    onChange={(e) => setBlendName(e.target.value)}
                    placeholder="e.g. Texas Competition Oak & Pecan"
                    className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Brand / Origin</label>
                  <input
                    type="text"
                    required
                    value={blendBrand}
                    onChange={(e) => setBlendBrand(e.target.value)}
                    placeholder="e.g. Pitmaster House Blend"
                    className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* BLEND COMPONENTS SELECTOR */}
              <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-white text-xs uppercase tracking-wider font-mono">
                      Wood Species Ratio Component Mix
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleNormalizeBlendPct}
                      className="text-[10px] font-mono font-bold text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 px-2 py-1 rounded-lg transition-all cursor-pointer"
                      title="Normalize percentages to sum to 100%"
                    >
                      ⚖️ Normalize to 100%
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {blendComponents.map((comp, idx) => (
                    <div
                      key={idx}
                      className="bg-[#1a1a1a] border border-[#2a2a2a] p-2.5 rounded-xl flex items-center gap-2.5 flex-wrap sm:flex-nowrap"
                    >
                      <div className="w-full sm:w-1/2">
                        <label className="block text-[10px] text-zinc-400 font-semibold uppercase mb-0.5">
                          Wood Species #{idx + 1}
                        </label>
                        <select
                          value={comp.species}
                          onChange={(e) => handleUpdateBlendComponentSpecies(idx, e.target.value)}
                          className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-purple-500 font-medium"
                        >
                          {Object.entries(PELLET_CATEGORIES_GROUPED).map(([groupName, speciesList]) => (
                            <optgroup key={groupName} label={groupName} className="bg-[#1a1a1a] text-purple-300 font-bold">
                              {speciesList.map((s) => (
                                <option key={s} value={s} className="bg-[#121212] text-white font-normal">
                                  {s} ({WOOD_SPECIES_LIBRARY[s]?.btuPerLb.toLocaleString()} BTU/lb)
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      <div className="w-full sm:w-1/2 flex items-center space-x-2">
                        <div className="flex-1">
                          <div className="flex justify-between text-[10px] font-mono mb-0.5">
                            <span className="text-zinc-400 uppercase font-semibold">Ratio %</span>
                            <span className="text-purple-300 font-bold">{comp.percentage}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={comp.percentage}
                            onChange={(e) => handleUpdateBlendComponentPct(idx, parseInt(e.target.value) || 0)}
                            className="w-full accent-purple-500 h-1.5 bg-[#2a2a2a] rounded-lg cursor-pointer"
                          />
                        </div>

                        {blendComponents.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBlendComponent(idx)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 bg-[#242424] hover:bg-red-500/10 border border-[#2a2a2a] rounded-lg transition-colors cursor-pointer shrink-0 mt-3"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {blendComponents.length < 5 && (
                  <button
                    type="button"
                    onClick={handleAddBlendComponent}
                    className="w-full py-2 bg-[#1a1a1a] hover:bg-[#222222] border border-dashed border-[#3a3a3a] text-purple-300 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Wood Component Species</span>
                  </button>
                )}
              </div>

              {/* LIVE PHYSICS ENGINE CALCULATIONS PREVIEW */}
              {(() => {
                const physics = calculateBlendPhysics(blendComponents);
                const totalPct = blendComponents.reduce((a, b) => a + b.percentage, 0);

                return (
                  <div className="bg-gradient-to-r from-purple-950/40 via-[#181818] to-indigo-950/30 border border-purple-500/40 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                        <span className="font-bold text-white text-xs font-mono uppercase tracking-wider">
                          Real-Time Wood Physics & Efficiency Calculations
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          totalPct === 100
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {totalPct === 100 ? 'Ratio: 100% Balanced' : `Total Ratio: ${totalPct}% (Needs Normalization)`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-center text-xs">
                      <div className="bg-[#121212] p-2.5 rounded-xl border border-purple-500/20">
                        <span className="text-[9px] text-zinc-400 uppercase block font-sans">Heat Rating</span>
                        <span className="font-bold text-purple-300 text-sm">{physics.btuPerLb.toLocaleString()}</span>
                        <span className="text-[9px] text-zinc-500 block">BTU / lb</span>
                      </div>

                      <div className="bg-[#121212] p-2.5 rounded-xl border border-purple-500/20">
                        <span className="text-[9px] text-zinc-400 uppercase block font-sans">Moisture Content</span>
                        <span className="font-bold text-sky-300 text-sm">{physics.avgMoisturePct}%</span>
                        <span className="text-[9px] text-zinc-500 block">Low Water Vapor</span>
                      </div>

                      <div className="bg-[#121212] p-2.5 rounded-xl border border-purple-500/20">
                        <span className="text-[9px] text-zinc-400 uppercase block font-sans">Burn Efficiency</span>
                        <span className="font-bold text-emerald-400 text-sm">{physics.efficiencyRating}%</span>
                        <span className="text-[9px] text-zinc-500 block">Thermal Yield</span>
                      </div>

                      <div className="bg-[#121212] p-2.5 rounded-xl border border-purple-500/20">
                        <span className="text-[9px] text-zinc-400 uppercase block font-sans">Run Time / 10lbs</span>
                        <span className="font-bold text-amber-300 text-sm">~{physics.estimatedRunTimeHoursPer10Lbs}</span>
                        <span className="text-[9px] text-zinc-500 block">Hours at 225°F</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-[11px] font-sans bg-[#121212] p-3 rounded-xl border border-[#2a2a2a]">
                      <div>
                        <span className="text-purple-300 font-bold block">💨 Smoke Profile:</span>
                        <span className="text-zinc-300">{physics.smokeProfile}</span>
                      </div>
                      <div>
                        <span className="text-amber-300 font-bold block">🥩 Bark Impact:</span>
                        <span className="text-zinc-300">{physics.barkImpact}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* QUANTITY & COST INPUTS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Blend Weight (lbs)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={blendQuantityLbs}
                    onChange={(e) => setBlendQuantityLbs(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#121212] border border-[#2a2a2a] text-orange-400 font-mono font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Total Price Paid ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={blendPricePaid}
                    onChange={(e) => setBlendPricePaid(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#121212] border border-[#2a2a2a] text-emerald-400 font-mono font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#2a2a2a] flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-400">
                  Cost / lb:{' '}
                  <strong className="text-amber-300">
                    ${blendQuantityLbs > 0 ? (blendPricePaid / blendQuantityLbs).toFixed(2) : '0.00'} / lb
                  </strong>
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowBlendModal(false)}
                    className="px-4 py-2 bg-[#242424] text-zinc-300 border border-[#2a2a2a] rounded-xl text-xs font-semibold hover:bg-[#2a2a2a] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                  >
                    Save Custom Blend
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SMOKER PROFILE MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Edit Smoker Details & Category</h3>
            <p className="text-xs text-zinc-400 mb-4">Update smoker equipment name, model, fuel type, and smoker type field.</p>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Equipment Display Name</label>
                <input
                  type="text"
                  required
                  value={smokerName}
                  onChange={(e) => setSmokerName(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Model / Brand Name</label>
                <input
                  type="text"
                  required
                  value={smokerModel}
                  onChange={(e) => setSmokerModel(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-zinc-300 font-semibold">Smoker Type Field</label>
                  <span className="text-[10px] text-orange-400 font-mono bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                    Global Variable
                  </span>
                </div>
                <input
                  type="text"
                  list="profile-smoker-type-options"
                  placeholder="e.g. Vertical Pellet Smoker, Offset..."
                  value={smokerType}
                  onChange={(e) => setSmokerType(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                />
                <datalist id="profile-smoker-type-options">
                  <option value="Vertical Pellet Smoker" />
                  <option value="Offset Barrel Smoker" />
                  <option value="Pellet Grill / Smoker" />
                  <option value="Cabinet Smoker" />
                  <option value="Gravity Fed Smoker" />
                  <option value="Drum Smoker" />
                  <option value="Kamado Grill" />
                  <option value="Electric Smoker" />
                  <option value="Gas / Propane Smoker" />
                </datalist>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Global variable synced across new cook logs and profile records.
                </p>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Primary Fuel Type</label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value as any)}
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Pellets">Pellets</option>
                  <option value="Charcoal">Charcoal</option>
                  <option value="Wood Splits">Wood Splits</option>
                  <option value="Electric">Electric</option>
                  <option value="Gas">Gas</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-zinc-300 font-semibold">Fuel On Hand (Pounds Weight)</label>
                  <span className="text-[10px] text-orange-400 font-mono bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                    Unit: Pounds (lbs)
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. 120"
                    value={fuelOnHand}
                    onChange={(e) => setFuelOnHand(e.target.value)}
                    onBlur={() => {
                      let val = fuelOnHand.trim();
                      if (val && !val.toLowerCase().includes('lbs')) {
                        setFuelOnHand(`${val} lbs`);
                      }
                    }}
                    className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-mono rounded-xl pl-3 pr-12 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-orange-400 pointer-events-none">
                    lbs
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Fuel inventory weight measurement recorded strictly in pounds (lbs).
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 bg-[#242424] text-zinc-300 border border-[#2a2a2a] rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 text-zinc-950 font-bold rounded-xl text-xs shadow-md"
                >
                  Save Smoker Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INTERACTIVE MAINTENANCE TUTORIAL MODAL */}
      {selectedTutorialModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-start justify-between border-b border-[#2a2a2a] pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-orange-400 block tracking-wider">
                  {selectedTutorialModal.category} • {selectedTutorialModal.recommendedFrequency}
                </span>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2 mt-1">
                  <BookOpen className="w-5 h-5 text-orange-400" />
                  <span>{selectedTutorialModal.title}</span>
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedTutorialModal(null);
                  setActiveModalTaskId(null);
                }}
                className="p-1.5 rounded-xl bg-[#242424] hover:bg-[#2a2a2a] text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              {selectedTutorialModal.summary}
            </p>

            {/* Safety Alert */}
            {selectedTutorialModal.safetyWarnings.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-xl text-red-300 text-xs flex items-start space-x-2.5">
                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase text-[10px] block text-red-400 font-mono">Critical Safety Protocol</span>
                  <span>{selectedTutorialModal.safetyWarnings[0]}</span>
                </div>
              </div>
            )}

            {/* Required Tools */}
            <div>
              <span className="text-[10px] font-bold uppercase text-zinc-400 block mb-2 font-mono">
                Required Equipment & Cleaning Supplies:
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedTutorialModal.requiredTools.map((tool, idx) => (
                  <span
                    key={idx}
                    className="bg-[#121212] border border-[#2a2a2a] text-zinc-200 px-2.5 py-1 rounded-lg text-xs font-mono flex items-center space-x-1.5"
                  >
                    <Wrench className="w-3 h-3 text-orange-400" />
                    <span>{tool}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Interactive Step-by-Step Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-zinc-400 font-mono">
                  Interactive Step-by-Step Checklist:
                </span>
                <span className="text-[10px] font-mono text-orange-400">
                  {completedModalSteps.length} of {selectedTutorialModal.steps.length} Steps Completed
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#121212] h-1.5 rounded-full overflow-hidden border border-[#2a2a2a]">
                <div
                  className="bg-orange-500 h-full transition-all duration-300"
                  style={{
                    width: `${(completedModalSteps.length / selectedTutorialModal.steps.length) * 100}%`,
                  }}
                />
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {selectedTutorialModal.steps.map((step) => {
                  const isChecked = completedModalSteps.includes(step.stepNumber);
                  return (
                    <div
                      key={step.stepNumber}
                      onClick={() => {
                        if (isChecked) {
                          setCompletedModalSteps(completedModalSteps.filter((s) => s !== step.stepNumber));
                        } else {
                          setCompletedModalSteps([...completedModalSteps, step.stepNumber]);
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start space-x-3 ${
                        isChecked
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-[#121212] border-[#2a2a2a] hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <button
                        type="button"
                        className={`mt-0.5 p-0.5 rounded transition-all shrink-0 ${
                          isChecked ? 'text-emerald-400' : 'text-zinc-500'
                        }`}
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${
                              isChecked
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-orange-500/10 text-orange-400'
                            }`}
                          >
                            Step {step.stepNumber}
                          </span>
                          <span
                            className={`font-bold text-xs ${
                              isChecked ? 'text-emerald-300 line-through opacity-80' : 'text-white'
                            }`}
                          >
                            {step.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                          {step.details}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pitmaster Pro Tips */}
            {selectedTutorialModal.pitmasterTips.length > 0 && (
              <div className="bg-orange-500/5 border border-orange-500/20 p-3.5 rounded-xl space-y-1">
                <div className="flex items-center space-x-1.5 text-orange-400 font-bold text-xs">
                  <Lightbulb className="w-4 h-4" />
                  <span>Pitmaster Best Practices</span>
                </div>
                <ul className="list-disc list-inside text-xs text-zinc-300 space-y-1 pl-1">
                  {selectedTutorialModal.pitmasterTips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[#2a2a2a] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCompletedModalSteps([])}
                className="text-xs text-zinc-400 hover:text-white transition-all font-mono"
              >
                Reset Checklist
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTutorialModal(null);
                    setActiveModalTaskId(null);
                  }}
                  className="px-4 py-2 bg-[#242424] text-zinc-300 border border-[#2a2a2a] rounded-xl text-xs font-semibold hover:bg-[#2a2a2a]"
                >
                  Close Guide
                </button>

                {activeModalTaskId && (
                  <button
                    type="button"
                    onClick={() => {
                      handleMarkMaintenanceDone(activeModalTaskId);
                      setSelectedTutorialModal(null);
                      setActiveModalTaskId(null);
                    }}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold rounded-xl text-xs shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete & Mark Serviced ({profile.currentHours.toFixed(1)} hrs)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
