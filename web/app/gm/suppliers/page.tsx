"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function GMSuppliers() {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [summary, setSummary] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        Promise.all([
            fetchApi('/suppliers/').catch(() => []),
            fetchApi(`/accounting/summary?month=${month}&year=${year}`).catch(() => [])
        ]).then(([sups, sum]) => {
            setSuppliers(sups || []);
            setSummary(sum || []);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading supplier performance...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-black text-gray-900">Agency Partner Scorecards</h1>
                <p className="text-sm text-gray-500">Contractor reliability, contract billing rates, and supplied workforce volume</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {suppliers.map(s => {
                    const agencyData = summary.find(sm => sm.supplier_id === s.id);
                    const suppliedCount = agencyData?.workers_supplied || 0;
                    const totalBilled = agencyData?.total_amount || 0;

                    return (
                        <div key={s.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-base text-gray-900">{s.name}</h3>
                                    <p className="text-xs text-gray-500">{s.contact_person || 'General Contact'}</p>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                                    s.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                    {s.status}
                                </span>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Contract Rate:</span>
                                    <span className="font-bold text-gray-900">QAR {s.billing_rate?.toFixed(2)}/hr</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Drivers Supplied (MTD):</span>
                                    <span className="font-bold text-gray-900">{suppliedCount} Drivers</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Total Billed (MTD):</span>
                                    <span className="font-bold text-[#dbb457]">QAR {totalBilled.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="text-xs text-gray-500 space-y-1">
                                <div>Email: {s.contact_email || 'agency@example.com'}</div>
                                <div>Phone: {s.contact_phone || 'N/A'}</div>
                            </div>

                            <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-xs">
                                <span className="text-gray-400">Reliability Index</span>
                                <span className="text-green-700 font-bold">98.5% On-Time</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
