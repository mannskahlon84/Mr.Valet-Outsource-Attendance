"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi, API_URL } from '../../lib/api';

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

const SUPPLIERS = [
    { name: "Hanees", agencyId: 7, email: "hanees@supplier.mrvalet.local", shortUser: "hanees", phone: "+974 5501 0003" },
    { name: "Deepu", agencyId: 5, email: "deepu@supplier.mrvalet.local", shortUser: "deepu", phone: "+974 5501 0001" },
    { name: "Kanan", agencyId: 6, email: "kanan@supplier.mrvalet.local", shortUser: "kanan", phone: "+974 5501 0002" },
    { name: "Nizar", agencyId: 8, email: "nizar@supplier.mrvalet.local", shortUser: "nizar", phone: "+974 5501 0004" },
    { name: "Dennis", agencyId: 9, email: "dennis@supplier.mrvalet.local", shortUser: "dennis", phone: "+974 5501 0005" },
    { name: "Naboth", agencyId: 10, email: "naboth@supplier.mrvalet.local", shortUser: "naboth", phone: "+974 5501 0006" },
    { name: "Henry", agencyId: 11, email: "henry@supplier.mrvalet.local", shortUser: "henry", phone: "+974 5501 0007" }
];

const OPS_MANAGERS = [
    { name: "Maen Klaib", email: "maen.klaib@mrvalet.com", sitesCount: 29, highlight: "Fairmont, City Center, Lusail" },
    { name: "Wissem Chagtmi", email: "wissem.chagtmi@mrvalet.com", sitesCount: 25, highlight: "Banana Island, Old Doha Port, Msheireb" },
    { name: "Hani Abdelsallam", email: "hani.abdelsallam@mrvalet.com", sitesCount: 18, highlight: "The Pearl, Katara, West Bay" },
    { name: "Brahim Hayouni", email: "brahim.hayouni@mrvalet.com", sitesCount: 5, highlight: "Centro Mall, Al Maha, Tower 18" },
    { name: "Ghazi Alshammari", email: "ghazi.alshammari@mrvalet.com", sitesCount: 3, highlight: "M Gallery, Msheireb, Park Hyatt" }
];

export default function Login() {
    const [viewMode, setViewMode] = useState<'quick' | 'manual'>('quick');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeLoginUser, setActiveLoginUser] = useState<string | null>(null);
    const router = useRouter();

    const executeLogin = async (userToAuth: string, passToAuth: string) => {
        setError('');
        setLoading(true);
        setActiveLoginUser(userToAuth);
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
            } catch (networkErr) {
                if (API_URL.startsWith('http')) {
                    try {
                        res = await fetch('/api/v1/auth/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: params
                        });
                    } catch (fallbackErr) {
                        throw networkErr;
                    }
                } else {
                    throw networkErr;
                }
            }
            
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`HTTP ${res.status}: ${errText}`);
            }
            
            const data = await res.json();
            localStorage.setItem('token', data.access_token);
            
            const me = await fetchApi('/auth/me');
            const normRole = normalizeRole(me.role);
            localStorage.setItem('role', normRole);
            localStorage.setItem('role_display', me.role);
            localStorage.setItem('name', me.name || me.email || 'User');
            
            document.cookie = `role=${normRole}; path=/; max-age=86400; SameSite=Lax`;
            document.cookie = `token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;
            
            if (normRole === 'SUPER_ADMIN') router.push('/admin');
            else if (normRole === 'OPS_MANAGER') router.push('/operations');
            else if (normRole === 'ACCOUNTING') router.push('/accounting');
            else if (normRole === 'GENERAL_MANAGER') router.push('/gm');
            else if (normRole === 'SUPPLIER_HEAD') router.push('/supplier');
            else if (normRole === 'OUTSOURCE_WORKER') router.push('/worker');
            else router.push('/admin');
        } catch(err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
            setActiveLoginUser(null);
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await executeLogin(username, password);
    };

    const handle1TapLogin = (userToAuth: string, passToAuth: string = 'devpass123') => {
        setUsername(userToAuth);
        setPassword(passToAuth);
        executeLogin(userToAuth, passToAuth);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-gray-100 flex flex-col justify-center items-center py-8 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-2xl bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
                
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-amber-600 via-[#dbb457] to-amber-600 p-6 text-center text-slate-950">
                    <div className="flex justify-center mb-2">
                        <div className="bg-white/90 p-2 rounded-xl shadow-md">
                            <img src="/logo.jpg" alt="Mr. Valet Parking" className="h-14 w-auto object-contain" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-black tracking-tight">Manpower Control System</h1>
                    <p className="text-xs font-semibold text-slate-900/80 mt-1">Unified Operations & Outsource Agency Portal</p>
                </div>

                {/* View Switcher Tabs */}
                <div className="flex border-b border-slate-700 bg-slate-850">
                    <button 
                        type="button"
                        onClick={() => setViewMode('quick')}
                        className={`flex-1 py-3 text-xs sm:text-sm font-bold text-center transition-all ${
                            viewMode === 'quick' 
                                ? 'bg-slate-800 text-[#dbb457] border-b-2 border-[#dbb457]' 
                                : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800/50'
                        }`}
                    >
                        ⚡ 1-Tap Portal Access (Testing Mode)
                    </button>
                    <button 
                        type="button"
                        onClick={() => setViewMode('manual')}
                        className={`flex-1 py-3 text-xs sm:text-sm font-bold text-center transition-all ${
                            viewMode === 'manual' 
                                ? 'bg-slate-800 text-[#dbb457] border-b-2 border-[#dbb457]' 
                                : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800/50'
                        }`}
                    >
                        🔑 Manual Credentials Login
                    </button>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mx-6 mt-4 p-3 bg-red-950/80 border border-red-500 text-red-200 rounded-lg text-xs flex items-center justify-between">
                        <span>⚠️ {error}</span>
                        <button onClick={() => setError('')} className="text-red-400 font-bold ml-2">✕</button>
                    </div>
                )}

                <div className="p-6">
                    {/* TAB 1: QUICK ACCESS CARDS */}
                    {viewMode === 'quick' && (
                        <div className="space-y-6">

                            {/* 1. OUTSOURCE SUPPLIER AGENCIES */}
                            <div className="bg-slate-850 p-4 rounded-xl border border-blue-500/30">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-lg">🏢</span>
                                        <div>
                                            <div className="text-xs font-black uppercase text-blue-400 tracking-wider">
                                                Outsource Supplier Agencies
                                            </div>
                                            <div className="text-[11px] text-gray-400">
                                                Track shift requests, negotiate quotas, and assign drivers
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 rounded border border-blue-500/30">
                                        Pass: devpass123
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {SUPPLIERS.map((sup) => {
                                        const isLoggingIn = loading && activeLoginUser === sup.shortUser;
                                        return (
                                            <div 
                                                key={sup.name}
                                                className="bg-slate-800 hover:bg-slate-750 p-3 rounded-lg border border-slate-700 flex flex-col justify-between transition-colors shadow-sm"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <div className="font-bold text-sm text-white flex items-center gap-1.5">
                                                            <span>{sup.name}</span>
                                                            <span className="text-[10px] bg-blue-900/60 text-blue-300 px-1.5 py-0.2 rounded font-mono">Agency #{sup.agencyId}</span>
                                                        </div>
                                                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">{sup.shortUser}</div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        disabled={loading}
                                                        onClick={() => handle1TapLogin(sup.shortUser)}
                                                        className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-md shadow transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {isLoggingIn ? 'Entering...' : '1-Tap Login →'}
                                                    </button>
                                                </div>
                                                <div className="text-[10px] text-gray-500 mt-2 flex justify-between border-t border-slate-700/60 pt-1.5">
                                                    <span>Email: {sup.email}</span>
                                                    <span className="font-mono text-gray-400">{sup.phone}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 2. OPERATIONS MANAGERS */}
                            <div className="bg-slate-850 p-4 rounded-xl border border-amber-500/30">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-lg">👔</span>
                                        <div>
                                            <div className="text-xs font-black uppercase text-amber-400 tracking-wider">
                                                Operations Managers (HQ)
                                            </div>
                                            <div className="text-[11px] text-gray-400">
                                                Create requests, review agency proposals, and give final approval
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded border border-amber-500/30">
                                        Pass: devpass123
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    {OPS_MANAGERS.slice(0, 3).map((mgr) => {
                                        const isLoggingIn = loading && activeLoginUser === mgr.email;
                                        return (
                                            <div 
                                                key={mgr.name}
                                                className="bg-slate-800 hover:bg-slate-750 p-3 rounded-lg border border-slate-700 flex flex-col justify-between transition-colors shadow-sm"
                                            >
                                                <div>
                                                    <div className="font-bold text-sm text-white">{mgr.name}</div>
                                                    <div className="text-[10px] text-amber-400 font-bold mt-0.5">{mgr.sitesCount} Assigned Sites</div>
                                                    <div className="text-[10px] text-gray-400 truncate mt-0.5">{mgr.highlight}</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={loading}
                                                    onClick={() => handle1TapLogin(mgr.email)}
                                                    className="w-full mt-3 text-xs bg-amber-600 hover:bg-amber-500 text-slate-950 font-black py-1.5 rounded-md shadow transition-colors text-center disabled:opacity-50 cursor-pointer"
                                                >
                                                    {isLoggingIn ? 'Entering...' : '1-Tap Login →'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 3. ADMINISTRATION & OTHER ROLES */}
                            <div className="bg-slate-850 p-3 rounded-xl border border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="text-gray-400 font-bold text-[11px] uppercase tracking-wider">Other Portals:</div>
                                <div className="flex flex-wrap gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => handle1TapLogin('admin@example.com')} 
                                        className="bg-slate-800 hover:bg-slate-700 border border-slate-600 px-2.5 py-1.5 rounded font-medium text-white transition-colors cursor-pointer"
                                    >
                                        👑 Super Admin
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => handle1TapLogin('accounting@example.com')} 
                                        className="bg-slate-800 hover:bg-slate-700 border border-slate-600 px-2.5 py-1.5 rounded font-medium text-white transition-colors cursor-pointer"
                                    >
                                        💰 Accounting
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => handle1TapLogin('gm@example.com')} 
                                        className="bg-slate-800 hover:bg-slate-700 border border-slate-600 px-2.5 py-1.5 rounded font-medium text-white transition-colors cursor-pointer"
                                    >
                                        📊 General Manager
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => handle1TapLogin('worker@example.com')} 
                                        className="bg-emerald-800/50 hover:bg-emerald-700/60 border border-emerald-600 px-2.5 py-1.5 rounded font-bold text-emerald-200 transition-colors cursor-pointer"
                                    >
                                        👷 Driver Mobile App
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: MANUAL CREDENTIALS LOGIN */}
                    {viewMode === 'manual' && (
                        <form onSubmit={handleFormSubmit} className="space-y-4 max-w-md mx-auto">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
                                    Username / Email / WhatsApp
                                </label>
                                <input 
                                    type="text" 
                                    value={username} 
                                    onChange={e => setUsername(e.target.value)} 
                                    required 
                                    placeholder="e.g. hanees, deepu, or maen.klaib@mrvalet.com"
                                    className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-sm text-white focus:ring-2 focus:ring-[#dbb457] focus:outline-none" 
                                />
                                <p className="text-[11px] text-gray-400 mt-1">
                                    Tip: You can just type the supplier's first name: <strong className="text-white">hanees</strong>, <strong className="text-white">deepu</strong>, <strong className="text-white">kanan</strong>, etc.
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
                                    Password
                                </label>
                                <input 
                                    type="password" 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                    required 
                                    placeholder="••••••••"
                                    className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-sm text-white focus:ring-2 focus:ring-[#dbb457] focus:outline-none" 
                                />
                                <p className="text-[11px] text-gray-400 mt-1">
                                    Default testing password is: <strong className="text-[#dbb457]">devpass123</strong>
                                </p>
                            </div>
                            <div className="flex justify-between items-center text-xs pt-1">
                                <Link href="/forgot-password" className="text-[#dbb457] font-semibold hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                            <button 
                                type="submit" 
                                disabled={loading} 
                                className="w-full bg-[#dbb457] hover:bg-[#c29d45] text-slate-950 font-black p-3 rounded-lg text-sm shadow transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                {loading ? 'Signing In...' : 'Sign In to Portal'}
                            </button>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-850 p-4 text-center border-t border-slate-700 text-xs text-gray-500">
                    Mr. Valet Parking © 2026 • Real-Time Qatar Valet Manpower Control & Attendance System
                </div>
            </div>
        </div>
    );
}