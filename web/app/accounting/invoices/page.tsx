"use client";
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { calendarMonth } from '@/lib/time';
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import ExportButtons from '@/components/ui/ExportButtons';

export default function AccountingInvoices() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = () => {
        Promise.all([
            fetchApi('/accounting/invoices').catch(() => []),
            fetchApi('/suppliers/').catch(() => [])
        ]).then(([invs, sups]) => {
            setInvoices(invs || []);
            setSuppliers(sups || []);
        }).finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, []);

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

    const handleVoidInvoice = async (invoiceId: number, invoiceNum: string) => {
        if (!confirm(`Are you sure you want to VOID invoice ${invoiceNum}? This audit event will be permanently recorded.`)) return;
        try {
            await fetchApi(`/accounting/invoices/${invoiceId}/void`, { method: 'POST' });
            alert(`Invoice ${invoiceNum} has been voided.`);
            loadData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="mv-eyebrow basis-full mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#a8842f]"><span className="h-px w-6 bg-[#dbb457]" />Accounting</div>
                    <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight text-[#1a1a1a]">Generated Monthly Invoices</h1>
                    <p className="text-sm text-[#1a1a1a]/55">Official generated contractor statements, PDF exports, and audit controls</p>
                </div>
                <ExportButtons base="/accounting/invoices/export" filename="invoices" />
            </div>

            <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#1a1a1a]/[0.06] text-sm">
                        <thead className="bg-[#f6f4ef]/60 text-[#1a1a1a]/55 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-5 py-3 text-left">Invoice #</th>
                                <th className="px-5 py-3 text-left">Agency</th>
                                <th className="px-5 py-3 text-left">Billing Month</th>
                                <th className="px-5 py-3 text-left">Drivers</th>
                                <th className="px-5 py-3 text-left">Rate</th>
                                <th className="px-5 py-3 text-left">Total Payable</th>
                                <th className="px-5 py-3 text-left">Status</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a1a1a]/[0.06] bg-white">
                            {invoices.map((inv) => {
                                const sup = suppliers.find(s => s.id === inv.supplier_id);
                                const isVoid = inv.status === 'VOIDED';

                                return (
                                    <tr key={inv.id} className={`hover:bg-[#f6f4ef]/60 transition-colors ${isVoid ? 'opacity-60 bg-gray-50/50' : ''}`}>
                                        <td className="px-5 py-4 font-mono font-bold text-[#1a1a1a]">{inv.invoice_number}</td>
                                        <td className="px-5 py-4 font-semibold text-[#1a1a1a]/85">{sup?.name || `Agency #${inv.supplier_id}`}</td>
                                        <td className="px-5 py-4 text-[#1a1a1a]/65">
                                            {inv.billing_month ? calendarMonth(inv.billing_month) : '-'}
                                        </td>
                                        <td className="px-5 py-4 font-bold text-[#1a1a1a]/85">{inv.workers_supplied_quantity} Drivers</td>
                                        <td className="px-5 py-4 text-[#1a1a1a]/65">QAR {inv.rate_per_worker?.toFixed(2)}</td>
                                        <td className="px-5 py-4 font-bold text-[#1a1a1a]">
                                            QAR {inv.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                isVoid ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                            }`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right space-x-2">
                                            <button 
                                                onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)}
                                                className="text-[#a8842f] hover:text-[#1a1a1a] font-bold text-xs border border-amber-200 px-3 py-1 rounded-lg hover:bg-amber-50 inline-block transition-colors"
                                            >
                                                PDF 
                                            </button>
                                            {!isVoid && (
                                                <button 
                                                    onClick={() => handleVoidInvoice(inv.id, inv.invoice_number)}
                                                    className="text-red-600 hover:text-red-800 font-bold text-xs border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 inline-block transition-colors"
                                                >
                                                    Void
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {invoices.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-5 py-8 text-center text-[#1a1a1a]/40">
                                        No invoices generated yet. Go to "Billing Summary" to generate one.
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
