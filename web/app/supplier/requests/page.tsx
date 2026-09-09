"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';

export default function SupplierRequests() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchApi('/requests/supplier')
            .catch(() => fetchApi('/requests/').catch(() => []))
            .then(data => setRequests(data || []))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading incoming requests...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-black text-gray-900">Incoming Shift Requests</h1>
                <p className="text-sm text-gray-500">Review manpower requests routed to your agency by Operations Managers</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Mobile Cards View (< md screens) */}
                <div className="md:hidden divide-y divide-gray-100 p-3 space-y-3">
                    {requests.map((r) => (
                        <div key={r.id} className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-gray-900 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-sm">
                                    Req #{r.id}
                                </span>
                                <StatusBadge status={r.status} />
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-lg border border-gray-100 font-medium">
                                <div>
                                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Shift Date</span>
                                    <span className="text-gray-800 font-semibold">
                                        {r.required_date ? new Date(r.required_date).toLocaleDateString() : '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Window</span>
                                    <span className="text-gray-800 font-mono">
                                        {r.start_time} - {r.end_time}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Quota</span>
                                    <span className="text-[#dbb457] font-black">{r.total_required_workers} Drivers</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Category</span>
                                    <span className="text-gray-600">{r.skill_category || 'Valet Driver'}</span>
                                </div>
                            </div>

                            <Link 
                                href={`/supplier/requests/${r.id}`}
                                className="block text-center w-full text-xs font-bold bg-[#dbb457] text-white py-2.5 rounded-lg hover:bg-[#c29d45] transition-colors shadow-sm"
                            >
                                Respond & Assign Drivers →
                            </Link>
                        </div>
                    ))}
                    {requests.length === 0 && (
                        <div className="p-8 text-center text-xs text-gray-400">
                            No incoming shift requests found.
                        </div>
                    )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-5 py-3 text-left">Req ID</th>
                                <th className="px-5 py-3 text-left">Date</th>
                                <th className="px-5 py-3 text-left">Shift Window</th>
                                <th className="px-5 py-3 text-left">Required Headcount</th>
                                <th className="px-5 py-3 text-left">Skill</th>
                                <th className="px-5 py-3 text-left">Status</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {requests.map((r) => (
                                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-5 py-4 font-bold text-gray-900">#{r.id}</td>
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
                                    <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                                        No incoming shift requests found.
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
