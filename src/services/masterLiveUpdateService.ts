import { useState, useEffect } from 'react';
import {
  loadMasterLiveUpdateConfig,
  loadMasterCodePatches,
  MasterLiveUpdateConfig,
  MasterCodePatch,
} from '../utils/storage';

export const MASTER_LIVE_UPDATE_EVENT = 'master_live_update_changed';
export const MASTER_LIVE_UPDATE_CHANNEL = 'MASTER_LIVE_UPDATE_CHANNEL';

const executedPatchIds = new Set<string>();

/**
 * Dispatches a live update notification across window events and BroadcastChannel
 */
export function notifyMasterLiveUpdateChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MASTER_LIVE_UPDATE_EVENT));
    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel(MASTER_LIVE_UPDATE_CHANNEL);
        bc.postMessage({ timestamp: Date.now() });
        bc.close();
      }
    } catch (e) {
      console.warn('BroadcastChannel notify error:', e);
    }
  }
}

/**
 * Applies active live patches at runtime if live updates are enabled.
 */
export function applyActiveLivePatches(): { appliedCount: number; activePatches: MasterCodePatch[] } {
  if (typeof window === 'undefined') return { appliedCount: 0, activePatches: [] };

  const config = loadMasterLiveUpdateConfig();
  if (!config.liveUpdatesEnabled) {
    return { appliedCount: 0, activePatches: [] };
  }

  const patches = loadMasterCodePatches().filter((p) => p.status === 'Applied Live');
  let appliedCount = 0;

  patches.forEach((patch) => {
    if (!executedPatchIds.has(patch.id)) {
      try {
        if (patch.category === 'HTML/CSS UI Patch') {
          const styleId = `live-patch-style-${patch.id}`;
          if (!document.getElementById(styleId)) {
            const styleEl = document.createElement('style');
            styleEl.id = styleId;
            styleEl.textContent = patch.code;
            document.head.appendChild(styleEl);
          }
        } else {
          // Execute code patch safely in current runtime context
          const patchRunner = new Function('window', 'document', patch.code);
          patchRunner(window, document);
        }
        executedPatchIds.add(patch.id);
        appliedCount++;
        console.log(`[Master Live Update Engine] Applied code patch: "${patch.title}" (${patch.id})`);
      } catch (err) {
        console.error(`[Master Live Update Engine] Error executing patch "${patch.title}":`, err);
      }
    }
  });

  return { appliedCount, activePatches: patches };
}

/**
 * Initializes the runtime listener for live app updates from Admin Dashboard
 */
export function initMasterLiveUpdateRunner(onUpdate?: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  // Apply on startup
  applyActiveLivePatches();

  const handleUpdate = () => {
    applyActiveLivePatches();
    if (onUpdate) onUpdate();
  };

  window.addEventListener(MASTER_LIVE_UPDATE_EVENT, handleUpdate);

  let bc: BroadcastChannel | null = null;
  if ('BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel(MASTER_LIVE_UPDATE_CHANNEL);
      bc.onmessage = () => {
        handleUpdate();
      };
    } catch (e) {
      console.warn('BroadcastChannel setup error:', e);
    }
  }

  return () => {
    window.removeEventListener(MASTER_LIVE_UPDATE_EVENT, handleUpdate);
    if (bc) {
      try {
        bc.close();
      } catch (e) {}
    }
  };
}

/**
 * Custom React Hook to receive real-time updates from Master Admin Live Updates System
 */
export function useMasterLiveUpdates(): { config: MasterLiveUpdateConfig; patches: MasterCodePatch[] } {
  const [state, setState] = useState(() => ({
    config: loadMasterLiveUpdateConfig(),
    patches: loadMasterCodePatches(),
  }));

  useEffect(() => {
    const cleanup = initMasterLiveUpdateRunner(() => {
      setState({
        config: loadMasterLiveUpdateConfig(),
        patches: loadMasterCodePatches(),
      });
    });
    return cleanup;
  }, []);

  return state;
}
