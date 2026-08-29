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

function renderedLink(html: string, href: string) {
  const escapedHref = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.match(new RegExp(`<a\\b[^>]*href="${escapedHref}"[^>]*>[\\s\\S]*?<\\/a>`))?.[0] ?? '';
}

function accessibleName(link: string) {
  const explicit = link.match(/\baria-label="([^"]+)"/)?.[1];
  if (explicit) return explicit;

  return link
    .replace(/<([a-z][a-z0-9]*)\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
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

  it('makes each primary journey card one complete semantic link', () => {
    const html = renderToStaticMarkup(createElement(CitizenHome));

    const expectedCards = [
      ['/review?goal=verify', 'Verify Is this challan actually connected to you or your vehicle? Find the official record'],
      ['/review?goal=understand', 'Understand What does this notice, status, or Virtual Court update mean? Explain my situation'],
      ['/review?goal=evidence', 'Check evidence Does the supplied evidence agree with the record and your vehicle? Compare the evidence'],
      ['/review?goal=resolve', 'Resolve What is the safest official next step? Show my next step'],
    ] as const;

    for (const [href, name] of expectedCards) {
      const link = renderedLink(html, href);
      expect(link, href).not.toBe('');
      expect(accessibleName(link), href).toBe(name);
      expect(link.replace(/^<a\b[^>]*>/, '').replace(/<\/a>$/, ''), href).not.toMatch(/<(?:a|button)\b/i);
    }
  });

  it('makes the FASTag doorway one complete semantic link', () => {
    const html = renderToStaticMarkup(createElement(CitizenHome));
    const link = [...html.matchAll(/<a\b[^>]*href="\/fastag"[^>]*>[\s\S]*?<\/a>/g)]
      .map((match) => match[0])
      .find((candidate) => accessibleName(candidate).includes('Go to FASTag help')) ?? '';

    expect(link).not.toBe('');
    expect(accessibleName(link)).toBe(
      'Have a FASTag transaction problem instead? Compare the plaza record, issuer transaction, debit status, and the appropriate official escalation route. Go to FASTag help',
    );
    expect(link.replace(/^<a\b[^>]*>/, '').replace(/<\/a>$/, '')).not.toMatch(/<(?:a|button)\b/i);
  });

  it('describes the browser-local file boundary without implying optional upload', () => {
    const html = renderToStaticMarkup(createElement(CitizenHome));

    expect(html).toContain('Selected files stay browser-local');
    expect(html).toContain('No file is uploaded to ChallanSakshi, AI, or an authority');
    expect(html).not.toContain('Selected files stay in this browser tab');
    expect(html).not.toContain('processed locally by default');
    expect(html).not.toContain('future product decision');
  });

  it('keeps the mobile home brand and compact journey affordances at least 48px wide', () => {
    const mobile = citizenHomeStyles.slice(citizenHomeStyles.indexOf('@media (max-width: 700px)'));

    expect(mobile).toMatch(/\.actionCta\s*\{[^}]*min-width:\s*48px/);
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
    ]) {
      expect(ruleFor(mobile, selector), selector).toMatch(/font-size:\s*16px/);
    }
  });
});
