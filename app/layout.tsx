import type { Metadata } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'ChallanSakshi — Evidence before action',
  description: 'Safely self-review an e-Challan or FASTag transaction with masked, structured observations—or explore a complete synthetic evidence journey.',
  openGraph: {
    type: 'website',
    title: 'ChallanSakshi — Evidence before action',
    description: 'An independent evidence-first citizen tool for manual e-Challan review, FASTag transaction reconciliation, and a complete synthetic evidence journey.',
    images: [{ url: '/og.png', width: 1200, height: 675, alt: 'ChallanSakshi compares a blue scooter with a white motorcycle.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChallanSakshi — Evidence before action',
    description: 'Review supplied evidence, event time, packet gaps, and the next official route before you act.',
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
