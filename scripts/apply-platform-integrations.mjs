import fs from 'node:fs';

const appPath = 'src/App.trusted.tsx';
let app = fs.readFileSync(appPath, 'utf8');
const overviewImport = "import { SmokerOverviewBanner } from './components/SmokerOverviewBanner';";
if (!app.includes("./components/BrowserInstallShareWidget")) {
  app = app.replace(overviewImport, `${overviewImport}\nimport { BrowserInstallShareWidget } from './components/BrowserInstallShareWidget';\nimport { startAuthoritativePlatformSync } from './lib/platformSync';`);
}

if (!app.includes('startAuthoritativePlatformSync(currentUser.uid')) {
  const marker = '  // Automatically synchronize profile hours with initial hours & published cook logs';
  const block = `  useEffect(() => {\n    if (!currentUser?.uid) return;\n    return startAuthoritativePlatformSync(currentUser.uid, {\n      onProfile: setProfile, onCookLogs: setCookLogs, onFuelLogs: setFuelLogs, onStatus: setSyncStatus,\n    });\n  }, [currentUser?.uid]);\n\n  useEffect(() => {\n    if (!currentUser?.uid) return;\n    const timer = window.setTimeout(() => {\n      setSyncStatus('syncing');\n      saveUserBundleToFirestore(currentUser.uid, {\n        profile, cookLogs, fuelLogs, charGPTMemory: loadCharGPTMemory(), deletedCookLogIds: loadDeletedCookLogIds(),\n      }).then((success) => setSyncStatus(success ? 'synced' : 'error')).catch(() => setSyncStatus('error'));\n    }, 350);\n    return () => window.clearTimeout(timer);\n  }, [profile, fuelLogs, currentUser?.uid]);\n\n  useEffect(() => {\n    const params = new URLSearchParams(window.location.search);\n    const view = params.get('view');\n    if (view && ['analytics','logs','planner','new-cook','maintenance','ai-pitmaster'].includes(view)) handleTabChange(view as any);\n    if (params.get('share') === '1') {\n      const shared = [params.get('title'), params.get('text'), params.get('url')].filter(Boolean).join('\\n');\n      if (shared) { setAiInitialPrompt('Review this shared item for my BBQ workflow. Treat it as unverified unless Knowledge has provenance.\\n\\n' + shared); setAiInitialCookId('ALL_LOGS'); handleTabChange('ai-pitmaster'); }\n    }\n  }, []);\n\n`;
  if (!app.includes(marker)) throw new Error('[platform] sync anchor missing');
  app = app.replace(marker, block + marker);
}

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
fs.writeFileSync(appPath, app, 'utf8');
console.log('[platform] Realtime Firestore sync, PWA install/share actions, shortcuts, and verified cost units mounted.');
