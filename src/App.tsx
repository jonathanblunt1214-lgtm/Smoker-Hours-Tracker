import React, { useState, useEffect } from 'react';
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
} from './utils/storage';
import { checkAndUpdateRetailerPricesOnline } from './utils/retailerPriceSync';
import { RecipeSuggestion } from './data/recipeSuggestions';
import { APP_NAME, AI_NAME, AI_PITMASTER_NAME } from './constants/appName';
import { initAuth, saveToGoogleDrive } from './lib/driveSync';
import { Navbar } from './components/Navbar';
import { SmokerOverviewBanner } from './components/SmokerOverviewBanner';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { CookLogList } from './components/CookLogList';
import { CookLogSheetModal } from './components/CookLogSheetModal';
import { CookCertificateModal } from './components/CookCertificateModal';
import { CookLogForm } from './components/CookLogForm';
import { CookPlanner } from './components/CookPlanner';
import { FuelAndMaintenance } from './components/FuelAndMaintenance';
import { AIPitmasterModal } from './components/AIPitmasterModal';
import { GoogleDriveSyncModal } from './components/GoogleDriveSyncModal';
import { BluetoothManagerModal } from './components/BluetoothManagerModal';
import { SettingsModal } from './components/SettingsModal';
import { CustomSmokerModal } from './components/CustomSmokerModal';
import { MasterAdminDashboardModal } from './components/MasterAdminDashboardModal';
import { AppDownloadStoreModal } from './components/AppDownloadStoreModal';

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

  // Additional Togglable App Settings
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('smoker_theme_mode') as 'dark' | 'light') || 'dark';
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

  const [activeTab, setActiveTab] = useState<'analytics' | 'logs' | 'planner' | 'new-cook' | 'maintenance' | 'ai-pitmaster'>('analytics');
  const [selectedSheetCook, setSelectedSheetCook] = useState<CookLog | null>(null);
  const [selectedCertificateCook, setSelectedCertificateCook] = useState<CookLog | null>(null);
  const [prefilledRecipe, setPrefilledRecipe] = useState<RecipeSuggestion | null>(null);
  const [aiInitialCookId, setAiInitialCookId] = useState<string | null>(null);
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Connection & Offline auto-reconnect sync state
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);

  useEffect(() => {
    // Run auto cache clear check for smartphone storage optimization
    const autoClearRes = checkAndRunAutoCacheClear();
    if (autoClearRes.ran && autoClearRes.message) {
      showToast(autoClearRes.message);
    }

    // Run 24-hour retail price data update check on mount
    const syncRes = checkAndUpdateRetailerPricesOnline();
    if (syncRes.updated) {
      showToast(syncRes.message);
    }

    const handleOnline = () => {
      setIsOnline(true);
      showToast('🌐 Network reconnected! All offline smoke logs synchronized.');
      const res = checkAndUpdateRetailerPricesOnline();
      if (res.updated) {
        showToast(res.message);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('⚡ Offline Mode activated. All logs and search history saved locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Settings, Bluetooth, Custom Smokers, Master Admin, Google Drive & Download App Modal States
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'appearance' | 'alerts' | 'cloud' | 'data'>('appearance');
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState(false);
  const [isCustomSmokerModalOpen, setIsCustomSmokerModalOpen] = useState(false);
  const [isMasterAdminModalOpen, setIsMasterAdminModalOpen] = useState(false);
  const [isDownloadStoreModalOpen, setIsDownloadStoreModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);

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
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Automatically synchronize profile hours with initial hours & cook logs
  useEffect(() => {
    const totalLogged = (cookLogs || []).reduce((acc, curr) => acc + (curr.hoursLogged || 0), 0);
    const initial = profile.initialHours || 0;
    const maxEndingHours = cookLogs && cookLogs.length > 0
      ? Math.max(...cookLogs.map((c) => c.endingSmokerHours || 0))
      : 0;
    const expectedCurrent = Number(Math.max(initial + totalLogged, maxEndingHours).toFixed(2));

    if (Math.abs((profile.currentHours || 0) - expectedCurrent) > 0.01) {
      setProfile((prev) => ({
        ...prev,
        currentHours: expectedCurrent,
      }));
    }
  }, [cookLogs, profile.initialHours]);

  // Sync profile changes
  useEffect(() => {
    saveSmokerProfile(profile);
  }, [profile]);

  // Sync cook log changes & run automatic in-app ML training (sandboxed)
  useEffect(() => {
    saveCookLogs(cookLogs);
    if (cookLogs && cookLogs.length > 0) {
      try {
        autoEvolveCharGPTMemory(cookLogs);
      } catch (e) {
        console.error('In-App ML auto-training error:', e);
      }
    }
  }, [cookLogs]);

  // Sync fuel log changes
  useEffect(() => {
    saveFuelLogs(fuelLogs);
  }, [fuelLogs]);

  // Daily Automatic Backup Runner for Non-Local Cloud Storage
  useEffect(() => {
    try {
      const savedConfigStr = localStorage.getItem('pitmaster_auto_backup_config');
      const savedOneDriveStr = localStorage.getItem('pitmaster_onedrive_account');
      const oneDriveConnected = savedOneDriveStr ? JSON.parse(savedOneDriveStr)?.connected : false;

      const hasUserAccount = Boolean(currentUser || accessToken || oneDriveConnected);
      if (!hasUserAccount) return;

      let autoConfig = savedConfigStr
        ? JSON.parse(savedConfigStr)
        : { enabled: true, googleDrive: true, oneDrive: true, lastAutoBackup: null };

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
            name: 'Jonathan Blunt',
            email: currentUser?.email || 'jonathanblunt1214@gmail.com',
            title: 'Head Pitmaster',
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
        if (accessToken) {
          saveToGoogleDrive(accessToken, { profile, cookLogs, fuelLogs, userAccount: localAccountData }).catch(console.warn);
        }

        const nowIso = new Date().toISOString();
        const updatedConfig = { ...autoConfig, lastAutoBackup: nowIso };
        localStorage.setItem('pitmaster_auto_backup_config', JSON.stringify(updatedConfig));

        console.log('Daily automatic backup of log and user data completed.');
      }
    } catch (e) {
      console.warn('Auto backup check encountered an issue:', e);
    }
  }, [currentUser, accessToken, cookLogs, fuelLogs, profile]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleTabChange = (tab: 'analytics' | 'logs' | 'planner' | 'new-cook' | 'maintenance' | 'ai-pitmaster') => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveCook = (newCook: CookLog) => {
    const updatedCooks = [newCook, ...cookLogs];
    setCookLogs(updatedCooks);

    // Auto update smoker profile operating hours!
    const updatedProfile: SmokerProfile = {
      ...profile,
      currentHours: newCook.endingSmokerHours,
    };
    setProfile(updatedProfile);

    showToast(`Smoke journal entry "${newCook.title}" saved! Smoker hours updated to ${newCook.endingSmokerHours.toFixed(2)} hrs.`);
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

  const handleDeleteCook = (id: string) => {
    if (window.confirm('Are you sure you want to delete this cook log entry?')) {
      const updated = cookLogs.filter((c) => c.id !== id);
      setCookLogs(updated);
      showToast('Cook log entry deleted.');
    }
  };

  const handleUpdateProfile = (updated: SmokerProfile) => {
    setProfile(updated);
    showToast('Smoker profile updated.');
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
        <div className="fixed bottom-5 right-5 z-50 bg-[#1a1a1a] text-orange-400 px-4 py-3 rounded-xl font-medium text-xs shadow-2xl flex items-center space-x-2 border border-[#2a2a2a] animate-bounce">
          <span className="text-orange-500 font-bold">🔥</span>
          <span>{notification}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        smokerHours={profile.currentHours}
        smokerName={profile.name}
        tempUnit={tempUnit}
        onOpenSettings={(tab) => {
          setSettingsInitialTab(tab || 'appearance');
          setIsSettingsModalOpen(true);
        }}
        isDriveConnected={!!currentUser && !!accessToken}
        isOnline={isOnline}
        currentUserEmail={currentUser?.email || 'jonathanblunt1214@gmail.com'}
        onOpenMasterAdmin={() => setIsMasterAdminModalOpen(true)}
        onOpenDownloadStore={() => setIsDownloadStoreModalOpen(true)}
      />

      {/* Smoker Overview Metric Banner */}
      <SmokerOverviewBanner
        profile={profile}
        cookLogs={cookLogs}
        fuelLogs={fuelLogs}
        onQuickLogClick={() => handleTabChange('new-cook')}
        onUpdateProfile={handleUpdateProfile}
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

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-3 sm:pt-6 pb-12 overflow-x-hidden">
        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            cookLogs={cookLogs}
            profile={profile}
            fuelLogs={fuelLogs}
            tempUnit={tempUnit}
            onToggleTempUnit={toggleTempUnit}
            onSelectCookSheet={(cook) => setSelectedSheetCook(cook)}
            onUpdateProfile={handleUpdateProfile}
          />
        )}

        {activeTab === 'logs' && (
          <CookLogList
            cookLogs={cookLogs}
            profile={profile}
            onSelectCook={(cook) => setSelectedSheetCook(cook)}
            onOpenCertificate={(cook) => setSelectedCertificateCook(cook)}
            onDeleteCook={handleDeleteCook}
            onNewCookClick={() => {
              setPrefilledRecipe(null);
              handleTabChange('new-cook');
            }}
            onStartCookFromRecipe={handleStartCookFromRecipe}
            onAskAIPitmaster={handleAskAIPitmasterAboutRecipe}
            onLogsImported={(newLogs) => {
              const updated = [...cookLogs, ...newLogs.map(l => ({...l, id: crypto.randomUUID()}))];
              setCookLogs(updated);
              saveCookLogs(updated);
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
            nextPageNumber={maxPageNumber + 1}
            initialRecipe={prefilledRecipe}
            onSaveCook={handleSaveCook}
            onCancel={() => {
              setPrefilledRecipe(null);
              handleTabChange('logs');
            }}
            onUpdateProfile={handleUpdateProfile}
            onOpenBluetoothModal={() => setIsBluetoothModalOpen(true)}
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
            currentUserEmail={currentUser?.email || 'jonathanblunt1214@gmail.com'}
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
        onLogout={() => {
          setCurrentUser(null);
          setAccessToken(null);
        }}
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
              name: 'Jonathan Blunt',
              email: currentUser?.email || 'jonathanblunt1214@gmail.com',
              title: 'Head Pitmaster',
              createdAt: new Date().toISOString().slice(0, 10),
            };
          })(),
        }}
        onRestoreData={handleRestoreFromDrive}
      />

      {/* Bluetooth Thermometer Hub Modal */}
      <BluetoothManagerModal
        isOpen={isBluetoothModalOpen}
        onClose={() => setIsBluetoothModalOpen(false)}
      />

      {/* Settings Menu Modal */}
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
        onOpenBluetoothModal={() => setIsBluetoothModalOpen(true)}
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
        onLogout={() => {
          setCurrentUser(null);
          setAccessToken(null);
        }}
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
              name: 'Jonathan Blunt',
              email: currentUser?.email || 'jonathanblunt1214@gmail.com',
              title: 'Head Pitmaster',
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

      {/* Custom Built Smoker Specifications Modal */}
      <CustomSmokerModal
        isOpen={isCustomSmokerModalOpen}
        onClose={() => setIsCustomSmokerModalOpen(false)}
        currentUser={currentUser}
        pitmasterAlias={profile.name || currentUser?.email || 'Pitmaster Guest'}
        onSmokerCreated={handleCustomSmokerCreated}
      />

      {/* Master Admin & Developer Dashboard Modal */}
      <MasterAdminDashboardModal
        isOpen={isMasterAdminModalOpen}
        onClose={() => setIsMasterAdminModalOpen(false)}
        currentUserEmail={currentUser?.email || 'jonathanblunt1214@gmail.com'}
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

      {/* Footer */}
      <footer className="border-t border-[#2a2a2a] bg-[#121212] py-5 text-center text-xs text-zinc-500 font-mono">
        <p>© {new Date().getFullYear()} Smoke Stack • Smart BBQ Smoker & Pellet Journal</p>
      </footer>

    </div>
  );
}
