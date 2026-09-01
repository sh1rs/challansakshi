'use client';
/* eslint-disable @next/next/no-img-element -- The custom preview is a revocable browser-local object URL. */

import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { CitizenFooter, CitizenHeader } from '../shared/CitizenChrome';
import {
  runSyntheticEvaluationCorpus,
  syntheticEvaluationCases,
  type SyntheticEvaluationCase,
} from '../../lib/synthetic-evidence-corpus';
import {
  comparisonFields,
  createBlankSyntheticEvidenceExtraction,
  recordDetailFields,
  type SyntheticComparisonResult,
  type SyntheticObservation,
  type SyntheticOverallFinding,
  type SyntheticSourceDocument,
} from '../../lib/synthetic-evidence-pipeline';
import {
  createSyntheticLabCaseState,
  reduceSyntheticLabCaseState,
} from '../../lib/synthetic-lab-state';
import {
  formatSyntheticLabImageSize,
  validateSyntheticLabImage,
  validateSyntheticLabImageContents,
} from '../../lib/synthetic-lab-file';
import styles from './SyntheticTestLabApp.module.css';

type FilterId = 'all' | SyntheticOverallFinding;

const fieldLabels = {
  registration: 'Registration',
  vehicle_category: 'Vehicle type',
  colour: 'Colour',
  make_model: 'Make / model',
  timestamp: 'Timestamp',
  location: 'Location',
} as const;

const recordDetailLabels = {
  challan_number: 'Challan reference',
  issue_date: 'Issue date',
  alleged_offence: 'Alleged offence',
  amount: 'Amount',
} as const;

const outcomeLabels: Record<SyntheticOverallFinding, string> = {
  'potential-evidence-discrepancy': 'Potential discrepancy',
  'appears-consistent': 'Appears consistent',
  inconclusive: 'Inconclusive',
};

const stateLabels: Record<SyntheticComparisonResult['rows'][number]['state'], string> = {
  'potential-mismatch': 'Potential mismatch',
  match: 'Match',
  inconclusive: 'Inconclusive',
};

function outcomeClass(outcome: SyntheticOverallFinding) {
  if (outcome === 'potential-evidence-discrepancy') return styles.outcomeMismatch;
  if (outcome === 'appears-consistent') return styles.outcomeMatch;
  return styles.outcomeInconclusive;
}

function downloadText(value: string) {
  const url = URL.createObjectURL(new Blob([value], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'challansakshi-synthetic-action-pack.txt';
  anchor.click();
  URL.revokeObjectURL(url);
}

function ResultPanel({ result, headingId }: { result: SyntheticComparisonResult; headingId: string }) {
  return (
    <section className={`${styles.resultPanel} ${outcomeClass(result.overall)}`} aria-labelledby={headingId}>
      <div className={styles.resultHeading}>
        <div>
          <p className={styles.kicker}>DETERMINISTIC RESULT</p>
          <h3 id={headingId}>{outcomeLabels[result.overall]}</h3>
        </div>
        <div className={styles.counts} aria-label="Comparison totals">
          <span><b>{result.counts.potentialMismatches}</b> different</span>
          <span><b>{result.counts.inconclusive}</b> unclear</span>
          <span><b>{result.counts.matches}</b> match</span>
        </div>
      </div>
      <p>{result.decisionBoundary}</p>
      <div className={styles.resultRows}>
        {result.rows.map((row) => (
          <article key={row.field}>
            <div>
              <strong>{row.label}</strong>
              <span>{row.materiality === 'primary' ? 'Primary signal' : 'Supporting context'}</span>
            </div>
            <b className={styles.rowState} data-row-state={row.state}>{stateLabels[row.state]}</b>
            <p>{row.reason}</p>
            <ul className={styles.resultSources} aria-label={`${row.label} source trace`}>
              {row.sources.map((source) => (
                <li key={source.sourceDocument}>
                  <b>{source.label}</b>
                  <span>{source.value || 'Not observed'}</span>
                  <small>{source.evidenceReference} · {source.confidence} · {source.visibility}</small>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <aside className={styles.offenceNote}>
        <strong>Offence visibility: {result.offenceAssessment.state}</strong>
        <p>{result.offenceAssessment.reason}</p>
      </aside>
    </section>
  );
}

function ObservationEditor({
  label,
  source,
  field,
  observation,
  onEdit,
}: {
  label: string;
  source: SyntheticSourceDocument;
  field: string;
  observation: SyntheticObservation;
  onEdit: (
    source: SyntheticSourceDocument,
    field: string,
    property: 'value' | 'confidence' | 'visibility',
    value: string,
  ) => void;
}) {
  return (
    <section className={styles.observationEditor} data-source-document={source}>
      <label>
        <span>{label}</span>
        <input
          className={styles.fieldInput}
          value={observation.value}
          maxLength={160}
          onChange={(event) => onEdit(source, field, 'value', event.target.value)}
        />
        <small>Source: {observation.evidence_reference}</small>
      </label>
      <div className={styles.selectRow}>
        <label><span>Visibility</span><select aria-label={`${label} visibility`} className={styles.fieldSelect} value={observation.visibility} onChange={(event) => onEdit(source, field, 'visibility', event.target.value)}><option value="clear">Clear</option><option value="partial">Partial</option><option value="unclear">Unclear</option><option value="not-visible">Not visible</option></select></label>
        <label><span>Observation confidence</span><select aria-label={`${label} observation confidence`} className={styles.fieldSelect} value={observation.confidence} onChange={(event) => onEdit(source, field, 'confidence', event.target.value)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
      </div>
      {observation.limitation ? <p className={styles.limit}><b>Limit:</b> {observation.limitation}</p> : null}
    </section>
  );
}

export function TestCaseWorkbench({ testCase }: { testCase: SyntheticEvaluationCase }) {
  const idPrefix = `lab-${testCase.id.replace(/[^a-z0-9-]/gi, '-')}`;
  const sourceBoundary = testCase.id.startsWith('case-')
    ? 'Bundled fictional test vector'
    : 'User-supplied test input · review required';
  const [state, dispatch] = useReducer(
    reduceSyntheticLabCaseState,
    testCase,
    createSyntheticLabCaseState,
  );
  const [copyStatus, setCopyStatus] = useState('');

  const edit = (
    source: SyntheticSourceDocument,
    field: string,
    property: 'value' | 'confidence' | 'visibility',
    value: string,
  ) => {
    setCopyStatus('');
    dispatch({ type: 'EDIT_OBSERVATION', source, field, property, value });
  };

  const copyPack = async () => {
    if (!state.actionPack) return;
    try {
      await navigator.clipboard.writeText(state.actionPack);
      setCopyStatus('Action pack copied.');
    } catch {
      setCopyStatus('Copy was blocked by this browser. Use Download action pack instead.');
    }
  };

  return (
    <section className={styles.workbench} aria-labelledby={`${idPrefix}-workbench`}>
      <div className={styles.workbenchHeader}>
        <div>
          <p className={styles.kicker}>SELECTED TEST VECTOR · {testCase.id.toUpperCase()}</p>
          <h2 id={`${idPrefix}-workbench`} tabIndex={-1}>{state.title}</h2>
          <p>{state.description}</p>
        </div>
        <div className={styles.expectedActual}>
          <span><b>{state.result ? 'Human-confirmed result' : 'Human confirmation required'}</b></span>
          <span>Engine <b>{state.result ? outcomeLabels[state.result.overall] : 'Locked'}</b></span>
        </div>
      </div>

      <ol className={styles.phaseRail} aria-label="Evidence analysis phases">
        <li><span>1</span><b>Evidence</b></li>
        <li><span>2</span><b>Explain</b></li>
        <li><span>3</span><b>Verify</b></li>
        <li><span>4</span><b>Act</b></li>
      </ol>

      <section className={styles.evidenceSection} aria-labelledby={`${idPrefix}-evidence-heading`}>
        <div className={styles.sectionHeading}>
          <div><p className={styles.kicker}>01 · EVIDENCE</p><h3 id={`${idPrefix}-evidence-heading`}>Review every source value before comparison</h3></div>
          <span className={styles.sourceBoundary}>{sourceBoundary}</span>
        </div>
        <section className={styles.recordDetails} aria-labelledby={`${idPrefix}-record-details-heading`}>
          <div>
            <p className={styles.kicker}>RECORD FACTS</p>
            <h4 id={`${idPrefix}-record-details-heading`}>Record facts used in the action pack</h4>
            <p>These facts are not compared with the image, but they are included in the downloadable summary. Review them before confirming.</p>
          </div>
          <div className={styles.recordDetailGrid}>
            {recordDetailFields.map((field) => {
              const observation = state.draft.challan_document[field];
              return (
                <fieldset className={styles.fieldCard} data-record-detail={field} key={field}>
                  <legend>{recordDetailLabels[field]}</legend>
                  <label>
                    <span>Record document</span>
                    <input
                      className={styles.fieldInput}
                      value={observation.value}
                      maxLength={160}
                      onChange={(event) => edit('challan_document', field, 'value', event.target.value)}
                    />
                    <small>Source: {observation.evidence_reference}</small>
                  </label>
                  <div className={styles.selectRow}>
                    <label><span>Visibility</span><select className={styles.fieldSelect} value={observation.visibility} onChange={(event) => edit('challan_document', field, 'visibility', event.target.value)}><option value="clear">Clear</option><option value="partial">Partial</option><option value="unclear">Unclear</option><option value="not-visible">Not visible</option></select></label>
                    <label><span>Observation confidence</span><select className={styles.fieldSelect} value={observation.confidence} onChange={(event) => edit('challan_document', field, 'confidence', event.target.value)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
                  </div>
                  {observation.limitation ? <p className={styles.limit}><b>Limit:</b> {observation.limitation}</p> : null}
                </fieldset>
              );
            })}
          </div>
        </section>
        <div className={styles.fieldGrid}>
          {comparisonFields.map((field) => {
            const evidence = state.draft.enforcement_image[field];
            const referenceEditors = field === 'registration'
              ? [
                {
                  label: 'Challan alleged registration',
                  source: 'challan_document' as const,
                  field: 'alleged_registration',
                  observation: state.draft.challan_document.alleged_registration,
                },
                {
                  label: 'Vehicle record registration',
                  source: 'vehicle_record' as const,
                  field: 'registration',
                  observation: state.draft.vehicle_record.registration,
                },
              ]
              : field === 'timestamp' || field === 'location'
                ? [{
                  label: 'Challan document',
                  source: 'challan_document' as const,
                  field,
                  observation: state.draft.challan_document[field],
                }]
                : [{
                  label: 'Vehicle record',
                  source: 'vehicle_record' as const,
                  field,
                  observation: state.draft.vehicle_record[field],
                }];
            return (
              <fieldset className={styles.fieldCard} key={field}>
                <legend>{fieldLabels[field]}</legend>
                {referenceEditors.map((reference) => (
                  <ObservationEditor key={`${reference.source}-${reference.field}`} {...reference} onEdit={edit} />
                ))}
                <ObservationEditor label="Enforcement image observation" source="enforcement_image" field={field} observation={evidence} onEdit={edit} />
              </fieldset>
            );
          })}
          <fieldset className={`${styles.fieldCard} ${styles.offenceCard}`}>
            <legend>Can the alleged offence be assessed from this image?</legend>
            <div className={styles.selectRow}>
              <label><span>Observation</span><select aria-label="Offence-area assessability observation" className={styles.fieldSelect} value={state.draft.enforcement_image.offence_assessable.value} onChange={(event) => edit('enforcement_image', 'offence_assessable', 'value', event.target.value)}><option value="yes">Yes — relevant area is visible</option><option value="no">No — context is missing</option><option value="unclear">Unclear</option></select></label>
              <label><span>Visibility</span><select aria-label="Offence-area observation visibility" className={styles.fieldSelect} value={state.draft.enforcement_image.offence_assessable.visibility} onChange={(event) => edit('enforcement_image', 'offence_assessable', 'visibility', event.target.value)}><option value="clear">Clear</option><option value="partial">Partial</option><option value="unclear">Unclear</option><option value="not-visible">Not visible</option></select></label>
              <label><span>Observation confidence</span><select aria-label="Offence-area observation confidence" className={styles.fieldSelect} value={state.draft.enforcement_image.offence_assessable.confidence} onChange={(event) => edit('enforcement_image', 'offence_assessable', 'confidence', event.target.value)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
            </div>
            <p className={styles.limit}>This asks only whether the relevant visual area exists. It does not ask AI whether an offence occurred.</p>
          </fieldset>
        </div>
        <aside className={styles.extractionLimitations}>
          <strong>Extraction-wide limitations</strong>
          {state.draft.limitations.length > 0
            ? <ul>{state.draft.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
            : <p>No extraction-wide limitation was supplied. Field-level limits still apply.</p>}
        </aside>
      </section>

      <section className={styles.explainSection} aria-labelledby={`${idPrefix}-explain-heading`}>
        <div className={styles.sectionHeading}><div><p className={styles.kicker}>02 · EXPLAIN</p><h3 id={`${idPrefix}-explain-heading`}>The engine shows its rule trace</h3></div></div>
        <div className={styles.ruleTrace}>
          <p><span>Primary</span> Clear registration or recognized vehicle-type differences can support a potential evidence discrepancy.</p>
          <p><span>Context</span> One colour, model, time, or location difference alone asks for corroboration.</p>
          <p><span>Abstain</span> Partial, unclear, not-visible, or low-confidence values remain inconclusive—even if a guessed value exists.</p>
          <p><span>Control</span> AI observations never choose the official pathway. Deterministic rules do that only after your review.</p>
        </div>
      </section>

      <section className={styles.verifySection} aria-labelledby={`${idPrefix}-verify-heading`}>
        <div className={styles.sectionHeading}><div><p className={styles.kicker}>03 · VERIFY</p><h3 id={`${idPrefix}-verify-heading`}>Confirm the current observations</h3></div></div>
        <p>Check all four record facts, six comparison groups, every source/confidence label, and offence visibility. Editing anything after comparison clears the previous confirmation and action.</p>
        <div className={styles.verifyActions}>
          <button className={styles.confirmButton} type="button" onClick={() => dispatch({ type: 'CONFIRM_AND_COMPARE' })}>I reviewed these values · Compare now</button>
          <button className={styles.secondaryButton} type="button" onClick={() => dispatch({ type: 'RESET_CASE' })}>Restore test vector</button>
        </div>
        <p className={state.status === 'stale-after-edit' ? styles.staleNotice : styles.stateNotice} role="status">{state.announcement}</p>
      </section>

      <section className={styles.actSection} aria-labelledby={`${idPrefix}-act-heading`}>
        <div className={styles.sectionHeading}><div><p className={styles.kicker}>04 · ACT</p><h3 id={`${idPrefix}-act-heading`}>One safe next step, after confirmation</h3></div></div>
        {state.result && state.path ? (
          <>
            <ResultPanel result={state.result} headingId={`${idPrefix}-result-heading`} />
            <article className={styles.actionCard}>
              <small>DETERMINISTIC PATH · {state.path.id}</small>
              <h3>{state.path.title}</h3>
              <p>{state.path.summary}</p>
              <ol>{state.path.nextActions.map((action) => <li key={action}>{action}</li>)}</ol>
              <strong>{state.path.officialHandoff}</strong>
              <div className={styles.packActions}>
                <button className={styles.primaryButton} type="button" onClick={() => downloadText(state.actionPack)}>Download action pack</button>
                <button className={styles.secondaryButton} type="button" onClick={copyPack}>Copy action pack</button>
              </div>
              {copyStatus ? <p className={styles.copyStatus} role="status">{copyStatus}</p> : null}
            </article>
          </>
        ) : (
          <div className={styles.lockedAction}>
            <span aria-hidden="true">⌁</span>
            <div><strong>Action is locked</strong><p>Review and confirm the current source observations first. No stale result is reused.</p></div>
          </div>
        )}
      </section>
    </section>
  );
}

function LocalCustomVector() {
  const inputRef = useRef<HTMLInputElement>(null);
  const validationRequestRef = useRef(0);
  const [preview, setPreview] = useState<{ url: string; size: number; type: string; width: number; height: number } | null>(null);
  const [error, setError] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const customCase = useMemo<SyntheticEvaluationCase>(() => ({
    id: 'custom-local-vector',
    title: 'Custom browser-local test input',
    description: 'Enter only facts you personally reviewed in the local preview. Blank or unclear fields remain inconclusive.',
    expectedOverall: 'inconclusive',
    extraction: createBlankSyntheticEvidenceExtraction(),
  }), []);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview.url);
  }, [preview]);

  useEffect(() => () => {
    validationRequestRef.current += 1;
  }, []);

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    const validationRequest = validationRequestRef.current + 1;
    validationRequestRef.current = validationRequest;
    setPreview(null);
    setEditorOpen(false);
    const validation = validateSyntheticLabImage(file);
    if (!validation.ok) {
      setError(validation.reason === 'empty-file'
        ? 'Choose a non-empty synthetic image.'
        : validation.reason === 'file-too-large'
          ? 'Keep the local preview at or below 4 MiB.'
          : 'Choose a JPEG or PNG test image.');
      return;
    }
    const contentValidation = await validateSyntheticLabImageContents(file);
    if (validationRequest !== validationRequestRef.current) return;
    if (!contentValidation.ok) {
      setError(contentValidation.reason === 'unsafe-dimensions'
        ? 'Choose an image no larger than 4096 × 4096 pixels or 12 megapixels.'
        : contentValidation.reason === 'mime-mismatch'
          ? 'The file contents do not match the selected image type.'
          : 'This file could not be safely decoded as a PNG or JPEG.');
      return;
    }
    setError('');
    setPreview({
      url: URL.createObjectURL(file),
      size: file.size,
      type: contentValidation.mimeType,
      width: contentValidation.width,
      height: contentValidation.height,
    });
  };

  const clearPreview = () => {
    validationRequestRef.current += 1;
    setPreview(null);
    setEditorOpen(false);
    setError('');
  };

  return (
    <section className={styles.customSection} aria-labelledby="custom-vector-heading">
      <div className={styles.customHeading}>
        <div><p className={styles.kicker}>CUSTOM TEST INPUT</p><h2 id="custom-vector-heading">Prove the rules are not tied to a fixture ID</h2></div>
        <span>Browser-local manual mode</span>
      </div>
      <div className={styles.privacyNote} role="note">
        <strong>The selected image is not transmitted by this lab.</strong>
        <p>Use a synthetic test image only; ChallanSakshi cannot verify its provenance. Its bytes stay in this browser tab and are not uploaded, stored, or sent to AI, OpenAI, ChallanSakshi’s server, or an authority. Copying or downloading a later text pack is a separate action you control. Do not choose a real challan, RC, face, plate, address, QR code, or location-bearing file.</p>
      </div>
      <input ref={inputRef} className={styles.hiddenInput} tabIndex={-1} type="file" accept="image/jpeg,image/png" aria-label="Choose a browser-local test image" onChange={chooseFile} />
      {!preview ? (
        <button className={styles.localChoose} type="button" onClick={() => inputRef.current?.click()}>Choose a local test image</button>
      ) : (
        <div className={styles.localPreview}>
          <img src={preview.url} alt="Browser-local preview of the selected user-supplied test image" />
          <div>
            <strong>Local test preview ready</strong>
            <span>{formatSyntheticLabImageSize(preview.size)} · {preview.type} · {preview.width} × {preview.height}</span>
            <p>Filename hidden. Inspect the image yourself, then enter only what is visibly supported.</p>
            <div className={styles.previewActions}>
              <button className={styles.primaryButton} type="button" onClick={() => setEditorOpen(true)}>Open blank observation editor</button>
              <button className={styles.secondaryButton} type="button" onClick={() => inputRef.current?.click()}>Replace image</button>
              <button className={styles.dangerButton} type="button" onClick={clearPreview}>Remove and clear</button>
            </div>
          </div>
        </div>
      )}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <details className={styles.liveBoundary}>
        <summary>Why does the public lab use manual observations?</summary>
        <p><b>Public live uploads remain off.</b> The codebase includes a policy-limited, feature-flagged OpenAI extraction route for controlled testing, but arbitrary public uploads require verified access and abuse controls, spend limits, and metadata-stripping first. A person’s assertion that a file is synthetic cannot prove its provenance.</p>
      </details>
      {editorOpen ? <TestCaseWorkbench key={preview?.url ?? 'custom'} testCase={customCase} /> : null}
    </section>
  );
}

export default function SyntheticTestLabApp() {
  const [suiteReport, setSuiteReport] = useState<ReturnType<typeof runSyntheticEvaluationCorpus> | null>(null);
  const [filter, setFilter] = useState<FilterId>('all');
  const [selectedId, setSelectedId] = useState('case-02-registration-conflict');
  const [selectionRequest, setSelectionRequest] = useState(0);
  const [selectionAnnouncement, setSelectionAnnouncement] = useState('');
  const selectedWorkbenchRef = useRef<HTMLDivElement>(null);
  const selected = syntheticEvaluationCases.find((item) => item.id === selectedId) ?? syntheticEvaluationCases[0];
  const filteredCases = syntheticEvaluationCases.filter((item) => filter === 'all' || item.expectedOverall === filter);
  const outcomeCounts = useMemo(() => ({
    discrepancies: syntheticEvaluationCases.filter((item) => item.expectedOverall === 'potential-evidence-discrepancy').length,
    consistent: syntheticEvaluationCases.filter((item) => item.expectedOverall === 'appears-consistent').length,
    inconclusive: syntheticEvaluationCases.filter((item) => item.expectedOverall === 'inconclusive').length,
  }), []);

  useEffect(() => {
    if (selectionRequest === 0) return;
    const frame = requestAnimationFrame(() => {
      const heading = selectedWorkbenchRef.current?.querySelector<HTMLHeadingElement>('h2');
      heading?.focus({ preventScroll: true });
      if (window.matchMedia('(max-width: 980px)').matches) {
        selectedWorkbenchRef.current?.scrollIntoView({ block: 'start' });
      }
      setSelectionAnnouncement(`Selected ${selected.title}. Evidence workbench ready.`);
    });
    return () => cancelAnimationFrame(frame);
  }, [selected.title, selectionRequest]);

  const runSuite = () => setSuiteReport(runSyntheticEvaluationCorpus());
  const chooseFilter = (nextFilter: FilterId) => {
    setFilter(nextFilter);
    if (nextFilter !== 'all' && selected.expectedOverall !== nextFilter) {
      const firstMatching = syntheticEvaluationCases.find((item) => item.expectedOverall === nextFilter);
      if (firstMatching) setSelectedId(firstMatching.id);
    }
  };
  const chooseCase = (caseId: string) => {
    setSelectionAnnouncement('');
    setSelectedId(caseId);
    setSelectionRequest((value) => value + 1);
  };

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#test-lab-main">Skip to Test Lab</a>
      <CitizenHeader language="en" setLanguage={() => undefined} boundary="demo" englishOnly />
      <main id="test-lab-main" className={styles.main}>
        <section className={styles.hero}>
          <div>
            <p className={styles.kicker}>SYNTHETIC TEST LAB · 10 FICTIONAL CASES</p>
            <h1>Synthetic Evidence Test Lab</h1>
            <p className={styles.heroLead}>Run 10 fictional cases, then edit any observation to see the deterministic result update.</p>
            <div className={styles.heroActions}>
              <button className={styles.primaryButton} type="button" onClick={runSuite}>Run all 10 cases</button>
              <a className={styles.secondaryButton} href="/demo">Open flagship walkthrough</a>
            </div>
          </div>
          <aside className={styles.heroProof} aria-label="10 fictional cases and outcome distribution">
            <span><b>{syntheticEvaluationCases.length}</b> fictional cases</span>
            <span><b>{outcomeCounts.discrepancies}</b> potential discrepancies</span>
            <span><b>{outcomeCounts.consistent}</b> appear consistent</span>
            <span><b>{outcomeCounts.inconclusive}</b> inconclusive</span>
          </aside>
        </section>

        <section className={styles.boundaryStrip} aria-label="Test Lab boundaries">
          <p><b>Fictional only.</b><span>No real records or public image analysis.</span></p>
          <p><b>Rules decide findings.</b><span>AI never chooses the result or legal outcome.</span></p>
          <p><b>Edits clear results.</b><span>Changed facts require fresh human confirmation.</span></p>
        </section>

        <section className={styles.suiteSection} aria-labelledby="suite-heading">
          <div className={styles.suiteHeading}>
            <div><p className={styles.kicker}>RUNTIME EVALUATION</p><h2 id="suite-heading">One engine, not ten canned conclusions</h2></div>
            {suiteReport ? <strong className={suiteReport.failed === 0 ? styles.suitePass : styles.suiteFail}>{suiteReport.passed} / {suiteReport.total} expected outcomes reproduced</strong> : <span>Press Run all to calculate every actual outcome.</span>}
          </div>
          <p className={styles.liveRegion} aria-live="polite">{suiteReport ? `${suiteReport.total} cases complete: ${suiteReport.passed} passed, ${suiteReport.failed} failed.` : ''}</p>
          <div className={styles.filters} role="group" aria-label="Filter Test Lab cases">
            {([
              ['all', 'All 10'],
              ['potential-evidence-discrepancy', 'Potential discrepancy'],
              ['appears-consistent', 'Appears consistent'],
              ['inconclusive', 'Inconclusive'],
            ] as Array<[FilterId, string]>).map(([id, label]) => <button className={styles.filterButton} type="button" key={id} aria-pressed={filter === id} onClick={() => chooseFilter(id)}>{label}</button>)}
          </div>
          <p className={styles.selectionStatus} role="status">{selectionAnnouncement}</p>
          <div className={styles.workbenchGrid}>
            <div className={styles.caseList} aria-label="Synthetic test cases">
              {filteredCases.map((testCase) => {
                const result = suiteReport?.cases.find((item) => item.id === testCase.id);
                const active = testCase.id === selected.id;
                return (
                  <button
                    className={`${styles.caseButton} ${active ? styles.caseActive : ''}`}
                    type="button"
                    key={testCase.id}
                    data-test-case={testCase.id}
                    aria-pressed={active}
                    onClick={() => chooseCase(testCase.id)}
                  >
                    <span>{testCase.id.replace(/^case-(\d+).*$/, 'TL-$1')}</span>
                    <div><strong>{testCase.title}</strong></div>
                    <b className={outcomeClass(result?.actualOverall ?? testCase.expectedOverall)}>
                      {result ? (
                        <>
                          <span>Actual: {outcomeLabels[result.actualOverall]}</span>
                          <em>{result.passed ? 'PASS' : 'FAIL'}</em>
                          <small>Expected: {outcomeLabels[testCase.expectedOverall]}</small>
                        </>
                      ) : <span>Expected: {outcomeLabels[testCase.expectedOverall]}</span>}
                    </b>
                  </button>
                );
              })}
            </div>
            <div className={styles.selectedWorkbench} ref={selectedWorkbenchRef}>
              <TestCaseWorkbench key={selected.id} testCase={selected} />
            </div>
          </div>
        </section>

        <LocalCustomVector />

        <section className={styles.finalBoundary}>
          <strong>Evidence assistant, never judge.</strong>
          <p>Nothing is filed, paid, authenticated, or sent to a government system. The designated authority—not ChallanSakshi or an AI model—decides any official outcome.</p>
        </section>
      </main>
      <CitizenFooter language="en" boundary="demo" />
    </div>
  );
}
