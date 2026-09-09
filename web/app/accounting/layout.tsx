"use client";
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopNavigation from '@/components/layout/TopNavigation';

export default function AccountingLayout({ children }: { children: React.ReactNode }) {
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        setName(localStorage.getItem('name') || 'Accounting Officer');
        setRole(localStorage.getItem('role_display') || localStorage.getItem('role') || 'Accounting');
    }, []);

    const navItems = [
        { label: 'Billing Summary', href: '/accounting' },
        { label: 'Monthly Invoices', href: '/accounting/invoices' },
        { label: 'Custom Invoicing & PDF', href: '/accounting/custom' },
        { label: 'Duty Hours Audit', href: '/accounting/audit' }
    ];

    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar items={navItems} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <TopNavigation 
                    name={name} 
                    role={role} 
                    title="Accounting & Finance Portal" 
                    onToggleMobile={() => setMobileOpen(prev => !prev)} 
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
