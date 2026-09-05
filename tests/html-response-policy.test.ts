import { beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../worker';

// Supply app responses while exercising the real Worker response boundary.
const app = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('vinext/server/app-router-entry', () => ({ default: app }));
beforeEach(() => { app.fetch.mockReset(); });

async function throughWorker(response: Response, path = '/review') {
  app.fetch.mockResolvedValueOnce(response);
  return worker.fetch(new Request(`https://challansakshi.sh1rs.com${path}`), undefined, undefined);
}

describe('HTML response policy at the Worker boundary', () => {
  it('appends no-transform without weakening cache directives or security headers', async () => {
    const upstream = new Response('<main>Review</main>', {
      status: 203,
      statusText: 'Non-Authoritative Information',
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'",
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
      },
    });
    const response = await throughWorker(upstream);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0, must-revalidate, no-transform');
    expect(response.status).toBe(203);
    expect(response.statusText).toBe('Non-Authoritative Information');
    for (const name of ['content-type', 'content-security-policy', 'referrer-policy', 'x-content-type-options']) {
      expect(response.headers.get(name)).toBe(upstream.headers.get(name));
    }
    expect(upstream.headers.get('cache-control')).toBe('private, no-store, max-age=0, must-revalidate');
    expect(await response.text()).toBe('<main>Review</main>');
  });

  it('returns the same live body stream before its final chunk is available', async () => {
    let source!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({ start(controller) { source = controller; } });
    source.enqueue(new TextEncoder().encode('<main>'));
    const response = await throughWorker(new Response(body, { headers: { 'Content-Type': 'text/html' } }));
    expect(response.headers.get('cache-control')).toBe('no-transform');
    expect(response.body).toBe(body);
    expect(response.bodyUsed).toBe(false);
    source.enqueue(new TextEncoder().encode('streamed</main>'));
    source.close();
    expect(await response.text()).toBe('<main>streamed</main>');
  });

  it('supports immutable upstream headers without mutating them', async () => {
    const upstream = await fetch('data:text/html,<main>Fixture</main>');
    expect(() => upstream.headers.set('Cache-Control', 'no-store')).toThrow();
    const response = await throughWorker(upstream);
    expect(response.headers.get('cache-control')).toBe('no-transform');
    expect(upstream.headers.has('cache-control')).toBe(false);
    expect(await response.text()).toBe('<main>Fixture</main>');
  });

  it.each(['no-transform', 'private, NO-TRANSFORM, no-store'])('does not duplicate an existing directive: %s', async cacheControl => {
    const upstream = new Response(null, { headers: { 'Content-Type': 'text/html', 'Cache-Control': cacheControl } });
    const response = await throughWorker(upstream);
    expect(response.headers.get('cache-control')).toBe(cacheControl);
  });

  it('does not mistake a quoted extension value for the no-transform directive', async () => {
    const response = await throughWorker(new Response(null, { headers: {
      'Content-Type': 'text/html', 'Cache-Control': 'no-store, extension="value,no-transform,other"',
    } }));
    expect(response.headers.get('cache-control')).toBe('no-store, extension="value,no-transform,other", no-transform');
  });

  it('handles case-insensitive HTML media types and a bodyless response', async () => {
    const response = await throughWorker(new Response(null, { headers: { 'Content-Type': 'Text/HTML ; charset=utf-8' } }));
    expect(response.headers.get('cache-control')).toBe('no-transform');
    expect(response.body).toBeNull();
  });

  it.each(['application/json', 'text/x-component', 'application/pdf', 'text/html-extra', null])('leaves non-HTML responses unchanged: %s', async contentType => {
    const headers = new Headers({ 'Cache-Control': 'no-store' });
    if (contentType) headers.set('Content-Type', contentType);
    const upstream = new Response(null, { headers });
    expect(await throughWorker(upstream)).toBe(upstream);
  });

  it.each(['/api', '/api/analyze?fixture=true'])('leaves API responses unchanged even when an error uses HTML: %s', async path => {
    const upstream = new Response('<main>Unavailable</main>', { status: 503, headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' } });
    expect(await throughWorker(upstream, path)).toBe(upstream);
  });

  it('preserves the production HTTPS redirect', async () => {
    const response = await worker.fetch(new Request('http://challansakshi.sh1rs.com/review'), undefined, undefined);
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://challansakshi.sh1rs.com/review');
    expect(response.headers.has('cache-control')).toBe(false);
  });
});
