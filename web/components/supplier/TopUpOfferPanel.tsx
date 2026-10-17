"use client";
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { fetchApi, tryFetch, broadcastPortalEvent } from '@/lib/api';
import { qatarDateTime } from '@/lib/time';

export type TopUpOffer = {
    id: number;
    supplier_response_id: number;
    supplier_name: string;
    extra_quantity: number;
    message: string | null;
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
    decision_note: string | null;
    created_at: string | null;
    decided_at: string | null;
};

export type TopUpState = { open_places: number; shift_passed: boolean; offers: TopUpOffer[] };

const OUTCOME: Record<TopUpOffer['status'], { label: string; className: string }> = {
    PENDING: { label: 'Waiting for Operations', className: 'text-amber-700' },
    ACCEPTED: { label: 'Accepted', className: 'text-emerald-700' },
    DECLINED: { label: 'Declined', className: 'text-rose-700' },
    WITHDRAWN: { label: 'Withdrawn', className: 'text-[#1a1a1a]/45' },
};

/** After Operations finalized this agency's answer, offer extra drivers for the places still open. */
export default function TopUpOfferPanel({ requestId, confirmedQuantity, onChanged }: {
    requestId: string;
    confirmedQuantity: number;
    onChanged: () => void;
}) {
    const [state, setState] = useState<TopUpState | null>(null);
    const [qty, setQty] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    const load = async () => {
        const data = await tryFetch<TopUpState>(`/requests/${requestId}/topups`);
        if (data) setState(data);
    };

    useEffect(() => {
        let alive = true;
        const refresh = () => tryFetch<TopUpState>(`/requests/${requestId}/topups`).then(d => { if (alive && d) setState(d); });
        refresh();
        window.addEventListener('portal_data_updated', refresh);
        return () => { alive = false; window.removeEventListener('portal_data_updated', refresh); };
    }, [requestId]);

    if (!state) return null;
    const pending = state.offers.find(o => o.status === 'PENDING');
    const history = state.offers.filter(o => o.status !== 'PENDING');

    const send = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            await fetchApi(`/requests/${requestId}/topups`, {
                method: 'POST',
                body: JSON.stringify({ extra_quantity: parseInt(qty, 10), message: note.trim() || null }),
            });
            setQty('');
            setNote('');
            broadcastPortalEvent('supplier_response_updated', { requestId });
            await load();
            onChanged();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Could not send the offer.');
        } finally {
            setBusy(false);
        }
    };

    const withdraw = async (offer: TopUpOffer) => {
        if (!confirm(`Withdraw your offer of ${offer.extra_quantity} more driver(s)? Operations will be told.`)) return;
        setBusy(true);
        try {
            await fetchApi(`/requests/${requestId}/topups/${offer.id}/withdraw`, { method: 'POST' });
            broadcastPortalEvent('supplier_response_updated', { requestId });
            await load();
            onChanged();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Could not withdraw the offer.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mt-5 space-y-3 border-t border-[#1a1a1a]/[0.08] pt-5">
            <h4 className="flex items-center gap-1.5 font-bold text-[#1a1a1a]">
                <Plus className="h-4 w-4 text-[#a8842f]" /> Offer more drivers
            </h4>

            {pending ? (
                <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-amber-900">
                        <b>You offered {pending.extra_quantity} more driver(s).</b> Waiting for Operations to accept.
                        <div className="mt-0.5 text-xs text-amber-700">
                            Sent {qatarDateTime(pending.created_at)}{pending.message ? ` · "${pending.message}"` : ''}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => withdraw(pending)}
                        disabled={busy}
                        className="shrink-0 rounded-lg border border-amber-300 bg-white px-4 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                    >
                        Withdraw offer
                    </button>
                </div>
            ) : state.shift_passed ? (
                <p className="text-sm text-[#1a1a1a]/55">This shift date has passed.</p>
            ) : state.open_places === 0 ? (
                <p className="text-sm text-[#1a1a1a]/55">This request is fully staffed, so no more drivers are needed.</p>
            ) : (
                <form onSubmit={send} className="space-y-3 rounded-xl border border-[#1a1a1a]/[0.08] bg-[#f6f4ef]/60 p-4">
                    <p className="text-sm text-[#1a1a1a]/75">
                        You supply <b>{confirmedQuantity}</b> drivers. Operations still needs <b>{state.open_places}</b> more.
                        If you can arrange extra drivers, offer them here and Operations will accept or decline.
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <input
                            type="number"
                            min={1}
                            max={state.open_places}
                            required
                            value={qty}
                            onChange={e => setQty(e.target.value)}
                            placeholder={`1 - ${state.open_places}`}
                            aria-label="Extra drivers"
                            className="w-full rounded-lg border border-[#1a1a1a]/15 bg-white p-2.5 text-sm font-bold sm:w-32"
                        />
                        <input
                            type="text"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="Note for Operations (optional)"
                            className="w-full flex-1 rounded-lg border border-[#1a1a1a]/15 bg-white p-2.5 text-sm"
                        />
                        <button
                            type="submit"
                            disabled={busy || !qty}
                            className="shrink-0 rounded-lg bg-[#1a1a1a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#dbb457] hover:text-[#1a1a1a] disabled:opacity-40"
                        >
                            {busy ? 'Sending...' : 'Send offer'}
                        </button>
                    </div>
                </form>
            )}

            {history.length > 0 && (
                <ul className="space-y-1 text-xs text-[#1a1a1a]/60">
                    {history.map(o => (
                        <li key={o.id}>
                            +{o.extra_quantity} driver(s) · <span className={`font-semibold ${OUTCOME[o.status].className}`}>{OUTCOME[o.status].label}</span>
                            {o.decided_at ? ` ${qatarDateTime(o.decided_at)}` : ''}
                            {o.decision_note ? ` · "${o.decision_note}"` : ''}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
