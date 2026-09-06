import type { MobilityCase } from '../../lib/mobility/cases';
import { getService } from '../../lib/mobility/services';

/** Show the personal content included in a case upload, including uncertain facts. */
export default function CaseAccountPreview({ item, language }: { item: MobilityCase; language: 'en' | 'hi' }) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const service = getService(item.service);
  const date = (value: string) => new Date(value).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN');
  const statuses = {
    preparing: t('Preparing', 'तैयारी'), ready: t('Ready for my next step', 'मेरे अगले कदम के लिए तैयार'),
    'awaiting-response': t('Awaiting a response', 'जवाब का इंतज़ार'), 'needs-attention': t('Needs my attention', 'मेरे ध्यान की ज़रूरत'),
    completed: t('Completed — reported by me', 'पूरा — मेरे अनुसार'),
  };
  return <div>
    <p>{service.title[language]} · {statuses[item.status]}</p>
    {item.jurisdiction && <p>{t('State or territory', 'राज्य या क्षेत्र')}: {item.jurisdiction}</p>}
    <h3>{t('Details and where they came from', 'विवरण और उनके स्रोत')}</h3>
    <ul>{item.facts.map(fact => <li key={fact.key}>
      <strong>{fact.label}:</strong> {fact.value} — {fact.confirmed ? t('checked by you', 'आपके द्वारा जाँचा') : t('still needs checking', 'अभी जाँच ज़रूरी')}
      {' · '}{fact.source === 'document' ? t('document', 'दस्तावेज़') : fact.source === 'profile' ? t('saved profile', 'सहेजी प्रोफ़ाइल') : t('entered by you', 'आपके द्वारा दर्ज')}
      {fact.page ? ` · ${t('page', 'पृष्ठ')} ${fact.page}` : ''}
      {fact.sourceId && <p>{t('Source reference', 'स्रोत संदर्भ')}: <code style={{ overflowWrap: 'anywhere' }}>{fact.sourceId}</code></p>}
      {fact.sourceFingerprint && <p>{t('File fingerprint (SHA-256)', 'फ़ाइल फ़िंगरप्रिंट (SHA-256)')}: <code style={{ overflowWrap: 'anywhere' }}>{fact.sourceFingerprint}</code></p>}
    </li>)}</ul>
    <p>{t('Source references are saved with these details; original files are not uploaded.', 'इन विवरणों के साथ स्रोत संदर्भ सहेजे जाते हैं; मूल फ़ाइलें अपलोड नहीं होतीं।')}</p>
    {item.draft && <><h3>{t('Your request', 'आपका अनुरोध')}</h3><pre>{item.draft}</pre></>}
    {item.reference && <p>{t('Reference entered by you', 'आपके द्वारा दर्ज संदर्भ')}: {item.reference}</p>}
    {item.followUpDate && <p>{t('Your follow-up date', 'आपकी फ़ॉलो-अप तारीख')}: {item.followUpDate}</p>}
    {item.appointment && <><h3>{t('Appointment entered by you', 'आपके द्वारा दर्ज अपॉइंटमेंट')}</h3><p>{date(item.appointment.at)} · {item.appointment.venue}</p><pre>{item.appointment.instructions}</pre></>}
    {item.completedSteps.length > 0 && <><h3>{t('Steps marked done by you', 'आपके अनुसार पूरे कदम')}</h3><ul>{item.completedSteps.map(id => <li key={id}>{service.steps.find(step => step.id === id)?.title[language] ?? id}</li>)}</ul></>}
    <h3>{t('Case timeline', 'मामले की समयरेखा')}</h3>
    <ol>{item.events.map(event => <li key={event.id}>{date(event.at)} — {event.text} ({event.basis === 'citizen-reported' ? t('reported by you', 'आपके अनुसार') : t('local preparation', 'स्थानीय तैयारी')})</li>)}</ol>
    <p>{t('Created', 'बनाया')}: {date(item.createdAt)} · {t('Last edited', 'आखिरी बदलाव')}: {date(item.updatedAt)}</p>
  </div>;
}
