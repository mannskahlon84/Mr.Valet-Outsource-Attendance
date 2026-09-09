"use client";
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function SupplierNotifications() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = () => {
        fetchApi('/notifications/')
            .then(data => setNotifications(data || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, []);

    const markAsRead = async (id: number) => {
        try {
            await fetchApi(`/notifications/${id}/read`, { method: 'PATCH' });
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading notifications...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-black text-gray-900">Agency Dispatch Notifications</h1>
                <p className="text-sm text-gray-500">Real-time alerts regarding new shift assignments and confirmation updates</p>
            </div>

            <div className="space-y-3">
                {notifications.map((n) => (
                    <div 
                        key={n.id} 
                        className={`p-5 rounded-xl border transition-colors flex justify-between items-start gap-4 ${
                            n.is_read 
                                ? 'bg-white border-gray-200 text-gray-600' 
                                : 'bg-amber-50/50 border-[#dbb457] text-gray-900 shadow-sm'
                        }`}
                    >
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                {!n.is_read && <span className="h-2 w-2 rounded-full bg-[#dbb457]" />}
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                    {n.entity_type || 'DISPATCH_ALERT'}
                                </span>
                                <span className="text-xs text-gray-400">• {new Date(n.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-sm font-medium">{n.message}</p>
                        </div>

                        {!n.is_read && (
                            <button 
                                onClick={() => markAsRead(n.id)}
                                className="text-xs font-bold text-[#dbb457] hover:underline whitespace-nowrap"
                            >
                                Mark as Read
                            </button>
                        )}
                    </div>
                ))}

                {notifications.length === 0 && (
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center text-gray-400">
                        No notifications found for your agency account.
                    </div>
                )}
            </div>
        </div>
    );
}
