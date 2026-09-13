'use client';
/* eslint-disable @next/next/no-html-link-for-pages -- Recovery navigation starts a fresh document after a failed page. */

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, RotateCcw, Search } from 'lucide-react';
import { CitizenFooter, CitizenHeader } from './CitizenChrome';
import styles from './RecoveryPage.module.css';

export default function RecoveryPage({ kind, retry }: { kind: 'missing' | 'error'; retry?: () => void }) {
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const heading = useRef<HTMLHeadingElement>(null);
  const hi = language === 'hi';
  useEffect(() => { if (kind === 'error') heading.current?.focus(); }, [kind]);
  return <div className={styles.page} lang={language}>
    <CitizenHeader language={language} setLanguage={setLanguage} />
    <main className={styles.main}>
      <span className={styles.symbol} aria-hidden="true"><Search size={30} /></span>
      <span className={styles.label}>{kind === 'missing' ? '404' : 'ChallanSakshi'}</span>
      <h1 ref={heading} tabIndex={-1}>{kind === 'missing' ? (hi ? 'यह पेज नहीं मिला' : 'Let’s get you back on track.') : (hi ? 'यह पेज पूरा नहीं खुल पाया' : 'Something did not load.')}</h1>
      <p>{kind === 'missing'
        ? (hi ? 'लिंक बदल गया होगा या पता सही नहीं है। आप होम से अपनी ज़रूरत का टूल खोल सकते हैं।' : 'This link may have moved, or the address may be incomplete. Your next step is still here.')
        : (hi ? 'दोबारा कोशिश करें। होम पर जाने से बिना सहेजा काम हट सकता है।' : 'Try again to reopen this page. Returning home may clear unsaved work.')}</p>
      <div className={styles.actions}>
        {retry && <button type="button" onClick={retry}><RotateCcw size={18} aria-hidden="true" />{hi ? 'दोबारा कोशिश करें' : 'Try again'}</button>}
        <a href="/"><ArrowLeft size={18} aria-hidden="true" />{hi ? 'होम पर लौटें' : 'Back to home'}</a>
        {kind === 'missing' && <a href="/review">{hi ? 'चालान की समीक्षा करें' : 'Review my challan'}</a>}
      </div>
      <a className={styles.help} href="/about">{hi ? 'टूटे लिंक की सूचना दें' : 'Report a broken link or problem'}</a>
    </main>
    <CitizenFooter language={language} />
  </div>;
}
