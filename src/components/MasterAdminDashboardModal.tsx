import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronRight,
  Database,
  GitBranch,
  History,
  RefreshCw,
  Server,
  Settings2,
  ShieldCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import { auth } from '../lib/driveSync';
import { CookLog, FuelLog, SmokerProfile } from '../types';

interface MasterAdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string | null;
  profile: SmokerProfile;
  cookLogs: CookLog[];
  fuelLogs: FuelLog[];
  onRefreshData?: () => void;
  showToast: (msg: string) => void;
}

type Role = 'owner' | 'admin' | 'user';
type Tab = 'overview' | 'chargpt' | 'health' | 'sync' | 'knowledge' | 'access' | 'releases' | 'data' | 'audit';

type ServiceState = { status: string; detail?: string | null };
type KnowledgePipeline = { id: string; label: string; status: string; sourcePolicy: string };

type HealthResponse = {
  generatedAt: string;
  environment: string;
  summary?: { overall: string; attention: string[] };
  services: Record<string, ServiceState>;
  chargpt?: {
    status: string;
    provider: string | null;
    model: string | null;
    credentials: string;
    retrieval: string;
    evaluation: string;
    feedbackReview: string;
    durableLearning: string;
    detail: string;
  };
  knowledge?: {
    status: string;
    pipelines: KnowledgePipeline[];
    publishingPolicy: string;
  };
  release: {
    appVersion: string | null;
    commit: string | null;
    revision: string | null;
    status: string;
  };
};

type MeResponse = {
  uid: string;
  email: string | null;
  role: Role;
  permissions: { admin: boolean; owner: boolean; developer: boolean };
};

type AuditEvent = {
  id: string;
  actorUid: string | null;
  actorRole: string | null;
  action: string;
  targetUid: string | null;
  metadata: Record<string, unknown>;
  createdAt: string | null;
};

type AdminRoleRecord = {
  uid: string;
  email: string | null;
  role: string;
  developer: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
};

const NAV: Array<{ id: Tab; label: string; icon: React.ReactNode; ownerOnly?: boolean }> = [
  { id: 'overview', label: 'Command Center', icon: <Activity className="h-4 w-4" /> },
  { id: 'chargpt', label: 'CharGPT', icon: <Brain className="h-4 w-4" /> },
  { id: 'health', label: 'System Health', icon: <Server className="h-4 w-4" /> },
  { id: 'sync', label: 'Data & Sync', icon: <RefreshCw className="h-4 w-4" /> },
  { id: 'knowledge', label: 'Knowledge', icon: <Database className="h-4 w-4" /> },
  { id: 'access', label: 'Users & Access', icon: <Users className="h-4 w-4" />, ownerOnly: true },
  { id: 'releases', label: 'Releases', icon: <GitBranch className="h-4 w-4" /> },
  { id: 'data', label: 'Data Operations', icon: <Settings2 className="h-4 w-4" /> },
  { id: 'audit', label: 'Audit Log', icon: <History className="h-4 w-4" /> },
];

async function authorizedFetch(path: string, init: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Verified Firebase sign-in required.');
  const token = await user.getIdToken();
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(path, { ...init, headers });
}

const humanStatus = (status?: string | null) => {
  if (!status) return 'Unknown';
  return status.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const statusTone = (status?: string | null) => {
  const good = ['healthy', 'operational', 'configured', 'ready', 'metadata_available'];
  const warning = ['attention_required', 'needs_setup', 'not_configured', 'missing', 'approval_required', 'client_managed', 'metadata_unavailable'];
  if (status && good.includes(status)) return 'border-emerald-800/60 bg-emerald-500/5 text-emerald-300';
  if (status && warning.includes(status)) return 'border-amber-800/60 bg-amber-500/5 text-amber-300';
  if (status === 'degraded') return 'border-red-800/60 bg-red-500/5 text-red-300';
  return 'border-zinc-800 bg-zinc-900/60 text-zinc-400';
};

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : 'Not available';

const Panel: React.FC<{ title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }> = ({ title, subtitle, icon, children, action }) => (
  <section className="rounded-2xl border border-zinc-800 bg-[#141414] p-4 sm:p-5">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex gap-3">
        {icon && <div className="mt-0.5 rounded-xl bg-zinc-900 p-2 text-orange-400">{icon}</div>}
        <div><h3 className="font-semibold text-white">{title}</h3>{subtitle && <p className="mt-1 text-xs leading-5 text-zinc-500">{subtitle}</p>}</div>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const StatusCard: React.FC<{ label: string; state?: ServiceState | null; status?: string; detail?: string | null }> = ({ label, state, status, detail }) => {
  const resolvedStatus = status || state?.status || 'unknown';
  const resolvedDetail = detail ?? state?.detail;
  return (
    <div className={`rounded-xl border p-3 ${statusTone(resolvedStatus)}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-zinc-100">{label}</span>
        <span className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">{humanStatus(resolvedStatus)}</span>
      </div>
      {resolvedDetail && <p className="mt-2 text-xs leading-5 text-zinc-500">{resolvedDetail}</p>}
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string; detail?: string }> = ({ label, value, detail }) => (
  <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
    <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
    <div className="mt-1 text-xl font-semibold text-white">{value}</div>
    {detail && <div className="mt-1 text-xs text-zinc-600">{detail}</div>}
  </div>
);

export const MasterAdminDashboardModal: React.FC<MasterAdminDashboardModalProps> = ({
  isOpen,
  onClose,
  profile,
  cookLogs,
  fuelLogs,
  onRefreshData,
  showToast,
}) => {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [roles, setRoles] = useState<AdminRoleRecord[]>([]);
  const [targetUid, setTargetUid] = useState('');
  const [grantDeveloper, setGrantDeveloper] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const totals = useMemo(() => ({
    cooks: cookLogs.length,
    fuels: fuelLogs.length,
    hours: Number(profile.currentHours || 0).toFixed(1),
  }), [cookLogs.length, fuelLogs.length, profile.currentHours]);

  const tabs = useMemo(() => NAV.filter((item) => !item.ownerOnly || me?.permissions.owner), [me]);

  const loadHealth = async () => {
    const res = await authorizedFetch('/api/admin/health');
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `Health check failed (${res.status}).`);
    setHealth(data);
  };

  const loadAudit = async () => {
    const res = await authorizedFetch('/api/admin/audit');
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `Audit log failed (${res.status}).`);
    setAuditEvents(Array.isArray(data?.events) ? data.events : []);
  };

  const loadRoles = async () => {
    const res = await authorizedFetch('/api/admin/roles');
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `Role directory failed (${res.status}).`);
    setRoles(Array.isArray(data?.roles) ? data.roles : []);
  };

  const refreshSection = async (tab: Tab) => {
    if (!me?.permissions.admin) return;
    setSectionLoading(true);
    setError(null);
    try {
      if (['overview', 'chargpt', 'health', 'sync', 'knowledge', 'releases'].includes(tab)) await loadHealth();
      if (tab === 'audit') await loadAudit();
      if (tab === 'access' && me.permissions.owner) await loadRoles();
    } catch (err: any) {
      setError(err?.message || 'Section unavailable.');
    } finally {
      setSectionLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setActiveTab('overview');
    authorizedFetch('/api/admin/me')
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 403 ? 'Administrator access is not granted to this account.' : `Admin role check failed (${res.status}).`);
        return res.json();
      })
      .then(async (data: MeResponse) => {
        if (cancelled) return;
        setMe(data);
        await loadHealth().catch(() => undefined);
      })
      .catch((err: any) => !cancelled && setError(err?.message || 'Unable to verify administrator access.'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !me?.permissions.admin) return;
    void refreshSection(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isOpen, me?.uid]);

  if (!isOpen) return null;

  const grantAdmin = async () => {
    if (!me?.permissions.owner || !targetUid.trim()) return;
    setBusy('grant');
    try {
      const res = await authorizedFetch('/api/admin/grant', { method: 'POST', body: JSON.stringify({ uid: targetUid.trim(), role: 'admin', developer: grantDeveloper }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Grant failed.');
      showToast('Administrator access granted.');
      setTargetUid('');
      setGrantDeveloper(false);
      await loadRoles();
    } catch (err: any) {
      showToast(err?.message || 'Could not grant administrator access.');
    } finally { setBusy(null); }
  };

  const revokeAdmin = async (uid: string) => {
    if (!me?.permissions.owner || !uid) return;
    setBusy(`revoke:${uid}`);
    try {
      const res = await authorizedFetch('/api/admin/revoke', { method: 'POST', body: JSON.stringify({ uid }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Revoke failed.');
      showToast('Administrator access revoked.');
      await loadRoles();
    } catch (err: any) {
      showToast(err?.message || 'Could not revoke administrator access.');
    } finally { setBusy(null); }
  };

  const service = (key: string) => health?.services?.[key] || { status: 'unknown', detail: 'Status has not been checked.' };
  const attention = health?.summary?.attention || [];

  const content = () => {
    if (!me) return null;

    if (activeTab === 'overview') return <div className="space-y-5">
      <div className={`rounded-2xl border p-5 ${statusTone(health?.summary?.overall)}`}>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em]">SmokeStack Operations</div>
            <h3 className="mt-2 text-2xl font-semibold text-white">{health?.summary?.overall === 'healthy' ? 'Core systems are healthy' : 'Action is required'}</h3>
            <p className="mt-1 max-w-2xl text-sm text-zinc-400">CharGPT, account data, verified knowledge, releases, and owner controls in one place.</p>
          </div>
          <span className="rounded-full border border-current/20 px-3 py-1.5 text-xs font-semibold">{humanStatus(health?.summary?.overall || 'unknown')}</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Signed-in role" value={me.role.toUpperCase()} detail="Firebase verified" />
        <Metric label="Cook records" value={String(totals.cooks)} />
        <Metric label="Fuel records" value={String(totals.fuels)} />
        <Metric label="Smoker hours" value={totals.hours} />
      </div>

      <Panel title="What needs attention" subtitle="Only real configuration gaps and degraded services appear here." icon={<AlertTriangle className="h-4 w-4" />}>
        {attention.length ? <div className="space-y-2">{attention.map((item) => <div key={item} className="flex gap-3 rounded-xl border border-amber-900/40 bg-amber-500/5 p-3 text-sm text-zinc-300"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /><span>{item}</span></div>)}</div> : <div className="flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4" />No current operational alerts.</div>}
      </Panel>

      <Panel title="CharGPT readiness" subtitle="AI is treated as a production system, not a chatbot widget." icon={<Brain className="h-4 w-4" />} action={<button onClick={() => setActiveTab('chargpt')} className="text-xs text-orange-300">Open CharGPT <ChevronRight className="inline h-3.5 w-3.5" /></button>}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatusCard label="Model access" status={health?.chargpt?.status} detail={health?.chargpt?.provider || 'Provider not reported'} />
          <StatusCard label="Knowledge retrieval" status={health?.chargpt?.retrieval} />
          <StatusCard label="Evaluation" status={health?.chargpt?.evaluation} />
          <StatusCard label="Learning approvals" status={health?.chargpt?.durableLearning} />
        </div>
      </Panel>

      <Panel title="Core platform" icon={<Server className="h-4 w-4" />}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatusCard label="Operations API" state={service('api')} />
          <StatusCard label="Account data" state={service('firestore')} />
          <StatusCard label="Account sync" state={service('sync')} />
          <StatusCard label="Verified knowledge" state={service('knowledgePipelines')} />
        </div>
      </Panel>
    </div>;

    if (activeTab === 'chargpt') return <div className="space-y-5">
      <Panel title="CharGPT production readiness" subtitle="The AI cooking assistant is the primary intelligence layer for SmokeStack." icon={<Brain className="h-4 w-4" />}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatusCard label="AI provider" status={health?.chargpt?.credentials} detail={health?.chargpt?.provider || 'No provider reported'} />
          <StatusCard label="Model selection" status={health?.chargpt?.model ? 'configured' : 'not_configured'} detail={health?.chargpt?.model || 'Runtime model is not explicitly identified.'} />
          <StatusCard label="Knowledge retrieval" status={health?.chargpt?.retrieval} detail="Verified retrieval must be implemented before CharGPT can ground answers in published SmokeStack knowledge." />
          <StatusCard label="Evaluation suite" status={health?.chargpt?.evaluation} detail="Production AI quality checks have not been reported by the server." />
          <StatusCard label="Feedback review" status={health?.chargpt?.feedbackReview} detail="User feedback needs an auditable review path before changing behavior." />
          <StatusCard label="Durable learning" status={health?.chargpt?.durableLearning} detail="Permanent learning remains approval-gated by design." />
        </div>
      </Panel>
      <Panel title="Current CharGPT priority" subtitle="What must be built before CharGPT is a true cooking assistant platform." icon={<Activity className="h-4 w-4" />}>
        <div className="grid gap-3 md:grid-cols-2">
          {['Verified source retrieval for smoker, fuel, meat, mod, and cooking-safety knowledge.','Live cook context: smoker, probes, targets, elapsed time, fuel, weather, and user actions.','Evaluation harness for food safety, hallucination resistance, timing guidance, and equipment-specific advice.','Explicit user-approved memory and learning workflows; no silent durable learning.'].map((item, index) => <div key={item} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"><div className="text-xs font-semibold text-orange-400">PRIORITY {index + 1}</div><p className="mt-2 text-sm leading-6 text-zinc-300">{item}</p></div>)}
        </div>
      </Panel>
    </div>;

    if (activeTab === 'health') return <div className="space-y-5">
      <Panel title="System health" subtitle={`Last checked ${formatDate(health?.generatedAt)} · Environment ${health?.environment || 'unknown'}`} icon={<Server className="h-4 w-4" />} action={<button onClick={() => void refreshSection('health')} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300"><RefreshCw className={`mr-1.5 inline h-3.5 w-3.5 ${sectionLoading ? 'animate-spin' : ''}`} />Refresh</button>}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Object.entries(health?.services || {}).map(([key, state]) => <StatusCard key={key} label={key === 'knowledgePipelines' ? 'Verified knowledge' : humanStatus(key)} state={state} />)}</div>
      </Panel>
    </div>;

    if (activeTab === 'sync') return <div className="space-y-5">
      <Panel title="SmokeStack account data" subtitle="Firestore is the authoritative signed-in account data layer." icon={<RefreshCw className="h-4 w-4" />}>
        <div className="grid gap-3 sm:grid-cols-2"><StatusCard label="Firestore" state={service('firestore')} /><StatusCard label="Account synchronization" state={service('sync')} /></div>
      </Panel>
      <Panel title="Backup separation" subtitle="Backup is deliberately separate from account synchronization." icon={<Database className="h-4 w-4" />}>
        <StatusCard label="Google Drive backup" state={service('backup')} />
        <p className="mt-4 text-xs leading-5 text-zinc-500">A Drive backup preference or connection must never be reported as a successful backup unless a real Drive write completes.</p>
      </Panel>
    </div>;

    if (activeTab === 'knowledge') return <div className="space-y-5">
      <Panel title="Verified knowledge pipelines" subtitle="These pipelines power trustworthy CharGPT retrieval and the catalog surfaces." icon={<Database className="h-4 w-4" />}>
        <div className="grid gap-3 sm:grid-cols-2">{(health?.knowledge?.pipelines || []).map((pipeline) => <StatusCard key={pipeline.id} label={pipeline.label} status={pipeline.status} detail={pipeline.sourcePolicy} />)}</div>
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs leading-5 text-zinc-500">{health?.knowledge?.publishingPolicy || 'No knowledge publishing policy was reported.'}</div>
      </Panel>
      <Panel title="Publishing gate" subtitle="No automated ingestion becomes trusted knowledge without provenance and review." icon={<ShieldCheck className="h-4 w-4" />}>
        <div className="grid gap-3 md:grid-cols-4">{['Acquire source','Normalize record','Verify provenance','Approve & publish'].map((step, i) => <div key={step} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3"><div className="text-xs text-orange-400">{i + 1}</div><div className="mt-1 text-sm font-medium text-zinc-200">{step}</div></div>)}</div>
      </Panel>
    </div>;

    if (activeTab === 'access') return <div className="space-y-5">
      <Panel title="Grant administrator access" subtitle="Only OWNER can change administrator privileges." icon={<UserPlus className="h-4 w-4" />}>
        <input value={targetUid} onChange={(e) => setTargetUid(e.target.value)} placeholder="Verified Firebase UID" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
        <label className="mt-3 flex items-center gap-2 text-sm text-zinc-400"><input type="checkbox" checked={grantDeveloper} onChange={(e) => setGrantDeveloper(e.target.checked)} />Also grant developer scope</label>
        <button disabled={!targetUid.trim() || busy !== null} onClick={() => void grantAdmin()} className="mt-4 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50">Grant admin</button>
      </Panel>
      <Panel title="Delegated access" icon={<Users className="h-4 w-4" />}>
        {roles.length === 0 ? <p className="text-sm text-zinc-500">No delegated administrators.</p> : <div className="divide-y divide-zinc-800">{roles.map((role) => <div key={role.uid} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-sm font-medium text-white">{role.email || role.uid}</div><div className="mt-1 text-xs text-zinc-500">{humanStatus(role.role)} · Developer {role.developer ? 'yes' : 'no'} · {formatDate(role.updatedAt)}</div></div>{role.role === 'admin' && <button disabled={busy !== null} onClick={() => void revokeAdmin(role.uid)} className="rounded-lg border border-red-900/60 px-3 py-1.5 text-xs text-red-300"><UserX className="mr-1 inline h-3.5 w-3.5" />Revoke</button>}</div>)}</div>}
      </Panel>
    </div>;

    if (activeTab === 'releases') return <Panel title="Release authority" subtitle="GitHub and CI own production release truth." icon={<GitBranch className="h-4 w-4" />}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="App version" value={health?.release?.appVersion || 'Not reported'} /><Metric label="Commit" value={health?.release?.commit ? health.release.commit.slice(0, 10) : 'Not reported'} /><Metric label="Revision" value={health?.release?.revision || 'Not reported'} /><Metric label="Metadata" value={humanStatus(health?.release?.status)} /></div>
    </Panel>;

    if (activeTab === 'data') return <div className="space-y-5"><Panel title="Data operations" subtitle="Destructive global data tools remain intentionally unavailable until scoped safeguards and audit workflows exist." icon={<Settings2 className="h-4 w-4" />}><div className="rounded-xl border border-amber-900/50 bg-amber-500/5 p-4 text-sm text-zinc-300"><AlertTriangle className="mr-2 inline h-4 w-4 text-amber-400" />No unrestricted production data mutation controls are exposed here.</div>{onRefreshData && <button onClick={onRefreshData} className="mt-4 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300">Refresh current account view</button>}</Panel></div>;

    if (activeTab === 'audit') return <Panel title="Administrator audit log" subtitle="Consequential role changes and privileged actions are recorded server-side." icon={<History className="h-4 w-4" />}>
      {auditEvents.length === 0 ? <p className="text-sm text-zinc-500">No audit events returned.</p> : <div className="divide-y divide-zinc-800">{auditEvents.map((event) => <div key={event.id} className="py-3"><div className="flex flex-col justify-between gap-1 sm:flex-row"><span className="text-sm font-medium text-zinc-200">{humanStatus(event.action)}</span><span className="text-xs text-zinc-600">{formatDate(event.createdAt)}</span></div><div className="mt-1 text-xs text-zinc-500">Actor {event.actorRole || 'unknown'} · Target {event.targetUid || 'system'}</div></div>)}</div>}
    </Panel>;

    return null;
  };

  return <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/80 p-0 backdrop-blur-sm sm:p-4">
    <div className="mx-auto flex min-h-full max-w-7xl flex-col overflow-hidden bg-[#0e0e0e] sm:min-h-0 sm:rounded-2xl sm:border sm:border-zinc-800 sm:shadow-2xl lg:h-[calc(100vh-2rem)] lg:flex-row">
      <aside className="border-b border-zinc-800 bg-zinc-950 p-4 lg:w-64 lg:border-b-0 lg:border-r">
        <div className="mb-5 flex items-center gap-3 px-2"><div className="rounded-xl bg-orange-500/15 p-2 text-orange-400"><ShieldCheck className="h-5 w-5" /></div><div><div className="font-semibold text-white">SmokeStack Operations</div><div className="text-xs text-zinc-500">{me ? `${me.role.toUpperCase()} console` : 'Verifying access'}</div></div></div>
        <nav className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible">{tabs.map((item) => <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition lg:w-full ${activeTab === item.id ? 'bg-orange-500/15 text-orange-300' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}>{item.icon}<span>{item.label}</span></button>)}</nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-800 bg-[#0e0e0e]/95 px-5 py-4 backdrop-blur">
          <div><h2 className="text-lg font-semibold text-white">{NAV.find((x) => x.id === activeTab)?.label}</h2><p className="mt-0.5 text-xs text-zinc-500">Real state only · no fabricated telemetry</p></div>
          <button onClick={onClose} aria-label="Close SmokeStack Operations" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white"><X className="h-5 w-5" /></button>
        </header>
        <div className="p-4 sm:p-6">
          {loading && <div className="py-20 text-center text-sm text-zinc-500">Verifying Firebase administrator role…</div>}
          {!loading && error && !me && <div className="rounded-xl border border-red-900/60 bg-red-500/5 p-4 text-sm text-red-300">{error}</div>}
          {!loading && me && <>{error && <div className="mb-4 rounded-xl border border-amber-900/50 bg-amber-500/5 p-3 text-sm text-amber-300">{error}</div>}{sectionLoading && <div className="mb-3 text-xs text-zinc-600">Refreshing verified status…</div>}{content()}</>}
        </div>
      </main>
    </div>
  </div>;
};
