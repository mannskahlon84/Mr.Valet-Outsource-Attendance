"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function SupplierWorkers() {
    const [workers, setWorkers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Form fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [internalId, setInternalId] = useState('');
    const [qid, setQid] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('devpass123');

    const loadData = () => {
        fetchApi('/workers/')
            .then(data => setWorkers(data || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, []);

    const openAdd = () => {
        setFirstName('');
        setLastName('');
        setInternalId(`WRK-${Date.now().toString().slice(-4)}`);
        setQid('');
        setPhone('');
        setPassword('devpass123');
        setError('');
        setShowModal(true);
    };

    const handleCreateWorker = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const body = {
                first_name: firstName,
                last_name: lastName,
                internal_worker_id: internalId,
                qid,
                whatsapp_number: phone,
                password
            };

            await fetchApi('/workers/', {
                method: 'POST',
                body: JSON.stringify(body)
            });

            setShowModal(false);
            loadData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading worker roster...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Agency Worker Roster</h1>
                    <p className="text-sm text-gray-500">Manage drivers and attendants enrolled under your agency contract</p>
                </div>
                <button 
                    onClick={openAdd}
                    className="bg-[#dbb457] hover:bg-[#c29d45] text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow transition-colors"
                >
                    + Enroll New Driver
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-5 py-3 text-left">Internal ID</th>
                                <th className="px-5 py-3 text-left">Driver Name</th>
                                <th className="px-5 py-3 text-left">QID Number</th>
                                <th className="px-5 py-3 text-left">WhatsApp / Phone</th>
                                <th className="px-5 py-3 text-left">Biometrics</th>
                                <th className="px-5 py-3 text-left">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {workers.map((w) => (
                                <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-5 py-4 font-mono font-bold text-gray-900">{w.internal_worker_id}</td>
                                    <td className="px-5 py-4 font-bold text-gray-800">
                                        {w.first_name} {w.last_name}
                                    </td>
                                    <td className="px-5 py-4 text-gray-600 font-mono text-xs">{w.qid || '-'}</td>
                                    <td className="px-5 py-4 text-gray-600">{w.whatsapp_number || '-'}</td>
                                    <td className="px-5 py-4">
                                        {w.face_embedding ? (
                                            <span className="text-xs bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded">
                                                Enrolled ✓
                                            </span>
                                        ) : (
                                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                                                Pending Photo
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                            w.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {w.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {workers.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                                        No workers registered yet. Click "+ Enroll New Driver" above.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ENROLL MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="font-bold text-lg text-gray-900">Enroll New Valet Driver</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-700 text-xs p-3 rounded font-medium">{error}</div>
                        )}

                        <form onSubmit={handleCreateWorker} className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">First Name *</label>
                                    <input 
                                        type="text" 
                                        value={firstName} 
                                        onChange={e => setFirstName(e.target.value)} 
                                        required 
                                        className="w-full border p-2 rounded"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Last Name *</label>
                                    <input 
                                        type="text" 
                                        value={lastName} 
                                        onChange={e => setLastName(e.target.value)} 
                                        required 
                                        className="w-full border p-2 rounded"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Internal Worker ID *</label>
                                    <input 
                                        type="text" 
                                        value={internalId} 
                                        onChange={e => setInternalId(e.target.value)} 
                                        required 
                                        className="w-full border p-2 rounded font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Qatar ID (QID) *</label>
                                    <input 
                                        type="text" 
                                        value={qid} 
                                        onChange={e => setQid(e.target.value)} 
                                        placeholder="11-digit QID"
                                        required 
                                        className="w-full border p-2 rounded font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">WhatsApp / Mobile *</label>
                                    <input 
                                        type="text" 
                                        value={phone} 
                                        onChange={e => setPhone(e.target.value)} 
                                        placeholder="+974..."
                                        required 
                                        className="w-full border p-2 rounded"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Worker App Password *</label>
                                    <input 
                                        type="password" 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)} 
                                        required 
                                        className="w-full border p-2 rounded"
                                    />
                                </div>
                            </div>

                            <div className="pt-3 flex justify-end gap-2 border-t">
                                <button 
                                    type="button" 
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border rounded text-gray-600 text-xs font-bold hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={submitting}
                                    className="px-5 py-2 bg-[#dbb457] hover:bg-[#c29d45] text-white font-bold text-xs rounded transition-colors disabled:opacity-50"
                                >
                                    {submitting ? 'Enrolling...' : 'Enroll Worker'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
