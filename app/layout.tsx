import type { Metadata } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'ChallanSakshi — Understand your challan safely',
  description: 'A citizen-first guide to understand an e-Challan, compare the records and evidence you can see, and continue through the correct official service.',
  openGraph: {
    type: 'website',
    title: 'ChallanSakshi — Understand your challan safely',
    description: 'An independent citizen tool for reviewing the official record and evidence you choose to inspect before using an official service.',
    images: [{ url: '/og.png', width: 1200, height: 675, alt: 'ChallanSakshi citizen record and evidence guidance.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChallanSakshi — Understand your challan safely',
    description: 'Review the record and evidence you can see before you use the appropriate official service.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
