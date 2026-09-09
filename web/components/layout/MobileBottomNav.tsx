"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
    label: string;
    href: string;
    icon: string;
}

export default function MobileBottomNav({ items }: { items: NavItem[] }) {
    const pathname = usePathname();

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-gray-200 shadow-lg px-2 py-1.5 flex justify-around items-center safe-area-bottom">
            {items.map((item, idx) => {
                const isExact = pathname === item.href;
                const isRoot = ['/admin', '/operations', '/supplier', '/accounting', '/gm', '/worker'].includes(item.href);
                const isActive = isExact || (!isRoot && pathname?.startsWith(item.href));

                return (
                    <Link
                        key={idx}
                        href={item.href}
                        className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[56px] ${
                            isActive
                                ? 'text-[#dbb457] font-bold'
                                : 'text-gray-500 hover:text-gray-900 font-medium'
                        }`}
                    >
                        <span className={`text-xl transition-transform ${isActive ? 'scale-110' : ''}`}>
                            {item.icon}
                        </span>
                        <span className={`text-[10px] tracking-tight mt-0.5 truncate max-w-[64px] ${
                            isActive ? 'font-bold text-gray-900' : 'text-gray-500'
                        }`}>
                            {item.label}
                        </span>
                        {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#dbb457] mt-0.5"></span>
                        )}
                    </Link>
                );
            })}
        </nav>
    );
}
