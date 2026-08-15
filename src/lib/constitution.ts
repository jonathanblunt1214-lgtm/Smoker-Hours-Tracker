export type CapabilityState =
  | 'unavailable'
  | 'available'
  | 'authorization_required'
  | 'configured_unverified'
  | 'verified'
  | 'error';

export type ProvenanceClass =
  | 'VERIFIED_SOURCE'
  | 'USER_OBSERVED'
  | 'USER_ENTERED'
  | 'CALCULATED'
  | 'AI_SUGGESTED'
  | 'SIMULATED'
  | 'DEMO'
  | 'UNKNOWN';

export const CONSTITUTION_REVISION = 4;

export const CONSTITUTION_RULES = Object.freeze({
  unknownMeansUnknown: true,
  firebaseIdentityOnly: true,
  firestoreAuthoritativeWhenSignedIn: true,
  driveIsBackupOnly: true,
  explicitDurableAiMemory: true,
  contextualPermissions: true,
  verifiedSuccessOnly: true,
  canonicalSourceOnly: true,
  futureFeaturesInheritConstitution: true,
  migrationsPreserveUserData: true,
  amendmentsCannotSilentlyWeakenProtections: true,
});

export function accountSyncLabel(args: {
  authenticated: boolean;
  online: boolean;
  state: 'synced' | 'syncing' | 'pending' | 'offline' | 'error';
}): string {
  if (!args.authenticated) return 'Sign in to sync';
  if (!args.online || args.state === 'offline') return 'Offline — changes pending';
  if (args.state === 'syncing' || args.state === 'pending') return 'Synchronizing…';
  if (args.state === 'error') return 'Sync needs attention';
  return 'Account synchronized';
}
export function charGPTAvailabilityLabel(args: {
  online: boolean;
  authenticated: boolean;
  grounded: boolean;
}): string {
  if (!args.online) return 'Offline — CharGPT unavailable';
  if (!args.authenticated) return 'Sign in to use account-aware guidance';
  return args.grounded ? 'Grounded response available' : 'Online — grounding not yet verified';
}

export function maintenanceStatusLabel(args: {
  hasSmoker: boolean;
  dueCount: number;
}): string {
  if (!args.hasSmoker) return 'Select a smoker';
  return args.dueCount > 0 ? `${args.dueCount} service due` : 'Maintenance current';
}
