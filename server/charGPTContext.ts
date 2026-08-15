import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { adminDb } from './firebaseAdmin';
import { CHARGPT_CAPABILITIES, safeText, validateCharGPTAnswer } from './charGPTPolicy';

const MAX_HISTORY_RECORDS = 100;
const SAFE_ID = /^[A-Za-z0-9_-]{1,160}$/;

function approvedMemory(memory: any) {
  if (!memory || typeof memory !== 'object') return undefined;
  return {
    totalInteractions: Number(memory.totalInteractions) || 0,
    totalLogsAnalyzed: Number(memory.totalLogsAnalyzed) || 0,
    userName: safeText(memory.userName, 80) || undefined,
    learnedRules: Array.isArray(memory.learnedRules) ? memory.learnedRules.filter((rule: any) => rule && (rule.approvalStatus === 'approved' || (rule.source === 'user_taught' && rule.approvalStatus !== 'rejected'))).slice(0, 100).map((rule: any) => ({
      id: safeText(rule.id, 160), category: safeText(rule.category, 40), title: safeText(rule.title, 160), detail: safeText(rule.detail, 1_000), source: safeText(rule.source, 40), createdAt: safeText(rule.createdAt, 64), confidenceScore: Number.isFinite(rule.confidenceScore) ? rule.confidenceScore : undefined, sampleSize: Number.isFinite(rule.sampleSize) ? rule.sampleSize : undefined, approvalStatus: 'approved',
    })) : [],
    favoriteProteins: Array.isArray(memory.favoriteProteins) ? memory.favoriteProteins.map((v: unknown) => safeText(v, 100)).filter(Boolean).slice(0, 20) : [],
    preferredWoodTypes: Array.isArray(memory.preferredWoodTypes) ? memory.preferredWoodTypes.map((v: unknown) => safeText(v, 100)).filter(Boolean).slice(0, 20) : [],
    topTechniques: Array.isArray(memory.topTechniques) ? memory.topTechniques.map((v: unknown) => safeText(v, 160)).filter(Boolean).slice(0, 20) : [],
    approved: true,
  };
}

function sanitizeCook(log: any) {
  if (!log || typeof log !== 'object' || !log.id) return null;
  return {
    id: safeText(log.id, 160), title: safeText(log.title, 200), date: safeText(log.date, 64), updatedAt: safeText(log.updatedAt, 64), proteinType: safeText(log.proteinType, 80), proteinCut: safeText(log.proteinCut, 160), smokerId: safeText(log.smokerId, 160), smokerType: safeText(log.smokerType, 160), hoursLogged: Number.isFinite(log.hoursLogged) ? log.hoursLogged : undefined, fuelLbsConsumed: Number.isFinite(log.fuelLbsConsumed) ? log.fuelLbsConsumed : undefined, fuelType: safeText(log.fuelType, 160), seasoningRubs: safeText(log.seasoningRubs, 500), saucesGlazes: safeText(log.saucesGlazes, 500), finishedNotes: safeText(log.finishedNotes, 1_000), nextTimeNotes: safeText(log.nextTimeNotes, 1_000), wouldMakeAgain: typeof log.wouldMakeAgain === 'boolean' ? log.wouldMakeAgain : undefined, ratings: log.ratings && typeof log.ratings === 'object' ? log.ratings : undefined,
    temperatureReadings: Array.isArray(log.temperatureReadings) ? log.temperatureReadings.slice(-50).map((reading: any) => ({ time: safeText(reading?.time || reading?.recordedAt, 64), recordedAt: safeText(reading?.recordedAt, 64), cookingTemp: Number.isFinite(reading?.cookingTemp) ? reading.cookingTemp : undefined, meatTemp: Number.isFinite(reading?.meatTemp) ? reading.meatTemp : undefined, actionsTaken: safeText(reading?.actionsTaken, 500) })) : [],
  };
}

export async function hydrateAuthoritativeCharGPTContext(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const body = req.body && typeof req.body === 'object' ? { ...req.body } : {};
  for (const key of ['allCookLogs', 'cookContext', 'charGPTMemory', 'smokerProfile', 'effectiveSpecs', 'userAccount', 'userEmail']) delete body[key];
  body.prompt = safeText(body.prompt, 8_000);
  body.conversationHistory = Array.isArray(body.conversationHistory) ? body.conversationHistory.slice(-10).map((entry: any) => ({ role: entry?.role === 'assistant' ? 'assistant' : 'user', text: safeText(entry?.text, 2_000) })).filter((entry: any) => entry.text) : [];

  if (body.image) {
    const mimeType = safeText(body.image.mimeType, 80).toLowerCase();
    const data = String(body.image.data || '');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType) || data.length === 0 || data.length > 8_000_000 || !/^[A-Za-z0-9+/=]+$/.test(data)) {
      return res.status(400).json({ error: 'Unsupported or invalid image attachment.', availability: 'unavailable', capabilities: CHARGPT_CAPABILITIES });
    }
    body.image = { mimeType, data };
  }

  let context: any = { authenticated: false, source: 'general_guidance_only', cookRecordCount: 0, historyLimit: 0, exclusions: ['account_data', 'saved_memory', 'community_pool', 'equipment_control'] };
  if (req.user?.uid) {
    try {
      const userRef = adminDb.collection('users').doc(req.user.uid);
      const userSnap = await userRef.get();
      const account = userSnap.exists ? userSnap.data() || {} : {};
      const selectedCookId = safeText(body.selectedCookId, 160);
      let rawCooks: any[] = [];
      let scope = 'latest_authoritative_records';
      if (selectedCookId && selectedCookId !== 'ALL_LOGS' && SAFE_ID.test(selectedCookId)) {
        const selected = await userRef.collection('cookLogs').doc(selectedCookId).get();
        if (selected.exists) rawCooks = [{ id: selected.id, ...selected.data() }];
        scope = 'selected_authoritative_cook';
      } else {
        const snapshot = await userRef.collection('cookLogs').limit(MAX_HISTORY_RECORDS).get();
        rawCooks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      }
      const cooks = rawCooks.map(sanitizeCook).filter(Boolean);
      body.allCookLogs = cooks;
      body.cookContext = cooks.length === 1 ? cooks[0] : undefined;
      body.charGPTMemory = approvedMemory(account.charGPTMemory);
      body.smokerProfile = account.profile && typeof account.profile === 'object' ? { ...account.profile, userEntered: true, provenance: { type: 'user_data', status: 'verified_account_scope' } } : undefined;
      body.userAccount = account.userAccount && typeof account.userAccount === 'object' ? { name: safeText(account.userAccount.name, 80), title: safeText(account.userAccount.title, 80) } : undefined;
      context = { authenticated: true, source: 'firestore_authoritative_account', scope, cookRecordCount: cooks.length, historyLimit: scope === 'latest_authoritative_records' ? MAX_HISTORY_RECORDS : 1, memoryRuleCount: body.charGPTMemory?.learnedRules?.length || 0, loadedAt: new Date().toISOString(), exclusions: ['unapproved_memory', 'client_supplied_account_facts', 'community_pool', 'equipment_control'] };
    } catch (error) {
      console.error('[CharGPT] Authoritative context load failed', error);
      return res.status(503).json({ error: 'CharGPT could not verify your SmokeStack account context. No account-based answer was generated.', availability: 'context_unavailable', capabilities: CHARGPT_CAPABILITIES });
    }
  }

  body.charGPTContextMeta = context;
  req.body = body;
  const originalJson = res.json.bind(res);
  res.json = ((payload: any) => {
    if (payload && typeof payload.text === 'string') {
      const validation = validateCharGPTAnswer(payload.text);
      if (!validation.ok) {
        res.statusCode = 503;
        return originalJson({ error: 'CharGPT rejected an answer that overstated its evidence, safety, monitoring, or action capabilities. No unverified answer was shown.', availability: 'grounding_rejected', groundingStatus: validation.reason, capabilities: CHARGPT_CAPABILITIES, context });
      }
    }
    return originalJson({
      ...payload,
      availability: payload?.availability || (payload?.text ? 'available' : 'unavailable'),
      capabilities: CHARGPT_CAPABILITIES,
      context,
      generatedAt: payload?.text ? new Date().toISOString() : undefined,
    });
  }) as any;
  return next();
}
