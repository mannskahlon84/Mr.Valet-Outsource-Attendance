"use client";
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopNavigation from '@/components/layout/TopNavigation';

export default function GMLayout({ children }: { children: React.ReactNode }) {
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        setName(localStorage.getItem('name') || 'General Manager');
        setRole(localStorage.getItem('role_display') || localStorage.getItem('role') || 'General Manager');
    }, []);

    const navItems = [
        { label: 'Executive Cockpit', href: '/gm' },
        { label: 'Financials & Spend', href: '/gm/financials' },
        { label: 'Operational Coverage', href: '/gm/operations' },
        { label: 'Supplier Scorecards', href: '/gm/suppliers' },
        { label: 'Workers Directory', href: '/gm/workers' }
    ];

    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar items={navItems} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <TopNavigation 
                    name={name} 
                    role={role} 
                    title="Executive GM Panel" 
                    onToggleMobile={() => setMobileOpen(prev => !prev)} 
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
