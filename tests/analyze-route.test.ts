import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../app/api/analyze/route';

describe('synthetic analysis endpoint release guard', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('never calls a model in the public production release', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('OPENAI_API_KEY', 'synthetic-test-key-that-must-not-be-used');
    vi.stubEnv('OPENAI_MODEL', 'synthetic-test-model');
    const response = await POST(new Request('https://example.test/api/analyze', {
      method: 'POST',
      headers: { origin: 'https://example.test', 'content-type': 'application/json' },
      body: JSON.stringify({ fixtureId: 'mismatch' }),
    }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ fallback: true });
  });

  it('rejects primitive JSON in local development without throwing', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('OPENAI_API_KEY', 'synthetic-test-key');
    vi.stubEnv('OPENAI_MODEL', 'synthetic-test-model');
    const response = await POST(new Request('https://example.test/api/analyze', {
      method: 'POST',
      headers: { origin: 'https://example.test', 'content-type': 'application/json' },
      body: 'null',
    }));
    expect(response.status).toBe(400);
  });
});
