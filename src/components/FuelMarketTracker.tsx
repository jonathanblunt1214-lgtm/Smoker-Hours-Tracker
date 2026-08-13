import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, ExternalLink, Plus, RefreshCw, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react';
import { auth } from '../lib/firebase';
import { calculateObservedPriceTrend, loadAccountFuelPriceObservations, saveAccountFuelPriceObservation, FuelPriceObservation } from '../utils/priceObservations';

export const FuelMarketTracker: React.FC = () => {
  const [rows, setRows] = useState<FuelPriceObservation[]>([]);
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [retailerName, setRetailerName] = useState('');
  const [price, setPrice] = useState('');
  const [weight, setWeight] = useState('');
  const [sourceType, setSourceType] = useState<'manual_entry' | 'receipt' | 'retailer_page'>('manual_entry');
  const [sourceUrl, setSourceUrl] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setRows([]); return; }
    setRows(await loadAccountFuelPriceObservations(uid));
  };

  useEffect(() => { void reload().catch((e) => setMessage(e?.message || 'Price observations unavailable.')); }, []);

  const latestProductKey = rows.length ? rows[rows.length - 1].productKey : undefined;
  const trend = useMemo(() => calculateObservedPriceTrend(rows, latestProductKey), [rows, latestProductKey]);

  const submit = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setMessage('Sign in to save account-linked price observations.'); return; }
    setSaving(true); setMessage('');
    try {
      await saveAccountFuelPriceObservation(uid, {
        productName, brand, retailerName,
        category: 'Wood Pellets',
        bagWeightLbs: weight ? Number(weight) : undefined,
        quantityUnits: 1,
        totalPrice: Number(price),
        observedAt: new Date().toISOString(),
        sourceType,
        sourceUrl: sourceUrl || undefined,
        evidenceNote: sourceType === 'manual_entry' ? 'User-entered observed price.' : undefined,
      });
      setMessage('Saved to your account as an unverified observed price.');
      setPrice(''); setSourceUrl('');
      await reload();
    } catch (e: any) { setMessage(e?.message || 'Could not save price observation.'); }
    finally { setSaving(false); }
  };

  const trendIcon = trend.status === 'rising' ? <TrendingUp className="h-4 w-4" /> : trend.status === 'falling' ? <TrendingDown className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />;

  return <section className="mt-5 rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-[#121212] p-4 sm:p-5 shadow-xl shadow-black/10" aria-labelledby="fuel-market-title">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-orange-400"/><h3 id="fuel-market-title" className="font-semibold text-white">Observed Fuel Price Tracker</h3></div>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">Tracks real prices you observed or documented. It never invents fluctuations and does not call account observations a live market feed.</p>
      </div>
      <span className="inline-flex w-fit items-center gap-1 rounded-full border border-emerald-800/60 bg-emerald-950/30 px-2.5 py-1 text-[11px] text-emerald-300"><ShieldCheck className="h-3.5 w-3.5"/>Truthful observations</span>
    </div>

    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Observations" value={String(trend.observationCount)} />
      <Metric label="Latest" value={trend.latestPrice == null ? 'No data' : `$${trend.latestPrice.toFixed(2)}`} />
      <Metric label="Last change" value={trend.changePct == null ? 'Need 2+' : `${trend.changePct > 0 ? '+' : ''}${trend.changePct.toFixed(2)}%`} icon={trendIcon} />
      <Metric label="Observed range" value={trend.lowPrice == null || trend.highPrice == null ? 'No data' : `$${trend.lowPrice.toFixed(2)}–$${trend.highPrice.toFixed(2)}`} />
    </div>
    <div className="mt-2 text-[11px] text-zinc-600">{trend.scopeLabel}{trend.volatilityPct != null ? ` · observed volatility ${trend.volatilityPct.toFixed(2)}%` : ''}</div>

    <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-6">
      <Field value={productName} onChange={setProductName} placeholder="Fuel product" ariaLabel="Fuel product" />
      <Field value={brand} onChange={setBrand} placeholder="Brand" ariaLabel="Brand" />
      <Field value={retailerName} onChange={setRetailerName} placeholder="Retailer" ariaLabel="Retailer" />
      <Field value={price} onChange={setPrice} placeholder="Price paid" ariaLabel="Price paid" inputMode="decimal" />
      <Field value={weight} onChange={setWeight} placeholder="Bag lbs (optional)" ariaLabel="Bag weight in pounds" inputMode="decimal" />
      <select value={sourceType} onChange={(e)=>setSourceType(e.target.value as any)} className="min-h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" aria-label="Observation evidence type">
        <option value="manual_entry">Manual observation</option><option value="receipt">Receipt</option><option value="retailer_page">Retailer page</option>
      </select>
    </div>
    {sourceType === 'retailer_page' && <div className="mt-2"><Field value={sourceUrl} onChange={setSourceUrl} placeholder="https:// retailer product page" ariaLabel="Retailer source URL" /></div>}
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button type="button" onClick={()=>void submit()} disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-orange-400 disabled:opacity-50"><Plus className="h-4 w-4"/>{saving ? 'Saving…' : 'Add observation'}</button>
      <button type="button" onClick={()=>void reload()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"><RefreshCw className="h-4 w-4"/>Refresh</button>
      {sourceUrl && /^https:\/\//i.test(sourceUrl) && <a href={sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"><ExternalLink className="h-4 w-4"/>Open evidence</a>}
      {message && <span className="text-xs text-zinc-500">{message}</span>}
    </div>
  </section>;
};

const Metric=({label,value,icon}:{label:string;value:string;icon?:React.ReactNode})=><div className="rounded-xl border border-zinc-800/80 bg-black/20 p-3"><div className="text-[11px] uppercase tracking-wide text-zinc-600">{label}</div><div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-zinc-100">{icon}{value}</div></div>;
const Field=({value,onChange,placeholder,ariaLabel,inputMode}:{value:string;onChange:(v:string)=>void;placeholder:string;ariaLabel:string;inputMode?:React.HTMLAttributes<HTMLInputElement>['inputMode']})=><input value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} aria-label={ariaLabel} inputMode={inputMode} className="min-h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"/>;
