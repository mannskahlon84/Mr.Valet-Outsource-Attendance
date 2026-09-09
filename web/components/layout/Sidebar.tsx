"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

    const navContent = (
        <>
            <div className="p-4 border-b border-gray-200 flex justify-center items-center bg-white">
                <img src="/logo.jpg" alt="Mr. Valet Parking" className="h-14 w-auto object-contain" />
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {items.map((item, idx) => {
                    const isExact = pathname === item.href;
                    const isRoot = ['/admin', '/operations', '/supplier', '/accounting', '/gm', '/worker'].includes(item.href);
                    const isActive = isExact || (!isRoot && pathname?.startsWith(item.href));
                    return (
                        <Link 
                            key={idx} 
                            href={item.href} 
                            onClick={onClose}
                            className={`block px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${isActive ? 'bg-[#dbb457] text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="w-64 bg-white shadow-md flex-shrink-0 hidden md:flex md:flex-col border-r border-gray-200">
                {navContent}
            </aside>

            {/* Mobile Drawer */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden">
                    <div className="fixed inset-0 bg-black/50" onClick={onClose} />
                    <div className="relative w-64 bg-white shadow-xl flex flex-col z-10">
                        <div className="flex justify-end p-2 border-b">
                            <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 text-lg">✕</button>
                        </div>
                        {navContent}
                    </div>
                </div>
            )}
        </>
    );
}