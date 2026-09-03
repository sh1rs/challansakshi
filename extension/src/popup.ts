// Consent-first popup. Every fresh popup heap starts at the packaged static
// disclosure and performs zero Chrome work before a local Continue. The only
// Chrome authority afterwards is one active-tab query for page-bound commands
// plus one closed runtime message per explicit action. Persistence, scripting,
// alarms, and every other surface belong to the worker.
import {
  buildAcknowledgeAffectedPersonInspectionRequest,
  buildClearStagedFieldsRequest,
  buildFillEmptyReviewedFieldsRequest,
  buildLoadReviewedFieldsRequest,
  buildPreviewCurrentPageRequest,
  buildResetForDeviceOwnerRequest,
  DEVICE_OWNER_RESET_ATTESTATION_SCHEMA,
  validateWorkerResponseForCommand,
} from './message-contract';
import type {
  DestinationPreviewDtoV1,
  SourcePreviewBindingWireV1,
  SourcePreviewDtoV1,
  WarningWireV1,
  WorkerCommand,
  WorkerRequestV1,
  WorkerResponseV1,
} from './message-contract';

declare const __CHALLANSAKSHI_EXTENSION_VISIBLE_ENVIRONMENT_LABEL__: string;

type Language = 'en' | 'hi';
type Bilingual = Readonly<{ en: string; hi: string }>;

const COPY = Object.freeze({
  statusUpdated: 'View updated · दृश्य अपडेट हुआ',
  independencePre: Object.freeze({
    en: 'The extension will not click or call Submit',
    hi: 'एक्सटेंशन Submit पर क्लिक नहीं करेगा और न ही Submit को कॉल करेगा',
  }),
  independencePost: Object.freeze({
    en: 'The extension did not click or call Submit',
    hi: 'एक्सटेंशन ने Submit पर क्लिक नहीं किया और न ही Submit को कॉल किया',
  }),
  untouched: Object.freeze({
    en: 'Untouched: challan number, CAPTCHA, OTP, Aadhaar, payment, attachment, declaration, Submit',
    hi: 'इनको नहीं छुआ जाएगा: चालान नंबर, CAPTCHA, OTP, Aadhaar, भुगतान, अटैचमेंट, घोषणा, Submit',
  }),
  fallback: Object.freeze({
    en: 'Use the assisted-copy steps already shown on ChallanSakshi. This popup does not open a website or copy to the clipboard.',
    hi: 'ChallanSakshi पर पहले से दिखाए गए सहायक-कॉपी चरणों का उपयोग करें। यह पॉपअप कोई वेबसाइट नहीं खोलता और क्लिपबोर्ड पर कॉपी नहीं करता।',
  }),
  affectedPerson: Object.freeze({
    en: 'The affected person must inspect these fields and independently authenticate, declare, and submit',
    hi: 'प्रभावित व्यक्ति को इन फ़ील्डों की जाँच करनी होगी और स्वयं प्रमाणीकरण, घोषणा और सबमिट करना होगा',
  }),
  declinedHeading: Object.freeze({ en: 'No page was inspected', hi: 'किसी पेज की जाँच नहीं हुई' }),
  declinedBody: Object.freeze({
    en: 'Nothing was read, stored, or changed.',
    hi: 'कुछ भी पढ़ा, संग्रहित या बदला नहीं गया।',
  }),
  transportHeading: Object.freeze({
    en: 'The extension could not finish this check',
    hi: 'एक्सटेंशन यह जाँच पूरी नहीं कर सका',
  }),
  transportBody: Object.freeze({
    en: 'Close and reopen the popup, or use the assisted-copy steps on ChallanSakshi. Nothing else will be attempted.',
    hi: 'पॉपअप बंद करके फिर खोलें, या ChallanSakshi पर सहायक-कॉपी चरणों का उपयोग करें। कोई और प्रयास नहीं किया जाएगा।',
  }),
  loadScrub: 'Load requested · reviewed values cleared from this popup',
  fillScrub: 'Fill requested · inspect the official form',
  expiredHeading: Object.freeze({
    en: 'Prepared fields expired',
    hi: 'तैयार किए गए फ़ील्ड की समय-सीमा समाप्त हो गई',
  }),
  expiredBody: Object.freeze({
    en: 'The preparation is no longer usable. Close and reopen the popup for a fresh check.',
    hi: 'तैयारी अब उपयोग योग्य नहीं है। नई जाँच के लिए पॉपअप बंद करके फिर खोलें।',
  }),
  stagedHeading: Object.freeze({ en: 'Fields prepared', hi: 'फ़ील्ड तैयार हैं' }),
  stagedBody: Object.freeze({
    en: 'Open the official destination page, then open this popup again to fill the empty reviewed fields.',
    hi: 'आधिकारिक गंतव्य पेज खोलें, फिर जाँचे गए खाली फ़ील्ड भरने के लिए यह पॉपअप दोबारा खोलें।',
  }),
  successHeading: Object.freeze({
    en: 'Both empty reviewed fields were filled',
    hi: 'दोनों जाँचे गए खाली फ़ील्ड भर दिए गए',
  }),
  partialHeading: Object.freeze({
    en: 'Some fields may not be filled',
    hi: 'कुछ फ़ील्ड शायद नहीं भरे गए',
  }),
  needsReviewHeading: Object.freeze({
    en: 'The affected person must inspect the official form',
    hi: 'प्रभावित व्यक्ति को आधिकारिक फ़ॉर्म की जाँच करनी होगी',
  }),
  unresolvedLiveHeading: Object.freeze({
    en: 'Waiting for a result that has not arrived',
    hi: 'नतीजे का इंतज़ार है जो अभी नहीं आया',
  }),
  unresolvedLiveBody: Object.freeze({
    en: 'An attempt is still unresolved. Close and reopen the popup to check again; nothing clears on its own.',
    hi: 'एक प्रयास अभी अनसुलझा है। दोबारा जाँच के लिए पॉपअप बंद करके फिर खोलें; कुछ भी अपने आप साफ़ नहीं होता।',
  }),
  orphanedHeading: Object.freeze({
    en: 'An earlier attempt is unresolved',
    hi: 'पहले का एक प्रयास अनसुलझा है',
  }),
  quarantinedHeading: Object.freeze({
    en: 'Stored safety data needs attention',
    hi: 'संग्रहित सुरक्षा डेटा पर ध्यान देना ज़रूरी है',
  }),
  quarantinedBody: Object.freeze({
    en: 'Stored safety data could not be trusted and was set aside unchanged. Nothing was repaired or guessed.',
    hi: 'संग्रहित सुरक्षा डेटा भरोसेमंद नहीं पाया गया और उसे बिना बदले अलग रख दिया गया। कुछ भी सुधारा या अनुमानित नहीं किया गया।',
  }),
  unsupportedHeading: Object.freeze({
    en: 'This page is not supported',
    hi: 'यह पेज समर्थित नहीं है',
  }),
  adapterDisabledHeading: Object.freeze({
    en: 'Real-site filling is disabled',
    hi: 'असली साइट पर भरना बंद है',
  }),
  adapterDisabledBody: Object.freeze({
    en: 'Real-site filling is disabled pending current verification and authorisation.',
    hi: 'वर्तमान सत्यापन और प्राधिकरण लंबित रहने तक असली साइट पर भरना बंद है।',
  }),
  emptyHeading: Object.freeze({ en: 'Nothing is prepared', hi: 'कुछ भी तैयार नहीं है' }),
  emptyBody: Object.freeze({
    en: 'No reviewed fields are prepared in this browser right now.',
    hi: 'अभी इस ब्राउज़र में कोई जाँचे गए फ़ील्ड तैयार नहीं हैं।',
  }),
  rejectedHeading: Object.freeze({
    en: 'This action was not performed',
    hi: 'यह कार्रवाई नहीं की गई',
  }),
  rejectedBody: Object.freeze({
    en: 'The extension refused this action to stay within its safety rules. Close and reopen the popup for a fresh check.',
    hi: 'सुरक्षा नियमों में रहने के लिए एक्सटेंशन ने यह कार्रवाई नहीं की। नई जाँच के लिए पॉपअप बंद करके फिर खोलें।',
  }),
  ackClosedBody: Object.freeze({
    en: 'Acknowledgement is no longer available here. Close and reopen the popup for a fresh check.',
    hi: 'यहाँ अभिस्वीकृति अब उपलब्ध नहीं है। नई जाँच के लिए पॉपअप बंद करके फिर खोलें।',
  }),
  resetDisclosure: Object.freeze({
    en: 'Exceptional recovery: this is outside ordinary one-use settlement and may discard unresolved safety history. The extension may still refuse.',
    hi: 'असाधारण पुनर्प्राप्ति: यह सामान्य एक-बार निपटान से बाहर है और अनसुलझा सुरक्षा इतिहास हटा सकती है। एक्सटेंशन फिर भी मना कर सकता है।',
  }),
  actionLoad: Object.freeze({ en: 'Load reviewed fields', hi: 'जाँचे गए फ़ील्ड लोड करें' }),
  actionFill: Object.freeze({ en: 'Fill empty reviewed fields', hi: 'जाँचे गए खाली फ़ील्ड भरें' }),
  actionClear: Object.freeze({ en: 'Clear prepared fields', hi: 'तैयार किए गए फ़ील्ड साफ़ करें' }),
  actionAcknowledge: Object.freeze({
    en: 'The affected person inspected the form · clear warning',
    hi: 'प्रभावित व्यक्ति ने फ़ॉर्म की जाँच कर ली · चेतावनी साफ़ करें',
  }),
  actionReset: Object.freeze({
    en: 'I own this device and have closed every relevant official tab and every browser process · reset device state',
    hi: 'मैं इस डिवाइस का स्वामी हूँ और मैंने सभी संबंधित आधिकारिक टैब और सभी ब्राउज़र प्रक्रियाएँ बंद कर दी हैं · डिवाइस स्थिति रीसेट करें',
  }),
  labelDestination: Object.freeze({ en: 'Destination', hi: 'गंतव्य' }),
  labelPreparedUntil: Object.freeze({ en: 'Prepared until', hi: 'तैयार समय-सीमा' }),
  labelDescription: Object.freeze({ en: 'Description', hi: 'विवरण' }),
  labelCategory: Object.freeze({ en: 'Category', hi: 'श्रेणी' }),
  labelDomain: Object.freeze({ en: 'Domain', hi: 'डोमेन' }),
  labelPurpose: Object.freeze({ en: 'Purpose', hi: 'उद्देश्य' }),
  labelAdapter: Object.freeze({ en: 'Adapter', hi: 'अडैप्टर' }),
  labelVerified: Object.freeze({ en: 'Adapter verified', hi: 'अडैप्टर सत्यापित' }),
  labelAdapterUntil: Object.freeze({ en: 'Adapter valid until', hi: 'अडैप्टर मान्य समय-सीमा' }),
  sourceExplainer: Object.freeze({
    en: 'Review the two prepared fields below. Load keeps them in the extension for the official page and clears them from this popup.',
    hi: 'नीचे तैयार दो फ़ील्ड देखें। लोड करने पर वे आधिकारिक पेज के लिए एक्सटेंशन में रहते हैं और इस पॉपअप से साफ़ हो जाते हैं।',
  }),
  destinationExplainer: Object.freeze({
    en: 'Fill writes only these two currently empty reviewed fields on the open official form.',
    hi: 'भरना केवल खुले आधिकारिक फ़ॉर्म के इन दो अभी-खाली जाँचे गए फ़ील्डों में लिखता है।',
  }),
});

const MAX_TIMER_CHUNK_MS = 2_000_000_000;

const stateRoot = document.querySelector('#state-root') as HTMLElement;
const statusRegion = document.querySelector('#status-region') as HTMLElement;
const environmentLabel = document.querySelector('#extension-environment');
if (environmentLabel) environmentLabel.textContent = __CHALLANSAKSHI_EXTENSION_VISIBLE_ENVIRONMENT_LABEL__;

type StagedTuple = Readonly<{ generation: string; packId: string; effectiveExpiresAtMs: number }>;
type PreviewSlot =
  | Readonly<{ kind: 'source'; dto: SourcePreviewDtoV1; binding: SourcePreviewBindingWireV1 }>
  | Readonly<{ kind: 'destination'; dto: DestinationPreviewDtoV1; tuple: StagedTuple }>
  | null;

let consentUsed = false;
let busy = false;
let activation = 0;
let previewSlot: PreviewSlot = null;
let stagedTuple: StagedTuple | null = null;
let warningRef: WarningWireV1 | null = null;
let valueNodes: Text[] = [];
let expiryTimer: ReturnType<typeof setTimeout> | null = null;
let ackTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimers() {
  if (expiryTimer !== null) clearTimeout(expiryTimer);
  if (ackTimer !== null) clearTimeout(ackTimer);
  expiryTimer = null;
  ackTimer = null;
}

function scheduleAt(deadlineMs: number, fire: () => void, assign: (timer: ReturnType<typeof setTimeout> | null) => void) {
  const tick = () => {
    const remaining = deadlineMs - Date.now();
    if (remaining <= 0) {
      assign(null);
      fire();
      return;
    }
    assign(setTimeout(tick, Math.min(remaining, MAX_TIMER_CHUNK_MS)));
  };
  tick();
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function bilingualLine(copy: Bilingual, className: string) {
  const paragraph = element('p', className);
  const english = element('span');
  english.setAttribute('lang', 'en');
  english.textContent = copy.en;
  const hindi = element('span');
  hindi.setAttribute('lang', 'hi');
  hindi.textContent = copy.hi;
  paragraph.append(english, ' ', hindi);
  return paragraph;
}

function singleLine(text: string, language: Language, className: string) {
  const paragraph = element('p', className);
  paragraph.setAttribute('lang', language);
  paragraph.textContent = text;
  return paragraph;
}

type ActionSpec = Readonly<{
  label: Bilingual;
  kind: 'primary' | 'secondary' | 'danger';
  language: Language | 'both';
  disabled?: boolean;
  onActivate: () => void;
}>;

function actionButton(spec: ActionSpec) {
  const kindClass = spec.kind === 'primary'
    ? 'action-primary'
    : spec.kind === 'danger'
      ? 'action-danger'
      : 'action-secondary';
  const button = element('button', `action ${kindClass}`);
  button.setAttribute('type', 'button');
  if (spec.language === 'both') {
    const english = element('span');
    english.setAttribute('lang', 'en');
    english.textContent = spec.label.en;
    const hindi = element('span');
    hindi.setAttribute('lang', 'hi');
    hindi.textContent = spec.label.hi;
    button.append(english, ' ', hindi);
  } else {
    button.setAttribute('lang', spec.language);
    button.textContent = spec.label[spec.language];
  }
  if (spec.disabled) button.disabled = true;
  button.addEventListener('click', spec.onActivate);
  return button;
}

type ViewSpec = Readonly<{
  heading: Bilingual;
  language: Language | 'both';
  simpleMode?: boolean;
  postAttempt: boolean | null;
  bodyBuilder?: (container: HTMLElement) => void;
  actions?: readonly ActionSpec[];
}>;

let resetAllowed = false;

function renderView(view: ViewSpec) {
  clearTimers();
  valueNodes = [];
  stagedTuple = null;
  warningRef = null;
  resetAllowed = false;
  const nextChildren: Node[] = [];
  const stateHeading = element('h2');
  stateHeading.id = 'state-heading';
  stateHeading.setAttribute('tabindex', '-1');
  if (view.language === 'both') {
    const english = element('span');
    english.setAttribute('lang', 'en');
    english.textContent = view.heading.en;
    const hindi = element('span');
    hindi.setAttribute('lang', 'hi');
    hindi.textContent = view.heading.hi;
    stateHeading.append(english, ' ', hindi);
  } else {
    stateHeading.setAttribute('lang', view.language);
    stateHeading.textContent = view.heading[view.language];
  }
  nextChildren.push(stateHeading);
  const body = element('div', 'state-content');
  view.bodyBuilder?.(body);
  nextChildren.push(body);
  if (view.postAttempt !== null) {
    const boundary = view.postAttempt ? COPY.independencePost : COPY.independencePre;
    if (view.language === 'both') {
      body.append(bilingualLine(boundary, 'boundary-line'));
      body.append(bilingualLine(COPY.untouched, 'boundary-line'));
    } else {
      body.append(singleLine(boundary[view.language], view.language, 'boundary-line'));
      body.append(singleLine(COPY.untouched[view.language], view.language, 'boundary-line'));
    }
  }
  if (view.actions && view.actions.length > 0) {
    const actionRow = element('div', 'action-row');
    for (const action of view.actions) actionRow.append(actionButton(action));
    nextChildren.push(actionRow);
  }
  stateRoot.replaceChildren(...nextChildren);
  statusRegion.textContent = COPY.statusUpdated;
  stateHeading.focus();
}

function labelledValue(label: Bilingual, language: Language, value: string, isReviewedValue: boolean) {
  const block = element('div', 'value-block');
  const term = element('p', 'value-label');
  term.setAttribute('lang', language);
  term.textContent = label[language];
  const detail = element('p', isReviewedValue ? 'value-text reviewed-prose' : 'value-text');
  const textNode = document.createTextNode(value);
  detail.append(textNode);
  if (isReviewedValue) valueNodes.push(textNode);
  block.append(term, detail);
  return block;
}

function scrubReviewedValues(replacement: string) {
  for (const node of valueNodes) node.textContent = replacement;
  valueNodes = [];
  previewSlot = null;
}

function renderTransportError() {
  previewSlot = null;
  renderView({
    heading: COPY.transportHeading,
    language: 'both',
    postAttempt: null,
    bodyBuilder: (body) => {
      body.append(bilingualLine(COPY.transportBody, 'state-body'));
    },
  });
}

function renderDeclined() {
  renderView({
    heading: COPY.declinedHeading,
    language: 'both',
    postAttempt: null,
    bodyBuilder: (body) => {
      body.append(bilingualLine(COPY.declinedBody, 'state-body'));
    },
  });
}

function renderLocalExpiry() {
  activation += 1;
  scrubReviewedValues(COPY.expiredHeading.en);
  stagedTuple = null;
  renderView({
    heading: COPY.expiredHeading,
    language: 'both',
    postAttempt: null,
    bodyBuilder: (body) => {
      body.append(bilingualLine(COPY.expiredBody, 'state-body'));
    },
  });
}

function readOwnTabId(tabs: unknown): number | null {
  if (!Array.isArray(tabs) || tabs.length === 0) return null;
  const tab: unknown = tabs[0];
  if (typeof tab !== 'object' || tab === null) return null;
  let descriptor: PropertyDescriptor | undefined;
  try {
    descriptor = Object.getOwnPropertyDescriptor(tab, 'id');
  } catch {
    return null;
  }
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return null;
  const id: unknown = descriptor.value;
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 0) return null;
  return id;
}

function queryActionTab(): Promise<number | null> {
  return new Promise((resolveTab) => {
    try {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          resolveTab(null);
          return;
        }
        resolveTab(readOwnTabId(tabs));
      });
    } catch {
      resolveTab(null);
    }
  });
}

function sendWorkerMessage(request: WorkerRequestV1): Promise<{ delivered: boolean; value?: unknown }> {
  return new Promise((resolveReply) => {
    try {
      chrome.runtime.sendMessage(request, (value: unknown) => {
        if (chrome.runtime.lastError) {
          resolveReply({ delivered: false });
          return;
        }
        resolveReply({ delivered: true, value });
      });
    } catch {
      resolveReply({ delivered: false });
    }
  });
}

async function runCommand(
  command: WorkerCommand,
  pageBound: boolean,
  buildRequest: (actionTabId: number | null) => WorkerRequestV1,
) {
  if (busy) return;
  busy = true;
  activation += 1;
  const token = activation;
  try {
    let actionTabId: number | null = null;
    if (pageBound) {
      actionTabId = await queryActionTab();
      if (token !== activation) return;
      if (actionTabId === null) {
        renderTransportError();
        return;
      }
    }
    let request: WorkerRequestV1;
    try {
      request = buildRequest(actionTabId);
    } catch {
      renderTransportError();
      return;
    }
    const reply = await sendWorkerMessage(request);
    if (token !== activation) return;
    if (!reply.delivered) {
      renderTransportError();
      return;
    }
    const validated = validateWorkerResponseForCommand(reply.value, command);
    if (validated) {
      renderWorkerResponse(command, validated);
      return;
    }
    const boundary = validateWorkerResponseForCommand(reply.value, null);
    if (boundary) {
      renderRejected(command, false);
      return;
    }
    renderTransportError();
  } finally {
    busy = false;
  }
}

function activateContinue() {
  if (consentUsed) return;
  consentUsed = true;
  const continueButton = document.querySelector('#continue-action');
  const notNowButton = document.querySelector('#not-now-action');
  if (continueButton && 'disabled' in continueButton) (continueButton as HTMLButtonElement).disabled = true;
  if (notNowButton && 'disabled' in notNowButton) (notNowButton as HTMLButtonElement).disabled = true;
  void runCommand('preview-current-page', true, (actionTabId) => (
    buildPreviewCurrentPageRequest(actionTabId as number)
  ));
}

function activateNotNow() {
  if (consentUsed) return;
  consentUsed = true;
  renderDeclined();
}

function activateLoad() {
  if (busy || previewSlot === null || previewSlot.kind !== 'source') return;
  const binding = previewSlot.binding;
  scrubReviewedValues(COPY.loadScrub);
  void runCommand('load-reviewed-fields', true, (actionTabId) => (
    buildLoadReviewedFieldsRequest(actionTabId as number, binding)
  ));
}

function activateFill() {
  if (busy || previewSlot === null || previewSlot.kind !== 'destination') return;
  const tuple = previewSlot.tuple;
  scrubReviewedValues(COPY.fillScrub);
  void runCommand('fill-empty-reviewed-fields', true, (actionTabId) => (
    buildFillEmptyReviewedFieldsRequest(actionTabId as number, tuple.generation, tuple.packId, tuple.effectiveExpiresAtMs)
  ));
}

function activateClear() {
  if (busy || stagedTuple === null) return;
  const tuple = stagedTuple;
  void runCommand('clear-staged-fields', false, () => (
    buildClearStagedFieldsRequest(tuple.generation, tuple.packId, tuple.effectiveExpiresAtMs)
  ));
}

function activateAcknowledge() {
  if (busy || warningRef === null) return;
  const warning = warningRef;
  if (Date.now() >= warning.warningExpiresAt) return;
  void runCommand('acknowledge-affected-person-inspection', false, () => (
    buildAcknowledgeAffectedPersonInspectionRequest(warning.packId, warning.replayUntil, warning.warningExpiresAt)
  ));
}

function activateReset() {
  if (busy || !resetAllowed) return;
  void runCommand('reset-for-device-owner', false, () => (
    buildResetForDeviceOwnerRequest({
      schema: DEVICE_OWNER_RESET_ATTESTATION_SCHEMA,
      type: 'reset-for-device-owner',
      allRelevantOfficialTabsAndBrowserProcessesClosed: true,
    })
  ));
}

function isoFromEpoch(epochMs: number) {
  return new Date(epochMs).toISOString();
}

function postAttemptFor(command: WorkerCommand, state: string) {
  if (command === 'fill-empty-reviewed-fields') return true;
  return state === 'success' || state === 'partial' || state === 'needs-review'
    || state === 'unresolved-live' || state === 'unresolved-orphaned';
}

function renderFixedState(command: WorkerCommand, state: string, heading: Bilingual, bodyCopy: Bilingual | null) {
  renderView({
    heading,
    language: 'both',
    postAttempt: postAttemptFor(command, state),
    bodyBuilder: (body) => {
      if (bodyCopy) body.append(bilingualLine(bodyCopy, 'state-body'));
      if (state === 'unsupported' || state === 'empty' || state === 'adapter-disabled') {
        body.append(bilingualLine(COPY.fallback, 'fallback-line'));
      }
    },
  });
}

function renderRejected(command: WorkerCommand, viaWorkerCommandEcho: boolean) {
  void viaWorkerCommandEcho;
  renderView({
    heading: COPY.rejectedHeading,
    language: 'both',
    postAttempt: postAttemptFor(command, 'rejected'),
    bodyBuilder: (body) => {
      body.append(bilingualLine(COPY.rejectedBody, 'state-body'));
      body.append(bilingualLine(COPY.fallback, 'fallback-line'));
    },
  });
}

function renderRecovery(command: WorkerCommand, state: 'unresolved-live' | 'unresolved-orphaned' | 'quarantined') {
  const heading = state === 'unresolved-live'
    ? COPY.unresolvedLiveHeading
    : state === 'unresolved-orphaned'
      ? COPY.orphanedHeading
      : COPY.quarantinedHeading;
  const bodyCopy = state === 'quarantined' ? COPY.quarantinedBody : COPY.unresolvedLiveBody;
  const offerReset = state === 'unresolved-orphaned' || state === 'quarantined';
  renderView({
    heading,
    language: 'both',
    postAttempt: postAttemptFor(command, state),
    bodyBuilder: (body) => {
      body.append(bilingualLine(bodyCopy, 'state-body'));
      if (offerReset) body.append(bilingualLine(COPY.resetDisclosure, 'reset-disclosure'));
    },
    actions: offerReset
      ? [{ label: COPY.actionReset, kind: 'danger', language: 'both', onActivate: activateReset }]
      : [],
  });
  resetAllowed = offerReset;
}

function renderWarning(command: WorkerCommand, state: 'partial' | 'needs-review', warning: WarningWireV1) {
  const heading = state === 'partial' ? COPY.partialHeading : COPY.needsReviewHeading;
  const acknowledgementOpen = Date.now() < warning.warningExpiresAt;
  renderView({
    heading,
    language: 'both',
    postAttempt: true,
    bodyBuilder: (body) => {
      body.append(bilingualLine(COPY.affectedPerson, 'state-body'));
      const expiryLine = element('p', 'value-text');
      expiryLine.textContent = isoFromEpoch(warning.warningExpiresAt);
      body.append(expiryLine);
      if (!acknowledgementOpen) body.append(bilingualLine(COPY.ackClosedBody, 'state-body'));
    },
    actions: [{
      label: COPY.actionAcknowledge,
      kind: 'primary',
      language: 'both',
      disabled: !acknowledgementOpen,
      onActivate: activateAcknowledge,
    }],
  });
  warningRef = warning;
  if (acknowledgementOpen) {
    scheduleAt(warning.warningExpiresAt, () => {
      if (warningRef !== warning) return;
      renderWarning(command, state, warning);
    }, (timer) => {
      ackTimer = timer;
    });
  }
}

function renderStaged(command: WorkerCommand, tuple: StagedTuple) {
  renderView({
    heading: COPY.stagedHeading,
    language: 'both',
    postAttempt: postAttemptFor(command, 'staged'),
    bodyBuilder: (body) => {
      body.append(bilingualLine(COPY.stagedBody, 'state-body'));
      const expiryLine = element('p', 'value-text');
      expiryLine.textContent = isoFromEpoch(tuple.effectiveExpiresAtMs);
      body.append(expiryLine);
    },
    actions: [{ label: COPY.actionClear, kind: 'secondary', language: 'both', onActivate: activateClear }],
  });
  stagedTuple = tuple;
  scheduleAt(tuple.effectiveExpiresAtMs, renderLocalExpiry, (timer) => {
    expiryTimer = timer;
  });
}

function renderSourcePreview(dto: SourcePreviewDtoV1, binding: SourcePreviewBindingWireV1) {
  const language = dto.language;
  renderView({
    heading: { en: 'Reviewed fields on this page', hi: 'इस पेज पर जाँचे गए फ़ील्ड' },
    language,
    postAttempt: false,
    bodyBuilder: (body) => {
      if (!dto.simpleMode) body.append(singleLine(COPY.sourceExplainer[language], language, 'state-body'));
      body.append(labelledValue(COPY.labelDestination, language, dto.destinationName, false));
      body.append(labelledValue(COPY.labelPreparedUntil, language, dto.expiresAt, false));
      body.append(labelledValue(COPY.labelDescription, language, dto.description, true));
      if (dto.categoryPresentation !== null) {
        body.append(labelledValue(COPY.labelCategory, language, dto.categoryPresentation, true));
      }
      body.append(singleLine(COPY.affectedPerson[language], language, 'boundary-line'));
    },
    actions: [{ label: COPY.actionLoad, kind: 'primary', language, onActivate: activateLoad }],
  });
  previewSlot = { kind: 'source', dto, binding };
  const dtoExpiry = Date.parse(dto.expiresAt);
  if (Number.isNaN(dtoExpiry)) {
    renderTransportError();
    return;
  }
  scheduleAt(Math.min(binding.previewNotAfterMs, dtoExpiry), renderLocalExpiry, (timer) => {
    expiryTimer = timer;
  });
}

function renderDestinationPreview(dto: DestinationPreviewDtoV1, tuple: StagedTuple) {
  const language = dto.language;
  renderView({
    heading: { en: 'Ready to fill the reviewed fields', hi: 'जाँचे गए फ़ील्ड भरने के लिए तैयार' },
    language,
    postAttempt: false,
    bodyBuilder: (body) => {
      if (!dto.simpleMode) body.append(singleLine(COPY.destinationExplainer[language], language, 'state-body'));
      body.append(labelledValue(COPY.labelDomain, language, dto.domain, false));
      body.append(labelledValue(COPY.labelPurpose, language, dto.purpose, false));
      body.append(labelledValue(COPY.labelAdapter, language, dto.adapterId, false));
      body.append(labelledValue(COPY.labelVerified, language, dto.lastVerifiedAt, false));
      body.append(labelledValue(COPY.labelAdapterUntil, language, dto.adapterExpiresAt, false));
      body.append(labelledValue(COPY.labelDescription, language, dto.description, true));
      if (dto.categoryPresentation !== null) {
        body.append(labelledValue(COPY.labelCategory, language, dto.categoryPresentation, true));
      }
      body.append(singleLine(COPY.affectedPerson[language], language, 'boundary-line'));
    },
    actions: [
      { label: COPY.actionFill, kind: 'primary', language, onActivate: activateFill },
      { label: COPY.actionClear, kind: 'secondary', language, onActivate: activateClear },
    ],
  });
  previewSlot = { kind: 'destination', dto, tuple };
  stagedTuple = tuple;
  const adapterExpiry = Date.parse(dto.adapterExpiresAt);
  if (Number.isNaN(adapterExpiry)) {
    renderTransportError();
    return;
  }
  scheduleAt(Math.min(tuple.effectiveExpiresAtMs, adapterExpiry), renderLocalExpiry, (timer) => {
    expiryTimer = timer;
  });
}

function renderWorkerResponse(command: WorkerCommand, response: WorkerResponseV1) {
  const record = response as unknown as Record<string, unknown>;
  const state = record.state as string;
  switch (state) {
    case 'source-preview':
      renderSourcePreview(
        record.preview as SourcePreviewDtoV1,
        record.sourcePreviewBinding as SourcePreviewBindingWireV1,
      );
      return;
    case 'staged':
      renderStaged(command, {
        generation: record.generation as string,
        packId: record.packId as string,
        effectiveExpiresAtMs: record.effectiveExpiresAtMs as number,
      });
      return;
    case 'destination-preview':
      renderDestinationPreview(record.preview as DestinationPreviewDtoV1, {
        generation: record.generation as string,
        packId: record.packId as string,
        effectiveExpiresAtMs: record.effectiveExpiresAtMs as number,
      });
      return;
    case 'success':
      renderFixedState(command, state, COPY.successHeading, null);
      return;
    case 'partial':
    case 'needs-review':
      renderWarning(command, state, record.warning as WarningWireV1);
      return;
    case 'unresolved-live':
    case 'unresolved-orphaned':
    case 'quarantined':
      renderRecovery(command, state);
      return;
    case 'expired':
      renderFixedState(command, state, COPY.expiredHeading, COPY.expiredBody);
      return;
    case 'unsupported':
      renderFixedState(command, state, COPY.unsupportedHeading, null);
      return;
    case 'adapter-disabled':
      renderFixedState(command, state, COPY.adapterDisabledHeading, COPY.adapterDisabledBody);
      return;
    case 'empty':
      renderFixedState(command, state, COPY.emptyHeading, COPY.emptyBody);
      return;
    case 'rejected':
      renderRejected(command, true);
      return;
    default:
      renderTransportError();
  }
}

const continueControl = document.querySelector('#continue-action');
const notNowControl = document.querySelector('#not-now-action');
continueControl?.addEventListener('click', activateContinue);
notNowControl?.addEventListener('click', activateNotNow);
const initialHeading = document.querySelector('#state-heading') as HTMLElement | null;
if (initialHeading && typeof initialHeading.focus === 'function') initialHeading.focus();
