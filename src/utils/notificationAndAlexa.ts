import { CookLog, ProbeAlertConfig, SmokerProfile } from '../types';
import { AI_NAME } from '../constants/appName';
import { safeSetItem, KEYS } from './storage';

export interface CharGPTPushConfig {
  enabled: boolean;
  tempGoalAlerts: boolean; // Notify when target internal meat temp is reached
  approachingTempAlerts: boolean; // Notify when within 5°F of target
  pitDriftAlerts: boolean; // Notify when pit strays ±15°F from target
  stallAlerts: boolean; // Notify when thermal stall is detected
  soundEnabled: boolean; // Play audio chime sound
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

export const INITIAL_PUSH_CONFIG: CharGPTPushConfig = {
  enabled: true,
  tempGoalAlerts: true,
  approachingTempAlerts: true,
  pitDriftAlerts: true,
  stallAlerts: true,
  soundEnabled: true,
  browserPermission: typeof window !== 'undefined' && 'Notification' in window ? Notification.permission as any : 'unsupported',
  lastTriggeredNotification: null,
  lastTriggeredTime: null,
};

export const INITIAL_ALEXA_CONFIG: AlexaIntegrationConfig = {
  enabled: true,
  skillLinked: true,
  linkCode: 'ALEXA-SMOKESTACK-8942',
  proactiveAnnouncementsEnabled: true,
  alexaDeviceName: 'Kitchen Echo Show 10',
  spokenTemperatureUnit: 'F',
  voiceAlertSensitivity: 'approaching',
  lastAlexaQuery: 'Alexa, ask Smoke Stack for my brisket internal temp',
  lastAlexaResponse: 'Your Brisket Flat is currently at 198°F, 5 degrees away from your 203°F finish goal!',
  lastAlexaSync: new Date().toISOString(),
};

export function loadPushConfig(): CharGPTPushConfig {
  try {
    const raw = localStorage.getItem('chargpt_push_config_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof window !== 'undefined' && 'Notification' in window) {
        parsed.browserPermission = Notification.permission;
      }
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load CharGPT push config', e);
  }
  return INITIAL_PUSH_CONFIG;
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

export async function requestBrowserNotificationPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const res = await Notification.requestPermission();
    const pushCfg = loadPushConfig();
    pushCfg.browserPermission = res as any;
    if (res === 'granted') {
      pushCfg.enabled = true;
    }
    savePushConfig(pushCfg);
    return res as any;
  } catch (e) {
    console.error('Error requesting notification permission', e);
    return 'denied';
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

export function sendCharGPTPushNotification(title: string, body: string, tag: string = 'chargpt-alert', soundType: 'default' | 'probe1' | 'probe2' | 'probe3' | 'probe4' | 'alert' = 'default'): boolean {
  let sent = false;
  const pushCfg = loadPushConfig();

  // 1. Audio chime if enabled
  if (pushCfg.soundEnabled) {
    playAudioChime(soundType);
  }

  // 2. Native Web Browser Push Notification
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && pushCfg.enabled) {
    try {
      const notif = new Notification(`🔥 Smoke Stack • ${title}`, {
        body,
        tag,
        icon: '/favicon.ico',
        requireInteraction: true,
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      sent = true;
    } catch (e) {
      console.warn('Native notification instantiation error', e);
    }
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

  if (!pushCfg.enabled && !alexaCfg.enabled) return triggered;
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
    }
  });

  // Pit Temperature Drift Alert
  if (pushCfg.pitDriftAlerts && lastReading.cookingTemp && lastReading.targetTemp) {
    const drift = Math.abs(lastReading.cookingTemp - lastReading.targetTemp);
    if (drift >= 20) {
      const msg = `⚠️ Smoker Temperature Drift! Pit is at ${lastReading.cookingTemp}°F (Target: ${lastReading.targetTemp}°F, Drift: ${drift}°F). Check air vents, lid seal, or pellet hopper!`;
      triggered.push(msg);
      sendCharGPTPushNotification(`Pit Temperature Drift`, msg, `pit-drift-alert`);
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
