'use client';
/* eslint-disable @next/next/no-html-link-for-pages -- Same-origin anchors deliberately cross privacy and demo state boundaries. */

import { useSyncExternalStore } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Language } from '../../lib/domain';
import styles from './CitizenChrome.module.css';

function t(language: Language, en: string, hi: string) {
  return language === 'hi' ? hi : en;
}

// Theme choice store. The document root attribute (stamped pre-paint by the
// root layout's boot script) is the source of truth; this store only mirrors
// it for rendering. Persistence is delegated to the hook the boot script
// installs — this component never touches storage itself (the real-route
// privacy contract forbids it). Without the hook the choice still applies to
// this tab.
const themeListeners = new Set<() => void>();

function subscribeToTheme(listener: () => void) {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

function readDarkTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

function readServerDarkTheme() {
  return false;
}

function applyThemeChoice(theme: 'light' | 'dark') {
  const hook = (window as unknown as Record<string, unknown>).__challansakshiApplyTheme;
  if (typeof hook === 'function') {
    (hook as (theme: string) => void)(theme);
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  themeListeners.forEach((listener) => listener());
}

export function CitizenHeader({
  language,
  setLanguage,
  service = 'ChallanSakshi',
  serviceHindi = 'चालान साक्षी',
  boundary = 'real',
  utilities,
  englishOnly = false,
}: {
  language: Language;
  setLanguage: (language: Language) => void;
  service?: string;
  serviceHindi?: string;
  boundary?: 'real' | 'demo';
  utilities?: ReactNode;
  englishOnly?: boolean;
}) {
  const homeLabel = t(language, 'ChallanSakshi home', 'चालान साक्षी होम');
  const darkTheme = useSyncExternalStore(subscribeToTheme, readDarkTheme, readServerDarkTheme);

  const toggleTheme = () => {
    applyThemeChoice(darkTheme ? 'light' : 'dark');
  };

  return (
    <div className={styles.chrome} data-product-shell="citizen" data-product-mode={boundary}>
      {boundary === 'demo' ? (
        <div className={styles.publicBar}>
          <span aria-hidden="true" />
          {t(language, 'Demo boundary · use fictional or synthetic test data only · no government connection', 'डेमो सीमा · केवल काल्पनिक या सिंथेटिक टेस्ट डेटा उपयोग करें · कोई सरकारी कनेक्शन नहीं')}
        </div>
      ) : null}
      <header className={styles.header}>
        <a className={styles.brand} href="/" aria-label={homeLabel}>
          <span className={styles.brandMark} aria-hidden="true">स</span>
          <span><strong>{service}</strong><small>{serviceHindi}</small></span>
        </a>
        <nav className={styles.nav} aria-label={t(language, 'Product navigation', 'उत्पाद नेविगेशन')}>
          <div className={styles.routeLinks}>
            <a href="/review">{t(language, 'Challan review', 'चालान समीक्षा')}</a>
            <a href="/fastag">{t(language, 'FASTag check', 'FASTag जाँच')}</a>
            <a href="/privacy">{t(language, 'Privacy', 'गोपनीयता')}</a>
            <a href="/demo">{t(language, 'Hackathon demo', 'हैकाथॉन डेमो')}</a>
          </div>
          {utilities ? <div className={styles.utilities}>{utilities}</div> : null}
          <CitizenHeaderButton type="button" aria-pressed={darkTheme} onClick={toggleTheme}>
            {t(language, 'Dark mode', 'डार्क मोड')}
          </CitizenHeaderButton>
          {englishOnly ? (
            <span className={styles.englishOnly}>English-only safety beta</span>
          ) : (
            <div className={styles.languages} role="group" aria-label={t(language, 'Language', 'भाषा')}>
              <button type="button" className={language === 'en' ? styles.active : ''} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button>
              <button type="button" className={language === 'hi' ? styles.active : ''} aria-pressed={language === 'hi'} onClick={() => setLanguage('hi')}>हिं</button>
            </div>
          )}
        </nav>
      </header>
    </div>
  );
}

export function CitizenHeaderButton({ className = '', tone = 'default', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'default' | 'danger' }) {
  return <button className={`${styles.headerButton} ${tone === 'danger' ? styles.headerButtonDanger : ''} ${className}`} {...props} />;
}

// The footer carries the single product-wide boundary statement. Every other
// citizen surface stays free of repeated disclaimers; decision-critical hints
// sit beside the control they concern.
export function CitizenFooter({
  language,
  service = 'ChallanSakshi',
  boundary = 'real',
}: {
  language: Language;
  service?: string;
  boundary?: 'real' | 'demo';
}) {
  return (
    <footer className={styles.footer} data-product-shell="citizen">
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <span className={styles.brandMark} aria-hidden="true">स</span>
          <div><strong>{service}</strong><small>{t(language, 'Evidence before action', 'कार्रवाई से पहले सबूत')}</small></div>
        </div>
        <div className={styles.footerLinks}>
          <a href="/review">{t(language, 'Challan review', 'चालान समीक्षा')}</a>
          <a href="/fastag">{t(language, 'FASTag check', 'FASTag जाँच')}</a>
          <a href="/privacy">{t(language, 'Privacy & data controls', 'गोपनीयता और डेटा नियंत्रण')}</a>
          <a href="/safety">{t(language, 'Safety & official routes', 'सुरक्षा और आधिकारिक रास्ते')}</a>
          <a href="/demo">{t(language, 'Synthetic evidence demo', 'सिंथेटिक सबूत डेमो')}</a>
        </div>
        <p>{boundary === 'demo'
          ? t(language, 'Use synthetic test data only. Nothing is filed, paid, authenticated, or sent to a government system.', 'केवल सिंथेटिक टेस्ट डेटा उपयोग करें। कुछ भी फाइल, भुगतान, प्रमाणित या सरकारी सिस्टम को नहीं भेजा जाता।')
          : t(
            language,
            'Independent non-public prototype · Not a government, bank, court, or toll service. Your files and answers stay in this browser and are not uploaded. Nothing is filed, paid, authenticated, or submitted here; this is not legal advice and no outcome is guaranteed. Never enter a government password, CAPTCHA, OTP, Aadhaar, or payment credentials here.',
            'स्वतंत्र गैर-सार्वजनिक प्रोटोटाइप · यह सरकारी, बैंक, अदालत या टोल सेवा नहीं है। आपकी फ़ाइलें और उत्तर इसी ब्राउज़र में रहते हैं और अपलोड नहीं होते। यहाँ कुछ भी फाइल, भुगतान, प्रमाणित या जमा नहीं होता; यह कानूनी सलाह नहीं है और नतीजे की गारंटी नहीं है। सरकारी पासवर्ड, CAPTCHA, OTP, Aadhaar या भुगतान क्रेडेंशियल यहाँ कभी दर्ज न करें।',
          )}</p>
      </div>
    </footer>
  );
}

export { styles as citizenChromeStyles };
