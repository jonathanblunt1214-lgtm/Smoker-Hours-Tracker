import fs from 'node:fs';

const appPath = 'src/App.trusted.tsx';
let app = fs.readFileSync(appPath, 'utf8');
const overviewImport = "import { SmokerOverviewBanner } from './components/SmokerOverviewBanner';";
if (!app.includes("./components/BrowserInstallShareWidget")) {
  app = app.replace(overviewImport, `${overviewImport}\nimport { BrowserInstallShareWidget } from './components/BrowserInstallShareWidget';\nimport { startAuthoritativePlatformSync } from './lib/platformSync';`);
}

if (!app.includes('startAuthoritativePlatformSync(currentUser.uid')) {
  const marker = '  // Automatically synchronize profile hours with initial hours & published cook logs';
  const block = `  const [platformSyncHydrated, setPlatformSyncHydrated] = useState(false);\n\n  useEffect(() => {\n    if (!currentUser?.uid) {\n      setPlatformSyncHydrated(false);\n      return;\n    }\n    setPlatformSyncHydrated(false);\n    return startAuthoritativePlatformSync(currentUser.uid, {\n      onProfile: setProfile,\n      onCookLogs: setCookLogs,\n      onFuelLogs: setFuelLogs,\n      onStatus: setSyncStatus,\n      onHydrated: () => setPlatformSyncHydrated(true),\n    });\n  }, [currentUser?.uid]);\n\n  useEffect(() => {\n    if (!currentUser?.uid || !platformSyncHydrated) return;\n    const timer = window.setTimeout(() => {\n      setSyncStatus('syncing');\n      saveUserBundleToFirestore(currentUser.uid, {\n        profile, cookLogs, fuelLogs, charGPTMemory: loadCharGPTMemory(), deletedCookLogIds: loadDeletedCookLogIds(),\n      }).then((success) => setSyncStatus(success ? 'synced' : 'error')).catch(() => setSyncStatus('error'));\n    }, 350);\n    return () => window.clearTimeout(timer);\n  }, [profile, cookLogs, fuelLogs, currentUser?.uid, platformSyncHydrated]);\n\n  useEffect(() => {\n    const params = new URLSearchParams(window.location.search);\n    const view = params.get('view');\n    if (view && ['analytics','logs','planner','new-cook','maintenance','ai-pitmaster'].includes(view)) handleTabChange(view as any);\n    if (params.get('share') === '1') {\n      const shared = [params.get('title'), params.get('text'), params.get('url')].filter(Boolean).join('\\n');\n      if (shared) { setAiInitialPrompt('Review this shared item for my BBQ workflow. Treat it as unverified unless Knowledge has provenance.\\n\\n' + shared); setAiInitialCookId('ALL_LOGS'); handleTabChange('ai-pitmaster'); }\n    }\n  }, []);\n\n`;
  const routedBlock = block.replace("['analytics'", "['home','analytics'");
  if (!app.includes(marker)) throw new Error('[platform] sync anchor missing');
  app = app.replace(marker, routedBlock + marker);
}

// In the trusted runtime Firestore is authoritative for signed-in account data.
// The legacy master-version path previously reloaded local storage and could
// overwrite a freshly hydrated Firestore profile or merge a competing dataset.
const legacyRunnerBlock = `    const cleanup = initMasterLiveUpdateRunner(() => {\n      // Reload state on live updates\n      setProfile(loadSmokerProfile());\n      setCookLogs(loadCookLogs());\n      setFuelLogs(loadFuelLogs());\n    });`;
if (app.includes(legacyRunnerBlock)) {
  app = app.replace(legacyRunnerBlock, `    // Disabled in trusted runtime: Firestore is the authoritative account data source.\n    const cleanup = () => {};`);
}
app = app.replace(
  '    window.addEventListener(MASTER_SYNC_DATA_MERGED_EVENT, handleMasterSyncMerged);',
  '    // Legacy master-data merge intentionally not registered in trusted runtime.'
);
app = app.replace(
  "    triggerMasterVersionSync().catch((err) => console.warn('Background master sync trigger:', err));",
  '    // Legacy master-version upload disabled; Firestore account sync owns user data.'
);

if (!app.includes('<BrowserInstallShareWidget')) {
  const marker = '      {/* Main Content Area */}';
  const widget = `      <BrowserInstallShareWidget onOpenPlanner={() => handleTabChange('planner')} onStartCook={() => { setPrefilledRecipe(null); setEditingCook(null); handleTabChange('new-cook'); }} onOpenCharGPT={() => { setAiInitialCookId('ALL_LOGS'); handleTabChange('ai-pitmaster'); }} />\n\n`;
  if (!app.includes(marker)) throw new Error('[platform] widget anchor missing');
  app = app.replace(marker, widget + marker);
}

const fuelSource = 'src/components/FuelDatabaseExplorer.tsx';
const fuelOut = 'src/components/FuelDatabaseExplorer.trusted.tsx';
let fuel = fs.readFileSync(fuelSource, 'utf8');
if (!fuel.includes("../utils/costUnits")) fuel = fuel.replace("import React, { useState, useMemo } from 'react';", "import React, { useState, useMemo } from 'react';\nimport { calculateCostPerLb } from '../utils/costUnits';");
fuel = fuel.replace("const costPerLb = restockBagLbs > 0 ? Number((restockPrice / restockBagLbs).toFixed(2)) : 0.75;", "const calculatedCostPerLb = calculateCostPerLb(restockPrice, restockBagLbs);\n    if (calculatedCostPerLb === null) return;\n    const costPerLb = Number(calculatedCostPerLb.toFixed(2));");
if (fuel.includes(': 0.75;')) throw new Error('[cost-units] fabricated cost fallback remains');
fs.writeFileSync(fuelOut, fuel, 'utf8');
app = app.replace("from './components/FuelDatabaseExplorer'", "from './components/FuelDatabaseExplorer.trusted'");

if (!app.includes('<BrowserInstallShareWidget') || !app.includes('startAuthoritativePlatformSync(currentUser.uid')) throw new Error('[platform] integration verification failed');
if (!app.includes('platformSyncHydrated')) throw new Error('[platform] hydration barrier missing');
if (app.includes('window.addEventListener(MASTER_SYNC_DATA_MERGED_EVENT, handleMasterSyncMerged)')) throw new Error('[platform] competing master merge remains active');
fs.writeFileSync(appPath, app, 'utf8');
console.log('[platform] Firestore-authoritative hydrated sync, PWA actions, and verified cost units mounted; legacy competing master merge disabled.');
