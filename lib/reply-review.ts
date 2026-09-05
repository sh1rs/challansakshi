import type { Language } from './domain';

export type ReplyStatus = 'unreviewed' | 'addressed' | 'unclear' | 'not-found';
export type ReplyPassage = { start: number; end: number; text: string };
export type ReplyPoint = { id: string; question: string; status: ReplyStatus; passage?: ReplyPassage };
export type ReplyReviewInput = { reply: string; sourceLabel: string; points: ReplyPoint[] };

export function linkReplyPassage(reply: string, start: number, end: number): ReplyPassage | null {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > reply.length || end <= start) return null;
  const text = reply.slice(start, end);
  return text.trim() ? { start, end, text } : null;
}

/** Citizen-authored classifications only; there is no keyword-based adjudication. */
export function buildReplyFollowUp({ reply, sourceLabel, points }: ReplyReviewInput, language: Language): string | null {
  if (!reply.trim() || reply.length > 12000 || sourceLabel.length > 160 || points.length < 1 || points.length > 5) return null;
  if (new Set(points.map(point => point.id)).size !== points.length) return null;
  for (const point of points) {
    if (!point.question.trim() || point.question.length > 500 || !['addressed', 'unclear', 'not-found'].includes(point.status)) return null;
    if (point.status === 'addressed' && !point.passage) return null;
    if (point.status === 'not-found' && point.passage) return null;
    if (point.passage) {
      const exact = linkReplyPassage(reply, point.passage.start, point.passage.end);
      if (!exact || exact.text !== point.passage.text) return null;
    }
  }
  const hi = language === 'hi';
  const status = {
    addressed: hi ? 'मेरे अनुसार इस बिंदु का उत्तर मिला' : 'In my reading, this point was addressed',
    unclear: hi ? 'मुझे स्पष्टीकरण चाहिए' : 'I need clarification',
    'not-found': hi ? 'दिए गए पाठ में मुझे उत्तर नहीं मिला' : 'I did not find a response in the supplied text',
    unreviewed: '',
  };
  const source = sourceLabel.trim() || (hi ? 'नागरिक द्वारा दिया गया उत्तर का पाठ' : 'Reply text supplied by the citizen');
  const rows = points.map((point, index) => [
    `${index + 1}. ${point.question.trim()}`,
    `${hi ? 'मेरी समीक्षा' : 'My review'}: ${status[point.status]}`,
    point.passage ? `${hi ? 'स्रोत' : 'Source'}: ${source}, ${hi ? 'अक्षर' : 'characters'} ${point.passage.start + 1}–${point.passage.end}\n“${point.passage.text}”` : (hi ? 'इस बिंदु के लिए कोई अंश नहीं जोड़ा गया।' : 'No passage linked for this point.'),
  ].join('\n')).join('\n\n');
  const unresolved = points.filter(point => point.status !== 'addressed');
  return [
    hi ? 'नागरिक का उत्तर समीक्षा नोट — भेजा नहीं गया' : 'Citizen reply review note — not submitted',
    `${hi ? 'उत्तर स्रोत' : 'Reply source'}: ${source}`,
    hi ? 'यह मेरी पढ़ी हुई जानकारी और चुने हुए अंशों पर आधारित नोट है। कृपया पूरे उत्तर और संलग्नकों से जाँचें।' : 'These observations reflect my reading and selected passages. Please check them against the complete reply and attachments.',
    rows,
    unresolved.length ? `${hi ? 'कृपया इन बिंदुओं को स्पष्ट करें या संबंधित अंश बताएं' : 'Please clarify these points or identify the relevant passage'}:\n${unresolved.map(point => `• ${point.question.trim()}`).join('\n')}` : (hi ? 'मेरी समीक्षा में कोई बिंदु लंबित नहीं है।' : 'No unresolved point in my review.'),
    hi ? 'उत्तर न मिलना किसी गलती का प्रमाण नहीं है। यह कानूनी आकलन या स्वतः शिकायत नहीं है।' : 'Not finding an answer in the supplied text is not proof of an omission. This note is not a legal assessment or an automatic complaint.',
  ].join('\n\n');
}
