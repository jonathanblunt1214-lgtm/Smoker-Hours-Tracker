import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { CHARGPT_CAPABILITIES, CHARGPT_CONSTITUTION, safeText, validateCharGPTAnswer } from '../server/charGPTPolicy';
import { DEFAULT_GEMINI_MODEL, getGeminiApiKey, getGeminiModel } from '../server/geminiConfig';

test('Gemini configuration uses a stable model and consistent credential aliases', () => {
  assert.equal(DEFAULT_GEMINI_MODEL, 'gemini-2.5-flash');
  assert.equal(getGeminiModel({}), DEFAULT_GEMINI_MODEL);
  assert.equal(getGeminiModel({ CHARGPT_MODEL: 'gemini-legacy' }), 'gemini-legacy');
  assert.equal(getGeminiModel({ GEMINI_MODEL: ' gemini-custom ', CHARGPT_MODEL: 'gemini-legacy' }), 'gemini-custom');
  assert.equal(getGeminiApiKey({ GEMINI_API_KEY: ' primary ', GOOGLE_API_KEY: 'secondary' }), 'primary');
  assert.equal(getGeminiApiKey({ GEMINI_API_KEY: ' ', GOOGLE_API_KEY: ' fallback ' }), 'fallback');
  assert.equal(getGeminiApiKey({ GEMINI_API_KEY: 'MY_GEMINI_API_KEY' }), undefined);
});

test('capability states do not advertise unavailable actions', () => {
  assert.equal(CHARGPT_CAPABILITIES.recordActions.state, 'unavailable');
  assert.equal(CHARGPT_CAPABILITIES.equipmentControl.state, 'unavailable');
  assert.equal(CHARGPT_CAPABILITIES.communityPool.state, 'unavailable');
  assert.equal(CHARGPT_CAPABILITIES.learning.state, 'limited');
});

test('constitutional response validator rejects false action and monitoring claims', () => {
  for (const text of [
    'I saved that preference to your account.',
    'CharGPT is actively monitoring your brisket.',
    'This guarantees safe food.',
    'The exact finish time is 6:15 PM.',
    '[MFR SPECS] Your hopper is 20 lb.',
  ]) {
    assert.equal(validateCharGPTAnswer(text).ok, false, text);
  }
  assert.equal(validateCharGPTAnswer('[ESTIMATED] Check again in 30–45 minutes; this is not a guarantee.').ok, true);
});

test('untrusted text is bounded and control characters are removed', () => {
  assert.equal(safeText('  hello\u0000\nworld  ', 20), 'hello world');
  assert.equal(safeText('abcdefgh', 4), 'abcd');
});

test('generated runtime uses verified identity and authoritative context', () => {
  const server = fs.readFileSync('server.secure.generated.ts', 'utf8');
  assert.match(server, /hydrateAuthoritativeCharGPTContext/);
  assert.match(server, /req\.user\?\.role === 'owner'/);
  assert.match(server, /CHARGPT_CONSTITUTION/);
  assert.match(server, /model: getGeminiModel\(\)/);
  assert.doesNotMatch(server, /gemini-3\.6-flash/);
  assert.doesNotMatch(server, /isMasterAdminEmail && Boolean\(isDevOverride\)/);
  assert.doesNotMatch(server, /LEARNED_USER_NAME/);
  assert.doesNotMatch(server, /direct, full access to all details/);
  assert.ok(CHARGPT_CONSTITUTION.includes('Chat is read-only.'));
});

test('trusted client does not send account history as trusted request fields', () => {
  const client = fs.readFileSync('src/components/AIPitmasterModal.trusted.tsx', 'utf8');
  const requestStart = client.indexOf("fetch('/api/chargpt'");
  const requestEnd = client.indexOf('const data = await res.json()', requestStart);
  assert.ok(requestStart >= 0 && requestEnd > requestStart);
  const request = client.slice(requestStart, requestEnd);
  for (const forbidden of ['allCookLogs:', 'charGPTMemory,', 'smokerProfile:', 'effectiveSpecs,', 'userEmail:']) {
    assert.ok(!request.includes(forbidden), forbidden);
  }
  assert.match(request, /Authorization: `Bearer \$\{idToken\}`/);
  assert.match(request, /selectedCookId:/);
  assert.doesNotMatch(client, /Auto-Training Active \(Live Cloud Server Sync\)/);
  assert.doesNotMatch(client, /Force Re-Train ML Engine/);
});
