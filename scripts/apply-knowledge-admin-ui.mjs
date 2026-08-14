import fs from 'node:fs';

const sourcePath = 'src/components/MasterAdminDashboardModal.tsx';
const modalOutPath = 'src/components/MasterAdminDashboardModal.trusted.tsx';
const appTrustedPath = 'src/App.trusted.tsx';

let modal = fs.readFileSync(sourcePath, 'utf8');

const typeImport = "import { CookLog, FuelLog, SmokerProfile } from '../types';";
const staticImport = "import { KnowledgeAdminPanel } from './KnowledgeAdminPanel';\n";
const lazyDeclaration = "const KnowledgeAdminPanel = React.lazy(() => import('./KnowledgeAdminPanel').then((module) => ({ default: module.KnowledgeAdminPanel })));";
const meatLazyDeclaration = "const MeatSourceHarvesterPanel = React.lazy(() => import('./MeatSourceHarvesterPanel').then((module) => ({ default: module.MeatSourceHarvesterPanel })));";

modal = modal.replace(staticImport, '');
if (!modal.includes(lazyDeclaration)) {
  if (!modal.includes(typeImport)) throw new Error('[knowledge-admin-ui] type import anchor not found');
  modal = modal.replace(typeImport, `${typeImport}\n\n${lazyDeclaration}\n${meatLazyDeclaration}`);
} else if (!modal.includes(meatLazyDeclaration)) {
  modal = modal.replace(lazyDeclaration, `${lazyDeclaration}\n${meatLazyDeclaration}`);
}

const anchor = `      </Panel>\n    </div>;\n\n    if (activeTab === 'access')`;
const replacement = `      </Panel>\n      <React.Suspense fallback={<div className="rounded-2xl border border-zinc-800 bg-[#141414] p-5 text-sm text-zinc-500">Loading verified knowledge workbench…</div>}>\n        <div className="space-y-5">\n          <MeatSourceHarvesterPanel request={authorizedFetch} showToast={showToast} onChanged={() => loadHealth()} />\n          <KnowledgeAdminPanel request={authorizedFetch} showToast={showToast} onChanged={() => loadHealth()} />\n        </div>\n      </React.Suspense>\n    </div>;\n\n    if (activeTab === 'access')`;

if (!modal.includes('<KnowledgeAdminPanel request={authorizedFetch}')) {
  if (!modal.includes(anchor)) throw new Error('[knowledge-admin-ui] knowledge-tab anchor not found');
  modal = modal.replace(anchor, replacement);
} else if (!modal.includes('<MeatSourceHarvesterPanel request={authorizedFetch}')) {
  modal = modal.replace('<KnowledgeAdminPanel request={authorizedFetch} showToast={showToast} onChanged={() => loadHealth()} />', '<div className="space-y-5"><MeatSourceHarvesterPanel request={authorizedFetch} showToast={showToast} onChanged={() => loadHealth()} /><KnowledgeAdminPanel request={authorizedFetch} showToast={showToast} onChanged={() => loadHealth()} /></div>');
}

if (!modal.includes(lazyDeclaration)) throw new Error('[knowledge-admin-ui] lazy import verification failed');
if (!modal.includes(meatLazyDeclaration)) throw new Error('[knowledge-admin-ui] meat harvester lazy import verification failed');
if (!modal.includes('<React.Suspense fallback=')) throw new Error('[knowledge-admin-ui] suspense verification failed');
if (!modal.includes('<KnowledgeAdminPanel request={authorizedFetch}')) throw new Error('[knowledge-admin-ui] workbench mount verification failed');
if (!modal.includes('<MeatSourceHarvesterPanel request={authorizedFetch}')) throw new Error('[knowledge-admin-ui] meat harvester mount verification failed');

fs.writeFileSync(modalOutPath, modal, 'utf8');

let app = fs.readFileSync(appTrustedPath, 'utf8');
const sourceImportPattern = /from ['"]\.\/components\/MasterAdminDashboardModal['"]/;
if (sourceImportPattern.test(app)) app = app.replace(sourceImportPattern, "from './components/MasterAdminDashboardModal.trusted'");
if (!app.includes("from './components/MasterAdminDashboardModal.trusted'")) throw new Error('[knowledge-admin-ui] App.trusted Operations import was not redirected');

const overviewImport = "import { SmokerOverviewBanner } from './components/SmokerOverviewBanner';";
if (!app.includes("./components/HomeCommandCenter")) {
  if (!app.includes(overviewImport)) throw new Error('[home-command-center] import anchor not found');
  app = app.replace(overviewImport, `${overviewImport}\nimport { HomeCommandCenter } from './components/HomeCommandCenter';`);
}
if (!app.includes("./components/FuelMarketTracker")) {
  if (!app.includes(overviewImport)) throw new Error('[fuel-market] import anchor not found');
  app = app.replace(overviewImport, `${overviewImport}\nimport { FuelMarketTracker } from './components/FuelMarketTracker';`);
}

if (!app.includes('<HomeCommandCenter')) {
  const mainMarker = '      {/* Main Content Area */}';
  if (!app.includes(mainMarker)) throw new Error('[home-command-center] mount anchor not found');
  const panel = `      <HomeCommandCenter\n        profile={profile}\n        cookLogs={cookLogs}\n        tempUnit={tempUnit}\n        onOpenCharGPT={(prompt) => {\n          if (prompt) setAiInitialPrompt(prompt);\n          setAiInitialCookId('ALL_LOGS');\n          handleTabChange('ai-pitmaster');\n        }}\n        onOpenPlanner={() => handleTabChange('planner')}\n        onOpenNewCook={() => {\n          setPrefilledRecipe(null);\n          setEditingCook(null);\n          handleTabChange('new-cook');\n        }}\n      />\n\n`;
  app = app.replace(mainMarker, `${panel}${mainMarker}`);
}

if (!app.includes('<FuelMarketTracker')) {
  const maintenanceBlock = `        {activeTab === 'maintenance' && (\n          <FuelAndMaintenance\n            profile={profile}\n            cookLogs={cookLogs}\n            fuelLogs={fuelLogs}\n            onUpdateProfile={handleUpdateProfile}\n            onAddFuelLog={handleAddFuelLog}\n            onUpdateFuelLog={handleUpdateFuelLog}\n            onDeleteFuelLog={handleDeleteFuelLog}\n          />\n        )}`;
  if (!app.includes(maintenanceBlock)) throw new Error('[fuel-market] maintenance mount anchor not found');
  app = app.replace(maintenanceBlock, `        {activeTab === 'maintenance' && (\n          <>\n            <FuelAndMaintenance\n              profile={profile}\n              cookLogs={cookLogs}\n              fuelLogs={fuelLogs}\n              onUpdateProfile={handleUpdateProfile}\n              onAddFuelLog={handleAddFuelLog}\n              onUpdateFuelLog={handleUpdateFuelLog}\n              onDeleteFuelLog={handleDeleteFuelLog}\n            />\n            <FuelMarketTracker />\n          </>\n        )}`);
}

if (!app.includes('<HomeCommandCenter')) throw new Error('[home-command-center] mount verification failed');
if (!app.includes('<FuelMarketTracker')) throw new Error('[fuel-market] mount verification failed');
fs.writeFileSync(appTrustedPath, app, 'utf8');

console.log('[knowledge-admin-ui] Generated trusted Operations modal with Knowledge and Meat Source Harvester panels.');
console.log('[home-command-center] Mounted the Smoke Stack command center.');
console.log('[fuel-market] Mounted account-linked observed price tracker; no synthetic market movement.');
