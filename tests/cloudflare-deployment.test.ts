import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveConfig } from 'vite';

const projectRoot = resolve(import.meta.dirname, '..');
const wranglerPath = resolve(projectRoot, 'wrangler.jsonc');

describe('direct Cloudflare deployment', () => {
  it('builds with Cloudflare Workers directly instead of the Sites serving plugin', async () => {
    const config = await resolveConfig({ root: projectRoot }, 'build', 'production');
    const pluginNames = config.plugins.map((plugin) => plugin.name);

    expect(pluginNames).toContain('vite-plugin-cloudflare');
    expect(pluginNames).not.toContain('sites');
  });

  it('owns only the ChallanSakshi subdomain and keeps optional invocation logs off', () => {
    expect(existsSync(wranglerPath), 'wrangler.jsonc must define the direct production Worker').toBe(true);
    if (!existsSync(wranglerPath)) return;

    const config = JSON.parse(readFileSync(wranglerPath, 'utf8')) as {
      name?: string;
      workers_dev?: boolean;
      routes?: Array<{ pattern?: string; custom_domain?: boolean }>;
      observability?: { enabled?: boolean };
      vars?: { NEXT_PUBLIC_SITE_URL?: string };
    };

    expect(config).toMatchObject({
      name: 'challansakshi',
      workers_dev: false,
      routes: [{ pattern: 'challansakshi.sh1rs.com', custom_domain: true }],
      observability: { enabled: false },
      vars: { NEXT_PUBLIC_SITE_URL: 'https://challansakshi.sh1rs.com' },
    });
  });
});
