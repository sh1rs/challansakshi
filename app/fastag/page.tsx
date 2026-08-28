import type { Metadata } from 'next';
import TollSakshiApp from '../../components/public-beta/TollSakshiApp';

export const metadata: Metadata = {
  title: 'TollSakshi — FASTag Transaction Check',
  description: 'Manually reconcile a FASTag debit with vehicle, timestamp, plaza, passing-image, duplicate, and credit-adjustment observations—without uploading records.',
};

export default function FastagPage() { return <TollSakshiApp />; }
