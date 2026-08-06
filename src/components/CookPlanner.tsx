import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Flame,
  Sparkles,
  Bot,
  PlusCircle,
  Share2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Info,
  Loader2,
  Download,
  UtensilsCrossed,
  Fuel,
} from 'lucide-react';
import { SmokerProfile, CookLog } from '../types';
import { getEffectiveSmokerSpecs } from '../utils/smokerCalculations';
import { APP_NAME, AI_NAME, AI_PITMASTER_NAME } from '../constants/appName';
import { RecipeSuggestion, RECIPE_SUGGESTIONS } from '../data/recipeSuggestions';

interface CookPlannerProps {
  smokerProfile: SmokerProfile;
  cookLogs?: CookLog[];
  onStartCookFromPlan: (recipe: RecipeSuggestion) => void;
  onAskAIPitmasterAboutPlan: (promptText: string) => void;
}

interface PlannedPreset {
  id: string;
  name: string;
  proteinType: string;
  cut: string;
  weightLbs: number;
  hrsPerLb: number;
  fixedHours?: number;
  targetPitTemp: number;
  targetMeatTemp: number;
  restHours: number;
  recipeRef?: RecipeSuggestion;
}

const PRESET_CUTS: PlannedPreset[] = [
  {
    id: 'brisket-packer',
    name: 'Texas Packer Brisket',
    proteinType: 'Beef',
    cut: 'Full Packer Brisket',
    weightLbs: 14,
    hrsPerLb: 0.9,
    targetPitTemp: 225,
    targetMeatTemp: 203,
    restHours: 2.5,
    recipeRef: RECIPE_SUGGESTIONS.find((r) => r.id === 'recipe-texas-brisket'),
  },
  {
    id: 'pork-butt',
    name: 'Carolina Pork Shoulder / Butt',
    proteinType: 'Pork',
    cut: 'Bone-In Pork Shoulder',
    weightLbs: 9,
    hrsPerLb: 1.1,
    targetPitTemp: 225,
    targetMeatTemp: 205,
    restHours: 1.5,
    recipeRef: RECIPE_SUGGESTIONS.find((r) => r.id === 'recipe-pulled-pork'),
  },
  {
    id: 'pork-ribs',
    name: '3-2-1 St. Louis Pork Ribs',
    proteinType: 'Pork',
    cut: 'St. Louis Spare Ribs',
    weightLbs: 4,
    hrsPerLb: 0,
    fixedHours: 6.0,
    targetPitTemp: 225,
    targetMeatTemp: 198,
    restHours: 0.5,
    recipeRef: RECIPE_SUGGESTIONS.find((r) => r.id === 'recipe-321-ribs'),
  },
  {
    id: 'smoked-turkey',
    name: 'Whole Herb Smoked Turkey',
    proteinType: 'Turkey',
    cut: 'Whole Turkey',
    weightLbs: 12,
    hrsPerLb: 0.35,
    targetPitTemp: 275,
    targetMeatTemp: 165,
    restHours: 0.75,
    recipeRef: RECIPE_SUGGESTIONS.find((r) => r.id === 'recipe-smoked-turkey'),
  },
  {
    id: 'venison-backstrap',
    name: 'Wild Venison Backstrap',
    proteinType: 'Venison',
    cut: 'Venison Loin / Backstrap',
    weightLbs: 3,
    hrsPerLb: 0,
    fixedHours: 1.8,
    targetPitTemp: 225,
    targetMeatTemp: 132,
    restHours: 0.25,
    recipeRef: RECIPE_SUGGESTIONS.find((r) => r.id === 'recipe-smoked-venison-backstrap'),
  },
  {
    id: 'bear-roast',
    name: 'Slow-Smoked Bear Roast',
    proteinType: 'Bear',
    cut: 'Bear Shoulder Roast',
    weightLbs: 5,
    hrsPerLb: 1.5,
    targetPitTemp: 225,
    targetMeatTemp: 165,
    restHours: 0.5,
    recipeRef: RECIPE_SUGGESTIONS.find((r) => r.id === 'recipe-smoked-bear-roast'),
  },
  {
    id: 'wild-boar',
    name: 'Low & Slow Wild Boar Shoulder',
    proteinType: 'Wild Boar',
    cut: 'Wild Boar Shoulder',
    weightLbs: 7,
    hrsPerLb: 1.3,
    targetPitTemp: 240,
    targetMeatTemp: 202,
    restHours: 1.5,
    recipeRef: RECIPE_SUGGESTIONS.find((r) => r.id === 'recipe-wild-boar-pulled-pork'),
  },
  {
    id: 'bison-tomahawk',
    name: 'Reverse-Seared Bison Tomahawk',
    proteinType: 'Bison',
    cut: 'Bison Tomahawk Steak',
    weightLbs: 2,
    hrsPerLb: 0,
    fixedHours: 1.5,
    targetPitTemp: 200,
    targetMeatTemp: 130,
    restHours: 0.25,
    recipeRef: RECIPE_SUGGESTIONS.find((r) => r.id === 'recipe-bison-tomahawk'),
  },
  {
    id: 'duck-breast',
    name: 'Smoked Wild Duck Breast',
    proteinType: 'Duck',
    cut: 'Skin-On Duck Breasts',
    weightLbs: 2,
    hrsPerLb: 0,
    fixedHours: 1.5,
    targetPitTemp: 225,
    targetMeatTemp: 140,
    restHours: 0.25,
    recipeRef: RECIPE_SUGGESTIONS.find((r) => r.id === 'recipe-smoked-duck-breast'),
  },
  {
    id: 'smoked-wings',
    name: 'Crispy Smoked Wings',
    proteinType: 'Chicken',
    cut: 'Chicken Wings',
    weightLbs: 5,
    hrsPerLb: 0,
    fixedHours: 1.5,
    targetPitTemp: 225,
    targetMeatTemp: 175,
    restHours: 0.25,
    recipeRef: RECIPE_SUGGESTIONS.find((r) => r.id === 'recipe-smoked-wings'),
  },
];

export const CookPlanner: React.FC<CookPlannerProps> = ({
  smokerProfile,
  cookLogs = [],
  onStartCookFromPlan,
  onAskAIPitmasterAboutPlan,
}) => {
  // Default Start Time (Tomorrow 6:00 AM)
  const getDefaultStartTime = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // Tomorrow
    d.setHours(6, 0, 0, 0); // 6:00 AM
    return d.toISOString().slice(0, 16);
  };

  const [startDateTime, setStartDateTime] = useState<string>(getDefaultStartTime);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('brisket-packer');

  const selectedPreset = PRESET_CUTS.find((p) => p.id === selectedPresetId) || PRESET_CUTS[0];

  const [weightLbs, setWeightLbs] = useState<number>(selectedPreset.weightLbs);
  const [targetPitTemp, setTargetPitTemp] = useState<number>(selectedPreset.targetPitTemp);
  const [restHours, setRestHours] = useState<number>(selectedPreset.restHours);
  const [bufferHours, setBufferHours] = useState<number>(1.0); // 1 hr stall margin
  const [preheatMins, setPreheatMins] = useState<number>(45);

  // Calculate estimated cook hours
  const estimatedCookHours = selectedPreset.fixedHours
    ? selectedPreset.fixedHours
    : Math.max(1, weightLbs * selectedPreset.hrsPerLb);

  const cookToServeHours = estimatedCookHours + restHours + bufferHours;
  const totalProcessHours = cookToServeHours + preheatMins / 60;

  // Calculate Serve Time from Start Time & Cook Params
  const computeServeTimeStr = (startStr: string) => {
    const d = new Date(startStr);
    if (isNaN(d.getTime())) return '';
    const serveDate = new Date(d.getTime() + cookToServeHours * 3600 * 1000);
    return serveDate.toISOString().slice(0, 16);
  };

  // State for Serve Time
  const [serveDateTime, setServeDateTime] = useState<string>(() => computeServeTimeStr(getDefaultStartTime()));

  // AI Audit state
  const [isAuditingPlan, setIsAuditingPlan] = useState(false);
  const [aiAuditOutput, setAiAuditOutput] = useState<string | null>(null);

  // Handle Start Date Time change
  const handleStartDateTimeChange = (newStartStr: string) => {
    setStartDateTime(newStartStr);
    const d = new Date(newStartStr);
    if (!isNaN(d.getTime())) {
      const computedServe = new Date(d.getTime() + cookToServeHours * 3600 * 1000);
      setServeDateTime(computedServe.toISOString().slice(0, 16));
    }
  };

  // Handle Target Serve Date Time change
  const handleServeDateTimeChange = (newServeStr: string) => {
    setServeDateTime(newServeStr);
    const d = new Date(newServeStr);
    if (!isNaN(d.getTime())) {
      const computedStart = new Date(d.getTime() - cookToServeHours * 3600 * 1000);
      setStartDateTime(computedStart.toISOString().slice(0, 16));
    }
  };

  // When preset or params change, update serve date based on current start date
  useEffect(() => {
    const d = new Date(startDateTime);
    if (!isNaN(d.getTime())) {
      const computedServe = new Date(d.getTime() + cookToServeHours * 3600 * 1000);
      setServeDateTime(computedServe.toISOString().slice(0, 16));
    }
  }, [weightLbs, targetPitTemp, restHours, bufferHours, selectedPresetId]);

  // When preset changes
  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const p = PRESET_CUTS.find((cut) => cut.id === presetId);
    if (p) {
      setWeightLbs(p.weightLbs);
      setTargetPitTemp(p.targetPitTemp);
      setRestHours(p.restHours);
      setAiAuditOutput(null);
    }
  };

  // Quick Start Date Setters
  const setQuickStartTime = (offsetDays: number, hour24: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hour24, 0, 0, 0);
    const startStr = d.toISOString().slice(0, 16);
    handleStartDateTimeChange(startStr);
  };

  // Quick Serve Date Setters
  const setQuickServeTime = (offsetDays: number, hour24: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hour24, 0, 0, 0);
    const serveStr = d.toISOString().slice(0, 16);
    handleServeDateTimeChange(serveStr);
  };

  // Estimated fuel consumption (pellets in lbs)
  const tempFactor = targetPitTemp >= 275 ? 1.8 : targetPitTemp >= 250 ? 1.5 : 1.2;
  const estimatedPelletsLbs = parseFloat((totalProcessHours * tempFactor).toFixed(1));

  // Date Math for timeline steps
  const startCookDateObj = new Date(startDateTime);
  const dryBrineDateObj = new Date(startCookDateObj.getTime() - 12 * 3600 * 1000);
  const preheatDateObj = new Date(startCookDateObj.getTime() - preheatMins * 60 * 1000);
  const wrapDateObj = new Date(startCookDateObj.getTime() + estimatedCookHours * 0.45 * 3600 * 1000);
  const pullMeatDateObj = new Date(startCookDateObj.getTime() + (estimatedCookHours + bufferHours) * 3600 * 1000);
  const serveDateObj = new Date(pullMeatDateObj.getTime() + restHours * 3600 * 1000);

  const formatDateTime = (dateObj: Date) => {
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    return dateObj.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleAuditWithAI = async () => {
    setIsAuditingPlan(true);
    try {
      const res = await fetch('/api/chargpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `You are ${AI_NAME}, the self-learning BBQ AI Cook Planner. Review my planned smoking schedule:
- Meat: ${selectedPreset.name} (${weightLbs} lbs ${selectedPreset.cut})
- Target Serving Time: ${formatDateTime(serveDateObj)}
- Backwards Calculated Start Cook Time: ${formatDateTime(startCookDateObj)}
- Total Estimated Cook Time: ${estimatedCookHours.toFixed(1)} hrs @ ${targetPitTemp}°F pit temp
- Resting Window: ${restHours} hrs in insulated cooler
- Fuel Estimate: ~${estimatedPelletsLbs} lbs pellets on my ${smokerProfile.name || smokerProfile.model} (${smokerProfile.pelletHopperCapacityLbs} lbs hopper)

Review this plan against my previous log history (${cookLogs.length} logs found) and linked smoker profile to give me 3 concise, high-value ${AI_NAME} pitmaster recommendations:
1. Timeline & Stall Assessment: Is the timeline buffer sufficient for this cut's thermal stall on my ${smokerProfile.name || smokerProfile.smokerType}?
2. Temperature & Moisture Plan: Best wrap strategy (paper/foil) and spritz frequency.
3. Pellet & Hopper Check: Advice for my ${smokerProfile.pelletHopperCapacityLbs} lb hopper capacity and weather considerations.`,
          allCookLogs: cookLogs,
          smokerProfile,
          effectiveSpecs: getEffectiveSmokerSpecs(smokerProfile),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          setAiAuditOutput(data.text);
          setIsAuditingPlan(false);
          return;
        }
      }
    } catch (err) {
      console.warn('AI Audit failed, using local advice', err);
    }

    const fallbackAudit = `🔥 ${AI_NAME} Schedule Audit for ${selectedPreset.name}:
• Timeline Validation: Your start time of ${formatDateTime(startCookDateObj)} provides a solid ${bufferHours} hr buffer for the thermal stall before serving at ${formatDateTime(serveDateObj)}.
• Temperature & Wrap: Target ${targetPitTemp}°F pit temp. At the 165°F stall stage (${formatDateTime(wrapDateObj)}), wrap in peach butcher paper with tallow/butter.
• Fuel Requirement: Estimated pellet consumption is ~${estimatedPelletsLbs} lbs. Ensure your hopper is filled above 50% capacity before ignition!`;

    setAiAuditOutput(fallbackAudit);
    setIsAuditingPlan(false);
  };

  const handleConvertToActiveCook = () => {
    let matchedRecipe = selectedPreset.recipeRef;
    if (!matchedRecipe) {
      matchedRecipe = {
        id: `custom-plan-${Date.now()}`,
        title: selectedPreset.name,
        proteinType: selectedPreset.proteinType as any,
        proteinCut: `${weightLbs} lb ${selectedPreset.cut}`,
        difficulty: 'Intermediate',
        estHours: estimatedCookHours,
        targetPitTemp: targetPitTemp,
        targetMeatTemp: selectedPreset.targetMeatTemp,
        recommendedWood: 'Competition Blend Pellets',
        estPelletsLbs: estimatedPelletsLbs,
        rubIngredients: 'Coarse Salt, Black Pepper, Garlic Powder',
        description: `Planned cook for ${selectedPreset.name} target serve ${formatDateTime(serveDateObj)}.`,
        keySteps: ['Preheat smoker', 'Put meat on', 'Wrap at stall', 'Rest and serve'],
        proTip: 'Follow planned backwards timeline for optimum resting.',
        prepTimeMinutes: preheatMins,
        flavorProfile: 'Smoky & Tender',
        tags: ['Planned Cook', selectedPreset.proteinType],
      };
    }
    onStartCookFromPlan(matchedRecipe);
  };

  const handleExportICS = () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Pitmaster Log//Cook Planner//EN
BEGIN:VEVENT
SUMMARY:🔥 Smoke Cook: Put ${selectedPreset.name} on Smoker
DESCRIPTION:Target serve time: ${formatDateTime(serveDateObj)}. Pit Temp: ${targetPitTemp}°F. Est Cook: ${estimatedCookHours} hrs.
DTSTART:${startCookDateObj.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${serveDateObj.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cook-schedule-${selectedPreset.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-orange-950/60 via-zinc-900 to-amber-950/40 border border-orange-500/30 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mr-8 -mt-8 w-48 h-48 bg-orange-500/5 rounded-full pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-500 text-zinc-950 rounded-xl shadow-lg shrink-0">
              <Calendar className="w-5 h-5 font-black" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Future Cook Planner
                </h2>
                <span className="text-[10px] uppercase font-mono font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-md">
                  Forward & Serve Schedule
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Plan future smoke cooks forward from your start time or set your target dinner serve time with automatic timeline calculation.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleAuditWithAI}
              disabled={isAuditingPlan}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center space-x-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50 min-h-[40px]"
            >
              {isAuditingPlan ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>AI Auditing Schedule...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-purple-200" />
                  <span>AI Audit Plan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Configurator vs Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Cook Parameters */}
        <div className="lg:col-span-5 bg-[#181818] border border-[#2a2a2a] rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
          <div className="pb-2 border-b border-[#2a2a2a]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center space-x-2">
              <UtensilsCrossed className="w-4 h-4 text-orange-400" />
              <span>1. Cut Parameters & Target Timing</span>
            </h3>
          </div>

          {/* Quick Cut Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
              Select Meat / Cut Preset
            </label>
            <select
              value={selectedPresetId}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-medium rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer min-h-[42px]"
            >
              {PRESET_CUTS.map((cut) => (
                <option key={cut.id} value={cut.id}>
                  {cut.name} ({cut.proteinType} - {cut.cut})
                </option>
              ))}
            </select>
          </div>

          {/* Weight & Pit Temp Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1">
                Meat Weight (lbs)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="40"
                value={weightLbs}
                onChange={(e) => setWeightLbs(Math.max(0.5, parseFloat(e.target.value) || 1))}
                className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[40px]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1">
                Pit Temp Target (°F)
              </label>
              <input
                type="number"
                step="5"
                min="180"
                max="400"
                value={targetPitTemp}
                onChange={(e) => setTargetPitTemp(parseInt(e.target.value) || 225)}
                className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[40px]"
              />
            </div>
          </div>

          {/* Planned Start Cook Date & Time */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-orange-400">
                Planned Start Cook Date & Time
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">Smoker Ignition</span>
            </div>
            <input
              type="datetime-local"
              value={startDateTime}
              onChange={(e) => handleStartDateTimeChange(e.target.value)}
              className="w-full bg-[#121212] border border-orange-500/40 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer font-mono min-h-[40px]"
            />

            {/* Quick Start Presets */}
            <div className="flex items-center gap-1 mt-1.5 overflow-x-auto pb-1 text-[10px] no-scrollbar">
              <span className="text-zinc-500 uppercase font-bold shrink-0">Quick Start:</span>
              <button
                type="button"
                onClick={() => setQuickStartTime(0, 7)}
                className="px-2 py-1 bg-[#222222] hover:bg-[#2e2e2e] text-zinc-300 rounded-md border border-[#2a2a2a] whitespace-nowrap cursor-pointer font-medium"
              >
                Today 7 AM
              </button>
              <button
                type="button"
                onClick={() => setQuickStartTime(1, 6)}
                className="px-2 py-1 bg-[#222222] hover:bg-[#2e2e2e] text-zinc-300 rounded-md border border-[#2a2a2a] whitespace-nowrap cursor-pointer font-medium"
              >
                Tomorrow 6 AM
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  const day = d.getDay();
                  const diff = d.getDate() + (6 - day + 7) % 7;
                  d.setDate(diff);
                  d.setHours(6, 0, 0, 0);
                  handleStartDateTimeChange(d.toISOString().slice(0, 16));
                }}
                className="px-2 py-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-md border border-orange-500/20 whitespace-nowrap cursor-pointer font-bold"
              >
                Sat Game Day 6 AM
              </button>
            </div>
          </div>

          {/* Target Serving Date & Time */}
          <div className="space-y-1 pt-1 border-t border-[#2a2a2a]">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Target Serving Date & Time
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">Dinner Served</span>
            </div>
            <input
              type="datetime-local"
              value={serveDateTime}
              onChange={(e) => handleServeDateTimeChange(e.target.value)}
              className="w-full bg-[#121212] border border-amber-500/40 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer font-mono min-h-[40px]"
            />

            {/* Quick Serve Presets */}
            <div className="flex items-center gap-1 mt-1.5 overflow-x-auto pb-1 text-[10px] no-scrollbar">
              <span className="text-zinc-500 uppercase font-bold shrink-0">Quick Serve:</span>
              <button
                type="button"
                onClick={() => setQuickServeTime(0, 18)}
                className="px-2 py-1 bg-[#222222] hover:bg-[#2e2e2e] text-zinc-300 rounded-md border border-[#2a2a2a] whitespace-nowrap cursor-pointer font-medium"
              >
                Today 6 PM
              </button>
              <button
                type="button"
                onClick={() => setQuickServeTime(1, 17)}
                className="px-2 py-1 bg-[#222222] hover:bg-[#2e2e2e] text-zinc-300 rounded-md border border-[#2a2a2a] whitespace-nowrap cursor-pointer font-medium"
              >
                Tomorrow 5 PM
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  const day = d.getDay();
                  const diff = d.getDate() + (6 - day + 7) % 7;
                  d.setDate(diff);
                  d.setHours(17, 0, 0, 0);
                  handleServeDateTimeChange(d.toISOString().slice(0, 16));
                }}
                className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-md border border-amber-500/20 whitespace-nowrap cursor-pointer font-bold"
              >
                Sat Game Day 5 PM
              </button>
            </div>
          </div>

          {/* Resting & Buffer Windows */}

          {/* Resting & Buffer Windows */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#2a2a2a]">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Rest (hrs)
              </label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                max="6"
                value={restHours}
                onChange={(e) => setRestHours(parseFloat(e.target.value) || 0.5)}
                className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-xl px-2 py-1.5 text-xs text-center font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[36px]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Stall (hrs)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="4"
                value={bufferHours}
                onChange={(e) => setBufferHours(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-xl px-2 py-1.5 text-xs text-center font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[36px]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Preheat (m)
              </label>
              <input
                type="number"
                step="5"
                min="15"
                max="90"
                value={preheatMins}
                onChange={(e) => setPreheatMins(parseInt(e.target.value) || 30)}
                className="w-full bg-[#121212] border border-[#2a2a2a] text-white rounded-xl px-2 py-1.5 text-xs text-center font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[36px]"
              />
            </div>
          </div>

          {/* Fuel Estimate Card */}
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-zinc-300">
              <span className="font-bold flex items-center space-x-1.5 text-amber-400 text-xs">
                <Fuel className="w-3.5 h-3.5 text-amber-400" />
                <span>Fuel Calculation</span>
              </span>
              <span className="font-mono font-bold text-white text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md">
                ~{estimatedPelletsLbs} lbs needed
              </span>
            </div>

            <p className="text-[10px] text-zinc-400 leading-normal">
              Based on {totalProcessHours.toFixed(1)} total runtime hours at {targetPitTemp}°F. Hopper capacity is {smokerProfile.pelletHopperCapacityLbs || 18} lbs.
            </p>

            {estimatedPelletsLbs > (smokerProfile.pelletHopperCapacityLbs || 18) && (
              <div className="flex items-center space-x-1.5 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>Refill required (~{(estimatedPelletsLbs - (smokerProfile.pelletHopperCapacityLbs || 18)).toFixed(1)} lbs extra).</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Backwards Timeline */}
        <div className="lg:col-span-7 bg-[#181818] border border-[#2a2a2a] rounded-2xl p-5 space-y-5 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-[#2a2a2a]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-orange-400" />
              <span>2. Calculated Cook Schedule</span>
            </h3>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleExportICS}
                className="px-2.5 py-1 bg-[#222222] hover:bg-[#2c2c2c] text-zinc-300 hover:text-white rounded-lg text-xs font-semibold flex items-center space-x-1 border border-[#2a2a2a] transition-colors cursor-pointer"
                title="Download .ICS calendar event file"
              >
                <Download className="w-3.5 h-3.5 text-orange-400" />
                <span>Calendar File</span>
              </button>
            </div>
          </div>

          {/* Timeline Step Cards */}
          <div className="relative space-y-3 before:absolute before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#2a2a2a] pl-2">
            
            {/* Step 1: Prep & Dry Brine */}
            <div className="relative pl-8 bg-[#121212] border border-[#2a2a2a] rounded-xl p-3.5 space-y-1">
              <div className="absolute left-3.5 top-4 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-zinc-700 border-2 border-zinc-900 z-10"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 flex items-center space-x-1.5">
                  <span>🔪 Trim & Dry Brine (12h Prior)</span>
                </span>
                <span className="font-mono text-xs font-bold text-zinc-400 bg-[#1c1c1c] px-2 py-0.5 rounded-md border border-[#2a2a2a]">
                  {formatDateTime(dryBrineDateObj)}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Trim fat cap to 1/4 inch, apply rub evenly, and rest uncovered in refrigerator to build tacky surface.
              </p>
            </div>

            {/* Step 2: Fire Up Smoker */}
            <div className="relative pl-8 bg-[#121212] border border-amber-500/30 rounded-xl p-3.5 space-y-1">
              <div className="absolute left-3.5 top-4 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-zinc-900 z-10 animate-pulse"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>🔥 Smoker Ignition & Preheat</span>
                </span>
                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                  {formatDateTime(preheatDateObj)}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Power on smoker to {targetPitTemp}°F. Fill pellet hopper with at least {Math.ceil(estimatedPelletsLbs)} lbs of wood pellets.
              </p>
            </div>

            {/* Step 3: Put Meat On */}
            <div className="relative pl-8 bg-[#121212] border border-orange-500/40 rounded-xl p-3.5 space-y-1 shadow-md">
              <div className="absolute left-3.5 top-4 -translate-x-1/2 w-4 h-4 rounded-full bg-orange-500 border-2 border-zinc-900 z-10"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-400 flex items-center space-x-1.5">
                  <span>🚀 PUT MEAT ON SMOKER</span>
                </span>
                <span className="font-mono text-xs font-black text-orange-300 bg-orange-500/20 px-2.5 py-0.5 rounded-md border border-orange-500/40">
                  {formatDateTime(startCookDateObj)}
                </span>
              </div>
              <p className="text-[11px] text-zinc-300">
                Insert internal temperature probe into the thickest part. Set smoker alarm target to {selectedPreset.targetMeatTemp}°F.
              </p>
            </div>

            {/* Step 4: Estimated Wrap Stage */}
            <div className="relative pl-8 bg-[#121212] border border-[#2a2a2a] rounded-xl p-3.5 space-y-1">
              <div className="absolute left-3.5 top-4 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-zinc-900 z-10"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400 flex items-center space-x-1.5">
                  <span>📦 Estimated Stall & Wrap Window</span>
                </span>
                <span className="font-mono text-xs font-bold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                  ~{formatDateTime(wrapDateObj)}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                When internal temp reaches ~165°F and bark sets firm, wrap in butcher paper or foil with butter or tallow.
              </p>
            </div>

            {/* Step 5: Probe Check & Pull */}
            <div className="relative pl-8 bg-[#121212] border border-emerald-500/30 rounded-xl p-3.5 space-y-1">
              <div className="absolute left-3.5 top-4 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-zinc-900 z-10"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Probe Tender Check & Pull</span>
                </span>
                <span className="font-mono text-xs font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  ~{formatDateTime(pullMeatDateObj)}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Probe for butter-soft feel around {selectedPreset.targetMeatTemp}°F. Remove from smoker once tender.
              </p>
            </div>

            {/* Step 6: Serve Time */}
            <div className="relative pl-8 bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/50 rounded-xl p-4 space-y-1.5 shadow-lg">
              <div className="absolute left-3.5 top-4 -translate-x-1/2 w-4 h-4 rounded-full bg-amber-400 border-2 border-zinc-950 z-10 animate-bounce"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white flex items-center space-x-1.5">
                  <UtensilsCrossed className="w-4 h-4 text-amber-400" />
                  <span className="uppercase tracking-wider">🎉 SLICE & SERVE TIME!</span>
                </span>
                <span className="font-mono text-xs font-black text-zinc-950 bg-amber-400 px-3 py-1 rounded-lg shadow">
                  {formatDateTime(serveDateObj)}
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 font-medium">
                Slices ready for guests! Rested in cooler for {restHours} hrs for peak juiciness and tender texture.
              </p>
            </div>
          </div>

          {/* AI Audit Output Box */}
          {aiAuditOutput && (
            <div className="bg-[#121212] border border-purple-500/40 rounded-xl p-4 space-y-2 animate-fadeIn text-xs">
              <div className="flex items-center space-x-2 text-purple-300 font-bold pb-1.5 border-b border-[#2a2a2a]">
                <Bot className="w-4 h-4 text-purple-400" />
                <span>{AI_NAME} Schedule Audit</span>
              </div>
              <div className="text-zinc-300 whitespace-pre-line leading-relaxed text-[11px] font-sans">
                {aiAuditOutput}
              </div>
            </div>
          )}

          {/* Bottom Conversion Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handleConvertToActiveCook}
              className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-zinc-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-95 min-h-[44px]"
            >
              <PlusCircle className="w-4.5 h-4.5" />
              <span>Convert Plan to Active Smoke Log</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const prompt = `Here is my planned cook schedule for ${selectedPreset.name} (${weightLbs} lbs):
- Target Serve: ${formatDateTime(serveDateObj)}
- Backwards Start Cook: ${formatDateTime(startCookDateObj)}
- Pit Temp: ${targetPitTemp}°F

Please give me a complete game plan including wood pellet choice, rub recipe, spritz timeline, and rest technique!`;
                onAskAIPitmasterAboutPlan(prompt);
              }}
              className="w-full sm:w-auto py-3 px-4 bg-[#242424] hover:bg-[#2c2c2c] border border-purple-500/40 text-purple-300 hover:text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer min-h-[44px]"
            >
              <Bot className="w-4 h-4 text-purple-400" />
              <span>Consult {AI_NAME}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
