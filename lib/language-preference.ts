export const LANGUAGE_PREFERENCE_KEY = 'challansakshi-language-v1';
export function readLanguagePreference(): 'en' | 'hi' | null {
  try { const value = window.localStorage.getItem(LANGUAGE_PREFERENCE_KEY); return value === 'en' || value === 'hi' ? value : null; } catch { return null; }
}
export function saveLanguagePreference(language: 'en' | 'hi'): void {
  try { window.localStorage.setItem(LANGUAGE_PREFERENCE_KEY, language); } catch { /* A preference never blocks a guest review. */ }
}
