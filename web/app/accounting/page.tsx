"use client";
import { qatarNowParts, qatarTime, qatarToday } from '@/lib/time';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import ExportButtons from '@/components/ui/ExportButtons';

// Accounting works in Qatar calendar days (a UTC date is wrong between midnight and 03:00 in Doha)
const LIVE_REFRESH_MS = 20_000;

export default function AccountingSummary() {
    const [summary, setSummary] = useState<any[]>([]);
    const [dailyData, setDailyData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');
    const [selectedDate, setSelectedDate] = useState(qatarToday);
    const [month, setMonth] = useState(qatarNowParts().month.toString());
    const [year, setYear] = useState(qatarNowParts().year.toString());
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

    const loadData = (background = false) => {
        if (!background) setLoading(true);
        Promise.all([
            fetchApi(`/accounting/daily-breakdown?target_date=${selectedDate}`).catch(() => null),
            fetchApi(`/accounting/summary?month=${month}&year=${year}`).catch(() => [])
        ]).then(([daily, monthly]) => {
            // A failed background refresh keeps the figures already on screen
            if (daily) setDailyData(daily);
            if (monthly) setSummary(monthly);
            if (daily || monthly) setUpdatedAt(new Date());
        }).catch(console.error)
        .finally(() => setLoading(false));
    };

    useEffect(() => { 
        loadData(); 
        const handleSync = () => loadData(true);
        window.addEventListener('portal_data_updated', handleSync);
        // Live: check-ins and check-outs appear without reloading the page
        const timer = setInterval(() => loadData(true), LIVE_REFRESH_MS);
        return () => {
            window.removeEventListener('portal_data_updated', handleSync);
            clearInterval(timer);
        };
    }, [selectedDate, month, year]);

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

    const billedAgencies = summary.filter(s => (s.workers_supplied || 0) > 0).length;
    const totalPayable = summary.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
    const totalWorkers = summary.reduce((acc, curr) => acc + (curr.workers_supplied || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="mv-eyebrow basis-full mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#a8842f]"><span className="h-px w-6 bg-[#dbb457]" />Accounting</div>
                    <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight text-[#1a1a1a] flex items-center gap-2"> Accounting & Supplier Billing
                    </h1>
                    <p className="text-sm text-[#1a1a1a]/55">Track daily supplier workforce attendance, hours, and generate monthly contractor invoices</p>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-[#1a1a1a]/55">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        <span>Live · refreshes every 20 s{updatedAt ? ` · updated ${qatarTime(updatedAt, true)}` : ''}</span>
                        <button type="button" onClick={() => loadData(true)} className="font-bold text-[#a8842f] hover:underline cursor-pointer">Refresh now</button>
                    </div>
                </div>

                {/* Period / Date Selectors based on tab */}
                {activeTab === 'daily' ? (
                    <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-[#1a1a1a]/[0.08] shadow-[0_1px_2px_rgb(26_26_26/0.04)]">
                        <span className="text-xs font-bold uppercase text-[#1a1a1a]/40">Date:</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => e.target.value && setSelectedDate(e.target.value)}
                            className="text-xs font-bold text-[#1a1a1a]/85 bg-transparent focus:outline-none"
                        />
                        {selectedDate !== qatarToday() && (
                            <button type="button" onClick={() => setSelectedDate(qatarToday())} className="text-[11px] font-bold text-[#a8842f] hover:underline cursor-pointer">
                                Today
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-[#1a1a1a]/[0.08] shadow-[0_1px_2px_rgb(26_26_26/0.04)]">
                        <select 
                            value={month} 
                            onChange={e => setMonth(e.target.value)}
                            className="text-xs font-bold text-[#1a1a1a]/75 bg-transparent p-1 focus:outline-none"
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>Month {m}</option>
                            ))}
                        </select>
                        <span className="text-[#1a1a1a]/25">/</span>
                        <select 
                            value={year} 
                            onChange={e => setYear(e.target.value)}
                            className="text-xs font-bold text-[#1a1a1a]/75 bg-transparent p-1 focus:outline-none"
                        >
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                            <option value="2027">2027</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-4 border-b border-[#1a1a1a]/[0.08]">
                <button
                    onClick={() => setActiveTab('daily')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === 'daily' ? 'border-[#dbb457] text-[#a8842f]' : 'border-transparent text-[#1a1a1a]/55 hover:text-[#1a1a1a]/75'
                    }`}
                >
                    Daily Supplier Tracking ({dailyData?.suppliers?.length || 0} Agencies)
                </button>
                <button
                    onClick={() => setActiveTab('monthly')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === 'monthly' ? 'border-[#dbb457] text-[#a8842f]' : 'border-transparent text-[#1a1a1a]/55 hover:text-[#1a1a1a]/75'
                    }`}
                >
                    Monthly Invoicing ({billedAgencies} Agencies)
                </button>
            </div>

            {/* TAB 1: DAILY SUPPLIER TRACKING */}
            {activeTab === 'daily' && (
                <div className="space-y-6">
                    {/* Daily KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08]">
                            <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Daily Payable</div>
                            <div className="text-2xl sm:text-3xl font-bold text-[#1a1a1a] mt-2">
                                QAR {(dailyData?.total_daily_payables || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-[#1a1a1a]/55 mt-1">{dailyData?.total_completed || 0} completed shift(s) on {selectedDate}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-emerald-200 bg-emerald-50/20">
                            <div className="text-xs font-bold uppercase text-emerald-700">Drivers On Duty Now</div>
                            <div className="text-2xl sm:text-3xl font-bold text-emerald-700 mt-2">
                                {dailyData?.total_on_duty || 0}
                            </div>
                            <div className="text-xs text-emerald-600 mt-1">{dailyData?.total_daily_workers || 0} started · {dailyData?.total_completed || 0} finished</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08]">
                            <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Drivers Confirmed</div>
                            <div className="text-2xl sm:text-3xl font-bold text-[#1a1a1a] mt-2">
                                {dailyData?.total_scheduled || 0}
                            </div>
                            <div className={`text-xs mt-1 ${(dailyData?.total_missing || 0) > 0 ? 'text-rose-600 font-bold' : 'text-[#1a1a1a]/55'}`}>{dailyData?.total_missing || 0} missing (not checked in)</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08]">
                            <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Agencies Working</div>
                            <div className="text-2xl sm:text-3xl font-bold text-[#1a1a1a] mt-2">
                                {dailyData?.suppliers?.length || 0}
                            </div>
                            <div className="text-xs text-[#1a1a1a]/55 mt-1">{dailyData?.total_duty_hours || 0} verified duty hours</div>
                        </div>
                    </div>

                    {/* Daily Breakdown Table */}
                    <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08] overflow-hidden">
                        <div className="p-4 border-b border-[#1a1a1a]/[0.08] bg-[#f6f4ef]/60 flex flex-wrap items-center justify-between gap-3">
                            <h3 className="font-bold text-sm text-[#1a1a1a]/85">
                                Agency Manpower Attendance Breakdown for {selectedDate}
                            </h3>
                            <ExportButtons base="/accounting/daily-breakdown/export" query={`target_date=${selectedDate}`} filename={`daily-supplier-tracking-${selectedDate}`} />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-[#1a1a1a]/[0.06] text-sm">
                                <thead className="bg-[#f6f4ef]/60 text-[#1a1a1a]/55 text-xs uppercase font-semibold">
                                    <tr>
                                        <th className="px-5 py-3 text-left">Supplier Agency</th>
                                        <th className="px-5 py-3 text-left">Deployed Locations</th>
                                        <th className="px-5 py-3 text-center">Confirmed / Checked in</th>
                                        <th className="px-5 py-3 text-center">Started Shift</th>
                                        <th className="px-5 py-3 text-center">Ended Shift</th>
                                        <th className="px-5 py-3 text-center">Duty Hours</th>
                                        <th className="px-5 py-3 text-right">Rate</th>
                                        <th className="px-5 py-3 text-right">Daily Payable</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1a1a1a]/[0.06] bg-white">
                                    {(dailyData?.suppliers || []).map((sup: any) => (
                                        <tr key={sup.supplier_id} className="hover:bg-[#f6f4ef]/60 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="font-bold text-[#1a1a1a]">{sup.supplier_name}</div>
                                                <div className="text-xs text-[#1a1a1a]/55">Contact: {sup.contact_person || 'Agency Head'}</div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(sup.locations || []).map((loc: any, lIdx: number) => (
                                                        <span key={lIdx} className="inline-flex items-center gap-1 bg-[#1a1a1a]/[0.05] text-[#1a1a1a]/85 text-xs px-2 py-0.5 rounded border border-[#1a1a1a]/[0.08]">
                                                            <span className="font-medium">{loc.site_name}</span>
                                                            <span className="font-bold text-emerald-700">({loc.started_shift}/{loc.workers_allocated})</span>
                                                        </span>
                                                    ))}
                                                    {(sup.locations || []).length === 0 && (
                                                        <span className="text-xs text-[#1a1a1a]/40">No locations allocated</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-center font-bold text-[#1a1a1a]/85">
                                                {sup.total_workers_allocated} / {sup.started_shift_count}
                                                {sup.missing_count > 0 && <div className="text-[11px] font-bold text-rose-600">{sup.missing_count} missing</div>}
                                            </td>
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
                                            <td className="px-5 py-4 text-center font-mono font-bold text-[#1a1a1a]">
                                                {sup.total_duty_hours} hrs
                                            </td>
                                            <td className="px-5 py-4 text-right font-mono text-xs text-[#1a1a1a]/65">
                                                QAR {sup.billing_rate?.toFixed(2)}/shift
                                            </td>
                                            <td className="px-5 py-4 text-right font-bold text-[#1a1a1a]">
                                                QAR {sup.daily_total_payable?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                    {(dailyData?.suppliers || []).length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={8} className="px-5 py-12 text-center text-[#1a1a1a]/40">
                                                No confirmed agency shifts on {selectedDate}.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: MONTHLY BILLING & INVOICING */}
            {activeTab === 'monthly' && (
                <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08]">
                            <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Total Outsource Payables</div>
                            <div className="text-3xl font-bold text-[#1a1a1a] mt-2">
                                QAR {totalPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-[#1a1a1a]/55 mt-1">Period: {month}/{year}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08]">
                            <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Total Confirmed Drivers</div>
                            <div className="text-3xl font-bold text-[#1a1a1a] mt-2">{totalWorkers} Drivers</div>
                            <div className="text-xs text-[#1a1a1a]/55 mt-1">Across all agency contracts</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08]">
                            <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Active Agencies Billed</div>
                            <div className="text-3xl font-bold text-[#1a1a1a] mt-2">{billedAgencies} Agencies</div>
                            <div className="text-xs text-[#1a1a1a]/55 mt-1">With completed shifts, ready to invoice</div>
                        </div>
                    </div>

                    {/* Summary Table */}
                    <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08] overflow-hidden">
                        <div className="p-4 border-b border-[#1a1a1a]/[0.08] bg-[#f6f4ef]/60 flex flex-wrap items-center justify-between gap-3">
                            <h3 className="font-bold text-sm text-[#1a1a1a]/85">Completed shifts and payables for {month}/{year}</h3>
                            <ExportButtons base="/accounting/summary/export" query={`month=${month}&year=${year}`} filename={`monthly-billing-${year}-${month.padStart(2, '0')}`} />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-[#1a1a1a]/[0.06] text-sm">
                                <thead className="bg-[#f6f4ef]/60 text-[#1a1a1a]/55 text-xs uppercase font-semibold">
                                    <tr>
                                        <th className="px-5 py-3 text-left">Supplier Agency</th>
                                        <th className="px-5 py-3 text-left">Completed Shifts</th>
                                        <th className="px-5 py-3 text-left">Agreed Rate</th>
                                        <th className="px-5 py-3 text-left">Total Payables</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1a1a1a]/[0.06] bg-white">
                                    {summary.map((item) => (
                                        <tr key={item.supplier_id} className="hover:bg-[#f6f4ef]/60 transition-colors">
                                            <td className="px-5 py-4 font-bold text-[#1a1a1a]">{item.supplier_name}</td>
                                            <td className="px-5 py-4 font-semibold text-[#1a1a1a]/75">{item.workers_supplied} Shifts</td>
                                            <td className="px-5 py-4 text-[#1a1a1a]/65 font-mono">QAR {item.billing_rate?.toFixed(2)}</td>
                                            <td className="px-5 py-4 font-bold text-[#1a1a1a]">
                                                QAR {item.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <button 
                                                    disabled={actionLoading}
                                                    onClick={() => handleGenerateInvoice(item.supplier_id, item.supplier_name)}
                                                    className="bg-[#1a1a1a] hover:bg-[#dbb457] hover:text-[#1a1a1a] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow transition-colors disabled:opacity-50"
                                                >
                                                    Generate Invoice
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {summary.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={5} className="px-5 py-8 text-center text-[#1a1a1a]/40">
                                                No billable hours recorded for this period.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
