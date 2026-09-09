"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';

export default function SupplierDashboard() {
    const [requests, setRequests] = useState<any[]>([]);
    const [workers, setWorkers] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetchApi('/requests/supplier').catch(() => fetchApi('/requests/').catch(() => [])),
            fetchApi('/workers/').catch(() => []),
            fetchApi('/notifications/').catch(() => []),
            fetchApi('/accounting/invoices').catch(() => [])
        ]).then(([reqs, wrks, notifs, invs]) => {
            setRequests(reqs || []);
            setWorkers(wrks || []);
            setNotifications(notifs || []);
            setInvoices(invs || []);
        }).finally(() => setLoading(false));
    }, []);

    const unreadNotifs = notifications.filter(n => !n.is_read).length;
    const pendingBids = requests.filter(r => r.status === 'RESPONSES_PENDING' || r.status === 'SUBMITTED').length;
    const confirmedShifts = requests.filter(r => r.status === 'CONFIRMED' || r.status === 'PARTIALLY_CONFIRMED').length;

    if (loading) return <div className="p-8 text-center text-gray-500">Loading agency dashboard...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Agency Dispatch Portal</h1>
                    <p className="text-sm text-gray-500">Review routed manpower shifts, confirm driver availability, and manage your roster</p>
                </div>
                {unreadNotifs > 0 && (
                    <Link 
                        href="/supplier/notifications"
                        className="bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-amber-200 transition-colors"
                    >
                        <span className="animate-pulse">●</span> {unreadNotifs} Unread Notification{unreadNotifs > 1 ? 's' : ''}
                    </Link>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-amber-200 bg-amber-50/20">
                    <div className="text-xs font-bold uppercase text-amber-700">New Routed Requests</div>
                    <div className="text-3xl font-black text-amber-600 mt-2">{pendingBids}</div>
                    <div className="text-xs text-amber-700 mt-1">Awaiting your confirmation</div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-green-200 bg-green-50/20">
                    <div className="text-xs font-bold uppercase text-green-700">Confirmed Shifts</div>
                    <div className="text-3xl font-black text-green-600 mt-2">{confirmedShifts}</div>
                    <div className="text-xs text-green-700 mt-1">Ready for worker assignment</div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-xs font-bold uppercase text-gray-400">Enrolled Driver Roster</div>
                    <div className="text-3xl font-black text-gray-900 mt-2">{workers.length}</div>
                    <div className="text-xs text-gray-500 mt-1">Registered outsource staff</div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-xs font-bold uppercase text-gray-400">Generated Invoices</div>
                    <div className="text-3xl font-black text-gray-900 mt-2">{invoices.length}</div>
                    <div className="text-xs text-gray-500 mt-1">Available for PDF download</div>
                </div>
            </div>

            {/* Incoming Requests */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-base font-bold text-gray-900">Routed Shift Requests</h2>
                    <Link href="/supplier/requests" className="text-xs font-bold text-[#dbb457] hover:underline">
                        View All ({requests.length}) →
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-5 py-3 text-left">Req ID</th>
                                <th className="px-5 py-3 text-left">Date</th>
                                <th className="px-5 py-3 text-left">Shift Window</th>
                                <th className="px-5 py-3 text-left">Headcount</th>
                                <th className="px-5 py-3 text-left">Status</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {requests.slice(0, 5).map((r) => (
                                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-5 py-4 font-bold text-gray-900">#{r.id}</td>
                                    <td className="px-5 py-4 text-gray-700">
                                        {r.required_date ? new Date(r.required_date).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-5 py-4 text-gray-600 font-mono text-xs">
                                        {r.start_time} - {r.end_time}
                                    </td>
                                    <td className="px-5 py-4 font-bold text-gray-900">
                                        {r.total_required_workers} Drivers
                                    </td>
                                    <td className="px-5 py-4">
                                        <StatusBadge status={r.status} />
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <Link 
                                            href={`/supplier/requests/${r.id}`}
                                            className="text-[#dbb457] hover:text-[#c29d45] font-bold text-xs border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-50 inline-block transition-colors"
                                        >
                                            Respond & Assign →
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {requests.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
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
