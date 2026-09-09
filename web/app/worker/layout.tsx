"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import NotificationBell from '@/components/notifications/NotificationBell';

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
    const [name, setName] = useState('');
    const router = useRouter();

    useEffect(() => {
        setName(localStorage.getItem('name') || 'Outsource Driver');
    }, []);

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('role_display');
        localStorage.removeItem('name');
        document.cookie = 'token=; Max-Age=0; path=/';
        document.cookie = 'role=; Max-Age=0; path=/';
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Mobile-First Header */}
            <header className="bg-white border-b border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 sticky top-0 z-40 shadow-sm flex justify-between items-center">
                <div className="flex items-center space-x-2.5">
                    <img src="/logo.jpg" alt="Mr. Valet Parking" className="h-8 sm:h-9 w-auto object-contain" />
                    <div>
                        <div className="text-xs font-black text-gray-900 leading-tight truncate max-w-[120px] sm:max-w-none">{name}</div>
                        <div className="text-[10px] text-[#dbb457] font-bold uppercase tracking-wider">Driver Portal</div>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <NotificationBell />
                    <button 
                        onClick={logout}
                        className="text-xs text-red-600 font-bold border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </header>

            <main className="flex-1 p-3 sm:p-4 max-w-lg mx-auto w-full">
                {children}
            </main>
        </div>
    );
}
