import React, { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, RefreshCw, Search, XCircle } from 'lucide-react';

type RecordItem = {
  id: string;
  type: string;
  title: string;
  claims: string[];
  status: string;
  source?: { url?: string; publisher?: string | null; type?: string; harvested?: boolean; harvestQuery?: { mode?: string; value?: string } };
  reviewedAt?: string | null;
};

type HarvesterSource = {
  id: string;
  databaseKind: string;
  sourceUrl: string;
  label: string;
  enabled: boolean;
  lastRunStatus?: string | null;
  lastRunAt?: string | null;
  lastError?: string | null;
};

type Props = {
  request: (path: string, init?: RequestInit) => Promise<Response>;
  showToast: (message: string) => void;
  onChanged?: () => Promise<void> | void;
};

export const KnowledgeAdminPanel: React.FC<Props> = ({ request, showToast, onChanged }) => {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ type: 'fuel', sourceType: 'manufacturer', title: '', publisher: '', sourceUrl: '', claimsText: '' });
  const [harvest, setHarvest] = useState({ mode: 'url', value: '' });
  const [databaseHarvest, setDatabaseHarvest] = useState({ databaseKind: 'pellet', label: '', sourceUrl: '' });
  const [harvesterSources, setHarvesterSources] = useState<HarvesterSource[]>([]);

  const load = async () => {
    try {
      const res = await request('/api/knowledge/candidates?limit=200');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Review queue failed.');
      setRecords(Array.isArray(data?.records) ? data.records : []);
    } catch (error: any) { showToast(error?.message || 'Could not load knowledge queue.'); }
  };

  const loadHarvesters = async () => {
    try {
      const res = await request('/api/knowledge/database-harvesters');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Database harvesters failed.');
      setHarvesterSources(Array.isArray(data?.sources) ? data.sources : []);
    } catch (error: any) { showToast(error?.message || 'Could not load database harvesters.'); }
  };

  useEffect(() => { void load(); void loadHarvesters(); }, []);

  const runHarvest = async () => {
    if (!harvest.value.trim()) return showToast('Enter a source URL, smoker model/name, fuel name, or modification name.');
    setBusy('harvest');
    try {
      const res = await request('/api/knowledge/harvest', {
        method: 'POST',
        body: JSON.stringify({ mode: harvest.mode, value: harvest.value.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Source harvest failed.');
      setHarvest({ ...harvest, value: '' });
      showToast('Source harvested into Pending Review. Nothing was published automatically.');
      await load(); await onChanged?.();
    } catch (error: any) { showToast(error?.message || 'Source harvest failed. Nothing was saved.'); }
    finally { setBusy(null); }
  };

  const registerAndHarvest = async () => {
    if (!databaseHarvest.sourceUrl.trim()) return showToast('Enter an approved HTTPS source URL.');
    setBusy('database-harvest');
    try {
      const res = await request('/api/knowledge/database-harvesters', {
        method: 'POST',
        body: JSON.stringify({ ...databaseHarvest, harvestNow: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Database source harvest failed.');
      setDatabaseHarvest({ ...databaseHarvest, label: '', sourceUrl: '' });
      showToast(data?.harvest?.duplicate
        ? 'Source registered. Its current evidence already exists, so no duplicate was created.'
        : 'Source registered and a Pending Review candidate was created.');
      await load(); await loadHarvesters(); await onChanged?.();
    } catch (error: any) { showToast(error?.message || 'Database source harvest failed. Nothing was published.'); }
    finally { setBusy(null); }
  };

  const toggleHarvester = async (source: HarvesterSource) => {
    setBusy(source.id);
    try {
      const res = await request(`/api/knowledge/database-harvesters/${source.id}/enabled`, {
        method: 'POST',
        body: JSON.stringify({ enabled: !source.enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Harvester update failed.');
      await loadHarvesters();
    } catch (error: any) { showToast(error?.message || 'Harvester update failed.'); }
    finally { setBusy(null); }
  };

  const runAllHarvesters = async () => {
    setBusy('run-all');
    try {
      const res = await request('/api/knowledge/database-harvesters/run', { method: 'POST', body: '{}' });
      const data = await res.json();
      if (!res.ok && res.status !== 207) throw new Error(data?.error || 'Harvester run failed.');
      showToast(`Harvester run finished: ${data?.candidateCount || 0} candidate(s), ${data?.unchangedCount || 0} unchanged, ${data?.failureCount || 0} failed.`);
      await load(); await loadHarvesters(); await onChanged?.();
    } catch (error: any) { showToast(error?.message || 'Harvester run failed.'); }
    finally { setBusy(null); }
  };

  const submit = async () => {
    const claims = form.claimsText.split('\n').map((value) => value.trim()).filter(Boolean);
    if (!form.title.trim() || !form.sourceUrl.trim() || claims.length === 0) return showToast('Title, source URL, and claims are required.');
    setBusy('submit');
    try {
      const res = await request('/api/knowledge/candidates', { method: 'POST', body: JSON.stringify({ ...form, claims, title: form.title.trim(), publisher: form.publisher.trim(), sourceUrl: form.sourceUrl.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Submission failed.');
      setForm({ type: 'fuel', sourceType: 'manufacturer', title: '', publisher: '', sourceUrl: '', claimsText: '' });
      showToast('Candidate submitted for review. Nothing was published automatically.');
      await load(); await onChanged?.();
    } catch (error: any) { showToast(error?.message || 'Submission failed.'); }
    finally { setBusy(null); }
  };

  const review = async (id: string, decision: 'publish' | 'reject') => {
    setBusy(id);
    try {
      const res = await request(`/api/knowledge/${id}/review`, { method: 'POST', body: JSON.stringify({ decision }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Review failed.');
      showToast(decision === 'publish' ? 'Verified record published.' : 'Candidate rejected.');
      await load(); await onChanged?.();
    } catch (error: any) { showToast(error?.message || 'Review failed.'); }
    finally { setBusy(null); }
  };

  const pending = records.filter((record) => record.status === 'pending_review');
  const reviewed = records.filter((record) => record.status !== 'pending_review').slice(0, 12);
  const harvestPlaceholder = harvest.mode === 'url'
    ? 'https://manufacturer.com/product-page'
    : harvest.mode === 'smoker'
      ? 'Smoker model or name, e.g. PBV5PW1'
      : harvest.mode === 'fuel'
        ? 'Fuel name, e.g. Pit Boss Classic Blend Hardwood Pellets'
        : 'Modification / accessory name';

  return <div className="space-y-5">
    <section className="rounded-2xl border border-orange-900/50 bg-orange-500/5 p-4 sm:p-5">
      <h3 className="font-semibold text-white">Source Harvester</h3>
      <p className="mt-1 text-xs leading-5 text-zinc-400">Manually enter an approved manufacturer URL, smoker model/name, fuel name, or modification/accessory name. Extracted claims are saved only to Pending Review and are never automatically trusted.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_auto]">
        <select value={harvest.mode} onChange={(e) => setHarvest({ mode: e.target.value, value: '' })} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white">
          <option value="url">Manual URL</option>
          <option value="smoker">Smoker model / name</option>
          <option value="fuel">Fuel name</option>
          <option value="mod">Modification / accessory</option>
        </select>
        <input value={harvest.value} onChange={(e) => setHarvest({ ...harvest, value: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter' && busy === null) void runHarvest(); }} placeholder={harvestPlaceholder} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
        <button disabled={busy !== null || !harvest.value.trim()} onClick={() => void runHarvest()} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"><Search className="mr-1.5 inline h-4 w-4" />Find verified-source info</button>
      </div>
      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-xs leading-5 text-zinc-500">For model/fuel/mod searches, SmokeStack uses manufacturer URLs already known to the verified catalog. If it does not yet know an approved manufacturer source, enter the official product URL first.</div>
    </section>

    <section className="rounded-2xl border border-sky-900/50 bg-sky-500/5 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">All Database Harvesters</h3>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-400">Registers an approved official source, harvests it immediately, and rechecks it on the weekly schedule. Every new or changed record remains Pending Review until OWNER publication.</p>
        </div>
        <button disabled={busy !== null || harvesterSources.length === 0} onClick={() => void runAllHarvesters()} className="rounded-lg border border-sky-800/60 px-3 py-2 text-xs text-sky-300 disabled:opacity-50"><RefreshCw className="mr-1 inline h-3.5 w-3.5" />Run all now</button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[190px_1fr_1.4fr_auto]">
        <select value={databaseHarvest.databaseKind} onChange={(e) => setDatabaseHarvest({ ...databaseHarvest, databaseKind: e.target.value })} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white">
          <option value="smoker">Smokers & grills</option>
          <option value="pellet">Pellets</option>
          <option value="fuel">Other BBQ fuels</option>
          <option value="meat">Meat cuts</option>
          <option value="temperature">Safety & cook targets</option>
          <option value="mod">Mods & accessories</option>
          <option value="recipe">Recipes & techniques</option>
          <option value="retailer_price">Retail prices</option>
        </select>
        <input value={databaseHarvest.label} onChange={(e) => setDatabaseHarvest({ ...databaseHarvest, label: e.target.value })} placeholder="Source label" className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white" />
        <input value={databaseHarvest.sourceUrl} onChange={(e) => setDatabaseHarvest({ ...databaseHarvest, sourceUrl: e.target.value })} placeholder="https://official-source.example/page" className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white" />
        <button disabled={busy !== null || !databaseHarvest.sourceUrl.trim()} onClick={() => void registerAndHarvest()} className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50">Add & harvest</button>
      </div>
      <div className="mt-4 space-y-2">
        {harvesterSources.length === 0 ? <p className="text-sm text-zinc-500">No scheduled sources registered yet.</p> : harvesterSources.map((source) => (
          <div key={source.id} className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="truncate text-sm text-zinc-200">{source.label}</div>
              <div className="mt-1 truncate text-[11px] text-zinc-500">{source.databaseKind.replaceAll('_', ' ')} · {source.lastRunStatus || 'not run'} · {source.sourceUrl}</div>
              {source.lastError && <div className="mt-1 text-[11px] text-red-300">{source.lastError}</div>}
            </div>
            <button disabled={busy !== null} onClick={() => void toggleHarvester(source)} className={`rounded-lg border px-3 py-1.5 text-xs ${source.enabled ? 'border-emerald-800/60 text-emerald-300' : 'border-zinc-700 text-zinc-400'}`}>{source.enabled ? 'Scheduled' : 'Paused'}</button>
          </div>
        ))}
      </div>
    </section>

    <section className="rounded-2xl border border-zinc-800 bg-[#141414] p-4 sm:p-5">
      <h3 className="font-semibold text-white">Submit source-backed candidate</h3>
      <p className="mt-1 text-xs text-zinc-500">Manual fallback. Every submission starts as pending review. One exact source-supported claim per line.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white"><option value="smoker">Smoker</option><option value="fuel">Fuel</option><option value="meat">Meat & cut</option><option value="mod">Modification / compatibility</option></select>
        <select value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value })} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white"><option value="manufacturer">Manufacturer</option><option value="government">Government</option><option value="standards_body">Standards body</option><option value="verified_publisher">Verified publisher</option></select>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Record title" className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white" />
        <input value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} placeholder="Publisher" className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white" />
        <input value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="https:// source URL" className="md:col-span-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white" />
        <textarea value={form.claimsText} onChange={(e) => setForm({ ...form, claimsText: e.target.value })} placeholder="One exact claim per line" className="md:col-span-2 min-h-28 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white" />
      </div>
      <button disabled={busy !== null} onClick={() => void submit()} className="mt-4 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50">Submit for review</button>
    </section>

    <section className="rounded-2xl border border-zinc-800 bg-[#141414] p-4 sm:p-5">
      <div className="flex items-center justify-between"><div><h3 className="font-semibold text-white">Pending review</h3><p className="mt-1 text-xs text-zinc-500">Open the source and verify every claim before publishing.</p></div><button onClick={() => void load()} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300"><RefreshCw className="mr-1 inline h-3.5 w-3.5" />Refresh</button></div>
      <div className="mt-4 space-y-3">{pending.length === 0 ? <p className="text-sm text-zinc-500">No candidates awaiting review.</p> : pending.map((record) => <div key={record.id} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"><div className="flex flex-wrap items-center gap-2"><div className="text-sm font-semibold text-white">{record.title}</div>{record.source?.harvested && <span className="rounded-full border border-orange-900/60 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-300">Harvested</span>}</div><div className="mt-1 text-xs text-zinc-500">{record.type} · {record.source?.publisher || record.source?.type || 'source'}</div>{record.source?.harvestQuery?.value && <div className="mt-1 text-[11px] text-zinc-600">Search: {record.source.harvestQuery.mode} · {record.source.harvestQuery.value}</div>}{record.source?.url && <a href={record.source.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs text-orange-300">Open source <ExternalLink className="ml-1 h-3 w-3" /></a>}<ul className="mt-3 space-y-1">{record.claims.map((claim) => <li key={claim} className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-300">{claim}</li>)}</ul><div className="mt-3 flex gap-2"><button disabled={busy !== null} onClick={() => void review(record.id, 'publish')} className="rounded-lg border border-emerald-800/60 px-3 py-2 text-xs text-emerald-300"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />Approve & publish</button><button disabled={busy !== null} onClick={() => void review(record.id, 'reject')} className="rounded-lg border border-red-800/60 px-3 py-2 text-xs text-red-300"><XCircle className="mr-1 inline h-3.5 w-3.5" />Reject</button></div></div>)}</div>
    </section>

    <section className="rounded-2xl border border-zinc-800 bg-[#141414] p-4 sm:p-5"><h3 className="font-semibold text-white">Recent reviewed records</h3><div className="mt-3 divide-y divide-zinc-800">{reviewed.length === 0 ? <p className="text-sm text-zinc-500">No reviewed records.</p> : reviewed.map((record) => <div key={record.id} className="flex justify-between gap-3 py-3"><div><div className="text-sm text-zinc-200">{record.title}</div><div className="mt-1 text-xs text-zinc-500">{record.type}</div></div><span className="text-xs text-zinc-400">{record.status.replaceAll('_', ' ')}</span></div>)}</div></section>
  </div>;
};
