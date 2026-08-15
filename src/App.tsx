import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { SmokerProfile, CookLog, FuelLog, CustomSmokerSpec, ManufacturerSmokerSpec, LowPowerModeSettings } from './types';
import {
  loadSmokerProfile,
  saveSmokerProfile,
  loadCookLogs,
  saveCookLogs,
  loadFuelLogs,
  saveFuelLogs,
  resetAllDataToDefault,
  loadLowPowerMode,
  saveLowPowerMode,
  checkAndRunAutoCacheClear,
  loadDeletedCookLogIds,
  saveDeletedCookLogIds,
  addDeletedCookLogId,
  INITIAL_CHARGPT_MEMORY,
  loadCharGPTMemory,
  saveCharGPTMemory,
} from './utils/storage';
import { checkAndUpdateRetailerPricesOnline } from './utils/retailerPriceSync';
import { RecipeSuggestion } from './data/recipeSuggestions';
import { INITIAL_SMOKER_PROFILE } from './data/mockData';
import { APP_NAME, AI_NAME, AI_PITMASTER_NAME } from './constants/appName';
import { initAuth, saveToGoogleDrive, getAccessToken, logout } from './lib/driveSync';
import { loadUserBundleFromFirestore, saveUserBundleToFirestore, SyncStateStatus } from './lib/firestoreData';
import { Navbar, AppTab, SettingsDestination } from './components/Navbar';
import { SmokerOverviewBanner } from './components/SmokerOverviewBanner';
import { HomeCommandCenter } from './components/HomeCommandCenter';
import { BrowserInstallShareWidget } from './components/BrowserInstallShareWidget';
import { ReleaseUpdateBanner } from './components/ReleaseUpdateBanner';
import { startAuthoritativePlatformSync } from './lib/platformSync';
import { startAutomaticReleaseUpdates } from './services/releaseUpdateService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SmokeStackSplashScreen } from './components/SmokeStackSplashScreen';
import { FireTVToastOverlay } from './components/FireTVToastOverlay';
import { GoogleHomeToastOverlay } from './components/GoogleHomeToastOverlay';
import {
  UserAuthSession,
  getActiveUserSession,
  saveActiveUserSession,
  clearActiveUserSession,
} from './utils/userAuthSession';

import {
  autoOptimizeScreenOnLoadAndResize,
} from './utils/screenOptimizer';

import { SmokerHours } from './services/smokerSyncService';

const AnalyticsDashboard = React.lazy(() => import('./components/AnalyticsDashboard').then((module) => ({ default: module.AnalyticsDashboard })));
const CookLogList = React.lazy(() => import('./components/CookLogList').then((module) => ({ default: module.CookLogList })));
const CookLogForm = React.lazy(() => import('./components/CookLogForm').then((module) => ({ default: module.CookLogForm })));
const CookPlanner = React.lazy(() => import('./components/CookPlanner').then((module) => ({ default: module.CookPlanner })));
const FuelAndMaintenance = React.lazy(() => import('./components/FuelAndMaintenance').then((module) => ({ default: module.FuelAndMaintenance })));
const FuelMarketTracker = React.lazy(() => import('./components/FuelMarketTracker').then((module) => ({ default: module.FuelMarketTracker })));
const AIPitmasterModal = React.lazy(() => import('./components/AIPitmasterModal').then((module) => ({ default: module.AIPitmasterModal })));
const CookLogSheetModal = React.lazy(() => import('./components/CookLogSheetModal').then((module) => ({ default: module.CookLogSheetModal })));
const CookCertificateModal = React.lazy(() => import('./components/CookCertificateModal').then((module) => ({ default: module.CookCertificateModal })));
const GoogleDriveSyncModal = React.lazy(() => import('./components/GoogleDriveSyncModal').then((module) => ({ default: module.GoogleDriveSyncModal })));
const UniversalSyncDashboardModal = React.lazy(() => import('./components/UniversalSyncDashboardModal').then((module) => ({ default: module.UniversalSyncDashboardModal })));
const SettingsModal = React.lazy(() => import('./components/SettingsModal').then((module) => ({ default: module.SettingsModal })));
const CustomSmokerModal = React.lazy(() => import('./components/CustomSmokerModal').then((module) => ({ default: module.CustomSmokerModal })));
const MasterAdminDashboardModal = React.lazy(() => import('./components/MasterAdminDashboardModal').then((module) => ({ default: module.MasterAdminDashboardModal })));
const AppDownloadStoreModal = React.lazy(() => import('./components/AppDownloadStoreModal').then((module) => ({ default: module.AppDownloadStoreModal })));
const UserLoginGateModal = React.lazy(() => import('./components/UserLoginGateModal').then((module) => ({ default: module.UserLoginGateModal })));
const TermsOfServiceModal = React.lazy(() => import('./components/TermsOfServiceModal').then((module) => ({ default: module.TermsOfServiceModal })));

export default function App() {
  const [profile, setProfile] = useState<SmokerProfile>(loadSmokerProfile);
  const [cookLogs, setCookLogs] = useState<CookLog[]>(loadCookLogs);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>(loadFuelLogs);

  // Global Temperature Unit (°F or °C)
  const [tempUnit, setTempUnit] = useState<'F' | 'C'>(() => {
    return (localStorage.getItem('smoker_temp_unit') as 'F' | 'C') || 'F';
  });

  const toggleTempUnit = () => {
    const nextUnit = tempUnit === 'F' ? 'C' : 'F';
    setTempUnit(nextUnit);
    localStorage.setItem('smoker_temp_unit', nextUnit);
    showToast(`Switched temperature display unit to °${nextUnit}`);
  };

  // Additional Togglable App Settings - Default to Dark Pitmaster Aesthetic
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    localStorage.setItem('smoker_theme_mode', 'dark');
    return 'dark';
  });

  const [isColorblind, setIsColorblind] = useState<boolean>(() => {
    return localStorage.getItem('smoker_colorblind_mode') === 'true';
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('smoker_sound_enabled') !== 'false';
  });

  const [forceOffline, setForceOffline] = useState<boolean>(() => {
    return localStorage.getItem('smoker_force_offline') === 'true';
  });

  const [autoSyncDrive, setAutoSyncDrive] = useState<boolean>(() => {
    return localStorage.getItem('smoker_auto_sync') === 'true';
  });

  // Low Power & Performance Mode State
  const [lowPowerSettings, setLowPowerSettings] = useState<LowPowerModeSettings>(() => loadLowPowerMode());

  const toggleLowPowerMode = (subKey?: keyof LowPowerModeSettings) => {
    let updated: LowPowerModeSettings;
    if (!subKey) {
      updated = { ...lowPowerSettings, enabled: !lowPowerSettings.enabled };
    } else {
      updated = { ...lowPowerSettings, [subKey]: !lowPowerSettings[subKey] };
    }
    setLowPowerSettings(updated);
    saveLowPowerMode(updated);
    showToast(
      updated.enabled
        ? '⚡ Low Power Mode Enabled (Battery saver, animations reduced)'
        : '🔋 Standard High-Performance Mode Restored'
    );
  };

  const toggleThemeMode = () => {
    const nextTheme = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextTheme);
    localStorage.setItem('smoker_theme_mode', nextTheme);
    showToast(nextTheme === 'light' ? '☀️ Light theme enabled' : '🌙 Dark theme enabled');
  };

  const toggleColorblind = () => {
    const next = !isColorblind;
    setIsColorblind(next);
    localStorage.setItem('smoker_colorblind_mode', String(next));
    showToast(next ? '👁️ Colorblind & High Contrast mode enabled' : '👁️ Standard palette restored');
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('smoker_sound_enabled', String(next));
    showToast(next ? '🔔 Audio alerts & probe chimes enabled' : '🔕 Audio alerts muted');
  };

  const toggleForceOffline = () => {
    const next = !forceOffline;
    setForceOffline(next);
    localStorage.setItem('smoker_force_offline', String(next));
    showToast(next ? '⚡ Force Offline Mode enabled (Field usage mode)' : '🌐 Network connectivity restored');
  };

  const toggleAutoSync = () => {
    const next = !autoSyncDrive;
    setAutoSyncDrive(next);
    localStorage.setItem('smoker_auto_sync', String(next));
    showToast(next ? '☁️ Auto Google Drive sync enabled' : '☁️ Manual cloud sync mode');
  };

  const [autoSyncNewCooks, setAutoSyncNewCooks] = useState<boolean>(() => {
    const saved = localStorage.getItem('smoker_auto_sync_new_cooks');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleAutoSyncNewCooks = () => {
    const next = !autoSyncNewCooks;
    setAutoSyncNewCooks(next);
    localStorage.setItem('smoker_auto_sync_new_cooks', String(next));
    showToast(next ? '⚡ Auto-sync new cook logs to cloud enabled' : '💾 Manual upload mode enabled (Cooks save locally to account)');
  };

  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const activeTabRef = useRef<AppTab>(activeTab);
  const [selectedSheetCook, setSelectedSheetCook] = useState<CookLog | null>(null);
  const [selectedCertificateCook, setSelectedCertificateCook] = useState<CookLog | null>(null);
  const [prefilledRecipe, setPrefilledRecipe] = useState<RecipeSuggestion | null>(null);
  const [editingCook, setEditingCook] = useState<CookLog | null>(null);
  const [aiInitialCookId, setAiInitialCookId] = useState<string | null>(null);

  const handleEditCook = (cook: CookLog) => {
    setEditingCook(cook);
    setPrefilledRecipe(null);
    handleTabChange('new-cook');
  };
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Connection & Offline auto-reconnect sync state
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStateStatus>('pending');

  useEffect(() => {
    // Automated screen optimization for all users (logged-in or guest)
    const cleanupOptimizer = autoOptimizeScreenOnLoadAndResize();

    // Run 30-day auto-defragmentation check within 70 MB allocated Smoke Stack storage space
    const defragRes = checkAndRunAutoCacheClear();
    if (defragRes.ran && defragRes.message) {
      showToast(defragRes.message);
    }

    // Run 24-hour retail price data update check on mount
    const syncRes = checkAndUpdateRetailerPricesOnline();
    if (syncRes.updated) {
      showToast(syncRes.message);
    }

    const handleOnline = () => {
      setIsOnline(true);
      if (currentUser?.uid) {
        showToast('Network restored. Verifying account synchronization…');
        setSyncStatus('syncing');
        saveUserBundleToFirestore(currentUser.uid, {
          profile,
          cookLogs,
          fuelLogs,
          charGPTMemory: loadCharGPTMemory(),
        })
          .then((success) => {
            if (success) {
              setSyncStatus('synced');
              showToast('✅ Cloud synchronization verified.');
            } else {
              setSyncStatus('error');
              showToast('⚠️ Reconnected, but pending offline changes could not be saved to cloud.');
            }
          })
          .catch(() => {
            setSyncStatus('error');
            showToast('⚠️ Synchronization error occurred on reconnect.');
          });
      } else {
        setSyncStatus('pending');
      }
      const res = checkAndUpdateRetailerPricesOnline();
      if (res.updated) {
        showToast(res.message);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
      showToast('⚡ Offline Mode active. Changes will be queued locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      cleanupOptimizer();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Animated Splash Screen State
  const [showSplashScreen, setShowSplashScreen] = useState(true);

  // Settings, Custom Smokers, Master Admin, Google Drive & Download App Modal States
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsDestination>('root');
  const [isCustomSmokerModalOpen, setIsCustomSmokerModalOpen] = useState(false);
  const [isMasterAdminModalOpen, setIsMasterAdminModalOpen] = useState(false);
  const [isDownloadStoreModalOpen, setIsDownloadStoreModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isSyncDashboardOpen, setIsSyncDashboardOpen] = useState(false);

  // User Auth & Remember Me Session State
  const [userSession, setUserSession] = useState<UserAuthSession | null>(() => getActiveUserSession(null));
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(() => !getActiveUserSession(null));
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('pitmaster_terms_accepted') === null;
  });

  // Auto-sync session when currentUser email changes or on initial launch
  useEffect(() => {
    const active = getActiveUserSession(currentUser?.email);
    if (active) {
      setUserSession(active);
      setIsLoginModalOpen(false);
    } else {
      setUserSession(null);
      setIsLoginModalOpen(true);
    }
  }, [currentUser?.email]);

  const handleUserLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    clearActiveUserSession();
    saveDeletedCookLogIds([]);
    setUserSession(null);
    setCurrentUser(null);
    setAccessToken(null);
    setSyncStatus('pending');
    setProfile({ ...INITIAL_SMOKER_PROFILE });
    setCookLogs([]);
    setFuelLogs([]);
    setIsSettingsModalOpen(false);
    setIsDriveModalOpen(false);
    setIsSyncDashboardOpen(false);
    setIsLoginModalOpen(true);
    showToast('🔒 Logged out of account. Please sign in to continue.');
  };

  // Synchronize Raspberry Pi Low-Power Mode DOM optimizations
  useEffect(() => {
    if (lowPowerSettings.raspberryPiMode) {
      document.documentElement.classList.add('raspberry-pi-mode');
    } else {
      document.documentElement.classList.remove('raspberry-pi-mode');
    }
    if (lowPowerSettings.piKioskTouchTargets) {
      document.documentElement.classList.add('pi-touch-kiosk');
    } else {
      document.documentElement.classList.remove('pi-touch-kiosk');
    }
  }, [lowPowerSettings.raspberryPiMode, lowPowerSettings.piKioskTouchTargets]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);

        const userEmail = user.email || '';
        const session: UserAuthSession = {
          id: user.uid,
          email: userEmail,
          name: user.displayName || userEmail.split('@')[0] || 'Pitmaster',
          title: 'Pitmaster',
          provider: 'google',
          rememberMe: true,
          isMasterAdmin: false,
          loggedInAt: new Date().toISOString(),
        };

        saveActiveUserSession(session, true);
        setUserSession(session);
        setIsLoginModalOpen(false);

        user.getIdToken().then((idToken) => fetch('/api/admin/me', {
          headers: { Authorization: `Bearer ${idToken}` },
        })).then(async (roleRes) => {
          if (!roleRes.ok) return;
          const roleData = await roleRes.json();
          const verifiedSession: UserAuthSession = {
            ...session,
            title: roleData?.role === 'owner' ? 'Owner' : roleData?.role === 'admin' ? 'Administrator' : 'Pitmaster',
            isMasterAdmin: roleData?.permissions?.admin === true,
          };
          setUserSession(verifiedSession);
          saveActiveUserSession(verifiedSession, true);
        }).catch(() => {});

        // Account isolation: never seed a newly authenticated account from an
        // unscoped browser cache that may belong to a previous user.
        const cleanProfile: SmokerProfile = { ...INITIAL_SMOKER_PROFILE };
        setProfile(cleanProfile);
        setCookLogs([]);
        setFuelLogs([]);
        saveDeletedCookLogIds([]);

        loadUserBundleFromFirestore(user.uid).then((bundle) => {
          if (bundle) {
            setProfile(bundle.profile || cleanProfile);
            setCookLogs(Array.isArray(bundle.cookLogs) ? bundle.cookLogs : []);
            setFuelLogs(Array.isArray(bundle.fuelLogs) ? bundle.fuelLogs : []);
            saveDeletedCookLogIds(Array.isArray(bundle.deletedCookLogIds) ? bundle.deletedCookLogIds : []);
            if (bundle.charGPTMemory) saveCharGPTMemory(bundle.charGPTMemory);
            else saveCharGPTMemory({ ...INITIAL_CHARGPT_MEMORY, lastEvolvedAt: new Date().toISOString() });
            setSyncStatus(bundle.syncState === 'synced' ? 'synced' : bundle.syncState === 'error' ? 'error' : 'pending');
            return;
          }

          const cleanMemory = { ...INITIAL_CHARGPT_MEMORY, lastEvolvedAt: new Date().toISOString() };
          saveCharGPTMemory(cleanMemory);
          saveUserBundleToFirestore(user.uid, {
            profile: cleanProfile,
            cookLogs: [],
            fuelLogs: [],
            charGPTMemory: cleanMemory,
            deletedCookLogIds: [],
          }).then((success) => setSyncStatus(success ? 'synced' : 'error'));
        }).catch((err) => {
          console.warn('Error loading user bundle from Firestore:', err);
          setSyncStatus('error');
        });
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
        setSyncStatus('pending');
      }
    );
    return () => unsubscribe();
  }, []);

  const [platformSyncHydrated, setPlatformSyncHydrated] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) {
      setPlatformSyncHydrated(false);
      return;
    }
    setPlatformSyncHydrated(false);
    return startAuthoritativePlatformSync(currentUser.uid, {
      onProfile: setProfile,
      onCookLogs: setCookLogs,
      onFuelLogs: setFuelLogs,
      onStatus: setSyncStatus,
      onHydrated: () => setPlatformSyncHydrated(true),
    });
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid || !platformSyncHydrated) return;
    const timer = window.setTimeout(() => {
      setSyncStatus('syncing');
      saveUserBundleToFirestore(currentUser.uid, {
        profile, cookLogs, fuelLogs, charGPTMemory: loadCharGPTMemory(), deletedCookLogIds: loadDeletedCookLogIds(),
      }).then((success) => setSyncStatus(success ? 'synced' : 'error')).catch(() => setSyncStatus('error'));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [profile, cookLogs, fuelLogs, currentUser?.uid, platformSyncHydrated]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view && ['home','analytics','logs','planner','new-cook','maintenance','ai-pitmaster'].includes(view)) handleTabChange(view as any);
    if (params.get('share') === '1') {
      const shared = [params.get('title'), params.get('text'), params.get('url')].filter(Boolean).join('\n');
      if (shared) { setAiInitialPrompt('Review this shared item for my BBQ workflow. Treat it as unverified unless Knowledge has provenance.\n\n' + shared); setAiInitialCookId('ALL_LOGS'); handleTabChange('ai-pitmaster'); }
    }
  }, []);

  // Automatically synchronize profile hours with initial hours & published cook logs
  useEffect(() => {
    const published = (cookLogs || []).filter((c) => c.isPublishedToTotalHours === true);
    const totalLogged = published.reduce((acc, curr) => acc + (curr.hoursLogged || 0), 0);
    const initial = profile.initialHours || 0;
    const maxEndingHours = published.length > 0
      ? Math.max(...published.map((c) => c.endingSmokerHours || 0))
      : 0;
    const expectedCurrent = Number(Math.max(initial + totalLogged, maxEndingHours).toFixed(2));

    if (Math.abs((profile.currentHours || 0) - expectedCurrent) > 0.01) {
      setProfile((prev) => ({
        ...prev,
        currentHours: expectedCurrent,
      }));
    }
  }, [cookLogs, profile.initialHours]);

  // Keep SmokerHours global state in sync with active profile currentHours
  useEffect(() => {
    if (profile.currentHours !== undefined) {
      SmokerHours.setHours(profile.currentHours);
    }
  }, [profile.currentHours]);

  // Subscribe to SmokerHours cross-tab and cross-bundle updates
  useEffect(() => {
    const unsubscribe = SmokerHours.subscribe((state) => {
      if (typeof state.hours === 'number' && Math.abs((profile.currentHours || 0) - state.hours) > 0.01) {
        setProfile((prev) => ({
          ...prev,
          currentHours: state.hours,
        }));
      }
    });
    return unsubscribe;
  }, []);

  // Legacy 30-minute sync disabled. Firestore is authoritative for signed-in users.

  // Sync profile changes
  useEffect(() => {
    saveSmokerProfile(profile);
  }, [profile]);

  // Legacy Master Web live-update/sync disabled. GitHub/CI owns releases; Firestore owns user data.

  // Save local cache and the verified Firestore bundle without auto-writing AI memories.
  useEffect(() => {
    saveCookLogs(cookLogs);
    if (!currentUser?.uid) return;
    setSyncStatus('syncing');
    saveUserBundleToFirestore(currentUser.uid, {
      profile,
      cookLogs,
      fuelLogs,
      charGPTMemory: loadCharGPTMemory(),
      deletedCookLogIds: loadDeletedCookLogIds(),
    }).then((success) => setSyncStatus(success ? 'synced' : 'error'))
      .catch(() => setSyncStatus('error'));
  }, [cookLogs, currentUser?.uid]);

  // Sync fuel log changes
  useEffect(() => {
    saveFuelLogs(fuelLogs);
  }, [fuelLogs]);

  // Daily Automatic Backup Runner for Non-Local Cloud Storage
  useEffect(() => {
    const runAutoBackup = async () => {
      try {
        const savedConfigStr = localStorage.getItem('pitmaster_auto_backup_config');
        const savedOneDriveStr = localStorage.getItem('pitmaster_onedrive_account');
        const oneDriveConnected = savedOneDriveStr ? JSON.parse(savedOneDriveStr)?.connected : false;

        const hasUserAccount = Boolean(currentUser || accessToken || oneDriveConnected);
        if (!hasUserAccount) return;

        let autoConfig = savedConfigStr
          ? JSON.parse(savedConfigStr)
          : { enabled: false, googleDrive: false, oneDrive: false, lastAutoBackup: null };

        if (!autoConfig.enabled) return;

        const todayStr = new Date().toISOString().slice(0, 10);
        const lastBackupDateStr = autoConfig.lastAutoBackup ? autoConfig.lastAutoBackup.slice(0, 10) : null;

        // Run daily backup if it hasn't run today
        if (lastBackupDateStr !== todayStr) {
          const localAccountData = (() => {
            try {
              const saved = localStorage.getItem('pitmaster_local_user_account');
              if (saved) return JSON.parse(saved);
            } catch (e) {}
            return undefined;
          })();

          const backupPayload = {
            app: 'Pitmaster Log & Smoker Monitor',
            timestamp: new Date().toISOString(),
            profile,
            cookLogs,
            fuelLogs,
            userAccount: localAccountData,
            userProfile: localAccountData,
          };

          // Store daily backup snapshot
          localStorage.setItem('pitmaster_daily_auto_backup_vault', JSON.stringify(backupPayload));

          const driveToken = accessToken || (await getAccessToken());
          const nowIso = new Date().toISOString();
          const updatedConfig: Record<string, unknown> = { ...autoConfig, lastAutoBackup: nowIso };
          if (autoConfig.googleDrive) {
            if (driveToken) {
              try {
                await saveToGoogleDrive(driveToken, { profile, cookLogs, fuelLogs, userAccount: localAccountData });
                updatedConfig.lastDriveBackup = nowIso;
                updatedConfig.lastDriveBackupError = null;
              } catch (error: any) {
                updatedConfig.lastDriveBackupError = error?.message || 'Google Drive write failed.';
              }
            } else {
              updatedConfig.lastDriveBackupError = 'Google Drive authorization required.';
            }
          }
          localStorage.setItem('pitmaster_auto_backup_config', JSON.stringify(updatedConfig));
        }
      } catch (e) {
        console.warn('Auto backup check encountered an issue:', e);
      }
    };

    runAutoBackup();
  }, [currentUser, accessToken, cookLogs, fuelLogs, profile]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleTabChange = (tab: AppTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => startAutomaticReleaseUpdates(() => activeTabRef.current !== 'new-cook'), []);

  const handleSaveCook = (newCook: CookLog) => {
    const cookToSave = {
      ...newCook,
      id: newCook.id || `cook-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };

    const exists = cookLogs.some((c) => c.id === cookToSave.id);
    const updatedCooks = exists
      ? cookLogs.map((c) => (c.id === cookToSave.id ? cookToSave : c))
      : [cookToSave, ...cookLogs];

    setCookLogs(updatedCooks);
    saveCookLogs(updatedCooks);

    // Auto update smoker profile operating hours locally on the user's account ONLY if published
    const published = updatedCooks.filter((c) => c.isPublishedToTotalHours === true);
    const totalLogged = published.reduce((acc, curr) => acc + (curr.hoursLogged || 0), 0);
    const maxEndingHours = published.length > 0
      ? Math.max(...published.map((c) => c.endingSmokerHours || 0))
      : 0;
    const expectedCurrent = Number(Math.max((profile.initialHours || 0) + totalLogged, maxEndingHours).toFixed(2));

    const updatedProfile: SmokerProfile = {
      ...profile,
      currentHours: expectedCurrent,
    };
    setProfile(updatedProfile);
    saveSmokerProfile(updatedProfile);

    // Save locally on user's account profile
    try {
      const savedAccStr = localStorage.getItem('pitmaster_local_user_account');
      if (savedAccStr) {
        const acc = JSON.parse(savedAccStr);
        if (acc && acc.rigs) {
          const updatedRigs = acc.rigs.map((r: SmokerProfile) =>
            r.id === updatedProfile.id ? updatedProfile : r
          );
          localStorage.setItem('pitmaster_local_user_account', JSON.stringify({ ...acc, rigs: updatedRigs }));
        }
      }
    } catch (e) {
      console.warn('Local account profile save warning:', e);
    }

    if (autoSyncNewCooks && !forceOffline && currentUser?.uid) {
      syncCookLogsToServer(updatedCooks).then((success) => {
        showToast(success
          ? `Smoke journal entry "${cookToSave.title}" saved and synchronized.`
          : `Smoke journal entry "${cookToSave.title}" saved locally; cloud synchronization is pending.`);
      });
    } else {
      showToast(`Smoke journal entry "${cookToSave.title}" saved locally.`);
    }

    setPrefilledRecipe(null);
    handleTabChange('logs');
  };

  const handleStartCookFromRecipe = (recipe: RecipeSuggestion) => {
    setPrefilledRecipe(recipe);
    handleTabChange('new-cook');
    showToast(`Pre-filled smoke log form with recipe "${recipe.title}"!`);
  };

  const handleAskAIPitmasterAboutRecipe = (recipe: RecipeSuggestion, customQuery?: string) => {
    const query =
      customQuery ||
      `Hello ${AI_PITMASTER_NAME}! Please analyze the suggested cook "${recipe.title}" (${recipe.proteinCut}). What wood pellet blends, rub formulas, or temperature curve tweaks do you recommend for optimal results on my smoker (${profile.name || profile.smokerType || 'pellet grill'})?`;
    setAiInitialPrompt(query);
    setAiInitialCookId('ALL_LOGS');
    handleTabChange('ai-pitmaster');
    showToast(`Loaded ${AI_PITMASTER_NAME} consultation for "${recipe.title}"!`);
  };

  const syncCookLogsToServer = async (logs: CookLog[], deletedIds?: string[]): Promise<boolean> => {
    if (!currentUser?.uid) return false;
    const tombstones = Array.from(new Set([
      ...loadDeletedCookLogIds(),
      ...(deletedIds || []),
    ]));
    saveDeletedCookLogIds(tombstones);
    setSyncStatus('syncing');
    try {
      const success = await saveUserBundleToFirestore(currentUser.uid, {
        profile,
        cookLogs: logs,
        fuelLogs,
        charGPTMemory: loadCharGPTMemory(),
        deletedCookLogIds: tombstones,
      });
      setSyncStatus(success ? 'synced' : 'error');
      return success;
    } catch (err) {
      console.warn('Firestore cook log sync failed:', err);
      setSyncStatus('error');
      return false;
    }
  };

  const handleDeleteCook = (id: string) => {
    if (window.confirm('Are you sure you want to delete this cook log entry?')) {
      addDeletedCookLogId(id);
      const updated = cookLogs.filter((c) => c.id !== id);
      setCookLogs(updated);
      saveCookLogs(updated);
      syncCookLogsToServer(updated, [id]);
      showToast('Cook log entry deleted.');
    }
  };

  const handleDeleteMultipleCooks = (ids: string[]) => {
    if (ids.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${ids.length} selected cook log entry/entries?`)) {
      addDeletedCookLogId(ids);
      const updated = cookLogs.filter((c) => !ids.includes(c.id));
      setCookLogs(updated);
      saveCookLogs(updated);
      syncCookLogsToServer(updated, ids);
      showToast(`${ids.length} cook log ${ids.length === 1 ? 'entry' : 'entries'} deleted.`);
    }
  };

  const handleUpdateProfile = (updated: SmokerProfile) => {
    setProfile(updated);
    saveSmokerProfile(updated);
    if (typeof updated.currentHours === 'number') {
      SmokerHours.setHours(updated.currentHours);
    }
    showToast('Smoker profile updated.');
  };

  const handleUploadAndSyncProfile = async () => {
    saveSmokerProfile(profile);
    saveCookLogs(cookLogs);
    if (!currentUser?.uid) {
      showToast('Sign in to synchronize account data. Local changes remain on this device.');
      return;
    }

    setSyncStatus('syncing');
    const synced = await saveUserBundleToFirestore(currentUser.uid, {
      profile,
      cookLogs,
      fuelLogs,
      charGPTMemory: loadCharGPTMemory(),
      deletedCookLogIds: loadDeletedCookLogIds(),
    }).catch(() => false);
    setSyncStatus(synced ? 'synced' : 'error');
    if (!synced) {
      showToast('Account synchronization failed. Local data was preserved.');
      return;
    }

    showToast('SmokeStack account synchronized.');
    const driveToken = accessToken || (await getAccessToken());
    if (driveToken) {
      const savedAcc = localStorage.getItem('pitmaster_local_user_account');
      const userAcc = savedAcc ? JSON.parse(savedAcc) : undefined;
      saveToGoogleDrive(driveToken, { profile, cookLogs, fuelLogs, userAccount: userAcc })
        .then(() => showToast('SmokeStack account synchronized and Google Drive backup completed.'))
        .catch(() => showToast('SmokeStack account synchronized; Google Drive backup failed.'));
    }
  };

  const handleCustomSmokerCreated = (
    newSmoker: CustomSmokerSpec | ManufacturerSmokerSpec,
    setActiveAsCurrent: boolean
  ) => {
    const isMfg = 'brand' in newSmoker;
    const displayName = isMfg ? `${newSmoker.brand} ${newSmoker.model}` : newSmoker.name;

    if (setActiveAsCurrent) {
      if (isMfg) {
        const mfg = newSmoker as ManufacturerSmokerSpec;
        const updatedProfile: SmokerProfile = {
          ...profile,
          name: mfg.brand,
          model: mfg.model,
          smokerType: (mfg.category as any) || profile.smokerType,
          fuelType: mfg.fuelType || profile.fuelType,
          pelletHopperCapacityLbs: mfg.hopperCapacityLbs || profile.pelletHopperCapacityLbs,
          isCustomBuilt: false,
          manufacturerSpecs: mfg,
        };
        setProfile(updatedProfile);
        saveSmokerProfile(updatedProfile);
        showToast(`Active smoker set to manufacturer model "${displayName}"!`);
      } else {
        const custom = newSmoker as CustomSmokerSpec;
        const updatedProfile: SmokerProfile = {
          ...profile,
          name: custom.name,
          model: custom.builderName || 'Custom Build',
          smokerType: (custom.smokerType as any) || profile.smokerType,
          fuelType: custom.fuelType || profile.fuelType,
          pelletHopperCapacityLbs: custom.hopperCapacityLbs || profile.pelletHopperCapacityLbs,
          isCustomBuilt: true,
          customSpecs: custom,
        };
        setProfile(updatedProfile);
        saveSmokerProfile(updatedProfile);
        showToast(`Active smoker set to custom build "${displayName}"!`);
      }
    } else {
      showToast(`Smoker specs for "${displayName}" saved to user account.`);
    }
  };

  const handleAddFuelLog = (newFuel: FuelLog) => {
    setFuelLogs([newFuel, ...fuelLogs]);
    showToast(`Added ${newFuel.quantityLbs} lbs of ${newFuel.fuelBrand} to fuel inventory.`);
  };

  const handleUpdateFuelLog = (updatedFuel: FuelLog) => {
    setFuelLogs(fuelLogs.map((f) => (f.id === updatedFuel.id ? updatedFuel : f)));
    showToast(`Updated fuel restock entry for ${updatedFuel.fuelBrand}.`);
  };

  const handleDeleteFuelLog = (id: string) => {
    const fuelToDelete = fuelLogs.find((f) => f.id === id);
    if (window.confirm(`Delete fuel restock entry "${fuelToDelete?.fuelBrand || 'Selected Fuel'}" from inventory?`)) {
      setFuelLogs(fuelLogs.filter((f) => f.id !== id));
      showToast('Fuel restock entry removed from inventory.');
    }
  };

  const handleResetData = () => {
    if (window.confirm('Reset all smoker logs and runtime hours to initial defaults?')) {
      const restored = resetAllDataToDefault();
      setProfile(restored.profile);
      setCookLogs(restored.cookLogs);
      setFuelLogs(restored.fuelLogs);
      showToast('Local smoker data reset to clean defaults.');
    }
  };

  const handleRestoreFromDrive = (restored: {
    profile: SmokerProfile;
    cookLogs: CookLog[];
    fuelLogs: FuelLog[];
    userAccount?: any;
    userProfile?: any;
  }) => {
    setProfile(restored.profile);
    setCookLogs(restored.cookLogs);
    setFuelLogs(restored.fuelLogs);

    const accountToRestore = restored.userAccount || restored.userProfile;
    if (accountToRestore) {
      try {
        localStorage.setItem('pitmaster_local_user_account', JSON.stringify(accountToRestore));
      } catch (e) {
        console.warn('Failed to restore local user account', e);
      }
    }

    showToast('App data and user account successfully restored!');
  };

  const maxPageNumber = cookLogs.reduce((max, c) => Math.max(max, c.pageNumber || 48), 48);

  return (
    <div className={`min-h-screen bg-[#121212] text-[#e0e0e0] font-sans flex flex-col selection:bg-orange-500 selection:text-zinc-950 ${
      themeMode === 'light' ? 'light-theme' : ''
    } ${
      isColorblind ? 'colorblind-contrast' : ''
    }`}>
      
      {/* Toast Banner */}
      {notification && (
        <div className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 z-50 bg-[#1a1a1a] text-orange-400 px-4 py-3 rounded-xl font-medium text-xs shadow-2xl flex items-center space-x-2 border border-[#2a2a2a] md:bottom-5 md:right-5">
          <span className="text-orange-500 font-bold">🔥</span>
          <span>{notification}</span>
        </div>
      )}

      <ReleaseUpdateBanner deferAutomaticReload={activeTab === 'new-cook'} />

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        smokerHours={profile.currentHours}
        smokerName={profile.name}
        tempUnit={tempUnit}
        onOpenSettings={(tab) => {
          setSettingsInitialTab(tab || 'root');
          setIsSettingsModalOpen(true);
        }}
        isDriveConnected={!!currentUser && !!accessToken}
        isOnline={isOnline}
        currentUserEmail={userSession?.email || currentUser?.email || ''}
        userSession={userSession}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleUserLogout}
        onOpenMasterAdmin={() => setIsMasterAdminModalOpen(true)}
        onOpenDownloadStore={() => setIsDownloadStoreModalOpen(true)}
        onOpenSyncDashboard={() => setIsSyncDashboardOpen(true)}
      />

      {/* Home is the only mobile surface that carries the global overview. */}
      {activeTab === 'home' && <>
      <SmokerOverviewBanner
        profile={profile}
        cookLogs={cookLogs}
        fuelLogs={fuelLogs}
        tempUnit={tempUnit}
        onQuickLogClick={() => handleTabChange('new-cook')}
        onUpdateProfile={handleUpdateProfile}
        onUploadAndSyncProfile={handleUploadAndSyncProfile}
        onOpenSettings={(tab) => {
          setSettingsInitialTab(tab || 'smokers');
          setIsSettingsModalOpen(true);
        }}
        onOpenCharGPT={(prompt) => {
          if (prompt) setAiInitialPrompt(prompt);
          handleTabChange('ai-pitmaster');
        }}
        onOpenAlexaPush={() => handleTabChange('ai-pitmaster')}
      />

      <div className="mx-auto w-full max-w-7xl px-3 pt-3 sm:px-4 md:px-6 lg:px-8">
        <HomeCommandCenter
          profile={profile}
          cookLogs={cookLogs}
          tempUnit={tempUnit}
          onOpenCharGPT={(prompt) => {
            if (prompt) setAiInitialPrompt(prompt);
            setAiInitialCookId('ALL_LOGS');
            handleTabChange('ai-pitmaster');
          }}
          onOpenPlanner={() => handleTabChange('planner')}
          onOpenNewCook={() => {
            setPrefilledRecipe(null);
            setEditingCook(null);
            handleTabChange('new-cook');
          }}
        />
      </div>

      <BrowserInstallShareWidget
        onOpenPlanner={() => handleTabChange('planner')}
        onStartCook={() => {
          setPrefilledRecipe(null);
          setEditingCook(null);
          handleTabChange('new-cook');
        }}
        onOpenCharGPT={() => {
          setAiInitialCookId('ALL_LOGS');
          handleTabChange('ai-pitmaster');
        }}
      />
      </>}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-3 sm:pt-6 pb-28 md:pb-12 overflow-x-hidden">
        <React.Suspense fallback={<div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-8 text-center text-sm text-zinc-400">Loading this SmokeStack workspace…</div>}>
        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            cookLogs={cookLogs}
            profile={profile}
            fuelLogs={fuelLogs}
            tempUnit={tempUnit}
            onToggleTempUnit={toggleTempUnit}
            onSelectCookSheet={(cook) => setSelectedSheetCook(cook)}
            onUpdateProfile={handleUpdateProfile}
            onAskCharGPTAboutData={(prompt) => {
              setAiInitialPrompt(prompt);
              handleTabChange('ai-pitmaster');
            }}
          />
        )}

        {activeTab === 'logs' && (
          <CookLogList
            cookLogs={cookLogs}
            profile={profile}
            showToast={showToast}
            onSelectCook={(cook) => setSelectedSheetCook(cook)}
            onOpenCertificate={(cook) => setSelectedCertificateCook(cook)}
            onEditCook={handleEditCook}
            onDeleteCook={handleDeleteCook}
            onDeleteMultipleCooks={handleDeleteMultipleCooks}
            onNewCookClick={() => {
              setPrefilledRecipe(null);
              setEditingCook(null);
              handleTabChange('new-cook');
            }}
            onStartCookFromRecipe={handleStartCookFromRecipe}
            onAskAIPitmaster={handleAskAIPitmasterAboutRecipe}
            onLogsImported={(newLogs) => {
              const freshLogs = newLogs.map((l, i) => ({
                ...l,
                id: (l.id && l.id.length > 15) ? l.id : `pdf-log-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 8)}`
              }));
              const updated = [...freshLogs, ...cookLogs];
              setCookLogs(updated);
              saveCookLogs(updated);
              syncCookLogsToServer(updated);
              showToast(`📄 Imported ${freshLogs.length} smoke log(s) from PDF into journal!`);
            }}
          />
        )}

        {activeTab === 'planner' && (
          <CookPlanner
            smokerProfile={profile}
            cookLogs={cookLogs}
            onStartCookFromPlan={handleStartCookFromRecipe}
            onAskAIPitmasterAboutPlan={(promptText) => {
              setAiInitialPrompt(promptText);
              setAiInitialCookId('ALL_LOGS');
              handleTabChange('ai-pitmaster');
              showToast(`Loaded ${AI_PITMASTER_NAME} consultation for planned cook schedule!`);
            }}
          />
        )}

        {activeTab === 'new-cook' && (
          <CookLogForm
            profile={profile}
            isAuthenticated={Boolean(currentUser?.uid)}
            nextPageNumber={editingCook?.pageNumber || maxPageNumber + 1}
            initialRecipe={prefilledRecipe}
            initialCook={editingCook}
            onDeleteCook={handleDeleteCook}
            onSaveCook={(savedCook) => {
              handleSaveCook(savedCook);
              setEditingCook(null);
            }}
            onCancel={() => {
              setPrefilledRecipe(null);
              setEditingCook(null);
              handleTabChange('logs');
            }}
            onUpdateProfile={handleUpdateProfile}
            onOpenSettings={(tab) => {
              setSettingsInitialTab(tab || 'smokers');
              setIsSettingsModalOpen(true);
            }}
          />
        )}

        {activeTab === 'maintenance' && (
          <>
            <FuelAndMaintenance
              profile={profile}
              cookLogs={cookLogs}
              fuelLogs={fuelLogs}
              onUpdateProfile={handleUpdateProfile}
              onAddFuelLog={handleAddFuelLog}
              onUpdateFuelLog={handleUpdateFuelLog}
              onDeleteFuelLog={handleDeleteFuelLog}
            />
            <FuelMarketTracker />
          </>
        )}

        {activeTab === 'ai-pitmaster' && (
          <AIPitmasterModal
            cookLogs={cookLogs}
            profile={profile}
            initialCookId={aiInitialCookId}
            initialPrompt={aiInitialPrompt}
            currentUserEmail={currentUser?.email || userSession?.email || ''}
            onMemoryUpdate={(memory) => {
              saveCharGPTMemory(memory);
              if (!currentUser?.uid) return;
              setSyncStatus('syncing');
              saveUserBundleToFirestore(currentUser.uid, { charGPTMemory: memory })
                .then((success) => setSyncStatus(success ? 'synced' : 'error'))
                .catch(() => setSyncStatus('error'));
            }}
            onNavigateToPlanner={() => setActiveTab('planner')}
            onNavigateToNewCook={() => setActiveTab('new-cook')}
            onOpenMasterAdmin={() => setIsMasterAdminModalOpen(true)}
          />
        )}
        </React.Suspense>
      </main>

      <React.Suspense fallback={null}>

      {/* Printable Smoker Paper Sheet Modal */}
      <CookLogSheetModal
        cook={selectedSheetCook}
        onClose={() => setSelectedSheetCook(null)}
        onEditCook={handleEditCook}
        onDeleteCook={handleDeleteCook}
        onOpenCertificate={(cook) => {
          setSelectedSheetCook(null);
          setSelectedCertificateCook(cook);
        }}
        onAnalyzeWithAI={(cook) => {
          setSelectedSheetCook(null);
          setAiInitialCookId(cook.id);
          setAiInitialPrompt(`Analyze my cook log for "${cook.title}" (${cook.proteinCut}) and suggest key pitmaster improvements.`);
          setActiveTab('ai-pitmaster');
        }}
      />

      {/* Official Master Chef Cook Certificate Badge Modal */}
      <CookCertificateModal
        cook={selectedCertificateCook}
        onClose={() => setSelectedCertificateCook(null)}
        onAnalyzeWithAI={(cook) => {
          setSelectedCertificateCook(null);
          setAiInitialCookId(cook.id);
          setAiInitialPrompt(`Analyze my certificate cook for "${cook.title}" (${cook.proteinCut}) and evaluate heat stability.`);
          setActiveTab('ai-pitmaster');
        }}
      />

      {/* Google Drive Cloud Save & Sync Modal */}
      <GoogleDriveSyncModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        currentUser={currentUser}
        accessToken={accessToken}
        onAuthSuccess={(user, token) => {
          setCurrentUser(user);
          setAccessToken(token);
        }}
        onLogout={handleUserLogout}
        currentAppData={{
          profile,
          cookLogs,
          fuelLogs,
          userAccount: (() => {
            try {
              const saved = localStorage.getItem('pitmaster_local_user_account');
              if (saved) return JSON.parse(saved);
            } catch (e) {}
            return undefined;
          })(),
        }}
        onRestoreData={handleRestoreFromDrive}
      />

      {/* Universal 30-Minute Sync & Google Drive Cloud Backup Dashboard Modal for All Users */}
      <UniversalSyncDashboardModal
        isOpen={isSyncDashboardOpen}
        onClose={() => setIsSyncDashboardOpen(false)}
        currentUserEmail={userSession?.email || currentUser?.email || ''}
        accessToken={accessToken}
        onAuthSuccess={(user, token) => {
          setCurrentUser(user);
          setAccessToken(token);
        }}
        onRefreshData={() => {
          setProfile(loadSmokerProfile());
          setCookLogs(loadCookLogs());
          setFuelLogs(loadFuelLogs());
        }}
        showToast={showToast}
      />

      {/* Settings Menu Modal */}
      <ErrorBoundary fallbackTitle="Settings & Accounts Modal">
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          initialTab={settingsInitialTab}
          tempUnit={tempUnit}
          onToggleTempUnit={toggleTempUnit}
          themeMode={themeMode}
          onToggleThemeMode={toggleThemeMode}
          isColorblind={isColorblind}
          onToggleColorblind={toggleColorblind}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          forceOffline={forceOffline}
          onToggleForceOffline={toggleForceOffline}
          autoSyncDrive={autoSyncDrive}
          onToggleAutoSync={toggleAutoSync}
          autoSyncNewCooks={autoSyncNewCooks}
          onToggleAutoSyncNewCooks={toggleAutoSyncNewCooks}
          onOpenDriveModal={() => setIsDriveModalOpen(true)}
          isDriveConnected={!!currentUser && !!accessToken}
          driveUserEmail={currentUser?.email}
          onResetData={handleResetData}
          isOnline={isOnline && !forceOffline}
          currentUser={currentUser}
          accessToken={accessToken}
          onAuthSuccess={(user, token) => {
            setCurrentUser(user);
            setAccessToken(token);
          }}
          onLogout={handleUserLogout}
          currentAppData={{
            profile,
            cookLogs,
            fuelLogs,
            userAccount: (() => {
              try {
                const saved = localStorage.getItem('pitmaster_local_user_account');
                if (saved) return JSON.parse(saved);
              } catch (e) {}
              return undefined;
            })(),
          }}
          onRestoreData={handleRestoreFromDrive}
          onOpenCustomSmokerModal={() => setIsCustomSmokerModalOpen(true)}
          profile={profile}
          onUpdateProfile={setProfile}
          lowPowerSettings={lowPowerSettings}
          onToggleLowPowerMode={toggleLowPowerMode}
        />
      </ErrorBoundary>

      {/* Custom Built Smoker Specifications Modal */}
      <CustomSmokerModal
        isOpen={isCustomSmokerModalOpen}
        onClose={() => setIsCustomSmokerModalOpen(false)}
        currentUser={currentUser}
        pitmasterAlias={profile.name || currentUser?.email || ''}
        onSmokerCreated={handleCustomSmokerCreated}
      />

      {/* Default User Authentication & Remember Me Login Gate Modal */}
      <UserLoginGateModal
        isOpen={isLoginModalOpen}
        currentUser={currentUser}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(session) => {
          setUserSession(session);
          setIsLoginModalOpen(false);
          setProfile(loadSmokerProfile());
          setCookLogs(loadCookLogs());
          setFuelLogs(loadFuelLogs());
          showToast(`✨ Logged in as ${session.name || session.email}!`);
        }}
        onGoogleSignInSuccess={(user, token) => {
          setCurrentUser(user);
          setAccessToken(token);
        }}
      />

      {/* SmokeStack Operations — visible only after verified ADMIN/OWNER role hydration */}
      {userSession?.isMasterAdmin === true && (
      <MasterAdminDashboardModal
        isOpen={isMasterAdminModalOpen}
        onClose={() => setIsMasterAdminModalOpen(false)}
        currentUserEmail={currentUser?.email || ''}
        profile={profile}
        cookLogs={cookLogs}
        fuelLogs={fuelLogs}
        onRefreshData={() => {
          setProfile(loadSmokerProfile());
          setCookLogs(loadCookLogs());
          setFuelLogs(loadFuelLogs());
        }}
        showToast={showToast}
      />
      )}

      {/* Download App & Play Store Hub Modal */}
      <AppDownloadStoreModal
        isOpen={isDownloadStoreModalOpen}
        onClose={() => setIsDownloadStoreModalOpen(false)}
        onOpenRaspberryPiSettings={() => {
          setSettingsInitialTab('appearance');
          setIsSettingsModalOpen(true);
        }}
      />

      {/* Permissions & Terms of Service Modal upon initial opening */}
      <TermsOfServiceModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onAccept={() => {
          localStorage.setItem('pitmaster_terms_accepted', 'true');
          setIsTermsModalOpen(false);
          showToast('Terms accepted. Optional permissions will be requested only when needed.');
        }}
      />
      </React.Suspense>

      {/* Fire TV On-Screen Notification Toast Overlay */}
      <FireTVToastOverlay />

      {/* Google Home & Nest Speaker Voice Broadcast Toast Overlay */}
      <GoogleHomeToastOverlay />

      {/* Animated Smoke Stack Logo Splash Screen upon opening app (3.0 seconds run with optimizations) */}
      {showSplashScreen && (
        <SmokeStackSplashScreen
          autoPlayDurationMs={3000}
          onComplete={() => setShowSplashScreen(false)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-[#2a2a2a] bg-[#121212] py-5 text-center text-xs text-zinc-500 font-mono">
        <p>© {new Date().getFullYear()} Smoke Stack • Smart BBQ Smoker & Pellet Journal</p>
      </footer>

    </div>
  );
}
