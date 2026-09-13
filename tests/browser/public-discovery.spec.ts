import { expect, test } from '@playwright/test';

const origin = 'https://challansakshi.sh1rs.com';
const publicRoutes = ['/', '/about', '/review', '/manual/challan', '/fastag', '/message-check', '/reply-review', '/mobility', '/sources', '/privacy', '/safety'];

test('public HTML exposes distinct search and social metadata before JavaScript', async ({ request }) => {
  test.setTimeout(90_000);
  const titles = new Set<string>();
  for (const route of publicRoutes) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
    const html = await response.text();
    const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    expect(title, route).toBeTruthy();
    expect(titles.has(title!), route).toBe(false);
    titles.add(title!);
    const canonical = html.match(/rel="canonical" href="([^"]+)"/)?.[1];
    const socialUrl = html.match(/property="og:url" content="([^"]+)"/)?.[1];
    expect(canonical, route).toBeTruthy();
    expect(socialUrl, route).toBeTruthy();
    expect(new URL(canonical!).href, route).toBe(`${origin}${route}`);
    expect(new URL(socialUrl!).href, route).toBe(`${origin}${route}`);
    expect(html, route).toContain('name="twitter:card" content="summary_large_image"');
    expect(html, route).toContain('name="description"');
    expect(html, route).not.toMatch(/name="robots" content="[^"]*noindex/);
    expect(html, route).toContain(`${origin}/social-preview.jpg`);
  }
});

test('personal and fictional pages are excluded from indexing but remain usable', async ({ request }) => {
  test.setTimeout(90_000);
  for (const route of ['/account', '/helper', '/dashboard', '/extension', '/demo', '/demo/fastag', '/demo/test-lab', '/demo/test-lab/operator', '/demo/assistance-lab']) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
    expect(await response.text(), route).toMatch(/name="robots" content="[^"]*noindex/);
  }
  const alias = await request.get('/toll');
  expect(await alias.text()).toContain(`rel="canonical" href="${origin}/fastag"`);
});

test('crawl files discover public canonical routes without indexing private tools', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  const robotText = await robots.text();
  expect(robotText).toContain(`Sitemap: ${origin}/sitemap.xml`);
  expect(robotText).toContain('Allow: /');
  expect(robotText).toContain('Disallow: /api/');
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  const xml = await sitemap.text();
  for (const route of publicRoutes) expect(xml).toContain(`<loc>${origin}${route}</loc>`);
  expect(xml).not.toMatch(/<loc>[^<]*(?:\/account|\/helper|\/dashboard|\/demo|\/extension|\/toll)<\/loc>/);
  expect(xml).not.toContain('localhost');
});

test('machine-readable summaries serve real text and retain the same facts across aliases', async ({ request }) => {
  const primary = await request.get('/llms.txt');
  const alias = await request.get('/llm.txt');
  const full = await request.get('/llms-full.txt');
  for (const response of [primary, alias, full]) {
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/plain');
  }
  const summary = await primary.text();
  expect(await alias.text()).toBe(summary);
  expect(summary).toContain('# ChallanSakshi');
  expect(summary).toContain('Shourya Banda');
  expect(summary).toContain('not a government website');
  expect(summary).toContain(`${origin}/privacy`);
  expect(await full.text()).toContain('## Frequently asked questions');
});

test('brand icons and a small share image resolve with the right media types', async ({ request }) => {
  for (const [path, type] of [['/favicon.ico', 'image/'], ['/favicon.svg', 'image/svg+xml'], ['/favicon-96x96.png', 'image/png'], ['/apple-touch-icon.png', 'image/png'], ['/icons/icon-192.png', 'image/png'], ['/icons/icon-512.png', 'image/png'], ['/icons/icon-maskable-512.png', 'image/png'], ['/social-preview.jpg', 'image/jpeg']]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()['content-type'], path).toContain(type);
    expect((await response.body()).byteLength, path).toBeLessThan(150_000);
  }
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBe(true);
  const content = await manifest.json();
  expect(content.start_url).toBe('/');
  expect(content.icons.some((icon: { purpose: string }) => icon.purpose === 'maskable')).toBe(true);
});

test('about content, creator credit and Hindi controls work on a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/about');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A little clarity. A better next step.');
  await expect(page.getByRole('heading', { name: 'Built by Shourya Banda' })).toBeVisible();
  await expect(page.locator('a[href="tel:+916305640566"]')).toHaveAttribute('href', 'tel:+916305640566');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByText('Is ChallanSakshi a government website?', { exact: true }).click();
  await expect(page.getByText(/It is not affiliated with a government authority, police service/)).toBeVisible();
  await page.getByRole('combobox', { name: 'Display language' }).selectOption('hi');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('थोड़ी स्पष्टता। एक बेहतर अगला कदम।');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
