import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  buildCitizenEvidenceSummary,
  buildCitizenEvidencePresentationView,
  buildCitizenEvidenceView,
  buildCitizenTimeline,
  type ConfirmationStatus,
  type CitizenEvidenceViewInput,
  type EvidenceConfidence,
} from '../lib/evidence-intelligence';
import {
  getCitizenReviewPresentation,
  localizeAssessment,
  localizeEvidenceLimitation,
} from '../lib/citizen-review-presentation';
import { assessCitizenChallanReview, citizenSituationForFinding } from '../lib/public-challan';

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
const recordMeta = {
  role: 'official-record',
  type: 'application/pdf',
  size: 2048,
  previewKind: 'pdf',
} as const;
const photographMeta = {
  role: 'photograph',
  type: 'image/webp',
  size: 4096,
  previewKind: 'image',
} as const;
const localSelections = { recordMeta, photographMeta } as const;

// @ts-expect-error The public builder requires the Task 4 post-gate confirmation.
void ({ answers, assessment } satisfies CitizenEvidenceViewInput);

describe('citizen evidence intelligence', () => {
  it('keeps canonical confidence and confirmation values strongly typed', () => {
    const view = buildCitizenEvidenceView({
      answers,
      assessment,
      confirmation: 'confirmed',
    });

    expectTypeOf(view.observations[0].confidence).toEqualTypeOf<EvidenceConfidence>();
    expectTypeOf(view.observations[0].confirmation).toEqualTypeOf<ConfirmationStatus>();
  });

  it('labels a downloaded record as citizen-declared rather than government-authenticated', () => {
    const view = buildCitizenEvidenceView({ answers, assessment, confirmation: 'confirmed', ...localSelections });
    expect(view.sources[0]).toMatchObject({
      id: 'source-official-copy',
      kind: 'official-record-copy',
      acquisition: 'local-file-preview',
      authenticity: 'citizen-declared-origin',
    });
    expect(view.sources).not.toContainEqual(expect.objectContaining({ authenticity: 'authorised-connector' }));
  });

  it('derives local-file presence from exact safe role metadata only', () => {
    const view = buildCitizenEvidenceView({
      answers,
      assessment,
      confirmation: 'confirmed',
      ...localSelections,
    });

    expect(view.sources[0].label).toBe('Citizen-selected local official-record copy');
    expect(view.sources[1].label).toBe('Citizen-selected local supplied photograph');
    expect(JSON.stringify(view)).not.toContain('application/pdf');
    expect(JSON.stringify(view)).not.toContain('image/webp');
    expect(buildCitizenEvidenceView({
      answers,
      assessment,
      confirmation: 'confirmed',
      recordMeta: { ...recordMeta, role: 'photograph' },
      photographMeta: { ...photographMeta, role: 'official-record' },
    }).sources.slice(0, 2).map((source) => source.acquisition)).toEqual([
      'citizen-recorded',
      'citizen-recorded',
    ]);
  });

  it('keeps unclear observations inconclusive and explains the limitation', () => {
    const view = buildCitizenEvidenceView({ answers, assessment, confirmation: 'confirmed', ...localSelections });
    expect(view.observations.find((item) => item.field === 'Alleged offence')).toMatchObject({
      id: 'observation-alleged-offence',
      confidence: 'inconclusive',
      confirmation: 'confirmed',
      limitation: 'The citizen recorded that the supplied still is unclear.',
    });
  });

  it('marks readable plate and category differences as material but colour as context only', () => {
    const view = buildCitizenEvidenceView({ answers, assessment, confirmation: 'confirmed', ...localSelections });
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
      ...localSelections,
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
      ...localSelections,
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
      ...localSelections,
    });

    expect(unreadyAssessment).toMatchObject({ finding: 'source-not-verified', canPrepareWorksheet: false });
    expect(view.conflicts).toContainEqual(expect.objectContaining({ reason: 'registration', materiality: 'needs-clarification' }));
  });

  it('does not let a stale action-ready assessment make a message-only difference material', () => {
    const currentAnswers = { ...answers, sourceStatus: 'message-only' as const, plateObservation: 'different' as const };
    const staleActionReadyAssessment = assessCitizenChallanReview(answers);
    const view = buildCitizenEvidenceView({
      answers: currentAnswers,
      assessment: staleActionReadyAssessment,
      confirmation: 'confirmed',
      ...localSelections,
    });

    expect(staleActionReadyAssessment).toMatchObject({ finding: 'citizen-recorded-inconsistency', canPrepareWorksheet: true });
    expect(assessCitizenChallanReview(currentAnswers)).toMatchObject({ finding: 'source-not-verified', canPrepareWorksheet: false });
    expect(view.conflicts).toContainEqual(expect.objectContaining({ reason: 'registration', materiality: 'needs-clarification' }));
    expect(view.conflicts).not.toContainEqual(expect.objectContaining({ reason: 'registration', materiality: 'material' }));
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
      'You recorded the record source',
      'You recorded evidence observations',
      'You generated a local case summary',
    ]);
    expect(timeline).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'timeline-started', actor: 'citizen' }),
      expect.objectContaining({ id: 'timeline-summary-generated', actor: 'citizen' }),
    ]));
    expect(JSON.stringify(timeline)).not.toMatch(/authority|received|accepted|rejected|quashed|timestamp/i);
  });

  it('localizes the evidence view fields, values, sources, confidence, confirmation, and limitations', () => {
    const canonicalView = buildCitizenEvidenceView({
      answers,
      assessment,
      confirmation: 'confirmed',
      ...localSelections,
    });
    const view = buildCitizenEvidencePresentationView(canonicalView, {
      language: 'hi',
      simpleMode: false,
    });

    expect(view.sources[0].label).toContain('नागरिक');
    expect(view.observations.find((item) => item.id === 'observation-registration-plate')).toMatchObject({
      field: 'नंबर प्लेट',
      value: 'अलग',
      confidence: 'उच्च',
      confirmation: 'नागरिक द्वारा पुष्ट',
    });
    expect(view.observations.find((item) => item.id === 'observation-alleged-offence')?.limitation)
      .toContain('नागरिक ने दर्ज किया');
  });

  it('localizes every citizen timeline event in Hindi', () => {
    const timeline = buildCitizenTimeline({
      recordSelected: true,
      imageSelected: true,
      sourceConfirmed: true,
      observationsConfirmed: true,
      summaryGenerated: true,
      language: 'hi',
    });

    expect(timeline.map((event) => event.label)).toEqual([
      'आपने निजी समीक्षा शुरू की',
      'आपने डाउनलोड किया रिकॉर्ड चुना',
      'आपने दी गई तस्वीर जोड़ी',
      'आपने रिकॉर्ड का स्रोत दर्ज किया',
      'आपने सबूत के अवलोकन पुष्ट किए',
      'आपने स्थानीय केस सारांश बनाया',
    ]);
  });

  it('generates a minimised summary with ordered sections, the mandatory disclaimer, and no file bytes', () => {
    const summary = buildCitizenEvidenceSummary({
      jurisdiction: 'Central e-Challan service',
      vehicleSuffix: '3317',
      allegedOffence: 'Helmet',
      eventDate: '2026-08-20',
      officialDeadline: '',
      ...localSelections,
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

  it.each([
    ['en', false],
    ['en', true],
    ['hi', false],
    ['hi', true],
  ] as const)('uses generic local-source labels in the %s summary when simple mode is %s', (language, simpleMode) => {
    const summary = buildCitizenEvidenceSummary({
      jurisdiction: 'Central e-Challan service',
      vehicleSuffix: '3317',
      allegedOffence: 'Helmet',
      eventDate: '2026-08-20',
      officialDeadline: '',
      ...localSelections,
      answers,
      assessment,
      confirmation: 'confirmed',
      language,
      simpleMode,
      timeline: buildCitizenTimeline({
        recordSelected: true,
        imageSelected: true,
        sourceConfirmed: true,
        observationsConfirmed: true,
        summaryGenerated: true,
        language,
      }),
    });

    expect(summary).not.toContain('application/pdf');
    expect(summary).not.toContain('image/webp');
    expect(summary).toContain(language === 'hi'
      ? 'नागरिक द्वारा चुनी स्थानीय आधिकारिक रिकॉर्ड कॉपी'
      : 'Citizen-selected local official-record copy');
  });

  it('generates a reviewed Hindi summary while retaining the exact English disclaimer', () => {
    const summary = buildCitizenEvidenceSummary({
      jurisdiction: 'राष्ट्रीय ई-चालान',
      vehicleSuffix: '3317',
      allegedOffence: 'हेलमेट',
      eventDate: '2026-08-20',
      officialDeadline: '',
      ...localSelections,
      answers,
      assessment,
      confirmation: 'confirmed',
      language: 'hi',
      simpleMode: true,
      timeline: buildCitizenTimeline({
        recordSelected: true,
        imageSelected: true,
        sourceConfirmed: true,
        observationsConfirmed: true,
        summaryGenerated: true,
        language: 'hi',
      }),
    });

    expect(summary).toContain('CHALLANSAKSHI — आपका स्थानीय सारांश');
    expect(summary).toContain('Prepared by the citizen using ChallanSakshi. Not submitted, authenticated, or approved by a government authority.');
    expect(summary).toContain('नागरिक ने ChallanSakshi का उपयोग करके तैयार किया। किसी सरकारी प्राधिकरण को जमा नहीं किया गया, प्रमाणित नहीं किया गया और मंज़ूर नहीं किया गया।');
    expect(summary).toContain('आपकी जानकारी');
    expect(summary).toContain('नंबर प्लेट: अलग');
    expect(summary).toContain('आपने स्थानीय केस सारांश बनाया');
    expect(summary).not.toContain('You recorded that the readable plate details differ.');
    expect(summary).not.toContain('A copy of the official notice');
  });

  it('uses reviewed Hindi fallbacks for manual entry with no files or optional facts', () => {
    const manualAnswers = {
      ...answers,
      sourceStatus: 'official-service' as const,
      ownRecordAvailable: 'unclear' as const,
      noticeCopyAvailable: 'unclear' as const,
    };
    const manualAssessment = assessCitizenChallanReview(manualAnswers);
    const canonicalView = buildCitizenEvidenceView({
      answers: manualAnswers,
      assessment: manualAssessment,
      confirmation: 'confirmed',
    });
    const view = buildCitizenEvidencePresentationView(canonicalView, {
      language: 'hi',
      simpleMode: false,
    });
    const summary = buildCitizenEvidenceSummary({
      jurisdiction: '',
      vehicleSuffix: '',
      allegedOffence: '',
      eventDate: '',
      officialDeadline: '',
      answers: manualAnswers,
      assessment: manualAssessment,
      confirmation: 'confirmed',
      language: 'hi',
      simpleMode: false,
      timeline: [],
    });

    expect(view.sources.map((source) => source.label)).toEqual([
      'नागरिक द्वारा दर्ज आधिकारिक सेवा रिकॉर्ड',
      'नागरिक द्वारा वर्णित दी गई तस्वीर',
      'नागरिक द्वारा दर्ज वाहन रिकॉर्ड: अस्पष्ट',
    ]);
    expect(summary).toContain('क्षेत्राधिकार या सेवा: [दर्ज नहीं]');
    expect(summary).toContain('वाहन नंबर के अंतिम अक्षर/अंक: [दर्ज नहीं]');
    expect(summary).toContain('आरोपित अपराध श्रेणी: [दर्ज नहीं]');
    expect(summary).not.toMatch(/\[not entered\]|Citizen-declared|Citizen-described|Citizen-reported/);
  });

  it('simplifies assessment presentation without changing codes, order, or readiness', () => {
    const reviewAnswers = {
      ...answers,
      categoryObservation: 'match' as const,
      ownRecordAvailable: 'unclear' as const,
      noticeCopyAvailable: 'missing' as const,
    };
    const reviewAssessment = assessCitizenChallanReview(reviewAnswers);
    const unchangedAssessment = structuredClone(reviewAssessment);
    const standard = localizeAssessment(reviewAssessment, 'en', false);
    const simple = localizeAssessment(reviewAssessment, 'en', true);
    const simpleHindi = localizeAssessment(reviewAssessment, 'hi', true);

    expect(standard.materialSignals[0]).toBe('You recorded that the readable plate details differ.');
    expect(simple.materialSignals[0]).toBe('The number plate looks different.');
    expect(simple.cautions[0]).toBe('These are your answers. ChallanSakshi did not check the records.');
    expect(simple.missingEvidence).toEqual(['A readable vehicle record', 'The official notice copy']);
    expect(simpleHindi.materialSignals[0]).toBe('नंबर प्लेट अलग दिखती है।');
    expect(simpleHindi.cautions[0]).toBe('ये आपके उत्तर हैं। ChallanSakshi ने रिकॉर्ड नहीं जाँचे।');
    expect(simpleHindi.missingEvidence).toEqual(['पढ़ने योग्य वाहन रिकॉर्ड', 'आधिकारिक नोटिस की कॉपी']);
    expect(simple.materialSignals).toHaveLength(reviewAssessment.materialSignals.length);
    expect(simple.cautions).toHaveLength(reviewAssessment.cautions.length);
    expect(reviewAssessment).toEqual(unchangedAssessment);
    expect(assessCitizenChallanReview(reviewAnswers)).toEqual(unchangedAssessment);
    expect(citizenSituationForFinding(reviewAssessment.finding)).toBe(
      citizenSituationForFinding(unchangedAssessment.finding),
    );
  });

  it('simplifies evidence limitations in both languages', () => {
    const limitation = 'The citizen recorded that the supplied still does not show the registration plate clearly.';

    expect(localizeEvidenceLimitation(limitation, 'en', false)).toBe(limitation);
    expect(localizeEvidenceLimitation(limitation, 'en', true)).toBe(
      'The number plate is not clear enough to read.',
    );
    expect(localizeEvidenceLimitation(limitation, 'hi', false)).toBe(
      'नागरिक ने दर्ज किया कि दी गई तस्वीर में नंबर प्लेट साफ़ नहीं दिखती।',
    );
    expect(localizeEvidenceLimitation(limitation, 'hi', true)).toBe(
      'नंबर प्लेट साफ़ नहीं पढ़ी जा सकती।',
    );
  });

  it.each([
    ['en', 'YOUR INFORMATION', 'WHAT YOU SAW', 'Please check these facts on the official service.'],
    ['hi', 'आपकी जानकारी', 'आपने क्या देखा', 'इन तथ्यों को आधिकारिक सेवा पर जाँचें।'],
  ] as const)('uses a complete simple %s artifact template', (language, detailsHeading, observationsHeading, bodySentence) => {
    const summary = buildCitizenEvidenceSummary({
      jurisdiction: language === 'hi' ? 'राष्ट्रीय ई-चालान' : 'National e-Challan',
      vehicleSuffix: '3317',
      allegedOffence: language === 'hi' ? 'हेलमेट' : 'Helmet',
      eventDate: '2026-08-20',
      officialDeadline: '',
      answers,
      assessment,
      confirmation: 'confirmed',
      language,
      simpleMode: true,
      timeline: buildCitizenTimeline({
        recordSelected: false,
        imageSelected: false,
        sourceConfirmed: true,
        observationsConfirmed: true,
        summaryGenerated: true,
        language,
      }),
    });

    expect(summary).toContain(detailsHeading);
    expect(summary).toContain(observationsHeading);
    expect(summary).toContain(bodySentence);
    expect(summary).toContain('Prepared by the citizen using ChallanSakshi. Not submitted, authenticated, or approved by a government authority.');
    expect(summary).not.toMatch(/MINIMISED CASE DETAILS|NEUTRAL CLARIFICATION REQUEST|न्यूनतम केस विवरण|तटस्थ स्पष्टीकरण अनुरोध/);
  });

  it('provides distinct simple result-section headings in English and Hindi', () => {
    expect(getCitizenReviewPresentation('en', true).resultSections).toEqual({
      established: 'What is clear',
      unclear: 'What is not clear',
      missing: 'What you still need',
      evidence: 'Your evidence notes',
      officialRoute: 'Where to go next',
    });
    expect(getCitizenReviewPresentation('hi', true).resultSections).toEqual({
      established: 'क्या साफ़ है',
      unclear: 'क्या साफ़ नहीं है',
      missing: 'आपको अभी क्या चाहिए',
      evidence: 'आपके सबूत के नोट',
      officialRoute: 'आगे कहाँ जाएँ',
    });
  });

  it('uses one concise visible limitation without weakening the exported disclaimer', () => {
    expect(getCitizenReviewPresentation('en', false).resultLimitation).toBe(
      'Based only on answers you confirmed. ChallanSakshi did not authenticate the records or decide the case.',
    );
    expect(getCitizenReviewPresentation('en', true).disclaimer.en).toBe(
      'Prepared by the citizen using ChallanSakshi. Not submitted, authenticated, or approved by a government authority.',
    );
  });

  it('sanitises hostile summary fields and keeps only canonical citizen timeline events', () => {
    const summary = buildCitizenEvidenceSummary({
      jurisdiction: 'Central service\r\nMATERIAL SIGNALS',
      vehicleSuffix: 'KA01AB3317',
      allegedOffence: 'data:text/plain,not-a-record',
      eventDate: '2026-08-20\nCITIZEN-CONFIRMED OBSERVATIONS',
      officialDeadline: 'blob:local-only',
      ...localSelections,
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
    expect(summary).not.toContain('file:');
    expect(summary).not.toContain('Authority accepted');
    expect(summary).not.toContain('Authority updated');
    expect(summary).not.toContain('Authority received');
    expect(summary).toContain('You started a private review');
    expect(summary).toContain('You generated a local case summary');
    expect(summary.match(/\nMATERIAL SIGNALS\n/g)).toHaveLength(1);
    expect(summary.match(/\nNEUTRAL CLARIFICATION REQUEST\n/g)).toHaveLength(1);
  });
});
