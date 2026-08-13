import React, { useState, useEffect } from 'react';
import { Clock, Bell, BellOff, Volume2, CheckCircle2, Plus, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';
import { sendCharGPTPushNotification, getSafeNotificationPermission, requestBrowserNotificationPermission } from '../utils/notificationAndAlexa';

interface HourlyCheckReminderBannerProps {
  isTimerRunning: boolean;
  timerSeconds: number;
  onAddLogCheck: () => void;
  showToast?: (msg: string) => void;
}

export const HourlyCheckReminderBanner: React.FC<HourlyCheckReminderBannerProps> = ({
  isTimerRunning,
  timerSeconds,
  onAddLogCheck,
  showToast,
}) => {
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(() => {
    return localStorage.getItem('smoker_hourly_reminder_enabled') !== 'false';
  });

  const [intervalMinutes, setIntervalMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('smoker_hourly_reminder_interval');
    return saved ? parseInt(saved, 10) : 60; // default 60 mins (hourly)
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('smoker_hourly_reminder_sound') !== 'false';
  });

  const [snoozedUntilSeconds, setSnoozedUntilSeconds] = useState<number | null>(null);
  const [lastPromptedHour, setLastPromptedHour] = useState<number>(-1);
  const [isAlertActive, setIsAlertActive] = useState<boolean>(false);

  // Play audio chime using Web Audio API
  const playAlertChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      osc.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.3); // D6

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  };

  // Interval check runner
  useEffect(() => {
    if (!reminderEnabled || !isTimerRunning) return;

    // Calculate current interval period
    const intervalSecs = intervalMinutes * 60;
    const currentPeriod = Math.floor(timerSeconds / intervalSecs);

    if (snoozedUntilSeconds !== null && timerSeconds < snoozedUntilSeconds) {
      return;
    }

    // Trigger reminder when timer crosses an interval threshold (e.g. 1hr, 2hr, 3hr)
    if (timerSeconds > 10 && currentPeriod > 0 && currentPeriod > lastPromptedHour) {
      setLastPromptedHour(currentPeriod);
      setIsAlertActive(true);
      playAlertChime();
      
      const title = `Hourly Check Due (${currentPeriod}h)`;
      const body = `Time to probe internal meat temperature & record pit stats!`;
      
      // Dispatch device push notification across Web, PWA, Mobile, Android/iOS, Speech Voice
      sendCharGPTPushNotification(title, body, `hourly-reminder-${currentPeriod}`, 'alert', true);

      if (showToast) {
        showToast(`⏰ Hourly Check Due (${currentPeriod}h): Please probe meat internal temperature!`);
      }
    }
  }, [timerSeconds, isTimerRunning, reminderEnabled, intervalMinutes, lastPromptedHour, snoozedUntilSeconds]);

  const handleToggleReminder = () => {
    const next = !reminderEnabled;
    setReminderEnabled(next);
    localStorage.setItem('smoker_hourly_reminder_enabled', String(next));
  };

  const handleIntervalChange = (mins: number) => {
    setIntervalMinutes(mins);
    localStorage.setItem('smoker_hourly_reminder_interval', String(mins));
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('smoker_hourly_reminder_sound', String(next));
  };

  const handleLogNow = () => {
    setIsAlertActive(false);
    setSnoozedUntilSeconds(null);
    onAddLogCheck();
    if (showToast) {
      showToast('✅ Hourly check temperature reading logged!');
    }
  };

  const handleSnooze = (mins: number = 10) => {
    setIsAlertActive(false);
    setSnoozedUntilSeconds(timerSeconds + mins * 60);
    if (showToast) {
      showToast(`💤 Reminder snoozed for ${mins} minutes.`);
    }
  };

  const handleTestPush = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        if (getSafeNotificationPermission() !== 'granted') {
          await requestBrowserNotificationPermission();
        }
      } catch (e) {}
    }
    sendCharGPTPushNotification(
      'Hourly Check Reminder Test',
      'Device push alerts active for Web Browser, Mobile PWA, Android, iOS, and Voice Speech!',
      'test-hourly-push',
      'alert',
      true
    );
    if (showToast) {
      showToast('🔔 Multi-format device push notification dispatched!');
    }
  };

  // Compute next check countdown
  const intervalSecs = intervalMinutes * 60;
  const secondsInPeriod = timerSeconds % intervalSecs;
  const secondsRemaining = intervalSecs - secondsInPeriod;
  const minsRemaining = Math.floor(secondsRemaining / 60);
  const secsRemaining = secondsRemaining % 60;

  return (
    <div className="space-y-3">
      {/* ACTIVE ALERT BANNER IF DUE */}
      {isAlertActive && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white p-4 rounded-2xl shadow-2xl border-2 border-amber-300 animate-pulse flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md shrink-0">
              <Clock className="w-6 h-6 text-amber-200 animate-spin" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="bg-amber-950/80 text-amber-200 text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded-md border border-amber-400/40">
                  HOURLY CHECK DUE
                </span>
                <span className="text-xs font-bold text-amber-100">Meat Thermometer Probe Alert</span>
              </div>
              <h4 className="text-sm sm:text-base font-black text-white mt-0.5">
                Time to check internal meat temperature & pit status!
              </h4>
              <p className="text-xs text-amber-100">
                Record your probe reading to maintain a precise thermal curve in your smoke log.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleLogNow}
              className="px-4 py-2 bg-amber-200 hover:bg-white text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4 text-orange-600" />
              <span>Log Reading Now</span>
            </button>
            <button
              type="button"
              onClick={() => handleSnooze(10)}
              className="px-3 py-2 bg-black/40 hover:bg-black/60 text-amber-200 font-bold text-xs rounded-xl transition-all cursor-pointer border border-amber-300/30"
            >
              Snooze 10m
            </button>
          </div>
        </div>
      )}

      {/* REMINDER CONFIGURATION & COUNTDOWN HEADER BAR */}
      <div className="bg-[#181818] border border-[#2e2e2e] p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleToggleReminder}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer active:scale-95 ${
              reminderEnabled
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-500'
            }`}
            title={reminderEnabled ? 'Disable Hourly Check Reminder' : 'Enable Hourly Check Reminder'}
          >
            {reminderEnabled ? <Bell className="w-4 h-4 text-amber-400" /> : <BellOff className="w-4 h-4 text-zinc-500" />}
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-xs font-extrabold text-white">Hourly Meat Probe Check Reminder</h4>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                reminderEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}>
                {reminderEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {isTimerRunning
                ? `Next check in ${minsRemaining}m ${secsRemaining}s (${intervalMinutes}m interval)`
                : 'Start the cook timer to trigger automated hourly probe reminders'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
          {/* Interval Selector */}
          <select
            value={intervalMinutes}
            onChange={(e) => handleIntervalChange(parseInt(e.target.value, 10))}
            className="bg-[#242424] text-xs font-bold text-zinc-200 border border-[#3a3a3a] px-2.5 py-1.5 rounded-xl outline-none focus:border-amber-500 transition-colors cursor-pointer"
          >
            <option value={30}>Every 30 Mins</option>
            <option value={45}>Every 45 Mins</option>
            <option value={60}>Every 1 Hour (Standard)</option>
            <option value={90}>Every 1.5 Hours</option>
            <option value={120}>Every 2 Hours</option>
          </select>

          {/* Audio Chime Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-500'
            }`}
            title={soundEnabled ? 'Audio Chime Enabled' : 'Audio Chime Muted'}
          >
            <Volume2 className="w-4 h-4" />
          </button>

          {/* Test Device Push Button */}
          <button
            type="button"
            onClick={handleTestPush}
            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/30 text-[11px] font-bold rounded-xl transition-all cursor-pointer active:scale-95 flex items-center space-x-1"
            title="Test device push notification across Web, PWA, Mobile & Voice formats"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Test Push</span>
          </button>

          {/* Quick Add Reading Button */}
          <button
            type="button"
            onClick={handleLogNow}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95 flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Check</span>
          </button>
        </div>
      </div>
    </div>
  );
};
