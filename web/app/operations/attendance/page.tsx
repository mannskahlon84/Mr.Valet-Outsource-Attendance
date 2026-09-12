"use client";
import { useEffect, useState } from 'react';
import { fetchApi, API_URL } from '@/lib/api';

export default function OperationsAttendance() {
    const [report, setReport] = useState<any>(null);
    const [exceptions, setExceptions] = useState<any[]>([]);
    const [locationShifts, setLocationShifts] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'locations' | 'attendance' | 'exceptions'>('locations');
    const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const loadData = () => {
        Promise.all([
            fetchApi('/reports/attendance').catch(() => null),
            fetchApi('/attendance/exceptions').catch(() => []),
            fetchApi('/attendance/location-shifts').catch(() => [])
        ]).then(([rep, exc, locs]) => {
            setReport(rep);
            setExceptions(exc || []);
            setLocationShifts(locs || []);
        }).finally(() => setLoading(false));
    };

    useEffect(() => { 
        loadData(); 
        const handleSync = () => loadData();
        window.addEventListener('portal_data_updated', handleSync);
        const timer = setInterval(() => loadData(), 4000);
        return () => {
            window.removeEventListener('portal_data_updated', handleSync);
            clearInterval(timer);
        };
    }, []);

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

    const totalActiveAcrossLocations = locationShifts.reduce((acc, loc) => acc + (loc.active_on_site || 0), 0);
    const totalStartedAcrossLocations = locationShifts.reduce((acc, loc) => acc + (loc.started_shift_count || 0), 0);
    const totalEndedAcrossLocations = locationShifts.reduce((acc, loc) => acc + (loc.ended_shift_count || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <span>📍</span> Location-Wise Shift & Attendance Tracker
                    </h1>
                    <p className="text-sm text-gray-500">Live operational monitoring of driver arrival, active duty, and shift completions per location</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        Live Sync
                    </span>
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
                <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-emerald-200 bg-emerald-50/20">
                    <div className="text-[10px] sm:text-xs font-bold uppercase text-emerald-700">Currently Active on Sites</div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{totalActiveAcrossLocations} Drivers</div>
                    <div className="text-xs text-emerald-600 mt-1">Clocked in right now</div>
                </div>
                <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-[10px] sm:text-xs font-bold uppercase text-gray-400">Total Started Shift Today</div>
                    <div className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{totalStartedAcrossLocations}</div>
                    <div className="text-xs text-gray-500 mt-1">Clocked in at least once</div>
                </div>
                <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-blue-200 bg-blue-50/20">
                    <div className="text-[10px] sm:text-xs font-bold uppercase text-blue-700">Total Ended Shift Today</div>
                    <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">{totalEndedAcrossLocations}</div>
                    <div className="text-xs text-blue-600 mt-1">Completed their shifts</div>
                </div>
                <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-amber-200 bg-amber-50/30">
                    <div className="text-[10px] sm:text-xs font-bold uppercase text-amber-700">Pending Exceptions</div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">
                        {exceptions.filter(e => e.status === 'PENDING_APPROVAL').length}
                    </div>
                    <div className="text-xs text-amber-700 mt-1">Awaiting approval</div>
                </div>
            </div>

            {/* Tab Controls */}
            <div className="flex gap-4 border-b border-gray-200">
                <button 
                    onClick={() => setActiveTab('locations')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === 'locations' ? 'border-[#dbb457] text-[#dbb457]' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    📍 Location Breakdown ({locationShifts.length} Sites)
                </button>
                <button 
                    onClick={() => setActiveTab('attendance')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === 'attendance' ? 'border-[#dbb457] text-[#dbb457]' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    All Worker Logs ({report?.records?.length || 0})
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

            {/* LOCATION-WISE SHIFTS TAB */}
            {activeTab === 'locations' && (
                <div className="space-y-4">
                    {locationShifts.map((loc) => {
                        const isExpanded = selectedLocationId === loc.site_id;
                        return (
                            <div key={loc.site_id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all">
                                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black text-lg text-gray-900">{loc.site_name}</h3>
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                                                Site #{loc.site_id}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">{loc.site_address || 'Qatar'}</p>
                                    </div>

                                    {/* Stat badges */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                                            <div className="text-[10px] font-bold uppercase text-emerald-700">Active Now</div>
                                            <div className="text-xl font-black text-emerald-700">{loc.active_on_site || 0}</div>
                                        </div>
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                            <div className="text-[10px] font-bold uppercase text-gray-600">Started Shift</div>
                                            <div className="text-xl font-black text-gray-900">{loc.started_shift_count || 0}</div>
                                        </div>
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                                            <div className="text-[10px] font-bold uppercase text-blue-700">Ended Shift</div>
                                            <div className="text-xl font-black text-blue-700">{loc.ended_shift_count || 0}</div>
                                        </div>
                                        <div className="bg-amber-50/50 border border-amber-200 rounded-lg px-3 py-2">
                                            <div className="text-[10px] font-bold uppercase text-amber-700">Scheduled</div>
                                            <div className="text-xl font-black text-amber-800">{loc.total_scheduled || 0}</div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setSelectedLocationId(isExpanded ? null : loc.site_id)}
                                        className="text-xs font-bold text-[#dbb457] hover:text-[#c29d45] border border-[#dbb457] hover:bg-amber-50/30 px-3.5 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 self-start md:self-center"
                                    >
                                        <span>{isExpanded ? 'Hide Driver List ▲' : 'View Driver Roster ▼'}</span>
                                        <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full">
                                            {loc.workers?.length || 0}
                                        </span>
                                    </button>
                                </div>

                                {/* Expanded worker list for this location */}
                                {isExpanded && (
                                    <div className="border-t border-gray-200 bg-gray-50/60 p-4">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200 text-xs">
                                                <thead>
                                                    <tr className="text-gray-500 uppercase font-semibold text-[10px]">
                                                        <th className="px-4 py-2 text-left">Driver Name</th>
                                                        <th className="px-4 py-2 text-left">Agency / Supplier</th>
                                                        <th className="px-4 py-2 text-left">Shift Status</th>
                                                        <th className="px-4 py-2 text-left">Check-In</th>
                                                        <th className="px-4 py-2 text-left">Check-Out</th>
                                                        <th className="px-4 py-2 text-left">Verification</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 bg-white">
                                                    {(loc.workers || []).map((w: any) => (
                                                        <tr key={w.worker_id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-2.5 font-bold text-gray-900">
                                                                {w.worker_name}
                                                                <div className="text-[10px] text-gray-400 font-normal">ID #{w.worker_id}</div>
                                                            </td>
                                                            <td className="px-4 py-2.5 font-medium text-gray-700">
                                                                {w.supplier_name || 'Direct'}
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                {w.status === 'ON_SHIFT' && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                        On Shift (Active)
                                                                    </span>
                                                                )}
                                                                {w.status === 'ENDED_SHIFT' && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                                        Shift Ended
                                                                    </span>
                                                                )}
                                                                {w.status === 'SCHEDULED_NOT_STARTED' && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                                                                        Not Arrived Yet
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2.5 font-mono">
                                                                {w.check_in_time ? (
                                                                    <span className="text-emerald-700 font-bold">
                                                                        {new Date(w.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                ) : '—'}
                                                            </td>
                                                            <td className="px-4 py-2.5 font-mono">
                                                                {w.check_out_time ? (
                                                                    <span className="text-blue-700 font-bold">
                                                                        {new Date(w.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                ) : '—'}
                                                            </td>
                                                            <td className="px-4 py-2.5 uppercase font-mono text-gray-500 text-[10px]">
                                                                {w.check_in_method || '—'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {(loc.workers || []).length === 0 && (
                                                        <tr>
                                                            <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                                                                No driver shifts scheduled for this location today.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {locationShifts.length === 0 && (
                        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center text-gray-400">
                            No active locations found with shifts scheduled today.
                        </div>
                    )}
                </div>
            )}

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
