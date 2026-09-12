import { getGeminiApiKey, getGeminiModel } from './geminiConfig';

export const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
export const NVIDIA_MODEL = 'meta/llama-3.1-70b-instruct';

// Bump whenever the disclosed processing changes: a different provider or
// endpoint, or a change to what account data is sent. A consent recorded
// against an older version no longer authorises sending account context.
export const CHARGPT_DISCLOSURE_VERSION = '2026-09-nvidia-1';

export function getCharGPTDisclosure(env: NodeJS.ProcessEnv = process.env) {
  return { version: CHARGPT_DISCLOSURE_VERSION, provider: getCharGPTHealth(env).provider };
}

// Consent is only current when it names both the disclosure the user actually
// read and the provider now in use, so switching providers re-gates the data.
export function hasCurrentCharGPTConsent(consent: unknown, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!consent || typeof consent !== 'object') return false;
  const recorded = consent as { version?: unknown; provider?: unknown };
  const disclosure = getCharGPTDisclosure(env);
  return recorded.version === disclosure.version && recorded.provider === disclosure.provider;
}

export function getCharGPTModel(env: NodeJS.ProcessEnv = process.env): string {
  return env.CHARGPT_PROVIDER?.trim().toLowerCase() === 'nvidia'
    ? env.CHARGPT_MODEL?.trim() || NVIDIA_MODEL : getGeminiModel(env);
}

export function getCharGPTHealth(env: NodeJS.ProcessEnv = process.env) {
  const provider = env.CHARGPT_PROVIDER?.trim().toLowerCase() || 'gemini';
  const vertex = (env.GOOGLE_GENAI_USE_VERTEXAI === 'true' || Boolean(env.K_SERVICE))
    && Boolean(env.GOOGLE_CLOUD_PROJECT || env.GCLOUD_PROJECT);
  const configured = provider === 'nvidia'
    ? Boolean(env.NVIDIA_API_KEY?.trim()) && (env.CHARGPT_BASE_URL?.trim() || NVIDIA_BASE_URL).replace(/\/+$/, '') === NVIDIA_BASE_URL
    : provider === 'gemini' && (vertex || Boolean(getGeminiApiKey(env)));
  return { provider: provider === 'nvidia' ? 'nvidia' : provider === 'gemini' ? (vertex ? 'Vertex' : 'Gemini') : 'unsupported',
    configured, status: configured ? 'configured' : 'not_configured', connectivity: 'not_checked' };
}

type Request = { model: string; contents: unknown; config?: { systemInstruction?: string; tools?: unknown[] } };

// The existing chat pipeline owns context, policy and answer validation. This
// adapter only transports its text; it cannot execute tools or persist data.
export function getCharGPTClient<T>(gemini: () => T, env: NodeJS.ProcessEnv = process.env, request: typeof fetch = fetch) {
  const provider = env.CHARGPT_PROVIDER?.trim().toLowerCase() || 'gemini';
  if (provider === 'gemini') return gemini();
  if (provider !== 'nvidia' || !getCharGPTHealth(env).configured) return null;
  return { models: { async generateContent(input: Request) {
    if (typeof input.contents !== 'string') {
      throw new Error('NVIDIA CharGPT currently supports text only. Remove the image attachment and retry.');
    }
    const messages = [
      ...(input.config?.systemInstruction ? [{ role: 'system', content: input.config.systemInstruction }] : []),
      { role: 'user', content: input.contents },
    ];
    try {
      const response = await request(`${NVIDIA_BASE_URL}/chat/completions`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000),
        headers: { Authorization: `Bearer ${env.NVIDIA_API_KEY!.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: getCharGPTModel(env), messages, max_tokens: 1024, stream: false }),
      });
      // Never surface upstream bodies, headers, request options or error objects.
      if (!response.ok) throw new Error('upstream_failure');
      const body = await response.json();
      const choice = body?.choices?.[0];
      const text = choice?.message?.content;
      if (choice?.finish_reason !== 'stop' || typeof text !== 'string' || !text.trim()) throw new Error('invalid_response');
      return { text, candidates: [] };
    } catch {
      throw new Error('NVIDIA CharGPT request failed. No provider response details were exposed.');
    }
  } } };
}
