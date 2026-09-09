"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';

export default function Suppliers() {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    
    // Form state
    const [name, setName] = useState('');
    const [contact, setContact] = useState('');
    const [status, setStatus] = useState('active');
    const [billingRate, setBillingRate] = useState('0');

    const loadData = () => {
        fetchApi('/suppliers/').then(setSuppliers).catch(console.error).finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, []);

    const openAdd = () => {
        setEditingSupplier(null);
        setName(''); setContact(''); setStatus('active'); setBillingRate('0');
        setShowModal(true);
    };

    const openEdit = (s: any) => {
        setEditingSupplier(s);
        setName(s.name || ''); 
        setContact(s.contact_person || ''); 
        setStatus(s.status || 'active');
        setBillingRate(s.billing_rate ? s.billing_rate.toString() : '0');
        setShowModal(true);
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const body = { name, contact_person: contact, status, billing_rate: parseFloat(billingRate) };
            if (editingSupplier) {
                await fetchApi(`/suppliers/${editingSupplier.id}`, { method: 'PUT', body: JSON.stringify(body) });
            } else {
                await fetchApi('/suppliers/', { method: 'POST', body: JSON.stringify(body) });
            }
            setShowModal(false);
            loadData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    const columns = [
        { header: 'Supplier Name', field: 'name' },
        { header: 'Contact', field: 'contact_person' },
        { header: 'Status', field: (row: any) => <StatusBadge status={row.status} /> },
        { header: 'Actions', field: (row: any) => (
            <button onClick={() => openEdit(row)} className="text-blue-600 hover:underline">Edit</button>
        )}
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800">Suppliers</h1>
                <button onClick={openAdd} className="bg-[#dbb457] text-white px-4 py-2 rounded hover:bg-[#c29d45] font-bold">+ Add New Supplier</button>
            </div>
            
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Supplier Name</label>
                                <input type="text" required value={name} onChange={e=>setName(e.target.value)} className="w-full border p-2 rounded mt-1" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                                <input type="text" value={contact} onChange={e=>setContact(e.target.value)} className="w-full border p-2 rounded mt-1" />
                            </div>
                            {editingSupplier && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Status</label>
                                    <select value={status} onChange={e=>setStatus(e.target.value)} className="w-full border p-2 rounded mt-1">
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Billing Rate (per worker)</label>
                                <input type="number" step="any" required value={billingRate} onChange={e=>setBillingRate(e.target.value)} className="w-full border p-2 rounded mt-1" />
                            </div>
                            <div className="flex justify-end space-x-2 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                                <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#dbb457] text-white rounded hover:bg-[#c29d45]">{submitting ? 'Saving...' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <DataTable columns={columns} data={suppliers} keyField="id" />
        </div>
    );
}
