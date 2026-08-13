import { adminDb } from './firebaseAdmin';

export type MeatHarvestInput = { sourceUrl: string };
export type MeatClaimKind = 'identity'|'anatomy'|'safety_temperature'|'rest_time'|'cooking_method'|'culinary_target'|'description';
export type MeatClaim = { kind: MeatClaimKind; value: string|number; unit?: string; evidence: string; sourceUrl: string; status: 'candidate' };
export type MeatHarvestCandidate = { type:'meat_cut'; title:string; publisher:string; sourceUrl:string; sourceType:'government'|'culinary_education'|'university_extension'|'approved_primary'; claims:MeatClaim[]; verificationState:'candidate_review_required'; harvestedAt:string };

const APPROVED_SOURCES: Array<{domain:string; sourceType:MeatHarvestCandidate['sourceType']}> = [
  {domain:'fsis.usda.gov',sourceType:'government'},
  {domain:'usda.gov',sourceType:'government'},
  {domain:'ciachef.edu',sourceType:'culinary_education'},
  {domain:'meat.tamu.edu',sourceType:'university_extension'},
  {domain:'beefitswhatsfordinner.com',sourceType:'approved_primary'},
  {domain:'pork.org',sourceType:'approved_primary'},
];

function clean(v:unknown){return typeof v==='string'?v.trim():'';}
function host(url:string){try{return new URL(url).hostname.toLowerCase().replace(/^www\./,'');}catch{return '';}}
function sourcePolicy(h:string){return APPROVED_SOURCES.find(s=>h===s.domain||h.endsWith(`.${s.domain}`))||null;}
function textOnly(html:string){return html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g,' ').trim();}
function title(html:string){return clean(html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]||html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]||'');}
function sentenceEvidence(text:string, index:number){const left=Math.max(0,text.lastIndexOf('.',index-1)+1); const right=text.indexOf('.',index); return text.slice(left,right<0?Math.min(text.length,index+260):Math.min(text.length,right+1)).trim().slice(0,320);}
function add(claims:MeatClaim[],kind:MeatClaimKind,value:string|number,evidence:string,sourceUrl:string,unit?:string){if(!evidence||claims.some(c=>c.kind===kind&&c.value===value))return; claims.push({kind,value,unit,evidence,sourceUrl,status:'candidate'});}

function extractClaims(text:string, sourceUrl:string):MeatClaim[]{
  const claims:MeatClaim[]=[];
  const tempPatterns=[
    {re:/(?:minimum internal temperature|safe minimum internal temperature|internal temperature)[^\d]{0,50}(\d{2,3})\s*°?\s*F/ig,kind:'safety_temperature' as const},
    {re:/(?:target|finish|finished|pull)[^\d]{0,35}(\d{2,3})\s*°?\s*F/ig,kind:'culinary_target' as const},
  ];
  for(const p of tempPatterns){let m:RegExpExecArray|null; while((m=p.re.exec(text))){add(claims,p.kind,Number(m[1]),sentenceEvidence(text,m.index),sourceUrl,'°F');}}
  let m:RegExpExecArray|null;
  const rest=/(?:rest|stand)[^\d]{0,30}(\d+)\s*(?:minutes?|mins?)/ig; while((m=rest.exec(text))) add(claims,'rest_time',Number(m[1]),sentenceEvidence(text,m.index),sourceUrl,'min');
  const methods:[RegExp,string][]=[[/\blow[- ]and[- ]slow\b|\blow and slow\b/i,'barbecue'],[/\bsmok(?:e|ed|ing)\b/i,'smoking'],[/\bgrill(?:ed|ing)?\b/i,'grilling'],[/\bindirect (?:heat|grill(?:ing)?)\b/i,'indirect_grilling'],[/\bbrais(?:e|ed|ing)\b/i,'braising']];
  for(const [re,value] of methods){const hit=text.search(re); if(hit>=0)add(claims,'cooking_method',value,sentenceEvidence(text,hit),sourceUrl);}
  const imps=/(?:IMPS|NAMP)\s*(?:No\.?\s*)?(\d+[A-Z]?)/ig; while((m=imps.exec(text))) add(claims,'identity',`IMPS ${m[1].toUpperCase()}`,sentenceEvidence(text,m.index),sourceUrl);
  const muscle=/\b(?:pectoralis|serratus|infraspinatus|supraspinatus|biceps femoris|tensor fasciae latae|longissimus dorsi)\b/ig; while((m=muscle.exec(text))) add(claims,'anatomy',m[0],sentenceEvidence(text,m.index),sourceUrl);
  return claims.slice(0,40);
}

async function fetchHtml(url:string){const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),12000); try{const r=await fetch(url,{redirect:'follow',signal:controller.signal,headers:{'user-agent':'SmokeStack Meat Knowledge Harvester/0.1 (+candidate ingestion; human review required)'}}); if(!r.ok)throw new Error(`Source returned HTTP ${r.status}.`); if(!(r.headers.get('content-type')||'').includes('text/html'))throw new Error('Source is not an HTML page.'); return {html:await r.text(),finalUrl:r.url||url};}finally{clearTimeout(timeout);}}

export async function harvestMeatKnowledge(input:MeatHarvestInput):Promise<MeatHarvestCandidate>{
  const sourceUrl=clean(input.sourceUrl); if(!/^https:\/\//i.test(sourceUrl))throw new Error('Meat harvesting requires an HTTPS source URL.');
  const initial=sourcePolicy(host(sourceUrl)); if(!initial)throw new Error('Source is not on the approved meat-knowledge allowlist.');
  const {html,finalUrl}=await fetchHtml(sourceUrl); const policy=sourcePolicy(host(finalUrl)); if(!policy)throw new Error('Source redirected outside the approved allowlist.');
  const pageText=textOnly(html); const claims=extractClaims(pageText,finalUrl); if(!claims.length)throw new Error('No claim-scoped meat facts were extracted. Nothing was saved.');
  const candidate:MeatHarvestCandidate={type:'meat_cut',title:title(html)||host(finalUrl),publisher:host(finalUrl),sourceUrl:finalUrl,sourceType:policy.sourceType,claims,verificationState:'candidate_review_required',harvestedAt:new Date().toISOString()};
  await adminDb.collection('knowledgeHarvestCandidates').add({...candidate,constitutionAmendment:'docs/constitution/AMENDMENT-BBQ-VS-GRILLING.md'});
  return candidate;
}
