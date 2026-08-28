import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CitizenHome from '../components/public-beta/CitizenHome';
import { HOME_ACTIONS, SITUATION_LINKS, buildReviewHref, parseCitizenGoal } from '../lib/citizen-home';

const citizenHomeStyles = readFileSync(
  new URL('../components/public-beta/CitizenHome.module.css', import.meta.url),
  'utf8',
);

function ruleFor(source: string, selector: string) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => match[1].split(',').map((item) => item.trim()).includes(selector))
    .at(-1)?.[2] ?? '';
}

describe('citizen homepage routing', () => {
  it('exposes the four approved citizen goals in order', () => {
    expect(HOME_ACTIONS.map((item) => [item.goal, item.title, item.cta])).toEqual([
      ['verify', 'Verify', 'Find the official record'],
      ['understand', 'Understand', 'Explain my situation'],
      ['evidence', 'Check evidence', 'Compare the evidence'],
      ['resolve', 'Resolve', 'Show my next step'],
    ]);
  });

  it('routes only a non-sensitive goal to review', () => {
    expect(buildReviewHref('verify')).toBe('/review?goal=verify');
    expect(buildReviewHref('resolve')).toBe('/review?goal=resolve');
  });

  it('rejects unknown query values without echoing them', () => {
    expect(parseCitizenGoal('?goal=evidence')).toBe('evidence');
    expect(parseCitizenGoal('?goal=vehicle%3DDL01AB1234')).toBeNull();
    expect(parseCitizenGoal('?challan=123')).toBeNull();
  });

  it('keeps every situation shortcut inside the bounded review or safety routes', () => {
    expect(SITUATION_LINKS.map((item) => item.href)).toEqual([
      '/review?goal=verify',
      '/review?goal=evidence',
      '/review?goal=resolve',
      '/review?goal=resolve',
      '/review?goal=understand',
    ]);
  });

  it('describes the browser-local file boundary without implying optional upload', () => {
    const html = renderToStaticMarkup(createElement(CitizenHome));

    expect(html).toContain('Selected files stay browser-local');
    expect(html).toContain('No file is uploaded to ChallanSakshi, AI, or an authority');
    expect(html).not.toContain('Selected files stay in this browser tab');
    expect(html).not.toContain('processed locally by default');
    expect(html).not.toContain('future product decision');
  });

  it('keeps the mobile home brand and compact journey arrows at least 48px wide', () => {
    const mobile = citizenHomeStyles.slice(citizenHomeStyles.indexOf('@media (max-width: 700px)'));

    expect(citizenHomeStyles).toMatch(
      /\.brand\s*\{[^}]*min-height:\s*48px[^}]*display:\s*inline-flex/,
    );
    expect(mobile).toMatch(/\.actionLink\s*\{[^}]*min-width:\s*48px/);
  });

  it('keeps mobile citizen explanations at 16px', () => {
    const mobile = citizenHomeStyles.slice(citizenHomeStyles.indexOf('@media (max-width: 700px)'));

    for (const selector of [
      '.actionCopy p',
      '.situationRail a',
      '.journey p',
      '.privacyGroup h3',
      '.privacyGroup li',
      '.fastagDoorway p',
      '.footer a',
      '.footer p',
    ]) {
      expect(ruleFor(mobile, selector), selector).toMatch(/font-size:\s*16px/);
    }
  });
});
