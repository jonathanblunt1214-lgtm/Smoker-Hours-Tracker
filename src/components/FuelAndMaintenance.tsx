import React, { useState } from 'react';
import { SmokerProfile, FuelLog, CookLog } from '../types';
import { getManufacturerSpecs, calculateRefillPelletUsage, calculateBurnEfficiencySync } from '../utils/smokerManufacturerData';
import { Wrench, CheckCircle2, AlertTriangle, Flame, Plus, Scale, DollarSign, Calendar, ShieldCheck, Gauge, RefreshCw, Zap, Building2, CloudSun, Clock, BookOpen, ChevronDown, ChevronUp, Lightbulb, ShieldAlert, ListChecks, Info, CheckSquare, X, PlayCircle, Pencil, Trash2 } from 'lucide-react';

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

  return (
    <div className="space-y-8 pb-12">

      {/* SECTION 0: SMOKER HARDWARE & TYPE CONFIGURATION CARD */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2a2a2a]">
          <div>
            <div className="flex items-center space-x-2">
              <Wrench className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-bold text-white">Smoker Hardware & Category Profile</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Configure your primary smoker model, fuel source, and classified smoker type.
            </p>
          </div>

          <button
            onClick={() => setShowProfileModal(true)}
            className="px-4 py-2 bg-[#242424] hover:bg-[#2a2a2a] text-orange-400 border border-[#2a2a2a] font-semibold text-xs rounded-xl transition-all cursor-pointer"
          >
            Edit Smoker Details
          </button>
        </div>

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

        {/* Manufacturer Baseline Specs Banner */}
        <div className="bg-[#242424] border border-[#2a2a2a] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white">Manufacturer Spec Match:</span>
                <span className="text-orange-400 font-mono font-semibold">{mfrSpec.brandModel}</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Baseline Burn Rate: <strong className="text-zinc-200 font-mono">{mfrSpec.factoryBaselineBurnRateLbsHr} lbs/hr</strong> @ 225°F • Insulation: <strong className="text-zinc-200">{mfrSpec.insulationType}</strong>
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center space-x-2 bg-[#121212] px-3 py-1.5 rounded-lg border border-[#2a2a2a]">
            <Gauge className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-mono font-semibold text-emerald-400">
              Thermal Rating: {mfrSpec.thermalEfficiencyRating}
            </span>
          </div>
        </div>

      {/* MANUFACTURER BURN EFFICIENCY & PELLET USAGE SYNC SECTION */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2a2a2a]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400">
              <Gauge className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white">Manufacturer Burn Efficiency & Pellet Usage Sync</h3>
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
            <div className="w-12 h-12 bg-orange-500/10 border-2 border-orange-500/40 rounded-2xl flex items-center justify-center text-xl font-black font-mono text-orange-400 shadow-inner">
              {burnSync.efficiencyGrade}
            </div>
          </div>
        </div>

        {/* 5 Synchronized Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          <div className="bg-[#242424] border border-[#2a2a2a] p-4 rounded-xl">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Mfr Baseline Rate</span>
              <Building2 className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-extrabold font-mono text-white">{burnSync.factoryBaselineBurnRateLbsHr}</span>
              <span className="text-xs text-zinc-400 font-sans">lbs/hr</span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-2">Factory spec at 225°F baseline</p>
          </div>

          <div className="bg-[#242424] border border-[#2a2a2a] p-4 rounded-xl">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Weather Adjusted</span>
              <CloudSun className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-extrabold font-mono text-blue-400">{burnSync.weatherAdjustedBaselineBurnRateLbsHr}</span>
              <span className="text-xs text-zinc-400 font-sans">lbs/hr</span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-2">Factoring {burnSync.avgAmbientTempF}°F ambient weather</p>
          </div>

          <div className="bg-[#242424] border border-[#2a2a2a] p-4 rounded-xl">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Actual Logged Burn</span>
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-extrabold font-mono text-orange-400">{burnSync.actualBurnRateLbsHr}</span>
              <span className="text-xs text-zinc-400 font-sans">lbs/hr</span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-2">Calculated from logged cooks</p>
          </div>

          <div className="bg-[#242424] border border-orange-500/30 p-4 rounded-xl relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Synced Pellet Usage</span>
              <Clock className="w-4 h-4 text-orange-400" />
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-extrabold font-mono text-white">{refillData.pelletUsageLbs}</span>
              <span className="text-xs text-orange-400 font-sans font-bold">lbs</span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-2 font-mono">
              {refillData.hoursSinceRefill} hrs since refill × {refillData.effectiveBurnRateLbsHr} lbs/hr
            </p>
          </div>

          <div className="bg-[#242424] border border-[#2a2a2a] p-4 rounded-xl">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Efficiency Ratio</span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-extrabold font-mono text-emerald-400">{burnSync.efficiencyPercentage}%</span>
            </div>
            <p className="text-[10px] text-emerald-400/90 font-medium mt-2">
              {burnSync.efficiencyPercentage >= 100
                ? `${burnSync.efficiencyPercentage - 100}% higher efficiency`
                : `${100 - burnSync.efficiencyPercentage}% below factory rating`}
            </p>
          </div>

        </div>

        {/* Dynamic Hopper Level & Pellet Usage Sync Card */}
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-4 text-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400 shrink-0">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap gap-1">
                  <span className="font-bold text-white uppercase text-[11px] tracking-wider">Hopper Level & Pellet Usage Sync</span>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex items-center space-x-1">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    <span>Auto-Calculated from Fuel Inventory</span>
                  </span>
                  <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                    Mfr Metric: {refillData.effectiveBurnRateLbsHr} lbs/hr
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Hours since refill automatically calculated from wood pellet restock inventory logs ({refillData.latestFuelRestockDate ? `last restock ${refillData.latestFuelRestockDate}` : 'no restocks logged'}) and logged cook sessions ({refillData.cooksCountSinceRestock} cook{refillData.cooksCountSinceRestock === 1 ? '' : 's'} post-restock).
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <div className="flex items-center space-x-1.5 bg-[#1a1a1a] border border-[#2a2a2a] px-2.5 py-1.5 rounded-xl">
                <span className="text-[10px] text-zinc-400 font-semibold">Hours Since Refill:</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={refillData.hoursSinceRefill}
                  onChange={handleHoursSinceRefillChange}
                  className="w-14 bg-[#121212] border border-[#2a2a2a] text-orange-400 font-mono font-bold text-xs rounded px-1.5 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-orange-500"
                  title="Auto-calculated from logged cooks post-restock; edit to override manually"
                />
                <span className="text-[10px] text-zinc-400 font-mono">hrs</span>
              </div>

              <button
                onClick={handleResetRefill}
                className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/30 transition-all cursor-pointer font-sans"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Reset Refill Now
              </button>
            </div>
          </div>

          {/* Math Formula Display & Visual Progress Gauge */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[#2a2a2a]/60">
            
            {/* Calculation Formula */}
            <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#2a2a2a] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-400 font-semibold uppercase block">Estimated Pellet Usage</span>
                <span className="text-zinc-400 font-mono text-[11px]">
                  {refillData.hoursSinceRefill} hrs × {refillData.effectiveBurnRateLbsHr} lbs/hr =
                </span>
              </div>
              <span className="text-base font-extrabold font-mono text-orange-400">{refillData.pelletUsageLbs} lbs</span>
            </div>

            {/* Hopper Remaining Level */}
            <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#2a2a2a] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-semibold uppercase">Hopper Fill ({refillData.hopperCapacityLbs} lbs max)</span>
                <span className={`font-mono font-bold text-xs ${refillData.isLowPelletWarning ? 'text-red-400' : 'text-emerald-400'}`}>
                  {refillData.remainingPelletsLbs} lbs ({refillData.hopperPercentFull}%)
                </span>
              </div>
              <div className="w-full bg-[#121212] rounded-full h-2 mt-2 overflow-hidden border border-[#2a2a2a]">
                <div
                  className={`h-full transition-all duration-500 ${
                    refillData.isLowPelletWarning ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${refillData.hopperPercentFull}%` }}
                />
              </div>
            </div>

            {/* Est Run Time Remaining */}
            <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#2a2a2a] flex items-center justify-between">
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
        </div>
      </div>
      </div>
      
      {/* SECTION 1: SMOKER MAINTENANCE CHECKLIST */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-[#2a2a2a] flex-wrap gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <Wrench className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-bold text-white">Smoker Maintenance & Operating Hours Care</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Prevent flameouts and temperature swings by performing routine care based on runtime hours.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase text-zinc-400 font-bold block">Current Runtime</span>
            <span className="font-mono text-lg font-bold text-orange-400">{profile.currentHours.toFixed(2)} hrs</span>
          </div>
        </div>

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

      {/* SECTION 2: FUEL LOG & PELLET INVENTORY */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2a2a2a]">
          <div>
            <div className="flex items-center space-x-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-bold text-white">Wood Pellets & Fuel Inventory</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Track daily pellet consumption, fuel bag restocks, and wood species breakdown.
            </p>
          </div>

          <button
            onClick={() => {
              const cap = refillData.hopperCapacityLbs || 40;
              setQuantityLbs(cap);
              const defaultPrice = Number((cap * 0.75).toFixed(2));
              setPricePaid(defaultPrice);
              setCostPerLb(0.75);
              setShowFuelModal(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Fuel Restock Bag
          </button>
        </div>

        {/* Fuel Inventory Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-4 font-mono text-xs">
          <div className="bg-[#121212] p-3 rounded-xl border border-orange-500/30">
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

          <div className="bg-[#121212] p-3 rounded-xl border border-[#2a2a2a]">
            <span className="text-[10px] text-zinc-400 font-sans font-semibold uppercase block">Total Burned in Cooks</span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-lg font-bold text-orange-400">{refillData.totalConsumedLbs}</span>
              <span className="text-[10px] text-zinc-400 font-sans">lbs</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-sans font-normal mt-0.5 block">
              Logged across {cookLogs.length} smoke session{cookLogs.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="bg-[#121212] p-3 rounded-xl border border-emerald-500/30">
            <span className="text-[10px] text-emerald-400 font-sans font-bold uppercase block">Net Inventory On Hand</span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-lg font-bold text-emerald-400">{refillData.inventoryLbsOnHand}</span>
              <span className="text-[10px] text-emerald-400/80 font-sans">lbs</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-sans font-normal mt-0.5 block">
              Restocked minus consumed
            </span>
          </div>

          <div className="bg-[#121212] p-3 rounded-xl border border-[#2a2a2a]">
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
              {fuelLogs.map((fuel) => (
                <tr key={fuel.id} className="hover:bg-[#242424] transition-colors">
                  <td className="p-3 text-zinc-400">{fuel.date}</td>
                  <td className="p-3 font-semibold text-white font-sans">{fuel.fuelBrand}</td>
                  <td className="p-3">
                    <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-md font-sans">
                      {fuel.woodType}
                    </span>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT FUEL RESTOCK MODAL */}
      {editingFuelLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
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

      {/* EDIT SMOKER PROFILE MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
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
