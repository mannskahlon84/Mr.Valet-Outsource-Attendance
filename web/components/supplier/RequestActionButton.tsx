import Link from 'next/link';

type SupplierRequestRow = { id: number; status?: string; supplier_response_status?: string };

/**
 * What the agency can still do with a request:
 * - not answered yet            -> Respond
 * - answered, waiting for Ops   -> View / Edit Response
 * - finalized by Ops            -> Respond is closed; the agency follows who checked in
 * - rejected / cancelled        -> nothing to do
 */
export function supplierRequestAction(r: SupplierRequestRow): { label: string; href?: string } {
    const response = r.supplier_response_status || 'PENDING';
    if (r.status === 'CANCELLED') return { label: 'Cancelled' };
    if (response === 'ACCEPTED_BY_OM') return { label: 'View Attendance →', href: `/supplier/requests/${r.id}?tab=attendance` };
    if (response === 'REJECTED') return { label: 'Declined' };
    if (response === 'PENDING') return { label: 'Respond →', href: `/supplier/requests/${r.id}` };
    return { label: 'View / Edit Response →', href: `/supplier/requests/${r.id}` };
}

export default function RequestActionButton({ request, block = false }: { request: SupplierRequestRow; block?: boolean }) {
    const action = supplierRequestAction(request);
    const layout = block ? 'block w-full text-center py-2.5' : 'inline-block px-3 py-1.5';
    if (!action.href) {
        return (
            <span aria-disabled="true" className={`${layout} rounded-lg border border-gray-200 bg-gray-50 text-xs font-bold text-gray-400 cursor-not-allowed`}>
                {action.label}
            </span>
        );
    }
    const finalized = action.label.startsWith('View Attendance');
    return (
        <Link
            href={action.href}
            className={`${layout} whitespace-nowrap rounded-lg text-xs font-bold transition-colors shadow-sm ${
                finalized
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'border border-amber-200 text-[#a8842f] hover:bg-amber-50'
            }`}
        >
            {action.label}
        </Link>
    );
}
