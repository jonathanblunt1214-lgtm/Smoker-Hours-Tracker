import React, { useState } from 'react';
import { SmokerProfile, CookLog, FuelLog } from '../types';
import { Clock, Flame, ShieldCheck, Scale, AlertTriangle, Wrench, ChevronDown, ChevronUp } from 'lucide-react';

interface SmokerOverviewBannerProps {
  profile: SmokerProfile;
  cookLogs: CookLog[];
  fuelLogs: FuelLog[];
  onQuickLogClick: () => void;
  onUpdateProfile?: (updatedProfile: SmokerProfile) => void;
  onOpenSettings?: (tab?: 'appearance' | 'alerts' | 'cloud' | 'data' | 'smokers') => void;
  onOpenCharGPT?: (prompt?: string) => void;
  onOpenAlexaPush?: () => void;
}

export const SmokerOverviewBanner: React.FC<SmokerOverviewBannerProps> = ({
  profile,
  cookLogs,
  fuelLogs,
  onQuickLogClick,
  onUpdateProfile,
  onOpenSettings,
  onOpenCharGPT,
  onOpenAlexaPush,
}) => {
  const [showMobileMetrics, setShowMobileMetrics] = useState<boolean>(false);

  // Calculate total hours logged across all cooks & cross-reference latest ending smoker hours
  const totalHoursLogged = cookLogs.reduce((acc, curr) => acc + (curr.hoursLogged || 0), 0);
  const maxCookHours = cookLogs.length > 0 ? Math.max(...cookLogs.map((c) => c.endingSmokerHours || 0)) : 0;
  const displayedHoursToDate = Math.max(profile.currentHours || 0, maxCookHours);

  const totalFuelLbs = cookLogs.reduce((acc, curr) => acc + (curr.fuelLbsConsumed || 0), 0);
  const avgBurnRate = totalHoursLogged > 0 ? (totalFuelLbs / totalHoursLogged).toFixed(2) : '1.20';

  // Calculate maintenance warning
  const dueMaintenanceCount = profile.maintenanceTasks.filter(
    (t) => profile.currentHours - t.lastPerformedHours >= t.intervalHours
  ).length;

  const totalFuelInventoryLbs = fuelLogs.reduce((acc, curr) => acc + curr.quantityLbs, 0);
  const rawFuelOnHand = profile.fuelOnHand !== undefined ? profile.fuelOnHand : `${totalFuelInventoryLbs} lbs`;
  // Ensure fuel on hand always has 'lbs' measurement suffix
  const currentFuelOnHand = rawFuelOnHand.toLowerCase().includes('lbs') 
    ? rawFuelOnHand 
    : `${rawFuelOnHand.trim()} lbs`;

  const handleFuelOnHandChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (onUpdateProfile) {
      onUpdateProfile({
        ...profile,
        fuelOnHand: val,
      });
    }
  };

  const handleFuelOnHandBlur = () => {
    if (!onUpdateProfile) return;
    let val = currentFuelOnHand.trim();
    if (!val) {
      val = '0 lbs';
    } else if (!val.toLowerCase().includes('lbs')) {
      val = `${val} lbs`;
    }
    onUpdateProfile({
      ...profile,
      fuelOnHand: val,
    });
  };

  return (
    <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] text-[#e0e0e0] py-3.5 sm:py-5 px-3 sm:px-6 md:px-8 shadow-md flex flex-col justify-center w-full overflow-x-hidden">
      <div className="w-full max-w-[96vw] sm:max-w-[94vw] lg:max-w-[92vw] xl:max-w-7xl mx-auto my-auto flex flex-col justify-center space-y-3.5 sm:space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 w-full my-auto">
          
          {/* Main Title & Equipment tag */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-xs">
              <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 shrink-0">
                <Flame className="w-3.5 h-3.5 mr-1 text-orange-500" />
                Active Smoker Logbook
              </span>
              <span className="text-[11px] sm:text-xs text-zinc-400 font-mono truncate max-w-full">
                {profile.model || 'Smoker Pit'} • <span className="text-orange-400 font-semibold">{profile.smokerType || 'Vertical Pellet Smoker'}</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white mt-1.5 sm:mt-2 leading-snug sm:leading-tight">
              Smoker Hours & Daily Consumption
            </h1>
            <p className="text-[11px] sm:text-xs md:text-sm text-zinc-400 mt-1 sm:mt-1.5 max-w-3xl leading-snug sm:leading-relaxed">
              Real-time monitoring of operating runtime hours, daily pellet fuel usage, cook log archives, thermal stall analytics, and pit maintenance.
            </p>
          </div>

          {/* Action button & Mobile Stats Toggle */}
          <div className="flex items-center space-x-2 shrink-0 w-full md:w-auto">
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

        {/* 4 Metric Cards Grid - Optimized for Mobile 2-column layout */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 w-full ${showMobileMetrics ? 'grid' : 'hidden md:grid'}`}>
          
          {/* Metric 1: Hours to Date */}
          <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-sm hover:border-orange-500/40 transition-all flex flex-col justify-between min-h-[95px] sm:min-h-[110px]">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-1 sm:mb-2">
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-400 truncate">Hours to Date</span>
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400 shrink-0 ml-1" />
              </div>
              <div className="flex items-baseline space-x-1">
                <span className="text-xl sm:text-2xl md:text-3xl font-extrabold font-mono text-orange-400">
                  {displayedHoursToDate.toFixed(2)}
                </span>
                <span className="text-[10px] sm:text-xs text-zinc-400 font-sans">hrs</span>
              </div>
            </div>
            <div className="mt-1 sm:mt-2 flex flex-wrap items-center text-[10px] sm:text-[11px] text-zinc-400">
              <span className="text-emerald-400 font-medium">+{totalHoursLogged.toFixed(1)} hrs</span>
              <span className="hidden xs:inline mx-1">•</span>
              <span className="truncate">Base {profile.initialHours}h</span>
            </div>
          </div>

          {/* Metric 2: Burn Rate Efficiency */}
          <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-sm hover:border-orange-500/40 transition-all flex flex-col justify-between min-h-[95px] sm:min-h-[110px]">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-1 sm:mb-2">
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-400 truncate">Burn Efficiency</span>
                <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0 ml-1" />
              </div>
              <div className="flex items-baseline space-x-1">
                <span className="text-xl sm:text-2xl md:text-3xl font-extrabold font-mono text-white">
                  {avgBurnRate}
                </span>
                <span className="text-[10px] sm:text-xs text-zinc-400 font-sans">lbs/hr</span>
              </div>
            </div>
            <div className="mt-1 sm:mt-2 text-[10px] sm:text-[11px] text-zinc-400 truncate">
              Total {totalFuelLbs.toFixed(1)} lbs burned
            </div>
          </div>

          {/* Metric 3: Fuel Inventory / Fuel On Hand Text Input Field */}
          <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-sm hover:border-orange-500/40 transition-all flex flex-col justify-between min-h-[95px] sm:min-h-[110px]">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-400 truncate">Fuel On Hand</span>
                <div className="flex items-center space-x-1 shrink-0">
                  <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
                </div>
              </div>
              <div className="relative mt-1">
                <input
                  type="text"
                  placeholder="e.g. 120 lbs"
                  value={currentFuelOnHand}
                  onChange={handleFuelOnHandChange}
                  onBlur={handleFuelOnHandBlur}
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-mono font-bold text-xs sm:text-base rounded-lg sm:rounded-xl pl-2.5 pr-8 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <span className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] sm:text-xs font-bold text-orange-400 pointer-events-none">
                  lbs
                </span>
              </div>
            </div>
            <div className="mt-1 sm:mt-2 text-[9px] sm:text-[10px] text-zinc-400 flex items-center justify-between">
              <span className="truncate">Pounds (lbs)</span>
              <span className="font-mono text-orange-400 font-medium shrink-0">Synced</span>
            </div>
          </div>

          {/* Metric 4: Maintenance Status */}
          <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-sm hover:border-orange-500/40 transition-all flex flex-col justify-between min-h-[95px] sm:min-h-[110px]">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-1 sm:mb-2">
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-400 truncate">Smoker Care</span>
                {dueMaintenanceCount > 0 ? (
                  <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400 shrink-0 ml-1" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0 ml-1" />
                )}
              </div>
              <div className="flex items-baseline space-x-1">
                <span
                  className={`text-sm sm:text-lg md:text-xl font-bold truncate ${
                    dueMaintenanceCount > 0 ? 'text-orange-400' : 'text-cyan-300'
                  }`}
                >
                  {dueMaintenanceCount > 0 ? `${dueMaintenanceCount} Service Due` : 'Optimal'}
                </span>
              </div>
            </div>
            <div className="mt-1 sm:mt-2 text-[10px] sm:text-[11px] text-zinc-400 truncate">
              {dueMaintenanceCount > 0 ? 'Ash vacuum due' : 'Firepot clean'}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
