import React, { useState } from 'react';
import { ExternalLink, Search, ShieldCheck } from 'lucide-react';

type Props = {
  request: (path: string, init?: RequestInit) => Promise<Response>;
  showToast: (message: string) => void;
  onChanged?: () => Promise<void> | void;
};

const APPROVED = [
  'USDA / FSIS',
  'Culinary Institute of America',
  'Texas A&M Meat Science',
  'Beef. It’s What’s For Dinner',
  'National Pork Board',
];

export const MeatSourceHarvesterPanel: React.FC<Props> = ({ request, showToast, onChanged }) => {
  const [sourceUrl, setSourceUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const harvest = async () => {
    const value = sourceUrl.trim();
    if (!/^https:\/\//i.test(value)) return showToast('Enter an approved HTTPS meat-source URL.');
    setBusy(true);
    try {
      const res = await request('/api/knowledge/harvest-meat', { method: 'POST', body: JSON.stringify({ sourceUrl: value }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Meat harvest failed.');
      setSourceUrl('');
      showToast('Meat facts extracted into Pending Review. Nothing was published automatically.');
      await onChanged?.();
    } catch (error: any) {
      showToast(error?.message || 'Meat harvest failed. Nothing was saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-emerald-900/50 bg-emerald-500/5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-emerald-800/50 bg-emerald-500/10 p-2 text-emerald-300"><ShieldCheck className="h-5 w-5" /></div>
        <div>
          <h3 className="font-semibold text-white">Meat Database Source Harvester</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-400">Extracts claim-scoped cut identity, anatomy, food-safety temperatures, rest times, cooking-method language, and culinary targets from approved sources. Every extracted fact remains Pending Review until an admin verifies the exact evidence.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 md:flex-row">
        <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !busy) void harvest(); }} placeholder="https://www.fsis.usda.gov/... or another approved meat source" className="min-h-11 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-emerald-500" />
        <button disabled={busy || !sourceUrl.trim()} onClick={() => void harvest()} className="min-h-11 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-50"><Search className="mr-1.5 inline h-4 w-4" />{busy ? 'Harvesting…' : 'Harvest meat facts'}</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-500">{APPROVED.map((name) => <span key={name} className="rounded-full border border-zinc-800 bg-zinc-950/70 px-2 py-1">{name}</span>)}</div>
      <a href="https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center text-xs text-emerald-300">Example USDA source <ExternalLink className="ml-1 h-3.5 w-3.5" /></a>
    </section>
  );
};
