import React, { useState, useEffect } from 'react';
import { Tv, X, Flame, Bell, Volume2 } from 'lucide-react';

interface FireTVToastDetail {
  title: string;
  message: string;
  deviceName: string;
  overlayStyle: 'toast' | 'banner' | 'fullscreen';
  timestamp: string;
}

export const FireTVToastOverlay: React.FC = () => {
  const [toast, setToast] = useState<FireTVToastDetail | null>(null);

  useEffect(() => {
    const handleFireTVEvent = (e: Event) => {
      const customEv = e as CustomEvent<FireTVToastDetail>;
      if (customEv.detail) {
        setToast(customEv.detail);
      }
    };

    window.addEventListener('firetv-notification-event', handleFireTVEvent);
    return () => window.removeEventListener('firetv-notification-event', handleFireTVEvent);
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] max-w-md w-full p-2 pointer-events-none animate-bounce-short">
      <div className="bg-[#121318]/95 backdrop-blur-md border-2 border-[#FF9900] rounded-2xl shadow-[0_10px_35px_rgba(255,153,0,0.35)] p-4 text-white pointer-events-auto space-y-2 relative overflow-hidden">
        {/* Top Fire TV Banner Header */}
        <div className="flex items-center justify-between border-b border-[#FF9900]/30 pb-2">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-[#FF9900] text-zinc-950 flex items-center justify-center font-black shrink-0 shadow">
              <Tv className="w-4 h-4 fill-zinc-950" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-black text-[#FF9900] uppercase tracking-wider">
                  Amazon Fire TV Toast Alert
                </span>
                <span className="text-[9px] font-mono bg-[#FF9900]/20 text-[#FF9900] px-1.5 py-0.2 rounded font-bold">
                  {toast.deviceName}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">{toast.timestamp}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-1">
          <h4 className="text-sm font-extrabold text-amber-300 flex items-center space-x-2">
            <Flame className="w-4 h-4 text-[#FF9900] animate-pulse" />
            <span>{toast.title}</span>
          </h4>
          <p className="text-xs text-zinc-200 font-medium leading-relaxed">
            {toast.message}
          </p>
        </div>

        {/* Progress Bar Timer */}
        <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden mt-1">
          <div className="bg-gradient-to-r from-[#FF9900] to-amber-400 h-full animate-shrinkWidth" style={{ animationDuration: '8000ms' }} />
        </div>
      </div>
    </div>
  );
};
