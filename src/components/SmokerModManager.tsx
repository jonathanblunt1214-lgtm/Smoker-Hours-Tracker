import React, { useState } from 'react';
import {
  Wrench,
  Flame,
  Zap,
  ShieldCheck,
  TrendingDown,
  Plus,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Layers,
  Thermometer,
  DollarSign,
  Maximize2,
  Cpu,
  Feather,
  Info,
  Calendar,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { SmokerProfile, SmokerModItem, SmokerModCategory, AppliedSmokerMod } from '../types';
import { KNOWN_SMOKER_MODS, getModsBySmokerType } from '../data/smokerModsDatabase';
import { getEffectiveSmokerSpecs } from '../utils/smokerCalculations';

interface SmokerModManagerProps {
  profile: SmokerProfile;
  onUpdateProfile: (updatedProfile: SmokerProfile) => void;
  onClose?: () => void;
}

export const SmokerModManager: React.FC<SmokerModManagerProps> = ({
  profile,
  onUpdateProfile,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'manufactured' | 'custom' | 'all'>(
    profile.isCustomBuilt ? 'custom' : 'manufactured'
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingModNotes, setEditingModNotes] = useState<{ [key: string]: string }>({});

  // Get active mod IDs from profile
  const getEnabledModIds = (): string[] => {
    if (profile.appliedMods) {
      return profile.appliedMods.filter((m) => m.enabled).map((m) => m.modId);
    }
    return profile.appliedModIds || [];
  };

  const enabledModIds = getEnabledModIds();

  // Handle toggle mod
  const handleToggleMod = (modId: string) => {
    let currentApplied = profile.appliedMods ? [...profile.appliedMods] : [];
    
    // If using appliedModIds legacy format convert or sync
    const existingIndex = currentApplied.findIndex((m) => m.modId === modId);
    let updatedApplied: AppliedSmokerMod[] = [];

    if (existingIndex >= 0) {
      // Toggle existing
      updatedApplied = currentApplied.map((m, idx) =>
        idx === existingIndex ? { ...m, enabled: !m.enabled } : m
      );
    } else {
      // Add new enabled mod
      updatedApplied = [
        ...currentApplied,
        {
          modId,
          enabled: true,
          installedDate: new Date().toISOString().split('T')[0],
          notes: editingModNotes[modId] || '',
        }
      ];
    }

    const updatedModIds = updatedApplied.filter((m) => m.enabled).map((m) => m.modId);

    const updatedProfile: SmokerProfile = {
      ...profile,
      appliedMods: updatedApplied,
      appliedModIds: updatedModIds,
      // Sync into specs if present
      customSpecs: profile.customSpecs
        ? {
            ...profile.customSpecs,
            appliedMods: updatedApplied,
            appliedModIds: updatedModIds,
          }
        : undefined,
      manufacturerSpecs: profile.manufacturerSpecs
        ? {
            ...profile.manufacturerSpecs,
            appliedMods: updatedApplied,
            appliedModIds: updatedModIds,
          }
        : undefined,
    };

    onUpdateProfile(updatedProfile);
  };

  // Filter mods list
  const filteredMods = KNOWN_SMOKER_MODS.filter((mod) => {
    // Tab filter
    if (activeTab === 'manufactured' && mod.targetSmokerType === 'custom') return false;
    if (activeTab === 'custom' && mod.targetSmokerType === 'manufactured') return false;

    // Category filter
    if (selectedCategory !== 'All' && mod.category !== selectedCategory) return false;

    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = mod.name.toLowerCase().includes(q);
      const matchDesc = mod.description.toLowerCase().includes(q);
      const matchBrand = mod.popularBrandsOrBuilders?.some((b) => b.toLowerCase().includes(q));
      if (!matchName && !matchDesc && !matchBrand) return false;
    }

    return true;
  });

  // Calculate live effective specs
  const effectiveSpecs = getEffectiveSmokerSpecs(profile);

  // Compare baseline vs modded metrics
  const unmoddedBurn = effectiveSpecs.unmodifiedBaselineBurnRateLbsHr;
  const moddedBurn = effectiveSpecs.baselineBurnRateLbsHr;
  const burnDiff = Number((unmoddedBurn - moddedBurn).toFixed(2));

  const unmoddedCapacity = effectiveSpecs.unmodifiedHopperCapacityLbs;
  const moddedCapacity = effectiveSpecs.hopperCapacityLbs;

  const unmoddedArea = effectiveSpecs.unmodifiedCookingAreaSqIn;
  const moddedArea = effectiveSpecs.cookingAreaSqIn;

  // Categories list
  const categories: string[] = [
    'All',
    'Thermal & Insulation',
    'Seals & Airflow',
    'Electronics & Controllers',
    'Capacity & Racks',
    'Heat Mass & Distribution',
    'Combustion & Fuel'
  ];

  return (
    <div className="bg-zinc-950 text-zinc-100 rounded-xl border border-zinc-800 shadow-2xl p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">
              <Wrench className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Smoker Specification Modifications & Tuning
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {effectiveSpecs.activeModsCount} Active Mod{effectiveSpecs.activeModsCount !== 1 ? 's' : ''}
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Toggle aftermarket modifications to recalculate fuel burn rates, thermal efficiency, hopper capacity, and cooking area in real-time.
              </p>
            </div>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="self-end sm:self-center px-3 py-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors"
          >
            Done Tuning
          </button>
        )}
      </div>

      {/* Recalculation Impact Dashboard */}
      {effectiveSpecs.activeModsCount === 0 ? (
        <div className="bg-zinc-950/80 border border-amber-500/30 text-amber-300 rounded-xl p-5 text-center space-y-2 shadow-md">
          <div className="flex items-center justify-center space-x-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Smoker Specification Modifications & Tuning Metrics</span>
          </div>
          <p className="text-xs text-amber-300/90 font-medium max-w-lg mx-auto leading-relaxed">
            Awaiting modification selection — toggle an aftermarket mod or custom pit tuning upgrade below to calculate live burn rate adjustments, thermal efficiency ratings, payload changes, and cooking area metrics.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-zinc-900/90 border border-zinc-800 rounded-xl p-4">
          {/* Metric 1: Burn Rate */}
          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-3 relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Flame className="w-3.5 h-3.5 text-amber-400" /> Fuel Burn Rate
              </span>
              {effectiveSpecs.fuelSavingsPercent > 0 && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                  -{effectiveSpecs.fuelSavingsPercent}% Burn
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-400 tracking-tight">
                {moddedBurn} <span className="text-xs font-medium text-zinc-400">lbs/hr</span>
              </span>
              {burnDiff > 0 && (
                <span className="text-xs text-zinc-400 line-through font-mono">
                  {unmoddedBurn} lbs/hr
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              {burnDiff > 0
                ? `Saves ~${(burnDiff * 12).toFixed(1)} lbs fuel on a 12-hour cook`
                : 'Custom tuned fuel burn rate'}
            </p>
          </div>

          {/* Metric 2: Burn Efficiency Rate */}
          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-3 relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Burn Efficiency Rate
              </span>
              <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">
                Grade {effectiveSpecs.globalBurnEfficiencyGrade}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-400 tracking-tight">
                {effectiveSpecs.globalBurnEfficiencyPercent}%
              </span>
              <span className="text-xs text-zinc-400 font-medium">
                ({effectiveSpecs.globalBurnEfficiencyStatus})
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 truncate" title={effectiveSpecs.globalBurnEfficiencySummary}>
              {effectiveSpecs.thermalEfficiencyMultiplier}x retention • {effectiveSpecs.tempStabilitySummary}
            </p>
          </div>

          {/* Metric 3: Hopper / Fuel Payload */}
          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-3 relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Layers className="w-3.5 h-3.5 text-orange-400" /> Fuel Capacity
              </span>
              {moddedCapacity > unmoddedCapacity && (
                <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded">
                  +{moddedCapacity - unmoddedCapacity} lbs Added
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-orange-400 tracking-tight">
                {moddedCapacity} <span className="text-xs font-medium text-zinc-400">lbs</span>
              </span>
              {moddedCapacity > unmoddedCapacity && (
                <span className="text-xs text-zinc-400 line-through font-mono">
                  {unmoddedCapacity} lbs
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Est. Max Run Time: <strong className="text-zinc-200">{(moddedCapacity / (moddedBurn || 1.2)).toFixed(1)} hrs</strong> at 225°F
            </p>
          </div>

          {/* Metric 4: Usable Cooking Grate Area */}
          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-3 relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Maximize2 className="w-3.5 h-3.5 text-purple-400" /> Cooking Grate Area
              </span>
              {moddedArea > unmoddedArea && (
                <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">
                  +{moddedArea - unmoddedArea} sq in
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-purple-400 tracking-tight">
                {moddedArea} <span className="text-xs font-medium text-zinc-400">sq in</span>
              </span>
              {moddedArea > unmoddedArea && (
                <span className="text-xs text-zinc-400 line-through font-mono">
                  {unmoddedArea} sq in
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              {moddedArea > unmoddedArea
                ? `Capacity extended to fit ~${Math.floor(moddedArea / 180)} briskets / butts`
                : 'Factory cooking rack layout'}
            </p>
          </div>
        </div>
      )}

      {/* Controls Bar: Type Tabs, Category Filter, Search */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Type Filter Tabs */}
        <div className="inline-flex p-1 bg-zinc-900 border border-zinc-800 rounded-lg self-start">
          <button
            onClick={() => setActiveTab('manufactured')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'manufactured'
                ? 'bg-amber-500 text-zinc-950 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Manufactured Smoker Mods
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'custom'
                ? 'bg-amber-500 text-zinc-950 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Custom Smoker Mods
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'all'
                ? 'bg-amber-500 text-zinc-950 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All Mod Catalogs ({KNOWN_SMOKER_MODS.length})
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search mods, brands, parts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:border-amber-500 placeholder-zinc-500"
            />
          </div>
        </div>
      </div>

      {/* Mods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[550px] overflow-y-auto pr-1 custom-scrollbar">
        {filteredMods.map((mod) => {
          const isEnabled = enabledModIds.includes(mod.id);

          return (
            <div
              key={mod.id}
              className={`relative border rounded-xl p-4 transition-all ${
                isEnabled
                  ? 'bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-950/20'
                  : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              {/* Card Top */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                      {mod.category}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-medium">
                      Est: {mod.estimatedCostRange}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1.5 leading-snug">
                    {mod.name}
                  </h3>
                </div>

                {/* Toggle Button */}
                <button
                  type="button"
                  onClick={() => handleToggleMod(mod.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    isEnabled
                      ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700'
                  }`}
                >
                  {isEnabled ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-zinc-950" /> Mod Applied
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-amber-400" /> Apply Mod
                    </>
                  )}
                </button>
              </div>

              {/* Description */}
              <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                {mod.description}
              </p>

              {/* Specification Impact Badges */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {mod.burnRateMultiplier < 1.0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    <TrendingDown className="w-3 h-3" />
                    -{Math.round((1 - mod.burnRateMultiplier) * 100)}% Fuel Burn
                  </span>
                )}
                {mod.thermalEfficiencyBoost > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                    <ShieldCheck className="w-3 h-3" />
                    +{Math.round(mod.thermalEfficiencyBoost * 100)}% Thermal Boost
                  </span>
                )}
                {mod.capacityAddLbs > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
                    <Layers className="w-3 h-3" />
                    +{mod.capacityAddLbs} lbs Fuel Payload
                  </span>
                )}
                {mod.cookingAreaAddSqIn > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                    <Maximize2 className="w-3 h-3" />
                    +{mod.cookingAreaAddSqIn} sq in Grate
                  </span>
                )}
                {mod.tempStabilityDeltaDegrees > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                    <Thermometer className="w-3 h-3" />
                    ±{mod.tempStabilityDeltaDegrees}°F Temp Stability
                  </span>
                )}
              </div>

              {/* Key Benefits List */}
              <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-lg p-2.5 space-y-1 mb-2">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Primary Performance Benefits
                </p>
                {mod.benefitsList.map((benefit, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-[11px] text-zinc-300">
                    <ChevronRight className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

              {/* Applicable Brands & Installation Level */}
              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                <span className="truncate max-w-[240px]">
                  Compatible: <strong className="text-zinc-300">{mod.popularBrandsOrBuilders?.join(', ') || 'Universal'}</strong>
                </span>
                <span className="font-medium text-zinc-400">
                  {mod.difficultyLevel}
                </span>
              </div>
            </div>
          );
        })}

        {filteredMods.length === 0 && (
          <div className="col-span-full py-12 text-center bg-zinc-900/40 border border-zinc-800/60 rounded-xl">
            <Wrench className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-zinc-300">No modifications match your filter</h4>
            <p className="text-xs text-zinc-500 mt-1">Try resetting the category filter or changing your search terms.</p>
          </div>
        )}
      </div>
    </div>
  );
};
