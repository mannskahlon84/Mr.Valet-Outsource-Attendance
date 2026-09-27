"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { ui, initials } from '@/lib/ui';
import { KeyRound, Pencil, UserPlus } from 'lucide-react';

export default function Users() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    
    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [formRole, setFormRole] = useState('Operations Manager');
    const [status, setStatus] = useState('active');

    const loadData = () => {
        fetchApi('/users/').then(setUsers).catch(console.error).finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, []);

    const openAdd = () => {
        setEditingUser(null);
        setName(''); setEmail(''); setPassword(''); setFormRole('Operations Manager'); setStatus('active');
        setShowModal(true);
    };

    const openEdit = (u: any) => {
        setEditingUser(u);
        setName(u.name || ''); setEmail(u.email || ''); setFormRole(u.role || 'Operations Manager'); setStatus(u.status || 'active');
        setShowModal(true);
    };

    const handleResetPassword = async (userId: number) => {
        if (!confirm("Generate a password reset link for this user?")) return;
        try {
            const res = await fetchApi(`/users/${userId}/admin-reset-password`, { method: 'POST' });
            alert(res?.message || "A password reset link was emailed to the user.");
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingUser) {
                await fetchApi(`/users/${editingUser.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ name, email, role: formRole, status })
                });
            } else {
                await fetchApi('/users/', {
                    method: 'POST',
                    body: JSON.stringify({ name, email, password, role: formRole })
                });
            }
            setShowModal(false);
            loadData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <DashboardSkeleton cards={0} rows={6} />;

    const columns = [
        { header: 'Name', field: (row: any) => (
            <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] text-[11px] font-bold text-[#dbb457]">{initials(row.name || row.email)}</span>
                <span className="font-semibold text-[#1a1a1a]">{row.name || '—'}</span>
            </div>
        ) },
        { header: 'Email', field: 'email' },
        { header: 'Role', field: (row: any) => <span className={ui.chip}>{row.role}</span> },
        { header: 'Status', field: (row: any) => <StatusBadge status={row.status} /> },
        { header: 'Actions', field: (row: any) => (
            <div className="flex gap-2">
                <button onClick={() => openEdit(row)} className={ui.action}><Pencil className="h-3.5 w-3.5" /> Edit</button>
                <button onClick={() => handleResetPassword(row.id)} className={ui.action}><KeyRound className="h-3.5 w-3.5" /> Reset password</button>
            </div>
        )}
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Administration"
                title="System Users"
                subtitle={`${users.length} staff accounts for the Mr. Valet portals`}
                actions={<button onClick={openAdd} className={ui.btnPrimary}><UserPlus className="h-4 w-4" /> Add New User</button>}
            />
            
            {showModal && (
                <Modal title={editingUser ? 'Edit User' : 'Add New User'} subtitle={editingUser ? editingUser.email : 'Create a portal login'} onClose={() => setShowModal(false)}>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className={ui.label}>Full Name</label>
                                <input type="text" required value={name} onChange={e=>setName(e.target.value)} className={ui.input} />
                            </div>
                            <div>
                                <label className={ui.label}>Email Address</label>
                                <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className={ui.input} />
                            </div>
                            {!editingUser && (
                                <div>
                                    <label className={ui.label}>Password</label>
                                    <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} className={ui.input} placeholder="At least 8 characters, letters and numbers" />
                                </div>
                            )}
                            <div>
                                <label className={ui.label}>Role</label>
                                <select value={formRole} onChange={e=>setFormRole(e.target.value)} className={ui.input}>
                                    <option value="Super Admin">Super Admin</option>
                                    <option value="General Manager">General Manager</option>
                                    <option value="Operations Manager">Operations Manager</option>
                                    <option value="Supplier Head">Supplier Head</option>
                                    <option value="Accounting">Accounting</option>
                                </select>
                            </div>
                            {editingUser && (
                                <div>
                                    <label className={ui.label}>Status</label>
                                    <select value={status} onChange={e=>setStatus(e.target.value)} className={ui.input}>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            )}
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className={ui.btnSecondary}>Cancel</button>
                                <button type="submit" disabled={submitting} className={ui.btnPrimary}>{submitting ? 'Saving...' : 'Save'}</button>
                            </div>
                        </form>
                </Modal>
            )}

            <DataTable columns={columns} data={users} keyField="id" emptyText="No users yet." />
        </div>
    );
}
