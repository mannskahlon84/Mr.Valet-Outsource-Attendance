"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
            <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40 shadow-sm flex justify-between items-center">
                <div className="flex items-center space-x-2.5">
                    <img src="/logo.jpg" alt="Mr. Valet Parking" className="h-9 w-auto object-contain" />
                    <div>
                        <div className="text-xs font-black text-gray-900 leading-tight">{name}</div>
                        <div className="text-[10px] text-[#dbb457] font-bold uppercase tracking-wider">Valet Driver Portal</div>
                    </div>
                </div>
                <button 
                    onClick={logout}
                    className="text-xs text-red-600 font-bold border border-red-200 px-2.5 py-1 rounded hover:bg-red-50 transition-colors"
                >
                    Logout
                </button>
            </header>

            <main className="flex-1 p-4 max-w-lg mx-auto w-full">
                {children}
            </main>
        </div>
    );
}
