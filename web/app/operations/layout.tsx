"use client";
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopNavigation from '@/components/layout/TopNavigation';

import MobileBottomNav from '@/components/layout/MobileBottomNav';

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        setName(localStorage.getItem('name') || 'Operations Manager');
        setRole(localStorage.getItem('role_display') || localStorage.getItem('role') || 'Operations Manager');
    }, []);

    const navItems = [
        { label: 'Overview', href: '/operations', icon: '📊' },
        { label: 'Requests', href: '/operations/requests', icon: '📋' },
        { label: 'Dispatch', href: '/operations/requests/new', icon: '➕' },
        { label: 'Attendance', href: '/operations/attendance', icon: '⏱️' },
        { label: 'Sites', href: '/operations/sites', icon: '📍' }
    ];

    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar items={navItems} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <TopNavigation 
                    name={name} 
                    role={role} 
                    title="Operations Portal" 
                    onToggleMobile={() => setMobileOpen(prev => !prev)} 
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-3 sm:p-6 pb-24 md:pb-6">
                    {children}
                </main>
                <MobileBottomNav items={navItems} />
            </div>
        </div>
    );
}
