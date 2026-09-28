import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Montserrat } from 'next/font/google';
import ResponsiveTables from '@/components/layout/ResponsiveTables';

// Geometric sans closest to the Mr. Valet wordmark, used across every portal
const montserrat = Montserrat({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-montserrat' });

// Browser tab title and link-preview text; icons come from app/favicon.ico, icon.png,
// apple-icon.png and opengraph-image.png
export const metadata: Metadata = {
  title: 'Mr. Valet · Manpower Control',
  description: 'Mr. Valet Parking Solutions: outsourced driver dispatch, verified attendance and supplier billing.',
  applicationName: 'Mr. Valet',
  openGraph: {
    title: 'Mr. Valet · Manpower Control',
    description: 'Outsourced driver dispatch, verified attendance and supplier billing.',
    siteName: 'Mr. Valet Parking Solutions',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#1a1a1a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="font-sans">
        {children}
        <ResponsiveTables />
      </body>
    </html>
  );
}
