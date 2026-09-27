import './globals.css';
import type { Viewport } from 'next';
import { Montserrat } from 'next/font/google';
import ResponsiveTables from '@/components/layout/ResponsiveTables';

// Geometric sans closest to the Mr. Valet wordmark, used across every portal
const montserrat = Montserrat({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-montserrat' });

export const viewport: Viewport = {
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
