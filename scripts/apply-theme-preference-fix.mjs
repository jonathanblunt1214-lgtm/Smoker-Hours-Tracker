import fs from 'node:fs';
import path from 'node:path';

const appPath = path.join(process.cwd(), 'src/App.trusted.tsx');
let source = fs.readFileSync(appPath, 'utf8').replace(/\r\n/g, '\n');

const legacy = `  // Additional Togglable App Settings - Default to Dark Pitmaster Aesthetic
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    localStorage.setItem('smoker_theme_mode', 'dark');
    return 'dark';
  });`;

const fixed = `  // Persist the pitmaster's appearance choice across browser, PWA, and mobile launches.
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('smoker_theme_mode');
    return saved === 'light' ? 'light' : 'dark';
  });`;

if (!source.includes(legacy)) {
  throw new Error('[theme-preference] expected legacy initializer was not found');
}
source = source.replace(legacy, fixed);

if (/localStorage\.setItem\('smoker_theme_mode', 'dark'\);\s*return 'dark';/.test(source)) {
  throw new Error('[theme-preference] startup still overwrites saved appearance preference');
}

fs.writeFileSync(appPath, source, 'utf8');
console.log('[theme-preference] Trusted client now preserves the saved appearance preference.');
