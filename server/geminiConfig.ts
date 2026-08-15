export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

const configuredValue = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed !== 'MY_GEMINI_API_KEY' ? trimmed : undefined;
};

export function getGeminiApiKey(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return configuredValue(env.GEMINI_API_KEY) || configuredValue(env.GOOGLE_API_KEY);
}

export function getGeminiModel(env: NodeJS.ProcessEnv = process.env): string {
  return configuredValue(env.GEMINI_MODEL)
    || configuredValue(env.CHARGPT_MODEL)
    || DEFAULT_GEMINI_MODEL;
}
