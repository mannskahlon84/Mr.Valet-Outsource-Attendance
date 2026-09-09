"use client";
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
            const data: NotificationItem[] = await fetchApi('/notifications/');
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
                    }
                }

                data.forEach(n => knownIds.current.add(n.id));
                initialFetchDone.current = true;
            }
        } catch (e) {
            // Silently fail if not logged in or network error
        }
    };

    // Initial load + smart polling every 20 seconds + on tab focus
    useEffect(() => {
        fetchNotifications(false);
        const interval = setInterval(() => fetchNotifications(true), 20000);
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
        } catch (e) {}
    };

    const markAllRead = async () => {
        try {
            setLoading(true);
            await fetchApi('/notifications/mark-all-read', { method: 'POST' });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
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

    const triggerTestPush = async () => {
        try {
            setLoading(true);
            const res = await fetchApi('/notifications/test-push', { method: 'POST' });
            playChimeSound();
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([150, 80, 150]);
            }
            if (res?.notification_id) {
                const testItem: NotificationItem = {
                    id: res.notification_id,
                    title: res.title,
                    message: res.message,
                    is_read: false,
                    created_at: res.created_at
                };
                setActiveToast(testItem);
                setNotifications(prev => [testItem, ...prev]);
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                    new Notification(res.title || "In-App Push Test", {
                        body: res.message,
                        icon: "/logo.jpg"
                    });
                }
            }
        } catch (e: any) {
            alert(e.message || "Failed to trigger test push");
        } finally {
            setLoading(false);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const timeAgo = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
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
                    <div className="bg-gray-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-amber-400/40 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#dbb457] flex items-center justify-center text-gray-900 font-bold text-lg flex-shrink-0 shadow">
                            🔔
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                                {activeToast.title || 'In-App Push Alert'}
                            </div>
                            <p className="text-xs text-gray-200 mt-0.5 leading-snug line-clamp-2">
                                {activeToast.message}
                            </p>
                            <span className="text-[10px] text-gray-400 mt-1 block">Just now</span>
                        </div>
                        <button 
                            onClick={() => setActiveToast(null)}
                            className="text-gray-400 hover:text-white p-1 text-sm font-bold flex-shrink-0"
                            aria-label="Dismiss alert"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Bell Icon Button */}
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="relative p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none"
                aria-label="View notifications"
            >
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-600 text-white font-black text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 shadow-md animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Center Dropdown */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-[calc(100vw-32px)] sm:w-96 max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="p-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">🔔</span>
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
                                    className="text-gray-400 hover:text-white p-1 text-sm font-bold ml-1"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Permission Prompt Banner if not granted */}
                        {permStatus !== 'granted' && (
                            <div className="bg-amber-50 border-b border-amber-200 p-2.5 px-4 flex items-center justify-between text-xs text-amber-900">
                                <span>Enable sound & device alerts</span>
                                <button
                                    onClick={requestNativePermission}
                                    className="bg-[#dbb457] hover:bg-[#c29d45] text-white font-bold px-2.5 py-1 rounded text-[11px] transition-colors"
                                >
                                    Enable
                                </button>
                            </div>
                        )}

                        {/* Notification List */}
                        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-1">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-xs">
                                    <div className="text-3xl mb-2">📭</div>
                                    No notifications yet. You will receive push alerts when shifts are assigned or updated.
                                </div>
                            ) : (
                                notifications.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => markAsRead(item.id)}
                                        className={`p-3 rounded-xl transition-colors cursor-pointer flex items-start gap-3 ${
                                            item.is_read ? 'hover:bg-gray-50' : 'bg-amber-50/50 hover:bg-amber-50'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5 ${
                                            item.is_read ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-800'
                                        }`}>
                                            {item.entity_type === 'SHIFT_ASSIGNMENT' ? '🚘' :
                                             item.entity_type === 'MANPOWER_REQUEST' ? '📋' :
                                             item.entity_type === 'OPS_ALERT' ? '👥' : '🔔'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {item.title && (
                                                <div className={`text-xs font-bold leading-snug ${item.is_read ? 'text-gray-800' : 'text-amber-900'}`}>
                                                    {item.title}
                                                </div>
                                            )}
                                            <p className={`text-xs mt-0.5 leading-relaxed ${item.is_read ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>
                                                {item.message}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-gray-400">{timeAgo(item.created_at)}</span>
                                                {!item.is_read && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer with Test Push Alert button */}
                        <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                            <button
                                onClick={triggerTestPush}
                                disabled={loading}
                                className="text-[11px] font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                <span>⚡</span> Test Push Alert
                            </button>
                            <span className="text-[10px] text-gray-400">100% In-App • Zero API Cost</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
