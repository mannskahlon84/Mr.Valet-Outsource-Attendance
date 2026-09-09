"use client";
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopNavigation from '@/components/layout/TopNavigation';

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        setName(localStorage.getItem('name') || 'Supplier Agency Head');
        setRole(localStorage.getItem('role_display') || localStorage.getItem('role') || 'Supplier Head');
    }, []);

    const navItems = [
        { label: 'Overview', href: '/supplier' },
        { label: 'Shift Requests', href: '/supplier/requests' },
        { label: 'Worker Roster', href: '/supplier/workers' },
        { label: 'Invoices & Billing', href: '/supplier/invoices' },
        { label: 'Notifications', href: '/supplier/notifications' }
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
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
