import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Bell, X, Check, CheckCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type NotificationType = 'ALERTA_CLIMA' | 'SOLICITUD_INVENTARIO' | 'SISTEMA';

interface Notification {
    notification_id: string;
    title: string;
    body: string;
    notification_type: NotificationType;
    entity: string | null;
    entity_id: string | null;
    is_read: boolean;
    created_at: string;
}

const TYPE_STYLES: Record<NotificationType, { dot: string; badge: string }> = {
    ALERTA_CLIMA:         { dot: 'bg-red-500',   badge: 'bg-red-500/10 text-red-400 border-red-500/20' },
    SOLICITUD_INVENTARIO: { dot: 'bg-blue-500',  badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    SISTEMA:              { dot: 'bg-slate-400', badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
};

const TYPE_LABEL: Record<NotificationType, string> = {
    ALERTA_CLIMA:         'Clima',
    SOLICITUD_INVENTARIO: 'Inventario',
    SISTEMA:              'Sistema',
};

const fmtTime = (d: string) =>
    new Date(d).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const NotificationBell: React.FC = () => {
    const { token } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const headers = { Authorization: `Bearer ${token}` };

    const fetchNotifications = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/notifications`, { headers });
            const json = await res.json();
            setNotifications(json.data ?? []);
        } catch {
            // silently fail — bell is non-critical
        } finally {
            setLoading(false);
        }
    }, [token]);

    // Fetch on mount and every 60 s
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60_000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const markRead = async (id: string) => {
        try {
            await fetch(`${API}/api/notifications/${id}/read`, { method: 'PATCH', headers });
            setNotifications(prev =>
                prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n)
            );
        } catch { /* ignore */ }
    };

    const markAllRead = async () => {
        const unread = notifications.filter(n => !n.is_read);
        await Promise.all(unread.map(n => markRead(n.notification_id)));
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;
    // Show latest 10
    const visible = notifications.slice(0, 10);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell button */}
            <button
                onClick={() => { setOpen(o => !o); if (!open) fetchNotifications(); }}
                className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200"
                title="Notificaciones"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                        <span className="text-sm font-bold text-white">Notificaciones</span>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    Marcar todas
                                </button>
                            )}
                            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
                        {loading && notifications.length === 0 ? (
                            <div className="py-8 text-center text-slate-500 text-sm">Cargando...</div>
                        ) : visible.length === 0 ? (
                            <div className="py-8 text-center text-slate-500 text-sm">Sin notificaciones</div>
                        ) : (
                            visible.map(n => {
                                const type = (n.notification_type as NotificationType) in TYPE_STYLES
                                    ? (n.notification_type as NotificationType)
                                    : 'SISTEMA';
                                const styles = TYPE_STYLES[type];
                                return (
                                    <div
                                        key={n.notification_id}
                                        onClick={() => !n.is_read && markRead(n.notification_id)}
                                        className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors ${
                                            n.is_read ? 'opacity-50' : 'hover:bg-white/5'
                                        }`}
                                    >
                                        {/* Color dot */}
                                        <div className="mt-1 flex-shrink-0">
                                            <span className={`block w-2 h-2 rounded-full ${n.is_read ? 'bg-slate-600' : styles.dot}`} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm font-semibold truncate ${n.is_read ? 'text-slate-400' : 'text-white'}`}>
                                                    {n.title}
                                                </p>
                                                <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${styles.badge}`}>
                                                    {TYPE_LABEL[type]}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
                                            <p className="text-[10px] text-slate-600 mt-1">{fmtTime(n.created_at)}</p>
                                        </div>

                                        {!n.is_read && (
                                            <button
                                                onClick={e => { e.stopPropagation(); markRead(n.notification_id); }}
                                                className="flex-shrink-0 mt-1 text-slate-600 hover:text-emerald-400 transition-colors"
                                                title="Marcar como leída"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
