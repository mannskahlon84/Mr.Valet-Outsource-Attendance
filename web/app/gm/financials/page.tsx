"use client";
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { calendarMonth, qatarToday } from '@/lib/time';
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function GMFinancials() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [dailyData, setDailyData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'daily' | 'invoices'>('daily');
    const [selectedDate, setSelectedDate] = useState(qatarToday());
    const [loading, setLoading] = useState(true);

    const loadData = () => {
        setLoading(true);
        Promise.all([
            fetchApi('/accounting/invoices').catch(() => []),
            fetchApi('/suppliers/').catch(() => []),
            fetchApi(`/accounting/daily-breakdown?target_date=${selectedDate}`).catch(() => null)
        ]).then(([invs, sups, daily]) => {
            setInvoices(invs || []);
            setSuppliers(sups || []);
            setDailyData(daily);
        }).finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, [selectedDate]);

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

    const totalInvoiced = invoices
        .filter(i => i.status !== 'VOIDED')
        .reduce((acc, curr) => acc + (curr.total_amount || 0), 0);

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="mv-eyebrow basis-full mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#a8842f]"><span className="h-px w-6 bg-[#dbb457]" />General Manager</div>
                    <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight text-[#1a1a1a] flex items-center gap-2"> Financial Liability & Supplier Spend
                    </h1>
                    <p className="text-sm text-[#1a1a1a]/55">Executive tracking of daily outsource contractor headcount, payables, and historical invoices</p>
                </div>
                {activeTab === 'daily' ? (
                    <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-[#1a1a1a]/[0.08] shadow-[0_1px_2px_rgb(26_26_26/0.04)]">
                        <span className="text-xs font-bold uppercase text-[#1a1a1a]/40">Date:</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="text-xs font-bold text-[#1a1a1a]/85 bg-transparent focus:outline-none"
                        />
                    </div>
                ) : (
                    <div className="bg-white px-4 py-2 rounded-2xl border border-[#1a1a1a]/[0.08] shadow-[0_1px_2px_rgb(26_26_26/0.04)] text-right">
                        <div className="text-[10px] font-bold uppercase text-[#1a1a1a]/40">Total Valid Invoices</div>
                        <div className="text-lg font-bold text-[#1a1a1a]">QAR {totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </div>
                )}
            </div>

            {/* Tab Controls */}
            <div className="flex gap-4 border-b border-[#1a1a1a]/[0.08]">
                <button
                    onClick={() => setActiveTab('daily')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === 'daily' ? 'border-[#dbb457] text-[#a8842f]' : 'border-transparent text-[#1a1a1a]/55 hover:text-[#1a1a1a]/75'
                    }`}
                >
                    Daily Outsource Tracking ({dailyData?.suppliers?.length || 0} Agencies)
                </button>
                <button
                    onClick={() => setActiveTab('invoices')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === 'invoices' ? 'border-[#dbb457] text-[#a8842f]' : 'border-transparent text-[#1a1a1a]/55 hover:text-[#1a1a1a]/75'
                    }`}
                >
                    Monthly Invoices ({invoices.length})
                </button>
            </div>

            {/* TAB 1: DAILY TRACKING */}
            {activeTab === 'daily' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08]">
                            <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Daily Payables Estimated</div>
                            <div className="text-3xl font-bold text-[#1a1a1a] mt-2">
                                QAR {(dailyData?.total_daily_payables || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-[#1a1a1a]/55 mt-1">Date: {selectedDate}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-emerald-200 bg-emerald-50/20">
                            <div className="text-xs font-bold uppercase text-emerald-700">Total Drivers Deployed</div>
                            <div className="text-3xl font-bold text-emerald-700 mt-2">
                                {dailyData?.total_daily_workers || 0} Drivers
                            </div>
                            <div className="text-xs text-emerald-600 mt-1">From outsource contractors</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08]">
                            <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Suppliers Active on Duty</div>
                            <div className="text-3xl font-bold text-[#1a1a1a] mt-2">
                                {dailyData?.suppliers?.length || 0} Agencies
                            </div>
                            <div className="text-xs text-[#1a1a1a]/55 mt-1">Scheduled for this date</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08] overflow-hidden">
                        <div className="p-4 border-b border-[#1a1a1a]/[0.08] bg-[#f6f4ef]/60 flex items-center justify-between">
                            <h3 className="font-bold text-sm text-[#1a1a1a]/85">
                                Daily Outsource Headcount & Spend for {selectedDate}
                            </h3>
                            <span className="text-xs bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-mono">
                                Read-Only Executive View
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-[#1a1a1a]/[0.06] text-sm">
                                <thead className="bg-[#f6f4ef]/60 text-[#1a1a1a]/55 text-xs uppercase font-semibold">
                                    <tr>
                                        <th className="px-5 py-3 text-left">Supplier Agency</th>
                                        <th className="px-5 py-3 text-left">Locations</th>
                                        <th className="px-5 py-3 text-center">Allocated</th>
                                        <th className="px-5 py-3 text-center">Started Shift</th>
                                        <th className="px-5 py-3 text-center">Ended Shift</th>
                                        <th className="px-5 py-3 text-center">Duty Hours</th>
                                        <th className="px-5 py-3 text-right">Rate</th>
                                        <th className="px-5 py-3 text-right">Payable</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1a1a1a]/[0.06] bg-white">
                                    {(dailyData?.suppliers || []).map((sup: any) => (
                                        <tr key={sup.supplier_id} className="hover:bg-[#f6f4ef]/60 transition-colors">
                                            <td className="px-5 py-4 font-bold text-[#1a1a1a]">
                                                {sup.supplier_name}
                                                <div className="text-xs text-[#1a1a1a]/40 font-normal">Head: {sup.contact_person || 'Agency Contact'}</div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(sup.locations || []).map((loc: any, lIdx: number) => (
                                                        <span key={lIdx} className="bg-[#1a1a1a]/[0.05] text-[#1a1a1a]/85 text-xs px-2 py-0.5 rounded border border-[#1a1a1a]/[0.08]">
                                                            {loc.site_name} <b className="text-emerald-700">({loc.started_shift}/{loc.workers_allocated})</b>
                                                        </span>
                                                    ))}
                                                    {(sup.locations || []).length === 0 && (
                                                        <span className="text-xs text-[#1a1a1a]/40">None</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-center font-bold text-[#1a1a1a]/85">{sup.total_workers_allocated}</td>
                                            <td className="px-5 py-4 text-center">
                                                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                    {sup.started_shift_count}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                                    {sup.ended_shift_count}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-center font-mono font-bold text-[#1a1a1a]">{sup.total_duty_hours} hrs</td>
                                            <td className="px-5 py-4 text-right font-mono text-xs text-[#1a1a1a]/65">QAR {sup.billing_rate?.toFixed(2)}/shift</td>
                                            <td className="px-5 py-4 text-right font-bold text-[#1a1a1a]">
                                                QAR {sup.daily_total_payable?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                    {(dailyData?.suppliers || []).length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={8} className="px-5 py-12 text-center text-[#1a1a1a]/40">
                                                No outsource manpower attendance logged for {selectedDate}.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: INVOICES ARCHIVE */}
            {activeTab === 'invoices' && (
                <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[#1a1a1a]/[0.06] text-sm">
                            <thead className="bg-[#f6f4ef]/60 text-[#1a1a1a]/55 text-xs uppercase font-semibold">
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
                            <tbody className="divide-y divide-[#1a1a1a]/[0.06] bg-white">
                                {invoices.map((inv) => {
                                    const sup = suppliers.find(s => s.id === inv.supplier_id);
                                    const isVoid = inv.status === 'VOIDED';

                                    return (
                                        <tr key={inv.id} className={`hover:bg-[#f6f4ef]/60 transition-colors ${isVoid ? 'opacity-60 bg-[#f6f4ef]/60' : ''}`}>
                                            <td className="px-5 py-4 font-mono font-bold text-[#1a1a1a]">{inv.invoice_number}</td>
                                            <td className="px-5 py-4 font-semibold text-[#1a1a1a]/85">{sup?.name || `Agency #${inv.supplier_id}`}</td>
                                            <td className="px-5 py-4 text-[#1a1a1a]/65">
                                                {inv.billing_month ? calendarMonth(inv.billing_month) : '-'}
                                            </td>
                                            <td className="px-5 py-4 font-bold text-[#1a1a1a]/75">{inv.workers_supplied_quantity} Drivers</td>
                                            <td className="px-5 py-4 text-[#1a1a1a]/65">QAR {inv.rate_per_worker?.toFixed(2)}</td>
                                            <td className="px-5 py-4 font-bold text-[#1a1a1a]">
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
                                                    className="text-[#a8842f] hover:text-[#1a1a1a] font-bold text-xs border border-amber-200 px-3 py-1 rounded-lg hover:bg-amber-50 inline-block transition-colors"
                                                >
                                                    Download PDF 
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {invoices.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-8 text-center text-[#1a1a1a]/40">
                                            No invoices recorded in the system yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
