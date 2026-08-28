import { describe, expect, it } from 'vitest';
import {
  buildCitizenEvidenceSummary,
  buildCitizenEvidenceView,
  buildCitizenTimeline,
} from '../lib/evidence-intelligence';

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

describe('citizen evidence intelligence', () => {
  it('labels a downloaded record as citizen-declared rather than government-authenticated', () => {
    const view = buildCitizenEvidenceView({ answers, recordName: 'challan.pdf', photographName: 'photo.jpg' });
    expect(view.sources[0]).toMatchObject({
      id: 'source-official-copy',
      kind: 'official-record-copy',
      acquisition: 'local-file-preview',
      authenticity: 'citizen-declared-origin',
    });
    expect(view.sources).not.toContainEqual(expect.objectContaining({ authenticity: 'authorised-connector' }));
  });

  it('keeps unclear observations inconclusive and explains the limitation', () => {
    const view = buildCitizenEvidenceView({ answers, recordName: 'challan.pdf', photographName: 'photo.jpg' });
    expect(view.observations.find((item) => item.field === 'Alleged offence')).toMatchObject({
      id: 'observation-alleged-offence',
      confidence: 'inconclusive',
      confirmation: 'confirmed',
      limitation: 'The citizen recorded that the supplied still is unclear.',
    });
  });

  it('marks readable plate and category differences as material but colour as context only', () => {
    const view = buildCitizenEvidenceView({ answers, recordName: 'challan.pdf', photographName: 'photo.jpg' });
    expect(view.conflicts.map((item) => [item.reason, item.materiality])).toEqual([
      ['registration', 'material'],
      ['vehicle-category', 'material'],
      ['colour', 'context-only'],
    ]);
  });

  it('does not give an uninspected vehicle difference high confidence or materiality', () => {
    const view = buildCitizenEvidenceView({
      answers: { ...answers, imageInspected: false, plateObservation: 'different', categoryObservation: 'match', colourObservation: 'match' },
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
      recordName: 'challan.pdf',
      photographName: 'photo.jpg',
    });
    expect(view.observations.find((item) => item.field === field)).toMatchObject({
      confidence: 'inconclusive',
      limitation,
    });
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
});
