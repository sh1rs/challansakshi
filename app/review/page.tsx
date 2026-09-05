import type { Metadata } from 'next';
import CitizenReviewApp from '../../components/public-beta/CitizenReviewApp';
import CitizenDocumentReview from '../../components/public-beta/CitizenDocumentReview';
import { parseCitizenGoalValue } from '../../lib/citizen-home';
import { getCitizenReviewServerNowIso } from '../../lib/citizen-review-server-clock';

export const metadata: Metadata = {
  title: 'Document-first e-Challan Review — ChallanSakshi',
  description: 'Read your challan on this device, compare source-linked details, correct uncertain readings and prepare your next step.',
};

type ReviewPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const query = await searchParams;
  const initialGoal = parseCitizenGoalValue(query.goal);
  const initialNowIso = getCitizenReviewServerNowIso();

  return initialGoal === 'message' ? <CitizenReviewApp initialGoal={initialGoal} initialNowIso={initialNowIso} /> : <CitizenDocumentReview initialNowIso={initialNowIso} />;
}
