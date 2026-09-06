import fs from 'node:fs';

const sourcePath = 'src/components/GoogleDriveSyncModal.tsx';
const outPath = 'src/components/GoogleDriveSyncModal.trusted.tsx';
const appPath = 'src/App.trusted.tsx';
let modal = fs.readFileSync(sourcePath, 'utf8').replace(/\r\n/g, '\n');

const importAnchor = "import { TermsOfServiceModal } from './TermsOfServiceModal';";
if (!modal.includes("../lib/driveBackupVerifier")) {
  if (!modal.includes(importAnchor)) throw new Error('[drive-verify] import anchor missing');
  modal = modal.replace(importAnchor, `${importAnchor}\nimport { verifyDriveBackup } from '../lib/driveBackupVerifier';`);
}

const saveAnchor = '      const res = await saveToGoogleDrive(token, currentAppData);\n      setDriveFileInfo({ exists: true, fileId: res.fileId });';
const saveReplacement = `      const res = await saveToGoogleDrive(token, currentAppData);\n      const verification = await verifyDriveBackup(token);\n      if (!verification.ok) {\n        throw new Error('Google Drive write completed but read-back verification failed: ' + verification.message);\n      }\n      setDriveFileInfo({ exists: true, fileId: res.fileId });`;
if (!modal.includes('const verification = await verifyDriveBackup(token);')) {
  if (!modal.includes(saveAnchor)) throw new Error('[drive-verify] save anchor missing');
  modal = modal.replace(saveAnchor, saveReplacement);
}

modal = modal.replace(
  "          ? 'Created and saved new pitmaster_smoker_data.json file in your Google Drive!'\n          : 'Successfully updated pitmaster_smoker_data.json in your Google Drive!',",
  "          ? `Created Google Drive backup and verified read-back (${verification.cookLogCount} cook logs, ${verification.fuelLogCount} fuel logs).`\n          : `Updated Google Drive backup and verified read-back (${verification.cookLogCount} cook logs, ${verification.fuelLogCount} fuel logs).`,"
);

if (!modal.includes('verifyDriveBackup(token)')) throw new Error('[drive-verify] verification call missing');
fs.writeFileSync(outPath, modal, 'utf8');

let app = fs.readFileSync(appPath, 'utf8').replace(/\r\n/g, '\n');
app = app.replace("from './components/GoogleDriveSyncModal'", "from './components/GoogleDriveSyncModal.trusted'");
if (!app.includes("from './components/GoogleDriveSyncModal.trusted'")) throw new Error('[drive-verify] trusted modal import missing');
fs.writeFileSync(appPath, app, 'utf8');
console.log('[drive-verify] Google Drive saves require successful API read-back verification before reporting success.');
