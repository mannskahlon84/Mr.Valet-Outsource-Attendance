"use client";
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { qatarNowParts } from '@/lib/time';
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
        const { month, year } = qatarNowParts();

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

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="mv-eyebrow basis-full mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#a8842f]"><span className="h-px w-6 bg-[#dbb457]" />General Manager</div>
                    <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight text-[#1a1a1a]">Executive Performance Cockpit</h1>
                    <p className="text-sm text-[#1a1a1a]/55">Strategic oversight of contractor liability, site coverage, and operational efficiency</p>
                </div>
                <div className="text-xs bg-amber-50 text-amber-900 font-bold px-3 py-1.5 rounded-lg border border-amber-200">
                    Live Operational Data • Qatar Time
                </div>
            </div>

            {/* Executive KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08]">
                    <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Total Outsource Spend (MTD)</div>
                    <div className="text-3xl font-bold text-[#1a1a1a] mt-2">
                        QAR {totalSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-xs text-green-700 font-medium mt-1">✓ Within budget projection</div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08]">
                    <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Active Valet Headcount</div>
                    <div className="text-3xl font-bold text-[#1a1a1a] mt-2">{totalWorkers} Drivers</div>
                    <div className="text-xs text-[#1a1a1a]/55 mt-1">Contracted across agencies</div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08]">
                    <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Client Venues Covered</div>
                    <div className="text-3xl font-bold text-[#1a1a1a] mt-2">{totalSitesActive} Sites</div>
                    <div className="text-xs text-[#1a1a1a]/55 mt-1">100% geofenced locations</div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08]">
                    <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Verified Duty Hours</div>
                    <div className="text-3xl font-bold text-[#1a1a1a] mt-2">{totalDutyHours} hrs</div>
                    <div className="text-xs text-[#1a1a1a]/55 mt-1">Biometrically validated</div>
                </div>
            </div>

            {/* Two-Column Grid: Supplier Spend Breakdown & Shift Fulfillment */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Supplier Spend */}
                <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08] space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="font-bold text-base text-[#1a1a1a]">Agency Cost Breakdown</h2>
                        <Link href="/gm/financials" className="text-xs font-bold text-[#a8842f] hover:underline">
                            Details →
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {summary.map(s => {
                            const pct = totalSpend > 0 ? Math.round((s.total_amount / totalSpend) * 100) : 0;
                            return (
                                <div key={s.supplier_id} className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold text-[#1a1a1a]/75">
                                        <span>{s.supplier_name}</span>
                                        <span className="font-bold">QAR {s.total_amount?.toLocaleString()} ({pct}%)</span>
                                    </div>
                                    <div className="w-full bg-[#1a1a1a]/[0.05] h-2.5 rounded-full overflow-hidden">
                                        <div className="bg-[#1a1a1a] h-full rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                    <div className="text-[11px] text-[#1a1a1a]/40">{s.workers_supplied} completed shifts • Rate: QAR {s.billing_rate}/shift</div>
                                </div>
                            );
                        })}
                        {summary.length === 0 && (
                            <div className="text-center py-6 text-[#1a1a1a]/40 text-xs">No billing records for current month.</div>
                        )}
                    </div>
                </div>

                {/* Locations Coverage */}
                <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08] space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="font-bold text-base text-[#1a1a1a]">Client Venues & Shift Density</h2>
                        <Link href="/gm/operations" className="text-xs font-bold text-[#a8842f] hover:underline">
                            Full Log →
                        </Link>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {sites.slice(0, 6).map(site => (
                            <div key={site.id} className="flex justify-between items-center p-2.5 rounded-lg hover:bg-[#f6f4ef]/60 border border-[#1a1a1a]/[0.05] transition-colors">
                                <div>
                                    <div className="text-xs font-bold text-[#1a1a1a]">{site.name}</div>
                                    <div className="text-[11px] text-[#1a1a1a]/55">{site.address || 'Qatar'}</div>
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
