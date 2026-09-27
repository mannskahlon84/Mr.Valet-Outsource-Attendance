"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import ExportButtons from '@/components/ui/ExportButtons';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { ui } from '@/lib/ui';
import { CalendarCheck, CalendarX, Clock, LogIn, LogOut, MapPin, Timer } from 'lucide-react';

export default function Attendance() {
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchApi('/reports/attendance').then(setReport).finally(() => setLoading(false));
    }, []);

    if (loading) return <DashboardSkeleton />;

    const summary = report?.summary || {};

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Administration"
                title="Attendance & Duty Hours"
                subtitle="Every verified check-in and check-out across all venues"
                actions={<ExportButtons base="/reports/attendance/export" filename={`attendance-${new Date().toISOString().slice(0, 10)}`} />}
            />
            
            <div className="mv-stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Total Duty Hours" value={Number(summary.total_duty_hours) || 0} decimals={1} suffix=" h" hint="Between check-in and check-out" icon={Timer} accent="ink" />
                <StatCard label="Present Days" value={summary.total_present_days || 0} hint="Driver shifts attended" icon={CalendarCheck} accent="green" />
                <StatCard label="Absent Days" value={summary.total_absent_days || 0} hint="Scheduled but not checked in" icon={CalendarX} accent="red" />
                <StatCard label="Locations" value={summary.number_of_locations || 0} hint="Venues with attendance" icon={MapPin} accent="gold" />
            </div>

            <div className={`${ui.card} overflow-hidden`}>
                <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="border-b border-[#1a1a1a]/[0.06] bg-[#f6f4ef]/60">
                        <tr>
                            <th className={ui.th}>Worker</th>
                            <th className={ui.th}>Location</th>
                            <th className={ui.th}>Date</th>
                            <th className={ui.th}>In / Out</th>
                            <th className={ui.th}>Hours</th>
                            <th className={ui.th}>Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1a1a1a]/[0.05]">
                        {(report?.records || []).map((r: any, idx: number) => (
                            <tr key={idx} className={ui.tr}>
                                <td className="whitespace-nowrap px-5 py-3.5">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f6f4ef] text-[11px] font-bold text-[#1a1a1a]/70">
                                            {(r.worker_name || '').split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()}
                                        </span>
                                        <span className="font-semibold text-[#1a1a1a]">{r.worker_name}</span>
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5 text-[#1a1a1a]/65">{r.site_name}</td>
                                <td className="whitespace-nowrap px-5 py-3.5 text-[#1a1a1a]/65">{r.required_date}</td>
                                <td className="whitespace-nowrap px-5 py-3.5 text-xs tabular-nums text-[#1a1a1a]/65">
                                    <div className="flex items-center gap-1.5"><LogIn className="h-3.5 w-3.5 text-emerald-600" />{r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : '-'}</div>
                                    <div className="mt-1 flex items-center gap-1.5"><LogOut className="h-3.5 w-3.5 text-sky-600" />{r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '-'}</div>
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5 font-semibold tabular-nums text-[#1a1a1a]">{r.duty_hours}</td>
                                <td className="whitespace-nowrap px-5 py-3.5">
                                    <StatusBadge status={r.status} />
                                </td>
                            </tr>
                        ))}
                        {(!report?.records || report.records.length === 0) && (
                            <tr><td colSpan={6}>
                                <div className="flex flex-col items-center gap-2 py-12 text-center">
                                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f6f4ef] text-[#1a1a1a]/35"><Clock className="h-5 w-5" /></span>
                                    <p className="text-sm text-[#1a1a1a]/45">No attendance records found.</p>
                                </div>
                            </td></tr>
                        )}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
}
