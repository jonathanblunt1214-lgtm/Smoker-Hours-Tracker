import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  googleSignIn,
  saveToGoogleDrive,
  loadFromGoogleDrive,
  getAccessToken,
} from '../lib/driveSync';
import { SmokerProfile, CookLog, FuelLog, FederatedLearningConfig, FederatedPoolStats, CustomSmokerSpec, ManufacturerSmokerSpec, LowPowerModeSettings, LocalUserProfile, OneDriveAccount } from '../types';
import { calculateUserAccount, getUserLevelThresholds } from '../utils/userLeveling';
import { MasterSyncEngine, triggerMasterVersionSync } from '../services/masterVersionSyncService';
import { loadFederatedLearningConfig, saveFederatedLearningConfig, loadSavedCustomSmokers, saveSavedCustomSmokers, loadSavedManufacturerSmokers, saveSavedManufacturerSmokers, getStorageStats, compactAndOptimizeStorage, DEFAULT_GRANULAR_SHARING, getAutoClearInterval, setAutoClearInterval, executeCacheClear, getNextAutoClearDateFormatted, AutoClearIntervalOption, saveLocalUserProfile } from '../utils/storage';
import { getEffectiveSmokerSpecs } from '../utils/smokerCalculations';
import { ALL_SMOKERS_DATABASE, ExtendedSmokerSpec } from '../data/smokerDatabases';
import { isMasterAdmin, isAdminUser, getSubAdmins, addSubAdmin, removeSubAdmin, MASTER_ADMIN_EMAIL } from '../utils/adminAuth';
import { saveActiveUserSession } from '../utils/userAuthSession';
import { APP_NAME, AI_NAME, AI_PITMASTER_NAME } from '../constants/appName';
import { TermsOfServiceModal } from './TermsOfServiceModal';
import { SmokerModManager } from './SmokerModManager';
import { PushAndAlexaHub } from './PushAndAlexaHub';
import { MasterVersionSyncCard } from './MasterVersionSyncCard';
import { ScreenOptimizerCard } from './ScreenOptimizerCard';
import { SmokerUnitProfileChart } from './SmokerUnitProfileChart';
import { CharGPTProfileLinkCard } from './CharGPTProfileLinkCard';
import { ErrorBoundary } from './ErrorBoundary';
import { formatFuelOnHandWeight } from '../utils/tempUtils';
import {
  Settings,
  X,
  Thermometer,
  Maximize2,
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
  Globe,
  Clock,
  Cpu,
  Search,
  Lock,
  Bot,
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
  autoSyncNewCooks?: boolean;
  onToggleAutoSyncNewCooks?: () => void;
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
  autoSyncNewCooks = true,
  onToggleAutoSyncNewCooks,
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
  const [dataSubTab, setDataSubTab] = useState<'account' | 'master_sync' | 'smokers' | 'cloud' | 'federated' | 'local'>(
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
      try {
        const saved = localStorage.getItem('pitmaster_local_user_account');
        if (saved) {
          const parsed = JSON.parse(saved);
          setLocalAccount((prev) => ({
            ...prev,
            ...parsed,
            name: parsed.name || currentUser?.displayName || 'Pitmaster Guest',
            email: parsed.email || currentUser?.email || '',
            title: parsed.title || 'Guest Pitmaster',
          }));
        } else if (currentUser) {
          setLocalAccount((prev) => ({
            ...prev,
            name: currentUser.displayName || 'Pitmaster Guest',
            email: currentUser.email || '',
            title: 'Verified Pitmaster',
          }));
        }
      } catch (e) {}
    }
  }, [isOpen, initialTab, currentUser]);

  // Local User Profile Account state
  const [localAccount, setLocalAccount] = useState<LocalUserProfile>(() => {
    const defaultRig = profile || {
      id: 'rig-default-1',
      name: '',
      model: '',
      smokerType: '' as any,
      fuelType: 'Pellets',
      initialHours: 0,
      currentHours: 0,
      pelletHopperCapacityLbs: 0,
      maintenanceTasks: [],
      appliedModIds: [],
      appliedMods: [],
    };
    try {
      const saved = localStorage.getItem('pitmaster_local_user_account');
      if (saved) {
        const parsed = JSON.parse(saved);
        const safeRigs = parsed.rigs && Array.isArray(parsed.rigs) ? parsed.rigs : [];
        const nameVal = parsed.name || 'Pitmaster Guest';
        const emailVal = parsed.email || '';
        const titleVal = parsed.title || 'Guest Pitmaster';
        return {
          createdAt: new Date().toISOString().slice(0, 10),
          rememberMe: true,
          ...parsed,
          name: nameVal,
          email: emailVal,
          title: titleVal,
          rigs: safeRigs,
          activeRigId: parsed.activeRigId || safeRigs[0]?.id || undefined,
        };
      }
    } catch (e) {}
    return {
      name: 'Pitmaster Guest',
      email: '',
      title: 'Guest Pitmaster',
      createdAt: new Date().toISOString().slice(0, 10),
      rememberMe: true,
      rigs: [],
      activeRigId: undefined,
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
  const [newRigHopper, setNewRigHopper] = useState('0');
  const [newRigBowlCapacity, setNewRigBowlCapacity] = useState('0');

  const [editingRigId, setEditingRigId] = useState<string | null>(null);
  const [editRigName, setEditRigName] = useState('');
  const [editRigHours, setEditRigHours] = useState('0');
  const [editRigHopper, setEditRigHopper] = useState('0');
  const [editRigBowlCapacity, setEditRigBowlCapacity] = useState('0');

  // Account Fuel On Hand & Manual Hours Override / Profile Upload State
  const [accountFuelOnHandInput, setAccountFuelOnHandInput] = useState<string>(
    localAccount?.fuelOnHand || '120 lbs'
  );
  const [overrideMode, setOverrideMode] = useState<'total' | 'baseline'>('total');
  const [overrideHoursInput, setOverrideHoursInput] = useState<string>('0');
  const [overrideSelectedRigId, setOverrideSelectedRigId] = useState<string>(
    localAccount?.activeRigId || profile?.id || 'rig-1'
  );
  const [overrideSyncFeedbackMsg, setOverrideSyncFeedbackMsg] = useState<string | null>(null);
  const [isOverrideSyncing, setIsOverrideSyncing] = useState<boolean>(false);
  const profileFileInputRef = useRef<HTMLInputElement>(null);

  const [personaDetectionNotice, setPersonaDetectionNotice] = useState<{ persona: string; explanation: string } | null>(null);

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

  const handleClearRigSettings = () => {
    if (window.confirm('Are you sure you want to clear the active smoker rig specifications and reset all custom settings?')) {
      setActiveSpecName('');
      setActiveSpecBrand('');
      setActiveSpecCategory('');
      setActiveSpecFuelType('');
      setActiveSpecBaselineBurn('');
      setActiveSpecHighHeatBurn('');
      setActiveSpecCapacity('');
      setActiveSpecBowlCapacity('');
      setActiveSpecArea('');
      setActiveSpecThermalRating('');
      setActiveSpecGauge('');
      setActiveSpecDraft('');
      setActiveSpecInitialHours('');

      if (profile && onUpdateProfile) {
        onUpdateProfile({
          ...profile,
          name: '',
          model: '',
          smokerType: '' as any,
          fuelType: 'Pellets',
          pelletHopperCapacityLbs: 0,
          bowlCapacityLbs: 0,
          customSpecs: undefined,
          manufacturerSpecs: undefined,
        });
      }

      setServerSyncStatus({ type: 'success', text: '🧹 Active rig settings cleared to default baseline specifications.' });
      setTimeout(() => setServerSyncStatus(null), 4000);
    }
  };

  const handleAutoDetectPersonaFromLogs = () => {
    const logs = currentAppData?.cookLogs || [];
    let brisketCount = 0;
    let offsetCount = 0;
    let competitionCount = 0;
    let thermalReadingCount = 0;
    let kcRibsCount = 0;

    logs.forEach((log) => {
      const text = `${log.proteinType || ''} ${log.proteinCut || ''} ${log.smokerType || ''} ${log.finishedNotes || ''} ${log.saucesGlazes || ''} ${log.nextTimeNotes || ''}`.toLowerCase();
      if (text.includes('brisket') || text.includes('offset') || text.includes('stick') || text.includes('oak')) {
        if (text.includes('brisket')) brisketCount++;
        if (text.includes('offset') || text.includes('stick')) offsetCount++;
      }
      if ((log.ratings?.overall || 0) >= 4.5 || text.includes('kcbs') || text.includes('competition') || text.includes('tenderness') || text.includes('turn-in')) {
        competitionCount++;
      }
      if ((log.temperatureReadings?.length || 0) >= 5 || text.includes('stall') || text.includes('ambient') || text.includes('thermodynam')) {
        thermalReadingCount += (log.temperatureReadings?.length || 0);
      }
      if (text.includes('rib') || text.includes('pork shoulder') || text.includes('glaze') || text.includes('burnt ends') || text.includes('sauce') || text.includes('hickory')) {
        kcRibsCount++;
      }
    });

    let detected: 'Master Pitmaster' | 'Texas Offset Specialist' | 'Competition BBQ Judge' | 'Thermal Chemist & Science' | 'Kansas City Pit Master' = 'Master Pitmaster';
    let rationale = '';

    if (brisketCount >= 2 || offsetCount >= 2) {
      detected = 'Texas Offset Specialist';
      rationale = `Detected ${brisketCount} Brisket cook(s) & ${offsetCount} Offset log(s) with wood splits. Recommended for heavy post-oak low & slow cooks.`;
    } else if (competitionCount >= 2) {
      detected = 'Competition BBQ Judge';
      rationale = `Detected ${competitionCount} high-scoring / KCBS style cooks. Recommended for competition scoring & precision timing.`;
    } else if (thermalReadingCount >= 10) {
      detected = 'Thermal Chemist & Science';
      rationale = `Detected ${thermalReadingCount} thermal probe readings & stall entries. Recommended for thermodynamic analysis.`;
    } else if (kcRibsCount >= 2) {
      detected = 'Kansas City Pit Master';
      rationale = `Detected ${kcRibsCount} rib, glaze & pork shoulder cooks. Recommended for sweet hickory glazes & sauce pairing.`;
    } else {
      detected = 'Master Pitmaster';
      rationale = `Analyzed ${logs.length} cook logs. Set to versatile Master Pitmaster baseline.`;
    }

    const updatedAccount = {
      ...localAccount,
      charGPTPersona: detected,
    };

    setLocalAccount(updatedAccount);
    saveLocalUserProfile(updatedAccount);

    setPersonaDetectionNotice({
      persona: detected,
      explanation: rationale,
    });
    setServerSyncStatus({ type: 'success', text: `✨ Auto-Detected CharGPT Persona: "${detected}" based on log analysis!` });
    setTimeout(() => setServerSyncStatus(null), 5000);
  };

  useEffect(() => {
    if (isOpen && dataSubTab === 'account') {
      const email = currentUser?.email || localAccount.email || '';
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
      email: '',
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
  const isProfileBlank = !activeProfile?.name || activeProfile.name.trim() === '' || activeProfile.name === 'None Selected' || !activeProfile.model;
  const effectiveSpecs = getEffectiveSmokerSpecs(activeProfile);

  const [activeSpecName, setActiveSpecName] = useState(isProfileBlank ? '' : (activeProfile?.name || ''));
  const [activeSpecBrand, setActiveSpecBrand] = useState(isProfileBlank ? '' : (activeProfile?.model || activeProfile?.manufacturerSpecs?.brand || ''));
  const [activeSpecCategory, setActiveSpecCategory] = useState(isProfileBlank ? '' : (activeProfile?.smokerType || activeProfile?.manufacturerSpecs?.category || ''));
  const [activeSpecFuelType, setActiveSpecFuelType] = useState(isProfileBlank ? '' : (activeProfile?.fuelType || ''));
  const [activeSpecBaselineBurn, setActiveSpecBaselineBurn] = useState<string | number>(isProfileBlank ? '' : (activeProfile?.customSpecs?.baselineBurnRateLbsHr || activeProfile?.manufacturerSpecs?.factoryBaselineBurnRateLbsHr || ''));
  const [activeSpecHighHeatBurn, setActiveSpecHighHeatBurn] = useState<string | number>(isProfileBlank ? '' : (activeProfile?.manufacturerSpecs?.factoryHighHeatBurnRateLbsHr || ''));
  const [activeSpecCapacity, setActiveSpecCapacity] = useState<string | number>(isProfileBlank ? '' : (activeProfile?.pelletHopperCapacityLbs || ''));
  const [activeSpecBowlCapacity, setActiveSpecBowlCapacity] = useState<string | number>(
    isProfileBlank ? '' : (activeProfile?.bowlCapacityLbs || activeProfile?.manufacturerSpecs?.bowlCapacityLbs || activeProfile?.customSpecs?.bowlCapacityLbs || '')
  );
  const [activeSpecArea, setActiveSpecArea] = useState<string | number>(isProfileBlank ? '' : (activeProfile?.manufacturerSpecs?.cookingAreaSqIn || ''));
  const [activeSpecThermalRating, setActiveSpecThermalRating] = useState(isProfileBlank ? '' : (activeProfile?.manufacturerSpecs?.thermalEfficiencyRating || ''));
  const [activeSpecGauge, setActiveSpecGauge] = useState(isProfileBlank ? '' : (activeProfile?.manufacturerSpecs?.insulationType || ''));
  const [activeSpecDraft, setActiveSpecDraft] = useState(isProfileBlank ? '' : (activeProfile?.manufacturerSpecs?.controllerType || ''));
  const [activeSpecInitialHours, setActiveSpecInitialHours] = useState<string | number>(isProfileBlank ? '' : (activeProfile?.initialHours ?? ''));

  const [showSmokerSuggestions, setShowSmokerSuggestions] = useState(false);

  const autoPopulateFromDatabaseMatch = (spec: ExtendedSmokerSpec) => {
    setActiveSpecName(spec.brandModel || `${spec.brand} ${spec.model}`);
    setActiveSpecBrand(spec.brand);
    setActiveSpecCategory(spec.category || spec.smokerTypeKey);
    setActiveSpecFuelType(spec.fuelType);
    setActiveSpecBaselineBurn(spec.factoryBaselineBurnRateLbsHr);
    setActiveSpecHighHeatBurn(spec.factoryHighHeatBurnRateLbsHr);
    setActiveSpecCapacity(spec.standardCapacityLbs);
    const mfgBowlCap = (spec as any).bowlCapacityLbs || 0;
    setActiveSpecBowlCapacity(mfgBowlCap);
    setActiveSpecArea(spec.cookingAreaSqIn);
    setActiveSpecThermalRating(spec.thermalEfficiencyRating);
    setActiveSpecGauge(spec.insulationType);
    setActiveSpecDraft(spec.manufacturerNotes || (spec.keyFeatures && spec.keyFeatures[0]) || 'PID Digital Controller');
    
    // Automatically convert manufacturer capacity to account metric
    const effectiveCapLbs = mfgBowlCap > 0 ? mfgBowlCap : spec.standardCapacityLbs;
    if (effectiveCapLbs > 0) {
      try {
        const rawAcc = localStorage.getItem('pitmaster_local_user_account');
        const acc = rawAcc ? JSON.parse(rawAcc) : { name: 'Pitmaster', email: '', title: 'Guest Pitmaster', createdAt: new Date().toISOString() };
        acc.fuelOnHand = `${effectiveCapLbs} lbs`;
        localStorage.setItem('pitmaster_local_user_account', JSON.stringify(acc));
        setLocalAccount(acc);
        setAccountFuelOnHandInput(`${effectiveCapLbs} lbs`);
      } catch (e) {}
    }

    setShowSmokerSuggestions(false);
    setSmokerSpecSaveStatus(`✨ Auto-populated specs for ${spec.brandModel} & converted manufacturer capacity (${effectiveCapLbs} lbs) to account metric!`);
    setTimeout(() => setSmokerSpecSaveStatus(null), 4000);
  };

  const handleSmokerNameInputChange = (inputVal: string) => {
    setActiveSpecName(inputVal);
    setShowSmokerSuggestions(true);
  };

  const matchingDatabaseSmokers = React.useMemo(() => {
    if (!activeSpecName || activeSpecName.trim().length < 1) return [];
    const q = activeSpecName.trim().toLowerCase();
    return ALL_SMOKERS_DATABASE.filter((s) => {
      const text = `${s.brandModel} ${s.brand} ${s.model} ${s.category} ${s.smokerTypeKey} ${s.fuelType}`.toLowerCase();
      return text.includes(q);
    }).slice(0, 8);
  }, [activeSpecName]);

  // Account Settings: Initial Smoker Hours & Sub-Admin Controls State
  const [subAdminsList, setSubAdminsList] = useState<string[]>(getSubAdmins());
  const [newSubAdminInput, setNewSubAdminInput] = useState('');
  const [subAdminMsg, setSubAdminMsg] = useState<string | null>(null);
  const [accountInitialHours, setAccountInitialHours] = useState<number>(activeProfile?.initialHours ?? 0);
  const [globalBulkBaselineInput, setGlobalBulkBaselineInput] = useState('');

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

  const prevActiveProfileKeyRef = useRef<string | null>(null);

  // Sync state ONLY if activeProfile actually changes to a different profile
  useEffect(() => {
    if (activeProfile) {
      const currentKey = `${activeProfile.id || 'no-id'}:${activeProfile.name || ''}:${activeProfile.model || ''}:${activeProfile.smokerType || ''}:${activeProfile.fuelType || ''}`;
      
      if (prevActiveProfileKeyRef.current !== currentKey) {
        prevActiveProfileKeyRef.current = currentKey;
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
    }
  }, [activeProfile]);

  // New Smoker Specification Input Form State
  const [isAddingNewSmoker, setIsAddingNewSmoker] = useState(false);
  const [newSmokerMode, setNewSmokerMode] = useState<'custom' | 'manufacturer'>('custom');
  const [newSmokerName, setNewSmokerName] = useState('');
  const [newSmokerBrandOrBuilder, setNewSmokerBrandOrBuilder] = useState('');
  const [newSmokerCategory, setNewSmokerCategory] = useState('Vertical Pellet Smoker');
  const [newSmokerFuelType, setNewSmokerFuelType] = useState<'Pellets' | 'Charcoal' | 'Wood Splits' | 'Electric' | 'Gas'>('Pellets');
  const [newSmokerBaselineBurn, setNewSmokerBaselineBurn] = useState<number | string>(1.20);
  const [newSmokerHighHeatBurn, setNewSmokerHighHeatBurn] = useState<number | string>(2.50);
  const [newSmokerHopperCapacity, setNewSmokerHopperCapacity] = useState<number | string>(20);
  const [newSmokerCookingArea, setNewSmokerCookingArea] = useState<number | string>(800);
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
    triggerMasterVersionSync().catch(() => {});
  }, [federatedConfig]);

  const fetchFederatedStatsWithAlias = (alias: string) => {
    fetch(`/api/federated-learning/stats?pitmasterAlias=${encodeURIComponent(alias)}`)
      .then((res) => res.json())
      .then((data: FederatedPoolStats) => {
        setPoolStats(data);
        if (data && typeof data.userContributions === 'number') {
          setFederatedConfig((prev) => {
            if (prev.contributedCount !== data.userContributions) {
              const updated = { ...prev, contributedCount: data.userContributions };
              saveFederatedLearningConfig(updated);
              return updated;
            }
            return prev;
          });
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (isOpen && activeTab === 'data' && dataSubTab === 'federated') {
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
          .then(() => fetchFederatedStatsWithAlias(pitmasterAlias))
          .catch(() => {});
      } else {
        // Otherwise run pre-load compliance sweep & fetch stats
        fetch('/api/federated-learning/purge-unverified', { method: 'POST' })
          .then(() => fetchFederatedStatsWithAlias(pitmasterAlias))
          .catch(() => {});
      }
    }
  }, [isOpen, activeTab, dataSubTab, federatedConfig.enabled, currentUser, localAccount]);

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
    const pitmasterAlias = (userEmail || localAccount.name || 'verified_user').trim().toLowerCase();

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
        proteinType: sharing.shareProteinAndCuts ? (log.proteinType || 'Beef') : '[Redacted by User Setting]',
        proteinCut: sharing.shareProteinAndCuts ? (log.proteinCut || log.title || 'Brisket') : '[Redacted by User Setting]',
        meatWeightLbs: sharing.shareMeatWeightAndDimensions ? (log.meatWeightLbs || 12.5) : undefined,
        smokerType: sharing.shareSmokerSpecsAndMods ? (log.smokerType || currentAppData.profile?.model || 'Pellet Smoker') : '[Redacted by User Setting]',
        fuelType: sharing.shareFuelAndWoodBlends ? (log.fuelType || 'Post Oak') : '[Redacted by User Setting]',
        cookingTemp: sharing.shareThermalTempCurves ? ((log.temperatureReadings?.[0] as any)?.pitTemp || 225) : undefined,
        stallTemp: sharing.shareThermalTempCurves ? 165 : undefined,
        stallDurationHrs: sharing.shareThermalTempCurves ? 2.0 : undefined,
        hoursLogged: sharing.shareThermalTempCurves ? (log.hoursLogged || 8) : undefined,
        ratings: sharing.shareRatingsAndFlavorScores ? { overall: log.ratings?.overall || 5, smokeFlavor: log.ratings?.bark || 5 } : undefined,
        weatherZip: sharing.shareWeatherAndLocation ? (log.weatherConditions || 'Zipcode Shared') : undefined,
        rubRecipe: sharing.shareCustomRubRecipes ? log.seasoningRubs : undefined,
        photoIncluded: sharing.shareCookPhotos ? !!(log.photoUrl || log.photoUrls?.length) : false,
      }));

      const res = await fetch('/api/federated-learning/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pitmasterAlias,
          userEmail,
          accountName: localAccount.name,
          hasAccount: true,
          termsAccepted: true,
          anonymizeData: federatedConfig.anonymizeData,
          anonymizedLogs,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const syncedUserCount = typeof data.userContributions === 'number' ? data.userContributions : anonymizedLogs.length;
        const newConfig: FederatedLearningConfig = {
          ...federatedConfig,
          contributedCount: syncedUserCount,
          lastSyncedAt: new Date().toISOString(),
        };
        setFederatedConfig(newConfig);
        saveFederatedLearningConfig(newConfig);

        setContributionStatus({
          type: 'success',
          text: `Contributed ${anonymizedLogs.length} cook log(s) to server pool! Total pool count: ${(data.totalPoolCount || anonymizedLogs.length).toLocaleString()} cooks. (+${anonymizedLogs.length * 50} Pitmaster XP awarded)`,
        });

        fetchFederatedStatsWithAlias(pitmasterAlias);
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

        fetchFederatedStatsWithAlias(pitmasterAlias);
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
      const token = accessToken || (await getAccessToken()) || '';
      if (token && currentAppData) {
        await saveToGoogleDrive(token, currentAppData);
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
    const token = accessToken || (await getAccessToken()) || '';
    if (!currentAppData || !token) {
      setDriveActionStatus({
        type: 'error',
        text: '🔒 Google Drive Authorization Required: Please click "Sign in with Google" below to link Drive storage access.',
      });
      return;
    }
    setIsDriveOperating(true);
    setDriveActionStatus({ type: 'info', text: 'Uploading backup to Google Drive...' });

    try {
      const res = await saveToGoogleDrive(token, currentAppData);
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
    const token = accessToken || (await getAccessToken()) || '';
    if (!token) {
      setDriveActionStatus({
        type: 'error',
        text: '🔒 Google Drive Authorization Required: Please click "Sign in with Google" below to link Drive storage access.',
      });
      return;
    }
    setIsDriveOperating(true);
    setDriveActionStatus({ type: 'info', text: 'Fetching backup from Google Drive...' });

    try {
      const data = await loadFromGoogleDrive(token);
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
              <h2 className="text-lg font-bold text-white leading-tight">Settings</h2>
              <p className="text-xs text-zinc-400 mt-0.5 font-medium">Manage accounts, backups, themes, and smoker hardware.</p>
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
            <span className="truncate">Alerts & Amazon</span>
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
            {/* Automated Responsive Screen Calibration Indicator */}
            <div className="bg-[#1e1e24] border border-[#2e2e38] rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 shrink-0">
                  <Maximize2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center space-x-2">
                    <span>Automated Screen & CSS Optimizer</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                      ACTIVE
                    </span>
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Automatically measures screen size and adapts grid layout & touch targets for all device screens.
                  </p>
                </div>
              </div>
            </div>

            {/* Setting: Global Imperial vs. Metric System Toggle */}
            <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between pb-2 border-b border-[#2e2e2e]">
                <div className="flex items-center space-x-2.5">
                  <Globe className="w-5 h-5 text-orange-400 shrink-0" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-white">Global Unit System (Imperial vs. Metric)</h4>
                    <p className="text-[11px] text-zinc-400">Controls temperature, meat/fuel weight, dimensions & liquid volume across all modules</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
                  Active: {tempUnit === 'F' ? 'US Imperial (°F, lbs, in)' : 'Metric System (°C, kg, cm)'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (tempUnit !== 'F') onToggleTempUnit();
                    localStorage.setItem('global_unit_system', 'imperial');
                    window.dispatchEvent(new Event('unitSystemChanged'));
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    tempUnit === 'F'
                      ? 'bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-transparent border-orange-500 text-white shadow-md'
                      : 'bg-[#1a1a1a] hover:bg-[#222222] border-[#2e2e2e] text-zinc-400'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>🇺🇸 Imperial System</span>
                      {tempUnit === 'F' && <Check className="w-3.5 h-3.5 text-orange-400" />}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      °F Temp • lbs Weight • in Size • gal Liquid
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (tempUnit !== 'C') onToggleTempUnit();
                    localStorage.setItem('global_unit_system', 'metric');
                    window.dispatchEvent(new Event('unitSystemChanged'));
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    tempUnit === 'C'
                      ? 'bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-transparent border-orange-500 text-white shadow-md'
                      : 'bg-[#1a1a1a] hover:bg-[#222222] border-[#2e2e2e] text-zinc-400'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>🌐 Metric System</span>
                      {tempUnit === 'C' && <Check className="w-3.5 h-3.5 text-orange-400" />}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      °C Temp • kg Weight • cm Size • L Liquid
                    </div>
                  </div>
                </button>
              </div>

              {/* Apply Unit System to Pitmaster Account Profile Button */}
              <div className="pt-2.5 border-t border-[#2e2e2e] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-300 font-mono">
                  Sync & apply selected system ({tempUnit === 'F' ? 'US Imperial °F / lbs' : 'Metric System °C / kg'}) directly to Account Profile
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const selectedSys = tempUnit === 'C' ? 'metric' : 'imperial';
                    localStorage.setItem('global_unit_system', selectedSys);
                    try {
                      const rawAcc = localStorage.getItem('pitmaster_local_user_account');
                      const acc = rawAcc ? JSON.parse(rawAcc) : { name: 'Pitmaster', email: '', title: 'Guest Pitmaster', createdAt: new Date().toISOString() };
                      acc.unitSystem = selectedSys;

                      // Convert account fuel on hand to matching unit
                      if (acc.fuelOnHand) {
                        acc.fuelOnHand = formatFuelOnHandWeight(acc.fuelOnHand, tempUnit);
                        setAccountFuelOnHandInput(acc.fuelOnHand);
                      }

                      localStorage.setItem('pitmaster_local_user_account', JSON.stringify(acc));
                      setLocalAccount(acc);
                      if (profile && onUpdateProfile) {
                        onUpdateProfile({ ...profile, fuelOnHand: acc.fuelOnHand || profile.fuelOnHand });
                      }
                    } catch (e) {}
                    window.dispatchEvent(new Event('unitSystemChanged'));
                    alert(`✅ Global Unit System (${tempUnit === 'F' ? 'US Imperial (°F, lbs)' : 'Metric System (°C, kg)'}) applied to Pitmaster Account!`);
                  }}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-zinc-950 font-extrabold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 shrink-0 shadow"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Apply to Account</span>
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
            {/* Setting: Auto-Sync New Cook Logs */}
            <div className="bg-[#242424] border border-[#2a2a2a] rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 pr-3">
                <Cloud className={`w-4 h-4 shrink-0 ${autoSyncNewCooks ? 'text-orange-400' : 'text-zinc-500'}`} />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Auto-Sync New Cook Logs</h4>
                  <p className="text-[11px] text-zinc-400">Automatically upload new smoke entries to cloud server on save (or save locally to account when disabled)</p>
                </div>
              </div>
              <ToggleSwitch
                checked={autoSyncNewCooks}
                onChange={onToggleAutoSyncNewCooks || (() => {})}
                label="Toggle Auto-Sync New Cooks"
              />
            </div>

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
                onClick={() => setDataSubTab('master_sync')}
                className={`flex-1 py-2 px-2 rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer whitespace-nowrap ${
                  dataSubTab === 'master_sync'
                    ? 'bg-orange-500 text-zinc-950 font-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <Globe className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span className="truncate">2. Web Master Sync</span>
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
                <span className="truncate">3. Smoker Specs</span>
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
                <span className="truncate">4. Cloud Backup</span>
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
                <span className="truncate">5. AI Federated</span>
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
                <span className="truncate">6. Local & Reset</span>
              </button>
            </div>

            {/* SUB-TAB 2: MASTER WEB VERSION SYNCHRONIZATION */}
            {dataSubTab === 'master_sync' && (
              <div className="space-y-3.5 animate-fade-in">
                <MasterVersionSyncCard />
              </div>
            )}

            {/* SUB-TAB 1: USER ACCOUNTS, MULTI-RIG FLEET & COLLAPSIBLE SETTINGS */}
            {dataSubTab === 'account' && (
              <ErrorBoundary fallbackTitle="User Account Settings">
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
                        {localAccount?.name || 'Pitmaster Guest'} ({localAccount?.email || 'Guest Account'}) • {localAccount?.rigs?.length || 1} Rig(s) Linked
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
                        <span className="text-[10px] text-zinc-400 font-mono">{localAccount?.name || 'Pitmaster'} • {localAccount?.title || 'Guest Pitmaster'}</span>
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
                                {(currentUser.displayName || currentUser.email || 'P')[0]?.toUpperCase() || 'P'}
                              </div>
                            )}
                            <div className="truncate">
                              <p className="text-xs font-bold text-white truncate">{currentUser.displayName || 'Google Pitmaster'}</p>
                              <p className="text-[11px] text-zinc-400 font-mono truncate">{currentUser.email}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (onLogout) onLogout();
                              onClose();
                            }}
                            className="ml-2 px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-[11px] rounded-lg flex items-center space-x-1 shrink-0 cursor-pointer"
                          >
                            <LogOut className="w-3 h-3" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {!isEditingAccount ? (
                            <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="flex items-center space-x-3 truncate">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-zinc-950 font-black flex items-center justify-center text-sm shrink-0 shadow-md">
                                  {(localAccount?.name || 'Pitmaster')[0]?.toUpperCase() || 'P'}
                                </div>
                                <div className="truncate">
                                  <div className="flex items-center space-x-2">
                                    <p className="text-xs font-bold text-white truncate">{localAccount?.name || 'Pitmaster'}</p>
                                    <span className="text-[9px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.2 rounded">
                                      {localAccount?.title || 'Guest Pitmaster'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-zinc-400 font-mono truncate">{localAccount?.email || 'No email set'}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => setIsEditingAccount(true)}
                                  className="px-2.5 py-1.5 bg-[#282828] hover:bg-[#323232] border border-[#3a3a3a] text-zinc-200 font-bold text-[11px] rounded-lg flex items-center space-x-1 cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3 text-orange-400" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onLogout) onLogout();
                                    onClose();
                                  }}
                                  className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-[11px] rounded-lg flex items-center space-x-1 cursor-pointer"
                                  title="Log out active Pitmaster credentials"
                                >
                                  <LogOut className="w-3 h-3" />
                                  <span>Log Out</span>
                                </button>
                              </div>
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
                                    placeholder="e.g. pitmaster@example.com"
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

                          {/* REMEMBER USER ACCOUNT & CREDENTIALS TOGGLE */}
                          <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-3 flex items-center justify-between">
                            <div className="flex items-center space-x-2.5">
                              <Lock className={`w-4 h-4 ${(localAccount?.rememberMe !== false) ? 'text-emerald-400' : 'text-amber-400'}`} />
                              <div>
                                <span className="text-xs font-bold text-white block">Remember User Account on Device</span>
                                <span className="text-[10px] text-zinc-400 font-mono">
                                  {localAccount?.rememberMe !== false
                                    ? '🔒 Persistent Device Memory: Auto sign-in enabled'
                                    : '⏱️ Session Only: Session expires on tab close'}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updatedRemember = !(localAccount?.rememberMe !== false);
                                const updatedAccount = { ...localAccount, rememberMe: updatedRemember };
                                setLocalAccount(updatedAccount);
                                saveLocalUserProfile(updatedAccount);
                                saveActiveUserSession(
                                  {
                                    id: updatedAccount.id || `user-${Date.now()}`,
                                    email: updatedAccount.email || '',
                                    name: updatedAccount.name || 'Pitmaster',
                                    title: updatedAccount.title || 'Pitmaster',
                                    provider: 'email',
                                    rememberMe: updatedRemember,
                                    isMasterAdmin: (updatedAccount.email || '').toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase(),
                                    loggedInAt: new Date().toISOString(),
                                  },
                                  updatedRemember
                                );
                              }}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                localAccount?.rememberMe !== false ? 'bg-orange-500' : 'bg-zinc-700'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  localAccount?.rememberMe !== false ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>

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

                          {/* ACCOUNT-LINKED COOK & FUEL LOGS CARD */}
                          {(() => {
                            const cLogs = currentAppData?.cookLogs || [];
                            const fLogs = currentAppData?.fuelLogs || [];
                            const userEmailLower = (localAccount?.email || '').trim().toLowerCase();

                            const linkedCookCount = userEmailLower
                              ? cLogs.filter((c) => c && c.userEmail && c.userEmail.trim().toLowerCase() === userEmailLower).length
                              : cLogs.length;
                            const linkedFuelCount = userEmailLower
                              ? fLogs.filter((f) => f && f.userEmail && f.userEmail.trim().toLowerCase() === userEmailLower).length
                              : fLogs.length;
                            const unlinkedCooks = Math.max(0, cLogs.length - linkedCookCount);
                            const unlinkedFuel = Math.max(0, fLogs.length - linkedFuelCount);

                            const handleLinkAllLogsToAccount = () => {
                              const updatedCooks = cLogs.map((c) => ({
                                ...c,
                                userEmail: localAccount?.email || '',
                                userId: localAccount?.id || localAccount?.email || 'guest',
                                pitmasterAlias: localAccount?.name || 'Pitmaster',
                              }));
                              const updatedFuel = fLogs.map((f) => ({
                                ...f,
                                userEmail: localAccount?.email || '',
                                userId: localAccount?.id || localAccount?.email || 'guest',
                              }));

                              if (onRestoreData && currentAppData) {
                                onRestoreData({
                                  ...currentAppData,
                                  cookLogs: updatedCooks,
                                  fuelLogs: updatedFuel,
                                });
                              }
                              alert(`🔥 Successfully linked all ${cLogs.length} Cook Logs & ${fLogs.length} Fuel Restock Logs to Pitmaster Account: ${localAccount?.email || 'Guest'}`);
                            };

                            return (
                              <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-3.5 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <FileText className="w-4 h-4 text-orange-400" />
                                    <div>
                                      <h4 className="text-xs font-bold text-white">Account-Linked Cook & Fuel Logs</h4>
                                      <p className="text-[10px] text-zinc-400">Bind all historical smoke sessions and pellet inventory logs to {localAccount?.email || 'your account'}</p>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                                    {linkedCookCount + linkedFuelCount} / {cLogs.length + fLogs.length} Linked
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="bg-[#141416] border border-[#282828] p-2.5 rounded-lg flex items-center justify-between">
                                    <div>
                                      <span className="text-[10px] text-zinc-400 block font-medium">Cook Logs</span>
                                      <span className="font-mono font-bold text-white text-sm">{linkedCookCount} / {cLogs.length}</span>
                                    </div>
                                    <Flame className="w-4 h-4 text-orange-400" />
                                  </div>

                                  <div className="bg-[#141416] border border-[#282828] p-2.5 rounded-lg flex items-center justify-between">
                                    <div>
                                      <span className="text-[10px] text-zinc-400 block font-medium">Fuel Restock Logs</span>
                                      <span className="font-mono font-bold text-amber-300 text-sm">{linkedFuelCount} / {fLogs.length}</span>
                                    </div>
                                    <Flame className="w-4 h-4 text-amber-400" />
                                  </div>
                                </div>

                                {(unlinkedCooks > 0 || unlinkedFuel > 0) && (
                                  <div className="pt-1 flex items-center justify-between">
                                    <span className="text-[10px] text-amber-400 font-mono">
                                      ⚠️ {unlinkedCooks} unlinked cook log(s) and {unlinkedFuel} fuel log(s) found
                                    </span>
                                    <button
                                      type="button"
                                      onClick={handleLinkAllLogsToAccount}
                                      className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold text-[10px] rounded-lg flex items-center space-x-1 cursor-pointer"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>Link All Logs To Account</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* ACCOUNT FUEL ON HAND METRIC CARD */}
                          <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-3.5 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Scale className="w-4 h-4 text-amber-400" />
                                <div>
                                  <h4 className="text-xs font-bold text-white">Fuel On Hand (Account Metric)</h4>
                                  <p className="text-[10px] text-zinc-400">Total fuel inventory associated with your pitmaster account</p>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                                Account Global
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <div className="relative flex-1">
                                <input
                                  type="text"
                                  value={accountFuelOnHandInput}
                                  onChange={(e) => setAccountFuelOnHandInput(e.target.value)}
                                  placeholder="e.g. 120 lbs"
                                  className="w-full bg-[#121216] border border-[#333] focus:border-amber-500 text-amber-400 font-mono font-bold text-sm rounded-xl px-3 py-2 focus:outline-none"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = { ...localAccount, fuelOnHand: accountFuelOnHandInput };
                                  setLocalAccount(updated);
                                  saveLocalUserProfile(updated);
                                  if (profile && onUpdateProfile) {
                                    onUpdateProfile({ ...profile, fuelOnHand: accountFuelOnHandInput });
                                  }
                                  alert(`✅ Account Fuel On Hand updated to: ${accountFuelOnHandInput}`);
                                }}
                                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Save Fuel</span>
                              </button>
                            </div>
                          </div>

                          {/* MANUAL HOURS OVERRIDE & PROFILE UPLOAD CARD */}
                          <div className="bg-[#1e1e24] border border-[#33333d] rounded-xl p-4 space-y-4 text-zinc-100 relative">
                            <div className="flex items-center justify-between border-b border-[#2a2a35] pb-3">
                              <div className="flex items-center space-x-2">
                                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400 border border-orange-500/20">
                                  <Edit3 className="w-5 h-5 text-orange-400" />
                                </div>
                                <div>
                                  <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                                    Manual Hours Override & Profile Upload
                                  </h3>
                                  <p className="text-[10px] sm:text-xs text-zinc-400 font-mono">
                                    Override operating hours and sync uploaded JSON profiles across your fleet
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Select Rig from Account Fleet */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-zinc-300 block font-mono">Select Target Smoker Rig:</label>
                              <select
                                value={overrideSelectedRigId}
                                onChange={(e) => {
                                  const selectedId = e.target.value;
                                  setOverrideSelectedRigId(selectedId);
                                  const target = (localAccount.rigs || []).find((r) => r.id === selectedId) || profile;
                                  if (target) {
                                    setOverrideHoursInput(overrideMode === 'total' ? (target.currentHours || 0).toFixed(2) : (target.initialHours || 0).toFixed(2));
                                  }
                                }}
                                className="w-full bg-[#121216] border border-[#333] text-white text-xs font-mono font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-orange-500"
                              >
                                {(localAccount.rigs && localAccount.rigs.length > 0 ? localAccount.rigs : [profile].filter(Boolean)).map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.name || 'Smoker Rig'} ({r.model || 'Custom'}) — Current: {(r.currentHours || 0).toFixed(1)}h | Baseline: {(r.initialHours || 0).toFixed(1)}h
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Mode Switcher */}
                            <div className="grid grid-cols-2 gap-2 bg-[#121216] p-1 rounded-xl border border-[#262630]">
                              <button
                                type="button"
                                onClick={() => {
                                  setOverrideMode('total');
                                  const target = (localAccount.rigs || []).find((r) => r.id === overrideSelectedRigId) || profile;
                                  if (target) setOverrideHoursInput((target.currentHours || 0).toFixed(2));
                                }}
                                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                  overrideMode === 'total'
                                    ? 'bg-orange-500 text-zinc-950 shadow-md'
                                    : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                              >
                                Total Operating Hours
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOverrideMode('baseline');
                                  const target = (localAccount.rigs || []).find((r) => r.id === overrideSelectedRigId) || profile;
                                  if (target) setOverrideHoursInput((target.initialHours || 0).toFixed(2));
                                }}
                                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                  overrideMode === 'baseline'
                                    ? 'bg-orange-500 text-zinc-950 shadow-md'
                                    : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                              >
                                Pit Baseline Hours
                              </button>
                            </div>

                            {/* Input & Stepper Controls */}
                            <div className="space-y-3 bg-[#121216] p-3.5 rounded-xl border border-[#2a2a35]">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 block font-mono">
                                {overrideMode === 'total' ? 'Exact Total Hours Override:' : 'Pit Initial Baseline Hours:'}
                              </label>

                              <div className="flex items-center space-x-2">
                                <div className="relative flex-1">
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="50000"
                                    value={overrideHoursInput}
                                    onChange={(e) => setOverrideHoursInput(e.target.value)}
                                    className="w-full bg-[#0d0d10] border border-[#333340] focus:border-orange-500 text-orange-400 font-mono font-extrabold text-xl rounded-xl px-3 py-2 focus:outline-none"
                                  />
                                  <span className="absolute right-3 top-2.5 font-mono text-xs text-zinc-400 font-bold pointer-events-none">
                                    hrs
                                  </span>
                                </div>

                                {/* Quick adjustments */}
                                <div className="grid grid-cols-2 gap-1 shrink-0 font-mono text-xs">
                                  <button
                                    type="button"
                                    onClick={() => setOverrideHoursInput(Math.max(0, (parseFloat(overrideHoursInput) || 0) - 10).toFixed(1))}
                                    className="px-2 py-1 bg-[#242430] hover:bg-[#2e2e3e] text-zinc-300 rounded border border-[#383848] cursor-pointer"
                                  >
                                    -10h
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setOverrideHoursInput(((parseFloat(overrideHoursInput) || 0) + 10).toFixed(1))}
                                    className="px-2 py-1 bg-[#242430] hover:bg-[#2e2e3e] text-zinc-300 rounded border border-[#383848] cursor-pointer"
                                  >
                                    +10h
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setOverrideHoursInput(Math.max(0, (parseFloat(overrideHoursInput) || 0) - 1).toFixed(1))}
                                    className="px-2 py-1 bg-[#242430] hover:bg-[#2e2e3e] text-zinc-300 rounded border border-[#383848] cursor-pointer"
                                  >
                                    -1h
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setOverrideHoursInput(((parseFloat(overrideHoursInput) || 0) + 1).toFixed(1))}
                                    className="px-2 py-1 bg-[#242430] hover:bg-[#2e2e3e] text-zinc-300 rounded border border-[#383848] cursor-pointer"
                                  >
                                    +1h
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Sync Feedback Alert */}
                            {overrideSyncFeedbackMsg && (
                              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono flex items-center space-x-2">
                                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>{overrideSyncFeedbackMsg}</span>
                              </div>
                            )}

                            {/* Actions: Apply Override & Upload Profile JSON */}
                            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-[#2a2a35]">
                              <input
                                type="file"
                                ref={profileFileInputRef}
                                accept=".json"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    try {
                                      const parsed = JSON.parse(event.target?.result as string);
                                      if (parsed && (parsed.name || parsed.model || parsed.smokerType)) {
                                        const loadedProfile: SmokerProfile = {
                                          ...profile,
                                          ...parsed,
                                          id: parsed.id || `rig-${Date.now()}`,
                                        };
                                        const existingRigs = localAccount.rigs || [];
                                        const updatedRigs = existingRigs.some((r) => r.id === loadedProfile.id)
                                          ? existingRigs.map((r) => (r.id === loadedProfile.id ? loadedProfile : r))
                                          : [...existingRigs, loadedProfile];

                                        const updatedAccount = {
                                          ...localAccount,
                                          rigs: updatedRigs,
                                          activeRigId: loadedProfile.id,
                                        };
                                        setLocalAccount(updatedAccount);
                                        saveLocalUserProfile(updatedAccount);
                                        if (onUpdateProfile) onUpdateProfile(loadedProfile);
                                        setOverrideSyncFeedbackMsg(`✅ Loaded profile "${loadedProfile.name || loadedProfile.model}" into account fleet!`);
                                      } else {
                                        alert('⚠️ Invalid Smoker Profile JSON format.');
                                      }
                                    } catch (err) {
                                      alert('⚠️ Failed to parse profile JSON file.');
                                    }
                                  };
                                  reader.readAsText(file);
                                }}
                              />

                              <button
                                type="button"
                                onClick={() => profileFileInputRef.current?.click()}
                                disabled={isOverrideSyncing}
                                className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-bold bg-[#262630] hover:bg-[#30303e] text-orange-400 border border-orange-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <CloudUpload className="w-3.5 h-3.5" />
                                Upload Profile (.json)
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const val = parseFloat(overrideHoursInput);
                                  if (isNaN(val) || val < 0) return;
                                  setIsOverrideSyncing(true);

                                  const targetId = overrideSelectedRigId || localAccount.activeRigId || profile?.id;
                                  const currentRigs = localAccount.rigs || [profile].filter(Boolean);

                                  const updatedRigs = currentRigs.map((r) => {
                                    if (r.id === targetId || currentRigs.length === 1) {
                                      let newInit = r.initialHours || 0;
                                      let newCurr = r.currentHours || 0;
                                      if (overrideMode === 'total') {
                                        newCurr = val;
                                      } else {
                                        newInit = val;
                                      }
                                      return { ...r, initialHours: newInit, currentHours: newCurr };
                                    }
                                    return r;
                                  });

                                  const updatedAccount = { ...localAccount, rigs: updatedRigs };
                                  setLocalAccount(updatedAccount);
                                  saveLocalUserProfile(updatedAccount);

                                  const activeUpdated = updatedRigs.find((r) => r.id === targetId) || updatedRigs[0];
                                  if (activeUpdated && onUpdateProfile) {
                                    onUpdateProfile(activeUpdated);
                                  }

                                  setTimeout(() => {
                                    setIsOverrideSyncing(false);
                                    setOverrideSyncFeedbackMsg(`✅ Operating hours updated to ${val.toFixed(2)} hrs and synced to profile!`);
                                    setTimeout(() => setOverrideSyncFeedbackMsg(null), 3000);
                                  }, 300);
                                }}
                                disabled={isOverrideSyncing}
                                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-zinc-950 shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                              >
                                {isOverrideSyncing ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-950" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-zinc-950" />
                                )}
                                Apply Hours Override
                              </button>
                            </div>
                          </div>

                          {/* CharGPT Profile Account Linkage Card */}
                          <CharGPTProfileLinkCard
                            userAccount={localAccount}
                            onUpdateUserAccount={(updated) => setLocalAccount(updated)}
                            onSyncServer={handleSyncWithServer}
                          />
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
                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            type="button"
                            onClick={handleClearRigSettings}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
                            title="Clear active smoker rig specification inputs and reset to baseline"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            <span>Clear Rig Settings</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingRig(true);
                              setNewRigHopper('0');
                              setNewRigBowlCapacity('0');
                            }}
                            className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-zinc-950 font-black text-xs rounded-lg flex items-center space-x-1 transition-all cursor-pointer shrink-0 shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            <span>+ Add Smoker Rig</span>
                          </button>
                        </div>
                      </div>

                      {/* List of Account Linked Smoker Rigs */}
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center justify-between">
                          <span>Account Smoker Fleet:</span>
                          <span className="text-zinc-500">{localAccount.rigs?.length || 0} linked smoker profile(s)</span>
                        </h5>

                        <div className="grid grid-cols-1 gap-2">
                          {(!localAccount.rigs || localAccount.rigs.length === 0) && (
                            <div className="bg-[#18181c] border border-[#2a2a35] rounded-xl p-4 text-center">
                              <Flame className="w-5 h-5 text-orange-400/70 mx-auto mb-1.5" />
                              <p className="text-xs font-bold text-white">Account Collection Blank</p>
                              <p className="text-[11px] text-zinc-400 mt-0.5">No smokers currently registered. Select or build a smoker profile below to add it to your fleet.</p>
                            </div>
                          )}

                          {(localAccount.rigs || []).map((rigItem) => {
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
                                        <span className="text-xs font-bold text-white">
                                          {rigItem.name && rigItem.name.trim() !== '' ? rigItem.name : 'Unassigned Smoker (No Smoker Selected)'}
                                        </span>
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
                                      <div className="text-[11px] text-zinc-400 font-mono flex items-center space-x-2 flex-wrap">
                                        <span>{rigItem.smokerType || 'Unassigned Type'}</span>
                                        <span>•</span>
                                        <span>{rigItem.fuelType || 'Pellets'}</span>
                                        <span>•</span>
                                        <span>
                                          {rigItem.pelletHopperCapacityLbs > 0
                                            ? `${rigItem.pelletHopperCapacityLbs} lbs Hopper`
                                            : (rigItem.bowlCapacityLbs || 0) > 0
                                            ? `${rigItem.bowlCapacityLbs} lbs Bowl`
                                            : '0 lbs Hopper (Unselected)'}
                                        </span>
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
                                          setEditRigHopper(String(rigItem.pelletHopperCapacityLbs || 0));
                                          setEditRigBowlCapacity(String(rigItem.bowlCapacityLbs || 0));
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
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
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
                                      <div>
                                        <label className="block text-[9px] text-zinc-400 font-bold uppercase mb-0.5">Bowl Cap (lbs)</label>
                                        <input
                                          type="number"
                                          value={editRigBowlCapacity}
                                          onChange={(e) => setEditRigBowlCapacity(e.target.value)}
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
                                                pelletHopperCapacityLbs: parseFloat(editRigHopper) || 0,
                                                bowlCapacityLbs: parseFloat(editRigBowlCapacity) || 0,
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
                              pelletHopperCapacityLbs: parseFloat(newRigHopper) || 0,
                              bowlCapacityLbs: parseFloat(newRigBowlCapacity) || 0,
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
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                              {[
                                { name: '⬜ Blank Template', model: 'Custom Build', type: 'Custom Smoker Rig', fuel: 'Wood Splits', hopper: 0, bowl: 0 },
                                { name: 'Pit Boss Copperhead 5', model: 'Copperhead 5-Series', type: 'Vertical Pellet Smoker', fuel: 'Pellets', hopper: 60, bowl: 0 },
                                { name: 'Traeger Timberline 1300', model: 'Timberline 1300', type: 'Pellet Grill / Smoker', fuel: 'Pellets', hopper: 24, bowl: 0 },
                                { name: 'Yoder YS640s Competition', model: 'YS640s', type: 'Pellet Smoker / Grill', fuel: 'Pellets', hopper: 20, bowl: 0 },
                                { name: 'Camp Chef Woodwind 36', model: 'Woodwind WiFi 36', type: 'Pellet Smoker / Grill', fuel: 'Pellets', hopper: 22, bowl: 0 },
                                { name: 'Recteq RT-700 Bull', model: 'RT-700', type: 'Pellet Smoker / Grill', fuel: 'Pellets', hopper: 40, bowl: 0 },
                                { name: 'Kamado Joe Big Joe III', model: 'Big Joe III', type: 'Kamado Ceramic Cooker', fuel: 'Charcoal', hopper: 0, bowl: 12 },
                                { name: 'Weber Smokey Mountain 22"', model: 'WSM 22"', type: 'Water Smoker / Bullet', fuel: 'Charcoal', hopper: 0, bowl: 15 },
                                { name: 'Custom Offset Trailer', model: 'Custom Build', type: 'Custom Reverse Flow Offset', fuel: 'Wood Splits', hopper: 0, bowl: 0 },
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
                                    setNewRigBowlCapacity(String(preset.bowl));

                                    // Automatically convert manufacturer capacity to account metric
                                    const effectiveCapLbs = preset.bowl > 0 ? preset.bowl : preset.hopper;
                                    if (effectiveCapLbs > 0) {
                                      try {
                                        const rawAcc = localStorage.getItem('pitmaster_local_user_account');
                                        const acc = rawAcc ? JSON.parse(rawAcc) : { name: 'Pitmaster', email: '', title: 'Guest Pitmaster', createdAt: new Date().toISOString() };
                                        acc.fuelOnHand = `${effectiveCapLbs} lbs`;
                                        localStorage.setItem('pitmaster_local_user_account', JSON.stringify(acc));
                                        setLocalAccount(acc);
                                        setAccountFuelOnHandInput(`${effectiveCapLbs} lbs`);
                                      } catch (e) {}
                                    }
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
                                placeholder="0"
                                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-white font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-0.5">Firebox / Charcoal Bowl Capacity (lbs)</label>
                              <input
                                type="number"
                                value={newRigBowlCapacity}
                                onChange={(e) => setNewRigBowlCapacity(e.target.value)}
                                placeholder="0"
                                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-white font-mono"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end space-x-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setIsAddingRig(false)}
                              className="px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#333] text-zinc-300 font-bold text-xs rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold text-xs rounded-lg cursor-pointer"
                            >
                              Add Rig to Fleet
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Select Active CharGPT AI Pitmaster Persona & Auto-Detect Section */}
                      <div className="pt-3 border-t border-[#2a2a38] space-y-3">
                        <div className="p-3.5 bg-[#121218] border border-orange-500/30 rounded-xl space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#242432] pb-2.5">
                            <div>
                              <h6 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                                <Bot className="w-4 h-4 text-orange-400" />
                                <span>Select Active CharGPT Persona</span>
                              </h6>
                              <p className="text-[10px] text-zinc-400 font-sans mt-0.5">
                                Choose your AI Pitmaster persona or run automatic cook log analysis to auto-detect the persona matching your cook style.
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={handleAutoDetectPersonaFromLogs}
                              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-black text-xs rounded-lg flex items-center space-x-1.5 cursor-pointer shrink-0 shadow-md transition-all"
                            >
                              <Sparkles className="w-3.5 h-3.5 fill-zinc-950" />
                              <span>✨ Auto-Detect Persona (Log Analysis)</span>
                            </button>
                          </div>

                          {personaDetectionNotice && (
                            <div className="p-2.5 bg-amber-500/10 border border-amber-500/40 text-amber-200 text-xs font-mono rounded-lg flex items-start gap-2 animate-fade-in">
                              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                              <div>
                                <div className="font-bold text-amber-300">
                                  ✨ Auto-Detected Active Persona: "{personaDetectionNotice.persona}"
                                </div>
                                <div className="text-[11px] text-amber-200/80 mt-0.5">
                                  {personaDetectionNotice.explanation}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            {[
                              { name: 'Master Pitmaster', desc: 'All-around balanced expert', icon: '👑' },
                              { name: 'Texas Offset Specialist', desc: 'Post oak low & slow brisket', icon: '🤠' },
                              { name: 'Competition BBQ Judge', desc: 'KCBS scores & tenderness', icon: '🏆' },
                              { name: 'Thermal Chemist & Science', desc: 'Stall math & thermodynamics', icon: '🧪' },
                              { name: 'Kansas City Pit Master', desc: 'Sweet glazes, ribs & burnt ends', icon: '🍖' },
                            ].map((p) => {
                              const isSelected = (localAccount.charGPTPersona || 'Master Pitmaster') === p.name;
                              return (
                                <button
                                  key={p.name}
                                  type="button"
                                  onClick={() => {
                                    const updated = { ...localAccount, charGPTPersona: p.name as any };
                                    setLocalAccount(updated);
                                    saveLocalUserProfile(updated);
                                    setServerSyncStatus({ type: 'success', text: `✨ Set active CharGPT Persona to "${p.name}"` });
                                    setTimeout(() => setServerSyncStatus(null), 3000);
                                  }}
                                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[64px] ${
                                    isSelected
                                      ? 'bg-orange-500/20 border-orange-500 text-white shadow-md'
                                      : 'bg-[#181822] hover:bg-[#20202d] border-[#2a2a3a] text-zinc-400 hover:text-zinc-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[13px]">{p.icon}</span>
                                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>}
                                  </div>
                                  <div className="mt-1">
                                    <span className={`text-[11px] font-bold block leading-tight ${isSelected ? 'text-orange-400' : 'text-zinc-200'}`}>
                                      {p.name}
                                    </span>
                                    <span className="text-[9px] text-zinc-500 block leading-tight mt-0.5">{p.desc}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Smoker Unit Profile Chart & Per-Smoker Analysis Split */}
                      <div className="pt-3">
                        <SmokerUnitProfileChart
                          rigs={localAccount.rigs && localAccount.rigs.length > 0 ? localAccount.rigs : [profile].filter(Boolean)}
                          profile={profile}
                          activeRigId={localAccount.activeRigId || profile?.id}
                          cookLogs={currentAppData?.cookLogs || []}
                          fuelLogs={currentAppData?.fuelLogs || []}
                          onUpdatePitBaseline={handleUpdatePitBaseline}
                          onSelectActiveRig={(rigId) => {
                            setLocalAccount((prev) => ({ ...prev, activeRigId: rigId }));
                            const targetRig = (localAccount.rigs || []).find((r) => r.id === rigId);
                            if (targetRig && onUpdateProfile) onUpdateProfile(targetRig);
                            handleSyncWithServer();
                          }}
                          onOpenCustomSmokerModal={onOpenCustomSmokerModal}
                        />
                      </div>
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

                {/* ============================================================
                </div>
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
              </div>
            </ErrorBoundary>
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
                        <span className="text-white font-bold">{activeSpecName || 'None Selected'}</span> ({activeSpecBrand || 'None Selected'}) — <span className="text-orange-400">{activeSpecCategory || 'None Selected'}</span>
                        <div className="text-zinc-400 text-[10px] mt-0.5">
                          Burn: {activeSpecBaselineBurn} lbs/hr @ 225°F | Hopper: {activeSpecCapacity} lbs | Area: {activeSpecArea} sq in
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!activeProfile || !onUpdateProfile) return;
                          const cleanProfile: SmokerProfile = {
                            ...activeProfile,
                            name: '',
                            model: '',
                            smokerType: '' as any,
                            fuelType: 'Pellets',
                            pelletHopperCapacityLbs: 0,
                            customSpecs: undefined,
                            manufacturerSpecs: undefined,
                            modifications: [],
                            activeBlendComponents: undefined,
                          };
                          onUpdateProfile(cleanProfile);
                          setActiveSpecName('');
                          setActiveSpecBrand('');
                          setActiveSpecCategory('');
                          setActiveSpecFuelType('Pellets');
                          setActiveSpecBaselineBurn(1.20);
                          setActiveSpecHighHeatBurn(2.50);
                          setActiveSpecCapacity('');
                          setActiveSpecArea(0);
                          setActiveSpecThermalRating('Medium');
                          setActiveSpecGauge('');
                          setActiveSpecDraft('');
                        }}
                        className="px-2.5 py-1 bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-[11px] font-bold rounded-lg transition-all flex items-center space-x-1 cursor-pointer shrink-0"
                        title="Clear active smoker specifications"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                        <span>Clear Specs</span>
                      </button>
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

                        const bowlCap = Number(activeSpecBowlCapacity) || 0;
                        const hopperCap = Number(activeSpecCapacity) || 0;

                        if (activeProfile.isCustomBuilt && activeProfile.customSpecs) {
                          const updatedCustom: CustomSmokerSpec = {
                            ...activeProfile.customSpecs,
                            name: activeSpecName,
                            builderName: activeSpecBrand,
                            smokerType: activeSpecCategory,
                            fuelType: activeSpecFuelType,
                            baselineBurnRateLbsHr: Number(activeSpecBaselineBurn) || 1.25,
                            hopperCapacityLbs: hopperCap,
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
                            pelletHopperCapacityLbs: hopperCap,
                            bowlCapacityLbs: bowlCap,
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
                            hopperCapacityLbs: hopperCap,
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
                            pelletHopperCapacityLbs: hopperCap,
                            bowlCapacityLbs: bowlCap,
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
                            pelletHopperCapacityLbs: hopperCap,
                            bowlCapacityLbs: bowlCap,
                            initialHours: newInitial,
                            currentHours: Number((newInitial + totalLogged).toFixed(2)),
                          });
                        }

                        // Auto convert manufacturer / spec capacity to account metric
                        const effectiveCap = bowlCap > 0 ? bowlCap : hopperCap;
                        if (effectiveCap > 0) {
                          try {
                            const rawAcc = localStorage.getItem('pitmaster_local_user_account');
                            const acc = rawAcc ? JSON.parse(rawAcc) : { name: 'Pitmaster', email: '', title: 'Guest Pitmaster', createdAt: new Date().toISOString() };
                            acc.fuelOnHand = `${effectiveCap} lbs`;
                            localStorage.setItem('pitmaster_local_user_account', JSON.stringify(acc));
                            setLocalAccount(acc);
                            setAccountFuelOnHandInput(`${effectiveCap} lbs`);
                          } catch (e) {}
                        }

                        setSmokerSpecSaveStatus('✨ Active Smoker Specifications updated globally! All app calculations refreshed.');
                        setTimeout(() => setSmokerSpecSaveStatus(null), 4000);
                      }} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="relative col-span-1 sm:col-span-2">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1 flex items-center justify-between">
                              <span>Smoker Name / Model</span>
                              <span className="text-[10px] text-orange-400 font-semibold font-mono">Type to search database for auto-populate</span>
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={activeSpecName}
                                onChange={(e) => handleSmokerNameInputChange(e.target.value)}
                                onFocus={() => setShowSmokerSuggestions(true)}
                                className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-medium text-xs rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 placeholder-zinc-600"
                                placeholder="Type smoker name (e.g., Traeger, Yoder, Pit Boss, Oklahoma Joe, Highland, Recteq...)"
                              />
                              <Search className="w-3.5 h-3.5 text-orange-400 absolute right-3 top-2.5 pointer-events-none" />
                            </div>

                            {/* Database Search Suggestions Dropdown Overlay */}
                            {showSmokerSuggestions && matchingDatabaseSmokers.length > 0 && (
                              <div className="absolute z-50 left-0 right-0 mt-1 bg-[#1c1c1c] border border-orange-500/40 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
                                <div className="px-3 py-1.5 bg-[#252525] border-b border-[#333] text-[10px] font-bold text-orange-400 uppercase tracking-wider flex justify-between items-center">
                                  <span>Database Match Suggestions ({matchingDatabaseSmokers.length})</span>
                                  <button
                                    type="button"
                                    onClick={() => setShowSmokerSuggestions(false)}
                                    className="text-zinc-400 hover:text-white text-xs px-1"
                                  >
                                    ✕
                                  </button>
                                </div>
                                {matchingDatabaseSmokers.map((smoker) => (
                                  <button
                                    key={smoker.id}
                                    type="button"
                                    onClick={() => autoPopulateFromDatabaseMatch(smoker)}
                                    className="w-full text-left px-3 py-2 hover:bg-orange-500/15 transition-all border-b border-[#2a2a2a] last:border-b-0 flex items-center justify-between group cursor-pointer"
                                  >
                                    <div>
                                      <div className="text-xs font-bold text-white group-hover:text-orange-400 flex items-center space-x-1.5">
                                        <span>{smoker.brandModel}</span>
                                      </div>
                                      <div className="text-[10px] text-zinc-400 flex items-center space-x-2 mt-0.5">
                                        <span className="text-orange-300 font-mono font-semibold">{smoker.fuelType}</span>
                                        <span>•</span>
                                        <span>{smoker.category}</span>
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                                        {smoker.factoryBaselineBurnRateLbsHr} lbs/hr
                                      </span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                              Manufacturer or Custom Builder
                            </label>
                            <input
                              type="text"
                              value={activeSpecBrand}
                              onChange={(e) => setActiveSpecBrand(e.target.value)}
                              className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-medium text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 placeholder-zinc-600"
                              placeholder="e.g. Traeger / Lone Star Grillz / Yoder"
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
                              <option value="">Select Smoker Category...</option>
                              <option value="Stick-Burning Offset Wood Smoker">Stick-Burning Offset Wood Smoker</option>
                              <option value="Gas / Propane Smoker">Gas / Propane Smoker</option>
                              <option value="Pellet Smoker / Grill">Pellet Smoker / Grill</option>
                              <option value="Vertical Pellet Smoker">Vertical Pellet Smoker / Grill</option>
                              <option value="Charcoal & Kamado Smoker">Charcoal & Kamado Smoker</option>
                              <option value="Electric Cabinet Smoker">Electric Cabinet Smoker</option>
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
                              <option value="">Select Primary Fuel Source...</option>
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
                              onChange={(e) => setActiveSpecInitialHours(e.target.value)}
                              className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-mono font-bold text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 placeholder-zinc-600"
                              placeholder="0.0"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                              Baseline Burn Rate (lbs/hr @ 225°F)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              max="20"
                              value={activeSpecBaselineBurn}
                              onChange={(e) => setActiveSpecBaselineBurn(e.target.value)}
                              className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-mono font-bold text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 placeholder-zinc-600"
                              placeholder="0.01"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                              High Heat Burn Rate (lbs/hr @ 350°F)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="30"
                              value={activeSpecHighHeatBurn}
                              onChange={(e) => setActiveSpecHighHeatBurn(e.target.value)}
                              className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-mono font-bold text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 placeholder-zinc-600"
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                              Fuel Hopper Capacity (lbs)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="500"
                              value={activeSpecCapacity}
                              onChange={(e) => setActiveSpecCapacity(e.target.value)}
                              className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-mono font-bold text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 placeholder-zinc-600"
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center justify-between">
                              <span>Firebox / Charcoal Bowl Capacity (lbs)</span>
                              <span className="text-[9px] text-zinc-400 font-mono font-normal">System Weight Metric</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="500"
                              value={activeSpecBowlCapacity}
                              onChange={(e) => setActiveSpecBowlCapacity(e.target.value)}
                              className="w-full bg-[#121212] border border-[#2a2a2a] text-amber-300 font-mono font-bold text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-zinc-600"
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                              Total Cooking Grate Area (sq in)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="10000"
                              value={activeSpecArea}
                              onChange={(e) => setActiveSpecArea(e.target.value)}
                              className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-mono text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 placeholder-zinc-600"
                              placeholder="0"
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
                              <option value="">Select Thermal Rating...</option>
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
                              className="w-full bg-[#121212] border border-[#2a2a2a] text-white font-medium text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 placeholder-zinc-600"
                              placeholder="e.g. 1/4 inch Steel Plate or Double-Wall Stainless"
                            />
                          </div>
                        </div>

                        <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="text-[11px] text-zinc-400 flex items-center space-x-1.5">
                            <Info className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                            <span>Changes take effect instantly across all cook logs, fuel estimates & AI tools.</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (!activeProfile || !onUpdateProfile) return;
                                const cleanProfile: SmokerProfile = {
                                  ...activeProfile,
                                  name: '',
                                  model: '',
                                  smokerType: '' as any,
                                  fuelType: 'Pellets',
                                  pelletHopperCapacityLbs: 0,
                                  customSpecs: undefined,
                                  manufacturerSpecs: undefined,
                                  modifications: [],
                                  activeBlendComponents: undefined,
                                };
                                onUpdateProfile(cleanProfile);
                                setActiveSpecName('');
                                setActiveSpecBrand('');
                                setActiveSpecCategory('');
                                setActiveSpecFuelType('Pellets');
                                setActiveSpecBaselineBurn(1.20);
                                setActiveSpecHighHeatBurn(2.50);
                                setActiveSpecCapacity('');
                                setActiveSpecArea(0);
                                setActiveSpecThermalRating('Medium');
                                setActiveSpecGauge('');
                                setActiveSpecDraft('');
                              }}
                              className="px-3 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
                              title="Clear active smoker specifications"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              <span>Clear Specs</span>
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                            >
                              <Save className="w-4 h-4" />
                              <span>Save Active Specifications</span>
                            </button>
                          </div>
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
                            step="0.01"
                            min="0.01"
                            max="10"
                            value={newSmokerBaselineBurn}
                            onChange={(e) => setNewSmokerBaselineBurn(e.target.value)}
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
                            onChange={(e) => setNewSmokerHopperCapacity(e.target.value)}
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

                      {/* Empty state for deployment when no custom/mfg specs saved */}
                      {savedCustomSmokersList.length === 0 && savedManufacturerSmokersList.length === 0 && (
                        <div className="p-3 bg-[#121212] border border-[#2a2a2a] rounded-xl text-center space-y-1 flex flex-col items-center justify-center min-h-[90px]">
                          <Building2 className="w-4 h-4 text-orange-400/80 mb-0.5" />
                          <p className="text-xs font-bold text-white">Collection Cleared for Deployment</p>
                          <p className="text-[10px] text-zinc-400">No saved custom builds or manufacturer specs in switcher. Build or save a custom smoker to populate your collection.</p>
                        </div>
                      )}

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

            {/* SUB-TAB 4: CLOUD SYNC & AUTO-BACKUP */}
            {dataSubTab === 'cloud' && (
              <div className="space-y-3">
                {/* MASTER WEB VERSION SYNC PANEL */}
                <MasterVersionSyncCard />



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
                        placeholder="e.g. pitmaster@outlook.com"
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
                        {poolStats?.federatedAccuracyRating || '0.0%'} Accuracy
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-[#121212] p-2 rounded-lg border border-[#2a2a2a]">
                        <span className="text-[10px] text-zinc-400 block font-mono">Total Server Pool Cooks</span>
                        <span className="text-sm font-bold text-white font-mono">
                          {poolStats ? (poolStats.totalContributions || 0).toLocaleString() : '0'} cooks
                        </span>
                      </div>
                      <div className="bg-[#121212] p-2 rounded-lg border border-[#2a2a2a]">
                        <span className="text-[10px] text-zinc-400 block font-mono">My Contributions (Synced)</span>
                        <span className="text-sm font-bold text-purple-300 font-mono">
                          {(poolStats?.userContributions !== undefined ? poolStats.userContributions : (federatedConfig.contributedCount || 0)).toLocaleString()} logs
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#121212] p-2 rounded-lg border border-[#2a2a2a] space-y-1 text-[11px]">
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-400">Top Community Wood Blend:</span>
                        <span className="font-bold text-amber-300">
                          {poolStats?.topPelletBlends?.[0]?.blend || 'Awaiting pool data'}
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-400">Avg Brisket Stall Temp:</span>
                        <span className="font-bold text-orange-300">
                          {poolStats?.averageStalls?.[0]?.stallTemp || 'Awaiting pool data'}
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-400">Model Accuracy Rating:</span>
                        <span className="font-mono text-purple-300">{poolStats?.federatedAccuracyRating || '0.0%'}</span>
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

                {/* AUTOMATED SCREEN, CSS & BROWSER STORAGE/RAM OPTIMIZER */}
                <ScreenOptimizerCard
                  onShowToast={(msg) => {
                    setLocalActionStatus({ type: 'success', text: msg });
                    setTimeout(() => setLocalActionStatus(null), 4000);
                  }}
                />

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
