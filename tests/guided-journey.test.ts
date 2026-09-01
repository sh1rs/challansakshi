import { describe, expect, it } from 'vitest';
import {
  buildChallanGuidedProgress,
  buildGuidedProgress,
  getChallanGuideContent,
  getTollGuideContent,
  type GuidedProgressStep,
} from '../lib/guided-journey';
import { assessTollReview, type TollAssessment } from '../lib/toll-domain';
import { tollFixtures } from '../lib/toll-fixtures';

const noDisputeAssessments: Array<{
  label: string;
  assessment: TollAssessment;
  instruction: string;
  status: string;
}> = [
  {
    label: 'records-align',
    assessment: assessTollReview(tollFixtures[2].answers),
    instruction: 'The entered toll records appear consistent. No dispute route is suggested.',
    status: 'Records appear consistent; no issuer note prepared',
  },
  {
    label: 'already-corrected',
    assessment: assessTollReview({ ...tollFixtures[1].answers, creditAdjustment: 'visible' }),
    instruction: 'A corresponding credit is visible. Confirm that it reconciles this debit.',
    status: 'Credit recorded; no issuer note prepared',
  },
];

describe('guided journey progress', () => {
  it('marks earlier work complete, the active task current, and later work upcoming', () => {
    const progress = buildGuidedProgress(
      [
        { id: 'first', label: 'First' },
        { id: 'second', label: 'Second' },
        { id: 'third', label: 'Third' },
      ],
      'second',
    );

    expect(progress).toEqual<GuidedProgressStep[]>([
      { id: 'first', label: 'First', state: 'complete' },
      { id: 'second', label: 'Second', state: 'current' },
      { id: 'third', label: 'Third', state: 'upcoming' },
    ]);
  });

  it('shows evidence observation as skipped when a message-only source safely stops the review', () => {
    expect(buildChallanGuidedProgress('result', 'message-only')).toEqual([
      { id: 'safety', label: 'Start safely', state: 'complete' },
      { id: 'source', label: 'Get official record', state: 'safe-stop' },
      { id: 'observations', label: 'Check the evidence', state: 'skipped' },
      { id: 'result', label: 'Decide and resolve', state: 'current' },
    ]);
  });

  it('uses compact source guidance before evidence comparison', () => {
    expect(getChallanGuideContent({
      step: 'source',
      safetyReady: true,
      sourceStatus: 'not-selected',
      jurisdictionSelected: false,
      observationsReady: false,
      worksheetAvailable: false,
      exportAllowed: true,
    })).toMatchObject({
      currentLabel: 'Step 2 of 4 · Get the official record',
      instruction: 'Open the official record, then add its facts or a supplied record.',
      status: 'Official source and record needed',
      next: 'Confirm entered facts before comparing evidence.',
    });
  });

  it('describes a recorded source without claiming confirmation', () => {
    expect(getChallanGuideContent({
      step: 'source',
      safetyReady: true,
      sourceStatus: 'official-service',
      jurisdictionSelected: true,
      observationsReady: false,
      worksheetAvailable: false,
      resultAvailable: false,
      exportAllowed: true,
    })).toMatchObject({
      status: 'Source and review method recorded',
      next: 'Confirm entered facts before comparing evidence.',
    });
  });

  it.each([
    ['safety', '4 में से चरण 1 · सुरक्षित शुरुआत', 'सुरक्षित शुरुआत'],
    ['source', '4 में से चरण 2 · आधिकारिक रिकॉर्ड पाएँ', 'आधिकारिक रिकॉर्ड पाएँ'],
    ['observations', '4 में से चरण 3 · सबूत जाँचें', 'सबूत जाँचें'],
    ['result', '4 में से चरण 4 · निर्णय और समाधान', 'निर्णय और समाधान'],
  ] as const)('localizes the %s guide stage and progress label in Hindi', (step, currentLabel, stageLabel) => {
    const content = getChallanGuideContent({
      step,
      safetyReady: true,
      sourceStatus: 'official-service',
      jurisdictionSelected: true,
      observationsReady: true,
      worksheetAvailable: false,
      resultAvailable: step === 'result',
      exportAllowed: true,
      language: 'hi',
      simpleMode: false,
    });
    const progress = buildChallanGuidedProgress(step, 'official-service', 'hi');

    expect(content.currentLabel).toBe(currentLabel);
    expect(progress.find((item) => item.id === step)?.label).toBe(stageLabel);
    expect(content.instruction).not.toMatch(/[A-Za-z]{4,}/);
    expect(content.why).not.toMatch(/[A-Za-z]{4,}/);
    expect(content.status).not.toMatch(/[A-Za-z]{4,}/);
    expect(content.next).not.toMatch(/[A-Za-z]{4,}/);
  });

  it('uses simple presentation across every stage without changing review readiness', () => {
    const inputs = {
      safetyReady: true,
      sourceStatus: 'official-service',
      jurisdictionSelected: true,
      observationsReady: true,
      worksheetAvailable: false,
      resultAvailable: true,
      exportAllowed: true,
      language: 'en' as const,
    };

    for (const step of ['safety', 'source', 'observations', 'result'] as const) {
      const standard = getChallanGuideContent({ ...inputs, step, simpleMode: false });
      const simple = getChallanGuideContent({ ...inputs, step, simpleMode: true });
      expect(simple.instruction).not.toBe(standard.instruction);
      expect(simple.statusTone).toBe(standard.statusTone);
    }
  });

  it('completes result progress when a conservative non-dispute result is available', () => {
    expect(getChallanGuideContent({
      step: 'result',
      safetyReady: true,
      sourceStatus: 'official-service',
      jurisdictionSelected: true,
      observationsReady: true,
      worksheetAvailable: false,
      resultAvailable: true,
      exportAllowed: true,
    })).toMatchObject({
      statusTone: 'complete',
    });
  });

  it('turns a message-only source into a plain-language safe stop instead of an evidence task', () => {
    expect(getChallanGuideContent({
      step: 'source',
      safetyReady: true,
      sourceStatus: 'message-only',
      jurisdictionSelected: true,
      observationsReady: false,
      worksheetAvailable: false,
      exportAllowed: true,
    })).toMatchObject({
      currentLabel: 'Step 2 of 4 · Get the official record',
      status: 'Safe stop: verify the record before comparing evidence',
      statusTone: 'safe-stop',
      next: 'Use the verified official route to obtain the record; evidence comparison will stay skipped.',
    });
  });

  it('uses compact FASTag guidance when final event confirmation is still missing', () => {
    expect(getTollGuideContent({
      step: 'records',
      startReady: true,
      sourceReady: true,
      recordsReady: true,
      finalConfirmationReady: false,
      packetAvailable: false,
      exportAllowed: true,
      route: 'verify-records',
      finding: 'insufficient',
    })).toMatchObject({
      currentLabel: 'Step 2 of 4 · Record one transaction',
      instruction: 'Use one official debit and record facts from that event.',
      status: 'Final event confirmation still needed',
      statusTone: 'needs-action',
      next: 'Confirm the combined record after your last edit, then map it.',
    });
  });

  it('keeps an e-Challan worksheet available for on-screen review on a shared device', () => {
    expect(getChallanGuideContent({
      step: 'result',
      safetyReady: true,
      sourceStatus: 'official-portal',
      jurisdictionSelected: true,
      observationsReady: true,
      worksheetAvailable: true,
      exportAllowed: false,
    })).toMatchObject({
      status: 'Worksheet ready to review; copy and download are disabled on this shared device',
      statusTone: 'complete',
    });
  });

  it('keeps a FASTag preparation note available for on-screen review on a shared device', () => {
    expect(getTollGuideContent({
      step: 'packet',
      startReady: true,
      sourceReady: true,
      recordsReady: true,
      finalConfirmationReady: true,
      packetAvailable: true,
      exportAllowed: false,
      route: 'issuer',
      finding: 'possible-duplicate-pattern',
    })).toMatchObject({
      status: 'Preparation note ready to review; copy and download are disabled on this shared device',
      statusTone: 'complete',
    });
  });

  it('makes the verified official route the first action in the FASTag packet', () => {
    expect(getTollGuideContent({
      step: 'packet',
      startReady: true,
      sourceReady: true,
      recordsReady: true,
      finalConfirmationReady: true,
      packetAvailable: true,
      exportAllowed: true,
      route: 'issuer',
      finding: 'possible-vehicle-mismatch',
    })).toMatchObject({
      instruction: 'Open the verified official route first, then review missing evidence.',
      status: 'Official route and local preparation note ready',
      next: 'Use the official destination before opening optional audit detail.',
    });
  });

  it.each(noDisputeAssessments)('keeps the $label reconcile step free of official-route guidance', ({ assessment }) => {
    const guide = getTollGuideContent({
      step: 'reconcile',
      startReady: true,
      sourceReady: true,
      recordsReady: true,
      finalConfirmationReady: true,
      packetAvailable: assessment.shouldPrepareIssuerNote,
      exportAllowed: true,
      route: assessment.route,
      finding: assessment.finding,
    });

    expect(assessment).toMatchObject({ route: 'no-dispute', shouldPrepareIssuerNote: false });
    expect(guide).toMatchObject({
      next: 'Review outcome and evidence checklist.',
      ctaLabel: 'Review outcome and evidence checklist',
    });
    expect(Object.values(guide).join(' ')).not.toMatch(/official route/i);
  });

  it.each(noDisputeAssessments)('ends the $label FASTag journey truthfully without action-route guidance', ({ assessment, instruction, status }) => {
    const guide = getTollGuideContent({
      step: 'packet',
      startReady: true,
      sourceReady: true,
      recordsReady: true,
      finalConfirmationReady: true,
      packetAvailable: assessment.shouldPrepareIssuerNote,
      exportAllowed: true,
      route: assessment.route,
      finding: assessment.finding,
    });

    expect(assessment).toMatchObject({ route: 'no-dispute', shouldPrepareIssuerNote: false });
    expect(guide).toMatchObject({
      instruction,
      status,
      statusTone: 'complete',
      next: 'Keep the evidence checklist for your records.',
    });
    expect(Object.values(guide).join(' ')).not.toMatch(/primary official route|open (?:the )?destination|missing (?:records|evidence)/i);
  });
});
