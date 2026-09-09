
"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '../../../lib/api';

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
    const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
    const [year, setYear] = useState(new Date().getFullYear().toString());

    useEffect(() => { setRole(localStorage.getItem('role') || ''); }, []);

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
        const token = localStorage.getItem('token');
        window.open(`http://localhost:8000/api/v1/accounting/invoices/${invoiceId}/download?token=${token}`, '_blank');
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Accounting & Invoicing</h1>
            </div>
            
            <div className="mb-4 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('summary')}
                        className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'summary' ? 'border-[#dbb457] text-[#dbb457]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Monthly Summary
                    </button>
                    <button
                        onClick={() => setActiveTab('invoices')}
                        className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'invoices' ? 'border-[#dbb457] text-[#dbb457]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Invoice History
                    </button>
                </nav>
            </div>

            {activeTab === 'summary' && (
                <div className="space-y-4">
                    <div className="flex space-x-4 bg-white p-4 rounded-lg shadow-sm">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Day (Optional)</label>
                            <input type="number" min="1" max="31" value={day} onChange={e => setDay(e.target.value)} className="mt-1 block w-full border border-gray-300 p-2 rounded-md" placeholder="All" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Month</label>
                            <select value={month} onChange={e => setMonth(e.target.value)} className="mt-1 block w-full border border-gray-300 p-2 rounded-md">
                                <option value="">All</option>
                                {[...Array(12)].map((_, i) => (
                                    <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Year</label>
                            <input type="number" value={year} onChange={e => setYear(e.target.value)} className="mt-1 block w-full border border-gray-300 p-2 rounded-md" placeholder="All" />
                        </div>
                    </div>

                    {loading ? (
                        <div>Loading...</div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Workers Supplied</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Payable</th>
                                        {(role === "Super Admin" || role === "ACCOUNTING") && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {summary.map((s: any) => (
                                        <tr key={s.supplier_id}>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{s.supplier_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">{s.workers_supplied}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">QAR {s.billing_rate}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-bold">QAR {s.total_amount.toLocaleString()}</td>
                                            {(role === "Super Admin" || role === "ACCOUNTING") && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <button onClick={() => handleGenerateInvoice(s.supplier_id)} className="text-[#dbb457] hover:underline">Generate Invoice</button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {summary.length === 0 && <div className="p-4 text-center text-gray-500">No data found for this period.</div>}
                        </div>
                    )}
                </div>
            )}

            
            {activeTab === 'custom' && (
                <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
                    <h2 className="text-lg font-bold">Generate Custom Invoice</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Supplier</label>
                            <select value={customSupplier} onChange={e => setCustomSupplier(e.target.value)} className="mt-1 block w-full border border-gray-300 p-2 rounded-md">
                                <option value="">Select Supplier</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Location (Optional)</label>
                            <select value={customSite} onChange={e => setCustomSite(e.target.value)} className="mt-1 block w-full border border-gray-300 p-2 rounded-md">
                                <option value="">All Locations</option>
                                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Start Date</label>
                            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="mt-1 block w-full border border-gray-300 p-2 rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">End Date</label>
                            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="mt-1 block w-full border border-gray-300 p-2 rounded-md" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <button onClick={handleDownloadCustom} className="bg-[#dbb457] text-white px-4 py-2 rounded-md hover:bg-[#c29d45]">Download Custom Invoice PDF</button>
                    </div>
                </div>
            )}

            {activeTab === 'invoices' && (
                <div className="space-y-4">
                    {loading ? (
                        <div>Loading...</div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty / Rate</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {invoices.map((item: any) => {
                                        const inv = item.invoice;
                                        return (
                                            <tr key={inv.id}>
                                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{inv.invoice_number}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{item.supplier_name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{inv.billing_month}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{inv.workers_supplied_quantity} @ {inv.rate_per_worker}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-bold">QAR {inv.total_amount.toLocaleString()}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 text-xs font-semibold rounded-full ${inv.status === "GENERATED" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{inv.status}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                                                    <button onClick={() => handleDownload(inv.id)} className="text-[#dbb457] hover:underline">Download PDF</button>
                                                    {(role === "Super Admin" || role === "ACCOUNTING") && inv.status === "GENERATED" && (
                                                        <button onClick={() => handleVoidInvoice(inv.id)} className="text-red-600 hover:underline">Void</button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                            {invoices.length === 0 && <div className="p-4 text-center text-gray-500">No invoices generated yet.</div>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
