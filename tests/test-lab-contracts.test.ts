import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SyntheticTestLabApp from '../components/test-lab/SyntheticTestLabApp';

const componentSource = readFileSync(
  new URL('../components/test-lab/SyntheticTestLabApp.tsx', import.meta.url),
  'utf8',
);
const styles = readFileSync(
  new URL('../components/test-lab/SyntheticTestLabApp.module.css', import.meta.url),
  'utf8',
);
const demoSource = readFileSync(
  new URL('../components/ChallanSakshiApp.tsx', import.meta.url),
  'utf8',
);

function mediaBlock(source: string, query: string) {
  const marker = `@media ${query}`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return '';
  const openIndex = source.indexOf('{', markerIndex);
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(openIndex + 1, index);
  }
  return '';
}

function ruleFor(source: string, selector: string) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => match[1].split(',').map((item) => item.trim()).includes(selector))
    .at(-1)?.[2] ?? '';
}

describe('synthetic Test Lab product contract', () => {
  it('renders ten fully clickable fictional cases inside the shared demo boundary', () => {
    const html = renderToStaticMarkup(createElement(SyntheticTestLabApp));

    expect(html).toContain('data-product-mode="demo"');
    expect(html).toContain('Synthetic Evidence Test Lab');
    expect(html).toContain('10 fictional cases');
    expect(html.match(/data-test-case=/g)).toHaveLength(10);
    expect(html).toContain('Run all 10 cases');
    expect(html).toContain('English-only safety beta');
    expect(html).toContain('Nothing is filed, paid, authenticated, or sent to a government system');
  });

  it('makes the Evidence → Explain → Verify → Act sequence explicit without a tall guided header', () => {
    const html = renderToStaticMarkup(createElement(SyntheticTestLabApp));

    for (const phase of ['Evidence', 'Explain', 'Verify', 'Act']) expect(html).toContain(`>${phase}<`);
    expect(html).toContain('Review every source value before comparison');
    expect(html).not.toContain('STEP 1 OF 6');
  });

  it('does not reveal a selected-case engine finding before the human confirmation gate', () => {
    const html = renderToStaticMarkup(createElement(SyntheticTestLabApp));

    expect(componentSource).not.toContain('compareSyntheticEvidence(testCase.extraction)');
    expect(html).toContain('Human confirmation required');
    expect(html).not.toMatch(/Engine\s*<b>Potential discrepancy<\/b>/);
  });

  it('renders every record fact that can enter the action pack before confirmation', () => {
    const html = renderToStaticMarkup(createElement(SyntheticTestLabApp));

    for (const field of ['challan_number', 'issue_date', 'alleged_offence', 'amount']) {
      expect(html).toContain(`data-record-detail="${field}"`);
    }
    expect(html).toContain('Record facts used in the action pack');
    expect(html).toContain('four record facts, six comparison groups');
  });

  it('keeps the public custom-image path browser-local and never calls the analysis endpoint', () => {
    expect(componentSource).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie|\/api\/analyze/);
    expect(componentSource).toContain('URL.createObjectURL');
    expect(componentSource).toContain('URL.revokeObjectURL');

    const html = renderToStaticMarkup(createElement(SyntheticTestLabApp));
    expect(html).toContain('not uploaded, stored, or sent to AI');
    expect(html).toContain('Public live uploads remain off');
  });

  it('does not claim that a custom user-selected image has verified synthetic provenance', () => {
    const html = renderToStaticMarkup(createElement(SyntheticTestLabApp));

    expect(html).toContain('ChallanSakshi cannot verify its provenance');
    expect(html).toContain('The selected image is not transmitted by this lab');
    expect(html).not.toContain('Nothing leaves this browser tab');
    expect(html).not.toContain('Synthetic preview ready');
  });

  it('links the flagship walkthrough to the separate test lab', () => {
    expect(demoSource).toMatch(/href="\/demo\/test-lab"/);
  });

  it('keeps lab controls at 48px and essential copy at 16px on narrow screens', () => {
    const mobile = mediaBlock(styles, '(max-width: 560px)');

    for (const selector of [
      '.primaryButton',
      '.secondaryButton',
      '.filterButton',
      '.caseButton',
      '.confirmButton',
      '.localChoose',
      '.fieldInput',
      '.fieldSelect',
    ]) {
      expect(ruleFor(mobile, selector), selector).toMatch(/min-height:\s*48px/);
    }

    for (const selector of [
      '.heroLead',
      '.caseButton',
      '.workbench p',
      '.fieldInput',
      '.fieldSelect',
      '.privacyNote',
    ]) {
      expect(ruleFor(mobile, selector), selector).toMatch(/font-size:\s*16px/);
    }
  });

  it('uses text as well as colour for every result state and disables motion when requested', () => {
    const html = renderToStaticMarkup(createElement(SyntheticTestLabApp));

    expect(html).toContain('Potential discrepancy');
    expect(html).toContain('Appears consistent');
    expect(html).toContain('Inconclusive');
    expect(styles).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(componentSource).toContain('Actual:');
    expect(componentSource).toContain('Expected:');
    expect(componentSource).toContain("result.passed ? 'PASS' : 'FAIL'");
  });
});
