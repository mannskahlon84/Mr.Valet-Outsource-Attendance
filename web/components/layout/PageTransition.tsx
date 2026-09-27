"use client";
import { usePathname } from 'next/navigation';

/** Replays a short rise-in animation each time the page changes. */
export default function PageTransition({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    return <div key={pathname} className="mv-page">{children}</div>;
}
