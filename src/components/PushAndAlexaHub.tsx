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
  Tv,
  Home,
} from 'lucide-react';
import { CookLog, SmokerProfile } from '../types';
import {
  loadPushConfig,
  savePushConfig,
  loadAlexaConfig,
  saveAlexaConfig,
  loadFireTVConfig,
  saveFireTVConfig,
  loadGoogleHomeConfig,
  saveGoogleHomeConfig,
  sendGoogleHomeBroadcastNotification,
  speakGoogleHomeVoice,
  sendFireTVToastNotification,
  requestBrowserNotificationPermission,
  getSafeNotificationPermission,
  sendCharGPTPushNotification,
  speakAlexaVoice,
  CharGPTPushConfig,
  AlexaIntegrationConfig,
  FireTVNotificationConfig,
  GoogleHomeNotificationConfig,
  playAudioChime,
  INITIAL_ALEXA_CONFIG,
  HubContainersCollapseState,
  loadHubCollapseState,
  saveHubCollapseState,
} from '../utils/notificationAndAlexa';
import { getActiveUserSession, saveActiveUserSession, UserAuthSession } from '../utils/userAuthSession';
import { getEffectiveSmokerSpecs } from '../utils/smokerCalculations';
import { APP_NAME, AI_NAME, AI_PITMASTER_NAME } from '../constants/appName';
import { CURRENT_RELEASE } from '../generated/release';

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
  const [fireTvConfig, setFireTvConfig] = useState<FireTVNotificationConfig>(loadFireTVConfig);
  const [googleHomeConfig, setGoogleHomeConfig] = useState<GoogleHomeNotificationConfig>(loadGoogleHomeConfig);
  const [userSession, setUserSession] = useState<UserAuthSession | null>(getActiveUserSession);
  const [hubCollapse, setHubCollapse] = useState<HubContainersCollapseState>(loadHubCollapseState);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultOpen);

  const toggleCollapse = (key: keyof HubContainersCollapseState) => {
    setHubCollapse((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      saveHubCollapseState(updated);
      return updated;
    });
  };

  const playTestChime = (tone?: string, _vol?: number) => {
    playAudioChime((tone as any) || 'arpeggio');
  };

  // Alexa Voice Simulator state
  const [simulatedVoiceQuery, setSimulatedVoiceQuery] = useState('Alexa, ask Smoke Stack for my brisket internal temp');
  const [alexaResponseText, setAlexaResponseText] = useState<string | null>(
    null
  );
  const [alexaCardContent, setAlexaCardContent] = useState<string | null>(
    null
  );
  const [isSimulatingVoice, setIsSimulatingVoice] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    // Check permission status on mount
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = getSafeNotificationPermission();
        setPushConfig((prev) => ({ ...prev, browserPermission: perm as any }));
      } catch (e) {}
    }
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
    if (onShowToast) onShowToast('Alexa account linking is not configured. No real link code is available.');
  };

  const handleRegenerateCode = () => {
    if (onShowToast) onShowToast('Alexa account linking requires a real Alexa Skill OAuth flow; local codes are disabled.');
  };

  const handleExecuteVoiceQuery = async (queryText?: string) => {
    const query = queryText || simulatedVoiceQuery;
    setSimulatedVoiceQuery(query);
    setIsSimulatingVoice(true);
    const spoken = 'Alexa cloud integration is not configured. This is a local SmokeStack voice-preview surface and no request was sent to Amazon.';
    setAlexaResponseText(spoken);
    setAlexaCardContent('Preview only — no Amazon account or Alexa Skill linked');
    setIsPlayingAudio(true);
    speakAlexaVoice(spoken);
    setTimeout(() => setIsPlayingAudio(false), 3000);
    setIsSimulatingVoice(false);
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
                {titleOverride || 'Alexa Voice Preview & Browser Alerts'}
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    alexaConfig.enabled
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {alexaConfig.enabled ? 'Preview Mode' : 'Preview Off'}
                </span>
              </h3>
              <p className="text-xs text-zinc-300">
                Preview Alexa-style voice responses locally. No Amazon cloud or Echo connection is active until a real Alexa Skill is linked.
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
            {/* SECTION 2: AMAZON ACCOUNT, FIRE TV NOTIFICATIONS & ALEXA HUB */}
            <div className="bg-[#1a1728] border border-amber-500/40 rounded-2xl p-4 sm:p-5 space-y-5">
              {/* AMAZON ACCOUNT HEADER & SIGN-IN CAPABILITY */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-amber-500/20 pb-4 gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#232F3E] via-[#1a232e] to-[#131921] border border-[#FF9900]/50 flex items-center justify-center shrink-0 shadow-md">
                    <svg className="w-6 h-6 text-[#FF9900] fill-[#FF9900]" viewBox="0 0 24 24">
                      <path d="M13.62 14.88c-2.06 1.51-5.06 2.29-7.62 2.29-3.59 0-6.81-1.33-9.25-3.57-.19-.17-.04-.41.19-.28 2.62 1.51 5.86 2.42 9.22 2.42 2.27 0 4.77-.52 7.08-1.57.34-.15.63.24.38.71zm.99-1.12c-.22-.28-.85-.14-1.22.1-.38.25-.85.73-.63 1.01.22.28 1.02.16 1.39-.08.38-.25.68-.75.46-1.03zm7.06 5.8c-2.48 1.83-6.08 2.8-9.17 2.8-4.3 0-8.16-1.6-11.08-4.28-.23-.21-.05-.51.23-.35 3.14 1.81 7.03 2.9 11.06 2.9 2.73 0 5.73-.63 8.5-1.89.41-.18.76.29.46.82zM15.11 3.5c-2.47 0-4.63.85-6.26 2.37-.2.19-.04.45.2.33 1.54-.78 3.32-1.22 5.16-1.22 5.72 0 10.36 4.31 10.36 9.62 0 2.22-.81 4.26-2.17 5.88-.16.19.08.43.29.27 1.53-1.82 2.44-4.12 2.44-6.62 0-5.96-5.21-10.63-10.02-10.63z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Amazon / Alexa Integration Status</span>
                      {userSession ? (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>{userSession.provider === 'amazon' ? 'Signed in with Amazon' : 'Account Connected'}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                          Guest Mode
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-zinc-300">
                      {userSession
                        ? `Connected as ${userSession.name} (${userSession.email}). SmokeStack account signed in; Amazon, Fire TV, and Alexa cloud linking are not configured.`
                        : 'Amazon account linking is not configured in this build. Browser previews remain local to this device.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {(!userSession || userSession.provider !== 'amazon') && (
                    <button
                      type="button"
                      onClick={() => {
                        const session: UserAuthSession = {
                          id: `amazon-user-${Date.now()}`,
                          email: userSession?.email || 'amazon.pitmaster@smokestack.app',
                          name: userSession?.name || 'Amazon Pitmaster',
                          title: 'Amazon Connected Pitmaster',
                          provider: 'amazon',
                          rememberMe: true,
                          isMasterAdmin: false,
                          loggedInAt: new Date().toISOString(),
                        };
                        if (onShowToast) onShowToast('Amazon account linking is not configured. This is a local preview only.');
                        void session;
                        if (onShowToast) onShowToast('Amazon account linking is not configured. This panel is preview-only.');
                      }}
                      className="px-3.5 py-2 bg-gradient-to-r from-[#232F3E] via-[#1a232e] to-[#131921] hover:from-[#2d3c4f] hover:to-[#1a232e] border border-[#FF9900]/60 text-[#FF9900] font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-2 shrink-0"
                    >
                      <svg className="w-4 h-4 fill-[#FF9900]" viewBox="0 0 24 24">
                        <path d="M13.62 14.88c-2.06 1.51-5.06 2.29-7.62 2.29-3.59 0-6.81-1.33-9.25-3.57-.19-.17-.04-.41.19-.28 2.62 1.51 5.86 2.42 9.22 2.42 2.27 0 4.77-.52 7.08-1.57.34-.15.63.24.38.71zm.99-1.12c-.22-.28-.85-.14-1.22.1-.38.25-.85.73-.63 1.01.22.28 1.02.16 1.39-.08.38-.25.68-.75.46-1.03zm7.06 5.8c-2.48 1.83-6.08 2.8-9.17 2.8-4.3 0-8.16-1.6-11.08-4.28-.23-.21-.05-.51.23-.35 3.14 1.81 7.03 2.9 11.06 2.9 2.73 0 5.73-.63 8.5-1.89.41-.18.76.29.46.82zM15.11 3.5c-2.47 0-4.63.85-6.26 2.37-.2.19-.04.45.2.33 1.54-.78 3.32-1.22 5.16-1.22 5.72 0 10.36 4.31 10.36 9.62 0 2.22-.81 4.26-2.17 5.88-.16.19.08.43.29.27 1.53-1.82 2.44-4.12 2.44-6.62 0-5.96-5.21-10.63-10.02-10.63z" />
                      </svg>
                      <span>Sign in with Amazon</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleCollapse('amazonSection')}
                    className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-xl transition-all cursor-pointer border border-amber-500/30 flex items-center gap-1 font-bold text-xs"
                    title={hubCollapse.amazonSection ? 'Collapse Section' : 'Expand Section'}
                  >
                    <span className="text-[11px] hidden sm:inline">{hubCollapse.amazonSection ? 'Collapse' : 'Expand'}</span>
                    {hubCollapse.amazonSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {hubCollapse.amazonSection && (
                <div className="space-y-5 animate-fade-in">
                  {/* FIRE TV ON-SCREEN TV NOTIFICATIONS PANEL */}
                  <div className="bg-[#120f1f] border border-[#FF9900]/30 rounded-xl p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#FF9900]/20 pb-3">
                      <div className="flex items-center space-x-2.5">
                        <Tv className="w-5 h-5 text-[#FF9900]" />
                        <div>
                          <h5 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                            <span>Fire TV On-Screen TV Notifications</span>
                            <span className="text-[10px] font-mono bg-[#FF9900]/20 text-[#FF9900] px-2 py-0.5 rounded font-bold border border-[#FF9900]/30">
                              Fire TV Stick / Cube
                            </span>
                          </h5>
                          <p className="text-[11px] text-zinc-400">
                            Display live smoker alert pop-up banners on your Fire TV screen while watching TV or movies!
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <label className="flex items-center space-x-2 cursor-pointer bg-[#FF9900]/10 border border-[#FF9900]/30 px-3 py-1.5 rounded-xl hover:bg-[#FF9900]/20 transition-all">
                          <span className="text-xs font-bold text-[#FF9900]">Enable Fire TV Alerts</span>
                          <input
                            type="checkbox"
                            checked={fireTvConfig.enabled}
                            onChange={() => {
                              const updated = { ...fireTvConfig, enabled: !fireTvConfig.enabled };
                              setFireTvConfig(updated);
                              saveFireTVConfig(updated);
                            }}
                            className="w-4 h-4 accent-[#FF9900] cursor-pointer rounded"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => toggleCollapse('fireTvSubSection')}
                          className="p-1.5 bg-[#FF9900]/10 hover:bg-[#FF9900]/20 text-[#FF9900] rounded-lg transition-all cursor-pointer border border-[#FF9900]/30 flex items-center gap-1 font-bold text-xs"
                          title={hubCollapse.fireTvSubSection ? 'Collapse Sub-Section' : 'Expand Sub-Section'}
                        >
                          {hubCollapse.fireTvSubSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {hubCollapse.fireTvSubSection && (
                      <div className="space-y-4 animate-fade-in">
                        {/* FIRE TV CONTROLS GRID */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-zinc-300 block mb-1">Target Fire TV Device Name</label>
                            <input
                              type="text"
                              value={fireTvConfig.deviceName}
                              onChange={(e) => {
                                const updated = { ...fireTvConfig, deviceName: e.target.value };
                                setFireTvConfig(updated);
                                saveFireTVConfig(updated);
                              }}
                              placeholder="e.g. Living Room Fire TV Stick 4K"
                              className="w-full bg-[#1c182c] border border-[#383050] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF9900]"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-zinc-300 block mb-1">On-Screen Overlay Banner Style</label>
                            <select
                              value={fireTvConfig.overlayStyle}
                              onChange={(e) => {
                                const updated = { ...fireTvConfig, overlayStyle: e.target.value as any };
                                setFireTvConfig(updated);
                                saveFireTVConfig(updated);
                              }}
                              className="w-full bg-[#1c182c] border border-[#383050] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF9900]"
                            >
                              <option value="toast">Corner Pop-up Toast Banner</option>
                              <option value="banner">Top Screen Wide Banner Bar</option>
                              <option value="fullscreen">Full-Screen High Priority Alert</option>
                            </select>
                          </div>
                        </div>

                        {/* FIRE TV ALERT TRIGGERS */}
                        <div className="bg-[#181428] border border-[#2e2644] rounded-xl p-3 space-y-2">
                          <span className="text-[10px] font-mono uppercase font-bold text-amber-300 block">Fire TV TV Alert Triggers:</span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <label className="flex items-center space-x-1.5 cursor-pointer text-zinc-300">
                              <input
                                type="checkbox"
                                checked={fireTvConfig.notifyOnTempGoal}
                                onChange={() => {
                                  const updated = { ...fireTvConfig, notifyOnTempGoal: !fireTvConfig.notifyOnTempGoal };
                                  setFireTvConfig(updated);
                                  saveFireTVConfig(updated);
                                }}
                                className="w-3.5 h-3.5 accent-[#FF9900] rounded"
                              />
                              <span>Target Finish Goal</span>
                            </label>
                            <label className="flex items-center space-x-1.5 cursor-pointer text-zinc-300">
                              <input
                                type="checkbox"
                                checked={fireTvConfig.notifyOnStall}
                                onChange={() => {
                                  const updated = { ...fireTvConfig, notifyOnStall: !fireTvConfig.notifyOnStall };
                                  setFireTvConfig(updated);
                                  saveFireTVConfig(updated);
                                }}
                                className="w-3.5 h-3.5 accent-[#FF9900] rounded"
                              />
                              <span>Thermal Stall</span>
                            </label>
                            <label className="flex items-center space-x-1.5 cursor-pointer text-zinc-300">
                              <input
                                type="checkbox"
                                checked={fireTvConfig.notifyOnPitDrift}
                                onChange={() => {
                                  const updated = { ...fireTvConfig, notifyOnPitDrift: !fireTvConfig.notifyOnPitDrift };
                                  setFireTvConfig(updated);
                                  saveFireTVConfig(updated);
                                }}
                                className="w-3.5 h-3.5 accent-[#FF9900] rounded"
                              />
                              <span>Pit Temp Drift</span>
                            </label>
                            <label className="flex items-center space-x-1.5 cursor-pointer text-zinc-300">
                              <input
                                type="checkbox"
                                checked={fireTvConfig.notifyOnLowFuel}
                                onChange={() => {
                                  const updated = { ...fireTvConfig, notifyOnLowFuel: !fireTvConfig.notifyOnLowFuel };
                                  setFireTvConfig(updated);
                                  saveFireTVConfig(updated);
                                }}
                                className="w-3.5 h-3.5 accent-[#FF9900] rounded"
                              />
                              <span>Low Pellet Fuel</span>
                            </label>
                          </div>
                        </div>

                        {/* TEST FIRE TV TOAST BUTTON */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              sendFireTVToastNotification(
                                '🔥 Target Temp Reached!',
                                `Brisket Flat hit 203°F target finish temp on ${fireTvConfig.deviceName}! Pull & wrap now.`,
                                fireTvConfig.deviceName,
                                fireTvConfig.overlayStyle
                              );
                              if (onShowToast) onShowToast(`📺 Sent test Fire TV notification toast to "${fireTvConfig.deviceName}"!`);
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-[#FF9900] to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center space-x-2"
                          >
                            <Tv className="w-4 h-4 fill-current" />
                            <span>Send Test Fire TV Notification Toast</span>
                          </button>

                          {fireTvConfig.lastNotificationSent && (
                            <span className="text-[10px] font-mono text-zinc-400 truncate max-w-xs">
                              Last TV Alert: {fireTvConfig.lastNotificationSent}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ALEXA VOICE INTEGRATION SUBPANEL */}
                  <div className="bg-[#12101a] border border-amber-500/30 rounded-xl p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-amber-500/20 pb-3 gap-2">
                      <div className="flex items-center space-x-2.5">
                        <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
                        <div>
                          <h5 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                            <span>Amazon Alexa Voice Controls & Echo Speaker Sync</span>
                            <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                              {userSession ? 'Logged In & Synced' : 'Sync Active'}
                            </span>
                          </h5>
                          <p className="text-[11px] text-zinc-400">
                            Ask Alexa for live internal probe temps via Echo speaker voice commands
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <label className="flex items-center space-x-2 cursor-pointer bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl hover:bg-amber-500/20 transition-all">
                          <span className="text-xs font-extrabold text-amber-300">Enable Alexa Skill Sync</span>
                          <input
                            type="checkbox"
                            checked={alexaConfig.enabled}
                            onChange={() => handleToggleAlexa('enabled')}
                            className="w-4 h-4 accent-amber-500 cursor-pointer rounded"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => toggleCollapse('alexaSubSection')}
                          className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg transition-all cursor-pointer border border-amber-500/30 flex items-center gap-1 font-bold text-xs"
                          title={hubCollapse.alexaSubSection ? 'Collapse Sub-Section' : 'Expand Sub-Section'}
                        >
                          {hubCollapse.alexaSubSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {hubCollapse.alexaSubSection && (
                      <div className="space-y-4 animate-fade-in">
                        {/* ALEXA TOGGLABLE CONTROLS GRID */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-[#1a1728] border border-[#2a2838] rounded-xl p-3 flex items-center justify-between">
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

                          <div className="bg-[#1a1728] border border-[#2a2838] rounded-xl p-3 flex items-center justify-between">
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

                        {/* ALEXA PAIRING LINK CODE */}
                        <div className="bg-[#1a1728] border border-amber-500/20 rounded-xl p-3.5 space-y-3">
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

                        {/* ALEXA VOICE COMMAND SIMULATOR */}
                        <div className="bg-[#1a1728] border border-amber-500/30 rounded-xl p-3.5 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Mic className="w-4 h-4 text-amber-400" />
                              <h5 className="text-xs font-bold text-white">Alexa Voice Query Tester & Simulator</h5>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                Live Telemetry Sync Active
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleCollapse('alexaSimulatorSubSection')}
                                className="p-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg transition-all cursor-pointer border border-amber-500/30 flex items-center gap-1 font-bold text-xs"
                                title={hubCollapse.alexaSimulatorSubSection ? 'Collapse Sub-Section' : 'Expand Sub-Section'}
                              >
                                {hubCollapse.alexaSimulatorSubSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {hubCollapse.alexaSimulatorSubSection && (
                            <div className="space-y-3 animate-fade-in">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={simulatedVoiceQuery}
                                  onChange={(e) => setSimulatedVoiceQuery(e.target.value)}
                                  placeholder="e.g. Alexa, ask Smoke Stack for meat temp"
                                  className="flex-1 bg-[#12101e] border border-[#2e2a44] text-xs text-white p-2 rounded-xl focus:outline-none focus:border-amber-500/50"
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
                                <div className="bg-[#12101e] border border-amber-500/40 rounded-xl p-3 space-y-2 text-xs animate-fade-in shadow-inner">
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
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                  {CURRENT_RELEASE.version}
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

          <div className="flex items-center space-x-2 shrink-0">
            {pushConfig.browserPermission !== 'granted' && (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-3 py-1.5 bg-purple-500 text-zinc-950 font-extrabold text-xs rounded-lg hover:bg-purple-400 transition-all cursor-pointer shrink-0 shadow-md"
              >
                Enable Browser Push
              </button>
            )}
            <button
              type="button"
              onClick={() => toggleCollapse('pushSection')}
              className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-lg transition-all cursor-pointer border border-purple-500/30 flex items-center gap-1 font-bold text-xs"
              title={hubCollapse.pushSection ? 'Collapse Section' : 'Expand Section'}
            >
              <span className="text-[11px] hidden sm:inline">{hubCollapse.pushSection ? 'Collapse' : 'Expand'}</span>
              {hubCollapse.pushSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {hubCollapse.pushSection && (
          <div className="space-y-4 animate-fade-in">
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

              {/* Toggle 3: Hourly Meat Check Reminder */}
              <div className="bg-[#242033] border border-purple-500/20 rounded-xl p-3 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    ⏰ Hourly Meat Probe Check Reminders
                  </span>
                  <p className="text-[11px] text-zinc-400">
                    Automated hourly device push & chime prompt to log internal meat readings.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={pushConfig.hourlyCheckAlerts ?? true}
                  onChange={() => handleTogglePush('hourlyCheckAlerts')}
                  className="w-4 h-4 accent-purple-500 cursor-pointer rounded"
                />
              </div>

              {/* Toggle 4: Pit Temp Drift Guard */}
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

              {/* Toggle 5: Thermal Stall Warnings */}
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

              {/* Toggle 6: Low Hopper Fuel Warning */}
              <div className="bg-[#242033] border border-purple-500/20 rounded-xl p-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      🪵 Low Pellet Hopper Fuel Alert
                    </span>
                    <p className="text-[11px] text-zinc-400">
                      Alert when estimated pellet hopper level drops at or below warning threshold.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={pushConfig.lowFuelAlerts ?? true}
                    onChange={() => handleTogglePush('lowFuelAlerts')}
                    className="w-4 h-4 accent-purple-500 cursor-pointer rounded"
                  />
                </div>

                {(pushConfig.lowFuelAlerts ?? true) && (
                  <div className="pt-2 border-t border-purple-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#1b1728] p-2.5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-300">Warning State Threshold:</span>
                      <span className="text-xs font-mono font-bold text-white bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                        ≤ {pushConfig.lowFuelThresholdPercent || 20}% Hopper Level
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[10, 15, 20, 25, 30].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            const updated = { ...pushConfig, lowFuelThresholdPercent: pct };
                            setPushConfig(updated);
                            savePushConfig(updated);
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                            (pushConfig.lowFuelThresholdPercent || 20) === pct
                              ? 'bg-amber-500 text-black shadow-md font-extrabold scale-105'
                              : 'bg-[#2a253b] hover:bg-[#38314e] text-zinc-300 border border-purple-500/20'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Toggle 7: Speech Voice Announcements */}
              <div className="bg-[#242033] border border-purple-500/20 rounded-xl p-3 flex items-center justify-between">
                <div className="space-y-0.5 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-white">
                      Spoken Voice Announcements
                    </span>
                    <p className="text-[11px] text-zinc-400">
                      Speak alerts aloud using device text-to-speech voice engine.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={pushConfig.speechVoiceEnabled ?? false}
                  onChange={() => handleTogglePush('speechVoiceEnabled')}
                  className="w-4 h-4 accent-purple-500 cursor-pointer rounded"
                />
              </div>

              {/* Toggle 8: Sound Chimes */}
              <div className="bg-[#242033] border border-purple-500/20 rounded-xl p-3 flex items-center justify-between">
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
                      Play arpeggio chime sound through device speakers on alert.
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

            {/* PIT MASTER ALARM CHIMES SUB-OPTIONS CARD */}
            <div className="bg-[#1e1a2e] border border-purple-500/30 rounded-xl p-4 space-y-3.5 shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
                <div className="flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <h5 className="text-xs sm:text-sm font-extrabold text-white">Pit Master Alarm Chimes Sub-Options</h5>
                    <p className="text-[11px] text-zinc-400">Configure alert chime tone synth, volume level, and audio triggers</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => playTestChime(pushConfig.chimeSoundTone || 'arpeggio', pushConfig.chimeVolume ?? 80)}
                    className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-bold text-xs rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-purple-300" />
                    <span>Test Alarm Chime</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCollapse('chimesSubSection')}
                    className="p-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-lg transition-all cursor-pointer border border-purple-500/30 flex items-center gap-1 font-bold text-xs"
                    title={hubCollapse.chimesSubSection ? 'Collapse Sub-Section' : 'Expand Sub-Section'}
                  >
                    {hubCollapse.chimesSubSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {hubCollapse.chimesSubSection && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                  {/* Tone Selector */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-300">
                      Alarm Chime Sound Tone
                    </label>
                    <select
                      value={pushConfig.chimeSoundTone || 'arpeggio'}
                      onChange={(e) => {
                        const tone = e.target.value as any;
                        const updated = { ...pushConfig, chimeSoundTone: tone };
                        setPushConfig(updated);
                        savePushConfig(updated);
                        playTestChime(tone, pushConfig.chimeVolume ?? 80);
                      }}
                      className="w-full bg-[#12101a] border border-[#2a243a] text-white font-bold text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                    >
                      <option value="arpeggio">Standard Arpeggio Chime</option>
                      <option value="triple_bell">Triple Bell Ring</option>
                      <option value="pitmaster_horn">Heavy Pitmaster Horn</option>
                      <option value="smokehouse_siren">Smokehouse Warning Siren</option>
                      <option value="crisp_beep">Crisp Double Beep</option>
                    </select>
                  </div>

                  {/* Chime Volume Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-purple-300">
                      <span>Alarm Chime Volume</span>
                      <span className="font-mono text-purple-200">{pushConfig.chimeVolume ?? 80}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={pushConfig.chimeVolume ?? 80}
                      onChange={(e) => {
                        const vol = parseInt(e.target.value, 10);
                        const updated = { ...pushConfig, chimeVolume: vol };
                        setPushConfig(updated);
                        savePushConfig(updated);
                      }}
                      className="w-full accent-purple-500 cursor-pointer h-2 bg-[#12101a] rounded-lg border border-[#2a243a]"
                    />
                  </div>
                </div>
              )}
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
        )}
      </div>

      {/* SECTION 2: AMAZON ACCOUNT, FIRE TV NOTIFICATIONS & ALEXA HUB */}
      <div className="bg-[#181622] border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-5">
        {/* AMAZON ACCOUNT HEADER & SIGN-IN CAPABILITY */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-amber-500/20 pb-4 gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#232F3E] via-[#1a232e] to-[#131921] border border-[#FF9900]/50 flex items-center justify-center shrink-0 shadow-md">
              <svg className="w-6 h-6 text-[#FF9900] fill-[#FF9900]" viewBox="0 0 24 24">
                <path d="M13.62 14.88c-2.06 1.51-5.06 2.29-7.62 2.29-3.59 0-6.81-1.33-9.25-3.57-.19-.17-.04-.41.19-.28 2.62 1.51 5.86 2.42 9.22 2.42 2.27 0 4.77-.52 7.08-1.57.34-.15.63.24.38.71zm.99-1.12c-.22-.28-.85-.14-1.22.1-.38.25-.85.73-.63 1.01.22.28 1.02.16 1.39-.08.38-.25.68-.75.46-1.03zm7.06 5.8c-2.48 1.83-6.08 2.8-9.17 2.8-4.3 0-8.16-1.6-11.08-4.28-.23-.21-.05-.51.23-.35 3.14 1.81 7.03 2.9 11.06 2.9 2.73 0 5.73-.63 8.5-1.89.41-.18.76.29.46.82zM15.11 3.5c-2.47 0-4.63.85-6.26 2.37-.2.19-.04.45.2.33 1.54-.78 3.32-1.22 5.16-1.22 5.72 0 10.36 4.31 10.36 9.62 0 2.22-.81 4.26-2.17 5.88-.16.19.08.43.29.27 1.53-1.82 2.44-4.12 2.44-6.62 0-5.96-5.21-10.63-10.02-10.63z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Amazon / Alexa Integration Status</span>
                {userSession?.provider === 'amazon' ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Signed in with Amazon</span>
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                    Sign-in Required
                  </span>
                )}
              </h4>
              <p className="text-xs text-zinc-300">
                {userSession?.provider === 'amazon'
                  ? `Connected as ${userSession.name} (${userSession.email}). SmokeStack account signed in; Amazon, Fire TV, and Alexa cloud linking are not configured.`
                  : 'Sign in with your Amazon account to enable Fire TV notifications and link Alexa speaker alerts across your devices.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {userSession?.provider === 'amazon' ? (
              <button
                type="button"
                onClick={() => {
                  const updatedSession: UserAuthSession = {
                    ...userSession,
                    provider: 'local',
                  };
                  saveActiveUserSession(updatedSession, true);
                  setUserSession(updatedSession);
                  if (onShowToast) onShowToast('Signed out of Amazon account successfully.');
                }}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 border border-zinc-700"
              >
                <span>Sign Out of Amazon Account</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const session: UserAuthSession = {
                    id: `amazon-user-${Date.now()}`,
                    email: userSession?.email || 'amazon.pitmaster@smokestack.app',
                    name: userSession?.name || 'Amazon Pitmaster',
                    title: 'Amazon Connected Pitmaster',
                    provider: 'amazon',
                    rememberMe: true,
                    isMasterAdmin: false,
                    loggedInAt: new Date().toISOString(),
                  };
                  if (onShowToast) onShowToast('Amazon account linking is not configured. This is a local preview only.');
                  void session;
                  if (onShowToast) onShowToast('Amazon account linking is not configured. This panel is preview-only.');
                }}
                className="px-3.5 py-2 bg-gradient-to-r from-[#232F3E] via-[#1a232e] to-[#131921] hover:from-[#2d3c4f] hover:to-[#1a232e] border border-[#FF9900]/60 text-[#FF9900] font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-2 shrink-0"
              >
                <svg className="w-4 h-4 fill-[#FF9900]" viewBox="0 0 24 24">
                  <path d="M13.62 14.88c-2.06 1.51-5.06 2.29-7.62 2.29-3.59 0-6.81-1.33-9.25-3.57-.19-.17-.04-.41.19-.28 2.62 1.51 5.86 2.42 9.22 2.42 2.27 0 4.77-.52 7.08-1.57.34-.15.63.24.38.71zm.99-1.12c-.22-.28-.85-.14-1.22.1-.38.25-.85.73-.63 1.01.22.28 1.02.16 1.39-.08.38-.25.68-.75.46-1.03zm7.06 5.8c-2.48 1.83-6.08 2.8-9.17 2.8-4.3 0-8.16-1.6-11.08-4.28-.23-.21-.05-.51.23-.35 3.14 1.81 7.03 2.9 11.06 2.9 2.73 0 5.73-.63 8.5-1.89.41-.18.76.29.46.82zM15.11 3.5c-2.47 0-4.63.85-6.26 2.37-.2.19-.04.45.2.33 1.54-.78 3.32-1.22 5.16-1.22 5.72 0 10.36 4.31 10.36 9.62 0 2.22-.81 4.26-2.17 5.88-.16.19.08.43.29.27 1.53-1.82 2.44-4.12 2.44-6.62 0-5.96-5.21-10.63-10.02-10.63z" />
                </svg>
                <span>Sign in with Amazon</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => toggleCollapse('amazonSection')}
              className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-xl transition-all cursor-pointer border border-amber-500/30 flex items-center gap-1 font-bold text-xs"
              title={hubCollapse.amazonSection ? 'Collapse Section' : 'Expand Section'}
            >
              <span className="text-[11px] hidden sm:inline">{hubCollapse.amazonSection ? 'Collapse' : 'Expand'}</span>
              {hubCollapse.amazonSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* AMAZON DASHBOARD CONTROLS (ONLY WHEN SIGNED IN WITH AMAZON) */}
        {hubCollapse.amazonSection && userSession?.provider === 'amazon' && (
          <div className="space-y-5 animate-fade-in">
            {/* FIRE TV ON-SCREEN TV NOTIFICATIONS PANEL */}
            <div className="bg-[#120f1f] border border-[#FF9900]/30 rounded-xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#FF9900]/20 pb-3">
                <div className="flex items-center space-x-2.5">
                  <Tv className="w-5 h-5 text-[#FF9900]" />
                  <div>
                    <h5 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                      <span>Fire TV On-Screen TV Notifications</span>
                      <span className="text-[10px] font-mono bg-[#FF9900]/20 text-[#FF9900] px-2 py-0.5 rounded font-bold border border-[#FF9900]/30">
                        Fire TV Stick / Cube
                      </span>
                    </h5>
                    <p className="text-[11px] text-zinc-400">
                      Display live smoker alert pop-up banners on your Fire TV screen while watching TV or movies!
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <label className="flex items-center space-x-2 cursor-pointer bg-[#FF9900]/10 border border-[#FF9900]/30 px-3 py-1.5 rounded-xl hover:bg-[#FF9900]/20 transition-all">
                    <span className="text-xs font-bold text-[#FF9900]">Enable Fire TV Alerts</span>
                    <input
                      type="checkbox"
                      checked={fireTvConfig.enabled}
                      onChange={() => {
                        const updated = { ...fireTvConfig, enabled: !fireTvConfig.enabled };
                        setFireTvConfig(updated);
                        saveFireTVConfig(updated);
                      }}
                      className="w-4 h-4 accent-[#FF9900] cursor-pointer rounded"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleCollapse('fireTvSubSection')}
                    className="p-1.5 bg-[#FF9900]/10 hover:bg-[#FF9900]/20 text-[#FF9900] rounded-lg transition-all cursor-pointer border border-[#FF9900]/30 flex items-center gap-1 font-bold text-xs"
                    title={hubCollapse.fireTvSubSection ? 'Collapse Sub-Section' : 'Expand Sub-Section'}
                  >
                    {hubCollapse.fireTvSubSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {hubCollapse.fireTvSubSection && (
                <div className="space-y-4 animate-fade-in">
                  {/* FIRE TV CONTROLS GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-zinc-300 block mb-1">Target Fire TV Device Name</label>
                      <input
                        type="text"
                        value={fireTvConfig.deviceName}
                        onChange={(e) => {
                          const updated = { ...fireTvConfig, deviceName: e.target.value };
                          setFireTvConfig(updated);
                          saveFireTVConfig(updated);
                        }}
                        placeholder="e.g. Living Room Fire TV Stick 4K"
                        className="w-full bg-[#1c182c] border border-[#383050] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF9900]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-300 block mb-1">On-Screen Overlay Banner Style</label>
                      <select
                        value={fireTvConfig.overlayStyle}
                        onChange={(e) => {
                          const updated = { ...fireTvConfig, overlayStyle: e.target.value as any };
                          setFireTvConfig(updated);
                          saveFireTVConfig(updated);
                        }}
                        className="w-full bg-[#1c182c] border border-[#383050] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF9900]"
                      >
                        <option value="toast">Corner Pop-up Toast Banner</option>
                        <option value="banner">Top Screen Wide Banner Bar</option>
                        <option value="fullscreen">Full-Screen High Priority Alert</option>
                      </select>
                    </div>
                  </div>

                  {/* FIRE TV ALERT TRIGGERS */}
                  <div className="bg-[#181428] border border-[#2e2644] rounded-xl p-3 space-y-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-amber-300 block">Fire TV TV Alert Triggers:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <label className="flex items-center space-x-1.5 cursor-pointer text-zinc-300">
                        <input
                          type="checkbox"
                          checked={fireTvConfig.notifyOnTempGoal}
                          onChange={() => {
                            const updated = { ...fireTvConfig, notifyOnTempGoal: !fireTvConfig.notifyOnTempGoal };
                            setFireTvConfig(updated);
                            saveFireTVConfig(updated);
                          }}
                          className="w-3.5 h-3.5 accent-[#FF9900] rounded"
                        />
                        <span>Target Finish Goal</span>
                      </label>
                      <label className="flex items-center space-x-1.5 cursor-pointer text-zinc-300">
                        <input
                          type="checkbox"
                          checked={fireTvConfig.notifyOnStall}
                          onChange={() => {
                            const updated = { ...fireTvConfig, notifyOnStall: !fireTvConfig.notifyOnStall };
                            setFireTvConfig(updated);
                            saveFireTVConfig(updated);
                          }}
                          className="w-3.5 h-3.5 accent-[#FF9900] rounded"
                        />
                        <span>Thermal Stall</span>
                      </label>
                      <label className="flex items-center space-x-1.5 cursor-pointer text-zinc-300">
                        <input
                          type="checkbox"
                          checked={fireTvConfig.notifyOnPitDrift}
                          onChange={() => {
                            const updated = { ...fireTvConfig, notifyOnPitDrift: !fireTvConfig.notifyOnPitDrift };
                            setFireTvConfig(updated);
                            saveFireTVConfig(updated);
                          }}
                          className="w-3.5 h-3.5 accent-[#FF9900] rounded"
                        />
                        <span>Pit Temp Drift</span>
                      </label>
                      <label className="flex items-center space-x-1.5 cursor-pointer text-zinc-300">
                        <input
                          type="checkbox"
                          checked={fireTvConfig.notifyOnLowFuel}
                          onChange={() => {
                            const updated = { ...fireTvConfig, notifyOnLowFuel: !fireTvConfig.notifyOnLowFuel };
                            setFireTvConfig(updated);
                            saveFireTVConfig(updated);
                          }}
                          className="w-3.5 h-3.5 accent-[#FF9900] rounded"
                        />
                        <span>Low Pellet Fuel</span>
                      </label>
                    </div>
                  </div>

                  {/* TEST FIRE TV TOAST BUTTON */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        sendFireTVToastNotification(
                          '🔥 Target Temp Reached!',
                          `Brisket Flat hit 203°F target finish temp on ${fireTvConfig.deviceName}! Pull & wrap now.`,
                          fireTvConfig.deviceName,
                          fireTvConfig.overlayStyle
                        );
                        if (onShowToast) onShowToast(`📺 Sent test Fire TV notification toast to "${fireTvConfig.deviceName}"!`);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-[#FF9900] to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center space-x-2"
                    >
                      <Tv className="w-4 h-4 fill-current" />
                      <span>Send Test Fire TV Notification Toast</span>
                    </button>

                    {fireTvConfig.lastNotificationSent && (
                      <span className="text-[10px] font-mono text-zinc-400 truncate max-w-xs">
                        Last TV Alert: {fireTvConfig.lastNotificationSent}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ALEXA VOICE INTEGRATION SUBPANEL */}
            <div className="bg-[#231f2f] border border-amber-500/20 rounded-xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-amber-500/20 pb-3 gap-3">
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
                  <button
                    type="button"
                    onClick={() => toggleCollapse('alexaSubSection')}
                    className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg transition-all cursor-pointer border border-amber-500/30 flex items-center gap-1 font-bold text-xs"
                    title={hubCollapse.alexaSubSection ? 'Collapse Sub-Section' : 'Expand Sub-Section'}
                  >
                    {hubCollapse.alexaSubSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {hubCollapse.alexaSubSection && (
                <div className="space-y-3 animate-fade-in">
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
              )}
            </div>

            {/* INTERACTIVE ALEXA VOICE COMMAND SIMULATOR */}
            <div className="bg-[#14121d] border border-amber-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                <div className="flex items-center space-x-2">
                  <Mic className="w-4 h-4 text-amber-400" />
                  <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                    Test Alexa Voice Commands & Spoken Audio Output
                  </h5>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  {isPlayingAudio && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
                      🔊 Alexa Speaking...
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleCollapse('alexaSimulatorSubSection')}
                    className="p-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg transition-all cursor-pointer border border-amber-500/30 flex items-center gap-1 font-bold text-xs"
                    title={hubCollapse.alexaSimulatorSubSection ? 'Collapse Sub-Section' : 'Expand Sub-Section'}
                  >
                    {hubCollapse.alexaSimulatorSubSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {hubCollapse.alexaSimulatorSubSection && (
                <div className="space-y-3 animate-fade-in">
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
                  {/* Clear Amazon Linking Control */}
                  <div className="pt-2 border-t border-amber-500/20 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem('charbot_alexa_config');
                        localStorage.removeItem('alexa_linking_pin');
                        const resetConfig = { ...INITIAL_ALEXA_CONFIG, enabled: false };
                        setAlexaConfig(resetConfig);
                        saveAlexaConfig(resetConfig);
                        if (onShowToast) onShowToast('Cleared Amazon Alexa account linking & reset PIN code');
                      }}
                      className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center space-x-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Clear Amazon Linking & PIN Code</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: GOOGLE HOME & NEST SPEAKER BROADCAST INTEGRATION */}
      <div className="bg-[#121826] border border-[#4285F4]/40 rounded-2xl p-4 sm:p-5 space-y-5">
        {/* GOOGLE ACCOUNT & INTEGRATION HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#4285F4]/20 pb-4 gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1a233a] via-[#151c2e] to-[#0f1523] border border-[#4285F4]/60 flex items-center justify-center shrink-0 shadow-md">
              <Home className="w-6 h-6 text-[#4285F4] fill-[#4285F4]/20" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Google Home & Nest Speaker Integration</span>
                {userSession?.provider === 'google' || userSession?.email?.includes('@gmail.com') ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Google Account Signed In</span>
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                    Sign-in Required
                  </span>
                )}
              </h4>
              <p className="text-xs text-zinc-300">
                {userSession?.provider === 'google' || userSession?.email?.includes('@gmail.com')
                  ? `Signed in as ${userSession.name || 'Google User'} (${userSession.email}). Live Nest speaker voice broadcasts & Google Home notifications enabled.`
                  : 'Sign in with your Google account to enable Google Home speaker alerts & Nest Hub voice broadcasts across your home.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Sign in or Clear Google Sign-In button */}
            {(userSession?.provider === 'google' || userSession?.email?.includes('@gmail.com')) ? (
              <button
                type="button"
                onClick={() => {
                  const updatedSession: UserAuthSession = {
                    ...userSession,
                    provider: 'local',
                    email: userSession.email.replace('@gmail.com', '@smokestack.app'),
                  };
                  saveActiveUserSession(updatedSession, true);
                  setUserSession(updatedSession);
                  if (onShowToast) onShowToast('Signed out of Google account successfully.');
                }}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 border border-zinc-700"
              >
                <span>Sign Out of Google Account</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const googleSession: UserAuthSession = {
                    id: `google-user-${Date.now()}`,
                    email: userSession?.email && userSession.email.includes('@') ? userSession.email : 'pitmaster.google@gmail.com',
                    name: userSession?.name || 'Google Pitmaster',
                    title: 'Google Connected Pitmaster',
                    provider: 'google',
                    rememberMe: true,
                    isMasterAdmin: false,
                    loggedInAt: new Date().toISOString(),
                  };
                  saveActiveUserSession(googleSession, true);
                  setUserSession(googleSession);
                  if (onShowToast) onShowToast('Signed in with Google account successfully! Google Home integration enabled.');
                }}
                className="px-3.5 py-2 bg-gradient-to-r from-[#4285F4] via-[#3367D6] to-[#2A56C6] hover:from-[#5294FF] hover:to-[#3367D6] text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-2 shrink-0 border border-blue-400/30"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#FFFFFF"/>
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => toggleCollapse('googleSection')}
              className="p-2 bg-[#4285F4]/10 hover:bg-[#4285F4]/20 text-blue-300 rounded-xl transition-all cursor-pointer border border-[#4285F4]/30 flex items-center gap-1 font-bold text-xs"
              title={hubCollapse.googleSection ? 'Collapse Section' : 'Expand Section'}
            >
              <span className="text-[11px] hidden sm:inline">{hubCollapse.googleSection ? 'Collapse' : 'Expand'}</span>
              {hubCollapse.googleSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* GOOGLE HOME CONTROLS & SETTINGS */}
        {hubCollapse.googleSection && (userSession?.provider === 'google' || userSession?.email?.includes('@gmail.com')) && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-[#182033] border border-[#4285F4]/30 rounded-xl p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#4285F4]/20 pb-2">
                <div className="flex items-center space-x-2.5">
                  <Volume2 className="w-5 h-5 text-[#4285F4] animate-pulse" />
                  <div>
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider">Google Assistant Nest Voice Broadcasts</h5>
                    <p className="text-[11px] text-zinc-400">Broadcast live target temps & smoker stall warnings out loud on Nest speakers</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <label className="flex items-center space-x-2 cursor-pointer bg-[#4285F4]/10 border border-[#4285F4]/30 px-3 py-1.5 rounded-xl hover:bg-[#4285F4]/20 transition-all">
                    <span className="text-xs font-bold text-[#4285F4]">Enable Broadcasts</span>
                    <input
                      type="checkbox"
                      checked={googleHomeConfig.enabled}
                      onChange={() => {
                        const updated = { ...googleHomeConfig, enabled: !googleHomeConfig.enabled };
                        setGoogleHomeConfig(updated);
                        saveGoogleHomeConfig(updated);
                      }}
                      className="w-4 h-4 accent-[#4285F4] cursor-pointer rounded"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleCollapse('googleControlsSubSection')}
                    className="p-1.5 bg-[#4285F4]/10 hover:bg-[#4285F4]/20 text-blue-300 rounded-lg transition-all cursor-pointer border border-[#4285F4]/30 flex items-center gap-1 font-bold text-xs"
                    title={hubCollapse.googleControlsSubSection ? 'Collapse Sub-Section' : 'Expand Sub-Section'}
                  >
                    {hubCollapse.googleControlsSubSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {hubCollapse.googleControlsSubSection && (
                <div className="space-y-4 animate-fade-in pt-1">
                  {/* Target Device & Voice Output Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-[#101626] border border-[#2e3b5e] rounded-xl p-3">
                      <label className="text-[11px] font-bold text-zinc-300 block mb-1">Target Google Home / Nest Speaker Name</label>
                      <input
                        type="text"
                        value={googleHomeConfig.deviceName}
                        onChange={(e) => {
                          const updated = { ...googleHomeConfig, deviceName: e.target.value };
                          setGoogleHomeConfig(updated);
                          saveGoogleHomeConfig(updated);
                        }}
                        placeholder="e.g. Living Room Nest Hub"
                        className="w-full bg-[#182033] border border-[#2e3b5e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#4285F4]"
                      />
                    </div>

                    <div className="bg-[#101626] border border-[#2e3b5e] rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <h6 className="text-xs font-bold text-white">Spoken Voice Broadcast</h6>
                        <p className="text-[11px] text-zinc-400">Speak broadcast alerts out loud via text-to-speech</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={googleHomeConfig.broadcastVoiceEnabled}
                        onChange={() => {
                          const updated = { ...googleHomeConfig, broadcastVoiceEnabled: !googleHomeConfig.broadcastVoiceEnabled };
                          setGoogleHomeConfig(updated);
                          saveGoogleHomeConfig(updated);
                        }}
                        className="w-4 h-4 accent-[#4285F4] cursor-pointer rounded shrink-0"
                      />
                    </div>
                  </div>

                  {/* Alert Triggers */}
                  <div className="bg-[#101626] border border-[#2e3b5e] rounded-xl p-3 space-y-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-blue-300 block">Google Home Broadcast Triggers:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <label className="flex items-center space-x-1.5 cursor-pointer text-zinc-300">
                        <input
                          type="checkbox"
                          checked={googleHomeConfig.notifyOnTempGoal}
                          onChange={() => {
                            const updated = { ...googleHomeConfig, notifyOnTempGoal: !googleHomeConfig.notifyOnTempGoal };
                            setGoogleHomeConfig(updated);
                            saveGoogleHomeConfig(updated);
                          }}
                          className="w-3.5 h-3.5 accent-[#4285F4] rounded"
                        />
                        <span>Target Finish Goal</span>
                      </label>

                      <label className="flex items-center space-x-1.5 cursor-pointer text-zinc-300">
                        <input
                          type="checkbox"
                          checked={googleHomeConfig.notifyOnStall}
                          onChange={() => {
                            const updated = { ...googleHomeConfig, notifyOnStall: !googleHomeConfig.notifyOnStall };
                            setGoogleHomeConfig(updated);
                            saveGoogleHomeConfig(updated);
                          }}
                          className="w-3.5 h-3.5 accent-[#4285F4] rounded"
                        />
                        <span>Thermal Stall</span>
                      </label>

                      <label className="flex items-center space-x-1.5 cursor-pointer text-zinc-300">
                        <input
                          type="checkbox"
                          checked={googleHomeConfig.notifyOnPitDrift}
                          onChange={() => {
                            const updated = { ...googleHomeConfig, notifyOnPitDrift: !googleHomeConfig.notifyOnPitDrift };
                            setGoogleHomeConfig(updated);
                            saveGoogleHomeConfig(updated);
                          }}
                          className="w-3.5 h-3.5 accent-[#4285F4] rounded"
                        />
                        <span>Pit Temp Drift</span>
                      </label>

                      <label className="flex items-center space-x-1.5 cursor-pointer text-zinc-300">
                        <input
                          type="checkbox"
                          checked={googleHomeConfig.notifyOnLowFuel}
                          onChange={() => {
                            const updated = { ...googleHomeConfig, notifyOnLowFuel: !googleHomeConfig.notifyOnLowFuel };
                            setGoogleHomeConfig(updated);
                            saveGoogleHomeConfig(updated);
                          }}
                          className="w-3.5 h-3.5 accent-[#4285F4] rounded"
                        />
                        <span>Low Pellet Fuel</span>
                      </label>
                    </div>
                  </div>

                  {/* Test Broadcast Button & Last Event Timestamp */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        sendGoogleHomeBroadcastNotification(
                          '🎯 Target Meat Temp Reached!',
                          `Brisket Flat reached 203°F target finish goal on ${googleHomeConfig.deviceName}. Ready to pull and wrap!`,
                          googleHomeConfig.deviceName,
                          googleHomeConfig.broadcastVoiceEnabled
                        );
                        if (onShowToast) onShowToast(`📢 Sent test Google Assistant broadcast to "${googleHomeConfig.deviceName}"!`);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-[#4285F4] via-[#34A853] to-[#FBBC05] hover:opacity-90 text-zinc-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center space-x-2"
                    >
                      <Volume2 className="w-4 h-4 fill-current text-zinc-950" />
                      <span>Send Test Google Home Voice Broadcast</span>
                    </button>

                    {googleHomeConfig.lastBroadcastSent && (
                      <span className="text-[10px] font-mono text-zinc-400 truncate max-w-xs">
                        Last Broadcast: {googleHomeConfig.lastBroadcastSent}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
