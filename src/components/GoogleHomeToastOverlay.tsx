import React, { useState, useEffect } from 'react';
import { Home, X, Flame, Volume2 } from 'lucide-react';

interface GoogleHomeToastDetail {
  title: string;
  message: string;
  deviceName: string;
  timestamp: string;
}

export const GoogleHomeToastOverlay: React.FC = () => {
  const [toast, setToast] = useState<GoogleHomeToastDetail | null>(null);

  useEffect(() => {
    const handleGoogleHomeEvent = (e: Event) => {
      const customEv = e as CustomEvent<GoogleHomeToastDetail>;
      if (customEv.detail) {
        setToast(customEv.detail);
      }
    };

    window.addEventListener('googlehome-notification-event', handleGoogleHomeEvent);
    return () => window.removeEventListener('googlehome-notification-event', handleGoogleHomeEvent);
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
    <div className="fixed bottom-4 right-4 z-[9999] max-w-md w-full p-2 pointer-events-none animate-bounce-short">
      <div className="bg-[#111827]/95 backdrop-blur-md border-2 border-[#4285F4] rounded-2xl shadow-[0_10px_35px_rgba(66,133,244,0.35)] p-4 text-white pointer-events-auto space-y-2 relative overflow-hidden">
        {/* Top Google Home Header */}
        <div className="flex items-center justify-between border-b border-[#4285F4]/30 pb-2">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-[#4285F4] text-white flex items-center justify-center font-black shrink-0 shadow">
              <Home className="w-4 h-4 fill-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-black text-[#4285F4] uppercase tracking-wider flex items-center gap-1">
                  <span>Google Assistant Broadcast</span>
                  <Volume2 className="w-3 h-3 text-[#34A853] animate-pulse" />
                </span>
                <span className="text-[9px] font-mono bg-[#4285F4]/20 text-[#4285F4] px-1.5 py-0.2 rounded font-bold">
                  {toast.deviceName}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">{toast.timestamp}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Close Google Home Notification"
            className="p-1 text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-1">
          <h4 className="text-sm font-extrabold text-blue-300 flex items-center space-x-2">
            <Flame className="w-4 h-4 text-[#EA4335] animate-pulse" />
            <span>{toast.title}</span>
          </h4>
          <p className="text-xs text-zinc-200 font-medium leading-relaxed">
            "{toast.message}"
          </p>
        </div>

        {/* Progress Bar Timer */}
        <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden mt-1">
          <div className="bg-gradient-to-r from-[#4285F4] via-[#EA4335] to-[#FBBC05] h-full animate-shrinkWidth" style={{ animationDuration: '8000ms' }} />
        </div>
      </div>
    </div>
  );
};
