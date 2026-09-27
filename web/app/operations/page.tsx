"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi, tryFetch } from '@/lib/api';
import LoadErrorBar from '@/components/ui/LoadErrorBar';
import StatusBadge from '@/components/ui/StatusBadge';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { ArrowRight, CalendarDays, CheckCircle2, ClipboardList, Clock, Hourglass, MapPin, Plus, Users } from 'lucide-react';

export default function OperationsDashboard() {
    const [requests, setRequests] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [attendanceReport, setAttendanceReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const loadData = () => {
        let failure = '';
        const onError = (m: string) => { failure = m; };
        Promise.all([
            tryFetch('/requests/', onError),
            tryFetch('/sites/', onError),
            tryFetch('/reports/attendance')
        ]).then(([reqs, s, att]) => {
            // A failed refresh keeps what is already on screen
            if (Array.isArray(reqs)) setRequests(reqs);
            if (Array.isArray(s)) setSites(s);
            if (att !== undefined) setAttendanceReport(att);
            setLoadError(failure);
        }).finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
        const handleSync = () => loadData();
        window.addEventListener('portal_data_updated', handleSync);
        window.addEventListener('focus', handleSync);
        return () => {
            window.removeEventListener('portal_data_updated', handleSync);
            window.removeEventListener('focus', handleSync);
        };
    }, []);

    const pendingBids = requests.filter(r => r.status === 'RESPONSES_PENDING' || r.status === 'SUBMITTED').length;
    const confirmedShifts = requests.filter(r => r.status === 'CONFIRMED' || r.status === 'PARTIALLY_CONFIRMED').length;
    const totalSites = sites.length;
    const workersOnDuty = attendanceReport?.summary?.total_present_days || 0;

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="space-y-8">
            <LoadErrorBar message={loadError} onRetry={loadData} />
            <PageHeader
                eyebrow="Operations"
                title="Operations Control Center"
                subtitle="Manage site shifts, supplier allocations, and live valet attendance"
                actions={
                    <Link 
                        href="/operations/requests/new" 
                        className="group inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#dbb457] hover:text-[#1a1a1a] hover:shadow-md"
                    >
                        <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                        Dispatch New Request
                    </Link>
                }
            />

            {/* Metric KPI Cards */}
            <div className="mv-stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Total Shift Requests" value={requests.length} hint="Across all managed locations" icon={ClipboardList} accent="ink" />
                <StatCard label="Pending Supplier Bids" value={pendingBids} hint="Awaiting review or confirmation" icon={Hourglass} accent="gold" />
                <StatCard label="Active / Confirmed Shifts" value={confirmedShifts} hint="Ready for on-site execution" icon={CheckCircle2} accent="green" />
                <StatCard label="Managed Locations" value={totalSites} hint="Geofenced client locations" icon={MapPin} accent="blue" />
            </div>

            {/* Recent Requests Section */}
            <section className="mv-fade-in overflow-hidden rounded-2xl border border-[#1a1a1a]/[0.06] bg-white shadow-[0_1px_2px_rgb(26_26_26/0.04)]">
                <div className="flex items-center justify-between gap-3 border-b border-[#1a1a1a]/[0.06] px-5 py-4 sm:px-6">
                    <div>
                        <h2 className="text-base font-bold text-[#1a1a1a]">Recent Manpower Requests</h2>
                        <p className="text-xs text-[#1a1a1a]/45">The five most recent shifts you dispatched</p>
                    </div>
                    <Link href="/operations/requests" className="group inline-flex items-center gap-1 text-xs font-semibold text-[#a8842f] hover:text-[#1a1a1a]">
                        View All ({requests.length})
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>

                {/* Mobile Cards View (Phones) */}
                <div className="md:hidden space-y-2 p-3">
                    {requests.slice(0, 5).map((r) => (
                        <div key={r.id} className="space-y-3 rounded-xl border border-[#1a1a1a]/[0.06] bg-[#f6f4ef]/60 p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-[#1a1a1a]">#{r.id}</span>
                                <StatusBadge status={r.status} />
                            </div>
                            <div className="space-y-1 text-xs text-[#1a1a1a]/65">
                                <div className="flex items-center gap-1.5">
                                    <CalendarDays className="h-3.5 w-3.5 text-[#1a1a1a]/40" />
                                    {r.required_date ? new Date(r.required_date).toLocaleDateString() : '-'}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-[#1a1a1a]/40" />
                                    <span className="tabular-nums">{r.start_time} - {r.end_time}</span>
                                    <span className="text-[#1a1a1a]/30">•</span>
                                    <Users className="h-3.5 w-3.5 text-[#1a1a1a]/40" />
                                    <strong className="font-semibold text-[#1a1a1a]">{r.total_required_workers} Drivers</strong>
                                </div>
                            </div>
                            <Link 
                                href={`/operations/requests/${r.id}`}
                                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#1a1a1a]/10 bg-white py-2.5 text-xs font-semibold text-[#1a1a1a] transition-colors hover:border-[#dbb457]"
                            >
                                Review Bids & Chat <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    ))}
                    {requests.length === 0 && (
                        <EmptyRequests />
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-[#1a1a1a]/40">
                                <th className="px-6 py-3">Req ID</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Shift Window</th>
                                <th className="px-6 py-3">Headcount</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a1a1a]/[0.05]">
                            {requests.slice(0, 5).map((r) => (
                                <tr key={r.id} className="group transition-colors hover:bg-[#f6f4ef]/70">
                                    <td className="px-6 py-4 font-bold text-[#1a1a1a]">#{r.id}</td>
                                    <td className="px-6 py-4 text-[#1a1a1a]/65">
                                        {r.required_date ? new Date(r.required_date).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 font-medium tabular-nums text-[#1a1a1a]/65">
                                        {r.start_time} - {r.end_time}
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-[#1a1a1a]">
                                        {r.total_required_workers} Drivers
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={r.status} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link 
                                            href={`/operations/requests/${r.id}`}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1a1a1a]/10 px-3 py-1.5 text-xs font-semibold text-[#1a1a1a] transition-all hover:border-[#dbb457] hover:bg-[#dbb457]/10"
                                        >
                                            Review Bids & Chat
                                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {requests.length === 0 && (
                                <tr>
                                    <td colSpan={6}>
                                        <EmptyRequests />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

function EmptyRequests() {
    return (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#dbb457]/15 text-[#a8842f]">
                <ClipboardList className="h-6 w-6" strokeWidth={1.8} />
            </span>
            <div className="text-sm font-semibold text-[#1a1a1a]">No manpower requests yet</div>
            <div className="text-xs text-[#1a1a1a]/45">Use &ldquo;Dispatch New Request&rdquo; to send your first shift to the agencies.</div>
        </div>
    );
}
