// Compatibility facade. Smoke Stack does not execute locally stored or
// AI-generated code patches. Releases come from reviewed repository builds.
import { checkForReleaseUpdate } from './releaseUpdateService';

export const MASTER_LIVE_UPDATE_EVENT = 'smokestack:release-update';
export const MASTER_LIVE_UPDATE_CHANNEL = 'SMOKESTACK_RELEASE_CHANNEL';

export function notifyMasterLiveUpdateChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(MASTER_LIVE_UPDATE_EVENT));
}

export function applyActiveLivePatches(): { appliedCount: number; activePatches: never[] } {
  return { appliedCount: 0, activePatches: [] };
}

export function initMasterLiveUpdateRunner(onUpdate?: () => void): () => void {
  let stopped = false;
  void checkForReleaseUpdate().then(() => { if (!stopped) onUpdate?.(); });
  return () => { stopped = true; };
}

export function useMasterLiveUpdate() {
  return { liveUpdatesEnabled: false, appliedPatchesCount: 0, lastCheck: null, triggerUpdate: () => void checkForReleaseUpdate() };
}
