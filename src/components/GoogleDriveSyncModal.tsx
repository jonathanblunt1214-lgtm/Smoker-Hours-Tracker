import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  googleSignIn,
  logout,
  saveToGoogleDrive,
  loadFromGoogleDrive,
  findDriveFile,
  getAccessToken,
  AppDriveData,
} from '../lib/driveSync';
import { SmokerProfile, CookLog, FuelLog, LocalUserProfile } from '../types';
import { Cloud, CloudUpload, CloudDownload, LogOut, CheckCircle, AlertTriangle, X, RefreshCw, ShieldCheck, FileText } from 'lucide-react';
import { TermsOfServiceModal } from './TermsOfServiceModal';
import { verifyDriveBackup } from '../lib/driveBackupVerifier';

interface GoogleDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  accessToken: string | null;
  onAuthSuccess: (user: User, token: string) => void;
  onLogout: () => void;
  currentAppData: {
    profile: SmokerProfile;
    cookLogs: CookLog[];
    fuelLogs: FuelLog[];
    userAccount?: LocalUserProfile;
    userProfile?: LocalUserProfile;
  };
  onRestoreData: (restored: {
    profile: SmokerProfile;
    cookLogs: CookLog[];
    fuelLogs: FuelLog[];
    userAccount?: LocalUserProfile;
    userProfile?: LocalUserProfile;
  }) => void;
}

export const GoogleDriveSyncModal: React.FC<GoogleDriveSyncModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  accessToken,
  onAuthSuccess,
  onLogout,
  currentAppData,
  onRestoreData,
}) => {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [driveFileInfo, setDriveFileInfo] = useState<{ exists: boolean; fileId: string | null } | null>(null);
  const [confirmRestoreData, setConfirmRestoreData] = useState<AppDriveData | null>(null);
  const [confirmOverwriteSave, setConfirmOverwriteSave] = useState<boolean>(false);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(true);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && accessToken) {
      checkDriveStatus();
    }
  }, [isOpen, accessToken]);

  const checkDriveStatus = async () => {
    if (!accessToken) return;
    try {
      const fileId = await findDriveFile(accessToken);
      setDriveFileInfo({ exists: !!fileId, fileId });
    } catch (err: any) {
      console.error('Error checking drive file:', err);
    }
  };

  if (!isOpen) return null;

  const handleSignIn = async () => {
    if (!termsAccepted) {
      setStatusMsg({ type: 'error', text: 'Please review and accept the Terms of Service & Privacy Disclosure before signing up.' });
      return;
    }
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await googleSignIn();
      if (res) {
        onAuthSuccess(res.user, res.accessToken);
        setStatusMsg({ type: 'success', text: `Signed in as ${res.user.email}` });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to sign in with Google' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToDrive = async () => {
    let token = accessToken;
    if (!token) {
      token = await getAccessToken();
    }
    if (!token) {
      setStatusMsg({ type: 'error', text: '🔒 Google Drive Access Required: Please click "Sign in with Google" below to authorize Drive storage.' });
      return;
    }

    // Check if file exists, require confirmation before updating/overwriting Drive
    if (driveFileInfo?.exists && !confirmOverwriteSave) {
      setConfirmOverwriteSave(true);
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    setConfirmOverwriteSave(false);

    try {
      const res = await saveToGoogleDrive(token, currentAppData);
      const verification = await verifyDriveBackup(token);
      if (!verification.ok) {
        throw new Error('Google Drive write completed but read-back verification failed: ' + verification.message);
      }
      setDriveFileInfo({ exists: true, fileId: res.fileId });
      setStatusMsg({
        type: 'success',
        text: res.createdNew
          ? `Created Google Drive backup and verified read-back (${verification.cookLogCount} cook logs, ${verification.fuelLogCount} fuel logs).`
          : `Updated Google Drive backup and verified read-back (${verification.cookLogCount} cook logs, ${verification.fuelLogCount} fuel logs).`,
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save to Google Drive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFetchDriveBackup = async () => {
    let token = accessToken;
    if (!token) {
      token = await getAccessToken();
    }
    if (!token) {
      setStatusMsg({ type: 'error', text: '🔒 Google Drive Access Required: Please click "Sign in with Google" below to authorize Drive storage.' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    try {
      const driveData = await loadFromGoogleDrive(token);
      if (!driveData) {
        setStatusMsg({ type: 'info', text: 'No saved pitmaster_smoker_data.json backup found in your Google Drive.' });
      } else {
        setConfirmRestoreData(driveData);
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to read from Google Drive' });
    } finally {
      setLoading(false);
    }
  };

  const executeRestore = () => {
    if (!confirmRestoreData) return;
    onRestoreData({
      profile: confirmRestoreData.profile,
      cookLogs: confirmRestoreData.cookLogs,
      fuelLogs: confirmRestoreData.fuelLogs,
      userAccount: confirmRestoreData.userAccount || confirmRestoreData.userProfile,
      userProfile: confirmRestoreData.userProfile || confirmRestoreData.userAccount,
    });
    setStatusMsg({
      type: 'success',
      text: `App data restored successfully from Google Drive backup (${new Date(confirmRestoreData.savedAt).toLocaleDateString()})!`,
    });
    setConfirmRestoreData(null);
  };

  const handleSignOut = async () => {
    await logout();
    onLogout();
    setDriveFileInfo(null);
    setStatusMsg({ type: 'info', text: 'Signed out of Google.' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 animate-fade-in">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-[#242424] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5 border-b border-[#2a2a2a] pb-4">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Google Drive Cloud Save</h2>
            <p className="text-xs text-zinc-400">Save & sync your smoker logs directly to your Google Drive</p>
          </div>
        </div>

        {/* Status Alert Banner */}
        {statusMsg && (
          <div
            className={`p-3 rounded-xl mb-4 text-xs flex items-start space-x-2 border ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : statusMsg.type === 'error'
                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
            }`}
          >
            {statusMsg.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />}
            {statusMsg.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />}
            {statusMsg.type === 'info' && <Cloud className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />}
            <span className="flex-1 font-medium leading-relaxed">{statusMsg.text}</span>
          </div>
        )}

        {/* Restore Confirmation Dialog */}
        {confirmRestoreData && (
          <div className="bg-[#121212] border border-amber-500/40 rounded-xl p-4 mb-4 text-xs">
            <div className="flex items-center space-x-2 text-amber-400 font-bold mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Confirm Overwrite Local App Data?</span>
            </div>
            <p className="text-zinc-300 mb-3">
              Found Google Drive backup from{' '}
              <strong className="text-white">{new Date(confirmRestoreData.savedAt).toLocaleString()}</strong> containing:
            </p>
            <ul className="list-disc list-inside text-zinc-400 mb-4 space-y-1 font-mono">
              <li>{confirmRestoreData.cookLogs.length} Cook Journal Entries</li>
              <li>{confirmRestoreData.fuelLogs.length} Fuel Inventory Logs</li>
              <li>Smoker Profile: {confirmRestoreData.profile.name} ({confirmRestoreData.profile.currentHours} runtime hrs)</li>
            </ul>
            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setConfirmRestoreData(null)}
                className="px-3 py-1.5 bg-[#242424] hover:bg-[#2a2a2a] text-zinc-300 font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeRestore}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-lg cursor-pointer"
              >
                Restore & Overwrite
              </button>
            </div>
          </div>
        )}

        {/* Save Overwrite Confirmation Dialog */}
        {confirmOverwriteSave && (
          <div className="bg-[#121212] border border-blue-500/40 rounded-xl p-4 mb-4 text-xs">
            <div className="flex items-center space-x-2 text-blue-400 font-bold mb-2">
              <CloudUpload className="w-4 h-4" />
              <span>Update Existing Google Drive Backup?</span>
            </div>
            <p className="text-zinc-300 mb-3">
              A <code className="text-orange-400">pitmaster_smoker_data.json</code> file already exists in your Google Drive. Would you like to update it with your current smoker profile and logs?
            </p>
            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setConfirmOverwriteSave(false)}
                className="px-3 py-1.5 bg-[#242424] hover:bg-[#2a2a2a] text-zinc-300 font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveToDrive}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg cursor-pointer"
              >
                Confirm Save to Drive
              </button>
            </div>
          </div>
        )}

        {!currentUser || !accessToken ? (
          <div className="space-y-4 py-2">
            <p className="text-xs text-zinc-300 leading-relaxed text-center">
              Connect your Google account to back up your smoker logs, maintenance records, and fuel history securely to Google Drive.
            </p>

            {/* Terms & Privacy Pre-Sign-Up Notice */}
            <div className="bg-[#121212] border border-[#2a2a2a] p-3 rounded-xl space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-orange-400 flex items-center space-x-1.5 font-mono uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                  <span>Data Access & Privacy Disclosure</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsTermsModalOpen(true)}
                  className="text-[10px] text-blue-400 hover:underline flex items-center space-x-1 cursor-pointer font-semibold"
                >
                  <FileText className="w-3 h-3" />
                  <span>Read Full Terms</span>
                </button>
              </div>

              <p className="text-[11px] text-zinc-400 leading-normal">
                By signing in, you grant the app permission to read/write a single backup file (<code className="text-orange-400 font-mono">pitmaster_smoker_data.json</code>) in your Google Drive. We do NOT access any other files or share your personal data.
              </p>

              <label className="flex items-start space-x-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-700 text-orange-500 focus:ring-orange-500 bg-[#1e1e1e] cursor-pointer"
                />
                <span className="text-[11px] text-zinc-300 leading-tight">
                  I agree to the <button type="button" onClick={() => setIsTermsModalOpen(true)} className="text-orange-400 underline font-bold">Terms of Service</button> & Privacy Policy.
                </span>
              </label>
            </div>

            {/* Official Material Google Sign In Button */}
            <div className="flex justify-center pt-1">
              <button
                onClick={handleSignIn}
                disabled={loading || !termsAccepted}
                className="gsi-material-button w-full sm:w-auto flex items-center justify-center bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2.5 px-4 rounded-xl shadow-md border border-gray-300 transition-all cursor-pointer disabled:opacity-50"
              >
                <div className="gsi-material-button-content-wrapper flex items-center space-x-3">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 block">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-gray-800">
                    {loading ? 'Signing in...' : 'Sign in with Google'}
                  </span>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* User Info Bar */}
            <div className="bg-[#121212] border border-[#2a2a2a] p-3 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2.5 overflow-hidden">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-orange-500/40" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center">
                    {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                  </div>
                )}
                <div className="truncate">
                  <span className="text-white font-bold block truncate">{currentUser.displayName || 'Google User'}</span>
                  <span className="text-zinc-400 font-mono text-[10px] block truncate">{currentUser.email}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Drive Backup File Status */}
            <div className="bg-[#121212] border border-[#2a2a2a] p-3 rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-semibold">Google Drive Folder & File:</span>
                <span className="font-mono text-orange-400 font-bold">Smoke Stack / pitmaster_smoker_data.json</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Status:</span>
                <span className="font-mono text-zinc-300">
                  {driveFileInfo?.exists ? (
                    <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                      <CheckCircle className="w-3 h-3 inline mr-1" /> Existing Backup Found
                    </span>
                  ) : (
                    <span className="text-zinc-500">No backup file yet</span>
                  )}
                </span>
              </div>
            </div>

            {/* Sync Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleSaveToDrive}
                disabled={loading}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                <span>Save to Drive</span>
              </button>

              <button
                type="button"
                onClick={handleFetchDriveBackup}
                disabled={loading}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-[#242424] hover:bg-[#2a2a2a] text-amber-400 border border-amber-500/30 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
                <span>Restore from Drive</span>
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 text-center border-t border-[#2a2a2a] pt-3">
          <p className="text-[10px] text-zinc-500">
            Files are saved to your personal Google Drive account in compliance with Google Workspace security guidelines.
          </p>
        </div>
      </div>

      <TermsOfServiceModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onAccept={() => setTermsAccepted(true)}
        accepted={termsAccepted}
      />
    </div>
  );
};
