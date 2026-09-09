"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '../../../lib/api';

export default function Attendance() {
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchApi('/reports/attendance').then(setReport).finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading...</div>;

    const exportExcel = () => { window.open('http://127.0.0.1:8000/api/v1/reports/attendance/export/excel?token=' + localStorage.getItem('token'), '_blank'); };
    const exportPdf = () => { window.open('http://127.0.0.1:8000/api/v1/reports/attendance/export/pdf?token=' + localStorage.getItem('token'), '_blank'); };

    return (
        <div>
            <div className="flex justify-end space-x-2 mb-4">
                <button onClick={exportExcel} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-bold">Export Excel</button>
                <button onClick={exportPdf} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm font-bold">Export PDF</button>
            </div>
            
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-gray-500 text-xs font-bold uppercase">Total Duty Hours</div>
                    <div className="text-2xl font-black mt-1">{report?.summary?.total_duty_hours || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-gray-500 text-xs font-bold uppercase">Present Days</div>
                    <div className="text-2xl font-black mt-1">{report?.summary?.total_present_days || 0}</div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worker</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">In / Out</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {(report?.records || []).map((r: any, idx: number) => (
                            <tr key={idx}>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{r.worker_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{r.site_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{r.required_date}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                    {r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : '-'} <br/> 
                                    {r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-700">{r.duty_hours}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${r.status === 'CHECKED_OUT' ? 'bg-green-100 text-green-800' : (r.status === 'ABSENT' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800')}`}>
                                        {r.status.replace('_', ' ')}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {(!report?.records || report.records.length === 0) && (
                            <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No attendance records found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
