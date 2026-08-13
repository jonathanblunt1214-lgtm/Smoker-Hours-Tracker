import React, { useState, useEffect } from 'react';
import { Flame, BarChart3, BookOpen, PlusCircle, Wrench, Sparkles, Clock, Settings, Calendar, Database, Brain, Crown, Download, Cpu, User as UserIcon, LogOut, ShieldCheck, ChevronDown, CloudSun, RefreshCw } from 'lucide-react';
import { isMasterAdmin } from '../utils/adminAuth';
import { UserAuthSession } from '../utils/userAuthSession';
import { convertTemp } from '../utils/tempUtils';
import { fetchAutoWeatherData, WeatherData } from '../utils/weatherService';

const isStandaloneApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (window.navigator as any).standalone === true ||
    !!(window as any).ipcRenderer
  );
};

const isRaspberryPiEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;

  if (
    document.documentElement.classList.contains('raspberry-pi-mode') ||
    document.documentElement.classList.contains('pi-touch-kiosk')
  ) {
    return true;
  }

  try {
    const savedLowPower = localStorage.getItem('smokestack_lowpower_settings');
    if (savedLowPower) {
      const parsed = JSON.parse(savedLowPower);
      if (parsed.raspberryPiMode || parsed.piKioskTouchTargets) {
        return true;
      }
    }
  } catch (e) {
    // ignore
  }

  const ua = navigator.userAgent.toLowerCase();
  if (
    ua.includes('raspberry') ||
    ua.includes('rpi') ||
    (ua.includes('linux') && (ua.includes('armv') || ua.includes('aarch64')) && ua.includes('chrome')) ||
    ua.includes('kiosk') ||
    ua.includes('qtwebengine')
  ) {
    return true;
  }

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('rpi') === 'true' || urlParams.get('kiosk') === 'true') {
    return true;
  }

  return false;
};

interface NavbarProps {
  activeTab: 'analytics' | 'logs' | 'planner' | 'new-cook' | 'maintenance' | 'ai-pitmaster';
  setActiveTab: (tab: 'analytics' | 'logs' | 'planner' | 'new-cook' | 'maintenance' | 'ai-pitmaster') => void;
  smokerHours: number;
  smokerName: string;
  tempUnit: 'F' | 'C';
  onOpenSettings: (tab?: 'appearance' | 'alerts' | 'cloud' | 'data') => void;
  isDriveConnected?: boolean;
  isOnline?: boolean;
  currentUserEmail?: string | null;
  userSession?: UserAuthSession | null;
  onOpenLoginModal?: () => void;
  onLogout?: () => void;
  onOpenMasterAdmin?: () => void;
  onOpenDownloadStore?: () => void;
  onOpenSyncDashboard?: () => void;
}

const SmokeStackIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Rising smoke wisps */}
    <path
      d="M8.5 5C8.5 3.8 9.8 3.2 10.5 2.5M12.5 5.5C12.5 4.2 14 3.5 14.8 2.5M16.2 6.5C16.8 5.5 17.5 5 18 4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      className="text-amber-200 animate-pulse"
    />
    {/* Chimney Cap Top Ring */}
    <rect x="5.5" y="8" width="13" height="2.2" rx="1.1" fill="currentColor" className="text-zinc-950" />
    {/* Main Stack Body */}
    <path
      d="M7 10.2H17L16 21.5H8L7 10.2Z"
      fill="currentColor"
      fillOpacity="0.25"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      className="text-zinc-950"
    />
    {/* Stacked Horizontal Bands */}
    <line x1="7.4" y1="14" x2="16.6" y2="14" stroke="currentColor" strokeWidth="1.4" className="text-zinc-950" />
    <line x1="7.7" y1="18" x2="16.3" y2="18" stroke="currentColor" strokeWidth="1.4" className="text-zinc-950" />
    {/* Fire / Ember Core at Base */}
    <path
      d="M10.5 19.8C10.5 18.8 12 17.8 12 17.8C12 17.8 13.5 18.8 13.5 19.8C13.5 20.6 12.8 21.3 12 21.3C11.2 21.3 10.5 20.6 10.5 19.8Z"
      fill="currentColor"
      className="text-orange-950"
    />
  </svg>
);

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  smokerHours,
  smokerName,
  tempUnit,
  onOpenSettings,
  isDriveConnected = false,
  currentUserEmail,
  userSession,
  onOpenLoginModal,
  onLogout,
  onOpenMasterAdmin,
  onOpenDownloadStore,
  onOpenSyncDashboard,
}) => {
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [showGetApp, setShowGetApp] = useState(true);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const isAdmin = isMasterAdmin(currentUserEmail) || userSession?.isMasterAdmin;

  useEffect(() => {
    fetchAutoWeatherData().then((data) => {
      setWeatherData(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const checkAppEnv = () => {
      const standalone = isStandaloneApp();
      const rpi = isRaspberryPiEnvironment();
      // Show Get App button ONLY on non-app or Raspberry Pi interfaces
      setShowGetApp(!standalone || rpi);
    };

    checkAppEnv();
    window.addEventListener('resize', checkAppEnv);

    const observer = new MutationObserver(checkAppEnv);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      window.removeEventListener('resize', checkAppEnv);
      observer.disconnect();
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#161616] border-b border-[#2a2a2a] text-[#e0e0e0] shadow-xl w-full">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          
          {/* Left Section: Brand Logo + Desktop Nav */}
          <div className="flex items-center space-x-3 lg:space-x-6">
            {/* Brand Logo & Smoker Name */}
            <div className="flex items-center space-x-2.5 shrink-0">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 flex items-center justify-center shadow-md shadow-orange-950/50 border border-orange-300/30 shrink-0 group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <SmokeStackIcon className="h-5 w-5 sm:h-5 sm:w-5 text-zinc-950 font-bold" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white whitespace-nowrap bg-gradient-to-r from-white via-zinc-100 to-orange-200 bg-clip-text text-transparent">
                  Smoke Stack
                </span>
                <span className="hidden xs:inline-block text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-md font-mono border border-orange-500/20 font-bold truncate max-w-[110px]">
                  {smokerName.split(' ')[0]}
                </span>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center bg-[#1c1c1c] border border-[#2a2a2a] p-1 rounded-xl space-x-1">
              <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'analytics'
                    ? 'bg-orange-500/20 text-orange-400 font-bold border border-orange-500/40 shadow-sm'
                    : 'text-zinc-300 hover:bg-[#282828] hover:text-white'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5 text-orange-400" />
                <span>Analytics</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('logs')}
                title="Cook Logs: Browse past smoke sessions and digital log sheets"
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'logs'
                    ? 'bg-orange-500/20 text-orange-400 font-bold border border-orange-500/40 shadow-sm'
                    : 'text-zinc-300 hover:bg-[#282828] hover:text-white'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                <span>Cook Logs</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('planner')}
                title="Cook Planner: Schedule future cooks and target dinner serve times"
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'planner'
                    ? 'bg-orange-500/20 text-orange-400 font-bold border border-orange-500/40 shadow-sm'
                    : 'text-zinc-300 hover:bg-[#282828] hover:text-white'
                }`}
              >
                <Calendar className="h-3.5 w-3.5 text-orange-400" />
                <span>Planner</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('new-cook')}
                title="New Cook: Record real-time temperatures, fuel, and session details"
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'new-cook'
                    ? 'bg-orange-500 text-zinc-950 shadow-md shadow-orange-950/40'
                    : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30'
                }`}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>New Cook</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('maintenance')}
                title="Maintenance: Manage fuel inventory, pellet blends, and smoker care"
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'maintenance'
                    ? 'bg-orange-500/20 text-orange-400 font-bold border border-orange-500/40 shadow-sm'
                    : 'text-zinc-300 hover:bg-[#282828] hover:text-white'
                }`}
              >
                <Wrench className="h-3.5 w-3.5 text-zinc-400" />
                <span>Maintenance</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ai-pitmaster')}
                title="CharGPT AI: Chat with your AI pitmaster for advice and cook audits"
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'ai-pitmaster'
                    ? 'bg-purple-500/25 text-purple-300 font-bold border border-purple-500/40 shadow-sm'
                    : 'text-purple-400 hover:bg-[#282828] hover:text-purple-300'
                }`}
              >
                <Brain className="h-3.5 w-3.5 text-purple-400" />
                <span>CharGPT AI</span>
              </button>
            </nav>
          </div>

          {/* Right Controls Group */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Get App Button (Only shown on non-app or Raspberry Pi interfaces) */}
            {showGetApp && onOpenDownloadStore && (
              <button
                type="button"
                onClick={onOpenDownloadStore}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 bg-gradient-to-r from-orange-500/20 to-amber-500/20 hover:from-orange-500/30 hover:to-amber-500/30 border border-orange-500/40 rounded-xl text-xs font-bold text-orange-300 transition-all cursor-pointer active:scale-95 shadow-sm shrink-0"
                title="Download Smoke Stack App or Raspberry Pi Kiosk Setup"
              >
                <Download className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                <span className="hidden sm:inline text-[11px] whitespace-nowrap">Get App</span>
              </button>
            )}

            {/* INTEGRATED TRACKED HOURS & AUTHENTICATION CONTROL IN MAIN NAV BAR */}
            <div className="flex items-center bg-[#1c1c24] border border-[#2e2e3c] hover:border-orange-500/40 rounded-xl p-1 shadow-md space-x-1 shrink-0 transition-all">
              {/* Tracked Hours & Weather Display Badge */}
              <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#242430] hover:bg-[#2c2c3a] text-xs text-zinc-200 font-mono font-bold shrink-0 transition-colors cursor-pointer"
                title={`Operating Hours: ${smokerHours.toFixed(1)}h | Outdoor Weather: ${weatherData ? `${weatherData.tempF}°F (${weatherData.conditionDesc}, ${weatherData.cityState})` : 'Auto-gathering weather...'}`}
              >
                <Clock className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                <span className="text-orange-400 font-extrabold">{smokerHours.toFixed(1)}h</span>
                
                {/* Outdoor Weather Temperature Displayed Right Next to Operating Hours */}
                <div className="flex items-center space-x-1 pl-1.5 border-l border-zinc-700/60 ml-0.5 text-amber-300">
                  <CloudSun className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="text-[11px] font-extrabold font-mono">
                    {weatherData ? `${convertTemp(weatherData.tempF, tempUnit)}°${tempUnit}` : `--°${tempUnit}`}
                  </span>
                </div>
              </button>

              <div className="h-4 w-px bg-[#323242] shrink-0" />

              {/* AUTHENTICATION CONTROL / LOGGED IN USER ACCOUNT TAB */}
              {userSession ? (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="flex items-center space-x-1.5 bg-gradient-to-r from-[#282836] to-[#20202c] hover:from-[#323246] hover:to-[#28283a] text-white rounded-lg px-2.5 py-1 text-xs transition-all cursor-pointer font-extrabold shrink-0 border border-[#383848]"
                    title="User Account & Authentication Control"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span className="font-extrabold text-zinc-100 truncate max-w-[80px] xs:max-w-[100px] sm:max-w-[120px]">
                      {userSession.name || userSession.email.split('@')[0]}
                    </span>
                    {onOpenSyncDashboard && (
                      <span className="flex items-center space-x-1 text-[10px] bg-orange-500/20 text-orange-300 font-mono px-1.5 py-0.5 rounded border border-orange-500/30 font-bold shrink-0">
                        <RefreshCw className="h-2.5 w-2.5 text-orange-400 animate-spin shrink-0" />
                        <span className="hidden sm:inline">30m Sync</span>
                      </span>
                    )}
                    {userSession.isMasterAdmin && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 font-mono px-1 py-0.2 rounded border border-amber-500/30 font-bold hidden sm:inline shrink-0">
                        Master
                      </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform shrink-0 ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* USER DROPDOWN MENU */}
                  {isUserDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-[#16161a] border border-[#2e2e38] rounded-2xl shadow-2xl p-2 z-50 text-xs animate-fadeIn">
                      {/* User Header Info & Integrated 30m Sync Pill */}
                      <div className="p-2.5 bg-[#202028] rounded-xl mb-1.5 border border-[#2a2a34]">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="font-extrabold text-white truncate">{userSession.name || 'Pitmaster'}</div>
                          {onOpenSyncDashboard && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsUserDropdownOpen(false);
                                onOpenSyncDashboard();
                              }}
                              className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-orange-500/20 hover:bg-orange-500/30 text-[10px] text-orange-300 font-mono font-bold shrink-0 transition-colors cursor-pointer border border-orange-500/30"
                              title="Open 30-Minute Sync & Google Drive Cloud Backup Dashboard"
                            >
                              <RefreshCw className="h-3 w-3 text-orange-400 animate-spin shrink-0" />
                              <span>30m Sync</span>
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono truncate">{userSession.email}</div>
                        {userSession.isMasterAdmin && (
                          <span className="inline-block mt-1 text-[9px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded border border-amber-500/30 font-bold">
                            👑 Master Admin
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        {/* Pitmaster Settings Menu */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            onOpenSettings('appearance');
                          }}
                          className="w-full flex items-center space-x-2.5 px-3 py-2 text-zinc-200 hover:text-white hover:bg-[#22222a] rounded-xl transition-all font-semibold cursor-pointer text-left"
                        >
                          <Settings className="w-4 h-4 text-orange-400 shrink-0" />
                          <span className="whitespace-nowrap">Pitmaster Settings</span>
                        </button>

                        {/* Data & Backups */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            if (onOpenSyncDashboard) onOpenSyncDashboard();
                            else onOpenSettings('data');
                          }}
                          className="w-full flex items-center space-x-2.5 px-3 py-2 text-zinc-200 hover:text-white hover:bg-[#22222a] rounded-xl transition-all font-semibold cursor-pointer text-left"
                        >
                          <Database className="w-4 h-4 text-blue-400 shrink-0" />
                          <span className="whitespace-nowrap">30m Sync & Cloud Backups</span>
                        </button>

                        {/* Master Admin Controls */}
                        {(isAdmin || onOpenMasterAdmin) && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsUserDropdownOpen(false);
                              if (onOpenMasterAdmin) onOpenMasterAdmin();
                              else onOpenSettings('data');
                            }}
                            className="w-full flex items-center space-x-2.5 px-3 py-2 text-amber-300 hover:bg-[#22222a] rounded-xl transition-all font-semibold cursor-pointer text-left"
                          >
                            <Crown className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                            <span className="whitespace-nowrap">Master Admin Panel</span>
                          </button>
                        )}

                        <div className="border-t border-[#2a2a34] my-1"></div>

                        {/* Sign Out Button */}
                        {onLogout && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsUserDropdownOpen(false);
                              onLogout();
                            }}
                            className="w-full flex items-center space-x-2.5 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all font-bold cursor-pointer text-left"
                          >
                            <LogOut className="w-4 h-4 text-red-400 shrink-0" />
                            <span className="whitespace-nowrap">Sign Out / Switch Account</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* LOGGED OUT STATE: SIGN IN / SIGN UP BUTTON INTEGRATED NEXT TO HOURS */
                onOpenLoginModal && (
                  <button
                    type="button"
                    onClick={onOpenLoginModal}
                    className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-black rounded-lg text-xs transition-all cursor-pointer shadow-md shadow-orange-950/40 shrink-0 whitespace-nowrap"
                    title="Sign In or Register New Account"
                  >
                    <UserIcon className="w-3.5 h-3.5 fill-zinc-950 shrink-0" />
                    <span className="hidden sm:inline whitespace-nowrap">Sign In / Sign Up</span>
                    <span className="sm:hidden whitespace-nowrap">Sign In</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Nav sub-bar */}
      <div className="md:hidden bg-[#121212] px-2 py-1.5 border-t border-[#2a2a2a] text-[11px] sticky top-14 z-30 shadow-md">
        <div className="flex items-center justify-around gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center py-1 px-2 rounded-xl transition-all min-w-[48px] min-h-[44px] justify-center cursor-pointer ${
              activeTab === 'analytics' ? 'bg-orange-500/15 text-orange-400 font-bold border border-orange-500/30' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BarChart3 className="h-4 w-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Analytics</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex flex-col items-center py-1 px-2 rounded-xl transition-all min-w-[48px] min-h-[44px] justify-center cursor-pointer ${
              activeTab === 'logs' ? 'bg-orange-500/15 text-orange-400 font-bold border border-orange-500/30' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="h-4 w-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Cook Logs</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('planner')}
            className={`flex flex-col items-center py-1 px-2 rounded-xl transition-all min-w-[48px] min-h-[44px] justify-center cursor-pointer ${
              activeTab === 'planner' ? 'bg-orange-500/15 text-orange-400 font-bold border border-orange-500/30' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Calendar className="h-4 w-4 mb-0.5 text-orange-400" />
            <span className="text-[10px] leading-tight">Planner</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('new-cook')}
            className={`flex flex-col items-center py-1 px-2 rounded-xl transition-all min-w-[48px] min-h-[44px] justify-center cursor-pointer ${
              activeTab === 'new-cook' ? 'bg-orange-500 text-zinc-950 font-black shadow-md' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
            }`}
          >
            <PlusCircle className="h-4 w-4 mb-0.5" />
            <span className="text-[10px] leading-tight">+ New Cook</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('maintenance')}
            className={`flex flex-col items-center py-1 px-2 rounded-xl transition-all min-w-[48px] min-h-[44px] justify-center cursor-pointer ${
              activeTab === 'maintenance' ? 'bg-orange-500/15 text-orange-400 font-bold border border-orange-500/30' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Wrench className="h-4 w-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Maintenance</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai-pitmaster')}
            className={`flex flex-col items-center py-1 px-2 rounded-xl transition-all min-w-[48px] min-h-[44px] justify-center cursor-pointer ${
              activeTab === 'ai-pitmaster' ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40' : 'text-purple-400 hover:text-purple-300'
            }`}
          >
            <Brain className="h-4 w-4 mb-0.5" />
            <span className="text-[10px] leading-tight">CharGPT AI</span>
          </button>
        </div>
      </div>
    </header>
  );
};
