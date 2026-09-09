
"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '../../../lib/api';

export default function Workers() {
    const [workers, setWorkers] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingWorker, setEditingWorker] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    
    const [role, setRole] = useState('');
    useEffect(() => { setRole(localStorage.getItem('role') || ''); }, []);
    
    // Form state
    const [internalId, setInternalId] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [qid, setQid] = useState('');
    const [mobile, setMobile] = useState('');
    const [password, setPassword] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [status, setStatus] = useState('active');

    const loadData = () => {
        fetchApi('/workers/').then(setWorkers).finally(() => setLoading(false));
        fetchApi('/suppliers/').then(setSuppliers).catch(() => {});
    };

    useEffect(() => { loadData(); }, []);

    const openAdd = () => {
        setEditingWorker(null);
        setInternalId(''); setFirstName(''); setLastName(''); setQid(''); setMobile(''); setPassword(''); setSupplierId(''); setStatus('active');
        setShowModal(true);
    };

    const openEdit = (w: any) => {
        setEditingWorker(w);
        setInternalId(w.internal_worker_id || '');
        setFirstName(w.first_name || '');
        setLastName(w.last_name || '');
        setQid(w.qid || '');
        setMobile(w.whatsapp_number || '');
        setPassword(''); // Do not load password
        setSupplierId(w.supplier_id ? w.supplier_id.toString() : '');
        setStatus(w.status || 'active');
        setShowModal(true);
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const body: any = {
                internal_worker_id: internalId,
                first_name: firstName,
                last_name: lastName,
                qid,
                whatsapp_number: mobile,
                supplier_id: parseInt(supplierId),
                status
            };
            if (!editingWorker || password) {
                body.password = password; // Only send password if editing and it's not empty, or if adding new
            }

            if (editingWorker) {
                await fetchApi(`/workers/${editingWorker.id}`, { method: 'PUT', body: JSON.stringify(body) });
            } else {
                await fetchApi('/workers/', { method: 'POST', body: JSON.stringify(body) });
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
                <h1 className="text-2xl font-bold text-gray-800">Workers</h1>
                {role !== "General Manager" && <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold">+ Add New Employee</button>}
            </div>
            
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md max-h-full overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">{editingWorker ? 'Edit Employee' : 'Add New Employee'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Internal Worker ID</label>
                                <input type="text" required value={internalId} onChange={e=>setInternalId(e.target.value)} className="w-full border p-2 rounded mt-1" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                                    <input type="text" required value={firstName} onChange={e=>setFirstName(e.target.value)} className="w-full border p-2 rounded mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                                    <input type="text" required value={lastName} onChange={e=>setLastName(e.target.value)} className="w-full border p-2 rounded mt-1" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">QID (National ID)</label>
                                <input type="text" required value={qid} onChange={e=>setQid(e.target.value)} className="w-full border p-2 rounded mt-1" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Mobile Number (Login ID)</label>
                                <input type="text" required value={mobile} onChange={e=>setMobile(e.target.value)} className="w-full border p-2 rounded mt-1" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{editingWorker ? 'Reset Password / PIN (Leave empty to keep)' : 'Password / PIN'}</label>
                                <input type="password" required={!editingWorker} value={password} onChange={e=>setPassword(e.target.value)} className="w-full border p-2 rounded mt-1" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Supplier</label>
                                <select value={supplierId} onChange={e=>setSupplierId(e.target.value)} required className="w-full border p-2 rounded mt-1">
                                    <option value="">Select Supplier</option>
                                    {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            {editingWorker && (
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">QID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            {role !== "General Manager" && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {workers.map((w: any) => (
                            <tr key={w.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{w.internal_worker_id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{w.first_name} {w.last_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{w.qid}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{w.whatsapp_number}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 text-xs font-semibold rounded-full ${(w.status === "active" || !w.status) ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{(w.status || 'active')}</span>
                                </td>
                                {role !== "General Manager" && (
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                                        <button onClick={() => openEdit(w)} className="text-blue-600 hover:underline">Edit</button>
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
