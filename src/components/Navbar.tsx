import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, BookOpen, Brain, Calendar, ChevronDown, CloudSun, Crown, Download,
  Flame, Home, LogOut, MoreHorizontal, PlusCircle, RefreshCw, Settings,
  User as UserIcon, Wrench, X,
} from 'lucide-react';
import { UserAuthSession } from '../utils/userAuthSession';
import { convertTemp } from '../utils/tempUtils';
import { fetchAutoWeatherData, WeatherData } from '../utils/weatherService';

export type AppTab = 'home' | 'analytics' | 'logs' | 'planner' | 'new-cook' | 'maintenance' | 'ai-pitmaster';
export type SettingsDestination = 'root' | 'account' | 'appearance' | 'alerts' | 'cloud' | 'data' | 'smokers' | 'sync';

const isStandaloneApp = (): boolean => typeof window !== 'undefined' && (
  window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: fullscreen)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
  Boolean((window as Window & { Capacitor?: unknown }).Capacitor)
);

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  smokerHours: number;
  smokerName: string;
  tempUnit: 'F' | 'C';
  onOpenSettings: (tab?: SettingsDestination) => void;
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

const SmokeStackIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
    <path d="M8.5 5c0-1.2 1.3-1.8 2-2.5m2 3c0-1.3 1.5-2 2.3-3m1.4 4c.6-1 1.3-1.5 1.8-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <rect x="5.5" y="8" width="13" height="2.2" rx="1.1" fill="currentColor" />
    <path d="M7 10.2h10L16 21.5H8L7 10.2Z" fill="currentColor" fillOpacity=".25" stroke="currentColor" strokeWidth="1.8" />
    <path d="M7.4 14h9.2M7.7 18h8.6" stroke="currentColor" strokeWidth="1.4" />
    <path d="M10.5 19.8c0-1 1.5-2 1.5-2s1.5 1 1.5 2a1.5 1.5 0 0 1-3 0Z" fill="currentColor" />
  </svg>
);

const desktopItems: Array<{ id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'logs', label: 'Cook Logs', icon: BookOpen },
  { id: 'planner', label: 'Planner', icon: Calendar },
  { id: 'new-cook', label: 'New Cook', icon: PlusCircle },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'ai-pitmaster', label: 'CharGPT', icon: Brain },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab, setActiveTab, smokerHours, smokerName, tempUnit, onOpenSettings,
  userSession, currentUserEmail, onOpenLoginModal, onLogout, onOpenMasterAdmin,
  onOpenDownloadStore, onOpenSyncDashboard,
}) => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [showGetApp, setShowGetApp] = useState(false);
  // UI visibility follows a server-verified role hydrated into userSession.
  const isAdmin = userSession?.isMasterAdmin === true;

  useEffect(() => {
    fetchAutoWeatherData().then(setWeatherData).catch(() => setWeatherData(null));
    setShowGetApp(!isStandaloneApp());
  }, []);
  useEffect(() => setIsMoreOpen(false), [activeTab]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setIsMoreOpen(false); setIsUserDropdownOpen(false); }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  const mobilePrimary = useMemo(() => [
    { id: 'home' as AppTab, label: 'Home', icon: Home, selected: activeTab === 'home' },
    { id: 'new-cook' as AppTab, label: 'Cook', icon: Flame, selected: activeTab === 'new-cook' || activeTab === 'planner' },
    { id: 'ai-pitmaster' as AppTab, label: 'CharGPT', icon: Brain, selected: activeTab === 'ai-pitmaster' },
    { id: 'maintenance' as AppTab, label: 'Equipment', icon: Wrench, selected: activeTab === 'maintenance' },
  ], [activeTab]);
  const navigate = (tab: AppTab) => { setIsMoreOpen(false); setActiveTab(tab); };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[#2a2a2a] bg-[#161616]/95 text-[#e0e0e0] shadow-xl backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-2 px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 lg:gap-6">
            <button type="button" onClick={() => navigate('home')} className="flex min-w-0 items-center gap-2.5 rounded-xl text-left" aria-label="Open Smoke Stack home">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-300/30 bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 text-zinc-950 shadow-md shadow-orange-950/50"><SmokeStackIcon className="h-5 w-5" /></span>
              <span className="min-w-0"><span className="block truncate text-sm font-extrabold tracking-tight text-white sm:text-base">Smoke Stack</span><span className="block max-w-[145px] truncate text-[10px] text-zinc-500 md:hidden">{smokerName || 'No smoker selected'}</span></span>
            </button>
            <nav className="hidden items-center gap-1 rounded-xl border border-[#2a2a2a] bg-[#1c1c1c] p-1 md:flex" aria-label="Primary navigation">
              {desktopItems.map((item) => {
                const Icon = item.icon; const selected = activeTab === item.id;
                return <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${selected ? item.id === 'ai-pitmaster' ? 'border border-purple-500/40 bg-purple-500/20 text-purple-300' : item.id === 'new-cook' ? 'bg-orange-500 font-bold text-zinc-950' : 'border border-orange-500/40 bg-orange-500/15 text-orange-300' : 'text-zinc-300 hover:bg-[#282828] hover:text-white'}`}><Icon className="h-3.5 w-3.5" /><span>{item.label}</span></button>;
              })}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {showGetApp && onOpenDownloadStore && <button type="button" onClick={onOpenDownloadStore} className="hidden min-h-9 items-center gap-1.5 rounded-xl border border-orange-500/40 bg-orange-500/10 px-2.5 text-xs font-bold text-orange-300 sm:inline-flex"><Download className="h-3.5 w-3.5" />Get App</button>}
            <button type="button" onClick={() => navigate('analytics')} className="flex min-h-9 items-center gap-1.5 rounded-xl border border-[#2e2e3c] bg-[#1c1c24] px-2 text-[11px] font-bold text-zinc-200" title="Smoker hours and outdoor temperature"><span className="font-mono text-orange-400">{smokerHours.toFixed(1)}h</span><span className="h-4 w-px bg-zinc-700" /><CloudSun className="h-3.5 w-3.5 text-amber-400" /><span className="font-mono text-amber-300">{weatherData ? `${convertTemp(weatherData.tempF, tempUnit)}°` : '--°'}</span></button>
            <div className="relative hidden md:block">
              <button type="button" onClick={() => setIsUserDropdownOpen((open) => !open)} className="flex min-h-9 max-w-[190px] items-center gap-1.5 rounded-xl border border-[#383848] bg-[#242430] px-2.5 text-xs font-bold text-zinc-100"><UserIcon className="h-3.5 w-3.5 text-orange-400" /><span className="truncate">{userSession?.name || 'Sign In'}</span><ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition ${isUserDropdownOpen ? 'rotate-180' : ''}`} /></button>
              {isUserDropdownOpen && <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-zinc-800 bg-[#16161a] p-2 text-xs shadow-2xl">
                {userSession && <div className="mb-2 rounded-xl bg-zinc-900 p-3"><div className="truncate font-bold text-white">{userSession.name || 'Pitmaster'}</div><div className="truncate font-mono text-[10px] text-zinc-500">{userSession.email}</div></div>}
                <MenuButton icon={Settings} label="Settings" onClick={() => { setIsUserDropdownOpen(false); onOpenSettings('root'); }} />
                {onOpenSyncDashboard && <MenuButton icon={RefreshCw} label="Account sync" onClick={() => { setIsUserDropdownOpen(false); onOpenSyncDashboard(); }} />}
                {isAdmin && onOpenMasterAdmin && <MenuButton icon={Crown} label="Operations" tone="amber" onClick={() => { setIsUserDropdownOpen(false); onOpenMasterAdmin(); }} />}
                {!userSession && onOpenLoginModal && <MenuButton icon={UserIcon} label="Sign in" onClick={() => { setIsUserDropdownOpen(false); onOpenLoginModal(); }} />}
                {userSession && onLogout && <MenuButton icon={LogOut} label="Sign out" tone="red" onClick={() => { setIsUserDropdownOpen(false); onLogout(); }} />}
              </div>}
            </div>
          </div>
        </div>
      </header>

      {isMoreOpen && <div className="fixed inset-0 z-[70] bg-black/55 md:hidden" onClick={() => setIsMoreOpen(false)}>
        <section className="absolute inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] rounded-t-3xl border-t border-zinc-700 bg-[#151515] p-4 shadow-2xl" onClick={(event) => event.stopPropagation()} aria-label="More navigation">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold text-white">More</h2><button type="button" onClick={() => setIsMoreOpen(false)} className="min-h-11 min-w-11 rounded-xl text-zinc-400" aria-label="Close more menu"><X className="mx-auto h-5 w-5" /></button></div>
          <div className="grid grid-cols-2 gap-2"><MoreButton icon={BookOpen} label="Cook Logs" onClick={() => navigate('logs')} /><MoreButton icon={BarChart3} label="Analytics" onClick={() => navigate('analytics')} /><MoreButton icon={Calendar} label="Planner" onClick={() => navigate('planner')} /><MoreButton icon={UserIcon} label={userSession ? 'Account' : 'Sign In'} onClick={() => { setIsMoreOpen(false); userSession ? onOpenSettings('account') : onOpenLoginModal?.(); }} /><MoreButton icon={RefreshCw} label="Sync" onClick={() => { setIsMoreOpen(false); onOpenSyncDashboard ? onOpenSyncDashboard() : onOpenSettings('sync'); }} /><MoreButton icon={Settings} label="Settings" onClick={() => { setIsMoreOpen(false); onOpenSettings('root'); }} /></div>
        </section>
      </div>}

      <nav className="fixed inset-x-0 bottom-0 z-[80] grid h-[calc(4.25rem+env(safe-area-inset-bottom))] grid-cols-5 border-t border-zinc-800 bg-[#121212]/98 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(0,0,0,.35)] backdrop-blur md:hidden" aria-label="Mobile primary navigation">
        {mobilePrimary.map((item) => { const Icon = item.icon; return <MobileTab key={item.id} icon={Icon} label={item.label} selected={item.selected} onClick={() => navigate(item.id)} />; })}
        <MobileTab icon={MoreHorizontal} label="More" selected={isMoreOpen || ['logs', 'analytics'].includes(activeTab)} onClick={() => setIsMoreOpen((open) => !open)} />
      </nav>
    </>
  );
};

const MobileTab: React.FC<{ icon: React.ComponentType<{ className?: string }>; label: string; selected: boolean; onClick: () => void }> = ({ icon: Icon, label, selected, onClick }) => <button type="button" onClick={onClick} className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold ${selected ? 'text-orange-400' : 'text-zinc-500'}`} aria-current={selected ? 'page' : undefined}><Icon className={`h-5 w-5 ${selected ? 'stroke-[2.5]' : ''}`} /><span>{label}</span></button>;
const MoreButton: React.FC<{ icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }> = ({ icon: Icon, label, onClick }) => <button type="button" onClick={onClick} className="flex min-h-14 items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 text-left text-sm font-semibold text-zinc-200"><Icon className="h-5 w-5 text-orange-400" /><span>{label}</span></button>;
const MenuButton: React.FC<{ icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void; tone?: 'amber' | 'red' }> = ({ icon: Icon, label, onClick, tone }) => <button type="button" onClick={onClick} className={`flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left font-semibold ${tone === 'red' ? 'text-red-400 hover:bg-red-500/10' : tone === 'amber' ? 'text-amber-300 hover:bg-amber-500/10' : 'text-zinc-200 hover:bg-zinc-900'}`}><Icon className="h-4 w-4" /><span>{label}</span></button>;
