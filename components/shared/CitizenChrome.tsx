'use client';
/* eslint-disable @next/next/no-html-link-for-pages -- Same-origin anchors deliberately cross state boundaries. */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Menu } from 'lucide-react';
import type { Language } from '../../lib/domain';
import styles from './CitizenChrome.module.css';
import { useClientReady } from './useClientReady';

function t(language: Language, en: string, hi: string) { return language === 'hi' ? hi : en; }
const themeListeners = new Set<() => void>();
function subscribeToTheme(listener: () => void) { themeListeners.add(listener); return () => themeListeners.delete(listener); }
function readDarkTheme() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
function readServerDarkTheme() {
  return false;
}
function applyThemeChoice(theme: 'light' | 'dark') {
  const hook = (window as unknown as Record<string, unknown>).__challansakshiApplyTheme;
  if (typeof hook === 'function') (hook as (value: string) => void)(theme);
  else document.documentElement.setAttribute('data-theme', theme);
  themeListeners.forEach((listener) => listener());
}

export function CitizenHeader({ language, setLanguage, service = 'ChallanSakshi', serviceHindi = 'चालान साक्षी', boundary = 'real', utilities, quickExit, englishOnly = false }: {
  language: Language; setLanguage: (language: Language) => void; service?: string; serviceHindi?: string; boundary?: 'real' | 'demo'; utilities?: ReactNode; quickExit?: ReactNode; englishOnly?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const clientReady = useClientReady();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = 'citizen-navigation-menu';
  const darkTheme = useSyncExternalStore(subscribeToTheme, readDarkTheme, readServerDarkTheme);
  const chooseLanguage = (next: Language) => {
    setLanguage(next);
    setMenuOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenuOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);
  return <div className={styles.chrome} data-product-shell="citizen" data-product-mode={boundary}>
    {boundary === 'demo' ? <div className={styles.publicBar}>{t(language, 'Demo boundary · fictional data only · no government connection', 'डेमो सीमा · केवल काल्पनिक डेटा · कोई सरकारी कनेक्शन नहीं')}</div> : null}
    <header className={styles.header} data-mobile-header>
      <a data-required-action className={styles.brand} href="/" aria-label={t(language, 'ChallanSakshi home', 'चालान साक्षी होम')}><span><strong>{service}</strong><small>{serviceHindi}</small></span></a>
      <nav className={styles.desktopNav} aria-label={t(language, 'Product navigation', 'उत्पाद नेविगेशन')}><a data-required-action href="/review">{t(language, 'Challan review', 'चालान समीक्षा')}</a><a data-required-action href="/fastag">{t(language, 'FASTag check', 'FASTag जाँच')}</a><a data-required-action href="/safety">{t(language, 'Safety & privacy', 'सुरक्षा और गोपनीयता')}</a></nav>
      {quickExit ? <span className={styles.quickExit} data-quick-exit>{quickExit}</span> : null}
      {!englishOnly ? <select data-required-action className={styles.languageSelector} aria-label="Display language" value={language} disabled={!clientReady} onChange={(event) => { setLanguage(event.target.value === 'hi' ? 'hi' : 'en'); setMenuOpen(false); }}><option value="en">EN</option><option value="hi">हिं</option></select> : null}
      <button data-required-action ref={triggerRef} type="button" className={styles.menuTrigger} disabled={!clientReady} aria-expanded={menuOpen} aria-controls={menuId} onClick={() => setMenuOpen((open) => !open)}><Menu aria-hidden="true" size={26} strokeWidth={1.8} /><span className={styles.visuallyHidden}>{t(language, 'Menu', 'मेन्यू')}</span></button>
      <div className={styles.menuPanel} id={menuId} hidden={!menuOpen}>
        <nav aria-label={t(language, 'Menu navigation', 'मेन्यू नेविगेशन')}><a data-required-action href="/">{t(language, 'Home', 'होम')}</a><a data-required-action href="/review">{t(language, 'Challan review', 'चालान समीक्षा')}</a><a data-required-action href="/fastag">{t(language, 'FASTag check', 'FASTag जाँच')}</a><a data-required-action href="/safety">{t(language, 'Safety & privacy', 'सुरक्षा और गोपनीयता')}</a></nav>
        {utilities ? <div className={styles.utilities}>{utilities}</div> : null}
        <CitizenHeaderButton type="button" aria-pressed={darkTheme} onClick={() => applyThemeChoice(darkTheme ? 'light' : 'dark')}>{t(language, darkTheme ? 'Light mode' : 'Dark mode', darkTheme ? 'लाइट मोड' : 'डार्क मोड')}</CitizenHeaderButton>
        {englishOnly ? <p className={styles.englishAvailability}>{boundary === 'demo' ? 'This demo is currently available in English' : 'FASTag check is currently available in English'}</p> : <div className={styles.languages} role="group" aria-label={t(language, 'Language', 'भाषा')}><button data-required-action type="button" aria-pressed={language === 'en'} onClick={() => chooseLanguage('en')}>EN</button><button data-required-action type="button" aria-pressed={language === 'hi'} onClick={() => chooseLanguage('hi')}>हिं</button></div>}
      </div>
    </header>
  </div>;
}

export function CitizenHeaderButton({ className = '', tone = 'default', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'default' | 'danger' }) { return <button data-required-action className={`${styles.headerButton} ${tone === 'danger' ? styles.headerButtonDanger : ''} ${className}`} {...props} />; }

export function CitizenFooter({ language, boundary = 'real' }: { language: Language; service?: string; boundary?: 'real' | 'demo' }) {
  const copy = boundary === 'demo' ? t(language, 'Use fictional or synthetic test data only. Nothing is filed, paid, authenticated or sent to a government system.', 'केवल काल्पनिक या सिंथेटिक टेस्ट डेटा उपयोग करें। कुछ भी फाइल, भुगतान, प्रमाणित या सरकारी सिस्टम को नहीं भेजा जाता।') : t(language, 'Independent—not a government service. Documents are read on this device unless you choose cloud analysis for selected files. Nothing is filed, paid or submitted for you. No legal advice or guaranteed outcome.', 'स्वतंत्र—यह सरकारी सेवा नहीं है। जब तक आप चुनी फ़ाइलों के लिए क्लाउड विश्लेषण नहीं चुनते, दस्तावेज़ इसी डिवाइस पर पढ़े जाते हैं। आपके लिए कुछ भी फाइल, भुगतान या जमा नहीं किया जाता। कानूनी सलाह या नतीजे की गारंटी नहीं।');
  return <footer className={styles.footer} data-product-shell="citizen"><div className={styles.footerInner}><p data-product-boundary>{copy}</p><a data-required-action href="/safety">{t(language, 'Safety & privacy', 'सुरक्षा और गोपनीयता')}</a></div></footer>;
}
export { styles as citizenChromeStyles };
