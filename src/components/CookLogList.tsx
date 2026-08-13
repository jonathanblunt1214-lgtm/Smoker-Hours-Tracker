import React, { useState, useRef } from 'react';
import { CookLog, ProteinType, SmokerProfile, VerifiedMeatCut } from '../types';
import { RecipeSuggestion } from '../data/recipeSuggestions';
import { RecipeSuggestions } from './RecipeSuggestions';
import { PdfExtractedSheetsModal } from './PdfExtractedSheetsModal';
import { PhysicalLogSheetModal } from './PhysicalLogSheetModal';
import { SmokeStackQRScannerModal } from './SmokeStackQRScannerModal';
import { Search, Filter, Calendar, Clock, Flame, FileText, Trash2, PlusCircle, Star, CheckCircle2, ChevronDown, ChevronUp, Award, Upload, Loader2, CheckSquare, Square, QrCode, Printer, Download, Plus } from 'lucide-react';
import { addOrUpdateVerifiedMeatCut } from '../utils/storage';
import { determineProteinType, determineProteinSubcategory } from '../data/proteinTemps';

interface CookLogListProps {
  cookLogs: CookLog[];
  profile?: SmokerProfile;
  onSelectCook: (cook: CookLog) => void;
  onOpenCertificate?: (cook: CookLog) => void;
  onEditCook?: (cook: CookLog) => void;
  onDeleteCook: (id: string) => void;
  onDeleteMultipleCooks?: (ids: string[]) => void;
  onNewCookClick: () => void;
  onStartCookFromRecipe?: (recipe: RecipeSuggestion) => void;
  onAskAIPitmaster?: (recipe: RecipeSuggestion, promptText?: string) => void;
  onLogsImported?: (logs: CookLog[]) => void;
  showToast?: (msg: string) => void;
}

export const CookLogList: React.FC<CookLogListProps> = ({
  cookLogs,
  profile,
  onSelectCook,
  onOpenCertificate,
  onEditCook,
  onDeleteCook,
  onDeleteMultipleCooks,
  onNewCookClick,
  onStartCookFromRecipe,
  onAskAIPitmaster,
  onLogsImported,
  showToast,
}) => {
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showPhysicalSheetModal, setShowPhysicalSheetModal] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [pdfModalData, setPdfModalData] = useState<{
    fileName: string;
    method: string;
    logs: CookLog[];
  } | null>(null);
  const [search, setSearch] = useState('');
  const [selectedProtein, setSelectedProtein] = useState<string>('ALL');
  const [collapsedLogs, setCollapsedLogs] = useState<Record<string, boolean>>({});
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);

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

  const toggleSelectLog = (id: string) => {
    setSelectedLogIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const allFilteredIds = filteredLogs.map((l) => l.id);
  const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedLogIds.includes(id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedLogIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      const combined = Array.from(new Set([...selectedLogIds, ...allFilteredIds]));
      setSelectedLogIds(combined);
    }
  };

  const handleBatchDelete = () => {
    if (selectedLogIds.length === 0) return;
    if (onDeleteMultipleCooks) {
      onDeleteMultipleCooks(selectedLogIds);
    } else {
      if (window.confirm(`Are you sure you want to delete ${selectedLogIds.length} selected cook log entry/entries?`)) {
        selectedLogIds.forEach((id) => onDeleteCook(id));
      }
    }
    setSelectedLogIds([]);
  };

  const proteinBadgeColors: Record<string, string> = {
    Beef: 'bg-red-500/20 text-red-300 border-red-500/30',
    Pork: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    Chicken: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    Seafood: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    Turkey: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    Lamb: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    Other: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  };

  const handleQRScanSuccess = (scannedData: {
    app?: string;
    type?: string;
    smokerType?: string;
    date?: string;
    pageNumber?: number;
    title?: string;
    proteinType?: string;
    rawText?: string;
  }) => {
    setIsLogsOpen(true);
    const now = new Date();
    const dateStr = scannedData.date || now.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const smokerTypeStr = scannedData.smokerType || profile?.smokerName || profile?.smokerType || 'Pellet Smoker';
    const titleStr = scannedData.title || `Scanned ${scannedData.proteinType || 'BBQ'} Smoke`;

    const newLog: CookLog = {
      id: `scanned-${Date.now()}`,
      title: titleStr,
      smokerId: profile?.id || 'smoker-1',
      proteinType: (scannedData.proteinType as any) || 'Beef',
      proteinCut: 'Custom Cut',
      date: dateStr,
      smokerType: smokerTypeStr,
      hoursLogged: 6,
      startingSmokerHours: 120,
      endingSmokerHours: 126,
      fuelType: 'Pellets',
      fuelLbsConsumed: 9,
      seasoningRubs: 'Standard BBQ Rub',
      saucesGlazes: 'None',
      finishedNotes: 'Logged from SmokeStack physical QR log sheet.',
      nextTimeNotes: 'Repeat process.',
      status: 'Completed',
      isPublishedToTotalHours: true,
      wouldMakeAgain: true,
      ratings: { overall: 5, tenderness: 5, bark: 5, smokeRing: 5 },
      temperatureReadings: [
        { id: `r-1-${Date.now()}`, time: '08:00 AM', timestampMinutes: 0, targetTemp: 225, cookingTemp: 225, meatTemp: 40, ambientTemp: 72, actionsTaken: 'Start' },
        { id: `r-2-${Date.now()}`, time: '09:00 AM', timestampMinutes: 60, targetTemp: 225, cookingTemp: 225, meatTemp: 110, ambientTemp: 74, actionsTaken: '' },
        { id: `r-3-${Date.now()}`, time: '10:00 AM', timestampMinutes: 120, targetTemp: 225, cookingTemp: 228, meatTemp: 152, ambientTemp: 75, actionsTaken: '' },
        { id: `r-4-${Date.now()}`, time: '11:00 AM', timestampMinutes: 180, targetTemp: 250, cookingTemp: 250, meatTemp: 165, ambientTemp: 78, actionsTaken: '' },
        { id: `r-5-${Date.now()}`, time: '12:00 PM', timestampMinutes: 240, targetTemp: 250, cookingTemp: 252, meatTemp: 192, ambientTemp: 80, actionsTaken: '' },
        { id: `r-6-${Date.now()}`, time: '01:00 PM', timestampMinutes: 300, targetTemp: 250, cookingTemp: 250, meatTemp: 203, ambientTemp: 81, actionsTaken: 'Finish' },
      ],
      pageNumber: scannedData.pageNumber || 48,
    };

    if (onLogsImported) {
      onLogsImported([newLog]);
    }
    if (showToast) {
      showToast(`✅ Scanned SmokeStack QR Code! Loaded "${newLog.title}" (${smokerTypeStr}, ${dateStr}) into Cook Journal.`);
    }
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
                  Cook Logs
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30">
                  {cookLogs.length} Saved
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Browse past smoke sessions, digital log sheets, and temperature history.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end md:self-auto flex-wrap sm:flex-nowrap gap-2">
            
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-300 font-bold text-[11px] rounded-xl transition-all shadow-sm cursor-pointer"
              title="Scan SmokeStack QR code using mobile camera or image upload"
              onClick={(e) => {
                e.stopPropagation();
                setShowQRScanner(true);
              }}
            >
              <QrCode className="w-3.5 h-3.5 mr-1.5" />
              <span>Scan Log QR</span>
            </button>

            <button
              type="button"
              className="inline-flex items-center px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-[11px] rounded-xl transition-all shadow-sm cursor-pointer"
              title="Download printable physical paper smoker log sheet"
              onClick={(e) => {
                e.stopPropagation();
                setShowPhysicalSheetModal(true);
              }}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              <span>Physical Sheet</span>
            </button>

            <button
              type="button"
              className="inline-flex items-center px-3 py-2 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-bold text-[11px] rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title="Upload single or multiple PDF cook logs for AI batch parsing"
              disabled={isUploadingPdf}
              onClick={(e) => {
                e.stopPropagation();
                pdfInputRef.current?.click();
              }}
            >
              {isUploadingPdf ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
              <span>{isUploadingPdf ? 'Parsing PDFs...' : 'Upload PDF(s)'}</span>
            </button>

            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={async (e) => {
                const fileList = e.target.files;
                if (!fileList || fileList.length === 0) return;
                const files: File[] = Array.from(fileList);
                try {
                  setIsUploadingPdf(true);
                  const formData = new FormData();
                  files.forEach((f: File) => formData.append('pdf', f));

                  const res = await fetch('/api/chargpt/parse-pdf-logs', {
                    method: 'POST',
                    body: formData
                  });
                  const data = await res.json();
                  if (data.logs && data.logs.length > 0) {
                    setIsLogsOpen(true);
                    if (onLogsImported) onLogsImported(data.logs);
                    const displayName = files.length === 1 
                      ? files[0].name 
                      : `${files.length} PDF files (${files.map((f) => f.name).join(', ')})`;

                    setPdfModalData({
                      fileName: displayName,
                      method: data.method || 'AI Gemini 3.6 Flash Batch',
                      logs: data.logs,
                    });
                    if (showToast) {
                      showToast(`📄 Successfully extracted ${data.logs.length} cook log sheet(s) from ${files.length} PDF file(s)!`);
                    }
                  } else if (data.error) {
                    if (showToast) showToast(`❌ PDF Import Error: ${data.error}`);
                  } else {
                    if (showToast) showToast(`❌ Could not extract logs from uploaded PDF file(s).`);
                  }
                } catch (err: any) {
                  console.error('PDF Upload Error:', err);
                  if (showToast) showToast(`❌ Upload failed: ${err?.message || 'Error parsing PDF(s)'}`);
                } finally {
                  setIsUploadingPdf(false);
                  e.target.value = '';
                }
              }}
            />
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

            {/* Batch Selection & Action Bar */}
            {filteredLogs.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121212] border border-[#2a2a2a] p-3 rounded-xl">
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="flex items-center space-x-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-orange-500" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-500" />
                    )}
                    <span>
                      {isAllSelected ? 'Deselect All' : `Select All (${filteredLogs.length})`}
                    </span>
                  </button>

                  {selectedLogIds.length > 0 && (
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-bold border border-orange-500/20">
                      {selectedLogIds.length} Selected
                    </span>
                  )}
                </div>

                {selectedLogIds.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedLogIds([])}
                      className="px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Clear Selection
                    </button>
                    <button
                      type="button"
                      onClick={handleBatchDelete}
                      className="inline-flex items-center px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      <span>Delete Selected ({selectedLogIds.length})</span>
                    </button>
                  </div>
                )}
              </div>
            )}

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
                  const isSelected = selectedLogIds.includes(log.id);

                  return (
                    <div
                      key={log.id}
                      className={`bg-[#242424] border ${
                        isSelected
                          ? 'border-orange-500 ring-1 ring-orange-500/30 bg-orange-950/10'
                          : 'border-[#2a2a2a] hover:border-orange-500/40'
                      } rounded-2xl p-5 shadow-lg transition-all flex flex-col justify-between group`}
                    >
                      <div>
                        {/* Card Top Pill Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#2a2a2a]">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelectLog(log.id);
                              }}
                              className="p-1 rounded-md text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
                              title={isSelected ? 'Deselect cook log' : 'Select cook log for mass deletion'}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-orange-500" />
                              ) : (
                                <Square className="w-4 h-4 text-zinc-500 hover:text-zinc-300" />
                              )}
                            </button>
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
                            {log.isPublishedToTotalHours ? (
                              <span className="text-[11px] px-2 py-0.5 rounded-md font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                                Published ({log.hoursLogged.toFixed(1)}h)
                              </span>
                            ) : (
                              <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                                Draft / Editable
                              </span>
                            )}
                            {log.userEmail ? (
                              <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center space-x-1" title={`Linked Account: ${log.userEmail}`}>
                                <span>👤 {log.pitmasterAlias || log.userEmail.split('@')[0]}</span>
                              </span>
                            ) : log.pitmasterAlias ? (
                              <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                👤 {log.pitmasterAlias}
                              </span>
                            ) : null}
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
                            <div className="flex items-center space-x-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => onSelectCook(log)}
                                className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-xs font-semibold cursor-pointer"
                              >
                                View Sheet
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Are you sure you want to delete cook log "${log.title}"?`)) {
                                    onDeleteCook(log.id);
                                  }
                                }}
                                className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-500/30"
                                title={`Delete cook log "${log.title}"`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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

                          {!log.isPublishedToTotalHours && onEditCook && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const publishedLog: CookLog = {
                                  ...log,
                                  isPublishedToTotalHours: true,
                                  status: 'Completed',
                                  publishedAt: new Date().toISOString(),
                                };
                                onEditCook(publishedLog);
                                if (showToast) {
                                  showToast(`🔥 Log "${log.title}" published! ${log.hoursLogged.toFixed(1)} hrs added to Total Operating Hours.`);
                                }
                              }}
                              className="py-2 px-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-md active:scale-95 border border-orange-400/50"
                              title="Publish cook log to add runtime to Total Smoker Operating Hours & enable AI analysis"
                            >
                              <Flame className="w-3.5 h-3.5 text-zinc-950 fill-zinc-950" />
                              <span>Publish to Total Hours</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const cutName = log.proteinCut || log.title;
                              const cat = log.proteinType || determineProteinType(cutName);
                              const subcat = log.proteinSubcategory || log.gameSubcategory || determineProteinSubcategory(cat, cutName);

                              const newCut: VerifiedMeatCut = {
                                id: `cut-chargpt-cook-${log.id}-${Date.now().toString(36)}`,
                                name: cutName,
                                aliases: [log.title],
                                proteinType: cat as ProteinType,
                                proteinSubcategory: subcat,
                                gameSubcategory: (cat === 'Game' || cat === 'Wild Game') ? subcat : undefined,
                                primalOrigin: log.primalOrigin || `${cat} Primal Cut`,
                                description: log.notes || `Analysed cut extracted from cook log "${log.title}".`,
                                visualKeyFeatures: [`Extracted from Cook Log: "${log.title}"`],
                                idealSmokeTempF: log.idealSmokeTempF || log.smokeTemp || 225,
                                targetInternalTempF: log.targetInternalTempF || log.targetTemp || 203,
                                cookingStrategy: log.cookingStrategy || log.notes || `Smoked on ${log.smokerType || 'Smoker'}.`,
                                verifiedStatus: 'Local User Confirmed',
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                              };

                              addOrUpdateVerifiedMeatCut(newCut);
                              if (showToast) {
                                showToast(`✅ Added "${cutName}" to Meat Safety & BBQ Cook Target Temps Guide!`);
                              }
                            }}
                            className="py-2 px-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer border border-purple-500/30"
                            title="Add this analysed cut to Meat Safety & Target Temps Guide"
                          >
                            <Plus className="w-3.5 h-3.5 text-purple-400" />
                            <span>Add Cut to Guide</span>
                          </button>

                          {onEditCook && (
                            <button
                              type="button"
                              onClick={() => onEditCook(log)}
                              className="py-2 px-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer border border-orange-500/30"
                              title="Edit Smoke Log"
                            >
                              <FileText className="w-3.5 h-3.5 text-orange-400" />
                              <span>Edit</span>
                            </button>
                          )}

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
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Are you sure you want to delete cook log "${log.title}"?`)) {
                                onDeleteCook(log.id);
                              }
                            }}
                            title={`Delete cook log "${log.title}"`}
                            className="py-2 px-3 bg-red-600/15 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            <span>Delete</span>
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

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <SmokeStackQRScannerModal
          onClose={() => setShowQRScanner(false)}
          onScanSuccess={handleQRScanSuccess}
          showToast={showToast}
        />
      )}

      {/* Printable Physical Paper Log Sheet Modal */}
      {showPhysicalSheetModal && (
        <PhysicalLogSheetModal
          profile={profile}
          onClose={() => setShowPhysicalSheetModal(false)}
          onOpenScanner={() => {
            setShowPhysicalSheetModal(false);
            setShowQRScanner(true);
          }}
        />
      )}

      {/* PDF Cook Logs Extracted Modal */}
      {pdfModalData && (
        <PdfExtractedSheetsModal
          fileName={pdfModalData.fileName}
          method={pdfModalData.method}
          extractedLogs={pdfModalData.logs}
          onClose={() => setPdfModalData(null)}
          onOpenSheet={(log) => {
            onSelectCook(log);
          }}
          onAnalyzeWithAI={(log) => {
            if (onAskAIPitmaster) {
              onAskAIPitmaster(
                {
                  id: log.id,
                  name: log.title,
                  proteinType: log.proteinType,
                  proteinCut: log.proteinCut,
                } as any,
                `Please perform a complete Pitmaster AI analysis and critique on my extracted cook log: "${log.title}" (${log.proteinCut}, ${log.meatWeightLbs} lbs, ${log.hoursLogged} hours on ${log.smokerType}).`
              );
            }
          }}
          onOpenCertificate={onOpenCertificate}
          onDiscardSheet={(id) => {
            onDeleteCook(id);
          }}
        />
      )}

    </div>
  );
};
