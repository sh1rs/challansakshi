'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { MobilityCase } from '../../lib/mobility/cases';
import {
  CASE_TEAM_ROLES, fingerprintCaseTeamInput, runCaseTeam,
  type CaseTeamLanguage, type CaseTeamResult, type CaseTeamRole, type CaseTeamSeverity,
} from '../../lib/mobility/case-team';
import styles from './CaseTeamPanel.module.css';

type Props = { caseValue: MobilityCase; language: CaseTeamLanguage; onReviewSources?: (keys: string[]) => void };
const roleNames: Record<CaseTeamRole, { en: string; hi: string }> = {
  evidence: { en: 'Evidence checker', hi: 'साक्ष्य जाँचकर्ता' },
  planner: { en: 'Service planner', hi: 'सेवा योजनाकार' },
  consistency: { en: 'Consistency checker', hi: 'संगति जाँचकर्ता' },
  coach: { en: 'Next-step coach', hi: 'अगला कदम मार्गदर्शक' },
};

/** Keying by the complete input removes old output in the same render as a case edit. */
export default function CaseTeamPanel({ caseValue, language, onReviewSources }: Props) {
  let fingerprint: string;
  try { fingerprint = fingerprintCaseTeamInput(caseValue, language); }
  catch { return <section className={styles.panel}><p>{language === 'hi' ? 'केस की जाँच करने से पहले ज़रूरी विवरण पूरे करें।' : 'Complete the required case details before running these checks.'}</p><button type="button" className={styles.primary} disabled>{language === 'hi' ? 'यह केस जाँचें' : 'Check this case'}</button></section>; }
  return <CurrentCaseTeamPanel key={fingerprint} caseValue={caseValue} language={language} onReviewSources={onReviewSources} />;
}

function CurrentCaseTeamPanel({ caseValue, language, onReviewSources }: Props) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const headingId = useId();
  const [progress, setProgress] = useState<CaseTeamResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [unclear, setUnclear] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => {
    const previous = active.current;
    active.current = null;
    previous?.abort();
  }, []);

  const run = async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setError(''); setProgress(null); setRunning(true); setUnclear(false);
    try {
      const result = await runCaseTeam(caseValue, {
        language, signal: controller.signal,
        onProgress: update => { if (active.current === controller) setProgress(update); },
      });
      if (active.current === controller) setProgress(result);
    } catch {
      if (active.current === controller) setError(t('This case could not be checked. Review your details and try again.', 'यह केस जाँचा नहीं जा सका। अपने विवरण देखें और फिर कोशिश करें।'));
    } finally {
      if (active.current === controller) { setRunning(false); active.current = null; }
    }
  };
  const severityLabel = (severity: CaseTeamSeverity) => severity === 'attention' ? t('Review needed', 'समीक्षा ज़रूरी') : severity === 'uncertain' ? t('Uncertain', 'अनिश्चित') : t('Information', 'जानकारी');
  const statusLabel = (status: string) => status === 'complete' ? t('Finished', 'पूरी हुई') : status === 'failed' ? t('Could not finish', 'पूरी नहीं हुई') : status === 'cancelled' ? t('Stopped', 'रोकी गई') : status === 'running' ? t('Checking', 'जाँच जारी') : t('Waiting', 'प्रतीक्षा');
  const sourceDetails = (keys: string[]) => <details className={styles.sources}>
    <summary>{t('See sources', 'स्रोत देखें')} ({keys.length})</summary>
    <ul>{keys.map(key => {
      const source = progress?.sources.find(item => item.key === key);
      if (!source) return null;
      return <li key={key}>
        {source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}<span className={styles.srOnly}>{t(' (opens a new tab)', ' (नया टैब खुलेगा)')}</span></a> : <span>{source.label}</span>}
        <code>{source.key}</code>
        {source.sourceId && <span>{t('Source', 'स्रोत')}: {source.sourceId}{source.page ? ` · ${t('page', 'पृष्ठ')} ${source.page}` : ''}</span>}
        {source.kind === 'official' && <span>{t('Official information link from the service catalogue; no live status was checked.', 'सेवा सूची का आधिकारिक जानकारी लिंक; लाइव स्थिति की जाँच नहीं हुई।')}</span>}
      </li>;
    })}</ul>
  </details>;

  const statusText = running ? t('Checking your current case on this device…', 'इस डिवाइस पर आपके वर्तमान केस की जाँच जारी है…')
    : progress?.status === 'complete' ? t('Four on-device checks finished. Review the suggested next step.', 'डिवाइस पर चार जाँचें पूरी हुईं। सुझाया अगला कदम देखें।')
      : progress?.status === 'partial' ? t('Some checks could not finish. Completed findings are available below.', 'कुछ जाँचें पूरी नहीं हुईं। पूरी जाँचों के निष्कर्ष नीचे उपलब्ध हैं।')
        : progress?.status === 'cancelled' ? t('Check stopped. Any finished findings remain below.', 'जाँच रोक दी गई। पूरी जाँचों के निष्कर्ष नीचे हैं।') : '';

  return <section className={styles.panel} aria-labelledby={headingId}>
    <div className={styles.heading}>
      <div><span className={styles.eyebrow}>{t('On-device checks', 'डिवाइस पर जाँच')}</span><h3 id={headingId}>{t('Check your case together', 'अपने केस की मिलकर जाँच करें')}</h3></div>
      <span className={styles.localBadge}>{t('Stays on this device', 'इसी डिवाइस पर')}</span>
    </div>
    <p className={styles.intro}>{t('Four focused checks review your readings, service plan and draft, then suggest one useful next step. These are local rules, not model AI or official verification.', 'चार केंद्रित जाँचें आपके विवरण, सेवा तैयारी और मसौदे को देखकर एक उपयोगी अगला कदम सुझाती हैं। ये स्थानीय नियम हैं, मॉडल AI या आधिकारिक सत्यापन नहीं।')}</p>
    <div className={styles.actions}>
      <button type="button" className={styles.primary} disabled={running} onClick={() => { void run(); }}>{running ? t('Checking…', 'जाँच जारी…') : progress ? t('Check again', 'फिर जाँचें') : t('Check this case', 'यह केस जाँचें')}</button>
      {running && <button type="button" onClick={() => active.current?.abort()}>{t('Stop checking', 'जाँच रोकें')}</button>}
    </div>
    <p className={styles.liveStatus} role="status" aria-live="polite" aria-atomic="true">{statusText}</p>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {progress && <div data-case-team-results className={styles.results} aria-busy={running}>
      {progress.nextAction && <div className={styles.nextAction}>
        <h4>{progress.nextAction.kind === 'question' ? t('One thing to clarify', 'एक बात स्पष्ट करें') : t('Your next step', 'आपका अगला कदम')}</h4>
        <p>{progress.nextAction.text}</p>
        {onReviewSources && <div className={styles.actions}><button type="button" onClick={() => onReviewSources(progress.nextAction!.sourceKeys)}>{progress.nextAction.kind === 'question' ? t('Show the detail to review', 'जाँचने वाला विवरण दिखाएँ') : t('Go to the next step', 'अगले चरण पर जाएँ')}</button>
          {progress.nextAction.kind === 'question' && <button type="button" onClick={() => setUnclear(true)}>{t('I cannot tell yet', 'अभी स्पष्ट नहीं है')}</button>}</div>}
        {unclear && <p role="status">{t('Keep that detail unconfirmed. Use a clearer original or the official instructions when available; you can still prepare the other parts of your case. Nothing has been changed or submitted.', 'यह विवरण अपुष्ट रखें। स्पष्ट मूल रिकॉर्ड या उपलब्ध आधिकारिक निर्देश देखें; बाकी केस की तैयारी जारी रख सकते हैं। कुछ बदला या जमा नहीं हुआ है।')}</p>}
        {sourceDetails(progress.nextAction.sourceKeys)}
      </div>}
      <details className={styles.checkDetails}><summary>{t('How the checks reached this next step', 'जाँचों से यह अगला कदम कैसे निकला')}</summary>
      <ol className={styles.roles} aria-label={t('Check results by role', 'भूमिका के अनुसार जाँच परिणाम')}>
        {CASE_TEAM_ROLES.map(role => {
          const result = progress.roles.find(item => item.role === role);
          const findings = result?.findings ?? [];
          return <li key={role} className={styles.role}>
            <div className={styles.roleHeading}><h4>{roleNames[role][language]}</h4><span className={styles.roleStatus}>{statusLabel(result?.status ?? 'pending')}</span></div>
            {result?.error && <p className={styles.error}>{result.error}</p>}
            {role === 'coach' && result?.status === 'complete' && <p className={styles.roleNote}>{t('Combined the other checks into the next step above.', 'बाकी जाँचों से ऊपर दिया अगला कदम तैयार किया।')}</p>}
            {findings.length > 0 && <details className={styles.findings} open={findings.some(item => item.severity === 'attention')}>
              <summary>{t('Review findings', 'निष्कर्ष देखें')} ({findings.length})</summary>
              <ul>{findings.map((item, index) => <li key={`${item.code}-${index}`} className={styles.finding}>
                <span className={`${styles.severity} ${styles[item.severity]}`}>{severityLabel(item.severity)}</span>
                <h5>{item.title}</h5><p>{item.detail}</p>{sourceDetails(item.sourceKeys)}
              </li>)}</ul>
            </details>}
          </li>;
        })}
      </ol>
      </details>
      <p className={styles.boundary}>{t('This check uses your current readings and draft, including unsaved edits. It does not open original documents or check a government account. Editing the case clears these results.', 'यह जाँच आपके वर्तमान विवरण और मसौदे का उपयोग करती है, बिना सहेजे बदलाव सहित। यह मूल दस्तावेज़ या सरकारी खाता नहीं खोलती। केस में बदलाव से ये परिणाम हट जाते हैं।')}</p>
    </div>}
  </section>;
}
