import React, { useState, useEffect } from 'react';
import { Globe, RefreshCw, CheckCircle2, ShieldCheck, Smartphone, Laptop, AlertTriangle, Layers, Clock, Zap, ArrowDownCircle, ArrowUpCircle, Code, Copy, Sparkles, Send } from 'lucide-react';
import { MasterSyncEngine, MasterSyncStatus, MASTER_WEB_VERSION, MASTER_BUILD_NUMBER } from '../services/masterVersionSyncService';

interface Props {
  className?: string;
  onSyncComplete?: () => void;
}

export const MasterVersionSyncCard: React.FC<Props> = ({ className = '', onSyncComplete }) => {
  const [syncStatus, setSyncStatus] = useState<MasterSyncStatus>(() => MasterSyncEngine.getStatus());
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [devPromptText, setDevPromptText] = useState<string>('');
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [copiedFullOutput, setCopiedFullOutput] = useState<boolean>(false);
  const [copiedChangelog, setCopiedChangelog] = useState<boolean>(false);
  const [copiedSpecs, setCopiedSpecs] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = MasterSyncEngine.subscribe((newStatus) => {
      setSyncStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  const copyToClipboard = (text: string, setCopyState: (val: boolean) => void, message: string) => {
    navigator.clipboard.writeText(text);
    setCopyState(true);
    setSyncMessage(message);
    setTimeout(() => setCopyState(false), 3000);
    setTimeout(() => setSyncMessage(null), 5000);
  };

  const getFormattedFullOutput = () => {
    const lines = [
      `=== SMOKER HOURS MASTER SYNC ENGINE OUTPUT ===`,
      `Master Web Version: ${MASTER_WEB_VERSION} (Build #${MASTER_BUILD_NUMBER})`,
      `Client Platform: ${syncStatus.platform}`,
      `Status: ${syncStatus.inSync ? 'Synced to Master' : 'Offline / Reconnecting'}`,
      `Last Synced: ${syncStatus.lastSyncedAt || 'Just now'}`,
      `Connected Fleet Devices: ${syncStatus.connectedClients?.length || 0}`,
      ...(syncStatus.connectedClients || []).map(
        (c) => ` - Device: ${c.platform} (v${c.clientVersion}, Last active: ${new Date(c.lastSyncTime).toLocaleTimeString()})`
      ),
      ``,
      `--- RECONCILIATION LOGS ---`,
      ...(syncStatus.changelog || ['No pending reconciliation entries.']),
      ``,
      `--- LIVE UPDATE REQUEST PROMPT ---`,
      devPromptText.trim() || 'No prompt specified.',
      `==============================================`
    ];
    return lines.join('\n');
  };

  const handleManualSync = async () => {
    setSyncMessage('Synchronizing local state with Master Web Version...');
    const ok = await MasterSyncEngine.syncWithMasterWeb(false);
    if (ok) {
      setSyncMessage('Successfully synced with Master Web Version!');
      if (onSyncComplete) onSyncComplete();
    } else {
      setSyncMessage('Sync connection warning. Running in local master fallback mode.');
    }
    setTimeout(() => setSyncMessage(null), 4000);
  };

  const handleForceAlign = async () => {
    if (window.confirm('Re-align client data with Master Web Version? Local unsaved changes will be refreshed from the Web Master.')) {
      setSyncMessage('Force-pulling pristine state from Master Web Version...');
      const ok = await MasterSyncEngine.forceAlignWithMasterWeb();
      if (ok) {
        setSyncMessage('Client forcefully aligned with Master Web Version!');
        if (onSyncComplete) onSyncComplete();
      } else {
        setSyncMessage('Failed to force align with Master Web Version.');
      }
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  return (
    <div className={`bg-[#1c1c1c] border border-[#2e2e2e] rounded-xl p-4 sm:p-5 shadow-lg space-y-4 ${className}`}>
      {/* Title & Master Source Indicator */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 rounded-xl text-orange-400 shrink-0">
            <Globe className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                Master Web Version Sync System
              </h3>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-black rounded-md uppercase tracking-wider flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Master Authority</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              The Web Version is the master source of truth. All client apps (mobile, desktop, tablet, PWA) sync automatically to this web host.
            </p>
          </div>
        </div>

        {/* Status Badge & Copy Full Log Button */}
        <div className="flex items-center space-x-2 flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => copyToClipboard(getFormattedFullOutput(), setCopiedFullOutput, 'Copied full system status and output log!')}
            className="px-2.5 py-1 bg-[#222] hover:bg-[#2a2a2a] border border-[#3a3a3a] text-zinc-300 font-mono text-[11px] rounded-lg flex items-center space-x-1 transition-colors cursor-pointer"
            title="Copy all system status, versions, logs, and prompt to clipboard"
          >
            {copiedFullOutput ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Output Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-orange-400" />
                <span>Copy Output Log</span>
              </>
            )}
          </button>

          <div className="flex items-center space-x-2 bg-[#121212] border border-[#2a2a2a] px-3 py-1.5 rounded-lg font-mono text-xs">
            {syncStatus.isSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span className="text-amber-400 font-bold">Syncing...</span>
              </>
            ) : syncStatus.inSync ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Synced to Master</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400 font-bold">Offline / Reconnecting</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sync Details Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-[#121212] border border-[#2a2a2a] rounded-lg">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Master Web Version</span>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <Layers className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs font-black text-white font-mono">{MASTER_WEB_VERSION}</span>
            <span className="text-[9px] text-zinc-500">#{MASTER_BUILD_NUMBER}</span>
          </div>
        </div>

        <div className="p-3 bg-[#121212] border border-[#2a2a2a] rounded-lg">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Local Client Platform</span>
          <div className="flex items-center space-x-1.5 mt-0.5">
            {syncStatus.platform.includes('iOS') || syncStatus.platform.includes('Android') ? (
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Laptop className="w-3.5 h-3.5 text-purple-400" />
            )}
            <span className="text-xs font-bold text-white truncate">{syncStatus.platform}</span>
          </div>
        </div>

        <div className="p-3 bg-[#121212] border border-[#2a2a2a] rounded-lg">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Last Master Check-In</span>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-white">{syncStatus.lastSyncedAt || 'Just now'}</span>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {syncMessage && (
        <div className="p-2.5 bg-orange-500/10 border border-orange-500/30 rounded-lg text-xs font-medium text-orange-300 flex items-center space-x-2 animate-fade-in">
          <Zap className="w-4 h-4 text-orange-400 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleManualSync}
          disabled={syncStatus.isSyncing}
          className="flex-1 py-2 px-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-zinc-950 font-bold text-xs rounded-lg flex items-center justify-center space-x-1.5 transition-all shadow cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
          <span>Sync Now to Web Master</span>
        </button>

        <button
          type="button"
          onClick={handleForceAlign}
          disabled={syncStatus.isSyncing}
          className="py-2 px-3 bg-[#121212] hover:bg-[#252525] border border-[#333] text-zinc-300 font-semibold text-xs rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
          title="Overwrite local device state with Web Master data"
        >
          <ArrowDownCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>Force Align with Web Master</span>
        </button>
      </div>

      {/* Connected Master Fleet Clients */}
      {syncStatus.connectedClients && syncStatus.connectedClients.length > 0 && (
        <div className="p-3 bg-[#121212] border border-[#2a2a2a] rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-300 flex items-center space-x-1.5">
              <Laptop className="w-3.5 h-3.5 text-orange-400" />
              <span>Connected Devices Synced to Master ({syncStatus.connectedClients.length})</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400">Master Cloud Relay Active</span>
          </div>

          <div className="divide-y divide-[#222]">
            {syncStatus.connectedClients.map((client) => (
              <div key={client.deviceId} className="py-1.5 flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-2 truncate">
                  {client.platform.includes('iOS') || client.platform.includes('Android') ? (
                    <Smartphone className="w-3 h-3 text-emerald-400 shrink-0" />
                  ) : (
                    <Laptop className="w-3 h-3 text-purple-400 shrink-0" />
                  )}
                  <span className="text-zinc-200 font-medium truncate">{client.platform}</span>
                  <span className="text-[9px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded">
                    {client.clientVersion}
                  </span>
                </div>
                <div className="flex items-center space-x-2 font-mono text-[10px] text-zinc-400 shrink-0">
                  <span>{new Date(client.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Web Master Live Reconciliation Log */}
      {syncStatus.changelog && syncStatus.changelog.length > 0 && (
        <div className="p-3 bg-[#121212] border border-[#2a2a2a] rounded-xl text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-amber-400 flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Latest Reconciliation Log</span>
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(syncStatus.changelog.join('\n'), setCopiedChangelog, 'Copied reconciliation logs to clipboard!')}
              className="px-2 py-0.5 bg-[#1c1c1c] hover:bg-[#282828] border border-[#383838] text-zinc-300 font-mono text-[10px] rounded flex items-center space-x-1 transition-colors cursor-pointer"
            >
              {copiedChangelog ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied Log!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-amber-400" />
                  <span>Copy Log</span>
                </>
              )}
            </button>
          </div>
          <ul className="list-disc list-inside text-zinc-300 space-y-0.5 text-[11px] font-mono">
            {syncStatus.changelog.map((entry, idx) => (
              <li key={idx} className="text-zinc-300">{entry}</li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Studio Developer Live Code Request Section */}
      <div className="p-3.5 bg-gradient-to-br from-[#161616] to-[#1a1814] border border-orange-500/30 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-orange-500/20 border border-orange-500/30 rounded-lg text-orange-400">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                <span>AI Studio Live Code Updater</span>
                <span className="text-[9px] bg-orange-500/20 text-orange-300 border border-orange-500/40 px-1.5 py-0.2 rounded font-mono font-bold">
                  Direct Agent Prompt
                </span>
              </h4>
              <p className="text-[10px] text-zinc-400">
                Browser security prevents web apps inside iframe/preview from automatically typing into the developer chat. Type your request here to format and copy it in 1 click!
              </p>
            </div>
          </div>
        </div>

        <textarea
          value={devPromptText}
          onChange={(e) => setDevPromptText(e.target.value)}
          placeholder="e.g., 'Add a custom wood flavor profile calculator' or 'Change the accent theme color to deep amber'..."
          className="w-full h-20 p-2.5 bg-[#0f0f0f] border border-[#2a2a2a] focus:border-orange-500 rounded-lg text-xs text-white placeholder-zinc-500 resize-none outline-none font-mono transition-colors"
        />

        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-[10px] text-zinc-400 flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-orange-400 shrink-0" />
            <span>Copies structured prompt to paste directly into AI Studio developer chat.</span>
          </span>

          <button
            type="button"
            onClick={() => {
              const formattedPrompt = devPromptText.trim()
                ? `[LIVE APP UPDATE REQUEST]: ${devPromptText.trim()}`
                : `[LIVE APP UPDATE REQUEST]: Perform live version update and check for code improvements.`;
              navigator.clipboard.writeText(formattedPrompt);
              setCopiedPrompt(true);
              setSyncMessage('Copied live update prompt! Paste it into AI Studio Developer Chat to apply code changes.');
              setTimeout(() => setCopiedPrompt(false), 3000);
              setTimeout(() => setSyncMessage(null), 5000);
            }}
            className="px-3.5 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-zinc-950 font-black text-xs rounded-lg flex items-center space-x-1.5 transition-all shadow cursor-pointer"
          >
            {copiedPrompt ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950" />
                <span>Prompt Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Prompt for AI Agent</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Web Master Features List */}
      <div className="p-3 bg-[#121212] border border-[#2a2a2a] rounded-xl text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-extrabold text-zinc-300">Master Web Sync Capabilities:</span>
          <button
            type="button"
            onClick={() => {
              const specs = [
                'Master Web Sync Capabilities:',
                '- Cook Logs & Thermal Curves: Bi-directional merge of smoke sessions, temperature stalls, and probe graphs.',
                '- Multi-Rig Smoker Fleet: Synchronized smoker hardware specs, hopper capacities, and aftermarket mods.',
                '- Wood Pellet & Fuel Inventory: Live pellet bag balances, BTU density calculations, and custom fuel blends.',
                '- CharGPT AI Memory: Unified rules, custom preferences, and pitmaster advice across all devices.'
              ].join('\n');
              copyToClipboard(specs, setCopiedSpecs, 'Copied capabilities specification!');
            }}
            className="px-2 py-0.5 bg-[#1c1c1c] hover:bg-[#282828] border border-[#383838] text-zinc-300 font-mono text-[10px] rounded flex items-center space-x-1 transition-colors cursor-pointer"
          >
            {copiedSpecs ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Copied Specs!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-orange-400" />
                <span>Copy Specs</span>
              </>
            )}
          </button>
        </div>
        <ul className="list-disc list-inside text-zinc-400 space-y-0.5 text-[11px]">
          <li><strong>Cook Logs & Thermal Curves:</strong> Bi-directional merge of smoke sessions, temperature stalls, and probe graphs.</li>
          <li><strong>Multi-Rig Smoker Fleet:</strong> Synchronized smoker hardware specs, hopper capacities, and aftermarket mods.</li>
          <li><strong>Wood Pellet & Fuel Inventory:</strong> Live pellet bag balances, BTU density calculations, and custom fuel blends.</li>
          <li><strong>CharGPT AI Memory:</strong> Unified rules, custom preferences, and pitmaster advice across all devices.</li>
        </ul>
      </div>
    </div>
  );
};

export default MasterVersionSyncCard;
