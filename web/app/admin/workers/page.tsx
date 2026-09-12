"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { validateQatarIdClient } from '@/lib/qidValidator';

export default function Workers() {
    const [workers, setWorkers] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingWorker, setEditingWorker] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    
    const [internalId, setInternalId] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [qid, setQid] = useState('');
    const [mobile, setMobile] = useState('');
    const [password, setPassword] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [status, setStatus] = useState('active');

    const qidValidation = qid ? validateQatarIdClient(qid) : null;

    const loadData = () => {
        Promise.all([
            fetchApi('/workers/'),
            fetchApi('/suppliers/')
        ]).then(([w, s]) => {
            setWorkers(w || []);
            setSuppliers(s || []);
        }).catch(console.error).finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, []);

    const openAdd = async () => {
        setEditingWorker(null);
        setInternalId('Loading series ID...');
        setFirstName(''); 
        setLastName(''); 
        setQid(''); 
        setMobile(''); 
        setPassword('devpass123'); 
        setSupplierId(''); 
        setStatus('active');
        setError('');
        setShowModal(true);

        try {
            const data = await fetchApi('/workers/next-id');
            if (data?.next_id) {
                setInternalId(data.next_id);
            }
        } catch (err) {
            console.error('Failed to get next ID', err);
        }
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
        setError('');
        setShowModal(true);
    };

    const handleDelete = async (worker: any) => {
        const workerName = `${worker.first_name} ${worker.last_name}`.trim();
        const confirmDelete = window.confirm(
            `⚠️ SUPER ADMIN EXCLUSIVE ACTION:\n\nAre you sure you want to permanently delete employee "${workerName}" (QID: ${worker.qid})?\n\nThis will completely release their QID and name so that another supplier agency can register them if needed.`
        );
        if (!confirmDelete) return;

        try {
            const res = await fetchApi(`/workers/${worker.id}`, { method: 'DELETE' });
            alert(res.message || `Employee ${workerName} deleted and QID released successfully.`);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to delete employee.');
        }
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setError('');

        if (qidValidation && !qidValidation.isValid) {
            setError(qidValidation.errorMessage || "Please enter a valid Qatar ID (QID).");
            return;
        }

        setSubmitting(true);
        try {
            const body: any = {
                internal_worker_id: internalId,
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                qid: qid.trim(),
                whatsapp_number: mobile.trim(),
                supplier_id: parseInt(supplierId),
                status
            };
            if (password && password.trim()) {
                body.password = password.trim();
            }

            if (editingWorker) {
                await fetchApi(`/workers/${editingWorker.id}`, { method: 'PUT', body: JSON.stringify(body) });
            } else {
                await fetchApi('/workers/', { method: 'POST', body: JSON.stringify(body) });
            }
            setShowModal(false);
            loadData();
        } catch (err: any) {
            setError(err.message || 'Failed to save employee record');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading workforce directory...</div>;

    const columns = [
        { 
            header: 'Worker ID', 
            field: (row: any) => (
                <span className="font-mono text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                    {row.internal_worker_id}
                </span>
            )
        },
        { 
            header: 'Driver Name', 
            field: (row: any) => (
                <div>
                    <span className="font-bold text-gray-900">{row.first_name} {row.last_name}</span>
                </div>
            )
        },
        { 
            header: 'Supplier Agency', 
            field: (row: any) => {
                const sup = suppliers.find(s => s.id === row.supplier_id);
                const name = row.supplier_name || sup?.name || 'Direct Employee';
                return (
                    <span className="font-semibold text-gray-800 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded text-xs">
                        🏢 {name}
                    </span>
                );
            }
        },
        { 
            header: 'Registered Under', 
            field: (row: any) => (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span>👤</span>
                    <span>{row.supplier_head_name || 'Admin Provisioned'}</span>
                </div>
            )
        },
        { 
            header: 'Qatar ID (QID)', 
            field: (row: any) => (
                <span className="font-mono text-xs font-semibold text-gray-800">
                    {row.qid || '—'}
                </span>
            ) 
        },
        { 
            header: 'Mobile Number', 
            field: (row: any) => (
                <span className="font-mono text-xs text-gray-600">
                    {row.whatsapp_number || '—'}
                </span>
            ) 
        },
        { header: 'Status', field: (row: any) => <StatusBadge status={row.status || 'active'} /> },
        { 
            header: 'Actions', 
            field: (row: any) => (
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => openEdit(row)} 
                        className="text-blue-600 hover:text-blue-800 font-bold text-xs bg-blue-50 px-2.5 py-1 rounded border border-blue-100"
                    >
                        Edit
                    </button>
                    <button 
                        onClick={() => handleDelete(row)} 
                        className="text-rose-600 hover:text-rose-800 font-bold text-xs bg-rose-50 px-2.5 py-1 rounded border border-rose-200 hover:bg-rose-100 transition-colors"
                        title="Only Super Admin can delete employee from database to release QID for re-registration"
                    >
                        Delete & Release
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Total Workforce Directory</h1>
                    <p className="text-sm text-gray-500">
                        Super Admin directory of all enrolled drivers. Only Super Admin has authority to permanently delete and release QIDs.
                    </p>
                </div>
                <button 
                    onClick={openAdd} 
                    className="bg-[#dbb457] text-white px-5 py-2.5 rounded-lg hover:bg-[#c29d45] font-bold text-sm shadow transition-colors"
                >
                    + Add New Employee
                </button>
            </div>
            
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg space-y-4 my-8">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h2 className="text-lg font-bold text-gray-900">
                                {editingWorker ? `Edit Employee: ${editingWorker.first_name} ${editingWorker.last_name}` : 'Enroll New Employee'}
                            </h2>
                            <button 
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        {error && (
                            <div className={`p-3.5 rounded-xl text-xs font-medium border ${
                                error.includes('already registered') 
                                    ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-sm' 
                                    : 'bg-red-50 border-red-200 text-red-700'
                            }`}>
                                <div className="flex items-start gap-2.5">
                                    <span className="text-base leading-none mt-0.5">
                                        {error.includes('already registered') ? '🚫' : '⚠️'}
                                    </span>
                                    <div className="space-y-1">
                                        <div className="font-bold text-xs uppercase tracking-wide">
                                            {error.includes('already registered') ? 'Cross-Supplier Registration Blocked' : 'Registration Error'}
                                        </div>
                                        <div className="leading-relaxed">{error}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Worker ID</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={internalId} 
                                        onChange={e=>setInternalId(e.target.value)} 
                                        className="w-full border p-2.5 rounded-lg text-sm font-mono font-bold bg-gray-50" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Assign Supplier Agency *</label>
                                    <select 
                                        value={supplierId} 
                                        onChange={e=>setSupplierId(e.target.value)} 
                                        required 
                                        className="w-full border p-2.5 rounded-lg text-sm bg-white"
                                    >
                                        <option value="">Select Supplier Agency</option>
                                        {suppliers.map((s: any) => (
                                            <option key={s.id} value={s.id}>{s.name} (Agency #{s.id})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">First Name *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={firstName} 
                                        onChange={e=>setFirstName(e.target.value)} 
                                        className="w-full border p-2.5 rounded-lg text-sm" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Last Name *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={lastName} 
                                        onChange={e=>setLastName(e.target.value)} 
                                        className="w-full border p-2.5 rounded-lg text-sm" 
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Qatar ID (QID) *</label>
                                <input 
                                    type="text" 
                                    required 
                                    maxLength={11}
                                    value={qid} 
                                    onChange={e=>setQid(e.target.value.replace(/\D/g, ''))} 
                                    placeholder="11-digit Qatar ID (e.g. 295356...)"
                                    className="w-full border p-2.5 rounded-lg text-sm font-mono tracking-wide" 
                                />
                                {qid.length > 0 && (
                                    <div className={`mt-1.5 p-2 rounded-lg text-xs flex items-start gap-1.5 ${
                                        qidValidation?.isValid 
                                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                                            : 'bg-amber-50 border border-amber-200 text-amber-800'
                                    }`}>
                                        <span className="text-sm leading-none mt-0.5">{qidValidation?.isValid ? '✓' : '⚠️'}</span>
                                        <div>
                                            <div className="font-semibold">
                                                {qidValidation?.isValid ? qidValidation.summary : qidValidation?.errorMessage}
                                            </div>
                                            {qidValidation?.isValid && (
                                                <div className="text-[10px] text-emerald-600 mt-0.5">
                                                    Qatar MOI verified format • Anti-bogus check passed
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Mobile / WhatsApp *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={mobile} 
                                        onChange={e=>setMobile(e.target.value)} 
                                        placeholder="+974..."
                                        className="w-full border p-2.5 rounded-lg text-sm" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        {editingWorker ? 'Reset App Password (blank to keep)' : 'Worker App Password *'}
                                    </label>
                                    <input 
                                        type="password" 
                                        required={!editingWorker} 
                                        value={password} 
                                        onChange={e=>setPassword(e.target.value)} 
                                        placeholder={editingWorker ? "••••••••" : "Default: devpass123"}
                                        className="w-full border p-2.5 rounded-lg text-sm" 
                                    />
                                </div>
                            </div>

                            {editingWorker && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                                    <select 
                                        value={status} 
                                        onChange={e=>setStatus(e.target.value)} 
                                        className="w-full border p-2.5 rounded-lg text-sm bg-white"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-3 border-t">
                                <button 
                                    type="button" 
                                    onClick={() => setShowModal(false)} 
                                    className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={submitting} 
                                    className="px-5 py-2 text-xs font-bold bg-[#dbb457] text-white rounded-lg hover:bg-[#c29d45] disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Save Employee'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <DataTable columns={columns} data={workers} keyField="id" />
            </div>
        </div>
    );
}