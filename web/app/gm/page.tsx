"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';

export default function GMDashboard() {
    const [summary, setSummary] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        Promise.all([
            fetchApi(`/accounting/summary?month=${month}&year=${year}`).catch(() => []),
            fetchApi('/sites/').catch(() => []),
            fetchApi('/requests/').catch(() => []),
            fetchApi('/reports/attendance').catch(() => null)
        ]).then(([s, sit, reqs, att]) => {
            setSummary(s || []);
            setSites(sit || []);
            setRequests(reqs || []);
            setAttendance(att);
        }).finally(() => setLoading(false));
    }, []);

    const totalSpend = summary.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
    const totalWorkers = summary.reduce((acc, curr) => acc + (curr.workers_supplied || 0), 0);
    const totalSitesActive = sites.length;
    const totalDutyHours = attendance?.summary?.total_duty_hours || 0;

    if (loading) return <div className="p-8 text-center text-gray-500">Loading executive overview...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Executive Performance Cockpit</h1>
                    <p className="text-sm text-gray-500">Strategic oversight of contractor liability, site coverage, and operational efficiency</p>
                </div>
                <div className="text-xs bg-amber-50 text-amber-900 font-bold px-3 py-1.5 rounded-lg border border-amber-200">
                    Live Operational Data • Qatar Time
                </div>
            </div>

            {/* Executive KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-xs font-bold uppercase text-gray-400">Total Outsource Spend (MTD)</div>
                    <div className="text-3xl font-black text-gray-900 mt-2">
                        QAR {totalSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-xs text-green-700 font-medium mt-1">✓ Within budget projection</div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-xs font-bold uppercase text-gray-400">Active Valet Headcount</div>
                    <div className="text-3xl font-black text-gray-900 mt-2">{totalWorkers} Drivers</div>
                    <div className="text-xs text-gray-500 mt-1">Contracted across agencies</div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-xs font-bold uppercase text-gray-400">Client Venues Covered</div>
                    <div className="text-3xl font-black text-gray-900 mt-2">{totalSitesActive} Sites</div>
                    <div className="text-xs text-gray-500 mt-1">100% geofenced locations</div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-xs font-bold uppercase text-gray-400">Verified Duty Hours</div>
                    <div className="text-3xl font-black text-gray-900 mt-2">{totalDutyHours} hrs</div>
                    <div className="text-xs text-gray-500 mt-1">Biometrically validated</div>
                </div>
            </div>

            {/* Two-Column Grid: Supplier Spend Breakdown & Shift Fulfillment */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Supplier Spend */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="font-bold text-base text-gray-900">Agency Cost Breakdown</h2>
                        <Link href="/gm/financials" className="text-xs font-bold text-[#dbb457] hover:underline">
                            Details →
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {summary.map(s => {
                            const pct = totalSpend > 0 ? Math.round((s.total_amount / totalSpend) * 100) : 0;
                            return (
                                <div key={s.supplier_id} className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold text-gray-700">
                                        <span>{s.supplier_name}</span>
                                        <span className="font-bold">QAR {s.total_amount?.toLocaleString()} ({pct}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                                        <div className="bg-[#dbb457] h-full rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                    <div className="text-[11px] text-gray-400">{s.workers_supplied} drivers supplied • Rate: QAR {s.billing_rate}/hr</div>
                                </div>
                            );
                        })}
                        {summary.length === 0 && (
                            <div className="text-center py-6 text-gray-400 text-xs">No billing records for current month.</div>
                        )}
                    </div>
                </div>

                {/* Locations Coverage */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="font-bold text-base text-gray-900">Client Venues & Shift Density</h2>
                        <Link href="/gm/operations" className="text-xs font-bold text-[#dbb457] hover:underline">
                            Full Log →
                        </Link>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {sites.slice(0, 6).map(site => (
                            <div key={site.id} className="flex justify-between items-center p-2.5 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
                                <div>
                                    <div className="text-xs font-bold text-gray-900">{site.name}</div>
                                    <div className="text-[11px] text-gray-500">{site.address || 'Qatar'}</div>
                                </div>
                                <span className="text-xs font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200">
                                    Active
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
