"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { validateQatarIdClient } from '@/lib/qidValidator';

import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import StatCard from '@/components/ui/StatCard';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { ui } from '@/lib/ui';
import { AlertTriangle, Ban, Building2, CheckCircle2, Pencil, Smartphone, SmartphoneNfc, Trash2, UserPlus, Users } from 'lucide-react';
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
        setPassword(''); 
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

    const handleResetDevice = async (worker: any) => {
        const workerName = `${worker.first_name} ${worker.last_name}`.trim();
        const confirmReset = window.confirm(
            `Are you sure you want to reset the device binding for "${workerName}"?\n\nThis will allow them to log into the Worker App from a new mobile device.`
        );
        if (!confirmReset) return;

        try {
            const res = await fetchApi(`/workers/${worker.id}/reset-device`, { method: 'POST' });
            alert(res.message || `Device binding reset successfully.`);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to reset device binding.');
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

    if (loading) return <DashboardSkeleton cards={3} rows={8} />;

    const activeWorkers = workers.filter((w: any) => (w.status || 'active') === 'active').length;
    const boundDevices = workers.filter((w: any) => w.device_id).length;

    const columns = [
        { 
            header: 'Driver', 
            field: (row: any) => (
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f6f4ef] text-[11px] font-bold text-[#1a1a1a]/70">
                        {`${row.first_name?.[0] || ''}${row.last_name?.[0] || ''}`.toUpperCase()}
                    </span>
                    <div>
                        <div className="font-semibold text-[#1a1a1a]">{row.first_name} {row.last_name}</div>
                        <div className="font-mono text-[11px] text-[#1a1a1a]/45">{row.internal_worker_id}</div>
                    </div>
                </div>
            )
        },
        { 
            header: 'Supplier Agency', 
            field: (row: any) => {
                const sup = suppliers.find(s => s.id === row.supplier_id);
                const name = row.supplier_name || sup?.name || 'Direct Employee';
                return (
                    <div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dbb457]/15 px-2.5 py-1 text-xs font-semibold text-[#7a5f1f]">
                            <Building2 className="h-3.5 w-3.5" /> {name}
                        </span>
                        <div className="mt-1 text-[11px] text-[#1a1a1a]/45">by {row.supplier_head_name || 'Admin Provisioned'}</div>
                    </div>
                );
            }
        },
        { 
            header: 'QID / Mobile', 
            field: (row: any) => (
                <div className="font-mono text-xs">
                    <div className="font-semibold text-[#1a1a1a]/80">{row.qid || '—'}</div>
                    <div className="mt-0.5 text-[#1a1a1a]/50">{row.whatsapp_number || '—'}</div>
                </div>
            ) 
        },
        { header: 'Status', field: (row: any) => <StatusBadge status={row.status || 'active'} /> },
        { 
            header: 'Device', 
            field: (row: any) => (
                row.device_id ? (
                    <span title={row.device_id} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <SmartphoneNfc className="h-3.5 w-3.5" /> Locked
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a1a1a]/[0.04] px-2.5 py-1 text-xs font-medium text-[#1a1a1a]/45">
                        <Smartphone className="h-3.5 w-3.5" /> Unbound
                    </span>
                )
            ) 
        },
        { 
            header: 'Actions', 
            field: (row: any) => (
                <div className="flex flex-nowrap items-center gap-2">
                    <button onClick={() => openEdit(row)} className={ui.action}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button 
                        onClick={() => handleResetDevice(row)} 
                        className={ui.action}
                        title="Reset mobile device binding so they can log in from a new phone"
                    >
                        <Smartphone className="h-3.5 w-3.5" /> Reset Device
                    </button>
                    <button 
                        onClick={() => handleDelete(row)} 
                        className={ui.actionDanger}
                        title="Only Super Admin can delete employee from database to release QID for re-registration"
                    >
                        <Trash2 className="h-3.5 w-3.5" /> Delete & Release
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Administration"
                title="Total Workforce Directory"
                subtitle="All enrolled drivers. Only Super Admin can permanently delete a driver and release their QID."
                actions={<button onClick={openAdd} className={ui.btnPrimary}><UserPlus className="h-4 w-4" /> Add New Employee</button>}
            />

            <div className="mv-stagger grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Enrolled Drivers" value={workers.length} hint="Across every supplier agency" icon={Users} accent="ink" />
                <StatCard label="Active" value={activeWorkers} hint="Allowed to sign in and check in" icon={CheckCircle2} accent="green" />
                <StatCard label="Phones Bound" value={boundDevices} hint="Locked to their first sign-in device" icon={SmartphoneNfc} accent="gold" />
            </div>
            
            {showModal && (
                <Modal
                    title={editingWorker ? `Edit Employee: ${editingWorker.first_name} ${editingWorker.last_name}` : 'Enroll New Employee'}
                    subtitle="Driver identity, agency and app login"
                    onClose={() => setShowModal(false)}
                    width="max-w-lg"
                >
                        {error && (
                            <div className={`mb-4 rounded-xl border p-3.5 text-xs font-medium ${
                                error.includes('already registered') 
                                    ? 'border-rose-300 bg-rose-50 text-rose-900' 
                                    : 'border-rose-200 bg-rose-50 text-rose-700'
                            }`}>
                                <div className="flex items-start gap-2.5">
                                    {error.includes('already registered')
                                        ? <Ban className="mt-0.5 h-4 w-4 shrink-0" />
                                        : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                                    <div className="space-y-1">
                                        <div className="text-xs font-bold">
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
                                    <label className={ui.label}>Worker ID</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={internalId} 
                                        onChange={e=>setInternalId(e.target.value)} 
                                        className={`${ui.input} bg-[#f6f4ef] font-mono font-semibold`} 
                                    />
                                </div>
                                <div>
                                    <label className={ui.label}>Assign Supplier Agency *</label>
                                    <select 
                                        value={supplierId} 
                                        onChange={e=>setSupplierId(e.target.value)} 
                                        required 
                                        className={ui.input}
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
                                    <label className={ui.label}>First Name *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={firstName} 
                                        onChange={e=>setFirstName(e.target.value)} 
                                        className={ui.input} 
                                    />
                                </div>
                                <div>
                                    <label className={ui.label}>Last Name *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={lastName} 
                                        onChange={e=>setLastName(e.target.value)} 
                                        className={ui.input} 
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={ui.label}>Qatar ID (QID) *</label>
                                <input 
                                    type="text" 
                                    required 
                                    maxLength={11}
                                    value={qid} 
                                    onChange={e=>setQid(e.target.value.replace(/\D/g, ''))} 
                                    placeholder="11-digit Qatar ID (e.g. 295356...)"
                                    className={`${ui.input} font-mono tracking-wide`} 
                                />
                                {qid.length > 0 && (
                                    <div className={`mt-2 flex items-start gap-2 rounded-xl border p-2.5 text-xs ${
                                        qidValidation?.isValid 
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800' 
                                            : 'border-amber-200 bg-amber-50 text-amber-800'
                                    }`}>
                                        {qidValidation?.isValid
                                            ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                            : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                                        <div>
                                            <div className="font-semibold">
                                                {qidValidation?.isValid ? qidValidation.summary : qidValidation?.errorMessage}
                                            </div>
                                            {qidValidation?.isValid && (
                                                <div className="mt-0.5 text-[10px] text-emerald-600">
                                                    Qatar MOI verified format • Anti-bogus check passed
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className={ui.label}>Mobile / WhatsApp *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={mobile} 
                                        onChange={e=>setMobile(e.target.value)} 
                                        placeholder="+974..."
                                        className={ui.input} 
                                    />
                                </div>
                                <div>
                                    <label className={ui.label}>
                                        {editingWorker ? 'Reset App Password (blank to keep)' : 'Worker App Password *'}
                                    </label>
                                    <input 
                                        type="password" 
                                        required={!editingWorker} 
                                        value={password} 
                                        onChange={e=>setPassword(e.target.value)} 
                                        placeholder={editingWorker ? "••••••••" : "At least 8 characters, letters and numbers"}
                                        className={ui.input} 
                                    />
                                </div>
                            </div>

                            {editingWorker && (
                                <div>
                                    <label className={ui.label}>Status</label>
                                    <select 
                                        value={status} 
                                        onChange={e=>setStatus(e.target.value)} 
                                        className={ui.input}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 border-t border-[#1a1a1a]/[0.06] pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className={ui.btnSecondary}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting} className={ui.btnPrimary}>
                                    {submitting ? 'Saving...' : 'Save Employee'}
                                </button>
                            </div>
                        </form>
                </Modal>
            )}

            <DataTable columns={columns} data={workers} keyField="id" emptyText="No drivers enrolled yet." />
        </div>
    );
}
