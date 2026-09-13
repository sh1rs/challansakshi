import { beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../worker';

const app = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('vinext/server/app-router-entry', () => ({ default: app }));
beforeEach(() => { app.fetch.mockReset(); });

const request = (path: string, init?: RequestInit) => new Request(`https://challansakshi.sh1rs.com${path}`, init);

describe('public Worker security and recovery boundary', () => {
  it('protects direct account responses as well as routed responses', async () => {
    const response = await worker.fetch(request('/api/account/status'), undefined, undefined);
    expect(await response.json()).toEqual({ configured: false, authenticated: false });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'none'; frame-ancestors 'none'");
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(response.headers.get('Strict-Transport-Security')).toBe('max-age=31536000');
    expect(app.fetch).not.toHaveBeenCalled();
  });

  it('prevents intermediary caching of any API response, including framework errors', async () => {
    const upstream = new Response('<p>Service unavailable</p>', { status: 503, headers: {
      'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=86400',
      'CDN-Cache-Control': 'public, max-age=86400', 'Cloudflare-CDN-Cache-Control': 'public, max-age=86400',
      'Vary': 'Accept',
    } });
    app.fetch.mockResolvedValueOnce(upstream);
    const response = await worker.fetch(request('/api/analyze'), undefined, undefined);
    expect(response.body).toBe(upstream.body);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('CDN-Cache-Control')).toBe('no-store');
    expect(response.headers.get('Cloudflare-CDN-Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    expect(response.headers.get('Vary')).toBe('Accept');
    expect(upstream.headers.get('Cache-Control')).toBe('public, max-age=86400');
  });

  it('keeps public asset cache settings and specialized speech-worker policies intact', async () => {
    const upstream = new Response('/* public runtime */', { headers: {
      'Content-Type': 'application/javascript', 'Cache-Control': 'public, max-age=604800',
      'Content-Security-Policy': "default-src 'none'; script-src 'self' 'unsafe-eval'; connect-src 'self'",
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    } });
    app.fetch.mockResolvedValueOnce(upstream);
    const response = await worker.fetch(request('/voice-assets/espeak-ng-1.49.1/espeakng.worker.js'), undefined, undefined);
    expect(response.body).toBe(upstream.body);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=604800');
    expect(response.headers.get('Content-Security-Policy')).toBe(upstream.headers.get('Content-Security-Policy'));
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(response.headers.has('X-Robots-Tag')).toBe(false);
  });

  it('returns a bounded JSON failure without exposing exception details or logging citizen data', async () => {
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {});
    app.fetch.mockRejectedValueOnce(new Error('secret-token citizen-record database-password'));
    try {
      const response = await worker.fetch(request('/api/analyze'), undefined, undefined);
      expect(response.status).toBe(503);
      expect(response.headers.get('Retry-After')).toBe('30');
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(await response.json()).toEqual({ error: 'ChallanSakshi is temporarily unavailable. Please try again shortly.', code: 'SERVICE_UNAVAILABLE' });
      expect(logger).not.toHaveBeenCalled();
    } finally { logger.mockRestore(); }
  });

  it('serves a usable, script-free recovery page when page rendering fails', async () => {
    app.fetch.mockRejectedValueOnce(new Error('private case contents'));
    const response = await worker.fetch(request('/review?private-record=12345'), undefined, undefined);
    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store, no-transform');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    const html = await response.text();
    expect(html).toContain('ChallanSakshi');
    expect(html).toContain('href="/"');
    expect(html).not.toMatch(/private case contents|private-record|12345|<script/i);
  });

  it('does not attach a body to a failed HEAD request', async () => {
    app.fetch.mockRejectedValueOnce(new Error('unavailable'));
    const response = await worker.fetch(request('/review', { method: 'HEAD' }), undefined, undefined);
    expect(response.status).toBe(503);
    expect(response.body).toBeNull();
  });
});
