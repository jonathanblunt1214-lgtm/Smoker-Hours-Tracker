import React, { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, RefreshCw, XCircle } from 'lucide-react';

type RecordItem = {
  id: string;
  type: string;
  title: string;
  claims: string[];
  status: string;
  source?: { url?: string; publisher?: string | null; type?: string };
  reviewedAt?: string | null;
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

  const load = async () => {
    try {
      const res = await request('/api/knowledge/candidates?limit=200');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Review queue failed.');
      setRecords(Array.isArray(data?.records) ? data.records : []);
    } catch (error: any) { showToast(error?.message || 'Could not load knowledge queue.'); }
  };

  useEffect(() => { void load(); }, []);

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

  return <div className="space-y-5">
    <section className="rounded-2xl border border-zinc-800 bg-[#141414] p-4 sm:p-5">
      <h3 className="font-semibold text-white">Submit source-backed candidate</h3>
      <p className="mt-1 text-xs text-zinc-500">Every submission starts as pending review. One exact source-supported claim per line.</p>
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
      <div className="mt-4 space-y-3">{pending.length === 0 ? <p className="text-sm text-zinc-500">No candidates awaiting review.</p> : pending.map((record) => <div key={record.id} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"><div className="text-sm font-semibold text-white">{record.title}</div><div className="mt-1 text-xs text-zinc-500">{record.type} · {record.source?.publisher || record.source?.type || 'source'}</div>{record.source?.url && <a href={record.source.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs text-orange-300">Open source <ExternalLink className="ml-1 h-3 w-3" /></a>}<ul className="mt-3 space-y-1">{record.claims.map((claim) => <li key={claim} className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-300">{claim}</li>)}</ul><div className="mt-3 flex gap-2"><button disabled={busy !== null} onClick={() => void review(record.id, 'publish')} className="rounded-lg border border-emerald-800/60 px-3 py-2 text-xs text-emerald-300"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />Approve & publish</button><button disabled={busy !== null} onClick={() => void review(record.id, 'reject')} className="rounded-lg border border-red-800/60 px-3 py-2 text-xs text-red-300"><XCircle className="mr-1 inline h-3.5 w-3.5" />Reject</button></div></div>)}</div>
    </section>

    <section className="rounded-2xl border border-zinc-800 bg-[#141414] p-4 sm:p-5"><h3 className="font-semibold text-white">Recent reviewed records</h3><div className="mt-3 divide-y divide-zinc-800">{reviewed.length === 0 ? <p className="text-sm text-zinc-500">No reviewed records.</p> : reviewed.map((record) => <div key={record.id} className="flex justify-between gap-3 py-3"><div><div className="text-sm text-zinc-200">{record.title}</div><div className="mt-1 text-xs text-zinc-500">{record.type}</div></div><span className="text-xs text-zinc-400">{record.status.replaceAll('_', ' ')}</span></div>)}</div></section>
  </div>;
};
