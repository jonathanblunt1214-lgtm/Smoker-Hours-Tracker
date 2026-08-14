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
  '  // UI visibility follows a server-verified role hydrated into userSession.\n  const isAdmin = userSession?.isMasterAdmin === true;',
  'navbar admin visibility',
);
fs.writeFileSync(navOutPath, nav, 'utf8');

let app = fs.readFileSync(appSourcePath, 'utf8');
app = app.replace("import { MASTER_ADMIN_EMAIL } from './utils/adminAuth';\n", '');
app = app.replace('  isMasterAdminVerifiedDevice,\n', '');
app = app.replace("import { initMasterLiveUpdateRunner } from './services/masterLiveUpdateService';\n", '');
app = app.replace("import { MASTER_SYNC_DATA_MERGED_EVENT, triggerMasterVersionSync, masterVersionSyncService } from './services/masterVersionSyncService';\n", '');
app = app.replace('  autoEvolveCharGPTMemory,\n', '');
app = app.replace("from './components/Navbar';", "from './components/Navbar.trusted';");
if (!app.includes("from './components/Navbar.trusted'")) throw new Error('[trusted-client] trusted Navbar import missing');
app = requiredReplace(
  app,
  '  loadDeletedCookLogIds,\n  addDeletedCookLogId,',
  '  loadDeletedCookLogIds,\n  saveDeletedCookLogIds,\n  addDeletedCookLogId,\n  INITIAL_CHARGPT_MEMORY,',
  'trusted storage imports',
);

app = requiredReplace(
  app,
  `        // Auto-login with detected Google account
        const userEmail = user.email || 'user@smokestack.app';
        const isMaster = userEmail.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

        const session: UserAuthSession = {
          id: user.uid,
          email: userEmail,
          name: user.displayName || (isMaster ? 'Jonathan Blunt' : userEmail.split('@')[0]),
          title: isMaster ? 'Head Pitmaster & Master Developer' : 'Pitmaster',
          provider: 'google',
          rememberMe: true,
          isMasterAdmin: isMaster,
          loggedInAt: new Date().toISOString(),
        };

        saveActiveUserSession(session, true);
        setUserSession(session);
        setIsLoginModalOpen(false);`,
  `        const userEmail = user.email || '';
        const session: UserAuthSession = {
          id: user.uid,
          email: userEmail,
          name: user.displayName || userEmail.split('@')[0] || 'Pitmaster',
          title: 'Pitmaster',
          provider: 'google',
          rememberMe: true,
          isMasterAdmin: false,
          loggedInAt: new Date().toISOString(),
        };

        saveActiveUserSession(session, true);
        setUserSession(session);
        setIsLoginModalOpen(false);

        user.getIdToken().then((idToken) => fetch('/api/admin/me', {
          headers: { Authorization: \`Bearer \${idToken}\` },
        })).then(async (roleRes) => {
          if (!roleRes.ok) return;
          const roleData = await roleRes.json();
          const verifiedSession: UserAuthSession = {
            ...session,
            title: roleData?.role === 'owner' ? 'Owner' : roleData?.role === 'admin' ? 'Administrator' : 'Pitmaster',
            isMasterAdmin: roleData?.permissions?.admin === true,
          };
          setUserSession(verifiedSession);
          saveActiveUserSession(verifiedSession, true);
        }).catch(() => {});`,
  'firebase role hydration',
);

app = requiredReplace(
  app,
  `        // Load authoritative data bundle from Firestore
        loadUserBundleFromFirestore(user.uid).then((bundle) => {
          if (bundle) {
            if (Array.isArray(bundle.cookLogs)) setCookLogs(bundle.cookLogs);
            if (bundle.profile) setProfile(bundle.profile);
            if (Array.isArray(bundle.fuelLogs)) setFuelLogs(bundle.fuelLogs);
            if (bundle.charGPTMemory) saveCharGPTMemory(bundle.charGPTMemory);
            setSyncStatus('synced');
          } else {
            // Save initial user bundle to Firestore for new user
            saveUserBundleToFirestore(user.uid, {
              profile,
              cookLogs,
              fuelLogs,
              charGPTMemory: loadCharGPTMemory(),
            }).then(() => setSyncStatus('synced'));
          }
        }).catch((err) => {
          console.warn('Error loading user bundle from Firestore:', err);
          setSyncStatus('error');
        });`,
  `        // Account isolation: never seed a newly authenticated account from an
        // unscoped browser cache that may belong to a previous user.
        const cleanProfile: SmokerProfile = { ...INITIAL_SMOKER_PROFILE };
        setProfile(cleanProfile);
        setCookLogs([]);
        setFuelLogs([]);
        saveDeletedCookLogIds([]);

        loadUserBundleFromFirestore(user.uid).then((bundle) => {
          if (bundle) {
            setProfile(bundle.profile || cleanProfile);
            setCookLogs(Array.isArray(bundle.cookLogs) ? bundle.cookLogs : []);
            setFuelLogs(Array.isArray(bundle.fuelLogs) ? bundle.fuelLogs : []);
            saveDeletedCookLogIds(Array.isArray(bundle.deletedCookLogIds) ? bundle.deletedCookLogIds : []);
            if (bundle.charGPTMemory) saveCharGPTMemory(bundle.charGPTMemory);
            else saveCharGPTMemory({ ...INITIAL_CHARGPT_MEMORY, lastEvolvedAt: new Date().toISOString() });
            setSyncStatus('synced');
            return;
          }

          const cleanMemory = { ...INITIAL_CHARGPT_MEMORY, lastEvolvedAt: new Date().toISOString() };
          saveCharGPTMemory(cleanMemory);
          saveUserBundleToFirestore(user.uid, {
            profile: cleanProfile,
            cookLogs: [],
            fuelLogs: [],
            charGPTMemory: cleanMemory,
            deletedCookLogIds: [],
          }).then((success) => setSyncStatus(success ? 'synced' : 'error'));
        }).catch((err) => {
          console.warn('Error loading user bundle from Firestore:', err);
          setSyncStatus('error');
        });`,
  'isolated Firestore account hydration',
);

app = requiredReplace(
  app,
  `    clearActiveUserSession();
    setUserSession(null);
    setCurrentUser(null);
    setAccessToken(null);`,
  `    clearActiveUserSession();
    saveDeletedCookLogIds([]);
    setUserSession(null);
    setCurrentUser(null);
    setAccessToken(null);
    setProfile({ ...INITIAL_SMOKER_PROFILE });
    setCookLogs([]);
    setFuelLogs([]);`,
  'logout account isolation',
);

app = replaceRange(
  app,
  '  // Initialize SmokerSyncEngine and SmokerHoursSyncService for 30-minute automated auto-syncing',
  '  // Sync profile changes',
  `  // Legacy 30-minute sync disabled. Firestore is authoritative for signed-in users.`,
  'legacy 30 minute sync engine',
);

app = replaceRange(
  app,
  '  // Initialize Master Admin Live Update Engine & Master Version Sync Event Listener',
  '  // Sync cook log changes & run automatic live cloud ML training & trigger Master Version sync',
  `  // Legacy Master Web live-update/sync disabled. GitHub/CI owns releases; Firestore owns user data.`,
  'legacy master live update engine',
);

app = replaceRange(
  app,
  '  // Sync cook log changes & run automatic live cloud ML training & trigger Master Version sync',
  '  // Sync fuel log changes',
  `  // Save local cache and the verified Firestore bundle without auto-writing AI memories.
  useEffect(() => {
    saveCookLogs(cookLogs);
    if (!currentUser?.uid) return;
    setSyncStatus('syncing');
    saveUserBundleToFirestore(currentUser.uid, {
      profile,
      cookLogs,
      fuelLogs,
      charGPTMemory: loadCharGPTMemory(),
      deletedCookLogIds: loadDeletedCookLogIds(),
    }).then((success) => setSyncStatus(success ? 'synced' : 'error'))
      .catch(() => setSyncStatus('error'));
  }, [cookLogs, currentUser?.uid]);`,
  'automatic CharGPT learning and master sync',
);

app = replaceRange(
  app,
  '  const syncCookLogsToServer = (logs: CookLog[], deletedIds?: string[]) => {',
  '  const handleDeleteCook = (id: string) => {',
  `  const syncCookLogsToServer = async (logs: CookLog[], deletedIds?: string[]): Promise<boolean> => {
    if (!currentUser?.uid) return false;
    const tombstones = Array.from(new Set([
      ...loadDeletedCookLogIds(),
      ...(deletedIds || []),
    ]));
    saveDeletedCookLogIds(tombstones);
    setSyncStatus('syncing');
    try {
      const success = await saveUserBundleToFirestore(currentUser.uid, {
        profile,
        cookLogs: logs,
        fuelLogs,
        charGPTMemory: loadCharGPTMemory(),
        deletedCookLogIds: tombstones,
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
  `    if (autoSyncNewCooks && !forceOffline) {
      syncCookLogsToServer(updatedCooks);
      showToast(\`Smoke journal entry "\${cookToSave.title}" saved & auto-synced to cloud server!\`);
    } else {
      showToast(\`Smoke journal entry "\${cookToSave.title}" saved locally to account! (Ready for analysis upload)\`);
    }`,
  `    if (autoSyncNewCooks && !forceOffline && currentUser?.uid) {
      syncCookLogsToServer(updatedCooks).then((success) => {
        showToast(success
          ? \`Smoke journal entry "\${cookToSave.title}" saved and synchronized.\`
          : \`Smoke journal entry "\${cookToSave.title}" saved locally; cloud synchronization is pending.\`);
      });
    } else {
      showToast(\`Smoke journal entry "\${cookToSave.title}" saved locally.\`);
    }`,
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
      deletedCookLogIds: loadDeletedCookLogIds(),
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
  };`,
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

for (const forbidden of ['auth_token_default', 'MASTER_ADMIN_EMAIL', 'autoEvolveCharGPTMemory', 'masterVersionSyncService', 'triggerMasterVersionSync']) {
  if (app.includes(forbidden)) throw new Error(`[trusted-client] forbidden legacy pattern remains: ${forbidden}`);
}
if (nav.includes("isMasterAdmin(currentUserEmail)")) throw new Error('[trusted-client] Navbar still trusts email for admin visibility');
if (!app.includes('deletedCookLogIds: tombstones')) throw new Error('[trusted-client] deletion tombstones are not persisted');
if (!app.includes('const cleanProfile: SmokerProfile = { ...INITIAL_SMOKER_PROFILE }')) throw new Error('[trusted-client] new account isolation is missing');

fs.writeFileSync(appOutPath, app, 'utf8');
console.log('[trusted-client] Generated trusted App/Navbar runtime with account isolation and tombstones.');
