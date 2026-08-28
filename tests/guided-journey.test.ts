import { describe, expect, it } from 'vitest';
import {
  buildChallanGuidedProgress,
  buildGuidedProgress,
  getChallanGuideContent,
  getTollGuideContent,
  type GuidedProgressStep,
} from '../lib/guided-journey';

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
      { id: 'safety', label: 'Protect your information', state: 'complete' },
      { id: 'source', label: 'Verify the source', state: 'safe-stop' },
      { id: 'observations', label: 'Compare the evidence', state: 'skipped' },
      { id: 'result', label: 'Official next step', state: 'current' },
    ]);
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
      currentLabel: 'Step 2 of 4 · Verify the source',
      status: 'Safe stop: verify the record before comparing evidence',
      statusTone: 'safe-stop',
      next: 'Use the verified official route to obtain the record; evidence comparison will stay skipped.',
    });
  });

  it('tells a FASTag user exactly when the final event confirmation is still missing', () => {
    expect(getTollGuideContent({
      step: 'records',
      startReady: true,
      sourceReady: true,
      recordsReady: true,
      finalConfirmationReady: false,
      packetAvailable: false,
      exportAllowed: true,
    })).toMatchObject({
      currentLabel: 'Step 2 of 4 · Record one transaction',
      status: 'Final same-transaction confirmation still needed',
      statusTone: 'needs-action',
      next: 'Confirm the combined record after your last edit, then map agreements and conflicts.',
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
    })).toMatchObject({
      status: 'Preparation note ready to review; copy and download are disabled on this shared device',
      statusTone: 'complete',
    });
  });
});
