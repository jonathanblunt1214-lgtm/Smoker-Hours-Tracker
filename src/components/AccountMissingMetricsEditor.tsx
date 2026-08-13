import React,{useEffect,useState}from'react';
import{auth}from'../lib/firebase';

type T='smoker'|'fuel'|'blend_component'|'mod';
export function AccountMissingMetricsEditor({entityType,recordId}:{entityType:T;recordId:string}){
 const[fields,setFields]=useState<string[]>([]),[values,setValues]=useState<Record<string,string>>({}),[message,setMessage]=useState('');
 const request=async(path:string,init:RequestInit={})=>{const u=auth.currentUser;if(!u)throw new Error('Sign in required.');const token=await u.getIdToken();return fetch(path,{...init,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,...(init.headers||{})}})};
 const load=async()=>{if(!recordId)return;const r=await request(`/api/knowledge/account-metrics/${entityType}/${recordId}`),d=await r.json();if(!r.ok)throw new Error(d?.error||'Unavailable');setFields(d.allowedMissingFields||[]);const next:Record<string,string>={};for(const[f,e]of Object.entries(d.accountValues||{})as any)if(e?.active&&e?.value!=null)next[f]=String(e.value);setValues(next)};
 useEffect(()=>{void load().catch(e=>setMessage(e.message))},[entityType,recordId]);
 if(!recordId||fields.length===0)return null;
 const save=async()=>{const r=await request(`/api/knowledge/account-metrics/${entityType}/${recordId}`,{method:'POST',body:JSON.stringify({values})}),d=await r.json();setMessage(r.ok?'Saved to your account as unverified user-provided data.':d?.error||d?.message||'Nothing saved.');void load()};
 return <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"><div className="text-sm font-semibold text-white">Missing verified metrics</div><p className="mt-1 text-xs text-zinc-500">Only fields without verified source data are editable. These values stay linked to your account until verified.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{fields.map(f=><label key={f} className="text-xs text-zinc-400">{f}<input value={values[f]||''} onChange={e=>setValues({...values,[f]:e.target.value})} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"/></label>)}</div><button onClick={()=>void save()} className="mt-3 rounded-lg border border-orange-700 px-3 py-2 text-xs text-orange-300">Save missing metrics</button>{message&&<div className="mt-2 text-xs text-zinc-500">{message}</div>}</div>;
}
