import { createPageMetadata } from '../../lib/site-seo';
import { ExtensionInformationPage } from '../../components/public-beta/PublicInfoPage';

export const metadata = createPageMetadata('/extension', {
  title: 'Optional desktop helper — ChallanSakshi',
  description: 'Information about the optional desktop helper and its current availability.',
  index: false,
});

export default function Page() { return <ExtensionInformationPage />; }
