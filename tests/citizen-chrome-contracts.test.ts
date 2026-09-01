import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ChallanSakshiApp from '../components/ChallanSakshiApp';
import CitizenHome from '../components/public-beta/CitizenHome';
import CitizenReviewApp from '../components/public-beta/CitizenReviewApp';
import { PrivacyPage } from '../components/public-beta/PublicInfoPage';
import TollSakshiApp from '../components/public-beta/TollSakshiApp';

const chromeStyles = readFileSync(
  new URL('../components/shared/CitizenChrome.module.css', import.meta.url),
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
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((match) => (
    match[1].split(',').map((item) => item.trim()).includes(selector)
  )).at(-1)?.[2] ?? '';
}

function landmarkFrom(html: string, tag: 'header' | 'footer') {
  return html.match(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`))?.[0] ?? '';
}

function linkContracts(fragment: string) {
  return [...fragment.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((match) => {
    const href = match[1].match(/\bhref="([^"]+)"/)?.[1];
    const explicitName = match[1].match(/\baria-label="([^"]+)"/)?.[1];
    const contentName = match[2]
      .replace(/<([a-z][a-z0-9]*)\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();

    return { href, name: explicitName ?? contentName, contentName, innerHtml: match[2] };
  });
}

const expectedHeaderLinks = [
  { href: '/', name: 'ChallanSakshi home' },
  { href: '/review', name: 'Challan review' },
  { href: '/fastag', name: 'FASTag check' },
  { href: '/privacy', name: 'Privacy' },
  { href: '/demo', name: 'Hackathon demo' },
] as const;

const expectedFooterLinks = [
  { href: '/review', name: 'Challan review' },
  { href: '/fastag', name: 'FASTag check' },
  { href: '/privacy', name: 'Privacy & data controls' },
  { href: '/safety', name: 'Safety & official routes' },
  { href: '/demo', name: 'Synthetic evidence demo' },
] as const;

const realSurfaces = [
  ['home', () => createElement(CitizenHome)],
  ['e-Challan review', () => createElement(CitizenReviewApp)],
  ['FASTag review', () => createElement(TollSakshiApp)],
  ['privacy information', () => createElement(PrivacyPage)],
] as const;

const allSurfaces = [
  ...realSurfaces,
  ['synthetic demo', () => createElement(ChallanSakshiApp)] as const,
];

describe('shared citizen product chrome', () => {
  it.each(allSurfaces)('%s exposes the canonical product header and footer', (_name, createSurface) => {
    const html = renderToStaticMarkup(createSurface());
    const header = landmarkFrom(html, 'header');
    const footer = landmarkFrom(html, 'footer');

    expect(header).toContain('aria-label="Product navigation"');
    expect(linkContracts(header).map(({ href, name }) => ({ href, name }))).toEqual(expectedHeaderLinks);
    expect(linkContracts(footer).map(({ href, name }) => ({ href, name }))).toEqual(expectedFooterLinks);
  });

  it.each(realSurfaces)('%s keeps the independent-service boundary', (_name, createSurface) => {
    const html = renderToStaticMarkup(createSurface());

    expect(html).toContain('Independent public-interest early access');
    expect(html).toContain('Not a government, bank, court, or toll service');
    expect(landmarkFrom(html, 'footer')).toContain('Independent early access');
  });

  it('keeps the synthetic status explicit while using the citizen shell', () => {
    const html = renderToStaticMarkup(createElement(ChallanSakshiApp));

    expect(html).toContain('Demo boundary · use fictional or synthetic test data only');
    expect(html).toContain('Fictional data only');
    expect(html).toContain('no government connection');
    expect(landmarkFrom(html, 'footer')).toContain('Use synthetic test data only');
    expect(html).toContain('Does the photo show your vehicle?');
  });

  it('keeps active shared-header labels readable at 320px', () => {
    const mobile = mediaBlock(chromeStyles, '(max-width: 700px)');
    const narrow = mediaBlock(chromeStyles, '(max-width: 480px)');

    expect(ruleFor(mobile, '.headerButton')).toMatch(/font-size:\s*(?:1[6-9]|[2-9]\d)px/);
    expect(ruleFor(mobile, '.englishOnly')).toMatch(/font-size:\s*(?:1[6-9]|[2-9]\d)px/);
    expect(ruleFor(mobile, '.languages button')).toMatch(/font-size:\s*(?:1[6-9]|[2-9]\d)px/);
    expect(ruleFor(narrow, '.publicBar')).toMatch(/font-size:\s*(?:1[6-9]|[2-9]\d)px/);
  });

  it('uses a high-contrast keyboard focus ring on the dark shared footer', () => {
    expect(ruleFor(chromeStyles, '.footer a:focus-visible')).toMatch(/outline:\s*3px\s+solid\s+#f1b755/i);
  });
});
