import type { MetadataRoute } from 'next';
import { publicPages, SITE_URL } from '../lib/site-seo';

export default function sitemap(): MetadataRoute.Sitemap {
  // Do not manufacture last-modified dates on every crawl or index private tools.
  return Object.keys(publicPages).map(path => ({ url: new URL(path, SITE_URL).href }));
}
