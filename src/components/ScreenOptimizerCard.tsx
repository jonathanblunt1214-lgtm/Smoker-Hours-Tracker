import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Smartphone,
  Tablet,
  Tv,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Check,
  Maximize2,
  RotateCw,
  Gauge,
  Sparkles,
  Zap,
  HardDrive,
  Cpu,
  Layers,
} from 'lucide-react';
import {
  getDetectedScreenMetrics,
  loadSavedScreenOptimizerConfig,
  applyConfirmedScreenOptimization,
  getFullHardwareProfile,
  applyHardwareAndWorkloadOptimization,
  detectCpuHardware,
  detectGpuHardware,
  detectRamHardware,
  computeWorkloadDistribution,
  saveHardwareProfile,
  ScreenOptimizerConfig,
  DetectedScreenMetrics,
  FullHardwareProfile,
} from '../utils/screenOptimizer';
import {
  getStorageStats,
  compactAndOptimizeStorage,
  getAutoClearInterval,
  setAutoClearInterval,
  executeCacheClear,
  getNextAutoClearDateFormatted,
  AutoClearIntervalOption,
  StorageStats,
} from '../utils/storage';

interface ScreenOptimizerCardProps {
  onShowToast?: (msg: string) => void;
  compact?: boolean;
}

export const ScreenOptimizerCard: React.FC<ScreenOptimizerCardProps> = ({
  onShowToast,
  compact = false,
}) => {
  const [metrics, setMetrics] = useState<DetectedScreenMetrics>(() => getDetectedScreenMetrics());
  const [config, setConfig] = useState<ScreenOptimizerConfig>(() => loadSavedScreenOptimizerConfig());
  const [selectedPresetWidth, setSelectedPresetWidth] = useState<number>(config.confirmedWidth);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(!config.isConfirmed);

  // Browser Storage & RAM Optimization State
  const [storageStats, setStorageStats] = useState<StorageStats>(() => getStorageStats());
  const [autoClearInterval, setAutoClearIntervalState] = useState<AutoClearIntervalOption>(() => getAutoClearInterval());
  const [nextAutoClearDate, setNextAutoClearDate] = useState<string>(() => getNextAutoClearDateFormatted());
  const [compactStatus, setCompactStatus] = useState<string | null>(null);

  // Active view tab inside optimizer card
  const [activeOptimizerTab, setActiveOptimizerTab] = useState<'screen' | 'storage' | 'hardware'>('screen');

  // CPU, GPU & Hardware Workload Profile State
  const [hardwareProfile, setHardwareProfile] = useState<FullHardwareProfile>(() => getFullHardwareProfile());
  const [isBenchmarking, setIsBenchmarking] = useState<boolean>(false);

  const handleRunHardwareBenchmark = () => {
    setIsBenchmarking(true);
    setTimeout(() => {
      const freshCpu = detectCpuHardware();
      const freshGpu = detectGpuHardware();
      const freshRam = detectRamHardware();
      const freshWorkload = computeWorkloadDistribution(freshCpu, freshGpu, freshRam);

      const updatedProfile: FullHardwareProfile = {
        cpu: freshCpu,
        gpu: freshGpu,
        ram: freshRam,
        workload: freshWorkload,
        benchmarkedAt: new Date().toISOString(),
      };

      saveHardwareProfile(updatedProfile);
      applyHardwareAndWorkloadOptimization();
      setHardwareProfile(updatedProfile);
      setIsBenchmarking(false);

      const msg = `⚡ Hardware benchmark complete! Optimized workload distribution across ${freshCpu.logicalCores}-core CPU, ${freshGpu.hasHardwareGpu ? 'GPU (' + freshGpu.gpuName + ')' : 'Software Canvas'}, & ${freshRam.capacityGb}GB RAM.`;
      if (onShowToast) onShowToast(msg);
    }, 600);
  };

  // Re-detect screen width on resize or orientation change
  const handleRedetect = () => {
    const current = getDetectedScreenMetrics();
    setMetrics(current);
    setSelectedPresetWidth(current.width);
    setConfig((prev) => ({
      ...prev,
      confirmedWidth: current.width,
      confirmedHeight: current.height,
      deviceCategory: current.category,
      uiScale: current.recommendedScale,
      touchTargetMinPx: current.recommendedTouchTarget,
    }));
    setHasUnsavedChanges(true);
    if (onShowToast) {
      onShowToast(`🔍 Re-detected screen width: ${current.width}px (${current.category.toUpperCase()})`);
    }
  };

  useEffect(() => {
    const current = getDetectedScreenMetrics();
    setMetrics(current);
    setSelectedPresetWidth(current.width);
    setConfig((prev) => ({
      ...prev,
      confirmedWidth: current.width,
      confirmedHeight: current.height,
      deviceCategory: current.category,
      uiScale: current.recommendedScale,
      touchTargetMinPx: current.recommendedTouchTarget,
    }));

    const handleResize = () => {
      const live = getDetectedScreenMetrics();
      setMetrics(live);
      setSelectedPresetWidth(live.width);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleConfirmAndOptimize = () => {
    const updatedConfig: ScreenOptimizerConfig = {
      ...config,
      confirmedWidth: selectedPresetWidth,
      isConfirmed: true,
      autoConfirmedAt: new Date().toISOString(),
    };

    setConfig(updatedConfig);
    applyConfirmedScreenOptimization(updatedConfig);
    setHasUnsavedChanges(false);

    const msg = `✨ Screen width ${selectedPresetWidth}px confirmed! Applied device-specific CSS layout & typography scaling.`;
    if (onShowToast) {
      onShowToast(msg);
    }
  };

  const handleAutoClearIntervalChange = (opt: AutoClearIntervalOption) => {
    setAutoClearInterval(opt);
    setAutoClearIntervalState(opt);
    setNextAutoClearDate(getNextAutoClearDateFormatted());
    if (onShowToast) {
      onShowToast(`Updated auto-clear interval to ${opt.replace('_', ' ')}`);
    }
  };

  const PRESET_DEVICE_WIDTHS = [
    { label: 'Compact Mobile', width: 375, icon: Smartphone, type: 'mobile' },
    { label: 'Standard Mobile', width: 412, icon: Smartphone, type: 'mobile' },
    { label: 'Tablet Portrait', width: 768, icon: Tablet, type: 'tablet' },
    { label: 'Tablet Landscape', width: 1024, icon: Tablet, type: 'tablet' },
    { label: 'Laptop / PC', width: 1280, icon: Monitor, type: 'desktop' },
    { label: 'Desktop Monitor', width: 1440, icon: Monitor, type: 'desktop' },
    { label: '4K Ultra-Wide', width: 1920, icon: Tv, type: 'ultrawide' },
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'mobile':
        return <Smartphone className="w-4 h-4 text-orange-400" />;
      case 'tablet':
        return <Tablet className="w-4 h-4 text-amber-400" />;
      case 'ultrawide':
        return <Tv className="w-4 h-4 text-purple-400" />;
      default:
        return <Monitor className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="bg-[#1e1e24] border border-[#2e2e38] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl text-zinc-200">
      {/* Header Banner & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#2e2e38] gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-orange-500/20 to-emerald-500/20 border border-orange-500/30 text-orange-400 shrink-0">
            <Maximize2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center space-x-2">
              <span>Automated Screen, CSS & Storage/RAM Optimizer</span>
              {config.isConfirmed && !hasUnsavedChanges && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold flex items-center space-x-1">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>OPTIMIZED</span>
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Calibrate responsive layout grid, touch targets, and local browser memory/RAM caching.
            </p>
          </div>
        </div>

        {/* Sub-Tabs for Optimizer */}
        <div className="flex items-center bg-[#121218] p-1 rounded-xl border border-[#2e2e38]">
          <button
            type="button"
            onClick={() => setActiveOptimizerTab('screen')}
            className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeOptimizerTab === 'screen'
                ? 'bg-orange-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Screen & CSS</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveOptimizerTab('storage')}
            className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeOptimizerTab === 'storage'
                ? 'bg-emerald-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Storage & RAM</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveOptimizerTab('hardware')}
            className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeOptimizerTab === 'hardware'
                ? 'bg-cyan-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>CPU, GPU & Workloads</span>
          </button>
        </div>
      </div>

      {activeOptimizerTab === 'screen' ? (
        <>
          {/* DETECTED METRICS BOX */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#141418] p-3 rounded-xl border border-[#282834]">
            <div className="space-y-0.5">
              <div className="text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-wider">Measured Width</div>
              <div className="text-base font-black text-orange-400 font-mono">{metrics.width}px</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-wider">Measured Height</div>
              <div className="text-base font-black text-zinc-200 font-mono">{metrics.height}px</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-wider">Device Type</div>
              <div className="text-xs font-extrabold text-white capitalize flex items-center space-x-1.5 mt-1">
                {getCategoryIcon(metrics.category)}
                <span>{metrics.category}</span>
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-wider">Pixel Density</div>
              <div className="text-xs font-extrabold text-zinc-300 font-mono mt-1">{metrics.pixelRatio}x Retina</div>
            </div>
          </div>

          {/* CONFIRMATION STEP: SELECT OR OVERRIDE SCREEN WIDTH */}
          <div className="space-y-2.5 bg-[#17171c] p-3.5 rounded-xl border border-[#2a2a34]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-zinc-100 flex items-center space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-zinc-950 font-black text-[11px] flex items-center justify-center">1</span>
                <span>Confirm Screen Width for CSS Calibration</span>
              </label>
              <span className="text-xs font-mono font-black text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/20">
                Target Width: {selectedPresetWidth}px
              </span>
            </div>

            {/* Quick Device Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
              {PRESET_DEVICE_WIDTHS.map((preset) => {
                const IconComponent = preset.icon;
                const isSelected = selectedPresetWidth === preset.width;
                return (
                  <button
                    key={preset.width}
                    type="button"
                    onClick={() => {
                      setSelectedPresetWidth(preset.width);
                      setHasUnsavedChanges(true);
                    }}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-orange-500 text-white shadow-md'
                        : 'bg-[#202028] hover:bg-[#282834] border-[#2e2e3a] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <IconComponent className={`w-3.5 h-3.5 ${isSelected ? 'text-orange-400' : 'text-zinc-400'}`} />
                      {preset.width === metrics.width && (
                        <span className="text-[9px] bg-orange-500/30 text-orange-300 font-mono px-1 rounded font-bold">
                          Detected
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5">
                      <div className="text-[11px] font-bold leading-tight truncate">{preset.label}</div>
                      <div className="text-[10px] font-mono text-zinc-400 font-bold">{preset.width}px</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Manual Fine-Tune Range Slider */}
            <div className="pt-2 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                <span>320px (Mobile Small)</span>
                <span>Fine-Tune Slider</span>
                <span>2560px (Ultra-Wide)</span>
              </div>
              <input
                type="range"
                min="320"
                max="2560"
                step="8"
                value={selectedPresetWidth}
                onChange={(e) => {
                  setSelectedPresetWidth(Number(e.target.value));
                  setHasUnsavedChanges(true);
                }}
                className="w-full accent-orange-500 cursor-pointer h-2 bg-[#282834] rounded-lg"
              />
            </div>
          </div>

          {/* OPTIMIZER CONTROLS: UI DENSITY & TOUCH TARGETS */}
          {!compact && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#17171c] p-3.5 rounded-xl border border-[#2a2a34]">
              {/* UI Scale Factor */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                  <span>UI Scale & Typography Factor</span>
                  <span className="font-mono text-orange-400 font-black">{Math.round((config.uiScale || 1.0) * 100)}%</span>
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { label: '90% Compact', scale: 0.9 },
                    { label: '100% Normal', scale: 1.0 },
                    { label: '110% Enlarged', scale: 1.1 },
                  ].map((s) => (
                    <button
                      key={s.scale}
                      type="button"
                      onClick={() => {
                        setConfig((prev) => ({ ...prev, uiScale: s.scale }));
                        setHasUnsavedChanges(true);
                      }}
                      className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer text-center ${
                        config.uiScale === s.scale
                          ? 'bg-orange-500 text-zinc-950 border-orange-400 shadow-sm'
                          : 'bg-[#202028] hover:bg-[#2a2a34] border-[#2e2e38] text-zinc-300'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Touch Target Minimum Size */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                  <span>Min Touch Target Button Height</span>
                  <span className="font-mono text-orange-400 font-black">{config.touchTargetMinPx || 44}px</span>
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { label: '36px Compact', px: 36 },
                    { label: '44px Mobile', px: 44 },
                    { label: '48px Large', px: 48 },
                  ].map((t) => (
                    <button
                      key={t.px}
                      type="button"
                      onClick={() => {
                        setConfig((prev) => ({ ...prev, touchTargetMinPx: t.px }));
                        setHasUnsavedChanges(true);
                      }}
                      className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer text-center ${
                        config.touchTargetMinPx === t.px
                          ? 'bg-orange-500 text-zinc-950 border-orange-400 shadow-sm'
                          : 'bg-[#202028] hover:bg-[#2a2a34] border-[#2e2e38] text-zinc-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CONFIRMATION & APPLY ACTION BUTTON */}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleRedetect}
              className="px-3 py-2 bg-[#262630] hover:bg-[#323240] border border-[#383848] text-xs font-bold text-zinc-300 hover:text-white rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
              title="Re-detect live window width"
            >
              <RotateCw className="w-3.5 h-3.5 text-orange-400" />
              <span>Re-detect Width</span>
            </button>

            <button
              type="button"
              onClick={handleConfirmAndOptimize}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 hover:from-orange-400 hover:to-yellow-400 text-zinc-950 font-black text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-lg shadow-orange-950/50 flex items-center space-x-2 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4 fill-zinc-950 text-amber-400" />
              <span>Confirm Screen Width & Apply CSS</span>
            </button>
          </div>
        </>
      ) : activeOptimizerTab === 'storage' ? (
        /* TAB 2: BROWSER STORAGE & RAM OPTIMIZATION */
        <div className="space-y-3.5 bg-gradient-to-r from-emerald-950/20 via-[#16161e] to-teal-950/20 border border-emerald-500/30 rounded-xl p-3.5 shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-[#2e2e38]">
            <div className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-white">Browser Storage, Auto-Defrag & RAM Optimizer</h4>
                <p className="text-[11px] text-zinc-400">70 MB Allocated Storage Space for Smoke Stack with 30-Day Auto-Defragmentation</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
              {storageStats.usedFormatted} / 70.0 MB ({storageStats.percentUsed}%)
            </span>
          </div>

          {/* Meter Bar */}
          <div className="space-y-1">
            <div className="w-full h-2 bg-[#121212] rounded-full overflow-hidden border border-[#2a2a2a]">
              <div
                className={`h-full transition-all duration-500 ${
                  storageStats.percentUsed > 80
                    ? 'bg-red-500'
                    : storageStats.percentUsed > 50
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(2, storageStats.percentUsed)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-zinc-400">
              <span>Smoke Stack Used: {storageStats.usedFormatted}</span>
              <span>Allocated Space: 70.0 MB</span>
            </div>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            {storageStats.breakdown.map((item) => (
              <div key={item.key} className="p-2 bg-[#121218] rounded-lg border border-[#2a2a34] flex items-center justify-between">
                <span className="text-zinc-300 truncate font-semibold mr-2">{item.label}</span>
                <span className="text-emerald-400 font-mono font-bold shrink-0">{item.formatted}</span>
              </div>
            ))}
          </div>

          {compactStatus && (
            <div className="text-[11px] p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg flex items-center space-x-1.5 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{compactStatus}</span>
            </div>
          )}

          {/* Auto-Defragmentation Selector & Schedule */}
          <div className="pt-2 border-t border-[#2e2e38] space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h5 className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <span>Auto-Defragmentation Schedule</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded font-bold">
                    30-Day Cycle
                  </span>
                </h5>
                <p className="text-[10px] text-zinc-400">
                  Automatically defragments and compacts storage every 30 days within the allocated 70 MB Smoke Stack space. Preserves all cook logs & settings.
                </p>
              </div>
              <select
                value={autoClearInterval}
                onChange={(e) => handleAutoClearIntervalChange(e.target.value as AutoClearIntervalOption)}
                className="bg-[#121218] border border-[#2a2a38] text-xs font-bold text-emerald-400 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shrink-0"
              >
                <option value="30_days">Every 30 Days (Recommended Auto-Defrag)</option>
                <option value="7_days">Every 7 Days</option>
                <option value="90_days">Every 90 Days</option>
                <option value="never">Disabled (Never)</option>
              </select>
            </div>

            <div className="p-2 bg-[#121218] rounded-lg border border-[#2a2a34] flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-400">Next Scheduled Defragmentation:</span>
              <span className="text-emerald-400 font-bold">{nextAutoClearDate}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const res = executeCacheClear();
                  setStorageStats(getStorageStats());
                  setCompactStatus(res.message);
                  setNextAutoClearDate(getNextAutoClearDateFormatted());
                  setTimeout(() => setCompactStatus(null), 4000);
                  if (onShowToast) onShowToast(res.message);
                }}
                className="py-2 px-3 bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Defragment 70 MB Storage & Purge Cache</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const res = compactAndOptimizeStorage();
                  setStorageStats(getStorageStats());
                  const msg = `Storage defragmented! Reclaimed ${res.freedFormatted} within allocated 70 MB space while preserving 100% of cook logs.`;
                  setCompactStatus(msg);
                  setTimeout(() => setCompactStatus(null), 4000);
                  if (onShowToast) onShowToast(msg);
                }}
                className="py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>1-Click Storage & Log Compression</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 3: CPU, GPU & HARDWARE WORKLOAD DISTRIBUTOR */
        <div className="space-y-3.5 bg-gradient-to-r from-cyan-950/20 via-[#16161e] to-blue-950/20 border border-cyan-500/30 rounded-xl p-3.5 shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-[#2e2e38]">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-white">CPU, GPU & Hardware Workload Distributor</h4>
                <p className="text-[11px] text-zinc-400">Detects hardware and dynamically routes tasks across CPU, GPU, and RAM</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md uppercase">
              {hardwareProfile.workload.recommendedMode.replace('_', ' ')} MODE
            </span>
          </div>

          {/* HARDWARE DETECTION CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* CPU CARD */}
            <div className="bg-[#121218] border border-[#2a2a38] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-[#242432] pb-1.5">
                <div className="flex items-center space-x-1.5 text-cyan-400 font-extrabold text-xs">
                  <Cpu className="w-3.5 h-3.5 shrink-0" />
                  <span>CPU Detection</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded uppercase">
                  {hardwareProfile.cpu.cpuTier} Tier
                </span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between font-mono">
                  <span className="text-zinc-400">Logical Cores:</span>
                  <span className="text-white font-bold">{hardwareProfile.cpu.logicalCores} Cores</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-zinc-400">Architecture:</span>
                  <span className="text-cyan-300 font-bold truncate max-w-[120px]">{hardwareProfile.cpu.architecture}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-zinc-400">FLOPS Benchmark:</span>
                  <span className="text-emerald-400 font-bold">{hardwareProfile.cpu.opsPerSecFormatted}</span>
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 leading-tight pt-1 border-t border-[#22222e]">
                {hardwareProfile.cpu.optimizationStrategy}
              </p>
            </div>

            {/* GPU CARD */}
            <div className="bg-[#121218] border border-[#2a2a38] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-[#242432] pb-1.5">
                <div className="flex items-center space-x-1.5 text-blue-400 font-extrabold text-xs">
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                  <span>GPU Acceleration</span>
                </div>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                  hardwareProfile.gpu.hasHardwareGpu ? 'text-emerald-300 bg-emerald-500/10' : 'text-amber-300 bg-amber-500/10'
                }`}>
                  {hardwareProfile.gpu.gpuTier}
                </span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between font-mono">
                  <span className="text-zinc-400">Hardware Renderer:</span>
                  <span className="text-white font-bold truncate max-w-[120px]" title={hardwareProfile.gpu.gpuName}>{hardwareProfile.gpu.gpuName}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-zinc-400">Max Texture Size:</span>
                  <span className="text-blue-300 font-bold">{hardwareProfile.gpu.maxTextureSize}px</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-zinc-400">Status:</span>
                  <span className={hardwareProfile.gpu.hasHardwareGpu ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {hardwareProfile.gpu.hasHardwareGpu ? '⚡ Active' : 'Software Fallback'}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 leading-tight pt-1 border-t border-[#22222e]">
                {hardwareProfile.gpu.optimizationStrategy}
              </p>
            </div>

            {/* RAM CARD */}
            <div className="bg-[#121218] border border-[#2a2a38] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-[#242432] pb-1.5">
                <div className="flex items-center space-x-1.5 text-teal-400 font-extrabold text-xs">
                  <HardDrive className="w-3.5 h-3.5 shrink-0" />
                  <span>RAM & Caching</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-teal-300 bg-teal-500/10 px-1.5 py-0.5 rounded uppercase">
                  {hardwareProfile.ram.ramTier} Tier
                </span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between font-mono">
                  <span className="text-zinc-400">System Memory:</span>
                  <span className="text-white font-bold">{hardwareProfile.ram.capacityGb} GB RAM</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-zinc-400">Max Telemetry Cache:</span>
                  <span className="text-teal-300 font-bold">{hardwareProfile.ram.maxCacheAllocMb} MB</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-zinc-400">Memory Recycling:</span>
                  <span className="text-emerald-400 font-bold">LRU Active</span>
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 leading-tight pt-1 border-t border-[#22222e]">
                {hardwareProfile.ram.optimizationStrategy}
              </p>
            </div>
          </div>

          {/* WORKLOAD DISTRIBUTION MATRIX */}
          <div className="bg-[#121218] border border-[#2a2a38] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-[#242432]">
              <h5 className="text-xs font-bold text-white flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Workload Distribution Matrix (CPU ⚡ GPU ⚡ RAM)</span>
              </h5>
              <span className="text-[10px] font-mono text-zinc-400">Auto-Balanced</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-[11px]">
              {/* CPU TASKS */}
              <div className="bg-[#161622] p-2.5 rounded-lg border border-cyan-500/20 space-y-1.5">
                <div className="text-[10px] font-mono font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  <span>CPU Tasks ({hardwareProfile.cpu.logicalCores} Cores)</span>
                </div>
                <ul className="space-y-1 text-[10px] text-zinc-300">
                  {hardwareProfile.workload.cpuTasks.map((task, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-cyan-400">•</span>
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* GPU TASKS */}
              <div className="bg-[#161622] p-2.5 rounded-lg border border-blue-500/20 space-y-1.5">
                <div className="text-[10px] font-mono font-black text-blue-400 uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  <span>GPU Tasks ({hardwareProfile.gpu.hasHardwareGpu ? 'Hardware' : 'Software'})</span>
                </div>
                <ul className="space-y-1 text-[10px] text-zinc-300">
                  {hardwareProfile.workload.gpuTasks.map((task, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-blue-400">•</span>
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* RAM TASKS */}
              <div className="bg-[#161622] p-2.5 rounded-lg border border-teal-500/20 space-y-1.5">
                <div className="text-[10px] font-mono font-black text-teal-400 uppercase tracking-wider flex items-center gap-1">
                  <HardDrive className="w-3-3" />
                  <span>RAM Memory Tasks ({hardwareProfile.ram.capacityGb}GB)</span>
                </div>
                <ul className="space-y-1 text-[10px] text-zinc-300">
                  {hardwareProfile.workload.ramTasks.map((task, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-teal-400">•</span>
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* BENCHMARK & RE-BALANCE ACTION BUTTON */}
          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="text-[10px] text-zinc-400 font-mono">
              Last benchmarked: {new Date(hardwareProfile.benchmarkedAt).toLocaleTimeString()}
            </span>

            <button
              type="button"
              onClick={handleRunHardwareBenchmark}
              disabled={isBenchmarking}
              className="py-2.5 px-4 bg-gradient-to-r from-cyan-500 via-blue-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-zinc-950 font-black text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-cyan-950/50 flex items-center space-x-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBenchmarking ? 'animate-spin' : ''}`} />
              <span>{isBenchmarking ? 'Testing CPU & GPU Performance...' : 'Run Hardware Benchmark & Re-Balance Workload'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

