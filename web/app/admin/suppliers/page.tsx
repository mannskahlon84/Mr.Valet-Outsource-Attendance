"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';

import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import StatCard from '@/components/ui/StatCard';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { ui } from '@/lib/ui';
import { Building2, CheckCircle2, KeyRound, Mail, Pencil, Plus, Wallet } from 'lucide-react';
export default function Suppliers() {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    
    // Form state
    const [name, setName] = useState('');
    const [contact, setContact] = useState('');
    const [loginEmail, setLoginEmail] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState('active');
    const [billingRate, setBillingRate] = useState('0');

    const loadData = () => {
        fetchApi('/suppliers/')
            .then(setSuppliers)
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, []);

    const openAdd = () => {
        setEditingSupplier(null);
        setName('');
        setContact('');
        setLoginEmail('');
        setPassword('');
        setStatus('active');
        setBillingRate('0');
        setError('');
        setShowModal(true);
    };

    const openEdit = (s: any) => {
        setEditingSupplier(s);
        setName(s.name || ''); 
        setContact(s.contact_person || ''); 
        setLoginEmail(s.login_email || '');
        setPassword(''); // Blank means keep unchanged
        setStatus(s.status || 'active');
        setBillingRate(s.billing_rate ? s.billing_rate.toString() : '0');
        setError('');
        setShowModal(true);
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const body: any = { 
                name, 
                contact_person: contact, 
                status, 
                billing_rate: parseFloat(billingRate) || 0,
                login_email: loginEmail ? loginEmail.trim() : null
            };
            if (password && password.trim()) {
                body.password = password.trim();
            }

            if (editingSupplier) {
                await fetchApi(`/suppliers/${editingSupplier.id}`, { method: 'PUT', body: JSON.stringify(body) });
            } else {
                await fetchApi('/suppliers/', { method: 'POST', body: JSON.stringify(body) });
            }
            setShowModal(false);
            loadData();
        } catch (err: any) {
            setError(err.message || 'Failed to save supplier details');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <DashboardSkeleton cards={3} rows={6} />;

    const activeCount = suppliers.filter((s: any) => s.status === 'active').length;
    const rates = suppliers.map((s: any) => parseFloat(s.billing_rate)).filter((r: number) => !isNaN(r));
    const avgRate = rates.length ? rates.reduce((a: number, b: number) => a + b, 0) / rates.length : 0;

    const columns = [
        { 
            header: 'Supplier Name', 
            field: (row: any) => (
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#dbb457]/15 text-xs font-bold text-[#7a5f1f]">
                        {row.name.substring(0, 2).toUpperCase()}
                    </span>
                    <div>
                        <div className="font-semibold text-[#1a1a1a]">{row.name}</div>
                        <div className="text-[11px] text-[#1a1a1a]/40">Agency #{row.id}</div>
                    </div>
                </div>
            )
        },
        { 
            header: 'Portal Login Account', 
            field: (row: any) => (
                row.login_email ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f6f4ef] px-2.5 py-1 font-mono text-xs text-[#1a1a1a]/75">
                        <Mail className="h-3.5 w-3.5 text-[#1a1a1a]/40" />
                        {row.login_email}
                    </span>
                ) : (
                    <span className="text-xs italic text-amber-700">No login email configured</span>
                )
            ) 
        },
        { header: 'Contact Person', field: (row: any) => row.contact_person || '—' },
        { 
            header: 'Billing Rate', 
            field: (row: any) => (
                <span className="text-sm font-semibold tabular-nums text-[#1a1a1a]">
                    {row.billing_rate != null ? `QAR ${parseFloat(row.billing_rate).toFixed(2)}` : '—'}
                </span>
            ) 
        },
        { header: 'Status', field: (row: any) => <StatusBadge status={row.status} /> },
        { header: 'Actions', field: (row: any) => (
            <button onClick={() => openEdit(row)} className={ui.action}>
                <Pencil className="h-3.5 w-3.5" /> Edit & Login Access
            </button>
        )}
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Administration"
                title="Manpower Suppliers"
                subtitle="Manage approved vendor agencies and configure their supplier portal logins"
                actions={<button onClick={openAdd} className={ui.btnPrimary}><Plus className="h-4 w-4" /> Add New Supplier</button>}
            />

            <div className="mv-stagger grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Agencies" value={suppliers.length} hint="Registered outsourcing partners" icon={Building2} accent="ink" />
                <StatCard label="Active" value={activeCount} hint="Allowed to receive shift requests" icon={CheckCircle2} accent="green" />
                <StatCard label="Average Rate" value={avgRate} decimals={2} prefix="QAR " hint="Per completed shift" icon={Wallet} accent="gold" />
            </div>
            
            {showModal && (
                <Modal
                    title={editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Add New Supplier Agency'}
                    subtitle="Agency details, billing rate and portal login"
                    onClose={() => setShowModal(false)}
                    width="max-w-lg"
                >
                        {error && (
                            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                            <div>
                                <label className={ui.label}>Supplier Agency Name *</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    placeholder="e.g. Deepu, Kanan, Hanees..."
                                    className={ui.input} 
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className={ui.label}>Contact Person</label>
                                    <input 
                                        type="text" 
                                        value={contact} 
                                        onChange={e => setContact(e.target.value)} 
                                        placeholder="Agency Rep Name"
                                        className={ui.input} 
                                    />
                                </div>
                                <div>
                                    <label className={ui.label}>Billing Rate (QAR)</label>
                                    <input 
                                        type="number" 
                                        step="any" 
                                        required 
                                        value={billingRate} 
                                        onChange={e => setBillingRate(e.target.value)} 
                                        className={`${ui.input} tabular-nums`} 
                                    />
                                </div>
                            </div>

                            {/* CREDENTIALS SECTION */}
                            <div className="space-y-3 rounded-2xl border border-[#dbb457]/40 bg-[#dbb457]/[0.07] p-4">
                                <div className="flex items-start gap-3">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a] text-[#dbb457]">
                                        <KeyRound className="h-4 w-4" />
                                    </span>
                                    <div>
                                        <h4 className="text-sm font-semibold text-[#1a1a1a]">Supplier Portal Login</h4>
                                        <p className="text-[11px] text-[#1a1a1a]/55">
                                            The email and password this supplier uses to sign in to their agency dashboard.
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className={ui.label}>Login Email Address</label>
                                    <input 
                                        type="email" 
                                        value={loginEmail} 
                                        onChange={e => setLoginEmail(e.target.value)} 
                                        placeholder="supplier@example.com"
                                        className={ui.input} 
                                    />
                                </div>

                                <div>
                                    <label className={ui.label}>
                                        {editingSupplier ? 'New Password (leave blank to keep current)' : 'Login Password *'}
                                    </label>
                                    <input 
                                        type="password" 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)} 
                                        placeholder={editingSupplier ? "•••••••• (Leave blank to keep unchanged)" : "Minimum 8 characters"}
                                        className={ui.input} 
                                    />
                                </div>
                            </div>

                            {editingSupplier && (
                                <div>
                                    <label className={ui.label}>Agency Status</label>
                                    <select 
                                        value={status} 
                                        onChange={e => setStatus(e.target.value)} 
                                        className={ui.input}
                                    >
                                        <option value="active">Active (Permitted to deploy drivers)</option>
                                        <option value="inactive">Inactive (Suspended)</option>
                                    </select>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 border-t border-[#1a1a1a]/[0.06] pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className={ui.btnSecondary}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting} className={ui.btnPrimary}>
                                    {submitting ? 'Saving...' : 'Save Supplier'}
                                </button>
                            </div>
                        </form>
                </Modal>
            )}

            <DataTable columns={columns} data={suppliers} keyField="id" emptyText="No supplier agencies yet." />
        </div>
    );
}
