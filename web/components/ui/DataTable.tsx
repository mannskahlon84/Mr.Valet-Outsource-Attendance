export default function DataTable({ columns, data, keyField }: { columns: { header: string, field: string | ((row: any) => React.ReactNode) }[], data: any[], keyField: string }) {
    return (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map((col, idx) => <th key={idx} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{col.header}</th>)}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.map((row) => (
                            <tr key={row[keyField]}>
                                {columns.map((col, idx) => (
                                    <td key={idx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {typeof col.field === 'function' ? col.field(row) : row[col.field]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr><td colSpan={columns.length} className="px-6 py-4 text-center text-sm text-gray-500">No data found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}