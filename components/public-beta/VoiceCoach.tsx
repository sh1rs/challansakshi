'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUp, AudioLines, ChevronDown, GripVertical, Maximize2, Mic, MicOff, Minus, RotateCcw, ShieldCheck, Square, Volume2, X } from 'lucide-react';
import { answerCoach, describeCoachStep, getCoachPrompts, type CoachAction, type CoachContext, type VoiceLanguage } from '../../lib/voice-coach';
import { getVoiceUiCopy } from '../../lib/voice-guide-ui-copy';
import { createLocalVoiceInput, type VoiceInputStatus } from '../../lib/local-voice-input';
import { createLocalVoiceOutput } from '../../lib/local-voice-output';
import styles from './VoiceCoach.module.css';
import { useVoiceCoachWindow } from './useVoiceCoachWindow';

type Input = ReturnType<typeof createLocalVoiceInput>;
type Output = ReturnType<typeof createLocalVoiceOutput>;
type Props = { context: CoachContext; revision: string; pageLanguage: 'en' | 'hi'; onAction: (action: CoachAction) => string | null | void };
const languages = [{ code: 'en', label: 'English' }, { code: 'hi', label: 'हिन्दी' }, { code: 'te', label: 'తెలుగు' }] as const;

export default function VoiceCoach({ context, revision, pageLanguage, onAction }: Props) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<VoiceLanguage>(pageLanguage);
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<VoiceInputStatus>('stopped');
  const [speaking, setSpeaking] = useState(false);
  const [setup, setSetup] = useState(false);
  const [consented, setConsented] = useState(false);
  const [question, setQuestion] = useState('');
  const [heard, setHeard] = useState('');
  const [heardViaVoice, setHeardViaVoice] = useState(false);
  const [partial, setPartial] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const [quality, setQuality] = useState<'device' | 'compact' | 'unavailable'>('unavailable');
  const [level, setLevel] = useState(0);
  const input = useRef<Input | null>(null);
  const output = useRef<Output | null>(null);
  const epoch = useRef(0);
  const current = useRef({ context, revision, onAction });
  const utteranceRevision = useRef<string | null>(null);
  const expectedActionRevision = useRef<string | null>(null);
  const speechEnd = useRef<number | null>(null);
  const restoreFocus = useRef(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const copy = getVoiceUiCopy(language);
  const floating = useVoiceCoachWindow();

  useEffect(() => { current.current = { context, revision, onAction }; }, [context, revision, onAction]);

  const stop = useCallback((clear = false) => {
    epoch.current++;
    input.current?.dispose(); input.current = null;
    output.current?.stop(); output.current?.dispose(); output.current = null;
    utteranceRevision.current = null; speechEnd.current = null;
    expectedActionRevision.current = null;
    setActive(false); setSpeaking(false); setStatus('stopped'); setPartial(''); setLevel(0);
    setSetup(false);
    if (clear) { setHeard(''); setQuestion(''); setAnswer(''); setError(''); }
  }, []);

  useEffect(() => {
    const hide = () => stop(true);
    const visibility = () => { if (document.visibilityState === 'hidden') hide(); };
    window.addEventListener('pagehide', hide);
    window.addEventListener('voice-coach-clear', hide);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('pagehide', hide); window.removeEventListener('voice-coach-clear', hide);
      document.removeEventListener('visibilitychange', visibility);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- Invalidate the latest asynchronous session on unmount.
      epoch.current++; input.current?.dispose(); output.current?.dispose();
    };
  }, [stop]);

  useEffect(() => {
    // Keep the microphone session, but invalidate anything heard on the old screen.
    utteranceRevision.current = null; speechEnd.current = null;
    const ownAction = expectedActionRevision.current === revision;
    expectedActionRevision.current = null;
    if (ownAction) return;
    output.current?.stop();
    setSpeaking(false); setPartial(''); setHeard(''); setQuestion(''); setAnswer('');
  }, [revision]);

  useEffect(() => {
    if (open) panel.current?.focus({ preventScroll: true });
    else if (restoreFocus.current) { launcher.current?.focus(); restoreFocus.current = false; }
  }, [open]);

  const respond = useCallback((text: string, session?: number) => {
    if (session !== undefined && epoch.current !== session) return;
    const message = text.trim().slice(0, 500);
    if (!message) return;
    utteranceRevision.current = null;
    expectedActionRevision.current = null;
    const snapshot = current.current;
    output.current?.stop();
    const reply = answerCoach(message, snapshot.context, language);
    setHeardViaVoice(session !== undefined); setHeard(message); setPartial(''); setQuestion(''); setAnswer(reply.text); setError('');
    if (reply.action) {
      const expected = snapshot.onAction(reply.action);
      expectedActionRevision.current = expected && expected !== snapshot.revision ? expected : null;
    }
    if (output.current) void output.current.speak(reply.text);
  }, [language]);

  const start = async () => {
    stop(); setSetup(false); setConsented(true); setError(''); setProgress({ loaded: 0, total: 0 });
    setActive(true); setStatus('loading');
    const session = ++epoch.current;
    const valid = () => epoch.current === session;
    try {
      output.current = createLocalVoiceOutput({
        language,
        onCapability: value => { if (valid()) setQuality(value.quality); },
        onSpeaking: value => {
          if (!valid()) return;
          setSpeaking(value); input.current?.setPlaybackActive(value);
          // Timing stores only a duration, never speech or document contents.
          if (value && speechEnd.current !== null) {
            panel.current?.setAttribute('data-voice-decode-to-output-ms', String(Math.round(performance.now() - speechEnd.current)));
            speechEnd.current = null;
          }
        },
        onError: code => { if (valid()) setError(code); },
      });
      const unlocked = output.current.unlock();
      setQuality(output.current.getCapability().quality);
      input.current = createLocalVoiceInput({
        language,
        onStatus: value => {
          if (!valid()) return;
          setStatus(value);
          if (value === 'transcribing' && speechEnd.current === null) speechEnd.current = performance.now();
        },
        onProgress: value => { if (valid()) setProgress(value); },
        onLevel: value => { if (valid()) setLevel(value); },
        onPartial: text => { if (valid() && utteranceRevision.current === current.current.revision) setPartial(text); },
        onSpeechStart: () => {
          if (!valid()) return;
          output.current?.stop(); setSpeaking(false); setPartial(''); setError('');
          utteranceRevision.current = current.current.revision; speechEnd.current = null;
        },
        onTranscript: text => {
          if (!valid() || utteranceRevision.current !== current.current.revision) return;
          utteranceRevision.current = null;
          respond(text, session);
        },
        onError: code => { if (valid()) { stop(); setError(code); } },
      });
      await Promise.all([unlocked, input.current.start()]);
    } catch {
      if (valid()) { stop(); setError('unknown'); }
    }
  };

  const close = () => { floating.cancel(); stop(true); restoreFocus.current = true; setOpen(false); };
  const changeLanguage = (value: VoiceLanguage) => { stop(true); setLanguage(value); };
  const submit = (event: FormEvent) => { event.preventDefault(); if (output.current) void output.current.unlock(); respond(question); };
  const editQuestion = (value: string) => {
    utteranceRevision.current = null; speechEnd.current = null;
    output.current?.stop(); setPartial(''); setQuestion(value);
  };
  const state = error ? 'error' : speaking ? 'speaking' : status === 'loading' ? 'loading' : status === 'transcribing' ? 'transcribing' : active ? 'listening' : 'idle';
  const description = answer || describeCoachStep(context, language);
  const failure = copy.errors[error] ?? copy.errors.unknown;

  return <div className={styles.host} lang={language} data-voice-coach data-manipulating={floating.manipulating} style={open && floating.rect ? { left: floating.rect.left, top: floating.rect.top, right: 'auto', bottom: 'auto' } : undefined}>
    {!open && <button ref={launcher} type="button" data-voice-open className={styles.launcher} aria-expanded={false} aria-controls="review-voice-coach" onClick={() => { floating.open(); setOpen(true); }}>
      <span className={styles.launchIcon}><AudioLines size={22} aria-hidden="true" /></span>
      <span><strong>{language === 'hi' ? 'साक्षी से पूछें' : language === 'te' ? 'సాక్షిని అడగండి' : 'Ask Sakshi'}</strong><small>English · हिन्दी · తెలుగు</small></span>
    </button>}
    {open && <section id="review-voice-coach" data-voice-panel data-minimized={floating.minimized} data-compact={Boolean(floating.rect && floating.rect.height < 480)} ref={panel} tabIndex={-1} className={styles.panel} style={floating.rect ? { width: floating.rect.width, height: floating.rect.height } : undefined} aria-labelledby="voice-coach-title" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
      <header className={styles.header}>
        <h2><button type="button" data-voice-drag className={styles.dragHandle} aria-label={copy.window.move} aria-describedby="voice-window-keyboard" title={`${copy.window.moveHint}. ${copy.window.keyboardHint}`} {...floating.drag}>
          <GripVertical size={18} aria-hidden="true" /><span><strong id="voice-coach-title">{copy.window.title}</strong><small>{copy.window.moveHint}</small></span>
        </button></h2>
        <button type="button" data-voice-reset className={styles.windowButton} aria-label={copy.window.reset} title={copy.window.reset} onClick={floating.reset}><RotateCcw size={16} aria-hidden="true" /></button>
        <button type="button" data-voice-minimize={floating.minimized ? undefined : true} data-voice-restore={floating.minimized ? true : undefined} className={styles.windowButton} aria-label={floating.minimized ? copy.window.restore : copy.window.minimize} title={floating.minimized ? copy.window.restore : copy.window.minimize} onClick={floating.toggleMinimized}>{floating.minimized ? <Maximize2 size={16} aria-hidden="true" /> : <Minus size={18} aria-hidden="true" />}</button>
        <button type="button" data-voice-close className={styles.windowButton} aria-label={copy.close} title={copy.close} onClick={close}><X size={18} aria-hidden="true" /></button>
      </header>
      <span id="voice-window-keyboard" className={styles.srOnly}>{copy.window.keyboardHint}</span>
      {floating.minimized && <div className={styles.miniBar}>
        <span role="status"><span className={styles.dot} />{copy.state[state]}</span>
        {active && <button type="button" data-voice-stop className={styles.windowButton} aria-label={copy.stop} title={copy.stop} onClick={() => stop()}><MicOff size={17} aria-hidden="true" /></button>}
        {speaking && <button type="button" className={styles.windowButton} aria-label={copy.stopSpeaking} onClick={() => { output.current?.stop(); setSpeaking(false); }}><Square size={15} aria-hidden="true" /></button>}
      </div>}
      <div className={styles.body} hidden={floating.minimized}>
        <div className={styles.languages} role="group" aria-label={copy.language}>
          {languages.map(item => <button type="button" key={item.code} lang={item.code} aria-pressed={language === item.code} onClick={() => changeLanguage(item.code)}>{item.label}</button>)}
        </div>
        <div className={styles.presence} data-state={state}>
          <div className={styles.orb} aria-hidden="true"><AudioLines size={34} /></div>
          <div className={styles.signal} aria-hidden="true">{Array.from({ length: 13 }, (_, index) => <i key={index} style={{ height: `${5 + (active ? Math.max(.1, Math.min(1, level)) * 28 * (1 - Math.abs(6 - index) / 8) : (index % 3) * 3)}px` }} />)}</div>
          <p role="status" data-voice-status>{copy.state[state]}</p>
          {active && <small>{copy.interruptHint}</small>}
        </div>
        {setup && <div className={styles.setup} data-voice-download>
          <strong>{copy.downloadTitle}</strong><p>{copy.downloadBody}</p>
          <button type="button" data-voice-confirm-start className={styles.start} onClick={() => void start()}><Mic size={18} aria-hidden="true" />{copy.downloadAction}</button>
          <button type="button" className={styles.textButton} onClick={() => setSetup(false)}>{copy.downloadCancel}</button>
        </div>}
        {status === 'loading' && <div className={styles.loading}>
          <progress aria-label={copy.downloadProgress} max={progress.total || undefined} value={progress.total ? Math.min(progress.loaded, progress.total) : undefined} />
          <small>{progress.total > 0 ? `${Math.round(progress.loaded / 1024 / 1024)} / ${Math.round(progress.total / 1024 / 1024)} MB` : copy.downloadProgress}</small>
        </div>}
        {error && <p className={styles.error} role="alert">{failure}</p>}
        <div className={styles.response}>
          <span className={styles.eyebrow}>{copy.assistant}</span>
          <p data-voice-answer aria-live="polite" aria-atomic="true">{description}</p>
        </div>
        {(heard || partial) && <div className={styles.transcript}>
          <span className={styles.eyebrow}>{heardViaVoice || partial ? copy.heard : language === 'hi' ? 'आपका सवाल' : language === 'te' ? 'మీ ప్రశ్న' : 'You asked'}</span><p data-voice-transcript>{partial || heard}</p>
          {heard && !partial && <button type="button" className={styles.textButton} onClick={() => { editQuestion(heard); panel.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus(); }}>{copy.editTranscript}</button>}
        </div>}
        <div className={styles.prompts}>{getCoachPrompts(context, language).slice(0, 2).map(prompt => <button type="button" key={prompt} onClick={() => respond(prompt)}>{prompt}<ArrowUp size={15} aria-hidden="true" /></button>)}</div>
        <details className={styles.privacy}><summary><ShieldCheck size={14} aria-hidden="true" />{language === 'hi' ? 'निजी और आपके नियंत्रण में' : language === 'te' ? 'గోప్యంగా, మీ నియంత్రణలో' : 'Private, and in your control'}<ChevronDown size={14} aria-hidden="true" /></summary><p>{copy.privacy}</p><p>{copy.pronunciationNote}</p><a href="/voice-assets/espeak-ng-1.49.1/SOURCE.md" target="_blank" rel="noopener noreferrer">{language === 'hi' ? 'आवाज़ का स्रोत और लाइसेंस' : language === 'te' ? 'వాయిస్ మూలం, లైసెన్స్' : 'Voice source & licence'}</a></details>
      </div>
      <footer className={styles.footer} hidden={floating.minimized}>
        <form className={styles.form} onSubmit={submit}>
          <label className={styles.srOnly} htmlFor="voice-coach-message">{copy.typeLabel}</label>
          <textarea id="voice-coach-message" data-voice-message value={question} onChange={event => editQuestion(event.target.value)} placeholder={copy.typePlaceholder} maxLength={500} rows={2} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (question.trim()) respond(question); } }} />
          <button type="submit" aria-label={copy.send} disabled={!question.trim()}><ArrowUp size={19} aria-hidden="true" /></button>
        </form>
        <div className={styles.controls}>
          {active ? <button type="button" data-voice-stop={floating.minimized ? undefined : true} className={styles.stop} onClick={() => stop()}><MicOff size={18} aria-hidden="true" />{copy.stop}</button> : !setup && <button type="button" data-voice-start className={styles.start} onClick={() => { if (consented) void start(); else setSetup(true); }}><Mic size={18} aria-hidden="true" />{copy.start}</button>}
          {speaking && <button type="button" className={styles.iconButton} aria-label={copy.stopSpeaking} onClick={() => { output.current?.stop(); setSpeaking(false); }}><Square size={17} aria-hidden="true" /></button>}
        </div>
        {active && <p className={styles.voiceQuality}><Volume2 size={13} aria-hidden="true" />{quality === 'device' ? copy.deviceVoice : quality === 'compact' ? copy.compactVoice : copy.noVoice}</p>}

      </footer>
      {!floating.minimized && <button type="button" data-voice-resize className={styles.resizeHandle} aria-label={copy.window.resize} aria-describedby="voice-window-keyboard" title={`${copy.window.resize}. ${copy.window.keyboardHint}`} {...floating.resize}><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 13 13 4M9 13l4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg></button>}
    </section>}
  </div>;
}
