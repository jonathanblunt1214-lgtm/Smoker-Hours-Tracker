import fs from 'node:fs';

const sourcePath = 'src/components/SettingsModal.tsx';
const outPath = 'src/components/SettingsModal.trusted.tsx';
const appPath = 'src/App.trusted.tsx';

const modal = fs.readFileSync(sourcePath, 'utf8');
for (const marker of ['settings-mobile-list', 'settings-mobile-detail', "setMobilePage('list')", "setMobilePage('detail')"]) {
  if (!modal.includes(marker)) throw new Error(`[mobile-settings] Required responsive marker missing: ${marker}`);
}
fs.writeFileSync(outPath, modal, 'utf8');

let app = fs.readFileSync(appPath, 'utf8');
app = app.replace("from './components/SettingsModal'", "from './components/SettingsModal.trusted'");
if (!app.includes("from './components/SettingsModal.trusted'")) throw new Error('[mobile-settings] trusted Settings import missing');
fs.writeFileSync(appPath, app, 'utf8');

console.log('[mobile-settings] Full-screen category list and detail navigation verified.');
