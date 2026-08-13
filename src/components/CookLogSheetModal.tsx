import React, { useEffect, useState } from 'react';
import { CookLog } from '../types';
import { AI_PITMASTER_NAME } from '../constants/appName';
import { ThermalCurveAnalyticsCard } from './ThermalCurveAnalyticsCard';
import { PhysicalLogSheetModal } from './PhysicalLogSheetModal';
import QRCode from 'qrcode';
import { X, Printer, Flame, CheckSquare, Square, FileText, Sparkles, Award, DollarSign, Database, TrendingDown, ShoppingBag, QrCode, Download, Trash2 } from 'lucide-react';
import { calculateCookPelletHourlyCost } from '../utils/retailerPriceSync';

interface CookLogSheetModalProps {
  cook: CookLog | null;
  onClose: () => void;
  onAnalyzeWithAI?: (cook: CookLog) => void;
  onOpenCertificate?: (cook: CookLog) => void;
  onEditCook?: (cook: CookLog) => void;
  onDeleteCook?: (id: string) => void;
}

export const CookLogSheetModal: React.FC<CookLogSheetModalProps> = ({
  cook,
  onClose,
  onAnalyzeWithAI,
  onOpenCertificate,
  onEditCook,
  onDeleteCook,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showPhysicalSheetModal, setShowPhysicalSheetModal] = useState<boolean>(false);

  useEffect(() => {
    if (!cook) return;

    const generateSmokeStackQR = async () => {
      try {
        const payload = JSON.stringify({
          app: 'SmokeStack',
          type: 'cook_log_sheet',
          id: cook.id,
          title: cook.title,
          smokerType: cook.smokerType,
          date: cook.date,
          proteinType: cook.proteinType,
          pageNumber: cook.pageNumber || 48,
          readingsCount: cook.temperatureReadings.length,
          v: '1.0',
        });

        const url = await QRCode.toDataURL(payload, {
          errorCorrectionLevel: 'H',
          margin: 1,
          width: 180,
          color: {
            dark: '#3b1202',
            light: '#fffbeb',
          },
        });

        const img = new Image();
        img.src = url;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 180;
          canvas.height = 180;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          ctx.drawImage(img, 0, 0, 180, 180);

          // Center SmokeStack emblem badge
          const cx = 90;
          const cy = 90;
          ctx.fillStyle = '#2d0c02';
          ctx.beginPath();
          ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
          ctx.fill();

          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#f97316';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('💨', cx, cy);

          setQrDataUrl(canvas.toDataURL('image/png'));
        };
      } catch (err) {
        console.error('Error rendering SmokeStack QR code:', err);
      }
    };

    generateSmokeStackQR();

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

  const handlePrint = () => {
    window.print();
  };

  const hourlyAnalysis = calculateCookPelletHourlyCost(cook);

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
        className="fixed top-4 right-4 z-50 px-3 py-2 bg-slate-900/90 text-amber-300 hover:text-white hover:bg-slate-800 rounded-full border border-amber-500/40 shadow-2xl transition-all cursor-pointer print:hidden flex items-center space-x-1"
        title="Close Journal Sheet (Esc)"
      >
        <X className="w-5 h-5" />
        <span className="text-xs font-bold pr-1">Close</span>
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-amber-50/95 text-slate-900 border-2 border-amber-900/30 rounded-2xl w-full max-w-4xl p-4 sm:p-8 shadow-2xl relative font-sans my-4 sm:my-8 cursor-default"
      >
        
        {/* Top Actions bar (Non-printable) */}
        <div className="flex items-center justify-between pb-4 border-b border-amber-900/20 print:hidden">
          <div className="flex items-center space-x-2">
            <Flame className="w-5 h-5 text-amber-700" />
            <span className="font-bold text-amber-950 text-sm sm:text-base">Official Pitmaster Smoker Journal Sheet</span>
          </div>
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {onEditCook && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditCook(cook);
                }}
                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-orange-500 text-zinc-950 font-black text-xs hover:bg-orange-400 transition-colors shadow-sm cursor-pointer"
              >
                <FileText className="w-4 h-4 mr-1.5" />
                <span>Edit Smoke Log</span>
              </button>
            )}
            {onDeleteCook && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete cook log "${cook.title}"?`)) {
                    onDeleteCook(cook.id);
                    onClose();
                  }
                }}
                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-red-600/20 text-red-700 hover:bg-red-600/30 border border-red-600/40 font-bold text-xs transition-colors shadow-sm cursor-pointer"
                title="Delete Cook Log Entry"
              >
                <Trash2 className="w-4 h-4 mr-1.5 text-red-600" />
                <span>Delete</span>
              </button>
            )}
            {onOpenCertificate && (
              <button
                type="button"
                onClick={() => onOpenCertificate(cook)}
                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-600 text-white font-extrabold text-xs hover:bg-amber-500 transition-colors shadow-sm cursor-pointer border border-amber-700"
              >
                <Award className="w-4 h-4 mr-1.5 text-amber-200" />
                <span>🏆 Master Chef Certificate</span>
              </button>
            )}
            {onAnalyzeWithAI && (
              <button
                type="button"
                onClick={() => {
                  onAnalyzeWithAI(cook);
                }}
                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-orange-600 text-amber-100 font-extrabold text-xs hover:bg-orange-700 transition-colors shadow-sm cursor-pointer"
              >
                <Sparkles className="w-4 h-4 mr-1.5 text-amber-300" />
                Analyze with {AI_PITMASTER_NAME}
              </button>
            )}
            <button
              onClick={() => setShowPhysicalSheetModal(true)}
              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-800 text-amber-100 font-semibold text-xs hover:bg-amber-900 transition-colors cursor-pointer border border-amber-900/40"
              title="Download physical data logging sheet with auto-filled date and smoker"
            >
              <Download className="w-4 h-4 mr-1.5 text-amber-300" />
              Physical Log Sheet
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-900 text-amber-300 font-semibold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print Sheet
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-amber-200/50 transition-colors cursor-pointer"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PHYSICAL PAPER SMOKER LOG REPLICA */}
        <div className="bg-amber-50 p-4 sm:p-6 border border-amber-900/20 rounded-xl space-y-6 text-amber-950 mt-4 print:p-0 print:border-none">
          
          {/* HEADER ROW */}
          <div className="border-b-2 border-amber-900/40 pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h1 className="text-3xl font-extrabold tracking-wider uppercase font-serif text-amber-950">
                  Smoker Log
                </h1>
                <p className="text-xs font-mono text-amber-800">Pit Boss & Pellet Smoker Runtime Record</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-sm font-semibold border border-amber-900/30 p-3 rounded-lg bg-amber-100/60">
                <div>
                  <span className="text-amber-800 font-serif block text-xs">Date:</span>
                  <span className="font-mono text-amber-950">{cook.date}</span>
                </div>
                <div>
                  <span className="text-amber-800 font-serif block text-xs">Smoker type:</span>
                  <span className="font-mono text-amber-950">{cook.smokerType}</span>
                </div>
                <div>
                  <span className="text-amber-800 font-serif block text-xs">Page Number:</span>
                  <span className="font-mono text-amber-950 font-bold">{cook.pageNumber || 48}</span>
                </div>
                <div>
                  <span className="text-amber-800 font-serif block text-xs">Weather / ZIP:</span>
                  <span className="font-mono text-amber-950 text-xs">
                    {cook.weatherConditions ? cook.weatherConditions : (cook.zipcode ? `ZIP ${cook.zipcode}` : 'Clear / Recorded')}
                  </span>
                </div>
              </div>
            </div>

            {/* WHAT IS COOK */}
            <div className="mt-4 pt-3 border-t border-amber-900/20">
              <span className="text-xs font-bold uppercase tracking-wider font-serif text-amber-900">
                what is cook?
              </span>
              <div className="text-lg font-bold font-mono text-amber-950 border-b-2 border-dashed border-amber-900/40 pb-1 mt-1">
                {cook.title} {cook.proteinCut && cook.proteinCut !== cook.title && <span className="text-sm font-normal text-amber-800">({cook.proteinCut})</span>}
              </div>
            </div>
          </div>

          {/* MAIN GRID: TEMPERATURE LOG + SMOKER HOURS & PROTEIN SELECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT 2 COLS: TIME & TEMPERATURE READINGS TABLE */}
            <div className="lg:col-span-2 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider font-serif text-amber-900">
                  Cook Readings & Actions Taken
                </span>
                <span className="text-[11px] font-mono text-amber-800">Pit Target vs Meat Internal</span>
              </div>

              <div className="overflow-x-auto border border-amber-900/30 rounded-lg bg-amber-100/40">
                <table className="w-full text-xs text-left text-amber-950">
                  <thead className="bg-amber-200/80 font-serif text-amber-950 uppercase border-b border-amber-900/30">
                    <tr>
                      <th className="px-2 py-2 font-bold border-r border-amber-900/20">Time</th>
                      <th className="px-2 py-2 font-bold border-r border-amber-900/20">Target °F</th>
                      <th className="px-2 py-2 font-bold border-r border-amber-900/20">Cook °F</th>
                      <th className="px-2 py-2 font-bold border-r border-amber-900/20">Meat °F</th>
                      <th className="px-2 py-2 font-bold border-r border-amber-900/20">Ambient °F</th>
                      <th className="px-2 py-2 font-bold">Actions taken: started / spritz / wrap / finish</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-900/20 font-mono">
                    {cook.temperatureReadings.map((reading) => (
                      <tr key={reading.id} className="hover:bg-amber-200/40">
                        <td className="px-2 py-2 font-bold border-r border-amber-900/20 whitespace-nowrap">
                          {reading.time}
                        </td>
                        <td className="px-2 py-2 border-r border-amber-900/20 text-slate-700">
                          {reading.targetTemp}°F
                        </td>
                        <td className="px-2 py-2 border-r border-amber-900/20 font-semibold text-orange-900">
                          {reading.cookingTemp}°F
                        </td>
                        <td className="px-2 py-2 border-r border-amber-900/20 font-bold text-red-900">
                          {reading.meatTemp}°F
                        </td>
                        <td className="px-2 py-2 border-r border-amber-900/20 text-slate-700">
                          {reading.ambientTemp}°F
                        </td>
                        <td className="px-2 py-2 text-amber-950 font-sans">{reading.actionsTaken}</td>
                      </tr>
                    ))}
                    {/* Fill blank rows if fewer than 6 readings for printable paper log sheet aesthetic */}
                    {Array.from({ length: Math.max(0, 6 - cook.temperatureReadings.length) }).map((_, idx) => (
                      <tr key={`blank-${idx}`}>
                        <td className="px-2 py-2 border-r border-amber-900/20">&nbsp;</td>
                        <td className="px-2 py-2 border-r border-amber-900/20"></td>
                        <td className="px-2 py-2 border-r border-amber-900/20"></td>
                        <td className="px-2 py-2 border-r border-amber-900/20"></td>
                        <td className="px-2 py-2 border-r border-amber-900/20"></td>
                        <td className="px-2 py-2"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SAVED THERMAL CURVE ANALYTICS WITHIN COOK LOG */}
              <div className="pt-2">
                <ThermalCurveAnalyticsCard cook={cook} title="Thermal Curve Analytics & Saved Performance" isPublished={cook.isPublishedToTotalHours} />
              </div>
            </div>

            {/* RIGHT 1 COL: HOURS BOX & PROTEIN SELECTION */}
            <div className="space-y-4">
              
              {/* HOURS BOX (Matching Prompt layout) */}
              <div className="border-2 border-amber-900/40 rounded-xl p-3 bg-amber-100/70 space-y-2">
                <div className="text-center font-serif font-bold border-b border-amber-900/30 pb-1 text-amber-950">
                  Smoker Hours Log
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between items-center font-semibold">
                    <span className="font-serif">Hours to date:</span>
                    <span className="font-mono text-sm font-bold text-amber-950">
                      {cook.endingSmokerHours.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-amber-900/20">
                    <span className="font-serif text-amber-900">Hours logged this smoke:</span>
                    <span className="font-mono font-bold text-amber-900">{cook.hoursLogged.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-amber-900/20">
                    <span className="font-serif text-amber-900">Previous Hours:</span>
                    <span className="font-mono text-amber-800">{cook.startingSmokerHours.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* PROTEIN TYPE CHECKBOXES */}
              <div className="border border-amber-900/30 rounded-xl p-3 bg-amber-100/40 space-y-2">
                <span className="text-xs font-bold font-serif uppercase text-amber-950 block border-b border-amber-900/20 pb-1">
                  Protein Type:
                </span>
                
                <div className="space-y-1.5 text-xs font-mono">
                  {(['Beef', 'Chicken', 'Pork', 'Seafood', 'Other'] as const).map((pType) => {
                    const isSelected = cook.proteinType === pType;
                    return (
                      <div key={pType} className="flex items-center space-x-2">
                        <span className="font-bold">{isSelected ? '[ ✓ ]' : '[   ]'}</span>
                        <span className={`font-sans ${isSelected ? 'font-bold text-amber-950' : 'text-amber-800'}`}>
                          {pType}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>

          {/* BOTTOM SECTION: FINISHING & SERVING + WOULD I MAKE AGAIN */}
          <div className="border-t-2 border-amber-900/30 pt-4 space-y-4 text-xs">
            
            {/* Finishing & Serving */}
            <div>
              <span className="font-bold font-serif uppercase text-amber-950 block mb-1">
                Finishing and serving (seasoning, sauces):
              </span>
              <div className="bg-amber-100/60 p-2.5 rounded-lg border border-amber-900/20 font-mono text-amber-950">
                <p><strong>Rub:</strong> {cook.seasoningRubs || 'Standard BBQ Rub'}</p>
                <p className="mt-1"><strong>Sauce / Glaze:</strong> {cook.saucesGlazes || 'None / Served on side'}</p>
                <p className="mt-1"><strong>Fuel Used:</strong> {cook.fuelType}</p>
              </div>
            </div>

            {/* PELLET DATABASE HOURLY COST ANALYSIS */}
            <div className="bg-gradient-to-r from-emerald-900/10 via-amber-100/80 to-emerald-900/10 p-3.5 rounded-xl border border-emerald-800/30 space-y-2">
              <div className="flex items-center justify-between border-b border-amber-900/20 pb-1.5">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-emerald-800" />
                  <span className="font-extrabold font-serif uppercase text-amber-950 text-xs tracking-wider">
                    Pellet Database Hourly Burn Cost Analysis
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-800/10 text-emerald-900 px-2 py-0.5 rounded border border-emerald-800/20">
                  Synced Retail Prices
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs pt-1">
                <div className="bg-amber-100/80 p-2 rounded-lg border border-amber-900/20">
                  <span className="text-[10px] text-amber-900 block font-serif">Fuel Price / lb:</span>
                  <span className="font-bold text-emerald-900 text-sm">
                    ${hourlyAnalysis.matchedCostPerLb.toFixed(2)} / lb
                  </span>
                  <span className="text-[10px] text-amber-800 block truncate">
                    ({hourlyAnalysis.matchedBrand})
                  </span>
                </div>

                <div className="bg-amber-100/80 p-2 rounded-lg border border-amber-900/20">
                  <span className="text-[10px] text-amber-900 block font-serif">Burn Rate:</span>
                  <span className="font-bold text-amber-950 text-sm">
                    {hourlyAnalysis.burnRateLbsPerHr} lbs / hr
                  </span>
                  <span className="text-[10px] text-amber-800 block">
                    ({hourlyAnalysis.totalFuelLbs} lbs used)
                  </span>
                </div>

                <div className="bg-amber-100/80 p-2 rounded-lg border border-amber-900/20">
                  <span className="text-[10px] text-amber-900 block font-serif">Hourly Cook Cost:</span>
                  <span className="font-bold text-emerald-900 text-sm">
                    ${hourlyAnalysis.hourlyCostDollars.toFixed(2)} / hr
                  </span>
                  <span className="text-[10px] text-amber-800 block">
                    (Pit burn expense)
                  </span>
                </div>

                <div className="bg-amber-100/80 p-2 rounded-lg border border-amber-900/20">
                  <span className="text-[10px] text-amber-900 block font-serif">Total Fuel Expense:</span>
                  <span className="font-bold text-amber-950 text-sm">
                    ${hourlyAnalysis.totalCookFuelCostDollars.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-emerald-800 font-semibold block">
                    {hourlyAnalysis.costSavingsComparedToAvg >= 0
                      ? `Saved $${Math.abs(hourlyAnalysis.costSavingsComparedToAvg).toFixed(2)} vs avg`
                      : `$${Math.abs(hourlyAnalysis.costSavingsComparedToAvg).toFixed(2)} over avg`}
                  </span>
                </div>
              </div>
            </div>

            {/* Finished Product & Next Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-bold font-serif uppercase text-amber-950 block mb-1">
                  Finished product:
                </span>
                <div className="bg-amber-100/60 p-2.5 rounded-lg border border-amber-900/20 font-sans text-amber-950 min-h-[60px]">
                  {cook.finishedNotes || 'Moist, flavorful smoke ring.'}
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="font-bold font-serif uppercase text-amber-950 block mb-1">
                    Would I make again?:
                  </span>
                  <div className="flex items-center space-x-4 font-mono font-bold text-sm bg-amber-100/80 p-2 rounded-lg border border-amber-900/20">
                    <span className={cook.wouldMakeAgain ? 'text-emerald-800' : 'text-slate-400'}>
                      {cook.wouldMakeAgain ? '[ ✓ ] YES' : '[   ] YES'}
                    </span>
                    <span className={!cook.wouldMakeAgain ? 'text-red-800' : 'text-slate-400'}>
                      {!cook.wouldMakeAgain ? '[ ✓ ] NO' : '[   ] NO'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="font-bold font-serif uppercase text-amber-950 block mb-1">
                    Next time:
                  </span>
                  <div className="bg-amber-100/60 p-2.5 rounded-lg border border-amber-900/20 font-sans text-amber-950">
                    {cook.nextTimeNotes || 'Repeat process.'}
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER: SMOKE STACK-ONLY QR CODE */}
            <div className="pt-3 border-t-2 border-amber-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                {qrDataUrl ? (
                  <div className="p-1 bg-amber-100 border border-amber-900/40 rounded shadow-sm shrink-0">
                    <img src={qrDataUrl} alt="SmokeStack QR Code" className="w-18 h-18 object-contain" />
                  </div>
                ) : (
                  <div className="w-18 h-18 bg-amber-100/60 border border-amber-900/30 flex items-center justify-center text-[10px] font-mono">
                    Generating QR...
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-1.5 font-bold font-serif text-sm text-amber-950">
                    <Flame className="w-4 h-4 text-orange-700" />
                    <span>SmokeStack Official Log Code</span>
                  </div>
                  <p className="text-[11px] text-amber-900 max-w-sm mt-0.5 font-mono">
                    Smoke stack-only QR code. Scan using mobile camera or upload log sheet image in Cook Journal to auto-import.
                  </p>
                </div>
              </div>

              <div className="text-right text-[10px] font-mono text-amber-900 hidden sm:block">
                <div>SmokeStack Pitmaster Edition</div>
                <div>Date: {cook.date}</div>
              </div>
            </div>

          </div>

        </div>

        {/* Bottom Close Button row (Non-printable) */}
        <div className="mt-6 pt-4 border-t border-amber-900/20 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <div className="text-xs text-amber-900 font-mono">
            Pitmaster Log Sheet ID: <span className="font-bold">{cook.id}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-amber-900 hover:bg-amber-950 text-amber-100 font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center space-x-2 border border-amber-700"
          >
            <X className="w-4 h-4" />
            <span>Close Journal Sheet</span>
          </button>
        </div>

      </div>

      {showPhysicalSheetModal && (
        <PhysicalLogSheetModal
          cook={cook}
          onClose={() => setShowPhysicalSheetModal(false)}
        />
      )}
    </div>
  );
};
