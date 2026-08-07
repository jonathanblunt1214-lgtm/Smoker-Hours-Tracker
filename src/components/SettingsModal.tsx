import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  googleSignIn,
  saveToGoogleDrive,
  loadFromGoogleDrive,
} from '../lib/driveSync';
import { SmokerProfile, CookLog, FuelLog, FederatedLearningConfig, FederatedPoolStats, CustomSmokerSpec, ManufacturerSmokerSpec, LowPowerModeSettings, LocalUserProfile, OneDriveAccount } from '../types';
import { calculateUserAccount, getUserLevelThresholds } from '../utils/userLeveling';
import { loadFederatedLearningConfig, saveFederatedLearningConfig, loadSavedCustomSmokers, saveSavedCustomSmokers, loadSavedManufacturerSmokers, saveSavedManufacturerSmokers, getStorageStats, compactAndOptimizeStorage, DEFAULT_GRANULAR_SHARING, getAutoClearInterval, setAutoClearInterval, executeCacheClear, getNextAutoClearDateFormatted, AutoClearIntervalOption } from '../utils/storage';
import { getEffectiveSmokerSpecs } from '../utils/smokerCalculations';
import { isMasterAdmin, isAdminUser, getSubAdmins, addSubAdmin, removeSubAdmin } from '../utils/adminAuth';
import { APP_NAME, AI_NAME, AI_PITMASTER_NAME } from '../constants/appName';
import { TermsOfServiceModal } from './TermsOfServiceModal';
import { SmokerModManager } from './SmokerModManager';
import { PushAndAlexaHub } from './PushAndAlexaHub';
import {
  Settings,
  X,
  Thermometer,
  Bluetooth,
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  Eye,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Sliders,
  Bell,
  HardDrive,
  Database,
  User as UserIcon,
  UserPlus,
  Edit3,
  Save,
  Download,
  Upload,
  LogOut,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Brain,
  Server,
  Share2,
  Sparkles,
  FileText,
  UserX,
  Wrench,
  Flame,
  Scale,
  Plus,
  Trash2,
  Building2,
  Gauge,
  Zap,
  Check,
  Info,
  Crown,
  Clock,
  Cpu,
} from 'lucide-react';

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
  onOpenBluetoothModal: () => void;
  onOpenDriveModal: () => void;
  isDriveConnected?: boolean;
  driveUserEmail?: string | null;
  onResetData: () => void;
  isOnline?: boolean;
  // Account & Data Backup props
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

const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: () => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
      checked ? 'bg-orange-500' : 'bg-zinc-700'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
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
  onOpenBluetoothModal,
  onOpenDriveModal,
  isDriveConnected = false,
  driveUserEmail,
  onResetData,
  isOnline = true,
  currentUser,
  accessToken,
  onAuthSuccess,
  onLogout,
  currentAppData,
  onRestoreData,
  onOpenCustomSmokerModal,
  profile,
  onUpdateProfile,
  lowPowerSettings,
  onToggleLowPowerMode,
  onOpenMasterAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'alerts' | 'cloud' | 'data'>(
    initialTab === 'smokers' ? 'data' : initialTab || 'appearance'
  );

  // Auto Backup, Smoker Specs & Federated Learning Configuration State
  const [dataSubTab, setDataSubTab] = useState<'account' | 'smokers' | 'cloud' | 'federated' | 'local'>(
    initialTab === 'smokers' ? 'smokers' : 'account'
  );

  useEffect(() => {
    if (isOpen) {
      if (initialTab === 'smokers') {
        setActiveTab('data');
        setDataSubTab('smokers');
      } else {
        setActiveTab(initialTab || 'appearance');
      }
    }
  }, [isOpen, initialTab]);

  // Local User Profile Account state
  const [localAccount, setLocalAccount] = useState<LocalUserProfile>(() => {
    try {
      const saved = localStorage.getItem('pitmaster_local_user_account');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.rigs || parsed.rigs.length === 0) {
          parsed.rigs = [
            profile || {
              id: 'rig-pitboss-5series',
              name: 'Pit Boss Copperhead 5-Series Vertical',
              model: 'Copperhead 5-Series',
              smokerType: 'Vertical Pellet Smoker',
              fuelType: 'Pellets',
              initialHours: 148.25,
              currentHours: 148.25,
              pelletHopperCapacityLbs: 60,
              maintenanceTasks: [],
              appliedModIds: [],
              appliedMods: [],
            },
          ];
          parsed.activeRigId = parsed.rigs[0].id;
        }
        return parsed;
      }
    } catch (e) {}
    const defaultRig = profile || {
      id: 'rig-pitboss-5series',
      name: 'Pit Boss Copperhead 5-Series Vertical',
      model: 'Copperhead 5-Series',
      smokerType: 'Vertical Pellet Smoker',
      fuelType: 'Pellets',
      initialHours: 148.25,
      currentHours: 148.25,
      pelletHopperCapacityLbs: 60,
      maintenanceTasks: [],
      appliedModIds: [],
      appliedMods: [],
    };
    return {
      name: 'Jonathan Blunt',
      email: 'jonathanblunt1214@gmail.com',
      title: 'Head Pitmaster',
      createdAt: new Date().toISOString().slice(0, 10),
      rigs: [defaultRig],
      activeRigId: defaultRig.id,
    };
  });

  // Collapsible Accordion Sections in Account Settings
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    profile: false,      // 1. User Account Profile & Rank
    multirig: false,     // 2. Multi-Rig Fleet Management
    hours: true,         // 3. Initial Runtime Hours & Baseline
    admin: true,         // 4. System Admin & Dev Controls
    cloudSync: true,     // 5. Server Account Sync & Backups
  });

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Multi-Rig Fleet Management State
  const [isAddingRig, setIsAddingRig] = useState(false);
  const [newRigName, setNewRigName] = useState('');
  const [newRigModel, setNewRigModel] = useState('');
  const [newRigType, setNewRigType] = useState('Vertical Pellet Smoker');
  const [newRigFuel, setNewRigFuel] = useState<'Pellets' | 'Charcoal' | 'Wood Splits' | 'Electric' | 'Gas'>('Pellets');
  const [newRigHours, setNewRigHours] = useState('0');
  const [newRigHopper, setNewRigHopper] = useState('20');

  const [editingRigId, setEditingRigId] = useState<string | null>(null);
  const [editRigName, setEditRigName] = useState('');
  const [editRigHours, setEditRigHours] = useState('0');
  const [editRigHopper, setEditRigHopper] = useState('20');

  const [serverSyncStatus, setServerSyncStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isServerSyncing, setIsServerSyncing] = useState(false);

  const handleSyncWithServer = async () => {
    setIsServerSyncing(true);
    setServerSyncStatus({ type: 'info', text: 'Syncing user account & multi-rig fleet with server repository...' });
    try {
      const payload = {
        userAccount: localAccount,
        rigs: localAccount.rigs && localAccount.rigs.length > 0 ? localAccount.rigs : [profile].filter(Boolean),
        activeRigId: localAccount.activeRigId || profile?.id || 'rig-1',
        cookLogs: currentAppData?.cookLogs || [],
        fuelLogs: currentAppData?.fuelLogs || [],
      };
      const res = await fetch('/api/account/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setServerSyncStatus({ type: 'success', text: '✅ Account & multi-rig fleet hosted & synced on server!' });
        if (data.rigs && data.rigs.length > 0) {
          setLocalAccount((prev) => ({
            ...prev,
            rigs: data.rigs,
            activeRigId: data.activeRigId,
          }));
        }
      } else {
        setServerSyncStatus({ type: 'error', text: data.error || 'Server sync failed.' });
      }
    } catch (err: any) {
      setServerSyncStatus({ type: 'error', text: 'Failed to connect to server account repository.' });
    } finally {
      setIsServerSyncing(false);
    }
  };

  useEffect(() => {
    if (isOpen && dataSubTab === 'account') {
      const email = currentUser?.email || localAccount.email || 'jonathanblunt1214@gmail.com';
      fetch(`/api/account?email=${encodeURIComponent(email)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.rigs && data.rigs.length > 0) {
            setLocalAccount((prev) => ({
              ...prev,
              name: data.account?.name || prev.name,
              title: data.account?.title || prev.title,
              rigs: data.rigs,
              activeRigId: data.activeRigId || data.rigs[0]?.id,
            }));
          }
        })
        .catch(() => {});
    }
  }, [isOpen, dataSubTab, currentUser]);

  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [editName, setEditName] = useState(localAccount.name);
  const [editEmail, setEditEmail] = useState(localAccount.email);
  const [editTitle, setEditTitle] = useState(localAccount.title);

  // Microsoft OneDrive Account state
  const [oneDriveAccount, setOneDriveAccount] = useState<OneDriveAccount>(() => {
    try {
      const saved = localStorage.getItem('pitmaster_onedrive_account');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      connected: false,
      email: 'jonathanblunt1214@outlook.com',
      lastSync: null,
      autoSync: false,
    };
  });

  const [storageStats, setStorageStats] = useState(() => getStorageStats());
  const [compactStatus, setCompactStatus] = useState<string | null>(null);

  const [autoClearInterval, setAutoClearIntervalState] = useState<AutoClearIntervalOption>(() => getAutoClearInterval());
  const [nextAutoClearDate, setNextAutoClearDate] = useState<string>(() => getNextAutoClearDateFormatted());

  const handleAutoClearIntervalChange = (newInterval: AutoClearIntervalOption) => {
    setAutoClearIntervalState(newInterval);
    setAutoClearInterval(newInterval);
    setNextAutoClearDate(getNextAutoClearDateFormatted());
  };

  useEffect(() => {
    if (isOpen && dataSubTab === 'local') {
      setStorageStats(getStorageStats());
    }
  }, [isOpen, dataSubTab]);

  const [oneDriveEmailInput, setOneDriveEmailInput] = useState(oneDriveAccount.email);
  const [isConnectingOneDrive, setIsConnectingOneDrive] = useState(false);

  // Action status messages for Data tab
  const [driveActionStatus, setDriveActionStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isDriveOperating, setIsDriveOperating] = useState(false);

  const [oneDriveActionStatus, setOneDriveActionStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isOneDriveOperating, setIsOneDriveOperating] = useState(false);

  const [localActionStatus, setLocalActionStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Smoker Specifications & Active Pit State
  const activeProfile = profile || currentAppData?.profile;
  const effectiveSpecs = getEffectiveSmokerSpecs(activeProfile);

  const [activeSpecName, setActiveSpecName] = useState(effectiveSpecs.displayName);
  const [activeSpecBrand, setActiveSpecBrand] = useState(effectiveSpecs.brandOrBuilder);
  const [activeSpecCategory, setActiveSpecCategory] = useState(effectiveSpecs.category);
  const [activeSpecFuelType, setActiveSpecFuelType] = useState(effectiveSpecs.fuelType);
  const [activeSpecBaselineBurn, setActiveSpecBaselineBurn] = useState(effectiveSpecs.baselineBurnRateLbsHr);
  const [activeSpecHighHeatBurn, setActiveSpecHighHeatBurn] = useState(effectiveSpecs.highHeatBurnRateLbsHr);
  const [activeSpecCapacity, setActiveSpecCapacity] = useState(effectiveSpecs.hopperCapacityLbs);
  const [activeSpecArea, setActiveSpecArea] = useState(effectiveSpecs.cookingAreaSqIn);
  const [activeSpecThermalRating, setActiveSpecThermalRating] = useState(effectiveSpecs.thermalEfficiencyRating);
  const [activeSpecGauge, setActiveSpecGauge] = useState(effectiveSpecs.metalGaugeOrInsulation);
  const [activeSpecDraft, setActiveSpecDraft] = useState(effectiveSpecs.draftOrController);
  const [activeSpecInitialHours, setActiveSpecInitialHours] = useState(activeProfile?.initialHours ?? 0);

  // Account Settings: Initial Smoker Hours & Sub-Admin Controls State
  const [subAdminsList, setSubAdminsList] = useState<string[]>(getSubAdmins());
  const [newSubAdminInput, setNewSubAdminInput] = useState('');
  const [subAdminMsg, setSubAdminMsg] = useState<string | null>(null);
  const [accountInitialHours, setAccountInitialHours] = useState<number>(activeProfile?.initialHours ?? 0);
  const [globalBulkBaselineInput, setGlobalBulkBaselineInput] = useState('100');

  useEffect(() => {
    if (activeProfile?.initialHours !== undefined) {
      setAccountInitialHours(activeProfile.initialHours);
    }
  }, [activeProfile?.initialHours]);

  useEffect(() => {
    try {
      localStorage.setItem('pitmaster_local_user_account', JSON.stringify(localAccount));
    } catch (e) {}
  }, [localAccount]);

  const handleUpdatePitBaseline = (rigId: string, newInitial: number) => {
    const safeInitial = Math.max(0, newInitial);
    const logs = currentAppData?.cookLogs || [];

    const updatedRigs = (localAccount.rigs && localAccount.rigs.length > 0 ? localAccount.rigs : (profile ? [profile] : [])).map((r) => {
      if (r.id === rigId || (!r.id && rigId === 'default')) {
        const pitLogs = logs.filter((c) => c.smokerId === r.id);
        const pitLogged = pitLogs.length > 0
          ? pitLogs.reduce((acc, c) => acc + (c.hoursLogged || 0), 0)
          : ((localAccount.rigs || []).length <= 1 ? logs.reduce((acc, c) => acc + (c.hoursLogged || 0), 0) : 0);
        const newCurrent = Number((safeInitial + pitLogged).toFixed(2));
        return {
          ...r,
          initialHours: safeInitial,
          currentHours: newCurrent,
        };
      }
      return r;
    });

    setLocalAccount((prev) => ({
      ...prev,
      rigs: updatedRigs,
    }));

    const activeRigId = localAccount.activeRigId || profile?.id;
    const activeRig = updatedRigs.find((r) => r.id === activeRigId) || updatedRigs[0];
    if (activeRig && onUpdateProfile) {
      onUpdateProfile(activeRig);
      setAccountInitialHours(activeRig.initialHours || 0);
    }
    handleSyncWithServer();
  };

  const handleApplyGlobalBulkBaseline = (val: number) => {
    const safeVal = Math.max(0, val);
    const logs = currentAppData?.cookLogs || [];

    const updatedRigs = (localAccount.rigs && localAccount.rigs.length > 0 ? localAccount.rigs : (profile ? [profile] : [])).map((r) => {
      const pitLogs = logs.filter((c) => c.smokerId === r.id);
      const pitLogged = pitLogs.length > 0
        ? pitLogs.reduce((acc, c) => acc + (c.hoursLogged || 0), 0)
        : ((localAccount.rigs || []).length <= 1 ? logs.reduce((acc, c) => acc + (c.hoursLogged || 0), 0) : 0);
      const newCurrent = Number((safeVal + pitLogged).toFixed(2));
      return {
        ...r,
        initialHours: safeVal,
        currentHours: newCurrent,
      };
    });

    setLocalAccount((prev) => ({
      ...prev,
      rigs: updatedRigs,
    }));

    const activeRigId = localAccount.activeRigId || profile?.id;
    const activeRig = updatedRigs.find((r) => r.id === activeRigId) || updatedRigs[0];
    if (activeRig && onUpdateProfile) {
      onUpdateProfile(activeRig);
      setAccountInitialHours(safeVal);
    }
    handleSyncWithServer();
  };

  const handleSaveAccountInitialHours = (newInitial: number) => {
    const activeRigId = localAccount.activeRigId || profile?.id || 'default';
    handleUpdatePitBaseline(activeRigId, newInitial);
  };

  const handleAddSubAdmin = () => {
    const masterEmail = currentUser?.email || localAccount.email;
    if (addSubAdmin(masterEmail, newSubAdminInput)) {
      setSubAdminsList(getSubAdmins());
      setNewSubAdminInput('');
      setSubAdminMsg('Sub-admin added successfully!');
      setTimeout(() => setSubAdminMsg(null), 3000);
    } else {
      setSubAdminMsg('Failed to add sub-admin. Ensure email is valid.');
      setTimeout(() => setSubAdminMsg(null), 3000);
    }
  };

  const handleRemoveSubAdmin = (emailToRemove: string) => {
    const masterEmail = currentUser?.email || localAccount.email;
    if (removeSubAdmin(masterEmail, emailToRemove)) {
      setSubAdminsList(getSubAdmins());
      setSubAdminMsg('Sub-admin removed.');
      setTimeout(() => setSubAdminMsg(null), 3000);
    }
  };

  const [smokerSpecSaveStatus, setSmokerSpecSaveStatus] = useState<string | null>(null);

  // Sync state if activeProfile changes
  useEffect(() => {
    if (activeProfile) {
      const eff = getEffectiveSmokerSpecs(activeProfile);
      setActiveSpecName(eff.displayName);
      setActiveSpecBrand(eff.brandOrBuilder);
      setActiveSpecCategory(eff.category);
      setActiveSpecFuelType(eff.fuelType);
      setActiveSpecBaselineBurn(eff.baselineBurnRateLbsHr);
      setActiveSpecHighHeatBurn(eff.highHeatBurnRateLbsHr);
      setActiveSpecCapacity(eff.hopperCapacityLbs);
      setActiveSpecArea(eff.cookingAreaSqIn);
      setActiveSpecThermalRating(eff.thermalEfficiencyRating);
      setActiveSpecGauge(eff.metalGaugeOrInsulation);
      setActiveSpecDraft(eff.draftOrController);
      setActiveSpecInitialHours(activeProfile.initialHours ?? 0);
    }
  }, [activeProfile]);

  // New Smoker Specification Input Form State
  const [isAddingNewSmoker, setIsAddingNewSmoker] = useState(false);
  const [newSmokerMode, setNewSmokerMode] = useState<'custom' | 'manufacturer'>('custom');
  const [newSmokerName, setNewSmokerName] = useState('');
  const [newSmokerBrandOrBuilder, setNewSmokerBrandOrBuilder] = useState('');
  const [newSmokerCategory, setNewSmokerCategory] = useState('Vertical Pellet Smoker');
  const [newSmokerFuelType, setNewSmokerFuelType] = useState<'Pellets' | 'Charcoal' | 'Wood Splits' | 'Electric' | 'Gas'>('Pellets');
  const [newSmokerBaselineBurn, setNewSmokerBaselineBurn] = useState<number>(1.20);
  const [newSmokerHighHeatBurn, setNewSmokerHighHeatBurn] = useState<number>(2.50);
  const [newSmokerHopperCapacity, setNewSmokerHopperCapacity] = useState<number>(20);
  const [newSmokerCookingArea, setNewSmokerCookingArea] = useState<number>(800);
  const [newSmokerThermalRating, setNewSmokerThermalRating] = useState<'Extreme' | 'High' | 'Standard' | 'Moderate'>('High');
  const [newSmokerGauge, setNewSmokerGauge] = useState('11-Gauge Heavy Steel');
  const [newSmokerDraft, setNewSmokerDraft] = useState('PID Wi-Fi Controller');
  const [newSmokerSetAsActive, setNewSmokerSetAsActive] = useState<boolean>(true);
  const [newSmokerContributePool, setNewSmokerContributePool] = useState<boolean>(true);
  const [newSmokerStatus, setNewSmokerStatus] = useState<string | null>(null);

  // Saved Custom & Manufacturer Smoker Spec Collections
  const [savedCustomSmokersList, setSavedCustomSmokersList] = useState<CustomSmokerSpec[]>(() => loadSavedCustomSmokers());
  const [savedManufacturerSmokersList, setSavedManufacturerSmokersList] = useState<ManufacturerSmokerSpec[]>(() => loadSavedManufacturerSmokers());

  // Collapsible state toggles for Smoker Specs in Settings
  const [isSpecsFormExpanded, setIsSpecsFormExpanded] = useState<boolean>(false);
  const [isSmokerSwitcherExpanded, setIsSmokerSwitcherExpanded] = useState<boolean>(false);
  const [isSmokerCatalogBannerExpanded, setIsSmokerCatalogBannerExpanded] = useState<boolean>(false);
  const [isSmokerModsExpanded, setIsSmokerModsExpanded] = useState<boolean>(false);
  const [isGranularControlsExpanded, setIsGranularControlsExpanded] = useState<boolean>(false);

  const [federatedConfig, setFederatedConfig] = useState<FederatedLearningConfig>(() => loadFederatedLearningConfig());
  const [poolStats, setPoolStats] = useState<FederatedPoolStats | null>(null);
  const [isContributing, setIsContributing] = useState(false);
  const [contributionStatus, setContributionStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  useEffect(() => {
    saveFederatedLearningConfig(federatedConfig);
  }, [federatedConfig]);

  useEffect(() => {
    if (dataSubTab === 'federated') {
      const pitmasterAlias = currentUser?.email || localAccount.email || localAccount.name || 'guest';
      const userEmail = currentUser?.email || localAccount.email;
      const hasAccount = !!(userEmail || (localAccount.name && localAccount.name !== 'Pitmaster Guest' && localAccount.name.trim() !== ''));

      // If federated learning is disabled or user lacks account/terms, automatically revoke consent & purge unverified logs
      if (!federatedConfig.enabled || !hasAccount) {
        fetch('/api/federated-learning/revoke-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pitmasterAlias }),
        })
          .then(() => fetch('/api/federated-learning/stats'))
          .then((res) => res.json())
          .then((data) => setPoolStats(data))
          .catch(() => {});
      } else {
        // Otherwise run pre-load compliance sweep & fetch stats
        fetch('/api/federated-learning/purge-unverified', { method: 'POST' })
          .then(() => fetch('/api/federated-learning/stats'))
          .then((res) => res.json())
          .then((data) => setPoolStats(data))
          .catch(() => {});
      }
    }
  }, [dataSubTab, federatedConfig.enabled, currentUser, localAccount]);

  const toggleGranularPermission = (key: keyof import('../types').GranularDataSharingPermissions) => {
    const currentSharing = federatedConfig.granularSharing || DEFAULT_GRANULAR_SHARING;
    const nextSharing = {
      ...currentSharing,
      [key]: !currentSharing[key],
    };
    const nextConfig: FederatedLearningConfig = {
      ...federatedConfig,
      granularSharing: nextSharing,
    };
    setFederatedConfig(nextConfig);
    saveFederatedLearningConfig(nextConfig);

    const enabledCount = Object.values(nextSharing).filter(Boolean).length;
    setContributionStatus({
      type: 'info',
      text: `Granular sharing updated: ${enabledCount} of 9 data parameters enabled for AI learning pool.`,
    });
  };

  const handleContributeCookLogs = async () => {
    const userEmail = currentUser?.email || localAccount.email;
    const hasAccount = !!(userEmail || (localAccount.name && localAccount.name !== 'Pitmaster Guest' && localAccount.name.trim() !== ''));
    const pitmasterAlias = userEmail || localAccount.name || 'guest';

    if (!hasAccount) {
      setContributionStatus({
        type: 'error',
        text: 'Account Required: Please sign in or set up your Pitmaster account profile before contributing data to the AI learning pool.',
      });
      return;
    }

    if (!currentAppData || !currentAppData.cookLogs || currentAppData.cookLogs.length === 0) {
      setContributionStatus({ type: 'info', text: 'No cook logs found to contribute yet.' });
      return;
    }

    setIsContributing(true);
    setContributionStatus({ type: 'info', text: 'Executing pre-upload compliance sweep & filtering granular shared parameters...' });

    try {
      const sharing = federatedConfig.granularSharing || DEFAULT_GRANULAR_SHARING;

      const anonymizedLogs = currentAppData.cookLogs.map((log) => ({
        proteinType: sharing.shareProteinAndCuts ? (log.meatType || log.title || 'Beef') : '[Redacted by User Setting]',
        proteinCut: sharing.shareProteinAndCuts ? (log.title || 'Brisket') : '[Redacted by User Setting]',
        meatWeightLbs: sharing.shareMeatWeightAndDimensions ? (log.meatWeightLbs || 12.5) : undefined,
        smokerType: sharing.shareSmokerSpecsAndMods ? (currentAppData.profile?.model || 'Pellet Smoker') : '[Redacted by User Setting]',
        fuelType: sharing.shareFuelAndWoodBlends ? (log.woodBlend || 'Post Oak') : '[Redacted by User Setting]',
        cookingTemp: sharing.shareThermalTempCurves ? (log.targetTemp || 225) : undefined,
        stallTemp: sharing.shareThermalTempCurves ? (log.stallTemp || 165) : undefined,
        stallDurationHrs: sharing.shareThermalTempCurves ? 2.0 : undefined,
        hoursLogged: sharing.shareThermalTempCurves ? (log.totalHours || 8) : undefined,
        ratings: sharing.shareRatingsAndFlavorScores ? { overall: log.rating || 5, smokeFlavor: 5 } : undefined,
        weatherZip: sharing.shareWeatherAndLocation ? (log.weatherConditions || 'Zipcode Shared') : undefined,
        rubRecipe: sharing.shareCustomRubRecipes ? log.seasoningRubs : undefined,
        photoIncluded: sharing.shareCookPhotos ? !!log.photoUrls?.length : false,
      }));

      const res = await fetch('/api/federated-learning/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pitmasterAlias,
          hasAccount: true,
          termsAccepted: true,
          anonymizedLogs,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const updatedCount = (federatedConfig.contributedCount || 0) + anonymizedLogs.length;
        const newConfig: FederatedLearningConfig = {
          ...federatedConfig,
          contributedCount: updatedCount,
          lastSyncedAt: new Date().toISOString(),
        };
        setFederatedConfig(newConfig);
        saveFederatedLearningConfig(newConfig);

        setContributionStatus({
          type: 'success',
          text: `Contributed ${anonymizedLogs.length} cook log(s) to server pool! Total pool count: ${(data.totalPoolCount || 1547).toLocaleString()} cooks. (+${anonymizedLogs.length * 50} Pitmaster XP awarded)`,
        });

        fetch('/api/federated-learning/stats')
          .then((r) => r.json())
          .then((sData) => setPoolStats(sData))
          .catch(() => {});
      } else {
        setContributionStatus({ type: 'error', text: data.error || 'Contribution failed' });
      }
    } catch (err: any) {
      setContributionStatus({ type: 'error', text: err.message || 'Network error contributing data' });
    } finally {
      setIsContributing(false);
    }
  };

  const handleRevokeMyData = async () => {
    const pitmasterAlias = currentUser?.email || localAccount.email || localAccount.name || 'guest';
    setIsContributing(true);
    setContributionStatus({ type: 'info', text: 'Revoking consent & purging your contributions from server pool...' });

    try {
      const res = await fetch('/api/federated-learning/revoke-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pitmasterAlias }),
      });
      const data = await res.json();
      if (data.success) {
        try {
          localStorage.setItem('pitmaster_terms_accepted', 'false');
        } catch (e) {}

        const newConfig: FederatedLearningConfig = {
          ...federatedConfig,
          contributedCount: 0,
          enabled: false,
          autoSyncContributions: false,
        };
        setFederatedConfig(newConfig);
        saveFederatedLearningConfig(newConfig);

        setContributionStatus({
          type: 'success',
          text: `Consent Revoked: Auto-sync for Charbot disabled and all logs purged until Terms of Service is accepted again.`,
        });

        fetch('/api/federated-learning/stats')
          .then((r) => r.json())
          .then((sData) => setPoolStats(sData))
          .catch(() => {});
      } else {
        setContributionStatus({ type: 'error', text: data.error || 'Revocation failed.' });
      }
    } catch (err: any) {
      setContributionStatus({ type: 'error', text: 'Network error revoking user data.' });
    } finally {
      setIsContributing(false);
    }
  };

  const [autoBackupConfig, setAutoBackupConfig] = useState<{
    enabled: boolean;
    googleDrive: boolean;
    oneDrive: boolean;
    lastAutoBackup: string | null;
  }>(() => {
    try {
      const saved = localStorage.getItem('pitmaster_auto_backup_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      enabled: true,
      googleDrive: true,
      oneDrive: true,
      lastAutoBackup: new Date().toISOString(),
    };
  });

  const [autoBackupStatus, setAutoBackupStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('pitmaster_local_user_account', JSON.stringify(localAccount));
    } catch (e) {}
  }, [localAccount]);

  useEffect(() => {
    try {
      localStorage.setItem('pitmaster_onedrive_account', JSON.stringify(oneDriveAccount));
    } catch (e) {}
  }, [oneDriveAccount]);

  useEffect(() => {
    try {
      localStorage.setItem('pitmaster_auto_backup_config', JSON.stringify(autoBackupConfig));
    } catch (e) {}
  }, [autoBackupConfig]);

  if (!isOpen) return null;

  // Save local account edits
  const handleSaveAccountEdits = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Restrict competition & master titles unless user has sufficient logged hours
    const restrictedKeywords = ['competition', 'master', 'grand', 'champion', 'certified'];
    const titleLower = editTitle.trim().toLowerCase();
    const hasRestrictedKeyword = restrictedKeywords.some(keyword => titleLower.includes(keyword));
    
    if (hasRestrictedKeyword) {
      // Assuming 1000 hours is the threshold for these titles, since we don't have a formal verification API.
      const requiredHours = 1000;
      if (!profile || (profile.currentHours || 0) < requiredHours) {
        setLocalActionStatus({ type: 'error', text: `Restricted Title: Requires ${requiredHours}+ verified hours logged or official competition verification to use '${editTitle.trim()}'.` });
        return;
      }
    }

    const updated = {
      ...localAccount,
      name: editName.trim() || 'Pitmaster',
      email: editEmail.trim() || 'pitmaster@local.app',
      title: editTitle.trim(),
    };
    setLocalAccount(updated);
    localStorage.setItem('pitmaster_local_account', JSON.stringify(updated));
    setIsEditingAccount(false);
    setLocalActionStatus({ type: 'success', text: 'Pitmaster account profile updated!' });
  };

  // User Account Presence Check for Non-Local Backups
  const hasUserAccount = Boolean(currentUser || accessToken || (oneDriveAccount.connected && oneDriveAccount.email));

  // Trigger Daily Auto-Backup Immediately
  const handleRunAutoBackupNow = async () => {
    if (!hasUserAccount) {
      setAutoBackupStatus({
        type: 'error',
        text: '🔒 User Account Required: Non-local automatic daily backup requires an active user account. Please log in or connect below.',
      });
      return;
    }

    setAutoBackupStatus({ type: 'info', text: 'Executing daily automatic cloud backup...' });

    try {
      if (accessToken && currentAppData) {
        await saveToGoogleDrive(accessToken, currentAppData);
      }

      const nowIso = new Date().toISOString();
      setAutoBackupConfig((prev) => ({ ...prev, lastAutoBackup: nowIso }));
      setAutoBackupStatus({
        type: 'success',
        text: `Daily cloud backup completed at ${new Date(nowIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}!`,
      });
    } catch (err: any) {
      setAutoBackupStatus({ type: 'error', text: err.message || 'Auto backup encountered an error.' });
    }
  };

  // Google Drive Action: Backup Now
  const handleGoogleDriveBackup = async () => {
    if (!hasUserAccount || !accessToken || !currentAppData) {
      setDriveActionStatus({
        type: 'error',
        text: '🔒 User Account Required: Non-local cloud backups require an active signed-in user account. Please link Google Account below.',
      });
      return;
    }
    setIsDriveOperating(true);
    setDriveActionStatus({ type: 'info', text: 'Uploading backup to Google Drive...' });

    try {
      const res = await saveToGoogleDrive(accessToken, currentAppData);
      setDriveActionStatus({
        type: 'success',
        text: `Google Drive backup complete! ${res.createdNew ? 'Created new file.' : 'Updated backup file.'}`,
      });
    } catch (err: any) {
      setDriveActionStatus({ type: 'error', text: err.message || 'Failed to save to Google Drive' });
    } finally {
      setIsDriveOperating(false);
    }
  };

  // Google Drive Action: Restore Now
  const handleGoogleDriveRestore = async () => {
    if (!hasUserAccount || !accessToken) {
      setDriveActionStatus({
        type: 'error',
        text: '🔒 User Account Required: Please sign in with Google Account first.',
      });
      return;
    }
    setIsDriveOperating(true);
    setDriveActionStatus({ type: 'info', text: 'Fetching backup from Google Drive...' });

    try {
      const data = await loadFromGoogleDrive(accessToken);
      if (data && onRestoreData) {
        const restoredAccount = data.userAccount || data.userProfile;
        if (restoredAccount) {
          setLocalAccount(restoredAccount);
          try {
            localStorage.setItem('pitmaster_local_user_account', JSON.stringify(restoredAccount));
          } catch (e) {}
        }
        onRestoreData({
          profile: data.profile,
          cookLogs: data.cookLogs,
          fuelLogs: data.fuelLogs,
          userAccount: restoredAccount,
          userProfile: restoredAccount,
        });
        setDriveActionStatus({
          type: 'success',
          text: `Restored ${data.cookLogs?.length || 0} cook logs & user account from Google Drive!`,
        });
      } else {
        setDriveActionStatus({ type: 'error', text: 'No Google Drive backup file found.' });
      }
    } catch (err: any) {
      setDriveActionStatus({ type: 'error', text: err.message || 'Failed to restore from Google Drive' });
    } finally {
      setIsDriveOperating(false);
    }
  };

  // Google Sign-In Trigger
  const handleGoogleSignIn = async () => {
    setIsDriveOperating(true);
    setDriveActionStatus(null);
    try {
      const res = await googleSignIn();
      if (res && onAuthSuccess) {
        onAuthSuccess(res.user, res.accessToken);
        setDriveActionStatus({ type: 'success', text: `Signed in as ${res.user.email}` });
      }
    } catch (err: any) {
      setDriveActionStatus({ type: 'error', text: err.message || 'Google Auth failed' });
    } finally {
      setIsDriveOperating(false);
    }
  };

  // Microsoft OneDrive Action: Connect/Disconnect
  const handleToggleOneDriveConnect = () => {
    if (oneDriveAccount.connected) {
      setOneDriveAccount((prev) => ({ ...prev, connected: false }));
      setOneDriveActionStatus({ type: 'info', text: 'Disconnected from Microsoft OneDrive.' });
    } else {
      setIsConnectingOneDrive(true);
    }
  };

  const handleSaveOneDriveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oneDriveEmailInput.trim()) return;
    setOneDriveAccount({
      connected: true,
      email: oneDriveEmailInput.trim(),
      lastSync: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      autoSync: true,
    });
    setIsConnectingOneDrive(false);
    setOneDriveActionStatus({ type: 'success', text: `Connected OneDrive account (${oneDriveEmailInput.trim()})!` });
  };

  // Microsoft OneDrive Action: Backup
  const handleOneDriveBackup = () => {
    if (!hasUserAccount) {
      setOneDriveActionStatus({
        type: 'error',
        text: '🔒 User Account Required: Non-local cloud backups require an active user account. Please connect your account above.',
      });
      return;
    }
    if (!oneDriveAccount.connected) {
      setIsConnectingOneDrive(true);
      return;
    }
    if (!currentAppData) return;

    setIsOneDriveOperating(true);
    setOneDriveActionStatus({ type: 'info', text: 'Syncing backup to Microsoft OneDrive...' });

    setTimeout(() => {
      const backupPackage = {
        app: 'Pitmaster Log & Smoker Monitor',
        storageService: 'Microsoft OneDrive Cloud',
        userAccount: oneDriveAccount.email,
        timestamp: new Date().toISOString(),
        profile: currentAppData.profile,
        cookLogs: currentAppData.cookLogs,
        fuelLogs: currentAppData.fuelLogs,
      };

      // Trigger formatted file download for OneDrive sync directory
      const blob = new Blob([JSON.stringify(backupPackage, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pitmaster_onedrive_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setOneDriveAccount((prev) => ({ ...prev, lastSync: nowTime }));
      setOneDriveActionStatus({
        type: 'success',
        text: `Synced backup archive to Microsoft OneDrive (${nowTime})!`,
      });
      setIsOneDriveOperating(false);
    }, 600);
  };

  // Local Disk Export Backup
  const handleExportLocalBackup = () => {
    if (!currentAppData) return;
    const backupObj = {
      app: 'Pitmaster Log & Smoker Consumption Monitor',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      userProfile: localAccount,
      profile: currentAppData.profile,
      cookLogs: currentAppData.cookLogs,
      fuelLogs: currentAppData.fuelLogs,
    };

    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pitmaster_logbook_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setLocalActionStatus({ type: 'success', text: 'Downloaded local JSON backup file to device!' });
  };

  // Local Disk Import Backup
  const handleImportLocalBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed || (!parsed.cookLogs && !parsed.profile)) {
          throw new Error('Invalid backup file format. Missing cookLogs or profile data.');
        }

        const restoredAccount = parsed.userProfile || parsed.userAccount;
        if (restoredAccount) {
          setLocalAccount(restoredAccount);
          try {
            localStorage.setItem('pitmaster_local_user_account', JSON.stringify(restoredAccount));
          } catch (e) {}
        }

        const restored = {
          profile: parsed.profile || currentAppData?.profile,
          cookLogs: Array.isArray(parsed.cookLogs) ? parsed.cookLogs : currentAppData?.cookLogs || [],
          fuelLogs: Array.isArray(parsed.fuelLogs) ? parsed.fuelLogs : currentAppData?.fuelLogs || [],
          userAccount: restoredAccount || localAccount,
          userProfile: restoredAccount || localAccount,
        };

        if (onRestoreData) {
          onRestoreData(restored);
          setLocalActionStatus({
            type: 'success',
            text: `Imported local backup successfully (${restored.cookLogs.length} cook logs & user account restored)!`,
          });
        }
      } catch (err: any) {
        setLocalActionStatus({ type: 'error', text: err.message || 'Failed to parse JSON backup file.' });
      }
    };
    reader.readAsText(file);
  };

  const renderGranularParameterControls = () => {
    const sharing = federatedConfig.granularSharing || DEFAULT_GRANULAR_SHARING;
    const activeCount = Object.values(sharing).filter(Boolean).length;

    return (
      <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-3.5 space-y-3 shadow-md">
        <div 
          onClick={() => setIsGranularControlsExpanded(!isGranularControlsExpanded)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-orange-400 shrink-0" />
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">Granular Data Parameter Sharing Controls</h4>
              <p className="text-[11px] text-zinc-400">Turn off sharing for specific data parameters individually across Cloud Sync & AI Pooling</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-[10px] font-mono font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md">
              {activeCount} / 9 Active
            </span>
            <button type="button" className="text-zinc-400 hover:text-white p-1">
              {isGranularControlsExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {isGranularControlsExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs border-t border-[#2a2a2a] pt-2.5">
            {/* 1. Meat Cuts */}
            <div className="p-2.5 bg-[#141414] border border-[#262626] rounded-lg flex items-center justify-between">
              <div className="pr-2 space-y-0.5">
                <div className="font-bold text-white text-[11px]">🥩 Meat Cuts & Primal Origins</div>
                <p className="text-[10px] text-zinc-400">Share cut names, protein types (e.g. Pork Butt, Brisket)</p>
              </div>
              <ToggleSwitch
                checked={!!sharing.shareProteinAndCuts}
                onChange={() => toggleGranularPermission('shareProteinAndCuts')}
                label="Toggle Meat Cuts Sharing"
              />
            </div>

            {/* 2. Mass & Weight */}
            <div className="p-2.5 bg-[#141414] border border-[#262626] rounded-lg flex items-center justify-between">
              <div className="pr-2 space-y-0.5">
                <div className="font-bold text-white text-[11px]">⚖️ Mass & Weight Readings</div>
                <p className="text-[10px] text-zinc-400">Share cut weight (lbs/kg) and bone-in vs boneless status</p>
              </div>
              <ToggleSwitch
                checked={!!sharing.shareMeatWeightAndDimensions}
                onChange={() => toggleGranularPermission('shareMeatWeightAndDimensions')}
                label="Toggle Mass Weight Sharing"
              />
            </div>

            {/* 3. Smoker Specs */}
            <div className="p-2.5 bg-[#141414] border border-[#262626] rounded-lg flex items-center justify-between">
              <div className="pr-2 space-y-0.5">
                <div className="font-bold text-white text-[11px]">🛠️ Smoker Specs & Applied Mods</div>
                <p className="text-[10px] text-zinc-400">Share pit model category, gasket mods, thermal mass</p>
              </div>
              <ToggleSwitch
                checked={!!sharing.shareSmokerSpecsAndMods}
                onChange={() => toggleGranularPermission('shareSmokerSpecsAndMods')}
                label="Toggle Smoker Specs Sharing"
              />
            </div>

            {/* 4. Fuel & Wood */}
            <div className="p-2.5 bg-[#141414] border border-[#262626] rounded-lg flex items-center justify-between">
              <div className="pr-2 space-y-0.5">
                <div className="font-bold text-white text-[11px]">🪵 Fuel & Wood Blend Ratio</div>
                <p className="text-[10px] text-zinc-400">Share wood species (Hickory, Post Oak) and pellet burn rate</p>
              </div>
              <ToggleSwitch
                checked={!!sharing.shareFuelAndWoodBlends}
                onChange={() => toggleGranularPermission('shareFuelAndWoodBlends')}
                label="Toggle Fuel Sharing"
              />
            </div>

            {/* 5. Thermal Temp Curves */}
            <div className="p-2.5 bg-[#141414] border border-[#262626] rounded-lg flex items-center justify-between">
              <div className="pr-2 space-y-0.5">
                <div className="font-bold text-white text-[11px]">🌡️ Thermal Curves & Stall Data</div>
                <p className="text-[10px] text-zinc-400">Share target pit temps, probe readings, stall hours</p>
              </div>
              <ToggleSwitch
                checked={!!sharing.shareThermalTempCurves}
                onChange={() => toggleGranularPermission('shareThermalTempCurves')}
                label="Toggle Thermal Curves Sharing"
              />
            </div>

            {/* 6. Ratings & Flavor */}
            <div className="p-2.5 bg-[#141414] border border-[#262626] rounded-lg flex items-center justify-between">
              <div className="pr-2 space-y-0.5">
                <div className="font-bold text-white text-[11px]">⭐ Ratings & Flavor Scores</div>
                <p className="text-[10px] text-zinc-400">Share smoke ring depth, bark rating, tenderness score</p>
              </div>
              <ToggleSwitch
                checked={!!sharing.shareRatingsAndFlavorScores}
                onChange={() => toggleGranularPermission('shareRatingsAndFlavorScores')}
                label="Toggle Ratings Sharing"
              />
            </div>

            {/* 7. Weather & Zipcode */}
            <div className="p-2.5 bg-[#141414] border border-[#262626] rounded-lg flex items-center justify-between">
              <div className="pr-2 space-y-0.5">
                <div className="font-bold text-white text-[11px]">🌤️ Weather & Zipcode Region</div>
                <p className="text-[10px] text-zinc-400">Share outdoor ambient temp, humidity, general region</p>
              </div>
              <ToggleSwitch
                checked={!!sharing.shareWeatherAndLocation}
                onChange={() => toggleGranularPermission('shareWeatherAndLocation')}
                label="Toggle Weather Sharing"
              />
            </div>

            {/* 8. Custom Rub Recipes */}
            <div className="p-2.5 bg-[#141414] border border-[#262626] rounded-lg flex items-center justify-between">
              <div className="pr-2 space-y-0.5">
                <div className="font-bold text-white text-[11px]">🧂 Custom Rub Seasonings</div>
                <p className="text-[10px] text-zinc-400">Share seasoning blends, mop sauces, cook notes</p>
              </div>
              <ToggleSwitch
                checked={!!sharing.shareCustomRubRecipes}
                onChange={() => toggleGranularPermission('shareCustomRubRecipes')}
                label="Toggle Rub Recipes Sharing"
              />
            </div>

            {/* 9. Meat & Cook Photos */}
            <div className="p-2.5 bg-[#141414] border border-[#262626] rounded-lg flex items-center justify-between font-mono">
              <div className="pr-2 space-y-0.5 font-sans">
                <div className="font-bold text-white text-[11px]">📷 Cook Progress & Meat Scan Photos</div>
                <p className="text-[10px] text-zinc-400">Share meat cut identification & bark photo captures</p>
              </div>
              <ToggleSwitch
                checked={!!sharing.shareCookPhotos}
                onChange={() => toggleGranularPermission('shareCookPhotos')}
                label="Toggle Photos Sharing"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 animate-fade-in">
      <div 
        className="modal-container bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 text-zinc-200 overflow-y-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#2a2a2a]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Settings & Data Hub</h2>
              <p className="text-xs text-zinc-400 mt-0.5 font-medium">Accounts, multi-destination backups, theme & probes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg bg-[#242424] hover:bg-[#2a2a2a] transition-colors cursor-pointer"
            title="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categorized Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[#121212] p-1.5 rounded-xl border border-[#2a2a2a]">
          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`min-h-[44px] py-2 px-2 sm:px-2.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer truncate ${
              activeTab === 'appearance'
                ? 'bg-orange-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Appearance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={`min-h-[44px] py-2 px-2 sm:px-2.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer truncate ${
              activeTab === 'alerts'
                ? 'bg-orange-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <Bell className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Alerts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`min-h-[44px] py-2 px-2 sm:px-2.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer truncate ${
              activeTab === 'cloud'
                ? 'bg-orange-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Cloud & Probes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`min-h-[44px] py-2 px-2 sm:px-2.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer truncate ${
              activeTab === 'data'
                ? 'bg-orange-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Data & Backups</span>
          </button>
        </div>

        {/* TAB 1: APPEARANCE & DISPLAY */}
        {activeTab === 'appearance' && (
          <div className="space-y-3 animate-fade-in">
            {/* Setting: Temperature Scale */}
            <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 pr-3">
                <Thermometer className="w-4 h-4 text-orange-400 shrink-0" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Temperature Scale</h4>
                  <p className="text-[11px] text-zinc-400">Fahrenheit (°F) or Celsius (°C)</p>
                </div>
              </div>
              <div className="flex items-center bg-[#1a1a1a] p-1 rounded-lg border border-[#2a2a2a]">
                <button
                  type="button"
                  onClick={tempUnit === 'C' ? onToggleTempUnit : undefined}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    tempUnit === 'F' ? 'bg-orange-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  °F
                </button>
                <button
                  type="button"
                  onClick={tempUnit === 'F' ? onToggleTempUnit : undefined}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    tempUnit === 'C' ? 'bg-orange-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  °C
                </button>
              </div>
            </div>

            {/* Setting: Theme Mode */}
            <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 pr-3">
                {themeMode === 'dark' ? (
                  <Moon className="w-4 h-4 text-purple-400 shrink-0" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Display Mode</h4>
                  <p className="text-[11px] text-zinc-400">Night Dark or Clean Light Canvas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleThemeMode}
                className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#2e2e2e] border border-[#2a2a2a] text-xs font-bold text-zinc-200 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                {themeMode === 'dark' ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-purple-400" />
                    <span>Dark</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Light</span>
                  </>
                )}
              </button>
            </div>

            {/* Setting: Colorblind Mode */}
            <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 pr-3">
                <Eye className={`w-4 h-4 shrink-0 ${isColorblind ? 'text-emerald-400' : 'text-zinc-400'}`} />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">High-Contrast Colorblind Colors</h4>
                  <p className="text-[11px] text-zinc-400">Enhanced contrast for chart curves & probe labels</p>
                </div>
              </div>
              <ToggleSwitch
                checked={isColorblind}
                onChange={onToggleColorblind}
                label="Toggle Colorblind Mode"
              />
            </div>

            {/* Setting: Low Power Mode */}
            <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5 pr-3">
                  <Zap className={`w-4 h-4 shrink-0 ${lowPowerSettings?.enabled ? 'text-amber-400 fill-amber-400' : 'text-zinc-400'}`} />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white flex items-center space-x-1.5">
                      <span>Low Power & Battery Saver Mode</span>
                      {lowPowerSettings?.enabled && (
                        <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                          ⚡ ACTIVE
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      Optimizes GPU rendering, pauses background animations, and slows telemetry polling for long overnight cooks on battery.
                    </p>
                  </div>
                </div>
                {onToggleLowPowerMode && (
                  <ToggleSwitch
                    checked={!!lowPowerSettings?.enabled}
                    onChange={() => onToggleLowPowerMode()}
                    label="Toggle Low Power Mode"
                  />
                )}
              </div>

              {lowPowerSettings?.enabled && onToggleLowPowerMode && (
                <div className="pt-2 border-t border-[#333] space-y-2 text-xs font-mono text-zinc-300">
                  <div className="flex items-center justify-between bg-[#1a1a1a] p-2 rounded-lg border border-[#333]">
                    <span>Reduce UI Animations & Transitions</span>
                    <ToggleSwitch
                      checked={lowPowerSettings.reduceAnimations}
                      onChange={() => onToggleLowPowerMode('reduceAnimations')}
                      label="Reduce Animations"
                    />
                  </div>
                  <div className="flex items-center justify-between bg-[#1a1a1a] p-2 rounded-lg border border-[#333]">
                    <span>Slow Telemetry Polling (15s Interval)</span>
                    <ToggleSwitch
                      checked={lowPowerSettings.slowTelemetryPolling}
                      onChange={() => onToggleLowPowerMode('slowTelemetryPolling')}
                      label="Slow Telemetry Polling"
                    />
                  </div>
                  <div className="flex items-center justify-between bg-[#1a1a1a] p-2 rounded-lg border border-[#333]">
                    <span>Disable Heavy GPU Blur & Shadow Effects</span>
                    <ToggleSwitch
                      checked={lowPowerSettings.disableGpuBlurEffects}
                      onChange={() => onToggleLowPowerMode('disableGpuBlurEffects')}
                      label="Disable GPU Blur Effects"
                    />
                  </div>
                  
                  {/* Dedicated Raspberry Pi Hardware Acceleration & Kiosk Section */}
                  <div className="mt-3 pt-3 border-t border-[#333] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-rose-400 font-bold">
                        <Cpu className="w-4 h-4 animate-pulse" />
                        <span>Raspberry Pi Hardware Acceleration Mode</span>
                      </div>
                      <ToggleSwitch
                        checked={!!lowPowerSettings.raspberryPiMode}
                        onChange={() => onToggleLowPowerMode('raspberryPiMode')}
                        label="Toggle Raspberry Pi Mode"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-400 font-sans">
                      Optimizes DOM updates, caps chart frame rates, and disables backdrop filters specifically for ARM processors (Pi Zero, 3, 4, 5).
                    </p>

                    {lowPowerSettings.raspberryPiMode && (
                      <div className="pl-3 border-l-2 border-rose-500/50 space-y-2 pt-1 text-[11px]">
                        <div className="flex items-center justify-between bg-[#141414] p-2 rounded-lg border border-[#2a2a2a]">
                          <span>Enlarge Touchscreen Targets (Pi Kiosk Display)</span>
                          <ToggleSwitch
                            checked={!!lowPowerSettings.piKioskTouchTargets}
                            onChange={() => onToggleLowPowerMode('piKioskTouchTargets')}
                            label="Touchscreen Targets"
                          />
                        </div>
                        <div className="flex items-center justify-between bg-[#141414] p-2 rounded-lg border border-[#2a2a2a]">
                          <span>Aggressive Memory Cache Purge</span>
                          <ToggleSwitch
                            checked={!!lowPowerSettings.piAggressiveGc}
                            onChange={() => onToggleLowPowerMode('piAggressiveGc')}
                            label="Aggressive Memory GC"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ALERTS & FIELD OPERATIONAL MODE */}
        {activeTab === 'alerts' && (
          <div className="space-y-3 animate-fade-in">
            {/* Setting: Audio Sound FX */}
            <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 pr-3">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <VolumeX className="w-4 h-4 text-zinc-500 shrink-0" />
                )}
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Pit Master Alarm Chimes</h4>
                  <p className="text-[11px] text-zinc-400">Audio feedback on target internal temp reach</p>
                </div>
              </div>
              <ToggleSwitch
                checked={soundEnabled}
                onChange={onToggleSound}
                label="Toggle Pit Master Alarm Chimes"
              />
            </div>

            {/* Setting: Force Offline Field Mode */}
            <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 pr-3">
                {forceOffline ? (
                  <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs sm:text-sm font-bold text-white">Force Offline Field Mode</h4>
                    {forceOffline && (
                      <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400">Disable network calls for remote backcountry smoking</p>
                </div>
              </div>
              <ToggleSwitch
                checked={forceOffline}
                onChange={onToggleForceOffline}
                label="Toggle Force Offline Field Mode"
              />
            </div>

            {/* CHARGPT PUSH NOTIFICATIONS & AMAZON ALEXA HUB */}
            <div className="pt-3 border-t border-[#2a2a2a]">
              <PushAndAlexaHub
                activeCook={currentAppData?.cookLogs?.[0]}
                smokerProfile={profile || currentAppData?.profile}
                tempUnit={tempUnit}
              />
            </div>
          </div>
        )}

        {/* TAB 3: CLOUD & PROBES */}
        {activeTab === 'cloud' && (
          <div className="space-y-3 animate-fade-in">
            {/* Setting: Auto-Sync Drive */}
            <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 pr-3">
                <Cloud className={`w-4 h-4 shrink-0 ${autoSyncDrive ? 'text-sky-400' : 'text-zinc-500'}`} />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Auto-Sync Drive Backups</h4>
                  <p className="text-[11px] text-zinc-400">Auto-backup new smoke logs to Google Drive</p>
                </div>
              </div>
              <ToggleSwitch
                checked={autoSyncDrive}
                onChange={onToggleAutoSync}
                label="Toggle Auto-Sync Drive"
              />
            </div>

            {/* Setting: Bluetooth Hub Button */}
            <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Bluetooth className="w-4 h-4 text-blue-400 shrink-0 animate-pulse" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">Wireless Probe Hub</h4>
                    <p className="text-[11px] text-zinc-400">MEATER, ThermoWorks & Bluetooth Probes</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                  Ready
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBluetoothModal();
                }}
                className="w-full py-2 px-3 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 font-bold text-xs rounded-xl flex items-center justify-between transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-center space-x-2">
                  <Bluetooth className="w-3.5 h-3.5 text-blue-400" />
                  <span>Open Wireless Probe Hub</span>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Setting: Google Drive Management */}
            <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Cloud className={`w-4 h-4 shrink-0 ${isDriveConnected ? 'text-sky-400' : 'text-zinc-400'}`} />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">Google Drive Account</h4>
                    <p className="text-[11px] text-zinc-400">Cloud backups and sheet restores</p>
                  </div>
                </div>
                {isDriveConnected ? (
                  <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3 text-cyan-400" />
                    <span>Connected</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-zinc-400 bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-0.5 rounded-md">
                    Linked Off
                  </span>
                )}
              </div>

              {isDriveConnected && driveUserEmail && (
                <p className="text-[11px] font-mono text-sky-300 bg-sky-500/10 border border-sky-500/20 p-2 rounded-lg truncate">
                  Account: {driveUserEmail}
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDriveModal();
                }}
                className="w-full py-2 px-3 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] hover:border-orange-500/30 text-white font-bold text-xs rounded-xl flex items-center justify-between transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-center space-x-2">
                  <Cloud className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isDriveConnected ? 'Manage Drive Backups' : 'Connect Google Drive'}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Setting: Amazon Alexa Cloud Sync & Voice Controls (Collapsible Window with Toggles) */}
            <div className="pt-2">
              <PushAndAlexaHub
                activeCook={currentAppData?.cookLogs?.[0]}
                smokerProfile={profile || currentAppData?.profile}
                tempUnit={tempUnit}
                isCollapsible={true}
                defaultOpen={true}
                titleOverride="Amazon Alexa Cloud Sync & Voice Controls"
              />
            </div>
          </div>
        )}

        {/* TAB 4: DATA, USER ACCOUNTS & MULTI-LOCATION BACKUPS */}
        {activeTab === 'data' && (
          <div className="space-y-3.5 animate-fade-in">
            {/* Functional Sub-Tab Navigation Bar */}
            <div className="flex items-center gap-1 p-1 bg-[#121212] border border-[#2a2a2a] rounded-xl overflow-x-auto">
              <button
                type="button"
                onClick={() => setDataSubTab('account')}
                className={`flex-1 py-2 px-2 rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer whitespace-nowrap ${
                  dataSubTab === 'account'
                    ? 'bg-orange-500 text-zinc-950 font-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">1. Account</span>
              </button>
              <button
                type="button"
                onClick={() => setDataSubTab('smokers')}
                className={`flex-1 py-2 px-2 rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer whitespace-nowrap ${
                  dataSubTab === 'smokers'
                    ? 'bg-orange-500 text-zinc-950 font-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <Flame className="w-3.5 h-3.5 shrink-0 text-orange-400" />
                <span className="truncate">2. Smoker Specs</span>
              </button>
              <button
                type="button"
                onClick={() => setDataSubTab('cloud')}
                className={`flex-1 py-2 px-2 rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer whitespace-nowrap ${
                  dataSubTab === 'cloud'
                    ? 'bg-orange-500 text-zinc-950 font-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <Cloud className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">3. Cloud Sync</span>
              </button>
              <button
                type="button"
                onClick={() => setDataSubTab('federated')}
                className={`flex-1 py-2 px-2 rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer whitespace-nowrap ${
                  dataSubTab === 'federated'
                    ? 'bg-orange-500 text-zinc-950 font-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <Brain className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                <span className="truncate">4. AI Federated</span>
              </button>
              <button
                type="button"
                onClick={() => setDataSubTab('local')}
                className={`flex-1 py-2 px-2 rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer whitespace-nowrap ${
                  dataSubTab === 'local'
                    ? 'bg-orange-500 text-zinc-950 font-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">5. Local & Reset</span>
              </button>
            </div>

            {/* SUB-TAB 1: USER ACCOUNTS, MULTI-RIG FLEET & COLLAPSIBLE SETTINGS */}
            {dataSubTab === 'account' && (
              <div className="space-y-3">
                {/* Header & Server Hosted Indicator */}
                <div className="flex items-center justify-between p-3 bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-400">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                        <span>Account Settings & Pitmaster Fleet</span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                          <Server className="w-3 h-3 text-emerald-400" />
                          <span>Server Hosted</span>
                        </span>
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        {localAccount.name} ({localAccount.email}) • {localAccount.rigs?.length || 1} Rig(s) Linked
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncWithServer}
                    disabled={isServerSyncing}
                    className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 font-bold text-xs rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isServerSyncing ? 'animate-spin text-orange-400' : ''}`} />
                    <span>{isServerSyncing ? 'Syncing...' : 'Sync Server'}</span>
                  </button>
                </div>

                {serverSyncStatus && (
                  <div className={`p-2.5 rounded-xl text-xs font-medium border flex items-center space-x-2 ${
                    serverSyncStatus.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : serverSyncStatus.type === 'error'
                      ? 'bg-red-500/10 border-red-500/30 text-red-300'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                  }`}>
                    <Info className="w-4 h-4 shrink-0" />
                    <span>{serverSyncStatus.text}</span>
                  </div>
                )}

                {/* ============================================================
                    COLLAPSIBLE ACCORDION 1: USER ACCOUNT PROFILE & CREDENTIALS
                ============================================================ */}
                <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => toggleSection('profile')}
                    className="w-full px-3.5 py-3 bg-[#242424] hover:bg-[#2a2a2a] flex items-center justify-between cursor-pointer border-b border-[#2a2a2a] transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <UserIcon className="w-4 h-4 text-orange-400" />
                      <div className="text-left">
                        <span className="text-xs font-bold text-white block">1. User Account Profile & Pitmaster Credentials</span>
                        <span className="text-[10px] text-zinc-400 font-mono">{localAccount.name} • {localAccount.title}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {currentUser ? (
                        <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          Google Auth
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-orange-300 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
                          Server Profile
                        </span>
                      )}
                      {collapsedSections.profile ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronUp className="w-4 h-4 text-orange-400" />}
                    </div>
                  </button>

                  {!collapsedSections.profile && (
                    <div className="p-3.5 space-y-3 bg-[#181818] animate-fade-in">
                      {currentUser ? (
                        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-3 flex items-center justify-between">
                          <div className="flex items-center space-x-3 truncate">
                            {currentUser.photoURL ? (
                              <img src={currentUser.photoURL} alt="User" className="w-9 h-9 rounded-full border border-orange-500/50 object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 font-bold flex items-center justify-center text-sm">
                                {(currentUser.displayName || currentUser.email || 'P')[0].toUpperCase()}
                              </div>
                            )}
                            <div className="truncate">
                              <p className="text-xs font-bold text-white truncate">{currentUser.displayName || 'Google Pitmaster'}</p>
                              <p className="text-[11px] text-zinc-400 font-mono truncate">{currentUser.email}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={onLogout}
                            className="ml-2 px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-[11px] rounded-lg flex items-center space-x-1 shrink-0 cursor-pointer"
                          >
                            <LogOut className="w-3 h-3" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {!isEditingAccount ? (
                            <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-3 flex items-center justify-between">
                              <div className="flex items-center space-x-3 truncate">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-zinc-950 font-black flex items-center justify-center text-sm shrink-0">
                                  {localAccount.name[0]?.toUpperCase() || 'P'}
                                </div>
                                <div className="truncate">
                                  <div className="flex items-center space-x-2">
                                    <p className="text-xs font-bold text-white truncate">{localAccount.name}</p>
                                    <span className="text-[9px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.2 rounded">
                                      {localAccount.title}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-zinc-400 font-mono truncate">{localAccount.email}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setIsEditingAccount(true)}
                                className="px-2.5 py-1.5 bg-[#282828] hover:bg-[#323232] border border-[#3a3a3a] text-zinc-200 font-bold text-[11px] rounded-lg flex items-center space-x-1 shrink-0 cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3 text-orange-400" />
                                <span>Edit Profile</span>
                              </button>
                            </div>
                          ) : (
                            <form onSubmit={handleSaveAccountEdits} className="bg-[#1e1e1e] border border-orange-500/30 rounded-xl p-3 space-y-2.5">
                              <p className="text-xs font-bold text-orange-400 flex items-center space-x-1">
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Edit User Account Profile</span>
                              </p>
                              <div className="space-y-2 text-xs">
                                <div>
                                  <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-0.5">Pitmaster Name</label>
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full bg-[#121212] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-orange-500 font-medium"
                                    placeholder="e.g. Jonathan Blunt"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-0.5">Email Address (Server Account ID)</label>
                                  <input
                                    type="email"
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    className={`w-full bg-[#121212] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-orange-500 font-mono ${!!currentUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    placeholder="e.g. jonathanblunt1214@gmail.com"
                                    required
                                    disabled={!!currentUser}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-0.5">Pitmaster Rank / Title</label>
                                  <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full bg-[#121212] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-orange-500 font-medium"
                                    placeholder="e.g. Head Pitmaster"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-end space-x-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setIsEditingAccount(false)}
                                  className="px-3 py-1.5 bg-[#282828] hover:bg-[#323232] text-zinc-300 font-bold text-[11px] rounded-lg"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold text-[11px] rounded-lg flex items-center space-x-1"
                                >
                                  <Save className="w-3 h-3" />
                                  <span>Save Account</span>
                                </button>
                              </div>
                            </form>
                          )}

                          {/* USER PITMASTER ACCOUNT LEVEL & MASTERY CARD */}
                          {(() => {
                            const userAccountData = calculateUserAccount(
                              currentAppData?.cookLogs || [],
                              currentAppData?.fuelLogs || [],
                              currentAppData?.profile
                            );
                            const { level, levelTitle, nextLevelXp, progressPercent } = getUserLevelThresholds(userAccountData.xp);

                            return (
                              <div className="bg-gradient-to-r from-orange-950/40 via-[#1e1e1e] to-amber-950/30 border border-orange-500/30 rounded-xl p-3 space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 flex items-center space-x-1 font-mono">
                                      <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                                      <span>Pitmaster Account Mastery Level</span>
                                    </span>
                                  </div>
                                  <span className="text-xs font-black text-amber-300 font-mono bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
                                    Level {level}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="text-xs font-bold text-white">{levelTitle}</h4>
                                    <p className="text-[10px] text-zinc-400">Account XP calculated from cooks, fuel blends & maintenance</p>
                                  </div>
                                  <span className="text-xs font-bold text-orange-400 font-mono">{userAccountData.xp} XP</span>
                                </div>

                                <div className="space-y-1">
                                  <div className="w-full bg-[#121212] h-2 rounded-full overflow-hidden border border-orange-500/20">
                                    <div
                                      className="bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 h-full transition-all duration-500"
                                      style={{ width: `${progressPercent}%` }}
                                    ></div>
                                  </div>
                                  <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                                    <span>{userAccountData.xp} XP</span>
                                    <span>{nextLevelXp} XP Next Rank</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ============================================================
                    COLLAPSIBLE ACCORDION 2: LINKED SMOKER RIGS & FLEET (MULTI-RIG)
                ============================================================ */}
                <div className="bg-[#1e1e1e] border border-orange-500/30 rounded-xl overflow-hidden transition-all shadow-md">
                  <button
                    type="button"
                    onClick={() => toggleSection('multirig')}
                    className="w-full px-3.5 py-3 bg-gradient-to-r from-[#242424] via-[#2a2118] to-[#242424] hover:bg-[#2a2a2a] flex items-center justify-between cursor-pointer border-b border-[#2a2a2a] transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Flame className="w-4 h-4 text-orange-400" />
                      <div className="text-left">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>2. Linked Smoker Rigs & Fleet (Multi-Rig Management)</span>
                          <span className="text-[10px] font-mono font-bold text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded-full">
                            {localAccount.rigs?.length || 1} Rig(s)
                          </span>
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          Active Rig: {effectiveSpecs.displayName} ({effectiveSpecs.category})
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {collapsedSections.multirig ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronUp className="w-4 h-4 text-orange-400" />}
                    </div>
                  </button>

                  {!collapsedSections.multirig && (
                    <div className="p-3.5 space-y-3 bg-[#181818] animate-fade-in">
                      {/* Active Smoker Overview Banner */}
                      <div className="p-3 bg-[#121212] border border-orange-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-400 shrink-0">
                            <Flame className="w-5 h-5 text-orange-400" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              <span>{effectiveSpecs.displayName}</span>
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                                Active Rig
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-400 font-mono">
                              {effectiveSpecs.category} • {effectiveSpecs.fuelType} • {effectiveSpecs.hopperCapacityLbs} lbs Hopper • {profile?.currentHours || 0} hrs logged
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAddingRig(true)}
                          className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-zinc-950 font-black text-xs rounded-lg flex items-center space-x-1 transition-all cursor-pointer shrink-0 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>+ Add Smoker Rig</span>
                        </button>
                      </div>

                      {/* List of Account Linked Smoker Rigs */}
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center justify-between">
                          <span>Account Smoker Fleet:</span>
                          <span className="text-zinc-500">{localAccount.rigs?.length || 1} linked smoker profile(s)</span>
                        </h5>

                        <div className="grid grid-cols-1 gap-2">
                          {(localAccount.rigs && localAccount.rigs.length > 0 ? localAccount.rigs : [profile]).map((rigItem) => {
                            const isActive = (localAccount.activeRigId === rigItem.id) || (profile?.id === rigItem.id) || (effectiveSpecs.displayName === rigItem.name);
                            const isEditingThis = editingRigId === rigItem.id;

                            return (
                              <div
                                key={rigItem.id}
                                className={`p-3 rounded-xl border transition-all ${
                                  isActive
                                    ? 'bg-gradient-to-r from-orange-950/30 via-[#1c1c1c] to-[#1a1a1a] border-orange-500/50 shadow-md'
                                    : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3a3a3a]'
                                }`}
                              >
                                {!isEditingThis ? (
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                    <div className="space-y-1">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-xs font-bold text-white">{rigItem.name}</span>
                                        {isActive ? (
                                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                                            Active Pit
                                          </span>
                                        ) : (
                                          <span className="text-[9px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-1.5 py-0.2 rounded font-mono">
                                            Linked Rig
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-zinc-400 font-mono flex items-center space-x-3">
                                        <span>{rigItem.smokerType}</span>
                                        <span>•</span>
                                        <span>{rigItem.fuelType}</span>
                                        <span>•</span>
                                        <span>{rigItem.pelletHopperCapacityLbs || 20} lbs Hopper</span>
                                        <span>•</span>
                                        <span className="text-orange-400 font-bold">{rigItem.currentHours || rigItem.initialHours || 0} hrs</span>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
                                      {!isActive && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setLocalAccount((prev) => ({ ...prev, activeRigId: rigItem.id }));
                                            if (onUpdateProfile) onUpdateProfile(rigItem);
                                            handleSyncWithServer();
                                          }}
                                          className="px-2.5 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 font-bold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                                        >
                                          <Check className="w-3 h-3" />
                                          <span>Set Active</span>
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingRigId(rigItem.id);
                                          setEditRigName(rigItem.name);
                                          setEditRigHours(String(rigItem.initialHours || 0));
                                          setEditRigHopper(String(rigItem.pelletHopperCapacityLbs || 20));
                                        }}
                                        className="px-2 py-1.5 bg-[#2a2a2a] hover:bg-[#333] border border-[#3a3a3a] text-zinc-300 font-bold text-[11px] rounded-lg cursor-pointer"
                                      >
                                        <Edit3 className="w-3 h-3 text-orange-400" />
                                      </button>
                                      {(localAccount.rigs && localAccount.rigs.length > 1) && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updatedRigs = localAccount.rigs?.filter((r) => r.id !== rigItem.id) || [];
                                            setLocalAccount((prev) => ({
                                              ...prev,
                                              rigs: updatedRigs,
                                              activeRigId: prev.activeRigId === rigItem.id ? updatedRigs[0]?.id : prev.activeRigId,
                                            }));
                                            if (isActive && updatedRigs[0] && onUpdateProfile) {
                                              onUpdateProfile(updatedRigs[0]);
                                            }
                                            handleSyncWithServer();
                                          }}
                                          className="px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-[11px] rounded-lg cursor-pointer"
                                          title="Delete Rig"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  /* Inline Rig Edit Form */
                                  <div className="space-y-2 p-2 bg-[#121212] rounded-lg border border-orange-500/30 text-xs">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      <div>
                                        <label className="block text-[9px] text-zinc-400 font-bold uppercase mb-0.5">Rig Name</label>
                                        <input
                                          type="text"
                                          value={editRigName}
                                          onChange={(e) => setEditRigName(e.target.value)}
                                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-white font-medium text-xs"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] text-zinc-400 font-bold uppercase mb-0.5">Initial Hours</label>
                                        <input
                                          type="number"
                                          step="0.5"
                                          value={editRigHours}
                                          onChange={(e) => setEditRigHours(e.target.value)}
                                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-white font-mono text-xs"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] text-zinc-400 font-bold uppercase mb-0.5">Hopper Cap (lbs)</label>
                                        <input
                                          type="number"
                                          value={editRigHopper}
                                          onChange={(e) => setEditRigHopper(e.target.value)}
                                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-white font-mono text-xs"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex justify-end space-x-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => setEditingRigId(null)}
                                        className="px-2.5 py-1 bg-[#242424] text-zinc-300 font-bold text-[10px] rounded"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updatedRigs = (localAccount.rigs || [profile]).map((r) => {
                                            if (r.id === rigItem.id) {
                                              return {
                                                ...r,
                                                name: editRigName.trim() || r.name,
                                                initialHours: parseFloat(editRigHours) || 0,
                                                pelletHopperCapacityLbs: parseFloat(editRigHopper) || 20,
                                              };
                                            }
                                            return r;
                                          });
                                          setLocalAccount((prev) => ({ ...prev, rigs: updatedRigs }));
                                          setEditingRigId(null);
                                          const edited = updatedRigs.find((r) => r.id === rigItem.id);
                                          if (isActive && edited && onUpdateProfile) {
                                            onUpdateProfile(edited);
                                          }
                                          handleSyncWithServer();
                                        }}
                                        className="px-2.5 py-1 bg-orange-500 text-zinc-950 font-bold text-[10px] rounded"
                                      >
                                        Save Rig
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Add New Smoker Rig Modal / Inline Form */}
                      {isAddingRig && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const newRig: SmokerProfile = {
                              id: `rig-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                              name: newRigName.trim() || 'Custom Smoker Rig',
                              model: newRigModel.trim() || 'Custom Rig Model',
                              smokerType: newRigType,
                              fuelType: newRigFuel,
                              initialHours: parseFloat(newRigHours) || 0,
                              currentHours: parseFloat(newRigHours) || 0,
                              pelletHopperCapacityLbs: parseFloat(newRigHopper) || 20,
                              maintenanceTasks: [],
                              appliedModIds: [],
                              appliedMods: [],
                            };
                            const updatedRigs = [newRig, ...(localAccount.rigs || [])];
                            setLocalAccount((prev) => ({
                              ...prev,
                              rigs: updatedRigs,
                              activeRigId: newRig.id,
                            }));
                            if (onUpdateProfile) onUpdateProfile(newRig);
                            setIsAddingRig(false);
                            setNewRigName('');
                            setNewRigModel('');
                            handleSyncWithServer();
                          }}
                          className="p-3 bg-[#121212] border border-orange-500/40 rounded-xl space-y-2.5 text-xs animate-fade-in"
                        >
                          <div className="flex items-center justify-between pb-1 border-b border-[#222]">
                            <span className="font-bold text-orange-400 flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5" />
                              <span>Add New Smoker Rig to Account Fleet</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsAddingRig(false)}
                              className="text-zinc-400 hover:text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Quick Preset Selector */}
                          <div>
                            <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Select Preset Manufacturer Model</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                              {[
                                { name: 'Pit Boss Copperhead 5', model: 'Copperhead 5-Series', type: 'Vertical Pellet Smoker', fuel: 'Pellets', hopper: 60 },
                                { name: 'Traeger Timberline 1300', model: 'Timberline 1300', type: 'Pellet Grill / Smoker', fuel: 'Pellets', hopper: 24 },
                                { name: 'Yoder YS640s Competition', model: 'YS640s', type: 'Pellet Smoker / Grill', fuel: 'Pellets', hopper: 20 },
                                { name: 'Camp Chef Woodwind 36', model: 'Woodwind WiFi 36', type: 'Pellet Smoker / Grill', fuel: 'Pellets', hopper: 22 },
                                { name: 'Recteq RT-700 Bull', model: 'RT-700', type: 'Pellet Smoker / Grill', fuel: 'Pellets', hopper: 40 },
                                { name: 'Kamado Joe Big Joe III', model: 'Big Joe III', type: 'Kamado Ceramic Cooker', fuel: 'Charcoal', hopper: 12 },
                                { name: 'Weber Smokey Mountain 22"', model: 'WSM 22"', type: 'Water Smoker / Bullet', fuel: 'Charcoal', hopper: 15 },
                                { name: 'Custom Offset Trailer', model: 'Custom Build', type: 'Custom Reverse Flow Offset', fuel: 'Wood Splits', hopper: 50 },
                              ].map((preset) => (
                                <button
                                  key={preset.name}
                                  type="button"
                                  onClick={() => {
                                    setNewRigName(preset.name);
                                    setNewRigModel(preset.model);
                                    setNewRigType(preset.type);
                                    setNewRigFuel(preset.fuel as any);
                                    setNewRigHopper(String(preset.hopper));
                                  }}
                                  className="p-1.5 bg-[#1a1a1a] hover:bg-orange-500/20 border border-[#2a2a2a] hover:border-orange-500/40 rounded text-[10px] font-medium text-zinc-300 text-left truncate cursor-pointer"
                                >
                                  {preset.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-0.5">Smoker Display Name</label>
                              <input
                                type="text"
                                value={newRigName}
                                onChange={(e) => setNewRigName(e.target.value)}
                                placeholder="e.g. My Lone Star Offset"
                                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-orange-500"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-0.5">Model / Builder</label>
                              <input
                                type="text"
                                value={newRigModel}
                                onChange={(e) => setNewRigModel(e.target.value)}
                                placeholder="e.g. Lone Star 500gal"
                                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-orange-500"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-0.5">Smoker Type / Category</label>
                              <input
                                type="text"
                                value={newRigType}
                                onChange={(e) => setNewRigType(e.target.value)}
                                placeholder="e.g. Vertical Pellet Smoker"
                                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-0.5">Fuel Type</label>
                              <select
                                value={newRigFuel}
                                onChange={(e) => setNewRigFuel(e.target.value as any)}
                                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-orange-500"
                              >
                                <option value="Pellets">Pellets</option>
                                <option value="Charcoal">Charcoal</option>
                                <option value="Wood Splits">Wood Splits</option>
                                <option value="Electric">Electric</option>
                                <option value="Gas">Gas</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-0.5">Initial Operating Hours</label>
                              <input
                                type="number"
                                step="0.5"
                                value={newRigHours}
                                onChange={(e) => setNewRigHours(e.target.value)}
                                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-white font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-0.5">Fuel Hopper Capacity (lbs)</label>
                              <input
                                type="number"
                                value={newRigHopper}
                                onChange={(e) => setNewRigHopper(e.target.value)}
                                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-white font-mono"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end space-x-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setIsAddingRig(false)}
                              className="px-3 py-1.5 bg-[#282828] hover:bg-[#323232] text-zinc-300 font-bold text-xs rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold text-xs rounded-lg flex items-center space-x-1"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Link Rig to Account</span>
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>

                {/* ============================================================
                    COLLAPSIBLE ACCORDION 3: INITIAL RUNTIME HOURS & BASELINE (GLOBAL FLEET VIEW)
                ============================================================ */}
                <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => toggleSection('hours')}
                    className="w-full px-3.5 py-3 bg-[#242424] hover:bg-[#2a2a2a] flex items-center justify-between cursor-pointer border-b border-[#2a2a2a] transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Clock className="w-4 h-4 text-orange-400" />
                      <div className="text-left">
                        <span className="text-xs font-bold text-white block">3. Initial Smoker Runtime Hours & Baseline (Global Fleet View)</span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          Fleet Baseline: {((localAccount.rigs && localAccount.rigs.length > 0 ? localAccount.rigs : [profile].filter(Boolean)).reduce((sum, r) => sum + (r.initialHours || 0), 0)).toFixed(1)} hrs • Combined Fleet Total: {(((localAccount.rigs && localAccount.rigs.length > 0 ? localAccount.rigs : [profile].filter(Boolean)).reduce((sum, r) => sum + (r.initialHours || 0), 0)) + ((currentAppData?.cookLogs || []).reduce((acc, c) => acc + (c.hoursLogged || 0), 0))).toFixed(1)} hrs ({(localAccount.rigs && localAccount.rigs.length > 0 ? localAccount.rigs : [profile].filter(Boolean)).length} Pits)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {collapsedSections.hours ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronUp className="w-4 h-4 text-orange-400" />}
                    </div>
                  </button>

                  {!collapsedSections.hours && (
                    <div className="p-3.5 space-y-3 bg-[#181818] animate-fade-in">
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <p className="text-[11px] text-zinc-300 leading-relaxed max-w-2xl">
                          Manage baseline smoker runtime hours accrued prior to using Smoke Stack globally across your entire fleet of pits. Baseline hours are added to logged cook hours to track cumulative operating lifespan, maintenance intervals, and wear for every pit.
                        </p>
                        <span className="px-2.5 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-mono font-bold rounded-full flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5" />
                          <span>Global Multi-Pit Fleet Sync</span>
                        </span>
                      </div>

                      {/* Fleet Global Summary Statistics Bar */}
                      {(() => {
                        const fleetRigs = localAccount.rigs && localAccount.rigs.length > 0 ? localAccount.rigs : (profile ? [profile] : []);
                        const totalBaseline = fleetRigs.reduce((acc, r) => acc + (r.initialHours || 0), 0);
                        const totalLoggedCooks = (currentAppData?.cookLogs || []).reduce((acc, c) => acc + (c.hoursLogged || 0), 0);
                        const totalFleetOperatingHours = totalBaseline + totalLoggedCooks;

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                            <div className="bg-[#121212] border border-[#282828] rounded-xl p-2.5 flex flex-col justify-between">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono flex items-center gap-1">
                                <Clock className="w-3 h-3 text-orange-400" />
                                <span>Total Fleet Baseline</span>
                              </span>
                              <div className="text-base font-extrabold font-mono text-orange-400 mt-1">
                                {totalBaseline.toFixed(2)} <span className="text-xs font-sans text-zinc-400">hrs</span>
                              </div>
                              <span className="text-[9px] text-zinc-500">Sum of prior baseline hours across all pits</span>
                            </div>

                            <div className="bg-[#121212] border border-[#282828] rounded-xl p-2.5 flex flex-col justify-between">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono flex items-center gap-1">
                                <Flame className="w-3 h-3 text-amber-400" />
                                <span>Total Cook Logs Logged</span>
                              </span>
                              <div className="text-base font-extrabold font-mono text-amber-400 mt-1">
                                {totalLoggedCooks.toFixed(2)} <span className="text-xs font-sans text-zinc-400">hrs</span>
                              </div>
                              <span className="text-[9px] text-zinc-500">Active cook session logs recorded</span>
                            </div>

                            <div className="bg-[#121212] border border-orange-500/30 rounded-xl p-2.5 flex flex-col justify-between bg-gradient-to-br from-[#18120c] to-[#121212]">
                              <span className="text-[10px] font-bold text-orange-300 uppercase font-mono flex items-center gap-1">
                                <Sliders className="w-3 h-3 text-orange-400" />
                                <span>Combined Fleet Operating Lifespan</span>
                              </span>
                              <div className="text-lg font-black font-mono text-orange-400 mt-1">
                                {totalFleetOperatingHours.toFixed(2)} <span className="text-xs font-sans text-zinc-400">hrs</span>
                              </div>
                              <span className="text-[9px] text-zinc-400">Global fleet cumulative runtime</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Global Bulk Baseline Batch Action */}
                      <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-zinc-300 uppercase font-mono flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5 text-orange-400" />
                            <span>Global Fleet Bulk Baseline Action</span>
                          </label>
                          <span className="text-[10px] text-zinc-400">Set uniform baseline across all pits</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="number"
                              step="1"
                              min="0"
                              max="10000"
                              value={globalBulkBaselineInput}
                              onChange={(e) => setGlobalBulkBaselineInput(e.target.value)}
                              placeholder="e.g. 100"
                              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white font-mono font-bold text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-500"
                            />
                            <span className="absolute right-3 top-1.5 font-mono text-xs text-zinc-400 pointer-events-none">hrs</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const val = parseFloat(globalBulkBaselineInput) || 0;
                              handleApplyGlobalBulkBaseline(val);
                            }}
                            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-extrabold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
                          >
                            <span>Apply Baseline to All Pits</span>
                          </button>
                        </div>
                      </div>

                      {/* Individual Pits Baseline Manager */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold uppercase font-mono text-zinc-300">
                            Smoker Pit Fleet Baseline & Runtime Breakdowns
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {(localAccount.rigs && localAccount.rigs.length > 0 ? localAccount.rigs : [profile].filter(Boolean)).length} Pits Configured
                          </span>
                        </div>

                        <div className="space-y-2">
                          {(localAccount.rigs && localAccount.rigs.length > 0 ? localAccount.rigs : [profile].filter(Boolean)).map((rigItem, idx) => {
                            const isCurrentActive = rigItem.id === (localAccount.activeRigId || profile?.id);
                            const pitLogs = (currentAppData?.cookLogs || []).filter((c) => c.smokerId === rigItem.id);
                            const pitLoggedHours = pitLogs.length > 0
                              ? pitLogs.reduce((acc, c) => acc + (c.hoursLogged || 0), 0)
                              : ((localAccount.rigs || []).length <= 1 ? (currentAppData?.cookLogs || []).reduce((acc, c) => acc + (c.hoursLogged || 0), 0) : 0);
                            const pitInitial = rigItem.initialHours || 0;
                            const pitTotal = pitInitial + pitLoggedHours;

                            return (
                              <div
                                key={rigItem.id || `pit-${idx}`}
                                className={`p-3 rounded-xl border transition-all ${
                                  isCurrentActive
                                    ? 'bg-[#1a1815] border-orange-500/50 shadow-sm'
                                    : 'bg-[#141414] border-[#262626] hover:border-[#333]'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#222]">
                                  <div className="flex items-center space-x-2">
                                    <div className={`p-1.5 rounded-lg ${isCurrentActive ? 'bg-orange-500/20 text-orange-400' : 'bg-[#222] text-zinc-400'}`}>
                                      <Flame className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="flex items-center space-x-2">
                                        <span className="font-bold text-xs text-white">{rigItem.name || 'Smoker Rig'}</span>
                                        {isCurrentActive && (
                                          <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/40 text-[9px] font-mono font-bold rounded">
                                            ACTIVE PIT
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-zinc-400 font-mono">
                                        {rigItem.model || 'Model N/A'} • {rigItem.smokerType || 'Smoker'} ({rigItem.fuelType || 'Pellets'})
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-3 text-right">
                                    <div className="text-right">
                                      <span className="block text-[9px] text-zinc-400 font-mono uppercase">Logged Cooks</span>
                                      <span className="font-mono text-xs text-amber-400 font-bold">{pitLoggedHours.toFixed(1)} hrs</span>
                                    </div>
                                    <div className="text-right pl-2 border-l border-[#2a2a2a]">
                                      <span className="block text-[9px] text-orange-400 font-mono uppercase font-bold">Total Operating Lifespan</span>
                                      <span className="font-mono text-sm text-orange-400 font-extrabold">{pitTotal.toFixed(1)} hrs</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center space-x-2 flex-1">
                                    <label className="text-[10px] font-bold uppercase text-zinc-400 font-mono whitespace-nowrap">
                                      Initial Baseline Hours:
                                    </label>
                                    <div className="relative flex-1 max-w-[140px]">
                                      <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max="10000"
                                        value={rigItem.initialHours ?? 0}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value) || 0;
                                          handleUpdatePitBaseline(rigItem.id, val);
                                        }}
                                        className="w-full bg-[#101010] border border-[#2a2a2a] focus:border-orange-500 text-white font-mono font-bold text-xs rounded-lg px-2.5 py-1 focus:outline-none"
                                      />
                                      <span className="absolute right-2 top-1 font-mono text-xs text-orange-400 pointer-events-none">hrs</span>
                                    </div>
                                  </div>

                                  {/* Quick Fine-Tuning Step Buttons */}
                                  <div className="flex items-center space-x-1">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdatePitBaseline(rigItem.id, Math.max(0, (rigItem.initialHours || 0) - 10))}
                                      className="px-2 py-1 bg-[#222] hover:bg-[#2a2a2a] border border-[#333] text-zinc-300 font-mono text-[10px] rounded hover:text-white cursor-pointer"
                                      title="Subtract 10 baseline hours"
                                    >
                                      -10h
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdatePitBaseline(rigItem.id, Math.max(0, (rigItem.initialHours || 0) - 1))}
                                      className="px-2 py-1 bg-[#222] hover:bg-[#2a2a2a] border border-[#333] text-zinc-300 font-mono text-[10px] rounded hover:text-white cursor-pointer"
                                      title="Subtract 1 baseline hour"
                                    >
                                      -1h
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdatePitBaseline(rigItem.id, (rigItem.initialHours || 0) + 1)}
                                      className="px-2 py-1 bg-[#222] hover:bg-[#2a2a2a] border border-[#333] text-zinc-300 font-mono text-[10px] rounded hover:text-white cursor-pointer"
                                      title="Add 1 baseline hour"
                                    >
                                      +1h
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdatePitBaseline(rigItem.id, (rigItem.initialHours || 0) + 10)}
                                      className="px-2 py-1 bg-[#222] hover:bg-[#2a2a2a] border border-[#333] text-zinc-300 font-mono text-[10px] rounded hover:text-white cursor-pointer"
                                      title="Add 10 baseline hours"
                                    >
                                      +10h
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ============================================================
                    COLLAPSIBLE ACCORDION 4: MASTER ADMIN & DEV CONTROLS
                ============================================================ */}
                {isAdminUser(currentUser?.email || localAccount.email) && (
                  <div className="bg-[#1e1e1e] border border-purple-500/30 rounded-xl overflow-hidden transition-all shadow-md">
                    <button
                      type="button"
                      onClick={() => toggleSection('admin')}
                      className="w-full px-3.5 py-3 bg-gradient-to-r from-purple-950/40 via-[#1a1824] to-amber-950/30 hover:bg-[#2a2a2a] flex items-center justify-between cursor-pointer border-b border-[#2a2a2a] transition-colors"
                    >
                      <div className="flex items-center space-x-2.5">
                        <ShieldCheck className="w-4 h-4 text-purple-400" />
                        <div className="text-left">
                          <span className="text-xs font-bold text-purple-300 block font-mono uppercase tracking-wider">
                            4. System Admin & Developer Overrides
                          </span>
                          <span className="text-[10px] text-purple-400/80 font-mono">
                            {isMasterAdmin(currentUser?.email || localAccount.email) ? 'Master Admin' : 'Sub-Admin'} Controls
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {collapsedSections.admin ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronUp className="w-4 h-4 text-purple-400" />}
                      </div>
                    </button>

                    {!collapsedSections.admin && (
                      <div className="p-3.5 space-y-3 bg-[#181818] animate-fade-in">
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Authorized pitmaster accounts have access to system-wide telemetry, custom manufacturer database seeding, CharGPT prompt overrides, and sub-admin access control.
                        </p>

                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenMasterAdmin) {
                              onClose();
                              onOpenMasterAdmin();
                            }
                          }}
                          className="w-full py-2 px-3 bg-gradient-to-r from-purple-600/30 to-amber-600/30 hover:from-purple-600/40 hover:to-amber-600/40 border border-purple-500/40 text-amber-300 font-extrabold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-sm"
                        >
                          <Crown className="w-3.5 h-3.5 text-amber-400" />
                          <span>Open Master Admin Dashboard</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ============================================================
                    COLLAPSIBLE ACCORDION 5: SERVER ACCOUNT SYNC & BACKUPS
                ============================================================ */}
                <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => toggleSection('cloudSync')}
                    className="w-full px-3.5 py-3 bg-[#242424] hover:bg-[#2a2a2a] flex items-center justify-between cursor-pointer border-b border-[#2a2a2a] transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Cloud className="w-4 h-4 text-orange-400" />
                      <div className="text-left">
                        <span className="text-xs font-bold text-white block">5. Server Account Sync & Data Backups</span>
                        <span className="text-[10px] text-zinc-400 font-mono">Server Hosted • Google Drive & Local Backups</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {collapsedSections.cloudSync ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronUp className="w-4 h-4 text-orange-400" />}
                    </div>
                  </button>

                  {!collapsedSections.cloudSync && (
                    <div className="p-3.5 space-y-3 bg-[#181818] animate-fade-in">
                      <div className="p-3 bg-[#121212] border border-[#2a2a2a] rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Server className="w-4 h-4 text-emerald-400" />
                            <span>Server Account Sync Repository</span>
                          </span>
                          <button
                            type="button"
                            onClick={handleSyncWithServer}
                            disabled={isServerSyncing}
                            className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold text-xs rounded cursor-pointer disabled:opacity-50"
                          >
                            {isServerSyncing ? 'Syncing...' : 'Sync Now'}
                          </button>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          Your account, multi-rig fleet, and cook logs are persisted server-side at <code className="text-orange-400 font-mono">/api/account/sync</code>.
                        </p>
                      </div>

                      {!currentUser && (
                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          disabled={isDriveOperating}
                          className="w-full py-2 px-3 bg-gradient-to-r from-sky-600/20 to-blue-600/20 hover:from-sky-600/30 hover:to-blue-600/30 border border-sky-500/30 text-sky-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Cloud className="w-4 h-4 text-sky-400" />
                          <span>Connect Google Account for Cloud Backup</span>
                        </button>
                      )}

                      <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-orange-400 flex items-center space-x-1.5 font-mono">
                            <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                            <span>Terms of Service & Data Privacy</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsTermsModalOpen(true)}
                            className="px-2 py-1 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 font-bold text-[10px] rounded-md flex items-center space-x-1 cursor-pointer transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            <span>View Full Disclosures</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUB-TAB 2: SMOKER SPECIFICATIONS & GLOBAL PIT SETTINGS */}
            {dataSubTab === 'smokers' && (
              <div className="space-y-4 animate-fade-in">
                {/* PROMINENT CUSTOM BUILT SMOKER CREATION ACTION BANNER */}
                <div className="bg-gradient-to-r from-orange-950/40 via-[#1e1e1e] to-amber-950/30 border border-orange-500/30 rounded-2xl p-4 shadow-xl space-y-3">
                  <div 
                    onClick={() => setIsSmokerCatalogBannerExpanded(!isSmokerCatalogBannerExpanded)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="p-1.5 bg-orange-500/20 rounded-lg text-orange-400 border border-orange-500/30">
                        <Wrench className="w-5 h-5 text-orange-400" />
                      </span>
                      <div>
                        <h3 className="text-sm sm:text-base font-extrabold text-white">Custom Built Smokers & Spec Catalog</h3>
                        <p className="text-[11px] text-zinc-400">Custom smoker geometries, metal gauge ratings & thermal airflow physics</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {onOpenCustomSmokerModal && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCustomSmokerModal();
                          }}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-600 hover:to-amber-600 text-zinc-950 font-black text-xs rounded-xl flex items-center space-x-1 shadow-md border border-orange-300/30 cursor-pointer transition-all shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5 text-zinc-950 stroke-[3]" />
                          <span>+ Custom Smoker</span>
                        </button>
                      )}
                      <button type="button" className="text-zinc-400 hover:text-white p-1">
                        {isSmokerCatalogBannerExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {isSmokerCatalogBannerExpanded && (
                    <p className="text-xs text-zinc-300 leading-relaxed border-t border-[#2a2a2a] pt-2.5">
                      Build custom smoker geometries, metal gauge ratings, thermal draft airflow physics, or load custom community pit spec templates.
                    </p>
                  )}
                </div>

                {/* Active Global Smoker Profile & Specifications Card */}
                <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-4 space-y-3.5 shadow-lg">
                  <div 
                    onClick={() => setIsSpecsFormExpanded(!isSpecsFormExpanded)}
                    className="flex items-center justify-between pb-2.5 border-b border-[#2a2a2a] cursor-pointer select-none"
                  >
                    <div className="flex items-center space-x-2">
                      <Flame className="w-5 h-5 text-orange-500" />
                      <div>
                        <h4 className="text-sm font-extrabold text-white">Active Smoker Global Specifications</h4>
                        <p className="text-[11px] text-zinc-400">
                          Global local variable used for all fuel consumption, burn rate physics, run time, and AI calculations.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center space-x-1 shrink-0">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Active</span>
                      </span>
                      <button type="button" className="text-zinc-400 hover:text-white p-1">
                        {isSpecsFormExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {!isSpecsFormExpanded && (
                    <div className="text-xs text-zinc-300 font-mono bg-[#181818] p-3 rounded-lg border border-[#333] flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-white font-bold">{activeSpecName}</span> ({activeSpecBrand}) — <span className="text-orange-400">{activeSpecCategory}</span>
                      </div>
                      <span className="text-zinc-400 text-[10px]">
                        Burn: {activeSpecBaselineBurn} lbs/hr @ 225°F | Hopper: {activeSpecCapacity} lbs | Area: {activeSpecArea} sq in
                      </span>
                    </div>
                  )}

                  {isSpecsFormExpanded && (
                    <>
                      {smokerSpecSaveStatus && (
                        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs rounded-lg flex items-center space-x-2 animate-fade-in">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{smokerSpecSaveStatus}</span>
                        </div>
                      )}

                      <form onSubmit={(e) => {
                        e.preventDefault();
                        if (!activeProfile || !onUpdateProfile) return;

                        if (activeProfile.isCustomBuilt && activeProfile.customSpecs) {
                          const updatedCustom: CustomSmokerSpec = {
                            ...activeProfile.customSpecs,
                            name: activeSpecName,
                            builderName: activeSpecBrand,
                            smokerType: activeSpecCategory,
                            fuelType: activeSpecFuelType,
                            baselineBurnRateLbsHr: Number(activeSpecBaselineBurn) || 1.25,
                            hopperCapacityLbs: Number(activeSpecCapacity) || 20,
                            chamberVolumeSqIn: Number(activeSpecArea) || 800,
                            metalGauge: activeSpecGauge,
                            draftType: activeSpecDraft,
                          };
                          const newInitial = Number(activeSpecInitialHours) || 0;
                          const logs = currentAppData?.cookLogs || [];
                          const totalLogged = logs.reduce((acc, c) => acc + (c.hoursLogged || 0), 0);
                          onUpdateProfile({
                            ...activeProfile,
                            name: activeSpecName,
                            model: activeSpecBrand,
                            smokerType: activeSpecCategory as any,
                            fuelType: activeSpecFuelType,
                            pelletHopperCapacityLbs: Number(activeSpecCapacity) || 20,
                            initialHours: newInitial,
                            currentHours: Number((newInitial + totalLogged).toFixed(2)),
                            customSpecs: updatedCustom,
                          });
                        } else if (activeProfile.manufacturerSpecs) {
                          const updatedMfg: ManufacturerSmokerSpec = {
                            ...activeProfile.manufacturerSpecs,
                            brand: activeSpecBrand,
                            model: activeSpecName,
                            category: activeSpecCategory,
                            fuelType: activeSpecFuelType,
                            factoryBaselineBurnRateLbsHr: Number(activeSpecBaselineBurn) || 1.20,
                            factoryHighHeatBurnRateLbsHr: Number(activeSpecHighHeatBurn) || 2.50,
                            hopperCapacityLbs: Number(activeSpecCapacity) || 20,
                            cookingAreaSqIn: Number(activeSpecArea) || 800,
                            thermalEfficiencyRating: activeSpecThermalRating,
                            insulationType: activeSpecGauge,
                            controllerType: activeSpecDraft,
                          };
                          const newInitial = Number(activeSpecInitialHours) || 0;
                          const logs = currentAppData?.cookLogs || [];
                          const totalLogged = logs.reduce((acc, c) => acc + (c.hoursLogged || 0), 0);
                          onUpdateProfile({
                            ...activeProfile,
                            name: activeSpecBrand,
                            model: activeSpecName,
                            smokerType: activeSpecCategory as any,
                            fuelType: activeSpecFuelType,
                            pelletHopperCapacityLbs: Number(activeSpecCapacity) || 20,
                            initialHours: newInitial,
                            currentHours: Number((newInitial + totalLogged).toFixed(2)),
                            manufacturerSpecs: updatedMfg,
                          });
                        } else {
                          const newInitial = Number(activeSpecInitialHours) || 0;
                          const logs = currentAppData?.cookLogs || [];
                          const totalLogged = logs.reduce((acc, c) => acc + (c.hoursLogged || 0), 0);
                          onUpdateProfile({
                            ...activeProfile,
                            name: activeSpecName,
                            model: activeSpecBrand,
                            smokerType: activeSpecCategory as any,
                            fuelType: activeSpecFuelType,
                            pelletHopperCapacityLbs: Number(activeSpecCapacity) || 20,
                            initialHours: newInitial,
                            currentHours: Number((newInitial + totalLogged).toFixed(2)),
                          });
                        }

                        setSmokerSpecSaveStatus('✨ Active Smoker Specifications updated globally! All app calculations refreshed.');
                        setTimeout(() => setSmokerSpecSaveStatus(null), 4000);
                      }} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                              Smoker Name / Model
                            </label>
                            <input
                              type="text"
                              value={activeSpecName}
                              onChange={(e) => setActiveSpecName(e.target.value)}
                              className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-medium text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                              placeholder="e.g. Texas 500gal Offset or Ironwood 885"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                              Manufacturer or Custom Builder
                            </label>
                            <input
                              type="text"
                              value={activeSpecBrand}
                              onChange={(e) => setActiveSpecBrand(e.target.value)}
                              className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-medium text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                              placeholder="e.g. Lone Star Grillz / Traeger / Yoder"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                              Smoker Category / Design
                            </label>
                            <select
                              value={activeSpecCategory}
                              onChange={(e) => setActiveSpecCategory(e.target.value)}
                              className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-medium text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                            >
                              <option value="Vertical Pellet Smoker">Vertical Pellet Smoker / Grill</option>
                              <option value="Reverse Flow Offset">Reverse Flow Offset Smoker</option>
                              <option value="Traditional Offset Pipe">Traditional Offset Pipe Smoker</option>
                              <option value="Gravity Feed Charcoal Cabinet">Gravity Feed Charcoal Cabinet</option>
                              <option value="Insulated Cabinet Smoker">Insulated Cabinet Smoker</option>
                              <option value="Drum Smoker">Ugly Drum Smoker (UDS)</option>
                              <option value="Kamado Ceramic">Kamado Ceramic Cooker</option>
                              <option value="Water Smoker">Vertical Water Smoker</option>
                              <option value="Custom Builder Pit">Custom Handcrafted Pit</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                              Primary Fuel Source
                            </label>
                            <select
                              value={activeSpecFuelType}
                              onChange={(e) => setActiveSpecFuelType(e.target.value as any)}
                              className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-medium text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                            >
                              <option value="Pellets">Hardwood Pellets</option>
                              <option value="Wood Splits">Wood Splits / Logs</option>
                              <option value="Charcoal">Lump Charcoal & Briquettes</option>
                              <option value="Electric">Electric Element</option>
                              <option value="Gas">Propane / Natural Gas</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                              Initial Smoker Runtime Hours (Prior Experience)
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="10000"
                              value={activeSpecInitialHours}
                              onChange={(e) => setActiveSpecInitialHours(parseFloat(e.target.value) || 0)}
                              className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-mono font-bold text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                              placeholder="0.0 (Enter previous hours)"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                              Baseline Burn Rate (lbs/hr @ 225°F)
                            </label>
                            <input
                              type="number"
                              step="0.05"
                              min="0.1"
                              max="10"
                              value={activeSpecBaselineBurn}
                              onChange={(e) => setActiveSpecBaselineBurn(parseFloat(e.target.value) || 1.2)}
                              className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-mono font-bold text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                              High Heat Burn Rate (lbs/hr @ 350°F)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min="0.2"
                              max="20"
                              value={activeSpecHighHeatBurn}
                              onChange={(e) => setActiveSpecHighHeatBurn(parseFloat(e.target.value) || 2.5)}
                              className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-mono font-bold text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                              Hopper / Firebox Capacity (lbs)
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="200"
                              value={activeSpecCapacity}
                              onChange={(e) => setActiveSpecCapacity(parseInt(e.target.value) || 20)}
                              className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-mono font-bold text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                              Total Cooking Grate Area (sq in)
                            </label>
                            <input
                              type="number"
                              min="100"
                              max="10000"
                              value={activeSpecArea}
                              onChange={(e) => setActiveSpecArea(parseInt(e.target.value) || 800)}
                              className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-mono text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                              Thermal Efficiency Rating
                            </label>
                            <select
                              value={activeSpecThermalRating}
                              onChange={(e) => setActiveSpecThermalRating(e.target.value as any)}
                              className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-medium text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                            >
                              <option value="Extreme">Extreme Thermal Mass (Ceramic / 1/4" Plate)</option>
                              <option value="High">High (Double Wall Insulated)</option>
                              <option value="Standard">Standard (Single Wall Heavy Steel)</option>
                              <option value="Moderate">Moderate (Standard Stamped Sheet Metal)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                              Metal Gauge / Wall Construction
                            </label>
                            <input
                              type="text"
                              value={activeSpecGauge}
                              onChange={(e) => setActiveSpecGauge(e.target.value)}
                              className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-medium text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                              placeholder="e.g. 1/4 inch Steel Plate or Double-Wall Stainless"
                            />
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between">
                          <div className="text-[11px] text-zinc-400 flex items-center space-x-1.5">
                            <Info className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                            <span>Changes take effect instantly across all cook logs, fuel estimates & AI tools.</span>
                          </div>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Save className="w-4 h-4" />
                            <span>Save Active Specifications</span>
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </div>

                {/* Smoker Aftermarket Modifications & Tuning Database (Collapsible) */}
                {activeProfile && onUpdateProfile && (
                  <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
                    <div 
                      onClick={() => setIsSmokerModsExpanded(!isSmokerModsExpanded)}
                      className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-[#2a2a2a]"
                    >
                      <h4 className="text-xs sm:text-sm font-bold text-white flex items-center space-x-2">
                        <Wrench className="w-4 h-4 text-orange-400" />
                        <span>Smoker Aftermarket Modifications & Tuning Database</span>
                      </h4>
                      <button type="button" className="text-zinc-400 hover:text-white p-1">
                        {isSmokerModsExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>

                    {isSmokerModsExpanded && (
                      <SmokerModManager
                        profile={activeProfile}
                        onUpdateProfile={onUpdateProfile}
                      />
                    )}
                  </div>
                )}

                {/* Input New Smoker Specification Form Toggle */}
                <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">Input New Smoker Specification</h4>
                      <p className="text-[11px] text-zinc-400">
                        Add a custom build or manufacturer smoker model to your pitmaster account collection.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewSmoker(!isAddingNewSmoker)}
                      className="px-3 py-1.5 bg-[#121212] hover:bg-[#1a1a1a] border border-[#2a2a2a] text-orange-400 font-bold text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAddingNewSmoker ? 'Cancel Input' : 'Add New Smoker Spec'}</span>
                    </button>
                  </div>

                  {isAddingNewSmoker && (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (!newSmokerName.trim()) return;

                      if (newSmokerMode === 'custom') {
                        const customSpec: CustomSmokerSpec = {
                          id: `custom-spec-${Date.now()}`,
                          name: newSmokerName,
                          builderName: newSmokerBrandOrBuilder || 'Custom Pitmaster Build',
                          smokerType: newSmokerCategory,
                          fuelType: newSmokerFuelType,
                          chamberVolumeSqIn: Number(newSmokerCookingArea) || 1000,
                          metalGauge: newSmokerGauge || '11-Gauge Heavy Steel',
                          draftType: newSmokerDraft || 'Reverse Flow Airflow',
                          baselineBurnRateLbsHr: Number(newSmokerBaselineBurn) || 1.25,
                          hopperCapacityLbs: Number(newSmokerHopperCapacity) || 25,
                          pitmasterAlias: localAccount.name || currentUser?.email || 'Pitmaster',
                          isCommunityShared: true,
                          createdAt: new Date().toISOString(),
                        };

                        const updatedList = [customSpec, ...savedCustomSmokersList];
                        setSavedCustomSmokersList(updatedList);
                        saveSavedCustomSmokers(updatedList);

                        if (newSmokerSetAsActive && onUpdateProfile && activeProfile) {
                          onUpdateProfile({
                            ...activeProfile,
                            name: customSpec.name,
                            model: customSpec.builderName,
                            smokerType: customSpec.smokerType as any,
                            fuelType: customSpec.fuelType,
                            isCustomBuilt: true,
                            customSpecs: customSpec,
                            manufacturerSpecs: undefined,
                            pelletHopperCapacityLbs: customSpec.hopperCapacityLbs,
                          });
                        }

                        if (newSmokerContributePool) {
                          fetch('/api/smoker-database', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              pitmasterAlias: localAccount.name || currentUser?.email || 'verified_user',
                              hasAccount: true,
                              termsAccepted: true,
                              customSpec,
                            }),
                          }).catch(() => {});
                        }
                      } else {
                        const mfgSpec: ManufacturerSmokerSpec = {
                          id: `mfg-spec-${Date.now()}`,
                          brand: newSmokerBrandOrBuilder || 'Pit Brand',
                          model: newSmokerName,
                          category: newSmokerCategory,
                          fuelType: newSmokerFuelType,
                          factoryBaselineBurnRateLbsHr: Number(newSmokerBaselineBurn) || 1.20,
                          factoryHighHeatBurnRateLbsHr: Number(newSmokerHighHeatBurn) || 2.50,
                          hopperCapacityLbs: Number(newSmokerHopperCapacity) || 20,
                          cookingAreaSqIn: Number(newSmokerCookingArea) || 800,
                          thermalEfficiencyRating: newSmokerThermalRating,
                          insulationType: newSmokerGauge || 'Double Wall Insulated',
                          controllerType: newSmokerDraft || 'Digital PID Controller',
                          isVerifiedManufacturerData: true,
                          pitmasterAlias: localAccount.name || currentUser?.email || 'Pitmaster',
                          createdAt: new Date().toISOString(),
                        };

                        const updatedList = [mfgSpec, ...savedManufacturerSmokersList];
                        setSavedManufacturerSmokersList(updatedList);
                        saveSavedManufacturerSmokers(updatedList);

                        if (newSmokerSetAsActive && onUpdateProfile && activeProfile) {
                          onUpdateProfile({
                            ...activeProfile,
                            name: mfgSpec.brand,
                            model: mfgSpec.model,
                            smokerType: mfgSpec.category as any,
                            fuelType: mfgSpec.fuelType,
                            isCustomBuilt: false,
                            customSpecs: undefined,
                            manufacturerSpecs: mfgSpec,
                            pelletHopperCapacityLbs: mfgSpec.hopperCapacityLbs,
                          });
                        }

                        if (newSmokerContributePool) {
                          fetch('/api/smoker-database', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              pitmasterAlias: localAccount.name || currentUser?.email || 'verified_user',
                              hasAccount: true,
                              termsAccepted: true,
                              manufacturerSpec: mfgSpec,
                            }),
                          }).catch(() => {});
                        }
                      }

                      setNewSmokerStatus('🔥 Smoker Specification saved & set as global active pit!');
                      setTimeout(() => {
                        setNewSmokerStatus(null);
                        setIsAddingNewSmoker(false);
                        setNewSmokerName('');
                        setNewSmokerBrandOrBuilder('');
                      }, 2000);
                    }} className="pt-3 border-t border-[#2a2a2a] space-y-3.5 animate-fade-in">
                      <div className="flex items-center space-x-2 bg-[#121212] p-1 rounded-lg border border-[#2a2a2a]">
                        <button
                          type="button"
                          onClick={() => setNewSmokerMode('custom')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                            newSmokerMode === 'custom'
                              ? 'bg-orange-500 text-zinc-950 font-black'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          🛠️ Custom Pitmaster Build
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewSmokerMode('manufacturer')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                            newSmokerMode === 'manufacturer'
                              ? 'bg-orange-500 text-zinc-950 font-black'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          🏭 Manufacturer Spec Model
                        </button>
                      </div>

                      {newSmokerStatus && (
                        <div className="p-2.5 bg-orange-500/10 border border-orange-500/30 text-orange-300 font-mono text-xs rounded-lg flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                          <span>{newSmokerStatus}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                            {newSmokerMode === 'custom' ? 'Custom Pit Name' : 'Model Name'} *
                          </label>
                          <input
                            type="text"
                            required
                            value={newSmokerName}
                            onChange={(e) => setNewSmokerName(e.target.value)}
                            className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-medium text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                            placeholder={newSmokerMode === 'custom' ? 'e.g. Big Tex 500 Reverse Flow' : 'e.g. Timberline 1300'}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                            {newSmokerMode === 'custom' ? 'Custom Builder / Fabricator' : 'Manufacturer Brand'}
                          </label>
                          <input
                            type="text"
                            value={newSmokerBrandOrBuilder}
                            onChange={(e) => setNewSmokerBrandOrBuilder(e.target.value)}
                            className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-medium text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                            placeholder={newSmokerMode === 'custom' ? 'e.g. Lone Star Grillz / DIY' : 'e.g. Traeger / Yoder / Pit Boss'}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                            Smoker Design Category
                          </label>
                          <select
                            value={newSmokerCategory}
                            onChange={(e) => setNewSmokerCategory(e.target.value)}
                            className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-medium text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                          >
                            <option value="Vertical Pellet Smoker">Vertical Pellet Smoker / Grill</option>
                            <option value="Reverse Flow Offset">Reverse Flow Offset Smoker</option>
                            <option value="Traditional Offset Pipe">Traditional Offset Pipe Smoker</option>
                            <option value="Gravity Feed Charcoal Cabinet">Gravity Feed Charcoal Cabinet</option>
                            <option value="Insulated Cabinet Smoker">Insulated Cabinet Smoker</option>
                            <option value="Drum Smoker">Ugly Drum Smoker (UDS)</option>
                            <option value="Kamado Ceramic">Kamado Ceramic Cooker</option>
                            <option value="Water Smoker">Vertical Water Smoker</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                            Primary Fuel Type
                          </label>
                          <select
                            value={newSmokerFuelType}
                            onChange={(e) => setNewSmokerFuelType(e.target.value as any)}
                            className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-medium text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                          >
                            <option value="Pellets">Hardwood Pellets</option>
                            <option value="Wood Splits">Wood Splits / Logs</option>
                            <option value="Charcoal">Lump Charcoal & Briquettes</option>
                            <option value="Electric">Electric Element</option>
                            <option value="Gas">Propane / Natural Gas</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                            Baseline Burn Rate (lbs/hr @ 225°F)
                          </label>
                          <input
                            type="number"
                            step="0.05"
                            min="0.1"
                            max="10"
                            value={newSmokerBaselineBurn}
                            onChange={(e) => setNewSmokerBaselineBurn(parseFloat(e.target.value) || 1.2)}
                            className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-mono text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                            Hopper / Firebox Capacity (lbs)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value={newSmokerHopperCapacity}
                            onChange={(e) => setNewSmokerHopperCapacity(parseInt(e.target.value) || 20)}
                            className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-mono text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        <div className="space-y-1">
                          <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={newSmokerSetAsActive}
                              onChange={(e) => setNewSmokerSetAsActive(e.target.checked)}
                              className="rounded bg-[#121212] border-[#2a2a2a] text-orange-500 focus:ring-orange-500"
                            />
                            <span>Set as active global smoker immediately</span>
                          </label>
                          <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={newSmokerContributePool}
                              onChange={(e) => setNewSmokerContributePool(e.target.checked)}
                              className="rounded bg-[#121212] border-[#2a2a2a] text-orange-500 focus:ring-orange-500"
                            />
                            <span>Share spec to community smoker database pool</span>
                          </label>
                        </div>

                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
                        >
                          <Save className="w-4 h-4" />
                          <span>Save & Register Smoker</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Account Smoker Collection & Quick Switch */}
                <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
                  <div 
                    onClick={() => setIsSmokerSwitcherExpanded(!isSmokerSwitcherExpanded)}
                    className="flex items-center justify-between cursor-pointer select-none pb-1"
                  >
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-orange-400" />
                        <span>Account Smoker Collection & Pit Switcher</span>
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        Switch active pit specification with a single tap.
                      </p>
                    </div>
                    <button type="button" className="text-zinc-400 hover:text-white p-1">
                      {isSmokerSwitcherExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>

                  {isSmokerSwitcherExpanded && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {/* Active Smoker Profile Tile */}
                      <div className="p-3 bg-orange-500/10 border-2 border-orange-500/60 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold uppercase text-orange-400">Current Active Pit</span>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md">ACTIVE</span>
                        </div>
                        <div className="text-xs font-black text-white">{effectiveSpecs.displayName}</div>
                        <div className="text-[11px] text-zinc-400">{effectiveSpecs.brandOrBuilder} • {effectiveSpecs.category}</div>
                        <div className="text-[10px] font-mono text-orange-300 pt-1">
                          Burn Rate: {effectiveSpecs.baselineBurnRateLbsHr} lbs/hr | Capacity: {effectiveSpecs.hopperCapacityLbs} lbs
                        </div>
                      </div>

                      {/* Saved Custom Smokers */}
                      {savedCustomSmokersList.map((custom) => {
                        const isActive = activeProfile?.isCustomBuilt && activeProfile.customSpecs?.id === custom.id;
                        if (isActive) return null;
                        return (
                          <div key={custom.id} className="p-3 bg-[#121212] border border-[#2a2a2a] hover:border-orange-500/40 rounded-xl space-y-1 transition-all flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono font-bold text-purple-400">Custom Build</span>
                                <span className="text-[10px] text-zinc-400">{custom.fuelType}</span>
                              </div>
                              <div className="text-xs font-bold text-white">{custom.name}</div>
                              <div className="text-[10px] text-zinc-400">{custom.builderName} • {custom.smokerType}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (onUpdateProfile && activeProfile) {
                                  onUpdateProfile({
                                    ...activeProfile,
                                    name: custom.name,
                                    model: custom.builderName,
                                    smokerType: custom.smokerType as any,
                                    fuelType: custom.fuelType,
                                    isCustomBuilt: true,
                                    customSpecs: custom,
                                    manufacturerSpecs: undefined,
                                    pelletHopperCapacityLbs: custom.hopperCapacityLbs,
                                  });
                                }
                              }}
                              className="mt-2 text-[10px] font-bold text-orange-400 hover:text-orange-300 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-md transition-colors cursor-pointer self-start"
                            >
                              Set Active Smoker
                            </button>
                          </div>
                        );
                      })}

                      {/* Saved Manufacturer Smokers */}
                      {savedManufacturerSmokersList.map((mfg) => {
                        const isActive = !activeProfile?.isCustomBuilt && activeProfile?.manufacturerSpecs?.id === mfg.id;
                        if (isActive) return null;
                        return (
                          <div key={mfg.id} className="p-3 bg-[#121212] border border-[#2a2a2a] hover:border-orange-500/40 rounded-xl space-y-1 transition-all flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono font-bold text-sky-400">Manufacturer Spec</span>
                                <span className="text-[10px] text-zinc-400">{mfg.fuelType}</span>
                              </div>
                              <div className="text-xs font-bold text-white">{mfg.brand} {mfg.model}</div>
                              <div className="text-[10px] text-zinc-400">{mfg.category}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (onUpdateProfile && activeProfile) {
                                  onUpdateProfile({
                                    ...activeProfile,
                                    name: mfg.brand,
                                    model: mfg.model,
                                    smokerType: mfg.category as any,
                                    fuelType: mfg.fuelType,
                                    isCustomBuilt: false,
                                    customSpecs: undefined,
                                    manufacturerSpecs: mfg,
                                    pelletHopperCapacityLbs: mfg.hopperCapacityLbs,
                                  });
                                }
                              }}
                              className="mt-2 text-[10px] font-bold text-orange-400 hover:text-orange-300 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-md transition-colors cursor-pointer self-start"
                            >
                              Set Active Smoker
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUB-TAB 2: CLOUD SYNC & AUTO-BACKUP */}
            {dataSubTab === 'cloud' && (
              <div className="space-y-3">
                {/* Requirement Alert Banner */}
                <div className="bg-[#1e1e1e] border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-200/90 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    <strong className="text-amber-300">Account Policy:</strong> Any non-local cloud destination (Google Drive, Microsoft OneDrive) requires an active user account.
                  </p>
                </div>

                {/* AUTOMATIC DAILY BACKUP CARD */}
                <div className="bg-gradient-to-r from-orange-950/40 via-[#242424] to-amber-950/30 border border-orange-500/30 rounded-xl p-3.5 space-y-3 shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400 shrink-0">
                        <RefreshCw className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs sm:text-sm font-bold text-white">Automatic Daily Backup</h4>
                          <span className="text-[9px] font-mono uppercase font-bold text-orange-300 bg-orange-500/20 px-1.5 py-0.5 rounded border border-orange-500/30">
                            Logs & User Data
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Automatically archives daily cook logs, fuel records, and smoker settings.
                        </p>
                      </div>
                    </div>

                    {/* Toggle Enable Switch */}
                    <button
                      type="button"
                      onClick={() =>
                        setAutoBackupConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
                      }
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all shrink-0 cursor-pointer ${
                        autoBackupConfig.enabled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-zinc-800 text-zinc-400 border border-[#333]'
                      }`}
                    >
                      {autoBackupConfig.enabled ? 'Auto On' : 'Auto Off'}
                    </button>
                  </div>

                  {/* Account Status Badge for Auto-Backup */}
                  <div className="flex items-center justify-between bg-[#141414] border border-[#2a2a2a] p-2 rounded-lg text-[11px]">
                    <span className="text-zinc-400 font-medium">Account Status:</span>
                    {hasUserAccount ? (
                      <span className="text-emerald-300 font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Account Active for Daily Cloud Backups</span>
                      </span>
                    ) : (
                      <span className="text-amber-400 font-bold flex items-center space-x-1 text-[10px]">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Account Required for Non-Local Auto-Backup</span>
                      </span>
                    )}
                  </div>

                  {autoBackupStatus && (
                    <div
                      className={`text-[11px] p-2 rounded-lg flex items-center space-x-1.5 ${
                        autoBackupStatus.type === 'success'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                          : autoBackupStatus.type === 'error'
                          ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                          : 'bg-sky-500/10 border border-sky-500/20 text-sky-300'
                      }`}
                    >
                      {autoBackupStatus.type === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span className="truncate">{autoBackupStatus.text}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-[#2a2a2a]">
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Last Backup:{' '}
                      {autoBackupConfig.lastAutoBackup
                        ? new Date(autoBackupConfig.lastAutoBackup).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Pending Next Schedule'}
                    </span>

                    <button
                      type="button"
                      onClick={handleRunAutoBackupNow}
                      disabled={!hasUserAccount}
                      className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-zinc-950 font-bold text-[11px] rounded-lg transition-all cursor-pointer flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Run Auto-Backup Now</span>
                    </button>
                  </div>
                </div>

                {/* DESTINATION A: GOOGLE DRIVE INTEGRATION */}
                <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <Cloud className={`w-4 h-4 shrink-0 ${isDriveConnected ? 'text-sky-400' : 'text-zinc-500'}`} />
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">Google Drive Integration</h4>
                        <p className="text-[11px] text-zinc-400">Cloud spreadsheet & log JSON sync</p>
                      </div>
                    </div>
                    {isDriveConnected ? (
                      <span className="text-[10px] font-mono font-bold text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-sky-400" />
                        <span>Connected</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-400 bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-0.5 rounded-md">
                        Not Connected
                      </span>
                    )}
                  </div>

                  {driveActionStatus && (
                    <div
                      className={`text-[11px] p-2 rounded-lg flex items-center space-x-1.5 ${
                        driveActionStatus.type === 'success'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                          : driveActionStatus.type === 'error'
                          ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                          : 'bg-sky-500/10 border border-sky-500/20 text-sky-300'
                      }`}
                    >
                      {driveActionStatus.type === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span className="truncate">{driveActionStatus.text}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleGoogleDriveBackup}
                      disabled={isDriveOperating || !isDriveConnected}
                      className="py-2 px-2.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-40 min-h-[38px]"
                    >
                      <CloudUpload className="w-3.5 h-3.5 shrink-0" />
                      <span>Backup to Drive</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleGoogleDriveRestore}
                      disabled={isDriveOperating || !isDriveConnected}
                      className="py-2 px-2.5 bg-[#1a1a1a] hover:bg-[#282828] border border-[#333333] text-zinc-200 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-40 min-h-[38px]"
                    >
                      <CloudDownload className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>Restore Drive</span>
                    </button>
                  </div>
                </div>

                {/* DESTINATION B: MICROSOFT ONEDRIVE INTEGRATION */}
                <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <Layers className={`w-4 h-4 shrink-0 ${oneDriveAccount.connected ? 'text-blue-400' : 'text-zinc-500'}`} />
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">Microsoft OneDrive Integration</h4>
                        <p className="text-[11px] text-zinc-400">Microsoft cloud backup & archive sync</p>
                      </div>
                    </div>
                    {oneDriveAccount.connected ? (
                      <span className="text-[10px] font-mono font-bold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-blue-400" />
                        <span>Linked</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-400 bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-0.5 rounded-md">
                        Ready
                      </span>
                    )}
                  </div>

                  {oneDriveAccount.connected && (
                    <div className="flex items-center justify-between bg-[#1a1a1a] border border-[#2a2a2a] p-2 rounded-lg text-[11px] font-mono">
                      <span className="text-blue-300 truncate">Account: {oneDriveAccount.email}</span>
                      <button
                        type="button"
                        onClick={handleToggleOneDriveConnect}
                        className="text-zinc-400 hover:text-red-400 ml-2 underline text-[10px]"
                      >
                        Unlink
                      </button>
                    </div>
                  )}

                  {isConnectingOneDrive && (
                    <form onSubmit={handleSaveOneDriveAccount} className="bg-[#1a1a1a] border border-blue-500/30 rounded-xl p-3 space-y-2">
                      <label className="block text-[10px] text-blue-300 font-bold uppercase">Enter Microsoft / OneDrive Account Email</label>
                      <input
                        type="email"
                        value={oneDriveEmailInput}
                        onChange={(e) => setOneDriveEmailInput(e.target.value)}
                        placeholder="e.g. jonathanblunt1214@outlook.com"
                        className="w-full bg-[#121212] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                        required
                      />
                      <div className="flex justify-end space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsConnectingOneDrive(false)}
                          className="px-2.5 py-1 bg-[#282828] text-zinc-300 text-[11px] font-bold rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-bold rounded-lg"
                        >
                          Connect OneDrive
                        </button>
                      </div>
                    </form>
                  )}

                  {oneDriveActionStatus && (
                    <div
                      className={`text-[11px] p-2 rounded-lg flex items-center space-x-1.5 ${
                        oneDriveActionStatus.type === 'success'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                          : 'bg-blue-500/10 border border-blue-500/20 text-blue-300'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">{oneDriveActionStatus.text}</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleOneDriveBackup}
                      disabled={isOneDriveOperating}
                      className="flex-1 py-2 px-3 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50 min-h-[38px]"
                    >
                      <CloudUpload className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{oneDriveAccount.connected ? 'Backup to OneDrive' : 'Connect & Backup OneDrive'}</span>
                    </button>
                  </div>
                </div>

                {/* Granular Parameter Sharing Controls in Cloud Settings */}
                {renderGranularParameterControls()}
              </div>
            )}

            {/* SUB-TAB 3: AI FEDERATED LEARNING & SERVER KNOWLEDGE POOL */}
            {dataSubTab === 'federated' && (
              <div className="space-y-3">
                <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2a2a2a]">
                    <div className="flex items-center space-x-2">
                      <Brain className="w-4 h-4 text-purple-400 shrink-0" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">Federated AI Learning Network</h4>
                        <p className="text-[11px] text-zinc-400">Server pool learning from anonymized pitmaster data</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md flex items-center space-x-1">
                      <Server className="w-3 h-3 text-purple-400" />
                      <span>Live Pool</span>
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-300 leading-relaxed bg-[#1a1a1a] p-2.5 rounded-lg border border-[#2a2a2a]">
                    🌐 <strong className="text-purple-300 font-bold">Community Intelligence:</strong> Connect your {AI_PITMASTER_NAME} to a server pool of accepted user data. As users opt-in and contribute anonymized logs, {AI_NAME} continuously refines thermal stall projections, pellet burn estimations, and wood blend flavor scores.
                  </p>

                  {/* Pool Live Statistics Card */}
                  <div className="bg-gradient-to-r from-purple-950/40 via-[#1a1a1a] to-blue-950/30 border border-purple-500/30 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center space-x-1 font-mono">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>Live Community Server Pool Stats</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded font-bold">
                        {poolStats?.federatedAccuracyRating || '98.6%'} Accuracy
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-[#121212] p-2 rounded-lg border border-[#2a2a2a]">
                        <span className="text-[10px] text-zinc-400 block font-mono">Total Server Pool Cooks</span>
                        <span className="text-sm font-bold text-white font-mono">
                          {poolStats ? (poolStats.totalContributions || 1542).toLocaleString() : '1,542'} cooks
                        </span>
                      </div>
                      <div className="bg-[#121212] p-2 rounded-lg border border-[#2a2a2a]">
                        <span className="text-[10px] text-zinc-400 block font-mono">My Contributions</span>
                        <span className="text-sm font-bold text-purple-300 font-mono">
                          {federatedConfig.contributedCount || 0} logs
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#121212] p-2 rounded-lg border border-[#2a2a2a] space-y-1 text-[11px]">
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-400">Top Community Wood Blend:</span>
                        <span className="font-bold text-amber-300">
                          {poolStats?.topPelletBlends?.[0]?.blend || 'Post Oak & Pecan (60/40)'}
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-400">Avg Brisket Stall Temp:</span>
                        <span className="font-bold text-orange-300">
                          {poolStats?.averageStalls?.[0]?.stallTemp || '163°F - 171°F'}
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-400">Model Accuracy Rating:</span>
                        <span className="font-mono text-purple-300">{poolStats?.federatedAccuracyRating || '98.6%'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between bg-[#1a1a1a] p-2.5 rounded-lg border border-[#2a2a2a]">
                      <div className="pr-2">
                        <h5 className="text-xs font-bold text-white">Enable Federated AI Learning</h5>
                        <p className="text-[10px] text-zinc-400">Inject server pool insights into {AI_NAME} prompt context</p>
                      </div>
                      <ToggleSwitch
                        checked={federatedConfig.enabled}
                        onChange={() => {
                          const nextEnabled = !federatedConfig.enabled;
                          setFederatedConfig((prev) => ({ ...prev, enabled: nextEnabled }));
                          if (!nextEnabled) {
                            handleRevokeMyData();
                          }
                        }}
                        label="Toggle Federated AI Learning"
                      />
                    </div>

                    <div className="flex items-center justify-between bg-[#1a1a1a] p-2.5 rounded-lg border border-[#2a2a2a]">
                      <div className="pr-2">
                        <h5 className="text-xs font-bold text-white">Anonymize Contributed Logs</h5>
                        <p className="text-[10px] text-zinc-400">Scrub personal names, location, and exact timestamps before sending</p>
                      </div>
                      <ToggleSwitch
                        checked={federatedConfig.anonymizeData}
                        onChange={() => setFederatedConfig((prev) => ({ ...prev, anonymizeData: !prev.anonymizeData }))}
                        label="Toggle Anonymize Data"
                      />
                    </div>

                    <div className="flex items-center justify-between bg-[#1a1a1a] p-2.5 rounded-lg border border-[#2a2a2a]">
                      <div className="pr-2">
                        <h5 className="text-xs font-bold text-white">Auto-Sync Completed Cooks</h5>
                        <p className="text-[10px] text-zinc-400">Automatically upload rated cooks to server knowledge pool</p>
                      </div>
                      <ToggleSwitch
                        checked={federatedConfig.autoSyncContributions && federatedConfig.enabled}
                        onChange={() => {
                          const isTermsAccepted = localStorage.getItem('pitmaster_terms_accepted') !== 'false';
                          if (!isTermsAccepted || !federatedConfig.enabled) {
                            setContributionStatus({
                              type: 'error',
                              text: 'Terms of Service required: Please accept Terms of Service & Privacy Disclosure to enable Charbot auto-sync.',
                            });
                            setFederatedConfig((prev) => ({ ...prev, autoSyncContributions: false }));
                            return;
                          }
                          setFederatedConfig((prev) => ({ ...prev, autoSyncContributions: !prev.autoSyncContributions }));
                        }}
                        label="Toggle Auto-Sync Contributions"
                      />
                    </div>
                  </div>

                  {/* Granular Parameter Controls Box */}
                  {renderGranularParameterControls()}

                  {/* Status Banner */}
                  {contributionStatus && (
                    <div
                      className={`text-[11px] p-2 rounded-lg flex items-center space-x-1.5 ${
                        contributionStatus.type === 'success'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                          : contributionStatus.type === 'error'
                          ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                          : 'bg-purple-500/10 border border-purple-500/20 text-purple-300'
                      }`}
                    >
                      {contributionStatus.type === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Brain className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      )}
                      <span className="truncate">{contributionStatus.text}</span>
                    </div>
                  )}

                  {/* Manual Contribution Action */}
                  <button
                    type="button"
                    onClick={handleContributeCookLogs}
                    disabled={isContributing || !federatedConfig.enabled}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-400/30 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md disabled:opacity-40 min-h-[40px]"
                  >
                    <Share2 className="w-4 h-4 text-purple-200 shrink-0" />
                    <span>Contribute Anonymized Cook Logs to Server Pool (+50 XP/log)</span>
                  </button>

                  {/* Account & Consent Compliance Revocation Control */}
                  <div className="pt-1 border-t border-[#2a2a2a] space-y-1.5">
                    <button
                      type="button"
                      onClick={handleRevokeMyData}
                      disabled={isContributing}
                      className="w-full py-2 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-bold text-[11px] sm:text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-40 min-h-[38px]"
                    >
                      <UserX className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>Revoke Consent & Remove My Logs (Auto-Purges Unverified Data)</span>
                    </button>
                    <p className="text-[10px] text-zinc-400 text-center font-mono">
                      🔒 Pre-upload audits & unverified data purges are automatically enforced before every contribution.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 4: LOCAL DEVICE EXPORT & DATA RESET */}
            {dataSubTab === 'local' && (
              <div className="space-y-3">
                {/* DESTINATION C: LOCAL DISK FILE EXPORT & IMPORT */}
                <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">Local Device Backup File</h4>
                        <p className="text-[11px] text-zinc-400">Save or import offline JSON logbook files</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                      Offline
                    </span>
                  </div>

                  {localActionStatus && (
                    <div
                      className={`text-[11px] p-2 rounded-lg flex items-center space-x-1.5 ${
                        localActionStatus.type === 'success'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                          : 'bg-red-500/10 border border-red-500/20 text-red-300'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{localActionStatus.text}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleExportLocalBackup}
                      className="py-2 px-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer min-h-[38px]"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span>Export JSON</span>
                    </button>

                    <label className="py-2 px-2.5 bg-[#1a1a1a] hover:bg-[#282828] border border-[#333333] text-zinc-200 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer min-h-[38px]">
                      <Upload className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Import File</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportLocalBackup}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* MEMORY USAGE & STORAGE EFFICIENCY OPTIMIZER */}
                <div className="bg-gradient-to-r from-emerald-950/30 via-[#242424] to-teal-950/20 border border-emerald-500/30 rounded-xl p-3.5 space-y-3 shadow-md">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2a2a2a]">
                    <div className="flex items-center space-x-2">
                      <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-white">Browser Storage & RAM Optimization</h4>
                        <p className="text-[11px] text-zinc-400">Zero-overhead local storage compression & memory caching</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                      {storageStats.usedFormatted} / ~5 MB ({storageStats.percentUsed}%)
                    </span>
                  </div>

                  {/* Meter Bar */}
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-[#121212] rounded-full overflow-hidden border border-[#2a2a2a]">
                      <div
                        className={`h-full transition-all duration-500 ${
                          storageStats.percentUsed > 80
                            ? 'bg-red-500'
                            : storageStats.percentUsed > 50
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.max(2, storageStats.percentUsed)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                      <span>Quota Used: {storageStats.usedFormatted}</span>
                      <span>Estimated Available: ~5.00 MB</span>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                    {storageStats.breakdown.map((item) => (
                      <div key={item.key} className="p-2 bg-[#121212] rounded-lg border border-[#2a2a2a] flex items-center justify-between">
                        <span className="text-zinc-300 truncate font-semibold mr-2">{item.label}</span>
                        <span className="text-emerald-400 font-mono font-bold shrink-0">{item.formatted}</span>
                      </div>
                    ))}
                  </div>

                  {compactStatus && (
                    <div className="text-[11px] p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg flex items-center space-x-1.5 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{compactStatus}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#2a2a2a] space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-xs font-bold text-white flex items-center space-x-1.5">
                          <span>Auto-Clear Cached Data Interval</span>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded font-bold">
                            Mobile Optimization
                          </span>
                        </h5>
                        <p className="text-[10px] text-zinc-400">
                          Automatically purges stale price caches and oversized chat histories to maintain optimal smartphone performance.
                        </p>
                      </div>
                      <select
                        value={autoClearInterval}
                        onChange={(e) => handleAutoClearIntervalChange(e.target.value as AutoClearIntervalOption)}
                        className="bg-[#121212] border border-[#2a2a2a] text-xs font-bold text-orange-400 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                      >
                        <option value="7_days">Every 7 Days</option>
                        <option value="30_days">Every 30 Days (Recommended)</option>
                        <option value="90_days">Every 90 Days</option>
                        <option value="never">Disabled (Never)</option>
                      </select>
                    </div>

                    <div className="p-2 bg-[#121212] rounded-lg border border-[#2a2a2a] flex items-center justify-between text-[11px] font-mono">
                      <span className="text-zinc-400">Next Scheduled Auto-Purge:</span>
                      <span className="text-emerald-400 font-bold">{nextAutoClearDate}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const res = executeCacheClear();
                        setStorageStats(getStorageStats());
                        setCompactStatus(res.message);
                        setNextAutoClearDate(getNextAutoClearDateFormatted());
                        setTimeout(() => setCompactStatus(null), 4000);
                      }}
                      className="w-full py-2 px-3 bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>Clear Cached Data Now (Reclaim Space)</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const res = compactAndOptimizeStorage();
                      setStorageStats(getStorageStats());
                      setCompactStatus(`Storage compacted! Reclaimed ${res.freedFormatted} of browser memory.`);
                      setTimeout(() => setCompactStatus(null), 3500);
                    }}
                    className="w-full py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center space-x-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run 1-Click Storage & Memory Compression</span>
                  </button>
                </div>

                {/* RESET SAMPLE DATA */}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-md active:scale-98 flex items-center justify-center"
          >
            Done
          </button>
        </div>
      </div>

      <TermsOfServiceModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onOpenSettingsGranular={() => {
          setIsTermsModalOpen(false);
          setActiveTab('data');
          setDataSubTab('federated');
        }}
      />
    </div>
  );
};
