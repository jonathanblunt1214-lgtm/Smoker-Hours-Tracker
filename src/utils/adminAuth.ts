// Master Admin & CharGPT Developer Guardrail Security System

export const MASTER_ADMIN_EMAIL = 'jonathanblunt1214@gmail.com';
export const AUTO_RELOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

export interface DeveloperOverrideSettings {
  allowed: boolean;
  unlockedAt?: string;
  developerNotes?: string;
  remainingSeconds?: number;
}

/**
 * Checks if the given email matches the Master Admin / App Developer credentials.
 */
export function isMasterAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Gets the list of authorized sub-admin emails.
 */
export function getSubAdmins(): string[] {
  try {
    const saved = localStorage.getItem('chargpt_sub_admins');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('Failed to parse sub admins:', e);
  }
  return [];
}

/**
 * Adds a new sub-admin (Master Admin only).
 */
export function addSubAdmin(masterEmail: string | null | undefined, newAdminEmail: string): boolean {
  if (!isMasterAdmin(masterEmail) || !newAdminEmail) return false;
  const current = getSubAdmins();
  const normalized = newAdminEmail.trim().toLowerCase();
  if (!current.includes(normalized) && normalized !== MASTER_ADMIN_EMAIL.toLowerCase()) {
    current.push(normalized);
    localStorage.setItem('chargpt_sub_admins', JSON.stringify(current));
    return true;
  }
  return false;
}

/**
 * Removes a sub-admin (Master Admin only).
 */
export function removeSubAdmin(masterEmail: string | null | undefined, removeAdminEmail: string): boolean {
  if (!isMasterAdmin(masterEmail) || !removeAdminEmail) return false;
  const current = getSubAdmins();
  const normalized = removeAdminEmail.trim().toLowerCase();
  const filtered = current.filter(email => email !== normalized);
  localStorage.setItem('chargpt_sub_admins', JSON.stringify(filtered));
  return true;
}

/**
 * Checks if a user is either a Master Admin or a granted Sub Admin.
 */
export function isAdminUser(email?: string | null): boolean {
  if (!email) return false;
  if (isMasterAdmin(email)) return true;
  return getSubAdmins().includes(email.trim().toLowerCase());
}

/**
 * Gets the remaining seconds before the developer override automatically relocks.
 * Returns 0 if locked or expired.
 */
export function getRemainingUnlockSeconds(currentUserEmail?: string | null): number {
  if (!isMasterAdmin(currentUserEmail)) return 0;

  try {
    const saved = localStorage.getItem('chargpt_dev_master_override');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.allowed && parsed.unlockedAt) {
        const unlockedAtMs = new Date(parsed.unlockedAt).getTime();
        const elapsedMs = Date.now() - unlockedAtMs;
        const remainingMs = AUTO_RELOCK_DURATION_MS - elapsedMs;
        return Math.max(0, Math.floor(remainingMs / 1000));
      }
    }
  } catch (e) {
    console.warn('Failed to parse developer override timer:', e);
  }

  return 0;
}

/**
 * Gets the stored CharGPT Developer Master Override configuration.
 * Automatically enforces 30-minute auto-relock expiration.
 * Only returns allowed = true if the user email is strictly jonathanblunt1214@gmail.com!
 */
export function getCharGPTDeveloperOverride(currentUserEmail?: string | null): DeveloperOverrideSettings {
  if (!isMasterAdmin(currentUserEmail)) {
    return { allowed: false, developerNotes: 'Strictly locked to jonathanblunt1214@gmail.com', remainingSeconds: 0 };
  }

  try {
    const saved = localStorage.getItem('chargpt_dev_master_override');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.allowed) {
        const remainingSec = getRemainingUnlockSeconds(currentUserEmail);
        if (remainingSec <= 0) {
          // Auto-relock expired permission!
          const relockedPayload = {
            allowed: false,
            developerNotes: 'Auto-relocked after 30 minutes of unlock duration.',
          };
          localStorage.setItem('chargpt_dev_master_override', JSON.stringify(relockedPayload));
          return { allowed: false, developerNotes: 'Auto-relocked after 30 minutes', remainingSeconds: 0 };
        }

        return {
          allowed: true,
          unlockedAt: parsed.unlockedAt || undefined,
          developerNotes: parsed.developerNotes || 'Developer Master Override active for testing',
          remainingSeconds: remainingSec,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to parse developer override settings:', e);
  }

  return { allowed: false, remainingSeconds: 0 };
}

/**
 * Saves the CharGPT Developer Master Override state (Only executable by Master Admin).
 * Sets unlockedAt timestamp for 30-minute auto-relock timer when enabled.
 */
export function setCharGPTDeveloperOverride(currentUserEmail: string | null | undefined, allowed: boolean): boolean {
  if (!isMasterAdmin(currentUserEmail)) {
    console.error('Unauthorized attempt to modify developer override settings!');
    return false;
  }

  const payload: DeveloperOverrideSettings = {
    allowed,
    unlockedAt: allowed ? new Date().toISOString() : undefined,
    developerNotes: allowed
      ? 'Master Developer prompt override granted (Auto-relocks in 30 minutes)'
      : 'Strict BBQ guardrails enforced',
  };

  localStorage.setItem('chargpt_dev_master_override', JSON.stringify(payload));
  return true;
}

/**
 * BBQ Topic Keywords & Concepts Validator
 * Validates whether a user prompt is BBQ / Smoker / Culinary Pitmaster related.
 */
const BBQ_RELATED_TERMS = [
  'bbq', 'barbecue', 'barbeque', 'smoke', 'smoker', 'grill', 'grilling', 'pellet', 'brisket',
  'pork butt', 'pulled pork', 'ribs', 'steak', 'chicken', 'turkey', 'turkey breast', 'sausage',
  'wings', 'jalapeno poppers', 'salmon', 'meat', 'beef', 'pork', 'poultry', 'game', 'venison',
  'elk', 'boar', 'bear', 'duck', 'goose', 'bison', 'tri-tip', 'pork belly', 'burnt ends',
  'rub', 'seasoning', 'marinade', 'glaze', 'sauce', 'mop', 'brine', 'wood', 'hickory',
  'oak', 'post oak', 'pecan', 'apple', 'cherry', 'mesquite', 'alder', 'maple', 'peach',
  'blend', 'btu', 'burn rate', 'hopper', 'firebox', 'baffle', 'gasket', 'nomex', 'blanket',
  'pid', 'controller', 'probe', 'thermometer', 'temp', 'temperature', 'stall', 'wrap',
  'butcher paper', 'foil', 'rest', 'collagen', 'bark', 'smoke ring', 'moisture', 'humidity',
  'ambient', 'sear', 'reverse sear', 'pitmaster', 'chargpt', 'cook log', 'smoke stack',
  'pit', 'cleaner', 'maintenance', 'ash', 'grease', 'drip tray', 'pellet sensor', 'igniter',
  'cold smoke', 'hot smoke', 'carolina', 'texas', 'kansas city', 'memphis', 'alabama white',
  'internal temp', 'usda', 'food safety', 'charcoal', 'lump', 'wood chips', 'wood chunks',
];

/**
 * Performs strict BBQ guardrail check on a user prompt.
 * Returns { isBBQ: boolean, reason?: string }
 */
export function validateBBQTopicConstraint(prompt: string, isDevOverride: boolean): { isBBQ: boolean; reason?: string } {
  // If Master Developer prompt override is active, bypass check
  if (isDevOverride) {
    return { isBBQ: true };
  }

  const cleanPrompt = prompt.toLowerCase().trim();
  if (!cleanPrompt) return { isBBQ: true };

  // Check if prompt contains any BBQ/Smoker keywords
  const containsBBQKeyword = BBQ_RELATED_TERMS.some((term) => cleanPrompt.includes(term));

  if (containsBBQKeyword) {
    return { isBBQ: true };
  }

  // Detect explicit non-BBQ topics (e.g. programming, stock market, general politics, math, etc.)
  const nonBBQPatterns = [
    /\b(code|python|javascript|typescript|react|html|css|sql|database|programming|developer|algorithm|bug|git)\b/i,
    /\b(stock|bitcoin|crypto|investment|finance|bank|mortgage|dollar|price|tax|market|shares)\b/i,
    /\b(president|election|politics|law|court|congress|senate|government)\b/i,
    /\b(calculus|physics|math|equation|homework|geography|history|astronomy|movie|song)\b/i,
  ];

  const matchesNonBBQ = nonBBQPatterns.some((pattern) => pattern.test(cleanPrompt));

  if (matchesNonBBQ || cleanPrompt.length > 20) {
    return {
      isBBQ: false,
      reason: 'Strict BBQ Guardrail Enforced: Query does not pertain to BBQ, smoking, grilling, meat science, or pitmaster advice.',
    };
  }

  // Fallback: Default to allowing ambiguous short prompts, but server handles final guardrail
  return { isBBQ: true };
}
