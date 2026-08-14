import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  activateReleaseUpdate,
  checkForReleaseUpdate,
  getReleaseUpdateState,
  RELEASE_UPDATE_EVENT,
  ReleaseUpdateState,
} from '../services/releaseUpdateService';

type Props = { deferAutomaticReload: boolean };

export const ReleaseUpdateBanner: React.FC<Props> = ({ deferAutomaticReload }) => {
  const [release, setRelease] = useState<ReleaseUpdateState>(getReleaseUpdateState);

  useEffect(() => {
    const update = (event: Event) => setRelease((event as CustomEvent<ReleaseUpdateState>).detail);
    window.addEventListener(RELEASE_UPDATE_EVENT, update);
    return () => window.removeEventListener(RELEASE_UPDATE_EVENT, update);
  }, []);

  if (!release.updateAvailable || !release.latest) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[90] mx-auto max-w-xl rounded-2xl border border-orange-500/40 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur md:bottom-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-orange-500/15 p-2 text-orange-400"><Download className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            Smoke Stack update ready
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            Version {release.latest.version}, build {release.latest.buildNumber} is available.
            {deferAutomaticReload ? ' Finish or save the active cook form before refreshing.' : ' It will apply automatically.'}
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => void activateReleaseUpdate()} className="min-h-11 rounded-xl bg-orange-500 px-4 text-xs font-bold text-zinc-950">
              <RefreshCw className="mr-1.5 inline h-4 w-4" />Update now
            </button>
            <button type="button" onClick={() => void checkForReleaseUpdate()} className="min-h-11 rounded-xl border border-zinc-700 px-3 text-xs font-semibold text-zinc-300">
              Check again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
