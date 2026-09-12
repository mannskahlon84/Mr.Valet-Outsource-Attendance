"use client";
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';

export default function SupplierDashboard() {
    const [requests, setRequests] = useState<any[]>([]);
    const [workers, setWorkers] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [liveAttendance, setLiveAttendance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(() => {
        Promise.all([
            fetchApi('/requests/supplier').catch(() => fetchApi('/requests/').catch(() => [])),
            fetchApi('/workers/').catch(() => []),
            fetchApi('/notifications/').catch(() => []),
            fetchApi('/accounting/invoices').catch(() => []),
            fetchApi('/attendance/supplier-live').catch(() => [])
        ]).then(([reqs, wrks, notifs, invs, live]) => {
            setRequests(reqs || []);
            setWorkers(wrks || []);
            setNotifications(notifs || []);
            setInvoices(invs || []);
            setLiveAttendance(live || []);
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

    if (loading) return <div className="p-8 text-center text-gray-500">Loading agency dashboard...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Agency Dispatch Portal</h1>
                    <p className="text-sm text-gray-500">Review routed manpower shifts, confirm driver availability, and monitor real-time worker attendance</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/supplier/attendance"
                        className="bg-green-50 border border-green-300 text-green-800 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-green-100 transition-colors shadow-sm"
                    >
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
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
            <div className="bg-gradient-to-r from-amber-50 via-white to-amber-50 p-4 sm:p-5 rounded-xl border border-amber-300 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#dbb457] text-white flex items-center justify-center text-xl font-black shadow-sm flex-shrink-0">
                        📋
                    </div>
                    <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-amber-900">Agency Dispatch Quota</div>
                        <div className="text-base sm:text-lg font-black text-gray-900">
                            Required to send <span className="text-[#dbb457] font-black">{totalDriversToSupply} Valet Drivers</span> across <span className="text-gray-900 font-black">{uniqueLocations} Location{uniqueLocations !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Link
                        href="/supplier/requests"
                        className="w-full md:w-auto text-center bg-[#dbb457] hover:bg-[#c29d45] text-white px-4 py-2 rounded-lg text-xs font-bold shadow transition-colors"
                    >
                        Review Quota Details →
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-amber-200 bg-amber-50/20">
                    <div className="text-xs font-bold uppercase text-amber-700">New Routed Requests</div>
                    <div className="text-3xl font-black text-amber-600 mt-2">{pendingBids}</div>
                    <div className="text-xs text-amber-700 mt-1">Awaiting confirmation</div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-green-200 bg-green-50/20">
                    <div className="text-xs font-bold uppercase text-green-700">Confirmed Shifts</div>
                    <div className="text-3xl font-black text-green-600 mt-2">{confirmedShifts}</div>
                    <div className="text-xs text-green-700 mt-1">Ready for worker roster</div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-xs font-bold uppercase text-gray-400">Enrolled Driver Roster</div>
                    <div className="text-3xl font-black text-gray-900 mt-2">{workers.length}</div>
                    <div className="text-xs text-gray-500 mt-1">Registered outsource staff</div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-xs font-bold uppercase text-gray-400">Drivers Active Now</div>
                    <div className="text-3xl font-black text-gray-900 mt-2">{activeWorkersOnShift}</div>
                    <div className="text-xs text-green-600 font-medium mt-1">Clocked in at venues</div>
                </div>
            </div>

            {/* Incoming Shift Requests with Location and Manager Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">Incoming Shift Requests</h2>
                        <p className="text-xs text-gray-500">Includes venue location name, requesting manager name, and required headcount</p>
                    </div>
                    <Link href="/supplier/requests" className="text-xs font-bold text-[#dbb457] hover:underline">
                        View All ({requests.length}) →
                    </Link>
                </div>

                {/* Mobile Cards View (< md screens) */}
                <div className="md:hidden divide-y divide-gray-100 p-2 sm:p-3 space-y-2">
                    {requests.slice(0, 6).map((r) => (
                        <div key={r.id} className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200/80 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                                    Req #{r.id}
                                </span>
                                <StatusBadge status={r.supplier_response_status || r.status} />
                            </div>
                            <div>
                                <div className="text-sm font-black text-gray-900">
                                    📍 {r.site_name || `Location #${r.site_id}`}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                    👤 Manager: <strong>{r.ops_manager_name || 'Operations Manager'}</strong>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2 rounded-lg border border-gray-100">
                                <div>
                                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Shift Date</span>
                                    <span className="font-semibold text-gray-800">
                                        {r.required_date ? new Date(r.required_date).toLocaleDateString() : '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Window</span>
                                    <span className="font-mono text-gray-800 text-[11px]">{r.start_time} - {r.end_time}</span>
                                </div>
                                <div className="col-span-2 flex justify-between items-center pt-1 border-t border-gray-100">
                                    <span className="text-[10px] text-gray-500 uppercase font-bold">Your Agency Quota:</span>
                                    <span className="font-black text-[#dbb457]">{r.requested_quantity || r.total_required_workers} Drivers</span>
                                </div>
                            </div>
                            <Link 
                                href={`/supplier/requests/${r.id}`}
                                className="block text-center w-full text-xs font-bold bg-[#dbb457] text-white py-2 rounded-lg hover:bg-[#c29d45] transition-colors shadow-sm"
                            >
                                Review Request & Respond →
                            </Link>
                        </div>
                    ))}
                    {requests.length === 0 && (
                        <div className="p-6 text-center text-xs text-gray-400">
                            No shift requests dispatched to your agency yet.
                        </div>
                    )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
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
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {requests.slice(0, 6).map((r) => (
                                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-5 py-4 font-bold text-gray-900">#{r.id}</td>
                                    <td className="px-5 py-4">
                                        <div className="font-black text-gray-900 text-sm">{r.site_name || `Location #${r.site_id}`}</div>
                                        {r.site_address && <div className="text-xs text-gray-400 truncate max-w-xs">{r.site_address}</div>}
                                    </td>
                                    <td className="px-5 py-4 text-gray-800 font-semibold text-xs">
                                        {r.ops_manager_name || 'Operations Manager'}
                                    </td>
                                    <td className="px-5 py-4 text-gray-700">
                                        <div className="font-medium text-xs">{r.required_date ? new Date(r.required_date).toLocaleDateString() : '-'}</div>
                                        <div className="text-xs text-gray-500 font-mono">{r.start_time} - {r.end_time}</div>
                                    </td>
                                    <td className="px-5 py-4 font-black text-gray-900">
                                        <span className="bg-amber-50 border border-amber-200 text-amber-800 px-2 py-1 rounded text-xs">
                                            {r.requested_quantity || r.total_required_workers} Drivers
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <StatusBadge status={r.supplier_response_status || r.status} />
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <Link 
                                            href={`/supplier/requests/${r.id}`}
                                            className="text-[#dbb457] hover:text-[#c29d45] font-bold text-xs border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-50 inline-block transition-colors shadow-sm"
                                        >
                                            Respond & Assign →
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {requests.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
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
