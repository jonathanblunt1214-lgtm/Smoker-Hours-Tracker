import fs from 'node:fs';

const targetPath = 'server.secure.generated.ts';
let source = fs.readFileSync(targetPath, 'utf8');

const marker = '// CharGPT API Route Handler';
if (!source.includes(marker)) throw new Error('[integration-contract] secure server marker not found');

const block = `
// External integration truth contract.
// Configuration may prove only that setup values exist; it never proves an external account/device is connected.
app.get('/api/integrations/status', (_req, res) => {
  const alexaConfigured = Boolean(
    process.env.ALEXA_SKILL_ID &&
    process.env.ALEXA_OAUTH_CLIENT_ID &&
    process.env.ALEXA_OAUTH_CLIENT_SECRET
  );
  const googleHomeConfigured = Boolean(
    process.env.GOOGLE_HOME_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_HOME_PROJECT_ID
  );
  const fireTvConfigured = Boolean(process.env.FIRE_TV_INTEGRATION_ID);

  return res.json({
    alexa: {
      state: alexaConfigured ? 'configured_unverified' : 'unconfigured',
      verified: false,
      detail: alexaConfigured
        ? 'Alexa configuration is present, but no authenticated account-linking round trip has been verified by this endpoint.'
        : 'No Alexa Skill OAuth configuration is present. Alexa UI is preview-only.'
    },
    googleHome: {
      state: googleHomeConfigured ? 'configured_unverified' : 'unconfigured',
      verified: false,
      detail: googleHomeConfigured
        ? 'Google Home configuration is present, but no OAuth permission/device round trip has been verified by this endpoint.'
        : 'No Google Home API/Cloud-to-cloud configuration is present. Browser voice behavior is preview-only.'
    },
    fireTv: {
      state: fireTvConfigured ? 'configured_unverified' : 'unconfigured',
      verified: false,
      detail: fireTvConfigured
        ? 'Fire TV configuration is present, but authenticated device delivery has not been verified by this endpoint.'
        : 'No authenticated Fire TV delivery integration is present. In-app overlays are preview-only.'
    },
    googleDrive: {
      state: 'authorization_required',
      verified: false,
      detail: 'Google Drive verification is account-scoped and becomes verified only after OAuth plus successful write/read-back validation in the client.'
    }
  });
});

// Legacy Alexa simulator routes must never be interpreted as a real provider connection.
app.use(['/api/alexa/skill', '/api/alexa/sync-telemetry'], (_req, res) => {
  return res.status(503).json({
    success: false,
    integration: 'alexa',
    state: 'unconfigured',
    previewOnly: true,
    error: 'Real Alexa account linking is not configured. The former server simulator is disabled by the SmokeStack integration trust contract.'
  });
});
`;

source = source.replace(marker, block + '\n' + marker);

if (!source.includes("'/api/integrations/status'")) throw new Error('[integration-contract] status endpoint missing');
if (!source.includes('former server simulator is disabled')) throw new Error('[integration-contract] Alexa simulator guard missing');

fs.writeFileSync(targetPath, source, 'utf8');
console.log('[integration-contract] External platforms report configured/verified states truthfully; legacy Alexa server simulation is disabled.');
