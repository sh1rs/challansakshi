import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PrivacyPage, SafetyPage } from '../components/public-beta/PublicInfoPage';

const publicInfoSource = readFileSync(
  new URL('../components/public-beta/PublicInfoPage.tsx', import.meta.url),
  'utf8',
);
const readmeSource = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const routeReportUrl = new URL(
  '../docs/superpowers/verification/official-route-reverification-2026-09-03.md',
  import.meta.url,
);
const routeReportSource = existsSync(routeReportUrl) ? readFileSync(routeReportUrl, 'utf8') : '';
const browserReportUrl = new URL(
  '../docs/superpowers/verification/public-handoff-browser-qa-2026-09-03.md',
  import.meta.url,
);
const browserReportSource = existsSync(browserReportUrl) ? readFileSync(browserReportUrl, 'utf8') : '';
const routeEvidenceDirectoryUrl = new URL(
  '../docs/superpowers/verification/official-route-reverification-2026-09-03/',
  import.meta.url,
);
const releaseGateAmendmentUrl = new URL(
  '../docs/superpowers/verification/public-handoff-release-gate-amendment-2026-09-03.md',
  import.meta.url,
);
const releaseGateAmendmentSource = existsSync(releaseGateAmendmentUrl)
  ? readFileSync(releaseGateAmendmentUrl, 'utf8')
  : '';

const bilingualCalls = [...publicInfoSource.matchAll(/t\(language, '([^']*)', '([^']*)'\)/g)]
  .map((match) => ({ en: match[1], hi: match[2] }));

function expectBilingualPair(english: string, hindi: string) {
  expect(bilingualCalls).toContainEqual({ en: english, hi: hindi });
}

describe('public privacy and safety pages', () => {
  it('explains the deliberate local-file boundary without claiming government authentication', () => {
    const html = renderToStaticMarkup(createElement(PrivacyPage));

    expect(html).toContain('PDF text or runs English/Hindi OCR locally after you choose a file');
    expect(html).toContain('downloads code and language files from this site');
    expect(html).toContain('document bytes and extracted fields are not uploaded');
    expect(html).toContain('unclear or incomplete readings remain limited');
    expect(html).toContain('OCR caches for selected content are disabled');
    expect(html).toContain('Cloud vision is not enabled on this deployment');
    expect(html).toContain('explicit choice identifying the selected files and provider before anything is sent');
    expect(html).toContain('a no-storage API setting is not a zero-retention guarantee');
    expect(html).toContain('Names, addresses, contact details, chassis/engine numbers and payment credentials are not requested or extracted as fields');
    expect(html).toContain('a saved review note includes those fields');
    expect(html).not.toContain('This release does not run OCR');
    expect(html).toContain('Opening a selected PDF creates a separate browser-local tab');
    expect(html).toContain('Quick exit cannot close or erase that tab');
    expect(html).toContain('does not authenticate its origin');
    expect(html).toContain('Authorised government API access is not implemented');
  });

  it('states the provider-metadata and device-copy limits without offering a retention guarantee', () => {
    const html = renderToStaticMarkup(createElement(PrivacyPage));

    expect(html).toContain('IP address, requested path, time, and browser or device information');
    expect(html).toContain('Downloads, screenshots, clipboard contents, print-to-PDF files, browser history, and device backups');
    expect(html).toContain('outside ChallanSakshi’s deletion control');
    expect(html).toContain('does not guarantee how long the infrastructure provider retains technical logs');
  });

  it('keeps credentials, payment, submission, and legal guarantees outside the product', () => {
    const html = renderToStaticMarkup(createElement(SafetyPage));

    expect(html).toContain('never asks for a CAPTCHA, OTP, Aadhaar or VID');
    expect(html).toContain('government, bank, or FASTag password');
    expect(html).toContain('card or payment credentials');
    expect(html).toContain('does not make a payment or submit anything');
    expect(html).toContain('does not provide a legal guarantee');
  });

  it('identifies the synthetic walkthrough as a separate /demo route, never a homepage demo', () => {
    const html = renderToStaticMarkup(createElement(PrivacyPage));

    expect(html).toContain('separate <code>/demo</code> walkthrough');
    expect(publicInfoSource).not.toMatch(/homepage demo|होमपेज डेमो/i);
    expect(readmeSource).not.toMatch(/homepage demo|होमपेज डेमो/i);
    expect(readmeSource).toContain('app/page.tsx\n  └─ components/public-beta/CitizenHome.tsx');
    expect(readmeSource).toContain('app/demo/page.tsx\n  └─ components/ChallanSakshiApp.tsx');
  });

  it('labels the people-facing real product as a non-public prototype', () => {
    const html = renderToStaticMarkup(createElement(PrivacyPage));

    expect(html).toContain('this release remains a non-public prototype');
    expect(publicInfoSource).toContain('यह रिलीज़ एक गैर-सार्वजनिक प्रोटोटाइप बनी हुई है।');
    expect(html).not.toMatch(/early access|public beta/i);
    expect(publicInfoSource).not.toMatch(/early access|अर्ली एक्सेस|public beta/i);
  });

  it('documents the complete installation-free handoff without blurring real and synthetic authority', () => {
    expect(readmeSource).toContain('**Code status:** public-beta candidate.');
    expect(readmeSource).toContain('**People-facing status:** non-public prototype.');
    expect(readmeSource).toContain('The complete installation-free path is the in-tab field pack plus the normal official-service anchor.');
    expect(readmeSource).toContain('The field pack is a user-reviewed factual preparation aid, not an official form, filing, legal conclusion, or proof of submission.');
    expect(readmeSource).toContain('single controlled description textarea');
    expect(readmeSource).toContain('Official service opened from this review');
    expect(readmeSource).toContain('Citizen-reported; not verified by ChallanSakshi.');
    expect(readmeSource).toContain('Affected-person-reported; entered with a present helper');
    expect(readmeSource).toContain('Bundled synthetic facts can never satisfy the real official-source gate');
  });

  it('documents the reduced optional envelope and checked-in closed adapter state', () => {
    expect(readmeSource).toContain('only the reviewed description, an eligible fixed issue code when supported, and opaque protocol metadata');
    expect(readmeSource).toContain('does not contain raw evidence, files, dedicated identifier properties, the complete field pack, a receipt, a URL, or selectors');
    expect(readmeSource).toContain('may contain an allowed masked final-four vehicle fragment or a sensitive fact missed by bounded checks');
    expect(readmeSource).toContain('Both real extension adapters remain `internal-disabled`');
    expect(readmeSource).toContain('checked-in extension release is `production-disabled`');
    expect(readmeSource).toContain('No public installation or preparation action is exposed');
  });

  it('states the blocked public-release prerequisites without making a launch claim', () => {
    expect(readmeSource).toContain('A real public announcement remains blocked');
    expect(readmeSource).toContain('named operator, privacy/grievance owner, and low-data security and official-link correction channel');
    expect(readmeSource).toContain('external privacy, security, legal, dependency, and supply-chain review');
    expect(readmeSource).toContain('official-route re-verification cadence');
    expect(readmeSource).toContain('live monitoring, rollback, correction, and incident ownership');
    expect(readmeSource).toContain('[official route reverification report](docs/superpowers/verification/official-route-reverification-2026-09-03.md)');
    expect(readmeSource).not.toMatch(/early access|अर्ली एक्सेस/i);
    expect(readmeSource).not.toMatch(/\bpublic beta\b/i);
  });

  it('retains a sanitized non-submitting report for every logical registry record', () => {
    expect(routeReportSource).toContain('Verification mode: non-submitting');
    expect(routeReportSource).toContain('9 logical registry records across 7 unique allowlisted URLs');
    expect(routeReportSource).toContain('Data entered: none');
    expect(routeReportSource).toContain('Identifiers used: none');
    expect(routeReportSource).toContain('Submission attempts: none');
    expect(routeReportSource).toContain('URLs visited: the seven compile-time allowlisted URLs only');
    expect(routeReportSource).toContain('Retained browser artifacts: no HAR, request log, tokenized URL, cookie, portal form value, or browser-history export');
    expect(routeReportSource).toContain('Live route and purpose reverified 2026-09-03; availability and accessibility observations are smoke checks, not service guarantees or accessibility certification.');

    const rows = routeReportSource
      .split('\n')
      .filter((line) => line.startsWith('| `'))
      .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
    const shared = [
      'ChallanSakshi release-route review',
      '`2026-09-03T04:47:00+05:30`',
    ];
    expect(rows).toEqual([
      ['`fallback:national-services-directory`', '`fallback`', '`https://echallan.parivahan.gov.in/index/challan-services`', '`echallan.parivahan.gov.in`', '`official-services-directory`', ...shared, '`challansakshi.official-routes/v1` · `public-launch-route-review-2026-09-02#national-services-directory`', '`current`', 'This record is the retained fallback.'],
      ['`auxiliary:national-record-lookup`', '`auxiliary`', '`https://echallan.parivahan.gov.in/index/accused-challan`', '`echallan.parivahan.gov.in`', '`official-record-lookup`', ...shared, '`challansakshi.official-routes/v1` · `public-launch-route-review-2026-09-02#national-record-lookup`', '`current`', 'No record fallback; safe stop.'],
      ['`auxiliary:nextgen-service-landing`', '`auxiliary`', '`https://echallan.parivahan.nic.in/challan/challan-services`', '`echallan.parivahan.nic.in`', '`official-service-landing`', ...shared, '`challansakshi.official-routes/v1` · `public-launch-route-review-2026-09-02#nextgen-service-landing`', '`current`', 'No record fallback; safe stop.'],
      ['`auxiliary:national-services-directory`', '`auxiliary`', '`https://echallan.parivahan.gov.in/index/challan-services`', '`echallan.parivahan.gov.in`', '`official-services-directory`', ...shared, '`challansakshi.official-routes/v1` · `public-launch-route-review-2026-09-02#national-services-directory`', '`current`', 'No record fallback; safe stop.'],
      ['`auxiliary:virtual-courts`', '`auxiliary`', '`https://vcourts.gov.in/virtualcourt/index.php`', '`vcourts.gov.in`', '`official-court-service`', ...shared, '`challansakshi.official-routes/v1` · `public-launch-route-review-2026-09-02#virtual-courts`', '`current`', 'No record fallback; safe stop.'],
      ['`handoff:legacy`', '`handoff`', '`https://echallan.parivahan.gov.in/gsticket`', '`echallan.parivahan.gov.in`', '`official-grievance-service`', ...shared, '`challansakshi.official-routes/v1` · `public-launch-route-review-2026-09-02#legacy-grievance`', '`current`', '`https://echallan.parivahan.gov.in/index/challan-services`'],
      ['`handoff:nextgen`', '`handoff`', '`https://echallan.parivahan.nic.in/grievance`', '`echallan.parivahan.nic.in`', '`official-grievance-service`', ...shared, '`challansakshi.official-routes/v1` · `public-launch-route-review-2026-09-02#nextgen-grievance`', '`current`', '`https://echallan.parivahan.gov.in/index/challan-services`'],
      ['`handoff:delhi-manual`', '`handoff`', '`https://traffic.delhipolice.gov.in/`', '`traffic.delhipolice.gov.in`', '`official-service`', ...shared, '`challansakshi.official-routes/v1` · `public-launch-route-review-2026-09-02#delhi-official-landing`', '`current`', '`https://echallan.parivahan.gov.in/index/challan-services`'],
      ['`handoff:unresolved`', '`handoff`', '`https://echallan.parivahan.gov.in/index/challan-services`', '`echallan.parivahan.gov.in`', '`official-service`', ...shared, '`challansakshi.official-routes/v1` · `public-launch-route-review-2026-09-02#national-services-directory`', '`current`', '`https://echallan.parivahan.gov.in/index/challan-services`'],
    ]);
    expect(new Set(rows.map((row) => row[2])).size).toBe(7);
  });

  it('records route-specific smoke observations without upgrading release authority', () => {
    expect(routeReportSource).toContain('production Legacy jurisdiction tuple remains empty');
    expect(routeReportSource).toContain('27 jurisdiction codes matched the NextGen registry scope');
    expect(routeReportSource).toContain('Delhi landing was JavaScript-dependent');
    expect(routeReportSource).toContain('no form-adapter claim');
    expect(routeReportSource).toContain('led toward CAPTCHA, OTP, and payment surfaces');
    expect(routeReportSource).toContain('crawler attempts for NextGen and directory routes timed out or returned HTTP 502 while the interactive browser loaded them');
    expect(routeReportSource).toContain('real Legacy and NextGen extension adapters remain `internal-disabled`');
    expect(routeReportSource).toContain('cannot enable a public release or adapter');
  });

  it('binds every retained landing-state screenshot to its exact route context and bytes', () => {
    const expectedEvidence = [
      {
        filename: '01-national-services-directory.jpg',
        url: 'https://echallan.parivahan.gov.in/index/challan-services',
        domain: 'echallan.parivahan.gov.in',
        purpose: 'official-services-directory',
        sha256: '418783663f482c25e708b79160c53b793880a9247564ed5ce35b5568c9d7f0cf',
      },
      {
        filename: '02-national-record-lookup.jpg',
        url: 'https://echallan.parivahan.gov.in/index/accused-challan',
        domain: 'echallan.parivahan.gov.in',
        purpose: 'official-record-lookup',
        sha256: '1b97a67235e0e8654ca82b6c3f624790f47dac4fb96e878aad350e94bd84059c',
      },
      {
        filename: '03-nextgen-service-landing.jpg',
        url: 'https://echallan.parivahan.nic.in/challan/challan-services',
        domain: 'echallan.parivahan.nic.in',
        purpose: 'official-service-landing',
        sha256: '0ac042c0ea7c441fbb3a2fe4b27f50f0d3dcb75830fa162097e2856b1845ebf9',
      },
      {
        filename: '04-virtual-courts.jpg',
        url: 'https://vcourts.gov.in/virtualcourt/index.php',
        domain: 'vcourts.gov.in',
        purpose: 'official-court-service',
        sha256: '3953089b6933705145d42a4d30c33c50f704a45478e80847e11468423744b477',
      },
      {
        filename: '05-legacy-grievance.jpg',
        url: 'https://echallan.parivahan.gov.in/gsticket',
        domain: 'echallan.parivahan.gov.in',
        purpose: 'official-grievance-service',
        sha256: '70936b14f13a16e46f60821a20ec31540afcc6ecf648961f3e7d34895fffc723',
      },
      {
        filename: '06-nextgen-grievance.jpg',
        url: 'https://echallan.parivahan.nic.in/grievance',
        domain: 'echallan.parivahan.nic.in',
        purpose: 'official-grievance-service',
        sha256: 'd858125abb9a8fc2c416b04ae0cb7af65ee12ec8a226c83137eb496ba84e7b25',
      },
      {
        filename: '07-delhi-official-landing.jpg',
        url: 'https://traffic.delhipolice.gov.in/',
        domain: 'traffic.delhipolice.gov.in',
        purpose: 'official-service',
        sha256: 'e1149f49e1c3492db9e203067a56d02b68296e953bcfc707a3b358bd9b6362a6',
      },
    ];
    const retainedJpegs = readdirSync(routeEvidenceDirectoryUrl)
      .filter((filename) => filename.endsWith('.jpg'))
      .sort();
    const declaredRows = routeReportSource
      .split('\n')
      .filter((line) => line.startsWith('| [`'))
      .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));

    expect(retainedJpegs).toEqual(expectedEvidence.map(({ filename }) => filename));
    expect(declaredRows).toEqual(expectedEvidence.map(({ filename, url, domain, purpose, sha256 }) => [
      '[`' + filename + '`](official-route-reverification-2026-09-03/' + filename + ')',
      '`' + url + '`',
      '`' + domain + '`',
      '`' + purpose + '`',
      '`' + sha256 + '`',
    ]));

    for (const evidence of expectedEvidence) {
      const bytes = readFileSync(new URL(evidence.filename, routeEvidenceDirectoryUrl));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(evidence.sha256);
    }

    expect(routeReportSource).toContain('Screenshots are landing-state evidence only.');
    expect(routeReportSource).toContain('Portal forms remained untouched');
    expect(routeReportSource).toContain('No citizen data, identifier, CAPTCHA, OTP, credential, payment value, attachment, or declaration was read, filled, or submitted.');
    expect(routeReportSource).toContain('No retained screenshot contains a readable CAPTCHA.');
    expect(routeReportSource).toContain('Image 06 is a 1200×390 cropped route-purpose/header capture.');
    expect(routeReportSource).toContain('Its identifier, CAPTCHA, input, and all other protected control/value regions were excluded before retention.');
    expect(routeReportSource).toContain('it does not OCR-inspect or visually certify screenshot pixels');
    expect(routeReportSource).toContain('a retained human-review finding, not a unit-test capability claim');
  });

  it('separates observed browser passes, automated contracts, and unperformed release blockers', () => {
    expect(routeReportSource).toContain('[partial browser evidence and release-gate report](public-handoff-browser-qa-2026-09-03.md)');
    expect(browserReportSource).toContain('Status: partial browser evidence; release gate blocked.');
    expect(browserReportSource).toContain('Manually exercised core lane, judge proof, and visual fidelity: **PASS for the recorded local runs only.**');
    expect(browserReportSource).toContain('Automated contract evidence: **PASS for the recorded test run only.**');
    expect(browserReportSource).toContain('Unperformed manual and separate-harness release gates: **BLOCKED.**');
    expect(browserReportSource).toContain('Production Vinext origin: `http://127.0.0.1:4177`');
    expect(browserReportSource).toContain('hydrated in both the in-app browser and connected Chrome');
    expect(browserReportSource).toContain('Reviewed description copied. Nothing opened or was submitted.');
    expect(browserReportSource).toContain('`officialLink:0, receipt:0, checkedConfirm:false`');
    expect(browserReportSource).toContain('Affected-person-reported; entered with a present helper');
    expect(browserReportSource).toContain('390×844: `clientWidth=375`, `scrollWidth=375`, `bodyScrollWidth=375`');
    expect(browserReportSource).toContain('320×844: `clientWidth=305`, `scrollWidth=305`, `bodyScrollWidth=305`');
    expect(browserReportSource).toContain('Actual native 200% zoom remains an honest manual release check');
    expect(browserReportSource).toContain('`clientWidth=585`, `scrollWidth=585`, `bodyScrollWidth=585`');
    expect(browserReportSource).toContain('`69.633s`');
    expect(browserReportSource).toContain('`83.959s`');
    expect(browserReportSource).toContain('`ERR_BLOCKED_BY_CLIENT`');
    expect(browserReportSource).toContain('does not prove fixture browser execution');
    expect(browserReportSource).toContain('No console warning or error was observed on the exercised in-app-browser pages');
    expect(browserReportSource).toContain('No screenshot was retained');
    expect(browserReportSource).toContain('no material visual mismatch requiring a code change');
    for (const unperformedLane of [
      'Native browser zoom at 200%',
      'Loaded-extension fixture execution',
      'Complete shared-device, private-device, and present-helper browser matrix',
      'Shared-device 10-minute inactivity transition',
      'Message-only result',
      'Unresolved-jurisdiction fallback',
      'Portal-unavailable fallback',
      'Clipboard-denial handling',
      'Every citizen-return state',
      'Continuation-receipt download and redaction',
      'Reduced-motion behavior',
      'Hydrated-browser live-region announcements',
    ]) {
      expect(browserReportSource).toContain(unperformedLane);
    }
    expect(browserReportSource).not.toContain('Status: completed local browser and visual QA evidence');
    expect(browserReportSource).not.toMatch(/native 200% zoom (?:passed|was verified)/i);
    expect(browserReportSource).not.toMatch(/fixture browser execution (?:passed|was verified)/i);
  });

  it('closes implementation evidence while keeping the public release gate blocked', () => {
    expect(releaseGateAmendmentSource).toContain('Status: implementation complete; release gate blocked.');
    expect(releaseGateAmendmentSource).toContain('Task 7 implementation documentation and retained evidence may close');
    expect(releaseGateAmendmentSource).toContain('does not mark any unperformed manual or separate-harness gate as passed');
    expect(releaseGateAmendmentSource).toContain('The public product remains a non-public prototype.');
    expect(releaseGateAmendmentSource).toContain('The code remains a public-beta candidate only.');
    expect(releaseGateAmendmentSource).toContain('[official-route reverification](official-route-reverification-2026-09-03.md)');
    expect(releaseGateAmendmentSource).toContain('[browser and visual QA evidence](public-handoff-browser-qa-2026-09-03.md)');
    expect(releaseGateAmendmentSource).not.toMatch(/release gate:\s*(?:passed|complete)/i);
  });

  it('renders the canonical IHMCL routes and preserves the NPCI issuer directory', () => {
    const html = renderToStaticMarkup(createElement(SafetyPage));
    const links = html.match(/<a\b[^>]*href="https:[^"]+"[^>]*>/g) ?? [];
    const hrefs = links.map((link) => link.match(/href="([^"]+)"/)?.[1] ?? '');

    expect(hrefs).toContain('https://ihmcl.co.in/24x7-national-highways-helpline-1033-page/');
    expect(hrefs).toContain('https://ihmcl.co.in/faq/');
    expect(hrefs).toContain('https://www.npci.org.in/product/netc/netc-fastag-helpline');
    expect(html).toContain('IHMCL FASTag FAQ and grievance guidance');
    expect(hrefs).not.toContain('https://ihmcl.co.in/24x7-national-highways-helpline-1033/');
    expect(hrefs).not.toContain('https://ihmcl.co.in/fastag-user/');
    expect(new URL(hrefs.find((href) => href.includes('1033-page')) ?? '').hostname).toBe('ihmcl.co.in');
    expect(new URL(hrefs.find((href) => href.endsWith('/faq/')) ?? '').hostname).toBe('ihmcl.co.in');

    for (const link of links) {
      expect(link).toMatch(/target="_blank"/);
      expect(link).toMatch(/rel="noreferrer"/);
    }
  });

  it('keeps complete Hindi counterparts for the critical privacy and safety boundaries', () => {
    expectBilingualPair(
      'Document-first review extracts PDF text or runs English/Hindi OCR locally after you choose a file. The reader downloads code and language files from this site; document bytes and extracted fields are not uploaded. Up to three pages are read, and unclear or incomplete readings remain limited. OCR caches for selected content are disabled.',
      'फ़ाइल चुनने पर दस्तावेज़ समीक्षा PDF पाठ निकालती है या अंग्रेज़ी/हिंदी OCR स्थानीय रूप से चलाती है। रीडर इस साइट से कोड और भाषा फ़ाइलें डाउनलोड करता है; दस्तावेज़ बाइट्स और निकाली जानकारी अपलोड नहीं होती। अधिकतम तीन पृष्ठ पढ़े जाते हैं; अस्पष्ट या अधूरी जानकारी सीमित रहती है। चुनी सामग्री का OCR कैश बंद है।',
    );
    expectBilingualPair(
      'Cloud vision is not enabled on this deployment: no server-side AI key or production usage controls are configured. If enabled in a future release, it will require an explicit choice identifying the selected files and provider before anything is sent. Cloud providers may retain data under their policies; a no-storage API setting is not a zero-retention guarantee.',
      'इस डिप्लॉयमेंट में क्लाउड विज़न चालू नहीं है: सर्वर AI कुंजी और प्रोडक्शन उपयोग नियंत्रण कॉन्फ़िगर नहीं हैं। भविष्य में चालू होने पर भेजने से पहले चुनी फ़ाइलों और प्रदाता की जानकारी देकर स्पष्ट सहमति ली जाएगी। क्लाउड प्रदाता अपनी नीति के अनुसार डेटा रख सकते हैं; API में स्टोरेज बंद होना शून्य प्रतिधारण की गारंटी नहीं है।',
    );
    expectBilingualPair(
      'Document review displays the registration and challan identifiers needed to check the selected record; a saved review note includes those fields. Correct only the requested field. Names, addresses, contact details, chassis/engine numbers and payment credentials are not requested or extracted as fields. Manual and FASTag forms continue to request masked or minimum values.',
      'दस्तावेज़ समीक्षा चुने रिकॉर्ड की जाँच के लिए आवश्यक पंजीकरण और चालान नंबर दिखाती है; सहेजे नोट में ये फ़ील्ड शामिल होते हैं। केवल माँगा फ़ील्ड सुधारें। नाम, पता, संपर्क, चेसिस/इंजन नंबर और भुगतान क्रेडेंशियल फ़ील्ड के रूप में न माँगे जाते हैं न निकाले जाते हैं। मैन्युअल और FASTag फ़ॉर्म मास्क या न्यूनतम मान ही माँगते हैं।',
    );
    expectBilingualPair(
      'Opening a selected PDF creates a separate browser-local tab. Quick exit cannot close or erase that tab; close the PDF tab yourself, especially on a shared device.',
      'चुना गया PDF खोलने पर एक अलग ब्राउज़र-स्थानीय टैब बनता है। तुरंत बाहर निकलना उस टैब को बंद या मिटा नहीं सकता; खासकर साझा डिवाइस पर PDF टैब स्वयं बंद करें।',
    );
    expectBilingualPair(
      'Selecting a file does not authenticate its origin. Any source label records what the citizen says about the copy; it is not government verification.',
      'फ़ाइल चुनना उसके स्रोत को प्रमाणित नहीं करता। स्रोत लेबल केवल कॉपी के बारे में नागरिक का कथन दर्ज करता है; यह सरकारी सत्यापन नहीं है।',
    );
    expectBilingualPair(
      'Ordinary page requests still reach the infrastructure provider. To deliver and protect the site, that provider can receive technical data such as IP address, requested path, time, and browser or device information. ChallanSakshi does not guarantee how long the infrastructure provider retains technical logs.',
      'सामान्य पेज अनुरोध फिर भी इन्फ्रास्ट्रक्चर प्रदाता तक पहुँचते हैं। साइट देने और सुरक्षित रखने के लिए प्रदाता IP पता, माँगा गया पथ, समय और ब्राउज़र या डिवाइस जानकारी जैसे तकनीकी डेटा प्राप्त कर सकता है। ChallanSakshi यह गारंटी नहीं देता कि प्रदाता तकनीकी लॉग कितने समय रखता है।',
    );
    expectBilingualPair(
      'Downloads, screenshots, clipboard contents, print-to-PDF files, browser history, and device backups are outside ChallanSakshi’s deletion control. The app cannot erase copies created by the browser, operating system, another app, or the person using the device.',
      'डाउनलोड, स्क्रीनशॉट, क्लिपबोर्ड सामग्री, प्रिंट-टू-PDF फ़ाइलें, ब्राउज़र इतिहास और डिवाइस बैकअप ChallanSakshi के मिटाने के नियंत्रण से बाहर हैं। ऐप ब्राउज़र, ऑपरेटिंग सिस्टम, दूसरे ऐप या डिवाइस उपयोगकर्ता द्वारा बनाई गई कॉपी नहीं मिटा सकता।',
    );
    expectBilingualPair(
      'ChallanSakshi never asks for a CAPTCHA, OTP, Aadhaar or VID, a government, bank, or FASTag password, or card or payment credentials. Use those only when required inside an independently opened official service.',
      'ChallanSakshi कभी CAPTCHA, OTP, Aadhaar या VID, सरकारी, बैंक या FASTag पासवर्ड, या कार्ड अथवा भुगतान क्रेडेंशियल नहीं माँगता। इन्हें केवल स्वतंत्र रूप से खोली गई आधिकारिक सेवा के अंदर आवश्यकता होने पर उपयोग करें।',
    );
    expectBilingualPair(
      'It does not make a payment or submit anything to an authority, court, bank, issuer, or toll operator. Authorised government API access is not implemented, and ChallanSakshi does not provide a legal guarantee.',
      'यह किसी प्राधिकरण, अदालत, बैंक, जारीकर्ता या टोल ऑपरेटर को भुगतान या कुछ भी जमा नहीं करता। अधिकृत सरकारी API पहुँच लागू नहीं है और ChallanSakshi कानूनी गारंटी नहीं देता।',
    );
    expect(publicInfoSource).toContain("'अलग ')}<code>/demo</code>{t(language");
    expect(publicInfoSource).toContain("' वॉकथ्रू अपने बंडल किए गए काल्पनिक केस");
  });
});
