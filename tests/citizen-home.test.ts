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

describe('compact citizen home', () => {
  it('renders exactly three meaningful journey anchors', () => {
    const html = renderToStaticMarkup(createElement(CitizenHome));
    const main = html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
    expect(linksFrom(main)).toEqual([
      { href: '/review', name: 'Review a challan or its photo Check the official record and compare only what you can see.' },
      { href: '/review?goal=message', name: 'I only have an SMS or forwarded link Check it safely without entering or sharing the message.' },
      { href: '/fastag', name: 'Check a FASTag transaction Compare the transaction and find the appropriate official route.' },
    ]);
    expect(main).not.toMatch(/Understand the notice|Compare the photo|Find the next step|I already paid|My grievance was rejected|Virtual Court/);
    expect(main.match(/<h1\b/g)).toHaveLength(1);
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

  it('renders the Hindi home with the same three destinations', () => {
    const html = renderToStaticMarkup(createElement(CitizenHome, { initialLanguage: 'hi' }));
    const main = html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
    expect(main).toContain('lang="hi"');
    expect(linksFrom(main).map(({ href }) => href)).toEqual(['/review', '/review?goal=message', '/fastag']);
    expect(main).toContain('चालान या उसकी फ़ोटो की समीक्षा करें');
    expect(main).toContain('मेरे पास केवल SMS या फ़ॉरवर्ड किया हुआ लिंक है');
  });
});
