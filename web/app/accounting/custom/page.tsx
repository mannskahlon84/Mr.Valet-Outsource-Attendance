"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function CustomInvoicing() {
    const [sites, setSites] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    // Filters & Custom Invoice Settings
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [siteId, setSiteId] = useState('');
    const [priceRate, setPriceRate] = useState('45.00');
    const [rateUnit, setRateUnit] = useState('PER_HOUR');

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
            if (sup && sup.length > 0) {
                setSupplierId(sup[0].id.toString());
                if (sup[0].billing_rate) {
                    setPriceRate(sup[0].billing_rate.toString());
                }
            }
        }).finally(() => setLoading(false));
    }, []);

    const handleSupplierChange = (newSupId: string) => {
        setSupplierId(newSupId);
        const selected = suppliers.find(s => s.id.toString() === newSupId);
        if (selected && selected.billing_rate) {
            setPriceRate(selected.billing_rate.toString());
        }
    };

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
                    site_id: siteId ? parseInt(siteId) : null,
                    custom_rate: parseFloat(priceRate) || null,
                    rate_unit: rateUnit
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

    const selectedSupplier = suppliers.find(s => s.id.toString() === supplierId);

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-black text-gray-900">Custom Date Range Invoicing</h1>
                <p className="text-sm text-gray-500">Generate on-demand billing reports and PDF statements with customizable supplier rates</p>
            </div>

            <form onSubmit={handleDownloadCustom} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-5">
                {/* 1. Supplier Agency Selector - ONLY Agency Name (No rates attached in label) */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold uppercase text-gray-600">
                            Target Supplier Agency *
                        </label>
                        {selectedSupplier && (
                            <span className="text-[11px] text-gray-400 font-medium">
                                Agency Code: SUP-{selectedSupplier.id.toString().padStart(3, '0')}
                            </span>
                        )}
                    </div>
                    <select 
                        value={supplierId} 
                        onChange={e => handleSupplierChange(e.target.value)}
                        required
                        className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white font-semibold text-gray-800 focus:ring-2 focus:ring-[#dbb457] focus:outline-none"
                    >
                        {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                {/* 2. Dedicated Price / Rate Box & Billing Unit Dropdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                            Price / Billing Rate (QAR) *
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-xs">QAR</span>
                            <input 
                                type="number" 
                                step="0.01"
                                min="0"
                                value={priceRate} 
                                onChange={e => setPriceRate(e.target.value)}
                                required
                                placeholder="45.00"
                                className="w-full border border-gray-300 bg-white pl-12 pr-3 py-2 rounded-lg text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#dbb457] focus:outline-none"
                            />
                        </div>
                        <span className="text-[10px] text-gray-400 mt-0.5 block">Customizable agreed invoice rate</span>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                            Billing Frequency / Unit *
                        </label>
                        <select 
                            value={rateUnit} 
                            onChange={e => setRateUnit(e.target.value)}
                            required
                            className="w-full border border-gray-300 bg-white p-2 rounded-lg text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-[#dbb457] focus:outline-none"
                        >
                            <option value="PER_HOUR">Per Hour (QAR / hr)</option>
                            <option value="PER_DAY">Per Day (QAR / day)</option>
                            <option value="PER_EMPLOYEE">Per Employee (QAR / employee)</option>
                        </select>
                        <span className="text-[10px] text-gray-400 mt-0.5 block">Calculation basis for this invoice</span>
                    </div>
                </div>

                {/* 3. Date Range */}
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

                {/* 4. Site Filter */}
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Filter by Specific Location (Optional)</label>
                    <select 
                        value={siteId} 
                        onChange={e => setSiteId(e.target.value)}
                        className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white"
                    >
                        <option value="">All Locations & Venues</option>
                        {sites.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                {/* Submit / Download Action */}
                <div className="pt-3">
                    <button 
                        type="submit" 
                        disabled={downloading}
                        className="w-full bg-[#dbb457] text-white p-3.5 rounded-xl hover:bg-[#c29d45] font-black text-sm shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {downloading ? 'Calculating & Generating PDF...' : '📄 Generate & Download Custom PDF Invoice'}
                    </button>
                </div>
            </form>
        </div>
    );
}
