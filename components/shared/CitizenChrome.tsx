'use client';
/* eslint-disable @next/next/no-html-link-for-pages -- Same-origin anchors deliberately cross privacy and demo state boundaries. */

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Language } from '../../lib/domain';
import styles from './CitizenChrome.module.css';

function t(language: Language, en: string, hi: string) {
  return language === 'hi' ? hi : en;
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

  return (
    <div className={styles.chrome} data-product-shell="citizen" data-product-mode={boundary}>
      <div className={styles.publicBar}>
        <span aria-hidden="true" />
        {boundary === 'demo'
          ? t(language, 'Demo boundary · use fictional or synthetic test data only · no government connection', 'डेमो सीमा · केवल काल्पनिक या सिंथेटिक टेस्ट डेटा उपयोग करें · कोई सरकारी कनेक्शन नहीं')
          : t(language, 'Independent non-public prototype · Not a government, bank, court, or toll service', 'स्वतंत्र गैर-सार्वजनिक प्रोटोटाइप · यह सरकारी, बैंक, अदालत या टोल सेवा नहीं है')}
      </div>
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
          : t(language, 'Independent non-public prototype. It does not file, pay, authenticate, give legal advice, or guarantee an outcome.', 'स्वतंत्र गैर-सार्वजनिक प्रोटोटाइप। यह फाइल, भुगतान, प्रमाणीकरण, कानूनी सलाह या नतीजे की गारंटी नहीं देता।')}</p>
      </div>
    </footer>
  );
}

export { styles as citizenChromeStyles };
