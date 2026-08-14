import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Layers, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import { CURRENT_RELEASE } from '../generated/release';
import {
  activateReleaseUpdate,
  checkForReleaseUpdate,
  getReleaseUpdateState,
  RELEASE_UPDATE_EVENT,
  ReleaseUpdateState,
} from '../services/releaseUpdateService';

interface Props { className?: string; onSyncComplete?: () => void }

export const MasterVersionSyncCard: React.FC<Props> = ({ className = '' }) => {
  const [release, setRelease] = useState<ReleaseUpdateState>(getReleaseUpdateState);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const update = (event: Event) => setRelease((event as CustomEvent<ReleaseUpdateState>).detail);
    window.addEventListener(RELEASE_UPDATE_EVENT, update);
    return () => window.removeEventListener(RELEASE_UPDATE_EVENT, update);
  }, []);

  const clearBuildCache = async () => {
    setClearing(true);
    const names = 'caches' in window ? await caches.keys() : [];
    await Promise.all(names.filter((name) => name.startsWith('smokestack-')).map((name) => caches.delete(name)));
    setClearing(false);
    window.location.reload();
  };

  return <section className={`space-y-4 rounded-2xl border border-zinc-800 bg-[#181818] p-4 sm:p-5 ${className}`}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><h3 className="text-lg font-bold text-white">Release & client version status</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-400">Repository deployments control application code. Firebase/Firestore controls signed-in account data. Refreshing the application never force-aligns or overwrites user records.</p></div>
      <span className={`inline-flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${release.error ? 'bg-amber-500/10 text-amber-300' : release.updateAvailable ? 'bg-orange-500/10 text-orange-300' : release.lastCheckedAt ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-800 text-zinc-300'}`}>
        {release.error ? <AlertTriangle className="h-3.5 w-3.5" /> : release.updateAvailable ? <RefreshCw className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
        {release.error ? 'Status unknown' : release.updateAvailable ? 'Update available' : release.lastCheckedAt ? 'Current' : 'Not checked'}
      </span>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      <Metric label="Current app version" value={CURRENT_RELEASE.version} />
      <Metric label="Current build" value={`#${CURRENT_RELEASE.buildNumber}`} />
      <Metric label="Latest supported client" value={release.latest?.version || 'Unknown'} />
    </div>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => void checkForReleaseUpdate()} disabled={release.checking} className="min-h-11 rounded-xl bg-orange-500 px-4 text-xs font-bold text-zinc-950 disabled:opacity-50"><RefreshCw className={`mr-1.5 inline h-4 w-4 ${release.checking ? 'animate-spin' : ''}`} />{release.checking ? 'Checking…' : 'Check for update'}</button>
      {release.updateAvailable && <button type="button" onClick={() => void activateReleaseUpdate()} className="min-h-11 rounded-xl border border-orange-500/40 px-4 text-xs font-bold text-orange-300"><RotateCcw className="mr-1.5 inline h-4 w-4" />Refresh application</button>}
      <button type="button" onClick={() => void clearBuildCache()} disabled={clearing} className="min-h-11 rounded-xl border border-zinc-700 px-4 text-xs font-semibold text-zinc-300 disabled:opacity-50"><Trash2 className="mr-1.5 inline h-4 w-4" />{clearing ? 'Clearing…' : 'Clear local build cache'}</button>
    </div>
    {release.error && <p className="text-xs text-amber-300">Update status is unknown: {release.error}</p>}
  </section>;
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"><div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</div><div className="mt-1 flex items-center gap-1.5 font-mono text-sm font-bold text-zinc-100"><Layers className="h-3.5 w-3.5 text-orange-400" />{value}</div></div>;

export default MasterVersionSyncCard;
