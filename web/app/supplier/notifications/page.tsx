"use client";
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { qatarDateTime } from '@/lib/time';
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

    useEffect(() => {
        loadData();
        // The header bell announces new alerts; refresh this list when it does
        window.addEventListener('portal_data_updated', loadData);
        return () => window.removeEventListener('portal_data_updated', loadData);
    }, []);

    const markAsRead = async (id: number) => {
        try {
            await fetchApi(`/notifications/${id}/read`, { method: 'PATCH' });
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <div className="mv-eyebrow basis-full mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#a8842f]"><span className="h-px w-6 bg-[#dbb457]" />Supplier Agency</div>
                <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight text-[#1a1a1a]">Agency Dispatch Notifications</h1>
                <p className="text-sm text-[#1a1a1a]/55">Real-time alerts regarding new shift assignments and confirmation updates</p>
            </div>

            <div className="space-y-3">
                {notifications.map((n) => (
                    <div 
                        key={n.id} 
                        className={`p-5 rounded-2xl border transition-colors flex justify-between items-start gap-4 ${
                            n.is_read 
                                ? 'bg-white border-[#1a1a1a]/[0.08] text-[#1a1a1a]/65' 
                                : 'bg-amber-50/50 border-[#dbb457] text-[#1a1a1a] shadow-[0_1px_2px_rgb(26_26_26/0.04)]'
                        }`}
                    >
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                {!n.is_read && <span className="h-2 w-2 rounded-full bg-[#1a1a1a]" />}
                                <span className="text-xs font-bold uppercase tracking-wider text-[#1a1a1a]/40">
                                    {n.entity_type || 'DISPATCH_ALERT'}
                                </span>
                                <span className="text-xs text-[#1a1a1a]/40">• {qatarDateTime(n.created_at)}</span>
                            </div>
                            <p className="text-sm font-medium">{n.message}</p>
                        </div>

                        {!n.is_read && (
                            <button 
                                onClick={() => markAsRead(n.id)}
                                className="text-xs font-bold text-[#a8842f] hover:underline whitespace-nowrap"
                            >
                                Mark as Read
                            </button>
                        )}
                    </div>
                ))}

                {notifications.length === 0 && (
                    <div className="bg-white p-8 rounded-2xl shadow-[0_1px_2px_rgb(26_26_26/0.04)] border border-[#1a1a1a]/[0.08] text-center text-[#1a1a1a]/40">
                        No notifications found for your agency account.
                    </div>
                )}
            </div>
        </div>
    );
}
