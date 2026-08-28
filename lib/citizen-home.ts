export type CitizenGoal = 'verify' | 'understand' | 'evidence' | 'resolve';

export type CitizenHomeAction = {
  goal: CitizenGoal;
  title: string;
  question: string;
  cta: string;
};

export const HOME_ACTIONS: readonly CitizenHomeAction[] = [
  { goal: 'verify', title: 'Verify', question: 'Is this challan actually connected to you or your vehicle?', cta: 'Find the official record' },
  { goal: 'understand', title: 'Understand', question: 'What does this notice, status, or Virtual Court update mean?', cta: 'Explain my situation' },
  { goal: 'evidence', title: 'Check evidence', question: 'Does the supplied evidence agree with the record and your vehicle?', cta: 'Compare the evidence' },
  { goal: 'resolve', title: 'Resolve', question: 'What is the safest official next step?', cta: 'Show my next step' },
] as const;

export const SITUATION_LINKS = [
  { label: 'I do not recognise this challan', href: '/review?goal=verify' },
  { label: 'The photograph may show another vehicle', href: '/review?goal=evidence' },
  { label: 'I already paid', href: '/review?goal=resolve' },
  { label: 'My grievance was rejected', href: '/review?goal=resolve' },
  { label: 'My case moved to Virtual Court', href: '/review?goal=understand' },
] as const;

const goals = new Set<CitizenGoal>(['verify', 'understand', 'evidence', 'resolve']);

export function buildReviewHref(goal: CitizenGoal): string {
  return `/review?goal=${goal}`;
}

export function parseCitizenGoal(search: string): CitizenGoal | null {
  const value = new URLSearchParams(search).get('goal');
  return value && goals.has(value as CitizenGoal) ? value as CitizenGoal : null;
}
