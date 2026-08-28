'use client';
/* eslint-disable @next/next/no-html-link-for-pages -- Vinext's client-side next/link shim currently duplicates React during HMR; plain same-origin links are reliable and preserve the privacy reset boundary. */

import type { ReactNode } from 'react';
import type { Language } from '../../lib/domain';
import styles from './PublicBeta.module.css';

function t(language: Language, en: string, hi: string) {
  return language === 'hi' ? hi : en;
}

export function PublicBetaShell({
  language,
  setLanguage,
  service,
  serviceHindi,
  children,
  onQuickExit,
  englishOnly = false,
}: {
  language: Language;
  setLanguage: (language: Language) => void;
  service: string;
  serviceHindi: string;
  children: ReactNode;
  onQuickExit?: () => void;
  englishOnly?: boolean;
}) {
  return (
    <div className={styles.app}>
      <div className={styles.publicBar}>
        <span aria-hidden="true" />
        {t(language, 'Independent public-interest early access · Not a government, bank, court, or toll service', 'स्वतंत्र जनहित अर्ली एक्सेस · यह सरकारी, बैंक, अदालत या टोल सेवा नहीं है')}
      </div>
      <header className={styles.header}>
        <a className={styles.brand} href="/" aria-label="ChallanSakshi home">
          <span className={styles.brandMark} aria-hidden="true">स</span>
          <span><strong>{service}</strong><small>{serviceHindi}</small></span>
        </a>
        <nav className={styles.nav} aria-label={t(language, 'Service navigation', 'सेवा नेविगेशन')}>
          <a href="/review">{t(language, 'Challan review', 'चालान समीक्षा')}</a>
          <a href="/fastag">{t(language, 'FASTag check', 'FASTag जाँच')}</a>
          <a href="/privacy">{t(language, 'Privacy', 'गोपनीयता')}</a>
          {onQuickExit && <button type="button" className={styles.quickExit} aria-label={t(language, 'Quick exit and clear this review', 'तुरंत बाहर निकलें और यह समीक्षा साफ़ करें')} onClick={onQuickExit}>{t(language, 'Quick exit & clear', 'तुरंत बाहर निकलें और साफ़ करें')}</button>}
          {englishOnly ? <span className={styles.englishOnly}>English-only safety beta</span> : <div className={styles.languages} role="group" aria-label={t(language, 'Language', 'भाषा')}>
            <button type="button" className={language === 'en' ? styles.active : ''} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button>
            <button type="button" className={language === 'hi' ? styles.active : ''} aria-pressed={language === 'hi'} onClick={() => setLanguage('hi')}>हिं</button>
          </div>}
        </nav>
      </header>
      {children}
      <footer className={styles.footer}>
        <div>
          <span className={styles.brandMark} aria-hidden="true">स</span>
          <div><strong>{service}</strong><small>{t(language, 'Evidence before action', 'कार्रवाई से पहले सबूत')}</small></div>
        </div>
        <div className={styles.footerLinks}>
          <a href="/privacy">{t(language, 'Privacy & data controls', 'गोपनीयता और डेटा नियंत्रण')}</a>
          <a href="/safety">{t(language, 'Safety & official routes', 'सुरक्षा और आधिकारिक रास्ते')}</a>
          <a href="/demo">{t(language, 'Synthetic evidence demo', 'सिंथेटिक सबूत डेमो')}</a>
        </div>
        <p>{t(language, 'Independent early access. It does not file, pay, authenticate, give legal advice, or guarantee an outcome.', 'स्वतंत्र अर्ली एक्सेस। यह फाइल, भुगतान, प्रमाणीकरण, कानूनी सलाह या नतीजे की गारंटी नहीं देता।')}</p>
      </footer>
    </div>
  );
}

export function SafetyBoundary({ language, children }: { language: Language; children?: ReactNode }) {
  return (
    <aside className={styles.boundary} aria-label={t(language, 'Important product boundary', 'महत्वपूर्ण उत्पाद सीमा')}>
      <span aria-hidden="true">i</span>
      <div>
        <strong>{t(language, 'Manual self-review · no document upload', 'मैन्युअल स्वयं-समीक्षा · कोई दस्तावेज़ अपलोड नहीं')}</strong>
        <p>{t(language, 'Based only on your answers. ChallanSakshi did not inspect your records or official status. Your real-mode answers stay only in this tab and are not sent to our server, an AI model, an authority, a bank, or a toll operator.', 'केवल आपके उत्तरों पर आधारित। ChallanSakshi ने आपके रिकॉर्ड या आधिकारिक स्थिति नहीं देखी। रियल-मोड के उत्तर केवल इस टैब में रहते हैं और हमारे सर्वर, AI मॉडल, प्राधिकरण, बैंक या टोल ऑपरेटर को नहीं भेजे जाते।')}</p>
        {children}
      </div>
    </aside>
  );
}

export { styles as publicBetaStyles };
