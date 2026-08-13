import fs from 'node:fs';

const sourcePath = 'src/components/MasterAdminDashboardModal.tsx';
const modalOutPath = 'src/components/MasterAdminDashboardModal.trusted.tsx';
const appTrustedPath = 'src/App.trusted.tsx';

let modal = fs.readFileSync(sourcePath, 'utf8');

const typeImport = "import { CookLog, FuelLog, SmokerProfile } from '../types';";
const staticImport = "import { KnowledgeAdminPanel } from './KnowledgeAdminPanel';\n";
const lazyDeclaration = "const KnowledgeAdminPanel = React.lazy(() => import('./KnowledgeAdminPanel').then((module) => ({ default: module.KnowledgeAdminPanel })));";

// Generate an isolated trusted modal. Never mutate the checked-in Operations source.
modal = modal.replace(staticImport, '');
if (!modal.includes(lazyDeclaration)) {
  if (!modal.includes(typeImport)) throw new Error('[knowledge-admin-ui] type import anchor not found');
  modal = modal.replace(typeImport, `${typeImport}\n\n${lazyDeclaration}`);
}

const anchor = `      </Panel>\n    </div>;\n\n    if (activeTab === 'access')`;
const replacement = `      </Panel>\n      <React.Suspense fallback={<div className="rounded-2xl border border-zinc-800 bg-[#141414] p-5 text-sm text-zinc-500">Loading verified knowledge workbench…</div>}>\n        <KnowledgeAdminPanel request={authorizedFetch} showToast={showToast} onChanged={() => loadHealth()} />\n      </React.Suspense>\n    </div>;\n\n    if (activeTab === 'access')`;

if (!modal.includes('<KnowledgeAdminPanel request={authorizedFetch}')) {
  if (!modal.includes(anchor)) throw new Error('[knowledge-admin-ui] knowledge-tab anchor not found');
  modal = modal.replace(anchor, replacement);
}

if (!modal.includes(lazyDeclaration)) throw new Error('[knowledge-admin-ui] lazy import verification failed');
if (!modal.includes('<React.Suspense fallback=')) throw new Error('[knowledge-admin-ui] suspense verification failed');
if (!modal.includes('<KnowledgeAdminPanel request={authorizedFetch}')) throw new Error('[knowledge-admin-ui] workbench mount verification failed');

fs.writeFileSync(modalOutPath, modal, 'utf8');

let app = fs.readFileSync(appTrustedPath, 'utf8');
const sourceImportPattern = /from ['"]\.\/components\/MasterAdminDashboardModal['"]/;
if (sourceImportPattern.test(app)) {
  app = app.replace(sourceImportPattern, "from './components/MasterAdminDashboardModal.trusted'");
}
if (!app.includes("from './components/MasterAdminDashboardModal.trusted'")) {
  throw new Error('[knowledge-admin-ui] App.trusted Operations import was not redirected');
}
fs.writeFileSync(appTrustedPath, app, 'utf8');

console.log('[knowledge-admin-ui] Generated trusted Operations modal; Knowledge workbench is mounted and lazy-loaded.');
