import AboutPage from '../../components/public-beta/AboutPage';
import { publicPageMetadata, serializeStructuredData, SITE_URL } from '../../lib/site-seo';

export const metadata = publicPageMetadata('/about');

export default function Page() {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeStructuredData({ '@context': 'https://schema.org', '@type': 'AboutPage', '@id': `${SITE_URL}/about#page`, url: `${SITE_URL}/about`, name: 'About ChallanSakshi', isPartOf: { '@id': `${SITE_URL}/#website` }, about: { '@id': `${SITE_URL}/#project` } }) }} /><AboutPage /></>;
}
