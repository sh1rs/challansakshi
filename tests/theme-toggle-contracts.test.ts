import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitizenHeader } from '../components/shared/CitizenChrome';
import { THEME_STORAGE_KEY } from '../lib/theme-preference';

const chromeSource = readFileSync(new URL('../components/shared/CitizenChrome.tsx', import.meta.url), 'utf8');
const layoutSource = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
const globalStyles = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const privacySource = readFileSync(new URL('../components/public-beta/PublicInfoPage.tsx', import.meta.url), 'utf8');

function header(language: 'en' | 'hi', englishOnly = false) {
  return renderToStaticMarkup(
    createElement(CitizenHeader, { language, setLanguage: () => undefined, englishOnly }),
  );
}

describe('theme toggle header contract', () => {
  it('renders a light-default Dark mode toggle in the shared header with pressed-button semantics', () => {
    const html = header('en');
    expect(html).toContain('Dark mode');
    expect(html).toMatch(/aria-pressed="false"[^>]*>Dark mode</);
    expect(html).toMatch(/<button[^>]*type="button"[^>]*>Dark mode</);
  });

  it('labels the toggle in Hindi when the page language is Hindi', () => {
    const html = header('hi');
    expect(html).toContain('डार्क मोड');
    expect(html).toMatch(/aria-pressed="false"[^>]*>डार्क मोड</);
  });

  it('keeps the toggle available on English-only safety-beta headers', () => {
    const html = header('en', true);
    expect(html).toContain('English-only safety beta');
    expect(html).toContain('Dark mode');
  });

  it('keeps the shared header free of storage authority: persistence goes through the layout-installed hook', () => {
    expect(chromeSource).not.toMatch(/localStorage\.|sessionStorage\.|document\.cookie|indexedDB|caches\.|serviceWorker/);
    expect(chromeSource).toContain('__challansakshiApplyTheme');
    expect(chromeSource).toContain('useSyncExternalStore(subscribeToTheme, readDarkTheme, readServerDarkTheme)');
    expect(chromeSource).toContain("function readServerDarkTheme() {\n  return false;\n}");
  });
});

describe('theme boot wiring contract', () => {
  it('inlines the pre-paint boot script in the root layout and suppresses the expected hydration diff', () => {
    expect(layoutSource).toContain('buildThemeBootScript');
    expect(layoutSource).toContain('suppressHydrationWarning');
    expect(layoutSource).toMatch(/<script dangerouslySetInnerHTML=\{\{ __html: buildThemeBootScript\(\) \}\} \/>/);
  });

  it('keeps the dedicated device-preference key stable', () => {
    expect(THEME_STORAGE_KEY).toBe('challansakshi-theme-v1');
  });
});

describe('theme stylesheet contract', () => {
  it('defines the dark theme only behind the explicit opt-in attribute, never behind the system preference', () => {
    expect(globalStyles).toMatch(/:root\[data-theme=(?:'|")dark(?:'|")\]/);
    expect(globalStyles).not.toMatch(/prefers-color-scheme/);
  });

  it('pairs color-scheme declarations so native controls follow each theme', () => {
    expect(globalStyles).toMatch(/color-scheme:\s*light/);
    expect(globalStyles).toMatch(/color-scheme:\s*dark/);
  });

  it('redefines the core ground and ink tokens for dark instead of restyling components', () => {
    const darkBlock = globalStyles.slice(globalStyles.search(/:root\[data-theme=(?:'|")dark(?:'|")\]/));
    for (const token of ['--paper:', '--card:', '--ink:', '--muted:', '--teal:', '--focus:']) {
      expect(darkBlock, token).toContain(token);
    }
  });

  it('keeps simulated paper records paper-light in both themes', () => {
    expect(globalStyles).toMatch(/\.document-preview\s*\{[^}]*#f5f0df/);
    expect(globalStyles).toMatch(/\.photo-plate\s*\{[^}]*rgb\(255 252 230/);
  });
});

describe('theme privacy disclosure contract', () => {
  it('discloses the single-word device preference on the privacy page in English and Hindi', () => {
    expect(privacySource).toContain('Pressing the Dark mode toggle stores one device display preference in this browser: a single word, dark or light.');
    expect(privacySource).toContain('डार्क मोड बटन दबाने पर इस ब्राउज़र में केवल एक डिवाइस प्रदर्शन वरीयता सहेजी जाती है: एक ही शब्द, dark या light।');
  });
});
