"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';

export default function AccountingSummary() {
    const [summary, setSummary] = useState<any[]>([]);
    const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const loadData = () => {
        setLoading(true);
        fetchApi(`/accounting/summary?month=${month}&year=${year}`)
            .then(data => setSummary(data || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, [month, year]);

    const handleGenerateInvoice = async (supplierId: number, supplierName: string) => {
        if (!confirm(`Generate official monthly invoice for ${supplierName} for ${month}/${year}?`)) return;
        setActionLoading(true);
        try {
            await fetchApi('/accounting/invoices', {
                method: 'POST',
                body: JSON.stringify({
                    supplier_id: supplierId,
                    month: parseInt(month),
                    year: parseInt(year)
                })
            });
            alert("Invoice generated successfully! View under 'Monthly Invoices'.");
            loadData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const totalPayable = summary.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
    const totalWorkers = summary.reduce((acc, curr) => acc + (curr.workers_supplied || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Contractor Billing Summary</h1>
                    <p className="text-sm text-gray-500">Review monthly verified manpower supplied and generate supplier invoices</p>
                </div>

                {/* Period Selectors */}
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
                    <select 
                        value={month} 
                        onChange={e => setMonth(e.target.value)}
                        className="text-xs font-bold text-gray-700 bg-transparent p-1 focus:outline-none"
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>Month {m}</option>
                        ))}
                    </select>
                    <span className="text-gray-300">/</span>
                    <select 
                        value={year} 
                        onChange={e => setYear(e.target.value)}
                        className="text-xs font-bold text-gray-700 bg-transparent p-1 focus:outline-none"
                    >
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-xs font-bold uppercase text-gray-400">Total Outsource Payables</div>
                    <div className="text-3xl font-black text-gray-900 mt-2">
                        QAR {totalPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Period: {month}/{year}</div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-xs font-bold uppercase text-gray-400">Total Confirmed Drivers</div>
                    <div className="text-3xl font-black text-gray-900 mt-2">{totalWorkers} Drivers</div>
                    <div className="text-xs text-gray-500 mt-1">Across all agency contracts</div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-xs font-bold uppercase text-gray-400">Active Agencies Billed</div>
                    <div className="text-3xl font-black text-gray-900 mt-2">{summary.length} Agencies</div>
                    <div className="text-xs text-gray-500 mt-1">Ready for invoice generation</div>
                </div>
            </div>

            {/* Summary Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-5 py-3 text-left">Supplier Agency</th>
                                <th className="px-5 py-3 text-left">Drivers Supplied</th>
                                <th className="px-5 py-3 text-left">Agreed Rate</th>
                                <th className="px-5 py-3 text-left">Total Payables</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {summary.map((item) => (
                                <tr key={item.supplier_id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-5 py-4 font-bold text-gray-900">{item.supplier_name}</td>
                                    <td className="px-5 py-4 font-semibold text-gray-700">{item.workers_supplied} Drivers</td>
                                    <td className="px-5 py-4 text-gray-600 font-mono">QAR {item.billing_rate?.toFixed(2)}</td>
                                    <td className="px-5 py-4 font-black text-gray-900">
                                        QAR {item.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <button 
                                            disabled={actionLoading}
                                            onClick={() => handleGenerateInvoice(item.supplier_id, item.supplier_name)}
                                            className="bg-[#dbb457] hover:bg-[#c29d45] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow transition-colors disabled:opacity-50"
                                        >
                                            Generate Invoice
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {summary.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                                        No billable hours recorded for this period.
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
