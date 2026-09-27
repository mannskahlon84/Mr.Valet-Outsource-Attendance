"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    ArrowUpRight, Building2, CalendarClock, ClipboardList, LogIn, MapPin, TrendingUp, Trophy, UserCog, Users,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import StatCard from '@/components/ui/StatCard';
import { DashboardSkeleton } from '@/components/ui/Skeleton';

export default function Dashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const data = await fetchApi('/dashboard/stats');
            setStats(data);
        } catch (error) {
            console.error("Failed to load dashboard stats", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <DashboardSkeleton cards={3} />;
    }

    if (!stats) return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
            Failed to load statistics. Please refresh the page.
        </div>
    );

    return (
        <div className="space-y-6">
            <WelcomeBanner />

            {/* KPI Cards */}
            <div className="mv-stagger grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Total Locations" value={stats.total_locations} hint="Client venues with geofenced QR check-in" icon={MapPin} accent="ink" />
                <StatCard label="Total Employees" value={stats.total_workers} hint="Drivers registered across all agencies" icon={Users} accent="gold" />
                <StatCard label="Avg Daily Login" value={Number(stats.avg_daily_login) || 0} decimals={1} hint="Check-ins per working day, last 30 days" icon={LogIn} accent="green" />
            </div>

            <div className="mv-stagger grid grid-cols-1 gap-6 lg:grid-cols-5">
                {/* Top Locations */}
                <Panel className="lg:col-span-3" icon={TrendingUp} title="Top Locations by Attendance" subtitle="Driver check-ins per venue">
                    {stats.top_locations.length > 0 ? (
                        <RankedBars rows={stats.top_locations} unit="check-in" />
                    ) : (
                        <EmptyState icon={MapPin} text="No attendance data yet." />
                    )}
                </Panel>

                {/* Top Managers */}
                <Panel className="lg:col-span-2" icon={Trophy} title="Top Requesting Managers" subtitle="Most manpower requests raised">
                    {stats.top_managers.length > 0 ? (
                        <ManagerLeaderboard rows={stats.top_managers} />
                    ) : (
                        <EmptyState icon={UserCog} text="No manpower requests yet." />
                    )}
                </Panel>
            </div>

            {/* Upcoming Requests */}
            <Panel icon={CalendarClock} title="Upcoming Advance Requests" subtitle="The next shifts on the calendar"
                action={<Link href="/admin/requests" className="group inline-flex items-center gap-1 text-xs font-semibold text-[#a8842f] hover:text-[#1a1a1a]">All requests <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>}>
                {stats.upcoming_requests.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {stats.upcoming_requests.map((r: any) => (
                            <UpcomingCard key={r.id} site={r.site} date={r.date} quantity={r.quantity} />
                        ))}
                    </div>
                ) : (
                    <EmptyState icon={CalendarClock} text="No upcoming requests." />
                )}
            </Panel>
        </div>
    );
}

/* ---------------------------------------------------------------- pieces */

const QUICK_LINKS = [
    { label: 'Locations', href: '/admin/locations', icon: MapPin },
    { label: 'Workers', href: '/admin/workers', icon: Users },
    { label: 'Suppliers', href: '/admin/suppliers', icon: Building2 },
    { label: 'Requests', href: '/admin/requests', icon: ClipboardList },
];

function WelcomeBanner() {
    const [name, setName] = useState('');
    const [now, setNow] = useState<Date | null>(null);
    useEffect(() => {
        // Display only: the signed-in name saved at login, and the clock for the greeting
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage exists only after mount
        setName(sessionStorage.getItem('name') || '');
        setNow(new Date());
    }, []);
    const hour = now ? Number(now.toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Qatar' })) : 12;
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const today = now?.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Qatar' });

    return (
        <section className="relative overflow-hidden rounded-3xl bg-[#1a1a1a] px-6 py-7 text-white shadow-[0_20px_40px_-24px_rgb(26_26_26/0.6)] sm:px-8 sm:py-8">
            <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 260">
                <defs>
                    <radialGradient id="banner-glow" cx="85%" cy="0%" r="60%">
                        <stop offset="0" stopColor="#dbb457" stopOpacity="0.35" />
                        <stop offset="1" stopColor="#dbb457" stopOpacity="0" />
                    </radialGradient>
                    <pattern id="banner-bays" width="80" height="150" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
                        <path d="M0 0V110M80 0V110" stroke="#dbb457" strokeWidth="2" />
                        <path d="M0 110H80" stroke="#dbb457" strokeWidth="2" strokeDasharray="9 11" />
                    </pattern>
                </defs>
                <rect width="1000" height="260" fill="url(#banner-glow)" />
                <rect x="560" width="440" height="260" fill="url(#banner-bays)" opacity="0.1" />
                <path d="M780 -20 L860 200 L940 -20 L912 -20 L860 128 L808 -20 Z" fill="#dbb457" opacity="0.14" />
            </svg>
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#dbb457]">
                        <span className="h-px w-6 bg-[#dbb457]" />
                        Super Admin
                    </div>
                    <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                        {greeting}{name ? `, ${name}` : ''}.
                    </h1>
                    <p className="mt-1.5 text-sm text-white/60">
                        {today ? `${today} · ` : ''}Here&apos;s how Mr. Valet&apos;s outsourced manpower is running.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {QUICK_LINKS.map(({ label, href, icon: Icon }) => (
                        <Link key={href} href={href}
                            className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2 text-xs font-semibold text-white/80 backdrop-blur transition-all hover:border-[#dbb457]/60 hover:bg-[#dbb457] hover:text-[#1a1a1a]">
                            <Icon className="h-4 w-4 text-[#dbb457] transition-colors group-hover:text-[#1a1a1a]" strokeWidth={1.9} />
                            {label}
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}

function Panel({ icon: Icon, title, subtitle, action, className = '', children }: {
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <section className={`rounded-2xl border border-[#1a1a1a]/[0.06] bg-white p-5 shadow-[0_1px_2px_rgb(26_26_26/0.04)] sm:p-6 ${className}`}>
            <div className="mb-5 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#dbb457]/15 text-[#a8842f]">
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                    </span>
                    <div>
                        <h2 className="text-base font-bold text-[#1a1a1a]">{title}</h2>
                        {subtitle && <p className="text-xs text-[#1a1a1a]/45">{subtitle}</p>}
                    </div>
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

function plural(n: number, word: string) {
    return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** Horizontal bars ranked by value; bars grow in and the leader is highlighted. */
function RankedBars({ rows, unit }: { rows: { name: string; count: number }[]; unit: string }) {
    const max = Math.max(...rows.map(r => r.count), 1);
    return (
        <ol className="space-y-4">
            {rows.map((row, i) => (
                <li key={row.name}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${i === 0 ? 'bg-[#dbb457] text-[#1a1a1a]' : 'bg-[#1a1a1a]/5 text-[#1a1a1a]/55'}`}>{i + 1}</span>
                            <span className="truncate font-medium text-[#1a1a1a]">{row.name}</span>
                        </span>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-[#1a1a1a]/55">{plural(row.count, unit)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#1a1a1a]/[0.05]">
                        <div
                            className={`mv-grow-x h-full rounded-full ${i === 0 ? 'bg-gradient-to-r from-[#c9a043] to-[#dbb457]' : 'bg-[#1a1a1a]/70'}`}
                            style={{ width: `${Math.max(6, (row.count / max) * 100)}%`, animationDelay: `${i * 90}ms` }}
                        />
                    </div>
                </li>
            ))}
        </ol>
    );
}

function initials(name: string) {
    const parts = (name || '').trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '—';
}

function ManagerLeaderboard({ rows }: { rows: { name: string; count: number }[] }) {
    const max = Math.max(...rows.map(r => r.count), 1);
    return (
        <ul className="space-y-3">
            {rows.map((m, i) => (
                <li key={`${m.name}-${i}`} className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-[#f6f4ef]">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-[#1a1a1a] text-[#dbb457]' : 'bg-[#f6f4ef] text-[#1a1a1a]/70'}`}>
                        {initials(m.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-[#1a1a1a]">{m.name || 'Unnamed manager'}</span>
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-[#1a1a1a]/55">{plural(m.count, 'request')}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#1a1a1a]/[0.05]">
                            <div className="mv-grow-x h-full rounded-full bg-[#dbb457]" style={{ width: `${Math.max(8, (m.count / max) * 100)}%`, animationDelay: `${i * 90}ms` }} />
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );
}

/** "Today", "Tomorrow", "In 3 days" — counted in Qatar calendar days. */
function whenLabel(isoDate: string) {
    const today = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Qatar' }));
    const days = Math.round((new Date(isoDate).getTime() - today.getTime()) / 86_400_000);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
}

function UpcomingCard({ site, date, quantity }: { site: string; date: string; quantity: number }) {
    const d = new Date(`${date}T00:00:00`);
    const soon = whenLabel(date);
    return (
        <div className="mv-lift flex items-center gap-4 rounded-2xl border border-[#1a1a1a]/[0.06] bg-[#f6f4ef]/50 p-4">
            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[#1a1a1a] text-white">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#dbb457]">{d.toLocaleDateString('en-GB', { month: 'short' })}</span>
                <span className="text-lg font-bold leading-none">{d.getDate()}</span>
            </div>
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[#1a1a1a]">{site}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${soon === 'Today' ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-[#1a1a1a]/60'}`}>{soon}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[#a8842f]">
                        <Users className="h-3.5 w-3.5" /> {plural(quantity, 'driver')}
                    </span>
                </div>
            </div>
        </div>
    );
}

function EmptyState({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; text: string }) {
    return (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f6f4ef] text-[#1a1a1a]/35">
                <Icon className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <p className="text-sm text-[#1a1a1a]/45">{text}</p>
        </div>
    );
}
