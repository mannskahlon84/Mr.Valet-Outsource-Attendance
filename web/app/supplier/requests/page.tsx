"use client";
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';

export default function SupplierRequests() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(() => {
        fetchApi('/requests/supplier')
            .catch(() => fetchApi('/requests/').catch(() => []))
            .then(data => setRequests(data || []))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        loadData();
        const handleSync = () => loadData();
        window.addEventListener('portal_data_updated', handleSync);
        window.addEventListener('focus', handleSync);
        return () => {
            window.removeEventListener('portal_data_updated', handleSync);
            window.removeEventListener('focus', handleSync);
        };
    }, [loadData]);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading incoming requests...</div>;

    const totalDrivers = requests.reduce((acc, r) => acc + (r.requested_quantity || r.total_required_workers || 0), 0);
    const totalLocations = new Set(requests.map(r => r.site_id).filter(Boolean)).size;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Incoming Shift Requests</h1>
                    <p className="text-sm text-gray-500">Review manpower requests routed to your agency with location name, manager name, and required quotas</p>
                </div>
                <div className="text-xs bg-amber-50 text-amber-800 font-bold px-3 py-1.5 rounded-full border border-amber-200">
                    {totalDrivers} Total Drivers across {totalLocations} Venues
                </div>
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
                                <div className="col-span-2 flex justify-between items-center pt-1 border-t border-gray-100">
                                    <span className="text-[10px] text-gray-500 uppercase font-bold">Your Agency Quota:</span>
                                    <span className="text-[#dbb457] font-black">{r.requested_quantity || r.total_required_workers} Drivers</span>
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
                                <th className="px-5 py-3 text-left">Location / Venue</th>
                                <th className="px-5 py-3 text-left">Ops Manager</th>
                                <th className="px-5 py-3 text-left">Shift Window</th>
                                <th className="px-5 py-3 text-left">Agency Quota</th>
                                <th className="px-5 py-3 text-left">Status</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {requests.map((r) => (
                                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-5 py-4 font-bold text-gray-900">#{r.id}</td>
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-gray-900">{r.site_name || `Location #${r.site_id}`}</div>
                                        {r.site_address && <div className="text-xs text-gray-400">{r.site_address}</div>}
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
