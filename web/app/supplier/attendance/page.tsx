"use client";
import { qatarTime } from '@/lib/time';
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

/** One row of /attendance/supplier-live */
type LiveRecord = { internal_worker_id: string; shift_window: string; check_in_time: string | null; status: string; [key: string]: unknown };
type LiveWorker = LiveRecord & { internal_id: string; scheduled_shift: string; check_in_method: string };

export default function SupplierAttendancePage() {
    const [liveData, setLiveData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [search, setSearch] = useState('');

    const loadLiveData = async () => {
        try {
            const [records, roster, shifts] = await Promise.all([
                fetchApi('/attendance/supplier-live'),
                fetchApi('/workers/'),
                fetchApi('/attendance/supplier-shifts')
            ]);
            const shiftList = Array.isArray(shifts) ? shifts : [];
            // The API lists today's assigned shifts; shape them for this page and count the full roster
            const statusMap: Record<string, string> = { ON_SHIFT: 'ON_SHIFT', SHIFT_ENDED: 'COMPLETED', SCHEDULED: 'NOT_STARTED' };
            const workers: LiveWorker[] = (Array.isArray(records) ? (records as LiveRecord[]) : []).map(r => ({
                ...r,
                internal_id: r.internal_worker_id,
                scheduled_shift: r.shift_window,
                check_in_method: r.check_in_time ? 'QR + GPS + Selfie' : '—',
                status: statusMap[r.status] || r.status,
            }));
            setLiveData({
                workers,
                total_roster_count: Array.isArray(roster) ? roster.length : 0,
                active_on_shift_count: workers.filter(w => w.status === 'ON_SHIFT').length,
                ended_shift_count: workers.filter(w => w.status === 'COMPLETED').length,
                not_checked_in_count: workers.filter(w => w.status === 'NOT_STARTED').length,
                shifts: shiftList,
                confirmed_count: shiftList.reduce((n: number, sh: any) => n + (sh.confirmed || 0), 0),
                checked_in_count: shiftList.reduce((n: number, sh: any) => n + (sh.checked_in || 0), 0),
                missing_count: shiftList.reduce((n: number, sh: any) => n + (sh.missing || 0), 0),
            });
        } catch (e) {
            // Keep the last data on screen if a refresh fails
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
                    <div className="mv-eyebrow basis-full mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#a8842f]"><span className="h-px w-6 bg-[#dbb457]" />Supplier Agency</div>
                    <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight text-[#1a1a1a] tracking-tight flex items-center gap-2"> Live Driver Shift Attendance
                    </h1>
                    <p className="text-sm text-[#1a1a1a]/55">
                        Real-time tracking of your agency's deployed drivers across all client locations.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                        Live Auto-Sync Active
                    </span>
                    <button
                        onClick={loadLiveData}
                        className="text-xs bg-white hover:bg-[#f6f4ef]/60 border border-[#1a1a1a]/[0.08] px-3 py-1.5 rounded-lg font-medium text-[#1a1a1a]/75 shadow-[0_1px_2px_rgb(26_26_26/0.04)]"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* KPI Cards: confirmed places against drivers who actually checked in */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-[#1a1a1a]/[0.08] shadow-[0_1px_2px_rgb(26_26_26/0.04)]">
                    <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Confirmed Today</div>
                    <div className="text-3xl font-bold text-[#1a1a1a] mt-1">{liveData?.confirmed_count || 0}</div>
                    <div className="text-xs text-[#1a1a1a]/55 mt-1">Drivers promised to Operations</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-[#1a1a1a]/[0.08] shadow-[0_1px_2px_rgb(26_26_26/0.04)]">
                    <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Checked In</div>
                    <div className="text-3xl font-bold text-[#1a1a1a] mt-1">{liveData?.checked_in_count || 0}</div>
                    <div className="text-xs text-[#1a1a1a]/55 mt-1">Arrived at the venue</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-[0_1px_2px_rgb(26_26_26/0.04)] bg-emerald-50/20">
                    <div className="text-xs font-bold uppercase text-emerald-600">On Shift Now</div>
                    <div className="text-3xl font-bold text-emerald-600 mt-1">{liveData?.active_on_shift_count || 0}</div>
                    <div className="text-xs text-emerald-700 mt-1">Clocked in & working</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-[0_1px_2px_rgb(26_26_26/0.04)] bg-blue-50/20">
                    <div className="text-xs font-bold uppercase text-blue-600">Completed</div>
                    <div className="text-3xl font-bold text-blue-600 mt-1">{liveData?.ended_shift_count || 0}</div>
                    <div className="text-xs text-blue-700 mt-1">Shift ended today</div>
                </div>
                <div className={`bg-white p-5 rounded-2xl border shadow-[0_1px_2px_rgb(26_26_26/0.04)] ${(liveData?.missing_count || 0) > 0 ? 'border-rose-200 bg-rose-50/30' : 'border-[#1a1a1a]/[0.08]'}`}>
                    <div className="text-xs font-bold uppercase text-rose-600">Missing</div>
                    <div className="text-3xl font-bold text-rose-600 mt-1">{liveData?.missing_count || 0}</div>
                    <div className="text-xs text-rose-700 mt-1">Confirmed but not checked in</div>
                </div>
            </div>

            {/* Today's confirmed shifts */}
            <div className="bg-white rounded-2xl border border-[#1a1a1a]/[0.08] shadow-[0_1px_2px_rgb(26_26_26/0.04)] overflow-hidden">
                <div className="p-4 border-b border-[#1a1a1a]/[0.08] bg-[#f6f4ef]/60 font-bold text-sm text-[#1a1a1a]/85">Today&apos;s confirmed shifts</div>
                {(liveData?.shifts || []).length === 0 ? (
                    <div className="p-6 text-center text-sm text-[#1a1a1a]/40">No confirmed shifts for your agency today.</div>
                ) : (
                    <ul className="divide-y divide-[#1a1a1a]/[0.05]">
                        {liveData.shifts.map((sh: any) => (
                            <li key={sh.response_id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <div className="font-bold text-[#1a1a1a]">{sh.site_name}</div>
                                    <div className="text-xs text-[#1a1a1a]/55 font-mono">Request #{sh.request_id} • {sh.shift_window}</div>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs font-bold">
                                    <span className="px-2 py-1 rounded bg-[#1a1a1a]/[0.05] text-[#1a1a1a]/85">{sh.checked_in} / {sh.confirmed} checked in</span>
                                    <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800">{sh.on_duty} on duty</span>
                                    <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">{sh.finished} finished</span>
                                    <span className={`px-2 py-1 rounded ${sh.missing > 0 ? 'bg-rose-100 text-rose-800' : 'bg-[#1a1a1a]/[0.05] text-[#1a1a1a]/55'}`}>{sh.missing} missing</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-[#1a1a1a]/[0.08] shadow-[0_1px_2px_rgb(26_26_26/0.04)] flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <span className="text-xs font-bold uppercase text-[#1a1a1a]/40 mr-2">Filter:</span>
                    {['ALL', 'ON_SHIFT', 'COMPLETED', 'NOT_STARTED'].map((st) => (
                        <button
                            key={st}
                            onClick={() => setFilterStatus(st)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                filterStatus === st
                                    ? 'bg-[#1a1a1a] text-white shadow-[0_1px_2px_rgb(26_26_26/0.04)]'
                                    : 'bg-[#1a1a1a]/[0.05] text-[#1a1a1a]/65 hover:bg-[#1a1a1a]/[0.08]'
                            }`}
                        >
                            {st === 'ALL' ? 'All Drivers' : st === 'ON_SHIFT' ? 'On Shift' : st === 'COMPLETED' ? 'Ended Shift' : 'Not Started'}
                        </button>
                    ))}
                </div>
                <input
                    type="text"
                    placeholder="Search by driver name, QID, ID, or location..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full md:w-80 border border-[#1a1a1a]/15 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#dbb457]/40 focus:outline-none"
                />
            </div>

            {/* Attendance Roster Table */}
            <div className="bg-white rounded-2xl border border-[#1a1a1a]/[0.08] shadow-[0_1px_2px_rgb(26_26_26/0.04)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#1a1a1a]/[0.06] text-sm">
                        <thead className="bg-[#f6f4ef]/60 text-[#1a1a1a]/55 font-semibold text-xs uppercase tracking-wider">
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
                        <tbody className="divide-y divide-[#1a1a1a]/[0.05]">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center text-[#1a1a1a]/40">Loading live shift data...</td>
                                </tr>
                            ) : filteredWorkers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center text-[#1a1a1a]/40">No driver records found.</td>
                                </tr>
                            ) : (
                                filteredWorkers.map((w: any) => (
                                    <tr key={w.worker_id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <div className="font-bold text-[#1a1a1a]">{w.worker_name}</div>
                                            <div className="text-xs text-[#1a1a1a]/40">ID #{w.worker_id}</div>
                                        </td>
                                        <td className="px-5 py-3.5 text-xs font-mono text-[#1a1a1a]/65">
                                            <div>QID: <span className="font-semibold text-[#1a1a1a]">{w.qid || 'N/A'}</span></div>
                                            <div>Badge: {w.internal_id || '-'}</div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {w.status === 'ON_SHIFT' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                    On Shift
                                                </span>
                                            )}
                                            {w.status === 'COMPLETED' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                                    Shift Ended
                                                </span>
                                            )}
                                            {w.status === 'NOT_STARTED' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#1a1a1a]/[0.05] text-[#1a1a1a]/65">
                                                    Not Started
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="font-medium text-[#1a1a1a]">{w.site_name || '—'}</div>
                                            {w.scheduled_shift && (
                                                <div className="text-xs text-[#1a1a1a]/40 font-mono">Shift: {w.scheduled_shift}</div>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-xs font-mono">
                                            {w.check_in_time ? (
                                                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                                    {qatarTime(w.check_in_time)}
                                                </span>
                                            ) : (
                                                <span className="text-[#1a1a1a]/40">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-xs font-mono">
                                            {w.check_out_time ? (
                                                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                    {qatarTime(w.check_out_time)}
                                                </span>
                                            ) : (
                                                <span className="text-[#1a1a1a]/40">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-xs text-[#1a1a1a]/55 uppercase font-mono">
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
