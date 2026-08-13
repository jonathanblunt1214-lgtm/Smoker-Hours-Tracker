import { findDriveFile, loadFromGoogleDrive } from './driveSync';

export async function verifyDriveBackup(token: string) {
  const fileId = await findDriveFile(token);
  if (!fileId) return { ok: false, status: 'missing' as const, message: 'No Smoke Stack Google Drive backup was found.' };
  const data = await loadFromGoogleDrive(token);
  const valid = Boolean(data?.savedAt && data?.profile && Array.isArray(data?.cookLogs) && Array.isArray(data?.fuelLogs));
  if (!valid) return { ok: false, status: 'invalid' as const, fileId, message: 'The Drive file exists but does not match the Smoke Stack backup schema.' };
  return { ok: true, status: 'verified' as const, fileId, savedAt: data!.savedAt, cookLogCount: data!.cookLogs.length, fuelLogCount: data!.fuelLogs.length, message: `Google Drive backup read-back verified: ${data!.cookLogs.length} cook log(s), ${data!.fuelLogs.length} fuel log(s).` };
}
