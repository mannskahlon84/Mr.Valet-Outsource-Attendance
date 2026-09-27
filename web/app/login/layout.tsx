import { Montserrat } from 'next/font/google';

// Geometric sans closest to the Mr. Valet wordmark
const montserrat = Montserrat({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return <div className={montserrat.className}>{children}</div>;
}
