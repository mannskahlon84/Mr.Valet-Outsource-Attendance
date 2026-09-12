"use client";
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { fetchApi, broadcastPortalEvent } from '@/lib/api';
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
    const [sendingMsg, setSendingMsg] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'bids' | 'chat'>('bids');

    const loadData = async () => {
        try {
            const [allReqs, allSups, allSites, msgs, reqResponses] = await Promise.all([
                fetchApi('/requests/').catch(() => []),
                fetchApi('/suppliers/').catch(() => []),
                fetchApi('/sites/').catch(() => []),
                fetchApi(`/requests/${requestId}/messages`).catch(() => []),
                fetchApi(`/requests/${requestId}/responses`).catch(() => [])
            ]);

            const current = (allReqs || []).find((r: any) => r.id.toString() === requestId);
            setRequest(current);
            setSuppliers(allSups || []);
            setSites(allSites || []);
            setMessages(msgs || []);
            setResponses(reqResponses || []);
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

    if (loading) return <div className="p-8 text-center text-gray-500">Loading shift details...</div>;
    if (!request) return <div className="p-8 text-center text-red-500">Request #{requestId} not found.</div>;

    const site = sites.find(s => s.id === request.site_id);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black text-gray-900">Shift Request #{request.id}</h1>
                        <StatusBadge status={request.status} />
                    </div>
                    <p className="text-sm text-gray-500">
                        {site?.name || 'Location'} • {request.required_date ? new Date(request.required_date).toLocaleDateString() : '-'}
                    </p>
                </div>
                <Link href="/operations/requests" className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                    ← Back to Requests
                </Link>
            </div>

            {/* Shift Overview Banner */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <div className="text-xs font-bold uppercase text-gray-400">Target Location</div>
                    <div className="text-base font-bold text-gray-900 mt-1">{site?.name || `Site #${request.site_id}`}</div>
                    <div className="text-xs text-gray-500">{site?.address || '-'}</div>
                </div>
                <div>
                    <div className="text-xs font-bold uppercase text-gray-400">Shift Window</div>
                    <div className="text-base font-mono font-bold text-gray-900 mt-1">
                        {request.start_time} - {request.end_time}
                    </div>
                    <div className="text-xs text-gray-500">Scheduled duty hours</div>
                </div>
                <div>
                    <div className="text-xs font-bold uppercase text-gray-400">Required Headcount</div>
                    <div className="text-base font-black text-gray-900 mt-1">{request.total_required_workers} Drivers</div>
                    <div className="text-xs text-gray-500">{request.skill_category || 'Valet Driver'}</div>
                </div>
                <div>
                    <div className="text-xs font-bold uppercase text-gray-400">Created At</div>
                    <div className="text-base font-medium text-gray-900 mt-1">
                        {request.created_at ? new Date(request.created_at).toLocaleDateString() : '-'}
                    </div>
                    <div className="text-xs text-gray-500">{request.notes || 'No special notes'}</div>
                </div>
            </div>

            {/* Tab Navigation: Bids vs Chat */}
            <div className="flex border-b border-gray-200 space-x-6">
                <button 
                    onClick={() => setActiveTab('bids')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === 'bids' ? 'border-[#dbb457] text-[#dbb457]' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Supplier Bids & Allocations ({responses.length})
                </button>
                <button 
                    onClick={() => setActiveTab('chat')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === 'chat' ? 'border-[#dbb457] text-[#dbb457]' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Agency Negotiation Chat ({messages.length})
                </button>
            </div>

            {/* BIDS & ALLOCATIONS TAB */}
            {activeTab === 'bids' && (
                <div className="space-y-4">
                    <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 flex items-center justify-between">
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
                            <div key={resp.id} className={`bg-white p-5 rounded-xl shadow-sm border transition-all ${
                                isRejectedBySupplier ? 'border-rose-200 bg-rose-50/20' :
                                isAcceptedBySupplier ? 'border-emerald-200 bg-emerald-50/20' :
                                isCounterProposed ? 'border-amber-200 bg-amber-50/20' :
                                'border-gray-200'
                            }`}>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-black text-gray-900 text-base">{agencyName}</h3>
                                            {isAcceptedBySupplier && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                    ✓ Agency Approved ({resp.confirmed_quantity} Drivers)
                                                </span>
                                            )}
                                            {isRejectedBySupplier && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                                    ✕ Agency Declined
                                                </span>
                                            )}
                                            {isCounterProposed && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                                    ⚡ Counter-Offer ({resp.confirmed_quantity} Drivers)
                                                </span>
                                            )}
                                            {isFinalized && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-900 border border-green-300">
                                                    ✓ Shift Finalized
                                                </span>
                                            )}
                                            {isPending && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                    ⏳ Awaiting Response
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                                            <span>Target Quota: <b>{resp.requested_quantity} drivers</b></span>
                                            <span>Confirmed: <b className={resp.confirmed_quantity > 0 ? "text-emerald-700 font-bold" : "text-gray-500"}>{resp.confirmed_quantity || 0}</b></span>
                                            {resp.proposed_start_time && (
                                                <span>Hours: <b className="font-mono">{resp.proposed_start_time} - {resp.proposed_end_time}</b></span>
                                            )}
                                            {sup?.billing_rate && (
                                                <span>Billing: <b>QAR {sup.billing_rate}/hr</b></span>
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
                                            >
                                                <span>✓</span> Confirm & Finalize Allocation
                                            </button>
                                        )}
                                        {isFinalized && (
                                            <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                                                ✓ Shift Locked In
                                            </span>
                                        )}
                                        {isRejectedBySupplier && (
                                            <Link
                                                href={`/operations/requests/new?site_id=${request.site_id}&reallocate=true`}
                                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs px-3.5 py-2 rounded-lg transition-colors"
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
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center text-gray-400">
                            No agency responses recorded for this request yet.
                        </div>
                    )}
                </div>
            )}

            {/* CHAT TAB */}
            {activeTab === 'chat' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[500px]">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <div className="text-xs font-bold uppercase text-gray-500">Live Negotiation Thread</div>
                        <div className="text-xs text-gray-400">Auto-refreshes every 5s</div>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto space-y-3">
                        {messages.map((m) => (
                            <div 
                                key={m.id} 
                                className={`flex flex-col ${m.is_mine ? 'items-end' : 'items-start'}`}
                            >
                                <div className="text-[10px] text-gray-400 mb-0.5 px-1">{m.sender_name} • {new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                <div className={`p-3 rounded-xl max-w-md text-sm ${
                                    m.is_mine 
                                        ? 'bg-[#dbb457] text-white rounded-br-none' 
                                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                                }`}>
                                    {m.message}
                                </div>
                            </div>
                        ))}
                        {messages.length === 0 && (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                No messages yet. Send a message below to coordinate with the agencies.
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 flex gap-2">
                        <input 
                            type="text" 
                            value={newMsg} 
                            onChange={e => setNewMsg(e.target.value)}
                            placeholder="Type a message to supplier agencies..."
                            className="flex-1 border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#dbb457] focus:outline-none"
                        />
                        <button 
                            type="submit" 
                            disabled={sendingMsg || !newMsg.trim()}
                            className="bg-[#dbb457] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-[#c29d45] transition-colors disabled:opacity-50"
                        >
                            {sendingMsg ? '...' : 'Send'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
