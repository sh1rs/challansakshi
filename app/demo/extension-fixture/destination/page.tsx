'use client';

import { useEffect, useRef } from 'react';
import {
  SYNTHETIC_EXTENSION_FIXTURE,
  SYNTHETIC_FIXTURE_COUNTER_TOKENS,
  resetSyntheticFixtureInstrumentationState,
  type SyntheticFixtureCounterToken,
} from '../../../../lib/synthetic-extension-fixture-contract';
import styles from '../../../../components/test-lab/SyntheticTestLabApp.module.css';

function protectedControl(control: (typeof SYNTHETIC_EXTENSION_FIXTURE.destination.protectedControls)[number]) {
  if (control.element === 'button') {
    return <button id={control.id} name={control.name} type="submit">{control.label}</button>;
  }
  if (control.type === 'file') {
    return <input id={control.id} name={control.name} type="file" />;
  }
  if (control.type === 'checkbox') {
    return <input id={control.id} name={control.name} type="checkbox" defaultChecked={control.initialChecked} />;
  }
  return (
    <input
      id={control.id}
      name={control.name}
      type="text"
      defaultValue={control.initialValue}
      autoComplete={control.autoComplete}
    />
  );
}

export default function SyntheticExtensionFixtureDestinationPage() {
  const fixture = SYNTHETIC_EXTENSION_FIXTURE.destination;
  const rootRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const form = formRef.current;
    if (!root || !form) return;

    let counters = { ...resetSyntheticFixtureInstrumentationState().counters };
    let dispatchedEventSequence: string[] = [];
    const renderInstrumentation = () => {
      for (const token of SYNTHETIC_FIXTURE_COUNTER_TOKENS) {
        const output = document.getElementById(`challansakshi-fixture-counter-${token}`) as HTMLOutputElement | null;
        if (output) output.value = String(counters[token]);
      }
      const sequence = root.querySelector<HTMLOutputElement>('[data-challansakshi-fixture-event-sequence="true"]');
      if (sequence) sequence.value = JSON.stringify(dispatchedEventSequence);
    };
    const record = (token: SyntheticFixtureCounterToken, eventName: string = token) => {
      counters[token] += 1;
      dispatchedEventSequence = [...dispatchedEventSequence, eventName];
      renderInstrumentation();
    };
    const resetBaseline = () => {
      form.reset();
      counters = { ...resetSyntheticFixtureInstrumentationState().counters };
      dispatchedEventSequence = [];
      renderInstrumentation();
      root.setAttribute(fixture.ready.attribute, fixture.ready.value);
    };

    const onInput = (event: Event) => {
      record('input', event.type);
    };
    const onChange = (event: Event) => {
      record('change', event.type);
      const target = event.target;
      if (target instanceof HTMLInputElement && target.type === 'file' && (target.files?.length ?? 0) > 0) {
        record('upload', 'upload');
      }
    };
    const onBlur = (event: Event) => record('blur', event.type);
    const onKeydown = (event: Event) => record('keyboard', event.type);
    const onCustom = (event: Event) => record('custom', event.type);
    const onAutosave = (event: Event) => record('autosave', event.type);
    const onSubmit = (event: SubmitEvent) => {
      event.preventDefault();
      record('submit', event.type);
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const link = target.closest('a[href]');
      const button = target.closest('button');
      const download = target.closest('[download]');
      if (link) {
        event.preventDefault();
        record('link-click', event.type);
        record('navigation', 'navigation-attempt');
      }
      if (button) record('button-click', event.type);
      if (download) {
        event.preventDefault();
        record('download', 'download-attempt');
      }
      if (button?.id === fixture.reset.id) queueMicrotask(resetBaseline);
    };

    form.addEventListener('input', onInput, true);
    form.addEventListener('change', onChange, true);
    form.addEventListener('blur', onBlur, true);
    form.addEventListener('keydown', onKeydown, true);
    form.addEventListener(fixture.customEvents[0], onCustom, true);
    form.addEventListener(fixture.customEvents[1], onAutosave, true);
    form.addEventListener('submit', onSubmit);
    root.addEventListener('click', onClick);

    const observer = new MutationObserver(() => record('form-effect', 'form-mutation'));
    observer.observe(form, { attributes: true, childList: true, characterData: true, subtree: true });

    const originalFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      record('fetch', 'fetch-call');
      return originalFetch(input, init);
    };
    const originalXhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function patchedSend(body?: Document | XMLHttpRequestBodyInit | null) {
      record('xhr', 'xhr-send');
      return originalXhrSend.call(this, body ?? null);
    };
    const originalBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
      record('beacon', 'beacon-call');
      return originalBeacon(url, data);
    };
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);
    history.pushState = (data: unknown, unused: string, url?: string | URL | null) => {
      record('history', 'history-push');
      originalPushState(data, unused, url);
    };
    history.replaceState = (data: unknown, unused: string, url?: string | URL | null) => {
      record('history', 'history-replace');
      originalReplaceState(data, unused, url);
    };

    resetBaseline();

    return () => {
      observer.disconnect();
      form.removeEventListener('input', onInput, true);
      form.removeEventListener('change', onChange, true);
      form.removeEventListener('blur', onBlur, true);
      form.removeEventListener('keydown', onKeydown, true);
      form.removeEventListener(fixture.customEvents[0], onCustom, true);
      form.removeEventListener(fixture.customEvents[1], onAutosave, true);
      form.removeEventListener('submit', onSubmit);
      root.removeEventListener('click', onClick);
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.send = originalXhrSend;
      navigator.sendBeacon = originalBeacon;
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      root.removeAttribute(fixture.ready.attribute);
    };
  }, [fixture]);

  return (
    <div ref={rootRef} className={`${styles.page} ${styles.fixturePage}`} data-product-mode="demo">
      <main className={styles.fixtureMain}>
        <header className={styles.fixtureHeader}>
          <p className={styles.kicker}>SYNTHETIC EXTENSION FIXTURE · LOOPBACK ONLY</p>
          <h1>Fictional destination form</h1>
          <p>This conspicuous local fixture exists only to prove the boundary of an optional helper. It is not a government form and sends nothing.</p>
        </header>

        <form
          ref={formRef}
          id={fixture.form.id}
          name={fixture.form.name}
          method="post"
          action={fixture.form.action}
          {...{ [fixture.form.markerAttribute]: fixture.form.markerValue }}
          className={styles.fixtureForm}
        >
          <section {...{ [fixture.category.containerAttribute]: fixture.category.containerValue }}>
            <label htmlFor={fixture.category.id}>{fixture.category.label}</label>
            <select id={fixture.category.id} name={fixture.category.name} defaultValue="">
              {fixture.category.options.map((option) => (
                <option key={option.value || 'blank'} value={option.value}>{option.label}</option>
              ))}
            </select>
          </section>
          <section {...{ [fixture.description.containerAttribute]: fixture.description.containerValue }}>
            <label htmlFor={fixture.description.id}>{fixture.description.label}</label>
            <textarea
              id={fixture.description.id}
              name={fixture.description.name}
              minLength={fixture.description.minLength}
              maxLength={fixture.description.maxLength}
              required={fixture.description.required}
              defaultValue={fixture.description.initialValue}
            />
          </section>

          <section className={styles.fixtureProtected} aria-labelledby="challansakshi-fixture-protected-heading">
            <h2 id="challansakshi-fixture-protected-heading">Protected fictional controls</h2>
            <p>{fixture.untouchedSentence}</p>
            <div>
              {fixture.protectedControls.map((control) => (
                <label key={control.id} htmlFor={control.id}>
                  <span>{control.label}</span>
                  {protectedControl(control)}
                </label>
              ))}
            </div>
          </section>
        </form>

        <section className={styles.fixtureInstrumentation} aria-labelledby="challansakshi-fixture-instrumentation-heading">
          <div>
            <h2 id="challansakshi-fixture-instrumentation-heading">Visible no-side-effect counters</h2>
            <button id={fixture.reset.id} type="button">{fixture.reset.label}</button>
          </div>
          <div className={styles.fixtureCounters}>
            {fixture.counters.map(({ token, id }) => (
              <label key={token} htmlFor={id}>
                <span>{token}</span>
                <output id={id} data-challansakshi-fixture-counter={token}>0</output>
              </label>
            ))}
          </div>
          <p>Dispatched-event sequence</p>
          <output data-challansakshi-fixture-event-sequence="true">[]</output>
          <div className={styles.fixtureProbes} aria-label="Deliberate instrumentation probes">
            <a href={fixture.path}>Fictional navigation probe</a>
            <button type="button">Fictional button probe</button>
            <a href="data:text/plain,fictional" download="fictional-fixture.txt">Fictional download probe</a>
          </div>
        </section>
      </main>
    </div>
  );
}
