import { adminDb } from './firebaseAdmin';
import { createHash } from 'node:crypto';
import { StructuredSpecMap } from './manufacturerSpecSchema';

type HarvestInput = { mode: 'url' | 'smoker' | 'fuel' | 'mod'; value: string };
type HarvestCandidate = {
  type: 'smoker' | 'fuel' | 'mod';
  title: string;
  publisher: string | null;
  sourceUrl: string;
  sourceType: 'manufacturer' | 'verified_publisher';
  claims: string[];
  structuredSpecs: StructuredSpecMap;
  sourceContentHash: string;
};

const MANUFACTURER_DOMAINS = ['pitboss-grills.com','traeger.com','campchef.com','recteq.com','weber.com','masterbuilt.com','greenmountaingrills.com','zgrills.com','charbroil.com','oklahomajoes.com'];

function clean(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function hostname(url: string): string { try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } }
function allowedHost(host: string): boolean { return MANUFACTURER_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`)); }
function textOnly(html: string): string { return html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g,' ').trim(); }
function titleFromHtml(html: string): string { return clean(html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || ''); }
function inferType(text: string, requested: HarvestInput['mode']): HarvestCandidate['type'] { if (requested !== 'url') return requested; const lower=text.toLowerCase(); if (/pellet|charcoal|wood chunk|wood chip|fuel/.test(lower)) return 'fuel'; if (/cover|shelf|rack|adapter|accessor|replacement|compatible/.test(lower)) return 'mod'; return 'smoker'; }

function extractClaims(text: string, type: HarvestCandidate['type']): string[] {
  const sentences=text.split(/(?<=[.!?])\s+/).map((s)=>s.trim()).filter(Boolean);
  const patterns=type==='fuel' ? [/pellet/i,/hardwood/i,/blend/i,/hickory/i,/mesquite/i,/pecan/i,/oak/i,/apple/i,/cherry/i,/compatible/i,/lb\b/i,/btu/i,/moisture/i,/ash/i]
    : type==='mod' ? [/compatible/i,/designed for/i,/cover/i,/rack/i,/shelf/i,/dimensions?/i,/material/i,/protect/i,/efficien/i,/stabil/i,/heat loss/i,/capacity/i]
    : [/model/i,/sku/i,/temperature/i,/pellet/i,/charcoal/i,/controller/i,/rack/i,/cooking area/i,/hopper/i,/insulation/i,/dimensions?/i,/burn rate/i,/efficien/i,/capacity/i];
  const claims:string[]=[]; for (const sentence of sentences) { if (sentence.length<18||sentence.length>320) continue; if (!patterns.some((p)=>p.test(sentence))) continue; const normalized=sentence.replace(/^[-•\s]+/,'').trim(); if (!claims.includes(normalized)) claims.push(normalized); if (claims.length>=24) break; } return claims;
}

function metric(text:string, sourceUrl:string, regex:RegExp, field:string, unit?:string): [string, any] | null {
  const match=text.match(regex); if (!match) return null; const raw=clean(match[1] || match[0]); if (!raw) return null;
  const numeric=Number(raw.replace(/,/g,'')); const value=Number.isFinite(numeric) && /^[-+]?\d[\d,.]*$/.test(raw) ? numeric : raw;
  return [field,{ value, unit:unit||null, evidence:clean(match[0]).slice(0,300), sourceUrl, status:'candidate' }];
}

function extractStructuredSpecs(text:string,type:HarvestCandidate['type'],sourceUrl:string,title:string):StructuredSpecMap {
  const specs:StructuredSpecMap={}; const add=(item:[string,any]|null)=>{ if(item&&!specs[item[0]]) specs[item[0]]=item[1]; };
  if(type==='smoker') {
    add(metric(title,sourceUrl,/^(.*?)(?:\s[-–|]|$)/,'brand'));
    add(metric(text,sourceUrl,/(?:model|model no\.?|model number)\s*[:#-]?\s*([A-Z0-9][A-Z0-9._/-]{2,})/i,'model'));
    add(metric(text,sourceUrl,/(?:fuel type|uses?)\s*[: -]?\s*(wood pellets|pellets|charcoal|wood splits|electric|gas)/i,'fuelType'));
    add(metric(text,sourceUrl,/(?:hopper capacity|pellet hopper)[^\d]{0,30}(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds)/i,'hopperCapacityLbs','lb'));
    add(metric(text,sourceUrl,/(?:bowl capacity|charcoal capacity)[^\d]{0,30}(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds)/i,'bowlCapacityLbs','lb'));
    add(metric(text,sourceUrl,/(?:cooking area|cooking space|cooking surface)[^\d]{0,40}([\d,]+)\s*(?:sq\.?\s*in|square inches|in²)/i,'cookingAreaSqIn','sq in'));
    add(metric(text,sourceUrl,/(?:baseline burn rate|pellet consumption)[^\d]{0,40}(\d+(?:\.\d+)?)\s*(?:lb|lbs)\s*\/?\s*(?:hr|hour)/i,'factoryBaselineBurnRateLbsHr','lb/hr'));
    add(metric(text,sourceUrl,/(?:high heat burn rate|maximum pellet consumption)[^\d]{0,40}(\d+(?:\.\d+)?)\s*(?:lb|lbs)\s*\/?\s*(?:hr|hour)/i,'factoryHighHeatBurnRateLbsHr','lb/hr'));
    add(metric(text,sourceUrl,/((?:double[- ]wall|single[- ]wall|insulated)[^.!?]{0,80}(?:steel|insulation|construction))/i,'insulationType'));
    add(metric(text,sourceUrl,/((?:digital|pid|wifi|wi-fi|dial)[^.!?]{0,80}(?:controller|control board|control panel))/i,'controllerType'));
    add(metric(text,sourceUrl,/((?:vertical|horizontal|offset|pellet|charcoal|cabinet)[^.!?]{0,50}(?:smoker|grill))/i,'category'));
  } else if(type==='fuel') {
    add(metric(title,sourceUrl,/^(.*?)(?:\s[-–|]|$)/,'brand'));
    add(metric(text,sourceUrl,/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds)\b/i,'bagWeightLbs','lb'));
    add(metric(text,sourceUrl,/(\d+(?:\.\d+)?)\s*(?:btu\/?lb|btu per lb)/i,'btuPerLb','BTU/lb'));
    add(metric(text,sourceUrl,/(\d+(?:\.\d+)?)\s*%\s*(?:moisture|moisture content)/i,'moisturePercent','%'));
    add(metric(text,sourceUrl,/(\d+(?:\.\d+)?)\s*%\s*(?:ash|ash content)/i,'ashPercent','%'));
    add(metric(text,sourceUrl,/((?:oak|hickory|mesquite|pecan|apple|cherry|maple|alder|hardwood)(?:\s*[,/&+]\s*(?:oak|hickory|mesquite|pecan|apple|cherry|maple|alder|hardwood))*)/i,'woodSpecies'));
    add(metric(text,sourceUrl,/((?:blend|mixture)[^.!?]{0,180})/i,'blendDescription'));
    add(metric(text,sourceUrl,/((?:compatible|designed|works)[^.!?]{0,180}(?:pellet smoker|pellet grill|grill|smoker))/i,'manufacturerCompatibility'));
  } else {
    add(metric(text,sourceUrl,/(?:adds?|additional)[^\d]{0,25}(\d+(?:\.\d+)?)\s*(?:lb|lbs)\s*(?:capacity)?/i,'capacityAddLbs','lb'));
    add(metric(text,sourceUrl,/(?:adds?|additional)[^\d]{0,25}([\d,]+)\s*(?:sq\.?\s*in|square inches)/i,'cookingAreaAddSqIn','sq in'));
    add(metric(text,sourceUrl,/(\d+(?:\.\d+)?)\s*%\s*(?:heat loss reduction|less heat loss|reduction in heat loss)/i,'heatLossReductionPct','%'));
    add(metric(text,sourceUrl,/((?:compatible|designed for|fits)[^.!?]{0,200})/i,'applicableSmokerTypes'));
    add(metric(text,sourceUrl,/((?:easy|moderate|advanced)[^.!?]{0,60}(?:install|installation|fabrication|bolt-on))/i,'difficultyLevel'));
  }
  return specs;
}

async function fetchHtml(url:string):Promise<{html:string;finalUrl:string}> { const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),12000); try { const response=await fetch(url,{redirect:'follow',signal:controller.signal,headers:{'user-agent':'SmokeStack Knowledge Harvester/0.2 (+admin-reviewed candidate ingestion)'}}); if(!response.ok) throw new Error(`Source returned HTTP ${response.status}.`); if(!(response.headers.get('content-type')||'').includes('text/html')) throw new Error('Source is not an HTML page.'); return {html:await response.text(),finalUrl:response.url||url}; } finally { clearTimeout(timeout); } }

async function findManufacturerUrl(query:string):Promise<string|null> { const snapshot=await adminDb.collection('verifiedKnowledge').where('status','==','published').limit(100).get(); const terms=query.toLowerCase().split(/\s+/).filter((v)=>v.length>=3); for(const doc of snapshot.docs){ const data:any=doc.data(); const url=clean(data?.source?.url); if(!url||!allowedHost(hostname(url))) continue; const haystack=[data?.title,...(Array.isArray(data?.claims)?data.claims:[])].join(' ').toLowerCase(); if(terms.some((term)=>haystack.includes(term))) return url; } return null; }

export async function harvestKnowledge(input:HarvestInput):Promise<HarvestCandidate> {
  const value=clean(input.value); if(!value) throw new Error('A URL, smoker model/name, fuel name, or modification name is required.');
  let sourceUrl=''; if(input.mode==='url'){ if(!/^https:\/\//i.test(value)) throw new Error('Manual URLs must use HTTPS.'); sourceUrl=value; } else { sourceUrl=await findManufacturerUrl(value)||''; if(!sourceUrl) throw new Error('No approved manufacturer source is known for that search term yet. Add a manufacturer URL first, then harvest it.'); }
  if(!allowedHost(hostname(sourceUrl))) throw new Error('Source domain is not on the approved manufacturer allowlist.');
  const {html,finalUrl}=await fetchHtml(sourceUrl); if(!allowedHost(hostname(finalUrl))) throw new Error('Source redirected outside the approved manufacturer allowlist.');
  const pageText=textOnly(html); const type=inferType(pageText,input.mode); const title=titleFromHtml(html)||value; const claims=extractClaims(pageText,type); const structuredSpecs=extractStructuredSpecs(pageText,type,finalUrl,title);
  if(claims.length===0 && Object.keys(structuredSpecs).length===0) throw new Error('No candidate claims or structured metrics could be extracted from this source. Nothing was saved.');
  const sourceContentHash = createHash('sha256').update(pageText).digest('hex');
  return { type,title,publisher:hostname(finalUrl),sourceUrl:finalUrl,sourceType:'manufacturer',claims,structuredSpecs,sourceContentHash };
}
