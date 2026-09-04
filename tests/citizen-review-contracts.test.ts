import { readFileSync } from 'node:fs';
import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LocalRecordIntake, type LocalRecordSelection } from '../components/public-beta/LocalRecordIntake';
import CitizenReviewApp from '../components/public-beta/CitizenReviewApp';
import { PublicBetaShell } from '../components/public-beta/PublicBetaShell';
import { getCitizenReviewPresentation } from '../lib/citizen-review-presentation';

const reviewSource = readFileSync(
  new URL('../components/public-beta/CitizenReviewApp.tsx', import.meta.url),
  'utf8',
);
const presentationSource = readFileSync(
  new URL('../lib/citizen-review-presentation.ts', import.meta.url),
  'utf8',
);
const publicStyles = readFileSync(
  new URL('../components/public-beta/PublicBeta.module.css', import.meta.url),
  'utf8',
);
const publicBaseStyles = publicStyles.slice(0, publicStyles.indexOf('@media'));
const chromeStyles = readFileSync(
  new URL('../components/shared/CitizenChrome.module.css', import.meta.url),
  'utf8',
);
const guidedStyles = readFileSync(
  new URL('../components/guided/GuidedStepHeader.module.css', import.meta.url),
  'utf8',
);
const securityConfig = readFileSync(
  new URL('../next.config.ts', import.meta.url),
  'utf8',
);
const handoffControllerSource = readFileSync(
  new URL('../lib/citizen-review-handoff-controller.ts', import.meta.url),
  'utf8',
);

function mediaBlock(source: string, query: string) {
  const marker = `@media ${query}`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return '';
  const openIndex = source.indexOf('{', markerIndex);
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(openIndex + 1, index);
  }
  return '';
}

function expectExplicitMinimumPixelRule(source: string, selector: string, minimum: 15 | 16) {
  const matchingRule = [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((match) => (
    match[1].split(',').map((item) => item.trim()).includes(selector)
  )).at(-1);
  const size = Number(matchingRule?.[2].match(/font-size:\s*(\d+)px/)?.[1] ?? 0);
  expect(size, selector).toBeGreaterThanOrEqual(minimum);
}

// Controls (inputs, selects, buttons, links) stay at 16px on narrow screens so
// mobile browsers never zoom into them; reading copy may sit at 15px.
function expectExplicitSixteenPixelRule(source: string, selector: string) {
  expectExplicitMinimumPixelRule(source, selector, 16);
}

function expectExplicitFifteenPixelRule(source: string, selector: string) {
  expectExplicitMinimumPixelRule(source, selector, 15);
}

describe('citizen review release contracts', () => {
  it('derives confirmation and artifact readiness from the current signature', () => {
    expect(reviewSource).toMatch(/confirmedSignature/);
    expect(reviewSource).toMatch(/factsConfirmed\s*=\s*confirmedSignature\s*===\s*signature/);
    expect(reviewSource).not.toMatch(/\[factsConfirmed,\s*setFactsConfirmed\]\s*=\s*useState\(false\)/);
    expect(reviewSource).toMatch(/operationToken/);
    expect(reviewSource).toMatch(/signatureRef\.current\s*===\s*actionSignature/);
    expect(reviewSource).toMatch(
      /const changeHelperConfirmation[\s\S]*?invalidateArtifact\(\)[\s\S]*?setHelperSignature/,
    );
  });

  it('integrates the tested inactivity guard with the single clear-and-exit path', () => {
    expect(reviewSource).toMatch(/startSharedDeviceInactivityGuard/);
    expect(reviewSource).toMatch(/windowTarget:\s*window/);
    expect(reviewSource).toMatch(/documentTarget:\s*document/);
    expect(reviewSource).toMatch(/onExpire:\s*\(\)\s*=>\s*clearAndExitRef\.current\(\)/);
    expect(reviewSource).toMatch(/const clearAndExit/);
    expect(reviewSource.match(/window\.location\.replace\('\/'\)/g)).toHaveLength(1);
    expect(getCitizenReviewPresentation('en', false).sharedInactivityNotice).toBe(
      'For safety, this review clears after 10 minutes without deliberate activity.',
    );
    expect(getCitizenReviewPresentation('hi', true).sharedInactivityNotice).toBe(
      'सुरक्षा के लिए, 10 मिनट तक कोई जानबूझकर गतिविधि न होने पर यह समीक्षा साफ़ हो जाती है।',
    );
  });

  it('clears errors on stage changes and scopes them to the active stage', () => {
    expect(reviewSource).toMatch(/type ReviewError\s*=\s*\{\s*step:\s*Step;\s*message:\s*string/);
    expect(reviewSource).toMatch(/const goToStep/);
    expect(reviewSource).toMatch(/setError\(null\)/);
    expect(reviewSource).toMatch(/error\?\.step\s*===\s*step/);
    expect(reviewSource).toMatch(/const invalidate\s*=\s*\(\)\s*=>\s*\{[\s\S]*?setError\(null\)/);
  });

  it('avoids claiming that the notice source itself was confirmed', () => {
    expect(reviewSource).toContain('Check the notice on an official service first');
    expect(reviewSource).toContain('पहले आधिकारिक सेवा पर नोटिस जाँचें');
    expect(reviewSource).not.toContain('पहले नोटिस के स्रोत की पुष्टि करें');
  });

  it('makes manual entry and a selected official record mutually exclusive', () => {
    const manualHandler = reviewSource.match(/const chooseManualEntry\s*=\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\};/)?.[1] ?? '';
    expect(manualHandler).toMatch(/URL\.revokeObjectURL\(recordSelectionRef\.current\.previewUrl\)/);
    expect(manualHandler).toMatch(/setRecordSelection\(null\)/);
    expect(manualHandler).toMatch(/setManualEntryMode\(true\)/);
  });

  it('lets a message-only source reach the promised safe stop without evidence intake', () => {
    const sourceHandler = reviewSource.match(
      /const continueSource\s*=\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\};/,
    )?.[1] ?? '';
    const safeStopIndex = sourceHandler.indexOf("answers.sourceStatus === 'message-only'");
    const evidenceGateIndex = sourceHandler.indexOf('!recordSelection && !manualEntryMode');

    expect(safeStopIndex).toBeGreaterThanOrEqual(0);
    expect(evidenceGateIndex).toBeGreaterThanOrEqual(0);
    expect(safeStopIndex).toBeLessThan(evidenceGateIndex);
    expect(sourceHandler).toMatch(
      /if \(answers\.sourceStatus === 'message-only'\) \{\s*goToStep\('result'\);\s*return;/,
    );
  });

  it('renders evidence as a native accessible table', () => {
    expect(reviewSource).toMatch(/buildCitizenEvidencePresentationView/);
    expect(reviewSource).toMatch(/<table\b/);
    expect(reviewSource).toMatch(/<caption\b/);
    expect(reviewSource).toMatch(/<thead\b/);
    expect(reviewSource).toMatch(/<th\s+scope="col"/);
    expect(reviewSource).toMatch(/<tbody\b/);
    expect(reviewSource).toMatch(/<td\b/);
    expect(reviewSource).not.toMatch(/role="table"/);
  });

  it('sets the public-beta root language and keeps localized Quick Exit text in the DOM', () => {
    const shellProps: ComponentProps<typeof PublicBetaShell> = {
      language: 'hi',
      setLanguage: () => undefined,
      service: 'ChallanSakshi',
      serviceHindi: 'चालान साक्षी',
      onQuickExit: () => undefined,
      children: createElement('main'),
    };
    const html = renderToStaticMarkup(createElement(PublicBetaShell, shellProps));

    expect(html).toContain('lang="hi"');
    expect(html).toContain('aria-label="चालान साक्षी होम"');
    expect(html).toContain('>तुरंत बाहर निकलें और साफ़ करें<');
    expect(getCitizenReviewPresentation('hi', false).table.sourceFallback).toBe(
      'नागरिक द्वारा दर्ज स्रोत',
    );
    expect(publicStyles).not.toMatch(/\.quickExit::(?:before|after)[^{]*\{[^}]*content\s*:/);
  });

  it('carries the single product boundary in the footer instead of repeating it on every step', () => {
    const html = renderToStaticMarkup(createElement(CitizenReviewApp));
    const footer = html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0] ?? '';
    const credentialWarning = 'Never enter a government password, CAPTCHA, OTP, Aadhaar, or payment credentials here.';

    expect(footer).toContain(credentialWarning);
    expect(footer).toContain('Your files and answers stay in this browser and are not uploaded.');
    expect(html.split(credentialWarning)).toHaveLength(2);
    expect(html).not.toContain('Privacy details');
    expect(html).not.toContain('Local only · Not uploaded · Not saved');
    expect(html).not.toContain('I understand this is manual self-review');
    expect(reviewSource).not.toContain('SafetyBoundary');
    expect(reviewSource).not.toContain('styles.hero');
  });

  it('starts on the record step with sensible defaults instead of a separate safety screen', () => {
    expect(reviewSource).toMatch(/type Step = 'source' \| 'observations' \| 'result'/);
    expect(reviewSource).toMatch(/useState<Step>\('source'\)/);
    expect(reviewSource).toMatch(/useState<Role>\('self'\)/);
    expect(reviewSource).toMatch(/useState<Device>\('private'\)/);
    expect(reviewSource).toMatch(/useState<JurisdictionConfirmation>\(\{ status: 'unconfirmed' \}\)/);
    expect(reviewSource).toContain('I am helping someone else, and they are here with me');
    expect(reviewSource).toContain('This is a shared or public device');
    expect(reviewSource).not.toContain('Continue safely');
    expect(reviewSource).not.toContain('Use synthetic demo');
  });

  it('derives photo inspection from the citizen’s own entries instead of asking a separate question', () => {
    expect(reviewSource).not.toContain('id="image-inspected"');
    expect(reviewSource).toMatch(/deriveImageInspected\(rawAnswers, photographSelection !== null\)/);
    expect(reviewSource).not.toMatch(/rawAnswers\.plateObservation !== 'unclear'/);
    expect(reviewSource).toMatch(/setRawAnswers\(\{ \.\.\.nextAnswers, imageInspected: false \}\)/);
    expect(reviewSource).not.toMatch(/disabled=\{!answers\.imageInspected\}/);
  });

  it('lands each step at the compact guide header without an animated jump', () => {
    expect(reviewSource).toMatch(/heading\.focus\(\{ preventScroll: true \}\)/);
    expect(reviewSource).toMatch(/scrollIntoView\(\{ block: 'start', behavior: 'instant' as ScrollBehavior \}\)/);
  });

  it('makes the review route action-first while keeping named detail disclosures available', () => {
    expect(reviewSource).toContain('How did you get this record?');
    expect(reviewSource).toContain('Add the challan copy (optional)');
    expect(reviewSource).toMatch(/className=\{styles\.officialRouteLink\}/);
    expect(reviewSource.indexOf('officialRouteLink')).toBeLessThan(reviewSource.indexOf('How did you get this record?'));
    expect(reviewSource).toContain('More photo details');
    expect(reviewSource).toContain('Dates and notice details');
    expect(reviewSource).not.toContain('Other records');
    expect(reviewSource).not.toContain('id="custody-record"');
    expect(reviewSource).toContain('Evidence details');
    expect(reviewSource).toContain('Review history');
    expect(reviewSource).toContain('Preview local summary');
    expect(presentationSource.match(/Based only on answers you confirmed/g)).toHaveLength(1);
  });

  it('keeps the official result route ahead of optional audit detail', () => {
    const result = reviewSource.slice(reviewSource.indexOf("{step === 'result' && ("));
    const resultHero = result.indexOf('styles.resultHero');
    const officialRoute = result.indexOf('<OfficialHandoffPanel');
    const visibleSections = result.indexOf('styles.resultColumns');
    const missingRecords = result.indexOf('presentation.resultSections.missing');
    const evidenceDetails = result.indexOf('Evidence details');

    expect(resultHero).toBeGreaterThanOrEqual(0);
    expect(officialRoute).toBeGreaterThan(resultHero);
    expect(visibleSections).toBeGreaterThan(officialRoute);
    expect(missingRecords).toBeGreaterThan(visibleSections);
    expect(evidenceDetails).toBeGreaterThan(missingRecords);
    expect(result.indexOf('Review history')).toBeGreaterThan(evidenceDetails);
    expect(result.indexOf('Preview local summary')).toBeGreaterThan(evidenceDetails);
  });

  it('uses the exact typed jurisdiction registry and a fresh opaque browser revision', () => {
    expect(reviewSource).not.toContain('NATIONAL_URL');
    expect(reviewSource).not.toContain('COURT_URL');
    expect(reviewSource).toMatch(/JurisdictionConfirmation/);
    expect(reviewSource).toMatch(/ALL_ISSUING_JURISDICTION_CODES/);
    expect(reviewSource).toContain('I am not sure');
    expect(reviewSource).toMatch(/new Uint8Array\(16\)/);
    expect(reviewSource).toMatch(/crypto\.getRandomValues/);
    expect(reviewSource).not.toMatch(/window\.open\s*\(/);
    expect(handoffControllerSource).toMatch(/resolveOfficialDestination/);
    expect(handoffControllerSource).toMatch(/OFFICIAL_AUXILIARY_ROUTES/);
    expect(handoffControllerSource).not.toMatch(/National e-Challan|Virtual Court/);
  });

  it('places the controlled handoff panel directly after the result hero', () => {
    const result = reviewSource.slice(reviewSource.indexOf("{step === 'result' && ("));
    const resultHero = result.indexOf('styles.resultHero');
    const panel = result.indexOf('<OfficialHandoffPanel');
    const details = result.indexOf('styles.resultColumns');
    expect(panel).toBeGreaterThan(resultHero);
    expect(details).toBeGreaterThan(panel);
    expect(result).not.toContain('styles.officialHandoff');
  });

  it('keeps browser effects in the thin adapter and the pure controller navigation-free', () => {
    expect(reviewSource).toMatch(/navigator\.clipboard\.writeText/);
    expect(reviewSource).toMatch(/URL\.createObjectURL/);
    expect(handoffControllerSource).not.toMatch(/navigator\.|window\.|document\.|URL\.createObjectURL/);
    expect(handoffControllerSource).toMatch(/type:\s*'clipboard-write'/);
    expect(handoffControllerSource).toMatch(/type:\s*'download-text'/);
  });

  it('derives all pack actions from the one current-view predicate and reconciles stale packs', () => {
    expect(reviewSource).toMatch(/isCitizenReviewCurrentPack\(handoffState,\s*handoffView\)/);
    expect(reviewSource).toMatch(/reconcileCitizenReviewCurrentPack/);
    expect(reviewSource).toMatch(/getCitizenReviewExtensionReadiness/);
    expect(reviewSource).toMatch(/readRenderNowMs/);
    expect(reviewSource).toMatch(/projectCitizenReviewHandoffRenderState\(\s*handoffState,\s*handoffView,\s*renderNowMs/);
    expect(reviewSource).not.toMatch(/getCitizenReviewCurrentExtensionPreparation\(\s*handoffState,\s*handoffView,\s*Date\.parse\(routeNowIso\)/);
    expect(reviewSource).not.toMatch(/preparationAllowedByController:\s*extensionRelease\.status[\s\S]{0,700}affectedPersonRequestedPreparation/);
    expect(reviewSource).toMatch(/routeNowIso/);
  });

  it('gates the panel with the derived current pack and passes explicit return readiness', () => {
    const result = reviewSource.slice(reviewSource.indexOf('<OfficialHandoffPanel'));
    expect(result).toMatch(/confirmedPack=\{currentHandoffPack\}/);
    expect(result).toMatch(/returnReadiness=\{returnReadiness\}/);
    expect(result).not.toMatch(/confirmedPack=\{handoffState\.confirmedPack\}/);
  });

  it('keeps review select and official-service link targets at least 48px at base layouts', () => {
    expect(publicBaseStyles).toMatch(
      /\.observationCard select\s*\{[^}]*min-height:\s*48px/,
    );
    expect(publicBaseStyles).toMatch(
      /\.serviceGrid a\s*\{[^}]*min-height:\s*48px[^}]*display:\s*(?:inline-)?flex/,
    );
  });

  it('opens a selected PDF locally without contradicting the object-src security policy', () => {
    const selection = {
      meta: {
        size: 1024,
        type: 'application/pdf',
        role: 'official-record',
        previewKind: 'pdf',
      },
      previewUrl: 'blob:local-preview',
    } satisfies LocalRecordSelection;
    const html = renderToStaticMarkup(createElement(LocalRecordIntake, {
      record: selection,
      photograph: null,
      onRecordChange: () => undefined,
      onPhotographChange: () => undefined,
      language: 'hi',
    }));

    expect(securityConfig).toContain('"object-src \'none\'"');
    expect(html).toContain('href="blob:local-preview"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('चुना गया PDF स्थानीय रूप से खोलें');
    expect(html).toContain('PDF टैब स्वयं बंद करें');
    expect(html).toContain('चुना गया नोटिस');
    expect(html).not.toContain('<object');
    expect(reviewSource).not.toContain('<object');
    expect(reviewSource).toContain('Open selected PDF locally');
  });

  it('keeps the intake free of over-claims and repeated boundary copy', () => {
    const shell = renderToStaticMarkup(createElement(LocalRecordIntake, {
      record: null,
      photograph: null,
      onRecordChange: () => undefined,
      onPhotographChange: () => undefined,
      language: 'en',
    }));

    expect(shell).toContain('Choose challan copy');
    expect(shell).toContain('Choose photo from the challan');
    expect(shell).not.toContain('has left this browser tab');
    expect(shell).not.toContain('Nothing has left this device');
    expect(shell).not.toContain('Not uploaded');
    expect(shell).not.toContain('<details');
  });

  it('sets every reviewed essential 320px selector to at least 16px explicitly', () => {
    const publicMobile = mediaBlock(publicStyles, '(max-width: 420px)');
    const chromeMobile = mediaBlock(chromeStyles, '(max-width: 700px)');
    const chromeNarrow = mediaBlock(chromeStyles, '(max-width: 480px)');
    const guideMobile = mediaBlock(guidedStyles, '(max-width: 420px)');
    for (const selector of [
      '.button',
      '.buttonSecondary',
      '.buttonQuiet',
      '.actions a',
      '.choice',
      '.field input',
      '.field select',
      '.observationCard select',
      '.serviceGrid button',
      '.serviceGrid a',
    ]) {
      expectExplicitSixteenPixelRule(publicMobile, selector);
    }
    for (const selector of ['.artifact pre', '.panel small', '.passport em', '.panel p', '.check']) {
      expectExplicitFifteenPixelRule(publicMobile, selector);
    }
    for (const selector of ['.headerButton', '.languages button', '.englishOnly']) {
      expectExplicitSixteenPixelRule(chromeMobile, selector);
    }
    expectExplicitSixteenPixelRule(chromeNarrow, '.publicBar');
    for (const selector of [
      '.guideTopline p',
      '.guideTopline span',
      '.primaryInstruction > span',
      '.status',
      '.guideDisclosure summary',
      '.detailLabel',
      '.detailsContent p',
      '.stepList li',
    ]) {
      expectExplicitFifteenPixelRule(guideMobile, selector);
    }
    expect(publicMobile).toMatch(/\.header\s*\{[^}]*flex-wrap:\s*wrap/);
    for (const [source, rule] of [
      [publicBaseStyles, /\.field input, \.field select\s*\{[^}]*min-height:\s*48px/],
      [publicBaseStyles, /\.disclosure summary\s*\{[^}]*min-height:\s*48px/],
      [publicBaseStyles, /\.buttonQuiet\s*\{[^}]*min-height:\s*48px/],
      [publicBaseStyles, /\.check\s*\{[^}]*min-height:\s*48px/],
      [publicBaseStyles, /\.fieldHint a, \.officialRouteLink\s*\{[^}]*min-height:\s*48px/],
      [chromeStyles, /\.footerLinks a\s*\{[^}]*min-height:\s*48px/],
      [guidedStyles, /\.guideDisclosure summary\s*\{[^}]*min-height:\s*48px/],
    ] as const) {
      expect(source).toMatch(rule);
    }
    expect(guidedStyles).toMatch(/\.guideDisclosure summary::before\s*\{[^}]*content:/);
    expect(chromeStyles).toMatch(/\.headerButton[^}]*min-height:\s*48px/);
    expect(chromeStyles).toMatch(/\.languages button[^}]*min-height:\s*48px/);
    expect(guidedStyles).toMatch(/\.stepList li\s*\{[^}]*color:\s*#(?:[0-9a-f]{6})/);
  });

  it('prints only the clean evidence artifact, disclaimer, timeline, and evidence table', () => {
    expect(reviewSource).toMatch(/data-print-artifact/);
    expect(reviewSource).toMatch(/data-print-evidence/);
    expect(reviewSource).toMatch(/data-print-timeline/);
    expect(publicStyles).toMatch(/@media print[\s\S]*?\.app\s*>\s*\*\s*\{[^}]*display:\s*none\s*!important/);
    expect(publicStyles).toMatch(/@media print[\s\S]*?\[data-print-artifact\][^{]*\{[^}]*display:\s*block\s*!important/);
  });

  it('suppresses browser-native formatted printing on a shared device', () => {
    expect(reviewSource).toContain('data-device-context={device}');
    expect(reviewSource).toContain('data-shared-print-warning');
    expect(reviewSource).toContain('formatted printing are disabled for this shared-device review');
    expect(publicStyles).toMatch(
      /@media print[\s\S]*?\[data-device-context='shared'\]\s+\[data-print-result\]\s*\{[^}]*display:\s*none\s*!important/,
    );
    expect(publicStyles).toMatch(
      /@media print[\s\S]*?\[data-device-context='shared'\]\s+\[data-shared-print-warning\]\s*\{[^}]*display:\s*block\s*!important/,
    );
  });

  it('routes stage presentation through keyed standard and simple copy', () => {
    expect(reviewSource).toMatch(/getCitizenReviewPresentation\(language,\s*simpleMode\)/);
    expect(reviewSource).toMatch(/presentation\.stages\.source/);
    expect(reviewSource).toMatch(/presentation\.stages\.observations/);
    expect(reviewSource).toMatch(/presentation\.stages\.result/);
    expect(reviewSource).toMatch(/presentation\.resultSections\.established/);
    expect(reviewSource).toMatch(/presentation\.resultSections\.unclear/);
    expect(reviewSource).toMatch(/presentation\.resultSections\.missing/);
    expect(reviewSource).toMatch(/presentation\.resultSections\.evidence/);
    expect(reviewSource).toMatch(/<OfficialHandoffPanel/);
    expect(reviewSource).toMatch(/simpleTitle:/);
    expect(reviewSource).toMatch(/simpleMode\s*\?\s*copy\.simpleTitle/);
    expect(reviewSource).toMatch(/presentation\.resultLimitation/);
    expect(getCitizenReviewPresentation('en', true).resultLimitation).toBe(
      'This result uses only answers you checked. ChallanSakshi did not verify the records or decide the case.',
    );
    expect(getCitizenReviewPresentation('hi', true).resultLimitation).toBe(
      'यह नतीजा केवल आपके जाँचे उत्तर उपयोग करता है। ChallanSakshi ने रिकॉर्ड सत्यापित या केस तय नहीं किया।',
    );
    expect(getCitizenReviewPresentation('en', false).resultLimitation).toContain(
      'answers you confirmed',
    );
  });

  it('keeps essential privacy and safety reading copy readable and tappable at 320px', () => {
    const publicMobile = mediaBlock(publicStyles, '(max-width: 420px)');

    expect(publicStyles).toMatch(
      /\.brand\s*\{[^}]*min-height:\s*48px[^}]*display:\s*inline-flex/,
    );
    const chromeMobileFooter = mediaBlock(chromeStyles, '(max-width: 700px)');
    expectExplicitFifteenPixelRule(publicMobile, '.infoSection p');
    expectExplicitFifteenPixelRule(publicMobile, '.infoSection li');
    expectExplicitSixteenPixelRule(chromeMobileFooter, '.footerLinks a');
    expectExplicitFifteenPixelRule(chromeMobileFooter, '.footer p');
    expect(publicMobile).toMatch(
      /\.infoSection a\s*\{[^}]*display:\s*inline-flex[^}]*min-height:\s*48px/,
    );
    expect(chromeStyles).toMatch(
      /\.footerLinks a\s*\{[^}]*min-height:\s*48px[^}]*display:\s*inline-flex/,
    );
    expect(publicMobile).toMatch(
      /\.infoPage h1\s*\{[^}]*font-size:\s*(?:3[0-9]|[12][0-9])px[^}]*overflow-wrap:\s*anywhere/,
    );
  });

  it('stacks FASTag passport status inside each card on narrow screens', () => {
    const publicMobile = mediaBlock(publicStyles, '(max-width: 700px)');

    expect(publicMobile).toMatch(
      /\.passport article\s*\{[^}]*grid-template-columns:\s*34px\s+minmax\(0,\s*1fr\)/,
    );
    expect(publicMobile).toMatch(
      /\.passport em\s*\{[^}]*grid-column:\s*2[^}]*justify-self:\s*start/,
    );
  });
});
