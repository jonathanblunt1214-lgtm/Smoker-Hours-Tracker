import fs from 'node:fs';

const token = process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
const packageName = process.env.ANDROID_PACKAGE_NAME || 'com.smokestack.pitmaster';
const bundlePath = process.env.ANDROID_BUNDLE_PATH;
const track = process.env.GOOGLE_PLAY_TRACK || 'internal';
if (!token) throw new Error('Keyless Google OAuth access token is required.');
if (!bundlePath || !fs.existsSync(bundlePath)) throw new Error('Signed Android App Bundle was not found.');

const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const api = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}`;
const editsResponse = await fetch(`${api}/edits`, { method: 'POST', headers, body: '{}' });
if (!editsResponse.ok) throw new Error(`Google Play edit creation failed (${editsResponse.status}): ${await editsResponse.text()}`);
const { id: editId } = await editsResponse.json();

const uploadUrl = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/edits/${encodeURIComponent(editId)}/bundles?uploadType=media`;
const uploadResponse = await fetch(uploadUrl, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
  body: fs.readFileSync(bundlePath),
});
if (!uploadResponse.ok) throw new Error(`AAB upload failed (${uploadResponse.status}): ${await uploadResponse.text()}`);
const bundle = await uploadResponse.json();

const trackResponse = await fetch(`${api}/edits/${encodeURIComponent(editId)}/tracks/${encodeURIComponent(track)}`, {
  method: 'PUT',
  headers,
  body: JSON.stringify({ releases: [{ name: `SmokeStack ${process.env.GITHUB_SHA?.slice(0, 10) || bundle.versionCode}`, versionCodes: [String(bundle.versionCode)], status: 'completed' }] }),
});
if (!trackResponse.ok) throw new Error(`Google Play track update failed (${trackResponse.status}): ${await trackResponse.text()}`);

const commitResponse = await fetch(`${api}/edits/${encodeURIComponent(editId)}:commit`, { method: 'POST', headers, body: '{}' });
if (!commitResponse.ok) throw new Error(`Google Play edit commit failed (${commitResponse.status}): ${await commitResponse.text()}`);
console.log(`Published version code ${bundle.versionCode} to Google Play ${track} track.`);
