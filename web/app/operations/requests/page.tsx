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

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
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
