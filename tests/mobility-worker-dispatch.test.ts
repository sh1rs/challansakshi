import { describe, expect, it, vi } from 'vitest';

vi.mock('vinext/server/app-router-entry', () => ({
  default: { fetch: vi.fn(() => { throw new Error('Account requests must not reach the page router'); }) },
}));

import worker from '../worker';

const context = {} as Parameters<typeof worker.fetch>[2];

describe('custom Worker account dispatch without platform bindings', () => {
  it.each([undefined, null])('reports unconfigured status when a Node preview supplies %s env', async env => {
    const response = await worker.fetch(
      new Request('http://127.0.0.1:4180/api/account/status'),
      env as unknown as Parameters<typeof worker.fetch>[1],
      context,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ configured: false, authenticated: false });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('keeps account actions unavailable and rejects cross-origin writes without bindings', async () => {
    const env = undefined as unknown as Parameters<typeof worker.fetch>[1];
    const login = await worker.fetch(new Request('http://127.0.0.1:4180/api/account/login'), env, context);
    expect(login.status).toBe(503);
    expect(await login.json()).toEqual({ error: 'Account connection is not configured. Your local cases remain available.' });

    const sameOrigin = await worker.fetch(new Request('http://127.0.0.1:4180/api/account/cases', {
      method: 'PUT', headers: { Origin: 'http://127.0.0.1:4180' },
    }), env, context);
    expect(sameOrigin.status).toBe(503);

    const crossOrigin = await worker.fetch(new Request('http://127.0.0.1:4180/api/account/cases', {
      method: 'PUT', headers: { Origin: 'https://unrelated.example' },
    }), env, context);
    expect(crossOrigin.status).toBe(403);
    expect(crossOrigin.headers.get('Cache-Control')).toBe('no-store');
  });
});
