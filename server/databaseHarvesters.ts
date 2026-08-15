import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebaseAdmin';
import { harvestKnowledge } from './knowledgeHarvester';
import { harvestMeatKnowledge } from './meatKnowledgeHarvester';

export const DATABASE_KINDS = ['smoker', 'pellet', 'fuel', 'meat', 'temperature', 'mod', 'recipe', 'retailer_price'] as const;
export type DatabaseKind = typeof DATABASE_KINDS[number];

type Candidate = {
  databaseKind: DatabaseKind;
  type: 'smoker' | 'fuel' | 'meat' | 'temperature' | 'mod' | 'recipe' | 'retailer_price';
  title: string;
  publisher: string;
  sourceUrl: string;
  sourceType: 'manufacturer' | 'government' | 'verified_publisher';
  claims: string[];
  structuredSpecs: Record<string, unknown>;
  claimDetails?: unknown[];
};

const MANUFACTURERS = [
  'pitboss-grills.com', 'traeger.com', 'campchef.com', 'recteq.com', 'weber.com',
  'masterbuilt.com', 'greenmountaingrills.com', 'zgrills.com', 'charbroil.com',
  'oklahomajoes.com', 'yodersmokers.com', 'workhorsepits.com', 'millscale.co',
  'lonestargrillz.com', 'horizonbbqsmokers.com', 'kamadojoe.com',
];
const FUEL_MAKERS = [
  ...MANUFACTURERS, 'bearmountainbbq.com', 'bbqlumberjack.com', 'bbcharcoal.com',
  'jealousdevil.com', 'kingsford.com', 'royal-oak.com', 'cookinpellets.com',
];
const MEAT_AUTHORITIES = [
  'fsis.usda.gov', 'usda.gov', 'ciachef.edu', 'meat.tamu.edu',
  'beefitswhatsfordinner.com', 'pork.org',
];
const RETAILERS = [
  'amazon.com', 'homedepot.com', 'lowes.com', 'walmart.com', 'tractorsupply.com',
  'acehardware.com', 'bbqguys.com', 'academy.com', 'heb.com',
];

function clean(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function host(url: string): string {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); }
  catch { return ''; }
}
function matches(hostname: string, domains: string[]): boolean {
  return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}
function approvedDomains(kind: DatabaseKind): string[] {
  if (kind === 'smoker' || kind === 'mod') return MANUFACTURERS;
  if (kind === 'pellet' || kind === 'fuel') return FUEL_MAKERS;
  if (kind === 'meat' || kind === 'temperature' || kind === 'recipe') return MEAT_AUTHORITIES;
  return RETAILERS;
}
export function validateDatabaseSource(kind: DatabaseKind, sourceUrl: string): { host: string; sourceType: Candidate['sourceType'] } {
  if (!DATABASE_KINDS.includes(kind)) throw new Error('Unsupported SmokeStack database kind.');
  if (!/^https:\/\//i.test(sourceUrl)) throw new Error('Database sources must use HTTPS.');
  const hostname = host(sourceUrl);
  if (!hostname || !matches(hostname, approvedDomains(kind))) {
    throw new Error(`Source is not approved for the ${kind} database.`);
  }
  const sourceType = kind === 'meat' || kind === 'temperature' || kind === 'recipe'
    ? (hostname.endsWith('usda.gov') ? 'government' : 'verified_publisher')
    : kind === 'retailer_price' ? 'verified_publisher' : 'manufacturer';
  return { host: hostname, sourceType };
}
function textOnly(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
function titleFromHtml(html: string): string {
  return clean(
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
      || '',
  );
}
function evidenceSentence(text: string, index: number): string {
  const start = Math.max(0, text.lastIndexOf('.', index - 1) + 1);
  const end = text.indexOf('.', index);
  return text.slice(start, end < 0 ? Math.min(text.length, index + 280) : Math.min(text.length, end + 1)).trim().slice(0, 360);
}
function uniqueClaims(text: string, patterns: RegExp[], limit = 30): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/).map((value) => value.trim()).filter(Boolean);
  const claims: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length < 18 || sentence.length > 360 || !patterns.some((pattern) => pattern.test(sentence))) continue;
    if (!claims.includes(sentence)) claims.push(sentence);
    if (claims.length >= limit) break;
  }
  return claims;
}
async function fetchHtml(sourceUrl: string): Promise<{ html: string; finalUrl: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(sourceUrl, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'SmokeStack Database Harvester/0.03 (+source-backed candidate review)' },
    });
    if (!response.ok) throw new Error(`Source returned HTTP ${response.status}.`);
    if (!(response.headers.get('content-type') || '').includes('text/html')) throw new Error('Source is not an HTML page.');
    return { html: await response.text(), finalUrl: response.url || sourceUrl };
  } finally { clearTimeout(timeout); }
}

export function extractCatalogCandidate(kind: 'recipe' | 'retailer_price', html: string, sourceUrl: string): Pick<Candidate, 'title' | 'claims' | 'structuredSpecs'> {
  const text = textOnly(html);
  const title = titleFromHtml(html) || host(sourceUrl);
  if (kind === 'recipe') {
    const claims = uniqueClaims(text, [
      /\b(?:smoke|smoked|barbecue|grill|braise|roast)\b/i,
      /\b\d{2,3}\s*°?\s*F\b/i,
      /\b\d+(?:\.\d+)?\s*(?:minutes?|mins?|hours?|hrs?)\b/i,
      /\b(?:rest|wrap|season|rub|brine|marinade)\b/i,
    ], 40);
    if (!claims.length) throw new Error('No source-backed recipe or technique claims were extracted.');
    return { title, claims, structuredSpecs: { recordClass: 'recipe_candidate' } };
  }

  const claims: string[] = [];
  const price = text.match(/\$\s?(\d+(?:\.\d{2})?)/);
  const weight = text.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds)\b/i);
  const stockIndex = text.search(/\b(?:in stock|out of stock|available|unavailable)\b/i);
  if (price) claims.push(`Observed listed price: $${price[1]} — Evidence: ${evidenceSentence(text, price.index || 0)}`);
  if (weight) claims.push(`Observed package weight: ${weight[1]} lb — Evidence: ${evidenceSentence(text, weight.index || 0)}`);
  if (stockIndex >= 0) claims.push(`Observed availability language — Evidence: ${evidenceSentence(text, stockIndex)}`);
  if (!claims.length) throw new Error('No observable price, package weight, or availability claim was extracted.');
  return {
    title,
    claims,
    structuredSpecs: {
      observedPriceUsd: price ? Number(price[1]) : null,
      packageWeightLbs: weight ? Number(weight[1]) : null,
      observedAt: new Date().toISOString(),
      expiresAfterHours: 24,
      recordClass: 'retailer_observation',
    },
  };
}

function meatClaimText(claim: any): string {
  const unit = claim?.unit ? ` ${claim.unit}` : '';
  return `${claim?.kind || 'claim'}: ${claim?.value ?? ''}${unit} — Evidence: ${claim?.evidence || ''}`.trim();
}

export async function harvestDatabaseSource(kind: DatabaseKind, requestedUrl: string): Promise<Candidate> {
  const sourceUrl = clean(requestedUrl);
  const policy = validateDatabaseSource(kind, sourceUrl);

  if (kind === 'meat' || kind === 'temperature') {
    const candidate = await harvestMeatKnowledge({ sourceUrl });
    const details = kind === 'temperature'
      ? candidate.claims.filter((claim) => ['safety_temperature', 'culinary_target', 'rest_time'].includes(claim.kind))
      : candidate.claims;
    if (!details.length) throw new Error(`No ${kind} claims were extracted. Nothing was saved.`);
    return {
      databaseKind: kind,
      type: kind,
      title: candidate.title,
      publisher: candidate.publisher,
      sourceUrl: candidate.sourceUrl,
      sourceType: policy.sourceType,
      claims: details.map(meatClaimText),
      structuredSpecs: { recordClass: kind === 'temperature' ? 'temperature_guide_candidate' : 'meat_candidate' },
      claimDetails: details,
    };
  }

  if (kind === 'smoker' || kind === 'pellet' || kind === 'fuel' || kind === 'mod') {
    const requestedType = kind === 'pellet' ? 'fuel' : kind;
    const candidate = await harvestKnowledge({ mode: 'url', value: sourceUrl, typeHint: requestedType });
    return {
      databaseKind: kind,
      type: requestedType,
      title: candidate.title,
      publisher: candidate.publisher || policy.host,
      sourceUrl: candidate.sourceUrl,
      sourceType: policy.sourceType,
      claims: candidate.claims,
      structuredSpecs: {
        ...candidate.structuredSpecs,
        recordClass: kind === 'pellet' ? 'pellet_candidate' : `${kind}_candidate`,
      },
    };
  }

  const fetched = await fetchHtml(sourceUrl);
  validateDatabaseSource(kind, fetched.finalUrl);
  const extracted = extractCatalogCandidate(kind, fetched.html, fetched.finalUrl);
  return {
    databaseKind: kind,
    type: kind,
    title: extracted.title,
    publisher: host(fetched.finalUrl),
    sourceUrl: fetched.finalUrl,
    sourceType: policy.sourceType,
    claims: extracted.claims,
    structuredSpecs: extracted.structuredSpecs,
  };
}

function fingerprint(candidate: Candidate): string {
  return createHash('sha256').update(JSON.stringify({
    databaseKind: candidate.databaseKind,
    title: candidate.title,
    sourceUrl: candidate.sourceUrl,
    claims: candidate.claims,
    structuredSpecs: candidate.structuredSpecs,
  })).digest('hex');
}

export async function queueHarvestCandidate(kind: DatabaseKind, sourceUrl: string, submittedBy: string) {
  const candidate = await harvestDatabaseSource(kind, sourceUrl);
  const candidateFingerprint = fingerprint(candidate);
  const snapshot = await adminDb.collection('verifiedKnowledge').limit(1000).get();
  const duplicate = snapshot.docs.find((doc) => {
    const record: any = doc.data();
    if (record?.status === 'rejected') return false;
    if (record?.fingerprint === candidateFingerprint) return true;
    return clean(record?.source?.url) === candidate.sourceUrl
      && record?.databaseKind === candidate.databaseKind
      && createHash('sha256').update(JSON.stringify({
        databaseKind: record.databaseKind,
        title: record.title,
        sourceUrl: record.source?.url,
        claims: record.claims,
        structuredSpecs: record.structuredSpecs,
      })).digest('hex') === candidateFingerprint;
  });
  if (duplicate) return { ok: true, duplicate: true, id: duplicate.id, status: duplicate.data()?.status || 'unknown', candidate };

  const ref = await adminDb.collection('verifiedKnowledge').add({
    type: candidate.type,
    databaseKind: candidate.databaseKind,
    title: candidate.title,
    claims: candidate.claims,
    claimDetails: candidate.claimDetails || null,
    structuredSpecs: candidate.structuredSpecs,
    fingerprint: candidateFingerprint,
    source: {
      url: candidate.sourceUrl,
      type: candidate.sourceType,
      publisher: candidate.publisher,
      retrievedAt: new Date().toISOString(),
      harvested: true,
      harvester: 'database-catalog',
      constitutionPolicy: 'source-backed-candidate-owner-review-required',
    },
    status: 'pending_review',
    verificationState: 'candidate_review_required',
    submittedBy,
    submittedAt: FieldValue.serverTimestamp(),
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
  });
  return { ok: true, duplicate: false, id: ref.id, status: 'pending_review', candidate };
}

export async function registerHarvestSource(kind: DatabaseKind, sourceUrl: string, label: string, submittedBy: string) {
  validateDatabaseSource(kind, sourceUrl);
  const normalizedUrl = new URL(sourceUrl).toString();
  const id = createHash('sha256').update(`${kind}:${normalizedUrl}`).digest('hex').slice(0, 32);
  await adminDb.collection('harvestSources').doc(id).set({
    databaseKind: kind,
    sourceUrl: normalizedUrl,
    label: clean(label) || normalizedUrl,
    enabled: true,
    submittedBy,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { id, databaseKind: kind, sourceUrl: normalizedUrl };
}

export async function runRegisteredHarvesters(actor = 'scheduled-harvester') {
  const snapshot = await adminDb.collection('harvestSources').limit(500).get();
  const sources = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as any))
    .filter((source) => source.enabled === true && DATABASE_KINDS.includes(source.databaseKind));
  const results: any[] = [];
  for (const source of sources) {
    try {
      const result = await queueHarvestCandidate(source.databaseKind, source.sourceUrl, actor);
      await adminDb.collection('harvestSources').doc(source.id).set({
        lastRunAt: FieldValue.serverTimestamp(),
        lastRunStatus: result.duplicate ? 'unchanged' : 'candidate_created',
        lastCandidateId: result.id,
        lastError: null,
      }, { merge: true });
      results.push({ id: source.id, kind: source.databaseKind, ok: true, duplicate: result.duplicate, candidateId: result.id });
    } catch (error: any) {
      await adminDb.collection('harvestSources').doc(source.id).set({
        lastRunAt: FieldValue.serverTimestamp(),
        lastRunStatus: 'failed',
        lastError: clean(error?.message || error).slice(0, 500),
      }, { merge: true });
      results.push({ id: source.id, kind: source.databaseKind, ok: false, error: clean(error?.message || error) });
    }
  }
  return {
    sourceCount: sources.length,
    candidateCount: results.filter((result) => result.ok && !result.duplicate).length,
    unchangedCount: results.filter((result) => result.ok && result.duplicate).length,
    failureCount: results.filter((result) => !result.ok).length,
    results,
  };
}
