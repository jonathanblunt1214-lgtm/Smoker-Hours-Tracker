import React, { useState } from 'react';
import { SmokerProfile, CookLog, FuelLog } from '../types';
import { Clock, Flame, ShieldCheck, Scale, AlertTriangle, Wrench, ChevronDown, ChevronUp, Gauge, Edit3, CloudUpload, X, Check, RefreshCw, BarChart3 } from 'lucide-react';
import { calculateFuelTelemetryBySmokerType, calculateSmokerHealthScore } from '../utils/smokerCalculations';
import { useSmokerHours, SmokerHours } from '../services/smokerSyncService';
import { formatFuelOnHandWeight, TempUnit } from '../utils/tempUtils';

interface SmokerOverviewBannerProps {
  profile: SmokerProfile;
  cookLogs: CookLog[];
  fuelLogs: FuelLog[];
  tempUnit?: TempUnit;
  onQuickLogClick: () => void;
  onUpdateProfile?: (updatedProfile: SmokerProfile) => void;
  onOpenSettings?: (tab?: 'appearance' | 'alerts' | 'cloud' | 'data' | 'smokers') => void;
  onOpenCharGPT?: (prompt?: string) => void;
  onOpenAlexaPush?: () => void;
  onUploadAndSyncProfile?: () => void;
}

export const SmokerOverviewBanner: React.FC<SmokerOverviewBannerProps> = ({
  profile,
  cookLogs,
  fuelLogs,
  tempUnit,
  onQuickLogClick,
  onUpdateProfile,
  onOpenSettings,
  onOpenCharGPT,
  onOpenAlexaPush,
  onUploadAndSyncProfile,
}) => {
  const [showMobileMetrics, setShowMobileMetrics] = useState<boolean>(true);

  const globalSmokerHours = useSmokerHours();

  // Multi-Fuel Telemetry (Stick-Burner, LP Gas Propane, Pellets)
  const fuelTelemetry = calculateFuelTelemetryBySmokerType(profile, cookLogs, fuelLogs);

  // Calculate total hours logged across all cooks & cross-reference latest ending smoker hours
  const totalHoursLogged = cookLogs.reduce((acc, curr) => acc + (curr.hoursLogged || 0), 0);
  const maxCookHours = cookLogs.length > 0 ? Math.max(...cookLogs.map((c) => c.endingSmokerHours || 0)) : 0;
  const currentEffectiveHours = Math.max(profile.currentHours || 0, globalSmokerHours.hours || 0);
  const displayedHoursToDate = Math.max(currentEffectiveHours, maxCookHours);

  const totalFuelLbs = cookLogs.reduce((acc, curr) => acc + (curr.fuelLbsConsumed || 0), 0);
  const avgBurnRate = totalHoursLogged > 0 ? (totalFuelLbs / totalHoursLogged).toFixed(2) : fuelTelemetry.burnRateLbsHr.toFixed(2);

  // Calculate maintenance warning
  const dueMaintenanceCount = profile.maintenanceTasks.filter(
    (t) => profile.currentHours - t.lastPerformedHours >= t.intervalHours
  ).length;

  const activeUnit: TempUnit = tempUnit || (localStorage.getItem('global_unit_system') === 'metric' ? 'C' : 'F');

  // Account Fuel On Hand metric sync
  const getAccountFuelOnHand = (): string => {
    try {
      const rawAccount = localStorage.getItem('pitmaster_local_user_account');
      if (rawAccount) {
        const parsed = JSON.parse(rawAccount);
        if (parsed?.fuelOnHand) return parsed.fuelOnHand;
      }
    } catch (e) {}
    return profile.fuelOnHand !== undefined ? profile.fuelOnHand : `${fuelTelemetry.inventoryLbsOnHand || 0} lbs`;
  };

  const rawFuelOnHand = getAccountFuelOnHand();
  const currentFuelOnHand = formatFuelOnHandWeight(rawFuelOnHand, activeUnit);

  // Format active selected smoker details
  const getSelectedSmokerDetails = () => {
    const name = profile.name?.trim();
    const model = profile.model?.trim();
    const type = profile.smokerType?.trim() || '';
    const fuel = profile.fuelType?.trim() || '';

    const isSmokerSet = Boolean(
      (name && name !== 'None Selected' && name !== 'Standard Pitmaster Smoker') ||
      (model && model !== 'Custom Smoker Model') ||
      type
    );

    if (!isSmokerSet) {
      return { primary: 'None Selected', type: '', fuel: '' };
    }

    let primary = '';
    if (name && model && name !== model) {
      if (name.toLowerCase().includes(model.toLowerCase())) {
        primary = name;
      } else {
        primary = `${name} (${model})`;
      }
    } else {
      primary = name || model || 'None Selected';
    }

    return { primary, type, fuel };
  };

  const smokerDetails = getSelectedSmokerDetails();
  const isNoSmokerSelected =
    smokerDetails.primary === 'None Selected' ||
    !profile.name ||
    profile.name.trim() === '' ||
    profile.name === 'None Selected' ||
    (!profile.name && !profile.model && !profile.smokerType);

  const getFuelTelemetryDisplayName = () => {
    const rawFuel = profile.fuelType || smokerDetails.fuel || 'Pellets';
    const fuelLower = rawFuel.toLowerCase();

    if (fuelLower.includes('wood') || fuelLower.includes('split') || fuelLower.includes('stick') || profile.smokerType?.toLowerCase().includes('offset')) {
      return 'Wood Splits';
    }
    if (fuelLower.includes('gas') || fuelLower.includes('propane') || fuelLower.includes('lp') || profile.smokerType?.toLowerCase().includes('gas')) {
      return 'LP Propane Gas';
    }
    if (fuelLower.includes('charcoal') || fuelLower.includes('lump') || fuelLower.includes('briquette') || profile.smokerType?.toLowerCase().includes('charcoal')) {
      return 'Charcoal';
    }
    if (fuelLower.includes('electric') || profile.smokerType?.toLowerCase().includes('electric')) {
      return 'Electric Power';
    }
    if (fuelLower.includes('pellet') || profile.smokerType?.toLowerCase().includes('pellet')) {
      return 'Hardwood Pellets';
    }
    return rawFuel;
  };

  const selectedFuelName = getFuelTelemetryDisplayName();

  const handleFuelOnHandChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    try {
      const rawAccount = localStorage.getItem('pitmaster_local_user_account');
      const account = rawAccount ? JSON.parse(rawAccount) : { name: 'Pitmaster', email: '', title: 'Guest Pitmaster', createdAt: new Date().toISOString() };
      account.fuelOnHand = val;
      localStorage.setItem('pitmaster_local_user_account', JSON.stringify(account));
    } catch (e) {}

    if (onUpdateProfile) {
      onUpdateProfile({
        ...profile,
        fuelOnHand: val,
      });
    }
  };

  const handleFuelOnHandBlur = () => {
    let val = currentFuelOnHand.trim();
    if (!val) {
      val = '0 lbs';
    } else if (!val.toLowerCase().includes('lbs') && !val.toLowerCase().includes('gal') && !val.toLowerCase().includes('log')) {
      val = `${val} lbs`;
    }

    try {
      const rawAccount = localStorage.getItem('pitmaster_local_user_account');
      const account = rawAccount ? JSON.parse(rawAccount) : { name: 'Pitmaster', email: '', title: 'Guest Pitmaster', createdAt: new Date().toISOString() };
      account.fuelOnHand = val;
      localStorage.setItem('pitmaster_local_user_account', JSON.stringify(account));
    } catch (e) {}

    if (onUpdateProfile) {
      onUpdateProfile({
        ...profile,
        fuelOnHand: val,
      });
    }
  };

  const handleTriggerProfileUpload = () => {
    if (onUploadAndSyncProfile) {
      onUploadAndSyncProfile();
    } else if (onOpenSettings) {
      onOpenSettings('account');
    }
  };

  return (
    <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] text-[#e0e0e0] py-3.5 sm:py-5 shadow-md flex flex-col justify-center w-full overflow-x-hidden relative">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 my-auto flex flex-col justify-center space-y-3.5 sm:space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 w-full my-auto">
          
          {/* Main Title & Equipment tag */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-xs">
              <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 shrink-0">
                <Flame className="w-3.5 h-3.5 mr-1 text-orange-500" />
                Active Smoker Logbook
              </span>
              <button
                type="button"
                onClick={() => onOpenSettings?.('smokers')}
                className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-zinc-300 font-mono hover:text-white transition-all cursor-pointer group bg-[#222226] hover:bg-[#2a2a30] px-2.5 py-0.5 rounded-md border border-[#33333d] hover:border-orange-500/40 truncate max-w-full"
                title="Click to Switch Active Smoker or Manage Smoker Rigs"
              >
                <span className="font-bold text-zinc-200 group-hover:text-orange-300 transition-colors">
                  {smokerDetails.primary}
                </span>
                {smokerDetails.type && (
                  <>
                    <span className="text-zinc-500">•</span>
                    <span className="text-orange-400 font-semibold">{smokerDetails.type}</span>
                  </>
                )}
                {smokerDetails.fuel && (
                  <span className="text-zinc-400 text-[10px] hidden sm:inline">
                    ({smokerDetails.fuel})
                  </span>
                )}
                <Wrench className="w-3 h-3 text-zinc-400 group-hover:text-orange-400 transition-colors ml-0.5 shrink-0" />
              </button>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white mt-1.5 sm:mt-2 leading-snug sm:leading-tight">
              Smoker Overview
            </h1>
            <p className="text-[11px] sm:text-xs md:text-sm text-zinc-400 mt-1 sm:mt-1.5 max-w-3xl leading-snug sm:leading-relaxed">
              Monitor operating runtime hours, {selectedFuelName.toLowerCase()} fuel consumption, cook logs, and pit maintenance.
            </p>
          </div>

          {/* Action buttons & Mobile Stats Toggle */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
            <button
              type="button"
              onClick={() => onOpenSettings?.('smokers')}
              className="inline-flex items-center justify-center px-3 py-2.5 rounded-xl font-bold text-xs bg-[#242429] hover:bg-[#2e2e36] text-amber-400 border border-amber-500/30 hover:border-amber-500/60 transition-all cursor-pointer active:scale-98 min-h-[42px]"
              title="View Smoker Unit Chart & Per-Smoker Analysis Split"
            >
              <BarChart3 className="w-4 h-4 mr-1.5 text-amber-400" />
              Unit Chart & Analysis
            </button>

            <button
              type="button"
              onClick={handleTriggerProfileUpload}
              className="inline-flex items-center justify-center px-3 py-2.5 rounded-xl font-bold text-xs bg-[#242429] hover:bg-[#2e2e36] text-orange-400 border border-orange-500/30 hover:border-orange-500/60 transition-all cursor-pointer active:scale-98 min-h-[42px]"
              title="Upload current hours and cook logs to profile"
            >
              <CloudUpload className="w-4 h-4 mr-1.5 text-orange-400" />
              Upload to Profile
            </button>

            <button
              onClick={onQuickLogClick}
              className="flex-1 md:flex-initial inline-flex items-center justify-center px-4 py-2.5 sm:py-2.5 rounded-xl font-bold text-xs bg-orange-500 text-zinc-950 hover:bg-orange-600 transition-all shadow-lg shadow-orange-950/40 cursor-pointer active:scale-98 min-h-[42px]"
            >
              <Flame className="w-4 h-4 mr-2" />
              Start Smoke Session
            </button>

            <button
              type="button"
              onClick={() => setShowMobileMetrics(!showMobileMetrics)}
              className="md:hidden px-3 py-2.5 bg-[#242424] hover:bg-[#2e2e2e] text-zinc-300 border border-[#333] rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer min-h-[42px]"
              title="Toggle Smoker Overview Metrics"
            >
              <span className="text-[11px] font-mono">{displayedHoursToDate.toFixed(1)}h</span>
              {showMobileMetrics ? <ChevronUp className="w-4 h-4 text-orange-400" /> : <ChevronDown className="w-4 h-4 text-orange-400" />}
            </button>
          </div>

        </div>

        {/* 4 Metric Cards Grid - Multi-Fuel Adaptable */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 w-full ${showMobileMetrics ? 'grid' : 'hidden md:grid'}`}>
          
          {/* Metric 1: Hours to Date */}
          <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-sm hover:border-orange-500/40 transition-all flex flex-col justify-between min-h-[95px] sm:min-h-[110px] relative group">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-400 truncate">Hours to Date</span>
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400 shrink-0 ml-0.5" />
              </div>
              <div className="flex items-baseline space-x-1">
                <span className="text-xl sm:text-2xl md:text-3xl font-extrabold font-mono text-orange-400">
                  {displayedHoursToDate.toFixed(2)}
                </span>
                <span className="text-[10px] sm:text-xs text-zinc-400 font-sans">hrs</span>
              </div>
            </div>

            <div className="mt-1.5 pt-1.5 border-t border-[#333] flex items-center justify-between text-[10px] sm:text-[11px] text-zinc-400 font-mono">
              <span className="text-emerald-400 font-medium">+{totalHoursLogged.toFixed(1)}h logged</span>
              <span className="text-zinc-300 font-semibold" title="Pit Baseline Hours">
                Initial {profile.initialHours || 0}h
              </span>
            </div>
          </div>

          {/* Metric 2: Burn Efficiency & Fuel Demand Rate */}
          <div
            onClick={() => isNoSmokerSelected && onOpenSettings?.('smokers')}
            className={`bg-[#242424] border border-[#2a2a2a] rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-sm hover:border-orange-500/40 transition-all flex flex-col justify-between min-h-[95px] sm:min-h-[110px] ${
              isNoSmokerSelected ? 'cursor-pointer hover:bg-[#2a2a2a]' : ''
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-1 sm:mb-2">
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-400 truncate">Fuel Consumption</span>
                <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0 ml-1" />
              </div>
              <div className="flex items-baseline space-x-1">
                <span className="text-xl sm:text-2xl md:text-3xl font-extrabold font-mono text-white">
                  {isNoSmokerSelected ? '0' : avgBurnRate}
                </span>
                <span className="text-[10px] sm:text-xs text-zinc-400 font-sans">lbs/hr</span>
              </div>
            </div>
            <div className="mt-1 sm:mt-2 text-[10px] sm:text-[11px] text-zinc-300 font-mono truncate">
              {isNoSmokerSelected
                ? 'Select a smoker to calculate'
                : fuelTelemetry.fuelTypeKey === 'Gas'
                ? `~${(Number(avgBurnRate) / 4.24).toFixed(2)} gal LP / hr`
                : fuelTelemetry.fuelTypeKey === 'Wood Splits'
                ? `~${(Number(avgBurnRate) / 2.5).toFixed(1)} logs/hr`
                : `Total ${totalFuelLbs.toFixed(1)} lbs burned`}
            </div>
          </div>

          {/* Metric 3: Fuel Inventory / Multi-Fuel On Hand */}
          <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-sm hover:border-orange-500/40 transition-all flex flex-col justify-between min-h-[95px] sm:min-h-[110px]">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-400 truncate">
                  {fuelTelemetry.fuelTypeKey === 'Gas' ? 'LP Tank Level' : fuelTelemetry.fuelTypeKey === 'Wood Splits' ? 'Split Logs Inventory' : 'Fuel On Hand'}
                </span>
                <div className="flex items-center space-x-1 shrink-0">
                  <Gauge className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
                </div>
              </div>
              <div className="relative mt-1">
                <input
                  type="text"
                  placeholder={isNoSmokerSelected ? '0 lbs' : 'e.g. 120 lbs'}
                  value={isNoSmokerSelected && (!currentFuelOnHand || currentFuelOnHand === '0 lbs') ? '0 lbs' : currentFuelOnHand}
                  onChange={handleFuelOnHandChange}
                  onBlur={handleFuelOnHandBlur}
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-mono font-bold text-xs sm:text-sm rounded-lg sm:rounded-xl px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
            <div className="mt-1 sm:mt-2 text-[9px] sm:text-[10px] text-orange-300 font-mono truncate font-semibold">
              {isNoSmokerSelected ? 'No smoker active' : fuelTelemetry.telemetryStatusBadge}
            </div>
          </div>

          {/* Metric 4: Maintenance Status & Health Score */}
          {(() => {
            const healthData = calculateSmokerHealthScore(profile);
            return (
              <div
                onClick={() => onOpenSettings?.('smokers')}
                className="bg-[#242424] border border-[#2a2a2a] rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-sm hover:border-orange-500/40 transition-all flex flex-col justify-between min-h-[95px] sm:min-h-[110px] cursor-pointer"
                title={`Smoker Health Score: ${healthData.healthScore}% (Maintenance: ${healthData.maintenanceScore}%, Stability: ${healthData.stabilityScore}%, Efficiency: ${healthData.efficiencyScore}%)`}
              >
                <div>
                  <div className="flex items-center justify-between text-zinc-400 mb-1 sm:mb-2">
                    <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-400 truncate">Smoker Health</span>
                    {isNoSmokerSelected ? (
                      <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0 ml-1" />
                    ) : dueMaintenanceCount > 0 ? (
                      <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400 shrink-0 ml-1" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0 ml-1" />
                    )}
                  </div>
                  <div className="flex items-baseline space-x-1">
                    <span
                      className={`text-xl sm:text-2xl md:text-3xl font-extrabold font-mono truncate ${
                        isNoSmokerSelected
                          ? 'text-zinc-500'
                          : healthData.healthScore >= 85
                          ? 'text-emerald-400'
                          : healthData.healthScore >= 70
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {isNoSmokerSelected ? '--' : `${healthData.healthScore}%`}
                    </span>
                  </div>
                </div>
                <div className="mt-1 sm:mt-2 text-[10px] sm:text-[11px] font-mono truncate flex items-center justify-between">
                  <span className={dueMaintenanceCount > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                    {dueMaintenanceCount > 0 ? `${dueMaintenanceCount} Service Due` : '100% Care Sync'}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

      </div>
    </div>
  );
};

