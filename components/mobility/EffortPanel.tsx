'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ServiceKind } from '@/lib/mobility/cases';
import { getService } from '@/lib/mobility/services';
import {
  beginEffort, EFFORT_IDLE_MS, exportEffort, finishEffort, pauseEffort, recordEffortInteraction,
  recordEffortReport, resumeEffort, sampleEffort, setEffortPresence, type EffortOutcome, type EffortSession,
} from '@/lib/mobility/effort';
import styles from './EffortPanel.module.css';

const copy = {
  en: {
    summary: 'Measure my effort · optional', intro: 'For a pilot, measure recent activity on this case page. Start only if you want to; nothing is sent or saved automatically.',
    scope: 'What this measures', scopeText: 'Counts time only while this page is visible and focused, for up to 30 seconds after a click, key press or scroll. Idle time, pauses and time on other sites are excluded. Quiet reading after 30 seconds is not counted. This cannot tell you how much time was saved.',
    privacy: 'No text, key values, case details or browsing history are recorded. This session stays in memory. Leaving this case or reloading clears it. A reviewed download stays wherever you save it.',
    begin: 'Start measuring', active: 'Measuring recent page activity', paused: 'Paused', idle: 'Waiting for page activity', finished: 'Measurement finished', duration: 'Counted activity time', pause: 'Pause measurement', resume: 'Resume measurement',
    reports: 'Your own counts', reportNote: 'Tap once per occasion. These are your reports; the app does not detect repetition or a need for help.', repeated: 'I repeated a detail', help: 'I needed help', repeatedCount: 'Repeated details reported', helpCount: 'Help needed reported',
    outcome: 'What happened in this session?', choose: 'Choose your outcome', prepared: 'I prepared my next step', official: 'I report taking an official step', stopped: 'I stopped for now', outcomeNote: 'Your selected outcome is self-reported. An official step is not verified here.', finish: 'Finish measurement',
    preview: 'Review the entire export', exportNote: 'Only these six fields go into the JSON file. Duration is in milliseconds. Counters and outcome are self-reported. Share the file yourself only if you choose.', review: 'I reviewed these measurement fields for download.', download: 'Download reviewed measurement', clear: 'Clear measurement', cleared: 'Measurement cleared from this page.', downloadError: 'The download could not start. Your review remains here so you can try again.',
  },
  hi: {
    summary: 'अपना प्रयास मापें · वैकल्पिक', intro: 'पायलट के लिए इस केस पेज पर हाल की गतिविधि का समय मापें। चाहें तभी शुरू करें; कुछ भी अपने-आप भेजा या सहेजा नहीं जाता।',
    scope: 'इसमें क्या मापा जाता है', scopeText: 'जब यह पेज दिखाई दे और सक्रिय हो, तो क्लिक, कुंजी दबाने या स्क्रॉल के बाद अधिकतम 30 सेकंड तक का समय गिना जाता है। निष्क्रिय समय, विराम और दूसरी साइटों का समय नहीं गिना जाता। 30 सेकंड के बाद चुपचाप पढ़ने का समय नहीं गिना जाता। इससे बचाए गए समय का पता नहीं चलता।',
    privacy: 'कोई टेक्स्ट, दबाई गई कुंजी, केस जानकारी या ब्राउज़िंग इतिहास दर्ज नहीं होता। सत्र केवल मेमोरी में रहता है। केस छोड़ने या पेज फिर लोड करने से यह मिट जाता है। डाउनलोड की गई फ़ाइल आपके चुने स्थान पर रहती है।',
    begin: 'मापना शुरू करें', active: 'पेज की हाल की गतिविधि माप रहे हैं', paused: 'विराम दिया गया', idle: 'पेज पर गतिविधि की प्रतीक्षा है', finished: 'माप पूरा हुआ', duration: 'गिना गया गतिविधि समय', pause: 'माप रोकें', resume: 'माप फिर शुरू करें',
    reports: 'आपकी बताई गिनती', reportNote: 'हर अवसर पर एक बार दबाएँ। ये आपकी बताई बातें हैं; ऐप दोहराव या मदद की ज़रूरत अपने-आप नहीं पहचानता।', repeated: 'मैंने जानकारी दोहराई', help: 'मुझे मदद चाहिए थी', repeatedCount: 'बताए गए जानकारी दोहराने के अवसर', helpCount: 'बताए गए मदद की ज़रूरत के अवसर',
    outcome: 'इस सत्र में क्या हुआ?', choose: 'अपना परिणाम चुनें', prepared: 'मैंने अगले कदम की तैयारी की', official: 'मैं आधिकारिक कदम उठाने की सूचना दे रहा/रही हूँ', stopped: 'मैंने अभी के लिए रोक दिया', outcomeNote: 'यह परिणाम आपने बताया है। यहाँ किसी आधिकारिक कदम की पुष्टि नहीं की जाती।', finish: 'माप पूरा करें',
    preview: 'पूरा निर्यात देखें', exportNote: 'JSON फ़ाइल में केवल ये छह फ़ील्ड जाएँगे। समय मिलीसेकंड में है। गिनती और परिणाम आपके बताए हुए हैं। चाहें तो फ़ाइल स्वयं साझा करें।', review: 'मैंने डाउनलोड के लिए माप के इन फ़ील्ड की समीक्षा की है।', download: 'समीक्षा किया माप डाउनलोड करें', clear: 'माप मिटाएँ', cleared: 'इस पेज से माप मिटा दिया गया।', downloadError: 'डाउनलोड शुरू नहीं हुआ। समीक्षा यहाँ है; फिर कोशिश कर सकते हैं।',
  },
};
const presence = () => ({ visible: document.visibilityState === 'visible', focused: document.hasFocus() });
const duration = (ms: number) => `${Math.floor(ms / 60_000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

/** Parent must key by current case ID and unmount on leaving the case. No case details are accepted. */
export default function EffortPanel({ service, language }: { service: ServiceKind; language: 'en' | 'hi' }) {
  const text = copy[language];
  const id = useId();
  const [session, setSession] = useState<EffortSession | null>(null);
  const sessionRef = useRef<EffortSession | null>(null);
  const [outcome, setOutcome] = useState<EffortOutcome | ''>('');
  const [reviewed, setReviewed] = useState(false);
  const [message, setMessage] = useState<'cleared' | 'downloadError' | null>(null);
  const change = useCallback((update: (current: EffortSession) => EffortSession) => {
    if (!sessionRef.current) return;
    const next = update(sessionRef.current);
    sessionRef.current = next;
    setSession(next);
  }, []);
  const clear = useCallback(() => { sessionRef.current = null; setSession(null); setOutcome(''); setReviewed(false); setMessage('cleared'); }, []);
  const measuring = Boolean(session && session.status !== 'finished');
  useEffect(() => {
    if (!measuring) return;
    const interact = (event: Event) => { if (event.isTrusted) change(current => recordEffortInteraction(current, performance.now())); };
    const updatePresence = () => change(current => setEffortPresence(current, presence(), performance.now()));
    // Use scrolling input, not a scroll event that app code can also trigger.
    const activityEvents = ['pointerdown', 'keydown', 'wheel', 'touchmove'] as const;
    for (const event of activityEvents) window.addEventListener(event, interact, { capture: true, passive: true });
    window.addEventListener('focus', updatePresence);
    window.addEventListener('blur', updatePresence);
    document.addEventListener('visibilitychange', updatePresence);
    const timer = window.setInterval(() => change(current => sampleEffort(current, performance.now())), 1000);
    updatePresence();
    return () => {
      for (const event of activityEvents) window.removeEventListener(event, interact, true);
      window.removeEventListener('focus', updatePresence);
      window.removeEventListener('blur', updatePresence);
      document.removeEventListener('visibilitychange', updatePresence);
      window.clearInterval(timer);
    };
  }, [change, measuring]);
  useEffect(() => {
    // A page restored from the back-forward cache must not retain a departed session.
    window.addEventListener('pagehide', clear);
    return () => window.removeEventListener('pagehide', clear);
  }, [clear]);

  const start = () => {
    const next = beginEffort({ service, now: performance.now(), presence: presence() });
    sessionRef.current = next; setSession(next); setOutcome(''); setReviewed(false); setMessage(null);
  };
  const exported = session?.status === 'finished' ? exportEffort(session) : null;
  const preview = exported ? JSON.stringify(exported, null, 2) : '';
  const download = () => {
    if (!exported || !reviewed) return;
    try {
      const url = URL.createObjectURL(new Blob([preview], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `effort-${exported.sessionId}.json`; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setMessage(null);
    } catch { setMessage('downloadError'); }
  };
  const status = session?.status === 'finished' ? text.finished : session?.status === 'paused' ? text.paused : session && (!session.visible || !session.focused || session.lastSampleMs - session.lastInteractionMs >= EFFORT_IDLE_MS) ? text.idle : text.active;

  return <details className={styles.panel}>
    <summary>{text.summary}</summary>
    <div className={styles.content}>
      <p>{text.intro}</p>
      <details className={styles.scope}><summary>{text.scope}</summary><p>{text.scopeText}</p><p>{text.privacy}</p></details>
      {!session ? <button className={styles.primary} type="button" onClick={start}>{text.begin}</button> : <section className={styles.measurement} aria-label={text.duration}>
        <p className={styles.service}>{getService(session.service).title[language]}</p>
        <p role="status">{status}</p>
        <div className={styles.duration}><span>{text.duration}</span><strong role="timer" aria-live="off" aria-label={text.duration} data-effort-duration-ms={Math.round(session.activeDurationMs)}>{duration(session.activeDurationMs)}</strong></div>
        {session.status !== 'finished' && <div className={styles.actions}>
          {session.status === 'active' ? <button type="button" onClick={() => change(current => pauseEffort(current, performance.now()))}>{text.pause}</button> : <button type="button" onClick={() => change(current => resumeEffort(current, performance.now()))}>{text.resume}</button>}
        </div>}
        <fieldset className={styles.reports}><legend>{text.reports}</legend><p>{text.reportNote}</p>
          <div className={styles.actions}><button type="button" disabled={session.status !== 'active'} onClick={() => change(current => recordEffortReport(current, 'repeated-detail', performance.now()))}>{text.repeated}</button><button type="button" disabled={session.status !== 'active'} onClick={() => change(current => recordEffortReport(current, 'needed-help', performance.now()))}>{text.help}</button></div>
          <p aria-live="polite">{text.repeatedCount}: {session.repeatedDetailCount}<br />{text.helpCount}: {session.helpNeededCount}</p>
        </fieldset>
        {session.status !== 'finished' && <div className={styles.outcome}>
          <label htmlFor={`${id}-outcome`}>{text.outcome}</label>
          <select id={`${id}-outcome`} value={outcome} onChange={event => setOutcome(event.target.value as EffortOutcome | '')}>
            <option value="">{text.choose}</option><option value="prepared">{text.prepared}</option><option value="official-step-reported">{text.official}</option><option value="stopped">{text.stopped}</option>
          </select><p>{text.outcomeNote}</p>
          <button className={styles.primary} type="button" disabled={!outcome} onClick={() => { if (outcome) { change(current => finishEffort(current, outcome, performance.now())); setReviewed(false); } }}>{text.finish}</button>
        </div>}
        {exported && <section className={styles.export} aria-labelledby={`${id}-preview`}><h4 id={`${id}-preview`}>{text.preview}</h4><p>{text.outcomeNote}</p><p>{text.exportNote}</p><pre>{preview}</pre>
          <label className={styles.check}><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} /><span>{text.review}</span></label>
          <button className={styles.primary} type="button" disabled={!reviewed} onClick={download}>{text.download}</button>
        </section>}
        <button type="button" onClick={clear}>{text.clear}</button>
      </section>}
      {message && <p role={message === 'downloadError' ? 'alert' : 'status'}>{text[message]}</p>}
    </div>
  </details>;
}
