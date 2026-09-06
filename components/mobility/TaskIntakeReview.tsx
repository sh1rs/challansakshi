'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import { Check, ListChecks } from 'lucide-react';
import { extractTaskIntake, reviewTaskIntake, type TaskIntakeCandidate, type TaskIntakeKind, type TaskIntakeReviewResult } from '../../lib/mobility/task-intake';
import styles from './TaskIntakeReview.module.css';

export type TaskIntakeReviewProps = {
  text: string;
  language: 'en' | 'hi';
  onReview: (result: TaskIntakeReviewResult | null) => void;
};

export default function TaskIntakeReview(props: TaskIntakeReviewProps) {
  const clearReview = useEffectEvent(() => props.onReview(null));
  useEffect(() => {
    clearReview();
    return () => clearReview();
  }, [props.text, props.language]);
  return <CurrentReview key={JSON.stringify([props.text, props.language])} {...props} />;
}

function CurrentReview({ text, language, onReview }: TaskIntakeReviewProps) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const extraction = extractTaskIntake(text);
  const candidates = extraction.candidates;
  const [included, setIncluded] = useState(() => candidates.filter(item => candidates.filter(other => other.kind === item.kind).length === 1).map(item => item.id));
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const kinds: TaskIntakeKind[] = ['registration', 'reference', 'jurisdiction'];
  const labels: Record<TaskIntakeKind, string> = {
    registration: t('Vehicle registration', 'वाहन पंजीकरण'),
    reference: t('Reference', 'संदर्भ'),
    jurisdiction: t('State / issuing authority', 'राज्य / जारीकर्ता प्राधिकरण'),
  };
  const valueOf = (item: TaskIntakeCandidate) => edits[item.id] ?? item.value;
  function invalidate() { onReview(null); setConfirmed(false); setError(''); }
  const hide = useEffectEvent(() => { invalidate(); setIncluded([]); setEdits({}); });
  useEffect(() => {
    const pagehide = () => hide();
    window.addEventListener('pagehide', pagehide);
    return () => window.removeEventListener('pagehide', pagehide);
  }, []);

  function include(item: TaskIntakeCandidate, checked: boolean) {
    invalidate();
    setIncluded(previous => {
      if (!checked) return previous.filter(id => id !== item.id);
      const kept = item.kind === 'registration' ? previous : previous.filter(id => candidates.find(candidate => candidate.id === id)?.kind !== item.kind);
      return [...kept, item.id];
    });
  }
  function confirm() {
    try {
      const result = reviewTaskIntake(text, candidates.filter(item => included.includes(item.id)).map(item => ({ id: item.id, value: valueOf(item) })), language);
      onReview(result); setConfirmed(true); setError('');
    } catch (cause) {
      onReview(null); setConfirmed(false);
      setError(cause instanceof Error ? cause.message : t('Check the selected details again.', 'चुनी जानकारी फिर जाँचें।'));
    }
  }
  if (extraction.issue) return <p className={styles.note}>{t('There are too many details for this quick review. Keep them in your notes, or shorten the task to review a few together.', 'इस त्वरित समीक्षा के लिए जानकारी बहुत अधिक है। उसे नोट में रखें या कुछ विवरण साथ जाँचने के लिए काम का पाठ छोटा करें।')}</p>;
  if (!candidates.length) return null;

  return <section className={styles.panel} aria-label={t('Details from your task', 'आपके काम से मिली जानकारी')}>
    <div className={styles.heading}><ListChecks size={18} aria-hidden="true" /><h3>{t('Use details you already typed', 'जो जानकारी लिखी है उसका उपयोग करें')}</h3></div>
    <p className={styles.note}>{t('Review, edit or leave out details, then confirm once to use them in your plan. These are your statements, not document readings or official verification.', 'जाँचें, सुधारें या कोई विवरण छोड़ें। नीचे पुष्टि करने पर ही जानकारी योजना में जुड़ेगी। ये आपके कथन हैं, दस्तावेज़ से पढ़ी जानकारी या आधिकारिक सत्यापन नहीं।')}</p>
    <div className={styles.fields}>
      {kinds.map(kind => {
        const group = candidates.filter(item => item.kind === kind);
        if (!group.length) return null;
        return <fieldset key={kind} className={styles.group}><legend>{labels[kind]}</legend>
          {group.length > 1 && <p className={styles.choiceNote}>{kind === 'registration' ? t('More than one vehicle number appears. Choose which to use, or leave them in your notes.', 'एक से अधिक वाहन नंबर हैं। चुनें किसका उपयोग करना है या उन्हें नोट में रहने दें।') : t('Different values appear. Choose one for this case, or leave them in your notes.', 'अलग-अलग मान हैं। इस केस के लिए एक चुनें या उन्हें नोट में रहने दें।')}</p>}
          {group.map((item, index) => <div className={styles.detail} key={item.id} data-included={included.includes(item.id)}>
            <label className={styles.use}><input type="checkbox" aria-label={`${t('Use', 'उपयोग करें')} ${valueOf(item) || t('this detail', 'यह विवरण')}`} checked={included.includes(item.id)} onChange={event => include(item, event.target.checked)} /><span>{t('Include in my plan', 'योजना में शामिल करें')}</span></label>
            <input className={styles.value} aria-label={`${labels[kind]} ${index + 1}`} value={valueOf(item)} maxLength={160} autoComplete="off" spellCheck={false} onChange={event => { invalidate(); setEdits(previous => ({ ...previous, [item.id]: event.target.value })); }} />
            <p className={styles.source}>{t('In your task', 'आपके काम में')}: <q>{text.slice(item.spans[0].start, item.spans[0].end)}</q>{item.spans.length > 1 && <span> · {t(`appears ${item.spans.length} times`, `${item.spans.length} बार लिखा है`)}</span>}</p>
          </div>)}
        </fieldset>;
      })}
    </div>
    <p className={styles.note}>{t('Left-out details remain in your original task note. A vehicle number does not establish the state or authority for this case.', 'छोड़े गए विवरण आपके मूल काम के नोट में रहेंगे। वाहन नंबर से इस केस का राज्य या प्राधिकरण तय नहीं होता।')}</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {confirmed && <p role="status" className={styles.confirmed}><Check size={17} aria-hidden="true" />{t('Selected details are reviewed and ready for your plan.', 'चुनी जानकारी की समीक्षा हो गई है और वह योजना के लिए तैयार है।')}</p>}
    <div className={styles.actions}><button type="button" className={styles.primary} disabled={!included.length || confirmed} onClick={confirm}>{confirmed ? t('Details reviewed', 'जानकारी की समीक्षा हो गई') : t('Use these reviewed details', 'इस समीक्षा की गई जानकारी का उपयोग करें')}</button><button type="button" disabled={!included.length} onClick={() => { invalidate(); setIncluded([]); }}>{t('Leave all in my notes', 'सब मेरे नोट में रहने दें')}</button></div>
  </section>;
}
