import type { Metadata } from 'next';
import CitizenReviewApp from '../../components/public-beta/CitizenReviewApp';
import { parseCitizenGoalValue } from '../../lib/citizen-home';
import { getCitizenReviewServerNowIso } from '../../lib/citizen-review-server-clock';

export const metadata: Metadata = {
  title: 'Manual e-Challan Review — ChallanSakshi',
  description: 'A tab-memory-only e-Challan review with local preview, citizen-confirmed facts, conservative findings, and a confirmed official-service handoff.',
};

type ReviewPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const query = await searchParams;
  const initialGoal = parseCitizenGoalValue(query.goal);
  const initialNowIso = getCitizenReviewServerNowIso();

  return <CitizenReviewApp initialGoal={initialGoal} initialNowIso={initialNowIso} />;
}
