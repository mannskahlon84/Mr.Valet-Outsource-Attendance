"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';

export default function GMWorkers() {
    const [workers, setWorkers] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        Promise.all([
            fetchApi('/workers/').catch(() => []),
            fetchApi('/suppliers/').catch(() => [])
        ]).then(([w, s]) => {
            setWorkers(w || []);
            setSuppliers(s || []);
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading workers directory...</div>;

    const filtered = workers.filter(w => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            w.first_name?.toLowerCase().includes(q) ||
            w.last_name?.toLowerCase().includes(q) ||
            w.internal_worker_id?.toLowerCase().includes(q) ||
            w.qid?.toLowerCase().includes(q) ||
            w.supplier_name?.toLowerCase().includes(q) ||
            w.supplier_head_name?.toLowerCase().includes(q)
        );
    });

    const columns = [
        { header: 'Worker ID', field: 'internal_worker_id' },
        { header: 'Driver Name', field: (row: any) => (
            <span className="font-bold text-gray-900">{row.first_name} {row.last_name}</span>
        )},
        { header: 'Supplier Agency', field: (row: any) => {
            const sup = suppliers.find(s => s.id === row.supplier_id);
            return (
                <span className="font-semibold text-gray-800">
                    {row.supplier_name || sup?.name || 'Direct Employee'}
                </span>
            );
        }},
        { header: 'Registered By (Supplier Head)', field: (row: any) => (
            <span className="text-xs bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-medium">
                👤 {row.supplier_head_name || 'Admin Registered'}
            </span>
        )},
        { header: 'QID', field: 'qid' },
        { header: 'Mobile', field: 'whatsapp_number' },
        { header: 'Status', field: (row: any) => <StatusBadge status={row.status || 'active'} /> }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <span>👥</span> Valet Workforce Directory
                    </h1>
                    <p className="text-sm text-gray-500">
                        Read-only executive roster of all enrolled drivers, contracting agencies, and registering supplier heads
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1 rounded-full font-bold">
                        Read-Only Mode
                    </span>
                    <input
                        type="text"
                        placeholder="Search name, QID, supplier, or head..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-[#dbb457] focus:outline-none w-64 bg-white"
                    />
                </div>
            </div>

            {/* Metric Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-xs font-bold uppercase text-gray-400">Total Enrolled Valet Drivers</div>
                    <div className="text-3xl font-black text-gray-900 mt-2">{workers.length}</div>
                    <div className="text-xs text-gray-500 mt-1">Across all outsource suppliers</div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-emerald-200 bg-emerald-50/20">
                    <div className="text-xs font-bold uppercase text-emerald-700">Active Status Drivers</div>
                    <div className="text-3xl font-black text-emerald-700 mt-2">
                        {workers.filter(w => (w.status || 'active').toLowerCase() === 'active').length}
                    </div>
                    <div className="text-xs text-emerald-600 mt-1">Eligible for deployment</div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-xs font-bold uppercase text-gray-400">Partner Agencies Represented</div>
                    <div className="text-3xl font-black text-gray-900 mt-2">{suppliers.length}</div>
                    <div className="text-xs text-gray-500 mt-1">Contracting companies</div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <DataTable columns={columns} data={filtered} keyField="id" />
            </div>
        </div>
    );
}
