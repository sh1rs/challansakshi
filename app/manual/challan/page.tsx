import CitizenReviewApp from '../../../components/public-beta/CitizenReviewApp';
import { getCitizenReviewServerNowIso } from '../../../lib/citizen-review-server-clock';

export const metadata = { title: 'Manual e-Challan Review — ChallanSakshi' };
export default function ManualReviewPage() {
  return <CitizenReviewApp initialNowIso={getCitizenReviewServerNowIso()} />;
}
