"use client";
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import PageTransition from '@/components/layout/PageTransition';
import TopNavigation from '@/components/layout/TopNavigation';

export default function AccountingLayout({ children }: { children: React.ReactNode }) {
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        setName(sessionStorage.getItem('name') || 'Accounting Officer');
        setRole(sessionStorage.getItem('role_display') || sessionStorage.getItem('role') || 'Accounting');
    }, []);

    const navItems = [
        { label: 'Billing Summary', href: '/accounting' },
        { label: 'Monthly Invoices', href: '/accounting/invoices' },
        { label: 'Custom Invoicing & PDF', href: '/accounting/custom' },
        { label: 'Duty Hours Audit', href: '/accounting/audit' }
    ];

    return (
        <div className="flex h-screen bg-[#f6f4ef]">
            <Sidebar items={navItems} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <TopNavigation 
                    name={name} 
                    role={role} 
                    title="Accounting & Finance Portal" 
                    onToggleMobile={() => setMobileOpen(prev => !prev)} 
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#f6f4ef] p-4 md:p-6 lg:p-8">
                    <PageTransition>{children}</PageTransition>
                </main>
            </div>
        </div>
    );
}
