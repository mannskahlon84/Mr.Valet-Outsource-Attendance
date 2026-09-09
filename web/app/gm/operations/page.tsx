"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';

export default function GMOperations() {
    const [requests, setRequests] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetchApi('/requests/').catch(() => []),
            fetchApi('/sites/').catch(() => []),
            fetchApi('/reports/attendance').catch(() => null)
        ]).then(([reqs, sit, att]) => {
            setRequests(reqs || []);
            setSites(sit || []);
            setAttendance(att);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading operations coverage...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Operational Coverage & Shifts</h1>
                    <p className="text-sm text-gray-500">Company-wide valet dispatch requests and active location coverage</p>
                </div>
                <button 
                    onClick={() => window.open('http://127.0.0.1:8000/api/v1/reports/attendance/export/excel?token=' + localStorage.getItem('token'), '_blank')}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow transition-colors"
                >
                    Export Attendance Excel
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-xs font-bold uppercase text-gray-400">Total Shift Requests Logged</div>
                    <div className="text-3xl font-black text-gray-900 mt-2">{requests.length}</div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-xs font-bold uppercase text-gray-400">Total Geofenced Venues</div>
                    <div className="text-3xl font-black text-gray-900 mt-2">{sites.length} Locations</div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-xs font-bold uppercase text-gray-400">Valet Shifts Today</div>
                    <div className="text-3xl font-black text-gray-900 mt-2">{attendance?.summary?.total_present_days || 0}</div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 font-bold text-sm text-gray-900">
                    Company Shift Log
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-5 py-3 text-left">Req ID</th>
                                <th className="px-5 py-3 text-left">Date</th>
                                <th className="px-5 py-3 text-left">Time Window</th>
                                <th className="px-5 py-3 text-left">Drivers Needed</th>
                                <th className="px-5 py-3 text-left">Skill Category</th>
                                <th className="px-5 py-3 text-left">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {requests.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-5 py-4 font-bold text-gray-900">#{r.id}</td>
                                    <td className="px-5 py-4 text-gray-600">
                                        {r.required_date ? new Date(r.required_date).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-5 py-4 font-mono text-xs text-gray-600">{r.start_time} - {r.end_time}</td>
                                    <td className="px-5 py-4 font-bold text-gray-800">{r.total_required_workers} Drivers</td>
                                    <td className="px-5 py-4 text-gray-500">{r.skill_category || 'Valet Driver'}</td>
                                    <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                                </tr>
                            ))}
                            {requests.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-8 text-center text-gray-400">No shift requests found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
