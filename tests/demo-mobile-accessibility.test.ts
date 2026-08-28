import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

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
  it('keeps every audited landing action at least 48px tall at 320px', () => {
    const mobile = mediaBlock(globalStyles, '(max-width: 480px)');

    for (const selector of [
      '.brand-button',
      '.reading-options > summary',
      '.language-switch button',
      '.evidence-photo-placeholder .button',
      '.text-skip-button',
      '.public-service-boundary a',
      '.breadth-heading > div:last-child > button',
      '.site-footer p a',
    ]) {
      expect(ruleFor(mobile, selector), selector).toMatch(/min-height:\s*48px/);
    }
  });

  it('keeps audited mobile demo controls at 16px', () => {
    const mobile = mediaBlock(globalStyles, '(max-width: 480px)');

    for (const selector of [
      '.language-switch button',
      '.reading-options > summary',
      '.evidence-photo-placeholder .button',
      '.text-skip-button',
      '.public-service-boundary a',
      '.breadth-heading > div:last-child > button',
      '.site-footer p a',
    ]) {
      expect(ruleFor(mobile, selector), selector).toMatch(/font-size:\s*16px/);
    }
  });
});
