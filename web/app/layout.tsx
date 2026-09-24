import './globals.css';
import type { Viewport } from 'next';
import ResponsiveTables from '@/components/layout/ResponsiveTables';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ResponsiveTables />
      </body>
    </html>
  );
}
