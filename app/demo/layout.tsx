import { createPageMetadata } from '../../lib/site-seo';

export const metadata = createPageMetadata('/demo', {
  title: 'Fictional demo — ChallanSakshi',
  description: 'Try ChallanSakshi with clearly labelled fictional cases. Keep real citizen information in the public review tools.',
  index: false,
});

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
