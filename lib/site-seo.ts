import type { Metadata } from 'next';

/** Public discovery always points to the live origin, including preview builds. */
export const SITE_URL = 'https://challansakshi.sh1rs.com';
export const SITE_NAME = 'ChallanSakshi';
export const SITE_DESCRIPTION = 'Free, independent help with e-Challans and FASTag issues in India. Review your records, prepare a clear request and find the right official service.';

export const publicPages = {
  '/': { title: 'ChallanSakshi — Free e-Challan & FASTag help', description: SITE_DESCRIPTION },
  '/about': { title: 'About ChallanSakshi — Free civic help for India', description: 'What ChallanSakshi does, how to use it, and how your information is handled. A free independent civic project for e-Challan and FASTag preparation.' },
  '/review': { title: 'Review your e-Challan — ChallanSakshi', description: 'Read your challan PDF or photo on your device, check uncertain details, compare vehicle records and prepare a request you can review before using an official service.' },
  '/manual/challan': { title: 'Review a challan without a file — ChallanSakshi', description: 'Work through an e-Challan with guided questions. Compare the details you can see and prepare a clear next step without uploading a document.' },
  '/fastag': { title: 'Check a FASTag debit — TollSakshi by ChallanSakshi', description: 'Compare a FASTag debit with your vehicle, time, toll plaza and credit adjustments. Prepare the facts for a query through the appropriate official service.' },
  '/message-check': { title: 'Check a challan SMS or message — ChallanSakshi', description: 'Check pasted challan messages for common scam warning signs on your device. Suspicious links are not opened; continue through an independent official route.' },
  '/reply-review': { title: 'Understand an authority reply — ChallanSakshi', description: 'Compare an authority reply with the points you raised, link exact passages and prepare a follow-up note you review on your device.' },
  '/mobility': { title: 'Prepare a mobility case — ChallanSakshi', description: 'Prepare challan, FASTag and vehicle-document tasks with a private-device case plan, evidence checklist and follow-up dates. No account required to get started.' },
  '/sources': { title: 'Official service links & source reviews — ChallanSakshi', description: 'Find the official e-Challan and court-service directory with reviewed destinations, supported uses, review dates and limits.' },
  '/privacy': { title: 'Privacy & data controls — ChallanSakshi', description: 'Understand local document reading, optional device saving, account availability, retention, exports and the controls for deleting your ChallanSakshi data.' },
  '/safety': { title: 'Safety & official service guidance — ChallanSakshi', description: 'Use official e-Challan and FASTag services safely. Understand message warnings and why you control credentials, payment and final submission.' },
} as const;

export type PublicPagePath = keyof typeof publicPages;

type PageMetadataOptions = {
  title: string;
  description: string;
  index?: boolean;
  follow?: boolean;
};

export function createPageMetadata(path: string, options: PageMetadataOptions): Metadata {
  const canonical = new URL(path, SITE_URL).href;
  const image = { url: `${SITE_URL}/social-preview.jpg`, width: 1200, height: 675, alt: 'ChallanSakshi. Evidence before action. Free independent civic help.' };
  return {
    title: options.title,
    description: options.description,
    alternates: { canonical },
    robots: options.index === false
      ? { index: false, follow: options.follow !== false }
      : { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
    openGraph: {
      type: 'website',
      locale: 'en_IN',
      siteName: SITE_NAME,
      url: canonical,
      title: options.title,
      description: options.description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: options.title,
      description: options.description,
      images: [image.url],
    },
  };
}

export function publicPageMetadata(path: PublicPagePath): Metadata {
  return createPageMetadata(path, publicPages[path]);
}

export const siteStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      alternateName: 'Challan Sakshi',
      description: SITE_DESCRIPTION,
      inLanguage: ['en', 'hi'],
      publisher: { '@id': `${SITE_URL}/#project` },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#project`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/icons/icon-512.png`,
      description: 'An independent civic technology project offering free tools to help people in India understand mobility records and prepare their own next steps. Not affiliated with a government authority.',
      founder: { '@id': `${SITE_URL}/#creator` },
    },
    {
      '@type': 'Person',
      '@id': `${SITE_URL}/#creator`,
      name: 'Shourya Banda',
      alternateName: 'sh1rs',
      url: 'https://sh1rs.com',
      sameAs: ['https://sh1rs.com'],
    },
    {
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/#application`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description: SITE_DESCRIPTION,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web browser',
      browserRequirements: 'A modern web browser with JavaScript enabled',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      featureList: ['Local e-Challan document review', 'Manual e-Challan review', 'FASTag transaction checks', 'Message warning checks', 'Authority reply review', 'Optional private-device mobility case preparation'],
      publisher: { '@id': `${SITE_URL}/#project` },
      creator: { '@id': `${SITE_URL}/#creator` },
    },
  ],
};

/** Keep JSON-LD safe even if a future public description contains HTML-like text. */
export function serializeStructuredData(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
