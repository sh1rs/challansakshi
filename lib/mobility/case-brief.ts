import { validateCase, type MobilityCase } from './cases';
import { getService } from './services';

export type CaseBriefOptions = { factKeys: string[]; includeDraft: boolean; includeReference: boolean; includeRecentUpdates: boolean };
export function buildCaseBrief(value: MobilityCase, options: CaseBriefOptions, language: 'en' | 'hi' = 'en'): string {
  const item = validateCase(value); const service = getService(item.service); const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  if (!['en', 'hi'].includes(language) || !Array.isArray(options.factKeys) || options.factKeys.length > 10 || new Set(options.factKeys).size !== options.factKeys.length || options.factKeys.some(key => !item.facts.some(fact => fact.key === key)) || [options.includeDraft, options.includeReference, options.includeRecentUpdates].some(value => typeof value !== 'boolean')) throw new Error('Review the selected brief details.');
  const facts = item.facts.filter(fact => options.factKeys.includes(fact.key));
  const status = {
    preparing: t('I am preparing the case.', 'मैं मामले की तैयारी कर रहा/रही हूँ।'),
    ready: t('My preparation is ready for the next step.', 'मेरी तैयारी अगले कदम के लिए तैयार है।'),
    'awaiting-response': t('I reported that I am waiting for a response.', 'मेरी दी जानकारी के अनुसार मैं उत्तर की प्रतीक्षा कर रहा/रही हूँ।'),
    'needs-attention': t('My record says this needs attention.', 'मेरे रिकॉर्ड के अनुसार इस पर ध्यान चाहिए।'),
    completed: t('I reported the task as completed. Check the actual acknowledgement separately.', 'मैंने काम पूरा होने की सूचना दी है। वास्तविक पावती अलग से जाँचें।'),
  }[item.status];
  const next = item.status === 'completed' ? t('Keep the actual acknowledgement and any remaining official instructions.', 'वास्तविक पावती और बाकी आधिकारिक निर्देश सुरक्षित रखें।')
    : item.status === 'awaiting-response' ? t('Check the actual response using the official reference before choosing a follow-up.', 'फ़ॉलो-अप चुनने से पहले आधिकारिक संदर्भ से वास्तविक उत्तर जाँचें।')
      : facts.some(fact => !fact.confirmed) ? t('Compare the uncertain details below with the original evidence.', 'नीचे दिए अनिश्चित विवरण को मूल साक्ष्य से मिलाएँ।')
        : service.steps.find(step => !item.completedSteps.includes(step.id))?.title[language] ?? t('Check the next official step and keep its acknowledgement.', 'अगला आधिकारिक कदम जाँचें और उसकी पावती रखें।');
  const blocks = [t('MY MOBILITY CASE BRIEF', 'मेरे मोबिलिटी मामले का संक्षिप्त विवरण'),
    `${t('What I need help with', 'मुझे किसमें मदद चाहिए')}: ${service.title[language]}`,
    `${t('Where things stand', 'अभी की स्थिति')}: ${status}`,
    `${t('Selected details', 'चुने हुए विवरण')}\n${facts.length ? facts.map(fact => `${fact.label}: ${fact.value || t('No reading', 'विवरण नहीं')} — ${fact.confirmed ? t('confirmed by me', 'मेरे द्वारा पुष्टि') : t('uncertain; needs checking', 'अनिश्चित; जाँच ज़रूरी')} (${fact.source === 'document' ? t('document reading', 'दस्तावेज़ की पढ़ाई') : fact.source === 'profile' ? t('saved reusable detail', 'सहेजा हुआ विवरण') : t('entered by me', 'मेरे द्वारा दर्ज')})`).join('\n') : t('No personal details included.', 'कोई व्यक्तिगत विवरण शामिल नहीं है।')}`,
  ];
  if (options.includeReference && item.reference) blocks.push(`${t('Reference I entered', 'मेरे द्वारा दर्ज संदर्भ')}: ${item.reference}`);
  if (options.includeDraft && item.draft) blocks.push(`${t('My editable preparation draft', 'मेरा संपादन योग्य तैयारी मसौदा')}\n${item.draft}`);
  if (options.includeRecentUpdates) {
    const updates = item.events.filter(event => event.basis === 'citizen-reported').slice(-3);
    blocks.push(`${t('My last three reported updates', 'मेरे अंतिम तीन दर्ज अपडेट')}\n${updates.length ? updates.map(event => `${event.at}: ${event.text}`).join('\n') : t('No reported updates included.', 'कोई दर्ज अपडेट शामिल नहीं है।')}`);
  }
  blocks.push(`${t('Next thing to do', 'अगला काम')}: ${next}`,
    `${t('Official information source', 'आधिकारिक जानकारी का स्रोत')}: ${service.sourceLabel}\n${service.sourceUrl}`,
    t('Prepared locally from the details I selected. This is my preparation note, not an official status, submission, receipt or legal finding. Check the originals and current official instructions.', 'मेरे चुने विवरण से स्थानीय रूप से तैयार। यह मेरा तैयारी नोट है, आधिकारिक स्थिति, आवेदन, रसीद या कानूनी निष्कर्ष नहीं। मूल रिकॉर्ड और वर्तमान आधिकारिक निर्देश जाँचें।'));
  return blocks.join('\n\n');
}

/** Search only the caller's already-loaded cases; no new storage, profile scan or network. */
export function searchMobilityCases(cases: MobilityCase[], query: string): MobilityCase[] {
  const normalise = (text: string) => text.normalize('NFKC').toLocaleLowerCase().replace(/[\s-]+/g, '');
  const needle = normalise(query.slice(0, 160));
  if (!needle) return cases;
  return cases.filter(item => [item.title, item.reference, item.jurisdiction, ...item.facts.map(fact => fact.value)].some(value => normalise(value).includes(needle)));
}
