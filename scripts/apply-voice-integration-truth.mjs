import fs from 'node:fs';

const notificationSource = 'src/utils/notificationAndAlexa.ts';
const notificationOut = 'src/utils/notificationAndAlexa.trusted.ts';
const hubSource = 'src/components/PushAndAlexaHub.tsx';
const hubOut = 'src/components/PushAndAlexaHub.trusted.tsx';
const aiSource = 'src/components/AIPitmasterModal.tsx';
const aiOut = 'src/components/AIPitmasterModal.trusted.tsx';
const appPath = 'src/App.trusted.tsx';

let notification = fs.readFileSync(notificationSource, 'utf8');
notification = notification.replace("  enabled: true,\n  deviceName: 'Living Room Nest Hub',\n  broadcastVoiceEnabled: true,", "  enabled: false,\n  deviceName: 'Not connected',\n  broadcastVoiceEnabled: false,");
notification = notification.replace("  enabled: true,\n  deviceName: 'Living Room Fire TV Stick 4K',", "  enabled: false,\n  deviceName: 'Not connected',");
notification = notification.replace("  linkCode: 'ALEXA-SMOKESTACK-8942',", "  linkCode: '',");
notification = notification.replace(/Google Home \(\$\{deviceName\}\):/g, 'Google Home preview (${deviceName}):');
notification = notification.replace(/Google Assistant Broadcast to \$\{deviceName\}:/g, 'Smoke Stack local voice preview for ${deviceName}:');
notification = notification.replace(/Fire TV \(\$\{deviceName\}\):/g, 'Fire TV preview (${deviceName}):');
fs.writeFileSync(notificationOut, notification, 'utf8');

let hub = fs.readFileSync(hubSource, 'utf8');
hub = hub.replace("from '../utils/notificationAndAlexa';", "from '../utils/notificationAndAlexa.trusted';");
hub = hub.replace("'Your Brisket Flat is currently at 198°F, 5 degrees away from your 203°F finish goal!'", 'null');
hub = hub.replace("'Brisket Flat: 198°F / Target: 203°F | Pit Temp: 225°F'", 'null');
hub = hub.replace("Amazon Alexa Cloud Sync & Voice Controls", "Alexa Voice Preview & Browser Alerts");
hub = hub.replace(/Alexa Live Sync/g, 'Preview Mode');
hub = hub.replace(/Sync Paused/g, 'Preview Off');
hub = hub.replace(/Sync live smoker temperature telemetry to Amazon Alexa for hands-free voice queries & Echo alerts/g, 'Preview Alexa-style voice responses locally. No Amazon cloud or Echo connection is active until a real Alexa Skill is linked.');
hub = hub.replace(/Amazon Smart Home & Media Hub/g, 'Amazon / Alexa Integration Status');
hub = hub.replace(/Fire TV on-screen toasts & Alexa voice sync enabled\./g, 'SmokeStack account signed in; Amazon, Fire TV, and Alexa cloud linking are not configured.');
hub = hub.replace(/Sign in with Amazon to enable Fire TV notifications and link Alexa speaker alerts across your devices\./g, 'Amazon account linking is not configured in this build. Browser previews remain local to this device.');
hub = hub.replace(/Copied Alexa Account Linking Code!/g, 'Alexa account linking is not configured; no real link code exists.');
hub = hub.replace(/Generated new Alexa link code: \$\{newCode\}/g, 'Alexa account linking is not configured; generated codes are disabled.');
hub = hub.replace(/const handleCopyLinkCode = \(\) => \{[\s\S]*?\n  \};\n\n  const handleRegenerateCode = \(\) => \{[\s\S]*?\n  \};/, `const handleCopyLinkCode = () => {\n    if (onShowToast) onShowToast('Alexa account linking is not configured. No real link code is available.');\n  };\n\n  const handleRegenerateCode = () => {\n    if (onShowToast) onShowToast('Alexa account linking requires a real Alexa Skill OAuth flow; local codes are disabled.');\n  };`);
hub = hub.replace(/saveActiveUserSession\(session, true\);/g, "if (onShowToast) onShowToast('Amazon account linking is not configured. This is a local preview only.');");
hub = hub.replace(/setUserSession\(session\);/g, 'void session;');
hub = hub.replace(/Signed in with Amazon account successfully!/g, 'Amazon account linking is not configured. This panel is preview-only.');
if (hub.includes("saveActiveUserSession(session, true)")) throw new Error('[voice-truth] fake Amazon session persistence remains');
if (hub.includes('Signed in with Amazon account successfully!')) throw new Error('[voice-truth] fake Amazon sign-in success remains');
if (hub.includes('Generated new Alexa link code:')) throw new Error('[voice-truth] fake Alexa code generation remains');
fs.writeFileSync(hubOut, hub, 'utf8');

let ai = fs.readFileSync(aiSource, 'utf8');
ai = ai.replace("import { PushAndAlexaHub } from './PushAndAlexaHub';", "import { PushAndAlexaHub } from './PushAndAlexaHub.trusted';");
fs.writeFileSync(aiOut, ai, 'utf8');

let app = fs.readFileSync(appPath, 'utf8');
app = app.replace("from './components/AIPitmasterModal'", "from './components/AIPitmasterModal.trusted'");
if (!app.includes("from './components/AIPitmasterModal.trusted'")) throw new Error('[voice-truth] trusted CharGPT UI import missing');
fs.writeFileSync(appPath, app, 'utf8');
console.log('[voice-truth] Alexa, Amazon, Fire TV, and Google Home surfaces are labeled as local previews until real external account linking exists.');
