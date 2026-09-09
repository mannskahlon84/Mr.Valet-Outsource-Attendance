
"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '../../../lib/api';

export default function Users() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    
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

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800">System Users</h1>
                <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold">+ Add New User</button>
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
                                    <option value="ACCOUNTING">Accounting</option>
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((u: any) => (
                            <tr key={u.id}>
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{u.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{u.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{u.role}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 text-xs font-semibold rounded-full ${u.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{u.status}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                                    <button onClick={() => openEdit(u)} className="text-blue-600 hover:underline">Edit</button>
                                    <button onClick={() => handleResetPassword(u.id)} className="text-orange-600 hover:underline">Reset Pwd</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
