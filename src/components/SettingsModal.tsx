import React, { useState } from 'react';
import {
  Settings,
  X,
  Thermometer,
  Bluetooth,
  Cloud,
  RefreshCw,
  Check,
  ShieldCheck,
  ChevronRight,
  Wifi,
  WifiOff,
  Eye,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Sliders,
  Bell,
  HardDrive,
  Database,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tempUnit: 'F' | 'C';
  onToggleTempUnit: () => void;
  themeMode: 'dark' | 'light';
  onToggleThemeMode: () => void;
  isColorblind: boolean;
  onToggleColorblind: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  forceOffline: boolean;
  onToggleForceOffline: () => void;
  autoSyncDrive: boolean;
  onToggleAutoSync: () => void;
  onOpenBluetoothModal: () => void;
  onOpenDriveModal: () => void;
  isDriveConnected?: boolean;
  driveUserEmail?: string | null;
  onResetData: () => void;
  isOnline?: boolean;
}

const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: () => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
      checked ? 'bg-orange-500' : 'bg-zinc-700'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  tempUnit,
  onToggleTempUnit,
  themeMode,
  onToggleThemeMode,
  isColorblind,
  onToggleColorblind,
  soundEnabled,
  onToggleSound,
  forceOffline,
  onToggleForceOffline,
  autoSyncDrive,
  onToggleAutoSync,
  onOpenBluetoothModal,
  onOpenDriveModal,
  isDriveConnected = false,
  driveUserEmail,
  onResetData,
  isOnline = true,
}) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'alerts' | 'cloud' | 'data'>('appearance');

  if (!isOpen) return null;

  const effectiveOnline = isOnline && !forceOffline;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 text-zinc-200 overflow-y-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#2a2a2a]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Settings</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Customize display, theme, probes & cloud sync</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg bg-[#242424] hover:bg-[#2a2a2a] transition-colors cursor-pointer"
            title="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categorized De-cluttered Navigation Tabs */}
        <div className="flex bg-[#121212] p-1 rounded-xl border border-[#2a2a2a] gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'appearance'
                ? 'bg-orange-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Appearance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'alerts'
                ? 'bg-orange-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alerts & Field</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'cloud'
                ? 'bg-orange-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Cloud & Probes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'data'
                ? 'bg-orange-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Data</span>
          </button>
        </div>

        {/* TAB 1: APPEARANCE */}
        {activeTab === 'appearance' && (
          <div className="space-y-3 animate-fade-in">
            {/* Setting: Theme Mode Toggle */}
            <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 pr-3">
                {themeMode === 'dark' ? (
                  <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">App Theme</h4>
                  <p className="text-[11px] text-zinc-400">Switch between Dark and Light background modes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleThemeMode}
                className="py-1 px-2.5 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] rounded-lg text-xs font-bold text-orange-400 flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                {themeMode === 'dark' ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
                <span className="capitalize">{themeMode} Mode</span>
              </button>
            </div>

            {/* Setting: Temperature Display Unit */}
            <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Thermometer className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">Temperature Unit</h4>
                    <p className="text-[11px] text-zinc-400">Display unit across charts, logs & guides</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md">
                  °{tempUnit}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (tempUnit !== 'F') onToggleTempUnit();
                  }}
                  className={`py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer border ${
                    tempUnit === 'F'
                      ? 'bg-orange-500/20 border-orange-500/40 text-orange-400 shadow-sm'
                      : 'bg-[#1a1a1a] border-[#2a2a2a] text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-mono font-extrabold">°F</span>
                  <span>Fahrenheit</span>
                  {tempUnit === 'F' && <Check className="w-3.5 h-3.5 ml-1 text-orange-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (tempUnit !== 'C') onToggleTempUnit();
                  }}
                  className={`py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer border ${
                    tempUnit === 'C'
                      ? 'bg-orange-500/20 border-orange-500/40 text-orange-400 shadow-sm'
                      : 'bg-[#1a1a1a] border-[#2a2a2a] text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-mono font-extrabold">°C</span>
                  <span>Celsius</span>
                  {tempUnit === 'C' && <Check className="w-3.5 h-3.5 ml-1 text-orange-400" />}
                </button>
              </div>
            </div>

            {/* Setting: Colorblind & High Contrast Mode */}
            <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 pr-3">
                <Eye className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Colorblind Accessibility</h4>
                  <p className="text-[11px] text-zinc-400">High contrast badges and colorblind-safe markers</p>
                </div>
              </div>
              <ToggleSwitch
                checked={isColorblind}
                onChange={onToggleColorblind}
                label="Toggle Colorblind Mode"
              />
            </div>
          </div>
        )}

        {/* TAB 2: ALERTS & FIELD */}
        {activeTab === 'alerts' && (
          <div className="space-y-3 animate-fade-in">
            {/* Setting: Sound Alerts */}
            <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 pr-3">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <VolumeX className="w-4 h-4 text-zinc-500 shrink-0" />
                )}
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Audio & Alarm Chimes</h4>
                  <p className="text-[11px] text-zinc-400">Play audio signals when probe hits target temp</p>
                </div>
              </div>
              <ToggleSwitch
                checked={soundEnabled}
                onChange={onToggleSound}
                label="Toggle Audio Alerts"
              />
            </div>

            {/* Setting: Force Offline Mode */}
            <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 pr-3">
                {effectiveOnline ? (
                  <Wifi className="w-4 h-4 text-sky-400 shrink-0" />
                ) : (
                  <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Field Offline Override</h4>
                  <p className="text-[11px] text-zinc-400">
                    {forceOffline
                      ? 'Offline Active — Stored locally'
                      : isOnline
                      ? 'Connected — Cloud active'
                      : 'Disconnected — Local mode'}
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={forceOffline}
                onChange={onToggleForceOffline}
                label="Toggle Force Offline Mode"
              />
            </div>
          </div>
        )}

        {/* TAB 3: CLOUD & PROBES */}
        {activeTab === 'cloud' && (
          <div className="space-y-3 animate-fade-in">
            {/* Setting: Auto-Sync Drive */}
            <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 pr-3">
                <Cloud className={`w-4 h-4 shrink-0 ${autoSyncDrive ? 'text-sky-400' : 'text-zinc-500'}`} />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Auto-Sync Drive Backups</h4>
                  <p className="text-[11px] text-zinc-400">Auto-backup new smoke logs to Google Drive</p>
                </div>
              </div>
              <ToggleSwitch
                checked={autoSyncDrive}
                onChange={onToggleAutoSync}
                label="Toggle Auto-Sync Drive"
              />
            </div>

            {/* Setting: Bluetooth Hub Button */}
            <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Bluetooth className="w-4 h-4 text-blue-400 shrink-0 animate-pulse" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">Wireless Probe Hub</h4>
                    <p className="text-[11px] text-zinc-400">MEATER, ThermoWorks & Bluetooth Probes</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                  Ready
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBluetoothModal();
                }}
                className="w-full py-2 px-3 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 font-bold text-xs rounded-xl flex items-center justify-between transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-center space-x-2">
                  <Bluetooth className="w-3.5 h-3.5 text-blue-400" />
                  <span>Open Wireless Probe Hub</span>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Setting: Google Drive Management */}
            <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Cloud className={`w-4 h-4 shrink-0 ${isDriveConnected ? 'text-sky-400' : 'text-zinc-400'}`} />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">Google Drive Account</h4>
                    <p className="text-[11px] text-zinc-400">Cloud backups and sheet restores</p>
                  </div>
                </div>
                {isDriveConnected ? (
                  <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3 text-cyan-400" />
                    <span>Connected</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-zinc-400 bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-0.5 rounded-md">
                    Linked Off
                  </span>
                )}
              </div>

              {isDriveConnected && driveUserEmail && (
                <p className="text-[11px] font-mono text-sky-300 bg-sky-500/10 border border-sky-500/20 p-2 rounded-lg truncate">
                  Account: {driveUserEmail}
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDriveModal();
                }}
                className="w-full py-2 px-3 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] hover:border-orange-500/30 text-white font-bold text-xs rounded-xl flex items-center justify-between transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-center space-x-2">
                  <Cloud className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isDriveConnected ? 'Manage Drive Backups' : 'Connect Google Drive'}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: DATA MANAGEMENT */}
        {activeTab === 'data' && (
          <div className="space-y-3 animate-fade-in">
            <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <RefreshCw className="w-4 h-4 text-zinc-400 shrink-0" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">Reset Logbook Data</h4>
                    <p className="text-[11px] text-zinc-400">Revert logs & runtime hours to initial defaults</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onResetData();
                }}
                className="w-full py-2 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Sample Data</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};


