import { adminDb } from './firebaseAdmin';

type HarvestInput = {
  mode: 'url' | 'smoker' | 'fuel' | 'mod';
  value: string;
};

type HarvestCandidate = {
  type: 'smoker' | 'fuel' | 'mod';
  title: string;
  publisher: string | null;
  sourceUrl: string;
  sourceType: 'manufacturer' | 'verified_publisher';
  claims: string[];
};

const MANUFACTURER_DOMAINS = [
  'pitboss-grills.com',
  'traeger.com',
  'campchef.com',
  'recteq.com',
  'weber.com',
  'masterbuilt.com',
  'greenmountaingrills.com',
  'zgrills.com',
  'charbroil.com',
  'oklahomajoes.com',
];

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function hostname(url: string): string {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; }
}

function allowedHost(host: string): boolean {
  return MANUFACTURER_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
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
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  return clean(og || title || '');
}

function inferType(text: string, requested: HarvestInput['mode']): HarvestCandidate['type'] {
  if (requested === 'smoker' || requested === 'fuel' || requested === 'mod') return requested;
  const lower = text.toLowerCase();
  if (/pellet|charcoal|wood chunk|wood chip|fuel/.test(lower)) return 'fuel';
  if (/cover|shelf|rack|adapter|accessor|replacement|compatible/.test(lower)) return 'mod';
  return 'smoker';
}

function extractClaims(text: string, type: HarvestCandidate['type']): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const patterns = type === 'fuel'
    ? [/pellet/i, /hardwood/i, /blend/i, /hickory/i, /mesquite/i, /pecan/i, /oak/i, /apple/i, /cherry/i, /compatible/i, /lb\b/i]
    : type === 'mod'
      ? [/compatible/i, /designed for/i, /cover/i, /rack/i, /shelf/i, /dimensions?/i, /material/i, /protect/i]
      : [/model/i, /sku/i, /temperature/i, /pellet/i, /charcoal/i, /controller/i, /rack/i, /cooking area/i, /hopper/i, /insulation/i, /dimensions?/i];

  const claims: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length < 18 || sentence.length > 260) continue;
    if (!patterns.some((pattern) => pattern.test(sentence))) continue;
    const normalized = sentence.replace(/^[-•\s]+/, '').trim();
    if (!claims.includes(normalized)) claims.push(normalized);
    if (claims.length >= 12) break;
  }
  return claims;
}

async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'SmokeStack Knowledge Harvester/0.1 (+admin-reviewed candidate ingestion)' },
    });
    if (!response.ok) throw new Error(`Source returned HTTP ${response.status}.`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) throw new Error('Source is not an HTML page.');
    const html = await response.text();
    return { html, finalUrl: response.url || url };
  } finally {
    clearTimeout(timeout);
  }
}

async function findManufacturerUrl(query: string): Promise<string | null> {
  const snapshot = await adminDb.collection('verifiedKnowledge').where('status', '==', 'published').limit(100).get();
  const terms = query.toLowerCase().split(/\s+/).filter((v) => v.length >= 3);
  for (const doc of snapshot.docs) {
    const data: any = doc.data();
    const url = clean(data?.source?.url);
    if (!url || !allowedHost(hostname(url))) continue;
    const haystack = [data?.title, ...(Array.isArray(data?.claims) ? data.claims : [])].join(' ').toLowerCase();
    if (terms.some((term) => haystack.includes(term))) return url;
  }
  return null;
}

export async function harvestKnowledge(input: HarvestInput): Promise<HarvestCandidate> {
  const value = clean(input.value);
  if (!value) throw new Error('A URL, smoker model/name, fuel name, or modification name is required.');

  let sourceUrl = '';
  if (input.mode === 'url') {
    if (!/^https:\/\//i.test(value)) throw new Error('Manual URLs must use HTTPS.');
    sourceUrl = value;
  } else {
    sourceUrl = await findManufacturerUrl(value) || '';
    if (!sourceUrl) throw new Error('No approved manufacturer source is known for that search term yet. Add a manufacturer URL first, then harvest it.');
  }

  const initialHost = hostname(sourceUrl);
  if (!allowedHost(initialHost)) throw new Error('Source domain is not on the approved manufacturer allowlist.');

  const { html, finalUrl } = await fetchHtml(sourceUrl);
  const finalHost = hostname(finalUrl);
  if (!allowedHost(finalHost)) throw new Error('Source redirected outside the approved manufacturer allowlist.');

  const pageText = textOnly(html);
  const type = inferType(pageText, input.mode);
  const title = titleFromHtml(html) || value;
  const claims = extractClaims(pageText, type);
  if (claims.length === 0) throw new Error('No candidate claims could be extracted from this source. Nothing was saved.');

  return {
    type,
    title,
    publisher: finalHost,
    sourceUrl: finalUrl,
    sourceType: 'manufacturer',
    claims,
  };
}
