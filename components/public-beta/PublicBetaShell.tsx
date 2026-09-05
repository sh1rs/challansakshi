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
  preserveScroll = false,
  demo = false,
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
  preserveScroll?: boolean;
  demo?: boolean;
}) {
  return (
    <div
      className={styles.app}
      lang={language}
      data-simple-mode={simpleMode === undefined ? undefined : simpleMode}
      style={preserveScroll ? { overflowAnchor: 'none' } : undefined}
    >
      <CitizenHeader
        language={language}
        setLanguage={setLanguage}
        service={service}
        serviceHindi={serviceHindi}
        englishOnly={englishOnly}
        boundary={demo ? 'demo' : 'real'}
        utilities={<>
          {simpleMode !== undefined && onSimpleModeChange ? <CitizenHeaderButton type="button" aria-pressed={simpleMode} onClick={() => onSimpleModeChange(!simpleMode)}>{t(language, 'Simple mode', 'सरल भाषा')}</CitizenHeaderButton> : null}
        </>}
        quickExit={onQuickExit ? <CitizenHeaderButton type="button" tone="danger" aria-label={t(language, 'Quick exit and clear this review', 'तुरंत बाहर निकलें और यह समीक्षा साफ़ करें')} onClick={onQuickExit}>{t(language, 'Exit', 'बाहर')}</CitizenHeaderButton> : undefined}
      />
      {children}
      <CitizenFooter language={language} service={service} boundary={demo ? 'demo' : 'real'} />
    </div>
  );
}

export { styles as publicBetaStyles };
