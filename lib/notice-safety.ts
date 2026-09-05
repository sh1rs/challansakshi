import type { LocalizedText } from './domain';

export const OFFICIAL_ECHALLAN_HOST = 'echallan.parivahan.gov.in';
export const NOTICE_PREFLIGHT_RULESET = 'challansakshi.notice-preflight.2026-09';

export type NoticeFixtureId = 'apk-message' | 'forwarded-unclear' | 'short-link-request' | 'official-route';
export type NoticeRisk = 'pause-and-verify' | 'caution' | 'no-obvious-indicator';
export type NoticeSignal = 'apk-or-executable' | 'shortened-link' | 'lookalike-domain' | 'off-domain-link' | 'credential-request' | 'remote-access-request' | 'personal-payment-request' | 'urgency-language' | 'official-domain' | 'insecure-link' | 'unexpected-port' | 'embedded-credentials' | 'punycode-domain';

export interface SyntheticNoticeFixture {
  id: NoticeFixtureId;
  label: LocalizedText;
  message: string;
}

export interface NoticePreflightResult {
  risk: NoticeRisk;
  signals: NoticeSignal[];
  hosts: string[];
  officialHostPresent: boolean;
  rulesetVersion: typeof NOTICE_PREFLIGHT_RULESET;
}

export const syntheticNoticeFixtures: Record<NoticeFixtureId, SyntheticNoticeFixture> = {
  'apk-message': {
    id: 'apk-message',
    label: { en: 'APK attachment', hi: 'APK अटैचमेंट' },
    message: 'URGENT: Your RTO challan is due today. Install RTO-Challan.apk from https://rto-echallan-help.example/RTO-Challan.apk to avoid blocking.',
  },
  'forwarded-unclear': {
    id: 'forwarded-unclear',
    label: { en: 'Forwarded short link', hi: 'फ़ॉरवर्ड किया छोटा लिंक' },
    message: 'Forwarded message: a traffic notice may be available at https://bit.ly/CS-SYNTHETIC-DEMO. The destination is not visible here.',
  },
  'short-link-request': {
    id: 'short-link-request',
    label: { en: 'Short link asks for OTP', hi: 'छोटा लिंक OTP माँगता है' },
    message: 'Pay your traffic notice immediately at https://bit.ly/CS-SYNTHETIC-DEMO and enter the OTP to confirm payment.',
  },
  'official-route': {
    id: 'official-route',
    label: { en: 'Official-domain reference', hi: 'आधिकारिक डोमेन का उल्लेख' },
    message: 'A traffic notice may be available. Verify it independently at https://echallan.parivahan.gov.in/ by opening the official service yourself.',
  },
};

const shortenerHosts = new Set(['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'cutt.ly', 'shorturl.at']);

function extractUrls(message: string): URL[] {
  const matches = message.match(/(?:https?:\/\/|www\.)[^\s<>()]+|(?:[\p{L}\p{N}-]+\.)+[\p{L}]{2,}(?:[/?#][^\s<>()]*)?/giu) ?? [];
  return matches.flatMap((candidate) => {
    try {
      const value = candidate.replace(/[.,;!?\]}"']+$/, '');
      // A missing scheme is deliberately insecure/uncertain, never an official-host proof.
      return [new URL(/^https?:\/\//i.test(value) ? value : `http://${value}`)];
    } catch {
      return [];
    }
  });
}

/** Offline heuristics only. This does not authenticate a sender or resolve any URL. */
export function inspectNotice(message: string): NoticePreflightResult {
  const normalized = message.toLowerCase();
  const urls = extractUrls(message);
  const hosts = [...new Set(urls.map((url) => url.hostname.toLowerCase()))];
  const signals = new Set<NoticeSignal>();
  const officialHostPresent = urls.some((url) => url.protocol === 'https:'
    && url.hostname.toLowerCase() === OFFICIAL_ECHALLAN_HOST
    && !url.port
    && !url.username
    && !url.password);

  let decoded = message;
  try { decoded = decodeURIComponent(message); } catch { /* Check the original text if encoding is malformed. */ }
  if (/\.(apk|exe|dmg|msi)(?:\b|[/?#])/i.test(decoded)) signals.add('apk-or-executable');
  if (hosts.some((host) => shortenerHosts.has(host))) signals.add('shortened-link');
  if (hosts.some((host) => host !== OFFICIAL_ECHALLAN_HOST)) signals.add('off-domain-link');
  if (hosts.some((host) => host !== OFFICIAL_ECHALLAN_HOST && /(e-?challan|parivahan|rto)/i.test(host))) signals.add('lookalike-domain');
  if (urls.some((url) => url.protocol !== 'https:')) signals.add('insecure-link');
  if (urls.some((url) => Boolean(url.port))) signals.add('unexpected-port');
  if (urls.some((url) => Boolean(url.username || url.password))) signals.add('embedded-credentials');
  if (hosts.some((host) => host.startsWith('xn--') || host.includes('.xn--'))) signals.add('punycode-domain');
  if (/\b(otp|password|cvv|card details|upi pin|bank pin)\b|ओटीपी|पासवर्ड|पिन बत|पिन भेज/i.test(normalized)) signals.add('credential-request');
  if (/\b(anydesk|teamviewer|quicksupport|remote[- ]?access|screen[- ]?share|share your screen)\b/i.test(normalized)) signals.add('remote-access-request');
  if (/\b(personal upi|upi id|private wallet|personal (?:bank )?account|send money|transfer (?:the )?fine)\b/i.test(normalized)) signals.add('personal-payment-request');
  if (/\b(urgent|immediately|today|last chance|blocked|avoid blocking|penalty now)\b|तुरंत|तत्काल|आज ही|अंतिम मौका|ब्लॉक/i.test(normalized)) signals.add('urgency-language');
  if (officialHostPresent) signals.add('official-domain');

  const highRisk = signals.has('apk-or-executable') || signals.has('credential-request') || signals.has('remote-access-request') || signals.has('personal-payment-request') || signals.has('embedded-credentials') || (signals.has('lookalike-domain') && signals.has('urgency-language'));
  const caution = signals.has('shortened-link') || signals.has('lookalike-domain') || signals.has('off-domain-link') || signals.has('urgency-language') || signals.has('insecure-link') || signals.has('unexpected-port') || signals.has('punycode-domain') || !officialHostPresent;
  return {
    risk: highRisk ? 'pause-and-verify' : caution ? 'caution' : 'no-obvious-indicator',
    signals: [...signals],
    hosts,
    officialHostPresent,
    rulesetVersion: NOTICE_PREFLIGHT_RULESET,
  };
}

/** Kept for the synthetic Test Lab and existing callers. */
export const inspectSyntheticNotice = inspectNotice;
