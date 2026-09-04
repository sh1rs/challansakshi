import type { ReactNode } from 'react';
import type { Language } from '../../lib/domain';
import { CITIZEN_REVIEW_ANSWER_KEY_BY_ID, type CitizenReviewDecisionQuestionId, type CitizenReviewInputId, type CitizenReviewQuestionPlan } from '../../lib/citizen-review-question-plan';
import { getCitizenReviewAnswers, type CitizenReviewState } from '../../lib/citizen-review-state';
import styles from './CitizenReviewAdaptive.module.css';

type Question = { legend: string; summary: string; options: readonly (readonly [string, string])[] };
const questions: Record<Language, Record<CitizenReviewDecisionQuestionId, Question>> = {
  en: {
    source: { legend: 'Where did you open this challan?', summary: 'Source', options: [
      ['official-service', 'I opened the official service'], ['downloaded-official-record', 'I downloaded this from an official service'], ['message-only', 'I only have an SMS or forwarded link'],
    ] },
    'own-record': { legend: "Can you read your vehicle's RC or another independent vehicle record now?", summary: 'Comparison record', options: [
      ['present', 'Yes, it is open and readable'], ['unclear', 'I have it, but cannot read it clearly'], ['missing', 'I do not have it'],
    ] },
    plate: { legend: 'Compared with that record, what does the plate in the photo shown by the service or record you opened look like?', summary: 'Plate in the photo', options: [
      ['different', 'The plate looks different'], ['match', 'The plate appears to match'], ['not-visible', 'The plate is hidden or too unclear to compare'], ['unavailable', 'I could not open or find the photo in that service or record'],
    ] },
    'vehicle-category': { legend: 'Compared with that record, what vehicle type does that photo show?', summary: 'Vehicle type', options: [
      ['different', 'A different vehicle type from my record'], ['match', 'The same vehicle type as my record'], ['not-visible', 'The vehicle type is not visible'], ['unclear', 'The vehicle type is unclear'],
    ] },
    'offence-visibility': { legend: 'Does the photo show the offence named in the challan?', summary: 'Offence in the photo', options: [
      ['appears-visible', 'It appears visible'], ['not-visible', 'It is not visible'], ['not-assessable-from-still', 'One still photo cannot establish it'], ['unclear', 'I cannot tell clearly'],
    ] },
    timestamp: { legend: 'Can you read the event time in the supplied evidence?', summary: 'Event time', options: [
      ['displayed', 'The time is displayed'], ['unclear', 'The time is unclear'], ['not-found', 'I could not find a time'],
    ] },
    location: { legend: 'Can you read the location in the supplied evidence?', summary: 'Location', options: [
      ['displayed', 'The location is displayed'], ['unclear', 'The location is unclear'], ['not-found', 'I could not find a location'],
    ] },
  },
  hi: {
    source: { legend: 'आपने यह चालान कहाँ खोला?', summary: 'स्रोत', options: [
      ['official-service', 'मैंने आधिकारिक सेवा खोली'], ['downloaded-official-record', 'मैंने इसे आधिकारिक सेवा से डाउनलोड किया'], ['message-only', 'मेरे पास केवल SMS या फ़ॉरवर्ड किया लिंक है'],
    ] },
    'own-record': { legend: 'क्या आप अभी अपने वाहन की RC या कोई अन्य स्वतंत्र वाहन रिकॉर्ड पढ़ सकते हैं?', summary: 'तुलना का रिकॉर्ड', options: [
      ['present', 'हाँ, रिकॉर्ड खुला है और पढ़ने योग्य है'], ['unclear', 'रिकॉर्ड है, पर साफ़ नहीं पढ़ सकता/सकती'], ['missing', 'मेरे पास रिकॉर्ड नहीं है'],
    ] },
    plate: { legend: 'उस रिकॉर्ड से तुलना करने पर, खोली गई सेवा या रिकॉर्ड की तस्वीर में नंबर प्लेट कैसी दिखती है?', summary: 'तस्वीर की नंबर प्लेट', options: [
      ['different', 'नंबर प्लेट अलग दिखती है'], ['match', 'नंबर प्लेट मेल खाती दिखती है'], ['not-visible', 'नंबर प्लेट छिपी है या तुलना के लिए साफ़ नहीं है'], ['unavailable', 'मैं उस सेवा या रिकॉर्ड में तस्वीर खोल या ढूँढ नहीं पाया/पाई'],
    ] },
    'vehicle-category': { legend: 'उस रिकॉर्ड से तुलना करने पर, तस्वीर किस प्रकार का वाहन दिखाती है?', summary: 'वाहन का प्रकार', options: [
      ['different', 'मेरे रिकॉर्ड से अलग प्रकार का वाहन'], ['match', 'मेरे रिकॉर्ड जैसा ही वाहन प्रकार'], ['not-visible', 'वाहन का प्रकार नहीं दिखता'], ['unclear', 'वाहन का प्रकार स्पष्ट नहीं है'],
    ] },
    'offence-visibility': { legend: 'क्या तस्वीर में चालान में लिखा अपराध दिखाई देता है?', summary: 'तस्वीर में अपराध', options: [
      ['appears-visible', 'दिखाई देता लगता है'], ['not-visible', 'दिखाई नहीं देता'], ['not-assessable-from-still', 'एक स्थिर तस्वीर से यह तय नहीं हो सकता'], ['unclear', 'मैं स्पष्ट नहीं बता सकता/सकती'],
    ] },
    timestamp: { legend: 'क्या दिए गए सबूत में घटना का समय पढ़ सकते हैं?', summary: 'घटना का समय', options: [
      ['displayed', 'समय दिखाया गया है'], ['unclear', 'समय स्पष्ट नहीं है'], ['not-found', 'मुझे समय नहीं मिला'],
    ] },
    location: { legend: 'क्या दिए गए सबूत में स्थान पढ़ सकते हैं?', summary: 'स्थान', options: [
      ['displayed', 'स्थान दिखाया गया है'], ['unclear', 'स्थान स्पष्ट नहीं है'], ['not-found', 'मुझे स्थान नहीं मिला'],
    ] },
  },
};

export type CitizenReviewCheckProps = {
  language: Language;
  state: CitizenReviewState;
  plan: CitizenReviewQuestionPlan;
  onAnswer: (id: CitizenReviewInputId, value: string) => void;
  expandedQuestion: CitizenReviewDecisionQuestionId | null;
  onExpand: (id: CitizenReviewDecisionQuestionId) => void;
  errorQuestion?: CitizenReviewDecisionQuestionId;
  children?: ReactNode;
};

export function CitizenReviewCheck({ language, state, plan, onAnswer, expandedQuestion, onExpand, errorQuestion, children }: CitizenReviewCheckProps) {
  const answers = getCitizenReviewAnswers(state);
  return <>
    {plan.visible.map(id => {
      const copy = questions[language][id];
      const answered = state.answeredQuestionIds[id] === true;
      const collapsed = answered && expandedQuestion !== id && errorQuestion !== id;
      const selectedValue = id === 'plate' && answered && !answers.imageInspected
        ? 'unavailable' : answers[CITIZEN_REVIEW_ANSWER_KEY_BY_ID[id]];
      const hasError = errorQuestion === id;
      return <fieldset key={id} id={`review-question-${id}`} className={`${styles.question} ${collapsed ? styles.collapsed : ''}`} aria-describedby={hasError ? `review-question-${id}-error` : undefined} aria-invalid={hasError || undefined}>
        <legend className={styles.legend}>{collapsed ? copy.summary : copy.legend}</legend>
        <div className={styles.options}>
          {copy.options.map(([value, label]) => {
            const selected = answered && selectedValue === value;
            const hidden = collapsed && !selected;
            return <label data-required-action key={value} htmlFor={`review-${id}-${value}`} className={styles.option} hidden={hidden}>
              <input id={`review-${id}-${value}`} name={`review-${id}`} type="radio" value={value} checked={selected} disabled={hidden} tabIndex={hidden ? -1 : undefined} onChange={() => onAnswer(id, value)} />
              <span>{label}</span>
            </label>;
          })}
          {collapsed && <button data-required-action type="button" className={styles.change} onClick={() => onExpand(id)} aria-label={`${language === 'hi' ? 'बदलें' : 'Change'}: ${copy.summary}`}>{language === 'hi' ? 'बदलें' : 'Change'}</button>}
        </div>
        {hasError && <p id={`review-question-${id}-error`} className={styles.error}>{language === 'hi' ? 'आगे बढ़ने के लिए एक उत्तर चुनें।' : 'Choose an answer to continue.'}</p>}
      </fieldset>;
    })}
    <span className={styles.announcement} role="status" aria-live="polite">{plan.missing[0] ? questions[language][plan.missing[0]].legend : ''}</span>
    {children}
  </>;
}
