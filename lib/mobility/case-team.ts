import { sha256Hex } from '../local-sha256';
import { validateCase, type CaseFact, type MobilityCase } from './cases';
import { getService } from './services';

export type CaseTeamLanguage = 'en' | 'hi';
export type CaseTeamRole = 'evidence' | 'planner' | 'consistency' | 'coach';
export type CaseTeamSeverity = 'attention' | 'uncertain' | 'info';
export type CaseTeamSource = {
  key: string;
  kind: 'fact' | 'case' | 'official';
  label: string;
  sourceId?: string;
  page?: number;
  url?: string;
};
export type CaseTeamFinding = {
  code: string;
  severity: CaseTeamSeverity;
  title: string;
  detail: string;
  sourceKeys: string[];
  inputFingerprint: string;
};
export type CaseTeamNextAction = { kind: 'question' | 'step'; text: string; sourceKeys: string[] };
export type CaseTeamRoleOutput = {
  role: CaseTeamRole;
  inputFingerprint: string;
  findings: CaseTeamFinding[];
  nextAction?: CaseTeamNextAction;
};
export type CaseTeamRoleResult = CaseTeamRoleOutput & {
  status: 'pending' | 'running' | 'complete' | 'failed' | 'cancelled';
  error?: string;
};
export type CaseTeamResult = {
  mode: 'on-device';
  inputFingerprint: string;
  status: 'running' | 'complete' | 'partial' | 'cancelled';
  sources: CaseTeamSource[];
  roles: CaseTeamRoleResult[];
  findings: CaseTeamFinding[];
  nextAction?: CaseTeamNextAction;
};
export type CaseTeamRoleContext = {
  role: CaseTeamRole;
  /** A detached, deeply frozen case. No role may edit the user's case. */
  caseValue: MobilityCase;
  language: CaseTeamLanguage;
  inputFingerprint: string;
  sources: readonly CaseTeamSource[];
  previousRoles: readonly CaseTeamRoleResult[];
  signal: AbortSignal;
};
/** Runners must return source-linked observations for this input only. Network/model advice belongs in a separate, explicitly consented advisor. */
export type CaseTeamRunner = (context: CaseTeamRoleContext) => Promise<CaseTeamRoleOutput>;
export type CaseTeamOptions = {
  language?: CaseTeamLanguage;
  signal?: AbortSignal;
  onProgress?: (progress: CaseTeamResult) => void;
  runners?: Partial<Record<CaseTeamRole, CaseTeamRunner>>;
};

export const CASE_TEAM_ROLES: readonly CaseTeamRole[] = ['evidence', 'planner', 'consistency', 'coach'];

function copy(language: CaseTeamLanguage, en: string, hi: string): string { return language === 'hi' ? hi : en; }
function checkLanguage(language: unknown): asserts language is CaseTeamLanguage {
  if (language !== 'en' && language !== 'hi') throw new TypeError('Case team language must be en or hi.');
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical((value as Record<string, unknown>)[key])]));
  return value;
}
function validatedSnapshot(value: unknown): MobilityCase {
  const checked = validateCase(value);
  for (const items of [checked.facts, checked.events, checked.completedSteps]) {
    if ([...items].some(item => item === undefined || item === null)) throw new TypeError('Case arrays must not contain missing entries.');
  }
  return checked;
}

/** Binds all accepted input fields and language, including unsaved edits. This is a local stale-result check, not document authentication. */
export function fingerprintCaseTeamInput(caseValue: unknown, language: CaseTeamLanguage = 'en'): string {
  validatedSnapshot(caseValue);
  checkLanguage(language);
  return sha256Hex(JSON.stringify({ version: 'case-team-v1', language, caseValue: canonical(caseValue) }));
}

function sourcesFor(caseValue: MobilityCase, language: CaseTeamLanguage): CaseTeamSource[] {
  const service = getService(caseValue.service);
  return [
    { key: 'case:facts', kind: 'case', label: copy(language, 'Supplied case details', 'केस में दिए विवरण') },
    { key: 'case:draft', kind: 'case', label: copy(language, 'Your current draft', 'आपका वर्तमान मसौदा') },
    { key: 'case:jurisdiction', kind: 'case', label: copy(language, 'Your selected authority or state', 'आपका चुना प्राधिकरण या राज्य') },
    { key: 'case:progress', kind: 'case', label: copy(language, 'Your recorded progress', 'आपकी दर्ज प्रगति') },
    { key: 'case:service', kind: 'case', label: service.title[language] },
    { key: `official:${caseValue.service}`, kind: 'official', label: service.sourceLabel, url: service.sourceUrl },
    ...caseValue.facts.map(fact => ({ key: `fact:${fact.key}`, kind: 'fact' as const, label: fact.label, ...(fact.sourceId ? { sourceId: fact.sourceId } : {}), ...(fact.page ? { page: fact.page } : {}) })),
  ];
}

function finding(context: CaseTeamRoleContext, code: string, severity: CaseTeamSeverity, title: string, detail: string, sourceKeys: string[]): CaseTeamFinding {
  return { code, severity, title, detail, sourceKeys, inputFingerprint: context.inputFingerprint };
}

function evidenceFindings(context: CaseTeamRoleContext): CaseTeamFinding[] {
  const { caseValue, language } = context;
  const t = (en: string, hi: string) => copy(language, en, hi);
  const findings: CaseTeamFinding[] = [];
  if (!caseValue.facts.length) findings.push(finding(context, 'no-readings', 'uncertain', t('No document readings to compare', 'तुलना के लिए दस्तावेज़ विवरण नहीं हैं'), t('This case has no structured readings. The service plan is available, but evidence consistency cannot be assessed.', 'इस केस में संरचित विवरण नहीं हैं। सेवा की तैयारी देख सकते हैं, पर साक्ष्य की संगति नहीं जाँची जा सकती।'), ['case:facts']));
  for (const fact of caseValue.facts) {
    const keys = [`fact:${fact.key}`];
    if (!fact.value.trim()) findings.push(finding(context, 'empty-reading', 'uncertain', t(`${fact.label}: no reading`, `${fact.label}: विवरण खाली है`), t('Return to the original record. An empty value is not evidence and should not be confirmed.', 'मूल रिकॉर्ड देखें। खाली विवरण साक्ष्य नहीं है और उसकी पुष्टि नहीं की जानी चाहिए।'), keys));
    else if (!fact.confirmed) findings.push(finding(context, 'unconfirmed-reading', 'uncertain', t(`${fact.label}: check the reading`, `${fact.label}: विवरण जाँचें`), t('You have not confirmed this reading. Compare it with the original before using it in a request.', 'आपने इस विवरण की पुष्टि नहीं की है। अनुरोध में उपयोग करने से पहले मूल रिकॉर्ड से मिलाएँ।'), keys));
    if (fact.source === 'document' && !fact.sourceId) findings.push(finding(context, 'missing-source', 'uncertain', t(`${fact.label}: source not linked`, `${fact.label}: स्रोत जुड़ा नहीं है`), t('This document reading has no source identifier. Locate the original record; confirmation alone does not establish its provenance.', 'इस दस्तावेज़ विवरण के साथ स्रोत पहचान नहीं है। मूल रिकॉर्ड खोजें; केवल पुष्टि से उसका स्रोत सिद्ध नहीं होता।'), keys));
  }
  const personalFacts = caseValue.facts.filter(fact => fact.source !== 'document');
  if (personalFacts.length) findings.push(finding(context, 'citizen-provenance', 'info', t('Some details come from you or your profile', 'कुछ विवरण आपने या आपकी प्रोफ़ाइल ने दिए हैं'), t('These are supplied details, not independently checked official records. Recheck reused values against the relevant original.', 'ये दिए गए विवरण हैं, स्वतंत्र रूप से जाँचे आधिकारिक रिकॉर्ड नहीं। दोबारा उपयोग किए विवरण संबंधित मूल रिकॉर्ड से मिलाएँ।'), personalFacts.map(fact => `fact:${fact.key}`)));
  if (caseValue.facts.length) findings.push(finding(context, 'evidence-boundary', 'info', t('Sources remain with you', 'मूल स्रोत आपके पास रहते हैं'), t('These on-device checks review saved readings and source labels. They do not reopen original documents or authenticate them; citizen confirmation is not an official verification.', 'ये डिवाइस पर जाँचें सहेजे विवरण और स्रोत लेबल देखती हैं। ये मूल दस्तावेज़ दोबारा नहीं खोलतीं या प्रमाणित नहीं करतीं; नागरिक की पुष्टि आधिकारिक सत्यापन नहीं है।'), ['case:facts']));
  return findings;
}

function plannerFindings(context: CaseTeamRoleContext): CaseTeamFinding[] {
  const { caseValue, language } = context;
  const t = (en: string, hi: string) => copy(language, en, hi);
  const service = getService(caseValue.service);
  const sourceKeys = ['case:service', `official:${caseValue.service}`];
  const next = service.steps.find(step => !caseValue.completedSteps.includes(step.id));
  const findings = [finding(context, 'service-plan', 'info', service.title[language], next ? `${next.title[language]}. ${next.detail[language]}` : t('You marked all preparation steps complete. Retain the actual acknowledgement and check any next instruction on the official service.', 'आपने तैयारी के सभी चरण पूरे चिह्नित किए हैं। वास्तविक पावती रखें और आधिकारिक सेवा पर अगला निर्देश देखें।'), sourceKeys)];
  if (!caseValue.jurisdiction) findings.push(finding(context, 'jurisdiction-needed', 'uncertain', t('Authority or state still needs checking', 'प्राधिकरण या राज्य अभी जाँचना है'), t('Read the issuing authority or relevant state from the original record and official instructions. A vehicle registration prefix does not identify the issuing authority.', 'मूल रिकॉर्ड और आधिकारिक निर्देश में जारी करने वाला प्राधिकरण या संबंधित राज्य देखें। वाहन नंबर का शुरुआती हिस्सा जारीकर्ता तय नहीं करता।'), ['case:jurisdiction', `official:${caseValue.service}`]));
  if (caseValue.status !== 'preparing' || caseValue.reference || caseValue.completedSteps.length) findings.push(finding(context, 'citizen-progress', 'info', t('Progress is recorded by you', 'यह प्रगति आपने दर्ज की है'), t('A completed preparation step, saved reference or reported outcome is not an independently checked official status. This check makes no official transaction.', 'पूरी तैयारी, सहेजा संदर्भ या बताया परिणाम स्वतंत्र रूप से जाँची आधिकारिक स्थिति नहीं है। यह जाँच कोई आधिकारिक लेन-देन नहीं करती।'), ['case:progress']));
  return findings;
}

const registrationKey = /(?:^|[._-])(?:registration(?:[._-]number)?|vehicle[._-]number|plate)(?:$|[._-])/i;
const normaliseRegistration = (value: string) => value.toUpperCase().replace(/[\s-]/g, '');
/** Deliberately narrow recognition: unknown formats remain uncertain, never a mismatch conclusion. */
const validRegistration = (value: string) => /^(?:[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2})$/.test(normaliseRegistration(value));
function readableRegistration(fact: CaseFact): boolean {
  return fact.confirmed && validRegistration(fact.value) && (fact.source !== 'document' || Boolean(fact.sourceId));
}
function draftRegistrations(draft: string): string[] {
  return [...draft.toUpperCase().matchAll(/\b(?:[A-Z]{2}[ -]?[0-9]{1,2}[ -]?[A-Z]{1,3}[ -]?[0-9]{4}|[0-9]{2}[ -]?BH[ -]?[0-9]{4}[ -]?[A-Z]{1,2})\b/g)].map(match => normaliseRegistration(match[0]));
}

function consistencyFindings(context: CaseTeamRoleContext): CaseTeamFinding[] {
  const { caseValue, language } = context;
  const t = (en: string, hi: string) => copy(language, en, hi);
  const registrations = caseValue.facts.filter(fact => registrationKey.test(fact.key));
  const checked = registrations.filter(readableRegistration);
  const uncertain = registrations.filter(fact => !readableRegistration(fact));
  const findings: CaseTeamFinding[] = [];
  if (uncertain.length) findings.push(finding(context, 'registration-uncertain', 'uncertain', t('Registration comparison is limited', 'पंजीकरण की तुलना सीमित है'), t('At least one registration is unconfirmed, has no linked document source, or uses a format this check cannot read safely. Check the original; no mismatch conclusion uses those readings.', 'कम से कम एक पंजीकरण अपुष्ट है, उसका दस्तावेज़ स्रोत नहीं जुड़ा, या उसका प्रारूप इस जाँच में स्पष्ट नहीं है। मूल रिकॉर्ड देखें; ऐसे विवरण से अंतर का निष्कर्ष नहीं निकाला जाता।'), uncertain.map(fact => `fact:${fact.key}`)));
  const values = new Set(checked.map(fact => normaliseRegistration(fact.value)));
  if (values.size > 1) findings.push(finding(context, 'registration-conflict', 'attention', t('Registrations read differently', 'पंजीकरण अलग पढ़े गए हैं'), t('Confirmed supplied readings contain different registrations. Check which record describes which vehicle. This does not establish an error in the official record, independent evidence, or grounds for cancellation.', 'पुष्टि किए गए विवरणों में अलग पंजीकरण हैं। देखें कौन सा रिकॉर्ड किस वाहन का है। इससे आधिकारिक रिकॉर्ड में गलती, स्वतंत्र साक्ष्य या रद्द करने का आधार सिद्ध नहीं होता।'), checked.map(fact => `fact:${fact.key}`)));
  const draftValues = draftRegistrations(caseValue.draft);
  if (values.size && draftValues.some(value => !values.has(value))) findings.push(finding(context, 'draft-registration-review', 'uncertain', t('Review a registration in the draft', 'मसौदे का पंजीकरण जाँचें'), t('The draft mentions a registration not present in the confirmed supplied readings. It may be an intentional quote or an old value. Review its context before using the draft.', 'मसौदे में ऐसा पंजीकरण है जो पुष्टि किए विवरणों में नहीं है। यह जानबूझकर दिया उद्धरण या पुराना विवरण हो सकता है। मसौदा उपयोग करने से पहले संदर्भ जाँचें।'), ['case:draft', ...checked.map(fact => `fact:${fact.key}`)]));
  const statesMatch = /(?:registrations?|numbers?)\s+match\b|पंजीकरण मेल खाते हैं/i.test(caseValue.draft);
  const statesDiffer = /(?:registrations?.{0,80}(?:read differently|do not match|are different))|पंजीकरण अलग पढ़े गए हैं/i.test(caseValue.draft);
  if ((values.size > 1 && statesMatch) || (checked.length >= 2 && values.size === 1 && statesDiffer)) findings.push(finding(context, 'draft-comparison-review', 'attention', t('The comparison wording needs review', 'तुलना के शब्दों की समीक्षा करें'), t('A direct comparison statement in the draft differs from the current confirmed readings. It could be a quotation; review the wording against the originals before using it.', 'मसौदे में तुलना का सीधा कथन वर्तमान पुष्टि किए विवरणों से अलग है। यह उद्धरण भी हो सकता है; उपयोग से पहले मूल रिकॉर्ड से शब्द मिलाएँ।'), ['case:draft', ...checked.map(fact => `fact:${fact.key}`)]));
  if (!findings.length && checked.length < 2 && !(checked.length && draftValues.length)) findings.push(finding(context, 'comparison-unavailable', 'info', t('No registration comparison available', 'पंजीकरण की तुलना उपलब्ध नहीं है'), t('There are not enough readable registration details to compare. If a registration comparison matters for your task, review the relevant original records first.', 'तुलना के लिए पर्याप्त स्पष्ट पंजीकरण विवरण नहीं हैं। आपके काम में पंजीकरण की तुलना ज़रूरी हो तो पहले संबंधित मूल रिकॉर्ड जाँचें।'), ['case:facts', 'case:draft']));
  if (!findings.length) findings.push(finding(context, 'consistency-scope', 'info', t('No difference found by these limited checks', 'इन सीमित जाँचों में अंतर नहीं मिला'), t('The check compares readable registration fields and explicit registration wording in the draft. It cannot establish document authenticity, legal correctness, or an official outcome.', 'यह जाँच स्पष्ट पंजीकरण विवरण और मसौदे में सीधे लिखे पंजीकरण की तुलना करती है। इससे दस्तावेज़ की प्रामाणिकता, कानूनी शुद्धता या आधिकारिक परिणाम सिद्ध नहीं होता।'), ['case:facts', 'case:draft']));
  return findings;
}

function coachAction(context: CaseTeamRoleContext): CaseTeamNextAction {
  const { caseValue, language, previousRoles } = context;
  const t = (en: string, hi: string) => copy(language, en, hi);
  if (previousRoles.some(role => role.status !== 'complete')) return { kind: 'step', text: t('One or more checks did not finish. Review the available findings and retry before relying on the combined check.', 'एक या अधिक जाँचें पूरी नहीं हुईं। उपलब्ध निष्कर्ष देखें और संयुक्त जाँच पर निर्भर होने से पहले फिर कोशिश करें।'), sourceKeys: ['case:facts', 'case:draft'] };
  const findings = previousRoles.flatMap(role => role.findings);
  const conflict = findings.find(item => item.code === 'registration-conflict');
  if (conflict) return { kind: 'question', text: t('Which original record supports the registration you want to use in this request?', 'इस अनुरोध में उपयोग किए जाने वाले पंजीकरण का मूल रिकॉर्ड कौन सा है?'), sourceKeys: conflict.sourceKeys };
  const draftProblem = findings.find(item => item.code === 'draft-comparison-review' || item.code === 'draft-registration-review');
  if (draftProblem) return { kind: 'step', text: t('Review the highlighted draft wording against your original records, then run this check again after editing.', 'चिह्नित मसौदे के शब्द मूल रिकॉर्ड से मिलाएँ और बदलाव के बाद फिर जाँचें।'), sourceKeys: draftProblem.sourceKeys };
  const uncertain = caseValue.facts.find(fact => !fact.confirmed || !fact.value.trim() || (fact.source === 'document' && !fact.sourceId));
  if (uncertain) return { kind: 'question', text: t(`Can you check “${uncertain.label.replace(/[?？]/g, '')}” against its original record?`, `क्या आप “${uncertain.label.replace(/[?？]/g, '')}” को मूल रिकॉर्ड से जाँच सकते हैं?`), sourceKeys: [`fact:${uncertain.key}`] };
  const unknownRegistration = findings.find(item => item.code === 'registration-uncertain');
  if (unknownRegistration) return { kind: 'step', text: t('Check the registration format against the original. These limited rules cannot compare it safely.', 'पंजीकरण का प्रारूप मूल रिकॉर्ड से जाँचें। ये सीमित नियम इसकी सुरक्षित तुलना नहीं कर सकते।'), sourceKeys: unknownRegistration.sourceKeys };
  if (!caseValue.jurisdiction) return { kind: 'question', text: t('Which authority or state is named in your original record or relevant official service?', 'आपके मूल रिकॉर्ड या संबंधित आधिकारिक सेवा में कौन सा प्राधिकरण या राज्य लिखा है?'), sourceKeys: ['case:jurisdiction', `official:${caseValue.service}`] };
  const service = getService(caseValue.service);
  const next = service.steps.find(step => !caseValue.completedSteps.includes(step.id));
  return { kind: 'step', text: next ? `${next.title[language]}. ${next.detail[language]}` : t('Keep the actual official acknowledgement and any next instruction with your records. Your preparation checklist is marked complete.', 'वास्तविक आधिकारिक पावती और अगले निर्देश अपने रिकॉर्ड में रखें। आपकी तैयारी सूची पूरी चिह्नित है।'), sourceKeys: ['case:progress', `official:${caseValue.service}`] };
}

/** Async role boundary, with no timers, persistence, network calls or simulated work. */
export async function runLocalCaseTeamRole(context: CaseTeamRoleContext): Promise<CaseTeamRoleOutput> {
  const findings = context.role === 'evidence' ? evidenceFindings(context) : context.role === 'planner' ? plannerFindings(context) : context.role === 'consistency' ? consistencyFindings(context) : [];
  return { role: context.role, inputFingerprint: context.inputFingerprint, findings, ...(context.role === 'coach' ? { nextAction: coachAction(context) } : {}) };
}

function checkedText(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value)) throw new TypeError('Invalid role text.');
  return value;
}
function checkedKeys(value: unknown, sources: readonly CaseTeamSource[]): string[] {
  if (!Array.isArray(value) || !value.length || value.length > 110 || [...value].some(key => typeof key !== 'string' || !sources.some(source => source.key === key))) throw new TypeError('Invalid role source.');
  return [...new Set(value as string[])];
}
function checkedOutput(value: CaseTeamRoleOutput, context: CaseTeamRoleContext): CaseTeamRoleOutput {
  if (!value || typeof value !== 'object' || value.role !== context.role || value.inputFingerprint !== context.inputFingerprint || !Array.isArray(value.findings) || value.findings.length > 205) throw new TypeError('Invalid or stale role output.');
  const findings = [...value.findings].map(item => {
    if (!item || typeof item !== 'object' || item.inputFingerprint !== context.inputFingerprint || !['attention', 'uncertain', 'info'].includes(item.severity)) throw new TypeError('Invalid role finding.');
    return { code: checkedText(item.code, 100), severity: item.severity, title: checkedText(item.title, 300), detail: checkedText(item.detail, 3000), sourceKeys: checkedKeys(item.sourceKeys, context.sources), inputFingerprint: context.inputFingerprint };
  });
  let nextAction: CaseTeamNextAction | undefined;
  if (value.nextAction !== undefined) {
    if (context.role !== 'coach' || !value.nextAction || !['question', 'step'].includes(value.nextAction.kind)) throw new TypeError('Invalid coaching action.');
    const text = checkedText(value.nextAction.text, 2000);
    const questions = (text.match(/[?？]/g) ?? []).length;
    if ((value.nextAction.kind === 'question' && questions !== 1) || (value.nextAction.kind === 'step' && questions !== 0)) throw new TypeError('Only one next question is allowed.');
    nextAction = { kind: value.nextAction.kind, text, sourceKeys: checkedKeys(value.nextAction.sourceKeys, context.sources) };
  }
  if (context.role === 'coach' && !nextAction) throw new TypeError('The coach must return one next action.');
  return { role: context.role, inputFingerprint: context.inputFingerprint, findings, ...(nextAction ? { nextAction } : {}) };
}

const CANCELLED = Symbol('case-team-cancelled');
function cancellable<T>(work: Promise<T>, signal: AbortSignal): Promise<T | typeof CANCELLED> {
  return new Promise((resolve, reject) => {
    const abort = () => { signal.removeEventListener('abort', abort); resolve(CANCELLED); };
    signal.addEventListener('abort', abort, { once: true });
    work.then(value => { signal.removeEventListener('abort', abort); resolve(value); }, error => { signal.removeEventListener('abort', abort); reject(error); });
    if (signal.aborted) abort();
  });
}

/** Runs independent checks concurrently, then synthesizes one next action. Cancellation resolves with any useful completed results. */
export async function runCaseTeam(caseValue: unknown, options: CaseTeamOptions = {}): Promise<CaseTeamResult> {
  const language = options.language ?? 'en';
  checkLanguage(language);
  const inputFingerprint = fingerprintCaseTeamInput(caseValue, language);
  const snapshot = freeze(validatedSnapshot(caseValue));
  const sources = freeze(sourcesFor(snapshot, language));
  const signal = options.signal ?? new AbortController().signal;
  const roles: CaseTeamRoleResult[] = CASE_TEAM_ROLES.map(role => ({ role, inputFingerprint, status: 'pending', findings: [] }));
  const result = (status: CaseTeamResult['status']): CaseTeamResult => {
    const outputs = roles.map(role => ({ ...role, findings: [...role.findings] }));
    const nextAction = outputs.find(role => role.role === 'coach' && role.status === 'complete')?.nextAction;
    return freeze({ mode: 'on-device', inputFingerprint, status, sources: [...sources], roles: outputs, findings: outputs.flatMap(role => role.findings), ...(nextAction ? { nextAction } : {}) });
  };
  const publish = () => {
    try { options.onProgress?.(result('running')); } catch { /* An observer cannot cancel or corrupt the coordinator. */ }
  };
  const execute = async (role: CaseTeamRole, previousRoles: readonly CaseTeamRoleResult[] = []) => {
    const index = CASE_TEAM_ROLES.indexOf(role);
    if (signal.aborted) { roles[index] = { ...roles[index], status: 'cancelled' }; publish(); return; }
    roles[index] = { ...roles[index], status: 'running' }; publish();
    const context: CaseTeamRoleContext = Object.freeze({ role, caseValue: snapshot, language, inputFingerprint, sources, previousRoles, signal });
    try {
      const output = await cancellable(Promise.resolve().then<CaseTeamRoleOutput | typeof CANCELLED>(() => {
        if (signal.aborted) return CANCELLED;
        return (options.runners?.[role] ?? runLocalCaseTeamRole)(context);
      }), signal);
      roles[index] = output === CANCELLED || signal.aborted ? { ...roles[index], status: 'cancelled' } : { ...checkedOutput(output, context), status: 'complete' };
    } catch {
      roles[index] = { ...roles[index], status: signal.aborted ? 'cancelled' : 'failed', error: copy(language, 'This check could not finish. Other completed checks remain available.', 'यह जाँच पूरी नहीं हो सकी। बाकी पूरी जाँचें उपलब्ध हैं।') };
    }
    publish();
  };
  await Promise.all(CASE_TEAM_ROLES.filter(role => role !== 'coach').map(role => execute(role)));
  await execute('coach', freeze(roles.filter(role => role.role !== 'coach').map(role => ({ ...role, findings: [...role.findings] }))));
  const final = result(signal.aborted ? 'cancelled' : roles.some(role => role.status === 'failed') ? 'partial' : 'complete');
  try { options.onProgress?.(final); } catch { /* See publish. */ }
  return final;
}
