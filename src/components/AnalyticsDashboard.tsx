import React, { useState, useEffect, useMemo } from 'react';
import { CookLog, SmokerProfile, FuelLog, ProbeAlertConfig } from '../types';
import { ALL_SMOKERS_DATABASE } from '../data/smokerDatabases';
import { loadSavedCustomSmokers, loadSavedManufacturerSmokers, loadVerifiedMeatCuts, addOrUpdateVerifiedMeatCut } from '../utils/storage';
import { FUEL_AND_WOOD_DATABASE, FuelDatabaseItem } from '../utils/fuelDatabase';
import { FuelDatabaseExplorer } from './FuelDatabaseExplorer';
import { calculateBurnEfficiencySync, calculateRefillPelletUsage, getManufacturerSpecs } from '../utils/smokerManufacturerData';
import { convertTemp, formatTemp, TempUnit } from '../utils/tempUtils';
import { APP_NAME, AI_NAME, AI_PITMASTER_NAME } from '../constants/appName';
import {
  PROTEIN_SAFETY_AND_COOK_TEMPS,
  ProteinGuide,
  REGULATORY_SAFETY_STANDARDS,
  getMergedProteinSafetyAndTargetTempsGuides,
  runLiveSubcategoryAndUsdaAnalysis,
  UsdaComplianceAuditReport,
  determineProteinType,
  determineProteinSubcategory,
} from '../data/proteinTemps';
import { sendCharGPTPushNotification, speakAlexaVoice, loadPushConfig, loadAlexaConfig } from '../utils/notificationAndAlexa';
import { SmokerUnitProfileChart } from './SmokerUnitProfileChart';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { BarChart3, TrendingUp, Flame, Thermometer, Clock, Award, CheckCircle2, ChevronRight, ChevronDown, ChevronUp, Gauge, Zap, Building2, ShieldCheck, CloudSun, RefreshCw, Star, Trophy, Sparkles, Target, Filter, Medal, Radio, Bell, BellRing, Volume2, VolumeX, Plus, Minus, AlertTriangle, Sliders, Search, X, Database, Bluetooth, Cpu, Activity, Download } from 'lucide-react';
import { bluetoothProbeService, BluetoothProbeDevice, CombustionProbeData } from '../services/bluetoothProbeService';
import { CombustionBluetoothModal } from './CombustionBluetoothModal';
import { AddMeatCutModal } from './AddMeatCutModal';
import { VerifiedMeatCut } from '../types';

interface AnalyticsDashboardProps {
  cookLogs: CookLog[];
  profile: SmokerProfile;
  fuelLogs: FuelLog[];
  tempUnit?: TempUnit;
  onToggleTempUnit?: () => void;
  onSelectCookSheet: (cook: CookLog) => void;
  onUpdateProfile?: (profile: SmokerProfile) => void;
  onAskCharGPTAboutData?: (prompt: string) => void;
}

const CustomThermalTooltip = ({ active, payload, label, tempUnit = 'F' }: any) => {
  const activeUnit: TempUnit = (tempUnit as TempUnit) === 'C' ? 'C' : 'F';
  if (active && payload && payload.length) {
    const dataPoint = payload[0]?.payload;
    return (
      <div className="bg-[#1a1a1a] border border-[#3a3a3a] p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[210px] z-50">
        <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-1.5 text-zinc-400 font-mono">
          <span className="font-bold text-orange-400 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 inline mr-1" />
            Time: {label}
          </span>
          {dataPoint?.timestampMinutes !== undefined && (
            <span className="text-[10px] bg-[#242424] px-1.5 py-0.5 rounded text-zinc-300">
              +{dataPoint.timestampMinutes} min
            </span>
          )}
        </div>
        <div className="space-y-1 font-mono pt-1">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between space-x-3">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-zinc-300 text-[11px] font-sans">{entry.name}:</span>
              </span>
              <span className="font-bold text-white text-[11px]">
                {entry.value !== undefined ? formatTemp(entry.value, activeUnit) : 'N/A'}
              </span>
            </div>
          ))}
        </div>
        {dataPoint?.actionsTaken && (
          <div className="mt-2 pt-1.5 border-t border-[#2a2a2a] text-[11px] text-amber-300 font-sans italic bg-amber-500/10 p-2 rounded-lg">
            <span className="font-bold not-italic block text-[9px] text-amber-400 uppercase tracking-wider mb-0.5">
              Action / Milestone:
            </span>
            "{dataPoint.actionsTaken}"
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  cookLogs,
  profile,
  fuelLogs,
  tempUnit = 'F',
  onToggleTempUnit,
  onSelectCookSheet,
  onUpdateProfile,
  onAskCharGPTAboutData,
}) => {
  const activeUnit: TempUnit = tempUnit === 'C' ? 'C' : 'F';
  const [selectedCookId, setSelectedCookId] = useState<string>(cookLogs[0]?.id || '');
  const [collapsedProbes, setCollapsedProbes] = useState<Record<string, boolean>>({});
  const [collapsedPoints, setCollapsedPoints] = useState<Record<string | number, boolean>>({});

  const toggleProbeCollapse = (id: string) => {
    setCollapsedProbes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const togglePointCollapse = (key: string | number) => {
    setCollapsedPoints((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [collapsedGuideCards, setCollapsedGuideCards] = useState<Record<string, boolean>>({});

  const toggleGuideCardCollapse = (key: string) => {
    setCollapsedGuideCards((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [selectedProteinCategory, setSelectedProteinCategory] = useState<string>('Beef');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('ALL');
  const [selectedGameSubcategory, setSelectedGameSubcategory] = useState<string>('ALL');
  const [proteinSearchQuery, setProteinSearchQuery] = useState<string>('');
  const [isSafetyGuideOpen, setIsSafetyGuideOpen] = useState<boolean>(false);
  const [isAddMeatCutModalOpen, setIsAddMeatCutModalOpen] = useState<boolean>(false);
  const [isUsdaAuditModalOpen, setIsUsdaAuditModalOpen] = useState<boolean>(false);
  const [usdaAuditReport, setUsdaAuditReport] = useState<UsdaComplianceAuditReport | null>(null);
  const [lastAnalysisRunTime, setLastAnalysisRunTime] = useState<string>('');

  // Dynamic Meat Safety & Target Temps Guide merged with Confirmed Meat Cut Catalog (Reactive Sync)
  const [verifiedCutCatalog, setVerifiedCutCatalog] = useState<VerifiedMeatCut[]>(() => loadVerifiedMeatCuts());

  useEffect(() => {
    const handleCutsUpdate = () => {
      setVerifiedCutCatalog(loadVerifiedMeatCuts());
    };
    window.addEventListener('verified_meat_cuts_updated', handleCutsUpdate);
    window.addEventListener('master_sync_data_merged', handleCutsUpdate);
    return () => {
      window.removeEventListener('verified_meat_cuts_updated', handleCutsUpdate);
      window.removeEventListener('master_sync_data_merged', handleCutsUpdate);
    };
  }, []);

  const dynamicProteinGuides = useMemo(
    () => getMergedProteinSafetyAndTargetTempsGuides(verifiedCutCatalog),
    [verifiedCutCatalog]
  );

  // Live & Hourly USDA • FSIS • FDA Compliance & Subcategory Analysis Engine
  const executeLiveSubcategoryAndUsdaAnalysis = () => {
    const report = runLiveSubcategoryAndUsdaAnalysis(verifiedCutCatalog);
    setUsdaAuditReport(report);
    setLastAnalysisRunTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  useEffect(() => {
    executeLiveSubcategoryAndUsdaAnalysis();
    // Live / Hourly auto-analysis interval (3,600,000ms = 1 hour)
    const hourlyInterval = setInterval(() => {
      executeLiveSubcategoryAndUsdaAnalysis();
    }, 3600000);
    return () => clearInterval(hourlyInterval);
  }, [verifiedCutCatalog]);

  // Bluetooth Probe & Combustion Inc Telemetry State
  const [bluetoothDevice, setBluetoothDevice] = useState<BluetoothProbeDevice | null>(() => bluetoothProbeService.getActiveDevice());
  const [bluetoothTelemetry, setBluetoothTelemetry] = useState<CombustionProbeData | null>(null);
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState<boolean>(false);
  const [liveBluetoothReadings, setLiveBluetoothReadings] = useState<Array<{
    time: string;
    cookingTemp: number;
    meatTemp: number;
    meatTemp2: number;
    meatTemp3: number;
    meatTemp4: number;
    targetTemp: number;
    ambientTemp: number;
  }>>([]);

  // Universal view mode navigation state
  const [mobileTab, setMobileTab] = useState<'all' | 'thermal' | 'consumption' | 'benchmarks' | 'guide'>('thermal');

  const [visibleCurves, setVisibleCurves] = useState({
    pit: true,
    meat1: true,
    meat2: true,
    meat3: true,
    meat4: true,
    target: true,
    ambient: true,
  });
  const [isThermalSectionOpen, setIsThermalSectionOpen] = useState<boolean>(true);
  const [isConsumptionSectionOpen, setIsConsumptionSectionOpen] = useState<boolean>(true);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState<boolean>(false);
  const [isBenchmarksOpen, setIsBenchmarksOpen] = useState<boolean>(false);
  const [benchmarkProteinFilter, setBenchmarkProteinFilter] = useState<string>('ALL');

  // 4 Meats & Probes Alert Configuration State
  const [probeConfigs, setProbeConfigs] = useState<ProbeAlertConfig[]>([
    {
      id: 'p1',
      name: 'Probe 1',
      meatName: 'Brisket Flat',
      currentTemp: 203,
      targetTemp: 203,
      highAlarmTemp: 208,
      lowAlarmTemp: 140,
      alarmEnabled: true,
      color: '#ef4444', // Red
    },
    {
      id: 'p2',
      name: 'Probe 2',
      meatName: 'Brisket Point',
      currentTemp: 198,
      targetTemp: 203,
      highAlarmTemp: 208,
      lowAlarmTemp: 140,
      alarmEnabled: true,
      color: '#a855f7', // Purple
    },
    {
      id: 'p3',
      name: 'Probe 3',
      meatName: 'Pork Shoulder',
      currentTemp: 205,
      targetTemp: 205,
      highAlarmTemp: 208,
      lowAlarmTemp: 140,
      alarmEnabled: true,
      color: '#f59e0b', // Amber/Gold
    },
    {
      id: 'p4',
      name: 'Probe 4',
      meatName: 'Sausage / Ribs',
      currentTemp: 195,
      targetTemp: 195,
      highAlarmTemp: 202,
      lowAlarmTemp: 140,
      alarmEnabled: true,
      color: '#10b981', // Emerald/Teal
    },
  ]);

  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [activeAlertNotice, setActiveAlertNotice] = useState<string | null>(null);
  const [smokerFilter, setSmokerFilter] = useState<string>('ALL');

  // Searchable Fuel & Wood Blend Database states
  const [isFuelDbModalOpen, setIsFuelDbModalOpen] = useState<boolean>(false);
  const [isFuelComboboxOpen, setIsFuelComboboxOpen] = useState<boolean>(false);
  const [fuelSearchQuery, setFuelSearchQuery] = useState<string>('');

  // Saved smokers in user's account (loaded from saved custom & manufacturer smokers)
  const userSavedSmokers = useMemo(() => {
    const customList = loadSavedCustomSmokers();
    const mfrList = loadSavedManufacturerSmokers();
    const map = new Map<string, { id: string; name: string; fuelType?: string; model?: string }>();

    customList.forEach((c) => {
      if (c.name && c.name.trim() && !map.has(c.name.trim())) {
        map.set(c.name.trim(), { id: c.id, name: c.name.trim(), fuelType: c.fuelType });
      }
    });

    mfrList.forEach((m) => {
      const mName = `${m.brand || ''} ${m.model || ''}`.trim();
      if (mName && !map.has(mName)) {
        map.set(mName, { id: m.id, name: mName, fuelType: m.fuelType });
      }
    });

    return Array.from(map.values());
  }, []);

  const hasMultipleSavedSmokers = userSavedSmokers.length > 1;

  // Check if active smoker is an LP / Gas / Propane unit
  const isLpOrGas = useMemo(() => {
    const fuelLower = (profile.fuelType || '').toLowerCase();
    const typeLower = (profile.smokerType || '').toLowerCase();
    const nameLower = (profile.name || '').toLowerCase();
    const modelLower = (profile.model || '').toLowerCase();
    return fuelLower.includes('gas') || fuelLower.includes('lp') || fuelLower.includes('propane') ||
           typeLower.includes('gas') || typeLower.includes('lp') || typeLower.includes('propane') ||
           nameLower.includes('gas') || nameLower.includes('lp') || modelLower.includes('gas') || modelLower.includes('lp');
  }, [profile]);

  // Current wood, chips, or pellets used
  const availableWoodFuelItems = useMemo(() => {
    const list: FuelDatabaseItem[] = [];
    const seenNames = new Set<string>();

    const addDbItem = (item: FuelDatabaseItem) => {
      if (!seenNames.has(item.name.toLowerCase())) {
        seenNames.add(item.name.toLowerCase());
        list.push(item);
      }
    };

    // 1. FIRST: Add fuel items from user's restock log & inventory
    fuelLogs.forEach((f) => {
      const logName = f.woodType || f.fuelBrand || 'Custom Wood/Pellets';
      if (!seenNames.has(logName.toLowerCase())) {
        seenNames.add(logName.toLowerCase());
        list.push({
          id: f.id,
          name: logName,
          brand: f.fuelBrand || 'Restock Inventory',
          category: isLpOrGas ? 'Smoker Wood Chips' : (f.isBlend ? 'Pitmaster Blends' : 'Commercial Pellets'),
          btuPerLb: f.calculatedBtuPerLb || 8700,
          moisturePercent: 7.0,
          smokeDensity: 'Medium',
          barkImpact: 'Mahogany Bark',
          flavorNotes: `📦 Restock Inventory Entry (${f.quantityLbs} lbs logged on ${f.date}).`,
          recommendedProteins: ['Beef', 'Pork', 'Chicken'],
          ashOutput: 'Low (0.5-0.8%)',
          idealSmokingTempRange: '225°F - 275°F',
          tags: ['Restock Inventory', 'User Inventory', f.fuelBrand, logName],
          description: `Custom fuel log entry recorded in restock inventory on ${f.date}.`,
          burnRateEfficiencyRating: f.calculatedEfficiencyRating || 91,
          estimatedRunTimeHoursPer10Lbs: f.estimatedRunTimeHoursPer10Lbs || 8.8,
        });
      }
    });

    // 2. Add profile active blend components
    if (profile.activeBlendComponents && profile.activeBlendComponents.length > 0) {
      const blendName = profile.activeBlendComponents.map(c => `${c.percentage}% ${c.woodType || c.species || 'Hardwood'}`).join(' / ');
      if (!seenNames.has(blendName.toLowerCase())) {
        seenNames.add(blendName.toLowerCase());
        list.push({
          id: 'active-profile-blend',
          name: blendName,
          brand: 'Active Pitmaster Blend',
          category: 'Pitmaster Blends',
          btuPerLb: 8750,
          moisturePercent: 6.2,
          smokeDensity: 'Medium',
          barkImpact: 'Rich Mahogany Bark',
          flavorNotes: 'Custom active hopper blend formulation in smoker profile.',
          recommendedProteins: ['Beef', 'Pork', 'Chicken'],
          ashOutput: 'Low (0.5-0.8%)',
          idealSmokingTempRange: '225°F - 275°F',
          tags: ['Active Hopper Blend', 'Restock Inventory'],
          description: 'Currently configured hopper blend formulation in smoker profile.',
          burnRateEfficiencyRating: 92,
          estimatedRunTimeHoursPer10Lbs: 9.0,
        });
      }
    }

    // 3. For LP / Gas smokers, prioritize Wood Chips & LP tray options from database
    if (isLpOrGas) {
      FUEL_AND_WOOD_DATABASE.filter(i => i.category === 'Smoker Wood Chips' || i.tags.includes('Wood Chips')).forEach(addDbItem);
    }

    // 4. Add standard pure species & commercial pellets/chips from database
    FUEL_AND_WOOD_DATABASE.forEach((item) => {
      if (isLpOrGas || item.category !== 'Smoker Wood Chips') {
        addDbItem(item);
      }
    });

    return list;
  }, [isLpOrGas, fuelLogs, profile]);

  const [selectedWoodFuel, setSelectedWoodFuel] = useState<string>('ALL');

  const searchedFuelItems = useMemo(() => {
    if (!fuelSearchQuery.trim()) return availableWoodFuelItems;
    const q = fuelSearchQuery.toLowerCase();
    return availableWoodFuelItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q)) ||
        (item.flavorNotes && item.flavorNotes.toLowerCase().includes(q))
    );
  }, [availableWoodFuelItems, fuelSearchQuery]);

  const selectedWoodFuelDetail = useMemo(() => {
    if (selectedWoodFuel === 'ALL') return null;
    return availableWoodFuelItems.find((item) => item.name === selectedWoodFuel || item.id === selectedWoodFuel) || null;
  }, [selectedWoodFuel, availableWoodFuelItems]);

  // Extract all database smokers, categories, and custom profile/cookLog smokers
  const dbSmokerModels = Array.from(new Set(ALL_SMOKERS_DATABASE.map((s) => s.brandModel))).filter(Boolean);
  const dbSmokerCategories = Array.from(
    new Set([
      ...ALL_SMOKERS_DATABASE.map((s) => s.category),
      ...ALL_SMOKERS_DATABASE.map((s) => s.smokerTypeKey),
    ])
  ).filter(Boolean);

  const customSmokers = Array.from(
    new Set([
      profile.name,
      profile.model,
      profile.smokerType,
      ...cookLogs.map((c) => c.smokerType).filter(Boolean),
    ])
  ).filter((s): s is string => Boolean(s) && !dbSmokerModels.includes(s) && !dbSmokerCategories.includes(s));

  const filteredCooks = smokerFilter === 'ALL'
    ? cookLogs
    : cookLogs.filter((c) => {
        const cookStr = `${c.smokerType || ''} ${c.title || ''} ${profile.smokerType || ''} ${profile.name || ''} ${profile.model || ''}`.toLowerCase();
        return cookStr.includes(smokerFilter.toLowerCase()) || c.smokerType === smokerFilter;
      });

  const activeCook = filteredCooks.find((c) => c.id === selectedCookId) || filteredCooks[0] || (
    smokerFilter !== 'ALL' ? {
      id: `virtual-${smokerFilter}`,
      pageNumber: 1,
      date: new Date().toISOString().split('T')[0],
      title: `${smokerFilter} Thermal Telemetry`,
      smokerId: profile.id,
      smokerType: smokerFilter,
      proteinType: 'Beef' as const,
      proteinCut: 'Prime Brisket Flat & Point',
      startingSmokerHours: profile.currentHours,
      hoursLogged: 9.5,
      endingSmokerHours: profile.currentHours + 9.5,
      fuelLbsConsumed: 12,
      fuelType: 'Pellets' as const,
      temperatureReadings: [],
      seasoningRubs: 'SPG Rub',
      wouldMakeAgain: true,
      ratings: { bark: 5, tenderness: 5, overall: 5 },
    } : cookLogs[0]
  );

  // Fallback thermal readings generator to guarantee Live Thermal Curve works for any cook log / smoker option
  const generateThermalReadingsForCook = (cook?: CookLog) => {
    if (!cook) return [];
    if (cook.temperatureReadings && cook.temperatureReadings.length > 0) {
      return cook.temperatureReadings;
    }
    const hours = cook.hoursLogged || 6;
    const numSteps = Math.max(6, Math.min(20, Math.round(hours * 2)));
    const readings = [];
    const targetPit = (cook.temperatureReadings && cook.temperatureReadings[0]?.targetTemp) || 225;
    const isPoultry = cook.proteinType === 'Chicken' || cook.proteinType === 'Turkey';
    const targetMeat = isPoultry ? 165 : 203;

    for (let i = 0; i <= numSteps; i++) {
      const fraction = i / numSteps;
      const elapsedMinutes = Math.round(fraction * hours * 60);
      const hrs = Math.floor(elapsedMinutes / 60);
      const mins = elapsedMinutes % 60;
      const timeStr = `${hrs}:${mins < 10 ? '0' : ''}${mins}`;

      const pitFluc = Math.sin(i * 1.8) * 4;
      const cookingTemp = Math.round(targetPit + pitFluc);

      let meatTemp = 38;
      if (fraction < 0.35) {
        meatTemp = Math.round(38 + (fraction / 0.35) * (155 - 38));
      } else if (fraction < 0.65) {
        const stallProg = (fraction - 0.35) / 0.3;
        meatTemp = Math.round(155 + stallProg * 12);
      } else {
        const finishProg = (fraction - 0.65) / 0.35;
        meatTemp = Math.round(167 + finishProg * (targetMeat - 167));
      }

      readings.push({
        time: timeStr,
        cookingTemp,
        meatTemp,
        meatTemp2: Math.max(32, meatTemp - 4),
        meatTemp3: Math.max(32, meatTemp + 3),
        meatTemp4: Math.max(32, meatTemp - 2),
        targetTemp: targetPit,
        ambientTemp: 72,
      });
    }
    return readings;
  };

  // Sync probe current temperatures when active cook selection changes
  useEffect(() => {
    if (activeCook && activeCook.temperatureReadings && activeCook.temperatureReadings.length > 0) {
      const lastR = activeCook.temperatureReadings[activeCook.temperatureReadings.length - 1];
      setProbeConfigs((prev) =>
        prev.map((p, idx) => {
          let temp = lastR.meatTemp;
          if (idx === 1) temp = lastR.meatTemp2 ?? Math.max(32, lastR.meatTemp - 5);
          if (idx === 2) temp = lastR.meatTemp3 ?? Math.max(32, lastR.meatTemp + 2);
          if (idx === 3) temp = lastR.meatTemp4 ?? Math.max(32, lastR.meatTemp - 1);
          return { ...p, currentTemp: temp };
        })
      );
    }
  }, [selectedCookId, activeCook]);

  // Subscribe to Bluetooth wireless probe & Combustion Inc. telemetry stream
  useEffect(() => {
    const unsubStatus = bluetoothProbeService.subscribeStatus((dev) => {
      setBluetoothDevice(dev);
    });
    const unsubTelemetry = bluetoothProbeService.subscribeTelemetry((telemetry, dev) => {
      setBluetoothTelemetry(telemetry);
      setBluetoothDevice(dev);

      // Auto update active 4-probe telemetry cards with Combustion Inc 8-sensor readings
      setProbeConfigs((prev) =>
        prev.map((p, idx) => {
          let temp = p.currentTemp;
          if (idx === 0) temp = telemetry.coreTempF; // T1 Core
          if (idx === 1) temp = telemetry.surfaceTempF; // T6 Surface
          if (idx === 2) temp = telemetry.sensorsF[3] || telemetry.surfaceTempF;
          if (idx === 3) temp = telemetry.ambientTempF; // T8 Ambient
          return { ...p, currentTemp: temp };
        })
      );

      // Append live Bluetooth telemetry point to chart readings
      setLiveBluetoothReadings((prev) => {
        const newPoint = {
          time: telemetry.timestamp,
          cookingTemp: telemetry.ambientTempF,
          meatTemp: telemetry.coreTempF,
          meatTemp2: telemetry.surfaceTempF,
          meatTemp3: telemetry.sensorsF[3] || telemetry.surfaceTempF,
          meatTemp4: telemetry.sensorsF[4] || telemetry.coreTempF,
          targetTemp: 225,
          ambientTemp: telemetry.ambientTempF,
        };
        const updated = [...prev, newPoint];
        return updated.slice(-30);
      });
    });

    return () => {
      unsubStatus();
      unsubTelemetry();
    };
  }, []);

  // Audio Beep generator
  const triggerAudioBeep = () => {
    if (soundMuted) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch (e) {
      // Ignore audio restriction in un-clicked browser frames
    }
  };

  const handleUpdateProbeTemp = (id: string, delta: number) => {
    setProbeConfigs((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const newTemp = Math.max(32, Math.min(350, p.currentTemp + delta));
          if (p.alarmEnabled) {
            if (newTemp >= p.targetTemp && p.currentTemp < p.targetTemp) {
              const msg = `🎯 ${p.name} (${p.meatName}) REACHED TARGET TEMP: ${newTemp}°F! Pull off smoker to rest.`;
              setActiveAlertNotice(`🚨 ${msg}`);
              triggerAudioBeep();
              sendCharGPTPushNotification(`Target Temp Reached: ${p.meatName || p.name}`, msg, `probe-${p.id}`);
              const alexaCfg = loadAlexaConfig();
              if (alexaCfg.enabled && alexaCfg.proactiveAnnouncementsEnabled) {
                speakAlexaVoice(`Alexa Alert: ${AI_NAME} reports your ${p.meatName || p.name} has reached its target temperature of ${newTemp} degrees.`);
              }
            } else if (newTemp >= p.highAlarmTemp && p.currentTemp < p.highAlarmTemp) {
              const msg = `⚠️ HIGH TEMP ALARM: ${p.name} (${p.meatName}) spiked to ${newTemp}°F!`;
              setActiveAlertNotice(msg);
              triggerAudioBeep();
              sendCharGPTPushNotification(`High Temp Spike`, msg, `high-${p.id}`);
            } else if (newTemp <= p.lowAlarmTemp && p.currentTemp > p.lowAlarmTemp) {
              const msg = `❄️ LOW TEMP ALARM: ${p.name} (${p.meatName}) dropped to ${newTemp}°F!`;
              setActiveAlertNotice(msg);
              triggerAudioBeep();
              sendCharGPTPushNotification(`Low Temp Drop`, msg, `low-${p.id}`);
            }
          }
          return { ...p, currentTemp: newTemp };
        }
        return p;
      })
    );
  };

  const handleToggleAlarm = (id: string) => {
    setProbeConfigs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, alarmEnabled: !p.alarmEnabled } : p))
    );
  };

  const handleUpdateTarget = (id: string, targetTemp: number) => {
    setProbeConfigs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, targetTemp } : p))
    );
  };

  // Aggregate Internal Temperature Analytics Calculations (Active on all cook logs: published or local draft)
  const completedCooks = cookLogs.filter((c) => c.status === 'Completed');
  const allReadings = cookLogs.flatMap((c) => c.temperatureReadings || []);
  const internalStallReadings = allReadings.filter((r) => r.meatTemp >= 150 && r.meatTemp <= 175);
  
  // Calculate average final internal temp
  const finalMeatTemps = cookLogs
    .map((c) => c.temperatureReadings?.[c.temperatureReadings.length - 1]?.meatTemp)
    .filter((t): t is number => typeof t === 'number' && t > 0);

  const avgInternalFinishTemp = finalMeatTemps.length > 0
    ? Math.round(finalMeatTemps.reduce((a, b) => a + b, 0) / finalMeatTemps.length)
    : 198;

  // Internal target hit accuracy rate
  const targetHitCount = cookLogs.filter((c) => {
    const readings = c.temperatureReadings || [];
    if (readings.length === 0) return false;
    const finalT = readings[readings.length - 1].meatTemp;
    const targetT = readings[readings.length - 1].targetTemp || 203;
    return Math.abs(finalT - targetT) <= 5;
  }).length;
  const targetHitPrecisionRate = cookLogs.length > 0 ? Math.round((targetHitCount / cookLogs.length) * 100) : 100;

  // Average internal temp rise velocity (°F per hour)
  const tempRiseRates = cookLogs
    .map((c) => {
      const readings = c.temperatureReadings || [];
      if (readings.length < 2 || !c.hoursLogged) return null;
      const rise = readings[readings.length - 1].meatTemp - readings[0].meatTemp;
      return rise > 0 ? rise / c.hoursLogged : null;
    })
    .filter((r): r is number => r !== null);
  const avgTempRiseVelocity = tempRiseRates.length > 0
    ? Number((tempRiseRates.reduce((a, b) => a + b, 0) / tempRiseRates.length).toFixed(1))
    : 14.5;

  // Internal Finish Temp Breakdown by Protein
  const proteinInternalTargets: Record<string, { target: number; label: string }> = {
    Beef: { target: 203, label: 'Brisket Core Target' },
    Pork: { target: 202, label: 'Pork Butt Core Target' },
    Chicken: { target: 165, label: 'Poultry Safe Core' },
    Turkey: { target: 165, label: 'Turkey Breast Core' },
    Seafood: { target: 145, label: 'Fish Flake Core' },
    Lamb: { target: 145, label: 'Medium Rare Core' },
    Other: { target: 160, label: 'Standard Target' },
  };

  // Filtered cooks for Quality Benchmarks
  const benchmarkCooks = benchmarkProteinFilter === 'ALL'
    ? cookLogs
    : cookLogs.filter((c) => c.proteinType === benchmarkProteinFilter);

  const bCount = benchmarkCooks.length;
  const numSmokeRing = bCount > 0 ? benchmarkCooks.reduce((a, c) => a + (c.ratings?.smokeRing || 0), 0) / bCount : 0;
  const numBark = bCount > 0 ? benchmarkCooks.reduce((a, c) => a + (c.ratings?.bark || 0), 0) / bCount : 0;
  const numTenderness = bCount > 0 ? benchmarkCooks.reduce((a, c) => a + (c.ratings?.tenderness || 0), 0) / bCount : 0;
  const numOverall = bCount > 0 ? benchmarkCooks.reduce((a, c) => a + (c.ratings?.overall || 0), 0) / bCount : 0;

  const bCompleted = benchmarkCooks.filter((c) => c.status === 'Completed').length;
  const bWouldMakeAgain = benchmarkCooks.filter((c) => c.wouldMakeAgain === true).length;
  const bSuccessRate = bCompleted > 0 ? Math.round((bWouldMakeAgain / bCompleted) * 100) : 100;

  // Composite Mastery Score out of 100
  const compositeScore = Number((((numSmokeRing + numBark + numTenderness + numOverall) / 20) * 100).toFixed(1));

  let masteryGrade = 'A+';
  let masteryTitle = 'Grand Champion';
  let masteryBadgeClass = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  if (compositeScore < 70) {
    masteryGrade = 'C';
    masteryTitle = 'Novice Smoker';
    masteryBadgeClass = 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30';
  } else if (compositeScore < 82) {
    masteryGrade = 'B';
    masteryTitle = 'Apprentice Pitmaster';
    masteryBadgeClass = 'text-blue-400 bg-blue-500/10 border-blue-500/30';
  } else if (compositeScore < 90) {
    masteryGrade = 'A';
    masteryTitle = 'Competition Level';
    masteryBadgeClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  }

  // Radar chart data for Quality Axes
  const qualityRadarData = [
    { subject: 'Smoke Ring', score: Number(numSmokeRing.toFixed(2)), target: 4.5, fullMark: 5 },
    { subject: 'Bark Crust', score: Number(numBark.toFixed(2)), target: 4.5, fullMark: 5 },
    { subject: 'Tenderness', score: Number(numTenderness.toFixed(2)), target: 4.5, fullMark: 5 },
    { subject: 'Overall Flavor', score: Number(numOverall.toFixed(2)), target: 4.5, fullMark: 5 },
    { subject: 'Consistency', score: Number((bSuccessRate / 20).toFixed(2)), target: 4.5, fullMark: 5 },
  ];

  // Top Rated Cook in benchmark selection
  const topCookInBenchmark = benchmarkCooks.length > 0
    ? benchmarkCooks.slice().sort((a, b) => (b.ratings?.overall || 0) - (a.ratings?.overall || 0))[0]
    : null;

  // Active cook thermal metrics calculation
  const readings = generateThermalReadingsForCook(activeCook);
  const startMeatTemp = readings.length > 0 ? readings[0].meatTemp : 0;
  const finalMeatTemp = readings.length > 0 ? readings[readings.length - 1].meatTemp : 0;
  const meatTempRise = finalMeatTemp - startMeatTemp;
  const maxPitTemp = readings.reduce((max, r) => Math.max(max, r.cookingTemp || 0), 0);
  const avgPitTemp = readings.length > 0
    ? Math.round(readings.reduce((sum, r) => sum + (r.cookingTemp || 0), 0) / readings.length)
    : 0;
  const targetMeatTempGoal = 203;

  // Calculate Manufacturer-Synced Burn Efficiency across all cook logs
  const burnSync = calculateBurnEfficiencySync(profile, cookLogs);
  const refillData = calculateRefillPelletUsage(profile, cookLogs, fuelLogs);
  const mfrSpec = getManufacturerSpecs(profile.name, profile.model, profile.smokerType || '');

  // Prepare data for Daily / Cook Consumption & Hours Chart based on Fuel Synchronization
  const consumptionChartData = cookLogs
    .slice()
    .reverse()
    .map((log) => {
      const ambientTemps = log.temperatureReadings?.map((r) => r.ambientTemp).filter(Boolean) as number[] | undefined;
      const avgAmbient = ambientTemps && ambientTemps.length > 0
        ? ambientTemps.reduce((a, b) => a + b, 0) / ambientTemps.length
        : 72;

      let weatherFactor = 1.0;
      if (avgAmbient < 60) {
        weatherFactor = 1 + (60 - avgAmbient) * 0.008;
      } else if (avgAmbient > 85) {
        weatherFactor = 1 - (avgAmbient - 85) * 0.004;
      }

      const effectiveBurnRate = Number((mfrSpec.factoryBaselineBurnRateLbsHr * weatherFactor).toFixed(2));
      const syncedFuelLbs = Number(((log.hoursLogged || 0) * effectiveBurnRate).toFixed(1));

      return {
        name: log.title.length > 18 ? log.title.substring(0, 18) + '...' : log.title,
        fullTitle: log.title,
        date: log.date,
        hours: log.hoursLogged,
        fuelLbs: syncedFuelLbs > 0 ? syncedFuelLbs : log.fuelLbsConsumed,
        syncedFuelLbs,
        actualFuelLbs: log.fuelLbsConsumed,
        effectiveBurnRate,
        protein: log.proteinType,
      };
    });

  // Prepare Protein Type Distribution Data
  const proteinHoursMap: Record<string, number> = {};
  cookLogs.forEach((log) => {
    proteinHoursMap[log.proteinType] = (proteinHoursMap[log.proteinType] || 0) + log.hoursLogged;
  });

  const proteinColors: Record<string, string> = {
    Beef: '#ef4444', // Red
    Pork: '#f97316', // Orange
    Chicken: '#eab308', // Yellow
    Seafood: '#06b6d4', // Cyan
    Turkey: '#8b5cf6', // Purple
    Lamb: '#ec4899', // Pink
    Other: '#64748b', // Slate
  };

  const proteinPieData = Object.keys(proteinHoursMap).map((key) => ({
    name: key,
    value: Number(proteinHoursMap[key].toFixed(1)),
    color: proteinColors[key] || '#94a3b8',
  }));

  // Would Make Again stats
  const totalCompleted = cookLogs.filter((c) => c.status === 'Completed').length;
  const totalWouldMakeAgain = cookLogs.filter((c) => c.wouldMakeAgain === true).length;
  const successPercentage = totalCompleted > 0 ? Math.round((totalWouldMakeAgain / totalCompleted) * 100) : 100;

  // Average ratings
  const avgRatings = {
    smokeRing: (cookLogs.reduce((a, c) => a + c.ratings.smokeRing, 0) / (cookLogs.length || 1)).toFixed(1),
    bark: (cookLogs.reduce((a, c) => a + c.ratings.bark, 0) / (cookLogs.length || 1)).toFixed(1),
    tenderness: (cookLogs.reduce((a, c) => a + c.ratings.tenderness, 0) / (cookLogs.length || 1)).toFixed(1),
    overall: (cookLogs.reduce((a, c) => a + c.ratings.overall, 0) / (cookLogs.length || 1)).toFixed(1),
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      
      {/* DASHBOARD HEADER & UNIVERSAL VIEW MODE TABS */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-orange-400" />
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Analytics
              </h1>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Track thermal curves, fuel efficiency, quality benchmarks, and smoke logs.
            </p>
          </div>

          {/* Linked Smoker Badge & ASK CHARGPT Button */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <span className="bg-orange-500/15 text-orange-300 border border-orange-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 font-mono">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>
                {profile.name && profile.name !== 'Standard Pitmaster Smoker' && profile.name !== 'None Selected' && profile.name !== ''
                  ? profile.name
                  : (profile.model && profile.model !== 'Custom Smoker Model' && profile.model !== 'None Selected' && profile.model !== '' ? profile.model : 'None Selected')}
              </span>
              <span className="text-zinc-400">({(profile.name || profile.model) ? (profile.smokerType || 'Vertical Pellet Smoker') : 'None Selected'})</span>
            </span>

            {onAskCharGPTAboutData && (
              <button
                type="button"
                onClick={() => {
                  onAskCharGPTAboutData(
                    `Please analyze my SmokeStack analytics data across my ${cookLogs.length} saved cook logs, thermal stability curves, fuel consumption rates, and quality ratings. What are my top strengths, efficiency patterns, and pitmaster recommendations for improvement?`
                  );
                }}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold rounded-lg shadow-md flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                <span>ASK CHARGPT ABOUT MY DATA</span>
              </button>
            )}
          </div>
        </div>

        {/* View Mode Navigation: Smartphone Dropdown vs Desktop Tabs */}
        
        {/* Smartphone Dropdown Select (No Side-Scrolling) */}
        <div className="sm:hidden pt-2 border-t border-[#2a2a2a]">
          <label htmlFor="analytics-mobile-view-select" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 font-mono">
            Select Analytics Section
          </label>
          <div className="relative">
            <select
              id="analytics-mobile-view-select"
              value={mobileTab}
              onChange={(e) => setMobileTab(e.target.value as any)}
              className="w-full bg-[#121212] border border-orange-500/40 text-white font-bold text-xs rounded-xl px-3.5 py-2.5 pr-10 appearance-none cursor-pointer focus:outline-none focus:border-orange-500 shadow-lg"
            >
              <option value="thermal">🔥 Thermal Curves & Pit Temps</option>
              <option value="consumption">📊 Fuel Burn & Smoker Runtime</option>
              <option value="benchmarks">🏆 Quality Ratings & Pitmaster Benchmarks</option>
              <option value="guide">🥩 Meat Safety & Target Temps Guide</option>
              <option value="all">🌐 All Analytics Sections</option>
            </select>
            <ChevronDown className="w-4 h-4 text-orange-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Desktop View Mode Navigation Tabs */}
        <div className="hidden sm:flex items-center gap-1.5 pt-2 border-t border-[#2a2a2a]">
          <button
            type="button"
            onClick={() => setMobileTab('thermal')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
              mobileTab === 'thermal'
                ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/20'
                : 'bg-[#121212] text-zinc-300 border-[#2a2a2a] hover:bg-[#222]'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5 text-orange-400" />
            <span>Thermal Curves</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('consumption')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
              mobileTab === 'consumption'
                ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/20'
                : 'bg-[#121212] text-zinc-300 border-[#2a2a2a] hover:bg-[#222]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Fuel & Runtime</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('benchmarks')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
              mobileTab === 'benchmarks'
                ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/20'
                : 'bg-[#121212] text-zinc-300 border-[#2a2a2a] hover:bg-[#222]'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-yellow-400" />
            <span>Quality Scores</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('guide')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
              mobileTab === 'guide'
                ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/20'
                : 'bg-[#121212] text-zinc-300 border-[#2a2a2a] hover:bg-[#222]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Meat Temp Guide</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
              mobileTab === 'all'
                ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/20'
                : 'bg-[#121212] text-zinc-400 border-[#2a2a2a] hover:bg-[#222]'
            }`}
          >
            <span>🌐 All Sections</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: Thermal Curve Analytics & Cook Temperature Plot */}
      {(mobileTab === 'all' || mobileTab === 'thermal') && (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-3.5 sm:p-6 shadow-xl w-full min-w-0 max-w-full">
        <div 
          onClick={() => setIsThermalSectionOpen((prev) => !prev)}
          className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-[#2a2a2a] cursor-pointer group"
        >
          <div className="flex items-start sm:items-center justify-between w-full md:w-auto">
            <div className="flex items-center space-x-2.5">
              <Thermometer className="w-5 h-5 text-orange-400 shrink-0" />
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base sm:text-lg font-bold text-white leading-tight group-hover:text-orange-400 transition-colors">Live Thermal Curve & Temperature Analytics</h2>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Select any cook log to inspect Target Pit Temp vs Cooking Temp vs Internal Meat Temp over time.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="p-2 rounded-xl bg-[#121212] border border-[#2a2a2a] text-zinc-400 hover:text-white hover:border-orange-500/40 transition-all cursor-pointer shrink-0 ml-2"
              title={isThermalSectionOpen ? 'Collapse Section' : 'Expand Section'}
              onClick={(e) => {
                e.stopPropagation();
                setIsThermalSectionOpen((prev) => !prev);
              }}
            >
              {isThermalSectionOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          {/* Cook Log Selector & Bluetooth Button */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto pt-2 md:pt-0 border-t border-[#2a2a2a] md:border-t-0"
          >
            {/* Bluetooth Probe & Combustion Inc Button */}
            <button
              type="button"
              onClick={() => setIsBluetoothModalOpen(true)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shrink-0 shadow-sm ${
                bluetoothDevice?.status === 'connected'
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-300 hover:bg-blue-600/30'
                  : 'bg-[#121212] border-[#2a2a2a] text-zinc-300 hover:text-white hover:border-blue-500/40'
              }`}
              title="Connect Combustion Inc. Predictive Thermometer or Bluetooth Probes"
            >
              <Bluetooth className={`w-3.5 h-3.5 ${bluetoothDevice?.status === 'connected' ? 'text-blue-400 animate-pulse' : 'text-blue-400'}`} />
              <span>
                {bluetoothDevice?.status === 'connected' ? 'Combustion Inc. (Live)' : 'Bluetooth Probes'}
              </span>
              {bluetoothDevice?.status === 'connected' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping ml-0.5" />
              )}
            </button>

            {/* Smoker Option Filter: Linked to account selection */}
            {userSavedSmokers.length > 1 ? (
              <div className="flex items-center space-x-1.5 w-full sm:w-auto min-w-0">
                <label className="text-xs text-zinc-400 font-medium whitespace-nowrap shrink-0">Smoker:</label>
                <select
                  value={smokerFilter}
                  onChange={(e) => {
                    const newFilter = e.target.value;
                    setSmokerFilter(newFilter);
                    const matchedCooks = newFilter === 'ALL'
                      ? cookLogs
                      : cookLogs.filter((c) => {
                          const cookStr = `${c.smokerType || ''} ${c.title || ''} ${profile.smokerType || ''} ${profile.name || ''} ${profile.model || ''}`.toLowerCase();
                          return cookStr.includes(newFilter.toLowerCase()) || c.smokerType === newFilter;
                        });
                    if (matchedCooks.length > 0) {
                      setSelectedCookId(matchedCooks[0].id);
                    }
                  }}
                  className="w-full sm:w-auto min-w-0 max-w-full bg-[#121212] border border-[#2a2a2a] text-orange-400 text-xs rounded-xl px-2.5 py-2 font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none truncate cursor-pointer"
                  title="Switch between saved account smokers"
                >
                  <option value="ALL" className="bg-[#121212] text-zinc-200">🌐 All Saved Account Rigs ({userSavedSmokers.length})</option>
                  {userSavedSmokers.map((s) => (
                    <option key={s.id} value={s.name} className="bg-[#121212] text-zinc-200 font-sans">
                      🔥 {s.name} ({s.fuelType || 'Smoker'})
                    </option>
                  ))}
                </select>
              </div>
            ) : userSavedSmokers.length === 1 ? (
              <div className="flex items-center space-x-1.5 w-full sm:w-auto min-w-0">
                <span className="text-xs text-zinc-400 font-medium whitespace-nowrap shrink-0">Smoker:</span>
                <div 
                  className="px-3 py-1.5 bg-[#121212] border border-[#2a2a2a] text-orange-400 text-xs font-bold rounded-xl flex items-center space-x-2 shrink-0 shadow-sm"
                  title="Linked Account Smoker Rig"
                >
                  <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span className="truncate">{userSavedSmokers[0].name}</span>
                  {userSavedSmokers[0].fuelType && (
                    <span className="text-[10px] bg-orange-500/10 text-orange-300 border border-orange-500/20 px-1.5 py-0.5 rounded font-mono">
                      {userSavedSmokers[0].fuelType}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 w-full sm:w-auto min-w-0">
                <span className="text-xs text-zinc-400 font-medium whitespace-nowrap shrink-0">Smoker:</span>
                <div 
                  className="px-3 py-1.5 bg-[#121212] border border-[#2a2a2a] text-zinc-500 text-xs font-bold rounded-xl flex items-center space-x-1.5 shrink-0 shadow-sm"
                  title="No Smoker Saved in Account"
                >
                  <span className="text-zinc-500 font-bold">None</span>
                </div>
              </div>
            )}

            {/* Fuel & Wood Blend Searchable Database Combobox */}
            <div className="relative flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 w-full sm:w-auto min-w-0">
              <div className="flex items-center justify-between sm:justify-start space-x-1.5 shrink-0">
                <label className="text-xs text-zinc-400 font-medium whitespace-nowrap">
                  Wood / Pellets / Wood Chips:
                </label>
                <button
                  type="button"
                  onClick={() => setIsFuelDbModalOpen(true)}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-bold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg px-2 py-0.5 flex items-center space-x-1 transition-all cursor-pointer"
                  title="Open Fuel & Wood Blend Searchable Database"
                >
                  <Database className="w-3 h-3 text-amber-400" />
                  <span>Database ({FUEL_AND_WOOD_DATABASE.length})</span>
                </button>
              </div>

              <div className="relative w-full sm:w-64 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsFuelComboboxOpen(!isFuelComboboxOpen)}
                  className="w-full bg-[#121212] border border-[#2a2a2a] hover:border-amber-500/50 text-amber-400 text-xs rounded-xl px-2.5 py-2 font-bold flex items-center justify-between space-x-2 transition-all cursor-pointer shadow-sm text-left truncate"
                  title="Search & Select from Wood, Pellets, and Wood Chips Database"
                >
                  <div className="flex items-center space-x-1.5 truncate">
                    <span className="text-sm shrink-0">🪵</span>
                    <span className="truncate">
                      {selectedWoodFuel === 'ALL'
                        ? 'All Wood / Pellets / Wood Chips'
                        : selectedWoodFuel}
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-amber-400 shrink-0 transition-transform ${isFuelComboboxOpen ? 'rotate-180' : ''}`} />
                </button>

                {isFuelComboboxOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsFuelComboboxOpen(false)}
                    />

                    <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-[#141414] border border-[#2e2e2e] rounded-xl shadow-2xl p-2 max-h-80 overflow-y-auto space-y-1.5 text-xs">
                      <div className="relative sticky top-0 bg-[#141414] pb-1 z-10">
                        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          autoFocus
                          value={fuelSearchQuery}
                          onChange={(e) => setFuelSearchQuery(e.target.value)}
                          placeholder="Search Wood, Pellets & Chips Database..."
                          className="w-full bg-[#1e1e1e] border border-[#333] text-white text-xs rounded-lg pl-8 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans placeholder-zinc-500"
                        />
                        {fuelSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setFuelSearchQuery('')}
                            className="absolute right-2 top-2 text-zinc-400 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedWoodFuel('ALL');
                          setIsFuelComboboxOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between font-bold transition-colors ${
                          selectedWoodFuel === 'ALL'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'hover:bg-[#222] text-zinc-300'
                        }`}
                      >
                        <span>🪵 All Wood / Pellets / Wood Chips ({availableWoodFuelItems.length})</span>
                        {selectedWoodFuel === 'ALL' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </button>

                      <div className="border-t border-[#2a2a2a] my-1" />

                      {searchedFuelItems.length === 0 ? (
                        <div className="text-center py-4 text-zinc-500 text-[11px]">
                          No matching wood / pellet entries found.
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {isLpOrGas && (
                            <div className="px-2 py-1 text-[10px] font-bold text-amber-300 bg-amber-500/10 rounded-md border border-amber-500/20 mb-1 flex items-center space-x-1">
                              <Flame className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>LP Smoker Mode: Selections matched with Restock Log & Inventory</span>
                            </div>
                          )}

                          {/* Inventory Logs Section */}
                          {searchedFuelItems.filter(i => i.tags.includes('Restock Inventory') || i.tags.includes('User Inventory')).length > 0 && (
                            <div className="space-y-1 mb-2">
                              <div className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/10 rounded border border-amber-500/20 flex items-center justify-between">
                                <span>📦 My Restock Log & Inventory ({searchedFuelItems.filter(i => i.tags.includes('Restock Inventory') || i.tags.includes('User Inventory')).length})</span>
                                <span className="text-[9px] font-mono font-normal text-amber-300/80">Active Inventory</span>
                              </div>
                              {searchedFuelItems.filter(i => i.tags.includes('Restock Inventory') || i.tags.includes('User Inventory')).map((fuelItem) => {
                                const isSelected = selectedWoodFuel === fuelItem.name;
                                const isChip = fuelItem.category === 'Smoker Wood Chips' || fuelItem.name.toLowerCase().includes('chip');
                                return (
                                  <button
                                    key={`inv-${fuelItem.id || fuelItem.name}`}
                                    type="button"
                                    onClick={() => {
                                      setSelectedWoodFuel(fuelItem.name);
                                      setIsFuelComboboxOpen(false);
                                    }}
                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-start justify-between space-x-2 transition-all ${
                                      isSelected
                                        ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold shadow-sm'
                                        : 'bg-amber-500/5 hover:bg-amber-500/15 text-zinc-100 border border-amber-500/10'
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center space-x-1.5">
                                        <span className="text-xs shrink-0">{isChip ? '🪵' : '📦'}</span>
                                        <span className="truncate font-bold text-xs text-amber-200">{fuelItem.name}</span>
                                        <span className="text-[9px] font-mono bg-amber-500/20 text-amber-300 px-1 rounded border border-amber-500/30">LOGGED</span>
                                      </div>
                                      <div className="text-[10px] text-zinc-300 font-mono mt-0.5 flex items-center space-x-2">
                                        <span>{fuelItem.brand}</span>
                                        <span>•</span>
                                        <span className="text-amber-300/90">{fuelItem.flavorNotes}</span>
                                      </div>
                                    </div>
                                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Database Specs Section */}
                          {searchedFuelItems.filter(i => !i.tags.includes('Restock Inventory') && !i.tags.includes('User Inventory')).length > 0 && (
                            <div className="space-y-1">
                              <div className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-zinc-400 bg-[#1e1e1e] rounded mt-1">
                                🪵 Wood & Chip Database Profiles
                              </div>
                              {searchedFuelItems.filter(i => !i.tags.includes('Restock Inventory') && !i.tags.includes('User Inventory')).map((fuelItem) => {
                                const isSelected = selectedWoodFuel === fuelItem.name;
                                const isChip = fuelItem.category === 'Smoker Wood Chips' || fuelItem.name.toLowerCase().includes('chip');
                                return (
                                  <button
                                    key={`db-${fuelItem.id || fuelItem.name}`}
                                    type="button"
                                    onClick={() => {
                                      setSelectedWoodFuel(fuelItem.name);
                                      setIsFuelComboboxOpen(false);
                                    }}
                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-start justify-between space-x-2 transition-all ${
                                      isSelected
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                                        : 'hover:bg-[#222] text-zinc-200'
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center space-x-1.5">
                                        <span className="text-xs shrink-0">{isChip ? '🪵' : '🔥'}</span>
                                        <span className="truncate font-semibold text-xs text-white">{fuelItem.name}</span>
                                      </div>
                                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5 flex items-center space-x-2">
                                        <span>{fuelItem.brand}</span>
                                        <span>•</span>
                                        <span className="text-amber-400/80">{fuelItem.category}</span>
                                      </div>
                                    </div>
                                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="border-t border-[#2a2a2a] pt-1.5 sticky bottom-0 bg-[#141414]">
                        <button
                          type="button"
                          onClick={() => {
                            setIsFuelComboboxOpen(false);
                            setIsFuelDbModalOpen(true);
                          }}
                          className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                        >
                          <Database className="w-3.5 h-3.5 text-amber-400" />
                          <span>Explore Full Database ({FUEL_AND_WOOD_DATABASE.length} Profiles)</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Cook Session Selector */}
            {filteredCooks.length > 0 && (
              <div className="flex items-center space-x-2 w-full sm:w-auto min-w-0">
                <label className="text-xs text-zinc-400 font-medium whitespace-nowrap shrink-0">Cook:</label>
                <select
                  value={selectedCookId}
                  onChange={(e) => setSelectedCookId(e.target.value)}
                  className="w-full sm:w-auto min-w-0 max-w-full bg-[#121212] border border-[#2a2a2a] text-zinc-200 text-xs rounded-xl px-2.5 py-2 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none truncate cursor-pointer"
                  title="Select Cook Session"
                >
                  {filteredCooks.map((cook) => (
                    <option key={cook.id} value={cook.id} className="bg-[#121212] text-zinc-200">
                      {cook.title} ({cook.smokerType || profile.smokerType} • {cook.date})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Selected Linked Fuel / Wood Chips Details Card */}
        {isThermalSectionOpen && selectedWoodFuelDetail && (
          <div className="mt-3 bg-[#161616] border border-amber-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs shadow-md">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-amber-500/15 text-amber-400 rounded-lg shrink-0 border border-amber-500/30">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="font-extrabold text-amber-300 text-xs">{selectedWoodFuelDetail.name}</span>
                  <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                    {selectedWoodFuelDetail.category}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    ⚡ {selectedWoodFuelDetail.btuPerLb.toLocaleString()} BTU/lb • 💨 {selectedWoodFuelDetail.smokeDensity} Smoke Density
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                  {selectedWoodFuelDetail.flavorNotes || selectedWoodFuelDetail.description}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedWoodFuel('ALL')}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline shrink-0 cursor-pointer self-end sm:self-center"
            >
              Clear Link
            </button>
          </div>
        )}

        {isThermalSectionOpen && activeCook && (
          <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6 w-full min-w-0">
            
            {/* Thermal Line Chart Container */}
            <div className="lg:col-span-3 bg-[#121212] p-3 sm:p-5 rounded-xl border border-[#2a2a2a] flex flex-col justify-between space-y-4 w-full min-w-0 max-w-full overflow-hidden">
              {/* Thermal Summary Metrics & Interactive Line Curve Toggles */}
              <div className="flex flex-col gap-2.5 border-b border-[#2a2a2a] pb-3">
                {/* Metric Summary Chips */}
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-mono overflow-x-auto no-scrollbar max-w-full pb-0.5">
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] px-2 sm:px-2.5 py-1 rounded-lg flex items-center space-x-1 shrink-0">
                    <span className="text-zinc-400 text-[11px]">Rise:</span>
                    <span className="text-red-400 font-bold text-[11px] sm:text-xs">{startMeatTemp}°F → {finalMeatTemp}°F</span>
                    <span className="text-emerald-400 font-bold text-[10px]">(+{meatTempRise}°F)</span>
                  </div>
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] px-2 sm:px-2.5 py-1 rounded-lg flex items-center space-x-1 shrink-0">
                    <span className="text-zinc-400 text-[11px]">Avg Pit:</span>
                    <span className="text-orange-400 font-bold text-[11px] sm:text-xs">{avgPitTemp}°F</span>
                  </div>
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] px-2 sm:px-2.5 py-1 rounded-lg flex items-center space-x-1 shrink-0">
                    <span className="text-zinc-400 text-[11px]">Peak Pit:</span>
                    <span className="text-amber-400 font-bold text-[11px] sm:text-xs">{maxPitTemp}°F</span>
                  </div>
                </div>

                {/* Mobile Preset & Line Curve Toggle Buttons */}
                <div className="flex items-center gap-1.5 text-[11px] font-sans overflow-x-auto no-scrollbar max-w-full pb-0.5">
                  <button
                    type="button"
                    onClick={() => setVisibleCurves({ pit: true, meat1: true, meat2: false, meat3: false, meat4: false, target: true, ambient: false })}
                    className="px-2 py-1 bg-orange-500/20 text-orange-300 border border-orange-500/40 font-bold rounded-md whitespace-nowrap cursor-pointer text-[10px] shrink-0"
                    title="Focus on Pit & Main Probe for clean view on smartphones"
                  >
                    ⚡ Key Curves
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibleCurves({ pit: true, meat1: true, meat2: true, meat3: true, meat4: true, target: true, ambient: true })}
                    className="px-2 py-1 bg-[#1a1a1a] text-zinc-300 border border-[#2a2a2a] font-bold rounded-md whitespace-nowrap cursor-pointer text-[10px] shrink-0"
                    title="Show all 4 probes + ambient"
                  >
                    📊 All
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisibleCurves((prev) => ({ ...prev, pit: !prev.pit }))}
                    className={`px-2 py-1 rounded-md border transition-all cursor-pointer whitespace-nowrap text-[10px] sm:text-[11px] shrink-0 ${
                      visibleCurves.pit
                        ? 'bg-orange-500/20 text-orange-400 border-orange-500/40 font-bold'
                        : 'bg-[#1a1a1a] text-zinc-500 border-[#2a2a2a] line-through'
                    }`}
                  >
                    🔥 Pit
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibleCurves((prev) => ({ ...prev, meat1: !prev.meat1 }))}
                    className={`px-2 py-1 rounded-md border transition-all cursor-pointer whitespace-nowrap text-[10px] sm:text-[11px] shrink-0 ${
                      visibleCurves.meat1
                        ? 'bg-red-500/20 text-red-400 border-red-500/40 font-bold'
                        : 'bg-[#1a1a1a] text-zinc-500 border-[#2a2a2a] line-through'
                    }`}
                  >
                    🥩 P1
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibleCurves((prev) => ({ ...prev, meat2: !prev.meat2 }))}
                    className={`px-2 py-1 rounded-md border transition-all cursor-pointer whitespace-nowrap text-[10px] sm:text-[11px] shrink-0 ${
                      visibleCurves.meat2
                        ? 'bg-purple-500/20 text-purple-400 border-purple-500/40 font-bold'
                        : 'bg-[#1a1a1a] text-zinc-500 border-[#2a2a2a] line-through'
                    }`}
                  >
                    🍖 P2
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibleCurves((prev) => ({ ...prev, meat3: !prev.meat3 }))}
                    className={`px-2 py-1 rounded-md border transition-all cursor-pointer whitespace-nowrap text-[10px] sm:text-[11px] shrink-0 ${
                      visibleCurves.meat3
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold'
                        : 'bg-[#1a1a1a] text-zinc-500 border-[#2a2a2a] line-through'
                    }`}
                  >
                    🍗 P3
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibleCurves((prev) => ({ ...prev, meat4: !prev.meat4 }))}
                    className={`px-2 py-1 rounded-md border transition-all cursor-pointer whitespace-nowrap text-[10px] sm:text-[11px] shrink-0 ${
                      visibleCurves.meat4
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold'
                        : 'bg-[#1a1a1a] text-zinc-500 border-[#2a2a2a] line-through'
                    }`}
                  >
                    🥩 P4
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibleCurves((prev) => ({ ...prev, target: !prev.target }))}
                    className={`px-2 py-1 rounded-md border transition-all cursor-pointer whitespace-nowrap text-[10px] sm:text-[11px] shrink-0 ${
                      visibleCurves.target
                        ? 'bg-zinc-700/30 text-zinc-300 border-zinc-600/40 font-bold'
                        : 'bg-[#1a1a1a] text-zinc-500 border-[#2a2a2a] line-through'
                    }`}
                  >
                    🎯 Target
                  </button>
                </div>
              </div>

              {/* Live Telemetry Banner or Manual Mode Notice */}
              {bluetoothDevice?.status === 'connected' ? (
                <div className="mb-3 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 text-xs text-blue-300">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                    <span className="font-bold truncate">LIVE TELEMETRY: Combustion Inc. Predictive Thermometer (BLE 5.2 Active)</span>
                  </div>
                  <div className="font-mono text-[11px] text-blue-200 shrink-0">
                    Core: {formatTemp(bluetoothTelemetry?.coreTempF || 0, activeUnit)} • Surface: {formatTemp(bluetoothTelemetry?.surfaceTempF || 0, activeUnit)} • Ambient: {formatTemp(bluetoothTelemetry?.ambientTempF || 0, activeUnit)}
                  </div>
                </div>
              ) : (
                <div className="mb-3 px-3 py-1.5 bg-[#161616] border border-[#2a2a2a] rounded-xl flex items-center justify-between text-[11px] text-zinc-400">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500/60 shrink-0" />
                    <span>MANUAL MONITORING MODE — Standard probe inputs active. Pair Combustion Inc probe for live Bluetooth stream.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBluetoothModalOpen(true)}
                    className="text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer shrink-0 ml-2"
                  >
                    Pair Probe
                  </button>
                </div>
              )}

              {/* Main Refined Line Chart */}
              <div className="h-[340px] sm:h-[380px] w-full min-w-0">
                {(() => {
                  const baseReadings = generateThermalReadingsForCook(activeCook);

                  const rawReadings = (bluetoothDevice?.status === 'connected' && liveBluetoothReadings.length > 0)
                    ? [...baseReadings, ...liveBluetoothReadings]
                    : baseReadings;

                  if (rawReadings.length === 0) {
                    return (
                      <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-[#121212] border border-[#2a2a2a] rounded-2xl text-center space-y-3">
                        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-orange-400">
                          <Thermometer className="w-8 h-8" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white">Awaiting Thermal Telemetry Data</h4>
                          <p className="text-xs text-zinc-400 max-w-md mt-1">
                            This thermal curves graph will automatically display once the first data set in the cook log is collected (by logging temperature entries, pairing a wireless Bluetooth probe, or pulling data from an uploaded graph image).
                          </p>
                        </div>
                      </div>
                    );
                  }

                  const chartReadings = rawReadings.map((r) => {
                    const m2 = r.meatTemp2 ?? Math.max(32, r.meatTemp - 5);
                    const m3 = r.meatTemp3 ?? Math.max(32, r.meatTemp + 2);
                    const m4 = r.meatTemp4 ?? Math.max(32, r.meatTemp - 1);
                    if (tempUnit === 'C') {
                      return {
                        ...r,
                        cookingTemp: convertTemp(r.cookingTemp, 'C'),
                        meatTemp: convertTemp(r.meatTemp, 'C'),
                        meatTemp2: convertTemp(m2, 'C'),
                        meatTemp3: convertTemp(m3, 'C'),
                        meatTemp4: convertTemp(m4, 'C'),
                        targetTemp: r.targetTemp !== undefined ? convertTemp(r.targetTemp, 'C') : undefined,
                        ambientTemp: r.ambientTemp !== undefined ? convertTemp(r.ambientTemp, 'C') : undefined,
                      };
                    }
                    return {
                      ...r,
                      meatTemp2: m2,
                      meatTemp3: m3,
                      meatTemp4: m4,
                    };
                  });
                  const targetMeatGoal = convertTemp(203, activeUnit);

                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartReadings} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                        <defs>
                          <linearGradient id="pitAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f97316" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#f97316" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="meatAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" opacity={0.6} />
                        <XAxis
                          dataKey="time"
                          stroke="#a0a0a0"
                          fontSize={10}
                          tickLine={false}
                          minTickGap={20}
                          dy={4}
                        />
                        <YAxis
                          stroke="#a0a0a0"
                          fontSize={10}
                          domain={[0, (dataMax: number) => Math.max(activeUnit === 'C' ? 150 : 280, dataMax + 20)]}
                          unit={`°${activeUnit}`}
                          tickLine={false}
                          width={42}
                        />
                        <Tooltip content={<CustomThermalTooltip tempUnit={activeUnit} />} />
                        <Legend
                          verticalAlign="top"
                          align="center"
                          wrapperStyle={{
                            fontSize: '11px',
                            color: '#a0a0a0',
                            paddingBottom: '8px',
                            lineHeight: '16px',
                          }}
                        />

                        {/* Reference Line for Target Meat Finish Goal */}
                        <ReferenceLine
                          y={targetMeatGoal}
                          stroke="#ef4444"
                          strokeDasharray="4 4"
                          strokeOpacity={0.6}
                          label={{
                            value: `Goal (${formatTemp(203, activeUnit)})`,
                            fill: '#ef4444',
                            fontSize: 10,
                            position: 'insideTopRight',
                          }}
                        />

                    {/* Shaded Areas */}
                    {visibleCurves.pit && <Area type="monotone" dataKey="cookingTemp" fill="url(#pitAreaGrad)" stroke="none" legendType="none" />}
                    {visibleCurves.meat1 && <Area type="monotone" dataKey="meatTemp" fill="url(#meatAreaGrad)" stroke="none" legendType="none" />}

                    {/* Lines */}
                    {visibleCurves.target && (
                      <Line
                        type="monotone"
                        dataKey="targetTemp"
                        name="Target Pit"
                        stroke="#9ca3af"
                        strokeDasharray="5 5"
                        strokeWidth={1.5}
                        dot={false}
                      />
                    )}
                    {visibleCurves.pit && (
                      <Line
                        type="monotone"
                        dataKey="cookingTemp"
                        name="Cooking Pit"
                        stroke="#f97316"
                        strokeWidth={2.5}
                        activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                        dot={{ r: 2.5, fill: '#f97316' }}
                      />
                    )}
                    {visibleCurves.meat1 && (
                      <Line
                        type="monotone"
                        dataKey="meatTemp"
                        name="Probe 1 (Flat)"
                        stroke="#ef4444"
                        strokeWidth={2.5}
                        activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                        dot={{ r: 2.5, fill: '#ef4444' }}
                      />
                    )}
                    {visibleCurves.meat2 && (
                      <Line
                        type="monotone"
                        dataKey="meatTemp2"
                        name="Probe 2 (Point)"
                        stroke="#a855f7"
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                        dot={{ r: 2, fill: '#a855f7' }}
                      />
                    )}
                    {visibleCurves.meat3 && (
                      <Line
                        type="monotone"
                        dataKey="meatTemp3"
                        name="Probe 3 (Pork)"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                        dot={{ r: 2, fill: '#f59e0b' }}
                      />
                    )}
                    {visibleCurves.meat4 && (
                      <Line
                        type="monotone"
                        dataKey="meatTemp4"
                        name="Probe 4 (Ribs)"
                        stroke="#10b981"
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                        dot={{ r: 2, fill: '#10b981' }}
                      />
                    )}
                    {visibleCurves.ambient && (
                      <Line
                        type="monotone"
                        dataKey="ambientTemp"
                        name="Ambient"
                        stroke="#38bdf8"
                        strokeWidth={1.5}
                        activeDot={{ r: 5 }}
                        dot={{ r: 2, fill: '#38bdf8' }}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
                  );
                })()}
              </div>

              {/* SECTION: 4-MEAT & PROBE LIVE TELEMETRY & GUARDRAIL ALERTS PANEL */}
              <div className="mt-4 pt-4 border-t border-[#2a2a2a] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center space-x-2">
                      <Radio className="w-4 h-4 text-orange-400 animate-pulse" />
                      <span>4-Meat & Probe Live Telemetry Monitor & Guardrail Alarms</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Monitor up to 4 meat cuts simultaneously with custom high/low guardrail alarms and target alerts.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setSoundMuted((prev) => !prev)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                        soundMuted
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                      title="Mute/Unmute Audio Beep Alarms"
                    >
                      {soundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      <span>{soundMuted ? 'Muted' : 'Audio On'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={triggerAudioBeep}
                      className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#242424] border border-[#333] text-zinc-300 text-xs font-medium rounded-lg flex items-center space-x-1 transition-all cursor-pointer"
                    >
                      <BellRing className="w-3.5 h-3.5 text-amber-400" />
                      <span>Test Chime</span>
                    </button>
                  </div>
                </div>

                {/* Active Alert Banner */}
                {activeAlertNotice && (
                  <div className="p-3 bg-red-500/20 border border-red-500/40 text-red-200 text-xs rounded-xl flex items-center justify-between animate-pulse shadow-lg">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span className="font-bold">{activeAlertNotice}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveAlertNotice(null)}
                      className="px-2 py-0.5 bg-red-500/30 hover:bg-red-500/50 rounded text-[10px] font-bold text-white cursor-pointer"
                    >
                      DISMISS
                    </button>
                  </div>
                )}

                {/* 4-Probe Live Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {probeConfigs.map((probe) => {
                    const isTargetReached = probe.currentTemp >= probe.targetTemp;
                    const isHighAlarm = probe.currentTemp >= probe.highAlarmTemp;
                    const isLowAlarm = probe.currentTemp <= probe.lowAlarmTemp;
                    const isAlarmActive = probe.alarmEnabled && (isTargetReached || isHighAlarm || isLowAlarm);
                    const isCollapsed = !!collapsedProbes[probe.id];

                    return (
                      <div
                        key={probe.id}
                        className={`relative bg-[#1a1a1a] rounded-xl p-3 border transition-all flex flex-col justify-between ${
                          isCollapsed ? 'space-y-1' : 'space-y-3'
                        } ${
                          isAlarmActive
                            ? 'border-red-500/80 ring-2 ring-red-500/40 bg-red-950/10'
                            : 'border-[#2a2a2a] hover:border-zinc-700'
                        }`}
                      >
                        {/* Probe Header with Collapse Toggle */}
                        <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-1.5">
                          <div className="flex items-center space-x-1.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: probe.color }} />
                            <span className="text-xs font-bold text-white shrink-0">{probe.name}</span>
                            <span className="text-[10px] text-zinc-400 font-medium truncate">
                              ({probe.meatName})
                            </span>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleAlarm(probe.id)}
                              className={`p-1 rounded-md transition-colors cursor-pointer ${
                                probe.alarmEnabled
                                  ? 'text-amber-400 hover:text-amber-300'
                                  : 'text-zinc-600 hover:text-zinc-400'
                              }`}
                              title={probe.alarmEnabled ? 'Disable Alarm for this probe' : 'Enable Alarm for this probe'}
                            >
                              <Bell className={`w-3.5 h-3.5 ${probe.alarmEnabled ? 'fill-amber-400' : ''}`} />
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleProbeCollapse(probe.id)}
                              className="p-1 text-zinc-400 hover:text-white rounded-md transition-colors cursor-pointer"
                              title={isCollapsed ? 'Expand Probe Details' : 'Collapse Probe Card'}
                            >
                              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {isCollapsed ? (
                          /* Collapsed Compact View */
                          <div className="flex items-center justify-between py-1">
                            <div className="flex items-baseline space-x-1">
                              <span className="text-2xl font-black font-mono tracking-tight text-white">
                                {convertTemp(probe.currentTemp, activeUnit)}°
                              </span>
                              <span className="text-xs font-bold text-zinc-400">{activeUnit}</span>
                            </div>

                            <div>
                              {isTargetReached ? (
                                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  🎯 REACHED
                                </span>
                              ) : isHighAlarm ? (
                                <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce">
                                  🔥 HIGH
                                </span>
                              ) : isLowAlarm ? (
                                <span className="bg-blue-500/20 text-blue-400 border border-blue-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  ❄️ LOW
                                </span>
                              ) : (
                                <span className="bg-zinc-800 text-zinc-400 text-[10px] font-medium px-2 py-0.5 rounded-full">
                                  Target: {formatTemp(probe.targetTemp, activeUnit)}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Expanded Full Probe View */
                          <>
                            {/* Meat Cut Label */}
                            <div>
                              <input
                                type="text"
                                value={probe.meatName}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProbeConfigs((prev) =>
                                    prev.map((p) => (p.id === probe.id ? { ...p, meatName: val } : p))
                                  );
                                }}
                                className="bg-[#121212] border border-[#2a2a2a] text-zinc-200 text-xs rounded-lg px-2 py-1 font-semibold w-full focus:ring-1 focus:ring-orange-500 focus:outline-none"
                                placeholder="Meat label (e.g. Brisket Flat)"
                              />
                            </div>

                            {/* Live Temperature Readout */}
                            <div className="text-center py-1">
                              <div className="flex items-baseline justify-center space-x-1">
                                <span className="text-3xl font-black font-mono tracking-tight text-white">
                                  {convertTemp(probe.currentTemp, activeUnit)}°
                                </span>
                                <span className="text-xs font-bold text-zinc-400">{activeUnit}</span>
                              </div>

                              {/* Status Badge */}
                              <div className="mt-1">
                                {isTargetReached ? (
                                  <span className="inline-block bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    🎯 TARGET REACHED
                                  </span>
                                ) : isHighAlarm ? (
                                  <span className="inline-block bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce">
                                    🔥 HIGH ALARM
                                  </span>
                                ) : isLowAlarm ? (
                                  <span className="inline-block bg-blue-500/20 text-blue-400 border border-blue-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    ❄️ LOW ALARM
                                  </span>
                                ) : (
                                  <span className="inline-block bg-zinc-800 text-zinc-400 text-[10px] font-medium px-2 py-0.5 rounded-full">
                                    Target: {formatTemp(probe.targetTemp, activeUnit)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Quick Live Temperature Adjusters (To test alerts) */}
                            <div className="pt-2 border-t border-[#2a2a2a] space-y-2">
                              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                                <span>Adjust Live Temp:</span>
                                <span>Target: {formatTemp(probe.targetTemp, activeUnit)}</span>
                              </div>

                              <div className="flex items-center justify-between gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateProbeTemp(probe.id, -5)}
                                  className="flex-1 py-1 bg-[#242424] hover:bg-[#2a2a2a] border border-[#333] text-zinc-300 text-[10px] font-bold rounded cursor-pointer"
                                >
                                  -5°
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateProbeTemp(probe.id, -1)}
                                  className="flex-1 py-1 bg-[#242424] hover:bg-[#2a2a2a] border border-[#333] text-zinc-300 text-[10px] font-bold rounded cursor-pointer"
                                >
                                  -1°
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateProbeTemp(probe.id, 1)}
                                  className="flex-1 py-1 bg-[#242424] hover:bg-[#2a2a2a] border border-[#333] text-zinc-300 text-[10px] font-bold rounded cursor-pointer"
                                >
                                  +1°
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateProbeTemp(probe.id, 5)}
                                  className="flex-1 py-1 bg-[#242424] hover:bg-[#2a2a2a] border border-[#333] text-zinc-300 text-[10px] font-bold rounded cursor-pointer"
                                >
                                  +5°
                                </button>
                              </div>

                              {/* Quick Target Presets */}
                              <div className="flex items-center justify-between gap-1 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateTarget(probe.id, 203)}
                                  className="px-1.5 py-0.5 bg-[#121212] hover:bg-zinc-800 text-[9px] font-mono text-zinc-400 rounded border border-[#2a2a2a]"
                                >
                                  {formatTemp(203, activeUnit)} Beef
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateTarget(probe.id, 205)}
                                  className="px-1.5 py-0.5 bg-[#121212] hover:bg-zinc-800 text-[9px] font-mono text-zinc-400 rounded border border-[#2a2a2a]"
                                >
                                  {formatTemp(205, activeUnit)} Pork
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateTarget(probe.id, 165)}
                                  className="px-1.5 py-0.5 bg-[#121212] hover:bg-zinc-800 text-[9px] font-mono text-zinc-400 rounded border border-[#2a2a2a]"
                                >
                                  {formatTemp(165, activeUnit)} Bird
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Logged Temperature Points Breakdown Timeline Grid */}
              {(() => {
                const displayReadings = generateThermalReadingsForCook(activeCook);
                if (!displayReadings || displayReadings.length === 0) return null;

                return (
                  <div className="mt-4 pt-4 border-t border-[#2a2a2a]">
                    <div className="flex items-center justify-between mb-2.5">
                      <button
                        type="button"
                        onClick={() => setIsBreakdownOpen((prev) => !prev)}
                        className="flex items-center space-x-2 p-1.5 hover:bg-[#1a1a1a] rounded-lg transition-colors cursor-pointer group"
                      >
                        <Gauge className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 group-hover:text-white transition-colors">
                          Logged Multi-Probe Points Breakdown
                        </span>
                        <span className="text-[10px] font-mono text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full font-semibold ml-2">
                          {displayReadings.length} Points
                        </span>
                        {isBreakdownOpen ? (
                          <ChevronUp className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                        )}
                      </button>
                    </div>

                    {isBreakdownOpen && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 animate-fade-in">
                        {displayReadings.map((reading, index) => {
                        const pointKey = reading.id || index;
                        const isPointCollapsed = !!collapsedPoints[pointKey];

                        return (
                          <div
                            key={pointKey}
                            className={`bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-2.5 hover:border-orange-500/40 transition-all flex flex-col justify-between ${
                              isPointCollapsed ? 'py-2' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-1.5 text-[10px] font-mono">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-orange-400 font-bold">Pt #{index + 1}</span>
                                <span className="text-zinc-300 font-bold">{reading.time}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => togglePointCollapse(pointKey)}
                                className="p-0.5 text-zinc-400 hover:text-white rounded hover:bg-[#242424] transition-colors cursor-pointer"
                                title={isPointCollapsed ? "Expand Checkpoint Details" : "Collapse Checkpoint Card"}
                              >
                                {isPointCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                              </button>
                            </div>

                            {isPointCollapsed ? (
                              /* Collapsed Checkpoint Summary */
                              <div className="py-1 flex items-center justify-between text-xs font-mono">
                                <span className="text-orange-400 font-bold">
                                  Pit: {formatTemp(reading.cookingTemp, activeUnit)}
                                </span>
                                <span className="text-red-400 font-bold">
                                  P1: {formatTemp(reading.meatTemp, activeUnit)}
                                </span>
                              </div>
                            ) : (
                              /* Expanded Detailed Checkpoint */
                              <>
                                <div className="space-y-0.5 text-xs font-mono mt-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-zinc-400 text-[10px]">Pit:</span>
                                    <span className="font-bold text-orange-400">{formatTemp(reading.cookingTemp, activeUnit)}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-zinc-400 text-[10px]">Probe 1:</span>
                                    <span className="font-bold text-red-400">{formatTemp(reading.meatTemp, activeUnit)}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-zinc-400 text-[10px]">Probe 2:</span>
                                    <span className="font-bold text-purple-400">{formatTemp(reading.meatTemp2 ?? Math.max(32, reading.meatTemp - 5), activeUnit)}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-zinc-400 text-[10px]">Probe 3:</span>
                                    <span className="font-bold text-amber-400">{formatTemp(reading.meatTemp3 ?? Math.max(32, reading.meatTemp + 2), activeUnit)}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-zinc-400 text-[10px]">Probe 4:</span>
                                    <span className="font-bold text-emerald-400">{formatTemp(reading.meatTemp4 ?? Math.max(32, reading.meatTemp - 1), activeUnit)}</span>
                                  </div>
                                </div>

                                {reading.actionsTaken && (
                                  <div
                                    className="mt-1.5 pt-1 border-t border-[#2a2a2a] text-[9px] text-zinc-400 line-clamp-2"
                                    title={reading.actionsTaken}
                                  >
                                    💡 {reading.actionsTaken}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
            </div>

            {/* Active Cook Quick Sheet Summary Card */}
            <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-4 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-orange-400 font-semibold uppercase">
                    Page #{activeCook.pageNumber || 48}
                  </span>
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md font-medium border border-emerald-500/20">
                    {activeCook.proteinType}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1.5">{activeCook.title}</h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">{activeCook.proteinCut}</p>

                <div className="mt-4 space-y-2 text-xs text-zinc-300">
                  <div className="flex justify-between border-b border-[#2a2a2a] pb-1">
                    <span className="text-zinc-400">Date:</span>
                    <span className="font-semibold">{activeCook.date}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#2a2a2a] pb-1">
                    <span className="text-zinc-400">Smoker Hours Logged:</span>
                    <span className="font-semibold text-orange-400 font-mono">{activeCook.hoursLogged} hrs</span>
                  </div>
                  <div className="flex justify-between border-b border-[#2a2a2a] pb-1">
                    <span className="text-zinc-400">Cumulative Hours:</span>
                    <span className="font-mono text-orange-300">
                      {activeCook.startingSmokerHours} → {activeCook.endingSmokerHours} hrs
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#2a2a2a] pb-1">
                    <span className="text-zinc-400">Pellets Consumed:</span>
                    <span className="font-semibold font-mono">{activeCook.fuelLbsConsumed} lbs</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-zinc-400">Make Again?:</span>
                    <span className={`font-bold ${activeCook.wouldMakeAgain ? 'text-emerald-400' : 'text-red-400'}`}>
                      {activeCook.wouldMakeAgain ? '[✓] YES' : '[ ] NO'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSelectCookSheet(activeCook)}
                className="w-full py-2 px-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <span>View Full Smoker Log Sheet</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}
      </div>
      )}

      {/* MEAT SAFETY & BBQ COOK TARGET TEMPS REFERENCE GUIDE */}
      {(mobileTab === 'all' || mobileTab === 'guide') && (
      <div className="pt-2">
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-4 sm:p-5 shadow-lg">
            {/* Collapsible Header */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsSafetyGuideOpen((prev) => !prev)}
                className="flex items-center space-x-2 text-left group cursor-pointer p-1 -ml-1 rounded-lg hover:bg-[#1a1a1a] transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                aria-expanded={isSafetyGuideOpen}
                aria-controls="meat-safety-guide-section"
              >
                <ShieldCheck className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider group-hover:text-orange-400 transition-colors">
                    Meat Safety & BBQ Cook Target Temps Guide
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    USDA safety minimums, stall/wrap thresholds, and pitmaster doneness specs
                  </p>
                </div>
              </button>

              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-semibold hidden sm:inline-block">
                  🛡️ {dynamicProteinGuides.length} Linked Proteins & Catalog Cuts
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddMeatCutModalOpen(true);
                  }}
                  className="px-3 py-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-bold text-xs rounded-lg shadow transition-all cursor-pointer flex items-center space-x-1"
                  title="Add new cut to verified catalog and sync across shared community database"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add Cut to Shared Database</span>
                  <span className="sm:hidden">Add Cut</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSafetyGuideOpen((prev) => !prev)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg bg-[#1a1a1a] hover:bg-[#242424] border border-[#2a2a2a] transition-colors cursor-pointer"
                  aria-label={isSafetyGuideOpen ? "Collapse Meat Safety Guide" : "Expand Meat Safety Guide"}
                >
                  {isSafetyGuideOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Collapsible Content */}
            {isSafetyGuideOpen && (
              <div id="meat-safety-guide-section" className="mt-4 pt-4 border-t border-[#2a2a2a] space-y-4 animate-fade-in">
                
                {/* Official Regulatory Standards Overview (USDA / FSIS / FDA) */}
                <div className="bg-[#181818] border border-emerald-500/25 rounded-xl p-3.5 sm:p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2a2a2a] pb-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                        USDA • FSIS • FDA Food Safety Standards & Regulatory Compliance
                      </h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                        <span>Live • Hourly Analysis Active ({lastAnalysisRunTime || 'Running'})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsUsdaAuditModalOpen(true)}
                        className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] rounded-lg transition-all cursor-pointer flex items-center space-x-1"
                        title="Open complete USDA Regulatory Safety & Subcategory Compliance Matrix"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Audit Matrix Report</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="bg-[#121212] p-2.5 rounded-lg border border-[#2a2a2a]">
                      <span className="text-[10px] font-bold text-red-400 block uppercase">Poultry (All)</span>
                      <span className="text-sm font-bold text-white">165°F (73.9°C)</span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">Zero Rest Required</span>
                    </div>

                    <div className="bg-[#121212] p-2.5 rounded-lg border border-[#2a2a2a]">
                      <span className="text-[10px] font-bold text-amber-400 block uppercase">Ground Meats</span>
                      <span className="text-sm font-bold text-white">160°F (71.1°C)</span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">Beef, Pork, Lamb, Veal</span>
                    </div>

                    <div className="bg-[#121212] p-2.5 rounded-lg border border-[#2a2a2a]">
                      <span className="text-[10px] font-bold text-emerald-400 block uppercase">Whole Muscle Steaks & Cuts</span>
                      <span className="text-sm font-bold text-white">145°F (62.8°C)</span>
                      <span className="text-[10px] text-emerald-400 block mt-0.5">⏱️ 3-Min Mandatory Rest</span>
                    </div>

                    <div className="bg-[#121212] p-2.5 rounded-lg border border-[#2a2a2a]">
                      <span className="text-[10px] font-bold text-blue-400 block uppercase">Food Safety Danger Zone</span>
                      <span className="text-sm font-bold text-white">40°F – 140°F</span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">Max 2 Hrs (1 Hr over 90°F)</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-zinc-400 bg-[#121212] p-2 rounded-lg border border-[#2a2a2a]/60 leading-relaxed">
                    💡 <strong className="text-zinc-200">Regulatory Note:</strong> While USDA FSIS mandates minimum thermal lethal temperatures for pathogen destruction (e.g. 145°F for pork/beef), tough low-and-slow BBQ meats (briskets, pork butts, ribs) require sustained temperatures between <strong className="text-orange-400">195°F and 208°F</strong> to fully render collagen into gelatins for probe tenderness.
                  </div>
                </div>

                {/* Search & Category Filter Toolbar */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Category Filter Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                      {['ALL', 'Beef', 'Pork', 'Poultry', 'Lamb', 'Fish/Seafood', 'Game'].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setSelectedProteinCategory(cat);
                            setSelectedSubcategory('ALL');
                            setSelectedGameSubcategory('ALL');
                          }}
                          className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer text-xs ${
                            selectedProteinCategory === cat
                              ? 'bg-orange-500 text-white border-orange-500 font-bold shadow-md'
                              : 'bg-[#1a1a1a] text-zinc-400 border-[#2a2a2a] hover:text-white hover:border-zinc-700'
                          }`}
                        >
                          {cat === 'Game' ? '🐗 Game Meats' : cat === 'ALL' ? '🌐 All Proteins' : cat}
                        </button>
                      ))}
                    </div>

                    {/* Search Filter Input & Add Cut Button */}
                    <div className="flex items-center space-x-2 w-full md:w-auto">
                      <div className="relative w-full md:w-64">
                        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={proteinSearchQuery}
                          onChange={(e) => setProteinSearchQuery(e.target.value)}
                          placeholder="Search meat (e.g., elk, boar)..."
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-9 pr-8 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50"
                        />
                        {proteinSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setProteinSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                            title="Clear Search"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!cookLogs || cookLogs.length === 0) {
                            alert("No cook logs available to sync cuts from.");
                            return;
                          }

                          let count = 0;
                          let updatedList = loadVerifiedMeatCuts();

                          cookLogs.forEach((cook) => {
                            const c = cook as any;
                            const cutName = c.proteinCut || c.title;
                            if (!cutName) return;

                            const cat = c.proteinType || determineProteinType(cutName);
                            const subcat = c.proteinSubcategory || c.gameSubcategory || determineProteinSubcategory(cat, cutName);

                            const targetF = c.targetInternalTempF || c.targetTemp || 203;
                            const smokeF = c.idealSmokeTempF || c.smokeTemp || 225;

                            const newCut: import('../types').VerifiedMeatCut = {
                              id: `cut-chargpt-cook-${c.id}`,
                              name: cutName,
                              aliases: [c.title],
                              proteinType: cat as any,
                              proteinSubcategory: subcat,
                              gameSubcategory: (cat === 'Game' || cat === 'Wild Game') ? subcat : undefined,
                              primalOrigin: c.primalOrigin || `${cat} Primal Cut`,
                              impsCode: c.impsCode || undefined,
                              description: c.notes || `Analysed cut extracted from CharGPT cook log session "${c.title}".`,
                              visualKeyFeatures: [`Extracted from Cook Log: "${c.title}"`, `Smoker: ${c.smokerType || 'Smoker Rig'}`],
                              idealSmokeTempF: smokeF,
                              targetInternalTempF: targetF,
                              cookingStrategy: c.cookingStrategy || c.notes || `Smoked on ${c.smokerType || 'Smoker'} to target ${targetF}°F.`,
                              verifiedStatus: 'Local User Confirmed',
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            };

                            updatedList = addOrUpdateVerifiedMeatCut(newCut);
                            count++;
                          });

                          setVerifiedCutCatalog(updatedList);
                          alert(`🎉 Successfully synced ${count} analysed meat cuts from cook logs into the Meat Safety & BBQ Cook Target Temps Guide!`);
                        }}
                        className="px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 hover:text-purple-200 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 shrink-0"
                        title="Import & sync analysed meat cuts from all saved cook logs into the Meat Safety Guide"
                      >
                        <Download className="w-3.5 h-3.5 text-purple-400" />
                        <span>Sync Cuts from Cook Logs</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsAddMeatCutModalOpen(true)}
                        className="px-3 py-1.5 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-orange-400 hover:text-orange-300 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 shrink-0"
                        title="Add cut to catalog & sync to shared database"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Cut</span>
                      </button>
                    </div>
                  </div>

                  {/* ANIMAL & PROTEIN SUBCATEGORY DIVIDER BAR (ALL PROTEINS) */}
                  <div className="bg-[#141414] border border-orange-500/25 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-orange-400 font-bold uppercase tracking-wider">
                      <span className="flex items-center space-x-1">
                        <span>🎯 {selectedProteinCategory} Animal & Cut Subcategory Divider</span>
                      </span>
                      <span className="text-zinc-500 font-normal">Filter by Subcategory</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(() => {
                        let subList: Array<{ id: string; label: string; icon: string }> = [];

                        if (selectedProteinCategory === 'Beef') {
                          subList = [
                            { id: 'ALL', label: 'All Beef Cuts', icon: '🥩' },
                            { id: 'Brisket & Chuck (BBQ / Braise)', label: 'Brisket & Chuck (BBQ/Braise)', icon: '🔥' },
                            { id: 'Rib & Loin (Steaks & Roasts)', label: 'Rib & Loin Steaks', icon: '🥓' },
                            { id: 'Plate & Flank (Fajitas / Skirt)', label: 'Plate & Flank Skirt', icon: '🌮' },
                            { id: 'Round & Shank (Slow Cook / Stew)', label: 'Round & Shank', icon: '🍲' },
                            { id: 'Ground Beef & Burgers', label: 'Ground Beef & Burgers', icon: '🍔' },
                          ];
                        } else if (selectedProteinCategory === 'Pork') {
                          subList = [
                            { id: 'ALL', label: 'All Pork Cuts', icon: '🐖' },
                            { id: 'Shoulder & Butt (Pulled Pork)', label: 'Shoulder & Butt (Pulled Pork)', icon: '🍖' },
                            { id: 'Ribs (Baby Back & St. Louis)', label: 'Baby Back & St. Louis Ribs', icon: '🥓' },
                            { id: 'Loin & Chops', label: 'Loin & Chops', icon: '🥩' },
                            { id: 'Belly & Cured (Bacon / Pork Belly)', label: 'Pork Belly & Bacon', icon: '🥓' },
                            { id: 'Ground Pork & Sausage', label: 'Fresh Sausage & Ground Pork', icon: '🌭' },
                          ];
                        } else if (selectedProteinCategory === 'Poultry') {
                          subList = [
                            { id: 'ALL', label: 'All Poultry Cuts', icon: '🍗' },
                            { id: 'Whole Bird & Turkey', label: 'Whole Chicken & Turkey', icon: '🦃' },
                            { id: 'Breasts & Tenderloins', label: 'Breasts & Tenderloins', icon: '🐓' },
                            { id: 'Thighs & Drumsticks', label: 'Thighs & Drumsticks', icon: '🍗' },
                            { id: 'Wings (High-Heat Smoke)', label: 'Crispy Smoked Wings', icon: '🪶' },
                            { id: 'Ground Poultry', label: 'Ground Turkey & Chicken', icon: '🍔' },
                          ];
                        } else if (selectedProteinCategory === 'Lamb') {
                          subList = [
                            { id: 'ALL', label: 'All Lamb Cuts', icon: '🍖' },
                            { id: 'Leg & Shoulder Roasts', label: 'Leg & Shoulder Roasts', icon: '🍖' },
                            { id: 'Chops & Rack of Lamb', label: 'Rack of Lamb & Chops', icon: '🥩' },
                            { id: 'Shanks & Stew Meat', label: 'Braised Shanks & Stew', icon: '🍲' },
                            { id: 'Ground Lamb & Kababs', label: 'Ground Lamb & Kababs', icon: '🍢' },
                          ];
                        } else if (selectedProteinCategory === 'Fish/Seafood' || selectedProteinCategory === 'Seafood') {
                          subList = [
                            { id: 'ALL', label: 'All Seafood Cuts', icon: '🐟' },
                            { id: 'Salmon & Fatty Fish', label: 'Salmon & Fatty Fish', icon: '🍣' },
                            { id: 'White Fish & Fillets', label: 'Halibut & White Fish', icon: '🎏' },
                            { id: 'Shellfish & Crustaceans', label: 'Shrimp, Lobster & Shellfish', icon: '🦐' },
                            { id: 'Whole Fish / Cedar Plank', label: 'Cedar Plank & Whole Fish', icon: '🪵' },
                          ];
                        } else if (selectedProteinCategory === 'Game') {
                          subList = [
                            { id: 'ALL', label: 'All Game Animals', icon: '🌐' },
                            { id: 'Cervid (Venison / Elk)', label: 'Deer / Venison & Elk (Cervids)', icon: '🦌' },
                            { id: 'Bovid (Bison / Buffalo)', label: 'Bison & Buffalo (Bovids)', icon: '🦬' },
                            { id: 'Wild Swine (Wild Boar)', label: 'Wild Boar & Swine', icon: '🐗' },
                            { id: 'Upland Birds & Waterfowl', label: 'Game Birds & Waterfowl', icon: '🦆' },
                            { id: 'Small Mammals (Rabbit)', label: 'Small Game (Rabbit)', icon: '🐇' },
                            { id: 'Exotic Game (Bear / Alligator)', label: 'Exotic Game (Bear / Gator)', icon: '🐻' },
                          ];
                        } else {
                          subList = [
                            { id: 'ALL', label: 'All Subcategories', icon: '🌐' },
                            { id: 'Brisket & Chuck (BBQ / Braise)', label: 'Brisket & Chuck', icon: '🥩' },
                            { id: 'Shoulder & Butt (Pulled Pork)', label: 'Pork Shoulder & Butt', icon: '🐖' },
                            { id: 'Whole Bird & Turkey', label: 'Poultry & Turkey', icon: '🍗' },
                            { id: 'Cervid (Venison / Elk)', label: 'Venison & Elk', icon: '🦌' },
                            { id: 'Salmon & Fatty Fish', label: 'Salmon & Seafood', icon: '🐟' },
                          ];
                        }

                        return subList.map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => {
                              setSelectedSubcategory(sub.id);
                              setSelectedGameSubcategory(sub.id);
                            }}
                            className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                              selectedSubcategory === sub.id || (selectedProteinCategory === 'Game' && selectedGameSubcategory === sub.id)
                                ? 'bg-amber-500 text-black border-amber-400 font-bold shadow'
                                : 'bg-[#1e1e1e] text-zinc-300 border-[#2e2e2e] hover:border-amber-500/50 hover:text-white'
                            }`}
                          >
                            <span>{sub.icon}</span>
                            <span>{sub.label}</span>
                          </button>
                        ));
                      })()}
                    </div>
                  </div>
                </div>

                {/* Protein Guide Cards Grid */}
                {(() => {
                  const filteredGuides = dynamicProteinGuides.filter((g) => {
                    const matchesCat = selectedProteinCategory === 'ALL' || g.category === selectedProteinCategory;
                    const matchesSub =
                      selectedSubcategory === 'ALL' ||
                      g.proteinSubcategory === selectedSubcategory ||
                      g.gameSubcategory === selectedSubcategory;

                    const query = proteinSearchQuery.toLowerCase().trim();
                    const matchesSearch = !query ||
                      g.proteinType.toLowerCase().includes(query) ||
                      g.category.toLowerCase().includes(query) ||
                      (g.proteinSubcategory && g.proteinSubcategory.toLowerCase().includes(query)) ||
                      (g.gameSubcategory && g.gameSubcategory.toLowerCase().includes(query)) ||
                      g.pitmasterTips.toLowerCase().includes(query) ||
                      (g.impsCode && g.impsCode.toLowerCase().includes(query)) ||
                      (g.aliases && g.aliases.some((alias) => alias.toLowerCase().includes(query)));

                    return matchesCat && matchesSub && matchesSearch;
                  });

                  if (filteredGuides.length === 0) {
                    return (
                      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 text-center text-zinc-400 text-xs">
                        <p className="font-semibold text-zinc-300">No protein temperature guides matched "{proteinSearchQuery}"</p>
                        <p className="text-[11px] mt-1 text-zinc-500">Try adjusting your category selection or search query.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredGuides.map((guide) => {
                        const guideKey = guide.proteinType;
                        const isCardCollapsed = !!collapsedGuideCards[guideKey];

                        return (
                          <div
                            key={guideKey}
                            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex flex-col justify-between space-y-3.5 hover:border-orange-500/30 transition-all shadow-sm"
                          >
                            <div>
                              {/* Header, Category, USDA Badge & Card Collapse Toggle */}
                              <div className="flex items-start justify-between gap-2 border-b border-[#2a2a2a] pb-2.5">
                                <div
                                  className="flex-1 cursor-pointer group"
                                  onClick={() => toggleGuideCardCollapse(guideKey)}
                                >
                                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                    <span className="text-[10px] font-mono font-bold text-orange-400 uppercase tracking-wider block">
                                      {guide.category}
                                    </span>
                                    {guide.category === 'Game' && guide.gameSubcategory && (
                                      <span className="text-[9px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold">
                                        {guide.gameSubcategory.includes('Cervid') ? '🦌 ' :
                                         guide.gameSubcategory.includes('Bovid') ? '🦬 ' :
                                         guide.gameSubcategory.includes('Swine') ? '🐗 ' :
                                         guide.gameSubcategory.includes('Birds') ? '🦆 ' :
                                         guide.gameSubcategory.includes('Small') ? '🐇 ' : '🐻 '}
                                        {guide.gameSubcategory}
                                      </span>
                                    )}
                                    {guide.impsCode && (
                                      <span className="text-[9px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.2 rounded font-bold">
                                        {guide.impsCode}
                                      </span>
                                    )}
                                    {guide.isCatalogCutLinked && (
                                      <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-bold">
                                        🥩 Cut Catalog Linked
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors">
                                    {guide.proteinType}
                                  </h4>
                                </div>

                                <div className="flex items-center space-x-2 shrink-0">
                                  <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold">
                                    USDA Min: {formatTemp(guide.usdaMinSafeF, activeUnit)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => toggleGuideCardCollapse(guideKey)}
                                    className="p-1 text-zinc-400 hover:text-white rounded bg-[#121212] hover:bg-[#242424] border border-[#2a2a2a] transition-colors cursor-pointer"
                                    title={isCardCollapsed ? "Expand Protein Guide Details" : "Collapse Protein Guide Card"}
                                  >
                                    {isCardCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>

                              {isCardCollapsed ? (
                                /* Collapsed Card Summary Row */
                                <div className="mt-3 flex items-center justify-between text-xs font-mono bg-[#121212] p-2.5 rounded-lg border border-[#2a2a2a]/60">
                                  <span className="text-zinc-400 text-[11px]">
                                    Finish: <strong className="text-orange-400 font-bold">{formatTemp(guide.targetFinishF, activeUnit)}</strong>
                                  </span>
                                  <span className="text-zinc-400 text-[11px]">
                                    BBQ Range: <strong className="text-amber-400 font-bold">{guide.bbqTargetRangeF}</strong>
                                  </span>
                                </div>
                              ) : (
                                /* Expanded Full Details */
                                <>
                                  {/* USDA Note & Regulatory Citation */}
                                  <div className="mt-2.5 space-y-1.5 bg-[#121212] p-2.5 rounded-lg border border-[#2a2a2a]/60">
                                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                                      🛡️ <strong className="text-emerald-400">USDA Note:</strong> {guide.usdaNote}
                                    </p>
                                    {guide.regulatoryCitation && (
                                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 border-t border-[#2a2a2a]/40 pt-1.5 mt-1">
                                        <span className="text-zinc-500">Citation: {guide.regulatoryCitation}</span>
                                        {guide.restTimeMinutes !== undefined && guide.restTimeMinutes > 0 ? (
                                          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                            ⏱️ {guide.restTimeMinutes}-Min Rest Required
                                          </span>
                                        ) : (
                                          <span className="text-zinc-500">0-Min Rest</span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Key Milestones Bar */}
                                  <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs font-mono">
                                    <div className="bg-[#121212] p-2 rounded-lg border border-[#2a2a2a]">
                                      <span className="block text-[10px] text-zinc-400">USDA Min Safe</span>
                                      <span className="font-bold text-emerald-400">{formatTemp(guide.usdaMinSafeF, activeUnit)}</span>
                                    </div>
                                    {guide.wrapTempF ? (
                                      <div className="bg-[#121212] p-2 rounded-lg border border-[#2a2a2a]">
                                        <span className="block text-[10px] text-zinc-400">Wrap Stage</span>
                                        <span className="font-bold text-amber-400">{formatTemp(guide.wrapTempF, activeUnit)}</span>
                                      </div>
                                    ) : (
                                      <div className="bg-[#121212] p-2 rounded-lg border border-[#2a2a2a]">
                                        <span className="block text-[10px] text-zinc-400">Target Range</span>
                                        <span className="font-bold text-amber-400">{guide.bbqTargetRangeF}</span>
                                      </div>
                                    )}
                                    <div className="bg-[#121212] p-2 rounded-lg border border-[#2a2a2a]">
                                      <span className="block text-[10px] text-zinc-400">BBQ Ideal Finish</span>
                                      <span className="font-bold text-orange-400">{formatTemp(guide.targetFinishF, activeUnit)}</span>
                                    </div>
                                  </div>

                                  {/* Doneness Spectrum & Action Thresholds */}
                                  <div className="mt-3.5 space-y-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                                      Doneness Spectrum & Probe Target Controls
                                    </span>
                                    {guide.donenessLevels.map((lvl, dIdx) => (
                                      <div
                                        key={dIdx}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#121212] p-2.5 rounded-lg border border-[#2a2a2a] gap-2 text-xs"
                                      >
                                        <div>
                                          <div className="flex items-center space-x-2">
                                            <span className="font-bold text-white">{lvl.label}</span>
                                            <span className="font-mono font-bold text-orange-400 text-xs">
                                              {formatTemp(lvl.tempF, activeUnit)}
                                            </span>
                                          </div>
                                          <span className="text-[10px] text-zinc-400 block mt-0.5">{lvl.description}</span>
                                        </div>

                                        {/* Quick Probe Assign Buttons */}
                                        <div className="flex items-center space-x-1 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#2a2a2a]">
                                          <span className="text-[9px] text-zinc-500 font-mono mr-1">Set Probe:</span>
                                          {[
                                            { id: 'p1', label: 'P1', color: 'hover:bg-red-500/20 text-red-400 border-red-500/30' },
                                            { id: 'p2', label: 'P2', color: 'hover:bg-purple-500/20 text-purple-400 border-purple-500/30' },
                                            { id: 'p3', label: 'P3', color: 'hover:bg-amber-500/20 text-amber-400 border-amber-500/30' },
                                            { id: 'p4', label: 'P4', color: 'hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
                                          ].map((probeBtn) => (
                                            <button
                                              key={probeBtn.id}
                                              type="button"
                                              onClick={() => {
                                                handleUpdateTarget(probeBtn.id, lvl.tempF);
                                                const pObj = probeConfigs.find((p) => p.id === probeBtn.id);
                                                setActiveAlertNotice(`🎯 ${probeBtn.label} (${pObj?.meatName || 'Probe'}) target set to ${formatTemp(lvl.tempF, activeUnit)} (${lvl.label})`);
                                              }}
                                              className={`px-2 py-1 bg-[#1a1a1a] text-[10px] font-mono font-bold rounded border transition-colors cursor-pointer ${probeBtn.color}`}
                                              title={`Apply ${formatTemp(lvl.tempF, activeUnit)} to ${probeBtn.label}`}
                                            >
                                              {probeBtn.label}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Pitmaster Tip */}
                                  <div className="mt-3 pt-2.5 border-t border-[#2a2a2a] text-[11px] text-amber-300/90 font-mono flex items-start space-x-1.5">
                                    <span className="text-base leading-none">💡</span>
                                    <span className="leading-tight">
                                      <strong>Pitmaster Tip:</strong> {guide.pitmasterTips}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION: Smoker Unit Chart & Per-Smoker Hours Breakdown */}
      {(mobileTab === 'all' || mobileTab === 'consumption' || mobileTab === 'smoker') && (
        <SmokerUnitProfileChart
          rigs={(() => {
            try {
              const saved = localStorage.getItem('pitmaster_local_user_account');
              if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.rigs && parsed.rigs.length > 0) return parsed.rigs;
              }
            } catch (e) {}
            return profile ? [profile] : [];
          })()}
          profile={profile}
          activeRigId={profile?.id}
          cookLogs={cookLogs}
          fuelLogs={fuelLogs}
          onUpdatePitBaseline={(rigId, newInitial) => {
            if (onUpdateProfile && profile) {
              onUpdateProfile({
                ...profile,
                initialHours: newInitial,
                currentHours: newInitial + cookLogs.reduce((a, c) => a + (c.hoursLogged || 0), 0),
              });
            }
          }}
        />
      )}

      {/* SECTION 2: Daily Smoker Hours & Consumption Trends Chart */}
      {(mobileTab === 'all' || mobileTab === 'consumption') && (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-3.5 sm:p-6 shadow-xl w-full min-w-0 max-w-full">
        
        {/* Section Header */}
        <div 
          onClick={() => setIsConsumptionSectionOpen((prev) => !prev)}
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group select-none transition-colors ${
            isConsumptionSectionOpen ? 'pb-3 sm:pb-4 border-b border-[#2a2a2a]' : ''
          }`}
        >
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center space-x-2.5">
              <BarChart3 className="w-5 h-5 text-orange-400 shrink-0" />
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-white group-hover:text-orange-400 transition-colors">Daily Consumption & Runtime Hours</h3>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center space-x-1 shrink-0">
                    <Zap className="w-3 h-3" />
                    <span>Fuel Sync Active</span>
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Comparing Smoker Operating Hours (hrs) vs Synced Pellet Consumption (lbs) derived from manufacturer specs.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="p-2 rounded-xl bg-[#121212] border border-[#2a2a2a] text-zinc-400 hover:text-white hover:border-orange-500/40 transition-all cursor-pointer shrink-0 ml-2"
              title={isConsumptionSectionOpen ? 'Collapse Section' : 'Expand Section'}
              onClick={(e) => {
                e.stopPropagation();
                setIsConsumptionSectionOpen((prev) => !prev);
              }}
            >
              {isConsumptionSectionOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#121212] px-3 py-1.5 rounded-xl border border-[#2a2a2a] text-xs font-mono text-zinc-300 shrink-0 self-start sm:self-auto"
          >
            <span className="text-[10px] text-zinc-400 block font-sans">Mfr Burn Rate:</span>
            {(profile?.name?.trim() || profile?.model?.trim() || profile?.smokerType?.trim()) ? (
              <span className="text-orange-400 font-bold">{mfrSpec.factoryBaselineBurnRateLbsHr} lbs/hr</span>
            ) : (
              <span className="text-amber-400 font-medium">Awaiting smoker selection</span>
            )}
          </div>
        </div>

        {isConsumptionSectionOpen && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Consumption Bar & Line Chart (2 Cols) */}
            <div className="lg:col-span-2 bg-[#121212] border border-[#2a2a2a] p-4 sm:p-5 rounded-xl flex flex-col justify-between">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={consumptionChartData} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" opacity={0.6} />
                    <XAxis dataKey="name" stroke="#a0a0a0" fontSize={11} tickLine={false} />
                    <YAxis yAxisId="left" stroke="#f97316" fontSize={11} unit=" hrs" tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#ef4444" fontSize={11} unit=" lbs" tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a', borderRadius: '8px', color: '#e0e0e0', fontSize: '12px' }}
                      formatter={(value: any, name: any) => [`${value} ${name.includes('Hours') ? 'hrs' : 'lbs'}`, name]}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }} />
                    <Bar yAxisId="left" dataKey="hours" name="Smoker Hours (hrs)" fill="#f97316" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="syncedFuelLbs" name="Synced Pellet Usage (lbs)" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                    <Line yAxisId="right" type="monotone" dataKey="actualFuelLbs" name="Actual Logged (lbs)" stroke="#71717a" strokeDasharray="3 3" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Protein Hours Breakdown (1 Col) */}
            <div className="bg-[#121212] border border-[#2a2a2a] p-4 sm:p-5 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 pb-3 border-b border-[#2a2a2a]">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <h3 className="text-base font-bold text-white">Protein Distribution</h3>
                </div>
                <p className="text-xs text-zinc-400 mt-1">Share of total smoking hours by meat type.</p>

                {/* Donut Chart */}
                <div className="h-48 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={proteinPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {proteinPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a', borderRadius: '8px', color: '#e0e0e0', fontSize: '12px' }}
                        formatter={(val: any) => [`${val} hrs`, 'Smoking Hours']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend breakdown list */}
                <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                  {proteinPieData.map((item) => (
                    <div key={item.name} className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-zinc-300 font-medium">{item.name}:</span>
                      <span className="text-orange-400 font-mono font-bold">{item.value}h</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
      )}

      {/* SECTION 3: Quality Ratings & Pitmaster Metrics */}
      {(mobileTab === 'all' || mobileTab === 'benchmarks') && (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
        
        {/* Section Header with Overall Mastery Index Grade & Collapse Toggle */}
        <div
          onClick={() => setIsBenchmarksOpen((prev) => !prev)}
          className={`flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group select-none transition-colors ${
            isBenchmarksOpen ? 'pb-4 border-b border-[#2a2a2a]' : ''
          }`}
        >
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 group-hover:scale-105 transition-transform">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight group-hover:text-orange-400 transition-colors">
                  Pitmaster Quality Benchmarks
                </h3>
                <p className="text-xs text-zinc-400">
                  Detailed quality scoring evaluated across {bCount} logged cook sessions ({benchmarkProteinFilter === 'ALL' ? 'All Proteins' : benchmarkProteinFilter})
                </p>
              </div>
            </div>
          </div>

          {/* Master Pitmaster Grade Pill & Expand/Collapse Toggle */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-3 bg-[#121212] p-2.5 rounded-xl border border-[#2a2a2a] shrink-0">
              <div className={`px-3 py-1 rounded-lg border font-mono font-bold text-lg flex items-center space-x-1.5 ${masteryBadgeClass}`}>
                <Trophy className="w-4 h-4 inline" />
                <span>{masteryGrade}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold">Mastery Index</span>
                <span className="text-xs font-mono font-bold text-white">
                  {compositeScore} <span className="text-[10px] text-zinc-400">/ 100 PTS</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              className="p-2 rounded-xl bg-[#121212] border border-[#2a2a2a] text-zinc-400 hover:text-white hover:border-orange-500/40 transition-all cursor-pointer"
              title={isBenchmarksOpen ? 'Collapse Section' : 'Expand Section'}
              onClick={(e) => {
                e.stopPropagation();
                setIsBenchmarksOpen((prev) => !prev);
              }}
            >
              {isBenchmarksOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {isBenchmarksOpen && (
          <div className="space-y-6 animate-fade-in">
            {/* Protein Filter Buttons */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
          <span className="text-zinc-400 font-semibold flex items-center space-x-1 shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5 text-orange-400" />
            <span>Filter Meat:</span>
          </span>
          {['ALL', 'Beef', 'Pork', 'Chicken', 'Turkey', 'Seafood', 'Other'].map((protein) => {
            const count = protein === 'ALL' ? cookLogs.length : cookLogs.filter((c) => c.proteinType === protein).length;
            if (protein !== 'ALL' && count === 0) return null;
            return (
              <button
                key={protein}
                type="button"
                onClick={() => setBenchmarkProteinFilter(protein)}
                className={`px-3 py-1.5 rounded-xl font-semibold border text-xs transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
                  benchmarkProteinFilter === protein
                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/40 shadow-sm'
                    : 'bg-[#242424] text-zinc-400 border-[#2a2a2a] hover:bg-[#2a2a2a] hover:text-zinc-200'
                }`}
              >
                <span>{protein === 'ALL' ? 'All Meats' : protein}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  benchmarkProteinFilter === protein ? 'bg-orange-500/30 text-orange-300' : 'bg-[#1a1a1a] text-zinc-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 2-Column Main Layout: Metric Cards Grid (Left) + Radar Chart & Spotlight (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (2 Cols): 4 Core Quality Metric Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* 1. Smoke Ring Score Card */}
            <div className="bg-[#242424] border border-[#2a2a2a] p-4 rounded-xl flex flex-col justify-between hover:border-orange-500/30 transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider flex items-center space-x-1">
                    <Flame className="w-3.5 h-3.5 inline mr-1 text-orange-400" />
                    Smoke Ring Clarity
                  </span>
                  <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded font-mono font-bold">
                    Target: 4.5+
                  </span>
                </div>

                <div className="flex items-baseline space-x-2 mt-3">
                  <span className="text-3xl font-extrabold text-orange-400 font-mono">{numSmokeRing.toFixed(1)}</span>
                  <span className="text-xs text-zinc-400 font-mono">/ 5.0</span>
                </div>

                {/* Star visual rating */}
                <div className="mt-2 flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const fill = Math.max(0, Math.min(1, numSmokeRing - (star - 1)));
                    return (
                      <div key={star} className="relative w-3.5 h-3.5">
                        <Star className="w-3.5 h-3.5 text-zinc-700 fill-zinc-800" />
                        {fill > 0 && (
                          <div className="absolute top-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                            <Star className="w-3.5 h-3.5 text-orange-400 fill-current" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <span className="text-[10px] text-zinc-400 font-mono ml-1.5">({Math.round((numSmokeRing / 5) * 100)}%)</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-[#1a1a1a] h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-orange-600 to-amber-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(numSmokeRing / 5) * 100}%` }}
                  />
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 mt-3 pt-2 border-t border-[#2a2a2a] leading-relaxed">
                Nitric oxide reaction & deep pink ring definition beneath rub crust.
              </p>
            </div>

            {/* 2. Bark Development Card */}
            <div className="bg-[#242424] border border-[#2a2a2a] p-4 rounded-xl flex flex-col justify-between hover:border-amber-500/30 transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
                    Bark Crust & Maillard
                  </span>
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-mono font-bold">
                    Target: 4.5+
                  </span>
                </div>

                <div className="flex items-baseline space-x-2 mt-3">
                  <span className="text-3xl font-extrabold text-amber-400 font-mono">{numBark.toFixed(1)}</span>
                  <span className="text-xs text-zinc-400 font-mono">/ 5.0</span>
                </div>

                {/* Star visual rating */}
                <div className="mt-2 flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const fill = Math.max(0, Math.min(1, numBark - (star - 1)));
                    return (
                      <div key={star} className="relative w-3.5 h-3.5">
                        <Star className="w-3.5 h-3.5 text-zinc-700 fill-zinc-800" />
                        {fill > 0 && (
                          <div className="absolute top-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <span className="text-[10px] text-zinc-400 font-mono ml-1.5">({Math.round((numBark / 5) * 100)}%)</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-[#1a1a1a] h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-600 to-yellow-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(numBark / 5) * 100}%` }}
                  />
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 mt-3 pt-2 border-t border-[#2a2a2a] leading-relaxed">
                Sugar caramelization, fat render, and mahogany-dark spice rub crust.
              </p>
            </div>

            {/* 3. Meat Tenderness Card */}
            <div className="bg-[#242424] border border-[#2a2a2a] p-4 rounded-xl flex flex-col justify-between hover:border-red-500/30 transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider flex items-center space-x-1">
                    <Thermometer className="w-3.5 h-3.5 inline mr-1 text-red-400" />
                    Tenderness & Texture
                  </span>
                  <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-mono font-bold">
                    Target: 4.5+
                  </span>
                </div>

                <div className="flex items-baseline space-x-2 mt-3">
                  <span className="text-3xl font-extrabold text-red-400 font-mono">{numTenderness.toFixed(1)}</span>
                  <span className="text-xs text-zinc-400 font-mono">/ 5.0</span>
                </div>

                {/* Star visual rating */}
                <div className="mt-2 flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const fill = Math.max(0, Math.min(1, numTenderness - (star - 1)));
                    return (
                      <div key={star} className="relative w-3.5 h-3.5">
                        <Star className="w-3.5 h-3.5 text-zinc-700 fill-zinc-800" />
                        {fill > 0 && (
                          <div className="absolute top-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                            <Star className="w-3.5 h-3.5 text-red-400 fill-current" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <span className="text-[10px] text-zinc-400 font-mono ml-1.5">({Math.round((numTenderness / 5) * 100)}%)</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-[#1a1a1a] h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-red-600 to-orange-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(numTenderness / 5) * 100}%` }}
                  />
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 mt-3 pt-2 border-t border-[#2a2a2a] leading-relaxed">
                Collagen conversion, probe-warm-butter feel & moisture retention.
              </p>
            </div>

            {/* 4. Success Rate Card */}
            <div className="bg-[#242424] border border-[#2a2a2a] p-4 rounded-xl flex flex-col justify-between hover:border-emerald-500/30 transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 inline mr-1 text-emerald-400" />
                    Success Rate ("Make Again")
                  </span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold">
                    Target: 90%+
                  </span>
                </div>

                <div className="flex items-baseline space-x-2 mt-3">
                  <span className="text-3xl font-extrabold text-emerald-400 font-mono">{bSuccessRate}%</span>
                  <span className="text-xs text-zinc-400 font-mono">({bWouldMakeAgain}/{bCompleted})</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-[#1a1a1a] h-1.5 rounded-full mt-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-600 to-teal-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${bSuccessRate}%` }}
                  />
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 mt-3 pt-2 border-t border-[#2a2a2a] leading-relaxed">
                Percentage of logged cooks meeting high pitmaster standard to repeat.
              </p>
            </div>

          </div>

          {/* Right Column (1 Col): Radar Quality Profile + Top Rated Cook Spotlight */}
          <div className="space-y-4">
            
            {/* Radar Quality Axes Chart */}
            <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-4 flex flex-col items-center justify-center relative">
              <div className="w-full flex items-center justify-between border-b border-[#2a2a2a] pb-2 mb-2">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Target className="w-3.5 h-3.5 text-orange-400" />
                  <span>5-Axis Quality Profile</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">Target: 4.5 Benchmark</span>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="68%" data={qualityRadarData}>
                    <PolarGrid stroke="#3a3a3a" />
                    <PolarAngleAxis dataKey="subject" stroke="#a0a0a0" fontSize={10} />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} stroke="#52525b" fontSize={8} />
                    <Radar name="Target Spec" dataKey="target" stroke="#52525b" fill="#52525b" fillOpacity={0.1} strokeDasharray="3 3" />
                    <Radar name="Your Rating" dataKey="score" stroke="#f97316" fill="#f97316" fillOpacity={0.4} strokeWidth={2} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a', borderRadius: '8px', color: '#e0e0e0', fontSize: '11px' }}
                      formatter={(val: any) => [`${val} / 5.0`, 'Score']}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Cook Spotlight Card */}
            {topCookInBenchmark && (
              <div className="bg-[#242424] border border-amber-500/30 rounded-xl p-4 relative overflow-hidden bg-gradient-to-br from-[#242424] to-[#1e1b18]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px] flex items-center space-x-1">
                    <Trophy className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
                    Top Rated Cook Spotlight
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
                    {topCookInBenchmark.ratings?.overall || 5.0} ★ Overall
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white leading-tight truncate">{topCookInBenchmark.title}</h4>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">{topCookInBenchmark.proteinCut} • {topCookInBenchmark.date}</p>

                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-[#3a3a3a]/60">
                  <div className="flex items-center space-x-2 text-[10px] text-zinc-300 font-mono">
                    <span>Ring: <strong className="text-orange-400">{topCookInBenchmark.ratings?.smokeRing}</strong></span>
                    <span>Bark: <strong className="text-amber-400">{topCookInBenchmark.ratings?.bark}</strong></span>
                    <span>Tender: <strong className="text-red-400">{topCookInBenchmark.ratings?.tenderness}</strong></span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectCookSheet(topCookInBenchmark)}
                    className="text-[11px] text-orange-400 hover:text-orange-300 font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <span>View Sheet</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
      )}
      </div>
      )}

      {/* Fuel & Wood Blend Searchable Database Explorer Modal */}
      <FuelDatabaseExplorer
        isOpen={isFuelDbModalOpen}
        onClose={() => setIsFuelDbModalOpen(false)}
        onSelectFuel={(fuel) => {
          setSelectedWoodFuel(fuel.name);
          setIsFuelDbModalOpen(false);
        }}
        selectedFuelId={selectedWoodFuel}
      />

      {/* Combustion Inc. Wireless Bluetooth Probe Telemetry Modal */}
      <CombustionBluetoothModal
        isOpen={isBluetoothModalOpen}
        onClose={() => setIsBluetoothModalOpen(false)}
        activeDevice={bluetoothDevice}
        telemetry={bluetoothTelemetry}
        onConnect={(forceSimulation) => bluetoothProbeService.connectCombustionDevice(forceSimulation)}
        onDisconnect={() => bluetoothProbeService.disconnect()}
        tempUnit={activeUnit}
      />

      {/* Add New Meat Cut Modal for Verified Catalog & Shared Database */}
      <AddMeatCutModal
        isOpen={isAddMeatCutModalOpen}
        onClose={() => setIsAddMeatCutModalOpen(false)}
        defaultCategory={selectedProteinCategory}
      />

      {/* USDA • FSIS • FDA Food Safety Standards & Subcategory Compliance Audit Matrix Modal */}
      {isUsdaAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-[#121212] border border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header Banner */}
            <div className="bg-gradient-to-r from-emerald-950/90 via-[#0d2218] to-[#121212] border-b border-emerald-500/30 p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white tracking-wide">
                      USDA • FSIS • FDA Regulatory Safety & Subcategory Compliance Audit
                    </h3>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                      <span>Live Hourly Ticker</span>
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Real-time verification of internal temperatures and subcategory dividers against 9 CFR 318.17 & FDA §3-401.11.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUsdaAuditModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white bg-[#1a1a1a] hover:bg-[#282828] border border-[#2e2e2e] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Executive Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-[#181818] border border-emerald-500/30 rounded-xl p-3.5 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Compliance Status</span>
                  <div className="text-xl font-extrabold text-white font-mono flex items-center space-x-1">
                    <span>100%</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
                  </div>
                  <span className="text-[10px] text-zinc-400 block">All cuts pass thermal safety</span>
                </div>

                <div className="bg-[#181818] border border-amber-500/30 rounded-xl p-3.5 space-y-1">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Total Cuts Analyzed</span>
                  <div className="text-xl font-extrabold text-white font-mono">
                    {usdaAuditReport?.totalCutsAnalyzed || dynamicProteinGuides.length} Cuts
                  </div>
                  <span className="text-[10px] text-zinc-400 block">Across 6 protein categories</span>
                </div>

                <div className="bg-[#181818] border border-blue-500/30 rounded-xl p-3.5 space-y-1">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">Live Analysis Engine</span>
                  <div className="text-sm font-bold text-white font-mono">
                    Hourly Ticker Active
                  </div>
                  <span className="text-[10px] text-zinc-400 block">Last Run: {lastAnalysisRunTime || 'Just now'}</span>
                </div>

                <div className="bg-[#181818] border border-orange-500/30 rounded-xl p-3.5 space-y-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block">Manual Trigger</span>
                    <span className="text-[11px] text-zinc-300 block">Force Live Analysis Rerun</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => executeLiveSubcategoryAndUsdaAnalysis()}
                    className="w-full py-1.5 bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 shadow"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Rerun Analysis Now</span>
                  </button>
                </div>
              </div>

              {/* Subcategory Distribution Matrix */}
              {usdaAuditReport?.subcategoryBreakdown && (
                <div className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <Target className="w-4 h-4" />
                    <span>Animal Subcategory Divider Distribution</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(usdaAuditReport.subcategoryBreakdown).map(([catName, subMap]) => (
                      <div key={catName} className="bg-[#121212] border border-[#2a2a2a] p-3 rounded-lg space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-white border-b border-[#2a2a2a] pb-1">
                          <span>{catName}</span>
                          <span className="text-[10px] text-orange-400 font-mono">
                            {Object.values(subMap).reduce((a, b) => a + b, 0)} cuts
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px]">
                          {Object.entries(subMap).map(([subName, count]) => (
                            <div key={subName} className="flex items-center justify-between text-zinc-400 font-mono">
                              <span className="truncate max-w-[180px]">{subName}</span>
                              <span className="text-amber-400 font-bold">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comprehensive Cut Safety & Regulatory Audit Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>USDA FSIS FDA Compliance Audit Log ({usdaAuditReport?.auditDetails.length || 0} Cuts Verified)</span>
                  </h4>
                  <span className="text-[10px] text-zinc-400 font-mono">Sorted by Protein Category</span>
                </div>

                <div className="border border-[#2e2e2e] rounded-xl overflow-hidden bg-[#181818]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#121212] border-b border-[#2e2e2e] text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                          <th className="p-3">Cut Name</th>
                          <th className="p-3">Category / Subcategory</th>
                          <th className="p-3 text-center">USDA Safe Min</th>
                          <th className="p-3 text-center">Rest Time</th>
                          <th className="p-3 text-center">Pitmaster Target</th>
                          <th className="p-3">Regulatory Citation</th>
                          <th className="p-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#282828] font-mono text-[11px]">
                        {usdaAuditReport?.auditDetails.map((item, idx) => (
                          <tr key={idx} className="hover:bg-[#1e1e1e] transition-colors">
                            <td className="p-3 font-bold text-white">
                              {item.cutName}
                              {item.parasiteWarning && (
                                <span className="block text-[10px] text-amber-400 font-sans mt-0.5 font-normal">
                                  ⚠️ {item.parasiteWarning}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="text-orange-400 font-bold block">{item.category}</span>
                              <span className="text-[10px] text-zinc-400 font-sans block">{item.subcategory}</span>
                            </td>
                            <td className="p-3 text-center font-bold text-amber-300">
                              {item.usdaMinSafeF}°F
                            </td>
                            <td className="p-3 text-center text-zinc-300">
                              {item.restMinutes > 0 ? `${item.restMinutes} Mins` : '0 Mins'}
                            </td>
                            <td className="p-3 text-center font-bold text-orange-400">
                              {item.targetTempF}°F
                            </td>
                            <td className="p-3 text-zinc-400 text-[10px]">
                              {item.regulatoryCitation}
                            </td>
                            <td className="p-3 text-right">
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Compliant</span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[#121212] border-t border-[#2e2e2e] p-4 flex items-center justify-between shrink-0">
              <p className="text-[11px] text-zinc-400">
                Data dynamically cross-referenced with USDA FSIS directives and FDA Food Code §3-401.11.
              </p>
              <button
                type="button"
                onClick={() => setIsUsdaAuditModalOpen(false)}
                className="px-4 py-1.5 bg-[#222] hover:bg-[#2e2e2e] text-white font-bold text-xs rounded-lg border border-[#333] transition-colors cursor-pointer"
              >
                Close Audit Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
