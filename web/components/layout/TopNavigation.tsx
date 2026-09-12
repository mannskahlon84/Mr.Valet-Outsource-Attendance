"use client";
import { useRouter } from 'next/navigation';
import NotificationBell from '@/components/notifications/NotificationBell';

import { useState } from 'react';
import { API_URL, fetchApi } from '@/lib/api';

function normalizeRole(role?: string): string {
    if (!role) return '';
    const clean = decodeURIComponent(role).trim().toLowerCase().replace(/[_\s-]+/g, '');
    if (clean.includes('superadmin')) return 'SUPER_ADMIN';
    if (clean.includes('operations') || clean.includes('opsmanager')) return 'OPS_MANAGER';
    if (clean.includes('accounting')) return 'ACCOUNTING';
    if (clean.includes('generalmanager') || clean === 'gm') return 'GENERAL_MANAGER';
    if (clean.includes('supplier')) return 'SUPPLIER_HEAD';
    if (clean.includes('worker') || clean.includes('employee')) return 'OUTSOURCE_WORKER';
    return clean.toUpperCase();
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
    const router = useRouter();
    const [showSwitcher, setShowSwitcher] = useState(false);
    const [switching, setSwitching] = useState(false);

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('role_display');
        localStorage.removeItem('name');
        document.cookie = 'token=; Max-Age=0; path=/';
        document.cookie = 'role=; Max-Age=0; path=/';
        router.push('/login');
    };

    const switchUser = async (userToAuth: string, passToAuth: string = 'devpass123') => {
        setSwitching(true);
        try {
            const params = new URLSearchParams();
            params.append('username', userToAuth);
            params.append('password', passToAuth);
            
            let res: Response;
            try {
                res = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: params
                });
            } catch {
                res = await fetch('/api/v1/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: params
                });
            }
            if (!res.ok) return;
            const data = await res.json();
            localStorage.setItem('token', data.access_token);
            const me = await fetchApi('/auth/me');
            const normRole = normalizeRole(me.role);
            localStorage.setItem('role', normRole);
            localStorage.setItem('role_display', me.role);
            localStorage.setItem('name', me.name || me.email || 'User');
            document.cookie = `role=${normRole}; path=/; max-age=86400; SameSite=Lax`;
            document.cookie = `token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;
            
            if (normRole === 'OPS_MANAGER') window.location.href = '/operations';
            else if (normRole === 'SUPPLIER_HEAD') window.location.href = '/supplier';
            else if (normRole === 'SUPER_ADMIN') window.location.href = '/admin';
            else if (normRole === 'ACCOUNTING') window.location.href = '/accounting';
            else window.location.href = '/login';
        } catch (e) {
            console.error(e);
        } finally {
            setSwitching(false);
            setShowSwitcher(false);
        }
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

                {/* Quick Persona Switcher Dropdown */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowSwitcher(!showSwitcher)}
                        className="bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors shadow-sm"
                        title="Switch between Operations Manager and Outsource Agency"
                    >
                        <span>⚡ Switch Persona</span>
                        <span className="text-[10px]">▼</span>
                    </button>

                    {showSwitcher && (
                        <div className="absolute right-0 mt-2 w-64 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold text-blue-400 border-b border-slate-800">
                                🏢 Outsource Agency Heads
                            </div>
                            <button
                                type="button"
                                onClick={() => switchUser('hanees')}
                                className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center justify-between transition-colors"
                            >
                                <span className="font-bold">🏢 Hanees (Agency #7)</span>
                                <span className="text-[10px] text-gray-400 font-mono">Switch →</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => switchUser('deepu')}
                                className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center justify-between transition-colors"
                            >
                                <span className="font-bold">🏢 Deepu (Agency #5)</span>
                                <span className="text-[10px] text-gray-400 font-mono">Switch →</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => switchUser('kanan')}
                                className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center justify-between transition-colors"
                            >
                                <span className="font-bold">🏢 Kanan (Agency #6)</span>
                                <span className="text-[10px] text-gray-400 font-mono">Switch →</span>
                            </button>

                            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold text-amber-400 border-t border-b border-slate-800 mt-1">
                                👔 Operations Managers
                            </div>
                            <button
                                type="button"
                                onClick={() => switchUser('maen.klaib@mrvalet.com')}
                                className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center justify-between transition-colors"
                            >
                                <span className="font-bold">👔 Maen Klaib (29 Sites)</span>
                                <span className="text-[10px] text-gray-400 font-mono">Switch →</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => switchUser('wissem.chagtmi@mrvalet.com')}
                                className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center justify-between transition-colors"
                            >
                                <span className="font-bold">👔 Wissem (25 Sites)</span>
                                <span className="text-[10px] text-gray-400 font-mono">Switch →</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => switchUser('hani.abdelsallam@mrvalet.com')}
                                className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center justify-between transition-colors"
                            >
                                <span className="font-bold">👔 Hani (18 Sites)</span>
                                <span className="text-[10px] text-gray-400 font-mono">Switch →</span>
                            </button>

                            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold text-purple-400 border-t border-b border-slate-800 mt-1">
                                👑 Management & Admin
                            </div>
                            <button
                                type="button"
                                onClick={() => switchUser('admin@example.com')}
                                className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center justify-between transition-colors"
                            >
                                <span className="font-bold">👑 Super Admin</span>
                                <span className="text-[10px] text-gray-400 font-mono">Switch →</span>
                            </button>
                        </div>
                    )}
                </div>

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