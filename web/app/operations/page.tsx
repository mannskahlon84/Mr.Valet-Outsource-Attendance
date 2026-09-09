"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';

export default function OperationsDashboard() {
    const [requests, setRequests] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [attendanceReport, setAttendanceReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetchApi('/requests/').catch(() => []),
            fetchApi('/sites/').catch(() => []),
            fetchApi('/reports/attendance').catch(() => null)
        ]).then(([reqs, s, att]) => {
            setRequests(reqs || []);
            setSites(s || []);
            setAttendanceReport(att);
        }).finally(() => setLoading(false));
    }, []);

    const pendingBids = requests.filter(r => r.status === 'RESPONSES_PENDING' || r.status === 'SUBMITTED').length;
    const confirmedShifts = requests.filter(r => r.status === 'CONFIRMED' || r.status === 'PARTIALLY_CONFIRMED').length;
    const totalSites = sites.length;
    const workersOnDuty = attendanceReport?.summary?.total_present_days || 0;

    if (loading) return <div className="p-8 text-center text-gray-500">Loading operations dashboard...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Operations Control Center</h1>
                    <p className="text-sm text-gray-500">Manage site shifts, supplier allocations, and live valet attendance</p>
                </div>
                <Link 
                    href="/operations/requests/new" 
                    className="bg-[#dbb457] hover:bg-[#c29d45] text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow transition-colors"
                >
                    + Dispatch New Request
                </Link>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-xs font-bold uppercase text-gray-400">Total Shift Requests</div>
                    <div className="text-3xl font-black text-gray-900 mt-2">{requests.length}</div>
                    <div className="text-xs text-gray-500 mt-1">Across all managed locations</div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-amber-200 bg-amber-50/20">
                    <div className="text-xs font-bold uppercase text-amber-700">Pending Supplier Bids</div>
                    <div className="text-3xl font-black text-amber-600 mt-2">{pendingBids}</div>
                    <div className="text-xs text-amber-700 mt-1">Awaiting review or confirmation</div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-green-200 bg-green-50/20">
                    <div className="text-xs font-bold uppercase text-green-700">Active / Confirmed Shifts</div>
                    <div className="text-3xl font-black text-green-600 mt-2">{confirmedShifts}</div>
                    <div className="text-xs text-green-700 mt-1">Ready for on-site execution</div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-xs font-bold uppercase text-gray-400">Managed Locations</div>
                    <div className="text-3xl font-black text-gray-900 mt-2">{totalSites}</div>
                    <div className="text-xs text-gray-500 mt-1">Geofenced client locations</div>
                </div>
            </div>

            {/* Recent Requests Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-base font-bold text-gray-900">Recent Manpower Requests</h2>
                    <Link href="/operations/requests" className="text-xs font-bold text-[#dbb457] hover:underline">
                        View All ({requests.length}) →
                    </Link>
                </div>

                {/* Mobile Cards View (Phones) */}
                <div className="md:hidden divide-y divide-gray-100 p-2 sm:p-3 space-y-2">
                    {requests.slice(0, 5).map((r) => (
                        <div key={r.id} className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200/80 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                                    #{r.id}
                                </span>
                                <StatusBadge status={r.status} />
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-gray-800">
                                    📅 {r.required_date ? new Date(r.required_date).toLocaleDateString() : '-'}
                                </div>
                                <div className="text-xs text-gray-500 font-mono mt-0.5">
                                    ⏱️ {r.start_time} - {r.end_time} • <strong className="text-gray-700">{r.total_required_workers} Drivers</strong>
                                </div>
                            </div>
                            <Link 
                                href={`/operations/requests/${r.id}`}
                                className="block text-center w-full text-xs font-bold bg-white text-gray-800 border border-gray-300 py-2 rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
                            >
                                Review Bids & Chat →
                            </Link>
                        </div>
                    ))}
                    {requests.length === 0 && (
                        <div className="p-6 text-center text-xs text-gray-400">
                            No shift requests created yet. Tap "+ Dispatch New Request" above.
                        </div>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
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
                                    <td className="px-5 py-4 text-gray-600">
                                        {r.required_date ? new Date(r.required_date).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-5 py-4 text-gray-600 font-mono text-xs">
                                        {r.start_time} - {r.end_time}
                                    </td>
                                    <td className="px-5 py-4 font-bold text-gray-800">
                                        {r.total_required_workers} Drivers
                                    </td>
                                    <td className="px-5 py-4">
                                        <StatusBadge status={r.status} />
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <Link 
                                            href={`/operations/requests/${r.id}`}
                                            className="text-[#dbb457] hover:text-[#c29d45] font-bold text-xs border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-50 inline-block transition-colors"
                                        >
                                            Review Bids & Chat →
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {requests.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                                        No manpower requests created yet. Click "+ Dispatch New Request" above.
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
