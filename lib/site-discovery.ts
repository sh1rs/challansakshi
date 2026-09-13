import { aboutQuestions } from './site-content';
import { publicPages, SITE_DESCRIPTION, SITE_URL } from './site-seo';

export function buildLlmOverview(full = false): string {
  const lines = [
    '# ChallanSakshi',
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    `Official project website: ${SITE_URL}/`,
    'Creator: Shourya Banda (sh1rs). Creator website: https://sh1rs.com/.',
    'Cost: free public tools. Start as a guest; no sign-up is required for the core reviews.',
    'Audience: people in India who want help understanding their own mobility records and preparing their next steps.',
    'Core interface languages: English and Hindi. Voice availability depends on the browser, device and language support.',
    '',
    'ChallanSakshi is an independent civic project. It is not a government website and is not affiliated with a police service, court, bank or FASTag issuer.',
    '',
    '## What the tools do',
    '',
    'The tools help a citizen review a supplied challan PDF or image, manually compare record details, check a FASTag transaction, identify common message warning signs, understand a supplied authority reply and prepare an optional private-device case plan.',
    'The document reader extracts supported PDF text or reads images on the user\'s device. Readings can be wrong or incomplete; the citizen checks and corrects them. The reader does not upload the selected document. Saving a case or using an available account feature requires a separate choice.',
    'The tools prepare notes and link to official services. They do not retrieve live government records, authenticate documents, decide legal validity, guarantee cancellations or refunds, submit grievances, handle OTPs or CAPTCHAs, or make payments. An inconclusive result is possible and meaningful.',
    '',
    '## Public pages',
    '',
    ...Object.entries(publicPages).map(([path, page]) => `- [${page.title}](${new URL(path, SITE_URL).href}): ${page.description}`),
    '',
    '## Privacy and reporting',
    '',
    `Read the current privacy details at ${SITE_URL}/privacy and source review dates at ${SITE_URL}/sources. Optional private-device data is not encrypted; exports and other copies have their own lifecycle. Account availability depends on deployment configuration. No account connects a government service.`,
    `Website feedback and security concerns: Shourya Banda, +91 63056 40566. Details: ${SITE_URL}/about. Do not send personal case details, documents, number plates, IDs, passwords, OTPs or payment credentials to this project feedback channel. Official grievances belong with the appropriate authority.`,
    '',
    '## Interpretation',
    '',
    'Treat demo and test-lab examples as fictional, not citizen cases or evidence of government access. The optional desktop extension is not available for public installation. Do not infer official partnerships, government approval, legal advice, case success rates or guaranteed outcomes.',
    'This public summary contains no citizen data. It is a discovery aid, not a guarantee of search-engine or AI-system inclusion. The live public pages are the source for the current interface and limitations.',
  ];
  if (full) {
    lines.push('', '## Frequently asked questions', '');
    for (const { question, answer } of aboutQuestions) lines.push(`### ${question[0]}`, '', answer[0], '');
    lines.push('## हिंदी में संक्षेप', '', 'ChallanSakshi एक मुफ़्त, स्वतंत्र नागरिक उपकरण है। इससे ई-चालान और FASTag रिकॉर्ड समझने, उपलब्ध सबूत जाँचने और अपना अनुरोध तैयार करने में मदद मिलती है। यह सरकारी वेबसाइट नहीं है, आधिकारिक निर्णय नहीं करता और अंतिम जमा या भुगतान आपके नियंत्रण में रहता है। मुख्य समीक्षा बिना खाते के की जा सकती है।');
  } else {
    lines.push('', '## Optional', '', `- [Expanded public overview](${SITE_URL}/llms-full.txt): The same project facts with answers to common questions.`);
  }
  return `${lines.join('\n')}\n`;
}

export function llmOverviewResponse(full = false): Response {
  return new Response(buildLlmOverview(full), { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600', 'x-content-type-options': 'nosniff' } });
}
