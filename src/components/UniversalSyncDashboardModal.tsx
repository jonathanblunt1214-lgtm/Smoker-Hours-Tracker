import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, HardDrive, RefreshCw, ShieldCheck, Upload, UserCheck, X } from 'lucide-react';
import { googleSignIn, getAccessToken, loadFromGoogleDrive, logout, saveToGoogleDrive } from '../lib/driveSync';
import { loadCookLogs, loadFuelLogs, loadSmokerProfile, saveCookLogs, saveFuelLogs, saveSmokerProfile } from '../utils/storage';
import { addSyncLog } from '../services/smokerSyncService';

interface UniversalSyncDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string | null;
  accessToken?: string | null;
  onAuthSuccess?: (user: any, token: string) => void;
  onRefreshData?: () => void;
  showToast: (msg: string) => void;
}

export const UniversalSyncDashboardModal: React.FC<UniversalSyncDashboardModalProps> = ({
  isOpen, onClose, currentUserEmail, accessToken: initialAccessToken,
  onAuthSuccess, onRefreshData, showToast,
}) => {
  const [isDriveBusy, setIsDriveBusy] = useState(false);
  const [localToken, setLocalToken] = useState<string | null>(initialAccessToken || null);
  const [localEmail, setLocalEmail] = useState<string | null>(currentUserEmail || null);

  useEffect(() => setLocalToken(initialAccessToken || null), [initialAccessToken]);
  useEffect(() => setLocalEmail(currentUserEmail || null), [currentUserEmail]);

  if (!isOpen) return null;
  const isAccountSignedIn = Boolean(currentUserEmail);
  const isDriveAuthorized = Boolean(localToken || initialAccessToken);

  const loadExplicitLocalAccount = () => {
    try {
      const raw = localStorage.getItem('pitmaster_local_user_account');
      return raw ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  };

  const handleConnectDrive = async () => {
    setIsDriveBusy(true);
    try {
      const result = await googleSignIn();
      if (!result?.accessToken) throw new Error('Google Drive authorization was not completed.');
      setLocalToken(result.accessToken);
      setLocalEmail(result.user.email || null);
      onAuthSuccess?.(result.user, result.accessToken);
      showToast('Google Drive authorization completed. No backup has been written yet.');
    } catch (error: any) {
      showToast(error?.message || 'Google Drive authorization failed.');
    } finally {
      setIsDriveBusy(false);
    }
  };

  const handleBackupToDriveNow = async () => {
    setIsDriveBusy(true);
    try {
      const token = localToken || initialAccessToken || await getAccessToken();
      if (!token) throw new Error('Authorize Google Drive before creating a backup.');
      const result = await saveToGoogleDrive(token, {
        profile: loadSmokerProfile(), cookLogs: loadCookLogs(), fuelLogs: loadFuelLogs(),
        userAccount: loadExplicitLocalAccount(),
      });
      addSyncLog({ type: 'manual_sync', status: 'success', summary: `Verified Google Drive backup ${result.createdNew ? 'created' : 'updated'}` });
      showToast(`Google Drive backup ${result.createdNew ? 'created' : 'updated'} successfully.`);
    } catch (error: any) {
      addSyncLog({ type: 'manual_sync', status: 'error', summary: `Google Drive backup failed: ${error?.message || 'Unknown error'}` });
      showToast(error?.message || 'Google Drive backup failed.');
    } finally {
      setIsDriveBusy(false);
    }
  };

  const handleRestoreFromDrive = async () => {
    if (!window.confirm('Restore the Google Drive backup onto this device? Existing local data will be replaced.')) return;
    setIsDriveBusy(true);
    try {
      const token = localToken || initialAccessToken || await getAccessToken();
      if (!token) throw new Error('Authorize Google Drive before restoring a backup.');
      const data = await loadFromGoogleDrive(token);
      if (!data) throw new Error('No SmokeStack backup was found in Google Drive.');
      if (data.profile) saveSmokerProfile(data.profile);
      if (Array.isArray(data.cookLogs)) saveCookLogs(data.cookLogs);
      if (Array.isArray(data.fuelLogs)) saveFuelLogs(data.fuelLogs);
      if (data.userAccount || data.userProfile) localStorage.setItem('pitmaster_local_user_account', JSON.stringify(data.userAccount || data.userProfile));
      addSyncLog({ type: 'manual_sync', status: 'success', summary: `Google Drive backup restored (${data.savedAt || 'timestamp unavailable'})` });
      onRefreshData?.();
      showToast('Google Drive backup restored on this device.');
    } catch (error: any) {
      showToast(error?.message || 'Google Drive restore failed.');
    } finally {
      setIsDriveBusy(false);
    }
  };

  const handleDisconnectDrive = async () => {
    await logout().catch(() => undefined);
    setLocalToken(null);
    setLocalEmail(null);
    showToast('Google Drive authorization removed from this device.');
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="sync-title">
    <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#2a2a34] bg-[#141418] text-zinc-100 shadow-2xl">
      <header className="flex items-center justify-between border-b border-[#262630] bg-[#1a1a20] p-4 sm:p-5">
        <div><h2 id="sync-title" className="text-lg font-bold text-white">Account Sync & Backups</h2><p className="mt-1 text-xs text-zinc-400">Firestore account synchronization and Google Drive backup are separate.</p></div>
        <button type="button" onClick={onClose} aria-label="Close account sync and backups" className="min-h-11 min-w-11 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white"><X className="mx-auto h-5 w-5" /></button>
      </header>

      <div className="space-y-4 overflow-y-auto p-4 sm:p-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" /><div><h3 className="font-semibold text-white">SmokeStack account</h3><p className="mt-1 text-sm leading-6 text-zinc-400">{isAccountSignedIn ? `Signed in as ${currentUserEmail}. Firestore is the authoritative account data service; pending and failed writes remain visible in the app.` : 'Not signed in. Data remains on this device and is not described as synchronized.'}</p></div></div>
          <div className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-sm ${isAccountSignedIn ? 'border-emerald-900/60 bg-emerald-500/5 text-emerald-300' : 'border-amber-900/60 bg-amber-500/5 text-amber-300'}`}>
            {isAccountSignedIn ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {isAccountSignedIn ? 'Account synchronization available' : 'Sign in required for account synchronization'}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="flex items-start justify-between gap-3"><div className="flex gap-3"><HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" /><div><h3 className="font-semibold text-white">Google Drive backup</h3><p className="mt-1 text-sm leading-6 text-zinc-400">Optional export and restore. Authorization is not reported as a completed backup.</p></div></div>{isDriveAuthorized && <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-300">Authorized{localEmail ? ` · ${localEmail}` : ''}</span>}</div>
          {!isDriveAuthorized ? <button type="button" disabled={isDriveBusy} onClick={() => void handleConnectDrive()} className="mt-4 flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50"><UserCheck className="h-4 w-4" />Authorize Google Drive</button> : <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={isDriveBusy} onClick={() => void handleBackupToDriveNow()} className="flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{isDriveBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Back Up Now</button>
            <button type="button" disabled={isDriveBusy} onClick={() => void handleRestoreFromDrive()} className="flex min-h-11 items-center gap-2 rounded-xl border border-zinc-700 px-4 text-sm font-semibold text-zinc-200 disabled:opacity-50"><Download className="h-4 w-4" />Restore</button>
            <button type="button" disabled={isDriveBusy} onClick={() => void handleDisconnectDrive()} className="min-h-11 rounded-xl px-4 text-sm text-zinc-400 disabled:opacity-50">Disconnect</button>
          </div>}
        </section>
      </div>
    </div>
  </div>;
};
