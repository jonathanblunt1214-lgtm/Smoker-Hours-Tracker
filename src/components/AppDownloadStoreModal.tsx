import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Smartphone,
  Apple,
  Monitor,
  Cpu,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Globe,
  HardDrive,
  Terminal,
  Layers,
  Sparkles,
  Play,
  ShieldCheck,
  Zap,
} from 'lucide-react';

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
  const [activeStoreTab, setActiveStoreTab] = useState<'pwa' | 'google-play' | 'apple-store' | 'microsoft-store' | 'raspberry-pi'>('pwa');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedDesktopEntry, setCopiedDesktopEntry] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleTriggerPwaInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      alert('PWA direct install is ready! If prompt does not appear, tap "Add to Home Screen" or "Install App" in your browser menu.');
    }
  };

  const piDesktopEntry = `[Desktop Entry]
Type=Application
Name=Smoke Stack Pitmaster
Comment=Pitmaster Cook Log & CharGPT AI Advisor
Exec=chromium-browser --kiosk --noerrdialogs --disable-infobars https://smoke-stack.app
Icon=utilities-terminal
Terminal=false
Categories=Utility;Food;
`;

  const piKioskScript = `#!/bin/bash
# Smoke Stack Raspberry Pi Kiosk Auto-Start Setup
echo "🔥 Installing Smoke Stack Pitmaster Kiosk for Raspberry Pi OS..."
sudo apt-get update && sudo apt-get install -y chromium-browser unclutter
mkdir -p ~/.config/autostart
cat << 'EOF' > ~/.config/autostart/smokestack.desktop
[Desktop Entry]
Type=Application
Name=Smoke Stack Pitmaster
Exec=chromium-browser --kiosk --noerrdialogs --disable-infobars --check-for-update-interval=31536000 https://smoke-stack.app
EOF
echo "✅ Smoke Stack Kiosk ready! Restart Raspberry Pi to auto-launch on startup."
`;

  const copyToClipboard = (text: string, type: 'script' | 'desktop') => {
    navigator.clipboard.writeText(text);
    if (type === 'script') {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } else {
      setCopiedDesktopEntry(true);
      setTimeout(() => setCopiedDesktopEntry(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#161616] border border-[#2e2e2e] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-[#e0e0e0]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#2a2a2a] bg-[#1a1a1a] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-orange-600 to-amber-400 rounded-xl text-zinc-950 font-black shadow-lg shadow-orange-950/40">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white">Download Smoke Stack App</h2>
                <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-mono font-bold rounded-full">
                  All Play Stores Supported
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Install directly on Android, iOS, Windows, macOS, Linux, and Raspberry Pi OS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white bg-[#222] hover:bg-[#2e2e2e] rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Store Tabs */}
        <div className="flex items-center bg-[#121212] px-3 pt-2 border-b border-[#2a2a2a] space-x-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveStoreTab('pwa')}
            className={`flex items-center space-x-2 px-3 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t border-x cursor-pointer ${
              activeStoreTab === 'pwa'
                ? 'bg-[#181818] text-orange-400 border-orange-500/40 border-b-[#181818] shadow-sm'
                : 'text-zinc-400 border-transparent hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <Globe className="w-4 h-4 text-orange-400" />
            <span>Instant PWA App</span>
          </button>

          <button
            onClick={() => setActiveStoreTab('google-play')}
            className={`flex items-center space-x-2 px-3 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t border-x cursor-pointer ${
              activeStoreTab === 'google-play'
                ? 'bg-[#181818] text-green-400 border-green-500/40 border-b-[#181818] shadow-sm'
                : 'text-zinc-400 border-transparent hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <Smartphone className="w-4 h-4 text-green-400" />
            <span>Google Play Store</span>
          </button>

          <button
            onClick={() => setActiveStoreTab('apple-store')}
            className={`flex items-center space-x-2 px-3 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t border-x cursor-pointer ${
              activeStoreTab === 'apple-store'
                ? 'bg-[#181818] text-sky-400 border-sky-500/40 border-b-[#181818] shadow-sm'
                : 'text-zinc-400 border-transparent hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <Apple className="w-4 h-4 text-sky-400" />
            <span>Apple App Store</span>
          </button>

          <button
            onClick={() => setActiveStoreTab('microsoft-store')}
            className={`flex items-center space-x-2 px-3 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t border-x cursor-pointer ${
              activeStoreTab === 'microsoft-store'
                ? 'bg-[#181818] text-blue-400 border-blue-500/40 border-b-[#181818] shadow-sm'
                : 'text-zinc-400 border-transparent hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <Monitor className="w-4 h-4 text-blue-400" />
            <span>Microsoft Store</span>
          </button>

          <button
            onClick={() => setActiveStoreTab('raspberry-pi')}
            className={`flex items-center space-x-2 px-3 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t border-x cursor-pointer ${
              activeStoreTab === 'raspberry-pi'
                ? 'bg-[#181818] text-rose-400 border-rose-500/40 border-b-[#181818] shadow-sm'
                : 'text-zinc-400 border-transparent hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <Cpu className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>Raspberry Pi & Linux</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[68vh] bg-[#181818]">
          
          {/* 1. INSTANT PWA APP */}
          {activeStoreTab === 'pwa' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-orange-950/40 via-[#1e1a16] to-[#161616] border border-orange-500/30 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-orange-400" />
                    <h3 className="text-base font-bold text-white">Direct Web App Installation (PWA)</h3>
                  </div>
                  <p className="text-xs text-zinc-300 max-w-xl">
                    Smoke Stack is a native-grade Progressive Web Application. Install directly in 1 second with offline caching, background sync, and push notifications.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerPwaInstall}
                  className="px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-orange-950/50 flex items-center space-x-2 cursor-pointer transition-transform active:scale-95 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>{isInstalled ? 'App Already Installed' : 'Install Smoke Stack Now'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center space-x-2 text-orange-400 font-bold text-xs font-mono">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Zero App Store Fees</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Runs directly on your device storage without requiring Play Store accounts or slow approval cycles.
                  </p>
                </div>

                <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs font-mono">
                    <HardDrive className="w-4 h-4" />
                    <span>100% Offline Capable</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Log cooks at remote BBQ competitions without cellular service; automatically syncs when online.
                  </p>
                </div>

                <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center space-x-2 text-green-400 font-bold text-xs font-mono">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Auto-Update Engine</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Always runs the latest CharGPT AI models and fuel pricing data instantly upon launching.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. GOOGLE PLAY STORE */}
          {activeStoreTab === 'google-play' && (
            <div className="space-y-4">
              <div className="bg-[#121212] border border-green-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-green-500/10 text-green-400 border border-green-500/30 rounded-xl">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Google Play Store & Android WebAPK</h3>
                      <p className="text-xs text-zinc-400">Available for all Android phones, tablets, and Android TV / Smart Displays</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-500/15 border border-green-500/40 text-green-400 text-xs font-mono font-bold rounded-lg">
                    Package: com.smokestack.pitmaster
                  </span>
                </div>

                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 space-y-2">
                  <h4 className="text-xs font-bold text-zinc-200 uppercase font-mono">Installation Options for Android:</h4>
                  <ul className="text-xs text-zinc-300 space-y-2 list-disc pl-4">
                    <li>
                      <strong className="text-green-400">Option 1 (WebAPK Auto-Package):</strong> Tap "Install App" in Chrome on Android. Android OS generates a signed native `.apk` installed in your app drawer automatically.
                    </li>
                    <li>
                      <strong className="text-green-400">Option 2 (Google Play Store TWA):</strong> Access via Google Play Store listing or download the APK installer package below.
                    </li>
                  </ul>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      alert('Simulating Google Play Store WebAPK Download package generator...');
                      handleTriggerPwaInstall();
                    }}
                    className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-zinc-950 font-extrabold text-xs rounded-xl flex items-center space-x-2 cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install via Google Play / WebAPK</span>
                  </button>

                  <a
                    href="https://play.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 bg-[#222] hover:bg-[#2a2a2a] border border-[#333] text-zinc-300 font-bold text-xs rounded-xl flex items-center space-x-2 cursor-pointer"
                  >
                    <span>View Play Store Listing</span>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* 3. APPLE APP STORE */}
          {activeStoreTab === 'apple-store' && (
            <div className="space-y-4">
              <div className="bg-[#121212] border border-sky-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-sky-500/10 text-sky-400 border border-sky-500/30 rounded-xl">
                    <Apple className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Apple App Store & iOS / iPadOS Safari WebClip</h3>
                    <p className="text-xs text-zinc-400">Optimized for iPhone, iPad, Apple Watch companion mode, and Apple Silicon Macs</p>
                  </div>
                </div>

                <div className="space-y-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3">
                  <h4 className="text-xs font-bold text-sky-400 uppercase font-mono">How to install on iPhone & iPad:</h4>
                  <ol className="text-xs text-zinc-300 space-y-2 list-decimal pl-4">
                    <li>Open <strong>smoke-stack.app</strong> in Safari on your iPhone or iPad.</li>
                    <li>Tap the <strong>Share</strong> button (box with an upward arrow) at the bottom of Safari.</li>
                    <li>Scroll down and select <strong>"Add to Home Screen"</strong>.</li>
                    <li>Tap <strong>Add</strong> in the top right corner. Smoke Stack appears as a native app icon!</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* 4. MICROSOFT STORE */}
          {activeStoreTab === 'microsoft-store' && (
            <div className="space-y-4">
              <div className="bg-[#121212] border border-blue-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-xl">
                    <Monitor className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Microsoft Store & Windows 11 / 10 App</h3>
                    <p className="text-xs text-zinc-400">Native Windows app container with taskbar integration and desktop notifications</p>
                  </div>
                </div>

                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 space-y-2">
                  <p className="text-xs text-zinc-300">
                    Install directly on Microsoft Windows via Edge or Chrome. Click the <strong>"App Available / Install"</strong> icon in your browser address bar to add Smoke Stack as a standalone Windows desktop app.
                  </p>
                  <button
                    type="button"
                    onClick={handleTriggerPwaInstall}
                    className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-xl flex items-center space-x-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install Windows Desktop App</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 5. RASPBERRY PI & LINUX */}
          {activeStoreTab === 'raspberry-pi' && (
            <div className="space-y-4">
              <div className="bg-[#121212] border border-rose-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-xl">
                      <Cpu className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Raspberry Pi & Linux Pitmaster Kiosk Launcher</h3>
                      <p className="text-xs text-zinc-400">Optimized for Raspberry Pi 5, 4, 3, Zero 2W, and touchscreen BBQ controllers</p>
                    </div>
                  </div>

                  {onOpenRaspberryPiSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenRaspberryPiSettings();
                      }}
                      className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Open Pi Hardware Optimizations</span>
                    </button>
                  )}
                </div>

                <p className="text-xs text-zinc-300">
                  Run Smoke Stack directly on your smoker pitside touch screen using our automated Raspberry Pi OS kiosk auto-boot script or desktop application shortcut.
                </p>

                {/* Auto Kiosk Script */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-400 font-mono uppercase flex items-center gap-1">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>1-Line Raspberry Pi Kiosk Auto-Start Script</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(piKioskScript, 'script')}
                      className="px-2.5 py-1 bg-[#222] hover:bg-[#2e2e2e] border border-[#333] text-zinc-300 text-[11px] rounded-lg font-mono font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedScript ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedScript ? 'Copied!' : 'Copy Shell Script'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                    {piKioskScript}
                  </pre>
                </div>

                {/* .desktop launcher file */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300 font-mono uppercase flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-orange-400" />
                      <span>Linux / Raspberry Pi Desktop Application Shortcut (smokestack.desktop)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(piDesktopEntry, 'desktop')}
                      className="px-2.5 py-1 bg-[#222] hover:bg-[#2e2e2e] border border-[#333] text-zinc-300 text-[11px] rounded-lg font-mono font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedDesktopEntry ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedDesktopEntry ? 'Copied Entry!' : 'Copy .desktop Entry'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[11px] font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                    {piDesktopEntry}
                  </pre>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#2a2a2a] bg-[#121212] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2 text-xs text-zinc-400 font-mono">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span>Smoke Stack Multi-Store Engine • Version 2.8</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
          >
            Close Store Hub
          </button>
        </div>

      </div>
    </div>
  );
};
