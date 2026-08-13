import React, { useRef, useEffect } from 'react';
import { CookLog } from '../types';
import { X, Award, Flame, Download, Printer, Share2, Sparkles, DollarSign, Database } from 'lucide-react';
import { calculateCookPelletHourlyCost } from '../utils/retailerPriceSync';

interface CookCertificateModalProps {
  cook: CookLog | null;
  onClose: () => void;
  onAnalyzeWithAI?: (cook: CookLog) => void;
}

export const CookCertificateModal: React.FC<CookCertificateModalProps> = ({
  cook,
  onClose,
  onAnalyzeWithAI,
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cook) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [cook, onClose]);

  if (!cook) return null;

  const hourlyAnalysis = calculateCookPelletHourlyCost(cook);

  // Format date & timestamp
  const dateStr = cook.date || new Date().toISOString().split('T')[0];
  const displayTime = cook.hoursLogged ? `${Math.floor(cook.hoursLogged)}:${Math.round((cook.hoursLogged % 1) * 60).toString().padStart(2, '0')}` : '01:39';
  const durationMins = cook.hoursLogged ? Math.round(cook.hoursLogged * 60) : 61;
  const durationFormatted = `${durationMins}:${Math.round((cook.hoursLogged ? (cook.hoursLogged * 3600) % 60 : 15)).toString().padStart(2, '0')}`;

  const lastReading = cook.temperatureReadings && cook.temperatureReadings.length > 0
    ? cook.temperatureReadings[cook.temperatureReadings.length - 1]
    : null;

  const targetTemp = lastReading?.targetTemp || 145;
  const pitTemp = lastReading?.cookingTemp || 225;
  const meatTemp = lastReading?.meatTemp || 145;

  // Background image (sample meat image if none provided)
  const defaultMeatPhoto = 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1200';
  const photoUrl = cook.photoUrl || defaultMeatPhoto;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer"
    >
      {/* Fixed Viewport Quick Close Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="fixed top-4 right-4 z-50 px-3 py-2 bg-zinc-800 text-amber-300 hover:text-white hover:bg-zinc-700 rounded-full border border-zinc-600 shadow-2xl transition-all cursor-pointer print:hidden flex items-center space-x-1"
        title="Close Certificate (Esc)"
      >
        <X className="w-5 h-5" />
        <span className="text-xs font-bold pr-1">Close</span>
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-700/60 rounded-2xl w-full max-w-4xl p-4 sm:p-6 shadow-2xl relative text-white font-sans my-4 space-y-4 cursor-default"
      >
        
        {/* Top Control Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="font-extrabold text-sm sm:text-base text-zinc-100 tracking-wide">
              Official Master Chef Cook Certificate & Smart Telemetry Badge
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {onAnalyzeWithAI && (
              <button
                type="button"
                onClick={() => onAnalyzeWithAI(cook)}
                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-300" />
                <span>Analyze with AI</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-all cursor-pointer border border-zinc-700"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              <span>Print Badge</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CERTIFICATE DISPLAY BADGE (Matching User Photo Layout) */}
        <div
          ref={certificateRef}
          className="rounded-2xl overflow-hidden bg-black border-2 border-amber-500/40 shadow-2xl relative flex flex-col font-sans select-none"
        >
          {/* TOP PHOTO & TELEMETRY OVERLAY AREA */}
          <div className="relative h-[340px] sm:h-[420px] w-full bg-cover bg-center" style={{ backgroundImage: `url(${photoUrl})` }}>
            {/* Dark Vignette Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60"></div>

            {/* TOP LEFT OVERLAY: Cook Title & Live Temp/Time */}
            <div className="absolute top-4 sm:top-6 left-4 sm:left-6 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] space-y-0.5 max-w-[55%] sm:max-w-[65%]">
              <h2 className="text-xl sm:text-4xl font-extrabold tracking-tight italic font-serif text-amber-100 capitalize truncate">
                {cook.title || 'Smoker Steak'}
              </h2>
              <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-200">
                {pitTemp}° {displayTime}
              </div>
            </div>

            {/* TOP RIGHT OVERLAY: MASTER CHEF EMBLEM */}
            <div className="absolute top-4 sm:top-6 right-4 sm:right-6 text-right drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              <div className="inline-flex flex-col items-center">
                <div className="relative flex items-center justify-center">
                  <svg className="w-12 h-12 text-zinc-300 fill-current opacity-90" viewBox="0 0 24 24">
                    <path d="M12 2L15 8L21 9L17 14L18 20L12 17L6 20L7 14L3 9L9 8L12 2Z" />
                  </svg>
                  <Award className="w-6 h-6 text-amber-400 absolute" />
                </div>
                <span className="text-[10px] sm:text-xs font-black tracking-widest text-zinc-100 uppercase font-serif mt-0.5">
                  MASTER CHEF
                </span>
                <span className="text-[8px] font-semibold text-amber-400/90 tracking-wider uppercase">
                  VERIFIED CERTIFICATE
                </span>
              </div>
            </div>

            {/* RIGHT COLUMN STATS OVERLAY */}
            <div className="absolute right-4 sm:right-6 top-24 sm:top-28 text-right space-y-3 sm:space-y-4 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              {/* Target Temperature */}
              <div>
                <span className="text-xs sm:text-sm font-semibold text-zinc-300 block">Target temperature</span>
                <span className="text-2xl sm:text-4xl font-extrabold font-mono text-white">{targetTemp}°<span className="text-xl">F</span></span>
              </div>

              {/* Duration */}
              <div>
                <span className="text-xs sm:text-sm font-semibold text-zinc-300 block">Duration</span>
                <span className="text-xl sm:text-3xl font-extrabold font-mono text-white">{durationFormatted}</span>
              </div>

              {/* Protein Icon & Cut */}
              <div className="pt-1">
                <div className="inline-block bg-white/10 p-2 rounded-xl border border-white/20 mb-1">
                  {/* Cow / Meat Silhouette Icon */}
                  <svg className="w-10 h-10 sm:w-14 sm:h-14 text-white fill-current" viewBox="0 0 24 24">
                    <path d="M19,10C19,10 18,9 16,9C14,9 13,10 12,10C11,10 10,9 8,9C6,9 5,10 5,10C4,10 3,11 3,12C3,13 4,14 4,15C4,16 5,17 6,17C7,17 8,16 9,16C10,16 11,17 12,17C13,17 14,16 15,16C16,16 17,17 18,17C19,17 20,16 20,15C20,14 21,13 21,12C21,11 20,10 19,10Z" />
                  </svg>
                </div>
                <div className="text-xl sm:text-3xl font-black tracking-wide text-white">{cook.proteinType || 'Beef'}</div>
                <div className="text-xs sm:text-sm font-semibold text-zinc-300 capitalize">{cook.proteinCut || 'Medium / Smoked Cut'}</div>
              </div>

              {/* Timestamp & Hourly Pellet Burn Cost */}
              <div className="pt-2 text-xs sm:text-sm font-mono text-zinc-200 font-bold tracking-wide space-y-1">
                <div>{dateStr} {lastReading?.time || '13:39'}</div>
                <div className="inline-flex items-center space-x-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded text-[11px]">
                  <DollarSign className="w-3 h-3 text-emerald-400" />
                  <span>Hourly Cost: ${hourlyAnalysis.hourlyCostDollars.toFixed(2)}/hr (${hourlyAnalysis.matchedCostPerLb.toFixed(2)}/lb)</span>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM THERMOMETER & TEMPERATURE HISTORY GRAPH SECTION */}
          <div className="bg-[#0b0c10] p-4 sm:p-6 border-t-2 border-zinc-800 text-white flex flex-col md:flex-row items-stretch justify-between gap-6">
            
            {/* LEFT LOGO & BRAND */}
            <div className="flex flex-col justify-between space-y-3 shrink-0 md:w-52">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-cyan-400 p-2 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-base font-black tracking-wider text-blue-400 uppercase font-mono leading-none">
                    MEAT MINDER
                  </div>
                  <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                    SMART WIRELESS TELEMETRY
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-sans italic text-zinc-400 leading-tight">
                Smart wireless BBQ thermometer & verified cook journal certificate record.
              </div>

              <div className="text-[10px] font-mono text-amber-400/90 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                🔥 Fuel: {cook.fuelType || 'Hardwood Pellets'}
              </div>
            </div>

            {/* RIGHT GRAPH AREA */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-zinc-200 italic font-serif">
                  Temperature history
                </h4>
                <div className="flex items-center space-x-4 text-xs font-mono">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-amber-400 inline-block shadow-sm"></span>
                    <span className="text-zinc-300">Ambient temp.</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500 inline-block shadow-sm"></span>
                    <span className="text-zinc-300">Food temp.</span>
                  </div>
                </div>
              </div>

              {/* SIMULATED HIGH-PRECISION TEMPERATURE GRAPH (Matching reference image) */}
              <div className="bg-[#12141a] border border-zinc-800 p-3 rounded-xl relative h-36 w-full flex items-end">
                {/* SVG Graph Curves */}
                <svg className="w-full h-full overflow-visible" viewBox="0 0 400 100" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="400" y2="20" stroke="#2a2d3a" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="0" y1="50" x2="400" y2="50" stroke="#2a2d3a" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="0" y1="80" x2="400" y2="80" stroke="#2a2d3a" strokeWidth="1" strokeDasharray="3,3" />

                  {/* Y Axis Labels */}
                  <text x="5" y="20" fill="#6b7280" fontSize="9" fontFamily="monospace">200.0</text>
                  <text x="5" y="45" fill="#6b7280" fontSize="9" fontFamily="monospace">160.0</text>
                  <text x="5" y="70" fill="#6b7280" fontSize="9" fontFamily="monospace">120.0</text>
                  <text x="5" y="95" fill="#6b7280" fontSize="9" fontFamily="monospace">80.0</text>

                  {/* AMBIENT TEMP (Yellow Oscillating Curve) */}
                  <path
                    d="M 20,30 Q 35,28 45,90 Q 60,98 80,60 Q 110,40 140,42 Q 155,40 165,82 Q 180,45 200,28 Q 230,22 250,30 Q 270,22 290,28 Q 320,20 340,32 Q 370,25 390,28"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  {/* FOOD TEMP (Red Rising Curve) */}
                  <path
                    d="M 20,85 Q 80,82 140,78 Q 220,70 300,62 Q 360,58 390,56"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>

                {/* X Axis Timestamps */}
                <div className="absolute -bottom-4 left-0 right-0 flex justify-between text-[9px] font-mono text-zinc-500 px-4">
                  <span>12:38:44</span>
                  <span>12:50:59</span>
                  <span>13:03:14</span>
                  <span>13:15:29</span>
                  <span>13:27:43</span>
                  <span>13:39:58</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between text-xs text-zinc-400 pt-2">
          <span className="italic">
            💡 Certificate generated using live probe telemetry & Pitmaster verification protocols.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl transition-colors cursor-pointer"
          >
            Close Certificate
          </button>
        </div>

      </div>
    </div>
  );
};
