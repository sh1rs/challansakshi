import type { Metadata } from 'next';
import MobilityWorkspace from '../../components/mobility/MobilityWorkspace';

export const metadata: Metadata = {
  title: 'Your mobility cases — ChallanSakshi',
  description: 'Prepare a mobility task, review your details and keep an optional private-device case plan. You complete official actions yourself.',
};

export default function MobilityPage() { return <MobilityWorkspace />; }
