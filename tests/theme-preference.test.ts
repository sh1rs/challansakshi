import { describe, expect, it } from 'vitest';
import {
  applyThemePreference,
  buildThemeBootScript,
  normalizeStoredTheme,
  readStoredTheme,
  THEME_ATTRIBUTE,
  THEME_HOOK_NAME,
  THEME_STORAGE_KEY,
} from '../lib/theme-preference';

function memoryStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  const writes: Array<[string, string]> = [];
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
      writes.push([key, value]);
    },
    writes,
  };
}

function attributeTarget() {
  const attributes = new Map<string, string>();
  return {
    setAttribute: (name: string, value: string) => {
      attributes.set(name, value);
    },
    attributes,
  };
}

describe('theme preference normalization', () => {
  it('treats only the exact string dark as dark and everything else as the light default', () => {
    expect(normalizeStoredTheme('dark')).toBe('dark');
    for (const value of ['light', '', null, undefined, 'DARK', 'Dark', 0, true, {}, 'dark ', 'auto']) {
      expect(normalizeStoredTheme(value), JSON.stringify(value)).toBe('light');
    }
  });

  it('reads the stored preference defensively and defaults to light on absence, junk, or storage failure', () => {
    expect(readStoredTheme(memoryStorage({ [THEME_STORAGE_KEY]: 'dark' }))).toBe('dark');
    expect(readStoredTheme(memoryStorage({ [THEME_STORAGE_KEY]: 'sepia' }))).toBe('light');
    expect(readStoredTheme(memoryStorage())).toBe('light');
    expect(readStoredTheme(null)).toBe('light');
    expect(readStoredTheme(undefined)).toBe('light');
    expect(
      readStoredTheme({
        getItem: () => {
          throw new Error('storage unavailable');
        },
        setItem: () => undefined,
      }),
    ).toBe('light');
  });
});

describe('theme preference application', () => {
  it('stamps the root attribute and persists the normalized choice only when storage is provided', () => {
    const target = attributeTarget();
    const storage = memoryStorage();
    expect(applyThemePreference('dark', target, storage)).toBe('dark');
    expect(target.attributes.get(THEME_ATTRIBUTE)).toBe('dark');
    expect(storage.writes).toEqual([[THEME_STORAGE_KEY, 'dark']]);

    const attributeOnly = attributeTarget();
    expect(applyThemePreference('light', attributeOnly)).toBe('light');
    expect(attributeOnly.attributes.get(THEME_ATTRIBUTE)).toBe('light');
  });

  it('still applies the in-tab attribute when the storage write throws', () => {
    const target = attributeTarget();
    const failing = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(applyThemePreference('dark', target, failing)).toBe('dark');
    expect(target.attributes.get(THEME_ATTRIBUTE)).toBe('dark');
  });

  it('normalizes an unexpected theme value to light instead of stamping junk on the document', () => {
    const target = attributeTarget();
    applyThemePreference('sepia' as unknown as 'light', target);
    expect(target.attributes.get(THEME_ATTRIBUTE)).toBe('light');
  });
});

describe('theme boot script contract', () => {
  const script = buildThemeBootScript();

  it('reads the dedicated device-preference key before paint and stamps dark only for an explicit stored dark', () => {
    expect(script).toContain(THEME_STORAGE_KEY);
    expect(script).toContain("stored === 'dark'");
    expect(script).toContain(`setAttribute('${THEME_ATTRIBUTE}', 'dark')`);
    expect(script).not.toContain("'light')} catch");
  });

  it('never writes storage on load: the only setItem sits inside the installed toggle hook', () => {
    const hookStart = script.indexOf(`window.${THEME_HOOK_NAME} = function`);
    expect(hookStart).toBeGreaterThan(-1);
    const beforeHook = script.slice(0, hookStart);
    const insideHook = script.slice(hookStart);
    expect(beforeHook).toContain('getItem');
    expect(beforeHook).not.toContain('setItem');
    expect(insideHook.match(/setItem/g)).toHaveLength(1);
  });

  it('wraps every storage access in try/catch and touches nothing beyond the document root and the one key', () => {
    expect(script.match(/try \{/g)?.length).toBeGreaterThanOrEqual(3);
    expect(script).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|document\.cookie|indexedDB|sessionStorage|serviceWorker|caches\./);
    expect(script).not.toMatch(/innerHTML|location\.|navigator\./);
    expect(script.match(/localStorage/g)).toHaveLength(2);
  });
});
