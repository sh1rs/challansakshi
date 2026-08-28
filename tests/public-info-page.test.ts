import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PrivacyPage, SafetyPage } from '../components/public-beta/PublicInfoPage';

const publicInfoSource = readFileSync(
  new URL('../components/public-beta/PublicInfoPage.tsx', import.meta.url),
  'utf8',
);
const readmeSource = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

const bilingualCalls = [...publicInfoSource.matchAll(/t\(language, '([^']*)', '([^']*)'\)/g)]
  .map((match) => ({ en: match[1], hi: match[2] }));

function expectBilingualPair(english: string, hindi: string) {
  expect(bilingualCalls).toContainEqual({ en: english, hi: hindi });
}

describe('public privacy and safety pages', () => {
  it('explains the deliberate local-file boundary without claiming government authentication', () => {
    const html = renderToStaticMarkup(createElement(PrivacyPage));

    expect(html).toContain('deliberately select');
    expect(html).toContain('stays browser-local');
    expect(html).toContain('not uploaded to the ChallanSakshi server or sent to an AI model');
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
      'Each selected record or supplied image stays browser-local and is not uploaded to the ChallanSakshi server or sent to an AI model. This release does not run OCR on it.',
      'हर चुना गया रिकॉर्ड या दी गई तस्वीर ब्राउज़र में स्थानीय रहती है और ChallanSakshi सर्वर पर अपलोड या AI मॉडल को नहीं भेजी जाती। यह रिलीज़ उस पर OCR नहीं चलाती।',
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
