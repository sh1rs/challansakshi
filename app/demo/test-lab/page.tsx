import type { Metadata } from 'next';
import SyntheticTestLabApp from '../../../components/test-lab/SyntheticTestLabApp';

export const metadata: Metadata = {
  title: 'Synthetic Evidence Test Lab — ChallanSakshi',
  description: 'Run ten fictional evidence cases through ChallanSakshi’s source-linked, conservative comparison rules.',
};

export default function SyntheticTestLabPage() {
  return <SyntheticTestLabApp />;
}
