import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { requestContextFromRequest } from 'vinext/config/config-matchers';
import { applyConfigHeadersToResponse } from '../node_modules/vinext/dist/server/config-headers.js';
import config from '../next.config';

async function responseHeaders(path: string) {
  const request = new Request(`https://challansakshi.sh1rs.com${path}`);
  const headers = new Headers();
  // Exercise the installed response boundary: Vinext keeps the first matching
  // value, so merely finding an override in next.config cannot prove it works.
  applyConfigHeadersToResponse(headers, {
    pathname: new URL(request.url).pathname,
    configHeaders: await config.headers!(),
    requestContext: requestContextFromRequest(request),
  });
  return headers;
}

it('serves review microphone permission without widening other page capabilities', async () => {
  for (const path of ['/review', '/review?voice=1']) {
    const headers = await responseHeaders(path);
    expect(headers.get('Permissions-Policy')).toBe('camera=(), microphone=(self), geolocation=(), payment=(), usb=()');
    expect(headers.get('Content-Security-Policy')).toContain("connect-src 'self';");
    expect(headers.get('Content-Security-Policy')).not.toContain("'unsafe-eval'");
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('Referrer-Policy')).toBe('no-referrer');
  }
  for (const path of ['/', '/demo', '/review-extra', '/api/analyze']) {
    expect((await responseHeaders(path)).get('Permissions-Policy')).toContain('microphone=()');
  }
});

function expectRecognitionPolicy(policy: string | null) {
  expect(policy).toContain('https://huggingface.co');
  expect(policy).toContain('https://us.aws.cdn.hf.co');
  expect(policy).toContain("script-src 'self' 'wasm-unsafe-eval'");
  expect(policy).not.toContain("'unsafe-eval'");
}

function expectCompactPolicy(compact: string | null) {
  expect(compact).toContain("script-src 'self' 'unsafe-eval'");
  expect(compact).toContain("connect-src 'self'");
  expect(compact).not.toContain('https://');
}

it('serves isolated worker policies through the installed framework matcher', async () => {
  for (const path of ['/voice/voice-recognition.worker.js']) {
    expectRecognitionPolicy((await responseHeaders(path)).get('Content-Security-Policy'));
  }
  expectCompactPolicy((await responseHeaders('/voice-assets/espeak-ng-1.49.1/espeakng.worker.js')).get('Content-Security-Policy'));
});

describe('Cloudflare static asset responses', () => {
  let directory: string;
  let runtime: { dispatchFetch: (url: string) => Promise<Response>; dispose: () => Promise<void> };
  const recognitionPath = '/voice/voice-recognition.worker.js';
  const compactPath = '/voice-assets/espeak-ng-1.49.1/espeakng.worker.js';
  const readerPath = '/document-assets/tesseract-7.0.0/worker.min.js';

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'voice-policy-'));
    await copyFile(new URL('../public/_headers', import.meta.url), join(directory, '_headers'));
    for (const path of [recognitionPath, compactPath, readerPath, '/ordinary.js']) {
      await mkdir(join(directory, path, '..'), { recursive: true });
      await writeFile(join(directory, path), '// Public policy fixture only.');
    }
    // Resolve the actual asset runtime already shipped with Wrangler rather
    // than simulating Cloudflare's wildcard matching or header merge rules.
    const requireWrangler = createRequire(import.meta.resolve('wrangler'));
    const { Miniflare } = requireWrangler('miniflare');
    runtime = new Miniflare({
      modules: true,
      script: 'export default { fetch() { return new Response("Not found", { status: 404 }); } };',
      assets: { directory },
    });
  }, 20_000);

  afterAll(async () => {
    await runtime?.dispose();
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  it('applies worker-specific CSP when assets bypass the application Worker', async () => {
    const recognition = await runtime.dispatchFetch(`https://example.test${recognitionPath}`);
    expect(recognition.status).toBe(200);
    expectRecognitionPolicy(recognition.headers.get('Content-Security-Policy'));
    const compact = await runtime.dispatchFetch(`https://example.test${compactPath}`);
    expect(compact.status).toBe(200);
    expectCompactPolicy(compact.headers.get('Content-Security-Policy'));
  });

  it('preserves reader caching and does not grant ordinary assets worker privileges', async () => {
    const reader = await runtime.dispatchFetch(`https://example.test${readerPath}`);
    expect(reader.headers.get('Cache-Control')).toBe('public, max-age=604800');
    const ordinary = await runtime.dispatchFetch('https://example.test/ordinary.js');
    expect(ordinary.headers.get('Content-Security-Policy')).toBeNull();
  });
});
