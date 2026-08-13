// User Authentication, Device Verification & "Remember Me" Session Engine

import { MASTER_ADMIN_EMAIL } from './adminAuth';

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
  MASTER_VERIFIED_DEVICE: 'smoker_device_verified_master_v1',
  MASTER_TEMP_LOGOUT: 'smoker_master_temp_signed_out_v1',
};

/**
 * Checks if the current device is verified to be connected to jonathanblunt1214@gmail.com.
 */
export function isMasterAdminVerifiedDevice(): boolean {
  try {
    const isTempLoggedOut = sessionStorage.getItem(KEYS.MASTER_TEMP_LOGOUT) === 'true';
    if (isTempLoggedOut) return false;

    // 1. Check local device verification token
    const verifiedToken = localStorage.getItem(KEYS.MASTER_VERIFIED_DEVICE);
    if (verifiedToken === 'true' || verifiedToken === MASTER_ADMIN_EMAIL) {
      return true;
    }

    // 2. Check active saved session for Master Admin
    const rawLocal = localStorage.getItem(KEYS.LOCAL_SESSION);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (parsed?.email?.trim()?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
        return true;
      }
    }
  } catch (e) {
    console.error('Error checking master admin verified device state:', e);
  }
  return false;
}

/**
 * Marks the current device as a verified device connected to jonathanblunt1214@gmail.com.
 */
export function setMasterDeviceVerified(verified = true): void {
  try {
    if (verified) {
      localStorage.setItem(KEYS.MASTER_VERIFIED_DEVICE, 'true');
      sessionStorage.removeItem(KEYS.MASTER_TEMP_LOGOUT);
    } else {
      localStorage.removeItem(KEYS.MASTER_VERIFIED_DEVICE);
    }
  } catch (e) {
    console.error('Error setting master device verification:', e);
  }
}

/**
 * Gets the current active user session.
 * 1. Returns Master Admin session if device is verified for jonathanblunt1214@gmail.com.
 * 2. Checks sessionStorage (for non-remembered session).
 * 3. Checks localStorage (for "Remember Me" persistent session).
 */
export function getActiveUserSession(currentUserEmail?: string | null): UserAuthSession | null {
  try {
    const isTempLoggedOut = sessionStorage.getItem(KEYS.MASTER_TEMP_LOGOUT) === 'true';

    // Automatic Master Admin Login if user email is jonathanblunt1214@gmail.com OR device is verified
    const isMasterEmail = currentUserEmail?.trim()?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
    if ((isMasterEmail || isMasterAdminVerifiedDevice()) && !isTempLoggedOut) {
      // Auto-verify device for future launches
      setMasterDeviceVerified(true);
      return {
        id: 'master-admin-001',
        email: MASTER_ADMIN_EMAIL,
        name: 'Jonathan Blunt',
        title: 'Head Pitmaster & Master Developer',
        provider: 'master_verified_device',
        rememberMe: true,
        isMasterAdmin: true,
        loggedInAt: new Date().toISOString(),
      };
    }

    // Check temporary session storage (rememberMe = false)
    const rawSession = sessionStorage.getItem(KEYS.SESSION_ONLY);
    if (rawSession) {
      return JSON.parse(rawSession);
    }

    // Check persistent local storage (rememberMe = true)
    const rawLocal = localStorage.getItem(KEYS.LOCAL_SESSION);
    if (rawLocal) {
      return JSON.parse(rawLocal);
    }
  } catch (e) {
    console.error('Error loading user auth session:', e);
  }
  return null;
}

/**
 * Saves a user auth session.
 * Enforces "Remember Me" preference.
 */
export function saveActiveUserSession(session: UserAuthSession, rememberMe: boolean): void {
  try {
    sessionStorage.removeItem(KEYS.MASTER_TEMP_LOGOUT);

    const updatedSession: UserAuthSession = {
      ...session,
      rememberMe,
      loggedInAt: new Date().toISOString(),
    };

    if (rememberMe) {
      localStorage.setItem(KEYS.LOCAL_SESSION, JSON.stringify(updatedSession));
      sessionStorage.removeItem(KEYS.SESSION_ONLY);
    } else {
      sessionStorage.setItem(KEYS.SESSION_ONLY, JSON.stringify(updatedSession));
      localStorage.removeItem(KEYS.LOCAL_SESSION);
    }

    // If master email logged in, verify device
    if (session.email.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
      setMasterDeviceVerified(true);
    }
  } catch (e) {
    console.error('Error saving user auth session:', e);
  }
}

/**
 * Clears the active user auth session (Sign Out).
 */
export function clearActiveUserSession(): void {
  try {
    localStorage.removeItem(KEYS.LOCAL_SESSION);
    sessionStorage.removeItem(KEYS.SESSION_ONLY);
    sessionStorage.setItem(KEYS.MASTER_TEMP_LOGOUT, 'true');
  } catch (e) {
    console.error('Error clearing active user auth session:', e);
  }
}
