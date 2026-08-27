import type { Metadata } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'ChallanSakshi — Evidence before action',
  description: 'Understand whether an e-Challan’s supplied evidence appears to match your vehicle before you pay or contest it.',
  openGraph: {
    type: 'website',
    title: 'ChallanSakshi — Evidence before action',
    description: 'An evidence-first wrong e-Challan resolver built for the Build What Moves India hackathon.',
    images: [{ url: '/og.png', width: 1200, height: 675, alt: 'ChallanSakshi compares a blue scooter with a white motorcycle.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChallanSakshi — Evidence before action',
    description: 'Understand the supplied e-Challan evidence before you pay or contest.',
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
