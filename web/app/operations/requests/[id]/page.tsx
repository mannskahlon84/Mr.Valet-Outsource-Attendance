"use client";
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
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
            const [allReqs, allSups, allSites, msgs] = await Promise.all([
                fetchApi('/requests/').catch(() => []),
                fetchApi('/suppliers/').catch(() => []),
                fetchApi('/sites/').catch(() => []),
                fetchApi(`/requests/${requestId}/messages`).catch(() => [])
            ]);

            const current = (allReqs || []).find((r: any) => r.id.toString() === requestId);
            setRequest(current);
            setSuppliers(allSups || []);
            setSites(allSites || []);
            setMessages(msgs || []);

            // Also fetch supplier responses for this request if available
            // In backend, allocations or responses can be queried
            const allocs = await fetchApi('/allocations/').catch(() => []);
            const reqResponses = (allocs || []).filter((a: any) => a.manpower_request_id.toString() === requestId);
            setResponses(reqResponses);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const timer = setInterval(() => {
            fetchApi(`/requests/${requestId}/messages`).then(setMessages).catch(() => {});
        }, 5000);
        return () => clearInterval(timer);
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
        if (!confirm(`Finalize and accept this agency proposal for ${qty} workers?`)) return;
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
            alert("Bid accepted and shift finalized!");
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

            {/* BIDS TAB */}
            {activeTab === 'bids' && (
                <div className="space-y-4">
                    {responses.map((resp) => {
                        const sup = suppliers.find(s => s.id === resp.supplier_id);
                        const isPending = resp.status === 'PENDING';
                        const isAccepted = resp.status === 'ACCEPTED_BY_OM';

                        return (
                            <div key={resp.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-bold text-gray-900 text-base">{sup?.name || `Agency #${resp.supplier_id}`}</h3>
                                        <StatusBadge status={resp.status} />
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                        <span>Requested: <b>{resp.requested_quantity}</b></span>
                                        <span>Confirmed: <b className="text-green-700">{resp.confirmed_quantity || 0}</b></span>
                                        {resp.proposed_start_time && (
                                            <span>Proposed Window: <b className="font-mono">{resp.proposed_start_time} - {resp.proposed_end_time}</b></span>
                                        )}
                                        {sup?.billing_rate && (
                                            <span>Rate: <b>QAR {sup.billing_rate}/hr</b></span>
                                        )}
                                    </div>
                                    {resp.supplier_message && (
                                        <p className="text-xs bg-amber-50 text-amber-900 p-2 rounded mt-2 border border-amber-200">
                                            <b>Agency Note:</b> "{resp.supplier_message}"
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {isPending && resp.confirmed_quantity > 0 && (
                                        <button 
                                            disabled={actionLoading}
                                            onClick={() => handleFinalizeBid(resp.id, resp.confirmed_quantity, resp.proposed_start_time || request.start_time, resp.proposed_end_time || request.end_time)}
                                            className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow transition-colors"
                                        >
                                            Accept & Finalize Bid
                                        </button>
                                    )}
                                    {isAccepted && (
                                        <span className="text-xs text-green-700 font-bold bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                                            ✓ Confirmed on Shift
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {responses.length === 0 && (
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center text-gray-400">
                            No supplier responses recorded for this request yet.
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
