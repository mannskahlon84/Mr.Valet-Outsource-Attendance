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

    const openAdd = async () => {
        setFirstName('');
        setLastName('');
        setInternalId('Loading series ID...');
        setQid('');
        setPhone('');
        setPassword('devpass123');
        setError('');
        setShowModal(true);

        try {
            const data = await fetchApi('/workers/next-id');
            if (data?.next_id) {
                setInternalId(data.next_id);
            }
        } catch (err) {
            console.error('Failed to fetch next worker ID', err);
        }
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
                    className="w-full sm:w-auto bg-[#dbb457] hover:bg-[#c29d45] text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow transition-colors text-center"
                >
                    + Enroll New Driver
                </button>
            </div>

            {/* Table & Mobile Cards */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Mobile Cards View (< md screens) */}
                <div className="md:hidden divide-y divide-gray-100 p-3 space-y-3">
                    {workers.map((w) => (
                        <div key={w.id} className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-900 shadow-sm">
                                    {w.internal_worker_id}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                    w.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                    {w.status}
                                </span>
                            </div>

                            <div>
                                <div className="font-black text-gray-900 text-sm">
                                    {w.first_name} {w.last_name}
                                </div>
                                <div className="text-xs text-gray-500 font-mono mt-0.5">
                                    QID: {w.qid || 'Not provided'}
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                {w.face_embedding ? (
                                    <span className="text-[11px] bg-green-50 text-green-700 border border-green-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        ✓ Face Registered
                                    </span>
                                ) : (
                                    <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        ⚠️ Needs First Selfie
                                    </span>
                                )}

                                {w.whatsapp_number && (
                                    <div className="flex items-center gap-2">
                                        <a 
                                            href={`https://wa.me/${w.whatsapp_number.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs font-bold bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded-lg shadow-sm transition-colors"
                                        >
                                            WhatsApp
                                        </a>
                                        <a 
                                            href={`tel:${w.whatsapp_number}`}
                                            className="text-xs font-bold bg-gray-200 hover:bg-gray-300 text-gray-800 px-2.5 py-1 rounded-lg transition-colors"
                                        >
                                            Call
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {workers.length === 0 && (
                        <div className="p-8 text-center text-xs text-gray-400">
                            No drivers registered yet. Tap "+ Enroll New Driver" above.
                        </div>
                    )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 my-8">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="font-bold text-lg text-gray-900">Enroll New Valet Driver</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1">✕</button>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg font-medium">{error}</div>
                        )}

                        <form onSubmit={handleCreateWorker} className="space-y-3 text-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">First Name *</label>
                                    <input 
                                        type="text" 
                                        value={firstName} 
                                        onChange={e => setFirstName(e.target.value)} 
                                        required 
                                        className="w-full border p-2.5 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Last Name *</label>
                                    <input 
                                        type="text" 
                                        value={lastName} 
                                        onChange={e => setLastName(e.target.value)} 
                                        required 
                                        className="w-full border p-2.5 rounded-lg text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-bold text-gray-600">Worker ID</label>
                                        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                            🔒 Auto Series
                                        </span>
                                    </div>
                                    <input 
                                        type="text" 
                                        value={internalId} 
                                        readOnly
                                        disabled
                                        aria-readonly="true"
                                        className="w-full border border-gray-300 bg-gray-100 text-gray-800 font-mono font-bold p-2.5 rounded-lg cursor-not-allowed select-none text-sm"
                                        title="Worker ID is automatically generated in sequential series and cannot be modified."
                                    />
                                    <p className="text-[10px] text-gray-400 mt-0.5">Auto-generated in series. Cannot be edited.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Qatar ID (QID) *</label>
                                    <input 
                                        type="text" 
                                        value={qid} 
                                        onChange={e => setQid(e.target.value)} 
                                        placeholder="11-digit QID"
                                        required 
                                        className="w-full border p-2.5 rounded-lg font-mono text-sm"
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
