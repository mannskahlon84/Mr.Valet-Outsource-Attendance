"use client";
import { useRouter } from 'next/navigation';

export default function TopNavigation({ 
    name, 
    role, 
    title = "Portal", 
    onToggleMobile 
}: { 
    name: string; 
    role: string; 
    title?: string;
    onToggleMobile?: () => void;
}) {
    const router = useRouter();

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
        <header className="bg-white shadow-sm border-b border-gray-200 flex items-center justify-between px-4 md:px-6 py-3">
            <div className="flex items-center space-x-3">
                {onToggleMobile && (
                    <button 
                        onClick={onToggleMobile} 
                        className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none"
                        aria-label="Open menu"
                    >
                        <span className="text-xl font-bold leading-none">☰</span>
                    </button>
                )}
                <div className="text-lg md:text-xl font-bold text-gray-800">{title}</div>
            </div>
            <div className="flex items-center space-x-3 md:space-x-4">
                <div className="text-right">
                    <div className="text-xs md:text-sm font-bold text-gray-900">{name}</div>
                    <div className="text-[10px] md:text-xs text-gray-500 font-medium">{role}</div>
                </div>
                <button 
                    onClick={logout} 
                    className="text-xs md:text-sm text-red-600 font-bold border border-red-200 px-2.5 py-1 rounded hover:bg-red-50 transition-colors"
                >
                    Logout
                </button>
            </div>
        </header>
    );
}