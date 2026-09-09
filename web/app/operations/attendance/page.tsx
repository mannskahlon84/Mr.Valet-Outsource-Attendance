"use client";
import { useEffect, useState } from 'react';
import { fetchApi, API_URL } from '@/lib/api';

export default function OperationsAttendance() {
    const [report, setReport] = useState<any>(null);
    const [exceptions, setExceptions] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'attendance' | 'exceptions'>('attendance');
    const [loading, setLoading] = useState(true);

    const loadData = () => {
        Promise.all([
            fetchApi('/reports/attendance').catch(() => null),
            fetchApi('/attendance/exceptions').catch(() => [])
        ]).then(([rep, exc]) => {
            setReport(rep);
            setExceptions(exc || []);
        }).finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, []);

    const handleExceptionAction = async (id: number, status: 'APPROVED' | 'REJECTED') => {
        if (!confirm(`Are you sure you want to mark this exception as ${status}?`)) return;
        try {
            await fetchApi(`/attendance/exceptions/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });
            alert(`Exception ${status.toLowerCase()} successfully`);
            loadData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading attendance data...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Site Attendance & Exceptions</h1>
                    <p className="text-sm text-gray-500">Live valet worker attendance tracking and exception approvals</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button 
                        onClick={() => window.open(`${API_URL}/reports/attendance/export/excel?token=` + localStorage.getItem('token'), '_blank')}
                        className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow transition-colors text-center"
                    >
                        Export Excel
                    </button>
                    <button 
                        onClick={() => window.open(`${API_URL}/reports/attendance/export/pdf?token=` + localStorage.getItem('token'), '_blank')}
                        className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow transition-colors text-center"
                    >
                        Export PDF
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-[10px] sm:text-xs font-bold uppercase text-gray-400">Duty Hours Logged</div>
                    <div className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{report?.summary?.total_duty_hours || 0} hrs</div>
                </div>
                <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-[10px] sm:text-xs font-bold uppercase text-gray-400">Workers Present</div>
                    <div className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{report?.summary?.total_present_days || 0}</div>
                </div>
                <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-amber-200 bg-amber-50/30">
                    <div className="text-[10px] sm:text-xs font-bold uppercase text-amber-700">Pending Exceptions</div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">
                        {exceptions.filter(e => e.status === 'PENDING_APPROVAL').length}
                    </div>
                </div>
            </div>

            {/* Tab Controls */}
            <div className="flex gap-4 border-b border-gray-200">
                <button 
                    onClick={() => setActiveTab('attendance')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === 'attendance' ? 'border-[#dbb457] text-[#dbb457]' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Today's Attendance ({report?.records?.length || 0})
                </button>
                <button 
                    onClick={() => setActiveTab('exceptions')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === 'exceptions' ? 'border-[#dbb457] text-[#dbb457]' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Exceptions ({exceptions.filter(e => e.status === 'PENDING_APPROVAL').length})
                </button>
            </div>

            {/* ATTENDANCE TABLE & MOBILE CARDS */}
            {activeTab === 'attendance' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Mobile Attendance Cards */}
                    <div className="md:hidden divide-y divide-gray-100 p-3 space-y-2.5">
                        {(report?.records || []).map((r: any, idx: number) => (
                            <div key={idx} className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200/80 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-black text-gray-900 text-sm">{r.worker_name}</div>
                                        <div className="text-xs text-gray-500">📍 {r.site_name}</div>
                                    </div>
                                    <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                                        r.status === 'CHECKED_OUT' 
                                            ? 'bg-green-100 text-green-800' 
                                            : r.status === 'ABSENT' 
                                                ? 'bg-red-100 text-red-800' 
                                                : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {r.status}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs bg-white p-2 rounded-lg border border-gray-100 font-mono">
                                    <span className="text-gray-600">
                                        ⏱️ In: {r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'} | Out: {r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}
                                    </span>
                                    <span className="font-black text-gray-900">{r.duty_hours} hrs</span>
                                </div>
                            </div>
                        ))}
                        {(report?.records || []).length === 0 && (
                            <div className="p-8 text-center text-gray-400 text-xs">
                                No attendance records for today yet.
                            </div>
                        )}
                    </div>

                    {/* Desktop Attendance Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-5 py-3 text-left">Worker</th>
                                    <th className="px-5 py-3 text-left">Location</th>
                                    <th className="px-5 py-3 text-left">Date</th>
                                    <th className="px-5 py-3 text-left">Check In / Out</th>
                                    <th className="px-5 py-3 text-left">Hours</th>
                                    <th className="px-5 py-3 text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {(report?.records || []).map((r: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-5 py-4 font-bold text-gray-900">{r.worker_name}</td>
                                        <td className="px-5 py-4 text-gray-600">{r.site_name}</td>
                                        <td className="px-5 py-4 text-gray-600">{r.required_date}</td>
                                        <td className="px-5 py-4 text-gray-600 font-mono text-xs">
                                            {r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'} / {r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}
                                        </td>
                                        <td className="px-5 py-4 font-black text-gray-900">{r.duty_hours} hrs</td>
                                        <td className="px-5 py-4">
                                            <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                                                r.status === 'CHECKED_OUT' 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : r.status === 'ABSENT' 
                                                        ? 'bg-red-100 text-red-800' 
                                                        : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {r.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {(report?.records || []).length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                                            No attendance records for today yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* EXCEPTIONS TAB */}
            {activeTab === 'exceptions' && (
                <div className="space-y-3">
                    {exceptions.map((exc) => (
                        <div key={exc.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-900 text-base">Exception #{exc.id}</span>
                                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">{exc.exception_type}</span>
                                    <span className="text-xs font-semibold text-gray-500">Status: {exc.status}</span>
                                </div>
                                <p className="text-sm text-gray-700 mt-1">
                                    <b>Reason:</b> {exc.reason}
                                </p>
                                <div className="text-xs text-gray-400 mt-1">
                                    Requested on: {new Date(exc.created_at).toLocaleString()}
                                </div>
                            </div>
                            {exc.status === 'PENDING_APPROVAL' && (
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleExceptionAction(exc.id, 'APPROVED')}
                                        className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors"
                                    >
                                        Approve
                                    </button>
                                    <button 
                                        onClick={() => handleExceptionAction(exc.id, 'REJECTED')}
                                        className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors"
                                    >
                                        Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {exceptions.length === 0 && (
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center text-gray-400">
                            No attendance exceptions filed.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
