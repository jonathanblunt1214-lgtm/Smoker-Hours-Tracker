export const TERMS_REVISION = '5';
export const TERMS_EFFECTIVE_DATE = '2026-08-15';
export const TERMS_ACCEPTANCE_KEY = 'pitmaster_terms_accepted_revision';

export function hasAcceptedCurrentTerms(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(TERMS_ACCEPTANCE_KEY) === TERMS_REVISION;
  } catch {
    return false;
  }
}

export function acceptCurrentTerms(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TERMS_ACCEPTANCE_KEY, TERMS_REVISION);
  window.localStorage.removeItem('pitmaster_terms_accepted');
}
