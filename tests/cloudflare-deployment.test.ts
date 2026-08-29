import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveConfig } from 'vite';

const projectRoot = resolve(import.meta.dirname, '..');
const wranglerPath = resolve(projectRoot, 'wrangler.jsonc');
const nextConfigSource = readFileSync(resolve(projectRoot, 'next.config.ts'), 'utf8');

describe('direct Cloudflare deployment', () => {
  it('builds with Cloudflare Workers directly instead of the Sites serving plugin', async () => {
    const config = await resolveConfig({ root: projectRoot }, 'build', 'production');
    const pluginNames = config.plugins.map((plugin) => plugin.name);

    expect(pluginNames).toContain('vite-plugin-cloudflare');
    expect(pluginNames).not.toContain('sites');
  }, 120_000);

  it('owns only the ChallanSakshi subdomain and keeps optional invocation logs off', () => {
    expect(existsSync(wranglerPath), 'wrangler.jsonc must define the direct production Worker').toBe(true);
    if (!existsSync(wranglerPath)) return;

    const config = JSON.parse(readFileSync(wranglerPath, 'utf8')) as {
      name?: string;
      main?: string;
      workers_dev?: boolean;
      routes?: Array<{ pattern?: string; custom_domain?: boolean }>;
      observability?: { enabled?: boolean };
      vars?: {
        NEXT_PUBLIC_SITE_URL?: string;
        ANALYSIS_ENABLED?: string;
        SYNTHETIC_UPLOADS_ENABLED?: string;
        OPENAI_MODEL?: string;
      };
    };

    expect(config).toMatchObject({
      name: 'challansakshi',
      main: 'worker.ts',
      workers_dev: false,
      routes: [{ pattern: 'challansakshi.sh1rs.com', custom_domain: true }],
      observability: { enabled: false },
      vars: {
        NEXT_PUBLIC_SITE_URL: 'https://challansakshi.sh1rs.com',
        ANALYSIS_ENABLED: 'false',
        SYNTHETIC_UPLOADS_ENABLED: 'false',
        OPENAI_MODEL: 'gpt-5.4-mini',
      },
    });
  });

  it('sets host-scoped HSTS without expanding the policy to all sh1rs.com subdomains', () => {
    expect(nextConfigSource).toContain("{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }");
    expect(nextConfigSource).not.toMatch(/includeSubDomains|preload/i);
  });
});
