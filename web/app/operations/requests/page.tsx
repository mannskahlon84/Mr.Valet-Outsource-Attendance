"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';

export default function OperationsRequests() {
    const [requests, setRequests] = useState<any[]>([]);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [loading, setLoading] = useState(true);

    const loadData = () => {
        fetchApi('/requests/')
            .then(data => setRequests(data || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, []);

    const filtered = requests.filter(r => {
        if (filterStatus === 'ALL') return true;
        return r.status === filterStatus;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Shift Requests</h1>
                    <p className="text-sm text-gray-500">Track allocations, review supplier confirmations, and manage shifts</p>
                </div>
                <Link 
                    href="/operations/requests/new" 
                    className="bg-[#dbb457] hover:bg-[#c29d45] text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow transition-colors"
                >
                    + New Shift Request
                </Link>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2">
                {['ALL', 'SUBMITTED', 'RESPONSES_PENDING', 'PARTIALLY_CONFIRMED', 'CONFIRMED', 'CANCELLED'].map((st) => (
                    <button
                        key={st}
                        onClick={() => setFilterStatus(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            filterStatus === st 
                                ? 'bg-gray-900 text-white' 
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                    >
                        {st.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Table & Mobile Cards */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Mobile Cards View (< md screens) */}
                <div className="md:hidden divide-y divide-gray-100 p-3 space-y-3">
                    {filtered.map((r) => (
                        <div key={r.id} className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-gray-900 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-sm">
                                    Req #{r.id}
                                </span>
                                <StatusBadge status={r.status} />
                            </div>

                            <div>
                                <h3 className="text-sm font-black text-gray-900">{r.site_name || `Location #${r.site_id}`}</h3>
                                {r.site_address && (
                                    <p className="text-xs text-gray-500 truncate">{r.site_address}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-lg border border-gray-100 font-medium">
                                <div>
                                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Date</span>
                                    <span className="text-gray-800 font-semibold">
                                        {r.required_date ? new Date(r.required_date).toLocaleDateString() : '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Shift</span>
                                    <span className="text-gray-800 font-mono">
                                        {r.start_time} - {r.end_time}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Headcount</span>
                                    <span className="text-[#dbb457] font-black">{r.total_required_workers} Drivers</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Role</span>
                                    <span className="text-gray-600">{r.skill_category || 'Valet Driver'}</span>
                                </div>
                            </div>

                            <Link 
                                href={`/operations/requests/${r.id}`}
                                className="block text-center w-full text-xs font-bold bg-[#dbb457] text-white py-2.5 rounded-lg hover:bg-[#c29d45] transition-colors shadow-sm"
                            >
                                Review Bids & Manage Shift →
                            </Link>
                        </div>
                    ))}
                    {filtered.length === 0 && !loading && (
                        <div className="p-8 text-center text-xs text-gray-400">
                            No requests found matching this filter.
                        </div>
                    )}
                </div>

                {/* Desktop Table (>= md screens) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-5 py-3 text-left">ID</th>
                                <th className="px-5 py-3 text-left">Location</th>
                                <th className="px-5 py-3 text-left">Date</th>
                                <th className="px-5 py-3 text-left">Shift Window</th>
                                <th className="px-5 py-3 text-left">Required Headcount</th>
                                <th className="px-5 py-3 text-left">Skill Category</th>
                                <th className="px-5 py-3 text-left">Status</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {filtered.map((r) => (
                                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-5 py-4 font-bold text-gray-900">#{r.id}</td>
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-gray-900 text-sm">{r.site_name || `Location #${r.site_id}`}</div>
                                        {r.site_address && (
                                            <div className="text-xs text-gray-400 truncate max-w-[200px]">{r.site_address}</div>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-gray-700 font-medium">
                                        {r.required_date ? new Date(r.required_date).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-5 py-4 text-gray-600 font-mono text-xs">
                                        {r.start_time} - {r.end_time}
                                    </td>
                                    <td className="px-5 py-4 font-bold text-gray-900">
                                        {r.total_required_workers} Drivers
                                    </td>
                                    <td className="px-5 py-4 text-gray-500">
                                        {r.skill_category || 'Valet Driver'}
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
                            {filtered.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={8} className="px-5 py-8 text-center text-gray-400">
                                        No requests found matching this filter.
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
