import React, { useState } from 'react';
import { LocalUserProfile, CharGPTMemory } from '../types';
import { loadCharGPTMemory, saveCharGPTMemory, saveLocalUserProfile, loadCookLogs } from '../utils/storage';
import { AI_PITMASTER_NAME } from '../constants/appName';
import {
  Sparkles,
  Bot,
  Link,
  Unlink,
  CheckCircle2,
  RefreshCw,
  Brain,
  Sliders,
  ShieldCheck,
  Zap,
  Clock,
  UserCheck,
  ChevronRight,
  Flame,
  Award,
} from 'lucide-react';

interface CharGPTProfileLinkCardProps {
  userAccount: LocalUserProfile;
  onUpdateUserAccount: (updated: LocalUserProfile) => void;
  onSyncServer?: () => void;
}

export const CharGPTProfileLinkCard: React.FC<CharGPTProfileLinkCardProps> = ({
  userAccount,
  onUpdateUserAccount,
  onSyncServer,
}) => {
  const [isLinking, setIsLinking] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [memory, setMemory] = useState<CharGPTMemory>(() => loadCharGPTMemory());

  const safeUserAccount: LocalUserProfile = userAccount || {
    name: 'Pitmaster Guest',
    email: '',
    title: 'Pitmaster',
    createdAt: new Date().toISOString().slice(0, 10),
  };

  const isLinked = safeUserAccount.charGPTLinked ?? true; // Default linked for seamless UX
  const profileId = safeUserAccount.charGPTProfileId || `chargpt-${(safeUserAccount.email || 'user').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 8)}-${Date.now().toString().slice(-4)}`;
  const currentPersona = safeUserAccount.charGPTPersona || 'Master Pitmaster';
  const autoSync = safeUserAccount.charGPTAutoSyncMemory ?? true;
  const customInstructions = safeUserAccount.charGPTCustomInstructions || '';

  const handleToggleLink = () => {
    setIsLinking(true);
    const nextLinked = !isLinked;
    const nowStr = new Date().toISOString().slice(0, 10);

    const updated: LocalUserProfile = {
      ...safeUserAccount,
      charGPTLinked: nextLinked,
      charGPTProfileId: nextLinked ? profileId : safeUserAccount.charGPTProfileId,
      charGPTLinkedAt: nextLinked ? (safeUserAccount.charGPTLinkedAt || nowStr) : safeUserAccount.charGPTLinkedAt,
      charGPTAutoSyncMemory: nextLinked ? autoSync : false,
    };

    saveLocalUserProfile(updated);
    onUpdateUserAccount(updated);

    setTimeout(() => {
      setIsLinking(false);
      setFeedbackMsg(
        nextLinked
          ? `✅ Linked ${AI_PITMASTER_NAME} Profile (ID: ${profileId}) to ${safeUserAccount.name || safeUserAccount.email || 'Pitmaster'}!`
          : `⚠️ Unlinked ${AI_PITMASTER_NAME} Profile from account.`
      );
      if (onSyncServer) onSyncServer();
      setTimeout(() => setFeedbackMsg(null), 3500);
    }, 400);
  };

  const handleSelectPersona = (persona: LocalUserProfile['charGPTPersona']) => {
    const updated: LocalUserProfile = {
      ...safeUserAccount,
      charGPTPersona: persona,
    };
    saveLocalUserProfile(updated);
    onUpdateUserAccount(updated);
    setFeedbackMsg(`✨ Active ${AI_PITMASTER_NAME} Persona set to "${persona}"`);
    if (onSyncServer) onSyncServer();
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleAutoDetectPersona = () => {
    setIsLinking(true);
    const logs = loadCookLogs();
    
    let brisketCount = 0;
    let offsetCount = 0;
    let competitionCount = 0;
    let thermalReadingCount = 0;
    let kcRibsCount = 0;

    logs.forEach((log) => {
      const text = `${log.proteinType || ''} ${log.proteinCut || ''} ${log.smokerType || ''} ${log.finishedNotes || ''} ${log.saucesGlazes || ''} ${log.nextTimeNotes || ''}`.toLowerCase();
      if (text.includes('brisket') || text.includes('offset') || text.includes('stick') || text.includes('oak')) {
        if (text.includes('brisket')) brisketCount++;
        if (text.includes('offset') || text.includes('stick')) offsetCount++;
      }
      if ((log.ratings?.overall || 0) >= 4.5 || text.includes('kcbs') || text.includes('competition') || text.includes('tenderness') || text.includes('turn-in')) {
        competitionCount++;
      }
      if ((log.temperatureReadings?.length || 0) >= 5 || text.includes('stall') || text.includes('ambient') || text.includes('thermodynam')) {
        thermalReadingCount += (log.temperatureReadings?.length || 0);
      }
      if (text.includes('rib') || text.includes('pork shoulder') || text.includes('glaze') || text.includes('burnt ends') || text.includes('sauce') || text.includes('hickory')) {
        kcRibsCount++;
      }
    });

    let detected: LocalUserProfile['charGPTPersona'] = 'Master Pitmaster';
    let rationale = '';

    if (brisketCount >= 2 || offsetCount >= 2) {
      detected = 'Texas Offset Specialist';
      rationale = `Detected ${brisketCount} Brisket & ${offsetCount} Offset log entries. Recommended for heavy post-oak low & slow cooks.`;
    } else if (competitionCount >= 2) {
      detected = 'Competition BBQ Judge';
      rationale = `Detected ${competitionCount} high-scoring / KCBS style cooks. Recommended for competition scoring & precision timing.`;
    } else if (thermalReadingCount >= 10) {
      detected = 'Thermal Chemist & Science';
      rationale = `Detected ${thermalReadingCount} thermal probe readings & stall entries. Recommended for thermodynamic analysis.`;
    } else if (kcRibsCount >= 2) {
      detected = 'Kansas City Pit Master';
      rationale = `Detected ${kcRibsCount} rib, glaze & pork shoulder cooks. Recommended for sweet hickory glazes & sauce pairing.`;
    } else {
      detected = 'Master Pitmaster';
      rationale = `Analyzed ${logs.length} cook logs. Set to versatile Master Pitmaster baseline.`;
    }

    const updated: LocalUserProfile = {
      ...safeUserAccount,
      charGPTPersona: detected,
    };

    saveLocalUserProfile(updated);
    onUpdateUserAccount(updated);

    setTimeout(() => {
      setIsLinking(false);
      setFeedbackMsg(`✨ Auto-Detected "${detected}" based on log analysis!\n💡 ${rationale}`);
      if (onSyncServer) onSyncServer();
      setTimeout(() => setFeedbackMsg(null), 5000);
    }, 400);
  };

  const handleToggleAutoSync = () => {
    const nextVal = !autoSync;
    const updated: LocalUserProfile = {
      ...safeUserAccount,
      charGPTAutoSyncMemory: nextVal,
    };
    saveLocalUserProfile(updated);
    onUpdateUserAccount(updated);
    setFeedbackMsg(
      nextVal
        ? `🔄 ${AI_PITMASTER_NAME} Memory Vault auto-sync enabled for account`
        : `⏸️ ${AI_PITMASTER_NAME} Memory Vault auto-sync paused`
    );
    if (onSyncServer) onSyncServer();
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleSaveInstructions = (val: string) => {
    const updated: LocalUserProfile = {
      ...safeUserAccount,
      charGPTCustomInstructions: val,
    };
    saveLocalUserProfile(updated);
    onUpdateUserAccount(updated);
  };

  const handleManualMemorySync = () => {
    setIsLinking(true);
    const freshMemory = loadCharGPTMemory();
    setMemory(freshMemory);
    if (onSyncServer) onSyncServer();

    setTimeout(() => {
      setIsLinking(false);
      setFeedbackMsg(`🧠 Synchronized ${freshMemory.learnedRules?.length || 0} learned thermal rules with account!`);
      setTimeout(() => setFeedbackMsg(null), 3500);
    }, 500);
  };

  return (
    <div className="bg-[#181822] border border-orange-500/30 rounded-xl p-3.5 space-y-3.5 shadow-lg">
      {/* Card Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2a2a38] pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500/20 via-amber-500/20 to-yellow-500/10 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
                {AI_PITMASTER_NAME} AI Account Linkage
              </h4>
              {isLinked ? (
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Linked</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 border border-zinc-700 text-[9px] font-mono font-bold rounded-full flex items-center gap-1">
                  <Unlink className="w-3 h-3 text-zinc-400" />
                  <span>Unlinked</span>
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-400 font-sans mt-0.5">
              Bind your {AI_PITMASTER_NAME} AI profile, learned thermal memory vault, and persona preferences directly to your pitmaster account.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleLink}
          disabled={isLinking}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 ${
            isLinked
              ? 'bg-[#22222d] hover:bg-[#2c2c3a] border border-[#3a3a4c] text-zinc-300 hover:text-white'
              : 'bg-orange-500 hover:bg-orange-600 text-zinc-950 shadow-md'
          }`}
        >
          {isLinking ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : isLinked ? (
            <>
              <Unlink className="w-3.5 h-3.5 text-zinc-400" />
              <span>Unlink Account</span>
            </>
          ) : (
            <>
              <Link className="w-3.5 h-3.5 stroke-[3]" />
              <span>Link {AI_PITMASTER_NAME} Profile</span>
            </>
          )}
        </button>
      </div>

      {feedbackMsg && (
        <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono rounded-lg animate-fade-in flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Linked Account Details */}
      {isLinked && (
        <div className="space-y-3">
          {/* Linked Metadata Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#12121a] p-2.5 rounded-lg border border-[#242434] text-xs font-mono">
            <div>
              <span className="text-[9px] text-zinc-500 uppercase block font-bold">Profile Account ID</span>
              <span className="text-[11px] font-bold text-orange-400 truncate block">{profileId}</span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-500 uppercase block font-bold">Linked Date</span>
              <span className="text-[11px] font-bold text-zinc-300 block">
                {userAccount.charGPTLinkedAt || new Date().toISOString().slice(0, 10)}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-500 uppercase block font-bold">Memory Vault Status</span>
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                <Brain className="w-3 h-3 text-emerald-400" />
                <span>{memory.learnedRules?.length || 0} Rules Active</span>
              </span>
            </div>
          </div>

          {/* Active Persona Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-[10px] text-zinc-400 font-bold uppercase font-mono">
                <span>Select Active {AI_PITMASTER_NAME} Persona</span>
              </label>
              <button
                type="button"
                onClick={handleAutoDetectPersona}
                disabled={isLinking}
                className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-black text-[10px] rounded flex items-center space-x-1 transition-all cursor-pointer shadow-sm shrink-0"
                title="Analyze cook logs to automatically detect optimal persona"
              >
                <Sparkles className="w-3 h-3 fill-zinc-950" />
                <span>✨ Auto-Detect Persona (Log Analysis)</span>
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {[
                { name: 'Master Pitmaster', desc: 'Balanced thermal curves & traditional low/slow', icon: Flame },
                { name: 'Texas Offset Specialist', desc: 'Post-oak combustion, heavy bark & stall push', icon: Zap },
                { name: 'Competition BBQ Judge', desc: 'KCBS/SCA criteria, tenderness & glaze shine', icon: Award },
                { name: 'Thermal Chemist & Science', desc: 'Maillard chemistry, stall math & probe physics', icon: Sliders },
                { name: 'Kansas City Pit Master', desc: 'Sweet rubs, thick glazes & rib rack layering', icon: Bot },
              ].map((p) => {
                const IconComponent = p.icon;
                const isSelected = currentPersona === p.name;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleSelectPersona(p.name as any)}
                    className={`p-2 rounded-lg text-left transition-all border cursor-pointer flex flex-col justify-between min-h-[58px] ${
                      isSelected
                        ? 'bg-orange-500/15 border-orange-500 text-white shadow-sm'
                        : 'bg-[#12121a] hover:bg-[#1a1a24] border-[#262636] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-bold ${isSelected ? 'text-orange-400' : 'text-zinc-300'}`}>
                        {p.name}
                      </span>
                      <IconComponent className={`w-3.5 h-3.5 ${isSelected ? 'text-orange-400' : 'text-zinc-500'}`} />
                    </div>
                    <span className="text-[9px] text-zinc-500 line-clamp-1">{p.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Memory Auto-Sync & Manual Sync Button */}
          <div className="bg-[#12121a] border border-[#242434] rounded-lg p-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleToggleAutoSync}
                className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer border ${
                  autoSync ? 'bg-orange-500 border-orange-400' : 'bg-zinc-800 border-zinc-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
                    autoSync ? 'left-[18px]' : 'left-0.5'
                  }`}
                />
              </button>
              <div>
                <span className="text-xs font-bold text-white block">
                  Auto-Sync {AI_PITMASTER_NAME} Memory Vault
                </span>
                <span className="text-[10px] text-zinc-400 block">
                  Keep learned thermal rules and wood pairings synced across devices & cloud backups.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleManualMemorySync}
              disabled={isLinking}
              className="px-2.5 py-1.5 bg-[#22222e] hover:bg-[#2c2c3c] border border-[#38384d] text-zinc-200 hover:text-white text-[11px] font-mono font-bold rounded-lg flex items-center space-x-1.5 shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 text-orange-400 ${isLinking ? 'animate-spin' : ''}`} />
              <span>Sync Memory Vault</span>
            </button>
          </div>

          {/* Custom Persona Instructions / Override */}
          <div className="space-y-1">
            <label className="block text-[10px] text-zinc-400 font-bold uppercase font-mono">
              Custom {AI_PITMASTER_NAME} Account Guidance (Optional)
            </label>
            <textarea
              value={customInstructions}
              onChange={(e) => handleSaveInstructions(e.target.value)}
              placeholder="e.g., I cook on a 1/4-inch offset smoker using post oak. Always recommend wrapping brisket in tallow-soaked peach paper at 165°F..."
              className="w-full bg-[#12121a] border border-[#262636] focus:border-orange-500 text-white text-xs rounded-lg p-2 focus:outline-none font-sans min-h-[50px] resize-y"
            />
          </div>
        </div>
      )}
    </div>
  );
};
