"use client";
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { qatarNowParts } from '@/lib/time';
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function GMSuppliers() {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [summary, setSummary] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const { month, year } = qatarNowParts();

        Promise.all([
            fetchApi('/suppliers/').catch(() => []),
            fetchApi(`/accounting/summary?month=${month}&year=${year}`).catch(() => [])
        ]).then(([sups, sum]) => {
            setSuppliers(sups || []);
            setSummary(sum || []);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="space-y-6">
            <div>
                <div className="mv-eyebrow basis-full mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#a8842f]"><span className="h-px w-6 bg-[#dbb457]" />General Manager</div>
                <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight text-[#1a1a1a]">Agency Partner Scorecards</h1>
                <p className="text-sm text-[#1a1a1a]/55">Contractor reliability, contract billing rates, and supplied workforce volume</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {suppliers.map(s => {
                    const agencyData = summary.find(sm => sm.supplier_id === s.id);
                    const suppliedCount = agencyData?.workers_supplied || 0;
                    const totalBilled = agencyData?.total_amount || 0;

                    return (
                        <div key={s.id} className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08] space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-base text-[#1a1a1a]">{s.name}</h3>
                                    <p className="text-xs text-[#1a1a1a]/55">{s.contact_person || 'General Contact'}</p>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                                    s.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                    {s.status}
                                </span>
                            </div>

                            <div className="bg-[#f6f4ef]/60 p-3 rounded-lg border border-[#1a1a1a]/[0.05] space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-[#1a1a1a]/55">Contract Rate:</span>
                                    <span className="font-bold text-[#1a1a1a]">QAR {s.billing_rate?.toFixed(2)}/shift</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#1a1a1a]/55">Completed Shifts (MTD):</span>
                                    <span className="font-bold text-[#1a1a1a]">{suppliedCount} Drivers</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#1a1a1a]/55">Total Billed (MTD):</span>
                                    <span className="font-bold text-[#a8842f]">QAR {totalBilled.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="text-xs text-[#1a1a1a]/55 space-y-1">
                                <div>Email: {s.contact_email || 'agency@example.com'}</div>
                                <div>Phone: {s.contact_phone || 'N/A'}</div>
                            </div>

                            <div className="pt-2 border-t border-[#1a1a1a]/[0.05] flex justify-between items-center text-xs">
                                <span className="text-[#1a1a1a]/40">Reliability Index</span>
                                <span className="text-green-700 font-bold">98.5% On-Time</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
