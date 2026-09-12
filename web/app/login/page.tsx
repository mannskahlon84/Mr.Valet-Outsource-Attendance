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

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('username', username);
            params.append('password', password);
            
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
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fillDemo = (user: string) => {
        setUsername(user);
        setPassword('devpass123');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 py-8 px-4">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-100">
                <div className="flex justify-center mb-6">
                    <img src="/logo.jpg" alt="Mr. Valet Parking" className="h-20 w-auto object-contain drop-shadow-sm" />
                </div>
                <h1 className="text-xl font-bold text-center text-gray-800 mb-1">Manpower Control System</h1>
                <p className="text-center text-xs text-gray-500 mb-6">Sign in to access your portal</p>
                
                {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-xs font-medium">{error}</div>}
                
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Email / WhatsApp</label>
                        <input 
                            type="text" 
                            value={username} 
                            onChange={e=>setUsername(e.target.value)} 
                            required 
                            placeholder="user@example.com"
                            className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#dbb457] focus:outline-none" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Password</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={e=>setPassword(e.target.value)} 
                            required 
                            placeholder="••••••••"
                            className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#dbb457] focus:outline-none" 
                        />
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <Link href="/forgot-password" className="text-[#dbb457] font-semibold hover:underline">Forgot password?</Link>
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full bg-[#dbb457] text-white p-3 rounded-lg hover:bg-[#c29d45] font-bold text-sm shadow transition-colors duration-150 disabled:opacity-50"
                    >
                        {loading ? 'Authenticating...' : 'Sign In'}
                    </button>
                </form>

                {/* Quick test credentials assistant */}
                <div className="mt-8 pt-6 border-t border-gray-100 space-y-3">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Quick Test Logins (Password: devpass123)</div>
                    
                    {/* Operations Managers Direct Testing */}
                    <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/60">
                        <div className="text-[11px] font-bold text-amber-800 uppercase mb-1.5 flex items-center justify-between">
                            <span>Operations Managers (Assigned Sites)</span>
                            <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">Filtered</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 text-xs">
                            <button type="button" onClick={()=>fillDemo('wissem.chagtmi@mrvalet.com')} className="p-1.5 bg-white hover:bg-amber-100 border border-amber-200 rounded text-center font-bold text-amber-900 transition-colors">
                                Wissem (25 Sites)
                            </button>
                            <button type="button" onClick={()=>fillDemo('hani.abdelsallam@mrvalet.com')} className="p-1.5 bg-white hover:bg-amber-100 border border-amber-200 rounded text-center font-bold text-amber-900 transition-colors">
                                Hani (18 Sites)
                            </button>
                            <button type="button" onClick={()=>fillDemo('maen.klaib@mrvalet.com')} className="p-1.5 bg-white hover:bg-amber-100 border border-amber-200 rounded text-center font-bold text-amber-900 transition-colors">
                                Maen (29 Sites)
                            </button>
                        </div>
                    </div>

                    {/* Outsource Agency Heads Direct Testing */}
                    <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-200/60">
                        <div className="text-[11px] font-bold text-blue-800 uppercase mb-1.5 flex items-center justify-between">
                            <span>Outsource Agency Heads (Suppliers)</span>
                            <span className="text-[10px] bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded">Dispatch Portals</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 text-xs">
                            <button type="button" onClick={()=>fillDemo('hanees@supplier.mrvalet.local')} className="p-1.5 bg-white hover:bg-blue-100 border border-blue-200 rounded text-center font-bold text-blue-900 transition-colors">
                                🏢 Hanees
                            </button>
                            <button type="button" onClick={()=>fillDemo('deepu@supplier.mrvalet.local')} className="p-1.5 bg-white hover:bg-blue-100 border border-blue-200 rounded text-center font-bold text-blue-900 transition-colors">
                                🏢 Deepu
                            </button>
                            <button type="button" onClick={()=>fillDemo('kanan@supplier.mrvalet.local')} className="p-1.5 bg-white hover:bg-blue-100 border border-blue-200 rounded text-center font-bold text-blue-900 transition-colors">
                                🏢 Kanan
                            </button>
                            <button type="button" onClick={()=>fillDemo('nizar@supplier.mrvalet.local')} className="p-1.5 bg-white hover:bg-blue-100 border border-blue-200 rounded text-center font-bold text-blue-900 transition-colors">
                                🏢 Nizar
                            </button>
                            <button type="button" onClick={()=>fillDemo('dennis@supplier.mrvalet.local')} className="p-1.5 bg-white hover:bg-blue-100 border border-blue-200 rounded text-center font-bold text-blue-900 transition-colors">
                                🏢 Dennis
                            </button>
                            <button type="button" onClick={()=>fillDemo('naboth@supplier.mrvalet.local')} className="p-1.5 bg-white hover:bg-blue-100 border border-blue-200 rounded text-center font-bold text-blue-900 transition-colors">
                                🏢 Naboth
                            </button>
                            <button type="button" onClick={()=>fillDemo('henry@supplier.mrvalet.local')} className="p-1.5 bg-white hover:bg-blue-100 border border-blue-200 rounded text-center font-bold text-blue-900 transition-colors col-span-2">
                                🏢 Henry
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <button type="button" onClick={()=>fillDemo('admin@example.com')} className="p-1.5 bg-gray-50 hover:bg-amber-50 border rounded text-left font-medium text-gray-700 hover:text-amber-800 transition-colors">
                            👑 Super Admin (All Sites)
                        </button>
                        <button type="button" onClick={()=>fillDemo('supplier@example.com')} className="p-1.5 bg-gray-50 hover:bg-amber-50 border rounded text-left font-medium text-gray-700 hover:text-amber-800 transition-colors">
                            🏢 Supplier Agency
                        </button>
                        <button type="button" onClick={()=>fillDemo('accounting@example.com')} className="p-1.5 bg-gray-50 hover:bg-amber-50 border rounded text-left font-medium text-gray-700 hover:text-amber-800 transition-colors">
                            💰 Accounting Team
                        </button>
                        <button type="button" onClick={()=>fillDemo('gm@example.com')} className="p-1.5 bg-gray-50 hover:bg-amber-50 border rounded text-left font-medium text-gray-700 hover:text-amber-800 transition-colors">
                            📊 General Manager
                        </button>
                        <button type="button" onClick={()=>fillDemo('worker@example.com')} className="p-1.5 bg-gray-50 hover:bg-amber-50 border rounded text-left font-medium text-gray-700 hover:text-amber-800 transition-colors col-span-2 text-center">
                            👷 Worker Mobile Check-In
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}