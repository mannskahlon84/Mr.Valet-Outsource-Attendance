"use client";
import { useRouter } from 'next/navigation';
import NotificationBell from '@/components/notifications/NotificationBell';

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
        <header className="bg-white shadow-sm border-b border-gray-200 flex items-center justify-between px-3 md:px-6 py-2.5 md:py-3 sticky top-0 z-30">
            <div className="flex items-center space-x-2 md:space-x-3">
                {onToggleMobile && (
                    <button 
                        onClick={onToggleMobile} 
                        className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none"
                        aria-label="Open menu"
                    >
                        <span className="text-xl font-bold leading-none">☰</span>
                    </button>
                )}
                <div className="text-base md:text-xl font-black text-gray-900 tracking-tight truncate max-w-[160px] sm:max-w-none">
                    {title}
                </div>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
                {/* In-App Push Notification Bell */}
                <NotificationBell />

                <div className="text-right hidden sm:block">
                    <div className="text-xs md:text-sm font-bold text-gray-900 truncate max-w-[120px] md:max-w-[180px]">
                        {name}
                    </div>
                    <div className="text-[10px] md:text-xs text-gray-500 font-medium truncate">
                        {role}
                    </div>
                </div>

                <button 
                    onClick={logout} 
                    className="text-xs md:text-sm text-red-600 font-bold border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
                >
                    Logout
                </button>
            </div>
        </header>
    );
}