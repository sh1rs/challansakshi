import { createPageMetadata } from '../../../lib/site-seo';
import SyntheticTestLabApp from '../../../components/test-lab/SyntheticTestLabApp';

export const metadata = createPageMetadata('/demo/test-lab', {
  title: 'Synthetic evidence test lab — ChallanSakshi',
  description: 'Explore fictional evidence examples and the limits of conservative comparison.',
  index: false,
});

export default function SyntheticTestLabPage() {
  return <SyntheticTestLabApp />;
}
