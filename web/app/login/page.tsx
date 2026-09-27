"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi, API_URL } from '../../lib/api';
import { v4 as uuidv4 } from 'uuid';

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

    const executeLogin = async (userToAuth: string, passToAuth: string) => {
        setError('');
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('username', userToAuth);
            params.append('password', passToAuth);
            
            // Get or generate Device ID for binding
            let deviceId = localStorage.getItem('deviceId');
            if (!deviceId) {
                deviceId = uuidv4();
                localStorage.setItem('deviceId', deviceId);
            }
            params.append('client_id', deviceId);
            
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
                let detail = errText;
                try { detail = JSON.parse(errText).detail || errText; } catch { /* not JSON */ }
                throw new Error(res.status === 400 ? 'Incorrect username or password.' : detail);
            }
            
            const data = await res.json();
            sessionStorage.setItem('token', data.access_token);
            
            const me = await fetchApi('/auth/me');
            const normRole = normalizeRole(me.role);
            sessionStorage.setItem('role', normRole);
            sessionStorage.setItem('role_display', me.role);
            sessionStorage.setItem('name', me.name || me.email || 'User');
            sessionStorage.setItem('email', me.email || userToAuth || '');
            sessionStorage.setItem('user_id', String(me.id || ''));
            
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
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await executeLogin(username, password);
    };

    return (
        <div className="min-h-screen bg-[#f6f4ef] text-[#1a1a1a] lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">

            {/* Brand panel: charcoal with the gold parking-bay artwork */}
            <aside className="relative overflow-hidden bg-[#1a1a1a] text-white px-6 py-8 sm:px-10 lg:px-14 lg:py-14 flex flex-col lg:sticky lg:top-0 lg:h-screen">
                <ParkingArtwork />
                <div className="relative z-10 flex items-center gap-3">
                    <span className="h-px w-8 bg-[#dbb457]" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#dbb457]">Parking Solutions · Qatar</span>
                </div>
                <div className="relative z-10 mt-6 lg:mt-auto lg:mb-auto max-w-md">
                    <h1 className="text-2xl sm:text-3xl lg:text-[2.6rem] lg:leading-[1.1] font-extrabold tracking-tight">
                        Every shift. Every driver. <span className="text-[#dbb457]">Verified.</span>
                    </h1>
                    <p className="hidden sm:block mt-4 text-sm lg:text-base text-white/65 leading-relaxed">
                        Manpower control for Mr. Valet venues: request drivers from agencies, confirm shifts, and bill only for attendance that is proven on site.
                    </p>
                    <ul className="hidden lg:grid mt-10 gap-4 text-sm">
                        {[
                            ['Venue QR + GPS check-in', 'Drivers clock in only at the venue, inside its geofence'],
                            ['Face verification', 'The same person starts and ends every shift'],
                            ['Agency dispatch', 'Requests, offers and assignments in one place'],
                            ['Verified billing', 'Invoices from completed shifts only'],
                        ].map(([title, detail]) => (
                            <li key={title} className="flex gap-3">
                                <span className="mt-1.5 h-2 w-2 shrink-0 rotate-45 bg-[#dbb457]" />
                                <span>
                                    <span className="font-semibold text-white">{title}</span>
                                    <span className="block text-white/55 text-[13px]">{detail}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="relative z-10 hidden lg:block text-xs text-white/40">
                    © {new Date().getFullYear()} Mr. Valet Parking Solutions
                </p>
            </aside>

            {/* Sign-in panel */}
            <main className="flex flex-col items-center px-4 py-8 sm:px-8 lg:py-14 lg:justify-center">
                <div className="w-full max-w-md">
                    <img src="/logo.jpg" alt="Mr. Valet Parking Solutions" className="h-12 sm:h-14 w-auto mx-auto lg:mx-0 mix-blend-multiply" />

                    <div className="mt-8 text-center lg:text-left">
                        <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
                        <p className="mt-1 text-sm text-[#1a1a1a]/60">Manpower Control System · Operations &amp; agency portal</p>
                    </div>

                    {error && (
                        <div role="alert" className="mt-6 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                            <span>{error}</span>
                            <button type="button" onClick={() => setError('')} className="font-bold text-red-500 cursor-pointer" aria-label="Dismiss">✕</button>
                        </div>
                    )}

                    <form onSubmit={handleFormSubmit} className="mt-6 space-y-5">
                        <div>
                            <label htmlFor="login-username" className="block text-xs font-semibold uppercase tracking-wider text-[#1a1a1a]/70 mb-1.5">
                                Username, email or WhatsApp
                            </label>
                            <input
                                id="login-username"
                                type="text"
                                autoComplete="username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                                placeholder="name@mrvalet.com"
                                className="w-full rounded-xl border border-[#1a1a1a]/15 bg-white px-4 py-3 text-sm placeholder:text-[#1a1a1a]/35 focus:border-[#dbb457] focus:outline-none focus:ring-4 focus:ring-[#dbb457]/20"
                            />
                        </div>
                        <div>
                            <div className="flex items-baseline justify-between mb-1.5">
                                <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wider text-[#1a1a1a]/70">
                                    Password
                                </label>
                                <Link href="/forgot-password" className="text-xs font-semibold text-[#a8842f] hover:text-[#1a1a1a] hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                            <input
                                id="login-password"
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full rounded-xl border border-[#1a1a1a]/15 bg-white px-4 py-3 text-sm placeholder:text-[#1a1a1a]/35 focus:border-[#dbb457] focus:outline-none focus:ring-4 focus:ring-[#dbb457]/20"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-xl bg-[#1a1a1a] px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#dbb457] hover:text-[#1a1a1a] disabled:opacity-50 cursor-pointer"
                        >
                            {loading ? 'Signing in…' : 'Sign in'}
                        </button>
                    </form>

                    <p className="mt-10 text-center lg:text-left text-xs text-[#1a1a1a]/45 lg:hidden">
                        © {new Date().getFullYear()} Mr. Valet Parking Solutions
                    </p>
                </div>
            </main>
        </div>
    );
}

/** Aerial view of gold parking-bay lines with the logo's "V" chevron, drawn in SVG (no photo needed). */
function ParkingArtwork() {
    return (
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 600 900">
            <defs>
                <pattern id="bays" width="90" height="170" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
                    <path d="M0 0V120M90 0V120" stroke="#dbb457" strokeWidth="2" />
                    <path d="M0 120H90" stroke="#dbb457" strokeWidth="2" strokeDasharray="10 12" />
                </pattern>
                <radialGradient id="fade" cx="75%" cy="30%" r="80%">
                    <stop offset="0" stopColor="#1a1a1a" stopOpacity="0" />
                    <stop offset="1" stopColor="#1a1a1a" stopOpacity="0.95" />
                </radialGradient>
                <linearGradient id="goldV" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#dbb457" stopOpacity="0.28" />
                    <stop offset="1" stopColor="#dbb457" stopOpacity="0.04" />
                </linearGradient>
            </defs>
            <rect width="600" height="900" fill="url(#bays)" opacity="0.22" />
            <path d="M330 -40 L470 360 L610 -40 L560 -40 L470 230 L380 -40 Z" fill="url(#goldV)" />
            <rect width="600" height="900" fill="url(#fade)" />
        </svg>
    );
}
