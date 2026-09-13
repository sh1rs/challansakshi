import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Standalone release smoke check. Fresh browser contexts contain fictional QA
// inputs only; every non-read request and every external request is blocked.
const require = createRequire(import.meta.url);
const { chromium, expect } = require('@playwright/test');
const productionOrigin = 'https://challansakshi.sh1rs.com';
const supplied = new URL(process.env.PUBLIC_QA_BASE || productionOrigin);
const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(supplied.hostname);
if (supplied.username || supplied.password || supplied.search || supplied.hash || supplied.pathname !== '/' ||
    !(supplied.origin === productionOrigin || (loopback && ['http:', 'https:'].includes(supplied.protocol)))) {
  throw new Error('PUBLIC_QA_BASE must be the approved production origin or an HTTP(S) loopback origin, with no credentials, path, query or fragment.');
}
const base = supplied.origin;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const output = path.resolve(process.env.PUBLIC_QA_OUTPUT || `/tmp/challansakshi-public-live-qa-${stamp}`);
if (!output.startsWith('/tmp/') && !output.startsWith('/private/tmp/')) throw new Error('PUBLIC_QA_OUTPUT must be a directory under /tmp.');
await mkdir(output, { recursive: true });
const marker = 'FICTIONAL_PUBLIC_QA_';
const report = { base, startedAt: new Date().toISOString(), output, status: 'running', scenarios: [], screenshots: [], http: [], errors: [], warnings: [], blockedWrites: [], blockedExternal: [], leakedMarkers: [] };
console.log(`Starting isolated read-only public QA against ${base}; output ${output}`);
const browser = await chromium.launch({ headless: true });
const assertion = expect.configure({ timeout: 12_000 });
const knownNotFound = `${base}/not-a-real-route`;

function recordError(message) { report.errors.push(message); }
function isMarker(value = '') {
  let decoded = value;
  try { decoded = decodeURIComponent(value); } catch { /* Raw value is still checked. */ }
  return value.includes(marker) || decoded.includes(marker);
}
async function newContext(viewport) {
  const context = await browser.newContext({ viewport, locale: 'en-IN', timezoneId: 'Asia/Kolkata', serviceWorkers: 'block', acceptDownloads: false });
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const material = `${request.url()} ${request.postData() ?? ''} ${JSON.stringify(request.headers())}`;
    if (isMarker(material)) {
      report.leakedMarkers.push({ method: request.method(), url: `${url.origin}${url.pathname}` });
      await route.abort('blockedbyclient'); return;
    }
    if (!['GET', 'HEAD'].includes(request.method())) {
      report.blockedWrites.push({ method: request.method(), url: `${url.origin}${url.pathname}` });
      await route.abort('blockedbyclient'); return;
    }
    if (url.origin !== base) {
      report.blockedExternal.push({ method: request.method(), origin: url.origin, pathname: url.pathname });
      await route.abort('blockedbyclient'); return;
    }
    await route.continue();
  });
  context.on('page', page => {
    page.on('pageerror', error => recordError({ type: 'pageerror', url: page.url(), message: error.message }));
    page.on('console', entry => {
      if (entry.type() === 'warning') report.warnings.push({ url: page.url(), message: entry.text() });
      if (entry.type() !== 'error') return;
      if ((page.url() === knownNotFound || entry.location().url === knownNotFound) && /Failed to load resource.*404/.test(entry.text())) return;
      recordError({ type: 'console', url: page.url(), message: entry.text() });
    });
    page.on('response', response => {
      if (response.status() >= 400 && !(response.url() === knownNotFound && response.status() === 404)) {
        recordError({ type: 'http-resource', url: response.url(), status: response.status() });
      }
    });
    page.on('dialog', async dialog => {
      recordError({ type: 'unexpected-dialog', url: page.url(), message: dialog.message() });
      await dialog.dismiss();
    });
  });
  return context;
}
async function checkPage(page, pathname, label) {
  assertion(new URL(page.url()).pathname, `${label}: page identity`).toBe(pathname);
  await assertion(page).toHaveTitle(/ChallanSakshi/i);
  await assertion(page.locator('main')).toBeVisible();
  await assertion(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  const state = await page.evaluate(() => ({
    meaningful: (document.querySelector('main')?.textContent?.trim().length || 0) > 30,
    overflow: document.documentElement.scrollWidth - innerWidth,
    overlay: Boolean(document.querySelector('vite-error-overlay, nextjs-portal [data-nextjs-dialog], #webpack-dev-server-client-overlay')),
  }));
  assertion(state.meaningful, `${label}: meaningful content`).toBe(true);
  assertion(state.overflow, `${label}: horizontal overflow`).toBeLessThanOrEqual(1);
  assertion(state.overlay, `${label}: framework error overlay`).toBe(false);
}
async function screenshot(page, name, fullPage = false) {
  const file = path.join(output, `${name}.png`);
  await page.screenshot({ path: file, fullPage, animations: 'disabled' });
  report.screenshots.push(file);
}
async function go(page, pathname) {
  const response = await page.goto(`${base}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  assertion(response?.status(), `${pathname}: document HTTP status`).toBe(pathname === '/not-a-real-route' ? 404 : 200);
  await assertion(page.getByRole('button', { name: /^(Menu|मेन्यू)$/ })).toBeEnabled();
  return response;
}
async function scenario(name, viewport, run) {
  const entry = { name, status: 'running', startedAt: new Date().toISOString() };
  report.scenarios.push(entry);
  const context = await newContext(viewport);
  let page;
  try {
    page = await context.newPage();
    page.setDefaultTimeout(12_000);
    page.setDefaultNavigationTimeout(45_000);
    await run(page, context);
    entry.status = 'passed';
    console.log(`PASS ${name}`);
  } catch (error) {
    entry.status = 'failed'; entry.error = error.stack || String(error);
    if (page && !page.isClosed()) await screenshot(page, `failure-${name.replace(/[^a-z0-9]+/gi, '-')}`).catch(() => {});
    console.error(`FAIL ${name}: ${error.message}`);
  } finally { entry.finishedAt = new Date().toISOString(); await context.close(); }
}

try {
  await scenario('home to document review and manual mismatch', { width: 1440, height: 1000 }, async page => {
    await go(page, '/'); await checkPage(page, '/', 'desktop home');
    await page.keyboard.press('Tab');
    await assertion(page.getByRole('button', { name: 'Skip to content', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await assertion(page.locator('main')).toBeFocused();
    const menu = page.getByRole('button', { name: 'Menu', exact: true });
    await menu.click(); await assertion(menu).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await assertion(menu).toBeFocused(); await assertion(menu).toHaveAttribute('aria-expanded', 'false');
    await page.locator('main').focus();
    await assertion(page.getByRole('link', { name: 'Review my challan', exact: true })).toBeVisible();
    const metadata = await page.evaluate(() => ({
      canonical: document.querySelector('link[rel=canonical]')?.getAttribute('href'),
      description: document.querySelector('meta[name=description]')?.getAttribute('content'),
      image: document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
      graphs: [...document.querySelectorAll('script[type="application/ld+json"]')].map(node => JSON.parse(node.textContent || '{}')),
    }));
    assertion(new URL(metadata.canonical).href).toBe(`${productionOrigin}/`);
    assertion(metadata.description).toMatch(/Free, independent/i);
    assertion(metadata.image).toBe(`${productionOrigin}/social-preview.jpg`);
    assertion(metadata.graphs.flatMap(item => item['@graph'] || [item]).some(item => item['@type'] === 'Person' && item.name === 'Shourya Banda')).toBe(true);
    await screenshot(page, 'home-desktop-1440x1000');
    await page.setViewportSize({ width: 390, height: 844 });
    await checkPage(page, '/', 'phone home'); await screenshot(page, 'home-phone-390x844');
    const button = await page.getByRole('link', { name: 'Review my challan', exact: true }).boundingBox();
    assertion(Boolean(button && button.y >= 0 && button.y + button.height <= 844), 'home primary action visible without scrolling').toBe(true);
    await page.getByRole('link', { name: 'Review my challan', exact: true }).click();
    await assertion(page.locator('main[data-document-review]')).not.toHaveAttribute('inert');
    await checkPage(page, '/review', 'document reader');
    await page.getByRole('link', { name: 'No usable documents? Review manually', exact: true }).click();
    await assertion(page.locator('main[data-review-phase="check"]')).not.toHaveAttribute('inert');
    for (const id of ['source-official-service', 'own-record-present', 'plate-different']) await page.locator(`#review-${id}`).check();
    await page.getByRole('button', { name: 'I checked these answers — see my next step', exact: true }).click();
    await assertion(page.locator('main')).toHaveAttribute('data-review-phase', 'resolve');
    await assertion(page.locator('[data-result-finding]')).toContainText(/different|differ/i);
    await assertion(page.getByRole('heading', { level: 1 })).toHaveText('Your next step');
    await assertion(page.locator('[data-grievance-affordance]')).not.toHaveAttribute('href');
    await checkPage(page, '/manual/challan', 'manual mismatch');
    await screenshot(page, 'manual-mismatch-phone');
  });

  await scenario('mobile message result focus and clear', { width: 390, height: 844 }, async page => {
    await go(page, '/message-check'); await checkPage(page, '/message-check', 'message tool');
    await page.locator('#message-body').fill(`${marker}SMS Install https://fictional-warning.example/RTO.apk and send your OTP immediately.`);
    await page.getByRole('button', { name: 'Check message', exact: true }).click();
    await assertion(page.getByRole('heading', { name: 'Pause and verify', exact: true })).toBeFocused();
    await assertion(page.locator('a[href*="fictional-warning.example"]')).toHaveCount(0);
    await checkPage(page, '/message-check', 'message result'); await screenshot(page, 'message-result-phone');
    await page.getByRole('button', { name: 'Clear message', exact: true }).click();
    await assertion(page.locator('#message-body')).toHaveValue('');
    await assertion(page.locator('#message-body')).toBeFocused();
    await assertion(page.locator('[data-message-result]')).toHaveCount(0);
  });

  await scenario('mobile exact reply passage and source position', { width: 390, height: 844 }, async page => {
    await go(page, '/reply-review');
    await page.locator('#reply-source-label').fill(`${marker}REPLY: fictional QA source`);
    await page.locator('#reply-body').fill('The photo was checked. The receipt is missing. The photo was checked.');
    await page.locator('#reply-point-1').fill(`${marker}POINT Was the photo checked?`);
    await page.getByText('Or paste an exact passage', { exact: true }).click();
    await page.getByLabel('Exact words from the reply', { exact: true }).fill('The photo was checked!');
    const link = page.getByRole('button', { name: 'Link pasted passage to point 1', exact: true });
    await assertion(link).toBeDisabled();
    await page.getByLabel('Exact words from the reply', { exact: true }).fill('The photo was checked.');
    await assertion(link).toBeDisabled();
    await page.getByLabel('Which occurrence?', { exact: true }).selectOption('47');
    await link.click(); await assertion(page.locator('#reply-status-1')).toBeFocused();
    await assertion(page.locator('blockquote')).toHaveText('The photo was checked.');
    await assertion(page.getByText('Reply text, characters 48–69', { exact: true })).toBeVisible();
    await page.locator('#reply-status-1').selectOption('addressed');
    await page.getByRole('button', { name: 'Prepare my follow-up note', exact: true }).click();
    await assertion(page.locator('#reply-note-title')).toBeFocused();
    await assertion(page.locator('[data-reply-note]')).toContainText('characters 48–69');
    await assertion(page.locator('[data-reply-download]')).toHaveCount(0);
    await checkPage(page, '/reply-review', 'reply note'); await screenshot(page, 'reply-source-linked-note-phone');
    await page.getByRole('button', { name: 'Clear all text', exact: true }).click();
    await assertion(page.locator('#reply-body')).toHaveValue('');
    await assertion(page.locator('[data-reply-note]')).toHaveCount(0);
  });

  await scenario('guest mobility save and clear session', { width: 390, height: 844 }, async page => {
    const storageKey = 'challansakshi-mobility-cases-v1';
    const title = `${marker}CASE fictional licence renewal`;
    await go(page, '/mobility');
    await page.getByLabel('Your task', { exact: true }).fill('I need to renew my licence');
    await page.getByRole('button', { name: 'Find a starting point', exact: true }).click();
    await assertion(page.getByRole('heading', { name: 'Suggested starting point', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Create my plan', exact: true }).click();
    await page.getByLabel('Case title', { exact: true }).fill(title);
    await assertion(page.getByRole('button', { name: 'Save case on this device', exact: true })).toBeDisabled();
    assertion(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
    await page.getByLabel('This is my private device. I choose to save this case here.', { exact: true }).check();
    await page.getByRole('button', { name: 'Save case on this device', exact: true }).click();
    await assertion(page.getByText('Saved on this device. You can return to this case for 90 days after this save.', { exact: true })).toBeVisible();
    const saved = await page.evaluate(key => localStorage.getItem(key), storageKey);
    assertion(JSON.parse(saved).cases[0].title).toBe(title);
    assertion(new URL(page.url()).hash).toMatch(/^#case=[a-z0-9-]+$/);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await assertion(page.getByLabel('Case title', { exact: true })).toHaveValue(title);
    await checkPage(page, '/mobility', 'saved guest case'); await screenshot(page, 'mobility-saved-guest-case-phone');
    await page.getByLabel('Your editable request / preparation note', { exact: true }).fill(`${marker}UNSAVED fictional working note`);
    await page.getByRole('button', { name: 'Clear this session', exact: true }).click();
    await assertion(page.getByRole('heading', { name: 'This session is cleared', exact: true })).toBeFocused();
    await assertion(page.getByLabel('Case title', { exact: true })).toHaveCount(0);
    assertion(await page.evaluate(() => document.body.textContent)).not.toContain(marker);
    assertion(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe(saved);
    await checkPage(page, '/mobility', 'cleared guest session'); await screenshot(page, 'mobility-cleared-session-phone');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await assertion(page.getByRole('heading', { name: 'This session is cleared', exact: true })).toBeVisible();
    // Context disposal removes all fictional saved state after this scenario.
  });

  await scenario('Hindi dark mode creator and recovery', { width: 320, height: 844 }, async page => {
    await go(page, '/');
    await page.getByLabel('Display language', { exact: true }).selectOption('hi');
    await page.getByRole('button', { name: 'मेन्यू', exact: true }).click();
    await page.getByRole('button', { name: 'डार्क मोड', exact: true }).click();
    await assertion(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.keyboard.press('Escape');
    await checkPage(page, '/', 'Hindi dark home 320'); await screenshot(page, 'home-hindi-dark-320x844');
    await go(page, '/about');
    await assertion(page.locator('main')).toContainText('Shourya Banda');
    await assertion(page.locator('main a[href="tel:+916305640566"]')).toHaveText('+91 63056 40566');
    await assertion(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await assertion(page.locator('main')).toContainText('मुफ़्त');
    await checkPage(page, '/about', 'Hindi dark About 320'); await screenshot(page, 'about-hindi-dark-320x844', true);
    await go(page, '/not-a-real-route');
    await assertion(page.getByRole('heading', { name: 'यह पेज नहीं मिला', exact: true })).toBeVisible();
    await checkPage(page, '/not-a-real-route', 'Hindi recovery'); await screenshot(page, 'not-found-hindi-dark-phone');
    await page.getByRole('link', { name: 'होम पर लौटें', exact: true }).click();
    await assertion(page).toHaveURL(`${base}/`);
  });

  await scenario('disabled account and public discovery HTTP', { width: 390, height: 844 }, async (page, context) => {
    await go(page, '/account');
    await assertion(page.getByText('Cloud accounts are not enabled for this public release.', { exact: false })).toBeVisible();
    await assertion(page.getByRole('link', { name: 'Continue with Google', exact: true })).toHaveCount(0);
    await assertion(page.getByRole('link', { name: 'Go to my mobility cases', exact: true })).toHaveAttribute('href', '/mobility');
    await checkPage(page, '/account', 'disabled account'); await screenshot(page, 'guest-only-account-phone');
    const paths = ['/api/account/status', '/robots.txt', '/sitemap.xml', '/manifest.webmanifest', '/llms.txt', '/llm.txt', '/llms-full.txt', '/favicon.ico', '/favicon.svg', '/favicon-96x96.png', '/apple-touch-icon.png', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png', '/social-preview.jpg'];
    const texts = {};
    for (const pathname of paths) {
      const response = await context.request.get(`${base}${pathname}`, { maxRedirects: 0, timeout: 30_000 });
      const headers = response.headers(); const body = await response.body();
      report.http.push({ pathname, status: response.status(), contentType: headers['content-type'], bytes: body.length });
      assertion(response.status(), `${pathname} HTTP`).toBe(200);
      assertion(body.length, `${pathname} nonempty`).toBeGreaterThan(0);
      if (pathname === '/api/account/status') {
        assertion(headers['x-content-type-options'], `${pathname} MIME protection`).toBe('nosniff');
        assertion(await response.json()).toEqual({ configured: false, authenticated: false });
        assertion(headers['cache-control']).toContain('no-store');
        assertion(headers['x-robots-tag']).toContain('noindex');
      } else if (pathname === '/manifest.webmanifest') {
        const manifest = await response.json(); assertion(manifest.short_name).toBe('ChallanSakshi'); assertion(manifest.start_url).toBe('/');
        assertion(manifest.icons.some(icon => icon.purpose === 'maskable')).toBe(true);
      } else if (/\.(?:png|jpg|ico|svg)$/.test(pathname)) {
        assertion(headers['content-type']).toMatch(/^image\//i);
        assertion(body.length).toBeGreaterThan(100);
      } else { texts[pathname] = body.toString('utf8'); }
    }
    assertion(texts['/robots.txt']).toContain(`Sitemap: ${productionOrigin}/sitemap.xml`);
    assertion(texts['/robots.txt']).toContain('Disallow: /api/');
    assertion(texts['/sitemap.xml']).toContain(`${productionOrigin}/about`);
    assertion(texts['/sitemap.xml']).not.toMatch(/\/account<|\/helper<|\/demo(?:\/|<)/);
    assertion(texts['/llms.txt']).toBe(texts['/llm.txt']);
    assertion(texts['/llms.txt']).toContain('not a government website');
    assertion(texts['/llms.txt']).toContain('Shourya Banda');
    assertion(texts['/llms-full.txt']).toContain('Frequently asked questions');
    assertion(texts['/llms-full.txt']).toContain('63056 40566');
  });

  assertion(report.blockedWrites, 'no outgoing writes attempted').toEqual([]);
  assertion(report.blockedExternal, 'no external requests attempted').toEqual([]);
  assertion(report.leakedMarkers, 'fictional private markers stayed in the browser').toEqual([]);
  assertion(report.errors, 'no page/console/resource errors').toEqual([]);
  assertion(report.scenarios.every(item => item.status === 'passed'), 'all scenarios passed').toBe(true);
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.failure = error.stack || String(error); process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(path.join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
  console.log(JSON.stringify({ status: report.status, base, report: path.join(output, 'report.json'), screenshots: report.screenshots.length, scenarios: report.scenarios.map(({ name, status }) => ({ name, status })) }, null, 2));
}
