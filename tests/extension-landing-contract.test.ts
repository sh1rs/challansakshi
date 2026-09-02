import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ExtensionInformationPage } from '../components/public-beta/PublicInfoPage';
import { CURRENT_EXTENSION_RELEASE_STATE, evaluatePublicExtensionRelease } from '../lib/extension-release';

const pageSource = readFileSync(new URL('../app/extension/page.tsx', import.meta.url), 'utf8');
const infoSource = readFileSync(new URL('../components/public-beta/PublicInfoPage.tsx', import.meta.url), 'utf8');

describe('state-free extension information route', () => {
  it('imports only the information component and accepts no search or case state', () => {
    expect(pageSource).toMatch(/ExtensionInformationPage/);
    expect(pageSource).not.toMatch(/searchParams|URLSearchParams|case|envelope|capsule|extensionId|chrome\.|browser\./);
  });

  it('shows the complete web-independent safety boundary while release is closed', () => {
    expect(evaluatePublicExtensionRelease(CURRENT_EXTENSION_RELEASE_STATE).status).toBe('closed');
    const html = renderToStaticMarkup(createElement(ExtensionInformationPage));
    expect(html).toContain('complete web review works without the extension');
    expect(html).toContain('handled locally in your browser');
    expect(html).toContain('official service is the only intended recipient');
    expect(html).toContain('10 minutes');
    expect(html).toContain('protected identity, authentication, declaration, and submission fields');
    expect(html).toContain('does not submit');
    expect(html).toContain('On mobile or an unsupported browser');
    expect(html).toContain('not available for public installation');
    expect(html).not.toMatch(/Open approved store listing|Prepare fields|Chrome Web Store|sideload/i);
    expect(html).not.toContain('<a href="https://chromewebstore.google.com/');
  });

  it('derives any future acquisition solely from the release evaluator', () => {
    expect(infoSource).toMatch(/evaluatePublicExtensionRelease\(CURRENT_EXTENSION_RELEASE_STATE\)/);
    expect(infoSource).not.toMatch(/URLSearchParams|searchParams|window\.location|chrome\.runtime|postMessage/);
  });
});
