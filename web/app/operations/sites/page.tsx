"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function OperationsSites() {
    const [sites, setSites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchApi('/sites/').then(setSites).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading managed sites...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-black text-gray-900">Managed Locations</h1>
                <p className="text-sm text-gray-500">Active valet parking client sites and configured geofences</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sites.map(s => (
                    <div key={s.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-gray-900 text-base">{s.name}</h3>
                                <p className="text-xs text-gray-500">{s.address || 'Doha, Qatar'}</p>
                            </div>
                            <span className="text-xs bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded">
                                {s.status || 'Active'}
                            </span>
                        </div>

                        <div className="text-xs space-y-1 text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 font-mono">
                            <div>GPS Lat: {s.latitude ?? 'Not configured'}</div>
                            <div>GPS Lng: {s.longitude ?? 'Not configured'}</div>
                            <div>Geofence Radius: {s.geofence_radius_meters || 100}m</div>
                        </div>

                        <div className="flex justify-between items-center text-xs text-gray-400 pt-2 border-t border-gray-100">
                            <span>Site ID: #{s.id}</span>
                            <span className="text-green-700 font-bold">● Geofence Active</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
