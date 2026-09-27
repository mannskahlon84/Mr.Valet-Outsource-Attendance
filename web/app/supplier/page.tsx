"use client";
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { calendarDate } from '@/lib/time';
import RequestActionButton from '@/components/supplier/RequestActionButton';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchApi, tryFetch } from '@/lib/api';
import LoadErrorBar from '@/components/ui/LoadErrorBar';
import StatusBadge from '@/components/ui/StatusBadge';

export default function SupplierDashboard() {
    const [requests, setRequests] = useState<any[]>([]);
    const [workers, setWorkers] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [liveAttendance, setLiveAttendance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const loadData = useCallback(() => {
        let failure = '';
        const onError = (m: string) => { failure = m; };
        Promise.all([
            tryFetch('/requests/supplier', onError),
            tryFetch('/workers/', onError),
            tryFetch('/notifications/'),
            tryFetch('/accounting/invoices'),
            tryFetch('/attendance/supplier-live')
        ]).then(([reqs, wrks, notifs, invs, live]) => {
            // A failed refresh keeps what is already on screen
            if (Array.isArray(reqs)) setRequests(reqs);
            if (Array.isArray(wrks)) setWorkers(wrks);
            if (Array.isArray(notifs)) setNotifications(notifs);
            if (Array.isArray(invs)) setInvoices(invs);
            if (Array.isArray(live)) setLiveAttendance(live);
            setLoadError(failure);
        }).finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        loadData();

        // Listen to live portal sync events from other tabs/backend
        const handleSync = () => loadData();
        window.addEventListener('portal_data_updated', handleSync);
        window.addEventListener('focus', handleSync);
        return () => {
            window.removeEventListener('portal_data_updated', handleSync);
            window.removeEventListener('focus', handleSync);
        };
    }, [loadData]);

    const unreadNotifs = notifications.filter(n => !n.is_read).length;
    const pendingBids = requests.filter(r => (r.supplier_response_status === 'PENDING' || r.status === 'RESPONSES_PENDING' || r.status === 'SUBMITTED')).length;
    const confirmedShifts = requests.filter(r => (r.supplier_response_status === 'ACCEPTED_BY_OM' || r.supplier_response_status === 'ACCEPTED' || r.status === 'CONFIRMED' || r.status === 'PARTIALLY_CONFIRMED')).length;

    // Headcount quota calculations
    const totalDriversToSupply = requests.reduce((acc, r) => acc + (r.requested_quantity || r.total_required_workers || 0), 0);
    const uniqueLocations = new Set(requests.map(r => r.site_id).filter(Boolean)).size;
    const activeWorkersOnShift = liveAttendance.filter(a => a.status === 'ON_SHIFT').length;

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="space-y-6">
            <LoadErrorBar message={loadError} onRetry={loadData} />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="mv-eyebrow basis-full mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#a8842f]"><span className="h-px w-6 bg-[#dbb457]" />Supplier Agency</div>
                    <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight text-[#1a1a1a]">Agency Dispatch Portal</h1>
                    <p className="text-sm text-[#1a1a1a]/55">Review routed manpower shifts, confirm driver availability, and monitor real-time worker attendance</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/supplier/attendance"
                        className="bg-green-50 border border-green-300 text-green-800 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-green-100 transition-colors shadow-[0_1px_2px_rgb(26_26_26/0.04)]"
                    >
                        {activeWorkersOnShift} Drivers Live on Shift
                    </Link>
                    {unreadNotifs > 0 && (
                        <Link 
                            href="/supplier/notifications"
                            className="bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-amber-200 transition-colors"
                        >
                            <span className="animate-pulse">●</span> {unreadNotifs} Unread Notification{unreadNotifs > 1 ? 's' : ''}
                        </Link>
                    )}
                </div>
            </div>

            {/* Quota Overview Callout Banner */}
            <div className="bg-gradient-to-r from-amber-50 via-white to-amber-50 p-4 sm:p-5 rounded-2xl border border-amber-300 shadow-[0_1px_2px_rgb(26_26_26/0.04)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#1a1a1a] text-white flex items-center justify-center text-xl font-bold shadow-[0_1px_2px_rgb(26_26_26/0.04)] flex-shrink-0">
                        
                    </div>
                    <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-amber-900">Agency Dispatch Quota</div>
                        <div className="text-base sm:text-lg font-bold text-[#1a1a1a]">
                            Required to send <span className="text-[#a8842f] font-bold">{totalDriversToSupply} Valet Drivers</span> across <span className="text-[#1a1a1a] font-bold">{uniqueLocations} Location{uniqueLocations !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Link
                        href="/supplier/requests"
                        className="w-full md:w-auto text-center bg-[#1a1a1a] hover:bg-[#dbb457] hover:text-[#1a1a1a] text-white px-4 py-2 rounded-lg text-xs font-bold shadow transition-colors"
                    >
                        Review Quota Details →
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-amber-200 bg-amber-50/20">
                    <div className="text-xs font-bold uppercase text-amber-700">New Routed Requests</div>
                    <div className="text-3xl font-bold text-amber-600 mt-2">{pendingBids}</div>
                    <div className="text-xs text-amber-700 mt-1">Awaiting confirmation</div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-green-200 bg-green-50/20">
                    <div className="text-xs font-bold uppercase text-green-700">Confirmed Shifts</div>
                    <div className="text-3xl font-bold text-green-600 mt-2">{confirmedShifts}</div>
                    <div className="text-xs text-green-700 mt-1">Ready for worker roster</div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08]">
                    <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Enrolled Driver Roster</div>
                    <div className="text-3xl font-bold text-[#1a1a1a] mt-2">{workers.length}</div>
                    <div className="text-xs text-[#1a1a1a]/55 mt-1">Registered outsource staff</div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08]">
                    <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Drivers Active Now</div>
                    <div className="text-3xl font-bold text-[#1a1a1a] mt-2">{activeWorkersOnShift}</div>
                    <div className="text-xs text-green-600 font-medium mt-1">Clocked in at venues</div>
                </div>
            </div>

            {/* Incoming Shift Requests with Location and Manager Details */}
            <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08] overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-[#1a1a1a]/[0.08] flex justify-between items-center">
                    <div>
                        <h2 className="text-base font-bold text-[#1a1a1a]">Incoming Shift Requests</h2>
                        <p className="text-xs text-[#1a1a1a]/55">Includes venue location name, requesting manager name, and required headcount</p>
                    </div>
                    <Link href="/supplier/requests" className="text-xs font-bold text-[#a8842f] hover:underline">
                        View All ({requests.length}) →
                    </Link>
                </div>

                {/* Mobile Cards View (< md screens) */}
                <div className="md:hidden divide-y divide-[#1a1a1a]/[0.05] p-2 sm:p-3 space-y-2">
                    {requests.slice(0, 6).map((r) => (
                        <div key={r.id} className="bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200/80 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[#1a1a1a] bg-white px-2 py-0.5 rounded border border-[#1a1a1a]/[0.08]">
                                    Req #{r.id}
                                </span>
                                <StatusBadge status={r.supplier_response_status || r.status} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-[#1a1a1a]">
                                    {r.site_name || `Location #${r.site_id}`}
                                </div>
                                <div className="text-xs text-[#1a1a1a]/55 mt-0.5">
                                    Manager: <strong>{r.ops_manager_name || 'Operations Manager'}</strong>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2 rounded-lg border border-[#1a1a1a]/[0.05]">
                                <div>
                                    <span className="text-[10px] text-[#1a1a1a]/40 block uppercase font-bold">Shift Date</span>
                                    <span className="font-semibold text-[#1a1a1a]/85">
                                        {r.required_date ? calendarDate(r.required_date) : '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-[#1a1a1a]/40 block uppercase font-bold">Window</span>
                                    <span className="font-mono text-[#1a1a1a]/85 text-[11px]">{r.start_time} - {r.end_time}</span>
                                </div>
                                <div className="col-span-2 flex justify-between items-center pt-1 border-t border-[#1a1a1a]/[0.05]">
                                    <span className="text-[10px] text-[#1a1a1a]/55 uppercase font-bold">Your Agency Quota:</span>
                                    <span className="font-bold text-[#a8842f]">{r.requested_quantity || r.total_required_workers} Drivers</span>
                                </div>
                            </div>
                            <Link 
                                href={`/supplier/requests/${r.id}`}
                                className="block text-center w-full text-xs font-bold bg-[#1a1a1a] text-white py-2 rounded-lg hover:bg-[#dbb457] hover:text-[#1a1a1a] transition-colors shadow-[0_1px_2px_rgb(26_26_26/0.04)]"
                            >
                                Review Request & Respond →
                            </Link>
                        </div>
                    ))}
                    {requests.length === 0 && (
                        <div className="p-6 text-center text-xs text-[#1a1a1a]/40">
                            No shift requests dispatched to your agency yet.
                        </div>
                    )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#1a1a1a]/[0.06] text-sm">
                        <thead className="bg-[#f6f4ef]/60 text-[#1a1a1a]/55 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-5 py-3 text-left">Req ID</th>
                                <th className="px-5 py-3 text-left">Location / Venue</th>
                                <th className="px-5 py-3 text-left">Ops Manager</th>
                                <th className="px-5 py-3 text-left">Date & Window</th>
                                <th className="px-5 py-3 text-left">Your Quota</th>
                                <th className="px-5 py-3 text-left">Status</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a1a1a]/[0.06] bg-white">
                            {requests.slice(0, 6).map((r) => (
                                <tr key={r.id} className="hover:bg-[#f6f4ef]/60 transition-colors">
                                    <td className="px-5 py-4 font-bold text-[#1a1a1a]">#{r.id}</td>
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-[#1a1a1a] text-sm">{r.site_name || `Location #${r.site_id}`}</div>
                                        {r.site_address && <div className="text-xs text-[#1a1a1a]/40 truncate max-w-xs">{r.site_address}</div>}
                                    </td>
                                    <td className="px-5 py-4 text-[#1a1a1a]/85 font-semibold text-xs">
                                        {r.ops_manager_name || 'Operations Manager'}
                                    </td>
                                    <td className="px-5 py-4 text-[#1a1a1a]/75">
                                        <div className="font-medium text-xs">{r.required_date ? calendarDate(r.required_date) : '-'}</div>
                                        <div className="text-xs text-[#1a1a1a]/55 font-mono">{r.start_time} - {r.end_time}</div>
                                    </td>
                                    <td className="px-5 py-4 font-bold text-[#1a1a1a]">
                                        <span className="bg-amber-50 border border-amber-200 text-amber-800 px-2 py-1 rounded text-xs">
                                            {r.requested_quantity || r.total_required_workers} Drivers
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <StatusBadge status={r.supplier_response_status || r.status} />
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <RequestActionButton request={r} />
                                    </td>
                                </tr>
                            ))}
                            {requests.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-8 text-center text-[#1a1a1a]/40">
                                        No shift requests dispatched to your agency yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
