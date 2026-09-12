"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';

export default function AccountingSummary() {
    const [summary, setSummary] = useState<any[]>([]);
    const [dailyData, setDailyData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const loadData = () => {
        setLoading(true);
        Promise.all([
            fetchApi(`/accounting/daily-breakdown?target_date=${selectedDate}`).catch(() => null),
            fetchApi(`/accounting/summary?month=${month}&year=${year}`).catch(() => [])
        ]).then(([daily, monthly]) => {
            setDailyData(daily);
            setSummary(monthly || []);
        }).catch(console.error)
        .finally(() => setLoading(false));
    };

    useEffect(() => { 
        loadData(); 
        const handleSync = () => loadData();
        window.addEventListener('portal_data_updated', handleSync);
        return () => window.removeEventListener('portal_data_updated', handleSync);
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

    const totalPayable = summary.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
    const totalWorkers = summary.reduce((acc, curr) => acc + (curr.workers_supplied || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <span>🧾</span> Accounting & Supplier Billing
                    </h1>
                    <p className="text-sm text-gray-500">Track daily supplier workforce attendance, hours, and generate monthly contractor invoices</p>
                </div>

                {/* Period / Date Selectors based on tab */}
                {activeTab === 'daily' ? (
                    <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                        <span className="text-xs font-bold uppercase text-gray-400">Date:</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="text-xs font-bold text-gray-800 bg-transparent focus:outline-none"
                        />
                    </div>
                ) : (
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
                )}
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('daily')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === 'daily' ? 'border-[#dbb457] text-[#dbb457]' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    📅 Daily Supplier Tracking ({dailyData?.suppliers?.length || 0} Agencies)
                </button>
                <button
                    onClick={() => setActiveTab('monthly')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === 'monthly' ? 'border-[#dbb457] text-[#dbb457]' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    📊 Monthly Invoicing ({summary.length} Agencies)
                </button>
            </div>

            {/* TAB 1: DAILY SUPPLIER TRACKING */}
            {activeTab === 'daily' && (
                <div className="space-y-6">
                    {/* Daily KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                            <div className="text-xs font-bold uppercase text-gray-400">Daily Payables Estimated</div>
                            <div className="text-3xl font-black text-gray-900 mt-2">
                                QAR {(dailyData?.total_daily_payables || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Date: {selectedDate}</div>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-emerald-200 bg-emerald-50/20">
                            <div className="text-xs font-bold uppercase text-emerald-700">Total Drivers Deployed</div>
                            <div className="text-3xl font-black text-emerald-700 mt-2">
                                {dailyData?.total_daily_workers || 0} Drivers
                            </div>
                            <div className="text-xs text-emerald-600 mt-1">From outsource contractors</div>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                            <div className="text-xs font-bold uppercase text-gray-400">Suppliers Active on Duty</div>
                            <div className="text-3xl font-black text-gray-900 mt-2">
                                {dailyData?.suppliers?.length || 0} Agencies
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Scheduled for this date</div>
                        </div>
                    </div>

                    {/* Daily Breakdown Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                            <h3 className="font-bold text-sm text-gray-800">
                                Agency Manpower Attendance Breakdown for {selectedDate}
                            </h3>
                            <span className="text-xs text-gray-500 font-mono">Location-wise attendance tracking</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                                    <tr>
                                        <th className="px-5 py-3 text-left">Supplier Agency</th>
                                        <th className="px-5 py-3 text-left">Deployed Locations</th>
                                        <th className="px-5 py-3 text-center">Allocated</th>
                                        <th className="px-5 py-3 text-center">Started Shift</th>
                                        <th className="px-5 py-3 text-center">Ended Shift</th>
                                        <th className="px-5 py-3 text-center">Duty Hours</th>
                                        <th className="px-5 py-3 text-right">Rate</th>
                                        <th className="px-5 py-3 text-right">Daily Payable</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {(dailyData?.suppliers || []).map((sup: any) => (
                                        <tr key={sup.supplier_id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="font-black text-gray-900">{sup.supplier_name}</div>
                                                <div className="text-xs text-gray-500">Contact: {sup.contact_person || 'Agency Head'}</div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(sup.locations || []).map((loc: any, lIdx: number) => (
                                                        <span key={lIdx} className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded border border-gray-200">
                                                            <span className="font-medium">{loc.site_name}</span>
                                                            <span className="font-bold text-emerald-700">({loc.started_shift}/{loc.workers_allocated})</span>
                                                        </span>
                                                    ))}
                                                    {(sup.locations || []).length === 0 && (
                                                        <span className="text-xs text-gray-400">No locations allocated</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-center font-bold text-gray-800">
                                                {sup.total_workers_allocated}
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
                                            <td className="px-5 py-4 text-center font-mono font-bold text-gray-900">
                                                {sup.total_duty_hours} hrs
                                            </td>
                                            <td className="px-5 py-4 text-right font-mono text-xs text-gray-600">
                                                QAR {sup.billing_rate?.toFixed(2)}/hr
                                            </td>
                                            <td className="px-5 py-4 text-right font-black text-gray-900">
                                                QAR {sup.daily_total_payable?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                    {(dailyData?.suppliers || []).length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={8} className="px-5 py-12 text-center text-gray-400">
                                                No supplier shifts or attendance logged for {selectedDate}.
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
            )}
        </div>
    );
}
