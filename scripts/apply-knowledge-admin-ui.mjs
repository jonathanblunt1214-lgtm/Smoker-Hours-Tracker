import fs from 'node:fs';

const p = 'src/components/MasterAdminDashboardModal.tsx';
let s = fs.readFileSync(p, 'utf8');

const typeImport = "import { CookLog, FuelLog, SmokerProfile } from '../types';";
const staticImport = "import { KnowledgeAdminPanel } from './KnowledgeAdminPanel';\n";
const lazyDeclaration = "const KnowledgeAdminPanel = React.lazy(() => import('./KnowledgeAdminPanel').then((module) => ({ default: module.KnowledgeAdminPanel })));";

// A previous local build may have written the old static import into the source tree.
// Remove it so the workbench cannot participate in application startup.
s = s.replace(staticImport, '');

if (!s.includes(lazyDeclaration)) {
  if (!s.includes(typeImport)) throw new Error('[knowledge-admin-ui] type import anchor not found');
  s = s.replace(typeImport, typeImport + '\n\n' + lazyDeclaration);
}

const anchor = '      </Panel>\n    </div>;\n\n    if (activeTab === \'access\')';
const replacement = `      </Panel>
      <React.Suspense fallback={<div className="rounded-2xl border border-zinc-800 bg-[#141414] p-5 text-sm text-zinc-500">Loading verified knowledge workbench…</div>}>
        <KnowledgeAdminPanel request={authorizedFetch} showToast={showToast} onChanged={() => loadHealth()} />
      </React.Suspense>
    </div>;

    if (activeTab === 'access')`;

if (!s.includes('<KnowledgeAdminPanel request={authorizedFetch}')) {
  if (!s.includes(anchor)) throw new Error('[knowledge-admin-ui] knowledge-tab anchor not found');
  s = s.replace(anchor, replacement);
} else if (!s.includes('<React.Suspense fallback=')) {
  // Upgrade a source tree previously mutated by the old patcher.
  s = s.replace(
    '      <KnowledgeAdminPanel request={authorizedFetch} showToast={showToast} onChanged={() => loadHealth()} />',
    '      <React.Suspense fallback={<div className="rounded-2xl border border-zinc-800 bg-[#141414] p-5 text-sm text-zinc-500">Loading verified knowledge workbench…</div>}>\n        <KnowledgeAdminPanel request={authorizedFetch} showToast={showToast} onChanged={() => loadHealth()} />\n      </React.Suspense>',
  );
}

fs.writeFileSync(p, s, 'utf8');
console.log('[knowledge-admin-ui] Knowledge workbench lazy-loaded; application startup is isolated from the admin chunk.');
