import { describe, expect, it, vi } from 'vitest';
import { checkOfficialRoute, loadApprovedRoutes } from '../scripts/check-official-routes.mjs';

const url = 'https://echallan.parivahan.gov.in/index/challan-services';
const route = { url, domain: 'echallan.parivahan.gov.in' };
const approved = new Set([url]);
describe('bounded maintainer route checker', () => {
  it('loads only fixed official HTTPS routes from the maintained registry', async () => {
    const routes = await loadApprovedRoutes();
    expect(routes).toHaveLength(7);
    expect(new Set(routes.map(route => route.url)).size).toBe(routes.length);
    expect(routes.every(route => new URL(route.url).protocol === 'https:' && new URL(route.url).hostname === route.domain)).toBe(true);
  });

  it.each(['https://example.com/', 'http://echallan.parivahan.gov.in/index/challan-services', `${url}?citizen=1`, `${url}#fragment`, 'https://u:p@echallan.parivahan.gov.in/index/challan-services'])('never fetches unapproved input %s', async candidate => {
    const fetchImpl = vi.fn();
    const result = await checkOfficialRoute({ ...route, url: candidate }, approved, { fetchImpl });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.reachability).toBe('unavailable');
  });

  it('does not equate successful HTTP with service-purpose verification', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('Page', { status: 200 }));
    const result = await checkOfficialRoute(route, approved, { fetchImpl });
    expect(result).toMatchObject({ reachability: 'reachable', purposeVerification: 'not-performed', httpStatus: 200 });
    expect(fetchImpl).toHaveBeenCalledWith(url, expect.objectContaining({ redirect: 'manual', method: 'GET' }));
  });

  it.each([
    ['https://unexpected.example/other?token=private', true, true],
    ['/new-path?token=private', false, true],
    ['?token=private', false, false],
  ])('records changed redirect %s without following it or storing query values', async (location, hostChanged, pathChanged) => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: String(location) } }));
    const result = await checkOfficialRoute(route, approved, { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ reachability: 'needs-review', purposeVerification: 'not-performed' });
    expect(result.redirects[0]).toMatchObject({ hostChanged, pathChanged, hasQuery: true });
    expect(JSON.stringify(result)).not.toContain('private');
  });

  it('bounds redirect loops', async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => new Response(null, { status: 302, headers: { location: url } }));
    const result = await checkOfficialRoute(route, approved, { fetchImpl, maxRedirects: 2 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(result.observation).toBe('Redirect limit reached.');
  });

  it('aborts slow official responses within the request budget', async () => {
    const fetchImpl = vi.fn().mockImplementation((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const result = await checkOfficialRoute(route, approved, { fetchImpl, timeoutMs: 5 });
    expect(result).toMatchObject({ reachability: 'unavailable', observation: 'Check timed out within the bounded request budget.' });
  });

  it('describes blocked responses as environment observations', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 403 }));
    const result = await checkOfficialRoute(route, approved, { fetchImpl });
    expect(result).toMatchObject({ reachability: 'unavailable', httpStatus: 403, purposeVerification: 'not-performed' });
    expect(result.observation).toContain('does not establish');
  });
});
