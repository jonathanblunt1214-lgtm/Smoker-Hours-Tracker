import React, { useEffect, useState } from 'react';
import { Download, Share2, Smartphone, MonitorSmartphone } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type Props = {
  onOpenPlanner: () => void;
  onStartCook: () => void;
  onOpenCharGPT: () => void;
};

export const BrowserInstallShareWidget: React.FC<Props> = ({ onOpenPlanner, onStartCook, onOpenCharGPT }) => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setStandalone(window.matchMedia?.('(display-mode: standalone)').matches === true);
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    setInstallPrompt(null);
  };

  const share = async () => {
    const data = { title: 'Smoke Stack — Pitmaster Companion', text: 'Open Smoke Stack on another device.', url: window.location.origin };
    if (navigator.share) {
      await navigator.share(data).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(window.location.origin).catch(() => {});
  };

  return (
    <section className="mx-auto mt-4 w-full max-w-7xl px-4 sm:px-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-[#151515]/90 p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-2.5 text-orange-400"><MonitorSmartphone className="h-5 w-5" /></div>
          <div><h3 className="text-sm font-semibold text-white">Use Smoke Stack on every device</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Sign into the same account on Windows and Android. Firestore keeps the account dataset synchronized; offline changes reconcile when connectivity returns.</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!standalone && installPrompt && <button type="button" onClick={() => void install()} className="min-h-10 rounded-xl bg-orange-500 px-3 text-xs font-semibold text-zinc-950"><Download className="mr-1.5 inline h-4 w-4" />Install</button>}
          <button type="button" onClick={() => void share()} className="min-h-10 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-xs font-semibold text-zinc-200"><Share2 className="mr-1.5 inline h-4 w-4" />Share app</button>
          <button type="button" onClick={onStartCook} className="min-h-10 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-xs font-semibold text-zinc-200"><Smartphone className="mr-1.5 inline h-4 w-4" />Start cook</button>
          <button type="button" onClick={onOpenPlanner} className="min-h-10 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-xs font-semibold text-zinc-200">Planner</button>
          <button type="button" onClick={onOpenCharGPT} className="min-h-10 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-xs font-semibold text-zinc-200">CharGPT</button>
        </div>
      </div>
    </section>
  );
};
