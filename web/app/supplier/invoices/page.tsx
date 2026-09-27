"use client";
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { calendarMonth } from '@/lib/time';
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
            const res = await fetchApi(`/accounting/invoices/${invoiceId}/download`, {}, true);
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

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="space-y-6">
            <div>
                <div className="mv-eyebrow basis-full mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#a8842f]"><span className="h-px w-6 bg-[#dbb457]" />Supplier Agency</div>
                <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight text-[#1a1a1a]">Invoices & Billing</h1>
                <p className="text-sm text-[#1a1a1a]/55">Monthly billing statements and verified subcontractor payouts</p>
            </div>

            <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08] overflow-hidden">
                {/* Mobile Cards View (< md screens) */}
                <div className="md:hidden divide-y divide-[#1a1a1a]/[0.05] p-3 space-y-3">
                    {invoices.map((inv) => (
                        <div key={inv.id} className="bg-gray-50/70 p-4 rounded-2xl border border-gray-200/80 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-xs bg-white px-2.5 py-1 rounded-lg border border-[#1a1a1a]/[0.08] text-[#1a1a1a] shadow-[0_1px_2px_rgb(26_26_26/0.04)]">
                                    {inv.invoice_number}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                    inv.status === 'GENERATED' ? 'bg-green-100 text-green-800' : 'bg-[#1a1a1a]/[0.05] text-[#1a1a1a]/65'
                                }`}>
                                    {inv.status}
                                </span>
                            </div>

                            <div className="flex justify-between items-baseline">
                                <div>
                                    <span className="text-[10px] text-[#1a1a1a]/40 block uppercase font-bold">Billing Month</span>
                                    <span className="text-sm font-bold text-[#1a1a1a]">
                                        {inv.billing_month ? calendarMonth(inv.billing_month) : '-'}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-[#1a1a1a]/40 block uppercase font-bold">Total Payable</span>
                                    <span className="text-base font-bold text-[#a8842f]">
                                        QAR {inv.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div className="text-xs text-[#1a1a1a]/55 bg-white p-2.5 rounded-lg border border-[#1a1a1a]/[0.05] flex justify-between">
                                <span>Drivers: <strong className="text-[#1a1a1a]/85">{inv.workers_supplied_quantity}</strong></span>
                                <span>Rate: <strong className="text-[#1a1a1a]/85">QAR {inv.rate_per_worker?.toFixed(2)}</strong></span>
                            </div>

                            <button 
                                onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)}
                                className="w-full text-center text-xs font-bold bg-[#1a1a1a] text-white py-2.5 rounded-lg hover:bg-[#dbb457] hover:text-[#1a1a1a] transition-colors shadow-[0_1px_2px_rgb(26_26_26/0.04)] flex items-center justify-center gap-1.5"
                            > Download Statement PDF
                            </button>
                        </div>
                    ))}
                    {invoices.length === 0 && (
                        <div className="p-8 text-center text-xs text-[#1a1a1a]/40">
                            No invoices generated for your agency yet.
                        </div>
                    )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#1a1a1a]/[0.06] text-sm">
                        <thead className="bg-[#f6f4ef]/60 text-[#1a1a1a]/55 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-5 py-3 text-left">Invoice #</th>
                                <th className="px-5 py-3 text-left">Billing Month</th>
                                <th className="px-5 py-3 text-left">Completed Shifts</th>
                                <th className="px-5 py-3 text-left">Rate</th>
                                <th className="px-5 py-3 text-left">Total Payable</th>
                                <th className="px-5 py-3 text-left">Status</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a1a1a]/[0.06] bg-white">
                            {invoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-[#f6f4ef]/60 transition-colors">
                                    <td className="px-5 py-4 font-mono font-bold text-[#1a1a1a]">{inv.invoice_number}</td>
                                    <td className="px-5 py-4 text-[#1a1a1a]/75">
                                        {inv.billing_month ? calendarMonth(inv.billing_month) : '-'}
                                    </td>
                                    <td className="px-5 py-4 font-bold text-[#1a1a1a]/85">{inv.workers_supplied_quantity} Drivers</td>
                                    <td className="px-5 py-4 text-[#1a1a1a]/65">QAR {inv.rate_per_worker?.toFixed(2)}</td>
                                    <td className="px-5 py-4 font-bold text-[#1a1a1a]">
                                        QAR {inv.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                            inv.status === 'GENERATED' ? 'bg-green-100 text-green-800' : 'bg-[#1a1a1a]/[0.05] text-[#1a1a1a]/65'
                                        }`}>
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <button 
                                            onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)}
                                            className="text-[#a8842f] hover:text-[#1a1a1a] font-bold text-xs border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-50 inline-block transition-colors"
                                        >
                                            Download PDF 
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {invoices.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-8 text-center text-[#1a1a1a]/40">
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
