"use client";
import { LogOut, Menu } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import { logout } from '@/lib/api';

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || 'MV';
}

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

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#1a1a1a]/[0.06] bg-white/80 px-3 py-2.5 backdrop-blur-xl md:px-8 md:py-3.5">
            <div className="flex min-w-0 items-center gap-2 md:gap-3">
                {onToggleMobile && (
                    <button
                        onClick={onToggleMobile}
                        className="md:hidden rounded-xl p-2 text-[#1a1a1a]/70 hover:bg-[#1a1a1a]/5"
                        aria-label="Open menu"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                )}
                <div className="min-w-0">
                    <h2 className="truncate text-base font-bold tracking-tight text-[#1a1a1a] md:text-lg">
                        {title}
                    </h2>
                    <p className="hidden text-xs text-[#1a1a1a]/45 sm:block">
                        Mr. Valet Parking Operations
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-1.5 md:gap-3">
                {/* In-App Push Notification Bell */}
                <NotificationBell />

                <div className="hidden items-center gap-3 rounded-2xl py-1 pl-1 pr-3 sm:flex">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1a1a1a] text-xs font-bold text-[#dbb457]">
                        {initials(name)}
                    </span>
                    <div className="text-left">
                        <div className="max-w-[140px] truncate text-sm font-semibold leading-tight text-[#1a1a1a] md:max-w-[200px]">
                            {name}
                        </div>
                        <div className="max-w-[140px] truncate text-[11px] text-[#1a1a1a]/50 md:max-w-[200px]">
                            {role}
                        </div>
                    </div>
                </div>

                <button
                    onClick={logout}
                    aria-label="Log out"
                    title="Log out"
                    className="flex items-center gap-1.5 rounded-xl border border-[#1a1a1a]/10 px-2.5 py-2 text-xs font-semibold text-[#1a1a1a]/70 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden md:inline">Log out</span>
                </button>
            </div>
        </header>
    );
}
