import { expect, test } from '@playwright/test';

const origin = 'https://challansakshi.sh1rs.com';
const publicRoutes = ['/', '/about', '/guides', '/guides/wrong-e-challan', '/guides/fastag-wrong-deduction', '/guides/fake-challan-message', '/review', '/manual/challan', '/fastag', '/message-check', '/reply-review', '/mobility', '/sources', '/privacy', '/safety'];

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
  for (const route of publicRoutes) expect(summary).toContain(`${origin}${route}`);
  expect(await full.text()).toContain('## Frequently asked questions');
});

test('brand icons and a small share image resolve with the right media types', async ({ request }) => {
  for (const [path, type] of [['/favicon.ico', 'image/'], ['/favicon.svg', 'image/svg+xml'], ['/favicon-96x96.png', 'image/png'], ['/apple-touch-icon.png', 'image/png'], ['/icons/icon-192.png', 'image/png'], ['/icons/icon-512.png', 'image/png'], ['/icons/icon-maskable-512.png', 'image/png'], ['/brand/mark.svg', 'image/svg+xml'], ['/brand/logo-square.png', 'image/png'], ['/social-preview.jpg', 'image/jpeg']]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()['content-type'], path).toContain(type);
    const bytes = await response.body();
    expect(bytes.byteLength, path).toBeLessThan(150_000);
    if (path === '/brand/logo-square.png') {
      expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(bytes.readUInt32BE(16)).toBe(512);
      expect(bytes.readUInt32BE(20)).toBe(512);
    }
  }
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBe(true);
  const content = await manifest.json();
  expect(content.start_url).toBe('/');
  expect(content.icons.some((icon: { purpose: string }) => icon.purpose === 'maskable')).toBe(true);
});

test('public identity connects the project, app and crawlable logo before JavaScript', async ({ request }) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  const html = await response.text();
  const structuredData = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]));
  const graph = structuredData.flatMap((data) => data['@graph'] ?? [data]);
  const project = graph.find((node) => node['@type'] === 'Organization');
  const application = graph.find((node) => node['@type'] === 'WebApplication');
  const website = graph.find((node) => node['@type'] === 'WebSite');
  expect(project).toMatchObject({
    name: 'ChallanSakshi',
    url: `${origin}/`,
    logo: {
      '@type': 'ImageObject',
      url: `${origin}/brand/logo-square.png`,
      contentUrl: `${origin}/brand/logo-square.png`,
      width: 512,
      height: 512,
    },
  });
  expect(website).toMatchObject({ name: project.name, publisher: { '@id': project['@id'] } });
  expect(application).toMatchObject({ name: project.name, image: { '@id': project.logo['@id'] } });
  const iconLinks = [...html.matchAll(/<link\b[^>]*\brel="icon"[^>]*>/g)].map((match) => match[0]);
  for (const [path, type] of [['/favicon.svg', 'image/svg+xml'], ['/favicon-96x96.png', 'image/png'], ['/favicon.ico', 'image/x-icon']]) {
    const link = iconLinks.find((tag) => tag.includes(`href="${path}"`));
    expect(link, path).toContain(`type="${type}"`);
  }
});

test('about content, creator credit and Hindi controls work on a small phone', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') runtimeErrors.push(message.text());
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/about');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What is ChallanSakshi?');
  await expect(page.getByRole('heading', { name: 'Built by Shourya Banda' })).toBeVisible();
  await expect(page.locator('a[href="tel:+916305640566"]')).toHaveAttribute('href', 'tel:+916305640566');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  // A rendered language change establishes client hydration before toggling native
  // details, whose open attribute can otherwise change before React takes over.
  await page.getByRole('combobox', { name: 'Display language' }).selectOption('hi');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ChallanSakshi क्या है?');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('combobox', { name: 'Display language' }).selectOption('en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What is ChallanSakshi?');
  await page.getByText('Is ChallanSakshi a government website?', { exact: true }).click();
  await expect(page.getByText(/It is not affiliated with a government authority, police service/)).toBeVisible();
  await page.getByRole('combobox', { name: 'Display language' }).selectOption('hi');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ChallanSakshi क्या है?');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(runtimeErrors).toEqual([]);
});
