import React, { useState } from 'react';
import { CookLog } from '../types';
import { AI_PITMASTER_NAME } from '../constants/appName';
import { X, FileText, CheckCircle2, Sparkles, Award, Flame, Clock, Scale, Utensils, ExternalLink, ChevronRight, CheckSquare, Square, Trash2 } from 'lucide-react';

interface PdfExtractedSheetsModalProps {
  fileName: string;
  method: string;
  extractedLogs: CookLog[];
  onClose: () => void;
  onOpenSheet: (log: CookLog) => void;
  onAnalyzeWithAI?: (log: CookLog) => void;
  onOpenCertificate?: (log: CookLog) => void;
  onDiscardSheet?: (id: string) => void;
}

export const PdfExtractedSheetsModal: React.FC<PdfExtractedSheetsModalProps> = ({
  fileName,
  method,
  extractedLogs,
  onClose,
  onOpenSheet,
  onAnalyzeWithAI,
  onOpenCertificate,
  onDiscardSheet,
}) => {
  const [activeLogs, setActiveLogs] = useState<CookLog[]>(extractedLogs);
  const [selectedIds, setSelectedIds] = useState<string[]>(extractedLogs.map(l => l.id));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDiscardSelected = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Discard ${selectedIds.length} selected sheet(s)?`)) {
      const remaining = activeLogs.filter(l => !selectedIds.includes(l.id));
      setActiveLogs(remaining);
      setSelectedIds([]);
      if (onDiscardSheet) {
        selectedIds.forEach(id => onDiscardSheet(id));
      }
      if (remaining.length === 0) {
        onClose();
      }
    }
  };

  const proteinBadgeColors: Record<string, string> = {
    Beef: 'bg-red-500/20 text-red-300 border-red-500/30',
    Pork: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    Chicken: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    Turkey: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    Seafood: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    Lamb: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    Venison: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    Other: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#141416] border border-[#2a2a2e] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative text-[#e0e0e0]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#2a2a2e] bg-[#1a1a1e] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  PDF Cook Logs Analyzed ({activeLogs.length} Sheet{activeLogs.length === 1 ? '' : 's'} Created)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  {method || 'AI Gemini 3.6 Flash'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-md sm:max-w-xl">
                Source Document: <span className="text-zinc-200 font-medium">{fileName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#28282c] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Header bar */}
        <div className="px-4 py-3 bg-[#121214] border-b border-[#2a2a2e] flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex items-center space-x-2 text-zinc-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Each log in your PDF has been mapped to its own standalone Pitmaster Sheet.</span>
          </div>

          {selectedIds.length > 0 && selectedIds.length < activeLogs.length && (
            <button
              type="button"
              onClick={handleDiscardSelected}
              className="inline-flex items-center px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              <span>Discard Selected ({selectedIds.length})</span>
            </button>
          )}
        </div>

        {/* Scrollable Sheets List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {activeLogs.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              No cook log sheets available.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeLogs.map((log, idx) => {
                const isSelected = selectedIds.includes(log.id);
                const badgeStyle = proteinBadgeColors[log.proteinType] || proteinBadgeColors.Other;

                return (
                  <div
                    key={log.id}
                    className={`bg-[#1c1c20] border ${
                      isSelected ? 'border-orange-500/70 ring-1 ring-orange-500/30' : 'border-[#2a2a2e]'
                    } rounded-xl p-4 shadow-md flex flex-col justify-between hover:border-orange-500/50 transition-all space-y-3 relative group`}
                  >
                    <div>
                      {/* Top bar: Sheet Number, Protein Badge, Select Checkbox */}
                      <div className="flex items-center justify-between pb-2 border-b border-[#2a2a2e] gap-2">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => toggleSelect(log.id)}
                            className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            title={isSelected ? 'Unselect sheet' : 'Select sheet'}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-orange-500" />
                            ) : (
                              <Square className="w-4 h-4 text-zinc-500" />
                            )}
                          </button>
                          <span className="font-mono text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                            Sheet #{idx + 1}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeStyle}`}>
                            {log.proteinType} • {log.proteinCut}
                          </span>
                        </div>

                        <span className="text-[11px] font-mono text-zinc-400 font-semibold">
                          {log.date}
                        </span>
                      </div>

                      {/* Cook Title */}
                      <h3 className="text-sm font-bold text-white mt-2.5 line-clamp-1 group-hover:text-orange-400 transition-colors">
                        {log.title}
                      </h3>

                      {/* Quick Details Grid */}
                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-zinc-300 bg-[#121214] p-2.5 rounded-lg border border-[#26262a]">
                        <div className="flex items-center space-x-1.5">
                          <Scale className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          <span className="truncate">{log.meatWeightLbs || '--'} lbs</span>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="truncate">{log.hoursLogged || '--'} hrs</span>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <Flame className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <span className="truncate">{log.smokerType}</span>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <Utensils className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="truncate">{log.temperatureReadings?.length || 0} Temp Logs</span>
                        </div>
                      </div>

                      {/* Seasonings / Rubs */}
                      {log.seasoningRubs && (
                        <p className="text-[11px] text-zinc-400 mt-2 line-clamp-1">
                          <strong className="text-zinc-300">Rubs:</strong> {log.seasoningRubs}
                        </p>
                      )}

                      {/* Finished Notes preview */}
                      {log.finishedNotes && (
                        <p className="text-[11px] text-zinc-400 italic mt-1 line-clamp-2">
                          "{log.finishedNotes}"
                        </p>
                      )}
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="pt-2 border-t border-[#2a2a2e] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onOpenSheet(log);
                        }}
                        className="inline-flex items-center px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs rounded-lg transition-all cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                        <span>Open Sheet</span>
                      </button>

                      <div className="flex items-center space-x-1.5">
                        {onAnalyzeWithAI && (
                          <button
                            type="button"
                            onClick={() => onAnalyzeWithAI(log)}
                            className="p-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 transition-all cursor-pointer"
                            title={`Analyze with ${AI_PITMASTER_NAME}`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onOpenCertificate && (
                          <button
                            type="button"
                            onClick={() => onOpenCertificate(log)}
                            className="p-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 transition-all cursor-pointer"
                            title="View Master Chef Certificate"
                          >
                            <Award className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#2a2a2e] bg-[#1a1a1e] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-zinc-400">
            All {activeLogs.length} sheet(s) are saved into your Smoker Journal and available anytime.
          </span>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
            >
              Done - View All in Journal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
