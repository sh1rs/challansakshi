import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { evidenceFixtureForIssue, hashForStep, parseAppHash } from '../components/ChallanSakshiApp';
import { ResolutionDesk } from '../components/ResolutionDesk';

function renderedLinks(html: string) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((match) => ({
    href: match[1].match(/\bhref="([^"]+)"/)?.[1],
    name: match[2]
      .replace(/<([a-z][a-z0-9]*)\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim(),
    innerHtml: match[2],
  }));
}

describe('synthetic resolution-card navigation', () => {
  it('makes each single-destination scenario one complete semantic link', () => {
    const html = renderToStaticMarkup(createElement(ResolutionDesk, {
      language: 'en',
      onBack: vi.fn(),
      onOpenRoute: vi.fn(),
      onStartEvidence: vi.fn(),
    }));

    const expected = [
      ['/demo#intake/wrong-evidence', 'Evidence The photo shows another vehicle Compare the image with a verified vehicle record before contesting. Evidence finding + contest pack Open fictional route'],
      ['/demo#intake/unclear-evidence', 'Evidence The supplied image is unclear Separate an unreadable record from a supported mismatch claim. Limitations + clarification request Open fictional route'],
      ['/demo#route/grievance-rejected', 'Authority My grievance was rejected Preserve the recorded reasons and see the time-sensitive official routes. Post-decision route + clock Open fictional route'],
      ['/demo#route/no-recorded-decision', 'Authority No grievance decision is recorded Compare the acknowledgement date with the stated response period and prepare a neutral status follow-up. Response clock + status follow-up Open fictional route'],
      ['/demo#route/virtual-court', 'Court The case moved to Virtual Court Understand the official search, verification, and contest handoff sequence. Court handoff checklist Open fictional route'],
      ['/demo#route/payment-pending', 'Payment I paid, but status still says pending Compare a fictional receipt, challan, and status snapshot before paying again. Reconciliation + safe next step Open fictional route'],
      ['/demo#route/access-or-receipt', 'Payment Phone number or receipt problem Find the official alternative-verification or receipt-reprint route. Recovery route Open fictional route'],
    ] as const;

    const links = renderedLinks(html).filter((link) => link.name.endsWith('Open fictional route'));
    expect(links.map(({ href, name }) => [href, name])).toEqual(expected);
    for (const link of links) expect(link.innerHtml).not.toMatch(/<(?:a|button)\b/i);
  });

  it('preserves the chosen evidence scenario in direct and new-tab URLs', () => {
    expect(hashForStep('intake', 'wrong-evidence')).toBe('#intake/wrong-evidence');
    expect(hashForStep('intake', 'unclear-evidence')).toBe('#intake/unclear-evidence');
    expect(parseAppHash('#intake/wrong-evidence')).toEqual({ step: 'intake', issueId: 'wrong-evidence' });
    expect(parseAppHash('#intake/unclear-evidence')).toEqual({ step: 'intake', issueId: 'unclear-evidence' });
    expect(evidenceFixtureForIssue('wrong-evidence')).toBe('mismatch');
    expect(evidenceFixtureForIssue('unclear-evidence')).toBe('inconclusive');
  });
});
