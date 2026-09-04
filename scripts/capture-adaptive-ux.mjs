import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const previewUrl = process.env.CHALLANSAKSHI_PREVIEW_URL || 'http://127.0.0.1:3000';
const outputDir = '/tmp/challansakshi-adaptive-proof';
const viewport = { width: 375, height: 812 };
const metrics = { previewUrl, capturedAt: new Date().toISOString(), captures: [] };

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

function safeName(value) {
  return value.replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

async function waitForReady(page, route) {
  if (route === 'review') {
    await page.locator('main:not([inert])').waitFor();
  }
  const menu = page.locator('button[aria-controls="citizen-navigation-menu"]');
  await menu.waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.querySelector('button[aria-controls="citizen-navigation-menu"]')?.disabled);
}

async function selectHindi(page) {
  await page.locator('button[aria-controls="citizen-navigation-menu"]').click();
  await page.locator('#citizen-navigation-menu [role="group"] button').last().click();
  await page.locator('button[aria-controls="citizen-navigation-menu"]').waitFor({ state: 'visible' });
}

async function collectMetrics(page, name, extras = {}) {
  const snapshot = await page.evaluate(() => {
    const rect = (element) => element ? element.getBoundingClientRect().toJSON() : null;
    const visible = (element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const accessibleName = (element) => {
      const labelledBy = element.getAttribute('aria-labelledby');
      if (labelledBy) return labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ').trim();
      const explicit = element.getAttribute('aria-label');
      if (explicit) return explicit.trim();
      if (element instanceof HTMLInputElement && element.id) {
        const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
        if (label) return label.textContent?.trim() || '';
      }
      return element.textContent?.replace(/\s+/g, ' ').trim() || '';
    };
    const required = [...document.querySelectorAll('[data-required-action]')].filter(visible).map((element) => ({
      tag: element.tagName.toLowerCase(),
      name: accessibleName(element),
      rect: rect(element),
      fontSize: getComputedStyle(element).fontSize,
    }));
    const headings = [...document.querySelectorAll('h1, h2')].filter(visible).map((element) => ({
      level: element.tagName.toLowerCase(),
      text: element.textContent?.replace(/\s+/g, ' ').trim() || '',
      fontSize: getComputedStyle(element).fontSize,
      rect: rect(element),
    }));
    return {
      url: location.href,
      language: document.querySelector('[lang="hi"]') ? 'hi' : 'en',
      viewport: { width: innerWidth, height: innerHeight },
      scrollY,
      scrollHeight: document.documentElement.scrollHeight,
      horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
      activeElement: accessibleName(document.activeElement),
      header: rect(document.querySelector('[data-mobile-header]')),
      footer: rect(document.querySelector('footer')),
      productBoundary: document.querySelector('[data-product-boundary]')?.textContent?.trim() || null,
      requiredTargetCount: required.length,
      requiredTargets: required,
      headings,
      resultFinding: rect(document.querySelector('[data-result-finding]')),
      officialLookup: rect(document.querySelector('[data-official-lookup]')),
      grievanceAffordance: rect(document.querySelector('[data-grievance-affordance]')),
    };
  });
  metrics.captures.push({ name, ...snapshot, ...extras });
}

async function screenshot(page, name) {
  const filename = `${safeName(name)}.png`;
  await page.screenshot({ path: `${outputDir}/${filename}`, fullPage: true });
  return filename;
}

async function open(page, path, language = 'en') {
  await page.goto(`${previewUrl}${path}`, { waitUntil: 'networkidle' });
  await waitForReady(page, path.startsWith('/review') ? 'review' : 'home');
  if (language === 'hi') await selectHindi(page);
}

async function selectMismatchAnswers(page) {
  for (const id of ['#review-source-official-service', '#review-own-record-present', '#review-plate-different']) {
    await page.locator(id).check();
  }
}

for (const language of ['en', 'hi']) {
  const page = await browser.newPage({ viewport });
  await open(page, '/', language);
  const homeName = `home-${language}-375x812`;
  await collectMetrics(page, homeName, { screenshot: await screenshot(page, homeName) });

  await open(page, '/review', language);
  const initialName = `review-initial-${language}-375x812`;
  await collectMetrics(page, initialName, { screenshot: await screenshot(page, initialName) });

  await selectMismatchAnswers(page);
  const terminalName = `review-terminal-mismatch-${language}-375x812`;
  await collectMetrics(page, terminalName, { screenshot: await screenshot(page, terminalName) });

  const scrollBeforeConfirmation = await page.evaluate(() => scrollY);
  const terminalButtons = page.locator('main button[data-required-action]');
  await terminalButtons.nth(3).click();
  await page.locator('[data-result-finding]').waitFor();
  const scrollAfterConfirmation = await page.evaluate(() => scrollY);
  const resultName = `review-result-${language}-375x812`;
  await collectMetrics(page, resultName, {
    screenshot: await screenshot(page, resultName),
    scrollBeforeConfirmation,
    scrollAfterConfirmation,
    confirmationScrollDelta: scrollAfterConfirmation - scrollBeforeConfirmation,
  });

  const scrollBeforeEdit = await page.evaluate(() => scrollY);
  await page.locator('main button[data-required-action]').last().click();
  await page.locator('main[data-review-phase="check"]').waitFor();
  const scrollAfterEdit = await page.evaluate(() => scrollY);
  metrics.captures.push({
    name: `review-edit-scroll-${language}-375x812`,
    scrollBeforeEdit,
    scrollAfterEdit,
    editScrollDelta: scrollAfterEdit - scrollBeforeEdit,
  });
  await page.close();
}

for (const width of [320, 390]) {
  for (const language of ['en', 'hi']) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    await open(page, '/', language);
    await collectMetrics(page, `home-${language}-${width}x844-metrics`);
    await open(page, '/review', language);
    await collectMetrics(page, `review-initial-${language}-${width}x844-metrics`);
    await page.close();
  }
}

{
  const page = await browser.newPage({ viewport });
  await open(page, '/review');
  await page.locator('button[aria-controls="citizen-navigation-menu"]').click();
  await page.locator('#citizen-navigation-menu button[aria-pressed]').first().click();
  const darkName = 'review-initial-dark-375x812';
  await collectMetrics(page, darkName, { screenshot: await screenshot(page, darkName), theme: await page.locator('html').getAttribute('data-theme') });
  await page.close();
}

await browser.close();
await writeFile(`${outputDir}/metrics.json`, `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');
process.stdout.write(`${outputDir}/metrics.json\n`);
