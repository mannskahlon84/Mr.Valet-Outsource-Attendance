"use client";
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { validateQatarIdClient } from '@/lib/qidValidator';

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
    const [password, setPassword] = useState('');

    const qidValidation = qid ? validateQatarIdClient(qid) : null;

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
        setPassword('');
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

        if (qidValidation && !qidValidation.isValid) {
            setError(qidValidation.errorMessage || "Please enter a valid Qatar ID (QID).");
            return;
        }

        setSubmitting(true);
        try {
            const body = {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                internal_worker_id: internalId,
                qid: qid.trim(),
                whatsapp_number: phone.trim(),
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

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="mv-eyebrow basis-full mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#a8842f]"><span className="h-px w-6 bg-[#dbb457]" />Supplier Agency</div>
                    <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight text-[#1a1a1a]">Agency Worker Roster</h1>
                    <p className="text-sm text-[#1a1a1a]/55">Manage drivers and attendants enrolled under your agency contract</p>
                </div>
                <button 
                    onClick={openAdd}
                    className="w-full sm:w-auto bg-[#1a1a1a] hover:bg-[#dbb457] hover:text-[#1a1a1a] text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow transition-colors text-center"
                >
                    + Enroll New Driver
                </button>
            </div>

            {/* Table & Mobile Cards */}
            <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08] overflow-hidden">
                {/* Mobile Cards View (< md screens) */}
                <div className="md:hidden divide-y divide-[#1a1a1a]/[0.05] p-3 space-y-3">
                    {workers.map((w) => (
                        <div key={w.id} className="bg-gray-50/70 p-4 rounded-2xl border border-gray-200/80 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-[#1a1a1a]/[0.08] text-[#1a1a1a] shadow-[0_1px_2px_rgb(26_26_26/0.04)]">
                                    {w.internal_worker_id}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                    w.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                    {w.status}
                                </span>
                            </div>

                            <div>
                                <div className="font-bold text-[#1a1a1a] text-sm">
                                    {w.first_name} {w.last_name}
                                </div>
                                <div className="text-xs text-[#1a1a1a]/55 font-mono mt-0.5">
                                    QID: {w.qid || 'Not provided'}
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                {w.face_embedding ? (
                                    <span className="text-[11px] bg-green-50 text-green-700 border border-green-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        Face Registered
                                    </span>
                                ) : (
                                    <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        Needs First Selfie
                                    </span>
                                )}

                                {w.whatsapp_number && (
                                    <div className="flex items-center gap-2">
                                        <a 
                                            href={`https://wa.me/${w.whatsapp_number.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs font-bold bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded-lg shadow-[0_1px_2px_rgb(26_26_26/0.04)] transition-colors"
                                        >
                                            WhatsApp
                                        </a>
                                        <a 
                                            href={`tel:${w.whatsapp_number}`}
                                            className="text-xs font-bold bg-[#1a1a1a]/[0.08] hover:bg-gray-300 text-[#1a1a1a]/85 px-2.5 py-1 rounded-lg transition-colors"
                                        >
                                            Call
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {workers.length === 0 && (
                        <div className="p-8 text-center text-xs text-[#1a1a1a]/40">
                            No drivers registered yet. Tap "+ Enroll New Driver" above.
                        </div>
                    )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#1a1a1a]/[0.06] text-sm">
                        <thead className="bg-[#f6f4ef]/60 text-[#1a1a1a]/55 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-5 py-3 text-left">Internal ID</th>
                                <th className="px-5 py-3 text-left">Driver Name</th>
                                <th className="px-5 py-3 text-left">QID Number</th>
                                <th className="px-5 py-3 text-left">WhatsApp / Phone</th>
                                <th className="px-5 py-3 text-left">Biometrics</th>
                                <th className="px-5 py-3 text-left">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a1a1a]/[0.06] bg-white">
                            {workers.map((w) => (
                                <tr key={w.id} className="hover:bg-[#f6f4ef]/60 transition-colors">
                                    <td className="px-5 py-4 font-mono font-bold text-[#1a1a1a]">{w.internal_worker_id}</td>
                                    <td className="px-5 py-4 font-bold text-[#1a1a1a]/85">
                                        {w.first_name} {w.last_name}
                                    </td>
                                    <td className="px-5 py-4 text-[#1a1a1a]/65 font-mono text-xs">{w.qid || '-'}</td>
                                    <td className="px-5 py-4 text-[#1a1a1a]/65">{w.whatsapp_number || '-'}</td>
                                    <td className="px-5 py-4">
                                        {w.face_embedding ? (
                                            <span className="text-xs bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded">
                                                Enrolled 
                                            </span>
                                        ) : (
                                            <span className="text-xs bg-[#1a1a1a]/[0.05] text-[#1a1a1a]/55 px-2 py-0.5 rounded">
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
                                    <td colSpan={6} className="px-5 py-8 text-center text-[#1a1a1a]/40">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1a1a1a]/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 my-8">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="font-bold text-lg text-[#1a1a1a]">Enroll New Valet Driver</h3>
                            <button onClick={() => setShowModal(false)} className="text-[#1a1a1a]/40 hover:text-[#1a1a1a]/65 text-xl font-bold p-1"></button>
                        </div>

                        {error && (
                            <div className={`p-3.5 rounded-2xl text-xs font-medium border ${
                                error.includes('already registered') 
                                    ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-[0_1px_2px_rgb(26_26_26/0.04)]' 
                                    : 'bg-red-50 border-red-200 text-red-700'
                            }`}>
                                <div className="flex items-start gap-2.5">
                                    <span className="text-lg leading-none mt-0.5">
                                        {error.includes('already registered') ? '' : ''}
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

                        <form onSubmit={handleCreateWorker} className="space-y-3 text-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-[#1a1a1a]/65 mb-1">First Name *</label>
                                    <input 
                                        type="text" 
                                        value={firstName} 
                                        onChange={e => setFirstName(e.target.value)} 
                                        required 
                                        className="w-full border p-2.5 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#1a1a1a]/65 mb-1">Last Name *</label>
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
                                        <label className="block text-xs font-bold text-[#1a1a1a]/65">Worker ID</label>
                                        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                            Auto Series
                                        </span>
                                    </div>
                                    <input 
                                        type="text" 
                                        value={internalId} 
                                        readOnly
                                        disabled
                                        aria-readonly="true"
                                        className="w-full border border-[#1a1a1a]/15 bg-[#1a1a1a]/[0.05] text-[#1a1a1a]/85 font-mono font-bold p-2.5 rounded-lg cursor-not-allowed select-none text-sm"
                                        title="Worker ID is automatically generated in sequential series and cannot be modified."
                                    />
                                    <p className="text-[10px] text-[#1a1a1a]/40 mt-0.5">Auto-generated in series. Cannot be edited.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#1a1a1a]/65 mb-1">Qatar ID (QID) *</label>
                                    <input 
                                        type="text" 
                                        value={qid} 
                                        maxLength={11}
                                        onChange={e => setQid(e.target.value.replace(/\D/g, ''))} 
                                        placeholder="11-digit QID (e.g. 295356...)"
                                        required 
                                        className="w-full border p-2.5 rounded-lg font-mono text-sm tracking-wide"
                                    />
                                    {qid.length > 0 && (
                                        <div className={`mt-1.5 p-2 rounded-lg text-xs flex items-start gap-1.5 ${
                                            qidValidation?.isValid 
                                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                                                : 'bg-amber-50 border border-amber-200 text-amber-800'
                                        }`}>
                                            <span className="text-sm leading-none mt-0.5">{qidValidation?.isValid ? '' : ''}</span>
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
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-[#1a1a1a]/65 mb-1">WhatsApp / Mobile *</label>
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
                                    <label className="block text-xs font-bold text-[#1a1a1a]/65 mb-1">Worker App Password *</label>
                                    <input 
                                        type="password" 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)} 
                                        required 
                                        minLength={8}
                                        placeholder="At least 8 characters, letters and numbers"
                                        className="w-full border p-2 rounded"
                                    />
                                </div>
                            </div>

                            <div className="pt-3 flex justify-end gap-2 border-t">
                                <button 
                                    type="button" 
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border rounded text-[#1a1a1a]/65 text-xs font-bold hover:bg-[#f6f4ef]/60"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={submitting}
                                    className="px-5 py-2 bg-[#1a1a1a] hover:bg-[#dbb457] hover:text-[#1a1a1a] text-white font-bold text-xs rounded transition-colors disabled:opacity-50"
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
