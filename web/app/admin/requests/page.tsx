"use client";
import { useEffect, useState } from 'react';
import { fetchApi, tryFetch } from '@/lib/api';
import LoadErrorBar from '@/components/ui/LoadErrorBar';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { ui } from '@/lib/ui';
import { CalendarDays, ClipboardList, MapPin, Plus, Trash2, Users, XCircle } from 'lucide-react';

export default function Requests() {
    const [requests, setRequests] = useState([]);
    const [sites, setSites] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [cancelling, setCancelling] = useState<number | null>(null);
    const [cancelMsg, setCancelMsg] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [role, setRole] = useState('');

    // Form state
    const [requestsList, setRequestsList] = useState([{
        siteId: '', reqDate: '', startTime: '08:00', endTime: '17:00', totalWorkers: '10', notes: '', supplierId: ''
    }]);
                    
    const cancelRequest = async (id: number) => {
        try {
            const res = await fetchApi(`/requests/${id}/status?status=CANCELLED`, { method: 'PATCH' });
            setCancelMsg(`REQ-${id} cancelled. ${res?.released_assignments ? `${res.released_assignments} driver(s) released. ` : ''}Agencies notified.`);
            loadData();
        } catch (err) {
            setCancelMsg((err instanceof Error && err.message) || 'Could not cancel the request.');
        } finally {
            setCancelling(null);
        }
    };

    const loadData = () => {
        // A failed refresh keeps the requests already on screen
        tryFetch<never[]>('/requests/', setLoadError).then(data => {
            if (Array.isArray(data)) { setRequests(data); setLoadError(''); }
        }).finally(() => setLoading(false));
        fetchApi('/sites/').then(setSites).catch(() => {});
        fetchApi('/suppliers/').then(setSuppliers).catch(() => {});
    };

    useEffect(() => {
        setRole(sessionStorage.getItem('role') || '');
        loadData();
    }, []);

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        try {
            for (const req of requestsList) {
                await fetchApi('/requests/', {
                    method: 'POST',
                    body: JSON.stringify({
                        site_id: parseInt(req.siteId),
                        required_date: req.reqDate,
                        start_time: req.startTime,
                        end_time: req.endTime,
                        total_required_workers: parseInt(req.totalWorkers),
                        notes: req.notes,
                        routes: [{supplier_id: parseInt(req.supplierId), requested_quantity: parseInt(req.totalWorkers)}]
                    })
                });
            }
            setShowModal(false);
            setRequestsList([{ siteId: '', reqDate: '', startTime: '08:00', endTime: '17:00', totalWorkers: '10', notes: '', supplierId: '' }]);
            setLoading(true);
            loadData();
        } catch (err: any) {
            alert(err.message);
        }
    };
    
    const updateReq = (index: number, field: keyof typeof requestsList[0], value: any) => {
        const newReqs = [...requestsList];
        newReqs[index][field] = value;
        setRequestsList(newReqs);
    };

    if (loading) return <DashboardSkeleton cards={0} rows={8} />;

    return (
        <div className="space-y-6">
            <LoadErrorBar message={loadError} onRetry={loadData} />
            {cancelMsg && <div role="status" className={`${ui.card} px-4 py-3 text-sm text-[#1a1a1a]/80`}>{cancelMsg}</div>}
            <PageHeader
                eyebrow="Administration"
                title="Manpower Requests"
                subtitle={`${requests.length} shift requests across all venues and agencies`}
                actions={role !== "General Manager" && role !== "Supplier Head" && (
                    <button onClick={() => setShowModal(true)} className={ui.btnPrimary}><Plus className="h-4 w-4" /> Create Request</button>
                )}
            />

            {showModal && (
                <Modal title="Create Manpower Request" subtitle="One or more shifts, each sent to one agency" onClose={() => setShowModal(false)} width="max-w-lg">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {requestsList.map((req, index) => (
                                <div key={index} className="rounded-2xl border border-[#1a1a1a]/[0.08] bg-[#f6f4ef]/60 p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1a1a1a]">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1a1a1a] text-[11px] text-[#dbb457]">{index + 1}</span>
                                            Request #{index + 1}
                                        </h3>
                                        {requestsList.length > 1 && (
                                            <button type="button" onClick={() => setRequestsList(requestsList.filter((_, i) => i !== index))} className={ui.actionDanger}><Trash2 className="h-3.5 w-3.5" /> Remove</button>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <label className={ui.label}>Location / Site</label>
                                            <select required value={req.siteId} onChange={e=>updateReq(index, 'siteId', e.target.value)} className={ui.input}>
                                                <option value="">Select Location</option>
                                                {sites.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={ui.label}>Required Date</label>
                                            <input type="date" required value={req.reqDate} onChange={e=>updateReq(index, 'reqDate', e.target.value)} className={ui.input} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={ui.label}>Shift Start</label>
                                                <input type="time" required value={req.startTime} onChange={e=>updateReq(index, 'startTime', e.target.value)} className={ui.input} />
                                            </div>
                                            <div>
                                                <label className={ui.label}>Shift End</label>
                                                <input type="time" required value={req.endTime} onChange={e=>updateReq(index, 'endTime', e.target.value)} className={ui.input} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={ui.label}>Number of Workers Required</label>
                                            <input type="number" required min="1" value={req.totalWorkers} onChange={e=>updateReq(index, 'totalWorkers', e.target.value)} className={ui.input} />
                                        </div>
                                        <div>
                                            <label className={ui.label}>Supplier</label>
                                            <select required value={req.supplierId} onChange={e=>updateReq(index, 'supplierId', e.target.value)} className={ui.input}>
                                                <option value="">Select Supplier</option>
                                                {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={ui.label}>Notes (Optional)</label>
                                            <textarea value={req.notes} onChange={e=>updateReq(index, 'notes', e.target.value)} className={ui.input} rows={2}></textarea>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={() => setRequestsList([...requestsList, { siteId: '', reqDate: '', startTime: '08:00', endTime: '17:00', totalWorkers: '10', notes: '', supplierId: '' }])} className={`${ui.btnSecondary} w-full border-dashed`}>
                                <Plus className="h-4 w-4" /> Add Another Request
                            </button>
                            <div className="flex justify-end gap-2 border-t border-[#1a1a1a]/[0.06] pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className={ui.btnSecondary}>Cancel</button>
                                <button type="submit" className={ui.btnPrimary}>Submit Request(s)</button>
                            </div>
                        </form>
                </Modal>
            )}

            <div className={`${ui.card} overflow-hidden`}>
                <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="border-b border-[#1a1a1a]/[0.06] bg-[#f6f4ef]/60">
                        <tr>
                            <th className={ui.th}>Req ID</th>
                            <th className={ui.th}>Site</th>
                            <th className={ui.th}>Date</th>
                            <th className={ui.th}>Required</th>
                            <th className={ui.th}>Status</th>
                            <th className={ui.th}>Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1a1a1a]/[0.05]">
                        {requests.map((r: any) => (
                            <tr key={r.id} className={ui.tr}>
                                <td className="whitespace-nowrap px-5 py-3.5 font-bold text-[#1a1a1a]">REQ-{r.id}</td>
                                <td className="whitespace-nowrap px-5 py-3.5">
                                    <span className="inline-flex items-center gap-2 font-medium text-[#1a1a1a]/80">
                                        <MapPin className="h-4 w-4 text-[#a8842f]" /> {r.site_name || `Site #${r.site_id}`}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5 text-[#1a1a1a]/60">
                                    <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-[#1a1a1a]/35" />{new Date(r.required_date).toLocaleDateString()}</span>
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-[#1a1a1a]">
                                    <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-[#1a1a1a]/35" />{r.total_required_workers}</span>
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5">
                                    <StatusBadge status={r.status} />
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5">
                                    {r.status !== 'CANCELLED' && (cancelling === r.id ? (
                                        <span className="inline-flex flex-wrap gap-2">
                                            <button type="button" onClick={() => cancelRequest(r.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">Yes, cancel</button>
                                            <button type="button" onClick={() => setCancelling(null)} className={ui.action}>Keep</button>
                                        </span>
                                    ) : (
                                        <button type="button" onClick={() => setCancelling(r.id)} className={ui.actionDanger}><XCircle className="h-3.5 w-3.5" /> Cancel</button>
                                    ))}
                                </td>
                            </tr>
                        ))}
                        {requests.length === 0 && (
                            <tr><td colSpan={6}>
                                <div className="flex flex-col items-center gap-2 py-12 text-center">
                                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f6f4ef] text-[#1a1a1a]/35"><ClipboardList className="h-5 w-5" /></span>
                                    <p className="text-sm text-[#1a1a1a]/45">No requests found.</p>
                                </div>
                            </td></tr>
                        )}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
}
