import { readFileSync } from 'node:fs';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ChallanSakshiApp, * as DemoModule from '../components/ChallanSakshiApp';

const globalStyles = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const demoSource = readFileSync(new URL('../components/ChallanSakshiApp.tsx', import.meta.url), 'utf8');

function mediaBlock(source: string, query: string) {
  const marker = `@media ${query}`;
  const blocks: string[] = [];
  let searchFrom = 0;
  while (searchFrom < source.length) {
    const markerIndex = source.indexOf(marker, searchFrom);
    if (markerIndex < 0) break;
    const openIndex = source.indexOf('{', markerIndex);
    let depth = 0;
    for (let index = openIndex; index < source.length; index += 1) {
      if (source[index] === '{') depth += 1;
      if (source[index] === '}') depth -= 1;
      if (depth === 0) {
        blocks.push(source.slice(openIndex + 1, index));
        searchFrom = index + 1;
        break;
      }
    }
  }
  return blocks.join('\n');
}

function ruleFor(source: string, selector: string) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => match[1].split(',').map((item) => item.trim()).includes(selector))
    .at(-1)?.[2] ?? '';
}

describe('synthetic demo mobile accessibility', () => {
  it('keeps the landing focused on one fictional comparison and three actions', () => {
    const html = renderToStaticMarkup(createElement(ChallanSakshiApp));

    expect(html).toContain('<h1>Does the photo show your vehicle?</h1>');
    expect(html).toContain('<a class="button button-primary" href="/demo/test-lab">Start the 90-second proof</a>');
    expect(html).toContain('>Explore the longer fictional walkthrough<');
    expect(html).toContain('>Review a real challan<');
    expect(html).not.toContain('>Start fictional demo<');
    expect(html).not.toContain('>Open Test Lab<');
    const heroActions = html.match(/<div class="hero-actions">([\s\S]*?)<\/div>/)?.[1] ?? '';
    expect(heroActions.match(/<(?:a|button)\b/g)).toHaveLength(3);
    expect(heroActions.match(/button-primary/g)).toHaveLength(1);
    expect(html).toContain('Fictional data only');
    expect(html).toContain('no uploads or government connection');
    expect(html).not.toContain('id="resolution-coverage"');
    expect(html).not.toContain('id="notice-preflight-title"');
    expect(html).not.toContain('Explore fictional issue routes');
  });

  it('keeps every audited landing action at least 48px tall at 320px', () => {
    const mobile = mediaBlock(globalStyles, '(max-width: 480px)');

    for (const selector of [
      '.brand-button',
      '.reading-options > summary',
      '.language-switch button',
      '.evidence-photo-placeholder .button',
      '.text-skip-button',
      '.real-help-band a',
      '.site-footer p a',
    ]) {
      expect(ruleFor(mobile, selector), selector).toMatch(/min-height:\s*48px/);
    }
  });

  it('keeps audited mobile demo controls at 16px', () => {
    const mobile = mediaBlock(globalStyles, '(max-width: 480px)');
    const compact = mediaBlock(globalStyles, '(max-width: 900px)');

    for (const selector of [
      '.language-switch button',
      '.evidence-photo-placeholder .button',
      '.text-skip-button',
      '.real-help-band a',
      '.site-footer p a',
    ]) {
      expect(ruleFor(mobile, selector), selector).toMatch(/font-size:\s*16px/);
    }

    expect(ruleFor(compact, '.reading-options > summary::before')).toMatch(/font-size:\s*16px/);
  });

  it('keeps the mobile synthetic and real-record safety lines at 16px', () => {
    const mobile = mediaBlock(globalStyles, '(max-width: 480px)');

    for (const selector of ['.microcopy', '.trust-line p', '.real-help-band p']) {
      expect(ruleFor(mobile, selector), selector).toMatch(/font-size:\s*16px/);
    }
  });

  it('keeps Simple Mode landing guidance aligned with the current actions in English and Hindi', () => {
    expect(demoSource).toContain('Start the fictional vehicle-photo comparison, or choose a real-record tool.');
    expect(demoSource).toContain('काल्पनिक वाहन-फ़ोटो तुलना शुरू करें या असली रिकॉर्ड टूल चुनें।');
    expect(demoSource).not.toContain('Choose a fictional message or demo case.');
    expect(demoSource).not.toContain('एक काल्पनिक संदेश या डेमो मामला चुनें।');
  });

  it('localizes the landing trust landmark for Hindi', () => {
    const html = renderToStaticMarkup(createElement(ChallanSakshiApp));

    expect(html).toContain('aria-label="Product safeguards"');
    expect(demoSource).toContain("aria-label={language === 'hi' ? 'उत्पाद सुरक्षा' : 'Product safeguards'}");
  });

  it('renders NoticePreflight only from the Demo Desk branch', () => {
    const landingHtml = renderToStaticMarkup(createElement(ChallanSakshiApp));
    const DemoDeskEntry = Reflect.get(DemoModule, 'DemoDeskEntry') as ComponentType<{
      language: 'en' | 'hi';
      onBack: () => void;
      onOpenRoute: () => void;
      onStartEvidence: () => void;
    }> | undefined;

    expect(DemoDeskEntry).toBeTypeOf('function');
    if (!DemoDeskEntry) return;

    const deskHtml = renderToStaticMarkup(createElement(DemoDeskEntry, {
      language: 'en',
      onBack: () => undefined,
      onOpenRoute: () => undefined,
      onStartEvidence: () => undefined,
    }));

    expect(landingHtml).not.toContain('id="notice-preflight-title"');
    expect(deskHtml).toContain('id="notice-preflight-title"');
    expect(deskHtml).toContain('<summary>Check a fictional notice for warning signs</summary>');
  });
});
