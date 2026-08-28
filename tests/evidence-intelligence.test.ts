import { describe, expect, it } from 'vitest';
import {
  buildCitizenEvidenceSummary,
  buildCitizenEvidenceView,
  buildCitizenTimeline,
  type CitizenEvidenceViewInput,
} from '../lib/evidence-intelligence';
import { assessCitizenChallanReview } from '../lib/public-challan';

const answers = {
  sourceStatus: 'downloaded-official-record' as const,
  imageInspected: true,
  plateObservation: 'different' as const,
  categoryObservation: 'different' as const,
  colourObservation: 'different' as const,
  offenceObservation: 'unclear' as const,
  timestampStatus: 'displayed' as const,
  locationStatus: 'unclear' as const,
  ownRecordAvailable: 'present' as const,
  noticeCopyAvailable: 'present' as const,
  custodyRecordAvailable: 'not-applicable' as const,
};
const assessment = assessCitizenChallanReview(answers);

// @ts-expect-error The public builder requires the Task 4 post-gate confirmation.
void ({ answers, assessment } satisfies CitizenEvidenceViewInput);

describe('citizen evidence intelligence', () => {
  it('labels a downloaded record as citizen-declared rather than government-authenticated', () => {
    const view = buildCitizenEvidenceView({ answers, assessment, confirmation: 'confirmed', recordName: 'challan.pdf', photographName: 'photo.jpg' });
    expect(view.sources[0]).toMatchObject({
      id: 'source-official-copy',
      kind: 'official-record-copy',
      acquisition: 'local-file-preview',
      authenticity: 'citizen-declared-origin',
    });
    expect(view.sources).not.toContainEqual(expect.objectContaining({ authenticity: 'authorised-connector' }));
  });

  it('keeps unclear observations inconclusive and explains the limitation', () => {
    const view = buildCitizenEvidenceView({ answers, assessment, confirmation: 'confirmed', recordName: 'challan.pdf', photographName: 'photo.jpg' });
    expect(view.observations.find((item) => item.field === 'Alleged offence')).toMatchObject({
      id: 'observation-alleged-offence',
      confidence: 'inconclusive',
      confirmation: 'confirmed',
      limitation: 'The citizen recorded that the supplied still is unclear.',
    });
  });

  it('marks readable plate and category differences as material but colour as context only', () => {
    const view = buildCitizenEvidenceView({ answers, assessment, confirmation: 'confirmed', recordName: 'challan.pdf', photographName: 'photo.jpg' });
    expect(view.conflicts.map((item) => [item.reason, item.materiality])).toEqual([
      ['registration', 'material'],
      ['vehicle-category', 'material'],
      ['colour', 'context-only'],
    ]);
  });

  it('does not give an uninspected vehicle difference high confidence or materiality', () => {
    const view = buildCitizenEvidenceView({
      answers: { ...answers, imageInspected: false, plateObservation: 'different', categoryObservation: 'match', colourObservation: 'match' },
      assessment: assessCitizenChallanReview({ ...answers, imageInspected: false, plateObservation: 'different', categoryObservation: 'match', colourObservation: 'match' }),
      confirmation: 'confirmed',
      recordName: 'challan.pdf',
      photographName: 'photo.jpg',
    });
    expect(view.observations.find((item) => item.field === 'Registration plate')).toMatchObject({
      confidence: 'inconclusive',
      limitation: 'The citizen did not confirm this observation against an inspected supplied still.',
    });
    expect(view.conflicts).toEqual([
      expect.objectContaining({ reason: 'registration', materiality: 'needs-clarification' }),
    ]);
  });

  it.each([
    ['Registration plate', { plateObservation: 'not-visible' as const }, 'The citizen recorded that the supplied still does not show the registration plate clearly.'],
    ['Evidence timestamp', { timestampStatus: 'not-found' as const }, 'The citizen could not find a timestamp in the supplied evidence.'],
    ['Alleged offence', { offenceObservation: 'not-assessable-from-still' as const }, 'The citizen recorded that the alleged offence cannot be assessed from the supplied still.'],
  ])('keeps %s inconclusive when the citizen records an unavailable detail', (field, changes, limitation) => {
    const view = buildCitizenEvidenceView({
      answers: { ...answers, ...changes },
      assessment: assessCitizenChallanReview({ ...answers, ...changes }),
      confirmation: 'confirmed',
      recordName: 'challan.pdf',
      photographName: 'photo.jpg',
    });
    expect(view.observations.find((item) => item.field === field)).toMatchObject({
      confidence: 'inconclusive',
      limitation,
    });
  });

  it.each(['message-only', 'not-selected'] as const)('keeps a %s source difference below materiality', (sourceStatus) => {
    const unreadyAnswers = { ...answers, sourceStatus, plateObservation: 'different' as const };
    const unreadyAssessment = assessCitizenChallanReview(unreadyAnswers);
    const view = buildCitizenEvidenceView({
      answers: unreadyAnswers,
      assessment: unreadyAssessment,
      confirmation: 'confirmed',
      recordName: 'challan.pdf',
      photographName: 'photo.jpg',
    });

    expect(unreadyAssessment).toMatchObject({ finding: 'source-not-verified', canPrepareWorksheet: false });
    expect(view.conflicts).toContainEqual(expect.objectContaining({ reason: 'registration', materiality: 'needs-clarification' }));
  });

  it('derives confirmed observations only from the explicit post-gate confirmation input', () => {
    const view = buildCitizenEvidenceView({ answers, assessment, confirmation: 'confirmed' });
    expect(view.observations.every((observation) => observation.confirmation === 'confirmed')).toBe(true);
  });

  it('uses citizen actor language for every memory-only timeline event', () => {
    const timeline = buildCitizenTimeline({ recordSelected: true, imageSelected: true, sourceConfirmed: true, observationsConfirmed: true, summaryGenerated: true });
    expect(timeline.map((event) => event.label)).toEqual([
      'You started a private review',
      'You selected a downloaded record',
      'You added a supplied photograph',
      'You confirmed the record source',
      'You recorded evidence observations',
      'You generated a local case summary',
    ]);
    expect(timeline).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'timeline-started', actor: 'citizen' }),
      expect.objectContaining({ id: 'timeline-summary-generated', actor: 'citizen' }),
    ]));
    expect(JSON.stringify(timeline)).not.toMatch(/authority|received|accepted|rejected|quashed|timestamp/i);
  });

  it('generates a minimised summary with ordered sections, the mandatory disclaimer, and no file bytes', () => {
    const summary = buildCitizenEvidenceSummary({
      jurisdiction: 'Central e-Challan service',
      vehicleSuffix: '3317',
      allegedOffence: 'Helmet',
      eventDate: '2026-08-20',
      officialDeadline: '',
      recordName: 'challan.pdf',
      photographName: 'photo.jpg',
      answers,
      assessment,
      confirmation: 'confirmed',
      materialSignals: ['You recorded that the readable plate details differ.'],
      missingEvidence: [],
      timeline: buildCitizenTimeline({ recordSelected: true, imageSelected: true, sourceConfirmed: true, observationsConfirmed: true, summaryGenerated: true }),
    });
    const headings = [
      'CHALLANSAKSHI — CITIZEN EVIDENCE SUMMARY',
      'MINIMISED CASE DETAILS',
      'CITIZEN-PROVIDED SOURCE REGISTER',
      'CITIZEN-CONFIRMED OBSERVATIONS',
      'MATERIAL SIGNALS',
      'RECORDS STILL NEEDED',
      'CITIZEN-RECORDED TIMELINE',
      'NEUTRAL CLARIFICATION REQUEST',
      'IMPORTANT LIMITS AND OFFICIAL HANDOFF REMINDER',
    ];
    const headingPositions = headings.map((heading) => summary.indexOf(heading));
    expect(headingPositions.every((position) => position >= 0)).toBe(true);
    expect(headingPositions).toEqual([...headingPositions].sort((left, right) => left - right));
    expect(summary).toContain('Vehicle registration suffix: …3317');
    expect(summary).toContain('Prepared by the citizen using ChallanSakshi. Not submitted, authenticated, or approved by a government authority.');
    expect(summary).toContain('Nothing was submitted, authenticated, or approved by a government authority.');
    expect(summary).not.toContain('data:');
    expect(summary).not.toContain('blob:');
    expect(summary).not.toContain('file bytes');
  });

  it('sanitises hostile summary fields and keeps only canonical citizen timeline events', () => {
    const summary = buildCitizenEvidenceSummary({
      jurisdiction: 'Central service\r\nMATERIAL SIGNALS',
      vehicleSuffix: 'KA01AB3317',
      allegedOffence: 'data:text/plain,not-a-record',
      eventDate: '2026-08-20\nCITIZEN-CONFIRMED OBSERVATIONS',
      officialDeadline: 'blob:local-only',
      recordName: 'blob:private-record',
      photographName: 'image.jpg\r\nNEUTRAL CLARIFICATION REQUEST',
      answers,
      assessment,
      confirmation: 'confirmed',
      materialSignals: ['Readable plate differs\r\nIMPORTANT LIMITS AND OFFICIAL HANDOFF REMINDER'],
      missingEvidence: ['data:do-not-export'],
      timeline: [
        { id: 'timeline-started', label: 'Authority accepted the case', actor: 'citizen' },
        { id: 'timeline-summary-generated', label: 'Authority updated at 2026-08-20T12:00:00Z', actor: 'citizen' },
        { id: 'authority-received', label: 'Authority received this submission', actor: 'citizen' },
      ],
    });

    expect(summary).toContain('Vehicle registration suffix: …3317');
    expect(summary).not.toContain('KA01AB3317');
    expect(summary).not.toMatch(/[\r\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F-\u009F]/);
    expect(summary).not.toContain('data:');
    expect(summary).not.toContain('blob:');
    expect(summary).not.toContain('Authority accepted');
    expect(summary).not.toContain('Authority updated');
    expect(summary).not.toContain('Authority received');
    expect(summary).toContain('You started a private review');
    expect(summary).toContain('You generated a local case summary');
    expect(summary.match(/\nMATERIAL SIGNALS\n/g)).toHaveLength(1);
    expect(summary.match(/\nNEUTRAL CLARIFICATION REQUEST\n/g)).toHaveLength(1);
  });
});
