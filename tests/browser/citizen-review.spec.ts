import { expect, test, type Page } from '@playwright/test';

const acceptanceNow = new Date('2026-09-05T10:00:00.000Z');
type Language = 'en' | 'hi';

const labels = {
  en: {
    menu: 'Menu', language: 'Language', source: 'Where did you open this challan?', official: 'I opened the official service', message: 'I only have an SMS or forwarded link',
    record: "Can you read your vehicle's RC or another independent vehicle record now?", recordPresent: 'Yes, it is open and readable', recordMissing: 'I do not have it',
    plateDifferent: 'The plate looks different', plateMatch: 'The plate appears to match', plateUnclear: 'The plate is hidden or too unclear to compare', photoUnavailable: 'I could not open or find the photo in that service or record',
    categoryMatch: 'The same vehicle type as my record', categoryUnclear: 'The vehicle type is unclear', offenceVisible: 'It appears visible', timeDisplayed: 'The time is displayed', locationDisplayed: 'The location is displayed',
    confirm: 'I checked these answers — see my next step', helper: 'I am helping someone who is here', helperChecked: 'I checked these entries as the helper', personConfirmed: 'I am here and confirm these final answers',
    edit: 'Edit my answers', prepare: 'Prepare my checklist', privateDevice: 'My private device', safeStop: 'Open an official service first', continue: 'Continue',
  },
  hi: {
    menu: 'मेन्यू', language: 'भाषा', source: 'आपने यह चालान कहाँ खोला?', official: 'मैंने आधिकारिक सेवा खोली', message: 'मेरे पास केवल SMS या फ़ॉरवर्ड किया लिंक है',
    record: 'क्या आप अभी अपने वाहन की RC या कोई अन्य स्वतंत्र वाहन रिकॉर्ड पढ़ सकते हैं?', recordPresent: 'हाँ, रिकॉर्ड खुला है और पढ़ने योग्य है', recordMissing: 'मेरे पास रिकॉर्ड नहीं है',
    plateDifferent: 'नंबर प्लेट अलग दिखती है', plateMatch: 'नंबर प्लेट मेल खाती दिखती है', plateUnclear: 'नंबर प्लेट छिपी है या तुलना के लिए साफ़ नहीं है', photoUnavailable: 'मैं उस सेवा या रिकॉर्ड में तस्वीर खोल या ढूँढ नहीं पाया/पाई',
    categoryMatch: 'मेरे रिकॉर्ड जैसा ही वाहन प्रकार', categoryUnclear: 'वाहन का प्रकार स्पष्ट नहीं है', offenceVisible: 'दिखाई देता लगता है', timeDisplayed: 'समय दिखाया गया है', locationDisplayed: 'स्थान दिखाया गया है',
    confirm: 'मैंने उत्तर जाँचे — अगला कदम दिखाएँ', helper: 'मैं यहाँ मौजूद व्यक्ति की मदद कर रहा/रही हूँ', helperChecked: 'सहायक के रूप में मैंने प्रविष्टियाँ जाँची हैं', personConfirmed: 'मैं यहाँ हूँ और इन अंतिम उत्तरों की पुष्टि करता/करती हूँ',
    edit: 'मेरे उत्तर बदलें', prepare: 'मेरी चेकलिस्ट तैयार करें', privateDevice: 'मेरा निजी डिवाइस', safeStop: 'पहले आधिकारिक सेवा खोलें', continue: 'आगे बढ़ें',
  },
} as const;

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: acceptanceNow });
});

async function chooseLanguage(page: Page, language: Language) {
  if (language === 'en') return;
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('group', { name: 'Language' }).getByRole('button', { name: 'हिं' }).click();
}

async function choose(page: Page, name: string) {
  const radio = page.getByRole('radio', { name, exact: true });
  await radio.click();
  await expect(radio).toBeChecked();
  expect(await radio.evaluate((node) => node === document.activeElement && node.isConnected)).toBe(true);
}

async function beginOfficial(page: Page, language: Language = 'en') {
  const text = labels[language];
  await page.goto('/review');
  await chooseLanguage(page, language);
  await choose(page, text.official);
  await choose(page, text.recordPresent);
}

async function mismatchResult(page: Page, language: Language = 'en') {
  const text = labels[language];
  await beginOfficial(page, language);
  await choose(page, text.plateDifferent);
  const before = await page.evaluate(() => scrollY);
  await page.getByRole('button', { name: text.confirm, exact: true }).click();
  await expect(page.locator('main')).toHaveAttribute('data-review-phase', 'resolve');
  expect(Math.abs((await page.evaluate(() => scrollY)) - before)).toBeLessThanOrEqual(8);
}

test.describe('compact home and product chrome', () => {
  for (const language of ['en', 'hi'] as const) {
    test(`home keeps all three routes in the 375x812 first viewport (${language})`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/');
      await chooseLanguage(page, language);
      const mainLinks = page.locator('main a');
      await expect(mainLinks).toHaveCount(3);
      expect(await mainLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual([
        '/review',
        '/review?goal=message',
        '/fastag',
      ]);
      for (let index = 0; index < 3; index += 1) {
        const box = await mainLinks.nth(index).boundingBox();
        expect(box && box.y >= 0 && box.y + box.height <= 812).toBeTruthy();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    });
  }

  for (const width of [320, 375] as const) {
    test(`header and footer satisfy mobile geometry at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/');
      const header = page.locator('[data-mobile-header]');
      const footer = page.locator('footer');
      expect((await header.boundingBox())?.height).toBeLessThanOrEqual(72);
      expect((await footer.boundingBox())?.height).toBeLessThanOrEqual(256);
      expect(await footer.locator('p').evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(16);
      await expect(footer.locator('p')).toHaveCount(1);
      await expect(footer.getByRole('link', { name: 'Safety & privacy' })).toHaveCount(1);
    });

    test(`Hindi footer content remains inside its ${width}px geometry`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/');
      await chooseLanguage(page, 'hi');
      const footer = page.locator('footer');
      const geometry = await footer.evaluate((node) => {
        const footerRect = node.getBoundingClientRect();
        const descendants = [...node.querySelectorAll('p, a')].map((child) => child.getBoundingClientRect());
        return {
          height: footerRect.height,
          clipped: descendants.some((rect) => rect.top < footerRect.top - 0.5 || rect.bottom > footerRect.bottom + 0.5 || rect.left < footerRect.left - 0.5 || rect.right > footerRect.right + 0.5),
          overflow: node.scrollHeight > node.clientHeight + 1,
        };
      });
      expect(geometry.height).toBeLessThanOrEqual(256);
      expect(geometry.clipped).toBe(false);
      expect(geometry.overflow).toBe(false);
    });
  }

  test('dark mode retains readable foreground contrast', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const ratios = await page.locator('body').evaluate(() => {
      const channels = (value: string) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      const luminance = (value: string) => {
        const [red, green, blue] = channels(value).map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      };
      const ratio = (foreground: string, background: string) => {
        const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
        return (values[0] + 0.05) / (values[1] + 0.05);
      };
      return [...document.querySelectorAll('h1, main h2, main p')].filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }).map((node) => {
        const style = getComputedStyle(node);
        let parent: Element | null = node;
        let background = 'rgb(14, 21, 28)';
        while (parent) {
          const candidate = getComputedStyle(parent).backgroundColor;
          if (candidate !== 'rgba(0, 0, 0, 0)' && candidate !== 'transparent') { background = candidate; break; }
          parent = parent.parentElement;
        }
        return ratio(style.color, background);
      });
    });
    expect(ratios.length).toBeGreaterThan(3);
    expect(Math.min(...ratios)).toBeGreaterThanOrEqual(4.5);
  });
});

test.describe('review entry and short resolution paths', () => {
  test('direct entry has native unselected radios and validation does not select a source', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/review');
    await expect(page.getByRole('group', { name: labels.en.source })).toBeVisible();
    await expect(page.locator('input[type=radio]:checked')).toHaveCount(0);
    await page.getByRole('button', { name: labels.en.continue, exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Choose an answer to continue.');
    await expect(page.locator('main')).toHaveAttribute('data-review-phase', 'check');
    await expect(page.locator('input[type=radio]:checked')).toHaveCount(0);
  });

  test('keyboard radio choices retain focus and Change reopens the selected native control', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/review');
    await page.locator('main:not([inert])').waitFor();
    const source = page.getByRole('radio', { name: labels.en.official });
    await source.focus();
    await page.keyboard.press('Space');
    await expect(source).toBeChecked();
    await expect(source).toBeFocused();
    const record = page.getByRole('radio', { name: labels.en.recordPresent });
    expect(await record.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight;
    })).toBe(true);
    await record.focus();
    await page.keyboard.press('Space');
    await expect(record).toBeFocused();
    const changeSource = page.getByRole('button', { name: 'Change: Source' });
    await changeSource.focus();
    await page.keyboard.press('Enter');
    await expect(source).toBeVisible();
    await expect(source).toBeFocused();
  });

  test('query-seeded message renders the safe stop in server HTML and first page state', async ({ page, request }) => {
    const response = await request.get('/review?goal=message');
    const html = await response.text();
    expect(html).toContain(labels.en.safeStop);
    expect(html).not.toContain(labels.en.source);
    await page.goto('/review?goal=message');
    await expect(page.locator('main')).toHaveAttribute('data-review-phase', 'resolve');
    await expect(page.getByRole('heading', { name: labels.en.safeStop })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Show me the safe next step' })).toHaveCount(0);
  });

  for (const language of ['en', 'hi'] as const) {
    test(`plate mismatch reaches self result in four actions with first result affordances visible (${language})`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await mismatchResult(page, language);
      const text = labels[language];
      await expect(page.getByRole('heading', { level: 1, name: language === 'en' ? 'Your next step' : 'आपका अगला कदम' })).toBeFocused();
      await expect(page.locator('main')).toHaveAttribute('data-device-context', 'unknown');
      const lookup = page.locator('[data-official-lookup]');
      await expect(lookup).toBeVisible();
      await expect(page.getByRole('button', { name: text.prepare, exact: true })).toBeVisible();
      const bottom = await page.getByRole('button', { name: text.prepare, exact: true }).evaluate((node) => node.getBoundingClientRect().bottom);
      expect(bottom).toBeLessThanOrEqual(780);
    });
  }

  test('editing a result preserves scroll position and invalidates the resolved phase', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mismatchResult(page);
    const before = await page.evaluate(() => scrollY);
    await page.getByRole('button', { name: labels.en.edit, exact: true }).click();
    await expect(page.locator('main')).toHaveAttribute('data-review-phase', 'check');
    expect(Math.abs((await page.evaluate(() => scrollY)) - before)).toBeLessThanOrEqual(5);
  });

  test('missing RC and unavailable photo resolve conservatively', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto('/review');
    await choose(page, labels.en.official);
    await choose(page, labels.en.recordMissing);
    await page.getByRole('button', { name: labels.en.confirm }).click();
    await expect(page.getByRole('heading', { name: 'You need clearer records' })).toBeVisible();

    await page.setViewportSize({ width: 375, height: 812 });
    await page.getByRole('button', { name: labels.en.edit }).click();
    await choose(page, labels.en.recordPresent);
    await choose(page, labels.en.photoUnavailable);
    await page.getByRole('button', { name: labels.en.confirm }).click();
    await expect(page.getByRole('heading', { name: 'You need clearer records' })).toBeVisible();
  });

  test('unclear and fully aligned branches reach their bounded findings', async ({ page }) => {
    await beginOfficial(page);
    await choose(page, labels.en.plateUnclear);
    await choose(page, labels.en.categoryUnclear);
    await page.getByRole('button', { name: labels.en.confirm }).click();
    await expect(page.getByRole('heading', { name: 'The photo is not clear enough' })).toBeVisible();

    await page.goto('/review');
    await choose(page, labels.en.official);
    await choose(page, labels.en.recordPresent);
    await choose(page, labels.en.plateMatch);
    await choose(page, labels.en.categoryMatch);
    await choose(page, labels.en.offenceVisible);
    await choose(page, labels.en.timeDisplayed);
    await choose(page, labels.en.locationDisplayed);
    await page.getByRole('button', { name: labels.en.confirm }).click();
    await expect(page.getByRole('heading', { name: 'The photo and vehicle record look alike' })).toBeVisible();
  });

  test('category-only mismatch stays bounded without an actionable grievance destination', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/review');
    await page.locator('main:not([inert])').waitFor();
    await page.locator('#review-source-official-service').check();
    await page.locator('#review-own-record-present').check();
    await page.locator('#review-plate-match').check();
    await page.locator('#review-vehicle-category-different').check();
    await page.locator('main button[data-required-action]').filter({ hasText: /see my next step/i }).click();

    await expect(page.locator('main')).toHaveAttribute('data-review-phase', 'resolve');
    await expect(page.getByRole('heading', { name: 'Possible vehicle mismatch', exact: true })).toBeVisible();
    await expect(page.locator('[data-result-finding]')).toContainText('You marked the vehicle type in the photo as different from your vehicle record.');
    const preparation = page.locator('[data-grievance-affordance]').first();
    await expect(preparation).toBeVisible();
    await expect(preparation).not.toHaveAttribute('href', /.+/);
    await expect(preparation).toHaveJSProperty('tagName', 'BUTTON');
    await expect(page.locator('a[data-grievance-affordance][href]')).toHaveCount(0);
  });

  test('helper path requires both ordered confirmations before Resolve', async ({ page }) => {
    await beginOfficial(page);
    await choose(page, labels.en.plateDifferent);
    await page.getByRole('button', { name: labels.en.helper }).click();
    await page.getByRole('button', { name: labels.en.helperChecked }).click();
    await expect(page.locator('main')).toHaveAttribute('data-review-phase', 'check');
    await page.getByRole('button', { name: labels.en.personConfirmed }).click();
    await expect(page.locator('main')).toHaveAttribute('data-review-phase', 'resolve');
  });

  test('shared devices block exports while a private-device print contains the visible summary', async ({ page }) => {
    await mismatchResult(page);
    await page.getByRole('button', { name: labels.en.prepare }).click();
    await choose(page, 'A shared device');
    await expect(page.getByRole('button', { name: 'Copy this summary' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Print this summary' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Save a text file' })).toBeDisabled();
    await expect(page.getByText('Copy, download and formatted print are off on shared devices.')).toBeVisible();

    await choose(page, labels.en.privateDevice);
    await page.getByText('Preview my summary').click();
    const summary = page.locator('[data-print-artifact] pre');
    await expect(summary).toContainText('ChallanSakshi');
    expect((await summary.textContent())?.trim().length).toBeGreaterThan(120);
    await page.evaluate(() => {
      (window as Window & { __printCalled?: boolean }).__printCalled = false;
      window.print = () => { (window as Window & { __printCalled?: boolean }).__printCalled = true; };
    });
    await page.getByRole('button', { name: 'Print this summary' }).click();
    expect(await page.evaluate(() => (window as Window & { __printCalled?: boolean }).__printCalled)).toBe(true);
    await expect(summary).not.toBeEmpty();
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('[data-print-artifact]')).toBeVisible();
    await expect(summary).toBeVisible();
    expect((await summary.textContent())?.trim().length).toBeGreaterThan(120);
  });

  test('a live clock crossing route expiry removes the link before activation', async ({ page }) => {
    await mismatchResult(page);
    const lookup = page.locator('[data-official-lookup]');
    await expect(lookup).toHaveAttribute('href', /^https:\/\//);
    await page.getByRole('button', { name: labels.en.prepare }).click();
    await choose(page, labels.en.privateDevice);
    const everyExternalAction = page.locator('main a[href^="https://"]');
    expect(await everyExternalAction.count()).toBeGreaterThan(0);
    const originalUrl = page.url();
    // Keep each timer advance below the signed 32-bit millisecond boundary.
    await page.clock.fastForward(14 * 24 * 60 * 60 * 1000);
    await page.clock.fastForward(14 * 24 * 60 * 60 * 1000);
    await expect(lookup).toHaveCount(0);
    await expect(everyExternalAction).toHaveCount(0);
    const expiredState = page.getByText('The official link needs a fresh check. Find the service independently; no case details have been sent.');
    await expect(expiredState).toBeVisible();
    await expiredState.click();
    expect(page.url()).toBe(originalUrl);
  });
});

test('case actions create no storage record or application network request', async ({ page }) => {
  const applicationRequests: string[] = [];
  await page.goto('/review');
  await expect(page.getByRole('group', { name: labels.en.source })).toBeVisible();
  page.on('request', (request) => {
    if (['fetch', 'xhr', 'websocket'].includes(request.resourceType())) applicationRequests.push(request.url());
  });
  await choose(page, labels.en.official);
  await choose(page, labels.en.recordPresent);
  await choose(page, labels.en.plateDifferent);
  await page.getByRole('button', { name: labels.en.confirm }).click();
  await page.getByRole('button', { name: labels.en.prepare }).click();
  await choose(page, labels.en.privateDevice);
  expect(applicationRequests).toEqual([]);
  expect(await page.evaluate(async () => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
    databases: indexedDB.databases ? (await indexedDB.databases()).map((entry) => entry.name) : [],
    caches: 'caches' in window ? await caches.keys() : [],
  }))).toEqual({ local: [], session: [], databases: [], caches: [] });
});
