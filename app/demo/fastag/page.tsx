import type { Metadata } from 'next';
import TollSakshiApp from '../../../components/public-beta/TollSakshiApp';

export const metadata: Metadata = {
  title: 'FASTag Demo Cases — ChallanSakshi',
  description: 'Explore fictional FASTag transaction cases in the separate demo area.',
};

export default function FastagDemoPage() {
  return <TollSakshiApp synthetic />;
}
