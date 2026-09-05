import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { getPublicOfficialRoutes } from '../lib/public-official-routes';
import { GET } from '../app/api/official-routes/route';
import { OfficialSourcesPage } from '../components/public-beta/OfficialSourcesPage';

const CURRENT = '2026-09-05T12:00:00.000Z';
describe('public route transparency', () => {
  it('publishes dated, scoped source records without promoting the unapproved legacy route', () => {
    const registry = getPublicOfficialRoutes(CURRENT);
    expect(registry.routes).toHaveLength(7);
    expect(registry.routes.find(route => route.id === 'handoff:legacy')).toMatchObject({ status: 'reference-only', jurisdictionCodes: [] });
    expect(registry.routes.find(route => route.id === 'handoff:nextgen')).toMatchObject({ status: 'available', jurisdictionCodes: expect.arrayContaining(['KA']) });
    expect(registry.routes.every(route => route.lastReviewedOn === '2026-09-02' && route.reviewExpiresOn === '2026-10-02' && route.provenance.evidenceRef)).toBe(true);
  });

  it.each(['2026-09-01T12:00:00Z', '2026-10-03T00:00:00Z', 'bad-clock'])('fails closed when the review date does not support clock %s', now => {
    expect(getPublicOfficialRoutes(now).routes.every(route => route.status === 'needs-recheck')).toBe(true);
  });

  it('keeps the endpoint uncached and limits the response to public service metadata', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(CURRENT));
      const response = GET();
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('set-cookie')).toBeNull();
      const data = await response.json() as ReturnType<typeof getPublicOfficialRoutes>;
      expect(data).toEqual(getPublicOfficialRoutes(CURRENT));
      for (const route of data.routes) {
        expect(Object.keys(route).sort()).toEqual(['domain', 'id', 'jurisdictionCodes', 'kind', 'lastReviewedOn', 'name', 'provenance', 'purpose', 'reviewExpiresOn', 'scope', 'status', 'url'].sort());
      }
    } finally { vi.useRealTimers(); }
  });

  it('shows provenance and limits while withholding outgoing links for expired reviews', () => {
    const current = renderToStaticMarkup(createElement(OfficialSourcesPage, { evaluatedAt: CURRENT }));
    expect(current).toContain('Retained evidence reference');
    expect(current).toContain('Review expiry is not your filing deadline');
    expect(current).toContain('href="https://echallan.parivahan.nic.in/grievance"');
    expect(current).not.toContain('href="https://echallan.parivahan.gov.in/gsticket"');
    const expired = renderToStaticMarkup(createElement(OfficialSourcesPage, { evaluatedAt: '2026-10-03T00:00:00Z' }));
    expect(expired).toContain('Needs recheck');
    expect(expired).not.toContain('href="https://');
  });
});
