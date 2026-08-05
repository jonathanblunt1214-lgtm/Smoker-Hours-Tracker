import React, { useState, useEffect } from 'react';
import { CookLog, SmokerProfile } from '../types';
import { Sparkles, Send, Bot, HelpCircle, Loader2, LineChart, Award, AlertTriangle } from 'lucide-react';

interface AIPitmasterModalProps {
  cookLogs: CookLog[];
  profile: SmokerProfile;
  initialCookId?: string | null;
  initialPrompt?: string | null;
}

export const AIPitmasterModal: React.FC<AIPitmasterModalProps> = ({
  cookLogs,
  profile,
  initialCookId,
  initialPrompt,
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedCookId, setSelectedCookId] = useState<string>(
    initialCookId || (cookLogs.length > 0 ? 'ALL_LOGS' : '')
  );
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: `Hello Pitmaster! I am your AI Smoker & BBQ Science Advisor. Select "All Cook Logs" or any individual cook to run an AI Pitmaster Audit, discover key flavor/tenderness improvements, or troubleshoot thermal stalls!`,
    },
  ]);

  // Handle initial prompt if passed from external button
  useEffect(() => {
    if (initialPrompt) {
      handleAsk(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (initialCookId) {
      setSelectedCookId(initialCookId);
    }
  }, [initialCookId]);

  const activeCook = selectedCookId !== 'ALL_LOGS' ? cookLogs.find((c) => c.id === selectedCookId) : null;

  const handleAsk = async (userQuery?: string) => {
    const queryToUse = userQuery || prompt;
    if (!queryToUse.trim()) return;

    const newMessages = [...messages, { role: 'user' as const, text: queryToUse }];
    setMessages(newMessages);
    if (!userQuery) setPrompt('');
    setLoading(true);

    try {
      const isAll = selectedCookId === 'ALL_LOGS' || cookLogs.length === 1;
      const lastReading = activeCook?.temperatureReadings?.[activeCook.temperatureReadings.length - 1];

      const res = await fetch('/api/ai-pitmaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: queryToUse,
          allCookLogs: isAll ? cookLogs : null,
          cookContext: !isAll && activeCook
            ? {
                title: activeCook.title,
                smokerType: activeCook.smokerType,
                proteinType: activeCook.proteinType,
                proteinCut: activeCook.proteinCut,
                currentPitTemp: lastReading?.cookingTemp || 225,
                currentMeatTemp: lastReading?.meatTemp || 160,
                targetTemp: 203,
                hoursLogged: activeCook.hoursLogged,
                rub: activeCook.seasoningRubs,
                overallRating: activeCook.ratings?.overall || 5,
                notes: activeCook.finishedNotes,
                nextTimeNotes: activeCook.nextTimeNotes,
              }
            : null,
        }),
      });

      const data = await res.json();
      if (data.text) {
        setMessages([...newMessages, { role: 'assistant', text: data.text }]);
      } else if (data.error) {
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            text: `⚠️ Pitmaster AI note: ${data.error}`,
          },
        ]);
      }
    } catch (e: any) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          text: 'Sorry, I encountered an error connecting to the AI Pitmaster service.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    '📊 Analyze all my cook logs and suggest top 3 improvements',
    '💡 Recommend next recipes to cook based on my log analysis',
    '🎯 What should I change in my next brisket cook to boost tenderness?',
    '🪵 Evaluate my wood pellet consumption & pit efficiency',
    'How do I bypass a thermal stall at 160°F?',
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#2a2a2a]">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">AI Pitmaster Advisor & Log Audit</h2>
              <p className="text-xs text-zinc-400">
                Powered by Gemini AI — Analyze past smoke sessions, uncover thermal trends, and receive pitmaster improvement suggestions.
              </p>
            </div>
          </div>

          {/* Context Cook dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-zinc-400 shrink-0">Analysis Scope:</span>
            <select
              value={selectedCookId}
              onChange={(e) => setSelectedCookId(e.target.value)}
              className="bg-[#121212] border border-[#2a2a2a] text-zinc-200 text-xs rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none w-full sm:w-auto"
            >
              <option value="ALL_LOGS">📊 All Cook Logs ({cookLogs.length} Sessions Audit)</option>
              {cookLogs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.proteinCut})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Audit Callout Banner */}
        <div className="mt-4 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10 border border-orange-500/30 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-orange-300">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-500/20 text-orange-400 rounded-lg border border-orange-500/30 shrink-0">
              <LineChart className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white block text-sm">
                Ready to optimize your smoker performance?
              </span>
              <span className="text-zinc-400">
                Let AI Pitmaster review your temperature curves, rubs, fuel consumption, and rating notes.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleAsk('Analyze my cook logs and suggest key pitmaster improvements for my next smoke')}
            disabled={loading}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-zinc-950 font-extrabold text-xs rounded-xl shadow-md flex items-center space-x-1.5 cursor-pointer shrink-0 transition-all"
          >
            <Award className="w-4 h-4" />
            <span>Run Log Audit & Improvements</span>
          </button>
        </div>

        {/* Quick prompt chips */}
        <div className="mt-4 flex items-center space-x-2 overflow-x-auto pb-2">
          <HelpCircle className="w-4 h-4 text-orange-400 shrink-0" />
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(qp)}
              className="px-3 py-1.5 bg-[#242424] hover:bg-[#2a2a2a] text-orange-400 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border border-[#2a2a2a] cursor-pointer"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Chat Messages container */}
        <div className="mt-6 space-y-4 max-h-[420px] overflow-y-auto p-4 rounded-2xl bg-[#121212] border border-[#2a2a2a]">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start space-x-3 ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-orange-500 text-zinc-950 font-bold font-sans'
                    : 'bg-[#242424] border border-[#2a2a2a] text-zinc-200 font-sans'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2 text-orange-400 text-xs italic font-mono">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>AI Pitmaster is analyzing your smoke logs and thermal curve history...</span>
            </div>
          )}
        </div>

        {/* Input bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="mt-4 flex items-center space-x-2"
        >
          <input
            type="text"
            placeholder="Ask AI Pitmaster to analyze your logs, recommend fixes, or optimize smoke flavor..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            className="flex-1 bg-[#121212] border border-[#2a2a2a] text-white rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
          />

          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="px-5 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-xl shadow-lg flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Ask AI</span>
          </button>
        </form>
      </div>
    </div>
  );
};
