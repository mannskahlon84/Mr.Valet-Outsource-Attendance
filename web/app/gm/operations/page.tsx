"use client";
import { useEffect, useState } from 'react';
import { fetchApi, API_URL } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';

export default function GMOperations() {
    const [requests, setRequests] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [locationShifts, setLocationShifts] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'locations' | 'requests'>('locations');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetchApi('/requests/').catch(() => []),
            fetchApi('/sites/').catch(() => []),
            fetchApi('/attendance/location-shifts').catch(() => []),
            fetchApi('/reports/attendance').catch(() => null)
        ]).then(([reqs, sit, locs, att]) => {
            setRequests(reqs || []);
            setSites(sit || []);
            setLocationShifts(locs || []);
            setAttendance(att);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading operations coverage...</div>;

    const totalActive = locationShifts.reduce((acc, l) => acc + (l.active_on_site || 0), 0);
    const totalStarted = locationShifts.reduce((acc, l) => acc + (l.started_shift_count || 0), 0);
    const totalEnded = locationShifts.reduce((acc, l) => acc + (l.ended_shift_count || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Operational Coverage & Shifts</h1>
                    <p className="text-sm text-gray-500">Company-wide valet dispatch requests and active location coverage</p>
                </div>
                <button 
                    onClick={() => window.open(`${API_URL}/reports/attendance/export/excel?token=` + localStorage.getItem('token'), '_blank')}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow transition-colors"
                >
                    Export Attendance Excel
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-emerald-200 bg-emerald-50/20">
                    <div className="text-xs font-bold uppercase text-emerald-700">Currently Active on Sites</div>
                    <div className="text-3xl font-black text-emerald-700 mt-2">{totalActive} Drivers</div>
                    <div className="text-xs text-emerald-600 mt-1">Live duty right now</div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-xs font-bold uppercase text-gray-400">Started Shift Today</div>
                    <div className="text-3xl font-black text-gray-900 mt-2">{totalStarted}</div>
                    <div className="text-xs text-gray-500 mt-1">Drivers clocked in</div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-200 bg-blue-50/20">
                    <div className="text-xs font-bold uppercase text-blue-700">Ended Shift Today</div>
                    <div className="text-3xl font-black text-blue-700 mt-2">{totalEnded}</div>
                    <div className="text-xs text-blue-600 mt-1">Completed duty</div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-xs font-bold uppercase text-gray-400">Geofenced Locations</div>
                    <div className="text-3xl font-black text-gray-900 mt-2">{sites.length} Venues</div>
                    <div className="text-xs text-gray-500 mt-1">Contract sites</div>
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
                    📍 Location Shift Tracking ({locationShifts.length} Locations)
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === 'requests' ? 'border-[#dbb457] text-[#dbb457]' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    📋 Shift Requests Log ({requests.length})
                </button>
            </div>

            {/* TAB 1: LOCATION SHIFTS */}
            {activeTab === 'locations' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                        <h3 className="font-bold text-sm text-gray-800">
                            Location-Wise Live Manpower Attendance & Shift Completion
                        </h3>
                        <span className="text-xs bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-mono">
                            Read-Only Executive View
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-5 py-3 text-left">Location / Site</th>
                                    <th className="px-5 py-3 text-left">Address</th>
                                    <th className="px-5 py-3 text-center">Scheduled</th>
                                    <th className="px-5 py-3 text-center">Started Shift</th>
                                    <th className="px-5 py-3 text-center">Ended Shift</th>
                                    <th className="px-5 py-3 text-center">Active Right Now</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {locationShifts.map((loc) => (
                                    <tr key={loc.site_id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-5 py-4 font-black text-gray-900">
                                            {loc.site_name}
                                            <div className="text-[11px] text-gray-400 font-mono font-normal">Site #{loc.site_id}</div>
                                        </td>
                                        <td className="px-5 py-4 text-gray-600 text-xs">{loc.site_address || 'Qatar'}</td>
                                        <td className="px-5 py-4 text-center font-bold text-gray-800">{loc.total_scheduled}</td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                {loc.started_shift_count}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                                {loc.ended_shift_count}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="inline-flex px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                🟢 {loc.active_on_site}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {locationShifts.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                                            No location shift records logged today.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 2: SHIFT REQUESTS ARCHIVE */}
            {activeTab === 'requests' && (
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
            )}
        </div>
    );
}
