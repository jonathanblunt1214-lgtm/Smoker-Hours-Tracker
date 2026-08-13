import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { LogIn, ShieldCheck, X } from 'lucide-react';
import { auth, googleSignIn } from '../lib/driveSync';
import { UserAuthSession, saveActiveUserSession } from '../utils/userAuthSession';

interface UserLoginGateModalProps {
  isOpen: boolean;
  onLoginSuccess: (session: UserAuthSession) => void;
  currentUser?: User | null;
  onGoogleSignInSuccess?: (user: User, token: string) => void;
  onClose?: () => void;
}

function sessionFromFirebaseUser(user: User): UserAuthSession {
  const email = user.email || '';
  return {
    id: user.uid,
    email,
    name: user.displayName || email.split('@')[0] || 'Pitmaster',
    title: 'Pitmaster',
    provider: 'google',
    rememberMe: true,
    // Admin authority is resolved separately from verified server-side claims.
    isMasterAdmin: false,
    loggedInAt: new Date().toISOString(),
  };
}

export const UserLoginGateModal: React.FC<UserLoginGateModalProps> = ({
  isOpen,
  onLoginSuccess,
  currentUser,
  onGoogleSignInSuccess,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const existingUser = auth.currentUser || currentUser;
    if (!existingUser) return;

    const session = sessionFromFirebaseUser(existingUser);
    saveActiveUserSession(session, true);
    onLoginSuccess(session);
  }, [isOpen, currentUser, onLoginSuccess]);

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await googleSignIn();
      if (!result?.user) throw new Error('Firebase sign-in did not return a verified user.');

      onGoogleSignInSuccess?.(result.user, result.accessToken);
      const session = sessionFromFirebaseUser(result.user);
      saveActiveUserSession(session, true);
      onLoginSuccess(session);
    } catch (err: any) {
      console.error('Firebase Google sign-in error:', err);
      setErrorMsg(err?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white"
            aria-label="Close sign in"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-xl bg-orange-500/15 p-3 text-orange-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Sign in to SmokeStack</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Sign in with your verified Google/Firebase account to load and synchronize your SmokeStack data.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {errorMsg}
          </div>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleAuth}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogIn className="h-4 w-4" />
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>

        <p className="mt-5 text-xs leading-5 text-zinc-500">
          Local-only email, Amazon placeholder, and device-based admin logins are disabled. Administrator access is granted only by verified server-side account roles.
        </p>
      </div>
    </div>
  );
};
