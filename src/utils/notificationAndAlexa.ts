import { CookLog, ProbeAlertConfig, SmokerProfile } from '../types';
import { AI_NAME } from '../constants/appName';
import { safeSetItem, KEYS, loadCookLogs, loadFuelLogs } from './storage';
import { calculateRefillPelletUsage } from './smokerManufacturerData';

export interface CharGPTPushConfig {
  enabled: boolean;
  tempGoalAlerts: boolean; // Notify when target internal meat temp is reached
  approachingTempAlerts: boolean; // Notify when within 5°F of target
  hourlyCheckAlerts: boolean; // Hourly probe check reminder
  pitDriftAlerts: boolean; // Notify when pit strays ±15°F from target
  stallAlerts: boolean; // Notify when thermal stall is detected
  lowFuelAlerts: boolean; // Notify when pellet fuel level is low
  lowFuelThresholdPercent?: number; // Configurable warning threshold (10%, 15%, 20%, 25%, 30%)
  speechVoiceEnabled: boolean; // Spoken voice announcements
  soundEnabled: boolean; // Play audio chime sound
  chimeSoundTone?: 'arpeggio' | 'probe1' | 'probe2' | 'alarm' | 'beep' | 'chime';
  chimeVolume?: number; // 0.0 to 1.0
  browserPermission: 'granted' | 'denied' | 'default' | 'unsupported';
  lastTriggeredNotification?: string | null;
  lastTriggeredTime?: string | null;
}

export interface AlexaIntegrationConfig {
  enabled: boolean;
  skillLinked: boolean;
  linkCode: string;
  proactiveAnnouncementsEnabled: boolean; // Push alerts to Echo speakers
  alexaDeviceName: string;
  spokenTemperatureUnit: 'F' | 'C';
  voiceAlertSensitivity: 'exact' | 'approaching' | 'all';
  lastAlexaQuery?: string | null;
  lastAlexaResponse?: string | null;
  lastAlexaSync?: string | null;
}

export interface FireTVNotificationConfig {
  enabled: boolean;
  deviceName: string;
  overlayStyle: 'toast' | 'banner' | 'fullscreen';
  notifyOnTempGoal: boolean;
  notifyOnStall: boolean;
  notifyOnPitDrift: boolean;
  notifyOnLowFuel: boolean;
  autoDismissSeconds: number;
  lastNotificationSent?: string | null;
}

export interface GoogleHomeNotificationConfig {
  enabled: boolean;
  deviceName: string;
  broadcastVoiceEnabled: boolean;
  notifyOnTempGoal: boolean;
  notifyOnStall: boolean;
  notifyOnPitDrift: boolean;
  notifyOnLowFuel: boolean;
  lastBroadcastSent?: string | null;
}

export const INITIAL_GOOGLE_HOME_CONFIG: GoogleHomeNotificationConfig = {
  enabled: false,
  deviceName: 'Not connected',
  broadcastVoiceEnabled: false,
  notifyOnTempGoal: true,
  notifyOnStall: true,
  notifyOnPitDrift: true,
  notifyOnLowFuel: true,
  lastBroadcastSent: null,
};

export const INITIAL_FIRE_TV_CONFIG: FireTVNotificationConfig = {
  enabled: false,
  deviceName: 'Not connected',
  overlayStyle: 'toast',
  notifyOnTempGoal: true,
  notifyOnStall: true,
  notifyOnPitDrift: true,
  notifyOnLowFuel: true,
  autoDismissSeconds: 8,
  lastNotificationSent: null,
};

export function getSafeNotificationPermission(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const perm = window.Notification?.permission;
    return (perm as any) || 'default';
  } catch (e) {
    return 'unsupported';
  }
}

export const INITIAL_PUSH_CONFIG: CharGPTPushConfig = {
  enabled: true,
  tempGoalAlerts: true,
  approachingTempAlerts: true,
  hourlyCheckAlerts: true,
  pitDriftAlerts: true,
  stallAlerts: true,
  lowFuelAlerts: true,
  lowFuelThresholdPercent: 20,
  speechVoiceEnabled: false,
  soundEnabled: true,
  chimeSoundTone: 'arpeggio',
  chimeVolume: 0.8,
  browserPermission: getSafeNotificationPermission(),
  lastTriggeredNotification: null,
  lastTriggeredTime: null,
};

export const INITIAL_ALEXA_CONFIG: AlexaIntegrationConfig = {
  enabled: false,
  skillLinked: false,
  linkCode: '',
  proactiveAnnouncementsEnabled: false,
  alexaDeviceName: 'Echo Device',
  spokenTemperatureUnit: 'F',
  voiceAlertSensitivity: 'approaching',
  lastAlexaQuery: '',
  lastAlexaResponse: '',
  lastAlexaSync: '',
};

export function loadPushConfig(): CharGPTPushConfig {
  try {
    const raw = localStorage.getItem('chargpt_push_config_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.browserPermission = getSafeNotificationPermission();
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load CharGPT push config', e);
  }
  return {
    ...INITIAL_PUSH_CONFIG,
    browserPermission: getSafeNotificationPermission(),
  };
}

export function savePushConfig(config: CharGPTPushConfig): void {
  safeSetItem('chargpt_push_config_v1', JSON.stringify(config));
}

export function loadAlexaConfig(): AlexaIntegrationConfig {
  try {
    const raw = localStorage.getItem('chargpt_alexa_config_v1');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load Alexa config', e);
  }
  return INITIAL_ALEXA_CONFIG;
}

export function saveAlexaConfig(config: AlexaIntegrationConfig): void {
  safeSetItem('chargpt_alexa_config_v1', JSON.stringify(config));
}

export function loadFireTVConfig(): FireTVNotificationConfig {
  try {
    const raw = localStorage.getItem('chargpt_firetv_config_v1');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load Fire TV config', e);
  }
  return INITIAL_FIRE_TV_CONFIG;
}

export function saveFireTVConfig(config: FireTVNotificationConfig): void {
  safeSetItem('chargpt_firetv_config_v1', JSON.stringify(config));
}

export function loadGoogleHomeConfig(): GoogleHomeNotificationConfig {
  try {
    const raw = localStorage.getItem('chargpt_googlehome_config_v1');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load Google Home config', e);
  }
  return INITIAL_GOOGLE_HOME_CONFIG;
}

export function saveGoogleHomeConfig(config: GoogleHomeNotificationConfig): void {
  safeSetItem('chargpt_googlehome_config_v1', JSON.stringify(config));
}

export interface HubContainersCollapseState {
  pushSection: boolean;
  chimesSubSection: boolean;
  amazonSection: boolean;
  fireTvSubSection: boolean;
  alexaSubSection: boolean;
  alexaSimulatorSubSection: boolean;
  googleSection: boolean;
  googleControlsSubSection: boolean;
}

export const INITIAL_HUB_COLLAPSE_STATE: HubContainersCollapseState = {
  pushSection: true,
  chimesSubSection: true,
  amazonSection: true,
  fireTvSubSection: true,
  alexaSubSection: true,
  alexaSimulatorSubSection: true,
  googleSection: true,
  googleControlsSubSection: true,
};

export function loadHubCollapseState(): HubContainersCollapseState {
  try {
    const raw = localStorage.getItem('chargpt_hub_collapse_state_v1');
    if (raw) return { ...INITIAL_HUB_COLLAPSE_STATE, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed to load Hub collapse state', e);
  }
  return INITIAL_HUB_COLLAPSE_STATE;
}

export function saveHubCollapseState(state: HubContainersCollapseState): void {
  safeSetItem('chargpt_hub_collapse_state_v1', JSON.stringify(state));
}

export function sendGoogleHomeBroadcastNotification(
  title: string,
  message: string,
  deviceName: string = 'Living Room Nest Hub',
  speakOutLoud: boolean = true
): void {
  if (typeof window !== 'undefined') {
    const detail = {
      title,
      message,
      deviceName,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const event = new CustomEvent('googlehome-notification-event', { detail });
    window.dispatchEvent(event);

    sendCharGPTPushNotification(`Google Home preview (${deviceName}): ${title}`, message, 'googlehome-broadcast');

    if (speakOutLoud) {
      speakGoogleHomeVoice(`Smoke Stack local voice preview for ${deviceName}: ${title}. ${message}`);
    }

    const cfg = loadGoogleHomeConfig();
    cfg.lastBroadcastSent = `${title}: ${message} (${new Date().toLocaleTimeString()})`;
    saveGoogleHomeConfig(cfg);
  }
}

export function speakGoogleHomeVoice(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const googleVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Natural') || v.lang.startsWith('en'));
    if (googleVoice) {
      utterance.voice = googleVoice;
    }
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('SpeechSynthesis error', e);
  }
}

export function sendFireTVToastNotification(
  title: string,
  message: string,
  deviceName: string = 'Living Room Fire TV Stick 4K',
  overlayStyle: 'toast' | 'banner' | 'fullscreen' = 'toast'
): void {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('firetv-notification-event', {
      detail: {
        title,
        message,
        deviceName,
        overlayStyle,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    });
    window.dispatchEvent(event);

    sendCharGPTPushNotification(`Fire TV preview (${deviceName}): ${title}`, message, 'firetv-toast');

    const cfg = loadFireTVConfig();
    cfg.lastNotificationSent = `${title}: ${message} (${new Date().toLocaleTimeString()})`;
    saveFireTVConfig(cfg);
  }
}

export async function requestBrowserNotificationPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    if (typeof Notification.requestPermission !== 'function') {
      return 'unsupported';
    }
    const res = await Notification.requestPermission();
    const pushCfg = loadPushConfig();
    pushCfg.browserPermission = (res as any) || 'default';
    if (res === 'granted') {
      pushCfg.enabled = true;
    }
    savePushConfig(pushCfg);
    return (res as any) || 'unsupported';
  } catch (e) {
    console.error('Error requesting notification permission', e);
    return 'unsupported';
  }
}

export function playAudioChime(soundType: 'default' | 'probe1' | 'probe2' | 'probe3' | 'probe4' | 'alert' = 'default'): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    let sequence: {freq: number, time: number}[] = [];
    
    if (soundType === 'default') {
      osc.type = 'sine';
      sequence = [
        {freq: 523.25, time: 0},
        {freq: 659.25, time: 0.15},
        {freq: 783.99, time: 0.3},
        {freq: 1046.5, time: 0.45}
      ];
    } else if (soundType === 'alert') {
      osc.type = 'triangle';
      sequence = [
        {freq: 800, time: 0},
        {freq: 1000, time: 0.15},
        {freq: 800, time: 0.3},
        {freq: 1000, time: 0.45},
      ];
    } else if (soundType === 'probe1') {
      osc.type = 'sine';
      sequence = [
        {freq: 440, time: 0},
        {freq: 554.37, time: 0.2},
        {freq: 659.25, time: 0.4},
      ];
    } else if (soundType === 'probe2') {
      osc.type = 'triangle';
      sequence = [
        {freq: 329.63, time: 0},
        {freq: 392.00, time: 0.2},
        {freq: 493.88, time: 0.4},
      ];
    } else if (soundType === 'probe3') {
      osc.type = 'sine';
      sequence = [
        {freq: 587.33, time: 0},
        {freq: 739.99, time: 0.15},
        {freq: 880.00, time: 0.3},
      ];
    } else if (soundType === 'probe4') {
      osc.type = 'sine';
      sequence = [
        {freq: 349.23, time: 0},
        {freq: 440.00, time: 0.2},
        {freq: 523.25, time: 0.4},
        {freq: 698.46, time: 0.6},
      ];
    }

    sequence.forEach((s) => {
      osc.frequency.setValueAtTime(s.freq, ctx.currentTime + s.time);
    });
    
    gain.gain.setValueAtTime(osc.type === 'triangle' ? 0.15 : 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (sequence[sequence.length-1].time + 0.3));
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + (sequence[sequence.length-1].time + 0.4));
  } catch (e) {
    console.warn('AudioContext chime play prevented or unsupported', e);
  }
}

export function sendCharGPTPushNotification(
  title: string,
  body: string,
  tag: string = 'chargpt-alert',
  soundType: 'default' | 'probe1' | 'probe2' | 'probe3' | 'probe4' | 'alert' = 'default',
  speakSpokenVoice: boolean = false
): boolean {
  let sent = false;
  const pushCfg = loadPushConfig();

  // 1. Audio chime if enabled
  if (pushCfg.soundEnabled) {
    playAudioChime(soundType);
  }

  // 2. Mobile Device Physical Haptic Vibration
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200, 100, 400]);
    } catch (e) {
      /* ignore */
    }
  }

  // 3. ServiceWorker / PWA Push Notification (Mobile Web & Modern Browsers)
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && pushCfg.enabled) {
    navigator.serviceWorker.ready.then((reg) => {
      try {
        reg.showNotification(`🔥 Smoke Stack • ${title}`, {
          body,
          tag,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200, 100, 400],
          requireInteraction: true,
          data: '/',
        } as any);
        sent = true;
      } catch (e) {
        /* fallback to standard Notification */
      }
    }).catch(() => {});
  }

  // 4. Native Browser Push Notification Fallback
  if (!sent && typeof window !== 'undefined' && 'Notification' in window && pushCfg.enabled) {
    try {
      if (getSafeNotificationPermission() === 'granted') {
        if (typeof Notification === 'function') {
          const notif = new Notification(`🔥 Smoke Stack • ${title}`, {
            body,
            tag,
            icon: '/icon-192.png',
            requireInteraction: true,
          });
          notif.onclick = () => {
            try {
              window.focus();
              notif.close();
            } catch (e) {}
          };
          sent = true;
        }
      }
    } catch (e) {
      console.warn('Native notification instantiation error', e);
    }
  }

  // 5. Native Mobile App / WebView Bridge Support (Android / iOS / Electron)
  if (typeof window !== 'undefined') {
    const win = window as any;
    // Android WebView / Kotlin Bridge
    if (win.AndroidBridge && typeof win.AndroidBridge.postMessage === 'function') {
      try {
        win.AndroidBridge.postMessage(JSON.stringify({ title, body, tag, soundType, type: 'push_notification' }));
        sent = true;
      } catch (e) {}
    }
    // iOS WKWebView / Swift Bridge
    if (win.webkit?.messageHandlers?.pushNotification?.postMessage) {
      try {
        win.webkit.messageHandlers.pushNotification.postMessage({ title, body, tag, soundType });
        sent = true;
      } catch (e) {}
    }
    // Desktop Electron Bridge
    if (win.ElectronBridge?.sendNotification) {
      try {
        win.ElectronBridge.sendNotification({ title: `Smoke Stack • ${title}`, body });
        sent = true;
      } catch (e) {}
    }
  }

  // 6. Text-To-Speech Spoken Voice Announcement
  if (speakSpokenVoice || (pushCfg.soundEnabled && tag.includes('hourly'))) {
    speakAlexaVoice(`${title}. ${body}`);
  }

  // 7. Server Relay Webhook Dispatch for Multi-Device Telemetry Sync
  if (typeof window !== 'undefined') {
    fetch('/api/push/send-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body,
        tag,
        soundType,
        formatTarget: 'all-formats-web-mobile-android-ios-desktop-voice',
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
  }

  // Record history
  pushCfg.lastTriggeredNotification = `${title}: ${body}`;
  pushCfg.lastTriggeredTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  savePushConfig(pushCfg);

  return sent;
}

export function evaluateActiveCookPushAlerts(
  activeCook: CookLog | undefined,
  probes: ProbeAlertConfig[],
  profile?: SmokerProfile
): string[] {
  const triggered: string[] = [];
  const pushCfg = loadPushConfig();
  const alexaCfg = loadAlexaConfig();
  const fireTvCfg = loadFireTVConfig();
  const googleHomeCfg = loadGoogleHomeConfig();

  if (!pushCfg.enabled && !alexaCfg.enabled && !fireTvCfg.enabled && !googleHomeCfg.enabled) return triggered;
  if (!activeCook) return triggered;

  const lastReading = activeCook.temperatureReadings?.[activeCook.temperatureReadings.length - 1];
  if (!lastReading) return triggered;

  // Probe Evaluation
  probes.forEach((p) => {
    if (!p.alarmEnabled) return;
    const current = p.currentTemp;
    const target = p.targetTemp;
    const label = p.meatName || p.name;

    // Target Temp Goal Reached
    if (pushCfg.tempGoalAlerts && current >= target) {
      const msg = `🎯 Target Temp Reached! ${label} hit ${current}°F (Target: ${target}°F). Pull or rest!`;
      triggered.push(msg);
      sendCharGPTPushNotification(`Goal Reached: ${label}`, msg, `probe-goal-${p.id}`);

      // Fire TV Toast Notification
      if (fireTvCfg.enabled && fireTvCfg.notifyOnTempGoal) {
        sendFireTVToastNotification(`Goal Reached: ${label}`, `${label} reached finish goal of ${current}°F!`, fireTvCfg.deviceName, fireTvCfg.overlayStyle);
      }

      // Google Home Broadcast Notification
      if (googleHomeCfg.enabled && googleHomeCfg.notifyOnTempGoal) {
        sendGoogleHomeBroadcastNotification(`Goal Reached: ${label}`, `${label} reached finish goal of ${current}°F!`, googleHomeCfg.deviceName, googleHomeCfg.broadcastVoiceEnabled);
      }

      // Alexa announcement simulation
      if (alexaCfg.enabled && alexaCfg.proactiveAnnouncementsEnabled) {
        speakAlexaVoice(`Alexa Proactive Alert: ${AI_NAME} reports that your ${label} has reached its target finish goal of ${current} degrees Fahrenheit.`);
      }
    }
    // Approaching Target Temp (within 5°F)
    else if (pushCfg.approachingTempAlerts && current >= target - 5 && current < target) {
      const msg = `⏳ Approaching Finish! ${label} is at ${current}°F (5°F away from ${target}°F goal). Get butcher paper & tongs ready!`;
      triggered.push(msg);
      sendCharGPTPushNotification(`Approaching Goal: ${label}`, msg, `probe-approach-${p.id}`);
      if (fireTvCfg.enabled && fireTvCfg.notifyOnTempGoal) {
        sendFireTVToastNotification(`Approaching Goal: ${label}`, `${label} is at ${current}°F (5°F away from ${target}°F goal).`, fireTvCfg.deviceName, fireTvCfg.overlayStyle);
      }
      if (googleHomeCfg.enabled && googleHomeCfg.notifyOnTempGoal) {
        sendGoogleHomeBroadcastNotification(`Approaching Goal: ${label}`, `${label} is at ${current}°F (5°F away from ${target}°F goal).`, googleHomeCfg.deviceName, googleHomeCfg.broadcastVoiceEnabled);
      }
    }
  });

  // Pit Temperature Drift Alert
  if (pushCfg.pitDriftAlerts && lastReading.cookingTemp && lastReading.targetTemp) {
    const drift = Math.abs(lastReading.cookingTemp - lastReading.targetTemp);
    if (drift >= 20) {
      const msg = `⚠️ Smoker Temperature Drift! Pit is at ${lastReading.cookingTemp}°F (Target: ${lastReading.targetTemp}°F, Drift: ${drift}°F). Check air vents, lid seal, or pellet hopper!`;
      triggered.push(msg);
      sendCharGPTPushNotification(`Pit Temperature Drift`, msg, `pit-drift-alert`, 'alert', pushCfg.speechVoiceEnabled);
      if (fireTvCfg.enabled && fireTvCfg.notifyOnPitDrift) {
        sendFireTVToastNotification(`Pit Temperature Drift`, `Pit temp is ${lastReading.cookingTemp}°F (Target: ${lastReading.targetTemp}°F)`, fireTvCfg.deviceName, fireTvCfg.overlayStyle);
      }
      if (googleHomeCfg.enabled && googleHomeCfg.notifyOnPitDrift) {
        sendGoogleHomeBroadcastNotification(`Pit Temperature Drift`, `Pit temp is ${lastReading.cookingTemp}°F (Target: ${lastReading.targetTemp}°F)`, googleHomeCfg.deviceName, googleHomeCfg.broadcastVoiceEnabled);
      }
    }
  }

  // Thermal Stall Detection Alert (between 148°F and 175°F)
  if (pushCfg.stallAlerts && activeCook.temperatureReadings && activeCook.temperatureReadings.length >= 3) {
    const recentReadings = activeCook.temperatureReadings.slice(-3);
    const internalTemps = recentReadings.map(r => r.meatTemp || 0).filter(t => t > 0);
    if (internalTemps.length >= 3) {
      const minTemp = Math.min(...internalTemps);
      const maxTemp = Math.max(...internalTemps);
      const avgTemp = internalTemps.reduce((a, b) => a + b, 0) / internalTemps.length;
      
      if (avgTemp >= 148 && avgTemp <= 175 && (maxTemp - minTemp) <= 2) {
        const msg = `🧈 Thermal Stall Detected! Internal temp hovering at ~${Math.round(avgTemp)}°F. Consider wrapping in butcher paper / foil to push past stall!`;
        triggered.push(msg);
        sendCharGPTPushNotification(`Thermal Stall Phase`, msg, `stall-alert`, 'probe2', pushCfg.speechVoiceEnabled);
        if (fireTvCfg.enabled && fireTvCfg.notifyOnStall) {
          sendFireTVToastNotification(`Thermal Stall Phase`, `Internal temp hovering at ~${Math.round(avgTemp)}°F. Wrap meat to pass stall.`, fireTvCfg.deviceName, fireTvCfg.overlayStyle);
        }
        if (googleHomeCfg.enabled && googleHomeCfg.notifyOnStall) {
          sendGoogleHomeBroadcastNotification(`Thermal Stall Phase`, `Internal temp hovering at ~${Math.round(avgTemp)}°F. Wrap meat to pass stall.`, googleHomeCfg.deviceName, googleHomeCfg.broadcastVoiceEnabled);
        }
      }
    }
  }

  // Low Fuel Warning Alert
  if (pushCfg.lowFuelAlerts && profile) {
    let estRemainingPercent = (profile as any).fuelHopperPercentage;
    let hoursSinceRefill = 0;
    let hoursUntilEmpty = 0;
    const warningThreshold = pushCfg.lowFuelThresholdPercent || 20;

    try {
      const cookLogs = loadCookLogs();
      const fuelLogs = loadFuelLogs();
      const refillData = calculateRefillPelletUsage(profile, cookLogs, fuelLogs, undefined, warningThreshold);
      estRemainingPercent = refillData.hopperPercentFull;
      hoursSinceRefill = refillData.hoursSinceRefill;
      hoursUntilEmpty = refillData.hoursUntilEmpty;
    } catch (e) {
      if (estRemainingPercent === undefined) estRemainingPercent = 100;
    }

    if (estRemainingPercent <= warningThreshold) {
      const msg = `🪵 Low Pellet Fuel Warning! Hopper level is at ${estRemainingPercent}% (${hoursUntilEmpty}h remaining). ${hoursSinceRefill}h elapsed since last refill. Refill pellet hopper to prevent flame out!`;
      triggered.push(msg);
      sendCharGPTPushNotification(`Low Pellet Hopper Alert`, msg, `low-fuel-alert`, 'alert', pushCfg.speechVoiceEnabled);
      if (fireTvCfg.enabled && fireTvCfg.notifyOnLowFuel) {
        sendFireTVToastNotification(`Low Pellet Hopper Alert`, `Pellet hopper level is at ${estRemainingPercent}%. Refill hopper now.`, fireTvCfg.deviceName, fireTvCfg.overlayStyle);
      }
      if (googleHomeCfg.enabled && googleHomeCfg.notifyOnLowFuel) {
        sendGoogleHomeBroadcastNotification(`Low Pellet Hopper Alert`, `Pellet hopper level is at ${estRemainingPercent}%. Refill hopper now.`, googleHomeCfg.deviceName, googleHomeCfg.broadcastVoiceEnabled);
      }
    }
  }

  return triggered;
}

export function speakAlexaVoice(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel(); // Stop any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    
    // Attempt to pick a natural female voice (like Alexa)
    const voices = window.speechSynthesis.getVoices();
    const alexaVoice = voices.find(v => v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('Google US English') || v.lang.startsWith('en'));
    if (alexaVoice) {
      utterance.voice = alexaVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('SpeechSynthesis error', e);
  }
}
