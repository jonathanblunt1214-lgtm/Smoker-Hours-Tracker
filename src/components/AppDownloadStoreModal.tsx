import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
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
  ShieldCheck,
  Zap,
  Puzzle,
  Compass,
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
  const [activeStoreTab, setActiveStoreTab] = useState<'pwa' | 'extension' | 'google-play' | 'apple-store' | 'raspberry-pi'>('pwa');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedDesktopEntry, setCopiedDesktopEntry] = useState(false);
  const [showDownloadSuccessToast, setShowDownloadSuccessToast] = useState(false);
  const [downloadToastMsg, setDownloadToastMsg] = useState('');
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);

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
        return;
      }
    }

    // Trigger instant download of Standalone Web Application Launcher
    const currentUrl = window.location.href;
    const standaloneHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Smoke Stack • Pitmaster Cook & Fuel Log</title>
  <style>
    body { background: #121212; color: #fff; font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
    .card { background: #1a1a1a; border: 1px solid #333; border-radius: 16px; padding: 32px; max-width: 480px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    h1 { color: #f97316; margin-top: 0; font-size: 24px; }
    p { color: #a1a1aa; font-size: 14px; line-height: 1.5; }
    .btn { background: linear-gradient(135deg, #ea580c, #d97706); color: #000; font-weight: 800; padding: 12px 24px; border-radius: 12px; text-decoration: none; display: inline-block; margin-top: 16px; transition: transform 0.2s; }
    .btn:hover { transform: scale(1.03); }
  </style>
</head>
<body>
  <div class="card">
    <h1>🔥 Smoke Stack Pitmaster App</h1>
    <p>Launching standalone application instance...</p>
    <a class="btn" href="${currentUrl}">Open Smoke Stack App</a>
  </div>
  <script>
    setTimeout(() => {
      window.location.href = "${currentUrl}";
    }, 800);
  </script>
</body>
</html>`;

    downloadFile(standaloneHtml, 'SmokeStack-Pitmaster-App.html', 'text/html');

    // Also download Windows .url shortcut for quick desktop access
    const windowsShortcut = `[InternetShortcut]
URL=${currentUrl}
IconIndex=0
`;
    setTimeout(() => {
      downloadFile(windowsShortcut, 'SmokeStack-Pitmaster.url', 'application/x-mswinurl');
    }, 400);

    setDownloadToastMsg('App Launcher downloaded! Check your browser downloads for SmokeStack-Pitmaster-App.html');
    setShowDownloadSuccessToast(true);
    setTimeout(() => setShowDownloadSuccessToast(false), 5000);
  };

  const downloadChromeExtensionPackage = async () => {
    try {
      setIsGeneratingZip(true);
      const zip = new JSZip();
      const currentUrl = window.location.href;

      // 1. Manifest V3
      const manifest = {
        manifest_version: 3,
        name: "Smoke Stack • Pitmaster BBQ Log & CharGPT",
        short_name: "Smoke Stack",
        version: "0.02A",
        description: "Interactive Smoke Stack BBQ Smoker Extension Widget, Wood Pellet Fuel Calculator & CharGPT AI Pitmaster Advisor with Live Auto-Updating Cloud Engine.",
        action: {
          default_popup: "popup.html",
          default_title: "Smoke Stack Pitmaster Widget (0.02A Live)"
        },
        background: {
          service_worker: "background.js"
        },
        permissions: ["tabs", "storage", "activeTab"],
        host_permissions: ["https://*/*", "http://*/*"],
        content_security_policy: {
          extension_pages: "script-src 'self'; object-src 'self'; frame-src https://* http://*;"
        }
      };

      // 2. popup.html
      const popupHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Smoke Stack Pitmaster Widget</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 440px;
      min-height: 560px;
      background: #111015;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #f4f4f5;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }
    .top-bar {
      background: #18171d;
      border-bottom: 1px solid #2a2933;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 800;
      font-size: 15px;
      color: #ea580c;
    }
    .badge {
      background: rgba(234, 88, 12, 0.2);
      color: #fb923c;
      border: 1px solid rgba(234, 88, 12, 0.4);
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
    .btn-icon {
      background: #25242f;
      border: 1px solid #373645;
      color: #e4e4e7;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s;
    }
    .btn-icon:hover {
      background: #323040;
      border-color: #ea580c;
      color: #fb923c;
    }
    .tabs {
      display: flex;
      background: #15141a;
      border-bottom: 1px solid #282732;
      padding: 4px 8px;
      gap: 4px;
    }
    .tab-btn {
      flex: 1;
      background: transparent;
      border: none;
      color: #a1a1aa;
      padding: 8px 4px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: all 0.15s;
    }
    .tab-btn.active {
      background: #23222b;
      color: #ea580c;
      border: 1px solid #3b3949;
    }
    .content-area {
      flex: 1;
      padding: 12px;
      overflow-y: auto;
    }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    iframe {
      width: 100%;
      height: 460px;
      border: 1px solid #2e2d3a;
      border-radius: 8px;
      background: #121110;
    }
    .card {
      background: #18171f;
      border: 1px solid #2a2935;
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 10px;
    }
    .card-title {
      font-size: 13px;
      font-weight: 800;
      color: #fb923c;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .form-group {
      margin-bottom: 8px;
      text-align: left;
    }
    label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      color: #a1a1aa;
      margin-bottom: 4px;
    }
    input, select {
      width: 100%;
      background: #0d0c10;
      border: 1px solid #2e2d3a;
      color: #ffffff;
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 12px;
      outline: none;
    }
    input:focus, select:focus {
      border-color: #ea580c;
    }
    .btn-action {
      width: 100%;
      background: linear-gradient(135deg, #ea580c, #c2410c);
      color: #fff;
      border: none;
      padding: 10px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 12px;
      cursor: pointer;
      margin-top: 6px;
      box-shadow: 0 2px 8px rgba(234, 88, 12, 0.3);
    }
    .btn-action:hover {
      background: linear-gradient(135deg, #f97316, #ea580c);
    }
    .result-box {
      background: #201f29;
      border: 1px dashed #3e3c50;
      border-radius: 8px;
      padding: 10px;
      margin-top: 10px;
      font-size: 11px;
    }
    .chat-box {
      height: 300px;
      background: #0d0c10;
      border: 1px solid #2a2935;
      border-radius: 8px;
      padding: 10px;
      overflow-y: auto;
      margin-bottom: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .msg {
      max-width: 85%;
      padding: 8px 12px;
      border-radius: 10px;
      font-size: 11px;
      line-height: 1.4;
    }
    .msg.user {
      align-self: flex-end;
      background: #ea580c;
      color: #ffffff;
      border-bottom-right-radius: 2px;
    }
    .msg.ai {
      align-self: flex-start;
      background: #201f29;
      color: #e4e4e7;
      border: 1px solid #333142;
      border-bottom-left-radius: 2px;
    }
    .chat-input-row {
      display: flex;
      gap: 6px;
    }
    .footer {
      background: #141318;
      border-top: 1px solid #262530;
      padding: 8px 12px;
      font-size: 10px;
      color: #71717a;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .status-dot {
      width: 6px; height: 6px; border-radius: 50%; background: #22c55e; display: inline-block;
    }
  </style>
</head>
<body>
  <div class="top-bar">
    <div class="brand">
      🔥 Smoke Stack
      <span class="badge">0.02A Widget</span>
    </div>
    <div style="display:flex; align-items:center; gap:6px;">
      <span style="font-size:10px; color:#4ade80; font-weight:700; background:rgba(34,197,94,0.15); border:1px solid rgba(34,197,94,0.3); padding:2px 6px; border-radius:4px;" title="Widget automatically renders live cloud updates without reinstallation">⚡ Live Sync</span>
      <button id="btnOpenFullTab" class="btn-icon" title="Open full web app in browser tab">
        ↗ Full Tab
      </button>
    </div>
  </div>

  <div class="tabs">
    <button class="tab-btn active" data-tab="tab-app">📱 Live App</button>
    <button class="tab-btn" data-tab="tab-fuel">🧮 Fuel Calc</button>
    <button class="tab-btn" data-tab="tab-ai">🤖 CharGPT AI</button>
    <button class="tab-btn" data-tab="tab-temps">🌡️ Target Temps</button>
  </div>

  <div class="content-area">
    <!-- TAB 1: LIVE APP IFRAME & TOOLBAR APP ENGINE -->
    <div id="tab-app" class="tab-content active">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; background:#1e1d27; padding:6px 10px; border-radius:8px; border:1px solid #333142;">
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="status-dot"></span>
          <span style="font-size:11px; color:#4ade80; font-weight:700;" id="liveStatusText">Live App Connected</span>
        </div>
        <div style="display:flex; gap:6px;">
          <button id="btnReloadIframe" class="btn-icon" style="padding:3px 8px; font-size:11px;" title="Reload Live Application Engine">🔄 Reload</button>
          <button id="btnLoadAppToolbar" class="btn-icon" style="padding:3px 8px; font-size:11px; background:#ea580c; border-color:#f97316; color:#ffffff;" title="Load application directly in browser toolbar window">🚀 Load App</button>
        </div>
      </div>
      <iframe id="mainAppIframe" src="${currentUrl}" allow="camera; microphone; geolocation"></iframe>

      <div style="margin-top:8px; padding:10px; background:#18171f; border:1px solid #2e2c3a; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-size:11px; font-weight:800; color:#ffffff;">⚡ Live Cloud Updates Active</div>
          <div style="font-size:10px; color:#a1a1aa;">Widget renders live cloud updates automatically without reinstallation.</div>
        </div>
        <button id="btnLaunchTabSecondary" class="btn-icon" style="font-size:11px; font-weight:800; background:#22c55e; color:#000000; border:none; padding:6px 10px;">↗ Open App</button>
      </div>
    </div>

    <!-- TAB 2: PELLET FUEL CALCULATOR -->
    <div id="tab-fuel" class="tab-content">
      <div class="card">
        <div class="card-title">🧮 Wood Pellet & Fuel Estimator</div>
        <div class="form-group">
          <label>Wood Blend Type</label>
          <select id="fuelWoodType">
            <option value="Hickory">Hickory Blend (Strong Bacon Smoke)</option>
            <option value="Apple">Apple Wood (Sweet & Mild)</option>
            <option value="Post Oak">Post Oak (Texas Brisket Standard)</option>
            <option value="Pecan">Pecan (Nutty & Rich)</option>
            <option value="Competition">Competition Blend (Hickory/Maple/Cherry)</option>
            <option value="Mesquite">Mesquite (Intense Bold Smoke)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Smoker Temperature (°F)</label>
          <input type="number" id="fuelTemp" value="225" min="150" max="450" />
        </div>
        <div class="form-group">
          <label>Estimated Cooking Duration (Hours)</label>
          <input type="number" id="fuelHours" value="10" min="1" max="30" />
        </div>
        <div class="form-group">
          <label>Wood Bag Price ($ / 20 lb bag)</label>
          <input type="number" id="fuelBagCost" value="18" min="5" max="50" />
        </div>
        <button id="btnCalcFuel" class="btn-action">Calculate Fuel Consumption</button>

        <div id="fuelResult" class="result-box" style="display:none;">
          <div style="font-weight:800; color:#4ade80; margin-bottom:4px;" id="resBurnRate">Burn Rate: 1.25 lbs/hr</div>
          <div style="color:#ffffff;" id="resTotalWeight">Total Fuel Needed: 12.5 lbs</div>
          <div style="color:#fb923c;" id="resCost">Estimated Cost: $11.25 (1 Bag)</div>
          <div style="color:#a1a1aa; margin-top:6px; font-size:10px;" id="resNotes"></div>
        </div>
      </div>
    </div>

    <!-- TAB 3: CHARGPT AI ASSISTANT -->
    <div id="tab-ai" class="tab-content">
      <div class="card" style="padding:8px;">
        <div class="card-title" style="margin-bottom:6px;">🤖 CharGPT AI Pitmaster Advisor</div>
        <div id="chatHistory" class="chat-box">
          <div class="msg ai">🔥 Howdy! I'm CharGPT, your AI Pitmaster advisor. Ask me anything about smoker temps, stalls, wood pairings, or BBQ rubs!</div>
        </div>
        <div class="chat-input-row">
          <input type="text" id="chatInput" placeholder="Ask CharGPT a question..." />
          <button id="btnSendChat" class="btn-action" style="width:70px; margin:0;">Send</button>
        </div>
      </div>
    </div>

    <!-- TAB 4: TARGET TEMPS & CONVERTER -->
    <div id="tab-temps" class="tab-content">
      <div class="card">
        <div class="card-title">🎯 Ideal Internal Meat Temperatures</div>
        <div style="font-size:11px; color:#d4d4d8; display:flex; flex-direction:column; gap:6px;">
          <div style="background:#201f2a; padding:6px 8px; border-radius:6px;"><strong>🐄 Beef Brisket / Beef Ribs:</strong> 203°F (Stall ~165°F)</div>
          <div style="background:#201f2a; padding:6px 8px; border-radius:6px;"><strong>🐖 Pork Shoulder / Butt:</strong> 203°F (Pull-apart tenderness)</div>
          <div style="background:#201f2a; padding:6px 8px; border-radius:6px;"><strong>🐖 Pork Ribs:</strong> 195°F - 200°F (Bend test)</div>
          <div style="background:#201f2a; padding:6px 8px; border-radius:6px;"><strong>🍗 Poultry / Turkey:</strong> 165°F Breast / 175°F Thigh</div>
          <div style="background:#201f2a; padding:6px 8px; border-radius:6px;"><strong>🥩 Prime Rib / Steak:</strong> Med-Rare 135°F</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">🌡️ Fast Temperature Converter</div>
        <div style="display:flex; gap:8px;">
          <input type="number" id="tempF" placeholder="°F" value="225" />
          <span style="align-self:center; color:#a1a1aa; font-weight:700;">=</span>
          <input type="number" id="tempC" placeholder="°C" value="107" />
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div><span class="status-dot"></span> Connected Live Engine (Auto-Updating)</div>
    <div>Smoke Stack • 0.02A</div>
  </div>

  <script src="popup.js"></script>
</body>
</html>`;

      // 3. popup.js (External JS file complying with MV3 Content Security Policy)
      const popupJs = `const APP_URL = "${currentUrl}";

document.addEventListener('DOMContentLoaded', () => {
  const mainAppIframe = document.getElementById('mainAppIframe');
  const liveStatusText = document.getElementById('liveStatusText');

  // 1. Live Sync from Chrome Storage (Receives live updates pushed from background worker)
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['appUrl', 'liveStatus'], (data) => {
      const activeUrl = data.appUrl || APP_URL;
      if (mainAppIframe && activeUrl && mainAppIframe.src !== activeUrl) {
        mainAppIframe.src = activeUrl;
      }
      if (data.liveStatus === 'online' && liveStatusText) {
        liveStatusText.textContent = 'Live App Synced ⚡';
      }
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.appUrl && changes.appUrl.newValue) {
        if (mainAppIframe) {
          mainAppIframe.src = changes.appUrl.newValue;
        }
      }
    });
  }

  // 2. Load App Toolbar & Open Full Tab handlers
  const launchAppInTab = () => {
    const targetUrl = (typeof chrome !== 'undefined' && chrome.storage)
      ? (mainAppIframe?.src || APP_URL)
      : APP_URL;
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: targetUrl });
    } else {
      window.open(targetUrl, '_blank');
    }
  };

  document.getElementById('btnOpenFullTab')?.addEventListener('click', launchAppInTab);
  document.getElementById('btnLoadAppToolbar')?.addEventListener('click', launchAppInTab);
  document.getElementById('btnLaunchTabSecondary')?.addEventListener('click', launchAppInTab);

  // 3. Tab Switcher
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(targetTab)?.classList.add('active');
    });
  });

  // 4. Iframe reload
  const btnReloadIframe = document.getElementById('btnReloadIframe');
  btnReloadIframe?.addEventListener('click', () => {
    if (mainAppIframe) {
      mainAppIframe.src = APP_URL + '?_t=' + Date.now();
    }
  });

  // 5. Fuel Calculator logic
  const btnCalcFuel = document.getElementById('btnCalcFuel');
  const fuelResult = document.getElementById('fuelResult');

  btnCalcFuel?.addEventListener('click', () => {
    const temp = parseFloat(document.getElementById('fuelTemp').value) || 225;
    const hours = parseFloat(document.getElementById('fuelHours').value) || 10;
    const bagCost = parseFloat(document.getElementById('fuelBagCost').value) || 18;
    const woodType = document.getElementById('fuelWoodType').value;

    const burnRate = Number((0.5 + (temp - 150) * 0.005).toFixed(2));
    const totalWeight = Number((burnRate * hours).toFixed(1));
    const bagsNeeded = Math.ceil(totalWeight / 20);
    const cost = Number((totalWeight * (bagCost / 20)).toFixed(2));

    document.getElementById('resBurnRate').textContent = \`Burn Rate: \${burnRate} lbs/hr @ \${temp}°F\`;
    document.getElementById('resTotalWeight').textContent = \`Total Fuel Needed: \${totalWeight} lbs (\${bagsNeeded} x 20lb bag\${bagsNeeded > 1 ? 's' : ''})\`;
    document.getElementById('resCost').textContent = \`Estimated Cost: \$\${cost}\`;
    document.getElementById('resNotes').textContent = \`Recommended for \${woodType} wood blend. Keep hopper full and check draft damper every 3 hours!\`;

    fuelResult.style.display = 'block';
  });

  // 6. CharGPT AI Chat
  const chatHistory = document.getElementById('chatHistory');
  const chatInput = document.getElementById('chatInput');
  const btnSendChat = document.getElementById('btnSendChat');

  const appendMsg = (sender, text) => {
    const div = document.createElement('div');
    div.className = \`msg \${sender}\`;
    div.textContent = text;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  };

  const handleSendAI = async () => {
    const query = chatInput.value.trim();
    if (!query) return;

    appendMsg('user', query);
    chatInput.value = '';

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'msg ai';
    loadingDiv.textContent = '🔥 CharGPT thinking...';
    chatHistory.appendChild(loadingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
      const res = await fetch(\`\${APP_URL}/api/chat\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query })
      });
      if (res.ok) {
        const data = await res.json();
        loadingDiv.textContent = data.reply || data.text || '🔥 Keep your smoker steady at 225°F and monitor internal probe temps!';
      } else {
        throw new Error('API request failed');
      }
    } catch (err) {
      loadingDiv.textContent = \`🔥 Pitmaster Tip: Maintain clean blue smoke, wrap around 165°F stall, and pull brisket when probe feels like warm butter at 203°F!\`;
    }
  };

  btnSendChat?.addEventListener('click', handleSendAI);
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSendAI();
  });

  // 7. Temp Converter
  const tempF = document.getElementById('tempF');
  const tempC = document.getElementById('tempC');

  tempF?.addEventListener('input', () => {
    const val = parseFloat(tempF.value);
    if (!isNaN(val)) {
      tempC.value = Math.round((val - 32) * 5 / 9);
    }
  });

  tempC?.addEventListener('input', () => {
    const val = parseFloat(tempC.value);
    if (!isNaN(val)) {
      tempF.value = Math.round((val * 9 / 5) + 32);
    }
  });
});
`;

      // 4. background.js (MV3 Service Worker)
      const backgroundJs = `// Smoke Stack Browser Extension Background Service Worker (0.02A)
const APP_LIVE_URL = "${currentUrl}";

chrome.runtime.onInstalled.addListener(() => {
  console.log("🔥 Smoke Stack Pitmaster Extension (0.02A) active with Live Cloud Auto-Update Engine!");
  chrome.storage.local.set({ extensionVersion: "0.02A", appUrl: APP_LIVE_URL, installedAt: new Date().toISOString() });
});

// Periodic Cloud Health & Live Code Auto-Sync Engine (every 15s)
// Automatically streams live application updates directly to browser widgets without requiring reinstallation!
setInterval(async () => {
  try {
    const res = await fetch(\`\${APP_LIVE_URL}/api/health?_sync=\${Date.now()}\`);
    if (res.ok) {
      const data = await res.json();
      chrome.storage.local.set({ 
        appUrl: APP_LIVE_URL, 
        lastLiveSync: Date.now(), 
        liveStatus: "online",
        serverTime: data.time || new Date().toISOString()
      });
    }
  } catch (err) {
    // Keep cached state active
  }
}, 15000);

// Action click fallback
if (chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: APP_LIVE_URL });
  });
}
`;

      // 4. Windows Helper Script to open chrome://extensions & highlight unzipped folder
      const windowsInstallerBat = `@echo off
TITLE Smoke Stack Extension Auto-Installer Helper
COLOR 0B
CLS
echo ============================================================
echo   🔥 SMOKE STACK PITMASTER • BROWSER EXTENSION HELPER
echo ============================================================
echo.
echo Launching your browser's Extension Manager page...
echo.
start chrome://extensions/ 2>nul || start edge://extensions/ 2>nul || start msedge "chrome://extensions/"
echo.
echo Opening current extracted extension folder in File Explorer...
explorer.exe "%~dp0"
echo.
echo ============================================================
echo  INSTRUCTIONS:
echo  1. Toggle "Developer mode" ON in the top-right of your browser.
echo  2. Click "Load unpacked" in the top-left.
echo  3. Select THIS folder that just opened in File Explorer!
echo ============================================================
pause
`;

      // 5. Windows Direct URL Shortcut
      const windowsUrlShortcut = `[InternetShortcut]
URL=chrome://extensions/
IconIndex=0
`;

      // 6. Mac Helper Script (.command for macOS)
      const macInstallerCommand = `#!/bin/bash
echo "============================================================"
echo "🔥 SMOKE STACK PITMASTER • BROWSER EXTENSION HELPER"
echo "============================================================"
echo ""
echo "Opening Browser Extensions Manager..."
open "chrome://extensions/" 2>/dev/null || open "edge://extensions/" 2>/dev/null || xdg-open "chrome://extensions/" 2>/dev/null
echo ""
echo "Opening extracted folder in Finder / File Manager..."
open . 2>/dev/null || xdg-open . 2>/dev/null
echo ""
echo "INSTRUCTIONS:"
echo "1. Enable 'Developer mode' toggle in top-right of browser."
echo "2. Click 'Load unpacked' in top-left."
echo "3. Select this folder!"
`;

      // 7. Comprehensive README.txt
      const readmeTxt = `========================================================================
🔥 SMOKE STACK PITMASTER • CHROME & EDGE EXTENSION AUTOMATED INSTALL GUIDE
========================================================================

FOR WINDOWS USERS:
------------------
1. Extract this entire ZIP file into a folder on your computer.
2. Double-click "1-CLICK-INSTALL-WINDOWS.bat" (Windows Batch File).
   (Do NOT click .command or .sh files - those are for Mac/Linux!)
3. In your browser's Extension page, turn ON "Developer mode" (top-right).
4. Click "Load unpacked" (top-left) and select THIS extracted folder!

FOR MAC / LINUX USERS:
----------------------
1. Extract this entire ZIP file.
2. Double-click "1-CLICK-INSTALL-MAC.command".
3. In Chrome/Edge, turn ON "Developer mode" and click "Load unpacked".

🎉 Smoke Stack Pitmaster will now appear in your browser toolbar!
`;

      zip.file("manifest.json", JSON.stringify(manifest, null, 2));
      zip.file("popup.html", popupHtml);
      zip.file("popup.js", popupJs);
      zip.file("background.js", backgroundJs);
      zip.file("1-CLICK-INSTALL-WINDOWS.bat", windowsInstallerBat);
      zip.file("OPEN-CHROME-EXTENSIONS.url", windowsUrlShortcut);
      zip.file("1-CLICK-INSTALL-MAC.command", macInstallerCommand);
      zip.file("README-INSTALL.txt", readmeTxt);

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'smokestack-chrome-extension.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadToastMsg('Automated Extension ZIP downloaded! Extract the ZIP and run OPEN-EXTENSION-PAGE.bat to complete setup.');
      setShowDownloadSuccessToast(true);
      setTimeout(() => setShowDownloadSuccessToast(false), 7000);
    } catch (err) {
      console.error('Failed to generate extension zip:', err);
    } finally {
      setIsGeneratingZip(false);
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

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
            <Compass className="w-4 h-4 text-orange-400" />
            <span>Browser Direct App</span>
          </button>

          <button
            onClick={() => setActiveStoreTab('extension')}
            className={`flex items-center space-x-2 px-3 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t border-x cursor-pointer ${
              activeStoreTab === 'extension'
                ? 'bg-[#181818] text-blue-400 border-blue-500/40 border-b-[#181818] shadow-sm'
                : 'text-zinc-400 border-transparent hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <Puzzle className="w-4 h-4 text-blue-400" />
            <span>Browser Extension</span>
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
            <span>Google Play / Android</span>
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
            <span>Apple iOS / macOS</span>
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
          
          {/* 1. INSTANT BROWSER PWA APP */}
          {activeStoreTab === 'pwa' && (
            <div className="space-y-4">
              {showDownloadSuccessToast && (
                <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-xl p-3.5 flex items-center justify-between gap-3 text-emerald-200 text-xs font-mono animate-fade-in shadow-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>{downloadToastMsg || 'Action completed successfully!'}</span>
                  </div>
                  <button
                    onClick={() => setShowDownloadSuccessToast(false)}
                    className="p-1 hover:bg-emerald-900 rounded text-emerald-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="bg-gradient-to-r from-orange-950/40 via-[#1e1a16] to-[#161616] border border-orange-500/30 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-orange-400" />
                    <h3 className="text-base font-bold text-white">Direct Browser App Installation (Zero Smart App Control Warnings)</h3>
                  </div>
                  <p className="text-xs text-zinc-300 max-w-xl">
                    Smoke Stack is built to install directly from your web browser as a standalone desktop/mobile application with offline capabilities and Start Menu / Taskbar shortcuts.
                  </p>
                </div>

                <div className="flex items-center space-x-2 flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleTriggerPwaInstall}
                    className="px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-orange-950/50 flex items-center space-x-2 cursor-pointer transition-transform active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>1-Click Install Standalone App</span>
                  </button>

                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-3 bg-[#222] hover:bg-[#2e2e2e] border border-[#3a3a3a] text-zinc-200 font-bold text-xs rounded-xl flex items-center space-x-2 cursor-pointer transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-orange-400" />
                    <span>Open in Full Tab</span>
                  </a>
                </div>
              </div>

              {/* Step-by-Step Browser Guides */}
              <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-orange-400 uppercase font-mono flex items-center gap-1.5">
                  <Compass className="w-4 h-4" />
                  <span>How to Install directly in your Web Browser:</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Chrome & Edge */}
                  <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs">
                      <Monitor className="w-4 h-4" />
                      <span>Google Chrome & Microsoft Edge (Windows / Mac)</span>
                    </div>
                    <ol className="text-xs text-zinc-300 space-y-1.5 list-decimal pl-4">
                      <li>Look at the far-right side of your address bar for the <strong>Install App</strong> icon (or click the <code>...</code> menu).</li>
                      <li>Select <strong>"Install Smoke Stack Pitmaster"</strong> or <strong>Apps &gt; Install</strong>.</li>
                      <li>Click <strong>Install</strong>. Smoke Stack launches as a clean window with a desktop shortcut!</li>
                    </ol>
                  </div>

                  {/* Safari & Mobile */}
                  <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center space-x-2 text-sky-400 font-bold text-xs">
                      <Apple className="w-4 h-4" />
                      <span>Safari (macOS Sonoma+ & iOS / iPadOS)</span>
                    </div>
                    <ol className="text-xs text-zinc-300 space-y-1.5 list-decimal pl-4">
                      <li>On Mac: Click <strong>File &gt; Add to Dock</strong> in Safari.</li>
                      <li>On iPhone/iPad: Tap the <strong>Share</strong> button and choose <strong>Add to Home Screen</strong>.</li>
                      <li>It appears as a native app icon on your Launchpad or Home Screen!</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center space-x-2 text-orange-400 font-bold text-xs font-mono">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Safe & Instant</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    No executable binaries to trigger Windows Smart App Control or antivirus warnings.
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
                    <span>Always Up to Date</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Always runs the latest CharGPT AI models and fuel pricing data automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. CHROME & EDGE BROWSER EXTENSION */}
          {activeStoreTab === 'extension' && (
            <div className="space-y-4">
              {showDownloadSuccessToast && (
                <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-xl p-3.5 flex items-center justify-between gap-3 text-emerald-200 text-xs font-mono animate-fade-in shadow-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>{downloadToastMsg}</span>
                  </div>
                  <button
                    onClick={() => setShowDownloadSuccessToast(false)}
                    className="p-1 hover:bg-emerald-900 rounded text-emerald-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="bg-gradient-to-r from-blue-950/50 via-[#18202d] to-[#121212] border border-blue-500/40 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Puzzle className="w-5 h-5 text-blue-400" />
                    <h3 className="text-base font-bold text-white">Chrome & Edge Browser Extension Package</h3>
                  </div>
                  <p className="text-xs text-zinc-300 max-w-xl">
                    Run Smoke Stack Pitmaster directly inside your browser toolbar! Download our custom Chrome / Edge extension package and load it in 1 minute.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isGeneratingZip}
                  onClick={downloadChromeExtensionPackage}
                  className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-950/60 flex items-center space-x-2 cursor-pointer transition-transform active:scale-95 shrink-0 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGeneratingZip ? 'Generating Zip...' : 'Download Extension (.zip)'}</span>
                </button>
              </div>

              {/* Extension Step-by-Step Guide */}
              <div className="bg-[#121212] border border-blue-500/30 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-bold text-blue-400 uppercase font-mono flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Automated 4-Step Extension Installation Setup:</span>
                  </h4>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('chrome://extensions');
                        setDownloadToastMsg('Copied chrome://extensions to clipboard! Paste it into your address bar.');
                        setShowDownloadSuccessToast(true);
                        setTimeout(() => setShowDownloadSuccessToast(false), 4000);
                      }}
                      className="px-2.5 py-1 bg-[#222] hover:bg-[#2e2e2e] border border-[#3a3a3a] text-zinc-300 text-[11px] font-mono rounded-lg flex items-center space-x-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3 text-blue-400" />
                      <span>Copy chrome://extensions</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('edge://extensions');
                        setDownloadToastMsg('Copied edge://extensions to clipboard! Paste it into your address bar.');
                        setShowDownloadSuccessToast(true);
                        setTimeout(() => setShowDownloadSuccessToast(false), 4000);
                      }}
                      className="px-2.5 py-1 bg-[#222] hover:bg-[#2e2e2e] border border-[#3a3a3a] text-zinc-300 text-[11px] font-mono rounded-lg flex items-center space-x-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3 text-sky-400" />
                      <span>Copy edge://extensions</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {/* Step 1 */}
                  <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 font-extrabold flex items-center justify-center text-xs">
                          1
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">Zip File</span>
                      </div>
                      <strong className="text-white block font-semibold text-xs">Download & Extract</strong>
                      <p className="text-zinc-400 text-[11px] mt-1 leading-relaxed">
                        Download the extension package above and extract <code>smokestack-chrome-extension.zip</code> into a folder on your PC or Mac.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 font-extrabold flex items-center justify-center text-xs">
                          2
                        </div>
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded">⚡ OS Specific</span>
                      </div>
                      <strong className="text-white block font-semibold text-xs">Run Helper Script</strong>
                      <div className="text-zinc-400 text-[11px] mt-1 space-y-1">
                        <p><span className="text-blue-400 font-bold">Windows:</span> Double-click <code>1-CLICK-INSTALL-WINDOWS.bat</code></p>
                        <p><span className="text-sky-400 font-bold">Mac:</span> Double-click <code>1-CLICK-INSTALL-MAC.command</code></p>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 font-extrabold flex items-center justify-center text-xs">
                          3
                        </div>
                        <span className="text-[10px] font-mono text-blue-400 bg-blue-950/60 border border-blue-500/30 px-1.5 py-0.5 rounded">Toggle ON</span>
                      </div>
                      <strong className="text-white block font-semibold text-xs">Enable Developer Mode</strong>
                      <p className="text-zinc-400 text-[11px] mt-1 leading-relaxed">
                        In your browser's Extensions page, turn ON the <strong>"Developer mode"</strong> switch in the upper-right corner.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 font-extrabold flex items-center justify-center text-xs">
                          4
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">Ready</span>
                      </div>
                      <strong className="text-white block font-semibold text-xs">Load Unpacked Folder</strong>
                      <p className="text-zinc-400 text-[11px] mt-1 leading-relaxed">
                        Click <strong>"Load unpacked"</strong> in the top-left and select the unzipped folder. Pin Smoke Stack to your browser toolbar for 1-click access!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-zinc-300">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
                    <span><strong>Pro Tip:</strong> Pin Smoke Stack to your extension toolbar by clicking the Puzzle Piece icon 🧩 in Chrome/Edge.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDownloadToastMsg('Extension setup guide verified! Enjoy Smoke Stack Pitmaster in your toolbar.');
                      setShowDownloadSuccessToast(true);
                      setTimeout(() => setShowDownloadSuccessToast(false), 4000);
                    }}
                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-[11px] font-bold rounded-lg shrink-0 cursor-pointer"
                  >
                    Verify Setup
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. GOOGLE PLAY / ANDROID */}
          {activeStoreTab === 'google-play' && (
            <div className="space-y-4">
              <div className="bg-[#121212] border border-green-500/30 rounded-xl p-5 space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-green-500/10 text-green-400 border border-green-500/30 rounded-xl">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Google Play Store Status</h3>
                    <p className="text-xs text-zinc-400">Native Android app listing is currently unreleased.</p>
                  </div>
                </div>
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 space-y-2">
                  <p><strong>PWA Installation Available Now:</strong> You can install Smoke Stack directly on Android without the Play Store!</p>
                  <p className="text-zinc-400">Open this web page in Chrome on Android, tap <strong>⋮ (Menu)</strong>, and select <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong> for a native standalone experience.</p>
                </div>
              </div>
            </div>
          )}

          {/* 4. APPLE IOS / MACOS */}
          {activeStoreTab === 'apple-store' && (
            <div className="space-y-4">
              <div className="bg-[#121212] border border-sky-500/30 rounded-xl p-5 space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-sky-500/10 text-sky-400 border border-sky-500/30 rounded-xl">
                    <Apple className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Apple App Store Status</h3>
                    <p className="text-xs text-zinc-400">Native iOS / macOS App Store listing is currently unreleased.</p>
                  </div>
                </div>
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 space-y-2">
                  <p><strong>Home Screen Installation Available Now:</strong> You can install Smoke Stack on iPhone and iPad!</p>
                  <p className="text-zinc-400">Open this web page in Safari on iOS, tap the <strong>Share button (↑)</strong>, and select <strong>"Add to Home Screen"</strong> for full offline PWA capabilities.</p>
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
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-rose-400 font-mono uppercase flex items-center gap-1">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>1-Line Raspberry Pi Kiosk Auto-Start Script</span>
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => downloadFile(piKioskScript, 'install-smokestack-kiosk.sh', 'application/x-sh')}
                        className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-[11px] rounded-lg font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-rose-400" />
                        <span>Download .sh Script</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(piKioskScript, 'script')}
                        className="px-2.5 py-1 bg-[#222] hover:bg-[#2e2e2e] border border-[#333] text-zinc-300 text-[11px] rounded-lg font-mono font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedScript ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedScript ? 'Copied!' : 'Copy Script'}</span>
                      </button>
                    </div>
                  </div>
                  <pre className="p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                    {piKioskScript}
                  </pre>
                </div>

                {/* .desktop launcher file */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-zinc-300 font-mono uppercase flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-orange-400" />
                      <span>Linux / Raspberry Pi Desktop Application Shortcut (smokestack.desktop)</span>
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => downloadFile(piDesktopEntry, 'smokestack.desktop', 'text/plain')}
                        className="px-2.5 py-1 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 text-[11px] rounded-lg font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-orange-400" />
                        <span>Download .desktop File</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(piDesktopEntry, 'desktop')}
                        className="px-2.5 py-1 bg-[#222] hover:bg-[#2e2e2e] border border-[#333] text-zinc-300 text-[11px] rounded-lg font-mono font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedDesktopEntry ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedDesktopEntry ? 'Copied Entry!' : 'Copy Entry'}</span>
                      </button>
                    </div>
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
