"use client";
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopNavigation from '@/components/layout/TopNavigation';

import MobileBottomNav from '@/components/layout/MobileBottomNav';

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        setName(localStorage.getItem('name') || 'Supplier Agency Head');
        setRole(localStorage.getItem('role_display') || localStorage.getItem('role') || 'Supplier Head');
    }, []);

    const navItems = [
        { label: 'Overview', href: '/supplier', icon: '📊' },
        { label: 'Requests', href: '/supplier/requests', icon: '📋' },
        { label: 'Workers', href: '/supplier/workers', icon: '👥' },
        { label: 'Invoices', href: '/supplier/invoices', icon: '🧾' },
        { label: 'Alerts', href: '/supplier/notifications', icon: '🔔' }
    ];

    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar items={navItems} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <TopNavigation 
                    name={name} 
                    role={role} 
                    title="Supplier Agency Portal" 
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
