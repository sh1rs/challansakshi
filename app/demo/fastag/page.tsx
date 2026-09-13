import { createPageMetadata } from '../../../lib/site-seo';
import TollSakshiApp from '../../../components/public-beta/TollSakshiApp';

export const metadata = createPageMetadata('/demo/fastag', {
  title: 'Fictional FASTag examples — ChallanSakshi',
  description: 'Explore clearly labelled fictional FASTag transactions in the demo area.',
  index: false,
});

export default function FastagDemoPage() {
  return <TollSakshiApp synthetic />;
}
