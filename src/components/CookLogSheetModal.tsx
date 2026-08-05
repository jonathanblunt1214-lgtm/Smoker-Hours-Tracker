import React from 'react';
import { CookLog } from '../types';
import { X, Printer, Flame, CheckSquare, Square, FileText, Sparkles } from 'lucide-react';

interface CookLogSheetModalProps {
  cook: CookLog | null;
  onClose: () => void;
  onAnalyzeWithAI?: (cook: CookLog) => void;
}

export const CookLogSheetModal: React.FC<CookLogSheetModalProps> = ({
  cook,
  onClose,
  onAnalyzeWithAI,
}) => {
  if (!cook) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-amber-50/95 text-slate-900 border-2 border-amber-900/30 rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative font-sans my-8">
        
        {/* Top Actions bar (Non-printable) */}
        <div className="flex items-center justify-between pb-4 border-b border-amber-900/20 print:hidden">
          <div className="flex items-center space-x-2">
            <Flame className="w-5 h-5 text-amber-700" />
            <span className="font-bold text-amber-950">Official Pitmaster Smoker Journal Sheet</span>
          </div>
          <div className="flex items-center space-x-2">
            {onAnalyzeWithAI && (
              <button
                type="button"
                onClick={() => {
                  onAnalyzeWithAI(cook);
                }}
                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-orange-600 text-amber-100 font-extrabold text-xs hover:bg-orange-700 transition-colors shadow-sm cursor-pointer"
              >
                <Sparkles className="w-4 h-4 mr-1.5 text-amber-300" />
                Analyze with AI Pitmaster
              </button>
            )}
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
                {cook.title} <span className="text-sm font-normal text-amber-800">({cook.proteinCut})</span>
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

          </div>

        </div>

      </div>
    </div>
  );
};
