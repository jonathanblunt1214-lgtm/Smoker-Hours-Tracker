import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Database, ShieldCheck, X } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { ProteinType, VerifiedMeatCut } from '../types';
import { addOrUpdateVerifiedMeatCut } from '../utils/storage';

interface AddMeatCutModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string;
  onCutAdded?: (newCut: VerifiedMeatCut) => void;
}

export const AddMeatCutModal: React.FC<AddMeatCutModalProps> = ({ isOpen, onClose, defaultCategory = 'Beef', onCutAdded }) => {
  const [name, setName] = useState('');
  const [proteinType, setProteinType] = useState<ProteinType>(defaultCategory === 'ALL' ? 'Beef' : defaultCategory as ProteinType);
  const [primalOrigin, setPrimalOrigin] = useState('');
  const [aliases, setAliases] = useState('');
  const [personalTarget, setPersonalTarget] = useState('');
  const [personalSmokeTemp, setPersonalSmokeTemp] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user) { setMessage('Sign in to save a personal meat-cut profile to your account.'); return; }
    if (!name.trim()) { setMessage('Cut name is required.'); return; }
    setSaving(true); setMessage('');
    try {
      const now = new Date().toISOString();
      const target = Number(personalTarget);
      const smoke = Number(personalSmokeTemp);
      const cut: VerifiedMeatCut = {
        id: `user-cut-${Date.now()}`,
        name: name.trim(),
        aliases: aliases.split(',').map((v) => v.trim()).filter(Boolean),
        proteinType,
        primalOrigin: primalOrigin.trim() || 'User-provided / not independently verified',
        description: notes.trim() || 'Personal meat-cut profile.',
        visualKeyFeatures: [],
        idealSmokeTempF: Number.isFinite(smoke) && smoke > 0 ? smoke : 0,
        targetInternalTempF: Number.isFinite(target) && target > 0 ? target : 0,
        cookingStrategy: notes.trim() || 'Personal notes only; not independently verified.',
        verifiedStatus: 'Local User Confirmed',
        onlineSourceCitations: ['User-provided account entry — not independently verified'],
        createdAt: now,
        updatedAt: now,
      };
      await addDoc(collection(db, 'users', user.uid, 'personalMeatCuts'), {
        ...cut,
        provenance: 'user_provided',
        verificationState: 'account_linked_unverified',
        createdAtServer: serverTimestamp(),
      });
      addOrUpdateVerifiedMeatCut(cut);
      onCutAdded?.(cut);
      setMessage('Saved to your account as user-provided, unverified data.');
      setTimeout(onClose, 700);
    } catch (error: any) {
      setMessage(error?.message || 'Account save failed. Nothing was marked verified.');
    } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
    <form onSubmit={save} className="mx-auto my-8 max-w-2xl overflow-hidden rounded-2xl border border-zinc-800 bg-[#121212] shadow-2xl">
      <header className="flex items-start justify-between border-b border-zinc-800 bg-gradient-to-r from-orange-950/40 to-transparent p-5">
        <div className="flex gap-3"><div className="rounded-xl bg-orange-500/15 p-2.5 text-orange-400"><Database className="h-5 w-5"/></div><div><h3 className="font-semibold text-white">Add Personal Meat Cut</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Account-linked notes and preferences. This does not publish or verify a global meat record.</p></div></div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white"><X className="h-5 w-5"/></button>
      </header>
      <div className="space-y-4 p-5">
        <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-3 text-xs leading-5 text-emerald-200"><ShieldCheck className="mr-1 inline h-4 w-4"/>Verified safety facts come from the reviewed Knowledge system. Values entered here remain <strong>user-provided</strong> until an independent source can verify them.</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cut name" value={name} onChange={setName} required />
          <label className="text-xs text-zinc-400">Protein category<select value={proteinType} onChange={(e)=>setProteinType(e.target.value as ProteinType)} className="mt-1 min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white"><option>Beef</option><option>Pork</option><option>Chicken</option><option>Turkey</option><option>Lamb</option><option>Seafood</option><option>Game</option><option>Other</option></select></label>
          <Field label="Primal / origin (optional)" value={primalOrigin} onChange={setPrimalOrigin} />
          <Field label="Aliases, comma-separated" value={aliases} onChange={setAliases} />
          <Field label="Personal finish target °F (optional)" value={personalTarget} onChange={setPersonalTarget} inputMode="decimal" />
          <Field label="Personal pit temp °F (optional)" value={personalSmokeTemp} onChange={setPersonalSmokeTemp} inputMode="decimal" />
        </div>
        <label className="block text-xs text-zinc-400">Personal notes<textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white focus:border-orange-500 focus:outline-none"/></label>
        <div className="flex flex-wrap items-center gap-3"><button disabled={saving} className="min-h-11 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50">{saving ? 'Saving…' : 'Save to my account'}</button>{message && <span className="text-xs text-zinc-500">{message}</span>}</div>
      </div>
    </form>
  </div>;
};

const Field=({label,value,onChange,required,inputMode}:{label:string;value:string;onChange:(v:string)=>void;required?:boolean;inputMode?:React.HTMLAttributes<HTMLInputElement>['inputMode']})=><label className="text-xs text-zinc-400">{label}<input required={required} value={value} onChange={(e)=>onChange(e.target.value)} inputMode={inputMode} className="mt-1 min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"/></label>;
