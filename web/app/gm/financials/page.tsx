"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function GMFinancials() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetchApi('/accounting/invoices').catch(() => []),
            fetchApi('/suppliers/').catch(() => [])
        ]).then(([invs, sups]) => {
            setInvoices(invs || []);
            setSuppliers(sups || []);
        }).finally(() => setLoading(false));
    }, []);

    const handleDownloadPdf = async (invoiceId: number, invoiceNum: string) => {
        try {
            const res = await fetchApi(`/accounting/invoices/${invoiceId}/pdf`, {}, true);
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${invoiceNum}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert("Failed to download PDF invoice.");
        }
    };

    const totalInvoiced = invoices
        .filter(i => i.status !== 'VOIDED')
        .reduce((acc, curr) => acc + (curr.total_amount || 0), 0);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading financials...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Financial Liability & Invoices</h1>
                    <p className="text-sm text-gray-500">Consolidated contractor spend and approved billing statements</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm text-right">
                    <div className="text-[10px] font-bold uppercase text-gray-400">Total Valid Invoices</div>
                    <div className="text-lg font-black text-gray-900">QAR {totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-5 py-3 text-left">Invoice #</th>
                                <th className="px-5 py-3 text-left">Agency Partner</th>
                                <th className="px-5 py-3 text-left">Period</th>
                                <th className="px-5 py-3 text-left">Headcount</th>
                                <th className="px-5 py-3 text-left">Rate</th>
                                <th className="px-5 py-3 text-left">Amount (QAR)</th>
                                <th className="px-5 py-3 text-left">Status</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {invoices.map((inv) => {
                                const sup = suppliers.find(s => s.id === inv.supplier_id);
                                const isVoid = inv.status === 'VOIDED';

                                return (
                                    <tr key={inv.id} className={`hover:bg-gray-50 transition-colors ${isVoid ? 'opacity-60 bg-gray-50' : ''}`}>
                                        <td className="px-5 py-4 font-mono font-bold text-gray-900">{inv.invoice_number}</td>
                                        <td className="px-5 py-4 font-semibold text-gray-800">{sup?.name || `Agency #${inv.supplier_id}`}</td>
                                        <td className="px-5 py-4 text-gray-600">
                                            {inv.billing_month ? new Date(inv.billing_month).toLocaleDateString([], { month: 'long', year: 'numeric' }) : '-'}
                                        </td>
                                        <td className="px-5 py-4 font-bold text-gray-700">{inv.workers_supplied_quantity} Drivers</td>
                                        <td className="px-5 py-4 text-gray-600">QAR {inv.rate_per_worker?.toFixed(2)}</td>
                                        <td className="px-5 py-4 font-black text-gray-900">
                                            QAR {inv.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                                isVoid ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                            }`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button 
                                                onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)}
                                                className="text-[#dbb457] hover:text-[#c29d45] font-bold text-xs border border-amber-200 px-3 py-1 rounded-lg hover:bg-amber-50 inline-block transition-colors"
                                            >
                                                Download PDF ⬇
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {invoices.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-5 py-8 text-center text-gray-400">
                                        No invoices recorded in the system yet.
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
