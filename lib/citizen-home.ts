export type CitizenGoal = 'message';
export type CitizenHomeAction = { href: '/review' | '/review?goal=message' | '/fastag'; title: string; description: string };

export const HOME_ACTIONS: readonly CitizenHomeAction[] = [
  { href: '/review', title: 'Review a challan or its photo', description: 'Check the official record and compare only what you can see.' },
  { href: '/review?goal=message', title: 'I only have an SMS or forwarded link', description: 'Check it safely without entering or sharing the message.' },
  { href: '/fastag', title: 'Check a FASTag transaction', description: 'Compare the transaction and find the appropriate official route.' },
] as const;

export function buildReviewHref(goal?: CitizenGoal): '/review' | '/review?goal=message' { return goal === 'message' ? '/review?goal=message' : '/review'; }
export function parseCitizenGoalValue(value: unknown): CitizenGoal | null { return value === 'message' ? 'message' : null; }
