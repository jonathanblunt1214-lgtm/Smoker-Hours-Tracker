import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebaseAdmin';

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

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

function allowedHost(host: string): boolean {
  return MANUFACTURER_DOMAINS.some(
    domain => host === domain || host.endsWith(`.${domain}`)
  );
}

function normalizeText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function fetchSource(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'SmokeStack Knowledge Revalidator/0.1',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html')) {
      throw new Error('Source is not HTML');
    }

    return {
      finalUrl: response.url || url,
      text: normalizeText(await response.text()),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function revalidatePublishedKnowledge(limit = 100) {
  const snapshot = await adminDb
    .collection('verifiedKnowledge')
    .where('status', '==', 'published')
    .limit(Math.max(1, Math.min(limit, 200)))
    .get();

  let checked = 0;
  let confirmed = 0;
  let driftDetected = 0;
  let failed = 0;

  for (const doc of snapshot.docs) {
    const data: any = doc.data();
    const sourceUrl = clean(data?.source?.url);
    const claims = Array.isArray(data?.claims)
      ? data.claims.map(clean).filter(Boolean)
      : [];

    if (
      !sourceUrl ||
      claims.length === 0 ||
      !allowedHost(hostname(sourceUrl))
    ) {
      continue;
    }

    checked += 1;

    try {
      const { finalUrl, text } = await fetchSource(sourceUrl);

      if (!allowedHost(hostname(finalUrl))) {
        throw new Error('Redirected outside approved source domains');
      }

      const missingClaims = claims.filter(
        (claim: string) =>
          !text.includes(
            claim.toLowerCase().replace(/\s+/g, ' ').trim()
          )
      );

      const status =
        missingClaims.length === 0
          ? 'confirmed'
          : 'drift_detected';

      if (status === 'confirmed') {
        confirmed += 1;
      } else {
        driftDetected += 1;
      }

      await doc.ref.set(
        {
          revalidation: {
            status,
            checkedAt: FieldValue.serverTimestamp(),
            sourceUrl: finalUrl,
            missingClaims,
            error: null,
          },
        },
        { merge: true }
      );
    } catch (error: any) {
      failed += 1;

      await doc.ref.set(
        {
          revalidation: {
            status: 'check_failed',
            checkedAt: FieldValue.serverTimestamp(),
            sourceUrl,
            missingClaims: [],
            error: clean(error?.message) || 'Source check failed',
          },
        },
        { merge: true }
      );
    }
  }

  return {
    checked,
    confirmed,
    driftDetected,
    failed,
  };
}
