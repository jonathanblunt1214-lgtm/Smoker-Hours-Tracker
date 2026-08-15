import test from 'node:test';
import assert from 'node:assert/strict';
import { CONSTITUTION_REVISION, CONSTITUTION_RULES } from '../src/lib/constitution';
import { TERMS_REVISION } from '../src/lib/terms';

test('terms and Constitution use the same acceptance revision', () => {
  assert.equal(TERMS_REVISION, String(CONSTITUTION_REVISION));
});

test('user data ownership is a required runtime rule', () => {
  assert.equal(CONSTITUTION_RULES.userDataAlwaysBelongsToUser, true);
});
