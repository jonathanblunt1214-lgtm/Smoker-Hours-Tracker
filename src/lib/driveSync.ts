import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';

import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import firebaseConfig from '../../firebase-applet-config.json';
import { SmokerProfile, CookLog, FuelLog, LocalUserProfile } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

const GOOGLE_OAUTH_TOKEN_KEY = 'pitmaster_google_oauth_token';

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const isValidGoogleOAuthToken = (token: string | null | undefined): boolean => {
  if (!token || typeof token !== 'string') return false;
  // Firebase ID tokens are JWTs starting with 'eyJ'. They cannot be used with Google Drive REST API.
  if (token.startsWith('eyJ')) return false;
  return token.length > 10;
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      let oauthToken = cachedAccessToken || localStorage.getItem(GOOGLE_OAUTH_TOKEN_KEY) || '';
      if (!isValidGoogleOAuthToken(oauthToken)) {
        oauthToken = '';
      }
      if (onAuthSuccess) onAuthSuccess(user, oauthToken);
    } else {
      cachedAccessToken = null;
      localStorage.removeItem(GOOGLE_OAUTH_TOKEN_KEY);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;

    if (Capacitor.isNativePlatform()) {
      const nativeResult =
        await FirebaseAuthentication.signInWithGoogle({
          useCredentialManager: true,
        });

      const idToken = nativeResult.credential?.idToken;

      if (!idToken) {
        throw new Error('Google native sign-in did not return an ID token.');
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const firebaseResult = await signInWithCredential(auth, credential);

      const accessToken = nativeResult.credential?.accessToken || '';

      if (accessToken) {
        cachedAccessToken = accessToken;
        try {
          localStorage.setItem(GOOGLE_OAUTH_TOKEN_KEY, accessToken);
        } catch (e) {
          console.warn('Could not store Google OAuth token:', e);
        }
      }

      return {
        user: firebaseResult.user,
        accessToken,
      };
    }

    const result = await signInWithPopup(auth, provider);

    const credential =
      GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve Google OAuth access token');
    }

    cachedAccessToken = credential.accessToken;

    try {
      localStorage.setItem(
        GOOGLE_OAUTH_TOKEN_KEY,
        cachedAccessToken
      );
    } catch (e) {
      console.warn('Could not store Google OAuth token:', e);
    }

    return {
      user: result.user,
      accessToken: cachedAccessToken,
    };
  } catch (error: any) {
    console.error('Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (isValidGoogleOAuthToken(cachedAccessToken)) return cachedAccessToken;
  try {
    const stored = localStorage.getItem(GOOGLE_OAUTH_TOKEN_KEY);
    if (isValidGoogleOAuthToken(stored)) {
      cachedAccessToken = stored;
      return stored;
    }
  } catch (e) {
    console.warn('Could not read stored Google OAuth token:', e);
  }
  return null;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  localStorage.removeItem(GOOGLE_OAUTH_TOKEN_KEY);
};

export interface AppDriveData {
  version: string;
  savedAt: string;
  profile: SmokerProfile;
  cookLogs: CookLog[];
  fuelLogs: FuelLog[];
  userAccount?: LocalUserProfile;
  userProfile?: LocalUserProfile;
}

const DRIVE_FOLDER_NAME = 'Smoke Stack';
const DRIVE_FILE_NAME = 'pitmaster_smoker_data.json';

const resolveValidToken = async (accessToken: string): Promise<string> => {
  let token = accessToken;
  if (!isValidGoogleOAuthToken(token)) {
    token = (await getAccessToken()) || '';
  }
  if (!isValidGoogleOAuthToken(token)) {
    throw new Error('Google Drive authorization required. Please click "Connect Google Drive" or "Sign in with Google" to grant Drive access.');
  }
  return token;
};

// Get or create dedicated folder 'Smoke Stack' in Google Drive
export const getOrCreateDriveFolder = async (accessToken: string): Promise<string> => {
  const token = await resolveValidToken(accessToken);
  const query = encodeURIComponent(`name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 403) {
    cachedAccessToken = null;
    localStorage.removeItem(GOOGLE_OAUTH_TOKEN_KEY);
    throw new Error('Google Drive session expired or unauthorized. Please click "Connect Google Drive" to re-authorize.');
  }

  if (res.ok) {
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Folder does not exist, create 'Smoke Stack' folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Smoke Stack Application Data & Backup Directory',
    }),
  });

  if (!createRes.ok) {
    if (createRes.status === 401 || createRes.status === 403) {
      cachedAccessToken = null;
      localStorage.removeItem(GOOGLE_OAUTH_TOKEN_KEY);
      throw new Error('Google Drive session expired or unauthorized. Please click "Connect Google Drive" to re-authorize.');
    }
    throw new Error(`Failed to create '${DRIVE_FOLDER_NAME}' folder in Google Drive: ${createRes.statusText}`);
  }

  const folderData = await createRes.json();
  return folderData.id;
};

// Find existing drive file ID inside the dedicated folder or root
export const findDriveFile = async (accessToken: string): Promise<string | null> => {
  const token = await resolveValidToken(accessToken);
  let folderId: string | null = null;
  try {
    folderId = await getOrCreateDriveFolder(token);
  } catch (e: any) {
    if (e?.message?.includes('expired') || e?.message?.includes('unauthorized') || e?.message?.includes('authorization required')) {
      throw e;
    }
    console.warn('Folder check error, fallback to root:', e);
  }

  if (folderId) {
    const inFolderQuery = encodeURIComponent(`name = '${DRIVE_FILE_NAME}' and '${folderId}' in parents and trashed = false`);
    const inFolderRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${inFolderQuery}&fields=files(id,name,modifiedTime)`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (inFolderRes.status === 401 || inFolderRes.status === 403) {
      cachedAccessToken = null;
      localStorage.removeItem(GOOGLE_OAUTH_TOKEN_KEY);
      throw new Error('Google Drive session expired or unauthorized. Please click "Connect Google Drive" to re-authorize.');
    }
    if (inFolderRes.ok) {
      const inFolderData = await inFolderRes.json();
      if (inFolderData.files && inFolderData.files.length > 0) {
        return inFolderData.files[0].id;
      }
    }
  }

  // Fallback search without folder constraint
  const query = encodeURIComponent(`name = '${DRIVE_FILE_NAME}' and trashed = false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      cachedAccessToken = null;
      localStorage.removeItem(GOOGLE_OAUTH_TOKEN_KEY);
      throw new Error('Google Drive session expired or unauthorized. Please click "Connect Google Drive" to re-authorize.');
    }
    const errText = await res.text();
    throw new Error(`Google Drive API Search Error (${res.status}): ${res.statusText} - ${errText}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
};

// Save application data to Google Drive inside 'Smoke Stack' folder
export const saveToGoogleDrive = async (
  accessToken: string,
  appData: {
    profile: SmokerProfile;
    cookLogs: CookLog[];
    fuelLogs: FuelLog[];
    userAccount?: LocalUserProfile;
    userProfile?: LocalUserProfile;
  }
): Promise<{ fileId: string; createdNew: boolean }> => {
  const token = await resolveValidToken(accessToken);
  const existingFileId = await findDriveFile(token);

  const payload: AppDriveData = {
    version: '1.0',
    savedAt: new Date().toISOString(),
    profile: appData.profile,
    cookLogs: appData.cookLogs,
    fuelLogs: appData.fuelLogs,
    userAccount: appData.userAccount || appData.userProfile,
    userProfile: appData.userProfile || appData.userAccount,
  };

  const jsonContent = JSON.stringify(payload, null, 2);

  if (existingFileId) {
    // Update existing file
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: jsonContent,
      }
    );

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        cachedAccessToken = null;
        localStorage.removeItem(GOOGLE_OAUTH_TOKEN_KEY);
        throw new Error('Google Drive session expired or unauthorized. Please click "Connect Google Drive" to re-authorize.');
      }
      throw new Error(`Failed to update file on Google Drive: ${res.statusText}`);
    }

    return { fileId: existingFileId, createdNew: false };
  } else {
    // Create new file inside 'Smoke Stack' folder via multipart upload
    let folderId = '';
    try {
      folderId = await getOrCreateDriveFolder(token);
    } catch (e: any) {
      if (e?.message?.includes('expired') || e?.message?.includes('unauthorized') || e?.message?.includes('authorization required')) {
        throw e;
      }
      console.warn('Folder creation warning:', e);
    }

    const metadata: Record<string, any> = {
      name: DRIVE_FILE_NAME,
      mimeType: 'application/json',
      description: 'Pitmaster Log & Smoker Consumption Data Backup',
    };
    if (folderId) {
      metadata.parents = [folderId];
    }

    const boundary = 'foo_bar_baz';
    const body =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\n` +
      'Content-Type: application/json\r\n\r\n' +
      jsonContent +
      `\r\n--${boundary}--`;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        cachedAccessToken = null;
        localStorage.removeItem(GOOGLE_OAUTH_TOKEN_KEY);
        throw new Error('Google Drive session expired or unauthorized. Please click "Connect Google Drive" to re-authorize.');
      }
      throw new Error(`Failed to create file on Google Drive: ${res.statusText}`);
    }

    const createdData = await res.json();
    return { fileId: createdData.id, createdNew: true };
  }
};

// Load application data from Google Drive
export const loadFromGoogleDrive = async (accessToken: string): Promise<AppDriveData | null> => {
  const token = await resolveValidToken(accessToken);
  const fileId = await findDriveFile(token);
  if (!fileId) return null;

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      cachedAccessToken = null;
      localStorage.removeItem(GOOGLE_OAUTH_TOKEN_KEY);
      throw new Error('Google Drive session expired or unauthorized. Please click "Connect Google Drive" to re-authorize.');
    }
    throw new Error(`Failed to download backup from Google Drive: ${res.statusText}`);
  }

  const data: AppDriveData = await res.json();
  return data;
};
