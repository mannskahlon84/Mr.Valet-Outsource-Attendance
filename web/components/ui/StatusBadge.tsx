type Tone = 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'gold';

const TONES: Record<Tone, string> = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
    amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    red: 'bg-rose-50 text-rose-700 ring-rose-600/15',
    blue: 'bg-sky-50 text-sky-700 ring-sky-600/15',
    gray: 'bg-[#1a1a1a]/[0.04] text-[#1a1a1a]/65 ring-[#1a1a1a]/10',
    gold: 'bg-[#dbb457]/15 text-[#7a5f1f] ring-[#dbb457]/40',
};

const STATUS_TONE: Record<string, Tone> = {
    CONFIRMED: 'green', ACCEPTED_BY_OM: 'green', ACCEPTED: 'green', active: 'green', APPROVED: 'green',
    GENERATED: 'green', CHECKED_OUT: 'blue', CHECKED_IN: 'green', ACTIVE: 'green', REVOKED: 'red', INACTIVE: 'red',
    PENDING: 'amber', RESPONSES_PENDING: 'amber', SUBMITTED: 'gold', PENDING_APPROVAL: 'amber', COUNTER_PROPOSED: 'amber', PARTIAL: 'amber',
    PARTIALLY_CONFIRMED: 'blue', ABSENT: 'red', SCHEDULED: 'gray', PRESENT: 'green',
    CANCELLED: 'red', REJECTED: 'red', inactive: 'red', VOIDED: 'red',
};

// Friendlier wording for the codes the API uses; anything else is shown as Title Case
const STATUS_LABEL: Record<string, string> = {
    ACCEPTED_BY_OM: 'Accepted by O.M.',
    PARTIALLY_CONFIRMED: 'Partially Confirmed',
    RESPONSES_PENDING: 'Awaiting Agencies',
    COUNTER_PROPOSED: 'Counter-Proposed',
    PENDING_APPROVAL: 'Pending Approval',
};

function titleCase(code: string): string {
    return code.toLowerCase().split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function StatusBadge({ status }: { status: string }) {
    const tone = TONES[STATUS_TONE[status] || 'gray'];
    return (
        <span title={status} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tone}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            {STATUS_LABEL[status] || titleCase(status || 'unknown')}
        </span>
    );
}
