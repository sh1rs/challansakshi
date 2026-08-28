import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GuidedStepHeader } from '../components/guided/GuidedStepHeader';

describe('GuidedStepHeader', () => {
  it('renders one accessible instruction, reason, live status, next action, and explicit progress states', () => {
    const html = renderToStaticMarkup(createElement(GuidedStepHeader, {
      currentLabel: 'Step 2 of 4 · Verify the source',
      instruction: 'Open the official record yourself.',
      why: 'A forwarded link alone does not verify the record.',
      status: 'Source and jurisdiction still needed',
      statusTone: 'needs-action',
      next: 'Compare the official evidence with your vehicle record.',
      progressLabel: 'e-Challan review steps',
      steps: [
        { id: 'safety', label: 'Protect your information', state: 'complete' },
        { id: 'source', label: 'Verify the source', state: 'current' },
        { id: 'observations', label: 'Compare the evidence', state: 'upcoming' },
        { id: 'result', label: 'Official next step', state: 'upcoming' },
      ],
    }));

    expect(html).toContain('Do this now');
    expect(html).toContain('Why this matters');
    expect(html).toContain('Source and jurisdiction still needed');
    expect(html).toContain('Compare the official evidence with your vehicle record.');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-current="step"');
    expect(html).toContain('Completed: Protect your information');
    expect(html).toContain('Current: Verify the source');
    expect(html).toContain('Upcoming: Compare the evidence');
    expect(html).toContain('<ol class=');
    expect(html).toContain('aria-label="e-Challan review steps"');
    expect(html).not.toContain('<details');
    expect(html).not.toContain('<summary');
  });

  it('does not present a safe-stopped journey as 100 percent complete', () => {
    const html = renderToStaticMarkup(createElement(GuidedStepHeader, {
      currentLabel: 'Step 4 of 4 · Official next step',
      instruction: 'Verify the record through an official service.',
      why: 'A message-only source cannot support a reliable comparison.',
      status: 'Safe stop: evidence comparison was skipped',
      statusTone: 'safe-stop',
      next: 'Open the verified official service independently.',
      progressLabel: 'e-Challan review steps',
      steps: [
        { id: 'safety', label: 'Protect your information', state: 'complete' },
        { id: 'source', label: 'Verify the source', state: 'safe-stop' },
        { id: 'observations', label: 'Compare the evidence', state: 'skipped' },
        { id: 'result', label: 'Official next step', state: 'current' },
      ],
    }));

    expect(html).toContain('>25%</span>');
    expect(html).toContain('width:25%');
    expect(html).not.toContain('>100%</span>');
  });

  it('uses localized progress-state labels when supplied', () => {
    const html = renderToStaticMarkup(createElement(GuidedStepHeader, {
      currentLabel: 'काल्पनिक डेमो · 6 में से चरण 3',
      instruction: 'समय-रेखा जाँचें।',
      why: 'दायरा साफ़ रहता है।',
      status: 'आपकी जाँच बाकी है',
      statusTone: 'needs-action',
      next: 'दोनों समीक्षाएँ पक्की करें।',
      progressLabel: 'काल्पनिक डेमो की प्रगति',
      labels: {
        stateComplete: 'पूरा',
        stateCurrent: 'अभी',
        stateUpcoming: 'आगे',
        stateSkipped: 'छोड़ा गया',
        stateBlocked: 'रुका हुआ',
        stateSafeStop: 'सुरक्षित रोक',
      },
      steps: [
        { id: 'review', label: 'जाँच', state: 'complete' },
        { id: 'finding', label: 'नतीजा', state: 'current' },
        { id: 'pack', label: 'पैक', state: 'upcoming' },
      ],
    }));

    expect(html).toContain('पूरा: जाँच');
    expect(html).toContain('अभी: नतीजा');
    expect(html).toContain('आगे: पैक');
    expect(html).not.toContain('Current: नतीजा');
  });
});
