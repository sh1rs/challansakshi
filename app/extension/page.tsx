import type { Metadata } from 'next';
import { ExtensionInformationPage } from '../../components/public-beta/PublicInfoPage';

export const metadata: Metadata = {
  title: 'Optional Desktop Helper — ChallanSakshi',
  description: 'The local data, retention, recovery, and manual fallback boundaries for optional desktop assistance.',
};

export default function Page() { return <ExtensionInformationPage />; }
