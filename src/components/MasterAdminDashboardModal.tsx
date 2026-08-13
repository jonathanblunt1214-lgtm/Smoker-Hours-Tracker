import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronRight,
  Code2,
  Database,
  FileClock,
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
  XCircle,
} from 'lucide-react';
import { auth } from '../lib/driveSync';
import { SmokerProfile, CookLog, FuelLog } from '../types';

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
type Tab = 'overview' | 'access' | 'health' | 'sync' | 'knowledge' | 'chargpt' | 'releases' | 'data' | 'audit' | 'developer';

type MeResponse = {
  uid: string;
  email: string | null;
  role: Role;
  permissions: { admin: boolean; owner: boolean; developer: boolean };
};

type ServiceState = {
  status: string;
  detail?: string | null;
};

type HealthResponse = {
  generatedAt: string;
  environment: string;
  services: Record<string, ServiceState>;
  release: {
    appVersion: string | null;
    commit: string | null;
    revision: string | null;
    status: string;
  };
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

async function authorizedFetch(path: string, init: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Verified Firebase sign-in required.');
  const idToken = await user.getIdToken();
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${idToken}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(path, { ...init, headers });
}

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
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [roleRecords, setRoleRecords] = useState<AdminRoleRecord[]>([]);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [targetUid, setTargetUid] = useState('');
  const [grantDeveloper, setGrantDeveloper] = useState(false);
  const [codePrompt, setCodePrompt] = useState('');
  const [generatedDraft, setGeneratedDraft] = useState<any | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const totals = useMemo(() => ({
    cooks: cookLogs.length,
    fuelRecords: fuelLogs.length,
    smokerHours: Number(profile.currentHours || 0).toFixed(1),
  }), [cookLogs, fuelLogs, profile.currentHours]);

  const tabs = useMemo(() => {
    const base: Array<{ id: Tab; label: string; icon: React.ReactNode; ownerOnly?: boolean; developerOnly?: boolean }> = [
      { id: 'overview', label: 'Overview', icon: <Activity className="h-4 w-4" /> },
      { id: 'access', label: 'Users & Access', icon: <Users className="h-4 w-4" />, ownerOnly: true },
      { id: 'health', label: 'System Health', icon: <Server className="h-4 w-4" /> },
      { id: 'sync', label: 'Sync Operations', icon: <RefreshCw className="h-4 w-4" /> },
      { id: 'knowledge', label: 'Knowledge Pipelines', icon: <Database className="h-4 w-4" /> },
      { id: 'chargpt', label: 'CharGPT', icon: <Brain className="h-4 w-4" /> },
      { id: 'releases', label: 'Releases', icon: <GitBranch className="h-4 w-4" /> },
      { id: 'data', label: 'Data Operations', icon: <Settings2 className="h-4 w-4" /> },
      { id: 'audit', label: 'Audit Log', icon: <History className="h-4 w-4" /> },
      { id: 'developer', label: 'Developer Tools', icon: <Code2 className="h-4 w-4" />, developerOnly: true },
    ];
    return base.filter((tab) => (!tab.ownerOnly || me?.permissions.owner) && (!tab.developerOnly || me?.permissions.developer));
  }, [me]);

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
    if (!me?.permissions.owner) return;
    const res = await authorizedFetch('/api/admin/roles');
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `Role directory failed (${res.status}).`);
    setRoleRecords(Array.isArray(data?.roles) ? data.roles : []);
  };

  const refreshSectionData = async (tab: Tab = activeTab) => {
    if (!me?.permissions.admin) return;
    setSectionLoading(true);
    setSectionError(null);
    try {
      if (['overview', 'health', 'sync', 'knowledge', 'chargpt', 'releases'].includes(tab)) await loadHealth();
      if (tab === 'audit') await loadAudit();
      if (tab === 'access' && me.permissions.owner) await loadRoles();
    } catch (err: any) {
      setSectionError(err?.message || 'This section is unavailable.');
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
        if (res.status === 401 || res.status === 403) throw new Error('Administrator access is not granted to this account.');
        if (!res.ok) throw new Error(`Admin role check failed (${res.status}).`);
        return res.json();
      })
      .then(async (data: MeResponse) => {
        if (cancelled) return;
        setMe(data);
        try {
          const res = await authorizedFetch('/api/admin/health');
          const healthData = await res.json();
          if (res.ok && !cancelled) setHealth(healthData);
        } catch {
          // Overview remains useful even if health metadata is temporarily unavailable.
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setMe(null);
          setError(err?.message || 'Unable to verify administrator access.');
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !me?.permissions.admin) return;
    void refreshSectionData(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isOpen, me?.uid]);

  if (!isOpen) return null;

  const grantAdmin = async () => {
    if (!me?.permissions.owner || !targetUid.trim()) return;
    setBusyAction('grant');
    try {
      const res = await authorizedFetch('/api/admin/grant', {
        method: 'POST',
        body: JSON.stringify({ uid: targetUid.trim(), role: 'admin', developer: grantDeveloper }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Grant failed.');
      showToast(`Admin access granted to ${targetUid.trim()}.`);
      setTargetUid('');
      setGrantDeveloper(false);
      await loadRoles();
    } catch (err: any) {
      showToast(err?.message || 'Could not grant admin access.');
    } finally {
      setBusyAction(null);
    }
  };

  const revokeAdmin = async (uid = targetUid.trim()) => {
    if (!me?.permissions.owner || !uid) return;
    setBusyAction(`revoke:${uid}`);
    try {
      const res = await authorizedFetch('/api/admin/revoke', {
        method: 'POST',
        body: JSON.stringify({ uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Revoke failed.');
      showToast(`Admin access revoked for ${uid}.`);
      if (uid === targetUid.trim()) setTargetUid('');
      await loadRoles();
    } catch (err: any) {
      showToast(err?.message || 'Could not revoke admin access.');
    } finally {
      setBusyAction(null);
    }
  };

  const generateDraft = async () => {
    if (!me?.permissions.owner || !codePrompt.trim()) return;
    setBusyAction('code');
    setGeneratedDraft(null);
    try {
      const res = await authorizedFetch('/api/master/generate-code-patch', {
        method: 'POST',
        body: JSON.stringify({ prompt: codePrompt.trim(), category: 'TypeScript / Module' }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Draft generation failed.');
      setGeneratedDraft({ ...data.result, deploymentState: data.deploymentState || 'draft' });
      showToast('Code draft generated. Nothing was deployed.');
    } catch (err: any) {
      showToast(err?.message || 'Code draft generation unavailable.');
    } finally {
      setBusyAction(null);
    }
  };

  const service = (key: string): ServiceState => health?.services?.[key] || { status: 'unknown', detail: 'Status has not been checked yet.' };

  const renderContent = () => {
    if (!me) return null;
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-5">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric icon={<ShieldCheck className="h-4 w-4" />} label="Role" value={me.role.toUpperCase()} />
              <Metric icon={<Database className="h-4 w-4" />} label="Cook records" value={String(totals.cooks)} />
              <Metric icon={<Database className="h-4 w-4" />} label="Fuel records" value={String(totals.fuelRecords)} />
              <Metric icon={<Activity className="h-4 w-4" />} label="Smoker hours" value={totals.smokerHours} />
            </section>
            <Panel title="System access" icon={<ShieldCheck className="h-4 w-4" />}>
              <div className="grid gap-3 text-sm text-zinc-400 sm:grid-cols-2">
                <Info label="Account" value={me.email || me.uid} />
                <Info label="Developer tools" value={me.permissions.developer ? 'Allowed' : 'Not granted'} />
                <Info label="Authorization" value="Firebase custom claims" />
                <Info label="Deployment authority" value="GitHub / CI only" />
              </div>
            </Panel>
            <Panel title="Operational snapshot" icon={<Activity className="h-4 w-4" />}>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <ServiceCard label="API" state={service('api')} />
                <ServiceCard label="Firestore" state={service('firestore')} />
                <ServiceCard label="CharGPT" state={service('chargpt')} />
              </div>
            </Panel>
          </div>
        );

      case 'access':
        return (
          <div className="space-y-5">
            <Panel title="Grant administrator access" icon={<UserPlus className="h-4 w-4" />}>
              <p className="mb-4 text-sm text-zinc-500">Only OWNER can grant or revoke administrator roles. Enter the verified Firebase UID for the target account.</p>
              <input value={targetUid} onChange={(e) => setTargetUid(e.target.value)} placeholder="Firebase UID" className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
              <label className="mt-3 flex items-center gap-2 text-sm text-zinc-400"><input type="checkbox" checked={grantDeveloper} onChange={(e) => setGrantDeveloper(e.target.checked)} /> Also grant developer scope</label>
              <div className="mt-4 flex flex-wrap gap-2">
                <button disabled={busyAction !== null || !targetUid.trim()} onClick={grantAdmin} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"><UserPlus className="mr-2 inline h-4 w-4" />Grant admin</button>
                <button disabled={busyAction !== null || !targetUid.trim()} onClick={() => void revokeAdmin()} className="rounded-xl border border-red-900/70 px-4 py-2 text-sm text-red-300 disabled:opacity-50"><UserX className="mr-2 inline h-4 w-4" />Revoke</button>
              </div>
            </Panel>
            <Panel title="Current delegated roles" icon={<Users className="h-4 w-4" />}>
              {roleRecords.length === 0 ? <EmptyState title="No delegated admin records" body="Your OWNER account is managed through Firebase custom claims. Delegated admins will appear here after you grant access." /> : (
                <div className="divide-y divide-zinc-800">
                  {roleRecords.map((role) => (
                    <div key={role.uid} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">{role.email || role.uid}</div>
                        <div className="mt-1 text-xs text-zinc-500">{role.role.toUpperCase()} • Developer: {role.developer ? 'Yes' : 'No'}{role.updatedAt ? ` • Updated ${formatDate(role.updatedAt)}` : ''}</div>
                      </div>
                      {role.role === 'admin' && <button disabled={busyAction !== null} onClick={() => void revokeAdmin(role.uid)} className="rounded-lg border border-red-900/60 px-3 py-1.5 text-xs text-red-300 disabled:opacity-50">Revoke</button>}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        );

      case 'health':
        return (
          <div className="space-y-5">
            <SectionIntro title="System Health" body="Only real server checks are shown as operational. Missing integrations remain unknown or unavailable instead of displaying fake green status." />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <ServiceCard label="API" state={service('api')} />
              <ServiceCard label="Authorization" state={service('authorization')} />
              <ServiceCard label="Firestore" state={service('firestore')} />
              <ServiceCard label="CharGPT" state={service('chargpt')} />
              <ServiceCard label="Sync service" state={service('sync')} />
              <ServiceCard label="Knowledge pipelines" state={service('knowledgePipelines')} />
            </div>
            {health?.generatedAt && <div className="text-xs text-zinc-600">Last checked {formatDate(health.generatedAt)}</div>}
          </div>
        );

      case 'sync':
        return (
          <div className="space-y-5">
            <SectionIntro title="Sync Operations" body="This page reports the current production capability honestly. It does not resurrect the retired Master Web or simulated 30-minute sync engine." />
            <Panel title="Account synchronization" icon={<RefreshCw className="h-4 w-4" />}>
              <ServiceCard label="Server-side sync operations" state={service('sync')} />
              <p className="mt-4 text-sm text-zinc-500">Signed-in user data is persisted through the trusted Firestore path. A system-wide operations queue/incident console has not been implemented yet, so this section intentionally does not invent queue counts or cross-account sync statistics.</p>
            </Panel>
            <Panel title="Google Drive backup" icon={<Database className="h-4 w-4" />}>
              <ServiceCard label="Backup integration" state={service('backup')} />
              <p className="mt-4 text-sm text-zinc-500">Google Drive remains user-controlled backup/export. It is not the SmokeStack authoritative sync system.</p>
            </Panel>
          </div>
        );

      case 'knowledge':
        return (
          <div className="space-y-5">
            <SectionIntro title="Knowledge Pipelines" body="The verified manufacturer, fuel, meat/cut, and modification pipelines are planned under Giant 0.03. Until published with provenance, this console must not call legacy hard-coded datasets verified." />
            <div className="grid gap-3 sm:grid-cols-2">
              {['Smokers & manufacturers', 'Fuels', 'Meat & cuts', 'Mods & accessories'].map((name) => (
                <div key={name} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                  <div className="flex items-center justify-between gap-3"><span className="font-medium text-white">{name}</span><StatusPill status="not_configured" /></div>
                  <p className="mt-3 text-sm text-zinc-500">Verified ingestion, source review, change history, and publication workflow not configured yet.</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'chargpt':
        return (
          <div className="space-y-5">
            <SectionIntro title="CharGPT Operations" body="Production configuration status is read from the server. Prompt/policy publishing and evaluation dashboards will appear only when their real persistence and release paths exist." />
            <Panel title="Runtime configuration" icon={<Brain className="h-4 w-4" />}>
              <ServiceCard label="Server-side AI service" state={service('chargpt')} />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Info label="Model policy management" value="Not configured" />
                <Info label="Evaluation suite dashboard" value="Not configured" />
                <Info label="Prompt release history" value="Not configured" />
                <Info label="Deployment authority" value="GitHub / CI only" />
              </div>
            </Panel>
          </div>
        );

      case 'releases':
        return (
          <div className="space-y-5">
            <SectionIntro title="Releases" body="This view shows only deployment metadata actually provided by the runtime environment. Missing commit/build data is shown as unavailable." />
            <Panel title="Current runtime" icon={<GitBranch className="h-4 w-4" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="App version" value={health?.release?.appVersion || 'Metadata unavailable'} />
                <Info label="Environment" value={health?.environment || 'Unknown'} />
                <Info label="Commit" value={health?.release?.commit || 'Metadata unavailable'} mono />
                <Info label="Cloud revision" value={health?.release?.revision || 'Metadata unavailable'} mono />
              </div>
              <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-400">Generated code drafts are never considered deployed. GitHub review, CI and the real deployment pipeline remain authoritative.</div>
            </Panel>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-5">
            <SectionIntro title="Data Operations" body="Only safe, currently implemented operations are exposed here. Destructive production tools will not appear until they have explicit scope, confirmation, audit and recovery behavior." />
            <Panel title="Current account data" icon={<Database className="h-4 w-4" />}>
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric icon={<Database className="h-4 w-4" />} label="Cook records" value={String(totals.cooks)} />
                <Metric icon={<Database className="h-4 w-4" />} label="Fuel records" value={String(totals.fuelRecords)} />
                <Metric icon={<Activity className="h-4 w-4" />} label="Smoker hours" value={totals.smokerHours} />
              </div>
              {onRefreshData && <button onClick={onRefreshData} className="mt-4 rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"><RefreshCw className="mr-2 inline h-4 w-4" />Refresh app data</button>}
            </Panel>
            <Panel title="Protected operations" icon={<ShieldCheck className="h-4 w-4" />}>
              <EmptyState title="No destructive admin actions exposed" body="Bulk delete, purge, migration and restore controls are intentionally unavailable until they have server authorization, scoped previews, audit logging and recovery safeguards." />
            </Panel>
          </div>
        );

      case 'audit':
        return (
          <div className="space-y-5">
            <SectionIntro title="Audit Log" body="Recent privileged role-management events recorded in Firestore. This is real server-side audit data, not local browser history." />
            <Panel title="Recent events" icon={<FileClock className="h-4 w-4" />}>
              {auditEvents.length === 0 ? <EmptyState title="No audit events found" body="Role grants/revocations and future privileged operations will appear here when recorded." /> : (
                <div className="divide-y divide-zinc-800">
                  {auditEvents.map((event) => (
                    <div key={event.id} className="py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-white">{event.action}</span>
                        <span className="text-xs text-zinc-600">{event.createdAt ? formatDate(event.createdAt) : 'Timestamp pending'}</span>
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">Actor: {event.actorRole || 'unknown'} • Target: {event.targetUid || 'n/a'}</div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        );

      case 'developer':
        return (
          <div className="space-y-5">
            <SectionIntro title="Developer Tools" body="Owner/developer-only tools. AI may create a reviewable draft, but this console cannot mark code deployed or bypass GitHub/CI." />
            {me.permissions.owner ? (
              <Panel title="Owner code drafts" icon={<Code2 className="h-4 w-4" />}>
                <textarea value={codePrompt} onChange={(e) => setCodePrompt(e.target.value)} rows={5} placeholder="Describe a code change…" className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                <button disabled={busyAction !== null || !codePrompt.trim()} onClick={generateDraft} className="mt-3 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50">Generate draft</button>
                {generatedDraft && (
                  <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-400">AI generated — not deployed</div>
                    <div className="text-sm font-medium text-white">{generatedDraft.title || 'Generated draft'}</div>
                    <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-zinc-300">{generatedDraft.code || ''}</pre>
                  </div>
                )}
              </Panel>
            ) : <EmptyState title="Developer scope granted" body="No additional developer operations are currently published for delegated administrators." />}
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="mx-auto min-h-full max-w-7xl bg-[#0c0c0d] sm:min-h-0 sm:rounded-2xl sm:border sm:border-zinc-800 sm:shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-[#0c0c0d]/95 px-4 py-4 backdrop-blur sm:px-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-500/15 p-2.5 text-orange-400"><ShieldCheck className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-semibold text-white">SmokeStack Operations</h2>
              <p className="text-xs text-zinc-500">Verified administrator console</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white" aria-label="Close admin console"><X className="h-5 w-5" /></button>
        </header>

        {loading && <div className="m-5 rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-400">Verifying administrator role…</div>}
        {error && !loading && <div className="m-5 rounded-xl border border-red-900/60 bg-red-950/20 p-5 text-sm text-red-300">{error}</div>}

        {me?.permissions.admin && !loading && (
          <div className="grid min-h-[680px] md:grid-cols-[230px_minmax(0,1fr)]">
            <aside className="border-b border-zinc-800 p-3 md:border-b-0 md:border-r">
              <nav className="flex gap-2 overflow-x-auto md:block md:space-y-1 md:overflow-visible">
                {tabs.map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition md:w-full ${activeTab === tab.id ? 'bg-orange-500/15 text-orange-300' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}>
                    {tab.icon}<span>{tab.label}</span>{activeTab === tab.id && <ChevronRight className="ml-auto hidden h-4 w-4 md:block" />}
                  </button>
                ))}
              </nav>
            </aside>
            <main className="min-w-0 p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-xs text-zinc-600">{me.email || me.uid}</div>
                <button onClick={() => void refreshSectionData()} disabled={sectionLoading} className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-900 disabled:opacity-50"><RefreshCw className={`mr-1.5 inline h-3.5 w-3.5 ${sectionLoading ? 'animate-spin' : ''}`} />Refresh</button>
              </div>
              {sectionError && <div className="mb-4 rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 text-sm text-amber-300">{sectionError}</div>}
              {renderContent()}
            </main>
          </div>
        )}
      </div>
    </div>
  );
};

const Panel: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
    <div className="mb-4 flex items-center gap-2">{icon && <span className="text-orange-400">{icon}</span>}<h3 className="font-semibold text-white">{title}</h3></div>
    {children}
  </section>
);

const Metric: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
    <div className="flex items-center gap-2 text-xs text-zinc-500">{icon}{label}</div>
    <div className="mt-2 text-lg font-semibold text-white">{value}</div>
  </div>
);

const Info: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
    <div className="text-xs text-zinc-500">{label}</div>
    <div className={`mt-1 break-all text-sm text-zinc-200 ${mono ? 'font-mono' : ''}`}>{value}</div>
  </div>
);

const SectionIntro: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div>
    <h3 className="text-xl font-semibold text-white">{title}</h3>
    <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-500">{body}</p>
  </div>
);

const EmptyState: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 p-5">
    <div className="text-sm font-medium text-zinc-300">{title}</div>
    <div className="mt-1 text-sm leading-6 text-zinc-600">{body}</div>
  </div>
);

const ServiceCard: React.FC<{ label: string; state: ServiceState }> = ({ label, state }) => (
  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
    <div className="flex items-start justify-between gap-3"><div className="text-sm font-medium text-white">{label}</div><StatusPill status={state.status} /></div>
    {state.detail && <div className="mt-3 text-xs leading-5 text-zinc-500">{state.detail}</div>}
  </div>
);

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const normalized = status.toLowerCase();
  const positive = ['operational', 'configured', 'healthy', 'synced'].includes(normalized);
  const warning = ['degraded', 'client_managed', 'pending'].includes(normalized);
  const Icon = positive ? CheckCircle2 : warning ? AlertTriangle : XCircle;
  const style = positive ? 'border-emerald-900/60 bg-emerald-950/30 text-emerald-300' : warning ? 'border-amber-900/60 bg-amber-950/30 text-amber-300' : 'border-zinc-700 bg-zinc-900 text-zinc-400';
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${style}`}><Icon className="h-3 w-3" />{status.replaceAll('_', ' ')}</span>;
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
