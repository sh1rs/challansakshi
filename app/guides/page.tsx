import { CivicGuidesHub } from '../../components/public-beta/CivicGuides';
import { civicGuides } from '../../lib/civic-guides';
import { publicPageMetadata, serializeStructuredData, SITE_URL } from '../../lib/site-seo';

export const metadata = publicPageMetadata('/guides');

export default function Page() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', '@id': `${SITE_URL}/guides#page`, url: `${SITE_URL}/guides`, name: 'ChallanSakshi guides', description: 'Practical guides to e-Challan records, FASTag deductions and suspicious challan messages.', isPartOf: { '@id': `${SITE_URL}/#website` }, publisher: { '@id': `${SITE_URL}/#project` }, inLanguage: 'en-IN', hasPart: civicGuides.map(guide => ({ '@type': 'Article', '@id': `${SITE_URL}/guides/${guide.slug}#article`, url: `${SITE_URL}/guides/${guide.slug}`, headline: guide.title[0] })) },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` }, { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE_URL}/guides` }] },
    ],
  };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeStructuredData(structuredData) }} /><CivicGuidesHub guides={civicGuides} /></>;
}
