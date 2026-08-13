import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Brain, Code2, Database, ShieldCheck, UserPlus, UserX, X } from 'lucide-react';
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

type MeResponse = {
  uid: string;
  email: string | null;
  role: Role;
  permissions: { admin: boolean; owner: boolean; developer: boolean };
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    authorizedFetch('/api/admin/me')
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) throw new Error('Administrator access is not granted to this account.');
        if (!res.ok) throw new Error(`Admin role check failed (${res.status}).`);
        return res.json();
      })
      .then((data: MeResponse) => {
        if (!cancelled) setMe(data);
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
    } catch (err: any) {
      showToast(err?.message || 'Could not grant admin access.');
    } finally {
      setBusyAction(null);
    }
  };

  const revokeAdmin = async () => {
    if (!me?.permissions.owner || !targetUid.trim()) return;
    setBusyAction('revoke');
    try {
      const res = await authorizedFetch('/api/admin/revoke', {
        method: 'POST',
        body: JSON.stringify({ uid: targetUid.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Revoke failed.');
      showToast(`Admin access revoked for ${targetUid.trim()}.`);
      setTargetUid('');
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

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="mx-auto max-w-6xl rounded-2xl border border-zinc-800 bg-[#111] shadow-2xl">
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-500/15 p-2.5 text-orange-400"><ShieldCheck className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-semibold text-white">SmokeStack Operations</h2>
              <p className="text-xs text-zinc-500">Verified administrator console</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white" aria-label="Close admin console"><X className="h-5 w-5" /></button>
        </header>

        <div className="p-5 sm:p-6">
          {loading && <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-400">Verifying administrator role…</div>}
          {error && !loading && <div className="rounded-xl border border-red-900/60 bg-red-950/20 p-5 text-sm text-red-300">{error}</div>}

          {me?.permissions.admin && !loading && (
            <div className="space-y-6">
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric icon={<Activity className="h-4 w-4" />} label="Role" value={me.role.toUpperCase()} />
                <Metric icon={<Database className="h-4 w-4" />} label="Cook records" value={String(totals.cooks)} />
                <Metric icon={<Database className="h-4 w-4" />} label="Fuel records" value={String(totals.fuelRecords)} />
                <Metric icon={<Activity className="h-4 w-4" />} label="Smoker hours" value={totals.smokerHours} />
              </section>

              <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                <div className="mb-4 flex items-center gap-2"><Brain className="h-4 w-4 text-orange-400" /><h3 className="font-semibold text-white">System access</h3></div>
                <div className="grid gap-2 text-sm text-zinc-400 sm:grid-cols-2">
                  <div>Account: <span className="text-zinc-200">{me.email || me.uid}</span></div>
                  <div>Developer tools: <span className="text-zinc-200">{me.permissions.developer ? 'Allowed' : 'Not granted'}</span></div>
                  <div>Authorization: <span className="text-zinc-200">Firebase custom claims</span></div>
                  <div>Deployment authority: <span className="text-zinc-200">GitHub / CI only</span></div>
                </div>
                {onRefreshData && <button onClick={onRefreshData} className="mt-4 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900">Refresh app data</button>}
              </section>

              {me.permissions.owner && (
                <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                  <div className="mb-4 flex items-center gap-2"><UserPlus className="h-4 w-4 text-orange-400" /><h3 className="font-semibold text-white">Users & access</h3></div>
                  <p className="mb-4 text-sm text-zinc-500">Only OWNER can grant or revoke administrator roles. Enter the verified Firebase UID of the target account.</p>
                  <input value={targetUid} onChange={(e) => setTargetUid(e.target.value)} placeholder="Firebase UID" className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                  <label className="mt-3 flex items-center gap-2 text-sm text-zinc-400"><input type="checkbox" checked={grantDeveloper} onChange={(e) => setGrantDeveloper(e.target.checked)} /> Also grant developer scope</label>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button disabled={busyAction !== null || !targetUid.trim()} onClick={grantAdmin} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"><UserPlus className="mr-2 inline h-4 w-4" />Grant admin</button>
                    <button disabled={busyAction !== null || !targetUid.trim()} onClick={revokeAdmin} className="rounded-xl border border-red-900/70 px-4 py-2 text-sm text-red-300 disabled:opacity-50"><UserX className="mr-2 inline h-4 w-4" />Revoke admin</button>
                  </div>
                </section>
              )}

              {me.permissions.owner && (
                <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                  <div className="mb-4 flex items-center gap-2"><Code2 className="h-4 w-4 text-orange-400" /><h3 className="font-semibold text-white">Owner code drafts</h3></div>
                  <p className="mb-4 text-sm text-zinc-500">AI may generate a reviewable draft. This console does not deploy code; GitHub review, CI and the release pipeline remain authoritative.</p>
                  <textarea value={codePrompt} onChange={(e) => setCodePrompt(e.target.value)} rows={4} placeholder="Describe a code change…" className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                  <button disabled={busyAction !== null || !codePrompt.trim()} onClick={generateDraft} className="mt-3 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50">Generate draft</button>
                  {generatedDraft && (
                    <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-400">AI generated — not deployed</div>
                      <div className="text-sm font-medium text-white">{generatedDraft.title || 'Generated draft'}</div>
                      <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-zinc-300">{generatedDraft.code || ''}</pre>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Metric: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
    <div className="flex items-center gap-2 text-xs text-zinc-500">{icon}{label}</div>
    <div className="mt-2 text-lg font-semibold text-white">{value}</div>
  </div>
);
