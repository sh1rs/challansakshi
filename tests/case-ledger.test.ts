import { describe, expect, it } from 'vitest';
import { classifyEvidenceComparison, deriveConfirmedVehicleFacts } from '../lib/domain';
import { fixtures } from '../lib/fixtures';
import {
  buildCaseLedger,
  buildCorrectionRecords,
  buildEvidenceIndex,
  createSubmittedRevisionId,
  deriveCaseLedgerSnapshot,
} from '../lib/case-ledger';
import {
  buildClarificationDraft,
  buildOrderEvidenceMap,
  buildOrderReviewArtifact,
  buildOrderReviewNote,
  buildPostDecisionCalendar,
  buildSyntheticRejectedOrder,
  createInitialOrderMapReviews,
  invalidateOrderMapConfirmations,
  validateOrderFactReview,
  validateOrderMapReview,
} from '../lib/order-evidence';

function heroContext() {
  const fixture = fixtures.mismatch;
  const facts = fixture.extractedFacts.map((fact) => ({ ...fact }));
  const confirmedFacts = deriveConfirmedVehicleFacts(fixture.confirmedFacts, facts);
  const classification = classifyEvidenceComparison(confirmedFacts);
  const revisionId = createSubmittedRevisionId(fixture.id, facts);
  const evidenceIndex = buildEvidenceIndex({
    challanNumber: fixture.challanNumber,
    registeredPlate: confirmedFacts.registeredPlate,
    observedPlate: confirmedFacts.observedPlate,
    submittedRevisionId: revisionId,
  });
  const order = buildSyntheticRejectedOrder({
    finding: classification.finding,
    grievanceNumber: 'DEMO-GRV-A-0827-17',
    challanNumber: fixture.challanNumber,
    registeredPlate: confirmedFacts.registeredPlate,
  });
  const rows = buildOrderEvidenceMap({ classification, confirmedFacts, evidenceIndex });
  return { fixture, facts, confirmedFacts, classification, revisionId, evidenceIndex, order, rows };
}

describe('citizen review provenance', () => {
  it.each([
    ['not-supplied', /not supplied/i, /no independent citizen photograph/i],
    ['reused', /reused demo reference/i, /same.*A3.*not independent/i],
  ] as const)('keeps %s citizen photographs explicit in the prepared evidence index', (citizenPhotoStatus, label, summary) => {
    const index = buildEvidenceIndex({
      challanNumber: 'CS-DEMO-260820-B',
      registeredPlate: 'TEST-26-SC-4412',
      observedPlate: '',
      submittedRevisionId: null,
      citizenPhotoStatus,
    });
    const photo = index.find(item => item.id === 'A4');
    expect(photo?.label.en).toMatch(label);
    expect(photo?.summary).toMatch(summary);
  });

  it('creates a stable submitted revision for the same ordered fact set', () => {
    const { fixture, facts } = heroContext();
    const reversed = [...facts].reverse();
    expect(createSubmittedRevisionId(fixture.id, facts)).toBe(createSubmittedRevisionId(fixture.id, reversed));
  });

  it('keeps untouched analysis facts out of the correction list', () => {
    const { facts, revisionId } = heroContext();
    expect(buildCorrectionRecords(facts, facts.map((fact) => ({ ...fact })), revisionId)).toEqual([]);
  });

  it('preserves original and citizen-confirmed values in a correction record', () => {
    const { facts, revisionId } = heroContext();
    const edited = facts.map((fact) => fact.id === 'observed-colour' ? { ...fact, value: 'Cream' } : { ...fact });
    expect(buildCorrectionRecords(facts, edited, revisionId)).toEqual([
      expect.objectContaining({
        factId: 'observed-colour',
        evidenceId: 'A3',
        initialValue: 'White',
        confirmedValue: 'Cream',
        valueChanged: true,
        visibilityChanged: false,
        actor: 'citizen',
      }),
    ]);
  });

  it('records a visibility-only correction without claiming the text changed', () => {
    const { facts, revisionId } = heroContext();
    const edited = facts.map((fact) => fact.id === 'observed-registration' ? { ...fact, visibility: 'unclear' as const } : { ...fact });
    expect(buildCorrectionRecords(facts, edited, revisionId)[0]).toMatchObject({
      valueChanged: false,
      visibilityChanged: true,
      initialVisibility: 'clear',
      confirmedVisibility: 'unclear',
    });
  });
});

describe('order-to-evidence engine', () => {
  it('builds the balanced six-row hero map with all three neutral statuses', () => {
    const { rows } = heroContext();
    expect(rows.map((row) => row.id)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
    expect(rows.map((row) => row.suggestedStatus)).toEqual(['mentioned', 'unclear', 'not-found', 'not-found', 'unclear', 'unclear']);
  });

  it('maps only discrepancies that remain after citizen edits', () => {
    const { confirmedFacts, evidenceIndex } = heroContext();
    const registrationOnly = classifyEvidenceComparison({
      ...confirmedFacts,
      observedCategory: confirmedFacts.registeredCategory,
      observedColour: confirmedFacts.registeredColour,
      offenceAssessable: 'yes',
    });
    const rows = buildOrderEvidenceMap({ classification: registrationOnly, confirmedFacts, evidenceIndex });
    expect(rows.map((row) => row.label.en)).toEqual([
      'Registered vehicle identifier',
      'Registration comparison',
      'Requested reasoned review',
    ]);
  });

  it('adds a custody row and explicit order paragraph without changing the hero map', () => {
    const fixture = fixtures.consistent;
    const confirmedFacts = deriveConfirmedVehicleFacts(fixture.confirmedFacts, fixture.extractedFacts);
    const classification = classifyEvidenceComparison(confirmedFacts);
    const custodyContext = {
      evidenceId: 'C2' as const,
      label: { en: 'Vehicle relationship timeline', hi: 'वाहन संबंध समय-रेखा' },
      submittedPoint: { en: 'The event falls outside the supplied interval.', hi: 'घटना दी अवधि के बाहर है।' },
    };
    const evidenceIndex = buildEvidenceIndex({
      challanNumber: fixture.challanNumber,
      registeredPlate: confirmedFacts.registeredPlate,
      observedPlate: confirmedFacts.observedPlate,
      submittedRevisionId: 'SUB-CONSISTENT-CUSTODY',
      custody: { id: 'C2', label: custodyContext.label, summary: 'Synthetic transfer acknowledgement' },
    });
    const order = buildSyntheticRejectedOrder({
      finding: classification.finding,
      grievanceNumber: 'DEMO-GRV-C-0827-11',
      challanNumber: fixture.challanNumber,
      registeredPlate: confirmedFacts.registeredPlate,
      custodyContext,
    });
    const rows = buildOrderEvidenceMap({ classification, confirmedFacts, evidenceIndex, custodyContext });
    expect(order.paragraphs.map((paragraph) => paragraph.id)).toContain('O7');
    expect(rows.find((row) => row.evidenceIds.includes('C2'))).toMatchObject({ suggestedReasonRefs: ['O2', 'O7'], matchBasis: 'direct-phrase' });
    expect(heroContext().rows).toHaveLength(6);
  });

  it('does not cite the mismatch paragraph as if it discussed a separate custody point', () => {
    const { fixture, confirmedFacts, classification, revisionId } = heroContext();
    const custodyContext = {
      evidenceId: 'C2' as const,
      label: { en: 'Vehicle relationship timeline', hi: 'वाहन संबंध समय-रेखा' },
      submittedPoint: { en: 'The event falls outside the supplied interval.', hi: 'घटना दी अवधि के बाहर है।' },
    };
    const evidenceIndex = buildEvidenceIndex({
      challanNumber: fixture.challanNumber,
      registeredPlate: confirmedFacts.registeredPlate,
      observedPlate: confirmedFacts.observedPlate,
      submittedRevisionId: revisionId,
      custody: { id: 'C2', label: custodyContext.label, summary: 'Synthetic transfer acknowledgement' },
    });
    const order = buildSyntheticRejectedOrder({
      finding: classification.finding,
      grievanceNumber: 'DEMO-GRV-A-0827-17',
      challanNumber: fixture.challanNumber,
      registeredPlate: confirmedFacts.registeredPlate,
      custodyContext,
    });
    const rows = buildOrderEvidenceMap({ classification, confirmedFacts, evidenceIndex, custodyContext });
    const custodyRow = rows.find((row) => row.evidenceIds.includes('C2'));
    expect(order.paragraphs.find((paragraph) => paragraph.id === 'O2')?.text.en).toContain('enforcement image differs');
    expect(custodyRow).toMatchObject({ suggestedReasonRefs: ['O7'], matchBasis: 'direct-phrase' });
    expect(custodyRow?.explanation.en).toContain('O2 addresses only the separate vehicle-mismatch statement');
  });

  it('never creates discrepancy rows for the unclear fixture', () => {
    const fixture = fixtures.inconclusive;
    const confirmedFacts = deriveConfirmedVehicleFacts(fixture.confirmedFacts, fixture.extractedFacts);
    const classification = classifyEvidenceComparison(confirmedFacts);
    const evidenceIndex = buildEvidenceIndex({
      challanNumber: fixture.challanNumber,
      registeredPlate: confirmedFacts.registeredPlate,
      observedPlate: confirmedFacts.observedPlate,
      submittedRevisionId: 'SUB-INCONCLUSIVE-DEMO',
    });
    const rows = buildOrderEvidenceMap({ classification, confirmedFacts, evidenceIndex });
    expect(classification.discrepancies).toEqual([]);
    expect(rows.some((row) => row.label.en.includes('comparison'))).toBe(false);
    expect(rows.some((row) => row.label.en === 'Unreadable registration in image')).toBe(true);
  });

  it('requires every extracted order fact and a completeness answer', () => {
    const { order } = heroContext();
    const allIds = order.extractedFacts.map((fact) => fact.id);
    expect(validateOrderFactReview(order.extractedFacts, allIds, null)).toMatchObject({ complete: false, completenessAnswered: false });
    expect(validateOrderFactReview(order.extractedFacts, allIds, 'yes')).toMatchObject({ complete: true, missingFactIds: [], emptyFactIds: [] });
    const invalidDate = order.extractedFacts.map((fact) => fact.id === 'order-date' ? { ...fact, value: '27 September' } : fact);
    expect(validateOrderFactReview(invalidDate, allIds, 'yes')).toMatchObject({ complete: false, invalidFactIds: ['order-date'] });
  });

  it('rejects impossible chronology and identifiers that break submission linkage', () => {
    const { order } = heroContext();
    const allIds = order.extractedFacts.map((fact) => fact.id);
    const expected = {
      'order-id': order.id,
      'grievance-id': order.grievanceNumber,
      'challan-id': order.challanNumber,
      outcome: 'Grievance rejected',
    } as const;
    const wrongChallan = order.extractedFacts.map((fact) => fact.id === 'challan-id' ? { ...fact, value: 'CS-OTHER-CASE' } : fact);
    expect(validateOrderFactReview(wrongChallan, allIds, 'yes', expected)).toMatchObject({ complete: false, invalidFactIds: ['challan-id'] });
    const beforeAcknowledgement = order.extractedFacts.map((fact) => fact.id === 'order-date' ? { ...fact, value: '2026-08-26' } : fact);
    expect(validateOrderFactReview(beforeAcknowledgement, allIds, 'yes', expected)).toMatchObject({ complete: false, invalidFactIds: ['order-date'] });
    const afterReview = order.extractedFacts.map((fact) => fact.id === 'order-date' ? { ...fact, value: '2026-10-06' } : fact);
    expect(validateOrderFactReview(afterReview, allIds, 'yes', expected)).toMatchObject({ complete: false, invalidFactIds: ['order-date'] });
    const rolledDate = order.extractedFacts.map((fact) => fact.id === 'order-date' ? { ...fact, value: '2026-09-31' } : fact);
    expect(validateOrderFactReview(rolledDate, allIds, 'yes', expected)).toMatchObject({ complete: false, invalidFactIds: ['order-date'] });
  });

  it('requires every mapping confirmation and valid paragraph provenance', () => {
    const { rows, order } = heroContext();
    const reviews = createInitialOrderMapReviews(rows);
    expect(validateOrderMapReview(rows, reviews, order.paragraphs.map((paragraph) => paragraph.id)).complete).toBe(false);
    for (const review of Object.values(reviews)) review.confirmed = true;
    expect(validateOrderMapReview(rows, reviews, order.paragraphs.map((paragraph) => paragraph.id))).toMatchObject({ complete: true });
    reviews.P2.reasonRefs = ['O99'];
    expect(validateOrderMapReview(rows, reviews, order.paragraphs.map((paragraph) => paragraph.id))).toMatchObject({ complete: false, invalidReferenceRowIds: ['P2'] });
  });

  it('invalidates every row confirmation when document scope changes', () => {
    const { rows } = heroContext();
    const reviews = createInitialOrderMapReviews(rows);
    for (const review of Object.values(reviews)) review.confirmed = true;
    const invalidated = invalidateOrderMapConfirmations(reviews);
    expect(Object.values(invalidated).every((review) => !review.confirmed)).toBe(true);
    expect(Object.values(reviews).every((review) => review.confirmed)).toBe(true);
    expect(invalidated.P2.status).toBe(reviews.P2.status);
    expect(invalidated.P2.reasonRefs).toEqual(reviews.P2.reasonRefs);
  });

  it('validates every evidence and order citation in the downloaded artifact', () => {
    const { order, rows, evidenceIndex, revisionId } = heroContext();
    const reviews = createInitialOrderMapReviews(rows);
    for (const review of Object.values(reviews)) review.confirmed = true;
    const artifact = buildOrderReviewArtifact({
      generatedOn: '2026-10-05', order, extractedFacts: order.extractedFacts, completeness: 'yes', rows, reviews, evidenceIndex, submittedRevisionId: revisionId,
    });
    expect(artifact.schema).toBe('challansakshi.order-review.v1');
    expect(artifact.mappings.every((mapping) => mapping.evidenceIds.every((id) => evidenceIndex.some((item) => item.id === id)))).toBe(true);
  });

  it('preserves a citizen correction without changing the locked order source', () => {
    const { order, rows, evidenceIndex, revisionId } = heroContext();
    const reviews = createInitialOrderMapReviews(rows);
    for (const review of Object.values(reviews)) review.confirmed = true;
    const extractedFacts = order.extractedFacts.map((fact) => fact.id === 'reason' ? { ...fact, value: `${fact.value} Citizen-added punctuation.` } : { ...fact });
    const artifact = buildOrderReviewArtifact({
      generatedOn: '2026-10-05', order, extractedFacts, completeness: 'yes', rows, reviews, evidenceIndex, submittedRevisionId: revisionId,
    });
    expect(artifact.citizenCorrections).toEqual([expect.objectContaining({ factId: 'reason', initialValue: order.extractedFacts[5].value })]);
    expect(artifact.sourceOrder.extractedFacts[5].value).toBe(order.extractedFacts[5].value);
  });

  it('fails safely when an order reference does not exist', () => {
    const { order, rows, evidenceIndex, revisionId } = heroContext();
    const reviews = createInitialOrderMapReviews(rows);
    for (const review of Object.values(reviews)) review.confirmed = true;
    reviews.P2.reasonRefs = ['O404'];
    expect(() => buildOrderReviewArtifact({
      generatedOn: '2026-10-05', order, extractedFacts: order.extractedFacts, completeness: 'yes', rows, reviews, evidenceIndex, submittedRevisionId: revisionId,
    })).toThrow('Unknown order reference');
  });

  it('refuses to export an unconfirmed mapping row', () => {
    const { order, rows, evidenceIndex, revisionId } = heroContext();
    const reviews = createInitialOrderMapReviews(rows);
    for (const review of Object.values(reviews)) review.confirmed = true;
    reviews.P3.confirmed = false;
    expect(() => buildOrderReviewArtifact({
      generatedOn: '2026-10-05', order, extractedFacts: order.extractedFacts, completeness: 'yes', rows, reviews, evidenceIndex, submittedRevisionId: revisionId,
    })).toThrow('Unconfirmed review for P3');
  });

  it('scopes missing references to supplied pages when completeness is uncertain', () => {
    const { rows } = heroContext();
    const reviews = createInitialOrderMapReviews(rows);
    const draft = buildClarificationDraft({
      language: 'en', challanNumber: 'CS-DEMO-260820-A', grievanceNumber: 'DEMO-GRV-A-0827-17', completeness: 'not-sure', rows, reviews,
    });
    expect(draft).toContain('Please provide the complete order and any linked annexures.');
    expect(draft).toContain('supplied pages');
    expect(draft).not.toContain('authority failed');
  });

  it('produces a neutral note without declaring guilt, innocence, or a legal outcome', () => {
    const { order, rows, evidenceIndex, revisionId } = heroContext();
    const reviews = createInitialOrderMapReviews(rows);
    for (const review of Object.values(reviews)) review.confirmed = true;
    const note = buildOrderReviewNote({
      language: 'en', generatedOn: '2026-10-05', order, extractedFacts: order.extractedFacts, completeness: 'yes', rows, reviews, evidenceIndex, submittedRevisionId: revisionId,
    });
    expect(note).toContain('Citizen-confirmed comparison');
    expect(note).toContain('does not mean the authority ignored');
    expect(note).not.toMatch(/you are innocent|you are guilty|you should appeal|will win/i);
  });
});

describe('derived case ledger', () => {
  it.each([
    ['not-supplied', /citizen photograph was not supplied/i],
    ['reused', /reused.*not an independent citizen photograph/i],
  ] as const)('does not record a %s photograph as separately loaded or analyzed', (citizenPhotoStatus, detail) => {
    const events = buildCaseLedger({
      fixtureId: 'inconclusive', issueDate: '2026-08-20', analysisMode: 'precomputed', confirmed: false,
      corrections: [], finding: 'inconclusive', packPrepared: false, submitted: false,
      submittedRevisionId: null, trackingStage: 2, outcome: 'none', orderFactsConfirmed: false,
      orderMapConfirmed: false, citizenPhotoStatus,
    });
    expect(events[0].detail.en).toMatch(detail);
    expect(events.some(event => event.evidenceIds.includes('A4'))).toBe(false);
  });

  it('records one coherent rejected branch in chronological sequence', () => {
    const { fixture, facts, classification, revisionId } = heroContext();
    const events = buildCaseLedger({
      fixtureId: fixture.id,
      issueDate: fixture.issueDate,
      analysisMode: 'precomputed',
      confirmed: true,
      corrections: [],
      finding: classification.finding,
      packPrepared: true,
      submitted: true,
      submittedRevisionId: revisionId,
      trackingStage: 4,
      outcome: 'rejected',
      orderFactsConfirmed: true,
      orderMapConfirmed: true,
    });
    expect(events.map((event) => event.sequence)).toEqual(events.map((_, index) => index + 1));
    expect(events.map((event) => event.type)).toContain('authority-order-recorded');
    expect(events.filter((event) => event.type === 'authority-order-recorded')).toHaveLength(1);
    expect(events.filter((event) => ['order-extraction-confirmed', 'order-map-confirmed'].includes(event.type)).every((event) => event.recordedOn === '2026-10-05')).toBe(true);
    expect(events.filter((event) => event.revisionId && event.revisionId !== revisionId)).toHaveLength(0);
    expect(deriveCaseLedgerSnapshot(events, revisionId)).toMatchObject({ stage: 'order-reviewed', activeClock: 'post-decision', canReviewOrder: true });
    expect(facts.length).toBeGreaterThan(0);
  });

  it('does not create an order before a rejected outcome is selected', () => {
    const { fixture, classification, revisionId } = heroContext();
    const events = buildCaseLedger({
      fixtureId: fixture.id, issueDate: fixture.issueDate, analysisMode: 'precomputed', confirmed: true, corrections: [], finding: classification.finding, packPrepared: true,
      submitted: true, submittedRevisionId: revisionId, trackingStage: 3, outcome: 'none', orderFactsConfirmed: false, orderMapConfirmed: false,
    });
    expect(events.some((event) => event.type === 'authority-order-recorded')).toBe(false);
    expect(deriveCaseLedgerSnapshot(events, revisionId)).toMatchObject({ stage: 'authority-review', activeClock: 'authority' });
  });

  it('records no-resolution as a status snapshot with no order map', () => {
    const { fixture, classification, revisionId } = heroContext();
    const events = buildCaseLedger({
      fixtureId: fixture.id, issueDate: fixture.issueDate, analysisMode: 'precomputed', confirmed: true, corrections: [], finding: classification.finding, packPrepared: true,
      submitted: true, submittedRevisionId: revisionId, trackingStage: 4, outcome: 'no-resolution', orderFactsConfirmed: false, orderMapConfirmed: false,
    });
    expect(events.some((event) => event.type === 'no-decision-status-recorded')).toBe(true);
    expect(events.some((event) => event.type === 'authority-order-recorded')).toBe(false);
  });

  it('does not append submission events to a consistent case', () => {
    const fixture = fixtures.consistent;
    const classification = classifyEvidenceComparison(fixture.confirmedFacts);
    const events = buildCaseLedger({
      fixtureId: fixture.id, issueDate: fixture.issueDate, analysisMode: 'precomputed', confirmed: true, corrections: [], finding: classification.finding, packPrepared: true,
      submitted: true, submittedRevisionId: 'STALE-SUBMISSION', trackingStage: 4, outcome: 'rejected', orderFactsConfirmed: true, orderMapConfirmed: true,
    });
    expect(events.some((event) => event.type === 'submission-acknowledged')).toBe(false);
    expect(events.some((event) => event.type === 'authority-order-recorded')).toBe(false);
  });

  it('allows a consistent visual case to progress only when a separate supported custody ground is present', () => {
    const fixture = fixtures.consistent;
    const revisionId = createSubmittedRevisionId(fixture.id, fixture.extractedFacts);
    const events = buildCaseLedger({
      fixtureId: fixture.id,
      issueDate: fixture.issueDate,
      analysisMode: 'precomputed',
      confirmed: true,
      corrections: [],
      finding: 'consistent',
      passportConfirmed: true,
      passportRevisionId: 'PASS-CONSISTENT-CUSTODY',
      custodyEvidenceId: 'C2',
      canPreparePack: true,
      packPrepared: true,
      submitted: true,
      submittedRevisionId: revisionId,
      trackingStage: 3,
      outcome: 'none',
      orderFactsConfirmed: false,
      orderMapConfirmed: false,
    });
    expect(events.map((event) => event.type)).toEqual(expect.arrayContaining(['evidence-passport-confirmed', 'pack-prepared', 'submission-acknowledged']));
    expect(events.find((event) => event.type === 'finding-recorded')?.detail.en).toContain('separately reviewed custody timeline');
    expect(events.find((event) => event.type === 'evidence-passport-confirmed')?.evidenceIds).toContain('C2');
  });

  it('records a contest-ready pack before submission', () => {
    const { fixture, classification, revisionId } = heroContext();
    const events = buildCaseLedger({
      fixtureId: fixture.id, issueDate: fixture.issueDate, analysisMode: 'precomputed', confirmed: true, corrections: [], finding: classification.finding,
      packPrepared: true, submitted: false, submittedRevisionId: revisionId, trackingStage: 0, outcome: 'none', orderFactsConfirmed: false, orderMapConfirmed: false,
    });
    expect(events.some((event) => event.type === 'pack-prepared')).toBe(true);
    expect(events.some((event) => event.type === 'submission-acknowledged')).toBe(false);
    expect(deriveCaseLedgerSnapshot(events, revisionId)).toMatchObject({ stage: 'contest-ready', activeClock: 'contest' });
  });

  it('closes the active clock when the fictional order quashes the challan', () => {
    const { fixture, classification, revisionId } = heroContext();
    const events = buildCaseLedger({
      fixtureId: fixture.id, issueDate: fixture.issueDate, analysisMode: 'precomputed', confirmed: true, corrections: [], finding: classification.finding,
      packPrepared: true, submitted: true, submittedRevisionId: revisionId, trackingStage: 4, outcome: 'quashed', orderFactsConfirmed: false, orderMapConfirmed: false,
    });
    expect(deriveCaseLedgerSnapshot(events, revisionId)).toMatchObject({ stage: 'decision-recorded', activeClock: 'none', canReviewOrder: false });
  });

  it('builds a portable calendar reminder with the indicative boundary', () => {
    const calendar = buildPostDecisionCalendar({ orderDate: '2026-09-27', indicativeBoundary: '2026-10-27', orderId: 'DEMO-ORD-A-01' });
    expect(calendar).toContain('BEGIN:VCALENDAR');
    expect(calendar).toContain('DTSTAMP:20261005T000000Z');
    expect(calendar).toContain('DTSTART;VALUE=DATE:20261027');
    expect(calendar).not.toContain('DTEND');
    expect(calendar).toContain('Verify the current official route and cutoff');
  });
});
