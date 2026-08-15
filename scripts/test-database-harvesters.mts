import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  extractCatalogCandidate,
  validateDatabaseSource,
} from '../server/databaseHarvesters';

test('approved domains are database-specific', () => {
  assert.equal(validateDatabaseSource('pellet', 'https://bearmountainbbq.com/products/hickory').sourceType, 'manufacturer');
  assert.equal(validateDatabaseSource('temperature', 'https://www.fsis.usda.gov/food-safety/safe-temperature-chart').sourceType, 'government');
  assert.equal(validateDatabaseSource('retailer_price', 'https://www.homedepot.com/p/example').sourceType, 'verified_publisher');
  assert.throws(
    () => validateDatabaseSource('temperature', 'https://example.com/unsafe-temperature-list'),
    /not approved/,
  );
});

test('recipe extraction retains source sentences instead of invented values', () => {
  const html = `<html><head><title>Official brisket method</title></head><body>
    Smoke the brisket over indirect heat at 250°F for 8 hours.
    Rest the brisket for 60 minutes before slicing.
  </body></html>`;
  const candidate = extractCatalogCandidate('recipe', html, 'https://www.beefitswhatsfordinner.com/recipes/test');
  assert.equal(candidate.title, 'Official brisket method');
  assert.ok(candidate.claims.some((claim) => claim.includes('250°F')));
  assert.ok(candidate.claims.some((claim) => claim.includes('60 minutes')));
});

test('retailer observations are timestamped and expire', () => {
  const html = `<html><head><title>Pellet bag</title></head><body>
    In stock today. 20 lb bag. Price $19.99.
  </body></html>`;
  const candidate = extractCatalogCandidate('retailer_price', html, 'https://www.homedepot.com/p/example');
  assert.equal(candidate.structuredSpecs.observedPriceUsd, 19.99);
  assert.equal(candidate.structuredSpecs.packageWeightLbs, 20);
  assert.equal(candidate.structuredSpecs.expiresAfterHours, 24);
});

test('harvested records cannot bypass OWNER review', async () => {
  const source = await readFile(new URL('../server/databaseHarvesters.ts', import.meta.url), 'utf8');
  const routes = await readFile(new URL('../server/databaseHarvesterRoutes.ts', import.meta.url), 'utf8');
  assert.match(source, /status: 'pending_review'/);
  assert.match(source, /verificationState: 'candidate_review_required'/);
  assert.doesNotMatch(source, /status: 'published'/);
  assert.match(routes, /requireAuth, requireAdmin/);
});
