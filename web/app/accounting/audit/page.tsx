"use client";
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { qatarTime } from '@/lib/time';
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import ExportButtons from '@/components/ui/ExportButtons';

export default function AccountingAudit() {
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchApi('/reports/attendance')
            .then(setReport)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <DashboardSkeleton />;

    const totalHours = report?.summary?.total_duty_hours || 0;
    const totalWorkers = report?.summary?.total_present_days || 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="mv-eyebrow basis-full mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#a8842f]"><span className="h-px w-6 bg-[#dbb457]" />Accounting</div>
                    <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight text-[#1a1a1a]">Duty Hours Reconciliation Audit</h1>
                    <p className="text-sm text-[#1a1a1a]/55">Cross-reference biometric check-in timestamps with contractor billing records</p>
                </div>
                <ExportButtons base="/reports/attendance/export" filename={`attendance-audit-${new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Qatar' })}`} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08]">
                    <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Total Verified Duty Hours</div>
                    <div className="text-3xl font-bold text-[#1a1a1a] mt-2">{totalHours} hrs</div>
                    <div className="text-xs text-[#1a1a1a]/55 mt-1">Calculated between check-in and check-out</div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08]">
                    <div className="text-xs font-bold uppercase text-[#1a1a1a]/40">Verified Worker Shifts</div>
                    <div className="text-3xl font-bold text-[#1a1a1a] mt-2">{totalWorkers} Shifts</div>
                    <div className="text-xs text-[#1a1a1a]/55 mt-1">Geofence and biometric validated</div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#1a1a1a]/[0.06] text-sm">
                        <thead className="bg-[#f6f4ef]/60 text-[#1a1a1a]/55 text-xs uppercase font-semibold">
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
                        <tbody className="divide-y divide-[#1a1a1a]/[0.06] bg-white">
                            {(report?.records || []).map((r: any, idx: number) => (
                                <tr key={idx} className="hover:bg-[#f6f4ef]/60 transition-colors">
                                    <td className="px-5 py-4 font-bold text-[#1a1a1a]">{r.worker_name}</td>
                                    <td className="px-5 py-4 text-[#1a1a1a]/65">{r.site_name}</td>
                                    <td className="px-5 py-4 text-[#1a1a1a]/65">{r.required_date}</td>
                                    <td className="px-5 py-4 font-mono text-xs text-[#1a1a1a]/75">
                                        {r.check_in_time ? qatarTime(r.check_in_time, true) : '-'}
                                    </td>
                                    <td className="px-5 py-4 font-mono text-xs text-[#1a1a1a]/75">
                                        {r.check_out_time ? qatarTime(r.check_out_time, true) : '-'}
                                    </td>
                                    <td className="px-5 py-4 font-bold text-[#1a1a1a]">{r.duty_hours} hrs</td>
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
                                    <td colSpan={7} className="px-5 py-8 text-center text-[#1a1a1a]/40">
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
