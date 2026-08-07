import React, { useState, useEffect } from 'react';
import {
  Bell,
  Volume2,
  VolumeX,
  Mic,
  Smartphone,
  Radio,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Flame,
  Thermometer,
  Sparkles,
  Zap,
  Sliders,
  Play,
  Square,
  Globe,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { CookLog, SmokerProfile } from '../types';
import {
  loadPushConfig,
  savePushConfig,
  loadAlexaConfig,
  saveAlexaConfig,
  requestBrowserNotificationPermission,
  sendCharGPTPushNotification,
  speakAlexaVoice,
  CharGPTPushConfig,
  AlexaIntegrationConfig,
  playAudioChime,
} from '../utils/notificationAndAlexa';
import { getEffectiveSmokerSpecs } from '../utils/smokerCalculations';
import { APP_NAME, AI_NAME, AI_PITMASTER_NAME } from '../constants/appName';

interface PushAndAlexaHubProps {
  activeCook?: CookLog;
  smokerProfile?: SmokerProfile;
  tempUnit?: 'F' | 'C';
  onShowToast?: (msg: string) => void;
  isCollapsible?: boolean;
  defaultOpen?: boolean;
  titleOverride?: string;
}

export const PushAndAlexaHub: React.FC<PushAndAlexaHubProps> = ({
  activeCook,
  smokerProfile,
  tempUnit = 'F',
  onShowToast,
  isCollapsible = false,
  defaultOpen = false,
  titleOverride,
}) => {
  const [pushConfig, setPushConfig] = useState<CharGPTPushConfig>(loadPushConfig);
  const [alexaConfig, setAlexaConfig] = useState<AlexaIntegrationConfig>(loadAlexaConfig);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultOpen);

  // Alexa Voice Simulator state
  const [simulatedVoiceQuery, setSimulatedVoiceQuery] = useState('Alexa, ask Smoke Stack for my brisket internal temp');
  const [alexaResponseText, setAlexaResponseText] = useState<string | null>(
    'Your Brisket Flat is currently at 198°F, 5 degrees away from your 203°F finish goal!'
  );
  const [alexaCardContent, setAlexaCardContent] = useState<string | null>(
    'Brisket Flat: 198°F / Target: 203°F | Pit Temp: 225°F'
  );
  const [isSimulatingVoice, setIsSimulatingVoice] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    // Check permission status on mount
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushConfig((prev) => ({ ...prev, browserPermission: Notification.permission as any }));
    }

    // Auto-sync current cook and telemetry to server for Alexa requests
    const syncTelemetryToServer = async () => {
      try {
        const effectiveSpecs = smokerProfile ? getEffectiveSmokerSpecs(smokerProfile) : null;
        await fetch('/api/alexa/sync-telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activeCook,
            smokerProfile,
            effectiveSpecs,
          }),
        });
      } catch (e) {
        console.warn('Telemetry sync error', e);
      }
    };
    syncTelemetryToServer();
  }, [activeCook, smokerProfile]);

  const handleTogglePush = (key: keyof CharGPTPushConfig) => {
    const updated = { ...pushConfig, [key]: !pushConfig[key] };
    setPushConfig(updated);
    savePushConfig(updated);
    if (onShowToast) onShowToast('Push notification preferences saved.');
  };

  const handleToggleAlexa = (key: keyof AlexaIntegrationConfig) => {
    const updated = { ...alexaConfig, [key]: !alexaConfig[key] };
    setAlexaConfig(updated);
    saveAlexaConfig(updated);
    if (onShowToast) onShowToast('Amazon Alexa integration updated.');
  };

  const handleRequestPermission = async () => {
    const perm = await requestBrowserNotificationPermission();
    setPushConfig(loadPushConfig());
    if (perm === 'granted') {
      if (onShowToast) onShowToast('🔔 Push notification permissions granted by browser!');
      sendCharGPTPushNotification('Smoke Stack Push Notifications Enabled', 'You will now receive live alerts for target temperature goals and stall warnings!');
    } else if (perm === 'denied') {
      if (onShowToast) onShowToast('⚠️ Push permissions blocked in browser settings.');
    }
  };

  const handleTestNotification = () => {
    playAudioChime();
    const sent = sendCharGPTPushNotification(
      'Target Finish Goal Reached!',
      `Your Brisket Flat hit 203°F probe tender! ${AI_NAME} recommends pulling it to rest now.`,
      'test-notification'
    );
    setPushConfig(loadPushConfig());
    if (onShowToast) {
      if (sent) {
        onShowToast('✨ Test Push Notification sent to browser!');
      } else {
        onShowToast('🔔 Test Chime played! Grant browser permission to see pop-up banners.');
      }
    }
  };

  const handleCopyLinkCode = () => {
    navigator.clipboard.writeText(alexaConfig.linkCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    if (onShowToast) onShowToast('Copied Alexa Account Linking Code!');
  };

  const handleRegenerateCode = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000);
    const newCode = `ALEXA-SMOKE-${randomPin}`;
    const updated = { ...alexaConfig, linkCode: newCode };
    setAlexaConfig(updated);
    saveAlexaConfig(updated);
    if (onShowToast) onShowToast(`Generated new Alexa link code: ${newCode}`);
  };

  const handleExecuteVoiceQuery = async (queryText?: string) => {
    const query = queryText || simulatedVoiceQuery;
    setSimulatedVoiceQuery(query);
    setIsSimulatingVoice(true);

    try {
      const effectiveSpecs = smokerProfile ? getEffectiveSmokerSpecs(smokerProfile) : null;
      let intent = 'GetMeatTempIntent';
      const qLower = query.toLowerCase();
      if (qLower.includes('all probe') || qLower.includes('probes') || qLower.includes('multi probe')) {
        intent = 'GetAllProbesIntent';
      } else if (qLower.includes('pit') || qLower.includes('ambient') || qLower.includes('smoker temp')) {
        intent = 'GetPitTempIntent';
      } else if (qLower.includes('hopper') || qLower.includes('pellet') || qLower.includes('fuel')) {
        intent = 'GetHopperLevelIntent';
      } else if (qLower.includes('stall') || qLower.includes('wrap')) {
        intent = 'GetStallStatusIntent';
      } else if (qLower.includes('set') || qLower.includes('target') || qLower.includes('goal')) {
        intent = 'SetTempGoalIntent';
      }

      const res = await fetch('/api/alexa/skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent,
          activeCook,
          smokerProfile,
          effectiveSpecs,
        }),
      });

      const data = await res.json();
      const spoken = data?.spokenText || data?.response?.outputSpeech?.ssml?.replace(/<[^>]+>/g, '') || 'Smoke Stack is connected to Alexa.';
      const card = data?.cardText || 'Smoke Stack Skill Online';

      setAlexaResponseText(spoken);
      setAlexaCardContent(card);

      // Play audio spoken voice
      setIsPlayingAudio(true);
      speakAlexaVoice(spoken);
      setTimeout(() => setIsPlayingAudio(false), 4000);

      const updated = {
        ...alexaConfig,
        lastAlexaQuery: query,
        lastAlexaResponse: spoken,
        lastAlexaSync: new Date().toISOString(),
      };
      setAlexaConfig(updated);
      saveAlexaConfig(updated);
    } catch (e) {
      console.error('Alexa skill call failed', e);
      setAlexaResponseText('Sorry, Smoke Stack could not connect to Alexa skill server.');
    } finally {
      setIsSimulatingVoice(false);
    }
  };

  if (isCollapsible) {
    return (
      <div className="bg-[#1a1824] border border-amber-500/30 rounded-2xl overflow-hidden transition-all shadow-lg">
        {/* COLLAPSIBLE HEADER BAR */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-purple-950/80 via-zinc-900 to-amber-950/80 border-b border-amber-500/30 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-3 text-left cursor-pointer group flex-1"
          >
            <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-300 shrink-0">
              <Radio className="w-5 h-5 animate-pulse text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                {titleOverride || 'Amazon Alexa Cloud Sync & Voice Controls'}
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    alexaConfig.enabled
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {alexaConfig.enabled ? 'Alexa Live Sync' : 'Sync Paused'}
                </span>
              </h3>
              <p className="text-xs text-zinc-300">
                Sync live smoker temperature telemetry to Amazon Alexa for hands-free voice queries & Echo alerts
              </p>
            </div>
          </button>

          <div className="flex items-center space-x-2.5 shrink-0 ml-2">
            <div
              className="flex items-center space-x-2 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl cursor-pointer transition-all"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleAlexa('enabled');
              }}
            >
              <span className="text-xs font-bold text-amber-300 hidden sm:inline">Alexa Enabled:</span>
              <input
                type="checkbox"
                checked={alexaConfig.enabled}
                onChange={() => handleToggleAlexa('enabled')}
                className="w-4 h-4 accent-amber-500 cursor-pointer rounded"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-xl transition-all cursor-pointer border border-amber-500/30 flex items-center gap-1 font-bold text-xs"
              title={isExpanded ? 'Collapse Window' : 'Expand Window'}
            >
              <span className="text-[11px] hidden md:inline">{isExpanded ? 'Collapse' : 'Expand'}</span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* COLLAPSIBLE BODY WINDOW */}
        {isExpanded && (
          <div className="p-4 sm:p-5 space-y-6 animate-fade-in">
            {/* SECTION 2: AMAZON ALEXA INTEGRATION & LIVE TELEMETRY SYNC */}
            <div className="bg-[#1f1b2c] border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-amber-500/20 pb-3 gap-2">
                <div className="flex items-center space-x-2.5">
                  <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      Amazon Alexa Skill & Echo Speaker Integration
                      <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                        Cloud Sync
                      </span>
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Connect Smoke Stack with Amazon Alexa to check internal probe temps via Echo voice commands
                    </p>
                  </div>
                </div>

                <label className="flex items-center space-x-2 cursor-pointer bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl hover:bg-amber-500/20 transition-all shrink-0">
                  <span className="text-xs font-extrabold text-amber-300">Enable Alexa Skill Sync</span>
                  <input
                    type="checkbox"
                    checked={alexaConfig.enabled}
                    onChange={() => handleToggleAlexa('enabled')}
                    className="w-4 h-4 accent-amber-500 cursor-pointer rounded"
                  />
                </label>
              </div>

              {/* ALEXA TOGGLABLE CONTROLS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Control 1: Proactive Announcements */}
                <div className="bg-[#12101a] border border-[#2a2838] rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5 pr-2">
                    <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <h5 className="text-xs font-bold text-white">Echo Speaker Voice Alerts</h5>
                      <p className="text-[11px] text-zinc-400">Announce target temps & stalls out loud</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={alexaConfig.proactiveAnnouncementsEnabled}
                    onChange={() => handleToggleAlexa('proactiveAnnouncementsEnabled')}
                    className="w-4 h-4 accent-amber-500 cursor-pointer rounded shrink-0"
                  />
                </div>

                {/* Control 2: Spoken Unit */}
                <div className="bg-[#12101a] border border-[#2a2838] rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5 pr-2">
                    <Thermometer className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <h5 className="text-xs font-bold text-white">Alexa Temperature Unit</h5>
                      <p className="text-[11px] text-zinc-400">Readings spoken in {alexaConfig.spokenTempUnit === 'F' ? 'Fahrenheit' : 'Celsius'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = alexaConfig.spokenTempUnit === 'F' ? 'C' : 'F';
                      const updated = { ...alexaConfig, spokenTempUnit: next };
                      setAlexaConfig(updated);
                      saveAlexaConfig(updated);
                    }}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-xs rounded-lg cursor-pointer transition-all shrink-0"
                  >
                    °{alexaConfig.spokenTempUnit}
                  </button>
                </div>
              </div>

              {/* ALEXA PAIRING LINK CODE & SYNC STATUS */}
              <div className="bg-[#12101a] border border-amber-500/20 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-amber-400" />
                    Alexa Account Linking PIN Code
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
                      const updated = { ...alexaConfig, alexaLinkingCode: newCode };
                      setAlexaConfig(updated);
                      saveAlexaConfig(updated);
                      if (onShowToast) onShowToast('Generated new Alexa linking code');
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh PIN
                  </button>
                </div>

                <div className="flex items-center justify-between bg-[#0a0812] border border-[#232035] rounded-xl p-2.5">
                  <div className="font-mono text-lg font-extrabold tracking-widest text-amber-400">
                    {alexaConfig.alexaLinkingCode || '784-209'}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLinkCode}
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center space-x-1"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied PIN!' : 'Copy Code'}</span>
                  </button>
                </div>
              </div>

              {/* SECTION 3: ALEXA VOICE COMMAND SIMULATOR */}
              <div className="bg-[#12101a] border border-amber-500/30 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Mic className="w-4 h-4 text-amber-400" />
                    <h5 className="text-xs font-bold text-white">Alexa Voice Query Tester & Simulator</h5>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Live Telemetry Sync Active
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={simulatedVoiceQuery}
                    onChange={(e) => setSimulatedVoiceQuery(e.target.value)}
                    placeholder="e.g. Alexa, ask Smoke Stack for meat temp"
                    className="flex-1 bg-[#1a1828] border border-[#2e2a44] text-xs text-white p-2 rounded-xl focus:outline-none focus:border-amber-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => handleExecuteVoiceQuery(simulatedVoiceQuery)}
                    disabled={isSimulatingVoice}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center space-x-1 shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isSimulatingVoice ? 'Asking...' : 'Ask Alexa'}</span>
                  </button>
                </div>

                {alexaResponseText && (
                  <div className="bg-[#1a1828] border border-amber-500/40 rounded-xl p-3 space-y-2 text-xs animate-fade-in shadow-inner">
                    <div className="flex items-center justify-between text-[11px] text-amber-400 font-bold border-b border-amber-500/20 pb-1">
                      <span className="flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                        Amazon Alexa Spoken Output ({alexaConfig.alexaDeviceName})
                      </span>
                      <button
                        type="button"
                        onClick={() => speakAlexaVoice(alexaResponseText)}
                        className="text-[10px] text-amber-300 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Play className="w-3 h-3 fill-current" /> Replay Voice
                      </button>
                    </div>
                    <p className="text-zinc-200 font-medium italic">
                      "{alexaResponseText}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-purple-950/80 via-zinc-900 to-amber-950/80 border border-purple-500/30 rounded-2xl p-4 relative overflow-hidden shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-purple-500/20 border border-purple-500/40 rounded-xl text-purple-300">
              <Bell className="w-6 h-6 animate-pulse text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                Smoke Stack Push Notifications & Amazon Alexa Hub
                <span className="text-[10px] font-mono uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                  v2.5 Live
                </span>
              </h3>
              <p className="text-xs text-zinc-300">
                Receive real-time target temperature goal alerts on your phone, smartwatch, and Amazon Echo speakers.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestNotification}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Test Push Alarm</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: WEB BROWSER PUSH NOTIFICATIONS */}
      <div className="bg-[#1a1824] border border-purple-500/30 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
          <div className="flex items-center space-x-2.5">
            <Smartphone className="w-5 h-5 text-purple-400" />
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                Smoke Stack Running Cook Push Alerts
                {pushConfig.browserPermission === 'granted' ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Permission Granted
                  </span>
                ) : pushConfig.browserPermission === 'denied' ? (
                  <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Permission Denied
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-bold">
                    Permission Required
                  </span>
                )}
              </h4>
              <p className="text-xs text-zinc-400">
                Smoke Stack automatically evaluates active probe readings and fires browser push banners when milestones are hit.
              </p>
            </div>
          </div>

          {pushConfig.browserPermission !== 'granted' && (
            <button
              type="button"
              onClick={handleRequestPermission}
              className="px-3 py-1.5 bg-purple-500 text-zinc-950 font-extrabold text-xs rounded-lg hover:bg-purple-400 transition-all cursor-pointer shrink-0 shadow-md"
            >
              Enable Browser Push
            </button>
          )}
        </div>

        {/* Push Alert Toggles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Toggle 1: Temp Goal Reached */}
          <div className="bg-[#242033] border border-purple-500/20 rounded-xl p-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                🎯 Target Temp Goal Reached
              </span>
              <p className="text-[11px] text-zinc-400">
                Notify instantly when internal meat probe reaches finish goal (e.g. 203°F).
              </p>
            </div>
            <input
              type="checkbox"
              checked={pushConfig.tempGoalAlerts}
              onChange={() => handleTogglePush('tempGoalAlerts')}
              className="w-4 h-4 accent-purple-500 cursor-pointer rounded"
            />
          </div>

          {/* Toggle 2: Approaching Target Temp */}
          <div className="bg-[#242033] border border-purple-500/20 rounded-xl p-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                ⏳ Approaching Finish (Within 5°F)
              </span>
              <p className="text-[11px] text-zinc-400">
                Heads up alert 5°F before finish goal to prep cutting board & rest cooler.
              </p>
            </div>
            <input
              type="checkbox"
              checked={pushConfig.approachingTempAlerts}
              onChange={() => handleTogglePush('approachingTempAlerts')}
              className="w-4 h-4 accent-purple-500 cursor-pointer rounded"
            />
          </div>

          {/* Toggle 3: Pit Temp Drift Guard */}
          <div className="bg-[#242033] border border-purple-500/20 rounded-xl p-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                ⚠️ Pit Temp Drift & Flame Out Guard
              </span>
              <p className="text-[11px] text-zinc-400">
                Alert if smoker pit temperature strays ±20°F from target set point.
              </p>
            </div>
            <input
              type="checkbox"
              checked={pushConfig.pitDriftAlerts}
              onChange={() => handleTogglePush('pitDriftAlerts')}
              className="w-4 h-4 accent-purple-500 cursor-pointer rounded"
            />
          </div>

          {/* Toggle 4: Thermal Stall Warnings */}
          <div className="bg-[#242033] border border-purple-500/20 rounded-xl p-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                🧈 Thermal Stall Phase Warnings
              </span>
              <p className="text-[11px] text-zinc-400">
                Smoke Stack detects meat stall phase (150°F-165°F) and suggests butcher paper wrap.
              </p>
            </div>
            <input
              type="checkbox"
              checked={pushConfig.stallAlerts}
              onChange={() => handleTogglePush('stallAlerts')}
              className="w-4 h-4 accent-purple-500 cursor-pointer rounded"
            />
          </div>

          {/* Toggle 5: Sound Chimes */}
          <div className="bg-[#242033] border border-purple-500/20 rounded-xl p-3 flex items-center justify-between md:col-span-2">
            <div className="space-y-0.5 flex items-center gap-2">
              {pushConfig.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <VolumeX className="w-4 h-4 text-zinc-500 shrink-0" />
              )}
              <div>
                <span className="text-xs font-bold text-white">
                  Audio Chime Feedback
                </span>
                <p className="text-[11px] text-zinc-400">
                  Play arpeggio chime sound through computer/phone speakers on alert.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={pushConfig.soundEnabled}
              onChange={() => handleTogglePush('soundEnabled')}
              className="w-4 h-4 accent-purple-500 cursor-pointer rounded"
            />
          </div>
        </div>

        {pushConfig.lastTriggeredNotification && (
          <div className="bg-purple-950/30 border border-purple-500/20 rounded-xl p-3 text-xs flex items-center justify-between">
            <span className="text-purple-300">
              🔔 Last Push Alert Fired ({pushConfig.lastTriggeredTime}): <strong className="text-white">{pushConfig.lastTriggeredNotification}</strong>
            </span>
            <span className="text-[10px] font-mono text-zinc-400">Active</span>
          </div>
        )}
      </div>

      {/* SECTION 2: AMAZON ALEXA SKILL INTEGRATION & VOICE HUB */}
      <div className="bg-[#181622] border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-amber-500/20 pb-3 gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400">
              <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                Amazon Alexa Skill Integration
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-bold font-mono">
                  Online & Linked
                </span>
              </h4>
              <p className="text-xs text-zinc-400">
                Ask Alexa for live internal meat temps, set temperature goals, check hopper fuel levels, and hear proactive speaker alerts.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-zinc-300 font-medium">Alexa Integration:</span>
            <input
              type="checkbox"
              checked={alexaConfig.enabled}
              onChange={() => handleToggleAlexa('enabled')}
              className="w-4 h-4 accent-amber-500 cursor-pointer rounded"
            />
          </div>
        </div>

        {/* Alexa Account Linking Card */}
        <div className="bg-[#231f2f] border border-amber-500/20 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                Amazon Alexa Skill Linking PIN Code
              </span>
              <p className="text-xs text-zinc-400">
                Enter this code in your Amazon Alexa App under <strong className="text-zinc-200">Skills & Games &gt; {AI_PITMASTER_NAME} &gt; Link Account</strong>.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <div className="px-3 py-1.5 bg-black/60 border border-amber-500/40 rounded-lg font-mono font-extrabold text-amber-300 text-sm tracking-wider">
                {alexaConfig.linkCode}
              </div>
              <button
                type="button"
                onClick={handleCopyLinkCode}
                className="p-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-all cursor-pointer border border-amber-500/30"
                title="Copy Link Code"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleRegenerateCode}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-all cursor-pointer border border-zinc-700"
                title="Generate New Code"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Proactive Announcements Toggle */}
          <div className="pt-2 border-t border-amber-500/15 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-white flex items-center gap-1.5">
                🔊 Amazon Echo Speaker Proactive Audio Announcements
              </span>
              <p className="text-zinc-400 text-[11px]">
                Echo speakers (e.g. {alexaConfig.alexaDeviceName}) automatically announce out loud when target temperature goal is reached!
              </p>
            </div>
            <input
              type="checkbox"
              checked={alexaConfig.proactiveAnnouncementsEnabled}
              onChange={() => handleToggleAlexa('proactiveAnnouncementsEnabled')}
              className="w-4 h-4 accent-amber-500 cursor-pointer rounded"
            />
          </div>
        </div>

        {/* INTERACTIVE ALEXA VOICE COMMAND SIMULATOR */}
        <div className="bg-[#14121d] border border-amber-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mic className="w-4 h-4 text-amber-400" />
              <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                Test Alexa Voice Commands & Spoken Audio Output
              </h5>
            </div>
            {isPlayingAudio && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
                🔊 Alexa Speaking...
              </span>
            )}
          </div>

          {/* Preset Voice Command Chips */}
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleExecuteVoiceQuery('Alexa, ask Smoke Stack for my brisket internal temp')}
              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg cursor-pointer transition-all text-left"
            >
              🎙️ "Alexa, ask Smoke Stack for meat temp"
            </button>
            <button
              type="button"
              onClick={() => handleExecuteVoiceQuery('Alexa, ask Smoke Stack for all probe temperatures')}
              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg cursor-pointer transition-all text-left"
            >
              🌡️ "Alexa, ask Smoke Stack for all probe temps"
            </button>
            <button
              type="button"
              onClick={() => handleExecuteVoiceQuery('Alexa, ask Smoke Stack for pit temperature')}
              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg cursor-pointer transition-all text-left"
            >
              🔥 "Alexa, ask Smoke Stack for pit temp"
            </button>
            <button
              type="button"
              onClick={() => handleExecuteVoiceQuery('Alexa, tell Smoke Stack to notify me when target temp hits 203 degrees')}
              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg cursor-pointer transition-all text-left"
            >
              🎯 "Alexa, set target temp goal to 203°F"
            </button>
            <button
              type="button"
              onClick={() => handleExecuteVoiceQuery('Alexa, ask Smoke Stack pellet hopper fuel status')}
              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg cursor-pointer transition-all text-left"
            >
              🪵 "Alexa, check pellet hopper status"
            </button>
            <button
              type="button"
              onClick={() => handleExecuteVoiceQuery('Alexa, ask Smoke Stack if my brisket is in a thermal stall')}
              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg cursor-pointer transition-all text-left"
            >
              🧈 "Alexa, check stall status"
            </button>
          </div>

          {/* Voice Input Field */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={simulatedVoiceQuery}
              onChange={(e) => setSimulatedVoiceQuery(e.target.value)}
              placeholder="e.g. 'Alexa, ask Smoke Stack what the pit temperature is'..."
              className="flex-1 bg-[#1e1a2b] border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="button"
              onClick={() => handleExecuteVoiceQuery()}
              disabled={isSimulatingVoice}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center space-x-1 shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSimulatingVoice ? 'Asking...' : 'Ask Alexa'}</span>
            </button>
          </div>

          {/* Alexa Response Display Box */}
          {alexaResponseText && (
            <div className="bg-[#1f1b2c] border border-amber-500/40 rounded-xl p-3 space-y-2 text-xs animate-fade-in shadow-inner">
              <div className="flex items-center justify-between text-[11px] text-amber-400 font-bold border-b border-amber-500/20 pb-1">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  Amazon Alexa Spoken Output ({alexaConfig.alexaDeviceName})
                </span>
                <button
                  type="button"
                  onClick={() => speakAlexaVoice(alexaResponseText)}
                  className="text-[10px] text-amber-300 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Play className="w-3 h-3 fill-current" /> Replay Voice
                </button>
              </div>
              <p className="text-zinc-200 font-medium italic">
                "{alexaResponseText}"
              </p>
              {alexaCardContent && (
                <div className="pt-1.5 border-t border-amber-500/10 text-[10px] text-zinc-400 font-mono">
                  📱 Alexa App Screen Card: <span className="text-amber-200">{alexaCardContent}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
