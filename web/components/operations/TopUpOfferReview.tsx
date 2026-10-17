"use client";
import { useState } from 'react';
import { fetchApi, broadcastPortalEvent } from '@/lib/api';
import { qatarDateTime } from '@/lib/time';
import type { TopUpOffer } from '@/components/supplier/TopUpOfferPanel';

const OUTCOME: Record<string, string> = {
    ACCEPTED: 'text-emerald-700', DECLINED: 'text-rose-700', WITHDRAWN: 'text-[#1a1a1a]/45',
};

/** An agency's extra-driver offers on a finalized answer: accept or decline the pending one. */
export default function TopUpOfferReview({ requestId, offers, openPlaces, onDecided }: {
    requestId: string;
    offers: TopUpOffer[];
    openPlaces: number;
    onDecided: () => void;
}) {
    const [busy, setBusy] = useState(false);
    if (offers.length === 0) return null;
    const pending = offers.find(o => o.status === 'PENDING');
    const history = offers.filter(o => o.status !== 'PENDING');

    const decide = async (offer: TopUpOffer, accept: boolean) => {
        let note: string | null = null;
        if (accept) {
            if (!confirm(`Accept ${offer.extra_quantity} more driver(s) from ${offer.supplier_name}?`)) return;
        } else {
            note = prompt(`Decline ${offer.supplier_name}'s offer of ${offer.extra_quantity} more driver(s)? Add a reason for the agency (optional):`, '');
            if (note === null) return;
        }
        setBusy(true);
        try {
            await fetchApi(`/requests/${requestId}/topups/${offer.id}/decide`, {
                method: 'POST',
                body: JSON.stringify({ accept, note: note?.trim() || null }),
            });
            broadcastPortalEvent('request_finalized', { requestId });
            onDecided();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Could not save the decision.');
            onDecided();
        } finally {
            setBusy(false);
        }
    };

    const tooMany = pending ? pending.extra_quantity > openPlaces : false;
    return (
        <div className="mt-3 space-y-2">
            {pending && (
                <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-amber-900">
                        <b>Offers {pending.extra_quantity} more driver(s)</b>
                        {pending.message ? ` · "${pending.message}"` : ''}
                        <div className="mt-0.5 text-xs text-amber-700">
                            Sent {qatarDateTime(pending.created_at)} · {openPlaces} place(s) still open
                            {tooMany && ', more than are now needed'}
                        </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                        <button
                            type="button"
                            onClick={() => decide(pending, true)}
                            disabled={busy || tooMany}
                            title={tooMany ? 'Another agency has filled some places; decline and ask for a smaller number' : undefined}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white enabled:hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Accept +{pending.extra_quantity}
                        </button>
                        <button
                            type="button"
                            onClick={() => decide(pending, false)}
                            disabled={busy}
                            className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                        >
                            Decline
                        </button>
                    </div>
                </div>
            )}
            {history.length > 0 && (
                <ul className="space-y-0.5 text-xs text-[#1a1a1a]/55">
                    {history.map(o => (
                        <li key={o.id}>
                            Extra +{o.extra_quantity}: <span className={`font-semibold ${OUTCOME[o.status] || ''}`}>{o.status.toLowerCase()}</span>
                            {o.decided_at ? ` ${qatarDateTime(o.decided_at)}` : ''}
                            {o.decision_note ? ` · "${o.decision_note}"` : ''}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
