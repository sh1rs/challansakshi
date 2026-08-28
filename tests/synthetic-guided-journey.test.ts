import { describe, expect, it } from 'vitest';
import { getSyntheticGuide } from '../lib/guided-journey';

describe('synthetic guided journey', () => {
  it('labels the passport guide as synthetic and keeps it in the Finding demo stage', () => {
    const guide = getSyntheticGuide({ step: 'passport', language: 'en' });
    expect(guide.currentLabel).toContain('SYNTHETIC DEMO');
    expect(guide.progressLabel).toBe('Synthetic demo progress');
    expect(guide.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'review', state: 'complete' }),
      expect.objectContaining({ id: 'finding', state: 'current' }),
      expect.objectContaining({ id: 'readiness', state: 'upcoming' }),
    ]));
  });

  it.each([
    ['intake', 'intake'],
    ['review', 'review'],
    ['finding', 'finding'],
    ['passport', 'finding'],
    ['readiness', 'readiness'],
    ['pack', 'pack'],
    ['tracking', 'tracking'],
    ['order-review', 'tracking'],
    ['order-map', 'tracking'],
  ] as const)('maps the %s screen to the %s stage', (step, expectedStage) => {
    expect(getSyntheticGuide({ step, language: 'en' }).steps)
      .toContainEqual(expect.objectContaining({ id: expectedStage, state: 'current' }));
  });

  it('keeps the walkthrough controls and synthetic boundary bilingual', () => {
    expect(getSyntheticGuide({ step: 'passport', language: 'hi' })).toMatchObject({
      currentLabel: expect.stringContaining('काल्पनिक डेमो'),
      progressLabel: 'काल्पनिक डेमो की प्रगति',
      labels: {
        doNow: 'अभी यह करें',
        why: 'यह क्यों ज़रूरी है',
        status: 'डेमो स्थिति',
        next: 'आगे',
        allSteps: 'डेमो के सभी चरण देखें',
        stateComplete: 'पूरा',
        stateCurrent: 'अभी',
        stateUpcoming: 'आगे आने वाला',
        stateSkipped: 'छोड़ा गया',
        stateBlocked: 'रुका हुआ',
        stateSafeStop: 'सुरक्षित रोक',
      },
    });
  });

  it('updates the passport status after both reviews and after the passport is frozen', () => {
    expect(getSyntheticGuide({
      step: 'passport',
      language: 'en',
      state: { passportReviewsComplete: true },
    })).toMatchObject({
      status: 'Timeline and supplied-packet scope confirmed',
      statusTone: 'ready',
      next: 'Continue to evidence readiness.',
    });

    expect(getSyntheticGuide({
      step: 'passport',
      language: 'en',
      state: { passportReviewsComplete: true, passportFrozen: true },
    })).toMatchObject({
      status: 'Frozen local passport is ready to review',
      statusTone: 'complete',
      next: 'Return to the simulated case ledger.',
    });
  });

  it('updates the order-review and order-map status as verification is completed', () => {
    expect(getSyntheticGuide({
      step: 'order-review',
      language: 'en',
      state: { orderFactsComplete: true },
    })).toMatchObject({
      status: 'Fictional order facts and supplied-page scope confirmed',
      statusTone: 'ready',
      next: 'Open the evidence map and verify each suggested textual link.',
    });

    expect(getSyntheticGuide({
      step: 'order-map',
      language: 'en',
      state: {
        orderMapComplete: true,
        orderLimitationConfirmed: true,
        orderNoteCreated: true,
      },
    })).toMatchObject({
      status: 'Fictional order-review note created locally',
      statusTone: 'complete',
      next: 'Review or download the local note, then choose the appropriate demo route.',
    });
  });

  it('preserves completed downstream stages when a frozen passport is revisited', () => {
    const guide = getSyntheticGuide({
      step: 'passport',
      language: 'en',
      state: {
        passportReviewsComplete: true,
        passportFrozen: true,
        submissionComplete: true,
      },
    });

    expect(guide.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'finding', state: 'current' }),
      expect.objectContaining({ id: 'readiness', state: 'complete' }),
      expect.objectContaining({ id: 'pack', state: 'complete' }),
      expect.objectContaining({ id: 'tracking', state: 'complete' }),
    ]));
  });

  it('preserves the reached tracking stage when a submitted pack is revisited', () => {
    const guide = getSyntheticGuide({
      step: 'pack',
      language: 'en',
      state: { submissionComplete: true },
    });

    expect(guide.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'readiness', state: 'complete' }),
      expect.objectContaining({ id: 'pack', state: 'current' }),
      expect.objectContaining({ id: 'tracking', state: 'complete' }),
    ]));
  });
});
