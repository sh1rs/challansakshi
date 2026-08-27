import type { Metadata } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'ChallanSakshi — Evidence before action',
  description: 'Review an e-Challan’s supplied evidence, event-time vehicle relationship, completeness, deadlines, and response before taking the next official step.',
  openGraph: {
    type: 'website',
    title: 'ChallanSakshi — Evidence before action',
    description: 'An evidence-first e-Challan resolver with a Local Evidence Passport, honest abstention, deterministic clocks, and source-linked response review.',
    images: [{ url: '/og.png', width: 1200, height: 675, alt: 'ChallanSakshi compares a blue scooter with a white motorcycle.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChallanSakshi — Evidence before action',
    description: 'Understand the supplied evidence, event time, packet gaps, and next official route before you act.',
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
