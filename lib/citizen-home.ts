export type CitizenGoal = 'verify' | 'understand' | 'evidence' | 'resolve';

export type CitizenHomeAction = {
  goal: CitizenGoal;
  title: string;
  description: string;
};

export const HOME_ACTIONS: readonly CitizenHomeAction[] = [
  { goal: 'verify', title: 'Check if it’s yours', description: 'Find the official record and check the vehicle details.' },
  { goal: 'understand', title: 'Understand the notice', description: 'See what the notice, status, or Virtual Court update means.' },
  { goal: 'evidence', title: 'Compare the photo', description: 'Compare the visible vehicle details with your record.' },
  { goal: 'resolve', title: 'Find the next step', description: 'Use the right official route for your situation.' },
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
