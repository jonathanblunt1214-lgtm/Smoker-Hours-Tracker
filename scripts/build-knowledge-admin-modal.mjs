import fs from 'node:fs';

const sourcePath = 'src/components/MasterAdminDashboardModal.tsx';
const modalOutPath = 'src/components/MasterAdminDashboardModal.trusted.tsx';
const appTrustedPath = 'src/App.trusted.tsx';

let modal = fs.readFileSync(sourcePath, 'utf8');

const typeImport = "import { CookLog, FuelLog, SmokerProfile } from '../types';";
const staticImport = "import { KnowledgeAdminPanel } from './KnowledgeAdminPanel';\n";
const lazyDeclaration = "const KnowledgeAdminPanel = React.lazy(() => import('./KnowledgeAdminPanel').then((module) => ({ default: module.KnowledgeAdminPanel })));";

// Never put the workbench in the startup module graph.
modal = modal.replace(staticImport, '');
if (!modal.includes(lazyDeclaration)) {
  if (!modal.includes(typeImport)) throw new Error('[knowledge-admin-modal] type import anchor not found');
  modal = modal.replace(typeImport, `${typeImport}\n\n${lazyDeclaration}`);
}

const knowledgeAnchor = `      </Panel>\n    </div>;\n\n    if (activeTab === 'access')`;
const knowledgeReplacement = `      </Panel>\n      <React.Suspense fallback={<div className="rounded-2xl border border-zinc-800 bg-[#141414] p-5 text-sm text-zinc-500">Loading verified knowledge workbench…</div>}>\n        <KnowledgeAdminPanel request={authorizedFetch} showToast={showToast} onChanged={() => loadHealth()} />\n      </React.Suspense>\n    </div>;\n\n    if (activeTab === 'access')`;

if (!modal.includes('<KnowledgeAdminPanel request={authorizedFetch}')) {
  if (!modal.includes(knowledgeAnchor)) throw new Error('[knowledge-admin-modal] Knowledge tab anchor not found');
  modal = modal.replace(knowledgeAnchor, knowledgeReplacement);
}

if (!modal.includes('React.lazy(() => import(\'./KnowledgeAdminPanel\')')) {
  throw new Error('[knowledge-admin-modal] lazy import verification failed');
}
if (!modal.includes('<React.Suspense fallback=')) {
  throw new Error('[knowledge-admin-modal] suspense verification failed');
}
if (!modal.includes('<KnowledgeAdminPanel request={authorizedFetch}')) {
  throw new Error('[knowledge-admin-modal] workbench mount verification failed');
}

fs.writeFileSync(modalOutPath, modal, 'utf8');

let app = fs.readFileSync(appTrustedPath, 'utf8');
const sourceImportPattern = /from ['"]\.\/components\/MasterAdminDashboardModal['"]/;
if (sourceImportPattern.test(app)) {
  app = app.replace(sourceImportPattern, "from './components/MasterAdminDashboardModal.trusted'");
}
if (!app.includes("from './components/MasterAdminDashboardModal.trusted'")) {
  throw new Error('[knowledge-admin-modal] App.trusted Operations import was not redirected');
}
fs.writeFileSync(appTrustedPath, app, 'utf8');

console.log('[knowledge-admin-modal] Generated trusted Operations modal with lazy Knowledge workbench and redirected App.trusted import.');
