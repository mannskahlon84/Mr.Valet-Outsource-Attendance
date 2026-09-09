"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function SupplierInvoices() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchApi('/accounting/invoices')
            .then(data => setInvoices(data || []))
            .catch(console.error)
            .finally(() => setLoading(false));
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

    if (loading) return <div className="p-8 text-center text-gray-500">Loading agency billing...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-black text-gray-900">Invoices & Billing</h1>
                <p className="text-sm text-gray-500">Monthly billing statements and verified subcontractor payouts</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Mobile Cards View (< md screens) */}
                <div className="md:hidden divide-y divide-gray-100 p-3 space-y-3">
                    {invoices.map((inv) => (
                        <div key={inv.id} className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-xs bg-white px-2.5 py-1 rounded-lg border border-gray-200 text-gray-900 shadow-sm">
                                    {inv.invoice_number}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                    inv.status === 'GENERATED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {inv.status}
                                </span>
                            </div>

                            <div className="flex justify-between items-baseline">
                                <div>
                                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Billing Month</span>
                                    <span className="text-sm font-black text-gray-900">
                                        {inv.billing_month ? new Date(inv.billing_month).toLocaleDateString([], { month: 'long', year: 'numeric' }) : '-'}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Total Payable</span>
                                    <span className="text-base font-black text-[#dbb457]">
                                        QAR {inv.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div className="text-xs text-gray-500 bg-white p-2.5 rounded-lg border border-gray-100 flex justify-between">
                                <span>Drivers: <strong className="text-gray-800">{inv.workers_supplied_quantity}</strong></span>
                                <span>Rate: <strong className="text-gray-800">QAR {inv.rate_per_worker?.toFixed(2)}</strong></span>
                            </div>

                            <button 
                                onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)}
                                className="w-full text-center text-xs font-bold bg-[#dbb457] text-white py-2.5 rounded-lg hover:bg-[#c29d45] transition-colors shadow-sm flex items-center justify-center gap-1.5"
                            >
                                <span>⬇</span> Download Statement PDF
                            </button>
                        </div>
                    ))}
                    {invoices.length === 0 && (
                        <div className="p-8 text-center text-xs text-gray-400">
                            No invoices generated for your agency yet.
                        </div>
                    )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-5 py-3 text-left">Invoice #</th>
                                <th className="px-5 py-3 text-left">Billing Month</th>
                                <th className="px-5 py-3 text-left">Drivers Supplied</th>
                                <th className="px-5 py-3 text-left">Rate</th>
                                <th className="px-5 py-3 text-left">Total Payable</th>
                                <th className="px-5 py-3 text-left">Status</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {invoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-5 py-4 font-mono font-bold text-gray-900">{inv.invoice_number}</td>
                                    <td className="px-5 py-4 text-gray-700">
                                        {inv.billing_month ? new Date(inv.billing_month).toLocaleDateString([], { month: 'long', year: 'numeric' }) : '-'}
                                    </td>
                                    <td className="px-5 py-4 font-bold text-gray-800">{inv.workers_supplied_quantity} Drivers</td>
                                    <td className="px-5 py-4 text-gray-600">QAR {inv.rate_per_worker?.toFixed(2)}</td>
                                    <td className="px-5 py-4 font-black text-gray-900">
                                        QAR {inv.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                            inv.status === 'GENERATED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <button 
                                            onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)}
                                            className="text-[#dbb457] hover:text-[#c29d45] font-bold text-xs border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-50 inline-block transition-colors"
                                        >
                                            Download PDF ⬇
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {invoices.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                                        No invoices generated for your agency yet.
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
