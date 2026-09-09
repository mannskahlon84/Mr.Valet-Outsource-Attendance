
"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '../../../lib/api';

export default function Suppliers() {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    
    const [role, setRole] = useState('');
    useEffect(() => { setRole(localStorage.getItem('role') || ''); }, []);
    
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

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800">Suppliers</h1>
                {role !== "General Manager" && <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold">+ Add New Supplier</button>}
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
                            <div className="flex justify-end space-x-2 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                                
                            {role === "Super Admin" && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Billing Rate (per worker)</label>
                                    <input type="number" step="any" required value={billingRate} onChange={e=>setBillingRate(e.target.value)} className="w-full border p-2 rounded mt-1" />
                                </div>
                            )}
                                <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">{submitting ? 'Saving...' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            {role !== "General Manager" && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {suppliers.map((s: any) => (
                            <tr key={s.id}>
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{s.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{s.contact_person}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 text-xs font-semibold rounded-full ${s.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{s.status}</span>
                                </td>
                                {role !== "General Manager" && (
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                                        <button onClick={() => openEdit(s)} className="text-blue-600 hover:underline">Edit</button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
