'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Download, ExternalLink, FolderOpen, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { PublicBetaShell } from '../public-beta/PublicBetaShell';
import { buildCaseNote, createCase, updateCase, validateProfile, type CaseFact, type CaseStatus, type CaseUpdateEvent, type MobilityCase, type MobilityCasePatch, type MobilityProfile, type ServiceKind } from '../../lib/mobility/cases';
import { deleteAllMobilityData, deleteCase, MOBILITY_STORE_EVENT, readCases, readProfile, saveCase, saveProfile } from '../../lib/mobility/store';
import { getService, inferService, LIFE_EVENTS, SERVICE_KINDS, type ServiceInference } from '../../lib/mobility/services';
import { JURISDICTIONS } from '../../lib/mobility/document-bridge';
import styles from './MobilityWorkspace.module.css';
import ProfileCorrectionsPanel from './ProfileCorrectionsPanel';
import CaseTeamPanel from './CaseTeamPanel';
import CaseBriefPanel from './CaseBriefPanel';
import { searchMobilityCases } from '../../lib/mobility/case-brief';
import { deleteAllFollowUps, deleteFollowUp, reconcileFollowUps } from '../../lib/mobility/follow-up-store';
import FollowUpPanel, { FollowUpInbox } from './FollowUpPanel';
import EffortPanel from './EffortPanel';
import { PortableCaseExport, PortableCaseImport } from './PortableCasePanel';
import SourceCheckPanel from './SourceCheckPanel';
import TaskIntakeReview from './TaskIntakeReview';
import type { TaskIntakeReviewResult } from '../../lib/mobility/task-intake';
import CaseRecoveryPanel from './CaseRecoveryPanel';
import { prepareCaseRecovery } from '../../lib/mobility/case-recovery';
import FormCopyPanel from './FormCopyPanel';
import RenewalPanel from './RenewalPanel';
import { assertCurrentRenewal, deleteAllRenewals } from '../../lib/mobility/renewal-store';
import type { RenewalRecord } from '../../lib/mobility/renewals';
import { deleteAllJourneys } from '../../lib/mobility/journey-store';
import JourneyPanel from './JourneyPanel';
import AgendaPanel from './AgendaPanel';
import VisitPreparationPanel from './VisitPreparationPanel';
import AcknowledgementPanel from './AcknowledgementPanel';
import { validateAcknowledgementReview, type AcknowledgementReview } from '../../lib/mobility/acknowledgement';

type Language = 'en' | 'hi';
const now = () => new Date().toISOString();
const newId = () => crypto.randomUUID();
const storedRevision = (value: MobilityCase) => (value as unknown as Record<symbol, unknown>)[Symbol.for('challansakshi.mobility.case-revision')];
const sameProfile = (left: MobilityProfile | null | undefined, right: MobilityProfile | null | undefined) => JSON.stringify(left) === JSON.stringify(right);
type ProgressDraft = { caseId: string; text: string; status: CaseStatus };
type WorkingSnapshot = { base: MobilityCase | null; patch: MobilityCasePatch; dirty: boolean; progress: ProgressDraft | null };
const blankProfile = (language: Language): MobilityProfile => ({ version: 1, name: '', address: '', language, vehicles: [], updatedAt: now() });
const statusCopy: Record<CaseStatus, { en: string; hi: string }> = {
  preparing: { en: 'Preparing', hi: 'तैयारी जारी' }, ready: { en: 'Ready for your next step', hi: 'अगले चरण के लिए तैयार' },
  'awaiting-response': { en: 'Awaiting response · reported by you', hi: 'उत्तर की प्रतीक्षा · आपकी सूचना' },
  'needs-attention': { en: 'Needs your attention', hi: 'आपका ध्यान चाहिए' },
  completed: { en: 'Completed · reported by you', hi: 'पूरा हुआ · आपकी सूचना' },
};
function localDate() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function needsAttention(item: MobilityCase) { return item.status !== 'completed' && (item.status === 'needs-attention' || Boolean(item.followUpDate && item.followUpDate <= localDate())); }
function downloadText(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const SESSION_ENDED_KEY = 'challansakshi-mobility-session-ended-v1';
type WorkspaceProps = { initialCaseId?: string; language?: Language };

export default function MobilityWorkspace({ initialCaseId, language: initialLanguage = 'en' }: WorkspaceProps) {
  const [session, setSession] = useState<'checking' | 'active' | 'ended'>('checking');
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [markerAvailable, setMarkerAvailable] = useState(true);
  const [resumed, setResumed] = useState(false);
  const clearedHeading = useRef<HTMLHeadingElement>(null);
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try { setSession(window.sessionStorage.getItem(SESSION_ENDED_KEY) === '1' ? 'ended' : 'active'); }
      catch { setMarkerAvailable(false); setSession('active'); }
    });
    return () => { active = false; };
  }, []);
  useEffect(() => { if (session === 'ended') clearedHeading.current?.focus(); }, [session]);
  function endSession(currentLanguage: Language) {
    setLanguage(currentLanguage); setSession('ended');
    try { window.sessionStorage.setItem(SESSION_ENDED_KEY, '1'); setMarkerAvailable(true); }
    catch { setMarkerAvailable(false); }
    window.history.replaceState(null, '', '/mobility');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }
  function restart() {
    try { window.sessionStorage.removeItem(SESSION_ENDED_KEY); }
    catch { setMarkerAvailable(false); }
    setResumed(true); setSession('active');
  }
  if (session === 'active') return <Workspace initialCaseId={resumed ? undefined : initialCaseId} language={language} onEndSession={endSession} />;
  return <PublicBetaShell language={language} setLanguage={setLanguage} service="Your mobility cases" serviceHindi="आपके मोबिलिटी केस">
    <main className={styles.main}>
      {session === 'checking' ? <section className={styles.panel} aria-busy="true"><h1>{t('Your mobility workspace', 'आपकी मोबिलिटी कार्यशाला')}</h1><p role="status">{t('Opening your workspace…', 'आपकी कार्यशाला खुल रही है…')}</p></section> : <section className={`${styles.panel} ${styles.sessionEnded}`}>
        <ShieldCheck size={28} aria-hidden="true" />
        <h1 ref={clearedHeading} tabIndex={-1}>{t('This session is cleared', 'यह सत्र साफ़ हो गया')}</h1>
        <p>{t('The working forms, unsaved edits and reviews in this tab have been cleared.', 'इस टैब के कार्यरत फ़ॉर्म, बिना सहेजे बदलाव और समीक्षाएँ साफ़ हो गई हैं।')}</p>
        <p>{t('Saved cases and reminders remain on this device. Other tabs, account sign-in, downloaded files and clipboard copies are managed separately.', 'सहेजे केस और अनुस्मारक इस डिवाइस पर रहते हैं। दूसरे टैब, खाते का साइन-इन, डाउनलोड फ़ाइलें और क्लिपबोर्ड प्रतियाँ अलग संभाली जाती हैं।')}</p>
        {!markerAvailable && <p role="status">{t('This browser could not keep the session-clear marker. Reloading may show saved device data again.', 'यह ब्राउज़र सत्र साफ़ होने का संकेत नहीं रख सका। रीलोड करने पर सहेजा डिवाइस डेटा फिर दिख सकता है।')}</p>}
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={restart}>{t('Start a new session', 'नया सत्र शुरू करें')}</button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Leave the cleared workspace through a fresh document, matching CitizenChrome's state boundary. */}
          <a href="/">{t('Return home', 'होम पर लौटें')}</a>
        </div>
      </section>}
    </main>
  </PublicBetaShell>;
}

function Workspace({ initialCaseId, language: initialLanguage = 'en', onEndSession }: WorkspaceProps & { onEndSession: (language: Language) => void }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [ready, setReady] = useState(false);
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const [saved, setSaved] = useState<MobilityCase[]>([]);
  const [renewalCount, setRenewalCount] = useState(0);
  const [journeyCount, setJourneyCount] = useState(0);
  const [clearing, setClearing] = useState(false);
  const sessionActive = useRef(true);
  const pendingClear = useRef<AbortController | null>(null);
  useEffect(() => {
    sessionActive.current = true;
    return () => { sessionActive.current = false; pendingClear.current?.abort(); };
  }, []);
  const [caseSearch, setCaseSearch] = useState('');
  const [base, setBase] = useState<MobilityCase | null>(null);
  const [patch, setPatch] = useState<MobilityCasePatch>({});
  const [dirty, setDirty] = useState(false);
  const [expiredWorkingCopy, setExpiredWorkingCopy] = useState(false);
  const [externalCase, setExternalCase] = useState<MobilityCase | null>(null);
  const baseRef = useRef<MobilityCase | null>(null);
  useEffect(() => { baseRef.current = base; }, [base]);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [intent, setIntent] = useState('');
  const [intakeReview, setIntakeReview] = useState<{ text: string; language: Language; result: TaskIntakeReviewResult } | null>(null);
  const reviewedIntake = intakeReview?.text === intent && intakeReview.language === language ? intakeReview.result : null;
  const acceptIntakeReview = useCallback((result: TaskIntakeReviewResult | null) => setIntakeReview(result ? { text: intent, language, result } : null), [intent, language]);
  const [kind, setKind] = useState<ServiceKind>('challan-review');
  const [jurisdiction, setJurisdiction] = useState('');
  const manualJurisdictionDiffers = Boolean(jurisdiction.trim() && reviewedIntake?.jurisdiction && jurisdiction.trim().normalize('NFKC').toLowerCase() !== reviewedIntake.jurisdiction.normalize('NFKC').toLowerCase());
  const [inference, setInference] = useState<ServiceInference | null>(null);
  const [profile, setProfile] = useState<MobilityProfile | null>(null);
  const [profileEdit, setProfileEdit] = useState<MobilityProfile | null>(null);
  const [profileConsent, setProfileConsent] = useState(false);
  const [profileConflict, setProfileConflict] = useState(false);
  const profileSource = useRef<MobilityProfile | null | undefined>(undefined);
  const observedProfile = useRef<MobilityProfile | null | undefined>(undefined);
  const committingProfile = useRef(false);
  const [reuseOpen, setReuseOpen] = useState(false);
  const [reuseSource, setReuseSource] = useState<MobilityProfile | null>(null);
  const [reuseChanged, setReuseChanged] = useState(false);
  const [reuseKeys, setReuseKeys] = useState<string[]>([]);
  const [progressDraft, setProgressDraft] = useState<ProgressDraft | null>(null);
  const editorHeading = useRef<HTMLHeadingElement>(null);
  const renewalSection = useRef<HTMLDivElement>(null);
  const savedCaseId = useRef<string | null>(null);
  const savedSource = useRef<MobilityCase | null>(null);
  const current = base ? { ...base, ...patch } : null;
  const currentProgress = progressDraft?.caseId === current?.id ? progressDraft : null;
  const report = currentProgress?.text ?? '';
  const reportedStatus = currentProgress?.status ?? 'awaiting-response';
  const progressDirty = currentProgress !== null;
  const workingSnapshot = useRef<WorkingSnapshot>({ base: null, patch: {}, dirty: false, progress: null });
  const savingSnapshot = useRef<WorkingSnapshot | null>(null);
  useEffect(() => { workingSnapshot.current = { base, patch, dirty, progress: currentProgress }; }, [base, patch, dirty, currentProgress]);

  const observeSavedProfile = useCallback((details: MobilityProfile | null) => {
    if (observedProfile.current !== undefined && !sameProfile(observedProfile.current, details)) {
      if (details === null) {
        // A disappeared profile must not remain visible in another open tab.
        profileSource.current = null; observedProfile.current = null;
        setProfile(null); setProfileEdit(previous => blankProfile(previous?.language ?? initialLanguage));
        setProfileConflict(false); setProfileConsent(false); setReuseOpen(false); setReuseKeys([]); setReuseSource(null); setReuseChanged(false);
        return;
      }
      setReuseKeys([]); setReuseSource(details); setReuseChanged(true);
      if (!committingProfile.current && profileSource.current !== undefined && !sameProfile(profileSource.current, details)) { setProfileConflict(true); setProfileConsent(false); }
    }
    observedProfile.current = details; setProfile(details);
  }, [initialLanguage]);

  useEffect(() => {
    let active = true;
    const load = (event?: Event) => {
      try {
        const cases = readCases(); const details = readProfile();
        if (active) {
          setSaved(cases); observeSavedProfile(details);
          try { reconcileFollowUps(cases); } catch { setError('Saved follow-up data could not be read. Your case editor is still available; clear follow-up data separately if needed.'); }
          const activeCase = cases.find(item => item.id === savedCaseId.current);
          if (activeCase && baseRef.current && storedRevision(activeCase) !== storedRevision(baseRef.current)) setExternalCase(activeCase);
          if (savedCaseId.current && !cases.some(item => item.id === savedCaseId.current)) {
            const detail = (event as CustomEvent<{ area?: string; operation?: string; expiredIds?: string[] }> | undefined)?.detail;
            const pending = savingSnapshot.current ?? workingSnapshot.current;
            const recoverExpiry = detail?.area === 'cases' && detail.operation === 'expire' && detail.expiredIds?.includes(savedCaseId.current) && pending.base && (pending.dirty || pending.progress || savingSnapshot.current);
            savedCaseId.current = null; savedSource.current = null; setExternalCase(null); setConsent(false); setReuseOpen(false); setReuseKeys([]); setReuseSource(null);
            window.history.replaceState(null, '', '/mobility');
            if (recoverExpiry) {
              setBase(pending.base); setPatch(pending.patch); setProgressDraft(pending.progress); setDirty(true); setExpiredWorkingCopy(true);
              setMessage('The saved case expired. Your unsaved working copy is available below for recovery; it has not been saved again.');
            } else {
              setBase(null); setPatch({}); setProgressDraft(null); setDirty(false); setExpiredWorkingCopy(false); setError('');
              setIntent(''); setInference(null); setJurisdiction(''); setIntakeReview(null);
              setMessage('This saved case was deleted or expired and has been removed from this view.');
            }
          }
        }
      }
      catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'Could not read private-device storage.'); }
    };
    queueMicrotask(() => {
      if (!active) return;
      load();
      try { const details = readProfile(); profileSource.current = details; setProfileEdit(details ?? blankProfile(initialLanguage)); } catch { setProfileEdit(blankProfile(initialLanguage)); }
      setReady(true);
      const id = initialCaseId ?? new URLSearchParams(window.location.hash.slice(1)).get('case');
      if (id) {
        try { const item = readCases().find(value => value.id === id); if (item) { savedCaseId.current = item.id; savedSource.current = item; setBase(item); setKind(item.service); } else setError('This case is not saved in this browser, or its 90-day retention has expired.'); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load this case.'); }
      }
    });
    window.addEventListener(MOBILITY_STORE_EVENT, load);
    return () => { active = false; window.removeEventListener(MOBILITY_STORE_EVENT, load); };
  }, [initialCaseId, initialLanguage, observeSavedProfile]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty || progressDirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, progressDirty]);

  function fail(cause: unknown) { setError(cause instanceof Error ? cause.message : t('That change could not be completed.', 'यह बदलाव पूरा नहीं हो सका।')); setMessage(''); }
  function edit(value: MobilityCasePatch) {
    const changesDetails = value.facts !== undefined || value.jurisdiction !== undefined;
    setPatch(previous => ({ ...previous, ...value, ...(changesDetails && current?.status === 'ready' ? { status: 'preparing' as const } : {}) }));
    setDirty(true); setMessage('');
  }
  function switchAllowed() { return !(dirty || progressDirty) || window.confirm(t('Discard the unsaved changes and any unadded update in this case?', 'इस केस के बिना सहेजे बदलाव और बिना जोड़ा अपडेट हटाएँ?')); }
  function openCase(requested: MobilityCase) {
    if (!switchAllowed()) return;
    let item: MobilityCase;
    try {
      const cases = readCases(); setSaved(cases);
      const latest = cases.find(value => value.id === requested.id);
      if (!latest) throw new Error(t('That saved case was deleted or expired. Refresh your saved cases.', 'वह सहेजा केस हट गया या समाप्त हुआ। सहेजे केस फिर लोड करें।'));
      item = latest;
    } catch (cause) { fail(cause); return; }
    savedCaseId.current = item.id;
    savedSource.current = item;
    setBase(item); setExternalCase(null); setPatch({}); setDirty(false); setExpiredWorkingCopy(false); setConsent(false); setKind(item.service); setProgressDraft(null); setReuseOpen(false); setReuseKeys([]); setReuseSource(null); setMessage(''); setError('');
    window.history.replaceState(null, '', `/mobility#case=${encodeURIComponent(item.id)}`);
    requestAnimationFrame(() => editorHeading.current?.focus());
  }
  function reviewSources(keys: string[]) {
    const ordered = keys.includes('case:draft') ? ['case:draft', ...keys] : keys;
    const controls = Array.from(document.querySelectorAll<HTMLElement>('[data-case-source]'));
    for (const key of ordered) {
      const matching = controls.filter(element => element.dataset.caseSource === key);
      const target = key === 'case:progress' ? matching.find(element => !(element as HTMLInputElement).checked) ?? matching[0] : matching[0];
      if (!target) continue;
      for (let parent = target.parentElement; parent; parent = parent.parentElement) if (parent instanceof HTMLDetailsElement) parent.open = true;
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'center', behavior: 'instant' });
      return;
    }
  }
  function newCase() {
    if (!switchAllowed()) return;
    savedCaseId.current = null; savedSource.current = null;
    setBase(null); setExternalCase(null); setPatch({}); setDirty(false); setExpiredWorkingCopy(false); setConsent(false); setProgressDraft(null); setReuseOpen(false); setReuseKeys([]); setReuseSource(null); setInference(null); setIntent(''); setJurisdiction(''); setIntakeReview(null); setError(''); setMessage('');
    window.history.replaceState(null, '', '/mobility');
  }
  function openImportedCase(item: MobilityCase): boolean {
    if (!switchAllowed()) return false;
    savedCaseId.current = null; savedSource.current = null;
    setBase(item); setExternalCase(null); setPatch({}); setDirty(true); setExpiredWorkingCopy(false); setConsent(false); setKind(item.service); setProgressDraft(null); setReuseOpen(false); setReuseKeys([]); setReuseSource(null); setMessage(t('Opened a separate unsaved copy from your encrypted file. Review it before saving.', 'आपकी एन्क्रिप्टेड फ़ाइल से अलग बिना सहेजी प्रति खुली। सहेजने से पहले समीक्षा करें।')); setError('');
    window.history.replaceState(null, '', '/mobility');
    requestAnimationFrame(() => editorHeading.current?.focus());
    return true;
  }
  function startCase(serviceKind = kind) {
    try {
      const service = getService(serviceKind);
      const created = createCase(serviceKind, now(), newId());
      const reviewedFacts = reviewedIntake?.facts.filter(fact => !manualJurisdictionDiffers || fact.key !== 'task_jurisdiction') ?? [];
      const item = updateCase(created, { title: service.title[language], jurisdiction: jurisdiction.trim() || reviewedIntake?.jurisdiction || '', reference: reviewedIntake?.reference ?? '', facts: reviewedFacts, draft: intent.trim() ? t(`My request / preparation notes:\n${intent.trim()}\n\nPlease review the details below and advise the appropriate next step.`, `मेरा अनुरोध / तैयारी नोट:\n${intent.trim()}\n\nकृपया नीचे की जानकारी देखकर उचित अगले चरण के बारे में बताएँ।`) : '' }, now());
      // The plan now owns these values; a later task starts with a fresh intake.
      setIntent(''); setInference(null); setJurisdiction(''); setIntakeReview(null);
      savedCaseId.current = null; savedSource.current = null; setBase(item); setPatch({}); setDirty(true); setExpiredWorkingCopy(false); setConsent(false); setProgressDraft(null); setReuseOpen(false); setReuseKeys([]); setReuseSource(null); setKind(serviceKind); setError(''); setMessage(t('Your plan is ready to edit. It is not saved yet.', 'योजना संपादन के लिए तैयार है। अभी सहेजी नहीं गई है।'));
      requestAnimationFrame(() => editorHeading.current?.focus());
    } catch (cause) { fail(cause); }
  }
  async function startRenewalCase(record: RenewalRecord) {
    if (!switchAllowed()) return;
    const before = JSON.stringify(workingSnapshot.current);
    try {
      const checked = await assertCurrentRenewal(record);
      if (JSON.stringify(workingSnapshot.current) !== before) throw new Error(t('Your working case changed. Review it before starting another case.', 'कार्यरत केस बदल गया। दूसरा केस शुरू करने से पहले उसे जाँचें।'));
      if (checked.kind !== 'licence') return;
      const details = [
        { key: 'renewal_expiry', label: t('Expiry date copied from my record', 'मेरे रिकॉर्ड से लिखी समाप्ति तारीख'), value: checked.expiryDate },
        { key: 'renewal_source', label: t('Where I read this date', 'मैंने यह तारीख कहाँ पढ़ी'), value: checked.sourceLabel },
        { key: 'renewal_checked', label: t('Date I checked the source', 'स्रोत जाँचने की तारीख'), value: checked.checkedOn },
        ...(checked.vehicleLabel ? [{ key: 'renewal_vehicle_label', label: t('My vehicle label', 'मेरे वाहन का नाम'), value: checked.vehicleLabel }] : []),
      ];
      const item = updateCase(createCase('licence-renew', now(), newId()), {
        title: getService('licence-renew').title[language], facts: details.map(detail => ({ ...detail, source: 'citizen', confirmed: false })),
        draft: t('I would like to prepare for renewing my driving licence. Please check the details I copied from my own record and help me identify the current requirements for my issuing authority.', 'मैं अपने ड्राइविंग लाइसेंस के नवीनीकरण की तैयारी करना चाहता/चाहती हूँ। कृपया मेरे रिकॉर्ड से लिखी जानकारी जाँचें और जारीकर्ता की वर्तमान आवश्यकताएँ पहचानने में मदद करें।'),
      }, now());
      savedCaseId.current = null; savedSource.current = null; setBase(item); setExternalCase(null); setPatch({}); setDirty(true); setExpiredWorkingCopy(false); setConsent(false); setKind('licence-renew'); setProgressDraft(null); setReuseOpen(false); setReuseKeys([]); setReuseSource(null);
      setIntent(''); setInference(null); setJurisdiction(''); setIntakeReview(null); setError('');
      setMessage(t('A separate unsaved renewal case is ready. Check the copied dates and add the issuing authority from your record.', 'अलग बिना सहेजा नवीनीकरण केस तैयार है। लिखी तारीखें जाँचें और रिकॉर्ड का जारीकर्ता जोड़ें।'));
      window.history.replaceState(null, '', '/mobility'); requestAnimationFrame(() => editorHeading.current?.focus());
    } catch (cause) { fail(cause); }
  }
  async function clearMobilityData() {
    if (clearing || !window.confirm(t('Delete all mobility cases, follow-up notes, linked plans, document reminders and reusable details from this browser?', 'इस ब्राउज़र से सभी मोबिलिटी केस, फ़ॉलो-अप नोट, जुड़ी योजनाएँ, दस्तावेज़ अनुस्मारक और दोबारा उपयोग जानकारी हटाएँ?'))) return;
    const controller = new AbortController(); pendingClear.current = controller;
    setClearing(true);
    try {
      await deleteAllJourneys(controller.signal);
      controller.signal.throwIfAborted(); if (!sessionActive.current) return;
      await deleteAllRenewals(controller.signal);
      controller.signal.throwIfAborted(); if (!sessionActive.current) return;
      deleteAllFollowUps(); deleteAllMobilityData();
      setIntent(''); setInference(null); setJurisdiction(''); setIntakeReview(null); savedCaseId.current = null; savedSource.current = null; profileSource.current = null; observedProfile.current = null;
      setSaved([]); setRenewalCount(0); setJourneyCount(0); setProfile(null); setProfileEdit(null); setProfileConflict(false); setBase(null); setPatch({}); setProgressDraft(null); setExternalCase(null); setExpiredWorkingCopy(false); setReuseOpen(false); setReuseKeys([]); setReuseSource(null); setReuseChanged(false); setDirty(false); setConsent(false); setProfileConsent(false); setError('');
      window.history.replaceState(null, '', '/mobility');
      setMessage(t('All mobility cases, follow-ups, linked plans, document reminders and reusable details cleared from this browser. Downloaded copies, calendar entries and the separate simple checklist are managed separately.', 'इस ब्राउज़र से सभी मोबिलिटी केस, फ़ॉलो-अप, जुड़ी योजनाएँ, दस्तावेज़ अनुस्मारक और दोबारा उपयोग जानकारी साफ़ हुई। डाउनलोड प्रतियाँ, कैलेंडर प्रविष्टियाँ और अलग सरल सूची अलग संभाली जाती हैं।'));
    } catch (cause) { if (!controller.signal.aborted && sessionActive.current) fail(cause); }
    finally { if (pendingClear.current === controller) pendingClear.current = null; if (sessionActive.current) setClearing(false); }
  }
  function endCurrentSession() { sessionActive.current = false; pendingClear.current?.abort(); onEndSession(language); }
  function localAction(value: MobilityCasePatch, event: CaseUpdateEvent) {
    if (!base) return false;
    const changesDetails = value.facts !== undefined || value.jurisdiction !== undefined;
    try { const next = updateCase(base, { ...patch, ...value, ...(changesDetails && current?.status === 'ready' && value.status === undefined ? { status: 'preparing' as const } : {}) }, now(), event); setBase(next); setPatch({}); setDirty(true); setError(''); setMessage(t('Added to this working case. Save to keep it on this device.', 'इस कार्यरत केस में जोड़ा गया। इस डिवाइस पर रखने के लिए सहेजें।')); return true; }
    catch (cause) { fail(cause); return false; }
  }
  function applyAcknowledgement(review: AcknowledgementReview): boolean {
    if (!current || !base || expiredWorkingCopy) return false;
    let expiredDuringRead = false;
    const id = current.id;
    const observeExpiry = (event: Event) => {
      const detail = (event as CustomEvent<{ operation?: string; expiredIds?: string[] }>).detail;
      if (detail?.operation === 'expire' && detail.expiredIds?.includes(id)) expiredDuringRead = true;
    };
    window.addEventListener(MOBILITY_STORE_EVENT, observeExpiry);
    try {
      const checked = validateAcknowledgementReview(review, current, language);
      if (savedCaseId.current === id) {
        const cases = readCases(); setSaved(cases);
        const latest = cases.find(item => item.id === id);
        if (!latest) {
          if (!expiredDuringRead) {
            savedCaseId.current = null; savedSource.current = null; setBase(null); setPatch({}); setProgressDraft(null); setExternalCase(null); setExpiredWorkingCopy(false); setDirty(false); setConsent(false); setReuseOpen(false); setReuseKeys([]); setReuseSource(null);
            window.history.replaceState(null, '', '/mobility');
          }
          throw new Error(t('This saved case was deleted or expired. The reviewed report was not applied.', 'यह सहेजा केस हट गया या समाप्त हुआ। जाँची रिपोर्ट नहीं जोड़ी गई।'));
        }
        const source = savedSource.current;
        if (!source || storedRevision(latest) !== storedRevision(source) || JSON.stringify(latest) !== JSON.stringify(source)) {
          setExternalCase(latest); setConsent(false);
          throw new Error(t('This saved case changed elsewhere. Compare or reload it before reviewing the report again.', 'यह सहेजा केस दूसरी जगह बदला। रिपोर्ट फिर जाँचने से पहले तुलना करें या फिर खोलें।'));
        }
      }
      const applied = localAction({ status: checked.status, ...(checked.reference !== undefined ? { reference: checked.reference } : {}) }, { kind: 'citizen-report', basis: 'citizen-reported', text: checked.note });
      if (applied) setConsent(false);
      return applied;
    } catch (cause) { fail(cause); return false; }
    finally { window.removeEventListener(MOBILITY_STORE_EVENT, observeExpiry); }
  }
  function persist() {
    if (!base || !consent || expiredWorkingCopy) return;
    savingSnapshot.current = { base, patch, dirty, progress: currentProgress };
    try {
      const next = updateCase(base, patch, now(), { kind: 'updated', text: t('Saved case details on this private device.', 'इस निजी डिवाइस पर केस जानकारी सहेजी।'), basis: 'local' });
      saveCase(next); savedCaseId.current = next.id; savedSource.current = next; setBase(next); setExternalCase(null); setPatch({}); setDirty(false); setSaved(readCases()); setError(''); setMessage(progressDirty ? t('Case details saved. Your update is still unadded; choose “Add my update” before saving it to the case timeline.', 'केस विवरण सहेजे गए। आपका अपडेट अभी नहीं जोड़ा गया; समयरेखा में सहेजने से पहले “मेरा अपडेट जोड़ें” चुनें।') : t('Saved on this device. You can return to this case for 90 days after this save.', 'इस डिवाइस पर सहेजा गया। इस बार सहेजने के बाद 90 दिनों तक लौट सकते हैं।'));
      window.history.replaceState(null, '', `/mobility#case=${encodeURIComponent(next.id)}`);
    } catch (cause) { fail(cause); } finally { savingSnapshot.current = null; }
  }
  function recoverEdits(keys: string[], reviewedSaved: MobilityCase) {
    if (!current || !externalCase || savedCaseId.current !== current.id) return;
    let expiredDuringRead = false;
    const observeExpiry = (event: Event) => {
      const detail = (event as CustomEvent<{ operation?: string; expiredIds?: string[] }>).detail;
      if (detail?.operation === 'expire' && detail.expiredIds?.includes(current.id)) expiredDuringRead = true;
    };
    window.addEventListener(MOBILITY_STORE_EVENT, observeExpiry);
    try {
      const latest = readCases().find(item => item.id === current.id);
      if (!latest) {
        if (expiredDuringRead) { setError(''); return; }
        savedCaseId.current = null; savedSource.current = null; setBase(null); setPatch({}); setExternalCase(null); setProgressDraft(null); setDirty(false); setConsent(false); setReuseOpen(false); setReuseKeys([]); setReuseSource(null);
        window.history.replaceState(null, '', '/mobility');
        throw new Error(t('This case was deleted or expired. Its old identity cannot be restored.', 'यह केस हटाया गया या समाप्त हुआ। इसकी पुरानी पहचान वापस नहीं लाई जा सकती।'));
      }
      if (storedRevision(latest) !== storedRevision(reviewedSaved) || JSON.stringify(latest) !== JSON.stringify(reviewedSaved)) {
        setExternalCase(latest);
        throw new Error(t('The saved case changed again. Review the refreshed comparison and select your edits again.', 'सहेजा केस फिर बदला। नई तुलना की समीक्षा करके बदलाव फिर चुनें।'));
      }
      const recovered = prepareCaseRecovery(current, latest, keys);
      savedSource.current = latest; setBase(latest); setPatch(recovered); setExternalCase(null); setDirty(true); setConsent(false); setError('');
      setReuseOpen(false); setReuseKeys([]); setReuseSource(null);
      setMessage(t('Selected edits are in a working draft based on the latest saved version. Review the facts and wording, then choose to save. Your unadded update remains in its editor.', 'चुने बदलाव नवीनतम सहेजे संस्करण पर बने कार्यरत मसौदे में हैं। तथ्य और भाषा जाँचें, फिर सहेजना चुनें। बिना जोड़ा अपडेट अपने संपादक में है।'));
    } catch (cause) { fail(cause); }
    finally { window.removeEventListener(MOBILITY_STORE_EVENT, observeExpiry); }
  }
  function removeCurrent() {
    if (!current || !window.confirm(t('Delete this case from this device? Download your note first if you need a copy.', 'इस डिवाइस से यह केस हटाएँ? प्रति चाहिए तो पहले नोट डाउनलोड करें।'))) return;
    try { deleteCase(current.id); deleteFollowUp(current.id); savedCaseId.current = null; savedSource.current = null; setSaved(readCases()); setBase(null); setPatch({}); setProgressDraft(null); setDirty(false); setExpiredWorkingCopy(false); setConsent(false); setError(''); setMessage(t('Case and its follow-up notes deleted from this device.', 'इस डिवाइस से केस और उसके फ़ॉलो-अप नोट हटाए गए।')); window.history.replaceState(null, '', '/mobility'); } catch (cause) { fail(cause); }
  }
  function exportNote() {
    if (!base) return;
    try {
      const checked = updateCase(base, patch, now());
      const text = buildCaseNote(checked, language);
      const unadded = currentProgress ? `\n\n${t('Unadded update draft — not part of the case timeline', 'बिना जोड़ा अपडेट मसौदा — केस समयरेखा का भाग नहीं')}\n${t('Progress selected for this unadded draft', 'इस बिना जोड़े मसौदे के लिए चुनी प्रगति')}: ${statusCopy[currentProgress.status][language]}\n${currentProgress.text}` : '';
      downloadText(text + unadded, `mobility-case-${checked.id}.txt`);
      setMessage(t('Downloaded. The file includes your case details; keep it somewhere private.', 'डाउनलोड हो गया। फ़ाइल में आपकी केस जानकारी है; इसे निजी स्थान पर रखें।'));
    } catch (cause) { fail(cause); }
  }
  function commitProfile() {
    if (!profileEdit || !profileConsent || profileConflict) return;
    try {
      const latest = readProfile();
      if (profileSource.current === undefined || !sameProfile(profileSource.current, latest)) {
        observeSavedProfile(latest); setProfileConflict(true); setProfileConsent(false);
        throw new Error(t('Reusable details changed. Your working profile is still shown; reload the saved details before saving.', 'दोबारा उपयोग की जानकारी बदली। आपकी कार्यरत प्रोफ़ाइल अभी दिख रही है; सहेजने से पहले सहेजी जानकारी फिर लोड करें।'));
      }
      const next = validateProfile({ ...profileEdit, language, updatedAt: now() });
      committingProfile.current = true; saveProfile(next); profileSource.current = next; observedProfile.current = next;
      setProfile(next); setProfileEdit(next); setProfileConflict(false); setProfileConsent(false); setError(''); setMessage(t('Reusable details saved. Existing cases were not changed. Open an unfinished case to review and reuse these details.', 'दोबारा उपयोग की जानकारी सहेजी। पुराने केस नहीं बदले। अधूरा केस खोलकर जानकारी की समीक्षा और उपयोग करें।'));
    } catch (cause) { fail(cause); } finally { committingProfile.current = false; }
  }
  function reloadProfile() {
    try { const latest = readProfile(); observeSavedProfile(latest); profileSource.current = latest; setProfileEdit(latest ?? blankProfile(language)); setProfileConflict(false); setProfileConsent(false); setError(''); }
    catch (cause) { fail(cause); }
  }
  function reviewReusableDetails() {
    setReuseKeys([]);
    if (reuseOpen) { setReuseOpen(false); setReuseSource(null); return; }
    try { const latest = readProfile(); observeSavedProfile(latest); setReuseSource(latest); setReuseChanged(false); setReuseOpen(true); setError(''); }
    catch (cause) { fail(cause); }
  }
  const reusableFacts: CaseFact[] = reuseSource ? [
    ...(reuseSource.name ? [{ key: 'profile_name', label: t('Name', 'नाम'), value: reuseSource.name, source: 'profile' as const, confirmed: true }] : []),
    ...(reuseSource.address ? [{ key: 'profile_address', label: t('Address', 'पता'), value: reuseSource.address, source: 'profile' as const, confirmed: true }] : []),
    ...reuseSource.vehicles.map(vehicle => ({ key: `vehicle_${vehicle.id}`, label: vehicle.label || t('Vehicle', 'वाहन'), value: vehicle.registration, source: 'profile' as const, confirmed: true })),
  ] : [];
  function applyProfile() {
    if (!current || current.status === 'completed' || !reuseSource || !reuseKeys.length) return;
    try {
      const latest = readProfile();
      if (!sameProfile(reuseSource, latest)) { observeSavedProfile(latest); setReuseKeys([]); setReuseSource(latest); setReuseChanged(true); throw new Error(t('Reusable details changed. Review the current values and select them again before using them.', 'दोबारा उपयोग की जानकारी बदली। उपयोग से पहले वर्तमान मान जाँचें और फिर चुनें।')); }
      const selected = reusableFacts.filter(fact => reuseKeys.includes(fact.key));
      if (localAction({ facts: [...current.facts.filter(fact => !selected.some(next => next.key === fact.key)), ...selected] }, { kind: 'updated', basis: 'local', text: t('Reviewed and copied selected reusable details into this case.', 'चुनी हुई दोबारा उपयोग की जानकारी की समीक्षा कर इस केस में जोड़ी।') })) { setReuseOpen(false); setReuseKeys([]); setReuseSource(null); setReuseChanged(false); }
    } catch (cause) { fail(cause); }
  }
  const activeCount = saved.filter(value => value.status !== 'completed').length;
  const attentionCount = saved.filter(needsAttention).length;
  const matchingCases = searchMobilityCases(saved, caseSearch);

  return <PublicBetaShell language={language} setLanguage={setLanguage} service="Your mobility cases" serviceHindi="आपके मोबिलिटी केस">
    <main className={styles.main}>
      <header className={styles.hero}>
        <div><span className={styles.eyebrow}><FolderOpen size={16} /> {t('YOUR MOBILITY, IN ONE PLACE', 'आपकी मोबिलिटी, एक जगह')}</span><h1>{t('One task. A clear next step.', 'एक काम। अगला कदम स्पष्ट।')}</h1><p>{t('Prepare what you need, keep your details together and pick up where you left off.', 'ज़रूरी तैयारी करें, अपनी जानकारी साथ रखें और जहाँ छोड़ा था वहीं से आगे बढ़ें।')}</p></div>
        <span className={styles.mode}>{t('Guest mode · no account needed', 'अतिथि मोड · खाता ज़रूरी नहीं')}</span>
      </header>
      <nav className={styles.navigation} aria-label={t('Mobility tools', 'मोबिलिटी उपकरण')}><a href="/review">{t('Review a document', 'दस्तावेज़ की समीक्षा')} <ArrowRight size={14} /></a><a href="/dashboard">{t('Simple checklist', 'सरल सूची')}</a><a href="/account">{t('Account & sync · optional', 'खाता और सिंक · वैकल्पिक')}</a><a href="/demo">{t('Try the Test Lab', 'टेस्ट लैब आज़माएँ')}</a></nav>
      <div className={styles.sessionControls}><button type="button" onClick={endCurrentSession} aria-describedby="session-clear-help">{t('Clear this session', 'यह सत्र साफ़ करें')}</button><small id="session-clear-help">{t('Clears unsaved work and covers this tab. Saved device data remains.', 'बिना सहेजा काम साफ़ करके यह टैब ढकता है। सहेजा डिवाइस डेटा रहता है।')}</small></div>
      {error && <div role="alert" className={`${styles.notice} ${styles.error}`}>{error} {current && (dirty || progressDirty) && t('Your working edits are still here. Download a note before reloading if needed.', 'कार्यरत बदलाव यहीं हैं। ज़रूरत हो तो रीलोड से पहले नोट डाउनलोड करें।')}</div>}
      <div role="status" aria-live="polite">{message && <div className={styles.notice}>{message}</div>}</div>
      {clearing && <p role="status" className={styles.notice}>{t('Clearing saved mobility data… Working controls are paused. Clear this session to cancel any steps that have not completed.', 'सहेजा मोबिलिटी डेटा साफ़ हो रहा है… कार्यरत नियंत्रण रुके हैं। अधूरे चरण रोकने के लिए यह सत्र साफ़ करें।')}</p>}
      <div inert={clearing} aria-busy={clearing} data-mobility-working-controls>
      <AgendaPanel language={language} onOpenCase={id => {
        try { const item = readCases().find(value => value.id === id); if (!item) throw new Error(t('That saved case was deleted or expired.', 'वह सहेजा केस हट गया या समाप्त हुआ।')); openCase(item); }
        catch (cause) { fail(cause); }
      }} onOpenRenewals={() => {
        const details = renewalSection.current?.querySelector('details');
        const summary = details?.querySelector('summary');
        if (details && summary) { if (!details.open) summary.click(); summary.focus(); details.scrollIntoView({ block: 'start', behavior: 'instant' }); }
      }} />
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <section aria-labelledby="saved-cases-title" data-empty={saved.length === 0}><div className={styles.sidebarHeading}><h2 id="saved-cases-title">{t('Saved cases', 'सहेजे गए केस')}</h2><span>{activeCount} {t('open', 'जारी')}</span></div>
            {attentionCount > 0 && <p className={styles.badge + ' ' + styles.attention}>{attentionCount} {t('need your attention', 'में आपका ध्यान चाहिए')}</p>}
            {saved.length > 0 && <label className={styles.stack}>{t('Find a saved case', 'सहेजा मामला खोजें')}<input type="search" maxLength={160} value={caseSearch} onChange={event => setCaseSearch(event.target.value)} placeholder={t('Name, vehicle or reference', 'नाम, वाहन या संदर्भ')} /></label>}
            {caseSearch && matchingCases.length === 0 && <p role="status">{t('No saved case matches. Try a shorter word or registration.', 'कोई सहेजा मामला नहीं मिला। छोटा शब्द या वाहन नंबर आज़माएँ।')}</p>}
            <div className={styles.caseList}>{[...matchingCases].sort((a, b) => Number(needsAttention(b)) - Number(needsAttention(a)) || b.updatedAt.localeCompare(a.updatedAt)).map(item => <button type="button" className={styles.caseCard} key={item.id} aria-current={current?.id === item.id ? 'true' : undefined} data-attention={needsAttention(item)} onClick={() => openCase(item)}><strong>{item.title}</strong><span className={`${styles.badge} ${needsAttention(item) ? styles.attention : ''}`}>{needsAttention(item) ? t('Needs your attention', 'आपका ध्यान चाहिए') : statusCopy[item.status][language]}</span><small>{item.jurisdiction || t('State not added', 'राज्य नहीं जोड़ा')}{item.followUpDate ? ` · ${item.followUpDate}` : ''}</small></button>)}</div>
            {saved.length === 0 && <div className={styles.empty}><FolderOpen size={23} /><h3>{t('Start with one task', 'एक काम से शुरू करें')}</h3><p>{t('Cases appear here only after you choose to save them on this device.', 'इस डिवाइस पर सहेजने के बाद ही केस यहाँ दिखाई देंगे।')}</p></div>}
            {current && <div className={styles.actions}><button type="button" onClick={newCase}><Plus size={16} />{t('New case', 'नया केस')}</button></div>}
          </section>
          <FollowUpInbox cases={saved} language={language} onOpenCase={id => { const item = saved.find(value => value.id === id); if (item) openCase(item); }} />
          {ready && <div ref={renewalSection} style={{ display: 'contents' }}><RenewalPanel language={language} onCountChange={setRenewalCount} onStartLicenceRenewal={record => { void startRenewalCase(record); }} /></div>}
          {ready && <JourneyPanel language={language} onCountChange={setJourneyCount} onOpenCase={id => { const item = saved.find(value => value.id === id); if (item) openCase(item); }} />}
          <details className={styles.profile} onToggle={event => { if (event.currentTarget.open && !profileEdit) setProfileEdit(profile ?? blankProfile(language)); }}>
            <summary>{t('Reusable details · optional', 'दोबारा उपयोग की जानकारी · वैकल्पिक')}</summary>
            <p>{t('Save only details you want to review and reuse. No case changes automatically.', 'केवल वही जानकारी रखें जिसे जाँचकर दोबारा उपयोग करना चाहते हैं। कोई केस अपने-आप नहीं बदलेगा।')}</p>
            {profileEdit && <div className={styles.stack}>
              {profileConflict && <div role="status" className={styles.notice}><p>{t('Saved reusable details changed. Your working profile is still shown. Reloading replaces these fields with the latest saved details and clears save consent.', 'सहेजी दोबारा उपयोग की जानकारी बदली। आपकी कार्यरत प्रोफ़ाइल अभी दिख रही है। फिर लोड करने पर ये फ़ील्ड नवीनतम सहेजी जानकारी से बदलेंगे और सहेजने की सहमति हटेगी।')}</p><button type="button" onClick={reloadProfile}>{t('Reload saved reusable details', 'सहेजी दोबारा उपयोग जानकारी फिर लोड करें')}</button></div>}
              <label>{t('Name', 'नाम')}<input maxLength={160} value={profileEdit.name} onChange={event => setProfileEdit({ ...profileEdit, name: event.target.value })} autoComplete="off" /></label>
              <label>{t('Address', 'पता')}<textarea aria-label={t('Address', 'पता')} maxLength={2000} rows={3} value={profileEdit.address} onChange={event => setProfileEdit({ ...profileEdit, address: event.target.value })} autoComplete="off" /></label>
              {profileEdit.vehicles.map((vehicle, index) => <div className={styles.vehicle} key={vehicle.id}><label>{t('Vehicle label', 'वाहन का नाम')}<input maxLength={160} value={vehicle.label} onChange={event => setProfileEdit({ ...profileEdit, vehicles: profileEdit.vehicles.map((value, at) => at === index ? { ...value, label: event.target.value } : value) })} /></label><label>{t('Registration', 'पंजीकरण नंबर')}<input maxLength={160} value={vehicle.registration} onChange={event => setProfileEdit({ ...profileEdit, vehicles: profileEdit.vehicles.map((value, at) => at === index ? { ...value, registration: event.target.value } : value) })} /></label><button type="button" onClick={() => setProfileEdit({ ...profileEdit, vehicles: profileEdit.vehicles.filter(value => value.id !== vehicle.id) })}>{t('Remove vehicle', 'वाहन हटाएँ')}</button></div>)}
              <button type="button" disabled={profileEdit.vehicles.length >= 20} onClick={() => setProfileEdit({ ...profileEdit, vehicles: [...profileEdit.vehicles, { id: newId(), label: '', registration: '' }] })}><Plus size={15} />{t('Add a vehicle', 'वाहन जोड़ें')}</button>
              <label className={styles.check}><input type="checkbox" checked={profileConsent} onChange={event => setProfileConsent(event.target.checked)} />{t('This is my private device. Store these details unencrypted in this browser for up to 90 days.', 'यह मेरा निजी डिवाइस है। ये जानकारी इस ब्राउज़र में बिना एन्क्रिप्शन अधिकतम 90 दिन रखें।')}</label>
              <button type="button" className={styles.primary} disabled={!profileConsent || profileConflict} onClick={commitProfile}>{t('Save reusable details', 'दोबारा उपयोग की जानकारी सहेजें')}</button>
              {profile && <small>{t('Open an unfinished case and choose “Review reusable details” to apply changes. Completed cases are excluded.', 'अधूरा केस खोलकर “दोबारा उपयोग की जानकारी जाँचें” चुनें। पूरे केस इसमें शामिल नहीं हैं।')}</small>}
            </div>}
          </details>
          {profile && saved.length > 0 && <ProfileCorrectionsPanel language={language} />}
          <PortableCaseImport key={current?.id ?? 'new'} language={language} onOpen={openImportedCase} />
        </aside>
        <div className={styles.content}>
          {!current ? <section className={styles.panel} aria-labelledby="start-case-title"><span className={styles.eyebrow}>{t('START HERE', 'यहाँ से शुरू करें')}</span><h2 id="start-case-title">{t('What do you need to do?', 'आपको क्या करना है?')}</h2><p>{t('Tell us in your own words, or choose a service below.', 'अपने शब्दों में बताएँ या नीचे सेवा चुनें।')}</p>
            <div className={styles.stack}><label>{t('Your task', 'आपका काम')}<textarea aria-label={t('Your task', 'आपका काम')} disabled={!ready} rows={3} maxLength={2000} placeholder={t('For example: I bought a used car, or my licence is expiring', 'जैसे: मैंने पुरानी कार खरीदी है, या मेरा लाइसेंस समाप्त हो रहा है')} value={intent} onChange={event => { setIntent(event.target.value); setInference(null); }} /></label><button type="button" disabled={!ready} onClick={() => { const result = inferService(intent); setInference(result); if (result.kind) setKind(result.kind); }}>{t('Find a starting point', 'शुरुआती सेवा खोजें')}<ArrowRight size={16} /></button></div>
            {ready && <TaskIntakeReview text={intent} language={language} onReview={acceptIntakeReview} />}
            {manualJurisdictionDiffers && <p role="status">{t('The state or authority you entered below will be used for this plan. The different value from your task stays in the original note and will not be copied as a confirmed detail.', 'इस योजना में नीचे दर्ज राज्य या प्राधिकरण उपयोग होगा। आपके काम में लिखा अलग मान मूल नोट में रहेगा और पुष्टि किए विवरण के रूप में कॉपी नहीं होगा।')}</p>}
            {inference && <div className={styles.reuse}><h3>{inference.kind ? t('Suggested starting point', 'सुझाई गई शुरुआती सेवा') : t('Choose what you want to handle first', 'पहले किस काम पर ध्यान देना है चुनें')}</h3><p>{inference.kind ? t('Review this suggestion before creating a case.', 'केस बनाने से पहले सुझाव जाँचें।') : t('Your task could involve more than one service. Each service has its own case and official steps.', 'आपके काम में एक से अधिक सेवाएँ हो सकती हैं। हर सेवा का अपना केस और आधिकारिक चरण हैं।')}</p><div className={styles.choices}>{inference.choices.map(value => <button type="button" key={value} className={styles.choice} aria-pressed={kind === value} onClick={() => setKind(value)}>{getService(value).title[language]}</button>)}</div></div>}
            <hr className={styles.divider} /><div className={styles.formGrid}><label>{t('Service', 'सेवा')}<select value={kind} onChange={event => setKind(event.target.value as ServiceKind)}>{SERVICE_KINDS.map(value => <option value={value} key={value}>{getService(value).title[language]}</option>)}</select></label><label>{t('State / authority, if known', 'राज्य / प्राधिकरण, यदि मालूम हो')}<input list="mobility-states" maxLength={160} value={jurisdiction} onChange={event => setJurisdiction(event.target.value)} placeholder={t('You can add it later', 'बाद में जोड़ सकते हैं')} /></label></div><p className={styles.footnote}>{t('Use the state or issuer named in your record. A vehicle number does not establish jurisdiction.', 'रिकॉर्ड पर लिखे राज्य या जारीकर्ता का उपयोग करें। वाहन नंबर से क्षेत्राधिकार तय नहीं होता।')}</p><button type="button" disabled={!ready} className={styles.primary} onClick={() => startCase()}>{t('Create my plan', 'मेरी योजना बनाएँ')}<ArrowRight size={17} /></button>
            <hr className={styles.divider} /><h3>{t('A bigger life change?', 'जीवन में कोई बड़ा बदलाव?')}</h3><p>{t('Use a starter plan, then handle each relevant service separately.', 'शुरुआती योजना चुनें, फिर हर ज़रूरी सेवा अलग पूरी करें।')}</p><div className={styles.events}>{LIFE_EVENTS.map(event => <div className={styles.lifeEvent} key={event.id}><h3>{event.title[language]}</h3><p>{event.description[language]}</p><div className={styles.choices}>{event.services.map(value => <button type="button" disabled={!ready} key={value} onClick={() => startCase(value)}>{getService(value).title[language]}<ArrowRight size={14} /></button>)}</div></div>)}</div>
          </section> : <section className={styles.panel} aria-labelledby="case-title">
            {expiredWorkingCopy && <div className={styles.notice} role="status"><p>{t('This saved case expired. Your unsaved working copy is kept only in this tab so you can recover it. Download the recovery note before leaving. Saving under the expired case identity is blocked.', 'इस सहेजे केस की अवधि समाप्त हुई। आपके बिना सहेजे बदलाव वापस पाने के लिए केवल इस टैब में रखे हैं। जाने से पहले रिकवरी नोट डाउनलोड करें। समाप्त केस की पहचान पर सहेजना बंद है।')}</p><button type="button" onClick={() => exportNote()}>{t('Download recovery note', 'रिकवरी नोट डाउनलोड करें')}</button></div>}
            {externalCase && <div className={styles.notice}><p role="status">{t('This saved case changed elsewhere. Your current edits are still here. Compare the versions to recover selected edits, or reload the saved version.', 'यह सहेजा केस दूसरी जगह बदला। आपके वर्तमान बदलाव यहीं हैं। चुने बदलाव वापस लाने के लिए तुलना करें या सहेजा संस्करण फिर खोलें।')}</p><button type="button" onClick={() => { try { const latest = readCases().find(item => item.id === externalCase.id); if (latest) openCase(latest); } catch (cause) { fail(cause); } }}>{t('Reload saved version', 'सहेजा संस्करण फिर खोलें')}</button><CaseRecoveryPanel working={current} saved={externalCase} language={language} onRecover={recoverEdits} /></div>}
            <div className={styles.titleRow}><div><span className={styles.eyebrow}>{t('YOUR WORKING CASE', 'आपका कार्यरत केस')}</span><h2 id="case-title" tabIndex={-1} ref={editorHeading}>{current.title}</h2><span className={styles.badge}>{statusCopy[current.status][language]}</span></div><span className={styles.badge}>{dirty || progressDirty ? t('Unsaved changes', 'बदलाव सहेजे नहीं') : t('Saved on this device', 'इस डिवाइस पर सहेजा')}</span></div>
            <p>{getService(current.service).description[language]}</p><div className={styles.notice}>{t('This is your preparation plan. You carry out official actions yourself; no official status is checked here.', 'यह आपकी तैयारी योजना है। आधिकारिक कार्य आप स्वयं करते हैं; यहाँ आधिकारिक स्थिति की जाँच नहीं होती।')}</div>
            <div className={styles.formGrid}><label>{t('Case title', 'केस का शीर्षक')}<input maxLength={160} value={current.title} onChange={event => edit({ title: event.target.value })} /></label><label>{t('State / issuing authority', 'राज्य / जारीकर्ता प्राधिकरण')}<input data-case-source="case:jurisdiction" list="mobility-states" maxLength={160} value={current.jurisdiction} onChange={event => edit({ jurisdiction: event.target.value })} placeholder={t('Confirm from your record', 'अपने रिकॉर्ड से पुष्टि करें')} /></label></div>
            <ol className={styles.steps}>{getService(current.service).steps.map(step => <li key={step.id}><h3>{step.title[language]}</h3><p>{step.detail[language]}</p><label className={styles.check}><input type="checkbox" data-case-source="case:progress" checked={current.completedSteps.includes(step.id)} onChange={event => edit({ completedSteps: event.target.checked ? [...current.completedSteps, step.id] : current.completedSteps.filter(value => value !== step.id) })} />{t('I have done this preparation step', 'मैंने तैयारी का यह चरण पूरा किया')}</label></li>)}</ol>
            <a className={styles.button} href={getService(current.service).sourceUrl} target="_blank" rel="noopener noreferrer" onClick={() => localAction({}, { kind: 'official-opened', basis: 'local', text: t('Opened the official information link. No official result was checked.', 'आधिकारिक जानकारी का लिंक खोला। कोई आधिकारिक परिणाम जाँचा नहीं गया।') })}>{t('Open official information', 'आधिकारिक जानकारी खोलें')}<ExternalLink size={15} /></a><p className={styles.footnote}>{getService(current.service).sourceLabel} · {t('Requirements depend on the state and service.', 'आवश्यकताएँ राज्य और सेवा पर निर्भर हैं।')}</p>
            <details className={styles.disclosure} open><summary>{t('Review details and prepared note', 'जानकारी और तैयार नोट जाँचें')}</summary><div className={styles.stack}>
              <p>{t('Only include what this case needs. Do not enter passwords, OTPs, card details or full identity-document numbers.', 'केवल इस केस के लिए ज़रूरी जानकारी डालें। पासवर्ड, OTP, कार्ड विवरण या पूरे पहचान-दस्तावेज़ नंबर न डालें।')}</p>
              {profile && <button type="button" disabled={current.status === 'completed'} onClick={reviewReusableDetails}>{t('Review reusable details', 'दोबारा उपयोग की जानकारी जाँचें')}</button>}
              {reuseOpen && <div className={styles.reuse}><h3>{t('Choose details for this case', 'इस केस के लिए जानकारी चुनें')}</h3><p>{t('Check each value. Selected profile fields replace only earlier copies of those same profile fields; your document readings stay separate.', 'हर मान जाँचें। चुनी हुई प्रोफ़ाइल जानकारी केवल उसकी पुरानी प्रतियाँ बदलेगी; दस्तावेज़ से पढ़ी जानकारी अलग रहेगी।')}</p>{reuseChanged && <p role="status">{t('Saved reusable details changed. Check the current values and select them again.', 'सहेजी दोबारा उपयोग की जानकारी बदली। वर्तमान मान जाँचें और फिर चुनें।')}</p>}{reusableFacts.length === 0 && <p>{t('Add and save a name, address or vehicle first.', 'पहले नाम, पता या वाहन जोड़कर सहेजें।')}</p>}{reusableFacts.map(fact => <label className={styles.check} key={fact.key}><input type="checkbox" checked={reuseKeys.includes(fact.key)} onChange={event => setReuseKeys(event.target.checked ? [...reuseKeys, fact.key] : reuseKeys.filter(value => value !== fact.key))} /><span><strong>{fact.label}:</strong> {fact.value}</span></label>)}<div className={styles.actions}><button type="button" disabled={!reuseKeys.length} onClick={applyProfile}>{t('Use these reviewed details', 'यह जाँची हुई जानकारी उपयोग करें')}</button></div></div>}
              {current.facts.map((fact, index) => <div className={styles.fact} key={fact.key}><label>{fact.label}<input data-case-source={`fact:${fact.key}`} maxLength={2000} value={fact.value} onChange={event => edit({ facts: current.facts.map((value, at) => at === index ? { ...value, value: event.target.value, source: 'citizen', confirmed: false } : value) })} /></label><button type="button" aria-label={`${t('Remove', 'हटाएँ')} ${fact.label}`} onClick={() => edit({ facts: current.facts.filter(value => value.key !== fact.key) })}><Trash2 size={16} /></button><small>{fact.source === 'document' ? t('Read from your document', 'आपके दस्तावेज़ से पढ़ा') : fact.source === 'profile' ? t('Copied from your reusable details', 'आपकी दोबारा उपयोग जानकारी से लिया') : t('Entered or edited by you', 'आपने दर्ज या संपादित किया')}{fact.page ? ` · ${t('page', 'पृष्ठ')} ${fact.page}` : ''}</small><label className={styles.check}><input type="checkbox" checked={fact.confirmed} onChange={event => edit({ facts: current.facts.map((value, at) => at === index ? { ...value, confirmed: event.target.checked } : value) })} />{t('I checked this detail', 'मैंने यह जानकारी जाँची')}</label></div>)}
              <button type="button" data-case-source="case:facts" disabled={current.facts.length >= 100} onClick={() => edit({ facts: [...current.facts, { key: `detail_${newId()}`, label: t('Additional detail', 'अतिरिक्त जानकारी'), value: '', source: 'citizen', confirmed: false }] })}><Plus size={15} />{t('Add a detail', 'जानकारी जोड़ें')}</button>
              {current.status === 'preparing' && current.draft.trim() && <p className={styles.notice}>{t('Review your request wording before marking preparation ready. Changed details do not automatically rewrite your draft.', 'तैयारी पूरी चिह्नित करने से पहले अनुरोध के शब्द जाँचें। जानकारी बदलने पर मसौदा अपने-आप नहीं बदलता।')}</p>}
              <label>{t('Your editable request / preparation note', 'आपका संपादन योग्य अनुरोध / तैयारी नोट')}<textarea data-case-source="case:draft" aria-label={t('Your editable request / preparation note', 'आपका संपादन योग्य अनुरोध / तैयारी नोट')} rows={7} maxLength={16000} value={current.draft} onChange={event => edit({ draft: event.target.value })} placeholder={t('Describe your request, what you observed and what needs clarification.', 'अपना अनुरोध, अवलोकन और ज़रूरी स्पष्टीकरण लिखें।')} /></label><small>{t('A personal draft; no request has been sent. Keep original attachments separately.', 'निजी मसौदा; कोई अनुरोध भेजा नहीं गया है। मूल संलग्नक अलग रखें।')}</small>
              <button type="button" onClick={() => localAction({ status: 'ready' }, { kind: 'prepared', basis: 'local', text: t('Marked the preparation ready for my next step.', 'अपनी अगली कार्रवाई के लिए तैयारी पूरी चिह्नित की।') })}>{t('Mark preparation ready', 'तैयारी पूरी चिह्नित करें')}</button>
            </div></details>
            <CaseTeamPanel caseValue={current} language={language} onReviewSources={reviewSources} />
            <CaseBriefPanel caseValue={current} language={language} />
            <FormCopyPanel caseValue={current} language={language} />
            <SourceCheckPanel caseValue={current} language={language} />
            <FollowUpPanel caseValue={current} language={language} />
            <AcknowledgementPanel caseValue={current} language={language} onApply={applyAcknowledgement} />
            <EffortPanel key={current.id} service={current.service} language={language} />
            <PortableCaseExport caseValue={current} language={language} />
            <details className={styles.disclosure}><summary>{t('Follow-up and what happened', 'फ़ॉलो-अप और क्या हुआ')}</summary><div className={styles.stack}><p>{t('Record what you did or received. These updates are reported by you, not verified official status. Dates are personal reminders visible when you return; no automatic monitoring or messages.', 'आपने जो किया या प्राप्त किया उसे दर्ज करें। ये आपकी सूचना है, सत्यापित आधिकारिक स्थिति नहीं। तारीखें लौटने पर दिखने वाले निजी अनुस्मारक हैं; स्वचालित निगरानी या संदेश नहीं।')}</p><div className={styles.formGrid}><label>{t('Actual reference, if received', 'वास्तविक संदर्भ, यदि मिला हो')}<input value={current.reference} maxLength={160} onChange={event => edit({ reference: event.target.value })} /></label><label>{t('My follow-up date', 'मेरी फ़ॉलो-अप तारीख')}<input type="date" value={current.followUpDate} onChange={event => edit({ followUpDate: event.target.value })} /></label></div><label>{t('What happened?', 'क्या हुआ?')}<textarea aria-label={t('What happened?', 'क्या हुआ?')} rows={3} maxLength={1000} value={report} onChange={event => setProgressDraft({ caseId: current.id, text: event.target.value, status: reportedStatus })} placeholder={t('For example: I submitted my request on the official website and kept the acknowledgement.', 'जैसे: मैंने आधिकारिक वेबसाइट पर अनुरोध जमा किया और पावती रख ली।')} /></label><label>{t('My case progress', 'मेरे केस की प्रगति')}<select value={reportedStatus} onChange={event => setProgressDraft({ caseId: current.id, text: report, status: event.target.value as CaseStatus })}>{(['awaiting-response', 'needs-attention', 'completed', 'preparing'] as const).map(value => <option key={value} value={value}>{statusCopy[value][language]}</option>)}</select></label><button type="button" disabled={!report.trim()} onClick={() => { if (localAction({ status: reportedStatus }, { kind: 'citizen-report', basis: 'citizen-reported', text: report })) setProgressDraft(null); }}>{t('Add my update', 'मेरा अपडेट जोड़ें')}</button></div></details>
            <VisitPreparationPanel caseValue={current} language={language} onAppointmentChange={appointment => edit({ appointment })} />
            <details className={styles.disclosure}><summary>{t('Case timeline', 'केस की समयरेखा')} ({current.events.length})</summary><ol className={styles.timeline}>{[...current.events].reverse().map(event => <li key={event.id}><span className={styles.badge}>{event.basis === 'citizen-reported' ? t('Reported by you', 'आपकी सूचना') : t('Local preparation', 'स्थानीय तैयारी')}</span><p>{event.text}</p><small>{new Date(event.at).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN')}</small></li>)}</ol></details>
            <div className={styles.saveBox}><h3><ShieldCheck size={17} /> {t('Keep this case for later', 'यह केस बाद के लिए रखें')}</h3><p>{t('Saving keeps the readings, source-file fingerprints, draft, reference and timeline unencrypted in this browser. Anyone using this browser may be able to read them. Saved cases expire 90 days after their last save. Original documents are not stored here.', 'सहेजने पर पढ़ी जानकारी, स्रोत फ़ाइल फ़िंगरप्रिंट, मसौदा, संदर्भ और समयरेखा इस ब्राउज़र में बिना एन्क्रिप्शन रहती है। ब्राउज़र इस्तेमाल करने वाला इन्हें पढ़ सकता है। आखिरी बार सहेजने के 90 दिन बाद केस की अवधि समाप्त होती है। मूल दस्तावेज़ यहाँ नहीं रखे जाते।')}</p><label className={styles.check}><input type="checkbox" checked={consent} disabled={expiredWorkingCopy} onChange={event => setConsent(event.target.checked)} />{t('This is my private device. I choose to save this case here.', 'यह मेरा निजी डिवाइस है। मैं इस केस को यहाँ सहेजना चाहता हूँ।')}</label><div className={styles.actions}><button type="button" className={styles.primary} disabled={!consent || expiredWorkingCopy} onClick={persist}>{t('Save case on this device', 'इस डिवाइस पर केस सहेजें')}</button><button type="button" onClick={() => exportNote()}><Download size={16} />{t('Download case note', 'केस नोट डाउनलोड करें')}</button></div></div>
            <div className={styles.destructive}><button type="button" className={styles.danger} onClick={removeCurrent}><Trash2 size={16} />{t('Delete this case', 'यह केस हटाएँ')}</button></div>
          </section>}
        </div>
      </div>
      <datalist id="mobility-states">{JURISDICTIONS.map(state => <option key={state} value={state} />)}</datalist>
      <p className={styles.footnote}>{t('Guest work stays in this tab until you save or download it. On a shared device, leave saving off and clear any downloaded files after use.', 'सहेजने या डाउनलोड करने तक अतिथि काम इसी टैब में रहता है। साझा डिवाइस पर सहेजना बंद रखें और उपयोग के बाद डाउनलोड की फ़ाइलें हटा दें।')}</p>
      </div>
      {(saved.length > 0 || profile || renewalCount > 0 || journeyCount > 0) && <button type="button" className={styles.danger} disabled={clearing} onClick={() => { void clearMobilityData(); }}>{t('Clear all mobility data on this device', 'इस डिवाइस की सभी मोबिलिटी जानकारी साफ़ करें')}</button>}
    </main>
  </PublicBetaShell>;
}
