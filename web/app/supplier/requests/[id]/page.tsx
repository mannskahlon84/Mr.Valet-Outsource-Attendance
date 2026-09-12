"use client";
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { fetchApi, broadcastPortalEvent } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';

export default function SupplierRequestDetail({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const requestId = resolvedParams.id;

    const [request, setRequest] = useState<any>(null);
    const [sites, setSites] = useState<any[]>([]);
    const [myResponse, setMyResponse] = useState<any>(null);
    const [workers, setWorkers] = useState<any[]>([]);
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<number[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMsg, setNewMsg] = useState('');
    const [loading, setLoading] = useState(true);
    const [submittingResp, setSubmittingResp] = useState(false);
    const [submittingAlloc, setSubmittingAlloc] = useState(false);
    const [sendingMsg, setSendingMsg] = useState(false);
    const [activeTab, setActiveTab] = useState<'response' | 'assign' | 'chat'>('response');

    // Response form state
    const [confirmedQty, setConfirmedQty] = useState('');
    const [proposedStart, setProposedStart] = useState('');
    const [proposedEnd, setProposedEnd] = useState('');
    const [agencyNotes, setAgencyNotes] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);

    const loadData = async () => {
        try {
            const [allReqs, allSites, myResponses, myWorkers, msgs] = await Promise.all([
                fetchApi('/requests/supplier').catch(() => fetchApi('/requests/').catch(() => [])),
                fetchApi('/sites/').catch(() => []),
                fetchApi('/requests/supplier-responses').catch(() => []),
                fetchApi('/workers/').catch(() => []),
                fetchApi(`/requests/${requestId}/messages`).catch(() => [])
            ]);

            let current = (allReqs || []).find((r: any) => r.id.toString() === requestId);
            if (!current) {
                current = await fetchApi(`/requests/${requestId}`).catch(() => null);
            }
            setRequest(current);
            setSites(allSites || []);
            setWorkers(myWorkers || []);
            setMessages(msgs || []);

            const resp = (myResponses || []).find((r: any) => r.manpower_request_id?.toString() === requestId || r.request_id?.toString() === requestId);
            setMyResponse(resp);

            const defaultQuota = resp?.requested_quantity || current?.requested_quantity || current?.total_required_workers || '1';

            if (resp) {
                setConfirmedQty(resp.confirmed_quantity !== null && resp.confirmed_quantity !== undefined ? resp.confirmed_quantity.toString() : defaultQuota.toString());
                setProposedStart(resp.proposed_start_time || current?.start_time || '08:00');
                setProposedEnd(resp.proposed_end_time || current?.end_time || '17:00');
                setAgencyNotes(resp.supplier_message || '');
            } else if (current) {
                setConfirmedQty(defaultQuota.toString());
                setProposedStart(current.start_time || '08:00');
                setProposedEnd(current.end_time || '17:00');
            }
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

    const handleActionResponse = async (status: 'ACCEPTED' | 'REJECTED' | 'COUNTER_PROPOSED') => {
        setSubmittingResp(true);
        try {
            const quotaNeeded = request?.requested_quantity || request?.total_required_workers || 1;
            let qty = parseInt(confirmedQty) || 0;
            if (status === 'ACCEPTED') {
                qty = quotaNeeded;
            } else if (status === 'REJECTED') {
                qty = 0;
            }

            const body = {
                confirmed_quantity: qty,
                proposed_start_time: proposedStart || request?.start_time || '08:00',
                proposed_end_time: proposedEnd || request?.end_time || '17:00',
                supplier_message: status === 'REJECTED' ? (rejectReason || 'Agency cannot supply requested quota') : agencyNotes,
                status: status
            };

            await fetchApi(`/requests/${requestId}/respond`, {
                method: 'PATCH',
                body: JSON.stringify(body)
            });

            broadcastPortalEvent('supplier_response_updated', {
                requestId: request.id,
                status,
                siteName: request.site_name || site?.name,
                supplierMessage: body.supplier_message
            });

            setShowRejectModal(false);
            alert(`Request successfully marked as ${status}! Operations has been notified.`);
            loadData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSubmittingResp(false);
        }
    };

    const handleSendProposal = async (e: React.FormEvent) => {
        e.preventDefault();
        await handleActionResponse('COUNTER_PROPOSED');
    };

    const handleAllocateWorkers = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!myResponse) return;
        if (selectedWorkerIds.length === 0) return alert("Please select at least one worker to assign.");

        setSubmittingAlloc(true);
        try {
            await fetchApi(`/allocations/${myResponse.id}/allocate-workers`, {
                method: 'POST',
                body: JSON.stringify({ worker_ids: selectedWorkerIds })
            });

            alert(`${selectedWorkerIds.length} worker(s) successfully assigned to this shift!`);
            loadData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSubmittingAlloc(false);
        }
    };

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

    const toggleWorkerSelect = (id: number) => {
        if (selectedWorkerIds.includes(id)) {
            setSelectedWorkerIds(selectedWorkerIds.filter(wId => wId !== id));
        } else {
            setSelectedWorkerIds([...selectedWorkerIds, id]);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading request details...</div>;
    if (!request) return <div className="p-8 text-center text-red-500">Shift request #{requestId} not found.</div>;

    const site = sites.find(s => s.id === request.site_id) || { name: request.site_name, address: request.site_address };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black text-gray-900">Shift Request #{request.id}</h1>
                        <StatusBadge status={myResponse?.status || request.status} />
                    </div>
                    <p className="text-sm text-gray-500">
                        {site?.name || 'Location'} • {request.required_date ? new Date(request.required_date).toLocaleDateString() : '-'}
                    </p>
                </div>
                <Link href="/supplier/requests" className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                    ← Back to Shift Requests
                </Link>
            </div>

            {/* Shift Overview Banner */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <div className="text-xs font-bold uppercase text-gray-400">Target Location</div>
                    <div className="text-base font-bold text-gray-900 mt-1">{request.site_name || site?.name || `Site #${request.site_id}`}</div>
                    <div className="text-xs text-gray-500">{request.site_address || site?.address || 'Qatar'}</div>
                </div>
                <div>
                    <div className="text-xs font-bold uppercase text-gray-400">Operations Manager</div>
                    <div className="text-base font-bold text-gray-900 mt-1">{request.ops_manager_name || 'Operations Lead'}</div>
                    <div className="text-xs text-gray-500">Requesting Authority</div>
                </div>
                <div>
                    <div className="text-xs font-bold uppercase text-gray-400">Scheduled Hours</div>
                    <div className="text-base font-mono font-bold text-gray-900 mt-1">
                        {request.start_time} - {request.end_time}
                    </div>
                    <div className="text-xs text-gray-500">{request.required_date ? new Date(request.required_date).toLocaleDateString() : 'Shift Date'}</div>
                </div>
                <div>
                    <div className="text-xs font-bold uppercase text-gray-400">Requested for Your Agency</div>
                    <div className="text-base font-black text-[#dbb457] mt-1">
                        {request.requested_quantity || request.total_required_workers} Drivers
                    </div>
                    <div className="text-xs text-gray-500">
                        Status: <span className="font-semibold">{myResponse?.status || 'ACTION REQUIRED'}</span>
                    </div>
                </div>
            </div>

            {/* Quick Action Decision Banner if Pending */}
            {(!myResponse || myResponse.status === 'PENDING') && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 className="text-base font-bold text-amber-900">Action Required: Approve or Decline Shift Request</h3>
                        <p className="text-xs text-amber-700 mt-0.5">
                            {request.ops_manager_name || 'Operations Manager'} is waiting for your confirmation for {request.requested_quantity || request.total_required_workers} drivers at <b>{request.site_name || site?.name}</b>.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            type="button"
                            onClick={() => handleActionResponse('ACCEPTED')}
                            disabled={submittingResp}
                            className="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-2.5 rounded-lg shadow transition-colors flex items-center justify-center gap-2"
                        >
                            <span>✓</span> Approve Quota ({request.requested_quantity || request.total_required_workers} Drivers)
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowRejectModal(true)}
                            disabled={submittingResp}
                            className="flex-1 md:flex-initial bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-sm px-5 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <span>✕</span> Reject
                        </button>
                    </div>
                </div>
            )}

            {/* Status Callout if already resolved */}
            {myResponse && myResponse.status !== 'PENDING' && (
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    myResponse.status === 'ACCEPTED' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
                    myResponse.status === 'REJECTED' ? 'bg-rose-50 border-rose-200 text-rose-900' :
                    'bg-blue-50 border-blue-200 text-blue-900'
                }`}>
                    <div className="text-sm">
                        <b>Current Response: {myResponse.status}</b>
                        {myResponse.status === 'ACCEPTED' && ` • Supplying ${myResponse.confirmed_quantity} drivers.`}
                        {myResponse.status === 'REJECTED' && ` • Reason: ${myResponse.supplier_message || 'Shift declined by agency'}`}
                        {myResponse.status === 'COUNTER_PROPOSED' && ` • Proposed ${myResponse.confirmed_quantity} drivers (${myResponse.proposed_start_time} - ${myResponse.proposed_end_time}).`}
                    </div>
                    <button
                        type="button"
                        onClick={() => setActiveTab('response')}
                        className="text-xs font-bold underline hover:opacity-80"
                    >
                        Modify Response
                    </button>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">Decline Shift Request</h3>
                            <button onClick={() => setShowRejectModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
                        </div>
                        <p className="text-xs text-gray-500">
                            Let Operations know why your agency cannot supply staff for this shift. This will instantly notify the Operations Manager.
                        </p>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase text-gray-600">Quick Reason</label>
                            <div className="flex flex-wrap gap-2">
                                {['No drivers available', 'Shift time conflict', 'Notice too short', 'Location outside coverage'].map(reason => (
                                    <button
                                        key={reason}
                                        type="button"
                                        onClick={() => setRejectReason(reason)}
                                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                                            rejectReason === reason ? 'bg-rose-50 border-rose-400 text-rose-800 font-bold' : 'bg-gray-50 border-gray-200 text-gray-700'
                                        }`}
                                    >
                                        {reason}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Reason / Notes</label>
                            <textarea
                                rows={3}
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="Explain reason for rejecting this request..."
                                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowRejectModal(false)}
                                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleActionResponse('REJECTED')}
                                disabled={submittingResp}
                                className="px-5 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow transition-colors disabled:opacity-50"
                            >
                                {submittingResp ? 'Submitting...' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 space-x-6">
                <button 
                    onClick={() => setActiveTab('response')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === 'response' ? 'border-[#dbb457] text-[#dbb457]' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    1. Submit / Counter-Proposal
                </button>
                <button 
                    onClick={() => setActiveTab('assign')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === 'assign' ? 'border-[#dbb457] text-[#dbb457]' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    2. Assign Drivers to Shift
                </button>
                <button 
                    onClick={() => setActiveTab('chat')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === 'chat' ? 'border-[#dbb457] text-[#dbb457]' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    3. Chat with Operations ({messages.length})
                </button>
            </div>

            {/* TAB 1: RESPONSE FORM */}
            {activeTab === 'response' && (
                <form onSubmit={handleSendProposal} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-base text-gray-900">Custom Counter-Offer or Partial Quota</h3>
                            <p className="text-xs text-gray-500">If you cannot provide the full quota or need to adjust times, propose your terms here.</p>
                        </div>
                        <div className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-mono">
                            Requested: {request.requested_quantity || request.total_required_workers} Drivers
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Confirmed Headcount *</label>
                            <input 
                                type="number" 
                                min="0" 
                                max={request.total_required_workers}
                                value={confirmedQty} 
                                onChange={e => setConfirmedQty(e.target.value)} 
                                required
                                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#dbb457] focus:outline-none"
                            />
                            <span className="text-[11px] text-gray-400">Drivers you agree to supply</span>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Proposed Start Time</label>
                            <input 
                                type="time" 
                                value={proposedStart} 
                                onChange={e => setProposedStart(e.target.value)} 
                                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Proposed End Time</label>
                            <input 
                                type="time" 
                                value={proposedEnd} 
                                onChange={e => setProposedEnd(e.target.value)} 
                                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Agency Note / Counter-Offer Reason</label>
                        <textarea 
                            rows={2}
                            value={agencyNotes} 
                            onChange={e => setAgencyNotes(e.target.value)} 
                            placeholder="e.g. Drivers can arrive 15 minutes early; full uniforms ready."
                            className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#dbb457] focus:outline-none"
                        />
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                        <button 
                            type="button" 
                            onClick={() => handleActionResponse('ACCEPTED')}
                            disabled={submittingResp}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            <span>✓</span> One-Click Accept Requested Quota
                        </button>
                        <button 
                            type="submit" 
                            disabled={submittingResp}
                            className="bg-[#dbb457] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#c29d45] shadow transition-colors disabled:opacity-50"
                        >
                            {submittingResp ? 'Submitting...' : 'Submit Counter-Proposal'}
                        </button>
                        <button 
                            type="button"
                            onClick={() => setShowRejectModal(true)}
                            disabled={submittingResp}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 px-5 py-2.5 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                        >
                            Reject Request
                        </button>
                    </div>
                </form>
            )}

            {/* TAB 2: WORKER ASSIGNMENT */}
            {activeTab === 'assign' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
                    <div>
                        <h3 className="font-bold text-base text-gray-900">Assign Registered Drivers</h3>
                        <p className="text-xs text-gray-500">
                            Select drivers from your roster to assign to this shift. Selected: <b>{selectedWorkerIds.length}</b> (Confirmed Headcount: {myResponse?.confirmed_quantity || 0})
                        </p>
                    </div>

                    <div className="space-y-2 max-h-72 overflow-y-auto border border-gray-200 p-3 rounded-lg">
                        {workers.map((w) => (
                            <label 
                                key={w.id} 
                                className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                                    selectedWorkerIds.includes(w.id) 
                                        ? 'bg-amber-50/50 border-[#dbb457]' 
                                        : 'bg-white border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedWorkerIds.includes(w.id)}
                                        onChange={() => toggleWorkerSelect(w.id)}
                                        className="h-4 w-4 text-[#dbb457] rounded border-gray-300"
                                    />
                                    <div>
                                        <div className="font-bold text-sm text-gray-900">{w.first_name} {w.last_name}</div>
                                        <div className="text-xs text-gray-500 font-mono">QID: {w.qid || 'N/A'} • ID: {w.internal_worker_id}</div>
                                    </div>
                                </div>
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                                    {w.whatsapp_number || 'No phone'}
                                </span>
                            </label>
                        ))}
                        {workers.length === 0 && (
                            <div className="text-center py-6 text-gray-400 text-sm">
                                No registered workers found in your agency roster. Go to "Worker Roster" to enroll staff.
                            </div>
                        )}
                    </div>

                    <button 
                        type="button" 
                        onClick={handleAllocateWorkers}
                        disabled={submittingAlloc || selectedWorkerIds.length === 0}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold text-sm px-6 py-2.5 rounded-lg shadow transition-colors disabled:opacity-50"
                    >
                        {submittingAlloc ? 'Assigning...' : `Assign ${selectedWorkerIds.length} Driver(s) to Shift`}
                    </button>
                </div>
            )}

            {/* TAB 3: CHAT */}
            {activeTab === 'chat' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[500px]">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <div className="text-xs font-bold uppercase text-gray-500">Live Coordination with Operations Manager</div>
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
                                No messages yet. Type below to ask a question or coordinate details.
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 flex gap-2">
                        <input 
                            type="text" 
                            value={newMsg} 
                            onChange={e => setNewMsg(e.target.value)}
                            placeholder="Message the Operations Manager..."
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
