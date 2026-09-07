import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { getCharGPTClient, getCharGPTHealth, getCharGPTModel, NVIDIA_BASE_URL } from '../server/charGPTProvider';
import { getGeminiModel } from '../server/geminiConfig';

const env = { CHARGPT_PROVIDER: 'nvidia', CHARGPT_MODEL: 'test-model', NVIDIA_API_KEY: 'test-only-credential' };
const input = { model: 'ignored', contents: 'User question', config: { systemInstruction: 'Existing policy', tools: [{ googleSearch: {} }] } };

test('NVIDIA sends policy and user messages server-side with the CHARGPT model', async () => {
  let calls = 0;
  const client = getCharGPTClient(() => { throw new Error('Gemini must not run'); }, env, (async (url, init) => {
    calls++;
    assert.equal(url, `${NVIDIA_BASE_URL}/chat/completions`);
    assert.equal(init?.redirect, 'error');
    assert.ok(init?.signal instanceof AbortSignal);
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-only-credential');
    assert.deepEqual(JSON.parse(String(init?.body)), { model: 'test-model', messages: [
      { role: 'system', content: 'Existing policy' }, { role: 'user', content: 'User question' },
    ], max_tokens: 1024, stream: false });
    return Response.json({ choices: [{ message: { content: '[GENERAL GUIDANCE] Answer' }, finish_reason: 'stop' }] });
  }) as typeof fetch);
  assert.deepEqual(await client!.models.generateContent(input), { text: '[GENERAL GUIDANCE] Answer', candidates: [] });
  assert.equal(calls, 1);
});

test('NVIDIA configuration fails closed without keys, with unknown providers or alternate endpoints', () => {
  for (const invalid of [{ ...env, NVIDIA_API_KEY: ' ' }, { ...env, CHARGPT_BASE_URL: 'https://example.com/v1' }, { ...env, CHARGPT_PROVIDER: 'unknown' }]) {
    assert.equal(getCharGPTHealth(invalid).configured, false);
    assert.equal(getCharGPTClient(() => { throw new Error('No fallback'); }, invalid), null);
  }
  assert.equal(getCharGPTHealth({ ...env, K_SERVICE: 'cloud-run', NVIDIA_API_KEY: '' }).configured, false);
  assert.equal(getCharGPTHealth(env).connectivity, 'not_checked');
  assert.ok(!JSON.stringify(getCharGPTHealth(env)).includes(env.NVIDIA_API_KEY));
  assert.equal(getCharGPTModel(env), 'test-model');
  assert.equal(getGeminiModel(env), 'gemini-2.5-flash');
  const legacy = { models: {} };
  assert.equal(getCharGPTClient(() => legacy, {}), legacy);
});

test('NVIDIA failures, invalid JSON, empty or truncated responses never expose upstream material', async () => {
  for (const response of [new Response(env.NVIDIA_API_KEY, { status: 401 }), new Response('not json'),
    Response.json({ choices: [] }), Response.json({ choices: [{ message: { content: '' }, finish_reason: 'stop' }] }),
    Response.json({ choices: [{ message: { content: 'partial' }, finish_reason: 'length' }] })]) {
    const client = getCharGPTClient(() => null, env, (async () => response) as typeof fetch);
    await assert.rejects(() => client!.models.generateContent(input), (error: Error) => {
      assert.equal(error.message, 'NVIDIA CharGPT request failed. No provider response details were exposed.');
      return true;
    });
  }
  const client = getCharGPTClient(() => null, env, (async () => { throw new Error(env.NVIDIA_API_KEY); }) as typeof fetch);
  await assert.rejects(() => client!.models.generateContent(input), /No provider response details/);
});

test('text-only NVIDIA model rejects images before any request', async () => {
  const client = getCharGPTClient(() => null, env, (async () => { assert.fail('No image request'); }) as typeof fetch);
  await assert.rejects(() => client!.models.generateContent({ ...input, contents: { parts: [{ inlineData: {} }] } }), /text only/);
});

test('generated chat routes use provider adapter while preserving policy, auth and Gemini routes', () => {
  const source = fs.readFileSync('server.secure.generated.ts', 'utf8');
  const route = source.slice(source.indexOf('const handleCharGPTRequest ='), source.indexOf("app.post('/api/chargpt',"));
  assert.match(route, /getCharGPTClient\(getGeminiClient\)/);
  assert.match(route, /model: getCharGPTModel\(\)/);
  assert.doesNotMatch(route, /model: getGeminiModel\(\)/);
  assert.match(route, /CHARGPT_CONSTITUTION/);
  assert.match(source, /optionalAuth, hydrateAuthoritativeCharGPTContext, handleCharGPTRequest/);
  assert.match(source, /chargpt: getCharGPTHealth\(\)/);
  assert.match(source, /new GoogleGenAI\(\{ vertexai: true, project, location \}\)/);
});
