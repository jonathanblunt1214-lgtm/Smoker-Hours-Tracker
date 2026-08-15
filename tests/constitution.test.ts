import test from 'node:test';
import assert from 'node:assert/strict';
import { accountSyncLabel, charGPTAvailabilityLabel, maintenanceStatusLabel, CONSTITUTION_REVISION } from '../src/lib/constitution';

test('constitution revision is explicit', () => {
  assert.equal(CONSTITUTION_REVISION, 4);
});
test('signed-out users are never described as synchronized', () => {
  assert.equal(accountSyncLabel({ authenticated: false, online: true, state: 'synced' }), 'Sign in to sync');
});

test('network access alone is not described as grounded AI', () => {
  assert.equal(charGPTAvailabilityLabel({ online: true, authenticated: true, grounded: false }), 'Online — grounding not yet verified');
  assert.equal(charGPTAvailabilityLabel({ online: false, authenticated: true, grounded: false }), 'Offline — CharGPT unavailable');
});

test('maintenance has a truthful no-smoker state', () => {
  assert.equal(maintenanceStatusLabel({ hasSmoker: false, dueCount: 0 }), 'Select a smoker');
});
