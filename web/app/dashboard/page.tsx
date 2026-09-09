"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '../../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const data = await fetchApi('/dashboard/stats');
            setStats(data);
        } catch (error) {
            console.error("Failed to load dashboard stats", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex h-64 items-center justify-center text-gray-500">Loading Dashboard Analytics...</div>;
    }

    if (!stats) return <div className="text-red-500">Failed to load statistics.</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-gray-900">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Locations</h3>
                    <p className="mt-2 text-4xl font-extrabold text-gray-900">{stats.total_locations}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-[#dbb457]">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Employees</h3>
                    <p className="mt-2 text-4xl font-extrabold text-gray-900">{stats.total_workers}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-gray-300">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Avg Daily Login</h3>
                    <p className="mt-2 text-4xl font-extrabold text-gray-900">{stats.avg_daily_login}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Locations */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Top Locations by Attendance</h2>
                    {stats.top_locations.length > 0 ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.top_locations} layout="vertical" margin={{ left: 20, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={100} />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#dbb457" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">No attendance data yet.</p>
                    )}
                </div>

                {/* Top Managers */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Top Requesting Managers</h2>
                    {stats.top_managers.length > 0 ? (
                        <div className="space-y-4">
                            {stats.top_managers.map((m: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <span className="font-medium text-gray-700">{m.name}</span>
                                    <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-semibold">{m.count} Requests</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">No manpower requests yet.</p>
                    )}
                </div>
            </div>

            {/* Upcoming Requests */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Upcoming Advance Requests</h2>
                {stats.upcoming_requests.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Site</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Workers Requested</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stats.upcoming_requests.map((r: any) => (
                                    <tr key={r.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.site}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.date}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#dbb457] font-bold">{r.quantity}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">No upcoming requests.</p>
                )}
            </div>
        </div>
    );
}
