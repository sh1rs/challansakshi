'use client';
import { useCallback, useState } from 'react';
import type { Language } from '../../lib/domain';
import { inspectNotice, type NoticePreflightResult, type NoticeSignal } from '../../lib/notice-safety';
import { OFFICIAL_FALLBACK_ROUTE } from '../../lib/official-destinations';
import { PublicBetaShell, publicBetaStyles as styles } from './PublicBetaShell';
import { useClientReady } from '../shared/useClientReady';
import { useUtilityPrivacy } from './ReplyReviewPrivacy';
import local from './MessageSafetyCheck.module.css';

const signalCopy: Record<NoticeSignal, [string, string]> = {
  'apk-or-executable': ['An app or executable file is mentioned. Do not install it from the message.', 'ऐप या चलाने योग्य फ़ाइल का उल्लेख है। संदेश से इसे इंस्टॉल न करें।'],
  'shortened-link': ['A shortened link hides its destination.', 'छोटा लिंक अपना गंतव्य छिपाता है।'],
  'lookalike-domain': ['A domain uses transport-related words but is not the exact national e-Challan host.', 'डोमेन में परिवहन से जुड़े शब्द हैं, पर यह सटीक राष्ट्रीय ई-चालान होस्ट नहीं है।'],
  'off-domain-link': ['A detected domain differs from the national e-Challan host. Other legitimate services also use different domains; verify independently.', 'मिला डोमेन राष्ट्रीय ई-चालान होस्ट से अलग है। अन्य वैध सेवाओं के डोमेन भी अलग हो सकते हैं; स्वतंत्र जाँच करें।'],
  'credential-request': ['OTP, password or payment credentials are mentioned. Do not share them with a sender.', 'OTP, पासवर्ड या भुगतान विवरण का उल्लेख है। इन्हें भेजने वाले के साथ साझा न करें।'],
  'remote-access-request': ['Remote access or screen sharing is mentioned. Do not grant access from a message.', 'रिमोट एक्सेस या स्क्रीन शेयर का उल्लेख है। संदेश के आधार पर एक्सेस न दें।'],
  'personal-payment-request': ['A personal transfer or wallet is mentioned. Verify any payment through the official service.', 'निजी खाते या वॉलेट में भुगतान का उल्लेख है। भुगतान आधिकारिक सेवा पर जाँचें।'],
  'urgency-language': ['Urgency or blocking language may pressure you to act before checking.', 'तुरंत कार्रवाई या ब्लॉक करने की भाषा जाँच से पहले दबाव डाल सकती है।'],
  'official-domain': ['The exact national e-Challan HTTPS host appears in the text. This does not authenticate the message, sender or destination page.', 'पाठ में सटीक राष्ट्रीय ई-चालान HTTPS होस्ट है। इससे संदेश, भेजने वाला या पेज प्रमाणित नहीं होता।'],
  'insecure-link': ['A link uses HTTP or has no explicit HTTPS scheme.', 'एक लिंक HTTP उपयोग करता है या उसमें स्पष्ट HTTPS नहीं है।'],
  'unexpected-port': ['A link uses an unusual port.', 'लिंक में असामान्य पोर्ट है।'],
  'embedded-credentials': ['A link contains user information before the host. This can disguise the actual destination.', 'लिंक के होस्ट से पहले उपयोगकर्ता जानकारी है। इससे वास्तविक गंतव्य छिप सकता है।'],
  'punycode-domain': ['An internationalized domain needs careful checking for lookalike characters.', 'अंतरराष्ट्रीयकृत डोमेन में मिलते-जुलते अक्षरों की सावधानी से जाँच करें।'],
};

export default function MessageSafetyCheck() {
  const clientReady = useClientReady();
  const [language, setLanguage] = useState<Language>('en');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<NoticePreflightResult | null>(null);
  const clear = useCallback(() => { setMessage(''); setResult(null); }, []);
  useUtilityPrivacy(clear);
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const exit = () => { clear(); window.location.replace('/'); };
  return <PublicBetaShell language={language} setLanguage={setLanguage} service="Message check" serviceHindi="संदेश जाँच" onQuickExit={exit}>
    <main id="main-content" className={styles.main} tabIndex={-1}>
      <fieldset disabled={!clientReady} className={local.workspace} aria-label={t("Message check", "संदेश जाँच")} >
        <header className={local.intro}>
          <span className={styles.eyebrow}>{t('Before you tap', 'लिंक खोलने से पहले')}</span>
          <h1>{t('A challan message feels wrong?', 'चालान का संदेश संदिग्ध लगा?')}</h1>
          <p>{t('Paste the message to check for common warning signs. Links stay unopened. Your text stays in this page and is cleared on exit or after 10 minutes of inactivity.', 'सामान्य चेतावनी संकेत जाँचने के लिए संदेश पेस्ट करें। लिंक नहीं खुलेंगे। पाठ इसी पेज में रहता है और बाहर जाने या 10 मिनट निष्क्रिय रहने पर साफ़ हो जाता है।')}</p>
        </header>
        <section className={styles.panel} aria-label={t('Message to check', 'जाँचने वाला संदेश')}>
          <div className={local.field}>
            <label htmlFor="message-body">{t('Paste the SMS or message', 'SMS या संदेश पेस्ट करें')}</label>
            <textarea id="message-body" rows={7} maxLength={6000} autoComplete="off" spellCheck={false} value={message} onChange={event => { setMessage(event.target.value); setResult(null); }} aria-describedby="message-privacy" />
            <p id="message-privacy" className={local.hint}>{t('Remove personal details you do not need checked. No upload, account or saved history.', 'अनावश्यक निजी विवरण हटा दें। कोई अपलोड, खाता या सहेजा इतिहास नहीं।')} {message.length}/6000</p>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.buttonSecondary} onClick={clear}>{t('Clear message', 'संदेश साफ़ करें')}</button>
            <button type="button" className={styles.button} disabled={!message.trim()} onClick={() => setResult(inspectNotice(message))}>{t('Check message', 'संदेश जाँचें')}</button>
          </div>
        </section>
        <div aria-live="polite" aria-atomic="false">
          {result && <section data-message-result className={`${styles.panel} ${local.results}`} aria-labelledby="message-result-title">
            <div className={styles.resultHero} data-tone={result.risk === 'pause-and-verify' ? 'stop' : 'warn'}>
              <span className={styles.resultIcon} aria-hidden="true">!</span><div>
                <h2 id="message-result-title">{result.risk === 'pause-and-verify' ? t('Pause and verify', 'रुकें और जाँचें') : result.risk === 'caution' ? t('Verify through an official route', 'आधिकारिक रास्ते से जाँचें') : t('No obvious indicator in this text', 'इस पाठ में स्पष्ट संकेत नहीं मिला')}</h2>
                <p>{t('This is a limited text check. It cannot confirm a genuine sender, a safe link or a real challan. A message can include an official link and still be misleading.', 'यह सीमित पाठ जाँच है। यह असली भेजने वाले, सुरक्षित लिंक या वास्तविक चालान की पुष्टि नहीं कर सकती। आधिकारिक लिंक वाला संदेश भी भ्रामक हो सकता है।')}</p>
              </div>
            </div>
            {result.signals.length > 0 && <ul className={local.signals}>{result.signals.map(signal => <li key={signal}>{signalCopy[signal][language === 'hi' ? 1 : 0]}</li>)}</ul>}
            {result.hosts.length > 0 && <><h3>{t('Detected domains — text only', 'मिले डोमेन — केवल पाठ')}</h3><ul className={local.hosts}>{result.hosts.map(host => <li key={host}><code>{host}</code></li>)}</ul></>}
          </section>}
        </div>
        <section className={`${styles.panel} ${local.results}`}>
          <h2 className={styles.decisionHeading}>{t('Check the record independently', 'रिकॉर्ड स्वतंत्र रूप से जाँचें')}</h2>
          <p className={local.hint}>{t('Use the sources directory to check the current official route. It is separate from anything you pasted.', 'वर्तमान आधिकारिक रास्ता जाँचने के लिए स्रोत निर्देशिका उपयोग करें। यह पेस्ट किए गए पाठ से अलग है।')}</p>
          <a className={styles.officialRouteLink} href="/sources">{t('Find the current official e-Challan route', 'वर्तमान आधिकारिक ई-चालान रास्ता खोजें')}</a>
          <p className={local.hint}><code>{OFFICIAL_FALLBACK_ROUTE.domain}</code></p>
        </section>
      </fieldset>
    </main>
  </PublicBetaShell>;
}
