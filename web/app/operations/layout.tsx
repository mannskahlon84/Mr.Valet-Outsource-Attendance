"use client";
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopNavigation from '@/components/layout/TopNavigation';

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        setName(localStorage.getItem('name') || 'Operations Manager');
        setRole(localStorage.getItem('role_display') || localStorage.getItem('role') || 'Operations Manager');
    }, []);

    const navItems = [
        { label: 'Overview', href: '/operations' },
        { label: 'Shift Requests', href: '/operations/requests' },
        { label: '+ New Request', href: '/operations/requests/new' },
        { label: 'Site Attendance', href: '/operations/attendance' },
        { label: 'Managed Sites', href: '/operations/sites' }
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
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
