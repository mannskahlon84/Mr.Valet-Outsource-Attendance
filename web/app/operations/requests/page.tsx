"use client";
import { calendarDate } from '@/lib/time';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi, tryFetch } from '@/lib/api';
import LoadErrorBar from '@/components/ui/LoadErrorBar';
import StatusBadge from '@/components/ui/StatusBadge';

export default function OperationsRequests() {
    const [requests, setRequests] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const loadData = () => {
        let failure = '';
        const onError = (m: string) => { failure = m; };
        Promise.all([
            tryFetch('/requests/', onError),
            tryFetch('/suppliers/')
        ])
            .then(([reqData, supData]) => {
                // A failed refresh keeps the requests already on screen
                if (Array.isArray(reqData)) setRequests(reqData);
                if (Array.isArray(supData)) setSuppliers(supData);
                setLoadError(failure);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
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

    const getSupplierNames = (r: any): string[] => {
        // 1. Direct comma-separated supplier_names string
        if (r.supplier_names && r.supplier_names !== 'N/A' && r.supplier_names.trim() !== '') {
            return r.supplier_names.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
        // 2. From routes array
        if (Array.isArray(r.routes) && r.routes.length > 0) {
            const names = r.routes.map((rt: any) => {
                const found = suppliers.find(s => s.id === Number(rt.supplier_id));
                return found?.name || `Supplier #${rt.supplier_id}`;
            }).filter(Boolean);
            if (names.length > 0) return Array.from(new Set(names));
        }
        // 3. Fallback to singular supplier_name
        if (r.supplier_name && r.supplier_name !== 'N/A') {
            return [r.supplier_name];
        }
        // 4. Fallback to supplier_id
        if (r.supplier_id) {
            const found = suppliers.find(s => s.id === Number(r.supplier_id));
            if (found) return [found.name];
        }
        // 5. Default fallback to active agency
        return ['Kanan'];
    };

    const renderSupplierBadges = (r: any) => {
        const names = getSupplierNames(r);
        return (
            <div className="flex flex-wrap gap-1.5 items-center">
                {names.map((name, idx) => (
                    <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200/90 shadow-2xs"
                    >
                        <span>{name}</span>
                    </span>
                ))}
            </div>
        );
    };

    const filtered = requests.filter(r => {
        if (filterStatus === 'ALL') return true;
        return r.status === filterStatus;
    });

    return (
        <div className="space-y-6">
            <LoadErrorBar message={loadError} onRetry={loadData} />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="mv-eyebrow basis-full mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#a8842f]"><span className="h-px w-6 bg-[#dbb457]" />Operations</div>
                    <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight text-[#1a1a1a]">Shift Requests</h1>
                    <p className="text-sm text-[#1a1a1a]/55">Track allocations, review supplier confirmations, and manage shifts</p>
                </div>
                <Link 
                    href="/operations/requests/new" 
                    className="bg-[#1a1a1a] hover:bg-[#dbb457] hover:text-[#1a1a1a] text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow transition-colors"
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
                                ? 'bg-[#1a1a1a] text-white' 
                                : 'bg-white text-[#1a1a1a]/65 hover:bg-[#1a1a1a]/[0.05] border border-[#1a1a1a]/[0.08]'
                        }`}
                    >
                        {st.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Table & Mobile Cards */}
            <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08] overflow-hidden">
                {/* Mobile Cards View (< md screens) */}
                <div className="md:hidden divide-y divide-[#1a1a1a]/[0.05] p-3 space-y-3">
                    {filtered.map((r) => (
                        <div key={r.id} className="bg-gray-50/70 p-4 rounded-2xl border border-gray-200/80 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[#1a1a1a] bg-white px-2.5 py-1 rounded-lg border border-[#1a1a1a]/[0.08] shadow-[0_1px_2px_rgb(26_26_26/0.04)]">
                                    Req #{r.id}
                                </span>
                                <StatusBadge status={r.status} />
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-[#1a1a1a]">{r.site_name || `Location #${r.site_id}`}</h3>
                                {r.site_address && (
                                    <p className="text-xs text-[#1a1a1a]/55 truncate">{r.site_address}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-lg border border-[#1a1a1a]/[0.05] font-medium">
                                <div>
                                    <span className="text-[10px] text-[#1a1a1a]/40 block uppercase font-bold">Date</span>
                                    <span className="text-[#1a1a1a]/85 font-semibold">
                                        {r.required_date ? calendarDate(r.required_date) : '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-[#1a1a1a]/40 block uppercase font-bold">Shift</span>
                                    <span className="text-[#1a1a1a]/85 font-mono">
                                        {r.start_time} - {r.end_time}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-[#1a1a1a]/40 block uppercase font-bold">Headcount</span>
                                    <span className="text-[#a8842f] font-bold">{r.total_required_workers} Drivers</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-[#1a1a1a]/40 block uppercase font-bold">Role</span>
                                    <span className="text-[#1a1a1a]/65">{r.skill_category || 'Valet Driver'}</span>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <span className="text-[10px] text-[#1a1a1a]/40 block uppercase font-bold mb-1">Supplier(s)</span>
                                    {renderSupplierBadges(r)}
                                </div>
                            </div>

                            <Link 
                                href={`/operations/requests/${r.id}`}
                                className="block text-center w-full text-xs font-bold bg-[#1a1a1a] text-white py-2.5 rounded-lg hover:bg-[#dbb457] hover:text-[#1a1a1a] transition-colors shadow-[0_1px_2px_rgb(26_26_26/0.04)]"
                            >
                                Review Bids & Manage Shift →
                            </Link>
                        </div>
                    ))}
                    {filtered.length === 0 && !loading && (
                        <div className="p-8 text-center text-xs text-[#1a1a1a]/40">
                            No requests found matching this filter.
                        </div>
                    )}
                </div>

                {/* Desktop Table (>= md screens) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#1a1a1a]/[0.06] text-sm">
                        <thead className="bg-[#f6f4ef]/60 text-[#1a1a1a]/55 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-5 py-3 text-left">ID</th>
                                <th className="px-5 py-3 text-left">Location</th>
                                <th className="px-5 py-3 text-left">Date</th>
                                <th className="px-5 py-3 text-left">Shift Window</th>
                                <th className="px-5 py-3 text-left">Required Headcount</th>
                                <th className="px-5 py-3 text-left">Skill Category</th>
                                <th className="px-5 py-3 text-left">Supplier(s)</th>
                                <th className="px-5 py-3 text-left">Status</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a1a1a]/[0.06] bg-white">
                            {filtered.map((r) => (
                                <tr key={r.id} className="hover:bg-[#f6f4ef]/60 transition-colors">
                                    <td className="px-5 py-4 font-bold text-[#1a1a1a]">#{r.id}</td>
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-[#1a1a1a] text-sm">{r.site_name || `Location #${r.site_id}`}</div>
                                        {r.site_address && (
                                            <div className="text-xs text-[#1a1a1a]/40 truncate max-w-[200px]">{r.site_address}</div>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-[#1a1a1a]/75 font-medium">
                                        {r.required_date ? calendarDate(r.required_date) : '-'}
                                    </td>
                                    <td className="px-5 py-4 text-[#1a1a1a]/65 font-mono text-xs">
                                        {r.start_time} - {r.end_time}
                                    </td>
                                    <td className="px-5 py-4 font-bold text-[#1a1a1a]">
                                        {r.total_required_workers} Drivers
                                    </td>
                                    <td className="px-5 py-4 text-[#1a1a1a]/55">
                                        {r.skill_category || 'Valet Driver'}
                                    </td>
                                    <td className="px-5 py-4">
                                        {renderSupplierBadges(r)}
                                    </td>
                                    <td className="px-5 py-4">
                                        <StatusBadge status={r.status} />
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <Link 
                                            href={`/operations/requests/${r.id}`}
                                            className="text-[#a8842f] hover:text-[#1a1a1a] font-bold text-xs border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-50 inline-block transition-colors"
                                        >
                                            Review Bids & Chat →
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={9} className="px-5 py-8 text-center text-[#1a1a1a]/40">
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
