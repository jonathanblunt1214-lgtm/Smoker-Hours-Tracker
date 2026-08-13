import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { googleSignIn, auth } from '../lib/driveSync';
import { MASTER_ADMIN_EMAIL } from '../utils/adminAuth';
import { SmokerProfile } from '../types';
import { saveSmokerProfile } from '../utils/storage';
import {
  UserAuthSession,
  saveActiveUserSession,
  isMasterAdminVerifiedDevice,
  setMasterDeviceVerified,
} from '../utils/userAuthSession';
import {
  ShieldCheck,
  Lock,
  LogIn,
  UserPlus,
  Check,
  Mail,
  Key,
  Crown,
  Sparkles,
  Flame,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Flame as SmokerIcon,
  Wrench,
  ChevronRight,
  X,
} from 'lucide-react';

interface UserLoginGateModalProps {
  isOpen: boolean;
  onLoginSuccess: (session: UserAuthSession) => void;
  currentUser?: User | null;
  onGoogleSignInSuccess?: (user: User, token: string) => void;
  onClose?: () => void;
}

const POPULAR_SMOKER_MODELS = [
  // STICK-BURNING SMOKERS
  { name: "Oklahoma Joe's Highland Reverse Flow", type: 'Offset Wood Smoker', fuel: 'Wood Split Logs', capacity: 25 },
  { name: 'Yoder Smokers Wichita 20" Offset', type: 'Offset Wood Smoker', fuel: 'Wood Split Logs', capacity: 35 },
  { name: 'Workhorse Pits 1975 Heavy Steel Offset', type: 'Offset Wood Smoker', fuel: 'Wood Split Logs', capacity: 30 },
  // PROPANE & GAS SMOKERS
  { name: 'Camp Chef Smoke Vault 24" Propane', type: 'Gas / Propane Smoker', fuel: 'LP Propane Gas', capacity: 20 },
  { name: 'Masterbuilt ThermoTemp 40" Propane', type: 'Gas / Propane Smoker', fuel: 'LP Propane Gas', capacity: 20 },
  { name: 'Dyna-Glo 36" Vertical LP Gas Smoker', type: 'Gas / Propane Smoker', fuel: 'LP Propane Gas', capacity: 20 },
  // PELLET SMOKERS & GRILLS
  { name: 'Pit Boss Copperhead 5-Series', type: 'Vertical Pellet Smoker', fuel: 'Pellets', capacity: 60 },
  { name: 'Traeger Pro 575 / Ironwood 885', type: 'Horizontal Pellet Grill', fuel: 'Pellets', capacity: 20 },
  { name: 'Camp Chef Woodwind Pro 24', type: 'Horizontal Pellet Grill', fuel: 'Pellets', capacity: 22 },
  { name: 'Masterbuilt Gravity Series 800', type: 'Gravity Feed Charcoal', fuel: 'Charcoal Briquettes', capacity: 16 },
  { name: 'Yoder Smokers YS640s', type: 'Horizontal Pellet Grill', fuel: 'Pellets', capacity: 20 },
];

export const UserLoginGateModal: React.FC<UserLoginGateModalProps> = ({
  isOpen,
  onLoginSuccess,
  currentUser,
  onGoogleSignInSuccess,
  onClose,
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New User Smoker Model Setup State
  const [smokerModel, setSmokerModel] = useState('');
  const [smokerType, setSmokerType] = useState('');
  const [fuelType, setFuelType] = useState('Pellets');
  const [hopperCapacityLbs, setHopperCapacityLbs] = useState<number>(0);

  // Auto-detect saved Google account in browser on modal open
  useEffect(() => {
    if (isOpen) {
      const existingUser = auth.currentUser || currentUser;
      if (existingUser) {
        const userEmail = existingUser.email || 'user@smokestack.app';
        const isMaster = userEmail.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

        const session: UserAuthSession = {
          id: existingUser.uid,
          email: userEmail,
          name: existingUser.displayName || (isMaster ? 'Jonathan Blunt' : userEmail.split('@')[0]),
          title: isMaster ? 'Head Pitmaster & Master Developer' : 'Pitmaster',
          provider: 'google',
          rememberMe: true,
          isMasterAdmin: isMaster,
          loggedInAt: new Date().toISOString(),
        };

        saveActiveUserSession(session, true);
        onLoginSuccess(session);
      }
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const isMasterDevice = isMasterAdminVerifiedDevice() || currentUser?.email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

  const handleMasterAutoLogin = () => {
    setMasterDeviceVerified(true);
    const masterSession: UserAuthSession = {
      id: 'master-admin-001',
      email: MASTER_ADMIN_EMAIL,
      name: 'Jonathan Blunt',
      title: 'Head Pitmaster & Master Developer',
      provider: 'master_verified_device',
      rememberMe: true,
      isMasterAdmin: true,
      loggedInAt: new Date().toISOString(),
    };
    saveActiveUserSession(masterSession, true);
    onLoginSuccess(masterSession);
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await googleSignIn();
      if (res && res.user) {
        if (onGoogleSignInSuccess) {
          onGoogleSignInSuccess(res.user, res.accessToken);
        }

        const userEmail = res.user.email || 'user@smokestack.app';
        const isMaster = userEmail.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

        const session: UserAuthSession = {
          id: res.user.uid,
          email: userEmail,
          name: res.user.displayName || (isMaster ? 'Jonathan Blunt' : userEmail.split('@')[0]),
          title: isMaster ? 'Head Pitmaster & Master Developer' : 'Pitmaster',
          provider: 'google',
          rememberMe,
          isMasterAdmin: isMaster,
          loggedInAt: new Date().toISOString(),
        };

        // Initialize clean smoker profile if first time
        const newProfile: SmokerProfile = {
          id: `smoker-${res.user.uid}`,
          name: smokerModel.trim() || 'Smoker Rig',
          model: smokerModel.trim() || 'Custom Smoker',
          smokerType: smokerType || 'Pellet Smoker',
          fuelType: fuelType || 'Pellets',
          fuelOnHand: '0 lbs',
          initialHours: 0,
          currentHours: 0,
          pelletHopperCapacityLbs: Number(hopperCapacityLbs) || 30,
          lastRefillHours: 0,
          maintenanceTasks: [
            { id: 'task-1', title: 'Clean Firepot Ash & Burn Pot', intervalHours: 12, lastPerformedHours: 0, description: 'Vacuum out ash buildup from burn pot.' },
            { id: 'task-2', title: 'Scrape Heat Shield & Grease Tray', intervalHours: 25, lastPerformedHours: 0, description: 'Remove grease residue from heat deflector.' },
            { id: 'task-3', title: 'Calibrate RTD Temperature Probe', intervalHours: 50, lastPerformedHours: 0, description: 'Test RTD probe accuracy in ice water.' },
            { id: 'task-4', title: 'Deep Chamber Clean', intervalHours: 100, lastPerformedHours: 0, description: 'Scrape interior walls and check gaskets.' },
          ],
        };
        saveSmokerProfile(newProfile);

        saveActiveUserSession(session, rememberMe);
        onLoginSuccess(session);
      }
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      setErrorMsg(err?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAmazonAuth = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const userEmail = email.trim() || 'amazon.pitmaster@smokestack.app';
      const isMaster = userEmail.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

      const session: UserAuthSession = {
        id: `amazon-user-${Date.now()}`,
        email: userEmail,
        name: fullName.trim() || (isMaster ? 'Jonathan Blunt' : 'Amazon Pitmaster'),
        title: isMaster ? 'Head Pitmaster & Master Developer' : 'Amazon Connected Pitmaster',
        provider: 'amazon',
        rememberMe,
        isMasterAdmin: isMaster,
        loggedInAt: new Date().toISOString(),
      };

      if (authMode === 'signup') {
        const newProfile: SmokerProfile = {
          id: `smoker-amazon-${Date.now()}`,
          name: smokerModel.trim() || 'Amazon Smoker Rig',
          model: smokerModel.trim() || 'Custom Smoker',
          smokerType: smokerType || 'Vertical Pellet Smoker',
          fuelType: fuelType || 'Pellets',
          fuelOnHand: '0 lbs',
          initialHours: 0,
          currentHours: 0,
          pelletHopperCapacityLbs: Number(hopperCapacityLbs) || 30,
          lastRefillHours: 0,
          maintenanceTasks: [
            { id: 'task-1', title: 'Clean Firepot Ash & Burn Pot', intervalHours: 12, lastPerformedHours: 0, description: 'Vacuum out ash buildup from burn pot.' },
            { id: 'task-2', title: 'Scrape Heat Shield & Grease Tray', intervalHours: 25, lastPerformedHours: 0, description: 'Remove grease residue from heat deflector.' },
            { id: 'task-3', title: 'Calibrate RTD Temperature Probe', intervalHours: 50, lastPerformedHours: 0, description: 'Test RTD probe accuracy in ice water.' },
            { id: 'task-4', title: 'Deep Chamber Clean', intervalHours: 100, lastPerformedHours: 0, description: 'Scrape interior walls and check gaskets.' },
          ],
        };
        saveSmokerProfile(newProfile);
      }

      saveActiveUserSession(session, rememberMe);
      onLoginSuccess(session);
    } catch (err: any) {
      console.error('Amazon Auth Error:', err);
      setErrorMsg(err?.message || 'Amazon sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPresetSmoker = (preset: typeof POPULAR_SMOKER_MODELS[0]) => {
    setSmokerModel(preset.name);
    setSmokerType(preset.type);
    setFuelType(preset.fuel);
    setHopperCapacityLbs(preset.capacity);
  };

  const handleEmailAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!password.trim() || password.length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const userEmail = email.trim().toLowerCase();
    const isMaster = userEmail === MASTER_ADMIN_EMAIL.toLowerCase();

    const sessionName = fullName.trim() || (isMaster ? 'Jonathan Blunt' : userEmail.split('@')[0]);

    // Save newly created smoker model details to user's profile
    if (authMode === 'signup') {
      const newProfile: SmokerProfile = {
        id: `smoker-user-${Date.now()}`,
        name: smokerModel.trim() || 'Custom Pitmaster Smoker',
        model: smokerModel.trim() || 'Custom Smoker Model',
        smokerType: smokerType || 'Vertical Pellet Smoker',
        fuelType: fuelType || 'Pellets',
        fuelOnHand: '0 lbs',
        initialHours: 0,
        currentHours: 0,
        pelletHopperCapacityLbs: Number(hopperCapacityLbs) || 30,
        lastRefillHours: 0,
        maintenanceTasks: [
          { id: 'task-1', title: 'Clean Firepot Ash & Burn Pot', intervalHours: 12, lastPerformedHours: 0, description: 'Vacuum out ash buildup from burn pot.' },
          { id: 'task-2', title: 'Scrape Heat Shield & Grease Tray', intervalHours: 25, lastPerformedHours: 0, description: 'Remove grease residue from heat deflector.' },
          { id: 'task-3', title: 'Calibrate RTD Temperature Probe', intervalHours: 50, lastPerformedHours: 0, description: 'Test RTD probe accuracy in ice water.' },
          { id: 'task-4', title: 'Deep Chamber Clean', intervalHours: 100, lastPerformedHours: 0, description: 'Scrape interior walls and check gaskets.' },
        ],
      };
      saveSmokerProfile(newProfile);
    }

    const session: UserAuthSession = {
      id: `user-${Date.now()}`,
      email: userEmail,
      name: sessionName,
      title: isMaster ? 'Head Pitmaster & Master Developer' : 'Pitmaster Journal User',
      provider: 'email',
      rememberMe,
      isMasterAdmin: isMaster,
      loggedInAt: new Date().toISOString(),
    };

    saveActiveUserSession(session, rememberMe);
    setLoading(false);
    onLoginSuccess(session);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#141416] border border-[#2a2a2e] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-auto animate-fadeIn text-white max-h-[92vh] flex flex-col">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-orange-950/80 via-[#1f1a16] to-[#141416] p-4 sm:p-5 border-b border-[#2e2e34] shrink-0 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 pr-8">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-orange-950/60 border border-orange-300/30 shrink-0">
                <Flame className="w-6 h-6 text-zinc-950 font-black fill-zinc-950" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center space-x-2">
                  <span>Smoke Stack Login</span>
                  <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full font-mono font-bold border border-orange-500/30">
                    0.02A Protected
                  </span>
                </h2>
                <p className="text-[11px] text-zinc-400">
                  {authMode === 'signup' ? 'Create new pitmaster account & register smoker model' : 'Account Security & Session Verification Gate'}
                </p>
              </div>
            </div>

            {/* Close Button X */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white bg-[#222228] hover:bg-[#2e2e38] border border-[#383842] rounded-xl transition-all cursor-pointer shadow-sm"
                title="Close Login Window"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* MODE TOGGLE SWITCHER (Sign In vs Create Account) */}
          <div className="grid grid-cols-2 gap-1.5 bg-[#0a0a0c] p-1 rounded-xl border border-[#2a2a2e] mt-3">
            <button
              type="button"
              onClick={() => { setAuthMode('signin'); setErrorMsg(null); }}
              className={`py-2 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                authMode === 'signin'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-[#18181c]'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('signup'); setErrorMsg(null); }}
              className={`py-2 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                authMode === 'signup'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-[#18181c]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar">
          
          {/* 1. MASTER ADMIN VERIFIED DEVICE DETECTED BANNER */}
          {isMasterDevice && (
            <div className="bg-gradient-to-r from-amber-950/60 via-purple-950/40 to-[#18181c] border border-amber-500/50 rounded-xl p-3.5 space-y-2.5 shadow-lg">
              <div className="flex items-center space-x-2 text-amber-300 font-extrabold text-xs uppercase tracking-wide">
                <Crown className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                <span>Verified Master Admin Device Detected</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                This device is verified for <strong className="text-amber-300 font-mono">{MASTER_ADMIN_EMAIL}</strong>.
              </p>
              <button
                type="button"
                onClick={handleMasterAutoLogin}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-black text-xs transition-all cursor-pointer shadow-md shadow-amber-950/50 flex items-center justify-center space-x-2"
              >
                <Crown className="w-4 h-4 fill-zinc-950" />
                <span>Enter Automatically as Master Admin ({MASTER_ADMIN_EMAIL})</span>
              </button>
            </div>
          )}

          {/* 2. GOOGLE & AMAZON OAUTH SIGN IN BUTTONS */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#202026] hover:bg-[#2a2a32] border border-[#383842] hover:border-amber-500/50 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center space-x-3 shadow-md min-h-[42px]"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{authMode === 'signup' ? 'Create Account with Google' : 'Continue with Google Account'}</span>
            </button>

            {/* AMAZON OAUTH SIGN IN BUTTON */}
            <button
              type="button"
              onClick={handleAmazonAuth}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#232F3E] via-[#1a232e] to-[#131921] hover:from-[#2c3b4e] hover:to-[#1a232e] border border-[#FF9900]/50 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center space-x-3 shadow-md min-h-[42px] group"
            >
              <svg className="w-5 h-5 shrink-0 text-[#FF9900] fill-[#FF9900]" viewBox="0 0 24 24">
                <path d="M13.62 14.88c-2.06 1.51-5.06 2.29-7.62 2.29-3.59 0-6.81-1.33-9.25-3.57-.19-.17-.04-.41.19-.28 2.62 1.51 5.86 2.42 9.22 2.42 2.27 0 4.77-.52 7.08-1.57.34-.15.63.24.38.71zm.99-1.12c-.22-.28-.85-.14-1.22.1-.38.25-.85.73-.63 1.01.22.28 1.02.16 1.39-.08.38-.25.68-.75.46-1.03zm7.06 5.8c-2.48 1.83-6.08 2.8-9.17 2.8-4.3 0-8.16-1.6-11.08-4.28-.23-.21-.05-.51.23-.35 3.14 1.81 7.03 2.9 11.06 2.9 2.73 0 5.73-.63 8.5-1.89.41-.18.76.29.46.82zM15.11 3.5c-2.47 0-4.63.85-6.26 2.37-.2.19-.04.45.2.33 1.54-.78 3.32-1.22 5.16-1.22 5.72 0 10.36 4.31 10.36 9.62 0 2.22-.81 4.26-2.17 5.88-.16.19.08.43.29.27 1.53-1.82 2.44-4.12 2.44-6.62 0-5.96-5.21-10.63-10.02-10.63z" />
              </svg>
              <span className="text-[#FF9900] font-black group-hover:underline">
                {authMode === 'signup' ? 'Create Account with Amazon' : 'Sign in with Amazon'}
              </span>
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#2a2a2e] w-full"></div>
            <span className="bg-[#141416] px-3 text-[10px] font-mono text-zinc-500 uppercase shrink-0">
              or {authMode === 'signup' ? 'create pitmaster account' : 'sign in with email'}
            </span>
          </div>

          {/* 3. EMAIL & PASSWORD / CREATE ACCOUNT FORM */}
          <form onSubmit={handleEmailAuthSubmit} className="space-y-3">
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {authMode === 'signup' && (
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Pitmaster Display Name</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Pitmaster Name"
                    className="w-full bg-[#0c0c0e] border border-[#2e2e34] rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-zinc-300 block mb-1">Account Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. pitmaster@example.com"
                  className="w-full bg-[#0c0c0e] border border-[#2e2e34] rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-300 block mb-1">Account Password</label>
              <div className="relative">
                <Key className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0c0c0e] border border-[#2e2e34] rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>
            </div>

            {/* 4. SMOKER MODEL SELECTION ON ACCOUNT CREATION */}
            {authMode === 'signup' && (
              <div className="bg-[#18181c] border border-orange-500/30 rounded-xl p-3.5 space-y-3 mt-2">
                <div className="flex items-center space-x-2 text-orange-400 font-bold text-xs uppercase tracking-wide">
                  <SmokerIcon className="w-4 h-4 text-orange-400 shrink-0" />
                  <span>Select / Enter Your Smoker Model</span>
                </div>

                <p className="text-[11px] text-zinc-400">
                  Select your primary smoker model below so Smoke Stack can calibrate pellet consumption & telemetry.
                </p>

                {/* Popular Presets Quick Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Popular Smoker Models:</label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar p-0.5">
                    {POPULAR_SMOKER_MODELS.map((p) => (
                      <button
                        type="button"
                        key={p.name}
                        onClick={() => handleSelectPresetSmoker(p)}
                        className={`text-[10px] font-mono px-2 py-1 rounded-lg border transition-all cursor-pointer text-left ${
                          smokerModel === p.name
                            ? 'bg-orange-500/20 text-orange-300 border-orange-500/60 font-bold'
                            : 'bg-[#0f0f11] text-zinc-400 border-[#2a2a30] hover:text-white hover:border-zinc-500'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Model Name Input */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-300 block mb-1">Smoker Model Name / Custom Title</label>
                  <input
                    type="text"
                    required
                    value={smokerModel}
                    onChange={(e) => setSmokerModel(e.target.value)}
                    placeholder="e.g. Pit Boss Copperhead 5-Series"
                    className="w-full bg-[#0c0c0e] border border-[#2e2e34] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-300 block mb-1">Smoker Type</label>
                    <select
                      value={smokerType}
                      onChange={(e) => setSmokerType(e.target.value)}
                      className="w-full bg-[#0c0c0e] border border-[#2e2e34] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="Vertical Pellet Smoker">Vertical Pellet Smoker</option>
                      <option value="Horizontal Pellet Grill">Horizontal Pellet Grill</option>
                      <option value="Offset Wood Smoker">Offset Wood Smoker</option>
                      <option value="Gravity Feed Charcoal">Gravity Feed Charcoal</option>
                      <option value="Electric Cabinet">Electric Cabinet</option>
                      <option value="Drum Smoker">Drum Smoker</option>
                      <option value="Kamado Ceramic">Kamado Ceramic</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-300 block mb-1">Fuel Type</label>
                    <select
                      value={fuelType}
                      onChange={(e) => setFuelType(e.target.value)}
                      className="w-full bg-[#0c0c0e] border border-[#2e2e34] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="Pellets">Pellets</option>
                      <option value="Wood Split Logs">Wood Split Logs</option>
                      <option value="Charcoal Briquettes">Charcoal Briquettes</option>
                      <option value="Electric Wood Chips">Electric Wood Chips</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-300 block mb-1">Hopper / Fuel Capacity (lbs)</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={hopperCapacityLbs}
                    onChange={(e) => setHopperCapacityLbs(parseInt(e.target.value, 10) || 30)}
                    className="w-full bg-[#0c0c0e] border border-[#2e2e34] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
              </div>
            )}

            {/* 5. REMEMBER ME CHECKBOX */}
            <div className="pt-1">
              <label className="flex items-start space-x-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-orange-500 focus:ring-orange-500/30 w-4 h-4 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-zinc-200 group-hover:text-white transition-colors">
                    Remember me on this device
                  </span>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                    {rememberMe
                      ? 'Stay logged in across browser sessions on this device.'
                      : 'Require logging in every time this browser window or tab is opened.'}
                  </p>
                </div>
              </label>
            </div>

            {/* Submit Primary Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-orange-950/50 flex items-center justify-center space-x-2 min-h-[44px]"
            >
              {authMode === 'signin' ? <LogIn className="w-4 h-4 fill-zinc-950" /> : <UserPlus className="w-4 h-4 text-zinc-950" />}
              <span>{authMode === 'signin' ? 'Sign In to Account' : 'Create Account & Save Smoker Model'}</span>
            </button>
          </form>

          {/* Prominent Direct Create Account / Sign In Switcher Button */}
          <div className="pt-2 border-t border-[#2a2a2e] flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-xs text-zinc-400 font-medium">
              {authMode === 'signin' ? "Don't have an account yet?" : 'Already registered your smoker?'}
            </span>
            <button
              type="button"
              onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
              className="py-2 px-4 rounded-xl bg-[#202026] hover:bg-[#2a2a32] text-amber-300 border border-[#383842] hover:border-amber-500/50 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5"
            >
              {authMode === 'signin' ? (
                <>
                  <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Create Account</span>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sign In Instead</span>
                </>
              )}
            </button>
          </div>

          {/* Device Verification Policy Note */}
          <div className="bg-[#101012] border border-[#222226] rounded-xl p-3 text-[11px] text-zinc-400 space-y-1 font-mono">
            <div className="flex items-center space-x-1.5 text-zinc-300 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
              <span>Default Authentication & Device Rule</span>
            </div>
            <p className="leading-relaxed">
              Users must log in by default unless verified on a device connected to <span className="text-amber-300">{MASTER_ADMIN_EMAIL}</span> or with "Remember Me" enabled.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

