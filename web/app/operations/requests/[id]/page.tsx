"use client";
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { calendarDate, qatarDate, qatarTime } from '@/lib/time';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { fetchApi, tryFetch, broadcastPortalEvent } from '@/lib/api';
import LoadErrorBar from '@/components/ui/LoadErrorBar';
import StatusBadge from '@/components/ui/StatusBadge';

export default function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const requestId = resolvedParams.id;

    const [request, setRequest] = useState<any>(null);
    const [responses, setResponses] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMsg, setNewMsg] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [sendingMsg, setSendingMsg] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'bids' | 'chat'>('bids');
    // Cancelling asks for confirmation on the page itself
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [cancelMsg, setCancelMsg] = useState('');

    const loadData = async () => {
        try {
            let failure = '';
            const onError = (m: string) => { failure = m; };
            const [allReqs, allSups, allSites, msgs, reqResponses] = await Promise.all([
                tryFetch('/requests/', onError),
                tryFetch('/suppliers/'),
                tryFetch('/sites/'),
                tryFetch(`/requests/${requestId}/messages`),
                tryFetch(`/requests/${requestId}/responses`, onError)
            ]);

            // Only a successful answer can change what is shown; a failed refresh keeps the request
            if (Array.isArray(allReqs)) {
                const current = allReqs.find((r: any) => r.id.toString() === requestId)
                    ?? await tryFetch(`/requests/${requestId}`, onError);
                if (current) setRequest(current);
                else if (!failure) setRequest(undefined);
            }
            if (Array.isArray(allSups)) setSuppliers(allSups);
            if (Array.isArray(allSites)) setSites(allSites);
            if (Array.isArray(msgs)) setMessages(msgs);
            if (Array.isArray(reqResponses)) setResponses(reqResponses);
            setLoadError(failure);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const handleSync = () => loadData();
        window.addEventListener('portal_data_updated', handleSync);
        const timer = setInterval(() => {
            fetchApi(`/requests/${requestId}/messages`).then(setMessages).catch(() => {});
        }, 4000);
        return () => {
            window.removeEventListener('portal_data_updated', handleSync);
            clearInterval(timer);
        };
    }, [requestId]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMsg.trim()) return;
        setSendingMsg(true);
        try {
            await fetchApi(`/requests/${requestId}/messages`, {
                method: 'POST',
                body: JSON.stringify({ message: newMsg.trim() })
            });
            setNewMsg('');
            const msgs = await fetchApi(`/requests/${requestId}/messages`);
            setMessages(msgs || []);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSendingMsg(false);
        }
    };

    const handleFinalizeBid = async (responseId: number, qty: number, start: string, end: string) => {
        if (!confirm(`Finalize and accept this agency allocation for ${qty} workers?`)) return;
        setActionLoading(true);
        try {
            await fetchApi(`/requests/${requestId}/responses/${responseId}/finalize`, {
                method: 'PATCH',
                body: JSON.stringify({
                    accepted_quantity: qty,
                    accepted_start_time: start,
                    accepted_end_time: end
                })
            });
            broadcastPortalEvent('request_finalized', { requestId, responseId, qty });
            alert("Allocation accepted and shift finalized!");
            loadData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <DashboardSkeleton />;
    if (!request) return (
        <div className="p-8 space-y-4 text-center">
            <LoadErrorBar message={loadError} onRetry={loadData} />
            {!loadError && <div className="text-red-500">Request #{requestId} not found.</div>}
        </div>
    );

    const site = sites.find(s => s.id === request.site_id);

    const handleCancelRequest = async () => {
        setActionLoading(true);
        setCancelMsg('');
        try {
            const res = await fetchApi(`/requests/${requestId}/status?status=CANCELLED`, { method: 'PATCH' });
            setConfirmCancel(false);
            setCancelMsg(`Request cancelled. ${res?.released_assignments ? `${res.released_assignments} assigned driver(s) released. ` : ''}The agencies have been notified.`);
            broadcastPortalEvent('request_cancelled', { request_id: requestId });
            await loadData();
        } catch (err) {
            setCancelMsg((err instanceof Error && err.message) || 'Could not cancel the request.');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <LoadErrorBar message={loadError} onRetry={loadData} />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <div className="mv-eyebrow basis-full mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#a8842f]"><span className="h-px w-6 bg-[#dbb457]" />Operations</div>
                        <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight text-[#1a1a1a]">Shift Request #{request.id}</h1>
                        <StatusBadge status={request.status} />
                    </div>
                    <p className="text-sm text-[#1a1a1a]/55">
                        {site?.name || 'Location'} • {request.required_date ? calendarDate(request.required_date) : '-'}
                    </p>
                </div>
                <Link href="/operations/requests" className="text-sm text-[#1a1a1a]/55 hover:text-[#1a1a1a]/75 font-medium whitespace-nowrap">
                    ← Back to Requests
                </Link>
            </div>

            {request.status !== 'CANCELLED' && (
                <div className="flex flex-wrap items-center gap-2">
                    {!confirmCancel ? (
                        <button
                            type="button"
                            onClick={() => setConfirmCancel(true)}
                            className="min-h-[40px] px-4 rounded-lg border border-red-200 text-red-700 bg-white hover:bg-red-50 text-sm font-bold"
                        >
                            Cancel Request
                        </button>
                    ) : (
                        <div className="w-full rounded-2xl border border-red-200 bg-red-50 p-4 flex flex-wrap items-center gap-3">
                            <span className="text-sm text-red-900 flex-1 min-w-[200px]">
                                Cancel request #{request.id}? Assigned drivers are released and every agency is notified. This can&apos;t be undone.
                            </span>
                            <button type="button" disabled={actionLoading} onClick={handleCancelRequest}
                                className="min-h-[40px] px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-50">
                                {actionLoading ? 'Cancelling…' : 'Yes, cancel request'}
                            </button>
                            <button type="button" disabled={actionLoading} onClick={() => setConfirmCancel(false)}
                                className="min-h-[40px] px-4 rounded-lg border border-[#1a1a1a]/15 bg-white text-sm font-bold text-[#1a1a1a]/75">
                                Keep request
                            </button>
                        </div>
                    )}
                </div>
            )}
            {cancelMsg && (
                <div role="status" className="rounded-2xl border border-[#1a1a1a]/[0.08] bg-white px-4 py-3 text-sm text-[#1a1a1a]/85">{cancelMsg}</div>
            )}

            {/* Shift Overview Banner */}
            <div className="bg-white p-6 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08] grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Target Location</div>
                    <div className="text-base font-bold text-[#1a1a1a] mt-1">{site?.name || `Site #${request.site_id}`}</div>
                    <div className="text-xs text-[#1a1a1a]/55">{site?.address || '-'}</div>
                </div>
                <div>
                    <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Shift Window</div>
                    <div className="text-base font-mono font-bold text-[#1a1a1a] mt-1">
                        {request.start_time} - {request.end_time}
                    </div>
                    <div className="text-xs text-[#1a1a1a]/55">Scheduled duty hours</div>
                </div>
                <div>
                    <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Required Headcount</div>
                    <div className="text-base font-bold text-[#1a1a1a] mt-1">{request.total_required_workers} Drivers</div>
                    <div className="text-xs text-[#1a1a1a]/55">{request.skill_category || 'Valet Driver'}</div>
                </div>
                <div>
                    <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Created At</div>
                    <div className="text-base font-medium text-[#1a1a1a] mt-1">
                        {request.created_at ? qatarDate(request.created_at) : '-'}
                    </div>
                    <div className="text-xs text-[#1a1a1a]/55">{request.notes || 'No special notes'}</div>
                </div>
            </div>

            {/* Tab Navigation: Bids vs Chat */}
            <div className="flex border-b border-[#1a1a1a]/[0.08] space-x-6">
                <button 
                    onClick={() => setActiveTab('bids')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === 'bids' ? 'border-[#dbb457] text-[#a8842f]' : 'border-transparent text-[#1a1a1a]/55 hover:text-[#1a1a1a]/75'
                    }`}
                >
                    Supplier Bids & Allocations ({responses.length})
                </button>
                <button 
                    onClick={() => setActiveTab('chat')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === 'chat' ? 'border-[#dbb457] text-[#a8842f]' : 'border-transparent text-[#1a1a1a]/55 hover:text-[#1a1a1a]/75'
                    }`}
                >
                    Agency Negotiation Chat ({messages.length})
                </button>
            </div>

            {/* BIDS & ALLOCATIONS TAB */}
            {activeTab === 'bids' && (
                <div className="space-y-4">
                    <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 text-xs text-blue-800 flex items-center justify-between">
                        <div>
                            <b>Operations Quota Summary:</b> Total Required: <b>{request.total_required_workers} Drivers</b>
                            {' • '}
                            Assigned / Confirmed: <b className="text-emerald-700">{responses.filter((r: any) => ['ACCEPTED', 'ACCEPTED_BY_OM', 'CONFIRMED'].includes(r.status)).reduce((acc: number, r: any) => acc + (r.confirmed_quantity || 0), 0)} Drivers</b>
                        </div>
                        <span className="text-[11px] text-blue-600 font-medium">Real-time status updates from supplier agencies</span>
                    </div>

                    {responses.map((resp) => {
                        const sup = suppliers.find(s => s.id === resp.supplier_id);
                        const agencyName = resp.supplier_name || sup?.name || `Agency #${resp.supplier_id}`;
                        const isAcceptedBySupplier = resp.status === 'ACCEPTED';
                        const isRejectedBySupplier = resp.status === 'REJECTED';
                        const isCounterProposed = resp.status === 'COUNTER_PROPOSED';
                        const isFinalized = resp.status === 'ACCEPTED_BY_OM' || resp.status === 'CONFIRMED';
                        const isPending = resp.status === 'PENDING';

                        return (
                            <div key={resp.id} className={`bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border transition-all ${
                                isRejectedBySupplier ? 'border-rose-200 bg-rose-50/20' :
                                isAcceptedBySupplier ? 'border-emerald-200 bg-emerald-50/20' :
                                isCounterProposed ? 'border-amber-200 bg-amber-50/20' :
                                'border-[#1a1a1a]/[0.08]'
                            }`}>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-bold text-[#1a1a1a] text-base">{agencyName}</h3>
                                            {isAcceptedBySupplier && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                    Agency Approved ({resp.confirmed_quantity} Drivers)
                                                </span>
                                            )}
                                            {isRejectedBySupplier && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                                    Agency Declined
                                                </span>
                                            )}
                                            {isCounterProposed && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                                    Counter-Offer ({resp.confirmed_quantity} Drivers)
                                                </span>
                                            )}
                                            {isFinalized && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-900 border border-green-300">
                                                    Shift Finalized
                                                </span>
                                            )}
                                            {isPending && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#1a1a1a]/[0.05] text-[#1a1a1a]/65">
                                                    Awaiting Response
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-sm text-[#1a1a1a]/65 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                                            <span>Target Quota: <b>{resp.requested_quantity} drivers</b></span>
                                            <span>Confirmed: <b className={resp.confirmed_quantity > 0 ? "text-emerald-700 font-bold" : "text-[#1a1a1a]/55"}>{resp.confirmed_quantity || 0}</b></span>
                                            {resp.proposed_start_time && (
                                                <span>Hours: <b className="font-mono">{resp.proposed_start_time} - {resp.proposed_end_time}</b></span>
                                            )}
                                            {sup?.billing_rate && (
                                                <span>Billing: <b>QAR {sup.billing_rate}/shift</b></span>
                                            )}
                                        </div>

                                        {resp.supplier_message && (
                                            <div className={`text-xs p-2.5 rounded-lg mt-2 border ${
                                                isRejectedBySupplier 
                                                    ? 'bg-rose-50 border-rose-200 text-rose-900' 
                                                    : 'bg-amber-50 border-amber-200 text-amber-900'
                                            }`}>
                                                <span className="font-bold">{isRejectedBySupplier ? 'Decline Reason:' : 'Agency Note:'}</span> {resp.supplier_message}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 self-end md:self-center">
                                        {(isAcceptedBySupplier || isCounterProposed || (isPending && resp.confirmed_quantity > 0)) && !isFinalized && (
                                            <button 
                                                disabled={actionLoading}
                                                onClick={() => handleFinalizeBid(resp.id, resp.confirmed_quantity, resp.proposed_start_time || request.start_time, resp.proposed_end_time || request.end_time)}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow transition-colors flex items-center gap-1.5"
                                            > Confirm & Finalize Allocation
                                            </button>
                                        )}
                                        {isFinalized && (
                                            <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                                                Shift Locked In
                                            </span>
                                        )}
                                        {isRejectedBySupplier && (
                                            <Link
                                                href={`/operations/requests/new?site_id=${request.site_id}&reallocate=true`}
                                                className="bg-[#1a1a1a]/[0.05] hover:bg-[#1a1a1a]/[0.08] text-[#1a1a1a]/75 font-bold text-xs px-3.5 py-2 rounded-lg transition-colors"
                                            >
                                                Request Another Agency
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {responses.length === 0 && (
                        <div className="bg-white p-8 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08] text-center text-[#1a1a1a]/40">
                            No agency responses recorded for this request yet.
                        </div>
                    )}
                </div>
            )}

            {/* CHAT TAB */}
            {activeTab === 'chat' && (
                <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08] flex flex-col h-[500px]">
                    <div className="p-4 border-b border-[#1a1a1a]/[0.08] bg-[#f6f4ef]/60 flex justify-between items-center">
                        <div className="text-xs font-bold uppercase text-[#1a1a1a]/55">Live Negotiation Thread</div>
                        <div className="text-xs text-[#1a1a1a]/40">Auto-refreshes every 5s</div>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto space-y-3">
                        {messages.map((m) => (
                            <div 
                                key={m.id} 
                                className={`flex flex-col ${m.is_mine ? 'items-end' : 'items-start'}`}
                            >
                                <div className="text-[10px] text-[#1a1a1a]/40 mb-0.5 px-1">{m.sender_name} • {qatarTime(m.timestamp)}</div>
                                <div className={`p-3 rounded-2xl max-w-md text-sm ${
                                    m.is_mine 
                                        ? 'bg-[#1a1a1a] text-white rounded-br-none' 
                                        : 'bg-[#1a1a1a]/[0.05] text-[#1a1a1a]/85 rounded-bl-none'
                                }`}>
                                    {m.message}
                                </div>
                            </div>
                        ))}
                        {messages.length === 0 && (
                            <div className="h-full flex items-center justify-center text-[#1a1a1a]/40 text-sm">
                                No messages yet. Send a message below to coordinate with the agencies.
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSendMessage} className="p-3 border-t border-[#1a1a1a]/[0.08] flex gap-2">
                        <input 
                            type="text" 
                            value={newMsg} 
                            onChange={e => setNewMsg(e.target.value)}
                            placeholder="Type a message to supplier agencies..."
                            className="flex-1 border border-[#1a1a1a]/15 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#dbb457]/40 focus:outline-none"
                        />
                        <button 
                            type="submit" 
                            disabled={sendingMsg || !newMsg.trim()}
                            className="bg-[#1a1a1a] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-[#dbb457] hover:text-[#1a1a1a] transition-colors disabled:opacity-50"
                        >
                            {sendingMsg ? '...' : 'Send'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
