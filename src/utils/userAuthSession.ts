// Local presentation/session cache. This is NOT an authorization boundary.
// Firebase Authentication + verified server-side custom claims own identity/roles.

export interface UserAuthSession {
  id: string;
  email: string;
  name: string;
  title: string;
  provider: 'google' | 'amazon' | 'email' | 'master_verified_device';
  rememberMe: boolean;
  isMasterAdmin: boolean;
  loggedInAt: string;
}

const KEYS = {
  LOCAL_SESSION: 'smoker_active_user_session_v1',
  SESSION_ONLY: 'smoker_temp_user_session_v1',
};

function sanitizeSession(value: unknown): UserAuthSession | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<UserAuthSession>;
  if (!raw.id || !raw.email) return null;

  return {
    id: String(raw.id),
    email: String(raw.email),
    name: String(raw.name || raw.email).trim(),
    title: String(raw.title || 'Pitmaster'),
    provider: raw.provider || 'google',
    rememberMe: raw.rememberMe !== false,
    // Never trust a cached admin bit across reloads. App.tsx refreshes this from
    // /api/admin/me after Firebase ID-token verification.
    isMasterAdmin: false,
    loggedInAt: String(raw.loggedInAt || new Date().toISOString()),
  };
}

export function getActiveUserSession(_currentUserEmail?: string | null): UserAuthSession | null {
  try {
    const sessionOnly = sessionStorage.getItem(KEYS.SESSION_ONLY);
    if (sessionOnly) return sanitizeSession(JSON.parse(sessionOnly));

    const persisted = localStorage.getItem(KEYS.LOCAL_SESSION);
    if (persisted) return sanitizeSession(JSON.parse(persisted));
  } catch (e) {
    console.error('Error loading cached user session:', e);
  }
  return null;
}

export function saveActiveUserSession(session: UserAuthSession, rememberMe: boolean): void {
  try {
    const updatedSession: UserAuthSession = {
      ...session,
      rememberMe,
      loggedInAt: session.loggedInAt || new Date().toISOString(),
    };

    if (rememberMe) {
      localStorage.setItem(KEYS.LOCAL_SESSION, JSON.stringify(updatedSession));
      sessionStorage.removeItem(KEYS.SESSION_ONLY);
    } else {
      sessionStorage.setItem(KEYS.SESSION_ONLY, JSON.stringify(updatedSession));
      localStorage.removeItem(KEYS.LOCAL_SESSION);
    }
  } catch (e) {
    console.error('Error saving cached user session:', e);
  }
}

export function clearActiveUserSession(): void {
  try {
    localStorage.removeItem(KEYS.LOCAL_SESSION);
    sessionStorage.removeItem(KEYS.SESSION_ONLY);
  } catch (e) {
    console.error('Error clearing cached user session:', e);
  }
}

/**
 * Legacy compatibility exports. They intentionally never grant authority.
 * Remove once all old callers are migrated to server role claims.
 */
export function isMasterAdminVerifiedDevice(): boolean {
  return false;
}

export function setMasterDeviceVerified(_verified = true): void {
  // No-op: device-local flags cannot grant OWNER/ADMIN privileges.
}
