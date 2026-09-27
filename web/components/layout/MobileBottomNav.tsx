"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { activeNavHref } from '@/lib/nav';
import { navIcon } from '@/lib/navIcons';

interface NavItem {
    label: string;
    href: string;
    icon?: string;
}

export default function MobileBottomNav({ items }: { items: NavItem[] }) {
    const pathname = usePathname();
    const activeHref = activeNavHref(pathname, items.map(i => i.href));

    return (
        <nav className="md:hidden fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl bg-[#1a1a1a]/95 px-1.5 py-1.5 shadow-[0_12px_32px_-8px_rgb(0_0_0/0.45)] backdrop-blur-xl safe-area-bottom">
            {items.map((item, idx) => {
                const isActive = item.href === activeHref;
                const Icon = navIcon(item.href);

                return (
                    <Link
                        key={idx}
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={`flex min-w-[56px] flex-col items-center justify-center rounded-xl px-2 py-1.5 transition-all duration-200 ${
                            isActive ? 'bg-white/10 text-[#dbb457]' : 'text-white/55 hover:text-white'
                        }`}
                    >
                        <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} strokeWidth={1.9} />
                        <span className={`mt-0.5 max-w-[64px] truncate text-[10px] tracking-tight ${isActive ? 'font-semibold text-white' : ''}`}>
                            {item.label}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
