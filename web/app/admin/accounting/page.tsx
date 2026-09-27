
"use client";
import { qatarNowParts } from '@/lib/time';
import { useEffect, useState } from 'react';
import { fetchApi, API_URL, downloadFile } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ui } from '@/lib/ui';
import { Ban, Building2, CalendarRange, Download, FileText, Receipt, Wallet } from 'lucide-react';

export default function Accounting() {
    const [summary, setSummary] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState('');
    const [activeTab, setActiveTab] = useState('summary');
    const [sites, setSites] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [customSupplier, setCustomSupplier] = useState('');
    const [customSite, setCustomSite] = useState('');
    
    useEffect(() => {
        if(activeTab === 'custom') {
            fetchApi('/sites/').then(setSites);
            fetchApi('/suppliers/').then(setSuppliers);
        }
    }, [activeTab]);

    const handleDownloadCustom = async () => {
        if(!customSupplier || !customStart || !customEnd) return alert("Supplier, Start Date, and End Date are required.");
        try {
            const res = await fetchApi('/accounting/invoices/custom/download', {
                method: 'POST',
                body: JSON.stringify({
                    supplier_id: parseInt(customSupplier),
                    start_date: customStart,
                    end_date: customEnd,
                    site_id: customSite ? parseInt(customSite) : null
                })
            }, true);
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "custom_invoice.pdf";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert("Failed to download custom invoice. Ensure there is data.");
        }
    };

    
    // Filters
    const [day, setDay] = useState('');
    const [month, setMonth] = useState(qatarNowParts().month.toString());
    const [year, setYear] = useState(qatarNowParts().year.toString());

    useEffect(() => { setRole(sessionStorage.getItem('role') || ''); }, []);
    const canManageInvoices = role === 'SUPER_ADMIN' || role === 'ACCOUNTING';

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'summary') {
                let url = `/accounting/summary?`;
                if(day) url += `day=${day}&`;
                if(month) url += `month=${month}&`;
                if(year) url += `year=${year}&`;
                const data = await fetchApi(url);
                setSummary(data);
            } else {
                const data = await fetchApi(`/accounting/invoices`);
                setInvoices(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [activeTab, day, month, year]);

    const handleGenerateInvoice = async (supplierId: number) => {
        if (!confirm("Are you sure you want to generate an invoice for this supplier for the selected month?")) return;
        try {
            await fetchApi('/accounting/invoices', {
                method: 'POST',
                body: JSON.stringify({ supplier_id: supplierId, month: parseInt(month), year: parseInt(year) })
            });
            alert("Invoice generated successfully!");
            loadData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleVoidInvoice = async (invoiceId: number) => {
        if (!confirm("Are you sure you want to VOID this invoice? This action is audited.")) return;
        try {
            await fetchApi(`/accounting/invoices/${invoiceId}/void`, { method: 'POST' });
            alert("Invoice voided.");
            loadData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDownload = (invoiceId: number) => {
        downloadFile(`/accounting/invoices/${invoiceId}/download`, `invoice-${invoiceId}.pdf`);
    };

    const summaryTotal = summary.reduce((acc: number, s: any) => acc + (s.total_amount || 0), 0);
    const summaryShifts = summary.reduce((acc: number, s: any) => acc + (s.workers_supplied || 0), 0);
    const tabs = [
        { key: 'summary', label: 'Monthly Summary', icon: CalendarRange },
        { key: 'invoices', label: 'Invoice History', icon: FileText },
    ];
    const tableSkeleton = (
        <div className="space-y-2 rounded-2xl bg-white p-5">
            {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10" />)}
        </div>
    );

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Administration"
                title="Accounting & Invoicing"
                subtitle="Completed shifts, supplier payables and generated invoices"
            />
            
            <div className="inline-flex rounded-xl bg-[#1a1a1a]/[0.05] p-1">
                {tabs.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${activeTab === key ? 'bg-white text-[#1a1a1a] shadow-sm' : 'text-[#1a1a1a]/55 hover:text-[#1a1a1a]'}`}
                    >
                        <Icon className={`h-4 w-4 ${activeTab === key ? 'text-[#a8842f]' : ''}`} />
                        {label}
                    </button>
                ))}
            </div>

            {activeTab === 'summary' && (
                <div className="space-y-6">
                    <div className="mv-stagger grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <StatCard label="Total Payable" value={summaryTotal} decimals={2} prefix="QAR " hint="For the selected period" icon={Wallet} accent="ink" />
                        <StatCard label="Completed Shifts" value={summaryShifts} hint="Checked in and checked out" icon={Receipt} accent="green" />
                        <StatCard label="Agencies" value={summary.length} hint="In this summary" icon={Building2} accent="gold" />
                    </div>

                    <div className={`${ui.card} grid grid-cols-1 gap-4 p-4 sm:grid-cols-3`}>
                        <div>
                            <label className={ui.label}>Day (Optional)</label>
                            <input type="number" min="1" max="31" value={day} onChange={e => setDay(e.target.value)} className={ui.input} placeholder="All" />
                        </div>
                        <div>
                            <label className={ui.label}>Month</label>
                            <select value={month} onChange={e => setMonth(e.target.value)} className={ui.input}>
                                <option value="">All</option>
                                {[...Array(12)].map((_, i) => (
                                    <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={ui.label}>Year</label>
                            <input type="number" value={year} onChange={e => setYear(e.target.value)} className={ui.input} placeholder="All" />
                        </div>
                    </div>

                    {loading ? tableSkeleton : (
                        <div className={`${ui.card} overflow-hidden`}>
                            <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="border-b border-[#1a1a1a]/[0.06] bg-[#f6f4ef]/60">
                                    <tr>
                                        <th className={ui.th}>Supplier</th>
                                        <th className={ui.th}>Completed Shifts</th>
                                        <th className={ui.th}>Rate</th>
                                        <th className={ui.th}>Total Payable</th>
                                        {canManageInvoices && <th className={ui.th}>Action</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1a1a1a]/[0.05]">
                                    {summary.map((s: any) => (
                                        <tr key={s.supplier_id} className={ui.tr}>
                                            <td className="whitespace-nowrap px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#dbb457]/15 text-[11px] font-bold text-[#7a5f1f]">{(s.supplier_name || '').slice(0, 2).toUpperCase()}</span>
                                                    <span className="font-semibold text-[#1a1a1a]">{s.supplier_name}</span>
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-[#1a1a1a]/70">{s.workers_supplied}</td>
                                            <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-[#1a1a1a]/70">QAR {s.billing_rate}</td>
                                            <td className="whitespace-nowrap px-5 py-3.5 font-bold tabular-nums text-[#1a1a1a]">QAR {s.total_amount.toLocaleString()}</td>
                                            {canManageInvoices && (
                                                <td className="whitespace-nowrap px-5 py-3.5">
                                                    <button onClick={() => handleGenerateInvoice(s.supplier_id)} className={ui.action}><FileText className="h-3.5 w-3.5" /> Generate Invoice</button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                            {summary.length === 0 && <div className="p-10 text-center text-sm text-[#1a1a1a]/45">No data found for this period.</div>}
                        </div>
                    )}
                </div>
            )}

            
            {activeTab === 'custom' && (
                <div className={`${ui.card} space-y-4 p-6`}>
                    <h2 className="text-lg font-bold text-[#1a1a1a]">Generate Custom Invoice</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <label className={ui.label}>Supplier</label>
                            <select value={customSupplier} onChange={e => setCustomSupplier(e.target.value)} className={ui.input}>
                                <option value="">Select Supplier</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={ui.label}>Location (Optional)</label>
                            <select value={customSite} onChange={e => setCustomSite(e.target.value)} className={ui.input}>
                                <option value="">All Locations</option>
                                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={ui.label}>Start Date</label>
                            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className={ui.input} />
                        </div>
                        <div>
                            <label className={ui.label}>End Date</label>
                            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className={ui.input} />
                        </div>
                    </div>
                    <div className="pt-2">
                        <button onClick={handleDownloadCustom} className={ui.btnPrimary}><Download className="h-4 w-4" /> Download Custom Invoice PDF</button>
                    </div>
                </div>
            )}

            {activeTab === 'invoices' && (
                <div className="space-y-4">
                    {loading ? tableSkeleton : (
                        <div className={`${ui.card} overflow-hidden`}>
                            <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="border-b border-[#1a1a1a]/[0.06] bg-[#f6f4ef]/60">
                                    <tr>
                                        <th className={ui.th}>Invoice #</th>
                                        <th className={ui.th}>Supplier</th>
                                        <th className={ui.th}>Period</th>
                                        <th className={ui.th}>Qty / Rate</th>
                                        <th className={ui.th}>Total</th>
                                        <th className={ui.th}>Status</th>
                                        <th className={ui.th}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1a1a1a]/[0.05]">
                                    {invoices.map((item: any) => {
                                        const inv = item.invoice;
                                        return (
                                            <tr key={inv.id} className={ui.tr}>
                                                <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs font-semibold text-[#1a1a1a]">{inv.invoice_number}</td>
                                                <td className="whitespace-nowrap px-5 py-3.5 text-[#1a1a1a]/70">{item.supplier_name}</td>
                                                <td className="whitespace-nowrap px-5 py-3.5 text-[#1a1a1a]/70">{inv.billing_month}</td>
                                                <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-[#1a1a1a]/70">{inv.workers_supplied_quantity} @ {inv.rate_per_worker}</td>
                                                <td className="whitespace-nowrap px-5 py-3.5 font-bold tabular-nums text-[#1a1a1a]">QAR {inv.total_amount.toLocaleString()}</td>
                                                <td className="whitespace-nowrap px-5 py-3.5">
                                                    <StatusBadge status={inv.status} />
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-3.5">
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleDownload(inv.id)} className={ui.action}><Download className="h-3.5 w-3.5" /> PDF</button>
                                                        {canManageInvoices && inv.status === "GENERATED" && (
                                                            <button onClick={() => handleVoidInvoice(inv.id)} className={ui.actionDanger}><Ban className="h-3.5 w-3.5" /> Void</button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                            </div>
                            {invoices.length === 0 && <div className="p-10 text-center text-sm text-[#1a1a1a]/45">No invoices generated yet.</div>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
