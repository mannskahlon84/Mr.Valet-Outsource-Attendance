"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function SupplierAttendancePage() {
    const [liveData, setLiveData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [search, setSearch] = useState('');

    const loadLiveData = async () => {
        try {
            const data = await fetchApi('/attendance/supplier-live');
            setLiveData(data);
        } catch (e) {
            console.error("Failed to load supplier live attendance", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLiveData();
        const handleSync = () => loadLiveData();
        window.addEventListener('portal_data_updated', handleSync);
        const timer = setInterval(() => loadLiveData(), 4000);
        return () => {
            window.removeEventListener('portal_data_updated', handleSync);
            clearInterval(timer);
        };
    }, []);

    const workers = liveData?.workers || [];
    const filteredWorkers = workers.filter((w: any) => {
        if (filterStatus !== 'ALL' && w.status !== filterStatus) return false;
        if (search) {
            const q = search.toLowerCase();
            return (
                w.worker_name?.toLowerCase().includes(q) ||
                w.qid?.toLowerCase().includes(q) ||
                w.internal_id?.toLowerCase().includes(q) ||
                w.site_name?.toLowerCase().includes(q)
            );
        }
        return true;
    });

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <span>⏱️</span> Live Driver Shift Attendance
                    </h1>
                    <p className="text-sm text-gray-500">
                        Real-time tracking of your agency's deployed drivers across all client locations.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        Live Auto-Sync Active
                    </span>
                    <button
                        onClick={loadLiveData}
                        className="text-xs bg-white hover:bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg font-medium text-gray-700 shadow-sm"
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-xs font-bold uppercase text-gray-400">Total Enrolled</div>
                    <div className="text-3xl font-black text-gray-900 mt-1">{liveData?.total_roster_count || 0}</div>
                    <div className="text-xs text-gray-500 mt-1">Agency drivers roster</div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm bg-emerald-50/20">
                    <div className="text-xs font-bold uppercase text-emerald-600">Currently On Shift</div>
                    <div className="text-3xl font-black text-emerald-600 mt-1">{liveData?.active_on_shift_count || 0}</div>
                    <div className="text-xs text-emerald-700 mt-1">Clocked in & working</div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-blue-200 shadow-sm bg-blue-50/20">
                    <div className="text-xs font-bold uppercase text-blue-600">Completed Shifts</div>
                    <div className="text-3xl font-black text-blue-600 mt-1">{liveData?.ended_shift_count || 0}</div>
                    <div className="text-xs text-blue-700 mt-1">Shift ended today</div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-xs font-bold uppercase text-gray-400">Not Started</div>
                    <div className="text-3xl font-black text-gray-500 mt-1">{liveData?.not_checked_in_count || 0}</div>
                    <div className="text-xs text-gray-400 mt-1">Off-duty or pending</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <span className="text-xs font-bold uppercase text-gray-400 mr-2">Filter:</span>
                    {['ALL', 'ON_SHIFT', 'COMPLETED', 'NOT_STARTED'].map((st) => (
                        <button
                            key={st}
                            onClick={() => setFilterStatus(st)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                filterStatus === st
                                    ? 'bg-[#dbb457] text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {st === 'ALL' ? 'All Drivers' : st === 'ON_SHIFT' ? '🟢 On Shift' : st === 'COMPLETED' ? '🔴 Ended Shift' : '⚪ Not Started'}
                        </button>
                    ))}
                </div>
                <input
                    type="text"
                    placeholder="Search by driver name, QID, ID, or location..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full md:w-80 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#dbb457] focus:outline-none"
                />
            </div>

            {/* Attendance Roster Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-5 py-3 text-left">Driver Name</th>
                                <th className="px-5 py-3 text-left">Identifiers</th>
                                <th className="px-5 py-3 text-left">Live Status</th>
                                <th className="px-5 py-3 text-left">Assigned Location</th>
                                <th className="px-5 py-3 text-left">Check-In Time</th>
                                <th className="px-5 py-3 text-left">Check-Out Time</th>
                                <th className="px-5 py-3 text-left">Method</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center text-gray-400">Loading live shift data...</td>
                                </tr>
                            ) : filteredWorkers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center text-gray-400">No driver records found.</td>
                                </tr>
                            ) : (
                                filteredWorkers.map((w: any) => (
                                    <tr key={w.worker_id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <div className="font-bold text-gray-900">{w.worker_name}</div>
                                            <div className="text-xs text-gray-400">ID #{w.worker_id}</div>
                                        </td>
                                        <td className="px-5 py-3.5 text-xs font-mono text-gray-600">
                                            <div>QID: <span className="font-semibold text-gray-900">{w.qid || 'N/A'}</span></div>
                                            <div>Badge: {w.internal_id || '-'}</div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {w.status === 'ON_SHIFT' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                    On Shift
                                                </span>
                                            )}
                                            {w.status === 'COMPLETED' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                    Shift Ended
                                                </span>
                                            )}
                                            {w.status === 'NOT_STARTED' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                    Not Started
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="font-medium text-gray-900">{w.site_name || '—'}</div>
                                            {w.scheduled_shift && (
                                                <div className="text-xs text-gray-400 font-mono">Shift: {w.scheduled_shift}</div>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-xs font-mono">
                                            {w.check_in_time ? (
                                                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                                    {new Date(w.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-xs font-mono">
                                            {w.check_out_time ? (
                                                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                    {new Date(w.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-xs text-gray-500 uppercase font-mono">
                                            {w.check_in_method || '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
