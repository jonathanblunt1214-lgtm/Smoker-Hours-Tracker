import React, { useEffect, useRef, useState } from 'react';
import { SmokerProfile, CookLog } from '../types';
import QRCode from 'qrcode';
import { X, Printer, Flame, QrCode, Download, CheckSquare, Square, Sparkles } from 'lucide-react';

interface PhysicalLogSheetModalProps {
  profile?: SmokerProfile;
  cook?: CookLog | null;
  onClose: () => void;
  onOpenScanner?: () => void;
}

export const PhysicalLogSheetModal: React.FC<PhysicalLogSheetModalProps> = ({
  profile,
  cook,
  onClose,
  onOpenScanner,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Auto-filled values
  const todayDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateValue = cook?.date || todayDate;
  const smokerTypeVal = cook?.smokerType || profile?.smokerName || profile?.smokerType || 'Pellet Smoker';
  const pageNumberVal = cook?.pageNumber || 48;

  useEffect(() => {
    const generateSmokeStackQR = async () => {
      try {
        const qrPayload = JSON.stringify({
          app: 'SmokeStack',
          type: 'physical_smoker_log',
          smokerType: smokerTypeVal,
          date: dateValue,
          pageNumber: pageNumberVal,
          title: cook?.title || '',
          proteinType: cook?.proteinType || 'Beef',
          version: '1.0',
        });

        // High error correction level 'H' allows overlaying smoke stack icon in center
        const url = await QRCode.toDataURL(qrPayload, {
          errorCorrectionLevel: 'H',
          margin: 1,
          width: 200,
          color: {
            dark: '#2a0a00',
            light: '#ffffff',
          },
        });

        // Combine canvas to draw center smoke stack emblem
        const img = new Image();
        img.src = url;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 200;
          canvas.height = 200;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          ctx.drawImage(img, 0, 0, 200, 200);

          // Draw center SmokeStack icon badge
          const cx = 100;
          const cy = 100;
          const radius = 22;

          ctx.fillStyle = '#1a0500';
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
          ctx.fill();

          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Smoke stack Flame / Chimney icon in center
          ctx.fillStyle = '#f97316';
          ctx.font = 'bold 18px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('💨', cx, cy);

          setQrDataUrl(canvas.toDataURL('image/png'));
        };
      } catch (err) {
        console.error('Error generating SmokeStack QR:', err);
      }
    };

    generateSmokeStackQR();
  }, [smokerTypeVal, dateValue, pageNumberVal, cook]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white text-slate-950 border border-slate-300 rounded-2xl w-full max-w-4xl p-4 sm:p-8 shadow-2xl relative font-sans my-4 cursor-default print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none"
      >
        {/* Top Control Bar (Hidden on Print) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-600">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Physical Data Logging Sheet (Printable Paper Log)
              </h3>
              <p className="text-xs text-slate-500">
                Smoker type and current date are auto-filled for physical recording.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenScanner && (
              <button
                type="button"
                onClick={onOpenScanner}
                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 transition-colors shadow-sm cursor-pointer"
              >
                <QrCode className="w-4 h-4 mr-1.5" />
                Scan QR Code
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-1.5 rounded-lg bg-slate-900 text-amber-300 font-bold text-xs hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print / Download Log
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* REPLICA OF THE EXACT PHYSICAL LOG SHEET FROM USER IMAGE */}
        <div className="bg-white p-4 sm:p-6 border-2 border-black rounded-lg space-y-4 text-black font-sans mt-4 print:mt-0 print:border-2 print:border-black print:p-4">
          
          {/* HEADER SECTION */}
          <div className="border-2 border-black divide-y-2 divide-black">
            {/* Row 1: Smoker Log | Date: | Smoker type: | Page Number: */}
            <div className="grid grid-cols-12 divide-x-2 divide-black text-sm font-bold min-h-[44px]">
              <div className="col-span-4 sm:col-span-4 p-2 flex items-center">
                <span className="text-xl font-extrabold tracking-tight">Smoker Log</span>
              </div>
              <div className="col-span-3 sm:col-span-3 p-2 flex items-center space-x-1">
                <span className="font-semibold text-xs text-slate-700">Date:</span>
                <span className="font-mono text-sm underline font-bold">{dateValue}</span>
              </div>
              <div className="col-span-3 sm:col-span-3 p-2 flex items-center space-x-1">
                <span className="font-semibold text-xs text-slate-700">Smoker type:</span>
                <span className="font-mono text-xs font-bold truncate">{smokerTypeVal}</span>
              </div>
              <div className="col-span-2 sm:col-span-2 p-2 flex items-center space-x-1 justify-between">
                <span className="font-semibold text-[11px] text-slate-700">Page Number:</span>
                <span className="font-mono text-sm font-bold">{pageNumberVal}</span>
              </div>
            </div>

            {/* Row 2: What is cook? */}
            <div className="p-2 min-h-[44px] flex items-center space-x-2">
              <span className="font-bold text-xs uppercase tracking-wider">what is cook?:</span>
              <span className="font-mono text-sm font-semibold text-slate-800 border-b border-black border-dashed flex-1 pl-1">
                {cook?.title ? (cook.proteinCut && cook.proteinCut !== cook.title ? `${cook.title} (${cook.proteinCut})` : cook.title) : (cook?.proteinCut || '—')}
              </span>
            </div>
          </div>

          {/* MAIN TABLE + RIGHT SIDEBAR GRID */}
          <div className="grid grid-cols-12 border-2 border-black divide-x-2 divide-black">
            
            {/* LEFT 9 COLS: TIME & READINGS TABLE */}
            <div className="col-span-9 flex flex-col justify-between">
              <table className="w-full text-xs text-left divide-y-2 divide-black">
                <thead className="bg-slate-100 font-bold border-b-2 border-black text-black uppercase">
                  <tr className="divide-x-2 divide-black">
                    <th className="p-2 w-16">Time:</th>
                    <th className="p-2 w-20">Target temp:</th>
                    <th className="p-2 w-22">Cooking temp:</th>
                    <th className="p-2 w-20">Meat temp:</th>
                    <th className="p-2 w-22">Ambient temp:</th>
                    <th className="p-2">Actions taken: started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 font-mono text-xs">
                  {/* Row 1: Start entry */}
                  <tr className="divide-x-2 divide-black min-h-[36px]">
                    <td className="p-2 font-bold">{cook?.temperatureReadings?.[0]?.time || '___'}</td>
                    <td className="p-2">{cook?.temperatureReadings?.[0]?.targetTemp ? `${cook.temperatureReadings[0].targetTemp}°F` : ''}</td>
                    <td className="p-2">{cook?.temperatureReadings?.[0]?.cookingTemp ? `${cook.temperatureReadings[0].cookingTemp}°F` : ''}</td>
                    <td className="p-2">{cook?.temperatureReadings?.[0]?.meatTemp ? `${cook.temperatureReadings[0].meatTemp}°F` : ''}</td>
                    <td className="p-2">{cook?.temperatureReadings?.[0]?.ambientTemp ? `${cook.temperatureReadings[0].ambientTemp}°F` : ''}</td>
                    <td className="p-2 font-sans text-xs">
                      {cook?.temperatureReadings?.[0]?.actionsTaken || 'Start'}
                    </td>
                  </tr>

                  {/* Empty rows for manual recording during cook */}
                  {Array.from({ length: 4 }).map((_, idx) => {
                    const r = cook?.temperatureReadings?.[idx + 1];
                    return (
                      <tr key={idx} className="divide-x-2 divide-black min-h-[36px]">
                        <td className="p-2.5">{r?.time || ''}</td>
                        <td className="p-2.5">{r?.targetTemp ? `${r.targetTemp}°F` : ''}</td>
                        <td className="p-2.5">{r?.cookingTemp ? `${r.cookingTemp}°F` : ''}</td>
                        <td className="p-2.5">{r?.meatTemp ? `${r.meatTemp}°F` : ''}</td>
                        <td className="p-2.5">{r?.ambientTemp ? `${r.ambientTemp}°F` : ''}</td>
                        <td className="p-2.5 font-sans text-xs">{r?.actionsTaken || ''}</td>
                      </tr>
                    );
                  })}

                  {/* Row 6: Finish entry */}
                  <tr className="divide-x-2 divide-black min-h-[36px]">
                    {(() => {
                      const lastR = cook?.temperatureReadings?.[cook.temperatureReadings.length - 1];
                      const isMulti = (cook?.temperatureReadings?.length || 0) > 5;
                      return (
                        <>
                          <td className="p-2 font-bold">{isMulti ? lastR?.time || '' : ''}</td>
                          <td className="p-2">{isMulti && lastR?.targetTemp ? `${lastR.targetTemp}°F` : ''}</td>
                          <td className="p-2">{isMulti && lastR?.cookingTemp ? `${lastR.cookingTemp}°F` : ''}</td>
                          <td className="p-2">{isMulti && lastR?.meatTemp ? `${lastR.meatTemp}°F` : ''}</td>
                          <td className="p-2">{isMulti && lastR?.ambientTemp ? `${lastR.ambientTemp}°F` : ''}</td>
                          <td className="p-2 font-sans font-bold text-xs flex justify-between items-center">
                            <span>{isMulti ? (lastR?.actionsTaken || 'finished') : ''}</span>
                            {!isMulti && <span className="font-bold uppercase tracking-wider text-right w-full">finished</span>}
                          </td>
                        </>
                      );
                    })()}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* RIGHT 3 COLS: HOURS TO DATE & PROTEIN SELECTION */}
            <div className="col-span-3 flex flex-col justify-between divide-y-2 divide-black font-sans text-xs">
              
              <div className="p-2 text-center font-bold bg-slate-100 border-b-2 border-black leading-snug">
                Hours to date
              </div>

              <div className="p-2 space-y-2">
                <div className="space-y-0.5">
                  <span className="block text-[11px] font-semibold text-slate-700">Hours logged this smoke:</span>
                  <div className="font-mono text-sm font-bold border-b border-black border-dashed min-h-[22px]">
                    {cook?.hoursLogged ? cook.hoursLogged.toFixed(1) : ''}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="block text-[11px] font-semibold text-slate-700">Previous Hours:</span>
                  <div className="font-mono text-xs border-b border-black border-dashed min-h-[20px]">
                    {cook?.startingSmokerHours ? cook.startingSmokerHours.toFixed(1) : ''}
                  </div>
                </div>
              </div>

              <div className="p-2 space-y-1.5 flex-1">
                <span className="font-bold text-xs block uppercase">Protein Type:</span>
                
                <div className="space-y-1 font-sans text-xs pt-1">
                  {(['Beef', 'Chicken', 'Pork', 'Seafood', 'Other'] as const).map((pType) => {
                    const isChecked = cook?.proteinType === pType;
                    return (
                      <div key={pType} className="flex items-center space-x-1.5">
                        <span className="font-mono font-bold text-sm">
                          {isChecked ? '( ✓ )' : '(   )'}
                        </span>
                        <span className={isChecked ? 'font-bold' : ''}>{pType}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>

          {/* BOTTOM SECTION: FINISHING & SERVING + WOULD I MAKE AGAIN */}
          <div className="border-2 border-black divide-y-2 divide-black text-xs font-sans">
            
            {/* Finishing & Serving */}
            <div className="p-2 min-h-[50px]">
              <span className="font-bold block uppercase mb-0.5">
                Finishing and serving (seasoning, sauces):
              </span>
              <p className="font-mono text-xs text-slate-800">
                {cook ? `Rub: ${cook.seasoningRubs || 'None'} | Sauce: ${cook.saucesGlazes || 'None'} | Fuel: ${cook.fuelType || ''}` : ''}
              </p>
            </div>

            {/* Finished product & Would I make again */}
            <div className="grid grid-cols-12 divide-x-2 divide-black min-h-[60px]">
              <div className="col-span-8 p-2">
                <span className="font-bold block uppercase mb-0.5">Finished product:</span>
                <p className="font-mono text-xs text-slate-800">{cook?.finishedNotes || ''}</p>
              </div>

              <div className="col-span-4 p-2 space-y-1">
                <span className="font-bold block uppercase text-[11px]">Would I make again?:</span>
                <div className="space-y-1 font-mono text-xs font-bold pt-0.5">
                  <div>[ {cook?.wouldMakeAgain === true ? '✓' : ' '} ] yes</div>
                  <div>[ {cook?.wouldMakeAgain === false ? '✓' : ' '} ] No</div>
                </div>
              </div>
            </div>

            {/* Next time */}
            <div className="p-2 min-h-[44px]">
              <span className="font-bold block uppercase mb-0.5">Next time:</span>
              <p className="font-mono text-xs text-slate-800">{cook?.nextTimeNotes || ''}</p>
            </div>

          </div>

          {/* FOOTER: SMOKE STACK-ONLY QR CODE */}
          <div className="pt-2 border-t-2 border-black flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              {qrDataUrl ? (
                <div className="p-1 bg-white border border-black rounded shadow-sm shrink-0">
                  <img src={qrDataUrl} alt="SmokeStack QR Code" className="w-20 h-20 object-contain" />
                </div>
              ) : (
                <div className="w-20 h-20 bg-slate-100 border border-black flex items-center justify-center text-xs font-mono">
                  Loading QR...
                </div>
              )}
              <div>
                <div className="flex items-center space-x-1 font-bold text-sm">
                  <Flame className="w-4 h-4 text-orange-600" />
                  <span>SmokeStack Official Log Sheet</span>
                </div>
                <p className="text-[11px] text-slate-600 max-w-sm mt-0.5 font-mono">
                  Scan this SmokeStack QR code using your camera or upload this log sheet image in Cook Journal to instantly load or update cook data.
                </p>
                <div className="text-[10px] font-mono text-slate-400 mt-1">
                  ID: {cook?.id || `PHYSICAL-${Date.now().toString(36).toUpperCase()}`}
                </div>
              </div>
            </div>

            <div className="text-right text-[10px] font-mono text-slate-500 hidden sm:block">
              <div>SmokeStack Pitmaster Edition</div>
              <div>Auto-filled {dateValue}</div>
            </div>
          </div>

        </div>

        {/* Bottom Modal Close Bar (Hidden on Print) */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-500 font-mono">
            Smoker: <strong className="text-slate-800">{smokerTypeVal}</strong> | Date: <strong className="text-slate-800">{dateValue}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Close Sheet
          </button>
        </div>

      </div>
    </div>
  );
};
