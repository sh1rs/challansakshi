// Theme preference: opt-in dark mode with a light default.
//
// Privacy contract: nothing is written to storage until the person presses the
// theme toggle. The real-route components never touch storage themselves — the
// only storage access lives in the boot script below, which app/layout.tsx
// inlines outside the audited real-route import graph. Route components flip
// the root attribute through the installed window hook (or directly when the
// hook is unavailable) and never import this module.

export const THEME_STORAGE_KEY = 'challansakshi-theme-v1';
export const THEME_ATTRIBUTE = 'data-theme';
export const THEME_HOOK_NAME = '__challansakshiApplyTheme';

export type ThemePreference = 'light' | 'dark';

export interface ThemeDocumentTarget {
  setAttribute(name: string, value: string): void;
}

export interface ThemeStorageTarget {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Anything but the exact string 'dark' is the light default. */
export function normalizeStoredTheme(value: unknown): ThemePreference {
  return value === 'dark' ? 'dark' : 'light';
}

/** Read the stored preference; any storage failure or absence means light. */
export function readStoredTheme(storage: ThemeStorageTarget | null | undefined): ThemePreference {
  if (!storage) return 'light';
  try {
    return normalizeStoredTheme(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'light';
  }
}

/** Apply a preference to a document root; storage write only when storage is given. */
export function applyThemePreference(
  theme: ThemePreference,
  documentTarget: ThemeDocumentTarget,
  storage?: ThemeStorageTarget | null,
): ThemePreference {
  const normalized = normalizeStoredTheme(theme);
  documentTarget.setAttribute(THEME_ATTRIBUTE, normalized);
  if (storage) {
    try {
      storage.setItem(THEME_STORAGE_KEY, normalized);
    } catch {
      // Storage can be unavailable (private windows, blocked site data); the
      // in-tab attribute flip above already succeeded, so stay silent.
    }
  }
  return normalized;
}

/**
 * Pre-paint boot script inlined by the root layout. It reads the stored
 * preference before first paint (read only — it never writes on load), stamps
 * the root attribute only for an explicit dark choice, and installs the window
 * hook the header toggle calls to apply and persist a new choice.
 */
export function buildThemeBootScript(): string {
  return [
    '(function () {',
    '  try {',
    `    var key = '${THEME_STORAGE_KEY}';`,
    '    var stored = null;',
    '    try { stored = window.localStorage.getItem(key); } catch (readError) {}',
    `    if (stored === 'dark') { document.documentElement.setAttribute('${THEME_ATTRIBUTE}', 'dark'); }`,
    `    window.${THEME_HOOK_NAME} = function (theme) {`,
    "      var normalized = theme === 'dark' ? 'dark' : 'light';",
    `      document.documentElement.setAttribute('${THEME_ATTRIBUTE}', normalized);`,
    '      try { window.localStorage.setItem(key, normalized); } catch (writeError) {}',
    '    };',
    '  } catch (bootError) {}',
    '})();',
  ].join('\n');
}
