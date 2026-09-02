import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ExtensionInformationPage } from '../components/public-beta/PublicInfoPage';
import { CURRENT_EXTENSION_RELEASE_STATE, evaluatePublicExtensionRelease } from '../lib/extension-release';

const pageSource = readFileSync(new URL('../app/extension/page.tsx', import.meta.url), 'utf8');
const infoSource = readFileSync(new URL('../components/public-beta/PublicInfoPage.tsx', import.meta.url), 'utf8');

describe('state-free extension information route', () => {
  it('imports only the information component and accepts no search or case state', () => {
    expect(pageSource).toMatch(/ExtensionInformationPage/);
    expect(pageSource).not.toMatch(/searchParams|URLSearchParams|case|envelope|capsule|extensionId|chrome\.|browser\./);
  });

  it('shows the complete web-independent safety boundary while release is closed', () => {
    expect(evaluatePublicExtensionRelease(CURRENT_EXTENSION_RELEASE_STATE).status).toBe('closed');
    const html = renderToStaticMarkup(createElement(ExtensionInformationPage));
    expect(html).toContain('complete web review works without the extension');
    expect(html).toContain('handled locally in your browser');
    expect(html).toContain('official service is the only intended recipient');
    expect(html).toContain('10 minutes');
    expect(html).toContain('protected identity, authentication, declaration, and submission fields');
    expect(html).toContain('does not submit');
    expect(html).toContain('On mobile or an unsupported browser');
    expect(html).toContain('not available for public installation');
    expect(html).not.toMatch(/Open approved store listing|Prepare fields|Chrome Web Store|sideload/i);
    expect(html).not.toContain('<a href="https://chromewebstore.google.com/');
  });

  it('states the exact bounded-check, staging, replay, recovery, and recipient limits before acquisition', () => {
    const html = renderToStaticMarkup(createElement(ExtensionInformationPage));
    const bounded = html.indexOf('reviewed fields that passed bounded safety checks');
    const acquisition = html.indexOf('Open approved store listing');
    expect(bounded).toBeGreaterThanOrEqual(0);
    expect(html).toContain('not proof that free-text prose contains no sensitive information');
    expect(html).toContain('staged values remain for no more than 10 minutes');
    expect(html).toContain('popup heap and session state');
    expect(html).toContain('browser-activity metadata');
    expect(html).toContain('After a partial, indeterminate, or late attempt settles, only a payload-free replay-prevention record and warning may remain for up to 24 hours from settlement.');
    expect(html).toContain('An unresolved attempt is not cleared by time, browser or extension restart, reload, update, or disabling the extension.');
    expect(html).toContain('Exceptional device-owner recovery means manually clearing extension storage or uninstalling the extension, and only after every relevant official tab and every browser process has been closed.');
    expect(html).not.toMatch(/replay is available|closed and reopened/i);
    expect(html).toContain('project developer is not a recipient');
    expect(html).toContain('only after you explicitly choose Fill');
    if (acquisition >= 0) expect(bounded).toBeLessThan(acquisition);
  });

  it('keeps the complete bounded disclosure available in Hindi', () => {
    expect(infoSource).toContain('सीमित सुरक्षा जाँच');
    expect(infoSource).toContain('संवेदनशील जानकारी न होने का प्रमाण नहीं');
    expect(infoSource).toContain('आंशिक, अनिर्णायक या देर से हुए प्रयास के निपटने के बाद, निपटारे से अधिकतम 24 घंटे तक केवल पेलोड-रहित दोबारा उपयोग रोकने वाला रिकॉर्ड और चेतावनी रह सकते हैं।');
    expect(infoSource).toContain('अनसुलझा प्रयास समय बीतने, ब्राउज़र या एक्सटेंशन दोबारा शुरू करने, रीलोड, अपडेट या एक्सटेंशन अक्षम करने से साफ़ नहीं होता।');
    expect(infoSource).toContain('असाधारण डिवाइस-मालिक पुनर्प्राप्ति का अर्थ है एक्सटेंशन स्टोरेज को हाथ से साफ़ करना या एक्सटेंशन अनइंस्टॉल करना, और यह केवल हर संबंधित आधिकारिक टैब और हर ब्राउज़र प्रक्रिया बंद करने के बाद।');
    expect(infoSource).not.toMatch(/पेलोड-रहित स्थानीय replay केवल प्रभावी समाप्ति तक उपलब्ध|बंद करके फिर खोली/);
    expect(infoSource).toContain('डेवलपर प्राप्तकर्ता नहीं है');
  });

  it('derives any future acquisition solely from the release evaluator', () => {
    expect(infoSource).toMatch(/evaluatePublicExtensionRelease\(CURRENT_EXTENSION_RELEASE_STATE\)/);
    expect(infoSource).not.toMatch(/URLSearchParams|searchParams|window\.location|chrome\.runtime|postMessage/);
  });
});
