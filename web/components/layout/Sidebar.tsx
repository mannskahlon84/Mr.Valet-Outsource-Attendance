"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { activeNavHref } from '@/lib/nav';
import { navIcon } from '@/lib/navIcons';

export default function Sidebar({
    items,
    mobileOpen = false,
    onClose
}: {
    items: { label: string, href: string }[];
    mobileOpen?: boolean;
    onClose?: () => void;
}) {
    const pathname = usePathname();
    const activeHref = activeNavHref(pathname, items.map(i => i.href));

    const navContent = (
        <>
            <div className="px-5 pt-6 pb-5">
                <div className="rounded-2xl bg-[#f6f4ef] px-4 py-3 flex justify-center shadow-[inset_0_0_0_1px_rgb(255_255_255/0.6)]">
                    <img src="/logo.jpg" alt="Mr. Valet Parking" className="h-10 w-auto object-contain mix-blend-multiply" />
                </div>
            </div>
            <div className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/35">Menu</div>
            <nav className="flex-1 overflow-y-auto px-3 pb-6 space-y-1">
                {items.map((item, idx) => {
                    const isActive = item.href === activeHref;
                    const Icon = navIcon(item.href);
                    return (
                        <Link
                            key={idx}
                            href={item.href}
                            onClick={onClose}
                            aria-current={isActive ? 'page' : undefined}
                            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                                isActive
                                    ? 'bg-white/[0.08] text-white'
                                    : 'text-white/60 hover:bg-white/[0.05] hover:text-white'
                            }`}
                        >
                            <span className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#dbb457] transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                            <Icon className={`h-[18px] w-[18px] shrink-0 transition-colors ${isActive ? 'text-[#dbb457]' : 'text-white/45 group-hover:text-white/80'}`} strokeWidth={1.8} />
                            <span className="truncate">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
            <div className="px-5 py-4 border-t border-white/10 text-[11px] text-white/35">
                © {new Date().getFullYear()} Mr. Valet Parking
            </div>
        </>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="relative w-64 bg-[#1a1a1a] flex-shrink-0 hidden md:flex md:flex-col overflow-hidden">
                <SidebarGlow />
                <div className="relative flex h-full flex-col">{navContent}</div>
            </aside>

            {/* Mobile Drawer */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden">
                    <div className="mv-fade-in fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
                    <div className="mv-drawer relative w-72 max-w-[85vw] bg-[#1a1a1a] shadow-2xl flex flex-col z-10 overflow-hidden">
                        <SidebarGlow />
                        <button
                            onClick={onClose}
                            aria-label="Close menu"
                            className="absolute right-3 top-3 z-10 rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <div className="relative flex h-full flex-col pt-8">{navContent}</div>
                    </div>
                </div>
            )}
        </>
    );
}

/** A faint gold glow and parking-bay lines, echoing the login page artwork. */
function SidebarGlow() {
    return (
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 260 900">
            <defs>
                <radialGradient id="sidebar-glow" cx="100%" cy="0%" r="70%">
                    <stop offset="0" stopColor="#dbb457" stopOpacity="0.16" />
                    <stop offset="1" stopColor="#dbb457" stopOpacity="0" />
                </radialGradient>
                <pattern id="sidebar-bays" width="70" height="140" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
                    <path d="M0 0V100M70 0V100" stroke="#dbb457" strokeWidth="1.5" />
                </pattern>
            </defs>
            <rect width="260" height="900" fill="url(#sidebar-glow)" />
            <rect y="620" width="260" height="280" fill="url(#sidebar-bays)" opacity="0.06" />
        </svg>
    );
}
