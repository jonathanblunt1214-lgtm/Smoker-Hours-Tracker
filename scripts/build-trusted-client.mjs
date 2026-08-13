import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appSourcePath = path.join(root, 'src/App.tsx');
const appOutPath = path.join(root, 'src/App.trusted.tsx');
const navSourcePath = path.join(root, 'src/components/Navbar.tsx');
const navOutPath = path.join(root, 'src/components/Navbar.trusted.tsx');

function requiredReplace(input, needle, replacement, label) {
  if (!input.includes(needle)) throw new Error(`[trusted-client] Required pattern missing: ${label}`);
  return input.replace(needle, replacement);
}

function replaceRange(input, startMarker, endMarker, replacement, label) {
  const start = input.indexOf(startMarker);
  const end = input.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0 || end <= start) throw new Error(`[trusted-client] Range missing: ${label}`);
  return input.slice(0, start) + replacement + '\n\n' + input.slice(end);
}

let nav = fs.readFileSync(navSourcePath, 'utf8');
nav = nav.replace("import { isMasterAdmin } from '../utils/adminAuth';\n", '');
nav = requiredReplace(
  nav,
  '  const isAdmin = isMasterAdmin(currentUserEmail) || userSession?.isMasterAdmin;',
  '  // UI visibility follows server-verified role state carried in userSession.\n  const isAdmin = userSession?.isMasterAdmin === true;',
  'navbar admin visibility',
);
fs.writeFileSync(navOutPath, nav, 'utf8');

let app = fs.readFileSync(appSourcePath, 'utf8');
app = app.replace("import { MASTER_ADMIN_EMAIL } from './utils/adminAuth';\n", '');
app = app.replace('  isMasterAdminVerifiedDevice,\n', '');
app = app.replace("import { initMasterLiveUpdateRunner } from './services/masterLiveUpdateService';\n", '');
app = app.replace("import { MASTER_SYNC_DATA_MERGED_EVENT, triggerMasterVersionSync, masterVersionSyncService } from './services/masterVersionSyncService';\n", '');
app = app.replace('  autoEvolveCharGPTMemory,\n', '');
app = app.replace("import { Navbar } from './components/Navbar';", "import { Navbar } from './components/Navbar.trusted';");

app = requiredReplace(
  app,
  "        // Auto-login with detected Google account\n        const userEmail = user.email || 'user@smokestack.app';\n        const isMaster = userEmail.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();\n\n        const session: UserAuthSession = {\n          id: user.uid,\n          email: userEmail,\n          name: user.displayName || (isMaster ? 'Jonathan Blunt' : userEmail.split('@')[0]),\n          title: isMaster ? 'Head Pitmaster & Master Developer' : 'Pitmaster',\n          provider: 'google',\n          rememberMe: true,\n          isMasterAdmin: isMaster,\n          loggedInAt: new Date().toISOString(),\n        };\n\n        saveActiveUserSession(session, true);\n        setUserSession(session);\n        setIsLoginModalOpen(false);",
  "        const userEmail = user.email || '';\n        const session: UserAuthSession = {\n          id: user.uid,\n          email: userEmail,\n          name: user.displayName || userEmail.split('@')[0] || 'Pitmaster',\n          title: 'Pitmaster',\n          provider: 'google',\n          rememberMe: true,\n          isMasterAdmin: false,\n          loggedInAt: new Date().toISOString(),\n        };\n\n        saveActiveUserSession(session, true);\n        setUserSession(session);\n        setIsLoginModalOpen(false);\n\n        // Refresh administrator visibility from verified Firebase custom claims.\n        user.getIdToken().then((idToken) => fetch('/api/admin/me', {\n          headers: { Authorization: `Bearer ${idToken}` },\n        })).then(async (roleRes) => {\n          if (!roleRes.ok) return;\n          const roleData = await roleRes.json();\n          const verifiedSession = {\n            ...session,\n            title: roleData?.role === 'owner' ? 'Owner' : roleData?.role === 'admin' ? 'Administrator' : 'Pitmaster',\n            isMasterAdmin: roleData?.permissions?.admin === true,\n          };\n          setUserSession(verifiedSession);\n          saveActiveUserSession(verifiedSession, true);\n        }).catch(() => {});",
  'firebase role hydration',
);

app = replaceRange(
  app,
  '  // Initialize SmokerSyncEngine and SmokerHoursSyncService for 30-minute automated auto-syncing',
  '  // Sync profile changes',
  `  // Legacy 30-minute sync engine disabled. Firestore is authoritative for signed-in users.
  // Reconnect and record changes are persisted through verified Firebase UID operations.`,
  'legacy 30 minute sync engine',
);

app = replaceRange(
  app,
  '  // Initialize Master Admin Live Update Engine & Master Version Sync Event Listener',
  '  // Sync cook log changes & run automatic live cloud ML training & trigger Master Version sync',
  `  // Legacy "Master Web" live-update/sync system disabled. GitHub/CI owns releases;
  // Firestore owns user data synchronization.`,
  'legacy master live update engine',
);

app = replaceRange(
  app,
  '  // Sync cook log changes & run automatic live cloud ML training & trigger Master Version sync',
  '  // Sync fuel log changes',
  `  // Persist local cache and authoritative Firestore bundle without silently creating AI memory rules.
  useEffect(() => {
    saveCookLogs(cookLogs);
    if (!currentUser?.uid) return;
    setSyncStatus('syncing');
    saveUserBundleToFirestore(currentUser.uid, {
      profile,
      cookLogs,
      fuelLogs,
      charGPTMemory: loadCharGPTMemory(),
    }).then((success) => setSyncStatus(success ? 'synced' : 'error'))
      .catch(() => setSyncStatus('error'));
  }, [cookLogs, currentUser?.uid]);`,
  'automatic CharGPT learning and master sync',
);

app = replaceRange(
  app,
  '  const syncCookLogsToServer = (logs: CookLog[], deletedIds?: string[]) => {',
  '  const handleDeleteCook = (id: string) => {',
  `  const syncCookLogsToServer = async (logs: CookLog[], _deletedIds?: string[]): Promise<boolean> => {
    if (!currentUser?.uid) return false;
    setSyncStatus('syncing');
    try {
      const success = await saveUserBundleToFirestore(currentUser.uid, {
        profile,
        cookLogs: logs,
        fuelLogs,
        charGPTMemory: loadCharGPTMemory(),
      });
      setSyncStatus(success ? 'synced' : 'error');
      return success;
    } catch (err) {
      console.warn('Firestore cook log sync failed:', err);
      setSyncStatus('error');
      return false;
    }
  };`,
  'legacy email scoped cook sync',
);

app = requiredReplace(
  app,
  "    if (autoSyncNewCooks && !forceOffline) {\n      syncCookLogsToServer(updatedCooks);\n      showToast(`Smoke journal entry \"${cookToSave.title}\" saved & auto-synced to cloud server!`);\n    } else {\n      showToast(`Smoke journal entry \"${cookToSave.title}\" saved locally to account! (Ready for analysis upload)`);\n    }",
  "    if (autoSyncNewCooks && !forceOffline && currentUser?.uid) {\n      syncCookLogsToServer(updatedCooks).then((success) => {\n        showToast(success\n          ? `Smoke journal entry \"${cookToSave.title}\" saved and synchronized.`\n          : `Smoke journal entry \"${cookToSave.title}\" saved locally; cloud synchronization is pending.`);\n      });\n    } else {\n      showToast(`Smoke journal entry \"${cookToSave.title}\" saved locally.`);\n    }",
  'verified cook save toast',
);

app = replaceRange(
  app,
  '  const handleUploadAndSyncProfile = () => {',
  '  const handleCustomSmokerCreated = (',
  `  const handleUploadAndSyncProfile = async () => {
    saveSmokerProfile(profile);
    saveCookLogs(cookLogs);
    if (!currentUser?.uid) {
      showToast('Sign in to synchronize account data. Local changes remain on this device.');
      return;
    }

    setSyncStatus('syncing');
    const synced = await saveUserBundleToFirestore(currentUser.uid, {
      profile,
      cookLogs,
      fuelLogs,
      charGPTMemory: loadCharGPTMemory(),
    }).catch(() => false);
    setSyncStatus(synced ? 'synced' : 'error');

    if (!synced) {
      showToast('Account synchronization failed. Local data was preserved.');
      return;
    }

    showToast('SmokeStack account synchronized.');

    const driveToken = accessToken || (await getAccessToken());
    if (driveToken) {
      const savedAcc = localStorage.getItem('pitmaster_local_user_account');
      const userAcc = savedAcc ? JSON.parse(savedAcc) : undefined;
      saveToGoogleDrive(driveToken, { profile, cookLogs, fuelLogs, userAccount: userAcc })
        .then(() => showToast('SmokeStack account synchronized and Google Drive backup completed.'))
        .catch(() => showToast('SmokeStack account synchronized; Google Drive backup failed.'));
    }
  };

  const handleCustomSmokerCreated = (`,
  'verified profile sync action',
);

app = app.replace("      showToast('All smoker logs restored to baseline sample data.');", "      showToast('Local smoker data reset to clean defaults.');");

app = requiredReplace(
  app,
  '      {/* Master Admin & Developer Dashboard Modal */}\n      <MasterAdminDashboardModal',
  '      {/* SmokeStack Operations — visible only after verified ADMIN/OWNER role hydration */}\n      {userSession?.isMasterAdmin === true && (\n      <MasterAdminDashboardModal',
  'admin modal visibility start',
);
app = requiredReplace(
  app,
  '        showToast={showToast}\n      />\n\n      {/* Download App & Play Store Hub Modal */}',
  '        showToast={showToast}\n      />\n      )}\n\n      {/* Download App & Play Store Hub Modal */}',
  'admin modal visibility end',
);

if (app.includes('auth_token_default')) throw new Error('[trusted-client] auth_token_default remains in trusted App');
if (app.includes('MASTER_ADMIN_EMAIL')) throw new Error('[trusted-client] hard-coded owner email remains in trusted App');
if (app.includes('autoEvolveCharGPTMemory')) throw new Error('[trusted-client] automatic durable AI learning remains in trusted App');
if (app.includes('masterVersionSyncService') || app.includes('triggerMasterVersionSync')) throw new Error('[trusted-client] legacy master sync remains in trusted App');

fs.writeFileSync(appOutPath, app, 'utf8');
console.log('[trusted-client] Generated src/App.trusted.tsx and src/components/Navbar.trusted.tsx');
console.log('[trusted-client] Verified: server-role admin visibility, no auth_token_default, no auto durable learning, no legacy master sync.');
