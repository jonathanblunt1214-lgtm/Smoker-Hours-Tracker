import React, { useEffect, useState } from 'react';
import { Apple, CheckCircle2, Download, ExternalLink, Monitor, Smartphone, X } from 'lucide-react';

interface AppDownloadStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRaspberryPiSettings?: () => void;
}

export const AppDownloadStoreModal: React.FC<AppDownloadStoreModalProps> = ({
  isOpen,
  onClose,
  onOpenRaspberryPiSettings,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installMessage, setInstallMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallMessage('SmokeStack is installed on this device.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (!isOpen) return null;

  const installPwa = async () => {
    setInstallMessage(null);
    if (!deferredPrompt) {
      setInstallMessage('This browser did not offer an automatic install prompt. Use your browser menu and choose “Install app” or “Add to Home Screen” if available.');
      return;
    }

    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result?.outcome === 'accepted') {
      setIsInstalled(true);
      setInstallMessage('SmokeStack installation was accepted.');
      setDeferredPrompt(null);
    } else {
      setInstallMessage('Installation was not completed.');
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-800 bg-[#111] shadow-2xl">
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Get SmokeStack</h2>
            <p className="mt-1 text-xs text-zinc-500">Current installation and distribution options</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white" aria-label="Close"><X className="h-5 w-5" /></button>
        </header>

        <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2">
          <section className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-orange-500/15 p-2.5 text-orange-400"><Download className="h-5 w-5" /></div>
              <div>
                <h3 className="font-semibold text-white">Web app / PWA</h3>
                <p className="mt-1 text-sm leading-6 text-zinc-400">Use the current SmokeStack web application and install it from supported browsers.</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              {isInstalled ? 'Installed on this device' : 'Available from this web application'}
            </div>
            <button type="button" onClick={installPwa} disabled={isInstalled} className="mt-4 w-full rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:cursor-default disabled:opacity-50">
              {isInstalled ? 'Installed' : 'Install web app'}
            </button>
            {installMessage && <p className="mt-3 text-xs leading-5 text-zinc-500">{installMessage}</p>}
          </section>

          <StoreStatus icon={<Apple className="h-5 w-5" />} title="Apple App Store" status="Not yet published" description="The native iOS release will appear here only after a real App Store submission is approved and publicly available." />
          <StoreStatus icon={<Smartphone className="h-5 w-5" />} title="Google Play" status="Not yet published" description="The native Android release will appear here only after a real Google Play release is published." />

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-zinc-900 p-2.5 text-zinc-300"><Monitor className="h-5 w-5" /></div>
              <div>
                <h3 className="font-semibold text-white">Raspberry Pi / kiosk</h3>
                <p className="mt-1 text-sm leading-6 text-zinc-400">Use SmokeStack in a browser or kiosk environment. Hardware-specific configuration remains a user-controlled setup option.</p>
              </div>
            </div>
            {onOpenRaspberryPiSettings && (
              <button type="button" onClick={onOpenRaspberryPiSettings} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-900">
                Open device settings <ExternalLink className="h-4 w-4" />
              </button>
            )}
          </section>
        </div>

        <div className="border-t border-zinc-800 px-5 py-4 text-xs leading-5 text-zinc-500">
          SmokeStack does not claim App Store, Google Play, desktop-store, browser-extension, or other marketplace availability until that distribution channel has a real published release.
        </div>
      </div>
    </div>
  );
};

const StoreStatus: React.FC<{ icon: React.ReactNode; title: string; status: string; description: string }> = ({ icon, title, status, description }) => (
  <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-zinc-900 p-2.5 text-zinc-300">{icon}</div>
      <div>
        <h3 className="font-semibold text-white">{title}</h3>
        <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-amber-400">{status}</div>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
      </div>
    </div>
  </section>
);
