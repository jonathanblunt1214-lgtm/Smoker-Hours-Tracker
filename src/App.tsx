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
  autoEvolveCharGPTMemory,
  loadDeletedCookLogIds,
  addDeletedCookLogId,
  loadCharGPTMemory,
  saveCharGPTMemory,
} from './utils/storage';
import { checkAndUpdateRetailerPricesOnline } from './utils/retailerPriceSync';
import { RecipeSuggestion } from './data/recipeSuggestions';
import { INITIAL_SMOKER_PROFILE } from './data/mockData';
import { APP_NAME, AI_NAME, AI_PITMASTER_NAME } from './constants/appName';
import { initAuth, saveToGoogleDrive, getAccessToken, logout } from './lib/driveSync';
import { loadUserBundleFromFirestore, saveUserBundleToFirestore, SyncStateStatus } from './lib/firestoreData';
import { MASTER_ADMIN_EMAIL } from './utils/adminAuth';
import { Navbar, AppTab, SettingsDestination } from './components/Navbar';
import { SmokerOverviewBanner } from './components/SmokerOverviewBanner';
import { HomeCommandCenter } from './components/HomeCommandCenter';
import { BrowserInstallShareWidget } from './components/BrowserInstallShareWidget';
import { ReleaseUpdateBanner } from './components/ReleaseUpdateBanner';
import { startAuthoritativePlatformSync } from './lib/platformSync';
import { startAutomaticReleaseUpdates } from './services/releaseUpdateService';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { CookLogList } from './components/CookLogList';
import { CookLogSheetModal } from './components/CookLogSheetModal';
import { CookCertificateModal } from './components/CookCertificateModal';
import { CookLogForm } from './components/CookLogForm';
import { CookPlanner } from './components/CookPlanner';
import { FuelAndMaintenance } from './components/FuelAndMaintenance';
import { AIPitmasterModal } from './components/AIPitmasterModal';
import { GoogleDriveSyncModal } from './components/GoogleDriveSyncModal';
import { UniversalSyncDashboardModal } from './components/UniversalSyncDashboardModal';
import { SettingsModal } from './components/SettingsModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CustomSmokerModal } from './components/CustomSmokerModal';
import { MasterAdminDashboardModal } from './components/MasterAdminDashboardModal';
import { AppDownloadStoreModal } from './components/AppDownloadStoreModal';
import { UserLoginGateModal } from './components/UserLoginGateModal';
import { TermsOfServiceModal } from './components/TermsOfServiceModal';
import { SmokeStackSplashScreen } from './components/SmokeStackSplashScreen';
import { FireTVToastOverlay } from './components/FireTVToastOverlay';
import { GoogleHomeToastOverlay } from './components/GoogleHomeToastOverlay';
import {
  UserAuthSession,
  getActiveUserSession,
  saveActiveUserSession,
  clearActiveUserSession,
  isMasterAdminVerifiedDevice,
} from './utils/userAuthSession';

import {
  autoOptimizeScreenOnLoadAndResize,
} from './utils/screenOptimizer';

import { SmokerHours, SmokerSyncEngine, SmokerHoursSyncService } from './services/smokerSyncService';
import { initMasterLiveUpdateRunner } from './services/masterLiveUpdateService';
import { MASTER_SYNC_DATA_MERGED_EVENT, triggerMasterVersionSync, masterVersionSyncService } from './services/masterVersionSyncService';

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
  const [syncStatus, setSyncStatus] = useState<SyncStateStatus>('synced');

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
      showToast('🌐 Network connection restored. Verifying cloud synchronization...');
      setSyncStatus('syncing');
      if (currentUser?.uid) {
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
        setSyncStatus('synced');
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
    setUserSession(null);
    setCurrentUser(null);
    setAccessToken(null);
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

        // Auto-login with detected Google account
        const userEmail = user.email || 'user@smokestack.app';
        const isMaster = userEmail.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

        const session: UserAuthSession = {
          id: user.uid,
          email: userEmail,
          name: user.displayName || (isMaster ? 'Jonathan Blunt' : userEmail.split('@')[0]),
          title: isMaster ? 'Head Pitmaster & Master Developer' : 'Pitmaster',
          provider: 'google',
          rememberMe: true,
          isMasterAdmin: isMaster,
          loggedInAt: new Date().toISOString(),
        };

        saveActiveUserSession(session, true);
        setUserSession(session);
        setIsLoginModalOpen(false);

        // Load authoritative data bundle from Firestore
        loadUserBundleFromFirestore(user.uid).then((bundle) => {
          if (bundle) {
            if (Array.isArray(bundle.cookLogs)) setCookLogs(bundle.cookLogs);
            if (bundle.profile) setProfile(bundle.profile);
            if (Array.isArray(bundle.fuelLogs)) setFuelLogs(bundle.fuelLogs);
            if (bundle.charGPTMemory) saveCharGPTMemory(bundle.charGPTMemory);
            setSyncStatus('synced');
          } else {
            // Save initial user bundle to Firestore for new user
            saveUserBundleToFirestore(user.uid, {
              profile,
              cookLogs,
              fuelLogs,
              charGPTMemory: loadCharGPTMemory(),
            }).then(() => setSyncStatus('synced'));
          }
        }).catch((err) => {
          console.warn('Error loading user bundle from Firestore:', err);
          setSyncStatus('error');
        });
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
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

  // Initialize SmokerSyncEngine and SmokerHoursSyncService for 30-minute automated auto-syncing
  useEffect(() => {
    const deviceId = localStorage.getItem('smoker_app_device_id') || `device_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('smoker_app_device_id', deviceId);

    const baseUrl = window.location.origin;
    const SYNC_30_MIN_MS = 30 * 60 * 1000; // 1,800,000 ms (30 minutes)
    const engine = new SmokerSyncEngine(deviceId, baseUrl, 'auth_token_default', SYNC_30_MIN_MS);
    const hoursService = new SmokerHoursSyncService(baseUrl, deviceId);

    engine.on('syncSuccess', (res: any) => {
      if (res?.resolvedHours && res.resolvedHours.length > 0) {
        const maxHours = Math.max(...res.resolvedHours.map((h: any) => h.totalHours || 0));
        if (maxHours > 0) {
          SmokerHours.setHours(maxHours);
        }
      }
    });

    engine.startAutoSync();

    // Initial background sync for hour entries
    hoursService.sync([], Date.now() - 86400000).catch(() => {});

    // Periodic 30-minute recurring hours sync
    const hoursInterval = setInterval(() => {
      hoursService.sync([], Date.now() - 86400000).catch(() => {});
    }, SYNC_30_MIN_MS);

    return () => {
      engine.stopAutoSync();
      clearInterval(hoursInterval);
    };
  }, []);

  // Sync profile changes
  useEffect(() => {
    saveSmokerProfile(profile);
  }, [profile]);

  // Initialize Master Admin Live Update Engine & Master Version Sync Event Listener
  useEffect(() => {
    const cleanup = initMasterLiveUpdateRunner(() => {
      // Reload state on live updates
      setProfile(loadSmokerProfile());
      setCookLogs(loadCookLogs());
      setFuelLogs(loadFuelLogs());
    });

    const handleMasterSyncMerged = (evt: any) => {
      const merged = evt?.detail;
      if (merged) {
        if (Array.isArray(merged.cookLogs)) {
          const deletedSet = new Set(loadDeletedCookLogIds());
          const cleanMerged = merged.cookLogs.filter((c: CookLog) => c && c.id && !deletedSet.has(c.id));
          setCookLogs((prev) => {
            const map = new Map<string, CookLog>();
            prev.forEach((c) => c && c.id && !deletedSet.has(c.id) && map.set(c.id, c));
            cleanMerged.forEach((c: CookLog) => {
              if (c && c.id && !deletedSet.has(c.id)) {
                const ex = map.get(c.id);
                map.set(c.id, { ...ex, ...c });
              }
            });
            const mergedList = Array.from(map.values());
            if (JSON.stringify(mergedList) !== JSON.stringify(prev)) {
              saveCookLogs(mergedList);
              return mergedList;
            }
            return prev;
          });
        }
        if (Array.isArray(merged.fuelLogs)) {
          setFuelLogs(merged.fuelLogs);
        }
        setProfile(loadSmokerProfile());
      }
    };

    window.addEventListener(MASTER_SYNC_DATA_MERGED_EVENT, handleMasterSyncMerged);

    return () => {
      cleanup();
      window.removeEventListener(MASTER_SYNC_DATA_MERGED_EVENT, handleMasterSyncMerged);
    };
  }, []);

  // Sync cook log changes & run automatic live cloud ML training & trigger Master Version sync
  useEffect(() => {
    saveCookLogs(cookLogs);
    if (cookLogs && cookLogs.length > 0) {
      try {
        autoEvolveCharGPTMemory(cookLogs);
      } catch (e) {
        console.error('Live Cloud ML auto-training error:', e);
      }
    }
    // Upload newly created or modified cook logs to Master Web version repository immediately
    triggerMasterVersionSync().catch((err) => console.warn('Background master sync trigger:', err));
  }, [cookLogs]);

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
            return {
              name: 'Pitmaster Guest',
              email: currentUser?.email || '',
              title: 'Guest Pitmaster',
              createdAt: new Date().toISOString().slice(0, 10),
            };
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

          // Sync with Google Drive if access token available
          const driveToken = accessToken || (await getAccessToken());
          if (driveToken) {
            saveToGoogleDrive(driveToken, { profile, cookLogs, fuelLogs, userAccount: localAccountData }).catch(console.warn);
          }

          const nowIso = new Date().toISOString();
          const updatedConfig = { ...autoConfig, lastAutoBackup: nowIso };
          localStorage.setItem('pitmaster_auto_backup_config', JSON.stringify(updatedConfig));

          console.log('Daily automatic backup of log and user data completed.');
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

    if (autoSyncNewCooks && !forceOffline) {
      syncCookLogsToServer(updatedCooks);
      showToast(`Smoke journal entry "${cookToSave.title}" saved & auto-synced to cloud server!`);
    } else {
      showToast(`Smoke journal entry "${cookToSave.title}" saved locally to account! (Ready for analysis upload)`);
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

  const syncCookLogsToServer = (logs: CookLog[], deletedIds?: string[]) => {
    const userEmail = (() => {
      try {
        const saved = localStorage.getItem('pitmaster_local_user_account');
        if (saved) return JSON.parse(saved)?.email || '';
      } catch (e) {}
      return '';
    })();

    const deletedCookLogIds = Array.from(new Set([
      ...loadDeletedCookLogIds(),
      ...(deletedIds || []),
    ]));

    fetch('/api/cook-logs/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail,
        cookLogs: logs,
        deletedIds: deletedCookLogIds,
        deletedCookLogIds,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.cookLogs)) {
          const deletedSet = new Set(loadDeletedCookLogIds());
          const cleanLogs = data.cookLogs.filter((c: CookLog) => c && c.id && !deletedSet.has(c.id));
          setCookLogs((prev) => {
            const map = new Map<string, CookLog>();
            prev.forEach((c) => c && c.id && !deletedSet.has(c.id) && map.set(c.id, c));
            cleanLogs.forEach((c: CookLog) => {
              if (c && c.id && !deletedSet.has(c.id)) {
                const ex = map.get(c.id);
                map.set(c.id, { ...ex, ...c });
              }
            });
            const mergedList = Array.from(map.values());
            if (JSON.stringify(mergedList) !== JSON.stringify(prev)) {
              saveCookLogs(mergedList);
              return mergedList;
            }
            return prev;
          });
        }
      })
      .catch((err) => console.warn('Direct cook log API sync warning:', err));

    try {
      masterVersionSyncService.syncWithMasterWeb();
    } catch (syncErr) {
      console.warn('Master Version Sync error:', syncErr);
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

  const handleUploadAndSyncProfile = () => {
    saveSmokerProfile(profile);
    saveCookLogs(cookLogs);

    if (profile.currentHours !== undefined) {
      SmokerHours.setHours(profile.currentHours);
    }

    const userEmail = (() => {
      try {
        const saved = localStorage.getItem('pitmaster_local_user_account');
        if (saved) return JSON.parse(saved)?.email || '';
      } catch (e) {}
      return '';
    })();

    fetch('/api/cook-logs/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, cookLogs, profile }),
    }).catch((err) => console.warn('Server cook log & profile sync warning:', err));

    fetch('/sync/hours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: localStorage.getItem('smoker_app_device_id') || 'default',
        entries: [
          {
            id: `entry-${profile.id || 'default'}`,
            deviceId: localStorage.getItem('smoker_app_device_id') || 'default',
            totalHours: profile.currentHours || 0,
            timestamp: Date.now(),
            app: 'SmokerHours',
          },
        ],
      }),
    }).catch((err) => console.warn('Hours endpoint sync warning:', err));

    try {
      masterVersionSyncService.syncWithMasterWeb();
    } catch (syncErr) {
      console.warn('Master Version Sync error:', syncErr);
    }

    getAccessToken().then((driveToken) => {
      const activeToken = accessToken || driveToken;
      if (activeToken) {
        const savedAcc = localStorage.getItem('pitmaster_local_user_account');
        const userAcc = savedAcc ? JSON.parse(savedAcc) : undefined;
        saveToGoogleDrive(activeToken, { profile, cookLogs, fuelLogs, userAccount: userAcc })
          .then(() => showToast('Smoker hours & logs uploaded to profile and backed up to Google Drive!'))
          .catch(() => showToast('Smoker hours & logs uploaded to profile!'));
      } else {
        showToast('Smoker hours & logs uploaded to profile!');
      }
    });
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
      showToast('All smoker logs restored to baseline sample data.');
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
          <FuelAndMaintenance
            profile={profile}
            cookLogs={cookLogs}
            fuelLogs={fuelLogs}
            onUpdateProfile={handleUpdateProfile}
            onAddFuelLog={handleAddFuelLog}
            onUpdateFuelLog={handleUpdateFuelLog}
            onDeleteFuelLog={handleDeleteFuelLog}
          />
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
              if (!currentUser?.uid) {
                showToast('CharGPT memory saved on this device. Sign in to synchronize it with an account.');
                return;
              }
              setSyncStatus('syncing');
              saveUserBundleToFirestore(currentUser.uid, { charGPTMemory: memory })
                .then((success) => {
                  setSyncStatus(success ? 'synced' : 'error');
                  showToast(success
                    ? 'CharGPT memory saved and synchronized to your account.'
                    : 'CharGPT memory saved locally; account synchronization failed and can be retried.');
                })
                .catch(() => {
                  setSyncStatus('error');
                  showToast('CharGPT memory saved locally; account synchronization failed and can be retried.');
                });
            }}
            onNavigateToPlanner={() => setActiveTab('planner')}
            onNavigateToNewCook={() => setActiveTab('new-cook')}
            onOpenMasterAdmin={() => setIsMasterAdminModalOpen(true)}
          />
        )}
      </main>

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
            return {
              name: 'Pitmaster Guest',
              email: currentUser?.email || '',
              title: 'Guest Pitmaster',
              createdAt: new Date().toISOString().slice(0, 10),
            };
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
              return {
                name: 'Pitmaster Guest',
                email: currentUser?.email || '',
                title: 'Guest Pitmaster',
                createdAt: new Date().toISOString().slice(0, 10),
              };
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
        pitmasterAlias={profile.name || currentUser?.email || 'Pitmaster Guest'}
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

      {/* Master Admin & Developer Dashboard Modal */}
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
          showToast('✅ Terms & App Permissions accepted!');
        }}
      />

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
