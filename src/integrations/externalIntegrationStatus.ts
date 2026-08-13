export type ExternalIntegrationState =
  | 'unconfigured'
  | 'configured_unverified'
  | 'connected_verified'
  | 'preview_local'
  | 'error';

export interface ExternalIntegrationStatus {
  provider: 'alexa' | 'google_home' | 'fire_tv' | 'google_drive';
  state: ExternalIntegrationState;
  label: string;
  detail: string;
  verifiedAt?: string | null;
}

export const EXTERNAL_INTEGRATION_STATUS: Record<ExternalIntegrationStatus['provider'], ExternalIntegrationStatus> = {
  alexa: {
    provider: 'alexa',
    state: 'unconfigured',
    label: 'Alexa not connected',
    detail: 'Requires a real Alexa Skill plus OAuth 2.0 account linking. Local voice simulation is preview-only.',
  },
  google_home: {
    provider: 'google_home',
    state: 'unconfigured',
    label: 'Google Home not connected',
    detail: 'Requires Google Home APIs or Cloud-to-cloud OAuth and explicit structure/device permission. Browser speech is preview-only.',
  },
  fire_tv: {
    provider: 'fire_tv',
    state: 'unconfigured',
    label: 'Fire TV not connected',
    detail: 'No authenticated Fire TV delivery channel is configured. In-app overlays are local previews only.',
  },
  google_drive: {
    provider: 'google_drive',
    state: 'configured_unverified',
    label: 'Google Drive available for authorization',
    detail: 'Connection becomes verified only after OAuth authorization and a successful Drive write/read-back validation.',
  },
};
