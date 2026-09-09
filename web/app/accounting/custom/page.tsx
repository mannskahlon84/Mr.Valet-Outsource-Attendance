"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function CustomInvoicing() {
    const [sites, setSites] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [siteId, setSiteId] = useState('');

    useEffect(() => {
        // Default to current month range
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const today = now.toISOString().split('T')[0];
        setStartDate(firstDay);
        setEndDate(today);

        Promise.all([
            fetchApi('/sites/').catch(() => []),
            fetchApi('/suppliers/').catch(() => [])
        ]).then(([s, sup]) => {
            setSites(s || []);
            setSuppliers(sup || []);
            if (sup && sup.length > 0) setSupplierId(sup[0].id.toString());
        }).finally(() => setLoading(false));
    }, []);

    const handleDownloadCustom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierId || !startDate || !endDate) {
            alert("Supplier, Start Date, and End Date are required.");
            return;
        }

        setDownloading(true);
        try {
            const res = await fetchApi('/accounting/invoices/custom/download', {
                method: 'POST',
                body: JSON.stringify({
                    supplier_id: parseInt(supplierId),
                    start_date: startDate,
                    end_date: endDate,
                    site_id: siteId ? parseInt(siteId) : null
                })
            }, true);

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `custom_invoice_${startDate}_to_${endDate}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            alert(err.message || "Failed to download custom invoice. Ensure there is duty data for this date range.");
        } finally {
            setDownloading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading options...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-black text-gray-900">Custom Date Range Invoicing</h1>
                <p className="text-sm text-gray-500">Generate on-demand billing reports and PDF statements for specific date windows or sites</p>
            </div>

            <form onSubmit={handleDownloadCustom} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-5">
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Target Supplier Agency *</label>
                    <select 
                        value={supplierId} 
                        onChange={e => setSupplierId(e.target.value)}
                        required
                        className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#dbb457] focus:outline-none"
                    >
                        {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name} (QAR {s.billing_rate}/hr)</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-1">From Date *</label>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={e => setStartDate(e.target.value)}
                            required
                            className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#dbb457] focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-1">To Date *</label>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={e => setEndDate(e.target.value)}
                            required
                            className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#dbb457] focus:outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Filter by Specific Site (Optional)</label>
                    <select 
                        value={siteId} 
                        onChange={e => setSiteId(e.target.value)}
                        className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white"
                    >
                        <option value="">All Locations</option>
                        {sites.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                <div className="pt-3">
                    <button 
                        type="submit" 
                        disabled={downloading}
                        className="w-full bg-[#dbb457] text-white p-3 rounded-lg hover:bg-[#c29d45] font-bold text-sm shadow transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {downloading ? 'Calculating & Generating PDF...' : '📄 Generate & Download Custom PDF Invoice'}
                    </button>
                </div>
            </form>
        </div>
    );
}
