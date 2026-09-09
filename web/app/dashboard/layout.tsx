"use client";
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { fetchApi } from '../../lib/api';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [role, setRole] = useState('');
    const [notifs, setNotifs] = useState<any[]>([]);
    const [showNotifs, setShowNotifs] = useState(false);
    const [name, setName] = useState('');
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }
        setRole(localStorage.getItem('role') || '');
        setName(localStorage.getItem('name') || '');
    }, [router]);

    const logout = () => {
                localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('name');
        document.cookie = 'token=; Max-Age=0; path=/';
        document.cookie = 'role=; Max-Age=0; path=/';
        router.push('/login');
        router.push('/login');
    };

    if (!role) return null;

    const navItems = [
        { label: 'Overview', href: '/dashboard', roles: ['Super Admin', 'General Manager', 'Operations Manager', 'Supplier Head'] },
        { label: 'Locations', href: '/dashboard/locations', roles: ['Super Admin', 'General Manager', 'Operations Manager'] },
        { label: 'Manpower Requests', href: '/dashboard/requests', roles: ['Super Admin', 'General Manager', 'Operations Manager', 'Supplier Head'] },
        { label: 'Workers', href: '/dashboard/workers', roles: ['Super Admin', 'General Manager', 'Supplier Head'] },
        { label: 'Suppliers', href: '/dashboard/suppliers', roles: ['Super Admin', 'General Manager'] },
        { label: 'Accounting', href: '/dashboard/accounting', roles: ['Super Admin', 'ACCOUNTING', 'General Manager', 'Supplier Head'] },
        { label: 'Attendance', href: '/dashboard/attendance', roles: ['Super Admin', 'General Manager', 'Operations Manager', 'Supplier Head'] },
        { label: 'System Users', href: '/dashboard/users', roles: ['Super Admin'] },
    ].filter(item => item.roles.includes(role));

    return (
        <div className="flex h-screen bg-gray-100">
            <aside className="w-64 bg-gray-900 text-white flex flex-col">
                <div className="p-4 border-b border-gray-200 flex justify-center items-center bg-white py-6">
                    <img src="/logo.jpg" alt="Mr. Valet Portal" className="h-16 w-auto object-contain" />
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map(item => (
                        <Link key={item.href} href={item.href} className={`block p-2 rounded ${pathname === item.href ? 'bg-gray-800 border-l-4 border-[#dbb457] text-[#dbb457]' : 'hover:bg-slate-800'}`}>
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </aside>
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white shadow-sm p-4 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <div className="text-sm font-bold text-gray-900">{name}</div>
                            <div className="text-xs text-gray-500">{role.replace('_', ' ')}</div>
                        </div>
                        <button onClick={logout} className="text-sm text-red-600 font-bold border border-red-200 px-3 py-1 rounded hover:bg-red-50">Logout</button>
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
