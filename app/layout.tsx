import type { Metadata } from 'next';
import { buildThemeBootScript } from '../lib/theme-preference';
import { publicPageMetadata, serializeStructuredData, SITE_URL, siteStructuredData } from '../lib/site-seo';
import './globals.css';

export const metadata: Metadata = {
  ...publicPageMetadata('/'),
  metadataBase: new URL(SITE_URL),
  applicationName: 'ChallanSakshi',
  category: 'civic technology',
  referrer: 'no-referrer',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
      { url: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: buildThemeBootScript() }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeStructuredData(siteStructuredData) }} />
        {children}
      </body>
    </html>
  );
}
