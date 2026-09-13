import { createPageMetadata } from '../../../lib/site-seo';

export const metadata = createPageMetadata('/demo/extension-fixture', {
  title: 'Synthetic extension fixture — ChallanSakshi',
  description: 'A local testing fixture, not a public civic service.',
  index: false,
  follow: false,
});

export default function FixtureLayout({ children }: { children: React.ReactNode }) {
  return children;
}
