import { describe, expect, it } from 'vitest';
import { inspectNotice } from '../lib/notice-safety';
import { buildReplyFollowUp, linkReplyPassage, type ReplyPoint } from '../lib/reply-review';

describe('pasted message checks', () => {
  it.each([
    'https://echallan.parivahan.gov.in.evil.example/pay',
    'https://echallan.parivahan.gov.in@evil.example/pay',
    'https://www.echallan.parivahan.gov.in/',
    'https://xn--echllan-9za.example/',
    'http://echallan.parivahan.gov.in/',
    'echallan.parivahan.gov.in',
  ])('does not treat %s as the exact secure official host', (message) => {
    const result = inspectNotice(message);
    expect(result.officialHostPresent).toBe(false);
    expect(result.risk).not.toBe('no-obvious-indicator');
  });
  it('keeps an official link from suppressing a second off-domain link', () => {
    const result = inspectNotice('https://echallan.parivahan.gov.in/ https://evil.example/pay');
    expect(result.officialHostPresent).toBe(true);
    expect(result.signals).toContain('off-domain-link');
    expect(result.risk).toBe('caution');
  });
  it('detects bare short links and Hindi credential/payment urgency', () => {
    const result = inspectNotice('तुरंत भुगतान करें bit.ly/fine और ओटीपी बताएं');
    expect(result.signals).toEqual(expect.arrayContaining(['shortened-link', 'credential-request', 'urgency-language']));
    expect(result.risk).toBe('pause-and-verify');
  });
  it('detects encoded executable suffixes', () => {
    expect(inspectNotice('https://evil.example/challan%2eapk').signals).toContain('apk-or-executable');
  });
});

describe('citizen authority reply mapping', () => {
  const reply = 'Your photograph was reviewed. Please supply a clearer receipt.';
  const answered: ReplyPoint = { id: '1', question: 'Was the photo checked?', status: 'addressed', passage: { start: 0, end: 29, text: 'Your photograph was reviewed.' } };
  it('links only nonempty exact character ranges, preserving source offsets', () => {
    expect(linkReplyPassage(reply, 0, 29)).toEqual(answered.passage);
    expect(linkReplyPassage(reply, 5, 5)).toBeNull();
    expect(linkReplyPassage(reply, -1, 29)).toBeNull();
    expect(linkReplyPassage(reply, 0, 999)).toBeNull();
  });
  it('requires citizen review of every point and source evidence for addressed points', () => {
    expect(buildReplyFollowUp({ reply, points: [{ ...answered, status: 'unreviewed' }], sourceLabel: '' }, 'en')).toBeNull();
    expect(buildReplyFollowUp({ reply, points: [{ ...answered, passage: undefined }], sourceLabel: '' }, 'en')).toBeNull();
    expect(buildReplyFollowUp({ reply: 'A changed reply.', points: [answered], sourceLabel: '' }, 'en')).toBeNull();
  });
  it('rejects forged excerpts, empty reviews and more than five points', () => {
    expect(buildReplyFollowUp({ reply, points: [], sourceLabel: '' }, 'en')).toBeNull();
    expect(buildReplyFollowUp({ reply, points: [{ ...answered, passage: { start: 0, end: 29, text: 'Something never said.' } }], sourceLabel: '' }, 'en')).toBeNull();
    expect(buildReplyFollowUp({ reply, points: Array.from({length: 6}, (_, i) => ({ ...answered, id: String(i) })), sourceLabel: '' }, 'en')).toBeNull();
  });
  it('exports source-linked citizen observations without declaring authority failure', () => {
    const note = buildReplyFollowUp({ reply, points: [answered, { id: '2', question: 'Please clarify the receipt date.', status: 'not-found' }], sourceLabel: 'Reply dated 4 September, page 1' }, 'en');
    expect(note).toContain('Reply dated 4 September, page 1');
    expect(note).toContain('Your photograph was reviewed.');
    expect(note).toContain('characters 1–29');
    expect(note).toContain('I did not find a response in the supplied text');
    expect(note).toContain('Please clarify the receipt date.');
    expect(note).not.toMatch(/authority failed|invalid|unlawful/i);
    expect(buildReplyFollowUp({ reply, points: [answered], sourceLabel: '' }, 'hi')).toContain('नागरिक');
  });
});
