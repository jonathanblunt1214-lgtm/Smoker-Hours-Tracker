import fs from 'node:fs';
const p='src/components/MasterAdminDashboardModal.tsx';
let s=fs.readFileSync(p,'utf8');
const i="import { CookLog, FuelLog, SmokerProfile } from '../types';";
if(!s.includes("KnowledgeAdminPanel")) s=s.replace(i,i+"\nimport { KnowledgeAdminPanel } from './KnowledgeAdminPanel';");
const a='      </Panel>\n    </div>;\n\n    if (activeTab === \'access\')';
const r='      </Panel>\n      <KnowledgeAdminPanel request={authorizedFetch} showToast={showToast} onChanged={() => loadHealth()} />\n    </div>;\n\n    if (activeTab === \'access\')';
if(!s.includes('<KnowledgeAdminPanel ')){if(!s.includes(a))throw new Error('[knowledge-admin-ui] anchor not found');s=s.replace(a,r);}
fs.writeFileSync(p,s,'utf8');
console.log('[knowledge-admin-ui] Operations Knowledge workbench wired.');
