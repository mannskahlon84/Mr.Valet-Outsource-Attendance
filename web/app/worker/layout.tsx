"use client";
import { LogOut } from 'lucide-react';
import { logout } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import NotificationBell from '@/components/notifications/NotificationBell';

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
    const [name, setName] = useState('');
    const router = useRouter();

    useEffect(() => {
        setName(sessionStorage.getItem('name') || 'Outsource Driver');
    }, []);


    return (
        <div className="min-h-screen bg-[#f6f4ef] flex flex-col">
            {/* Mobile-First Header */}
            <header className="bg-white/80 backdrop-blur-xl border-b border-[#1a1a1a]/[0.06] px-3 sm:px-4 py-2.5 sm:py-3 sticky top-0 z-40 flex justify-between items-center">
                <div className="flex items-center space-x-2.5">
                    <img src="/logo.jpg" alt="Mr. Valet Parking" className="h-8 sm:h-9 w-auto object-contain mix-blend-multiply" />
                    <div>
                        <div className="text-xs font-bold text-[#1a1a1a] leading-tight truncate max-w-[120px] sm:max-w-none">{name}</div>
                        <div className="text-[10px] text-[#a8842f] font-bold uppercase tracking-wider">Driver Portal</div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <NotificationBell />
                    <button 
                        onClick={logout}
                        aria-label="Log out"
                        title="Log out"
                        className="flex items-center gap-1.5 rounded-xl border border-[#1a1a1a]/10 px-2.5 py-2 text-xs font-semibold text-[#1a1a1a]/70 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </header>

            <main className="flex-1 p-3 sm:p-4 max-w-lg mx-auto w-full">
                <div className="mv-page">{children}</div>
            </main>
        </div>
    );
}
