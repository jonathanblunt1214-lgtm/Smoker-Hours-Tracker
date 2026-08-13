import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../server/firebaseAdmin';

const submittedBy = process.env.SMOKESTACK_OWNER_UID || 'system-seed';

const starters = [
  {
    type: 'fuel',
    title: 'Pit Boss Classic Blend Hardwood Pellets - 40 lb',
    source: {
      url: 'https://www.pitboss-grills.com/collections/fuel/products/pit-boss-40-lb-classic-blend-hardwood-pellets',
      type: 'manufacturer',
      publisher: 'Pit Boss Grills',
    },
    claims: [
      'Product: Pit Boss Classic Blend Hardwood Pellets - 40 lb',
      'SKU: 55445',
      'Blend contains pecan, hickory, and mesquite wood',
      'Manufacturer says the blend complements chicken, pork, seafood, and vegetables',
      'Manufacturer states the pellets are free from added scents, sprays, chemicals, or glues',
      'Manufacturer states the pellets are compatible with wood pellet grills and pellet smokers',
    ],
  },
  {
    type: 'meat',
    title: 'USDA FSIS Safe Minimum Internal Temperatures',
    source: {
      url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart',
      type: 'government',
      publisher: 'USDA Food Safety and Inspection Service',
    },
    claims: [
      'Beef, pork, veal, and lamb steaks, chops, and roasts: minimum internal temperature 145°F with at least a 3-minute rest',
      'Ground meats: minimum internal temperature 160°F',
      'All poultry: minimum internal temperature 165°F',
      'Fish and shellfish: minimum internal temperature 145°F',
      'Leftovers: minimum internal temperature 165°F',
    ],
  },
  {
    type: 'mod',
    title: 'Pit Boss Competition Series Vertical Smoker Cover - 5-Series Compatibility',
    source: {
      url: 'https://www.pitboss-grills.com/products/competition-series-vertical-smoker-cover',
      type: 'manufacturer',
      publisher: 'Pit Boss Grills',
    },
    claims: [
      'Product: Pit Boss Competition Series Vertical Smoker Cover',
      'SKU: 32213',
      'Manufacturer states the cover is designed for Pit Boss 5-Series Vertical Smokers',
      'Cover uses durable polyester with PVC backing',
      'Manufacturer states the cover helps protect against rain, snow, wind, harsh sunlight, scratches, dust buildup, and water spots',
      'Manufacturer-listed cover dimensions are 28 inches wide by 29 inches deep by 54 inches high',
    ],
  },
] as const;

for (const starter of starters) {
  const existing = await adminDb.collection('verifiedKnowledge')
    .where('title', '==', starter.title)
    .limit(1)
    .get();

  if (!existing.empty) {
    console.log(`SKIP: ${starter.title} already exists as ${existing.docs[0].id}`);
    continue;
  }

  const ref = await adminDb.collection('verifiedKnowledge').add({
    type: starter.type,
    title: starter.title,
    claims: [...starter.claims],
    source: { ...starter.source, retrievedAt: new Date().toISOString() },
    status: 'pending_review',
    submittedBy,
    submittedAt: FieldValue.serverTimestamp(),
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
  });
  console.log(`ADDED: ${starter.title} -> ${ref.id} (pending_review)`);
}

console.log('Starter ingestion complete. No records were auto-published.');
