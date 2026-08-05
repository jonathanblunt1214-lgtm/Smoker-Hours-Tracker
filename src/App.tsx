import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { SmokerProfile, CookLog, FuelLog } from './types';
import {
  loadSmokerProfile,
  saveSmokerProfile,
  loadCookLogs,
  saveCookLogs,
  loadFuelLogs,
  saveFuelLogs,
  resetAllDataToDefault,
} from './utils/storage';
import { RecipeSuggestion } from './data/recipeSuggestions';
import { initAuth } from './lib/driveSync';
import { Navbar } from './components/Navbar';
import { SmokerOverviewBanner } from './components/SmokerOverviewBanner';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { CookLogList } from './components/CookLogList';
import { CookLogSheetModal } from './components/CookLogSheetModal';
import { CookLogForm } from './components/CookLogForm';
import { CookPlanner } from './components/CookPlanner';
import { FuelAndMaintenance } from './components/FuelAndMaintenance';
import { AIPitmasterModal } from './components/AIPitmasterModal';
import { GoogleDriveSyncModal } from './components/GoogleDriveSyncModal';
import { BluetoothManagerModal } from './components/BluetoothManagerModal';
import { SettingsModal } from './components/SettingsModal';

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
  const [prefilledRecipe, setPrefilledRecipe] = useState<RecipeSuggestion | null>(null);
  const [aiInitialCookId, setAiInitialCookId] = useState<string | null>(null);
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Connection & Offline auto-reconnect sync state
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('🌐 Network reconnected! All offline smoke logs synchronized.');
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

  // Settings, Bluetooth & Google Drive Modal States
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);

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

  // Sync profile changes
  useEffect(() => {
    saveSmokerProfile(profile);
  }, [profile]);

  // Sync cook log changes
  useEffect(() => {
    saveCookLogs(cookLogs);
  }, [cookLogs]);

  // Sync fuel log changes
  useEffect(() => {
    saveFuelLogs(fuelLogs);
  }, [fuelLogs]);

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
      `Hello AI Pitmaster! Please analyze the suggested cook "${recipe.title}" (${recipe.proteinCut}). What wood pellet blends, rub formulas, or temperature curve tweaks do you recommend for optimal results on my smoker (${profile.name || profile.smokerType || 'pellet grill'})?`;
    setAiInitialPrompt(query);
    setAiInitialCookId('ALL_LOGS');
    handleTabChange('ai-pitmaster');
    showToast(`Loaded AI Pitmaster consultation for "${recipe.title}"!`);
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
    showToast('Smoker maintenance schedule updated.');
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

  const handleRestoreFromDrive = (restored: { profile: SmokerProfile; cookLogs: CookLog[]; fuelLogs: FuelLog[] }) => {
    setProfile(restored.profile);
    setCookLogs(restored.cookLogs);
    setFuelLogs(restored.fuelLogs);
    showToast('App data successfully restored from Google Drive backup!');
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
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        isDriveConnected={!!currentUser && !!accessToken}
        isOnline={isOnline}
      />

      {/* Smoker Overview Metric Banner */}
      <SmokerOverviewBanner
        profile={profile}
        cookLogs={cookLogs}
        fuelLogs={fuelLogs}
        onQuickLogClick={() => handleTabChange('new-cook')}
        onUpdateProfile={handleUpdateProfile}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 pb-12 overflow-x-hidden">
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
            onSelectCook={(cook) => setSelectedSheetCook(cook)}
            onDeleteCook={handleDeleteCook}
            onNewCookClick={() => {
              setPrefilledRecipe(null);
              handleTabChange('new-cook');
            }}
            onStartCookFromRecipe={handleStartCookFromRecipe}
            onAskAIPitmaster={handleAskAIPitmasterAboutRecipe}
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
              showToast('Loaded AI Pitmaster consultation for planned cook schedule!');
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
          />
        )}
      </main>

      {/* Printable Smoker Paper Sheet Modal */}
      <CookLogSheetModal
        cook={selectedSheetCook}
        onClose={() => setSelectedSheetCook(null)}
        onAnalyzeWithAI={(cook) => {
          setSelectedSheetCook(null);
          setAiInitialCookId(cook.id);
          setAiInitialPrompt(`Analyze my cook log for "${cook.title}" (${cook.proteinCut}) and suggest key pitmaster improvements.`);
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
      />

      {/* Footer */}
      <footer className="border-t border-[#2a2a2a] bg-[#121212] py-5 text-center text-xs text-zinc-500 font-mono">
        <p>Pitmaster Log & Smoker Consumption Monitor • Pit boss Copperhead & Vertical Pellet Smoker Journal</p>
      </footer>

    </div>
  );
}
