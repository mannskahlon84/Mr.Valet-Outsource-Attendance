"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';

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
            await fetchApi(`/users/${userId}/admin-reset-password`, { method: 'POST' });
            alert("Password reset link generated (Check backend console for Dev Environment).");
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

    if (loading) return <div>Loading...</div>;

    const columns = [
        { header: 'Name', field: 'name' },
        { header: 'Email', field: 'email' },
        { header: 'Role', field: 'role' },
        { header: 'Status', field: (row: any) => <StatusBadge status={row.status} /> },
        { header: 'Actions', field: (row: any) => (
            <div className="space-x-2">
                <button onClick={() => openEdit(row)} className="text-blue-600 hover:underline">Edit</button>
                <button onClick={() => handleResetPassword(row.id)} className="text-orange-600 hover:underline">Reset Pwd</button>
            </div>
        )}
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800">System Users</h1>
                <button onClick={openAdd} className="bg-[#dbb457] text-white px-4 py-2 rounded hover:bg-[#c29d45] font-bold">+ Add New User</button>
            </div>
            
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">{editingUser ? 'Edit User' : 'Add New User'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                <input type="text" required value={name} onChange={e=>setName(e.target.value)} className="w-full border p-2 rounded mt-1" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                                <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full border p-2 rounded mt-1" />
                            </div>
                            {!editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Password</label>
                                    <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full border p-2 rounded mt-1" />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Role</label>
                                <select value={formRole} onChange={e=>setFormRole(e.target.value)} className="w-full border p-2 rounded mt-1">
                                    <option value="Super Admin">Super Admin</option>
                                    <option value="General Manager">General Manager</option>
                                    <option value="Operations Manager">Operations Manager</option>
                                    <option value="Supplier Head">Supplier Head</option>
                                    <option value="Accounting">Accounting</option>
                                </select>
                            </div>
                            {editingUser && (
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

            <DataTable columns={columns} data={users} keyField="id" />
        </div>
    );
}
