import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targetPath = path.join(root, 'server.secure.generated.ts');
let source = fs.readFileSync(targetPath, 'utf8');

function replaceRequired(input, needle, replacement, label) {
  if (!input.includes(needle)) throw new Error(`[chargpt-production] Required source pattern not found: ${label}`);
  return input.replace(needle, replacement);
}

// Cloud Run must listen on the port injected by the platform.
source = replaceRequired(
  source,
  'const PORT = 3000;',
  'const PORT = Number(process.env.PORT) || 3000;',
  'Cloud Run PORT support',
);

// Production CharGPT uses Cloud Run identity + Vertex AI. Local development can still use a standard API key.
source = replaceRequired(
  source,
  `function getGeminiClient() {\n  const apiKey = getGeminiApiKey();\n  if (!apiKey) {\n    return null;\n  }\n  return new GoogleGenAI({ apiKey });\n}`,
  `function getGeminiClient() {\n  const useVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true' || Boolean(process.env.K_SERVICE);\n  if (useVertex) {\n    const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;\n    const location = process.env.GOOGLE_CLOUD_LOCATION || 'global';\n    if (!project) {\n      console.error('Vertex AI project is not configured.');\n      return null;\n    }\n    return new GoogleGenAI({ vertexai: true, project, location });\n  }\n  const apiKey = getGeminiApiKey();\n  if (!apiKey) {\n    return null;\n  }\n  return new GoogleGenAI({ apiKey });\n}`,
  'Vertex AI production client',
);

const routeStart = source.indexOf('// CharGPT API Route Handler');
if (routeStart < 0) throw new Error('[chargpt-production] CharGPT route start not found.');
const routeEndCandidate = source.indexOf("app.post('/api/chargpt", routeStart + 40);
const routeEnd = routeEndCandidate > routeStart ? routeEndCandidate : source.length;
let route = source.slice(routeStart, routeEnd);

const evidencePolicy = `EVIDENCE AND PROVENANCE POLICY — MANDATORY:\n- VERIFIED: Use only when a claim is backed by an explicitly provided verified source record.\n- USER DATA: Use only for values actually present in the authenticated user's supplied SmokeStack context.\n- CALCULATED: Use only for deterministic calculations from VERIFIED or USER DATA inputs; show the inputs/assumptions.\n- ESTIMATED: Use for modeled estimates; state assumptions and never relabel an estimate as a manufacturer specification.\n- GENERAL GUIDANCE: Use for broadly applicable BBQ guidance that is not specific to this user's equipment.\n- UNVERIFIED: Use when a specific claim cannot be proven from provided context or verified retrieval.\n\nHard rules:\n1. Never invent or infer a smoker model, hopper size, burn rate, controller stability, modification state, saved preference, manufacturer specification, or user history that is not explicitly present in the request context.\n2. Never label a claim KNOWN or MFR SPECS. Use VERIFIED or USER DATA only when the evidence is actually present.\n3. If equipment-specific data is missing, say that it is not verified and ask for the missing smoker/profile detail only when needed.\n4. Do not convert model knowledge into a claim about this user's smoker. General knowledge must remain GENERAL GUIDANCE.\n5. Before returning an answer, self-check every equipment-specific number and personalization claim. Downgrade unsupported claims to ESTIMATED/GENERAL GUIDANCE/UNVERIFIED or remove them.\n6. Durable memory must not be updated from an unsupported or inferred claim.`;

route = replaceRequired(
  route,
  'const systemInstruction = `',
  `const systemInstruction = \`${evidencePolicy}\\n\\n\` + \``,
  'CharGPT evidence policy injection',
);
route = route.replace(
  'Gemini API key is not configured. Please set GEMINI_API_KEY in environment variables.',
  'CharGPT model access is not configured for this runtime.',
);

const firstResponseBlock = `    if (response?.text) {\n      const groundingChunks = (response.candidates?.[0] as any)?.groundingMetadata?.groundingChunks || [];\n      const searchEntryPoint = (response.candidates?.[0] as any)?.groundingMetadata?.searchEntryPoint?.renderedContent || '';\n\n      return res.json({\n        text: response.text,\n        groundingChunks,\n        searchEntryPoint,\n      });\n    }`;

const safeResponseBlock = `    if (response?.text) {\n      const groundingChunks = (response.candidates?.[0] as any)?.groundingMetadata?.groundingChunks || [];\n      const searchEntryPoint = (response.candidates?.[0] as any)?.groundingMetadata?.searchEntryPoint?.renderedContent || '';\n      const firstText = String(response.text || '');\n\n      const firstAnswerUnsafe =\n        /\\[(KNOWN|MFR SPECS)\\]/i.test(firstText) ||\n        /based on your saved preferences/i.test(firstText) ||\n        /(?:customized|tuned) to your .*smoker/i.test(firstText) ||\n        /your .{0,45}(?:hopper|burn rate|controller|smoker setup|active mods|efficiency rating)/i.test(firstText);\n\n      if (!firstAnswerUnsafe) {\n        return res.json({\n          text: firstText,\n          groundingChunks,\n          searchEntryPoint,\n          groundingStatus: 'accepted',\n        });\n      }\n\n      console.warn('CharGPT grounding rejected first answer; retrying with context-free safe grounding.');\n\n      const safeSystemInstruction = \`You are CharGPT, a BBQ cooking assistant. The previous draft was rejected because it contained unsupported personalized or equipment-specific claims.\n\nAnswer the user's original BBQ question again using ONLY the original question below. Do not use or infer any saved preference, smoker profile, hopper size, burn rate, controller stability, modification state, manufacturer specification, account history, or equipment-specific fact.\n\nAllowed evidence labels are only [GENERAL GUIDANCE], [ESTIMATED], [CALCULATED], [USER DATA], [VERIFIED], and [UNVERIFIED]. Never output [KNOWN] or [MFR SPECS]. Do not say \"your smoker\" unless the original user question itself explicitly provides the relevant smoker fact. If equipment-specific data would materially improve the answer, give useful general guidance first and then state what specific data is needed for personalization. Never claim that memory was updated.\`;
\n      try {\n        const safeResponse = await ai.models.generateContent({\n          model: getGeminiModel(),\n          contents: prompt || 'Provide safe general BBQ guidance.',\n          config: {\n            systemInstruction: safeSystemInstruction,\n          },\n        });\n\n        const safeText = String(safeResponse?.text || '');\n        const retryStillUnsafe =\n          !safeText ||\n          /\\[(KNOWN|MFR SPECS)\\]/i.test(safeText) ||\n          /based on your saved preferences/i.test(safeText) ||\n          /(?:customized|tuned) to your .*smoker/i.test(safeText) ||\n          /your .{0,45}(?:hopper|burn rate|controller|smoker setup|active mods|efficiency rating)/i.test(safeText);\n\n        if (!retryStillUnsafe) {\n          return res.json({\n            text: safeText,\n            groundingChunks: [],\n            searchEntryPoint: '',\n            groundingStatus: 'safe_retry',\n          });\n        }\n      } catch (safeRetryError: any) {\n        console.warn('CharGPT safe grounding retry failed:', safeRetryError?.message || safeRetryError);\n      }\n\n      return res.status(503).json({\n        error: 'CharGPT could not produce a grounded answer after a safe retry. No unverified answer was shown.',\n        availability: 'grounding_rejected',\n        groundingStatus: 'rejected_after_retry',\n      });\n    }`;

route = replaceRequired(
  route,
  firstResponseBlock,
  safeResponseBlock,
  'CharGPT safe grounding retry',
);

source = source.slice(0, routeStart) + route + source.slice(routeEnd);

// SmokeStack CharGPT production grounding firewall.
// Until verified knowledge pipelines publish provenance-bearing equipment data,
// legacy/default smoker specifications must not be treated as user truth.
const groundingFirewall = `
app.use('/api/chargpt', (req, res, next) => {
  const body = req.body ?? {};

  const hasTrustedProvenance = (value: any): boolean => {
    if (!value || typeof value !== 'object') return false;

    if (
      value.userEntered === true ||
      value.isVerified === true ||
      value.verified === true
    ) {
      return true;
    }

    const provenance =
      value.provenance ||
      value.sourceProvenance ||
      value.sourceMetadata;

    if (!provenance || typeof provenance !== 'object') {
      return false;
    }

    const status = String(
      provenance.status || provenance.verificationStatus || ''
    ).toLowerCase();

    const type = String(
      provenance.type || provenance.kind || provenance.origin || ''
    ).toLowerCase();

    return (
      status === 'verified' ||
      type === 'user' ||
      type === 'user_data' ||
      type === 'verified_manufacturer'
    );
  };

  const trustedSmokerProfile = hasTrustedProvenance(body.smokerProfile);
  const trustedEffectiveSpecs = hasTrustedProvenance(body.effectiveSpecs);

  if (!trustedSmokerProfile) {
    delete body.smokerProfile;
  }

  if (!trustedEffectiveSpecs) {
    delete body.effectiveSpecs;
  }

  const memoryApproved =
    body.charGPTMemory?.approved === true ||
    body.charGPTMemory?.approvalStatus === 'approved';

  if (!memoryApproved) {
    delete body.charGPTMemory;
  }

  req.body = body;

  const hasTrustedEquipment =
    trustedSmokerProfile || trustedEffectiveSpecs;

  const originalJson = res.json.bind(res);

  res.json = ((payload: any) => {
    const text =
      payload && typeof payload.text === 'string'
        ? payload.text
        : '';

    const forbiddenEvidenceLabel =
      /\\[(KNOWN|MFR SPECS)\\]/i.test(text);

    const unsupportedPreferenceClaim =
      /based on your saved preferences/i.test(text);

    const unsupportedEquipmentPersonalization =
      !hasTrustedEquipment &&
      (
        /(?:customized|tuned) to your .*smoker/i.test(text) ||
        /your .{0,45}(?:hopper|burn rate|controller|smoker setup|active mods|efficiency rating)/i.test(text)
      );

    if (
      forbiddenEvidenceLabel ||
      unsupportedPreferenceClaim ||
      unsupportedEquipmentPersonalization
    ) {
      res.statusCode = 503;

      return originalJson({
        error:
          'CharGPT grounding check rejected an answer containing unsupported equipment-specific claims. No unverified answer was shown.',
        availability: 'grounding_rejected',
        groundingStatus: 'rejected'
      });
    }

    return originalJson(payload);
  }) as any;

  next();
});
`;

source = source.replace(
  '// CharGPT API Route Handler',
  groundingFirewall + '\n// CharGPT API Route Handler'
);

fs.writeFileSync(targetPath, source, 'utf8');
console.log('[chargpt-production] Applied Cloud Run PORT, Vertex AI auth, strict CharGPT evidence policy, and safe grounding retry.');
