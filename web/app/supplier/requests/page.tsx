"use client";
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { calendarDate } from '@/lib/time';
import RequestActionButton from '@/components/supplier/RequestActionButton';
import { useEffect, useState, useCallback } from 'react';
import { fetchApi, tryFetch } from '@/lib/api';
import LoadErrorBar from '@/components/ui/LoadErrorBar';
import StatusBadge from '@/components/ui/StatusBadge';

export default function SupplierRequests() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const loadData = useCallback(() => {
        tryFetch('/requests/supplier', setLoadError)
            .then(data => {
                // A failed refresh keeps the requests already on screen
                if (Array.isArray(data)) {
                    setRequests(data);
                    setLoadError('');
                }
            })
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

    if (loading) return <DashboardSkeleton />;

    const totalDrivers = requests.reduce((acc, r) => acc + (r.requested_quantity || r.total_required_workers || 0), 0);
    const totalLocations = new Set(requests.map(r => r.site_id).filter(Boolean)).size;

    return (
        <div className="space-y-6">
            <LoadErrorBar message={loadError} onRetry={loadData} />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="mv-eyebrow basis-full mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#a8842f]"><span className="h-px w-6 bg-[#dbb457]" />Supplier Agency</div>
                    <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight text-[#1a1a1a]">Incoming Shift Requests</h1>
                    <p className="text-sm text-[#1a1a1a]/55">Review manpower requests routed to your agency with location name, manager name, and required quotas</p>
                </div>
                <div className="text-xs bg-amber-50 text-amber-800 font-bold px-3 py-1.5 rounded-full border border-amber-200">
                    {totalDrivers} Total Drivers across {totalLocations} Venues
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08] overflow-hidden">
                {/* Mobile Cards View (< md screens) */}
                <div className="md:hidden divide-y divide-[#1a1a1a]/[0.05] p-3 space-y-3">
                    {requests.map((r) => (
                        <div key={r.id} className="bg-gray-50/70 p-4 rounded-2xl border border-gray-200/80 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[#1a1a1a] bg-white px-2.5 py-1 rounded-lg border border-[#1a1a1a]/[0.08] shadow-[0_1px_2px_rgb(26_26_26/0.04)]">
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

                            <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-lg border border-[#1a1a1a]/[0.05] font-medium">
                                <div>
                                    <span className="text-[10px] text-[#1a1a1a]/40 block uppercase font-bold">Shift Date</span>
                                    <span className="text-[#1a1a1a]/85 font-semibold">
                                        {r.required_date ? calendarDate(r.required_date) : '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-[#1a1a1a]/40 block uppercase font-bold">Window</span>
                                    <span className="text-[#1a1a1a]/85 font-mono">
                                        {r.start_time} - {r.end_time}
                                    </span>
                                </div>
                                <div className="col-span-2 flex justify-between items-center pt-1 border-t border-[#1a1a1a]/[0.05]">
                                    <span className="text-[10px] text-[#1a1a1a]/55 uppercase font-bold">Your Agency Quota:</span>
                                    <span className="text-[#a8842f] font-bold">{r.requested_quantity || r.total_required_workers} Drivers</span>
                                </div>
                            </div>

                            <RequestActionButton request={r} block />
                        </div>
                    ))}
                    {requests.length === 0 && (
                        <div className="p-8 text-center text-xs text-[#1a1a1a]/40">
                            No incoming shift requests found.
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
                                <th className="px-5 py-3 text-left">Shift Window</th>
                                <th className="px-5 py-3 text-left">Agency Quota</th>
                                <th className="px-5 py-3 text-left">Status</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a1a1a]/[0.06] bg-white">
                            {requests.map((r) => (
                                <tr key={r.id} className="hover:bg-[#f6f4ef]/60 transition-colors">
                                    <td className="px-5 py-4 font-bold text-[#1a1a1a]">#{r.id}</td>
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-[#1a1a1a]">{r.site_name || `Location #${r.site_id}`}</div>
                                        {r.site_address && <div className="text-xs text-[#1a1a1a]/40">{r.site_address}</div>}
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
