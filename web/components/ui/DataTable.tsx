import { Inbox } from 'lucide-react';

export default function DataTable({ columns, data, keyField, emptyText = 'No data found.' }: { columns: { header: string, field: string | ((row: any) => React.ReactNode) }[], data: any[], keyField: string, emptyText?: string }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-[#1a1a1a]/[0.06] bg-white shadow-[0_1px_2px_rgb(26_26_26/0.04)]">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="border-b border-[#1a1a1a]/[0.06] bg-[#f6f4ef]/60">
                        <tr>
                            {columns.map((col, idx) => <th key={idx} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#1a1a1a]/45">{col.header}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1a1a1a]/[0.05]">
                        {data.map((row) => (
                            <tr key={row[keyField]} className="transition-colors hover:bg-[#f6f4ef]/60">
                                {columns.map((col, idx) => (
                                    <td key={idx} className="whitespace-nowrap px-5 py-3.5 text-sm text-[#1a1a1a]/80">
                                        {typeof col.field === 'function' ? col.field(row) : row[col.field]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={columns.length}>
                                    <div className="flex flex-col items-center gap-2 py-12 text-center">
                                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f6f4ef] text-[#1a1a1a]/35">
                                            <Inbox className="h-5 w-5" strokeWidth={1.8} />
                                        </span>
                                        <p className="text-sm text-[#1a1a1a]/45">{emptyText}</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
