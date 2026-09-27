"use client";
import { parseInstant } from '@/lib/time';
import { Bell, Car, ClipboardList, Inbox, Users, X } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { fetchApi } from '@/lib/api';

interface NotificationItem {
    id: number;
    title?: string;
    message: string;
    is_read: boolean;
    entity_type?: string;
    entity_id?: any;
    created_at: string;
}

// Browser Web Audio chime (Zero external audio file dependencies!)
function playChimeSound() {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
        // Audio may be blocked until user gesture, ignore safely
    }
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);
    const [permStatus, setPermStatus] = useState<string>('default');
    const [loading, setLoading] = useState(false);
    // Unread alerts addressed to this user (the list may also show others' alerts to management)
    const [unreadCount, setUnreadCount] = useState(0);
    const knownIds = useRef<Set<number>>(new Set());
    const initialFetchDone = useRef<boolean>(false);

    // Check browser notification permission
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermStatus(Notification.permission);
        }
    }, []);

    const fetchNotifications = async (isPoll = false) => {
        try {
            const [data, unread] = await Promise.all([
                fetchApi('/notifications/') as Promise<NotificationItem[]>,
                fetchApi('/notifications/unread-count').catch(() => null),
            ]);
            if (unread && typeof unread.unread === 'number') setUnreadCount(unread.unread);
            if (Array.isArray(data)) {
                setNotifications(data);

                // Detect newly arrived notifications
                if (isPoll && initialFetchDone.current) {
                    const newItems = data.filter(n => !knownIds.current.has(n.id) && !n.is_read);
                    if (newItems.length > 0) {
                        const latest = newItems[0];
                        // Play inside-app sound
                        playChimeSound();
                        // Vibrate mobile phone
                        if (typeof navigator !== 'undefined' && navigator.vibrate) {
                            navigator.vibrate([120, 80, 120]);
                        }
                        // Show in-app slide-down banner
                        setActiveToast(latest);
                        // Trigger native browser notification if granted (100% free)
                        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                            try {
                                new Notification(latest.title || "Mr. Valet Dispatch", {
                                    body: latest.message,
                                    icon: "/logo.jpg"
                                });
                            } catch (e) {}
                        }

                        // Emit event for pages to auto-refresh data immediately
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('portal_data_updated', { detail: latest }));
                        }
                    }
                }

                data.forEach(n => knownIds.current.add(n.id));
                initialFetchDone.current = true;
            }
        } catch (e) {
            // Silently fail if not logged in or network error
        }
    };

    // Cross-tab real-time sync via BroadcastChannel
    useEffect(() => {
        let bc: BroadcastChannel | null = null;
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            try {
                bc = new BroadcastChannel('mr_valet_portal_sync');
                bc.onmessage = () => {
                    fetchNotifications(true);
                };
            } catch (e) {}
        }
        return () => {
            if (bc) bc.close();
        };
    }, []);

    // Initial load + fast 3-second polling for instant test updates + on tab focus
    useEffect(() => {
        fetchNotifications(false);
        const interval = setInterval(() => fetchNotifications(true), 3000);
        const onFocus = () => fetchNotifications(true);
        window.addEventListener('focus', onFocus);
        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', onFocus);
        };
    }, []);

    // Auto-dismiss toast after 6 seconds
    useEffect(() => {
        if (!activeToast) return;
        const timer = setTimeout(() => setActiveToast(null), 6000);
        return () => clearTimeout(timer);
    }, [activeToast]);

    const markAsRead = async (id: number) => {
        try {
            await fetchApi(`/notifications/${id}/read`, { method: 'PATCH' });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(c => Math.max(0, c - 1));
        } catch (e) {}
    };

    const markAllRead = async () => {
        try {
            setLoading(true);
            await fetchApi('/notifications/mark-all-read', { method: 'POST' });
            await fetchNotifications(false);
        } catch (e) {} finally {
            setLoading(false);
        }
    };

    const requestNativePermission = async () => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            const res = await Notification.requestPermission();
            setPermStatus(res);
            if (res === 'granted') {
                playChimeSound();
                new Notification("Notifications Enabled!", {
                    body: "You will now receive instant shift and dispatch alerts inside your browser.",
                    icon: "/logo.jpg"
                });
            }
        }
    };

    const timeAgo = (dateStr: string) => {
        try {
            const date = parseInstant(dateStr) || new Date(dateStr);
            const now = new Date();
            const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
            if (diffSec < 60) return 'Just now';
            if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
            if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
            return `${Math.floor(diffSec / 86400)}d ago`;
        } catch {
            return '';
        }
    };

    return (
        <div className="relative">
            {/* Top Slide-Down In-App Push Banner Toast */}
            {activeToast && (
                <div className="fixed top-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-in fade-in slide-in-from-top duration-300">
                    <div className="mv-pop bg-[#1a1a1a]/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-[#dbb457]/40 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#dbb457] flex items-center justify-center text-[#1a1a1a] flex-shrink-0 shadow">
                            <Bell className="h-4 w-4" strokeWidth={2.2} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-[#dbb457] uppercase tracking-wider">
                                {activeToast.title || 'In-App Push Alert'}
                            </div>
                            <p className="text-xs text-white/85 mt-0.5 leading-snug line-clamp-2">
                                {activeToast.message}
                            </p>
                            <span className="text-[10px] text-white/50 mt-1 block">Just now</span>
                        </div>
                        <button 
                            onClick={() => setActiveToast(null)}
                            className="text-white/50 hover:text-white p-1 flex-shrink-0"
                            aria-label="Dismiss alert"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Bell Icon Button */}
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="relative rounded-xl p-2.5 text-[#1a1a1a]/65 transition-colors hover:bg-[#1a1a1a]/5 hover:text-[#1a1a1a]"
                aria-label="View notifications"
            >
                <Bell className="h-5 w-5" strokeWidth={1.9} />
                {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#dbb457] px-1 text-[10px] font-bold text-[#1a1a1a] ring-2 ring-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Center Dropdown */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="mv-pop absolute right-0 mt-2 w-[calc(100vw-32px)] sm:w-96 max-w-sm bg-white rounded-2xl shadow-2xl border border-[#1a1a1a]/[0.06] z-50 overflow-hidden flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="p-4 bg-[#1a1a1a] text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bell className="h-4 w-4 text-[#dbb457]" strokeWidth={2} />
                                <h3 className="font-bold text-sm">Notifications</h3>
                                {unreadCount > 0 && (
                                    <span className="bg-[#dbb457] text-gray-950 font-black text-[10px] px-2 py-0.5 rounded-full">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllRead}
                                        disabled={loading}
                                        className="text-[11px] text-amber-300 hover:text-white font-medium px-2 py-1 rounded hover:bg-white/10 transition-colors"
                                    >
                                        Mark all read
                                    </button>
                                )}
                                <button 
                                    onClick={() => setIsOpen(false)} 
                                    className="text-white/50 hover:text-white p-1 ml-1"
                                    aria-label="Close notifications"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Permission Prompt Banner if not granted */}
                        {permStatus !== 'granted' && (
                            <div className="bg-amber-50 border-b border-amber-200 p-2.5 px-4 flex items-center justify-between text-xs text-amber-900">
                                <span>Enable sound & device alerts</span>
                                <button
                                    onClick={requestNativePermission}
                                    className="bg-[#1a1a1a] hover:bg-[#dbb457] hover:text-[#1a1a1a] text-white font-semibold px-2.5 py-1 rounded-lg text-[11px] transition-colors"
                                >
                                    Enable
                                </button>
                            </div>
                        )}

                        {/* Notification List */}
                        <div className="flex-1 overflow-y-auto divide-y divide-[#1a1a1a]/[0.05] p-1">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-[#1a1a1a]/45 text-xs">
                                    <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f6f4ef] text-[#1a1a1a]/35"><Inbox className="h-5 w-5" /></span>
                                    No notifications yet. You will receive push alerts when shifts are assigned or updated.
                                </div>
                            ) : (
                                notifications.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => markAsRead(item.id)}
                                        className={`p-3 rounded-xl transition-colors cursor-pointer flex items-start gap-3 ${
                                            item.is_read ? 'hover:bg-[#f6f4ef]' : 'bg-[#dbb457]/[0.08] hover:bg-[#dbb457]/15'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                            item.is_read ? 'bg-[#1a1a1a]/[0.05] text-[#1a1a1a]/50' : 'bg-[#1a1a1a] text-[#dbb457]'
                                        }`}>
                                            {item.entity_type === 'SHIFT_ASSIGNMENT' ? <Car className="h-4 w-4" /> :
                                             item.entity_type === 'MANPOWER_REQUEST' ? <ClipboardList className="h-4 w-4" /> :
                                             item.entity_type === 'OPS_ALERT' ? <Users className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {item.title && (
                                                <div className={`text-xs font-bold leading-snug ${item.is_read ? 'text-[#1a1a1a]/80' : 'text-[#1a1a1a]'}`}>
                                                    {item.title}
                                                </div>
                                            )}
                                            <p className={`text-xs mt-0.5 leading-relaxed ${item.is_read ? 'text-[#1a1a1a]/55' : 'text-[#1a1a1a]/85 font-medium'}`}>
                                                {item.message}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-[#1a1a1a]/40">{timeAgo(item.created_at)}</span>
                                                {!item.is_read && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#dbb457]"></span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                    </div>
                </>
            )}
        </div>
    );
}
