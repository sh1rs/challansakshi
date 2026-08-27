import { describe, expect, it } from 'vitest';
import {
  calculatePostRejectionWindow,
  classifyResolutionIssue,
  paymentScenarios,
  reconcilePayment,
  resolutionRoutes,
} from '../lib/resolution';

describe('plain-language resolution triage', () => {
  it('routes English and Hinglish payment problems to reconciliation', () => {
    expect(classifyResolutionIssue('Payment successful but status is pending')).toMatchObject({ issueId: 'payment-pending', confidence: 'matched' });
    expect(classifyResolutionIssue('paisa debit ho gaya, challan pending hai')).toMatchObject({ issueId: 'payment-pending', confidence: 'matched' });
  });

  it('routes court, rejection, unclear-image, and receipt problems independently', () => {
    expect(classifyResolutionIssue('Case Virtual Court mein chala gaya')).toMatchObject({ issueId: 'virtual-court' });
    expect(classifyResolutionIssue('My grievance was rejected')).toMatchObject({ issueId: 'grievance-rejected' });
    expect(classifyResolutionIssue('number plate is blurry')).toMatchObject({ issueId: 'unclear-evidence' });
    expect(classifyResolutionIssue('wrong phone number and no receipt')).toMatchObject({ issueId: 'access-or-receipt' });
    expect(classifyResolutionIssue('30 din se grievance ka reply nahi')).toMatchObject({ issueId: 'no-recorded-decision' });
  });

  it('uses a transparent fallback rather than pretending to understand unmatched text', () => {
    expect(classifyResolutionIssue('something else happened')).toEqual({ issueId: null, confidence: 'fallback', matchedTerms: [], candidateIds: [] });
  });

  it('asks the citizen to choose when different routes tie', () => {
    expect(classifyResolutionIssue('payment court')).toMatchObject({ issueId: null, confidence: 'ambiguous', candidateIds: ['payment-pending', 'virtual-court'] });
    expect(classifyResolutionIssue('my complaint is pending')).toMatchObject({ issueId: null, confidence: 'fallback' });
  });

  it('provides a complete safe route for every supported issue', () => {
    for (const route of Object.values(resolutionRoutes)) {
      expect(route.doNow.length).toBeGreaterThanOrEqual(3);
      expect(route.keepReady.length).toBeGreaterThanOrEqual(2);
      expect(route.officialLinks.length).toBeGreaterThanOrEqual(1);
      expect(route.cannotConclude.en.length).toBeGreaterThan(20);
      expect(route.avoid.en.length).toBeGreaterThan(20);
    }
  });
});

describe('post-rejection clock', () => {
  it('calculates the open D+30 window from the fictional order date', () => {
    expect(calculatePostRejectionWindow('2026-08-21', '2026-08-27')).toMatchObject({
      elapsedDays: 6,
      daysRemaining: 24,
      status: 'open',
      indicativeBoundary: '2026-09-20',
    });
  });

  it('shows the final-day boundary and expiry without negative remaining days', () => {
    expect(calculatePostRejectionWindow('2026-08-21', '2026-09-20')).toMatchObject({ status: 'final-day', daysRemaining: 0 });
    expect(calculatePostRejectionWindow('2026-08-21', '2026-09-21')).toMatchObject({ status: 'expired', daysRemaining: 0 });
  });
});

describe('payment-status reconciliation', () => {
  it('finds a supplied-record conflict only when identifiers and amounts match', () => {
    expect(reconcilePayment(paymentScenarios['status-conflict'])).toMatchObject({
      finding: 'status-conflict',
      identifiersMatch: true,
      amountsMatch: true,
      nextAction: 'verify-pending-transaction',
    });
  });

  it('blocks reconciliation when the receipt references another challan', () => {
    const result = reconcilePayment(paymentScenarios['identifier-mismatch']);
    expect(result.finding).toBe('cannot-reconcile');
    expect(result.limitations).toContain('challan-identifier-mismatch');
    expect(result.nextAction).toBe('verify-identifiers');
  });

  it('refuses to manufacture a payment complaint when supplied records align', () => {
    expect(reconcilePayment(paymentScenarios.aligned)).toMatchObject({
      finding: 'aligned',
      nextAction: 'preserve-receipt',
    });
  });

  it('keeps every other payment-state combination inconclusive', () => {
    const result = reconcilePayment({ ...paymentScenarios.aligned, receiptResult: 'pending', displayedStatus: 'pending' });
    expect(result.finding).toBe('cannot-reconcile');
    expect(result.limitations).toContain('payment-state-not-conclusive');
  });

  it('classifies the complete receipt-result and displayed-status matrix safely', () => {
    const receiptResults = ['successful', 'pending', 'failed'] as const;
    const displayedStatuses = ['pending', 'paid', 'forwarded-to-virtual-court'] as const;
    for (const receiptResult of receiptResults) {
      for (const displayedStatus of displayedStatuses) {
        const result = reconcilePayment({ ...paymentScenarios.aligned, receiptResult, displayedStatus });
        const expected = receiptResult === 'successful' && displayedStatus === 'paid'
          ? 'aligned'
          : receiptResult === 'successful' && displayedStatus === 'pending'
            ? 'status-conflict'
            : 'cannot-reconcile';
        expect(result.finding, `${receiptResult} + ${displayedStatus}`).toBe(expected);
      }
    }
  });
});
