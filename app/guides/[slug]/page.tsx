import { notFound } from 'next/navigation';
import { CivicGuideArticle } from '../../../components/public-beta/CivicGuides';
import { civicGuides, findCivicGuide } from '../../../lib/civic-guides';
import { publicPageMetadata, serializeStructuredData, SITE_URL, type PublicPagePath } from '../../../lib/site-seo';

type GuidePageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: GuidePageProps) {
  const guide = findCivicGuide((await params).slug);
  if (!guide) notFound();
  return publicPageMetadata(`/guides/${guide.slug}` as PublicPagePath);
}

export default async function Page({ params }: GuidePageProps) {
  const guide = findCivicGuide((await params).slug);
  if (!guide) notFound();
  const url = `${SITE_URL}/guides/${guide.slug}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Article', '@id': `${url}#article`, url, headline: guide.title[0], description: guide.description[0], abstract: guide.answer[0], datePublished: guide.publishedAt, dateModified: guide.updatedAt, inLanguage: 'en-IN', isAccessibleForFree: true, mainEntityOfPage: url, author: { '@type': 'Person', '@id': `${SITE_URL}/#creator`, name: 'Shourya Banda', url: 'https://sh1rs.com' }, publisher: { '@id': `${SITE_URL}/#project` }, image: `${SITE_URL}/social-preview.jpg`, citation: guide.sources.map(source => source.url), isPartOf: { '@id': `${SITE_URL}/guides#page` } },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` }, { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE_URL}/guides` }, { '@type': 'ListItem', position: 3, name: guide.title[0], item: url }] },
    ],
  };
  const relatedGuides = civicGuides.filter(related => guide.relatedSlugs.includes(related.slug));
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeStructuredData(structuredData) }} /><CivicGuideArticle guide={guide} relatedGuides={relatedGuides} /></>;
}
