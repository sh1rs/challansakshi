import { isValidElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReviewPage from '../app/review/page';
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
  return result.props as { initialGoal: 'message' | null; initialNowIso: string };
}

describe('review server route', () => {
  it('awaits searchParams and forwards the scalar message seed with one server timestamp', async () => {
    await expect(appProps(Promise.resolve({ goal: 'message' }))).resolves.toEqual({
      initialGoal: 'message',
      initialNowIso: realNow,
    });
  });

  const invalidQueries: Array<[Record<string, string | string[] | undefined>, null]> = [
    [{}, null],
    [{ goal: ['message', 'message'] }, null],
    [{ goal: 'resolve' }, null],
    [{ goal: 'free text' }, null],
    [{ source: 'official-service' }, null],
  ];

  it.each(invalidQueries)('does not infer a review source from invalid query shape %#', async (query, expected) => {
    expect((await appProps(Promise.resolve(query))).initialGoal).toBe(expected);
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
