import { CURRENT_RELEASE } from '../generated/release';

export type ReleaseInfo = {
  app: string;
  version: string;
  buildNumber: number;
  buildId: string;
  channel: string;
  releasedAt: string;
  webUrl: string;
  minimumSupportedVersion: string;
};

export type ReleaseUpdateState = {
  checking: boolean;
  current: ReleaseInfo;
  latest: ReleaseInfo | null;
  updateAvailable: boolean;
  lastCheckedAt: string | null;
  error: string | null;
};

export const RELEASE_UPDATE_EVENT = 'smokestack:release-update';
export const RELEASE_CHECK_INTERVAL_MS = 15 * 60 * 1000;

const current = CURRENT_RELEASE as ReleaseInfo;
let state: ReleaseUpdateState = {
  checking: false,
  current,
  latest: null,
  updateAvailable: false,
  lastCheckedAt: null,
  error: null,
};

const emit = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(RELEASE_UPDATE_EVENT, { detail: { ...state } }));
  }
};

const versionManifestUrl = () => {
  const configured = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_RELEASE_MANIFEST_URL?.trim();
  return configured || '/version.json';
};

export function getReleaseUpdateState(): ReleaseUpdateState {
  return { ...state };
}

export async function checkForReleaseUpdate(): Promise<ReleaseUpdateState> {
  if (state.checking) return getReleaseUpdateState();
  state = { ...state, checking: true, error: null };
  emit();

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    }

    const url = new URL(versionManifestUrl(), window.location.href);
    url.searchParams.set('check', String(Date.now()));
    const response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Release service returned ${response.status}`);
    const latest = await response.json() as ReleaseInfo;
    if (!latest?.version || !latest?.buildId) throw new Error('Release manifest is incomplete');

    const updateAvailable = latest.buildId !== current.buildId || latest.buildNumber > current.buildNumber;
    state = {
      ...state,
      checking: false,
      latest,
      updateAvailable,
      lastCheckedAt: new Date().toISOString(),
      error: null,
    };
  } catch (error) {
    state = {
      ...state,
      checking: false,
      lastCheckedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Update check failed',
    };
  }

  emit();
  return getReleaseUpdateState();
}

export async function activateReleaseUpdate(): Promise<void> {
  const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
  registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });

  const latestUrl = state.latest?.webUrl;
  const latestTarget = latestUrl ? new URL(latestUrl, window.location.href) : null;
  const isNativeWrapper = typeof window !== 'undefined' && Boolean((window as Window & { Capacitor?: unknown }).Capacitor);
  if (isNativeWrapper && latestTarget && window.location.origin !== latestTarget.origin) {
    window.location.replace(latestTarget.href);
    return;
  }

  window.location.reload();
}

export function startAutomaticReleaseUpdates(canReloadSafely: () => boolean): () => void {
  let stopped = false;
  let applying = false;

  const check = async () => {
    const next = await checkForReleaseUpdate();
    if (!stopped && next.updateAvailable && canReloadSafely() && !applying) {
      applying = true;
      await activateReleaseUpdate();
    }
  };

  const onFocus = () => void check();
  const onOnline = () => void check();
  const onVisibility = () => {
    if (document.visibilityState === 'visible') void check();
  };

  const initialTimer = window.setTimeout(check, 2500);
  const interval = window.setInterval(check, RELEASE_CHECK_INTERVAL_MS);
  window.addEventListener('focus', onFocus);
  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    stopped = true;
    window.clearTimeout(initialTimer);
    window.clearInterval(interval);
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('online', onOnline);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
