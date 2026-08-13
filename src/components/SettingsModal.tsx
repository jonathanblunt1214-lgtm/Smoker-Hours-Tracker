import React, { useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Bell,
  Cloud,
  LogOut,
  Monitor,
  Settings,
  ShieldCheck,
  Smartphone,
  Thermometer,
  Trash2,
  User as UserIcon,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Wrench,
  X,
} from 'lucide-react';
import { CookLog, FuelLog, LocalUserProfile, LowPowerModeSettings, SmokerProfile } from '../types';
import {
  DEFAULT_GRANULAR_SHARING,
  INITIAL_FEDERATED_LEARNING_CONFIG,
  loadFederatedLearningConfig,
  saveFederatedLearningConfig,
} from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'appearance' | 'alerts' | 'cloud' | 'data' | 'smokers';
  tempUnit: 'F' | 'C';
  onToggleTempUnit: () => void;
  themeMode: 'dark' | 'light';
  onToggleThemeMode: () => void;
  isColorblind: boolean;
  onToggleColorblind: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  forceOffline: boolean;
  onToggleForceOffline: () => void;
  autoSyncDrive: boolean;
  onToggleAutoSync: () => void;
  autoSyncNewCooks?: boolean;
  onToggleAutoSyncNewCooks?: () => void;
  onOpenDriveModal: () => void;
  isDriveConnected?: boolean;
  driveUserEmail?: string | null;
  onResetData: () => void;
  isOnline?: boolean;
  currentUser?: User | null;
  accessToken?: string | null;
  onAuthSuccess?: (user: User, token: string) => void;
  onLogout?: () => void;
  currentAppData?: {
    profile: SmokerProfile;
    cookLogs: CookLog[];
    fuelLogs: FuelLog[];
    userAccount?: LocalUserProfile;
    userProfile?: LocalUserProfile;
  };
  onRestoreData?: (restored: {
    profile: SmokerProfile;
    cookLogs: CookLog[];
    fuelLogs: FuelLog[];
    userAccount?: LocalUserProfile;
    userProfile?: LocalUserProfile;
  }) => void;
  onOpenCustomSmokerModal?: () => void;
  profile?: SmokerProfile;
  onUpdateProfile?: (updatedProfile: SmokerProfile) => void;
  lowPowerSettings?: LowPowerModeSettings;
  onToggleLowPowerMode?: (key?: keyof LowPowerModeSettings) => void;
  onOpenMasterAdmin?: () => void;
}

type Tab = 'account' | 'appearance' | 'notifications' | 'equipment' | 'sync' | 'privacy' | 'accessibility';

const navItems: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'account', label: 'Account', icon: <UserIcon className="h-4 w-4" /> },
  { id: 'appearance', label: 'Appearance', icon: <Monitor className="h-4 w-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  { id: 'equipment', label: 'Smokers & Equipment', icon: <Wrench className="h-4 w-4" /> },
  { id: 'sync', label: 'Data & Sync', icon: <Cloud className="h-4 w-4" /> },
  { id: 'privacy', label: 'Privacy', icon: <ShieldCheck className="h-4 w-4" /> },
  { id: 'accessibility', label: 'Accessibility', icon: <Smartphone className="h-4 w-4" /> },
];

const resolveInitialTab = (initialTab: SettingsModalProps['initialTab']): Tab => {
  switch (initialTab) {
    case 'smokers': return 'equipment';
    case 'alerts': return 'notifications';
    case 'cloud':
    case 'data': return 'sync';
    case 'appearance': return 'appearance';
    default: return 'appearance';
  }
};

const Toggle: React.FC<{ checked: boolean; onChange: () => void; label: string }> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={onChange}
    className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-orange-500' : 'bg-zinc-700'}`}
  >
    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-[22px]' : 'left-0.5'}`} />
  </button>
);

const Row: React.FC<{ title: string; description?: string; control: React.ReactNode }> = ({ title, description, control }) => (
  <div className="flex min-h-[62px] items-center justify-between gap-4 border-b border-zinc-800/70 py-3 last:border-0">
    <div className="min-w-0">
      <div className="text-sm font-medium text-zinc-100">{title}</div>
      {description && <div className="mt-1 text-xs leading-5 text-zinc-500">{description}</div>}
    </div>
    <div className="shrink-0">{control}</div>
  </div>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'appearance',
  tempUnit,
  onToggleTempUnit,
  themeMode,
  onToggleThemeMode,
  isColorblind,
  onToggleColorblind,
  soundEnabled,
  onToggleSound,
  forceOffline,
  onToggleForceOffline,
  autoSyncDrive,
  onToggleAutoSync,
  autoSyncNewCooks = true,
  onToggleAutoSyncNewCooks,
  onOpenDriveModal,
  isDriveConnected = false,
  driveUserEmail,
  onResetData,
  isOnline = true,
  currentUser,
  onLogout,
  currentAppData,
  onOpenCustomSmokerModal,
  profile,
  lowPowerSettings,
  onToggleLowPowerMode,
}) => {
  const [tab, setTab] = useState<Tab>(() => resolveInitialTab(initialTab));
  const [privacyConfig, setPrivacyConfig] = useState(() => loadFederatedLearningConfig());

  const dataCounts = useMemo(() => ({
    cooks: currentAppData?.cookLogs?.length || 0,
    fuels: currentAppData?.fuelLogs?.length || 0,
  }), [currentAppData]);

  if (!isOpen) return null;

  const setSharing = (enabled: boolean) => {
    const next = enabled
      ? { ...privacyConfig, enabled: true, autoSyncContributions: false }
      : { ...INITIAL_FEDERATED_LEARNING_CONFIG, granularSharing: { ...DEFAULT_GRANULAR_SHARING } };
    setPrivacyConfig(next);
    saveFederatedLearningConfig(next);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 p-0 sm:p-5 backdrop-blur-sm overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-5xl flex-col overflow-hidden bg-[#111] sm:min-h-0 sm:rounded-2xl sm:border sm:border-zinc-800 sm:shadow-2xl md:flex-row">
        <aside className="border-b border-zinc-800 bg-zinc-950/80 p-4 md:w-60 md:border-b-0 md:border-r">
          <div className="mb-4 flex items-center gap-3 px-2">
            <div className="rounded-xl bg-orange-500/15 p-2 text-orange-400"><Settings className="h-5 w-5" /></div>
            <div><div className="font-semibold text-white">Settings</div><div className="text-xs text-zinc-500">SmokeStack</div></div>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-1 md:overflow-visible">
            {navItems.map((item) => (
              <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition md:w-full ${tab === item.id ? 'bg-orange-500/15 text-orange-300' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'}`}>
                {item.icon}<span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-[#111]/95 px-5 py-4 backdrop-blur">
            <div><h2 className="text-lg font-semibold text-white">{navItems.find((x) => x.id === tab)?.label}</h2><p className="mt-0.5 text-xs text-zinc-500">Production settings use real account and integration state.</p></div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white" aria-label="Close settings"><X className="h-5 w-5" /></button>
          </header>

          <div className="space-y-5 p-5 sm:p-6">
            {tab === 'account' && <Card title="Account">
              <Row title="Signed-in account" description="Identity comes from Firebase Authentication." control={<div className="max-w-[220px] truncate text-sm text-zinc-300">{currentUser?.email || 'Not signed in'}</div>} />
              <Row title="Account status" description="Administrator privileges are not configured from Settings." control={<span className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">{currentUser ? 'Authenticated' : 'Signed out'}</span>} />
              {onLogout && currentUser && <Row title="Sign out" description="Ends this Firebase session and clears local account presentation state." control={<button onClick={onLogout} className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900"><LogOut className="h-3.5 w-3.5" />Sign out</button>} />}
            </Card>}

            {tab === 'appearance' && <Card title="Appearance">
              <Row title="Theme" description="Switch between the current dark and light interface." control={<button onClick={onToggleThemeMode} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200">{themeMode === 'dark' ? 'Dark' : 'Light'}</button>} />
              <Row title="Temperature units" description="Used throughout SmokeStack." control={<button onClick={onToggleTempUnit} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200"><Thermometer className="mr-1 inline h-3.5 w-3.5" />°{tempUnit}</button>} />
              <Row title="Enhanced contrast" description="Improves differentiation without relying on color alone." control={<Toggle checked={isColorblind} onChange={onToggleColorblind} label="Enhanced contrast" />} />
              {lowPowerSettings && onToggleLowPowerMode && <Row title="Reduced effects" description="Reduce motion and heavier visual effects on lower-power devices." control={<Toggle checked={Boolean(lowPowerSettings.enabled)} onChange={() => onToggleLowPowerMode()} label="Reduced effects" />} />}
            </Card>}

            {tab === 'notifications' && <Card title="Notifications">
              <Row title="Audio alerts" description="Controls SmokeStack sounds where the browser/device permits them." control={<button onClick={onToggleSound} className="rounded-lg border border-zinc-700 p-2 text-zinc-200" aria-label="Toggle audio alerts">{soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</button>} />
              <div className="pt-3 text-xs leading-5 text-zinc-500">Push, native mobile, Alexa, or other notification channels are not shown as connected unless a verified production integration exists.</div>
            </Card>}

            {tab === 'equipment' && <Card title="Smokers & Equipment">
              <Row title="Active smoker" description="Your saved equipment profile." control={<div className="max-w-[220px] truncate text-sm text-zinc-300">{profile?.name || profile?.model || 'No smoker selected'}</div>} />
              <Row title="Manage smoker" description="Add or edit smoker specifications through the equipment workflow." control={<button onClick={onOpenCustomSmokerModal} disabled={!onOpenCustomSmokerModal} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 disabled:opacity-50">Manage</button>} />
              <div className="pt-3 text-xs leading-5 text-zinc-500">Bluetooth/Wi‑Fi capability does not mean SmokeStack has a verified direct integration. Connected Equipment status must come from the actual device service.</div>
            </Card>}

            {tab === 'sync' && <>
              <Card title="SmokeStack account sync">
                <Row title="Connection" description="Authoritative account data synchronizes through Firebase/Firestore when signed in." control={<span className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs ${isOnline ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>{isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}{isOnline ? 'Online' : 'Offline'}</span>} />
                {onToggleAutoSyncNewCooks && <Row title="Synchronize cook changes" description="Save verified signed-in cook changes to the account data layer." control={<Toggle checked={autoSyncNewCooks} onChange={onToggleAutoSyncNewCooks} label="Synchronize cook changes" />} />}
                <Row title="Force offline mode" description="Keep changes local until connectivity is restored and a real sync succeeds." control={<Toggle checked={forceOffline} onChange={onToggleForceOffline} label="Force offline mode" />} />
              </Card>
              <Card title="Google Drive backup">
                <Row title="Backup connection" description="Google Drive is a separate backup/export destination, not SmokeStack account sync." control={<span className="text-xs text-zinc-300">{isDriveConnected ? `Connected${driveUserEmail ? ` · ${driveUserEmail}` : ''}` : 'Not connected'}</span>} />
                <Row title="Manage backups" description="Connect, create, or restore Google Drive backups through the verified Drive workflow." control={<button onClick={onOpenDriveModal} className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-zinc-950">Open backup</button>} />
                <Row title="Backup preference" description="This preference alone never reports a backup as complete; only a verified Drive write can do that." control={<Toggle checked={autoSyncDrive} onChange={onToggleAutoSync} label="Drive backup preference" />} />
              </Card>
              <Card title="Local data">
                <Row title="Stored records" description="Current data loaded in this session." control={<span className="text-xs text-zinc-300">{dataCounts.cooks} cooks · {dataCounts.fuels} fuel records</span>} />
                <Row title="Reset local data" description="Clears local working data to clean defaults. This is not an administrator operation." control={<button onClick={onResetData} className="flex items-center gap-1.5 rounded-lg border border-red-900/70 px-3 py-2 text-xs text-red-300"><Trash2 className="h-3.5 w-3.5" />Reset</button>} />
              </Card>
            </>}

            {tab === 'privacy' && <Card title="Privacy & data use">
              <Row title="Help improve CharGPT" description="Optional community/federated contribution. Off by default; enabling this does not turn on granular sharing categories." control={<Toggle checked={Boolean(privacyConfig.enabled)} onChange={() => setSharing(!privacyConfig.enabled)} label="Help improve CharGPT" />} />
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs leading-5 text-zinc-500">Cook photos, location/weather, recipes, equipment details, temperature curves and other granular categories remain OFF unless a future consent workflow explicitly enables each category. Personalization for your own CharGPT is separate from sharing.</div>
            </Card>}

            {tab === 'accessibility' && <Card title="Accessibility">
              <Row title="Enhanced contrast" description="Increase contrast and keep important states distinguishable without color alone." control={<Toggle checked={isColorblind} onChange={onToggleColorblind} label="Enhanced contrast" />} />
              {lowPowerSettings && onToggleLowPowerMode && <Row title="Reduce motion / effects" description="Use simpler transitions and lower-cost rendering." control={<Toggle checked={Boolean(lowPowerSettings.enabled)} onChange={() => onToggleLowPowerMode()} label="Reduce motion and effects" />} />}
              <div className="pt-3 text-xs leading-5 text-zinc-500">SmokeStack controls must remain keyboard reachable and screen-reader labeled. Device-specific accessibility features depend on the host browser/platform.</div>
            </Card>}
          </div>
        </section>
      </div>
    </div>
  );
};

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="rounded-2xl border border-zinc-800 bg-zinc-950/65 p-4 sm:p-5">
    <h3 className="mb-1 text-sm font-semibold text-white">{title}</h3>
    {children}
  </section>
);
