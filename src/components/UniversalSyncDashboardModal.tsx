import React, { useState } from 'react';
import {
  X,
  RefreshCw,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Activity,
  Trash2,
  HardDrive,
  Download,
  Upload,
  UserCheck,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import {
  saveCookLogs,
  saveFuelLogs,
  saveSmokerProfile,
} from '../utils/storage';
import {
  useSyncLogs,
  clearSyncLogs,
  SmokerSyncEngine,
  SmokerHoursSyncService,
  addSyncLog,
} from '../services/smokerSyncService';
import {
  googleSignIn,
  saveToGoogleDrive,
  loadFromGoogleDrive,
  logout,
  getAccessToken,
} from '../lib/driveSync';
import {
  loadSmokerProfile,
  loadCookLogs,
  loadFuelLogs,
  loadLocalUserProfile,
} from '../utils/storage';

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
  isOpen,
  onClose,
  currentUserEmail,
  accessToken: initialAccessToken,
  onAuthSuccess,
  onRefreshData,
  showToast,
}) => {
  const syncLogs = useSyncLogs();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDriveBusy, setIsDriveBusy] = useState(false);
  const [localToken, setLocalToken] = useState<string | null>(initialAccessToken || null);
  const [localEmail, setLocalEmail] = useState<string | null>(currentUserEmail || null);

  if (!isOpen) return null;

  const deviceId =
    typeof window !== 'undefined'
      ? localStorage.getItem('smoker_app_device_id') || `device_${Math.random().toString(36).substring(2, 9)}`
      : 'device_unknown';

  const isConnectedToDrive = !!(localToken || initialAccessToken || localEmail);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const baseUrl = window.location.origin;
      const engine = new SmokerSyncEngine(deviceId, baseUrl, 'auth_token_default', 1800000);
      const hoursService = new SmokerHoursSyncService(baseUrl, deviceId);

      await engine.performSync('manual_sync');
      await hoursService.sync([], Date.now() - 86400000);

      showToast('🔄 30-Minute Sync & Cloud Backup complete!');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showToast(`❌ Sync failed: ${err.message || 'Error executing sync'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectDrive = async () => {
    setIsDriveBusy(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setLocalToken(res.accessToken);
        setLocalEmail(res.user.email);
        if (onAuthSuccess) onAuthSuccess(res.user, res.accessToken);
        showToast(`☁️ Connected to Google Drive as ${res.user.email}!`);
        addSyncLog({
          type: 'manual_sync',
          status: 'success',
          summary: `Connected Google Drive account (${res.user.email})`,
        });
      }
    } catch (err: any) {
      showToast(`❌ Google Drive connection error: ${err.message || 'Failed'}`);
    } finally {
      setIsDriveBusy(false);
    }
  };

  const handleBackupToDriveNow = async () => {
    setIsDriveBusy(true);
    try {
      let token = localToken || initialAccessToken;
      if (!token) {
        token = await getAccessToken();
      }
      if (!token) {
        throw new Error('Google Drive token not found. Please sign in to Google Drive first.');
      }

      const profile = loadSmokerProfile();
      const cookLogs = loadCookLogs();
      const fuelLogs = loadFuelLogs();
      const userAccount = loadLocalUserProfile();

      const res = await saveToGoogleDrive(token, { profile, cookLogs, fuelLogs, userAccount });
      showToast(
        res.createdNew
          ? '☁️ Created new pitmaster_smoker_data.json backup in Google Drive!'
          : '☁️ Updated pitmaster_smoker_data.json backup in Google Drive!'
      );
      addSyncLog({
        type: 'manual_sync',
        status: 'success',
        summary: `Manual Google Drive Cloud Backup: ${res.createdNew ? 'Created new file' : 'Updated file'}`,
      });
    } catch (err: any) {
      showToast(`❌ Drive backup failed: ${err.message || 'Upload error'}`);
      addSyncLog({
        type: 'manual_sync',
        status: 'error',
        summary: `Manual Google Drive Backup Failed: ${err.message || 'Error'}`,
      });
    } finally {
      setIsDriveBusy(false);
    }
  };

  const handleRestoreFromDrive = async () => {
    setIsDriveBusy(true);
    try {
      let token = localToken || initialAccessToken;
      if (!token) {
        token = await getAccessToken();
      }
      if (!token) {
        throw new Error('Google Drive token not found. Please sign in to Google Drive first.');
      }

      const data = await loadFromGoogleDrive(token);
      if (!data) {
        showToast('⚠️ No backup file (pitmaster_smoker_data.json) found in your Google Drive.');
        return;
      }

      if (data.profile) {
        saveSmokerProfile(data.profile);
        localStorage.setItem('pitmaster_smoker_profile', JSON.stringify(data.profile));
      }
      if (data.cookLogs) {
        saveCookLogs(data.cookLogs);
        localStorage.setItem('pitmaster_cook_logs', JSON.stringify(data.cookLogs));
      }
      if (data.fuelLogs) {
        saveFuelLogs(data.fuelLogs);
        localStorage.setItem('pitmaster_fuel_logs', JSON.stringify(data.fuelLogs));
      }
      if (data.userAccount || data.userProfile) {
        localStorage.setItem(
          'pitmaster_local_user_account',
          JSON.stringify(data.userAccount || data.userProfile)
        );
      }

      showToast(`✅ Restored ${data.cookLogs?.length || 0} smoke log(s) & profile from Google Drive!`);
      addSyncLog({
        type: 'manual_sync',
        status: 'success',
        summary: `Restored data from Google Drive backup (${new Date(data.savedAt).toLocaleDateString()})`,
      });
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showToast(`❌ Drive restore failed: ${err.message || 'Download error'}`);
    } finally {
      setIsDriveBusy(false);
    }
  };

  const handleDisconnectDrive = async () => {
    try {
      await logout();
      setLocalToken(null);
      setLocalEmail(null);
      showToast('Google Drive account disconnected.');
      addSyncLog({
        type: 'manual_sync',
        status: 'success',
        summary: 'Disconnected Google Drive account',
      });
    } catch (e) {
      console.warn('Logout error:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#141418] border border-[#2a2a34] rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#262630] flex items-center justify-between bg-[#1a1a20]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400">
              <Cloud className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                <span>30-Minute Sync & Google Drive Cloud Backup</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Universal automated data synchronization & cloud backups for all pitmasters
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-[#282834] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 web-carousel-scrollbar">
          
          {/* Universal Sync System Status Banner */}
          <div className="bg-[#1b1b22] border border-[#2e2e3a] rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#2a2a34] pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-400 font-mono">
                    30-MINUTE AUTOMATED SYNC ENGINE ACTIVE
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Runs continuously every 30 minutes for all users. Synchronizes cook logs, smoker operating hours, and Google Drive cloud copies automatically.
                </p>
              </div>

              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 shadow-md shadow-orange-950/30 shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing Engine...' : 'Sync & Backup Now'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-[#141418] border border-[#262630] flex items-center justify-between">
                <span className="text-zinc-400 flex items-center space-x-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-orange-400" />
                  <span>Device ID:</span>
                </span>
                <span className="text-amber-300 font-bold truncate max-w-[150px]">{deviceId}</span>
              </div>

              <div className="p-3 rounded-lg bg-[#141418] border border-[#262630] flex items-center justify-between">
                <span className="text-zinc-400 flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>User Scope:</span>
                </span>
                <span className="text-blue-300 font-bold">All Pitmaster Accounts</span>
              </div>
            </div>
          </div>

          {/* Google Drive Integration Section */}
          <div className="bg-[#1b1b22] border border-[#2e2e3a] rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#2a2a34] pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">Google Drive Cloud Storage</h3>
                  <p className="text-[11px] sm:text-xs text-zinc-400">
                    Saves a secure <code className="text-orange-300 font-mono">pitmaster_smoker_data.json</code> file in your Google Drive 'Smoke Stack' folder.
                  </p>
                </div>
              </div>

              {isConnectedToDrive ? (
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-lg font-mono font-bold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Connected ({localEmail || currentUserEmail || 'Google User'})</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleDisconnectDrive}
                    className="text-[11px] text-zinc-400 hover:text-red-400 underline transition-colors cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectDrive}
                  disabled={isDriveBusy}
                  className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-blue-950/40 disabled:opacity-50 shrink-0"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Connect Google Drive</span>
                </button>
              )}
            </div>

            {/* Google Drive Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleBackupToDriveNow}
                disabled={isDriveBusy}
                className="p-3 rounded-xl bg-[#141418] hover:bg-[#202028] border border-[#2a2a34] hover:border-orange-500/40 text-left transition-all cursor-pointer flex items-center space-x-3 disabled:opacity-50"
              >
                <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Backup to Google Drive</div>
                  <div className="text-[10px] text-zinc-400">Upload current smoke logs & smoker profile</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleRestoreFromDrive}
                disabled={isDriveBusy}
                className="p-3 rounded-xl bg-[#141418] hover:bg-[#202028] border border-[#2a2a34] hover:border-blue-500/40 text-left transition-all cursor-pointer flex items-center space-x-3 disabled:opacity-50"
              >
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Restore from Google Drive</div>
                  <div className="text-[10px] text-zinc-400">Download and apply saved pitmaster data</div>
                </div>
              </button>
            </div>
          </div>

          {/* Real-time Sync Audit Log System */}
          <div className="bg-[#1b1b22] border border-[#2e2e3a] rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#2a2a34] pb-2.5">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center space-x-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <span>Sync System Audit Log ({syncLogs.length})</span>
              </h3>

              {syncLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    clearSyncLogs();
                    showToast('Sync audit logs cleared.');
                  }}
                  className="text-xs text-zinc-400 hover:text-red-400 transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Logs</span>
                </button>
              )}
            </div>

            {syncLogs.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#141418] border border-[#262630] text-center text-xs text-zinc-500 font-mono">
                No sync logs recorded yet. Automated 30-minute sync will log events here.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 web-carousel-scrollbar">
                {syncLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-[#141418] border border-[#262630] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
                  >
                    <div className="flex items-start sm:items-center space-x-2 min-w-0">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 uppercase ${
                          log.status === 'success'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}
                      >
                        {log.status}
                      </span>

                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                          log.type === 'auto_sync'
                            ? 'bg-amber-500/20 text-amber-300'
                            : log.type === 'manual_sync'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-purple-500/20 text-purple-300'
                        }`}
                      >
                        {log.type === 'auto_sync' ? '30m Auto' : log.type === 'manual_sync' ? 'Manual' : 'Hours'}
                      </span>

                      <span className="text-zinc-200 truncate">{log.summary}</span>
                    </div>

                    <div className="text-[10px] text-zinc-500 shrink-0 font-mono self-end sm:self-center">
                      {log.formattedTime}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#262630] bg-[#1a1a20] flex items-center justify-between text-xs text-zinc-400">
          <span className="font-mono text-[11px]">Interval: 30 Minutes • All Users Active</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#282834] hover:bg-[#323242] text-white font-bold transition-all cursor-pointer"
          >
            Close Dashboard
          </button>
        </div>

      </div>
    </div>
  );
};
