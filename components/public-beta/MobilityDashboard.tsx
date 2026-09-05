'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, ClipboardList, ShieldCheck, Trash2 } from 'lucide-react';
import { createMobilityTask, decodeTaskStore, encodeTaskStore, TASK_KINDS, TASK_STATUSES, TASK_STORAGE_KEY, taskNeedsAttention, updateMobilityTask, type MobilityTask } from '../../lib/mobility-tasks';
import { PublicBetaShell } from './PublicBetaShell';
import { useClientReady } from '../shared/useClientReady';
import { startSharedDeviceInactivityGuard, type SharedDeviceInactivityGuard } from '../../lib/shared-device-inactivity';
import { createTaskCalendar, parseTaskBackup, TASK_BACKUP_MAX_BYTES, taskDateState, taskKindNames, type TaskBackup } from '../../lib/mobility-continuity';
import styles from './MobilityDashboard.module.css';

type Language = 'en' | 'hi';
const kindNames = taskKindNames;
const statusNames = { preparing: ['Preparing', 'तैयारी जारी'], ready: ['Ready for my next step', 'अगले कदम के लिए तैयार'], 'reported-submitted': ['Submitted · reported by me', 'जमा किया · मेरी सूचना'], 'reply-received': ['Reply received · reported by me', 'उत्तर मिला · मेरी सूचना'], done: ['Done · marked by me', 'पूरा · मेरा चिह्न'] };
const paths = { challan: '/review', fastag: '/fastag', reply: '/reply-review', insurance: '/sources', puc: '/sources', licence: '/sources' };
const isoNow = () => new Date().toISOString();
const todayHere = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };

export default function MobilityDashboard() {
  const ready = useClientReady();
  const [language, setLanguage] = useState<Language>('en');
  const [enabled, setEnabled] = useState(false);
  const [tasks, setTasks] = useState<MobilityTask[]>([]);
  const [kind, setKind] = useState<MobilityTask['kind']>('challan');
  const [date, setDate] = useState('');
  const [message, setMessage] = useState<'' | 'expired' | 'blocked' | 'saved' | 'save-failed' | 'deleted' | 'delete-failed' | 'invalid-backup' | 'restored' | 'downloaded' | 'download-failed'>('');
  const [pending, setPending] = useState<{ backup: TaskBackup; raw: string; baseline: string } | null>(null);
  const [reading, setReading] = useState(false);
  const [today, setToday] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const enabledRef = useRef(false);
  const generation = useRef(0);
  const guardRef = useRef<SharedDeviceInactivityGuard | null>(null);
  const downloads = useRef(new Set<string>());
  const fileInput = useRef<HTMLInputElement>(null);
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const messages = {
    'expired': t('The old checklist was expired or unreadable and has been cleared.', 'पुरानी सूची की अवधि समाप्त थी या वह पढ़ी नहीं जा सकी; उसे मिटा दिया गया है।'),
    'blocked': t('This browser cannot save a checklist. You can still use every review tool without saving.', 'इस ब्राउज़र में सूची सहेजना संभव नहीं। आप बिना सहेजे सभी समीक्षा टूल उपयोग कर सकते हैं।'),
    'saved': t('Checklist saved on this device.', 'सूची इस डिवाइस पर सहेजी गई।'),
    'save-failed': t('Could not save that change. Your saved checklist has not been updated.', 'बदलाव सहेजा नहीं जा सका। सहेजी सूची नहीं बदली है।'),
    'deleted': t('Saved checklist deleted from this browser.', 'इस ब्राउज़र से सहेजी सूची मिटा दी गई।'),
    'delete-failed': t('Could not delete browser storage. Use your browser site-data settings to clear it.', 'ब्राउज़र संग्रह मिटा नहीं सके। ब्राउज़र की साइट-डेटा सेटिंग से मिटाएँ।'),
    'invalid-backup': t('This backup could not be restored. Choose an unchanged checklist JSON file under 40 KB, with at most 20 tasks and saved within the last 90 days.', 'यह बैकअप बहाल नहीं हो सका। 40 KB से छोटी, पिछले 90 दिनों में सहेजी, बिना बदली सूची JSON फ़ाइल चुनें जिसमें अधिकतम 20 काम हों।'),
    'restored': t('Checklist replaced. The backup keeps its original expiry; a later task change starts a new 90-day period.', 'सूची बदल दी गई। बैकअप की मूल समाप्ति बनी है; बाद में काम बदलने पर नई 90 दिन की अवधि शुरू होगी।'),
    'downloaded': t('Download prepared. Keep the file private; deleting this checklist does not delete downloaded files or calendar events.', 'डाउनलोड तैयार है। फ़ाइल निजी रखें; यह सूची मिटाने से डाउनलोड की गई फ़ाइल या कैलेंडर इवेंट नहीं मिटते।'),
    'download-failed': t('The download could not be prepared. Your saved checklist has not changed.', 'डाउनलोड तैयार नहीं हो सका। सहेजी सूची नहीं बदली है।')
  };
  const name = (pair: string[]) => pair[language === 'hi' ? 1 : 0];
  const lock = useCallback(() => {
    enabledRef.current = false; generation.current += 1;
    setEnabled(false); setTasks([]); setDate(''); setMessage(''); setPending(null); setReading(false);
    if (fileInput.current) fileInput.current.value = '';
    for (const url of downloads.current) URL.revokeObjectURL(url);
    downloads.current.clear();
  }, []);
  const exit = () => { lock(); window.location.replace('/'); };

  useEffect(() => {
    window.addEventListener('pagehide', lock);
    return () => { window.removeEventListener('pagehide', lock); lock(); };
  }, [lock]);
  useEffect(() => {
    if (!enabled) return;
    const guard = startSharedDeviceInactivityGuard({ windowTarget: window, documentTarget: document, isVisible: () => document.visibilityState === 'visible', onExpire: lock });
    guardRef.current = guard;
    const changed = (event: StorageEvent) => {
      if (event.key === TASK_STORAGE_KEY || event.key === null) lock();
    };
    const refreshDate = () => setToday(todayHere());
    window.addEventListener('storage', changed); window.addEventListener('focus', refreshDate);
    const timer = window.setInterval(refreshDate, 60_000);
    return () => { guard.stop(); guardRef.current = null; window.removeEventListener('storage', changed); window.removeEventListener('focus', refreshDate); clearInterval(timer); };
  }, [enabled, lock]);

  const isActive = () => {
    if (!enabledRef.current || !guardRef.current || Date.now() >= guardRef.current.getExpiresAt()) { lock(); return false; }
    return true;
  };

  const open = () => {
    try {
      const raw = localStorage.getItem(TASK_STORAGE_KEY);
      const saved = decodeTaskStore(raw, isoNow());
      if (raw && saved === null) localStorage.removeItem(TASK_STORAGE_KEY);
      // A write probe makes blocked/quota-limited storage visible before a task can appear saved.
      if (!saved) localStorage.setItem(TASK_STORAGE_KEY, encodeTaskStore([], isoNow()));
      setTasks(saved ?? []); enabledRef.current = true; setEnabled(true); setToday(todayHere());
      setMessage(raw && !saved ? 'expired' : '');
      heading.current?.focus();
    } catch { setMessage('blocked'); }
  };
  const mutate = (operation: (current: MobilityTask[]) => MobilityTask[]) => {
    if (!isActive()) return;
    try {
      // Read the latest store at the moment of the action, so a closed/cleared second tab cannot be resurrected.
      const current = decodeTaskStore(localStorage.getItem(TASK_STORAGE_KEY), isoNow());
      if (current === null) { lock(); return; }
      const next = operation(current); localStorage.setItem(TASK_STORAGE_KEY, encodeTaskStore(next, isoNow())); setTasks(next); setMessage('saved'); setPending(null); generation.current += 1; setReading(false);
    } catch { setMessage('save-failed'); }
  };
  const clearSaved = () => {
    try { localStorage.removeItem(TASK_STORAGE_KEY); lock(); setMessage('deleted'); }
    catch { setMessage('delete-failed'); }
  };
  const download = (content: string, filename: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type })); downloads.current.add(url);
    const link = document.createElement('a'); link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => { URL.revokeObjectURL(url); downloads.current.delete(url); }, 1000);
    setMessage('downloaded');
  };
  const exportFile = (taskId?: string) => {
    if (!isActive()) return;
    try {
      const raw = localStorage.getItem(TASK_STORAGE_KEY);
      const backup = raw && parseTaskBackup(raw, isoNow());
      if (!backup) { lock(); return; }
      if (taskId) {
        const task = backup.tasks.find(value => value.id === taskId);
        if (!task) { lock(); return; }
        download(createTaskCalendar(task, isoNow(), language), 'challansakshi-follow-up.ics', 'text/calendar;charset=utf-8');
      } else download(encodeTaskStore(backup.tasks, backup.savedAt), 'challansakshi-checklist.json', 'application/json;charset=utf-8');
    } catch { setMessage('download-failed'); }
  };
  const readBackup = async (file?: File) => {
    if (!isActive()) return;
    const readGeneration = ++generation.current;
    setPending(null); setMessage(''); setReading(false);
    if (!file) return;
    if (file.size > TASK_BACKUP_MAX_BYTES) { setMessage('invalid-backup'); return; }
    try {
      const baseline = localStorage.getItem(TASK_STORAGE_KEY);
      if (!baseline || !parseTaskBackup(baseline, isoNow())) { lock(); return; }
      setReading(true);
      const raw = await file.text();
      if (generation.current !== readGeneration || !isActive()) return;
      if (localStorage.getItem(TASK_STORAGE_KEY) !== baseline) { lock(); return; }
      const backup = parseTaskBackup(raw, isoNow());
      if (!backup) setMessage('invalid-backup');
      else setPending({ backup, raw, baseline });
    } catch { if (generation.current === readGeneration && isActive()) setMessage('invalid-backup'); }
    finally { if (generation.current === readGeneration) setReading(false); }
  };
  const restore = () => {
    if (!isActive() || !pending) return;
    try {
      const current = localStorage.getItem(TASK_STORAGE_KEY);
      if (current !== pending.baseline || !parseTaskBackup(current, isoNow())) { lock(); return; }
      const backup = parseTaskBackup(pending.raw, isoNow());
      if (!backup) { setPending(null); setMessage('invalid-backup'); return; }
      localStorage.setItem(TASK_STORAGE_KEY, encodeTaskStore(backup.tasks, backup.savedAt));
      setTasks(backup.tasks); setPending(null); generation.current += 1; setMessage('restored');
    } catch { setMessage('save-failed'); }
  };
  const active = tasks.filter(task => task.status !== 'done');
  const attention = active.filter(task => taskNeedsAttention(task, today));
  const upcoming = active.filter(task => taskDateState(task, today) === 'upcoming');
  const dateLabels = { overdue: t('Past your chosen date', 'आपकी चुनी तारीख बीत गई'), today: t('Today', 'आज'), upcoming: t('Within 7 days', 'अगले 7 दिनों में'), later: t('Planned ahead', 'आगे के लिए तय'), none: '', done: '' };

  return <PublicBetaShell language={language} setLanguage={setLanguage} service="Your checklist" serviceHindi="आपकी सूची" onQuickExit={exit}>
    <main className={styles.main}>
      <div className={styles.title}><span className={styles.eyebrow}><ClipboardList size={18} aria-hidden="true" />{t('A little less to remember', 'याद रखने का बोझ कम')}</span><h1 ref={heading} tabIndex={-1}>{t('Your mobility checklist', 'आपकी मोबिलिटी सूची')}</h1><p>{t('Keep your next steps together, from checking a challan to following up on a reply.', 'चालान जाँचने से उत्तर पर आगे की कार्रवाई तक, अपने अगले कदम साथ रखें।')}</p></div>
      <nav className={styles.shortcuts} aria-label={t('Start a task', 'काम शुरू करें')}>
        {[['/review', t('Review a challan', 'चालान की समीक्षा')], ['/fastag', t('Check FASTag', 'FASTag जाँचें')], ['/message-check', t('Check a message', 'संदेश जाँचें')], ['/reply-review', t('Review a reply', 'उत्तर की समीक्षा')]].map(([path, label]) => <a key={path} href={path}>{label}<ArrowRight size={18} aria-hidden="true" /></a>)}
      </nav>
      {!enabled ? <section className={styles.consent} aria-labelledby="private-checklist">
        <ShieldCheck size={32} aria-hidden="true" /><h2 id="private-checklist">{t('A checklist on your private device', 'आपके निजी डिवाइस पर एक सूची')}</h2>
        <p>{t('Save task types, your statuses and follow-up dates in this browser. Use a private device: anyone using this browser can open the list. Your documents and review contents are not saved.', 'काम का प्रकार, आपकी स्थिति और फॉलो-अप तारीख इस ब्राउज़र में सहेजें। निजी डिवाइस उपयोग करें: इस ब्राउज़र वाला कोई भी व्यक्ति सूची खोल सकता है। दस्तावेज़ और समीक्षा सामग्री सहेजी नहीं जाती।')}</p>
        <p>{t('Exit hides saved tasks. Delete removes them.', 'बाहर निकलने से सहेजे काम छिपते हैं। मिटाने से वे हटते हैं।')}</p>
        <details className={styles.storageDetails}><summary>{t('How saving works', 'सहेजना कैसे काम करता है')}</summary><p>{t('The checklist is not encrypted or protected by a login. It expires 90 days after your last change and is removed when next opened. Clearing browser site data also removes it. It saves no documents, registrations, message or reply text. There is no account, cross-device sync or background notification.', 'सूची एन्क्रिप्टेड या लॉगिन से सुरक्षित नहीं है। अंतिम बदलाव के 90 दिन बाद अवधि समाप्त होती है और अगली बार खोलने पर मिटती है। ब्राउज़र साइट डेटा साफ़ करने से भी हटती है। दस्तावेज़, पंजीकरण, संदेश या उत्तर का पाठ नहीं सहेजती। खाता, दूसरे डिवाइस पर सिंक या पृष्ठभूमि सूचना नहीं है।')}</p></details>
        <button className={styles.primary} disabled={!ready} onClick={open}>{t('Open checklist on my private device', 'मेरे निजी डिवाइस पर सूची खोलें')}</button>
        <a href="/review">{t('Use a review without saving', 'बिना सहेजे समीक्षा करें')}</a>
      </section> : <>
        <section className={styles.overview} aria-label={t('Checklist overview', 'सूची का अवलोकन')}><div><strong>{active.length}</strong><span>{t('open tasks', 'अधूरे काम')}</span></div><div><strong>{attention.length}</strong><span>{t('follow-ups due', 'फॉलो-अप का समय')}</span></div><div><strong>{upcoming.length}</strong><span>{t('in the next 7 days', 'अगले 7 दिनों में')}</span></div><p>{t('Dates and statuses are entered by you. No official service has been checked, and no notification is sent.', 'तारीख और स्थिति आप दर्ज करते हैं। किसी आधिकारिक सेवा की जाँच नहीं हुई है और कोई सूचना नहीं भेजी जाती।')}</p></section>
        <form className={styles.add} onSubmit={event => { event.preventDefault(); mutate(current => [...current, createMobilityTask({ kind, followUpDate: date }, isoNow(), crypto.randomUUID())]); }}>
          <label>{t('What are you keeping track of?', 'किस काम पर नज़र रखनी है?')}<select value={kind} onChange={event => setKind(event.target.value as MobilityTask['kind'])}>{TASK_KINDS.map(value => <option key={value} value={value}>{name(kindNames[value])}</option>)}</select></label>
          <label>{t('Follow up on (optional)', 'फॉलो-अप तारीख (वैकल्पिक)')}<input type="date" min="2020-01-01" max="2036-12-31" value={date} onChange={event => setDate(event.target.value)} /></label>
          <button className={styles.primary} disabled={tasks.length >= 20} type="submit">{t('Add task', 'काम जोड़ें')}</button>
          <small>{t('Choose a reminder date for yourself. This is not a legal deadline or an automatic renewal check. Up to 20 tasks.', 'अपने लिए याद रखने की तारीख चुनें। यह कानूनी समय सीमा या स्वचालित नवीनीकरण जाँच नहीं है। अधिकतम 20 काम।')}</small>
        </form>
        <section className={styles.tasks} aria-labelledby="saved-task-heading"><h2 id="saved-task-heading">{t('Your next steps', 'आपके अगले कदम')}</h2>
          {!tasks.length && <p className={styles.empty}>{t('Nothing to keep track of yet. Add a task when there is a next step you want to remember.', 'अभी सूची खाली है। याद रखने वाला अगला कदम हो तो काम जोड़ें।')}</p>}
          {[...tasks].sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || (a.followUpDate || '9999').localeCompare(b.followUpDate || '9999')).map(task => <article key={task.id} className={styles.task} data-attention={taskNeedsAttention(task, today)}>
            <div className={styles.taskHeading}><h3>{name(kindNames[task.kind])}</h3>{dateLabels[taskDateState(task, today)] && <span><CalendarDays size={16} aria-hidden="true" />{dateLabels[taskDateState(task, today)]}</span>}</div>
            <div className={styles.fields}><label>{t('My status', 'मेरी स्थिति')}<select aria-label={`${t('My status', 'मेरी स्थिति')}: ${name(kindNames[task.kind])}`} value={task.status} onChange={event => mutate(current => current.map(value => value.id === task.id ? updateMobilityTask(value, { status: event.target.value as MobilityTask['status'] }, isoNow()) : value))}>{TASK_STATUSES.map(value => <option key={value} value={value}>{name(statusNames[value])}</option>)}</select></label>
            <label>{t('My follow-up date', 'मेरी फॉलो-अप तारीख')}<input type="date" min="2020-01-01" max="2036-12-31" value={task.followUpDate} onChange={event => mutate(current => current.map(value => value.id === task.id ? updateMobilityTask(value, { followUpDate: event.target.value }, isoNow()) : value))} /></label></div>
            {task.followUpDate && <div className={styles.calendar}><button aria-label={`${t('Download calendar event', 'कैलेंडर इवेंट डाउनलोड करें')}: ${name(kindNames[task.kind])}`} onClick={() => exportFile(task.id)}><CalendarDays size={17} aria-hidden="true" />{t('Download calendar event', 'कैलेंडर इवेंट डाउनलोड करें')}</button><small>{t('Open the .ics file in your calendar, then choose notifications there. Your calendar may sync this task type and date. Changes here do not update an imported event.', '.ics फ़ाइल अपने कैलेंडर में खोलें और वहीं सूचना चुनें। आपका कैलेंडर काम का प्रकार और तारीख सिंक कर सकता है। यहाँ बदलाव से आयात किया इवेंट नहीं बदलता।')}</small></div>}
            <div className={styles.actions}>{task.status === 'reply-received' || ['challan', 'fastag', 'reply'].includes(task.kind) ? <a href={task.status === 'reply-received' ? '/reply-review' : paths[task.kind]}>{task.status === 'reply-received' ? t('Review your reply', 'उत्तर की समीक्षा करें') : t('Open review tool', 'समीक्षा टूल खोलें')}<ArrowRight size={17} aria-hidden="true" /></a> : <p>{t('Check the expiry and renewal instructions on your original policy, certificate or licence. Keep the renewal receipt.', 'मूल पॉलिसी, प्रमाणपत्र या लाइसेंस पर समाप्ति तारीख और नवीनीकरण निर्देश जाँचें। नवीनीकरण की रसीद रखें।')}</p>}<button aria-label={`${t('Remove', 'हटाएँ')}: ${name(kindNames[task.kind])}`} onClick={() => mutate(current => current.filter(value => value.id !== task.id))}><Trash2 size={17} aria-hidden="true" />{t('Remove', 'हटाएँ')}</button></div>
          </article>)}
        </section>
        <section className={styles.backup} aria-labelledby="checklist-backup-heading">
          <h2 id="checklist-backup-heading">{t('Keep a copy', 'एक प्रति रखें')}</h2>
          <p>{t('Download a small backup of task types, statuses and dates. It contains no documents or review text. Keep it private: the file is not encrypted and remains until you delete it.', 'काम के प्रकार, स्थिति और तारीखों का छोटा बैकअप डाउनलोड करें। इसमें दस्तावेज़ या समीक्षा पाठ नहीं है। इसे निजी रखें: फ़ाइल एन्क्रिप्टेड नहीं है और आपके मिटाने तक रहती है।')}</p>
          <button onClick={() => exportFile()}>{t('Download checklist backup', 'सूची का बैकअप डाउनलोड करें')}</button>
          <details className={styles.restoreDetails}>
            <summary>{t('Restore a checklist backup', 'सूची का बैकअप बहाल करें')}</summary>
            <p>{t('Choose a checklist JSON file to preview. Restoring replaces this browser’s entire checklist after you confirm; it does not merge tasks. The original 90-day expiry is kept.', 'पूर्वावलोकन के लिए सूची JSON फ़ाइल चुनें। पुष्टि के बाद इस ब्राउज़र की पूरी सूची बदल जाएगी; काम मिलाए नहीं जाते। मूल 90 दिन की समाप्ति बनी रहती है।')}</p>
            <label>{t('Choose checklist backup', 'सूची का बैकअप चुनें')}<input ref={fileInput} type="file" accept=".json,application/json" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void readBackup(file); }} /></label>
          </details>
          {pending && <div className={styles.restorePreview} role="region" aria-labelledby="restore-preview-heading">
            <h3 id="restore-preview-heading">{t('Review before replacing', 'बदलने से पहले जाँचें')}</h3>
            <p>{t(`Replace ${tasks.length} saved tasks with these ${pending.backup.tasks.length} tasks.`, `${tasks.length} सहेजे काम इन ${pending.backup.tasks.length} कामों से बदलेंगे।`)}</p>
            <p>{t('Backup last changed', 'बैकअप में अंतिम बदलाव')}: <time dateTime={pending.backup.savedAt}>{new Date(pending.backup.savedAt).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN')}</time></p>
            {pending.backup.tasks.length ? <ul>{pending.backup.tasks.map(task => <li key={task.id}><strong>{name(kindNames[task.kind])}</strong><span>{name(statusNames[task.status])} · {task.followUpDate || t('No follow-up date', 'फॉलो-अप तारीख नहीं')}</span></li>)}</ul> : <p>{t('This backup is empty. Restoring it removes every saved task here.', 'यह बैकअप खाली है। इसे बहाल करने से यहाँ के सभी सहेजे काम हटेंगे।')}</p>}
            <div className={styles.controls}><button className={styles.primary} onClick={restore}>{t('Replace my saved checklist', 'मेरी सहेजी सूची बदलें')}</button><button onClick={() => { generation.current += 1; setPending(null); setReading(false); }}>{t('Cancel restore', 'बहाली रद्द करें')}</button></div>
          </div>}
        </section>
        <div className={styles.controls}><button onClick={lock}>{t('Hide checklist', 'सूची छिपाएँ')}</button><button onClick={clearSaved}>{t('Delete saved checklist', 'सहेजी सूची मिटाएँ')}</button></div>
        <p className={styles.footnote}>{t('Exit and Hide close this view. Saved tasks remain until you delete them, clear site data, or they expire. This checklist does not save or reopen a document review.', 'बाहर और छिपाएँ से यह दृश्य बंद होता है। काम मिटाने, साइट डेटा साफ़ करने या अवधि समाप्त होने तक सहेजे रहते हैं। इस सूची में दस्तावेज़ समीक्षा सहेजी या फिर खोली नहीं जाती।')}</p>
      </>}
      <p role="status" className={styles.message}>{reading ? t('Reading backup on this device…', 'इस डिवाइस पर बैकअप पढ़ा जा रहा है…') : message ? messages[message] : ''}</p>
    </main>
  </PublicBetaShell>;
}
