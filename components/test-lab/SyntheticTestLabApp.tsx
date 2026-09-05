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
import { ArrowDownRight, ArrowUpRight, FlaskConical, Play } from 'lucide-react';
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
  createSyntheticJudgeProofState,
  reduceSyntheticJudgeProofState,
  reduceSyntheticLabCaseState,
  type SyntheticJudgeProofAction,
  type SyntheticJudgeProofState,
} from '../../lib/synthetic-lab-state';
import { generateOpaqueExtensionId } from '../../lib/extension-handoff-contract';
import { SYNTHETIC_EXTENSION_FIXTURE } from '../../lib/synthetic-extension-fixture-contract';
import {
  formatSyntheticLabImageSize,
  validateSyntheticLabImage,
  validateSyntheticLabImageContents,
} from '../../lib/synthetic-lab-file';
import styles from './SyntheticTestLabApp.module.css';
import { SyntheticScene, SyntheticSourceBundle } from './SyntheticSourceVisuals';

type FilterId = 'all' | SyntheticOverallFinding;

export type TestLabSelectionState = {
  filter: FilterId;
  selectedId: string;
  selectionRequest: number;
  focusTargetId: string | null;
  announcement: string;
};

export type TestLabSelectionAction =
  | { type: 'filter'; filter: FilterId }
  | { type: 'case'; caseId: string }
  | { type: 'start-proof' };

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

const filterOptions: Array<[FilterId, string]> = [
  ['all', 'All 10'],
  ['potential-evidence-discrepancy', 'Potential discrepancy'],
  ['appears-consistent', 'Appears consistent'],
  ['inconclusive', 'Inconclusive'],
];

function shortCaseId(caseId: string) {
  return caseId.replace(/^case-(\d+).*$/, 'TL-$1');
}

export function transitionTestLabSelection(
  state: TestLabSelectionState,
  action: TestLabSelectionAction,
): TestLabSelectionState {
  if (action.type === 'start-proof') {
    return {
      filter: 'all',
      selectedId: 'case-04-category-conflict',
      selectionRequest: state.selectionRequest + 1,
      focusTargetId: null,
      announcement: '',
    };
  }

  if (action.type === 'case') {
    if (!syntheticEvaluationCases.some((item) => item.id === action.caseId)) return state;
    return {
      ...state,
      selectedId: action.caseId,
      selectionRequest: state.selectionRequest + 1,
      focusTargetId: action.caseId,
      announcement: '',
    };
  }

  const matchingCases = syntheticEvaluationCases.filter((item) => (
    action.filter === 'all' || item.expectedOverall === action.filter
  ));
  const currentMatch = matchingCases.find((item) => item.id === state.selectedId);
  const nextSelected = currentMatch ?? matchingCases[0];
  const filterLabel = action.filter === 'all' ? 'All cases' : outcomeLabels[action.filter];
  const countLabel = `${matchingCases.length} matching ${matchingCases.length === 1 ? 'case' : 'cases'}.`;
  const selectionLabel = !nextSelected
    ? 'No case selected.'
    : currentMatch
      ? `${shortCaseId(nextSelected.id)}: ${nextSelected.title} remains selected.`
      : `Selected ${shortCaseId(nextSelected.id)}: ${nextSelected.title}.`;

  return {
    ...state,
    filter: action.filter,
    selectedId: nextSelected?.id ?? state.selectedId,
    focusTargetId: null,
    announcement: `${filterLabel} filter applied. ${countLabel} ${selectionLabel}`,
  };
}

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
                  {source.limitation ? <small><b>Limit:</b> {source.limitation}</small> : null}
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
        {syntheticEvaluationCases.some((item) => item.id === testCase.id) && <SyntheticSourceBundle extraction={testCase.extraction} />}
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
            <p className={styles.limit}>{state.draft.enforcement_image.offence_assessable.limitation || 'This asks only whether the relevant visual area exists. It does not ask AI whether an offence occurred.'}</p>
          </fieldset>
        </div>
        <aside className={styles.extractionLimitations}>
          <strong>Extraction-wide limitations</strong>
          {state.draft.limitations.length > 0
            ? <ul>{state.draft.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
            : <p>No extraction-wide limitation was supplied. Field-level limits still apply.</p>}
        </aside>
        <p className={styles.analysisProvenance}><b>Analysis provenance:</b> {testCase.analysisProvenance ?? 'Manual browser-local observations · no model call ran.'}</p>
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

function proofRevisionId(): string | null {
  try {
    return generateOpaqueExtensionId();
  } catch {
    return null;
  }
}

export function SyntheticJudgeProofView({
  state,
  dispatch,
}: {
  state: SyntheticJudgeProofState;
  dispatch: (action: SyntheticJudgeProofAction) => void;
}) {
  const sourceFixture = SYNTHETIC_EXTENSION_FIXTURE.source;
  const destinationFixture = SYNTHETIC_EXTENSION_FIXTURE.destination;
  const showCoreComplete = ['complete', 'guardrails', 'extension'].includes(state.stage);
  const showFinding = Boolean(state.result && !showCoreComplete);
  const guardrailCases = state.guardrailCaseIds
    .map((caseId) => syntheticEvaluationCases.find((item) => item.id === caseId))
    .filter((item): item is SyntheticEvaluationCase => Boolean(item));
  const confirmObservations = () => {
    const resultRevisionId = proofRevisionId();
    if (resultRevisionId) dispatch({ type: 'CONFIRM_AND_COMPARE', resultRevisionId });
  };
  const confirmPack = () => {
    const packRevisionId = proofRevisionId();
    if (packRevisionId) {
      dispatch({
        type: 'CONFIRM_SYNTHETIC_PACK',
        packRevisionId,
        generatedAt: new Date().toISOString(),
      });
    }
  };

  return (
    <section className={styles.proofLane} aria-label="90-second synthetic proof">
      <div className={styles.proofBanner} role="note">
        <strong>Synthetic demonstration data</strong>
        <span>Fictional observations only · no official fetch, form, filing, payment, or decision</span>
      </div>
      <p
        className={styles.proofStatus}
        data-challansakshi-proof-status="v1"
        aria-live="polite"
        aria-atomic="true"
      >{state.announcement}</p>

      {state.stage !== 'idle' ? (
        <>
          <section className={styles.proofBeat} aria-labelledby="challansakshi-proof-case-heading">
            <p className={styles.kicker}>BEAT 1 · FICTIONAL PAIR</p>
            <h2 id="challansakshi-proof-case-heading" tabIndex={-1}>1. Review the synthetic pair</h2>
            <p>{state.description}</p>
            <div className={styles.proofPair}>
              <article>
                <span>FICTIONAL VEHICLE RECORD</span>
                <strong>{state.original.vehicle_record.colour.value} {state.original.vehicle_record.make_model.value}</strong>
                <p>{state.original.vehicle_record.vehicle_category.value}</p>
                <SyntheticScene vehicle={state.original.vehicle_record} compact />
              </article>
              <b aria-hidden="true">↔</b>
              <article>
                <span>FICTIONAL ENFORCEMENT IMAGE</span>
                <strong>{state.original.enforcement_image.colour.value} {state.original.enforcement_image.make_model.value}</strong>
                <p>{state.original.enforcement_image.vehicle_category.value}</p>
                <SyntheticScene vehicle={state.original.enforcement_image} compact />
              </article>
            </div>
            <p className={styles.visualProvenance}>{state.correctionApplied ? 'Only the test observations were edited; the original synthetic photos stay unchanged. Re-comparison tests the rules on those edited inputs, not the truth of the photograph.' : 'Original synthetic test photos, including physical plate lettering. Observations are pre-authored; this proof does not run live AI.'}</p>
          </section>

          <section className={styles.proofBeat} aria-labelledby="challansakshi-proof-evidence-heading">
            <p className={styles.kicker}>BEAT 2 · SOURCE TRACE</p>
            <h3 id="challansakshi-proof-evidence-heading" tabIndex={-1}>2. Confirm the source-linked observations</h3>
            <p className={styles.proofProvenance}><b>Analysis provenance:</b> {state.analysisProvenance}</p>
            <div className={styles.proofSources}>
              {(['vehicle_category', 'colour', 'make_model'] as const).flatMap((field) => [
                { label: 'Vehicle record', observation: state.draft.vehicle_record[field] },
                { label: 'Enforcement image', observation: state.draft.enforcement_image[field] },
              ]).map(({ label, observation }) => (
                <article key={`${label}-${observation.evidence_reference}`}>
                  <span>{label} · {observation.evidence_reference}</span>
                  <strong>{observation.value}</strong>
                  <small>{observation.confidence} confidence · {observation.visibility}</small>
                  <p><b>Limit:</b> {observation.limitation}</p>
                </article>
              ))}
            </div>
            <aside className={styles.proofOffenceLimit}>
              <strong>{state.draft.challan_document.alleged_offence.value}</strong>
              <span>{state.draft.enforcement_image.offence_assessable.evidence_reference}</span>
              <p>{state.draft.enforcement_image.offence_assessable.limitation}</p>
            </aside>
            {state.stage === 'review-pair' ? (
              <button className={styles.confirmButton} type="button" onClick={confirmObservations}>
                I reviewed these fictional observations · Compare
              </button>
            ) : null}
          </section>
        </>
      ) : null}

      {showFinding && state.result ? (
        <section className={styles.proofBeat} aria-labelledby="challansakshi-proof-finding-heading">
          <p className={styles.kicker}>BEAT 3 · BOUNDED RESULT</p>
          <h3 id="challansakshi-proof-finding-heading" tabIndex={-1}>3. See the bounded finding</h3>
          <ResultPanel result={state.result} headingId="challansakshi-proof-result-heading" />
          {state.stage === 'finding' ? (
            <div className={styles.proofConsent}>
              <p>The comparison and the fictional field pack are separate. Confirm the reviewed facts before the simulation is created.</p>
              <button className={styles.confirmButton} type="button" onClick={confirmPack}>
                Confirm synthetic field pack
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {state.simulation ? (
        <section className={styles.proofBeat} aria-labelledby="challansakshi-proof-handoff-heading">
          <p className={styles.kicker}>BEAT 4 · USER-CONTROLLED HANDOFF</p>
          <h3 id="challansakshi-proof-handoff-heading" tabIndex={-1}>4. Try the web handoff</h3>
          <article className={styles.proofHandoff}>
            <div>
              <strong>Web handoff · works everywhere</strong>
              <span>{state.simulation.permanentLabel}</span>
            </div>
            <p>{state.simulation.description}</p>
            <p><b>Mapped fictional category:</b> {state.simulation.legacyIssueSimulation?.label ?? 'No category mapped'}</p>
            <p>No government request is made. This action changes only local synthetic proof state.</p>
            {state.stage === 'handoff' ? (
              <button className={styles.primaryButton} type="button" onClick={() => dispatch({ type: 'SIMULATE_OFFICIAL_ROUTE_OPEN' })}>
                Simulate opening the official review route
              </button>
            ) : null}
          </article>
        </section>
      ) : null}

      {state.routeSimulation ? (
        <section className={styles.proofBeat} aria-labelledby="challansakshi-proof-return-heading">
          <p className={styles.kicker}>LOCAL SIMULATION · NO NAVIGATION</p>
          <h3 id="challansakshi-proof-return-heading" tabIndex={-1}>Official handoff simulation</h3>
          <p>No official URL is stored in this state and no government request is made.</p>
          {state.stage === 'return' ? (
            <button className={styles.primaryButton} type="button" onClick={() => dispatch({ type: 'RECORD_SYNTHETIC_RETURN' })}>
              Record synthetic return
            </button>
          ) : null}
        </section>
      ) : null}

      {state.returnSimulation ? (
        <section className={styles.proofBeat} aria-labelledby="challansakshi-proof-correction-heading">
          <p className={styles.kicker}>BEAT 5 · INVALIDATE AND RECOMPUTE</p>
          <h3 id="challansakshi-proof-correction-heading" tabIndex={-1}>5. Correct and recompute</h3>
          <p><b>{state.returnSimulation.permanentLabel}.</b> This local example is unverified and is not an official acknowledgement.</p>
          <button className={styles.primaryButton} type="button" onClick={() => dispatch({ type: 'CORRECT_IMAGE_OBSERVATIONS' })}>
            Correct the image observations
          </button>
        </section>
      ) : null}

      {state.stage === 'reconfirm' ? (
        <section className={styles.proofBeat} aria-labelledby="challansakshi-proof-reconfirm-heading">
          <p className={styles.kicker}>EARLIER RESULT CLEARED</p>
          <h3 id="challansakshi-proof-reconfirm-heading" tabIndex={-1}>Reconfirm the corrected observations</h3>
          <p>The edited test observations now say Blue Honda Activa 6G · Two-wheeler. The original photo remains a white car. This deliberately tests correction and invalidation—not visual verification. The earlier confirmation, field pack, route simulation, and return are gone.</p>
          <button className={styles.confirmButton} type="button" onClick={confirmObservations}>
            Reconfirm corrected observations · Compare again
          </button>
        </section>
      ) : null}

      {showCoreComplete && state.result ? (
        <section className={styles.proofBeat} aria-labelledby="challansakshi-proof-boundary-heading">
          <p className={styles.kicker}>BEAT 6 · PRODUCT BOUNDARY</p>
          <h3 id="challansakshi-proof-boundary-heading" tabIndex={-1}>6. AI extracts. Rules compare. You control the handoff.</h3>
          <ResultPanel result={state.result} headingId="challansakshi-proof-consistent-result-heading" />
          <div className={styles.proofBoundaryGrid}>
            <article><strong>AI extracts</strong><p>Only source-linked observations, confidence, and limitations.</p></article>
            <article><strong>Rules compare</strong><p>Deterministic rules return discrepancy, inconclusive, or consistent.</p></article>
            <article><strong>You control the handoff</strong><p>You confirm facts and choose whether to leave ChallanSakshi.</p></article>
          </div>
          <div className={styles.proofActions}>
            <a className={styles.primaryButton} href="/review">Review a real challan in the browser</a>
            {state.stage === 'complete' ? (
              <button className={styles.secondaryButton} type="button" onClick={() => dispatch({ type: 'SHOW_GUARDRAILS' })}>Show guardrails</button>
            ) : null}
          </div>
        </section>
      ) : null}

      {guardrailCases.length > 0 ? (
        <section className={styles.proofBeat} aria-labelledby="challansakshi-proof-guardrails-heading">
          <p className={styles.kicker}>UNDER-TWO-MINUTE CONTINUATION</p>
          <h3 id="challansakshi-proof-guardrails-heading" tabIndex={-1}>Guardrails: abstain when the evidence does not support action</h3>
          <div className={styles.guardrailCases}>
            {guardrailCases.map((testCase) => (
              <article key={testCase.id}>
                <span>{shortCaseId(testCase.id)}</span>
                <strong>{testCase.title}</strong>
                <p>{outcomeLabels[testCase.expectedOverall]} · no grievance field pack</p>
              </article>
            ))}
          </div>
          {state.stage === 'guardrails' ? (
            <button className={styles.secondaryButton} type="button" onClick={() => dispatch({ type: 'OPEN_EXTENSION_SIMULATION' })}>
              Open optional synthetic extension simulation
            </button>
          ) : null}
        </section>
      ) : null}

      {state.extensionSimulationVisible ? (
        <section className={styles.proofBeat} aria-labelledby="challansakshi-proof-extension-heading">
          <p className={styles.kicker}>OPTIONAL · AFTER THE CORE PROOF</p>
          <h3 id="challansakshi-proof-extension-heading" tabIndex={-1}>Synthetic extension simulation</h3>
          <p>Use only the conspicuously fictional loopback fixtures. Real official adapters remain disabled until verified and approved.</p>
          <p>Only the fictional category and reviewed description are allowed. CAPTCHA, OTP, Aadhaar, credentials, payment, attachments, declarations, and Submit stay untouched.</p>
          <div className={styles.proofActions}>
            <a className={styles.secondaryButton} href={sourceFixture.path}>Open fictional source fixture</a>
            <a className={styles.secondaryButton} href={destinationFixture.path}>Open fictional destination fixture</a>
          </div>
        </section>
      ) : null}
    </section>
  );
}

function SyntheticJudgeProofLane() {
  const flagship = syntheticEvaluationCases.find((item) => item.id === 'case-04-category-conflict');
  if (!flagship) throw new Error('The flagship synthetic proof case is unavailable.');
  const [state, dispatch] = useReducer(
    reduceSyntheticJudgeProofState,
    flagship,
    createSyntheticJudgeProofState,
  );

  useEffect(() => {
    dispatch({ type: 'START_90_SECOND_PROOF' });
  }, []);

  useEffect(() => {
    if (state.focusRequest === 0 || !state.focusTargetId) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(state.focusTargetId ?? '')?.focus({ preventScroll: true });
      document.getElementById(state.focusTargetId ?? '')?.scrollIntoView({ block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [state.focusRequest, state.focusTargetId]);

  return <SyntheticJudgeProofView state={state} dispatch={dispatch} />;
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
  const [focusTargetId, setFocusTargetId] = useState<string | null>(null);
  const [selectionAnnouncement, setSelectionAnnouncement] = useState('');
  const [proofRequest, setProofRequest] = useState(0);
  const [suiteRevealRequest, setSuiteRevealRequest] = useState(0);
  const suiteHeadingRef = useRef<HTMLHeadingElement>(null);
  const selectedWorkbenchRef = useRef<HTMLDivElement>(null);
  const selected = syntheticEvaluationCases.find((item) => item.id === selectedId) ?? syntheticEvaluationCases[0];
  const filteredCases = syntheticEvaluationCases.filter((item) => filter === 'all' || item.expectedOverall === filter);
  const outcomeCounts = useMemo(() => ({
    discrepancies: syntheticEvaluationCases.filter((item) => item.expectedOverall === 'potential-evidence-discrepancy').length,
    consistent: syntheticEvaluationCases.filter((item) => item.expectedOverall === 'appears-consistent').length,
    inconclusive: syntheticEvaluationCases.filter((item) => item.expectedOverall === 'inconclusive').length,
  }), []);

  useEffect(() => {
    if (selectionRequest === 0 || !focusTargetId) return;
    const focusTarget = syntheticEvaluationCases.find((item) => item.id === focusTargetId);
    if (!focusTarget) return;
    const frame = requestAnimationFrame(() => {
      const heading = selectedWorkbenchRef.current?.querySelector<HTMLHeadingElement>('h2');
      heading?.focus({ preventScroll: true });
      if (window.matchMedia('(max-width: 980px)').matches) {
        selectedWorkbenchRef.current?.scrollIntoView({ block: 'start' });
      }
      setSelectionAnnouncement(`Selected ${focusTarget.title}. Evidence workbench ready.`);
    });
    return () => cancelAnimationFrame(frame);
  }, [focusTargetId, selectionRequest]);

  const runSuite = () => setSuiteReport(runSyntheticEvaluationCorpus());
  const runSuiteAndReveal = () => {
    runSuite();
    setSuiteRevealRequest((request) => request + 1);
  };
  useEffect(() => {
    if (suiteRevealRequest === 0) return;
    suiteHeadingRef.current?.focus({ preventScroll: true });
    suiteHeadingRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [suiteRevealRequest]);
  const applySelectionAction = (action: TestLabSelectionAction) => {
    const next = transitionTestLabSelection({
      filter,
      selectedId,
      selectionRequest,
      focusTargetId,
      announcement: selectionAnnouncement,
    }, action);
    setFilter(next.filter);
    setSelectedId(next.selectedId);
    setSelectionRequest(next.selectionRequest);
    setFocusTargetId(next.focusTargetId);
    setSelectionAnnouncement(next.announcement);
  };
  const startProof = () => {
    applySelectionAction({ type: 'start-proof' });
    setProofRequest((current) => current + 1);
  };
  const chooseFilter = (nextFilter: FilterId) => applySelectionAction({ type: 'filter', filter: nextFilter });
  const chooseCase = (caseId: string) => applySelectionAction({ type: 'case', caseId });

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#test-lab-main">Skip to Test Lab</a>
      <CitizenHeader language="en" setLanguage={() => undefined} boundary="demo" englishOnly />
      <main id="test-lab-main" className={styles.main}>
        <section className={styles.labMasthead} aria-labelledby="lab-title">
          <div className={styles.labIntroduction}>
            <p className={styles.labEyebrow}><FlaskConical size={18} aria-hidden="true" /> TEN CASES. ONE EVIDENCE ENGINE.</p>
            <h1 id="lab-title">Synthetic Evidence Test Lab</h1>
            <p className={styles.labLead}>Run the cases. Inspect the reasoning. Change a fact and see what changes.</p>
            <p className={styles.labDescription}>Compare source-linked observations, test uncertainty, and follow each result to a prepared next step. Every case stays open for inspection.</p>
            <div className={styles.labActions}>
              <button className={styles.labRunButton} type="button" onClick={runSuiteAndReveal}>Run all 10 cases <ArrowDownRight size={20} aria-hidden="true" /></button>
              <a className={styles.labWalkthrough} href="/demo">Full challan walkthrough <ArrowUpRight size={18} aria-hidden="true" /></a>
            </div>
            <a className={styles.labProofLink} href="#guided-proof"><Play size={15} aria-hidden="true" /> Or follow the 90-second guided proof</a>
          </div>
          <aside className={styles.engineOverview} aria-label="Synthetic case coverage">
            <div className={styles.engineOverviewHeader}><span>CASE COVERAGE</span><span className={styles.engineStatus}>Synthetic inputs</span></div>
            <div className={styles.engineCount}><strong>{syntheticEvaluationCases.length}</strong><span>different cases.<br />One set of rules.</span></div>
            <div className={styles.coverageBar} aria-hidden="true"><i style={{ flex: outcomeCounts.discrepancies }} /><i style={{ flex: outcomeCounts.consistent }} /><i style={{ flex: outcomeCounts.inconclusive }} /></div>
            <dl className={styles.coverageLegend}>
              <div><dt>Potential discrepancy</dt><dd>{outcomeCounts.discrepancies}</dd></div>
              <div><dt>Appears consistent</dt><dd>{outcomeCounts.consistent}</dd></div>
              <div><dt>Inconclusive</dt><dd>{outcomeCounts.inconclusive}</dd></div>
            </dl>
            <p>Expected case mix. Actual results are calculated when you run the suite.</p>
          </aside>
        </section>

        <section id="guided-proof" className={styles.judgeEntry} data-challansakshi-judge-entry="v1">
          <div className={styles.judgeIntro}>
            <p className={styles.kicker}>SYNTHETIC 90-SECOND PROOF</p>
            <a className={styles.suiteJump} href="#case-suite">Looking for the 10-case Test Lab? Open all ten cases ↓</a>
            <h2>Does this fictional image show the same vehicle as the record?</h2>
            <p className={styles.heroLead}>See one complete evidence-to-handoff loop, including a correction that clears the earlier result.</p>
          </div>
          <div className={styles.judgePair} aria-label="Compact fictional record and image pair">
            <article>
              <span>FICTIONAL VEHICLE RECORD</span>
              <strong>Blue Honda Activa 6G · Two-wheeler</strong>
              <SyntheticScene vehicle={syntheticEvaluationCases[3].extraction.vehicle_record} compact />
            </article>
            <b aria-hidden="true">≠</b>
            <article>
              <span>FICTIONAL ENFORCEMENT IMAGE</span>
              <strong>White Maruti Swift · Four-wheeler</strong>
              <SyntheticScene vehicle={syntheticEvaluationCases[3].extraction.enforcement_image} compact />
            </article>
          </div>
            <p className={styles.visualProvenance}>Synthetic photos with visible plates · pre-authored observations · no live model reading</p>
          <div className={styles.judgeBoundary} aria-label="Proof responsibility boundary">
            <p><b>AI extracts</b><span>Source-linked observations</span></p>
            <p><b>Rules compare</b><span>Bounded deterministic outcomes</span></p>
            <p><b>Citizen controls</b><span>Confirmation and every handoff</span></p>
          </div>
          <button className={styles.primaryButton} type="button" onClick={startProof}>Start the 90-second proof</button>
          <p className={styles.judgeSafety}><b>Synthetic demonstration data.</b> No real record, upload, government connection, filing, payment, or decision.</p>
        </section>

        {proofRequest > 0 ? <SyntheticJudgeProofLane key={proofRequest} /> : null}

        <section id="case-suite" className={styles.suiteSection} aria-labelledby="suite-heading">
          <div className={styles.suiteHeading}>
            <div><p className={styles.kicker}>RUNTIME EVALUATION</p><h2 id="suite-heading" ref={suiteHeadingRef} tabIndex={-1}>Synthetic Evidence Test Lab</h2><p>One engine, not ten canned conclusions.</p></div>
            {suiteReport ? <strong className={suiteReport.failed === 0 ? styles.suitePass : styles.suiteFail}>{suiteReport.passed} / {suiteReport.total} expected outcomes reproduced</strong> : <span>Press Run all to calculate every actual outcome.</span>}
          </div>
          <div className={styles.suiteOverview}>
            <div className={styles.heroActions}>
              <button className={styles.secondaryButton} type="button" onClick={runSuite}>Run all 10 cases</button>
              <a className={styles.secondaryButton} href="/demo">Open flagship walkthrough</a>
            </div>
            <aside className={styles.heroProof} aria-label="10 fictional cases and outcome distribution">
              <span><b>{syntheticEvaluationCases.length}</b> fictional cases</span>
              <span><b>{outcomeCounts.discrepancies}</b> potential discrepancies</span>
              <span><b>{outcomeCounts.consistent}</b> appear consistent</span>
              <span><b>{outcomeCounts.inconclusive}</b> inconclusive</span>
            </aside>
          </div>
          <p className={styles.liveRegion} aria-live="polite">{suiteReport ? `${suiteReport.total} cases complete: ${suiteReport.passed} passed, ${suiteReport.failed} failed.` : ''}</p>
          <div className={styles.filters} role="group" aria-label="Filter Test Lab cases">
            {filterOptions.map(([id, label]) => <button className={styles.filterButton} type="button" key={id} aria-pressed={filter === id} onClick={() => chooseFilter(id)}>{label}</button>)}
          </div>
          <p className={styles.selectionStatus} role="status" aria-live="polite">{selectionAnnouncement}</p>
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
                    <span>{shortCaseId(testCase.id)}</span>
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
              <TestCaseWorkbench key={`${selected.id}-${selectionRequest}`} testCase={selected} />
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
