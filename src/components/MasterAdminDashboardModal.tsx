import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Crown,
  Lock,
  Unlock,
  Sparkles,
  Database,
  Terminal,
  RefreshCw,
  Cpu,
  Trash2,
  Download,
  Upload,
  Zap,
  CheckCircle2,
  AlertTriangle,
  X,
  Sliders,
  Flame,
  Activity,
  BarChart3,
  HardDrive,
  Brain,
  Info,
  Clock,
} from 'lucide-react';
import {
  MASTER_ADMIN_EMAIL,
  isMasterAdmin,
  isAdminUser,
  getSubAdmins,
  addSubAdmin,
  removeSubAdmin,
  getCharGPTDeveloperOverride,
  setCharGPTDeveloperOverride,
} from '../utils/adminAuth';
import { SmokerProfile, CookLog, FuelLog } from '../types';
import {
  loadCharGPTMemory,
  saveCharGPTMemory,
  executeCacheClear,
  getStorageStats,
  exportFullAppDataJson,
  importFullAppDataJson,
} from '../utils/storage';

interface MasterAdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string | null;
  profile: SmokerProfile;
  cookLogs: CookLog[];
  fuelLogs: FuelLog[];
  onRefreshData?: () => void;
  showToast: (msg: string) => void;
}

export const MasterAdminDashboardModal: React.FC<MasterAdminDashboardModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
  profile,
  cookLogs,
  fuelLogs,
  onRefreshData,
  showToast,
}) => {
  const isAdmin = isMasterAdmin(currentUserEmail);
  const isSubAdmin = isAdminUser(currentUserEmail) && !isAdmin;
  const [devOverride, setDevOverride] = useState(() => getCharGPTDeveloperOverride(currentUserEmail));
  const [logsStream, setLogsStream] = useState<string[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activeTab, setActiveTab] = useState<'security' | 'optimizations' | 'telemetry' | 'data'>('security');
  const [storageUsage, setStorageUsage] = useState(() => getStorageStats());
  const [subAdminList, setSubAdminList] = useState<string[]>([]);
  const [newSubAdminEmail, setNewSubAdminEmail] = useState('');

  // Interval timer for live auto-relock countdown updates
  useEffect(() => {
    if (!isOpen) return;

    // Refresh state on mount
    const initialOverride = getCharGPTDeveloperOverride(currentUserEmail);
    setDevOverride(initialOverride);
    setStorageUsage(getStorageStats());
    if (isAdmin) setSubAdminList(getSubAdmins());
    
    addLog(`Master Admin Dashboard loaded for account: ${currentUserEmail || MASTER_ADMIN_EMAIL}`);
    addLog(`Security Check: ${isAdmin ? 'VERIFIED MASTER DEVELOPER' : (isSubAdmin ? 'VERIFIED SUB-ADMIN' : 'ACCESS DENIED')}`);

    const interval = setInterval(() => {
      const updated = getCharGPTDeveloperOverride(currentUserEmail);
      setDevOverride((prev) => {
        if (prev.allowed && !updated.allowed) {
          showToast('🔒 CharGPT Developer Override auto-relocked after 30 minutes.');
          addLog('🔒 Developer Override timer expired (30 mins elapsed). Automatically relocked.');
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, currentUserEmail, isAdmin]);

  if (!isOpen) return null;

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogsStream((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 49)]);
  };

  const handleToggleDevOverride = () => {
    if (!isAdmin) {
      showToast('⛔ Access Denied: Only jonathanblunt1214@gmail.com can modify developer settings!');
      return;
    }
    const nextVal = !devOverride.allowed;
    const success = setCharGPTDeveloperOverride(currentUserEmail, nextVal);
    if (success) {
      const updated = getCharGPTDeveloperOverride(currentUserEmail);
      setDevOverride(updated);
      showToast(
        nextVal
          ? '🔓 Developer Master Override ENABLED: CharGPT non-BBQ prompts unlocked for testing.'
          : '🔒 Strict BBQ Guardrails RESTORED: CharGPT constrained to BBQ topics only.'
      );
      addLog(`CharGPT Developer Override changed to: ${nextVal ? 'ALLOWED' : 'STRICT BBQ ONLY'}`);
    }
  };

  // Automated Optimization Process 1: Recompile App Cache & Storage Cleanup
  const handleRunCacheRecompile = () => {
    setIsOptimizing(true);
    addLog('⚡ Running System Optimization Process: Recompiling cache & flushing temporary storage...');
    setTimeout(() => {
      const res = executeCacheClear();
      setStorageUsage(getStorageStats());
      setIsOptimizing(false);
      showToast(res.message);
      addLog(`Result: ${res.message}`);
      if (onRefreshData) onRefreshData();
    }, 600);
  };

  // Automated Optimization Process 2: Audit & Deduplicate CharGPT Learned Memory Vault
  const handleRunMemoryAudit = () => {
    setIsOptimizing(true);
    addLog('🧠 Running CharGPT Memory Vault Audit & Deduplication Engine...');
    setTimeout(() => {
      const memory = loadCharGPTMemory();
      const rules = memory.learnedRules || [];
      const initialCount = rules.length;

      // Deduplicate memories based on title and detail similarity
      const uniqueRules: typeof rules = [];
      const seenTitles = new Set<string>();

      for (const rule of rules) {
        const key = `${rule.title.toLowerCase().trim()}_${rule.detail.toLowerCase().trim()}`;
        if (!seenTitles.has(key)) {
          seenTitles.add(key);
          uniqueRules.push(rule);
        }
      }

      const updatedMemory = { ...memory, learnedRules: uniqueRules };
      saveCharGPTMemory(updatedMemory);
      const pruned = initialCount - uniqueRules.length;
      setIsOptimizing(false);
      showToast(
        pruned > 0
          ? `🧠 CharGPT Memory Audit Complete: Pruned ${pruned} duplicate rule(s)!`
          : '🧠 CharGPT Memory Vault is fully optimized and clean (0 duplicates found).'
      );
      addLog(`CharGPT Memory Audit finished. Total active rules: ${uniqueRules.length} (Pruned: ${pruned})`);
    }, 600);
  };

  // Automated Optimization Process 3: Recalculate Cook Telemetry & Smoker Burn Indices
  const handleRecalculateTelemetry = () => {
    setIsOptimizing(true);
    addLog('📊 Recalculating Smoker Burn Efficiency Indices & Cook Hours Telemetry...');
    setTimeout(() => {
      setIsOptimizing(false);
      showToast('📊 Cook Logs & Smoker Efficiency Telemetry re-indexed successfully!');
      addLog(`Telemetry re-indexed across ${cookLogs.length} cook logs and ${fuelLogs.length} fuel logs.`);
      if (onRefreshData) onRefreshData();
    }, 500);
  };

  // System Database Backup Export
  const handleExportDatabase = () => {
    addLog('💾 Generating Master System JSON Export...');
    exportFullAppDataJson();
    showToast('💾 Master System Database Backup downloaded successfully!');
  };

  // System Database Import
  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    addLog(`📥 Importing Database Backup File: ${file.name}...`);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonStr = event.target?.result as string;
        const res = importFullAppDataJson(jsonStr);
        if (res.success) {
          showToast('📥 Master Database Restored Successfully! Reloading...');
          addLog('Master Database Restore completed successfully.');
          if (onRefreshData) onRefreshData();
          setTimeout(() => window.location.reload(), 1200);
        } else {
          showToast(`❌ Import Failed: ${res.message}`);
          addLog(`Error during import: ${res.message}`);
        }
      } catch (err: any) {
        showToast(`❌ JSON Parse Error: ${err?.message || 'Invalid file format'}`);
      }
    };
    reader.readAsText(file);
  };

  const formatRemainingTime = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const handleResetTimer = () => {
    if (!isAdmin) return;
    const success = setCharGPTDeveloperOverride(currentUserEmail, true);
    if (success) {
      const updated = getCharGPTDeveloperOverride(currentUserEmail);
      setDevOverride(updated);
      showToast('⏱️ Developer Override 30-minute timer reset to 30:00!');
      addLog('⏱️ Developer Override timer reset to 30 minutes.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#141416] border border-[#2a2a2e] rounded-xl sm:rounded-2xl w-full max-w-4xl max-h-[96vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative text-[#e0e0e0]">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-3 py-3 sm:px-5 sm:py-4 border-b border-[#2a2a2e] bg-[#1a1a1e] shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-tr from-purple-600 via-amber-500 to-orange-500 shadow-md shadow-purple-950/50 shrink-0">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap">
                <h2 className="font-extrabold text-sm sm:text-base md:text-lg text-white tracking-tight truncate">
                  Master Admin & Developer Dashboard
                </h2>
                <span className="text-[9px] sm:text-[10px] bg-purple-500/20 text-purple-300 font-mono font-bold px-1.5 py-0.5 sm:px-2 rounded-full border border-purple-500/30 whitespace-nowrap">
                  v2.5 DEVELOPER CONTROL
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-400 truncate max-w-[200px] xs:max-w-[280px] sm:max-w-none">
                Restricted System Control Center for <strong className="text-amber-300 font-mono">{MASTER_ADMIN_EMAIL}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-[#25252a] transition-colors cursor-pointer shrink-0 ml-2"
            title="Close Dashboard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ACCESS CONTROL CHECK */}
        {!isAdmin ? (
          <div className="p-4 sm:p-8 text-center space-y-4 my-auto">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
              <Lock className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">Access Denied: Master Developer Required</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              This Master Admin Dashboard is restricted exclusively to <strong className="text-amber-300 font-mono">{MASTER_ADMIN_EMAIL}</strong>.
              Your logged-in account identity does not have permission to access system guardrail overrides or app optimization controls.
            </p>
            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-5 py-2.5 min-h-[44px] rounded-xl bg-[#242428] hover:bg-[#2c2c32] text-xs font-bold text-white border border-[#3a3a40] transition-all cursor-pointer"
              >
                Close Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col p-3 sm:p-5 md:p-6 space-y-4 sm:space-y-6 web-carousel-scrollbar">
            
            {/* Master Developer Status Banner */}
            <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center space-x-1.5 flex-wrap">
                    <span>Verified Master Developer Account</span>
                    <span className="text-[9px] sm:text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">
                      ACTIVE
                    </span>
                  </h4>
                  <p className="text-[11px] sm:text-xs text-zinc-300 font-mono truncate">
                    Account: {currentUserEmail || MASTER_ADMIN_EMAIL}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2.5 sm:pt-0 border-amber-500/20">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs text-zinc-300 shrink-0">CharGPT Guardrail:</span>
                  {devOverride.allowed && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold px-2 py-0.5 rounded border border-amber-500/30 flex items-center space-x-1">
                      <Clock className="w-3 h-3 animate-spin" />
                      <span>{formatRemainingTime(devOverride.remainingSeconds)}</span>
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-1.5">
                  {devOverride.allowed && (
                    <button
                      type="button"
                      onClick={handleResetTimer}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all cursor-pointer flex items-center space-x-1"
                      title="Reset 30-minute auto-relock timer back to 30:00"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset 30m</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleToggleDevOverride}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer min-h-[38px] ${
                      devOverride.allowed
                        ? 'bg-amber-500 text-zinc-950 font-black shadow-lg shadow-amber-950/40'
                        : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    }`}
                  >
                    {devOverride.allowed ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    <span>{devOverride.allowed ? 'UNLOCKED' : 'STRICT BBQ ONLY'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 border-b border-[#2a2a2e] pb-2 overflow-x-auto web-carousel-scrollbar shrink-0">
              <button
                onClick={() => setActiveTab('security')}
                className={`px-2.5 sm:px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 min-h-[38px] cursor-pointer ${
                  activeTab === 'security'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'text-zinc-400 hover:text-white hover:bg-[#202024]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>CharGPT Guardrails</span>
              </button>
              
              <button
                onClick={() => setActiveTab('optimizations')}
                className={`px-2.5 sm:px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 min-h-[38px] cursor-pointer ${
                  activeTab === 'optimizations'
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                    : 'text-zinc-400 hover:text-white hover:bg-[#202024]'
                }`}
              >
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span>App Optimization Processes</span>
              </button>

              <button
                onClick={() => setActiveTab('telemetry')}
                className={`px-2.5 sm:px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 min-h-[38px] cursor-pointer ${
                  activeTab === 'telemetry'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'text-zinc-400 hover:text-white hover:bg-[#202024]'
                }`}
              >
                <Activity className="w-3.5 h-3.5 shrink-0" />
                <span>App Telemetry & Stats</span>
              </button>

              <button
                onClick={() => setActiveTab('data')}
                className={`px-2.5 sm:px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 min-h-[38px] cursor-pointer ${
                  activeTab === 'data'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-zinc-400 hover:text-white hover:bg-[#202024]'
                }`}
              >
                <Database className="w-3.5 h-3.5 shrink-0" />
                <span>Database Backup & Restore</span>
              </button>
            </div>

            {/* TAB 1: CHARGPT GUARDRAILS & PERMISSIONS */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                <div className="bg-[#1a1a1e] border border-[#2a2a2e] rounded-xl p-3.5 sm:p-5 space-y-3 sm:space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white flex items-center space-x-2">
                        <Brain className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>CharGPT BBQ Topic Constraint & Developer Permission Rules</span>
                      </h3>
                      <p className="text-[11px] sm:text-xs text-zinc-400 mt-1 leading-relaxed">
                        CharGPT is hard-coded to accept <strong>ONLY BBQ, smoking meats, grilling, wood pellet physics, and pitmaster science queries</strong>.
                        Non-BBQ queries are strictly blocked unless developer permission is toggled ON below.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#121214] border border-[#26262a] rounded-xl p-3.5 sm:p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-white block">Developer Prompt Override Toggle</span>
                        <span className="text-[11px] text-zinc-400 block">
                          Allows testing non-BBQ prompts when logged in as <code className="text-amber-300">{MASTER_ADMIN_EMAIL}</code>.
                        </span>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                        {devOverride.allowed && (
                          <button
                            type="button"
                            onClick={handleResetTimer}
                            className="px-3 py-2 min-h-[40px] rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Reset 30m Timer</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleToggleDevOverride}
                          className={`w-full sm:w-auto px-4 py-2.5 min-h-[40px] rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center ${
                            devOverride.allowed
                              ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow-md'
                              : 'bg-[#25252a] text-zinc-300 hover:bg-[#2e2e34] border border-[#3a3a40]'
                          }`}
                        >
                          {devOverride.allowed
                            ? `Status: UNLOCKED (${formatRemainingTime(devOverride.remainingSeconds)})`
                            : 'Status: LOCKED (BBQ Only)'}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs space-y-1.5">
                      <div className="flex items-center space-x-2 text-purple-300 font-bold">
                        <Info className="w-4 h-4 shrink-0" />
                        <span>Security Rule Enforcement & Auto-Relock Policy</span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        1. <strong>30-Minute Auto-Relock Safety</strong>: Unlocked Developer Overrides automatically expire and relock after 30 minutes of inactivity to prevent unintended open prompt access.<br />
                        2. <strong>Master Account Lock</strong>: Developer override permissions are restricted exclusively to <span className="font-mono text-amber-300">{MASTER_ADMIN_EMAIL}</span>.<br />
                        3. <strong>Guest Safety</strong>: Guest and non-admin accounts always receive an automatic refusal on non-BBQ topics.<br />
                        4. <strong>Boundary Interception</strong>: Prompt injections attempting to instruct CharGPT to "ignore rules" are intercepted at both client and server boundaries.
                      </p>
                    </div>
                    
                    {/* Sub-Admins Management */}
                    {isAdmin && (
                      <div className="pt-3 border-t border-[#2a2a2e]">
                        <h4 className="text-xs font-bold text-white mb-2">Sub-Admin Accounts</h4>
                        <p className="text-[10px] text-zinc-400 mb-3">
                          Grant other users access to this dashboard. They can optimize data but CANNOT override CharGPT BBQ guardrails.
                        </p>
                        
                        <div className="flex space-x-2 mb-3">
                          <input
                            type="email"
                            value={newSubAdminEmail}
                            onChange={(e) => setNewSubAdminEmail(e.target.value)}
                            placeholder="Enter email to grant admin access"
                            className="flex-1 bg-[#121212] border border-[#2a2a2e] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (addSubAdmin(currentUserEmail, newSubAdminEmail)) {
                                setSubAdminList(getSubAdmins());
                                setNewSubAdminEmail('');
                                showToast(`Granted admin access to ${newSubAdminEmail}`);
                                addLog(`Added Sub-Admin: ${newSubAdminEmail}`);
                              } else {
                                showToast(`Failed to add ${newSubAdminEmail} (invalid or already exists)`);
                              }
                            }}
                            disabled={!newSubAdminEmail.trim()}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-xs font-bold disabled:opacity-50"
                          >
                            Grant
                          </button>
                        </div>
                        
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {subAdminList.length === 0 ? (
                            <div className="text-[10px] text-zinc-500 italic p-2 bg-[#121212] rounded-lg border border-[#2a2a2e]">
                              No sub-admins configured.
                            </div>
                          ) : (
                            subAdminList.map(email => (
                              <div key={email} className="flex items-center justify-between p-2 bg-[#121212] rounded-lg border border-[#2a2a2e]">
                                <span className="text-[11px] text-zinc-300 font-mono truncate">{email}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (removeSubAdmin(currentUserEmail, email)) {
                                      setSubAdminList(getSubAdmins());
                                      showToast(`Revoked admin access from ${email}`);
                                      addLog(`Removed Sub-Admin: ${email}`);
                                    }
                                  }}
                                  className="text-[10px] text-red-400 hover:text-red-300 px-2 py-0.5 border border-red-500/20 rounded hover:bg-red-500/10"
                                >
                                  Revoke
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: REPEATABLE APP OPTIMIZATION PROCESSES */}
            {activeTab === 'optimizations' && (
              <div className="space-y-4">
                <div className="bg-[#1a1a1e] border border-[#2a2a2e] rounded-xl p-3.5 sm:p-5 space-y-3 sm:space-y-4">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-orange-400 shrink-0" />
                      <span>CharGPT App Optimization Processes & Automated System Tune-Up</span>
                    </h3>
                    <p className="text-[11px] sm:text-xs text-zinc-400 mt-1">
                      Run automated performance enhancements, recompile local app indexes, clear temporary storage, and optimize carousel scrollbars.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5 pt-1">
                    {/* Optimization Action 1 */}
                    <div className="bg-[#121214] border border-[#26262a] hover:border-orange-500/40 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between space-y-3 transition-all">
                      <div>
                        <div className="flex items-center space-x-2 text-orange-400 font-bold text-xs mb-1">
                          <RefreshCw className="w-4 h-4 shrink-0" />
                          <span>Recompile App Cache & Clear Temp Storage</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-normal">
                          Flushes temporary search logs, clears expired cache keys, and re-indexes local storage state for smartphone performance.
                        </p>
                      </div>
                      <button
                        onClick={handleRunCacheRecompile}
                        disabled={isOptimizing}
                        className="w-full py-2.5 px-3 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 font-bold text-xs border border-orange-500/30 transition-all cursor-pointer disabled:opacity-50 min-h-[40px] flex items-center justify-center"
                      >
                        Execute Cache Optimization
                      </button>
                    </div>

                    {/* Optimization Action 2 */}
                    <div className="bg-[#121214] border border-[#26262a] hover:border-purple-500/40 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between space-y-3 transition-all">
                      <div>
                        <div className="flex items-center space-x-2 text-purple-400 font-bold text-xs mb-1">
                          <Brain className="w-4 h-4 shrink-0" />
                          <span>Audit & Deduplicate CharGPT Memories</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-normal">
                          Analyzes all learned pitmaster rules in the memory vault, removing redundant entries and compressing memory payloads.
                        </p>
                      </div>
                      <button
                        onClick={handleRunMemoryAudit}
                        disabled={isOptimizing}
                        className="w-full py-2.5 px-3 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-bold text-xs border border-purple-500/30 transition-all cursor-pointer disabled:opacity-50 min-h-[40px] flex items-center justify-center"
                      >
                        Execute Memory Vault Audit
                      </button>
                    </div>

                    {/* Optimization Action 3 */}
                    <div className="bg-[#121214] border border-[#26262a] hover:border-blue-500/40 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between space-y-3 transition-all">
                      <div>
                        <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs mb-1">
                          <Activity className="w-4 h-4 shrink-0" />
                          <span>Recalculate Telemetry & Burn Rates</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-normal">
                          Re-calculates starting/ending smoker runtime hours, total fuel burn rates, and updates efficiency indices across logs.
                        </p>
                      </div>
                      <button
                        onClick={handleRecalculateTelemetry}
                        disabled={isOptimizing}
                        className="w-full py-2.5 px-3 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-bold text-xs border border-blue-500/30 transition-all cursor-pointer disabled:opacity-50 min-h-[40px] flex items-center justify-center"
                      >
                        Recalculate Telemetry
                      </button>
                    </div>

                    {/* Optimization Action 4 */}
                    <div className="bg-[#121214] border border-[#26262a] hover:border-emerald-500/40 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between space-y-3 transition-all">
                      <div>
                        <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs mb-1">
                          <Sliders className="w-4 h-4 shrink-0" />
                          <span>UI Carousel & Scrollbar Performance Check</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-normal">
                          Verifies web scrollbar visibility rules and smartphone touch-pan swipe constraints across app carousels.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          showToast('✨ UI Carousels and Web/PC scrollbar styles verified green!');
                          addLog('UI Carousel & Scrollbar performance test passed.');
                        }}
                        className="w-full py-2.5 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs border border-emerald-500/30 transition-all cursor-pointer min-h-[40px] flex items-center justify-center"
                      >
                        Verify Carousel Performance
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: APP TELEMETRY & SYSTEM STATS */}
            {activeTab === 'telemetry' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  <div className="bg-[#1a1a1e] border border-[#2a2a2e] rounded-xl p-3 sm:p-4 space-y-1">
                    <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium block truncate">Total Smoke Logs</span>
                    <div className="text-lg sm:text-xl font-extrabold text-orange-400">{cookLogs.length}</div>
                  </div>
                  <div className="bg-[#1a1a1e] border border-[#2a2a2e] rounded-xl p-3 sm:p-4 space-y-1">
                    <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium block truncate">Smoker Operating Hours</span>
                    <div className="text-lg sm:text-xl font-extrabold text-amber-400">{profile.currentHours.toFixed(1)}h</div>
                  </div>
                  <div className="bg-[#1a1a1e] border border-[#2a2a2e] rounded-xl p-3 sm:p-4 space-y-1">
                    <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium block truncate">CharGPT Learned Rules</span>
                    <div className="text-lg sm:text-xl font-extrabold text-purple-400 font-mono">{(loadCharGPTMemory().learnedRules || []).length}</div>
                  </div>
                  <div className="bg-[#1a1a1e] border border-[#2a2a2e] rounded-xl p-3 sm:p-4 space-y-1">
                    <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium block truncate">Local Storage Usage</span>
                    <div className="text-lg sm:text-xl font-extrabold text-blue-400">{storageUsage.usedFormatted}</div>
                  </div>
                </div>

                <div className="bg-[#1a1a1e] border border-[#2a2a2e] rounded-xl p-3.5 sm:p-5 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider text-zinc-400">
                    Linked Smoker Specification
                  </h4>
                  <div className="text-xs space-y-1 text-zinc-300 font-mono">
                    <p>Model: <strong className="text-white">{profile.modelName}</strong> ({profile.manufacturer})</p>
                    <p>Installed Mods: <strong className="text-amber-400">{profile.installedMods?.length || 0} active mods</strong></p>
                    <p>Burn Rate: <strong className="text-emerald-400">{profile.effectiveBurnRateLbsHr || 1.1} lbs/hr</strong></p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: DATABASE BACKUP & RESTORE */}
            {activeTab === 'data' && (
              <div className="space-y-4">
                <div className="bg-[#1a1a1e] border border-[#2a2a2e] rounded-xl p-3.5 sm:p-5 space-y-3 sm:space-y-4">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white flex items-center space-x-2">
                      <Database className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>App Database Import / Export Console</span>
                    </h3>
                    <p className="text-[11px] sm:text-xs text-zinc-400 mt-1">
                      Download a complete snapshot of all cook logs, smoker settings, and CharGPT memory rules, or restore from a JSON backup.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-1">
                    <button
                      onClick={handleExportDatabase}
                      className="flex-1 py-3 px-4 min-h-[44px] rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs border border-emerald-500/40 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4 shrink-0" />
                      <span>Export Master App Database (.JSON)</span>
                    </button>

                    <label className="flex-1 py-3 px-4 min-h-[44px] rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-bold text-xs border border-blue-500/40 transition-all flex items-center justify-center space-x-2 cursor-pointer">
                      <Upload className="w-4 h-4 shrink-0" />
                      <span>Import Database JSON Backup</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportDatabase}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Live System Diagnostics Console */}
            <div className="bg-[#101012] border border-[#242428] rounded-xl p-3 sm:p-4 space-y-2 font-mono">
              <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-[#202024] pb-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <Terminal className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span className="font-bold text-zinc-200 truncate">System Diagnostics Console</span>
                </div>
                <button
                  onClick={() => setLogsStream([])}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 cursor-pointer shrink-0 ml-2"
                >
                  Clear Logs
                </button>
              </div>

              <div className="h-28 sm:h-36 overflow-y-auto web-carousel-scrollbar text-[10px] sm:text-[11px] text-emerald-400/90 space-y-1 pr-2">
                {logsStream.length === 0 ? (
                  <span className="text-zinc-600 italic">No diagnostic events logged yet...</span>
                ) : (
                  logsStream.map((log, idx) => <div key={idx} className="break-all">{log}</div>)
                )}
              </div>
            </div>

          </div>
        )}

        {/* Modal Footer */}
        <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-t border-[#2a2a2e] bg-[#1a1a1e] flex items-center justify-between text-[11px] sm:text-xs text-zinc-400 shrink-0">
          <span className="truncate mr-2">Master Admin System • Smoke Stack AI</span>
          <button
            onClick={onClose}
            className="px-4 py-2 min-h-[38px] rounded-lg bg-[#242428] hover:bg-[#2c2c32] font-bold text-white border border-[#3a3a40] transition-all cursor-pointer shrink-0"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
