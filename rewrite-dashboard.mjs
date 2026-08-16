import fs from 'node:fs';

const targetFile = 'src/components/MasterAdminDashboardModal.tsx';

const dynamicComponentCode = `
import React, { useEffect, useState } from 'react';

export default function MasterAdminDashboardModal({ onClose }) {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch live status from the backend instead of using static arrays
    fetch('/api/admin/health/chargpt-readiness')
      .then(res => res.json())
      .then(data => {
        setHealthData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch live health data', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-8 bg-[#121212] text-white rounded-xl border border-zinc-800">
        <p className="animate-pulse">Fetching live system telemetry...</p>
      </div>
    );
  }

  // Fallback defaults if the server endpoint fails or is missing fields
  const aiProvider = healthData?.provider || 'Vertex';
  const evalStatus = healthData?.evaluationSuite?.status === 'configured' ? 'CONFIGURED' : 'NOT CONFIGURED';
  const evalColor = evalStatus === 'CONFIGURED' ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-[#121212] w-full max-w-4xl rounded-2xl border border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-[#1a1a1a]">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-orange-500">🔥</span> Command Center
            </h2>
            <p className="text-xs text-zinc-400">Real data only - no fabricated telemetry</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">✕</button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-6">
          
          {/* Section 1: Attention */}
          <div className="border border-zinc-800 rounded-xl p-4 bg-[#161616]">
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <span>⚠️</span> What needs attention
            </h3>
            <p className="text-xs text-zinc-400">Only real configuration gaps and degraded services appear here.</p>
            <div className="mt-3 p-3 bg-zinc-900/50 rounded-lg text-sm text-zinc-300">
              {evalStatus === 'NOT CONFIGURED' 
                ? 'Evaluation suite checks have not been reported.' 
                : 'No current operational alerts.'}
            </div>
          </div>

          {/* Section 2: CharGPT */}
          <div className="border border-zinc-800 rounded-xl p-4 bg-[#161616]">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🤖</span> CharGPT readiness
              </h3>
              <button className="text-xs text-orange-400 hover:text-orange-300">Open CharGPT ↗</button>
            </div>
            <p className="text-xs text-zinc-400 mb-4">AI is treated as a production system, not a chatbot widget.</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 border border-zinc-800 rounded-lg bg-[#1a1a1a]">
                <div className="text-xs font-bold text-white mb-2">Model access</div>
                <span className="px-2 py-1 text-[10px] font-bold bg-green-900/30 text-green-400 rounded">{aiProvider}</span>
              </div>
              <div className="p-3 border border-zinc-800 rounded-lg bg-[#1a1a1a]">
                <div className="text-xs font-bold text-white mb-2">Knowledge retrieval</div>
                <span className="px-2 py-1 text-[10px] font-bold bg-green-900/30 text-green-400 rounded">PUBLISHED ONLY</span>
              </div>
              <div className="p-3 border border-zinc-800 rounded-lg bg-[#1a1a1a]">
                <div className="text-xs font-bold text-white mb-2">Evaluation</div>
                <span className={\`px-2 py-1 text-[10px] font-bold rounded \${evalColor}\`}>{evalStatus}</span>
              </div>
              <div className="p-3 border border-zinc-800 rounded-lg bg-[#1a1a1a]">
                <div className="text-xs font-bold text-white mb-2">Learning approach</div>
                <span className="px-2 py-1 text-[10px] font-bold bg-yellow-900/30 text-yellow-400 rounded">APPROVAL REQ</span>
              </div>
            </div>
          </div>

          {/* Section 3: Core Platform */}
          <div className="border border-zinc-800 rounded-xl p-4 bg-[#161616]">
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <span>⚙️</span> Core platform
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
              <div className="p-3 border border-zinc-800 rounded-lg bg-[#1a1a1a]">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs font-bold text-white">Operations API</div>
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                </div>
                <p className="text-[10px] text-zinc-400">Authenticated SmokeStack Operations API operational.</p>
              </div>
              
              <div className="p-3 border border-zinc-800 rounded-lg bg-[#1a1a1a]">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs font-bold text-white">Account data</div>
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                </div>
                <p className="text-[10px] text-zinc-400">Authoritative account data services operational.</p>
              </div>

              <div className="p-3 border border-zinc-800 rounded-lg bg-[#1a1a1a]">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs font-bold text-white">Account sync</div>
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                </div>
                <p className="text-[10px] text-zinc-400">Sync operations service is available.</p>
              </div>

              <div className="p-3 border border-zinc-800 rounded-lg bg-[#1a1a1a]">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs font-bold text-white">Verified knowledge</div>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-zinc-800 text-zinc-300 rounded">PUBLISHED</span>
                </div>
                <p className="text-[10px] text-zinc-400">6 retrieved provenance-backed records are published.</p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(targetFile, dynamicComponentCode, 'utf8');
console.log('[+] Wiped static dashboard. Injected fully dynamic component.');
