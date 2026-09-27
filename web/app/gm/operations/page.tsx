"use client";
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { calendarDate, qatarToday } from '@/lib/time';
import { useEffect, useState } from 'react';
import { fetchApi, API_URL, tryFetch } from '@/lib/api';
import ExportButtons from '@/components/ui/ExportButtons';
import LoadErrorBar from '@/components/ui/LoadErrorBar';
import StatusBadge from '@/components/ui/StatusBadge';

export default function GMOperations() {
    const [requests, setRequests] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [locationShifts, setLocationShifts] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'locations' | 'requests'>('locations');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const loadData = () => {
        let failure = '';
        const onError = (m: string) => { failure = m; };
        Promise.all([
            tryFetch('/requests/', onError),
            tryFetch('/sites/', onError),
            tryFetch('/attendance/location-shifts', onError),
            tryFetch('/reports/attendance')
        ]).then(([reqs, sit, locs, att]) => {
            // A failed refresh keeps what is already on screen
            if (Array.isArray(reqs)) setRequests(reqs);
            if (Array.isArray(sit)) setSites(sit);
            if (Array.isArray(locs)) setLocationShifts(locs);
            if (att !== undefined) setAttendance(att);
            setLoadError(failure);
        }).finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, []);

    if (loading) return <DashboardSkeleton />;

    const totalActive = locationShifts.reduce((acc, l) => acc + (l.active_on_site || 0), 0);
    const totalStarted = locationShifts.reduce((acc, l) => acc + (l.started_shift_count || 0), 0);
    const totalEnded = locationShifts.reduce((acc, l) => acc + (l.ended_shift_count || 0), 0);

    return (
        <div className="space-y-6">
            <LoadErrorBar message={loadError} onRetry={loadData} />
            <div className="flex justify-between items-center">
                <div>
                    <div className="mv-eyebrow basis-full mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#a8842f]"><span className="h-px w-6 bg-[#dbb457]" />General Manager</div>
                    <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight text-[#1a1a1a]">Operational Coverage & Shifts</h1>
                    <p className="text-sm text-[#1a1a1a]/55">Company-wide valet dispatch requests and active location coverage</p>
                </div>
                <ExportButtons base="/reports/attendance/export" filename={`attendance-${qatarToday()}`} />
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-emerald-200 bg-emerald-50/20">
                    <div className="text-xs font-bold uppercase text-emerald-700">Currently Active on Sites</div>
                    <div className="text-3xl font-bold text-emerald-700 mt-2">{totalActive} Drivers</div>
                    <div className="text-xs text-emerald-600 mt-1">Live duty right now</div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08]">
                    <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Started Shift Today</div>
                    <div className="text-3xl font-bold text-[#1a1a1a] mt-2">{totalStarted}</div>
                    <div className="text-xs text-[#1a1a1a]/55 mt-1">Drivers clocked in</div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-blue-200 bg-blue-50/20">
                    <div className="text-xs font-bold uppercase text-blue-700">Ended Shift Today</div>
                    <div className="text-3xl font-bold text-blue-700 mt-2">{totalEnded}</div>
                    <div className="text-xs text-blue-600 mt-1">Completed duty</div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08]">
                    <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Geofenced Locations</div>
                    <div className="text-3xl font-bold text-[#1a1a1a] mt-2">{sites.length} Venues</div>
                    <div className="text-xs text-[#1a1a1a]/55 mt-1">Contract sites</div>
                </div>
            </div>

            {/* Tab Controls */}
            <div className="flex gap-4 border-b border-[#1a1a1a]/[0.08]">
                <button
                    onClick={() => setActiveTab('locations')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === 'locations' ? 'border-[#dbb457] text-[#a8842f]' : 'border-transparent text-[#1a1a1a]/55 hover:text-[#1a1a1a]/75'
                    }`}
                >
                    Location Shift Tracking ({locationShifts.length} Locations)
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === 'requests' ? 'border-[#dbb457] text-[#a8842f]' : 'border-transparent text-[#1a1a1a]/55 hover:text-[#1a1a1a]/75'
                    }`}
                >
                    Shift Requests Log ({requests.length})
                </button>
            </div>

            {/* TAB 1: LOCATION SHIFTS */}
            {activeTab === 'locations' && (
                <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08] overflow-hidden">
                    <div className="p-4 border-b border-[#1a1a1a]/[0.08] bg-[#f6f4ef]/60 flex items-center justify-between">
                        <h3 className="font-bold text-sm text-[#1a1a1a]/85">
                            Location-Wise Live Manpower Attendance & Shift Completion
                        </h3>
                        <span className="text-xs bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-mono">
                            Read-Only Executive View
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[#1a1a1a]/[0.06] text-sm">
                            <thead className="bg-[#f6f4ef]/60 text-[#1a1a1a]/55 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-5 py-3 text-left">Location / Site</th>
                                    <th className="px-5 py-3 text-left">Address</th>
                                    <th className="px-5 py-3 text-center">Scheduled</th>
                                    <th className="px-5 py-3 text-center">Started Shift</th>
                                    <th className="px-5 py-3 text-center">Ended Shift</th>
                                    <th className="px-5 py-3 text-center">Active Right Now</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1a1a1a]/[0.06] bg-white">
                                {locationShifts.map((loc) => (
                                    <tr key={loc.site_id} className="hover:bg-[#f6f4ef]/60 transition-colors">
                                        <td className="px-5 py-4 font-bold text-[#1a1a1a]">
                                            {loc.site_name}
                                            <div className="text-[11px] text-[#1a1a1a]/40 font-mono font-normal">Site #{loc.site_id}</div>
                                        </td>
                                        <td className="px-5 py-4 text-[#1a1a1a]/65 text-xs">{loc.site_address || 'Qatar'}</td>
                                        <td className="px-5 py-4 text-center font-bold text-[#1a1a1a]/85">{loc.total_scheduled}</td>
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
                                            <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                {loc.active_on_site}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {locationShifts.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-12 text-center text-[#1a1a1a]/40">
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
                <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08] overflow-hidden">
                    <div className="p-4 border-b border-[#1a1a1a]/[0.08] font-bold text-sm text-[#1a1a1a]">
                        Company Shift Log
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[#1a1a1a]/[0.06] text-sm">
                            <thead className="bg-[#f6f4ef]/60 text-[#1a1a1a]/55 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-5 py-3 text-left">Req ID</th>
                                    <th className="px-5 py-3 text-left">Date</th>
                                    <th className="px-5 py-3 text-left">Time Window</th>
                                    <th className="px-5 py-3 text-left">Drivers Needed</th>
                                    <th className="px-5 py-3 text-left">Skill Category</th>
                                    <th className="px-5 py-3 text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1a1a1a]/[0.06] bg-white">
                                {requests.map(r => (
                                    <tr key={r.id} className="hover:bg-[#f6f4ef]/60 transition-colors">
                                        <td className="px-5 py-4 font-bold text-[#1a1a1a]">#{r.id}</td>
                                        <td className="px-5 py-4 text-[#1a1a1a]/65">
                                            {r.required_date ? calendarDate(r.required_date) : '-'}
                                        </td>
                                        <td className="px-5 py-4 font-mono text-xs text-[#1a1a1a]/65">{r.start_time} - {r.end_time}</td>
                                        <td className="px-5 py-4 font-bold text-[#1a1a1a]/85">{r.total_required_workers} Drivers</td>
                                        <td className="px-5 py-4 text-[#1a1a1a]/55">{r.skill_category || 'Valet Driver'}</td>
                                        <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                                    </tr>
                                ))}
                                {requests.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-8 text-center text-[#1a1a1a]/40">No shift requests found.</td>
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
