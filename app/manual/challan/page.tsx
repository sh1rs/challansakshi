import { publicPageMetadata } from '../../../lib/site-seo';
import CitizenReviewApp from '../../../components/public-beta/CitizenReviewApp';
import { getCitizenReviewServerNowIso } from '../../../lib/citizen-review-server-clock';

export const metadata = publicPageMetadata('/manual/challan');
export default function ManualReviewPage() {
  return <CitizenReviewApp initialNowIso={getCitizenReviewServerNowIso()} />;
}
