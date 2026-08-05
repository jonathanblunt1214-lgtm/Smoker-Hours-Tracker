import React from 'react';
import { Flame, BarChart3, BookOpen, PlusCircle, Wrench, Sparkles, Clock, Settings, Calendar } from 'lucide-react';

interface NavbarProps {
  activeTab: 'analytics' | 'logs' | 'planner' | 'new-cook' | 'maintenance' | 'ai-pitmaster';
  setActiveTab: (tab: 'analytics' | 'logs' | 'planner' | 'new-cook' | 'maintenance' | 'ai-pitmaster') => void;
  smokerHours: number;
  smokerName: string;
  tempUnit: 'F' | 'C';
  onOpenSettings: () => void;
  isDriveConnected?: boolean;
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
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#161616]/95 backdrop-blur-md border-b border-[#2a2a2a] text-[#e0e0e0] shadow-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
        <div className="flex items-center justify-between h-14">
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

          {/* Consolidated Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'analytics'
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                  : 'text-zinc-300 hover:bg-[#222222] hover:text-white'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5 text-orange-400" />
              <span>Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'logs'
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                  : 'text-zinc-300 hover:bg-[#222222] hover:text-white'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-amber-400" />
              <span>Logs & Suggestions</span>
            </button>

            <button
              onClick={() => setActiveTab('planner')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'planner'
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                  : 'text-zinc-300 hover:bg-[#222222] hover:text-white'
              }`}
            >
              <Calendar className="h-3.5 w-3.5 text-orange-400" />
              <span>Planner</span>
            </button>

            <button
              onClick={() => setActiveTab('new-cook')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'new-cook'
                  ? 'bg-orange-500 text-zinc-950 shadow-md shadow-orange-950/40'
                  : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30'
              }`}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Log Smoke</span>
            </button>

            <button
              onClick={() => setActiveTab('maintenance')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'maintenance'
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                  : 'text-zinc-300 hover:bg-[#222222] hover:text-white'
              }`}
            >
              <Wrench className="h-3.5 w-3.5 text-zinc-400" />
              <span>Fuel & Care</span>
            </button>

            <button
              onClick={() => setActiveTab('ai-pitmaster')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'ai-pitmaster'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-purple-400 hover:bg-[#222222] hover:text-purple-300'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              <span>AI Pitmaster</span>
            </button>
          </nav>

          {/* Consolidated Right Controls Group */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-[#222222] border border-[#2a2a2a] rounded-xl p-0.5 shadow-inner">
              <div className="flex items-center space-x-1 px-2 py-1 text-zinc-300 border-r border-[#2a2a2a]">
                <Clock className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                <span className="font-mono font-bold text-xs text-orange-400">{smokerHours.toFixed(1)}h</span>
              </div>

              <button
                type="button"
                onClick={onOpenSettings}
                className="flex items-center space-x-1 px-2.5 py-1 hover:bg-[#2a2a2a] rounded-r-lg text-xs font-bold text-zinc-200 hover:text-white transition-all cursor-pointer active:scale-95"
                title="Pitmaster Settings Menu"
              >
                <Settings className="h-3.5 w-3.5 text-orange-400" />
                <span className="font-mono text-[10px] text-orange-400 font-extrabold">°{tempUnit}</span>
                {isDriveConnected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0" title="Google Drive Connected"></span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Nav sub-bar */}
      <div className="md:hidden flex items-center justify-around bg-[#121212] px-1 py-1.5 border-t border-[#2a2a2a] text-[11px] sticky top-16 z-30 shadow-md">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex flex-col items-center py-1.5 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px] justify-center ${
            activeTab === 'analytics' ? 'bg-orange-500/15 text-orange-400 font-bold border border-orange-500/30' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <BarChart3 className="h-4 w-4 mb-0.5" />
          <span>Trends</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex flex-col items-center py-1.5 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px] justify-center ${
            activeTab === 'logs' ? 'bg-orange-500/15 text-orange-400 font-bold border border-orange-500/30' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <BookOpen className="h-4 w-4 mb-0.5" />
          <span>Logs</span>
        </button>
        <button
          onClick={() => setActiveTab('planner')}
          className={`flex flex-col items-center py-1.5 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px] justify-center ${
            activeTab === 'planner' ? 'bg-orange-500/15 text-orange-400 font-bold border border-orange-500/30' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Calendar className="h-4 w-4 mb-0.5 text-orange-400" />
          <span>Planner</span>
        </button>
        <button
          onClick={() => setActiveTab('new-cook')}
          className={`flex flex-col items-center py-1.5 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px] justify-center ${
            activeTab === 'new-cook' ? 'bg-orange-500 text-zinc-950 font-black shadow-md' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
          }`}
        >
          <PlusCircle className="h-4 w-4 mb-0.5" />
          <span>+ Smoke</span>
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`flex flex-col items-center py-1.5 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px] justify-center ${
            activeTab === 'maintenance' ? 'bg-orange-500/15 text-orange-400 font-bold border border-orange-500/30' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Wrench className="h-4 w-4 mb-0.5" />
          <span>Care</span>
        </button>
        <button
          onClick={() => setActiveTab('ai-pitmaster')}
          className={`flex flex-col items-center py-1.5 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px] justify-center ${
            activeTab === 'ai-pitmaster' ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40' : 'text-purple-400 hover:text-purple-300'
          }`}
        >
          <Sparkles className="h-4 w-4 mb-0.5" />
          <span>AI Pit</span>
        </button>
      </div>
    </header>
  );
};
