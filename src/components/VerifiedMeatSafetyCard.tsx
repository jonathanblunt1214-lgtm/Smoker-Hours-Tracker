import React, { useMemo, useState } from 'react';
import { ExternalLink, Search, ShieldCheck } from 'lucide-react';
import { CONSTITUTION_VERIFIED_MEAT_CUTS } from '../data/verifiedMeatCutsData';

export const VerifiedMeatSafetyCard: React.FC = () => {
  const [query, setQuery] = useState('');
  const records = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CONSTITUTION_VERIFIED_MEAT_CUTS;
    return CONSTITUTION_VERIFIED_MEAT_CUTS.filter((r) => [r.name, r.proteinGroup, ...r.aliases].join(' ').toLowerCase().includes(q));
  }, [query]);

  return <section className="mb-5 rounded-2xl border border-zinc-800 bg-[#141414] p-4 sm:p-5" aria-labelledby="verified-meat-safety-title">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-400"/><h3 id="verified-meat-safety-title" className="font-semibold text-white">Verified Meat Safety</h3></div><p className="mt-1 text-xs leading-5 text-zinc-500">Government-source safety minimums only. BBQ tenderness targets and technique remain separate guidance.</p></div>
      <a href="https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900">USDA FSIS source <ExternalLink className="h-3.5 w-3.5"/></a>
    </div>
    <label className="relative mt-4 block"><Search className="absolute left-3 top-3 h-4 w-4 text-zinc-600"/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Filter: pork, poultry, fish, ground…" aria-label="Filter verified meat safety records" className="min-h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none"/></label>
    <div className="mt-3 grid gap-2 lg:grid-cols-2">
      {records.slice(0,6).map((r)=><div key={r.id} className="rounded-xl border border-zinc-800/80 bg-black/20 p-3"><div className="flex items-start justify-between gap-3"><div className="text-sm font-medium text-zinc-100">{r.name}</div><span className="shrink-0 rounded-md bg-emerald-950/50 px-2 py-1 text-[10px] font-semibold text-emerald-300">[VERIFIED]</span></div><div className="mt-2 text-lg font-bold text-white">{r.safeMinimumInternalTempF}°F{r.restTimeMinutes ? <span className="ml-2 text-xs font-normal text-zinc-400">+ {r.restTimeMinutes} min rest</span> : null}</div><div className="mt-1 text-[11px] leading-4 text-zinc-500">{r.notes[0]}</div></div>)}
    </div>
    {records.length === 0 && <div className="mt-3 rounded-xl border border-dashed border-zinc-800 p-4 text-xs text-zinc-500">No verified safety category matched. CharGPT should treat any additional cooking recommendation as general guidance unless another reviewed source exists.</div>}
  </section>;
};
