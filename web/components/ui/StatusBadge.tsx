export default function StatusBadge({ status }: { status: string }) {
    let color = 'bg-gray-100 text-gray-800';
    if (status === 'CONFIRMED' || status === 'active' || status === 'ACCEPTED_BY_OM') color = 'bg-green-100 text-green-800';
    if (status === 'PENDING' || status === 'RESPONSES_PENDING') color = 'bg-yellow-100 text-yellow-800';
    if (status === 'CANCELLED' || status === 'inactive') color = 'bg-red-100 text-red-800';
    if (status === 'PARTIALLY_CONFIRMED') color = 'bg-blue-100 text-blue-800';
    
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${color}`}>{status}</span>;
}