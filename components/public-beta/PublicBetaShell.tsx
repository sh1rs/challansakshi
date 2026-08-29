'use client';

import type { ReactNode } from 'react';
import type { Language } from '../../lib/domain';
import { CitizenFooter, CitizenHeader, CitizenHeaderButton } from '../shared/CitizenChrome';
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
  simpleMode,
  onSimpleModeChange,
}: {
  language: Language;
  setLanguage: (language: Language) => void;
  service: string;
  serviceHindi: string;
  children: ReactNode;
  onQuickExit?: () => void;
  englishOnly?: boolean;
  simpleMode?: boolean;
  onSimpleModeChange?: (value: boolean) => void;
}) {
  return (
    <div
      className={styles.app}
      lang={language}
      data-simple-mode={simpleMode === undefined ? undefined : simpleMode}
    >
      <CitizenHeader
        language={language}
        setLanguage={setLanguage}
        service={service}
        serviceHindi={serviceHindi}
        englishOnly={englishOnly}
        utilities={<>
          {simpleMode !== undefined && onSimpleModeChange ? <CitizenHeaderButton type="button" aria-pressed={simpleMode} onClick={() => onSimpleModeChange(!simpleMode)}>{t(language, 'Simple mode', 'सरल भाषा')}</CitizenHeaderButton> : null}
          {onQuickExit ? <CitizenHeaderButton type="button" tone="danger" aria-label={t(language, 'Quick exit and clear this review', 'तुरंत बाहर निकलें और यह समीक्षा साफ़ करें')} onClick={onQuickExit}>{t(language, 'Quick exit & clear', 'तुरंत बाहर निकलें और साफ़ करें')}</CitizenHeaderButton> : null}
        </>}
      />
      {children}
      <CitizenFooter language={language} service={service} />
    </div>
  );
}

export function SafetyBoundary({ language, children }: { language: Language; children?: ReactNode }) {
  return (
    <aside className={styles.boundary} aria-label={t(language, 'Important product boundary', 'महत्वपूर्ण उत्पाद सीमा')}>
      <span aria-hidden="true">i</span>
      <div>
        <strong>{t(language, 'Local record preview · no server upload', 'स्थानीय रिकॉर्ड प्रीव्यू · कोई सर्वर अपलोड नहीं')}</strong>
        <p>{t(language, 'Selected records remain browser-local and answers remain in this app tab. They are not uploaded to a server or sent to an AI model, authority, bank, or toll operator. Opening a PDF creates another browser-local tab that Quick exit cannot close; close it yourself. The hosting provider still receives ordinary page-request metadata.', 'चुने रिकॉर्ड ब्राउज़र में स्थानीय रहते हैं और उत्तर इस ऐप टैब में रहते हैं। वे सर्वर पर अपलोड या AI मॉडल, प्राधिकरण, बैंक अथवा टोल ऑपरेटर को नहीं भेजे जाते। PDF खोलने पर दूसरा ब्राउज़र-स्थानीय टैब बनता है जिसे तुरंत बाहर निकलना बंद नहीं कर सकता; उसे स्वयं बंद करें। होस्टिंग प्रदाता को फिर भी सामान्य पेज-अनुरोध मेटाडेटा मिलता है।')}</p>
        {children}
      </div>
    </aside>
  );
}

export { styles as publicBetaStyles };
