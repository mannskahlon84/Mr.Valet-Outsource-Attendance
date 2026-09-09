
"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '../../../lib/api';

export default function Locations() {
    const [sites, setSites] = useState<any[]>([]);
    const [managers, setManagers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSite, setEditingSite] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    
    const [role, setRole] = useState('');
    useEffect(() => { setRole(localStorage.getItem('role') || ''); }, []);
    
    // Form state
    const [name, setName] = useState('');
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');
    const [radius, setRadius] = useState('100');
    const [managerId, setManagerId] = useState('');
    const [status, setStatus] = useState('active');

    const loadData = () => {
        fetchApi('/sites/').then(setSites).finally(() => setLoading(false));
        fetchApi('/users/ops_managers').then(setManagers).catch(() => {});
    };

    useEffect(() => { loadData(); }, []);

    const openAdd = () => {
        setEditingSite(null);
        setName(''); setLat(''); setLng(''); setRadius('100'); setManagerId(''); setStatus('active');
        setShowModal(true);
    };

    const openEdit = (s: any) => {
        setEditingSite(s);
        setName(s.name || ''); 
        setLat(s.latitude ? s.latitude.toString() : ''); 
        setLng(s.longitude ? s.longitude.toString() : ''); 
        setRadius(s.geofence_radius_meters ? s.geofence_radius_meters.toString() : '100'); 
        setManagerId(s.manager_id ? s.manager_id.toString() : ''); 
        setStatus(s.status || 'active');
        setShowModal(true);
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const body = {
                name,
                latitude: parseFloat(lat),
                longitude: parseFloat(lng),
                geofence_radius_meters: parseInt(radius),
                manager_id: parseInt(managerId) || null,
                status
            };
            if (editingSite) {
                await fetchApi(`/sites/${editingSite.id}`, { method: 'PUT', body: JSON.stringify(body) });
            } else {
                await fetchApi('/sites/', { method: 'POST', body: JSON.stringify(body) });
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
                <h1 className="text-2xl font-bold text-gray-800">Locations</h1>
                {role !== "General Manager" && <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold">+ Add New Location</button>}
            </div>
            
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">{editingSite ? 'Edit Location' : 'Add New Location'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Site Name</label>
                                <input type="text" required value={name} onChange={e=>setName(e.target.value)} className="w-full border p-2 rounded mt-1" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">GPS Latitude</label>
                                    <input type="number" step="any" required value={lat} onChange={e=>setLat(e.target.value)} className="w-full border p-2 rounded mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">GPS Longitude</label>
                                    <input type="number" step="any" required value={lng} onChange={e=>setLng(e.target.value)} className="w-full border p-2 rounded mt-1" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Geofence Radius (meters)</label>
                                <input type="number" required value={radius} onChange={e=>setRadius(e.target.value)} className="w-full border p-2 rounded mt-1" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Ops Manager (Optional)</label>
                                <select value={managerId} onChange={e=>setManagerId(e.target.value)} className="w-full border p-2 rounded mt-1">
                                    <option value="">None</option>
                                    {managers.map((m: any) => <option key={m.id} value={m.id}>{m.email}</option>)}
                                </select>
                            </div>
                            {editingSite && (
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Site Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coordinates</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Geofence (m)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            {role !== "General Manager" && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sites.map((s: any) => (
                            <tr key={s.id}>
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{s.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{s.latitude}, {s.longitude}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{s.geofence_radius_meters}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 text-xs font-semibold rounded-full ${s.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{s.status}</span>
                                </td>
                                {role !== "General Manager" && (
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                                        <button onClick={() => openEdit(s)} className="text-blue-600 hover:underline">Edit</button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
