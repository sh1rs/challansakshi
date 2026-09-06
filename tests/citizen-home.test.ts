import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CitizenHome from '../components/public-beta/CitizenHome';
import { parseCitizenGoalValue } from '../lib/citizen-home';

function linksFrom(html: string) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((match) => ({
    href: match[1].match(/\bhref="([^"]+)"/)?.[1] ?? '',
    name: match[2]
      .replace(/<([a-z][a-z0-9]*)\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  }));
}

describe('informative citizen home', () => {
  it('offers one document review entry and distinct message, FASTag and manual routes', () => {
    const html = renderToStaticMarkup(createElement(CitizenHome));
    const main = html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
    const links = linksFrom(main);
    expect(links.map(({ href }) => href).sort()).toEqual([
      '/dashboard', '/fastag', '/manual/challan', '/message-check', '/mobility', '/reply-review', '/review', '/sources',
    ]);
    expect(links.find(({ href }) => href === '/review')?.name).toBe('Review my challan');
    expect(main.match(/<h1\b/g)).toHaveLength(1);
  });

  it('explains the four capabilities in disclosures without introducing unsupported review routes', () => {
    const html = renderToStaticMarkup(createElement(CitizenHome));
    const capabilities = [...html.matchAll(/<details\b[^>]*data-home-capability="([^"]+)"[^>]*>([\s\S]*?)<\/details>/g)];
    expect(capabilities.map((match) => match[1])).toEqual(['verify', 'understand', 'evidence', 'resolve']);
    for (const [, , content] of capabilities) {
      expect(content).toMatch(/<summary\b/);
      expect(content).toMatch(/<\/summary>\s*<div\b[\s\S]*?<p\b/);
      expect(linksFrom(content)).toEqual([]);
    }
  });

  it('keeps demo navigation and sample content out of the real homepage main', () => {
    const html = renderToStaticMarkup(createElement(CitizenHome));
    const main = html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
    expect(main).not.toMatch(/\/demo|try a sample|sample case|synthetic example/i);
    expect(html.match(/<footer\b/g)).toHaveLength(1);
  });

  it('accepts only a scalar message navigation hint', () => {
    expect(parseCitizenGoalValue('message')).toBe('message');
    expect(parseCitizenGoalValue(['message', 'message'])).toBeNull();
    expect(parseCitizenGoalValue('resolve')).toBeNull();
    expect(parseCitizenGoalValue(undefined)).toBeNull();
  });

  it('never infers a source from arbitrary or legacy navigation values', () => {
    expect(parseCitizenGoalValue('official-service')).toBeNull();
    expect(parseCitizenGoalValue(['message'])).toBeNull();
    expect(parseCitizenGoalValue('verify')).toBeNull();
    expect(parseCitizenGoalValue({ source: 'official-service' })).toBeNull();
  });

  it('renders the Hindi home with the same real service destinations', () => {
    const html = renderToStaticMarkup(createElement(CitizenHome, { initialLanguage: 'hi' }));
    const main = html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
    expect(main).toContain('lang="hi"');
    expect(linksFrom(main).map(({ href }) => href).sort()).toEqual(['/dashboard', '/fastag', '/manual/challan', '/message-check', '/mobility', '/reply-review', '/review', '/sources']);
    expect(linksFrom(main).find(({ href }) => href === '/review')?.name).toBe('मेरे चालान की समीक्षा करें');
  });
});
