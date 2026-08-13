import fs from 'node:fs';

const notificationSource = 'src/utils/notificationAndAlexa.ts';
const notificationOut = 'src/utils/notificationAndAlexa.trusted.ts';
const hubSource = 'src/components/PushAndAlexaHub.tsx';
const hubOut = 'src/components/PushAndAlexaHub.trusted.tsx';
const aiSource = 'src/components/AIPitmasterModal.tsx';
const aiOut = 'src/components/AIPitmasterModal.trusted.tsx';
const appPath = 'src/App.trusted.tsx';
const serverPath = 'server.secure.generated.ts';

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

// A local preview must never POST telemetry to an endpoint named for Alexa or present its response as cloud connectivity.
hub = hub.replace(/\n\s*\/\/ Auto-sync current cook and telemetry to server for Alexa requests[\s\S]*?\n\s*syncTelemetryToServer\(\);/, '');
hub = hub.replace(/const handleExecuteVoiceQuery = async \(queryText\?: string\) => \{[\s\S]*?\n  \};\n\n  if \(isCollapsible\)/, `const handleExecuteVoiceQuery = async (queryText?: string) => {\n    const query = queryText || simulatedVoiceQuery;\n    setSimulatedVoiceQuery(query);\n    setIsSimulatingVoice(true);\n    const spoken = 'Alexa cloud integration is not configured. This is a local SmokeStack voice-preview surface and no request was sent to Amazon.';\n    setAlexaResponseText(spoken);\n    setAlexaCardContent('Preview only — no Amazon account or Alexa Skill linked');\n    setIsPlayingAudio(true);\n    speakAlexaVoice(spoken);\n    setTimeout(() => setIsPlayingAudio(false), 3000);\n    setIsSimulatingVoice(false);\n  };\n\n  if (isCollapsible)`);

if (hub.includes("saveActiveUserSession(session, true)")) throw new Error('[voice-truth] fake Amazon session persistence remains');
if (hub.includes('Signed in with Amazon account successfully!')) throw new Error('[voice-truth] fake Amazon sign-in success remains');
if (hub.includes('Generated new Alexa link code:')) throw new Error('[voice-truth] fake Alexa code generation remains');
if (hub.includes("fetch('/api/alexa/skill'")) throw new Error('[voice-truth] Alexa preview still calls server skill route');
if (hub.includes("fetch('/api/alexa/sync-telemetry'")) throw new Error('[voice-truth] Alexa preview still syncs telemetry to server');
fs.writeFileSync(hubOut, hub, 'utf8');

let ai = fs.readFileSync(aiSource, 'utf8');
ai = ai.replace("import { PushAndAlexaHub } from './PushAndAlexaHub';", "import { PushAndAlexaHub } from './PushAndAlexaHub.trusted';");
fs.writeFileSync(aiOut, ai, 'utf8');

let app = fs.readFileSync(appPath, 'utf8');
app = app.replace("from './components/AIPitmasterModal'", "from './components/AIPitmasterModal.trusted'");
if (!app.includes("from './components/AIPitmasterModal.trusted'")) throw new Error('[voice-truth] trusted CharGPT UI import missing');
fs.writeFileSync(appPath, app, 'utf8');

// Server contract: configuration is not verification, and legacy Alexa simulation endpoints are disabled.
let server = fs.readFileSync(serverPath, 'utf8');
const marker = '// CharGPT API Route Handler';
if (!server.includes(marker)) throw new Error('[voice-truth] server route marker missing');
const contract = `\napp.get('/api/integrations/status', (_req, res) => {\n  const alexaConfigured = Boolean(process.env.ALEXA_SKILL_ID && process.env.ALEXA_OAUTH_CLIENT_ID && process.env.ALEXA_OAUTH_CLIENT_SECRET);\n  const googleHomeConfigured = Boolean(process.env.GOOGLE_HOME_OAUTH_CLIENT_ID && process.env.GOOGLE_HOME_PROJECT_ID);\n  const fireTvConfigured = Boolean(process.env.FIRE_TV_INTEGRATION_ID);\n  return res.json({\n    alexa: { state: alexaConfigured ? 'configured_unverified' : 'unconfigured', verified: false },\n    googleHome: { state: googleHomeConfigured ? 'configured_unverified' : 'unconfigured', verified: false },\n    fireTv: { state: fireTvConfigured ? 'configured_unverified' : 'unconfigured', verified: false },\n    googleDrive: { state: 'authorization_required', verified: false, verification: 'OAuth plus successful write/read-back required' }\n  });\n});\napp.use(['/api/alexa/skill', '/api/alexa/sync-telemetry'], (_req, res) => res.status(503).json({\n  success: false, integration: 'alexa', state: 'unconfigured', previewOnly: true,\n  error: 'Real Alexa account linking is not configured. Legacy server simulation is disabled.'\n}));\n`;
server = server.replace(marker, contract + '\n' + marker);
if (!server.includes("'/api/integrations/status'")) throw new Error('[voice-truth] integration status endpoint missing');
fs.writeFileSync(serverPath, server, 'utf8');

console.log('[voice-truth] External integration trust contract enforced: previews stay local; provider connections require real authorization and verification.');
