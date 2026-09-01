import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ChallanSakshiApp from '../components/ChallanSakshiApp';

const globalStyles = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

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
    expect(html).toContain('>Start fictional demo<');
    expect(html).toContain('>Review a real challan<');
    expect(html).toContain('>Open Test Lab<');
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
});
