import { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReviewPage from '../app/review/page';
import CitizenDocumentReview from '../components/public-beta/CitizenDocumentReview';
import CitizenReviewApp from '../components/public-beta/CitizenReviewApp';
import { getCitizenReviewServerNowIso } from '../lib/citizen-review-server-clock';

const realNow = '2026-09-05T08:09:10.000Z';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(realNow));
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

async function appProps(searchParams: Promise<Record<string, string | string[] | undefined>>) {
  const result = await ReviewPage({ searchParams });
  expect(isValidElement(result)).toBe(true);
  return result.props as { initialGoal?: 'message' | null; initialNowIso: string };
}

describe('review server route', () => {
  it('awaits searchParams and forwards the scalar message seed with one server timestamp', async () => {
    await expect(appProps(Promise.resolve({ goal: 'message' }))).resolves.toEqual({
      initialGoal: 'message',
      initialNowIso: realNow,
    });
    const result = await ReviewPage({ searchParams: Promise.resolve({ goal: 'message' }) });
    expect(result.type).toBe(CitizenReviewApp);
    const html = renderToStaticMarkup(result);
    expect(html).not.toContain('data-document-review');
    expect(html).not.toContain('Where did you open this challan?');
  });

  const invalidQueries: Array<[Record<string, string | string[] | undefined>]> = [
    [{}],
    [{ goal: ['message', 'message'] }],
    [{ goal: 'resolve' }],
    [{ goal: 'free text' }],
    [{ source: 'official-service' }],
  ];

  it.each(invalidQueries)('starts document-first without inferring a source from query shape %#', async (query) => {
    const result = await ReviewPage({ searchParams: Promise.resolve(query) });
    expect(result.type).toBe(CitizenDocumentReview);
    expect(result.props).toEqual({ initialNowIso: realNow });
    const html = renderToStaticMarkup(result);
    expect(html).toContain('data-document-stage="read"');
    expect(html).toContain('data-document-role="notice"');
    expect(html).toContain('data-document-role="vehicle-record"');
    expect(html).toContain('href="/manual/challan"');
    expect(html).not.toContain('data-document-note');
    expect(html).not.toContain('The registrations match');
    expect(html).not.toContain('The registrations differ');
    expect(html).not.toContain('checked=""');
  });
});

describe('review server acceptance clock', () => {
  it('uses the real server clock when the explicit acceptance flag is absent', () => {
    vi.stubEnv('CHALLANSAKSHI_ACCEPTANCE_NOW_ISO', '2026-10-03T00:00:00.000Z');
    expect(getCitizenReviewServerNowIso()).toBe(realNow);
  });

  it('uses a canonical ISO acceptance instant only when browser acceptance is explicitly enabled', () => {
    vi.stubEnv('CHALLANSAKSHI_BROWSER_ACCEPTANCE', '1');
    vi.stubEnv('CHALLANSAKSHI_ACCEPTANCE_NOW_ISO', '2026-10-03T00:00:00.000Z');
    expect(getCitizenReviewServerNowIso()).toBe('2026-10-03T00:00:00.000Z');
  });

  it.each(['not-a-date', '2026-10-03', '2026-10-03T00:00:00Z', ''])('falls back to real time for an unsafe acceptance clock value %j', (value) => {
    vi.stubEnv('CHALLANSAKSHI_BROWSER_ACCEPTANCE', '1');
    vi.stubEnv('CHALLANSAKSHI_ACCEPTANCE_NOW_ISO', value);
    expect(getCitizenReviewServerNowIso()).toBe(realNow);
  });
});
