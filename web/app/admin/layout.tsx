"use client";
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopNavigation from '@/components/layout/TopNavigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        setName(localStorage.getItem('name') || 'Super Admin');
        setRole(localStorage.getItem('role_display') || localStorage.getItem('role') || 'Super Admin');
    }, []);

    const navItems = [
        { label: 'Overview', href: '/admin' },
        { label: 'System Users', href: '/admin/users' },
        { label: 'Suppliers', href: '/admin/suppliers' },
        { label: 'Workers', href: '/admin/workers' },
        { label: 'Locations', href: '/admin/locations' },
        { label: 'Manpower Requests', href: '/admin/requests' },
        { label: 'Attendance', href: '/admin/attendance' },
        { label: 'Accounting', href: '/admin/accounting' }
    ];

    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar items={navItems} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <TopNavigation 
                    name={name} 
                    role={role} 
                    title="Super Admin Portal" 
                    onToggleMobile={() => setMobileOpen(prev => !prev)} 
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}