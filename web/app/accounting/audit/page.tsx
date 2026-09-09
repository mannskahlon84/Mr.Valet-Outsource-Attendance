"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function AccountingAudit() {
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchApi('/reports/attendance')
            .then(setReport)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading duty reconciliation...</div>;

    const totalHours = report?.summary?.total_duty_hours || 0;
    const totalWorkers = report?.summary?.total_present_days || 0;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Duty Hours Reconciliation Audit</h1>
                    <p className="text-sm text-gray-500">Cross-reference biometric check-in timestamps with contractor billing records</p>
                </div>
                <button 
                    onClick={() => window.open('http://127.0.0.1:8000/api/v1/reports/attendance/export/excel?token=' + localStorage.getItem('token'), '_blank')}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow transition-colors"
                >
                    Export Audit Spreadsheet
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-xs font-bold uppercase text-gray-400">Total Verified Duty Hours</div>
                    <div className="text-3xl font-black text-gray-900 mt-2">{totalHours} hrs</div>
                    <div className="text-xs text-gray-500 mt-1">Calculated between check-in and check-out</div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-xs font-bold uppercase text-gray-400">Verified Worker Shifts</div>
                    <div className="text-3xl font-black text-gray-900 mt-2">{totalWorkers} Shifts</div>
                    <div className="text-xs text-gray-500 mt-1">Geofence and biometric validated</div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-5 py-3 text-left">Worker Name</th>
                                <th className="px-5 py-3 text-left">Location</th>
                                <th className="px-5 py-3 text-left">Date</th>
                                <th className="px-5 py-3 text-left">Check-In</th>
                                <th className="px-5 py-3 text-left">Check-Out</th>
                                <th className="px-5 py-3 text-left">Logged Hours</th>
                                <th className="px-5 py-3 text-left">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {(report?.records || []).map((r: any, idx: number) => (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-5 py-4 font-bold text-gray-900">{r.worker_name}</td>
                                    <td className="px-5 py-4 text-gray-600">{r.site_name}</td>
                                    <td className="px-5 py-4 text-gray-600">{r.required_date}</td>
                                    <td className="px-5 py-4 font-mono text-xs text-gray-700">
                                        {r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : '-'}
                                    </td>
                                    <td className="px-5 py-4 font-mono text-xs text-gray-700">
                                        {r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '-'}
                                    </td>
                                    <td className="px-5 py-4 font-black text-gray-900">{r.duty_hours} hrs</td>
                                    <td className="px-5 py-4">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                            r.status === 'CHECKED_OUT' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                                        }`}>
                                            {r.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {(report?.records || []).length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                                        No audit records found for this period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
