"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import Portal from '@/components/ui/Portal';
import StatusBadge from '@/components/ui/StatusBadge';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { ui } from '@/lib/ui';
import { Crosshair, MapPin, Pencil, Plus, Printer, QrCode, RefreshCw, Search, ShieldCheck, Smartphone, X } from 'lucide-react';

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
    useEffect(() => { setRole(sessionStorage.getItem('role') || ''); }, []);
    
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

    if (loading) return <DashboardSkeleton cards={0} rows={8} />;

    const currentQrToken = qrModalSite?.qr_token || `MC:LOC:${qrModalSite?.id}:token${qrModalSite?.id}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(currentQrToken)}`;

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Administration"
                title="Location Registry & QR Geofencing"
                subtitle="Qatar hotel & valet venues: GPS coordinates, check-in radius and printable QR posters"
                actions={role !== "General Manager" && (
                    <button onClick={openAdd} className={ui.btnPrimary}>
                        <Plus className="h-4 w-4" /> Add New Location
                    </button>
                )}
            />

            {/* Search Bar */}
            <div className={`${ui.card} flex items-center gap-3 px-4 py-3`}>
                <Search className="h-4 w-4 shrink-0 text-[#1a1a1a]/35" />
                <input 
                    type="text" 
                    placeholder="Search by hotel name or location..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-transparent text-sm text-[#1a1a1a] outline-none placeholder:text-[#1a1a1a]/35"
                />
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} aria-label="Clear search" className="rounded-lg p-1 text-[#1a1a1a]/40 hover:bg-[#1a1a1a]/5 hover:text-[#1a1a1a]">
                        <X className="h-4 w-4" />
                    </button>
                )}
                <span className="whitespace-nowrap rounded-full bg-[#f6f4ef] px-3 py-1 text-xs font-semibold text-[#1a1a1a]/60">
                    {filteredSites.length} of {sites.length} venues
                </span>
            </div>

            {/* Location Table */}
            <div className={`${ui.card} overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="border-b border-[#1a1a1a]/[0.06] bg-[#f6f4ef]/60">
                            <tr>
                                <th className={ui.th}>Venue Name</th>
                                <th className={ui.th}>GPS Coordinates</th>
                                <th className={ui.th}>Geofence Radius</th>
                                <th className={ui.th}>QR Code</th>
                                <th className={ui.th}>Status</th>
                                <th className={`${ui.th} text-right`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a1a1a]/[0.05]">
                            {filteredSites.map((s: any) => (
                                <tr key={s.id} className={ui.tr}>
                                    <td className="whitespace-nowrap px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1a1a1a] text-[#dbb457]">
                                                <MapPin className="h-4 w-4" strokeWidth={1.9} />
                                            </span>
                                            <div>
                                                <div className="font-semibold text-[#1a1a1a]">{s.name}</div>
                                                <div className="text-xs text-[#1a1a1a]/45">{s.address || "Doha, Qatar"}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-[#1a1a1a]/60">
                                        {s.latitude ? `${Number(s.latitude).toFixed(4)}, ${Number(s.longitude).toFixed(4)}` : "Not Configured"}
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-3.5 text-xs text-[#1a1a1a]/60">
                                        <span className="inline-flex items-center gap-1.5">
                                            <Crosshair className="h-3.5 w-3.5 text-[#1a1a1a]/35" />
                                            <span className="font-semibold text-[#1a1a1a]">{s.geofence_radius_meters || 100}</span> m
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-3.5">
                                        <StatusBadge status={s.qr_status || 'ACTIVE'} />
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-3.5">
                                        <StatusBadge status={s.status} />
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                                        <div className="inline-flex gap-2">
                                            <button onClick={() => openQrModal(s)} className={ui.actionGood}>
                                                <QrCode className="h-3.5 w-3.5" /> QR Poster
                                            </button>
                                            {role !== "General Manager" && (
                                                <button onClick={() => openEdit(s)} className={ui.action}>
                                                    <Pencil className="h-3.5 w-3.5" /> Edit
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredSites.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-[#1a1a1a]/45">No venues match your search.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add / Edit Location Modal */}
            {showModal && (
                <Modal
                    title={editingSite ? 'Edit Location' : 'Add New Location'}
                    subtitle="Coordinates and radius define where drivers may check in"
                    onClose={() => setShowModal(false)}
                >
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className={ui.label}>Site Name</label>
                                <input type="text" required value={name} onChange={e=>setName(e.target.value)} className={ui.input} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={ui.label}>Latitude</label>
                                    <input type="number" step="any" required value={lat} onChange={e=>setLat(e.target.value)} className={`${ui.input} tabular-nums`} />
                                </div>
                                <div>
                                    <label className={ui.label}>Longitude</label>
                                    <input type="number" step="any" required value={lng} onChange={e=>setLng(e.target.value)} className={`${ui.input} tabular-nums`} />
                                </div>
                            </div>
                            <div>
                                <label className={ui.label}>Geofence Radius (meters)</label>
                                <input type="number" required value={radius} onChange={e=>setRadius(e.target.value)} className={ui.input} />
                                <span className="mt-1 block text-[11px] text-[#1a1a1a]/45">Staff farther than this radius will be rejected on check-in.</span>
                            </div>
                            <div>
                                <label className={ui.label}>Operations Manager (Optional)</label>
                                <select value={managerId} onChange={e=>setManagerId(e.target.value)} className={ui.input}>
                                    <option value="">None / Unassigned</option>
                                    {managers.map((m: any) => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
                                </select>
                            </div>
                            {editingSite && (
                                <div>
                                    <label className={ui.label}>Status</label>
                                    <select value={status} onChange={e=>setStatus(e.target.value)} className={ui.input}>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            )}
                            <div className="flex justify-end gap-2 border-t border-[#1a1a1a]/[0.06] pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className={ui.btnSecondary}>Cancel</button>
                                <button type="submit" disabled={submitting} className={ui.btnPrimary}>{submitting ? 'Saving...' : 'Save Location'}</button>
                            </div>
                        </form>
                </Modal>
            )}

            {/* QR Code Poster & Generator Modal */}
            {qrModalSite && (
                <Portal>
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
                    <div className="mv-fade-in absolute inset-0 bg-[#1a1a1a]/60 backdrop-blur-sm" />
                    <div className="mv-pop relative my-8 w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
                        {/* Printable Poster Section */}
                        <div id="printable-qr-poster" className="bg-white p-8 text-center">
                            <img src="/logo.jpg" alt="Mr. Valet Parking Solutions" className="mx-auto h-10 w-auto" />
                            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dbb457]">
                                <ShieldCheck className="h-3.5 w-3.5" /> Official Check-In Station
                            </div>
                            
                            <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#1a1a1a]">{qrModalSite.name}</h2>
                            <p className="mt-0.5 text-xs text-[#1a1a1a]/50">{qrModalSite.address || "Doha, Qatar"}</p>

                            {/* QR Code Container */}
                            <div className="my-6 inline-block rounded-3xl bg-gradient-to-br from-[#dbb457] to-[#a8842f] p-[3px] shadow-lg">
                                <div className="rounded-[1.35rem] bg-white p-4">
                                    <img 
                                        src={qrImageUrl} 
                                        alt={`QR Code for ${qrModalSite.name}`}
                                        className="mx-auto h-56 w-56 rounded-lg"
                                    />
                                    <div className="mt-2 max-w-[220px] truncate font-mono text-[10px] text-[#1a1a1a]/35">
                                        {currentQrToken}
                                    </div>
                                </div>
                            </div>

                            {/* Verification Badges */}
                            <div className="mb-4 grid grid-cols-2 gap-3 rounded-2xl bg-[#f6f4ef] p-4 text-left text-xs">
                                <div>
                                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#1a1a1a]/40">GPS Location</span>
                                    <span className="font-mono font-semibold text-[#1a1a1a]/80">{qrModalSite.latitude?.toFixed(4)}, {qrModalSite.longitude?.toFixed(4)}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#1a1a1a]/40">Geofence Perimeter</span>
                                    <span className="font-semibold text-[#1a1a1a]/80">{qrModalSite.geofence_radius_meters || 100} meters radius</span>
                                </div>
                            </div>

                            <p className="mx-auto flex max-w-xs items-start gap-2 text-left text-xs leading-relaxed text-[#1a1a1a]/60">
                                <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-[#a8842f]" />
                                <span><strong className="text-[#1a1a1a]">Valet drivers:</strong> open the Worker Portal on your phone, scan this QR code, and take a live selfie inside this venue to clock in.</span>
                            </p>

                            {qrSuccessMsg && (
                                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                                    {qrSuccessMsg}
                                </div>
                            )}
                        </div>

                        {/* Modal Action Controls */}
                        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#1a1a1a]/[0.06] bg-[#f6f4ef]/70 px-6 py-4 sm:flex-row">
                            <button
                                type="button"
                                disabled={regeneratingQr}
                                onClick={() => handleRegenerateQr(qrModalSite.id)}
                                className={ui.actionDanger}
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${regeneratingQr ? 'animate-spin' : ''}`} />
                                {regeneratingQr ? 'Generating...' : 'Rotate / Regenerate QR Token'}
                            </button>

                            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                                <button type="button" onClick={() => setQrModalSite(null)} className={ui.btnSecondary}>
                                    Close
                                </button>
                                <button type="button" onClick={printPoster} className={ui.btnPrimary}>
                                    <Printer className="h-4 w-4" /> Print Venue Poster
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                </Portal>
            )}
        </div>
    );
}
