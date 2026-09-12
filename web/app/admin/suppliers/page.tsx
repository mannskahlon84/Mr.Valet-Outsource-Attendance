"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';

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

    if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading suppliers roster...</div>;

    const columns = [
        { 
            header: 'Supplier Name', 
            field: (row: any) => (
                <div className="font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center text-xs font-black">
                        {row.name.substring(0, 2).toUpperCase()}
                    </span>
                    <div>
                        <div>{row.name}</div>
                        <div className="text-[11px] text-gray-400 font-normal">Agency #{row.id}</div>
                    </div>
                </div>
            )
        },
        { 
            header: 'Portal Login Account', 
            field: (row: any) => (
                row.login_email ? (
                    <div className="flex items-center gap-1.5 font-mono text-xs text-gray-800 bg-gray-50 px-2 py-1 rounded border border-gray-200 w-fit">
                        <span>✉️</span>
                        <span>{row.login_email}</span>
                    </div>
                ) : (
                    <span className="text-xs text-amber-600 italic">No login email configured</span>
                )
            ) 
        },
        { header: 'Contact Person', field: (row: any) => row.contact_person || '—' },
        { 
            header: 'Billing Rate', 
            field: (row: any) => (
                <span className="font-mono text-xs font-bold text-gray-700">
                    {row.billing_rate != null ? `QAR ${parseFloat(row.billing_rate).toFixed(2)}` : '—'}
                </span>
            ) 
        },
        { header: 'Status', field: (row: any) => <StatusBadge status={row.status} /> },
        { header: 'Actions', field: (row: any) => (
            <button 
                onClick={() => openEdit(row)} 
                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-2.5 py-1 rounded border border-blue-100"
            >
                Edit & Login Access
            </button>
        )}
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Manpower Suppliers</h1>
                    <p className="text-sm text-gray-500">Manage approved vendor agencies and configure their supplier portal logins</p>
                </div>
                <button 
                    onClick={openAdd} 
                    className="bg-[#dbb457] text-white px-5 py-2.5 rounded-lg hover:bg-[#c29d45] font-bold text-sm shadow transition-colors"
                >
                    + Add New Supplier
                </button>
            </div>
            
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg space-y-4 my-8">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h2 className="text-lg font-bold text-gray-900">
                                {editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Add New Supplier Agency'}
                            </h2>
                            <button 
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Supplier Agency Name *
                                </label>
                                <input 
                                    type="text" 
                                    required 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    placeholder="e.g. Deepu, Kanan, Hanees..."
                                    className="w-full border p-2.5 rounded-lg text-sm" 
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Contact Person
                                    </label>
                                    <input 
                                        type="text" 
                                        value={contact} 
                                        onChange={e => setContact(e.target.value)} 
                                        placeholder="Agency Rep Name"
                                        className="w-full border p-2.5 rounded-lg text-sm" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Billing Rate (QAR)
                                    </label>
                                    <input 
                                        type="number" 
                                        step="any" 
                                        required 
                                        value={billingRate} 
                                        onChange={e => setBillingRate(e.target.value)} 
                                        className="w-full border p-2.5 rounded-lg text-sm font-mono" 
                                    />
                                </div>
                            </div>

                            {/* CREDENTIALS SECTION */}
                            <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-base">🔐</span>
                                    <div>
                                        <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                                            Supplier Portal Login Credentials
                                        </h4>
                                        <p className="text-[11px] text-amber-700">
                                            Configure the email and password for this supplier to log into their agency dashboard.
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Login Email Address
                                    </label>
                                    <input 
                                        type="email" 
                                        value={loginEmail} 
                                        onChange={e => setLoginEmail(e.target.value)} 
                                        placeholder="supplier@example.com"
                                        className="w-full border p-2.5 rounded-lg text-sm font-mono bg-white" 
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        {editingSupplier ? 'New Password (leave blank to keep current)' : 'Login Password *'}
                                    </label>
                                    <input 
                                        type="password" 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)} 
                                        placeholder={editingSupplier ? "•••••••• (Leave blank to keep unchanged)" : "Minimum 8 characters"}
                                        className="w-full border p-2.5 rounded-lg text-sm font-mono bg-white" 
                                    />
                                </div>
                            </div>

                            {editingSupplier && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Agency Status
                                    </label>
                                    <select 
                                        value={status} 
                                        onChange={e => setStatus(e.target.value)} 
                                        className="w-full border p-2.5 rounded-lg text-sm bg-white"
                                    >
                                        <option value="active">Active (Permitted to deploy drivers)</option>
                                        <option value="inactive">Inactive (Suspended)</option>
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
                                    {submitting ? 'Saving...' : 'Save Supplier'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <DataTable columns={columns} data={suppliers} keyField="id" />
            </div>
        </div>
    );
}
