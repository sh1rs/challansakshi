import { createPageMetadata } from '../../lib/site-seo';
import AccountPage from '../../components/mobility/AccountPage';
export const metadata = createPageMetadata('/account', {
  title: 'Your account — ChallanSakshi',
  description: 'Optional account tools for mobility cases, available only when configured.',
  index: false,
});
export default function Page() { return <AccountPage />; }
