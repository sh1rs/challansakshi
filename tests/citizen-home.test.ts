import { describe, expect, it } from 'vitest';
import { HOME_ACTIONS, SITUATION_LINKS, buildReviewHref, parseCitizenGoal } from '../lib/citizen-home';

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
});
