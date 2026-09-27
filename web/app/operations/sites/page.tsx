"use client";
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function OperationsSites() {
    const [sites, setSites] = useState<any[]>([]);
    const [managerName, setManagerName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const name = sessionStorage.getItem('name') || '';
        setManagerName(name);
        fetchApi('/sites/')
            .then(data => {
                const filtered = data || [];
                setSites(filtered);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <div className="mv-eyebrow basis-full mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#a8842f]"><span className="h-px w-6 bg-[#dbb457]" />Operations</div>
                    <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight text-[#1a1a1a]">Managed Locations</h1>
                    <p className="text-sm text-[#1a1a1a]/55">Active valet parking client sites under your operational supervision</p>
                </div>
                <div className="text-xs bg-amber-50 border border-amber-200 text-amber-900 font-bold px-3 py-1.5 rounded-lg shadow-[0_1px_2px_rgb(26_26_26/0.04)]">
                    {sites.length} Assigned Locations for {managerName || 'Operations Manager'}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sites.map(s => (
                    <div key={s.id} className="bg-white p-5 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08] space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-[#1a1a1a] text-base">{s.name}</h3>
                                <p className="text-xs text-[#1a1a1a]/55">{s.address || 'Doha, Qatar'}</p>
                            </div>
                            <span className="text-xs bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded">
                                {s.status || 'Active'}
                            </span>
                        </div>

                        <div className="text-xs space-y-1 text-[#1a1a1a]/65 bg-[#f6f4ef]/60 p-3 rounded-lg border border-[#1a1a1a]/[0.05] font-mono">
                            <div>GPS Lat: {s.latitude ?? 'Not configured'}</div>
                            <div>GPS Lng: {s.longitude ?? 'Not configured'}</div>
                            <div>Geofence Radius: {s.geofence_radius_meters || 100}m</div>
                        </div>

                        <div className="flex justify-between items-center text-xs text-[#1a1a1a]/40 pt-2 border-t border-[#1a1a1a]/[0.05]">
                            <span>Site ID: #{s.id}</span>
                            <span className="text-green-700 font-bold">● Geofence Active</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
