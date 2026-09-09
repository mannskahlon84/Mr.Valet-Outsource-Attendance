"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';

export default function Workers() {
    const [workers, setWorkers] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingWorker, setEditingWorker] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    
    const [internalId, setInternalId] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [qid, setQid] = useState('');
    const [mobile, setMobile] = useState('');
    const [password, setPassword] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [status, setStatus] = useState('active');

    const loadData = () => {
        Promise.all([
            fetchApi('/workers/'),
            fetchApi('/suppliers/')
        ]).then(([w, s]) => {
            setWorkers(w);
            setSuppliers(s);
        }).catch(console.error).finally(() => setLoading(false));
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
        setPassword('');
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
            if (password) body.pin_code = password;

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

    const columns = [
        { header: 'Worker ID', field: 'internal_worker_id' },
        { header: 'Name', field: (row: any) => row.first_name + ' ' + row.last_name },
        { header: 'QID', field: 'qid' },
        { header: 'Mobile', field: 'whatsapp_number' },
        { header: 'Status', field: (row: any) => <StatusBadge status={row.status || 'active'} /> },
        { header: 'Actions', field: (row: any) => (
            <button onClick={() => openEdit(row)} className="text-blue-600 hover:underline">Edit</button>
        )}
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800">Workers</h1>
                <button onClick={openAdd} className="bg-[#dbb457] text-white px-4 py-2 rounded hover:bg-[#c29d45] font-bold">+ Add New Employee</button>
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
                                <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#dbb457] text-white rounded hover:bg-[#c29d45]">{submitting ? 'Saving...' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <DataTable columns={columns} data={workers} keyField="id" />
        </div>
    );
}