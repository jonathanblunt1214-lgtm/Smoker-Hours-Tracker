import React, { useState } from 'react';
import { CookLog, ProteinType, SmokerProfile } from '../types';
import { RecipeSuggestion } from '../data/recipeSuggestions';
import { RecipeSuggestions } from './RecipeSuggestions';
import { Search, Filter, Calendar, Clock, Flame, FileText, Trash2, PlusCircle, Star, CheckCircle2, ChevronDown, ChevronUp, Award, Upload, Loader2 } from 'lucide-react';

interface CookLogListProps {
  cookLogs: CookLog[];
  profile?: SmokerProfile;
  onSelectCook: (cook: CookLog) => void;
  onOpenCertificate?: (cook: CookLog) => void;
  onDeleteCook: (id: string) => void;
  onNewCookClick: () => void;
  onStartCookFromRecipe?: (recipe: RecipeSuggestion) => void;
  onAskAIPitmaster?: (recipe: RecipeSuggestion, promptText?: string) => void;
  onLogsImported?: (logs: CookLog[]) => void;
}

export const CookLogList: React.FC<CookLogListProps> = ({
  cookLogs,
  profile,
  onSelectCook,
  onOpenCertificate,
  onDeleteCook,
  onNewCookClick,
  onStartCookFromRecipe,
  onAskAIPitmaster,
  onLogsImported,
}) => {
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProtein, setSelectedProtein] = useState<string>('ALL');
  const [collapsedLogs, setCollapsedLogs] = useState<Record<string, boolean>>({});

  const toggleLogCollapse = (id: string) => {
    setCollapsedLogs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredLogs = cookLogs.filter((log) => {
    const matchesSearch =
      log.title.toLowerCase().includes(search.toLowerCase()) ||
      log.proteinCut.toLowerCase().includes(search.toLowerCase()) ||
      log.smokerType.toLowerCase().includes(search.toLowerCase());

    const matchesProtein = selectedProtein === 'ALL' || log.proteinType === selectedProtein;

    return matchesSearch && matchesProtein;
  });

  const proteinBadgeColors: Record<string, string> = {
    Beef: 'bg-red-500/20 text-red-300 border-red-500/30',
    Pork: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    Chicken: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    Seafood: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    Turkey: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    Lamb: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    Other: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header & Filters & Cook Logs Section */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl">
        {/* Section Header with Expand/Collapse Toggle */}
        <div
          onClick={() => setIsLogsOpen((prev) => !prev)}
          className={`flex flex-col md:flex-row md:items-center justify-between gap-4 select-none cursor-pointer group transition-colors ${
            isLogsOpen ? 'pb-4 border-b border-[#2a2a2a]' : ''
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 group-hover:scale-105 transition-transform shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white group-hover:text-orange-400 transition-colors">
                  Smoker Journal & Cook Log Archives
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30">
                  {cookLogs.length} Saved
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Browse past smoke sessions, view physical log sheet replicas, or inspect temperature stall history.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 self-end md:self-auto flex-wrap sm:flex-nowrap gap-2">
            
            <label
              className="inline-flex items-center px-3 py-2 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-bold text-[11px] rounded-xl transition-all shadow-sm cursor-pointer"
              title="Upload PDF cook log for AI parsing"
              onClick={(e) => e.stopPropagation()}
            >
              {isUploadingPdf ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
              <span>{isUploadingPdf ? 'Parsing...' : 'Upload PDF'}</span>
              <input type="file" accept="application/pdf" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  setIsUploadingPdf(true);
                  const formData = new FormData();
                  formData.append('pdf', file);
                  const res = await fetch('/api/chargpt/parse-pdf-logs', {
                    method: 'POST',
                    body: formData
                  });
                  const data = await res.json();
                  if (data.logs && data.logs.length > 0) {
                    if (onLogsImported) onLogsImported(data.logs);
                  }
                } catch (err) {
                  console.error(err);
                } finally {
                  setIsUploadingPdf(false);
                }
              }} />
            </label>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNewCookClick();
              }}
              className="inline-flex items-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              <span>+ New Smoke Log</span>
            </button>


            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsLogsOpen((prev) => !prev);
              }}
              className="p-2 rounded-xl bg-[#242424] border border-[#2a2a2a] text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title={isLogsOpen ? 'Collapse Cook Logs' : 'Expand Cook Logs'}
            >
              {isLogsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Content: Search, Filters & Cards Grid */}
        {isLogsOpen && (
          <div className="mt-6 space-y-6">
            {/* Filter & Search input */}
            <div className="flex flex-col sm:flex-row gap-3">
              
              {/* Search bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search by cook title, cut, or wood pellets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-zinc-200 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>

              {/* Protein Selector */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
                <Filter className="w-4 h-4 text-zinc-400 shrink-0" />
                {['ALL', 'Beef', 'Pork', 'Chicken', 'Seafood', 'Other'].map((prot) => (
                  <button
                    key={prot}
                    type="button"
                    onClick={() => setSelectedProtein(prot)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedProtein === prot
                        ? 'bg-orange-500 text-zinc-950 font-bold'
                        : 'bg-[#242424] text-zinc-300 hover:bg-[#2a2a2a]'
                    }`}
                  >
                    {prot}
                  </button>
                ))}
              </div>

            </div>

            {/* Cook Logs Grid */}
            {filteredLogs.length === 0 ? (
              <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl p-12 text-center text-zinc-400">
                <Flame className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
                <h3 className="text-base font-bold text-zinc-200">No Cook Logs Found</h3>
                <p className="text-xs text-zinc-400 mt-1">Try adjusting your search or add a new smoke session.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredLogs.map((log) => {
                  const isCollapsed = !!collapsedLogs[log.id];

                  return (
                    <div
                      key={log.id}
                      className="bg-[#242424] border border-[#2a2a2a] hover:border-orange-500/40 rounded-2xl p-5 shadow-lg transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Card Top Pill Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#2a2a2a]">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-xs text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20">
                              Page #{log.pageNumber || 48}
                            </span>
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-md font-semibold border ${
                                proteinBadgeColors[log.proteinType] || proteinBadgeColors.Other
                              }`}
                            >
                              {log.proteinType}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-[#1a1a1a] text-zinc-300 border border-[#2a2a2a]">
                              {log.smokerType}
                            </span>
                            {log.pitmasterAlias && (
                              <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                👤 {log.pitmasterAlias}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 text-xs text-zinc-400">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{log.date}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleLogCollapse(log.id)}
                              className="p-1 text-zinc-400 hover:text-white rounded-lg bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] transition-colors cursor-pointer"
                              title={isCollapsed ? "Expand Cook Log Card" : "Collapse Cook Log Card"}
                            >
                              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {isCollapsed ? (
                          /* Collapsed Compact Cook Summary */
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <div>
                              <h3 className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">
                                {log.title}
                              </h3>
                              <p className="text-xs font-mono text-zinc-400">{log.proteinCut} • {log.hoursLogged} hrs</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onSelectCook(log)}
                              className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-xs font-semibold cursor-pointer shrink-0"
                            >
                              View Sheet
                            </button>
                          </div>
                        ) : (
                          /* Expanded Full Cook Details */
                          <>
                            {/* Cook Title */}
                            <div className="mt-3 flex gap-3 items-start">
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors">
                                  {log.title}
                                </h3>
                                <p className="text-xs font-mono text-zinc-400 mt-0.5">{log.proteinCut}</p>
                              </div>
                              {log.photoUrl && (
                                <div className="shrink-0 w-20 h-16 rounded-xl overflow-hidden border border-[#2a2a2a] shadow-sm">
                                  <img src={log.photoUrl} alt={log.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                </div>
                              )}
                            </div>

                            {/* Key Metrics Row */}
                            <div className="grid grid-cols-3 gap-2 mt-4 bg-[#1a1a1a] p-3 rounded-xl border border-[#2a2a2a] text-xs">
                              <div>
                                <span className="text-[10px] text-zinc-400 uppercase block font-semibold">Hours Logged</span>
                                <span className="font-mono font-bold text-orange-400 flex items-center mt-0.5">
                                  <Clock className="w-3 h-3 mr-1 text-orange-400" />
                                  {log.hoursLogged} hrs
                                </span>
                              </div>

                              <div>
                                <span className="text-[10px] text-zinc-400 uppercase block font-semibold">Smoker Runtime</span>
                                <span className="font-mono text-zinc-300 block mt-0.5 text-[11px]">
                                  {log.startingSmokerHours} → {log.endingSmokerHours}
                                </span>
                              </div>

                              <div>
                                <span className="text-[10px] text-zinc-400 uppercase block font-semibold">Fuel Consumed</span>
                                <span className="font-mono font-bold text-amber-400 block mt-0.5">
                                  {log.fuelLbsConsumed} lbs
                                </span>
                              </div>
                            </div>

                            {/* Seasoning & Notes preview */}
                            <div className="mt-4 text-xs space-y-1.5 text-zinc-300">
                              <p className="line-clamp-1">
                                <strong className="text-zinc-400">Rub:</strong> {log.seasoningRubs || 'Standard BBQ Rub'}
                              </p>
                              <p className="line-clamp-2 text-zinc-400 italic">
                                "{log.finishedNotes || 'Great cook!'}"
                              </p>
                            </div>

                            {/* Overall Rating stars */}
                            <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-[#2a2a2a]">
                              <div className="flex items-center space-x-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3.5 h-3.5 ${
                                      i < (log.ratings?.overall || 5)
                                        ? 'text-orange-400 fill-orange-400'
                                        : 'text-zinc-700'
                                    }`}
                                  />
                                ))}
                                <span className="text-zinc-400 text-[11px] ml-1">Overall</span>
                              </div>

                              <span
                                className={`font-semibold ${
                                  log.wouldMakeAgain ? 'text-emerald-400' : 'text-zinc-500'
                                }`}
                              >
                                {log.wouldMakeAgain ? '✓ Make Again' : 'No Repeat'}
                              </span>
                            </div>
                          </>
                        )}

                      </div>

                      {/* Bottom Card Buttons */}
                      {!isCollapsed && (
                        <div className="mt-5 pt-3 border-t border-[#2a2a2a] flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectCook(log)}
                            className="flex-1 py-2 px-3 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-orange-400 rounded-xl font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer border border-[#2a2a2a]"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Journal Sheet</span>
                          </button>

                          {onOpenCertificate && (
                            <button
                              type="button"
                              onClick={() => onOpenCertificate(log)}
                              className="flex-1 py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer border border-amber-500/30"
                            >
                              <Award className="w-3.5 h-3.5 text-amber-400" />
                              <span>🏆 Certificate Badge</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onDeleteCook(log.id)}
                            title="Delete Log Entry"
                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-[#1a1a1a] rounded-xl transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pitmaster Recipe Suggestions Section */}
      {onStartCookFromRecipe && (
        <RecipeSuggestions
          cookLogs={cookLogs}
          profile={profile}
          onStartCookFromRecipe={onStartCookFromRecipe}
          onAskAIPitmaster={onAskAIPitmaster}
          isCollapsible={true}
        />
      )}

    </div>
  );
};
