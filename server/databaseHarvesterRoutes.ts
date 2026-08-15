import { Router } from 'express';
import { adminDb } from './firebaseAdmin';
import { AuthenticatedRequest, requireAdmin, requireAuth } from './authMiddleware';
import {
  DATABASE_KINDS,
  DatabaseKind,
  queueHarvestCandidate,
  registerHarvestSource,
  runRegisteredHarvesters,
  validateDatabaseSource,
} from './databaseHarvesters';

export const databaseHarvesterRouter = Router();

function clean(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function validKind(value: string): value is DatabaseKind {
  return (DATABASE_KINDS as readonly string[]).includes(value);
}
function serialize(doc: any) {
  const data = doc.data();
  const convert = (value: any) => value?.toDate?.()?.toISOString?.() || value || null;
  return {
    id: doc.id,
    ...data,
    createdAt: convert(data.createdAt),
    updatedAt: convert(data.updatedAt),
    lastRunAt: convert(data.lastRunAt),
  };
}

databaseHarvesterRouter.get('/database-harvesters', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const snapshot = await adminDb.collection('harvestSources').limit(500).get();
    const sources = snapshot.docs.map(serialize).sort((a: any, b: any) =>
      String(a.databaseKind).localeCompare(String(b.databaseKind)) || String(a.label).localeCompare(String(b.label)),
    );
    res.json({
      databaseKinds: DATABASE_KINDS,
      sources,
      policy: 'Official or approved sources create Pending Review candidates. Only OWNER review can publish.',
    });
  } catch (error: any) {
    res.status(503).json({ error: error?.message || 'Database harvester registry is unavailable.' });
  }
});

databaseHarvesterRouter.post('/database-harvesters', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const databaseKind = clean(req.body?.databaseKind);
  const sourceUrl = clean(req.body?.sourceUrl);
  const label = clean(req.body?.label);
  const harvestNow = req.body?.harvestNow !== false;
  if (!validKind(databaseKind) || !sourceUrl) {
    return res.status(400).json({ error: 'A supported databaseKind and HTTPS sourceUrl are required.' });
  }
  try {
    validateDatabaseSource(databaseKind, sourceUrl);
    const source = await registerHarvestSource(databaseKind, sourceUrl, label, req.user!.uid);
    const harvest = harvestNow ? await queueHarvestCandidate(databaseKind, source.sourceUrl, req.user!.uid) : null;
    return res.status(201).json({ ok: true, source, harvest });
  } catch (error: any) {
    return res.status(422).json({ error: error?.message || 'Database source could not be registered.' });
  }
});

databaseHarvesterRouter.post('/database-harvesters/:id/enabled', requireAuth, requireAdmin, async (req, res) => {
  try {
    const ref = adminDb.collection('harvestSources').doc(req.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists) return res.status(404).json({ error: 'Harvester source not found.' });
    await ref.set({ enabled: req.body?.enabled === true, updatedAt: new Date().toISOString() }, { merge: true });
    return res.json({ ok: true, id: req.params.id, enabled: req.body?.enabled === true });
  } catch (error: any) {
    return res.status(422).json({ error: error?.message || 'Harvester source could not be updated.' });
  }
});

databaseHarvesterRouter.post('/database-harvest', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const databaseKind = clean(req.body?.databaseKind);
  const sourceUrl = clean(req.body?.sourceUrl);
  if (!validKind(databaseKind) || !sourceUrl) {
    return res.status(400).json({ error: 'A supported databaseKind and HTTPS sourceUrl are required.' });
  }
  try {
    const result = await queueHarvestCandidate(databaseKind, sourceUrl, req.user!.uid);
    return res.status(result.duplicate ? 200 : 201).json(result);
  } catch (error: any) {
    return res.status(422).json({ error: error?.message || 'Database harvest failed. Nothing was published.' });
  }
});

databaseHarvesterRouter.post('/database-harvesters/run', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await runRegisteredHarvesters(req.user!.uid);
    return res.status(result.failureCount > 0 ? 207 : 200).json({ ok: result.failureCount === 0, ...result });
  } catch (error: any) {
    return res.status(503).json({ error: error?.message || 'Registered database harvesters failed.' });
  }
});
