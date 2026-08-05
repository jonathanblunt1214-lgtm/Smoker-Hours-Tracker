import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { SmokerProfile, CookLog, FuelLog } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If user is logged in via persistent session but cached token was cleared, user can re-trigger sign in
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve Google OAuth access token');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export interface AppDriveData {
  version: string;
  savedAt: string;
  profile: SmokerProfile;
  cookLogs: CookLog[];
  fuelLogs: FuelLog[];
}

const DRIVE_FILE_NAME = 'pitmaster_smoker_data.json';

// Find existing drive file ID
export const findDriveFile = async (accessToken: string): Promise<string | null> => {
  const query = encodeURIComponent(`name = '${DRIVE_FILE_NAME}' and trashed = false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Drive API Search Error: ${res.statusText} - ${errText}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
};

// Save application data to Google Drive
export const saveToGoogleDrive = async (
  accessToken: string,
  appData: { profile: SmokerProfile; cookLogs: CookLog[]; fuelLogs: FuelLog[] }
): Promise<{ fileId: string; createdNew: boolean }> => {
  const existingFileId = await findDriveFile(accessToken);

  const payload: AppDriveData = {
    version: '1.0',
    savedAt: new Date().toISOString(),
    profile: appData.profile,
    cookLogs: appData.cookLogs,
    fuelLogs: appData.fuelLogs,
  };

  const jsonContent = JSON.stringify(payload, null, 2);

  if (existingFileId) {
    // Update existing file
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: jsonContent,
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to update file on Google Drive: ${res.statusText}`);
    }

    return { fileId: existingFileId, createdNew: false };
  } else {
    // Create new file via multipart upload
    const metadata = {
      name: DRIVE_FILE_NAME,
      mimeType: 'application/json',
      description: 'Pitmaster Log & Smoker Consumption Data Backup',
    };

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
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    if (!res.ok) {
      throw new Error(`Failed to create file on Google Drive: ${res.statusText}`);
    }

    const createdData = await res.json();
    return { fileId: createdData.id, createdNew: true };
  }
};

// Load application data from Google Drive
export const loadFromGoogleDrive = async (accessToken: string): Promise<AppDriveData | null> => {
  const fileId = await findDriveFile(accessToken);
  if (!fileId) return null;

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to download backup from Google Drive: ${res.statusText}`);
  }

  const data: AppDriveData = await res.json();
  return data;
};
