'use client';

import { useEffect, useState } from 'react';
import type { Language } from '../../lib/domain';
import { getPublicOfficialRoutes, type PublicOfficialRoute } from '../../lib/public-official-routes';
import { PublicBetaShell, publicBetaStyles } from './PublicBetaShell';
import styles from './OfficialSourcesPage.module.css';

const t = (language: Language, en: string, hi: string) => language === 'hi' ? hi : en;
const hindiNames: Record<string, string> = {
  'auxiliary:national-record-lookup': 'राष्ट्रीय ई-चालान रिकॉर्ड खोज',
  'auxiliary:nextgen-service-landing': 'NextGen ई-चालान सेवाएँ',
  'auxiliary:national-services-directory': 'राष्ट्रीय ई-चालान सेवा निर्देशिका',
  'auxiliary:virtual-courts': 'वर्चुअल कोर्ट',
  'handoff:legacy': 'राष्ट्रीय ई-चालान शिकायत सेवा',
  'handoff:nextgen': 'NextGen ई-चालान शिकायत सेवा',
  'handoff:delhi-manual': 'दिल्ली यातायात पुलिस',
};

function scopeLabel(route: PublicOfficialRoute, language: Language) {
  if (route.kind === 'auxiliary') return t(language, 'Public service reference. Check whether your record is supported on the official service.', 'सार्वजनिक सेवा संदर्भ। आधिकारिक सेवा पर जाँचें कि आपका रिकॉर्ड समर्थित है या नहीं।');
  if (!route.jurisdictionCodes.length) return t(language, 'No issuing jurisdiction is approved for this route in this release.', 'इस रिलीज़ में किसी जारीकर्ता क्षेत्र के लिए यह रास्ता स्वीकृत नहीं है।');
  if (route.id === 'handoff:delhi-manual') return t(language, 'Delhi official landing page. No grievance-form support is asserted.', 'दिल्ली का आधिकारिक मुख्य पेज। शिकायत फ़ॉर्म सहायता की पुष्टि नहीं है।');
  return t(language, 'For a citizen-confirmed issuing jurisdiction in this list. The issuing authority may differ from the vehicle registration state.', 'इस सूची में नागरिक द्वारा पुष्ट चालान जारीकर्ता क्षेत्र के लिए। जारीकर्ता प्राधिकरण वाहन पंजीकरण राज्य से अलग हो सकता है।');
}

export function OfficialSourcesPage({ evaluatedAt }: { evaluatedAt: string }) {
  const [language, setLanguage] = useState<Language>('en');
  const [now, setNow] = useState(evaluatedAt);
  useEffect(() => {
    const refresh = () => setNow(new Date().toISOString());
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  const registry = getPublicOfficialRoutes(now);
  return <PublicBetaShell language={language} setLanguage={setLanguage} service="ChallanSakshi" serviceHindi="आधिकारिक स्रोत">
    <main className={`${publicBetaStyles.infoPage} ${styles.page}`}>
      <p className={publicBetaStyles.eyebrow}>{t(language, 'Sources you can inspect', 'स्रोत जिन्हें आप जाँच सकते हैं')}</p>
      <h1>{t(language, 'Know where your next step leads.', 'जानें आपका अगला कदम कहाँ ले जाता है।')}</h1>
      <p>{t(language, 'Official links, their scope and the dates behind our route guidance. These are retained reviews, not live government access.', 'आधिकारिक लिंक, उनका दायरा और हमारे मार्गदर्शन की समीक्षा तारीखें। ये सुरक्षित रखी गई समीक्षाएँ हैं, लाइव सरकारी पहुँच नहीं।')}</p>
      <aside className={styles.note}>
        <strong>{t(language, 'What “Available” means', '“उपलब्ध” का अर्थ')}</strong>
        <p>{t(language, 'The route review is still current. A working webpage does not prove the service accepts your case. Review expiry is not your filing deadline.', 'रास्ते की समीक्षा अभी वर्तमान है। पेज खुलना यह प्रमाण नहीं है कि सेवा आपका मामला स्वीकार करती है। समीक्षा की समाप्ति आपकी आवेदन समय-सीमा नहीं है।')}</p>
      </aside>
      <div className={styles.routes}>
        {registry.routes.map(route => <article key={route.id} className={styles.card}>
          <div className={styles.cardHeading}>
            <h2>{language === 'hi' ? hindiNames[route.id] : route.name}</h2>
            <span className={styles.badge} data-status={route.status}>{route.status === 'available' ? t(language, 'Available', 'उपलब्ध') : route.status === 'needs-recheck' ? t(language, 'Needs recheck', 'दोबारा जाँच ज़रूरी') : t(language, 'Reference only', 'केवल संदर्भ')}</span>
          </div>
          <p>{scopeLabel(route, language)}</p>
          {route.jurisdictionCodes.length ? <p className={styles.codes}><strong>{t(language, 'Issuing jurisdictions', 'चालान जारीकर्ता क्षेत्र')}:</strong> {route.jurisdictionCodes.join(' · ')}</p> : null}
          <dl className={styles.dates}>
            <div><dt>{t(language, 'Last reviewed', 'अंतिम समीक्षा')}</dt><dd><time dateTime={route.lastReviewedOn}>{route.lastReviewedOn}</time></dd></div>
            <div><dt>{t(language, 'Review expires', 'समीक्षा समाप्ति')}</dt><dd><time dateTime={route.reviewExpiresOn}>{route.reviewExpiresOn}</time> UTC</dd></div>
          </dl>
          {route.status === 'available'
            ? <a className={styles.officialLink} href={route.url} target="_blank" rel="noopener noreferrer" onClick={event => {
              const current = getPublicOfficialRoutes(new Date().toISOString()).routes.find(candidate => candidate.id === route.id);
              if (current?.status !== 'available') { event.preventDefault(); setNow(new Date().toISOString()); }
            }} onAuxClick={event => {
              const current = getPublicOfficialRoutes(new Date().toISOString()).routes.find(candidate => candidate.id === route.id);
              if (current?.status !== 'available') { event.preventDefault(); setNow(new Date().toISOString()); }
            }}>{t(language, 'Open official service', 'आधिकारिक सेवा खोलें')} <span aria-hidden="true">↗</span><small>{route.domain}</small></a>
            : <p className={styles.unavailable}>{t(language, 'This listing is not an active handoff. Use the review flow to check your next step.', 'यह सूची सक्रिय हैंडऑफ़ नहीं है। अगला कदम जाँचने के लिए समीक्षा प्रवाह उपयोग करें।')}</p>}
          <details className={styles.provenance}>
            <summary>{t(language, 'Source & review record', 'स्रोत और समीक्षा रिकॉर्ड')}</summary>
            <dl><dt>{t(language, 'Official URL', 'आधिकारिक URL')}</dt><dd>{route.url}</dd><dt>{t(language, 'Reviewer', 'समीक्षक')}</dt><dd>{t(language, route.provenance.reviewer, 'ChallanSakshi रिलीज़-रूट समीक्षा')}</dd><dt>{t(language, 'Retained evidence reference', 'सुरक्षित साक्ष्य संदर्भ')}</dt><dd>{route.provenance.evidenceRef}</dd></dl>
          </details>
        </article>)}
      </div>
      <aside className={styles.note}>
        <strong>{t(language, 'You stay in control', 'नियंत्रण आपके पास')}</strong>
        <p>{t(language, 'Complete identity checks, payment and final submission yourself on the official service. Our source list does not confirm acceptance, authenticity or legal validity.', 'पहचान जाँच, भुगतान और अंतिम जमा आधिकारिक सेवा पर स्वयं करें। हमारी स्रोत सूची स्वीकृति, प्रामाणिकता या कानूनी वैधता की पुष्टि नहीं करती।')}</p>
        <a href="/review">{t(language, 'Review a challan', 'चालान की समीक्षा करें')}</a>
      </aside>
      <p className={styles.apiLink}><a href="/api/official-routes">{t(language, 'Read the public route data (JSON)', 'सार्वजनिक रूट डेटा पढ़ें (JSON)')}</a></p>
    </main>
  </PublicBetaShell>;
}
