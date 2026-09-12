"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function Locations() {
    const [sites, setSites] = useState<any[]>([]);
    const [managers, setManagers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingSite, setEditingSite] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    
    // QR Code Poster Modal State
    const [qrModalSite, setQrModalSite] = useState<any | null>(null);
    const [regeneratingQr, setRegeneratingQr] = useState(false);
    const [qrSuccessMsg, setQrSuccessMsg] = useState('');
    
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

    const openQrModal = (s: any) => {
        setQrModalSite(s);
        setQrSuccessMsg('');
    };

    const handleRegenerateQr = async (siteId: number) => {
        if (!confirm("Regenerating this QR Code will immediately deactivate any previously printed posters for this venue. Are you sure?")) {
            return;
        }
        setRegeneratingQr(true);
        setQrSuccessMsg('');
        try {
            const updated = await fetchApi(`/sites/${siteId}/qr`, { method: 'POST' });
            setQrModalSite(updated);
            setSites(prev => prev.map(s => s.id === siteId ? updated : s));
            setQrSuccessMsg('New Cryptographic QR Token generated successfully! Please print the updated poster.');
        } catch (err: any) {
            alert(err.message || 'Failed to regenerate QR code');
        } finally {
            setRegeneratingQr(false);
        }
    };

    const printPoster = () => {
        window.print();
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

    const filteredSites = sites.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.address && s.address.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) return <div className="p-8 text-gray-600 font-medium">Loading venues catalog...</div>;

    const currentQrToken = qrModalSite?.qr_token || `MC:LOC:${qrModalSite?.id}:token${qrModalSite?.id}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(currentQrToken)}`;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Location Registry & QR Geofencing</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage 82+ Qatar hotel & valet venues, configure GPS coordinates, and print attendance check-in QR posters.</p>
                </div>
                {role !== "General Manager" && (
                    <button 
                        onClick={openAdd} 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition text-sm flex items-center gap-2"
                    >
                        <span>+</span> Add New Location
                    </button>
                )}
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                <span className="text-gray-400 pl-2">🔍</span>
                <input 
                    type="text" 
                    placeholder="Search by hotel name or location..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full text-sm outline-none bg-transparent placeholder-gray-400 text-gray-800"
                />
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="text-xs text-gray-400 hover:text-gray-600 pr-2">Clear</button>
                )}
                <span className="text-xs font-semibold text-gray-400 whitespace-nowrap bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                    {filteredSites.length} of {sites.length} Venues
                </span>
            </div>

            {/* Location Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50/80">
                            <tr>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Venue Name</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">GPS Coordinates</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Geofence Radius</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">QR Code Status</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {filteredSites.map((s: any) => (
                                <tr key={s.id} className="hover:bg-slate-50/70 transition">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="font-bold text-gray-900">{s.name}</div>
                                        <div className="text-xs text-gray-400">{s.address || "Doha, Qatar"}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 font-mono">
                                        {s.latitude ? `${Number(s.latitude).toFixed(4)}, ${Number(s.longitude).toFixed(4)}` : "Not Configured"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-700">
                                        <span className="font-semibold text-gray-900">{s.geofence_radius_meters || 100}</span> meters
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg ${
                                            (s.qr_status || 'ACTIVE') === "ACTIVE" 
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                                : "bg-amber-50 text-amber-700 border border-amber-200"
                                        }`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                            {s.qr_status || "ACTIVE"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                                            s.status === "active" 
                                                ? "bg-blue-50 text-blue-700 border border-blue-200" 
                                                : "bg-red-50 text-red-700 border border-red-200"
                                        }`}>
                                            {s.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-3">
                                        <button 
                                            onClick={() => openQrModal(s)} 
                                            className="text-emerald-600 hover:text-emerald-800 font-bold hover:underline inline-flex items-center gap-1 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 hover:border-emerald-300 transition"
                                        >
                                            <span>📷</span> QR Poster
                                        </button>
                                        {role !== "General Manager" && (
                                            <button 
                                                onClick={() => openEdit(s)} 
                                                className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add / Edit Location Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
                        <h2 className="text-xl font-black text-gray-900 mb-1">{editingSite ? 'Edit Location' : 'Add New Location'}</h2>
                        <p className="text-xs text-gray-500 mb-4">Coordinates and geofence radius define the allowed check-in perimeter for valet staff.</p>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Site Name</label>
                                <input type="text" required value={name} onChange={e=>setName(e.target.value)} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Latitude</label>
                                    <input type="number" step="any" required value={lat} onChange={e=>setLat(e.target.value)} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Longitude</label>
                                    <input type="number" step="any" required value={lng} onChange={e=>setLng(e.target.value)} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Geofence Radius (meters)</label>
                                <input type="number" required value={radius} onChange={e=>setRadius(e.target.value)} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition" />
                                <span className="text-[11px] text-gray-400 mt-1 block">Staff farther than this radius will be rejected on check-in.</span>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Operations Manager (Optional)</label>
                                <select value={managerId} onChange={e=>setManagerId(e.target.value)} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition">
                                    <option value="">None / Unassigned</option>
                                    {managers.map((m: any) => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
                                </select>
                            </div>
                            {editingSite && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Status</label>
                                    <select value={status} onChange={e=>setStatus(e.target.value)} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition">
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            )}
                            <div className="flex justify-end space-x-2 mt-6 pt-2 border-t border-gray-100">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 font-bold transition">Cancel</button>
                                <button type="submit" disabled={submitting} className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-sm transition">{submitting ? 'Saving...' : 'Save Location'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* QR Code Poster & Generator Modal */}
            {qrModalSite && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 my-8">
                        {/* Printable Poster Section */}
                        <div id="printable-qr-poster" className="p-8 text-center bg-gradient-to-b from-slate-50 to-white">
                            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full text-indigo-700 text-xs font-bold tracking-wider uppercase mb-3">
                                <span>🛡️</span> Official Check-In Station
                            </div>
                            
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">{qrModalSite.name}</h2>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">{qrModalSite.address || "Doha, Qatar"}</p>

                            {/* QR Code Container */}
                            <div className="my-6 inline-block p-4 bg-white rounded-2xl border-2 border-dashed border-indigo-200 shadow-md">
                                <img 
                                    src={qrImageUrl} 
                                    alt={`QR Code for ${qrModalSite.name}`}
                                    className="w-56 h-56 mx-auto rounded-lg"
                                />
                                <div className="text-[10px] font-mono text-gray-400 mt-2 truncate max-w-[220px]">
                                    {currentQrToken}
                                </div>
                            </div>

                            {/* Verification Badges */}
                            <div className="grid grid-cols-2 gap-3 text-left bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm text-xs mb-4">
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase block">GPS Location</span>
                                    <span className="font-mono text-gray-800 font-semibold">{qrModalSite.latitude?.toFixed(4)}, {qrModalSite.longitude?.toFixed(4)}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Geofence Perimeter</span>
                                    <span className="font-bold text-gray-800">{qrModalSite.geofence_radius_meters || 100} meters radius</span>
                                </div>
                            </div>

                            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                                📌 <strong>Instructions for Valet Drivers:</strong> Open Worker Portal on your phone, scan this official QR Code, and take a live selfie inside this venue to clock in.
                            </p>

                            {qrSuccessMsg && (
                                <div className="mt-4 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
                                    {qrSuccessMsg}
                                </div>
                            )}
                        </div>

                        {/* Modal Action Controls */}
                        <div className="bg-slate-100/80 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <button
                                type="button"
                                disabled={regeneratingQr}
                                onClick={() => handleRegenerateQr(qrModalSite.id)}
                                className="text-xs text-red-600 hover:text-red-800 font-bold underline transition"
                            >
                                {regeneratingQr ? 'Generating...' : '🔄 Rotate / Regenerate QR Token'}
                            </button>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                <button
                                    type="button"
                                    onClick={() => setQrModalSite(null)}
                                    className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    onClick={printPoster}
                                    className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition flex items-center gap-1.5"
                                >
                                    <span>🖨️</span> Print Venue Poster
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
