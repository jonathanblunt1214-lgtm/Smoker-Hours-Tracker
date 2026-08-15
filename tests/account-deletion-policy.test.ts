import test from 'node:test';
import assert from 'node:assert/strict';
import { isIdentifiableCommunitySubmission } from '../server/accountDeletionPolicy';

test('account deletion includes identifiable community submissions', () => {
  assert.equal(isIdentifiableCommunitySubmission({ provenanceClass: 'USER_ENTERED' }), true);
  assert.equal(isIdentifiableCommunitySubmission({ verificationScope: 'reviewed_community_observation' }), true);
});

test('account deletion does not classify independent manufacturer facts as user submissions', () => {
  assert.equal(isIdentifiableCommunitySubmission({
    provenanceClass: 'VERIFIED_SOURCE',
    verificationScope: 'manufacturer_stated_fact',
    source: { type: 'manufacturer' },
  }), false);
});
