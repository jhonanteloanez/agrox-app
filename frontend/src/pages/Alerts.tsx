import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    CloudRain, Plus, Trash2, X, AlertCircle, CheckCircle,
    Loader2, CloudLightning, Droplets
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ── Types ──────────────────────────────────────────────────────────────────────

type AlertType = 'SEQUIA' | 'EXCESO_LLUVIA';

interface Property {
    property_id: string;
    name: string;
}

interface AlertConfig {
    config_id: string;
    property_id: string;
    property_name?: string;
    alert_type: AlertType;
    threshold_value: number;
    threshold_unit: string;
    notify_inapp: boolean;
    notify_whatsapp: boolean;
    whatsapp_number: string | null;
    created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const ALERT_TYPE_INFO: Record<AlertType, { label: string; icon: React.FC<any>; color: string }> = {
    SEQUIA:        { label: 'Sequía',        icon: CloudLightning, color: 'text-amber-400'  },
    EXCESO_LLUVIA: { label: 'Exceso Lluvia', icon: Droplets,       color: 'text-blue-400'   },
};

const BLANK_FORM = {
    property_id: '',
    alert_type: 'SEQUIA' as AlertType,
    threshold_value: '',
    threshold_unit: 'mm',
    notify_inapp: true,
    notify_whatsapp: false,
    whatsapp_number: '',
};

// ── Component ──────────────────────────────────────────────────────────────────

const AlertsPage: React.FC = () => {
    const { token } = useAuth();

    const [alerts, setAlerts] = useState<AlertConfig[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(BLANK_FORM);
    const [propertyFilter, setPropertyFilter] = useState('');

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    // ── Fetch ────────────────────────────────────────────────────────────────

    const fetchAlerts = useCallback(async () => {
        setLoading(true);
        try {
            const url = propertyFilter
                ? `${API}/api/alerts?property_id=${propertyFilter}`
                : `${API}/api/alerts`;
            const res = await fetch(url, { headers });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setAlerts(json.data ?? []);
        } catch (e: any) {
            setError(e.message || 'Error al cargar alertas');
        } finally {
            setLoading(false);
        }
    }, [token, propertyFilter]);

    const fetchProperties = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/properties`, { headers });
            const json = await res.json();
            if (res.ok) setProperties(json);
        } catch { /* ignore */ }
    }, [token]);

    useEffect(() => { fetchProperties(); }, [fetchProperties]);
    useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

    // Auto-dismiss messages
    useEffect(() => {
        if (!error && !success) return;
        const t = setTimeout(() => { setError(''); setSuccess(''); }, 4000);
        return () => clearTimeout(t);
    }, [error, success]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.property_id) { setError('Seleccioná una propiedad'); return; }
        if (!form.threshold_value) { setError('Ingresá el umbral'); return; }
        if (form.notify_whatsapp && !form.whatsapp_number.trim()) {
            setError('Ingresá el número de WhatsApp');
            return;
        }

        setSubmitting(true);
        try {
            const body = {
                property_id:     form.property_id,
                alert_type:      form.alert_type,
                threshold_value: parseFloat(form.threshold_value),
                threshold_unit:  form.threshold_unit,
                notify_inapp:    form.notify_inapp,
                notify_whatsapp: form.notify_whatsapp,
                whatsapp_number: form.notify_whatsapp ? form.whatsapp_number.trim() : null,
            };
            const res = await fetch(`${API}/api/alerts`, {
                method: 'POST', headers, body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setSuccess('Alerta creada correctamente');
            setShowModal(false);
            setForm(BLANK_FORM);
            fetchAlerts();
        } catch (e: any) {
            setError(e.message || 'Error al crear alerta');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta alerta?')) return;
        try {
            const res = await fetch(`${API}/api/alerts/${id}`, { method: 'DELETE', headers });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setSuccess('Alerta eliminada');
            setAlerts(prev => prev.filter(a => a.config_id !== id));
        } catch (e: any) {
            setError(e.message || 'Error al eliminar alerta');
        }
    };

    const openModal = () => {
        setForm(BLANK_FORM);
        setShowModal(true);
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl">
                        <CloudRain className="w-5 h-5 text-sky-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Alertas Climáticas</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Configura umbrales para recibir alertas por propiedad</p>
                    </div>
                </div>
                <button
                    onClick={openModal}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                    <Plus className="w-4 h-4" /> Nueva Alerta
                </button>
            </div>

            {/* Feedback */}
            {error && (
                <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
            )}
            {success && (
                <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}
                </div>
            )}

            {/* Filter by property */}
            {properties.length > 0 && (
                <div className="mb-6">
                    <select
                        value={propertyFilter}
                        onChange={e => setPropertyFilter(e.target.value)}
                        className="bg-white/5 border border-white/10 text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500/50"
                    >
                        <option value="">Todas las propiedades</option>
                        {properties.map(p => (
                            <option key={p.property_id} value={p.property_id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Alerts list */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                </div>
            ) : alerts.length === 0 ? (
                <div className="text-center py-16">
                    <CloudRain className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Sin alertas configuradas</p>
                    <p className="text-slate-600 text-sm mt-1">Creá una alerta para esta propiedad</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {alerts.map(alert => {
                        const typeInfo = ALERT_TYPE_INFO[alert.alert_type as AlertType] ?? ALERT_TYPE_INFO.SEQUIA;
                        const Icon = typeInfo.icon;
                        return (
                            <div
                                key={alert.config_id}
                                className="flex items-center justify-between p-4 bg-white/3 border border-white/8 rounded-2xl hover:border-white/15 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-white/5 rounded-xl">
                                        <Icon className={`w-5 h-5 ${typeInfo.color}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">{typeInfo.label}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Umbral: <span className="text-slate-300 font-medium">{alert.threshold_value} {alert.threshold_unit}</span>
                                            {alert.property_name && (
                                                <> · <span className="text-slate-500">{alert.property_name}</span></>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {alert.notify_inapp && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-400">
                                            IN-APP
                                        </span>
                                    )}
                                    {alert.notify_whatsapp && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
                                            WHATSAPP
                                        </span>
                                    )}
                                    <button
                                        onClick={() => handleDelete(alert.config_id)}
                                        className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Create Modal ───────────────────────────────────────────────────── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1e293b] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <h3 className="text-base font-bold text-white">Nueva Alerta Climática</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
                            {/* Property */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Propiedad</label>
                                <select
                                    value={form.property_id}
                                    onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 text-slate-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500/50"
                                    required
                                >
                                    <option value="">Seleccionar propiedad…</option>
                                    {properties.map(p => (
                                        <option key={p.property_id} value={p.property_id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Alert type */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tipo de Alerta</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['SEQUIA', 'EXCESO_LLUVIA'] as AlertType[]).map(type => {
                                        const info = ALERT_TYPE_INFO[type];
                                        const Icon = info.icon;
                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setForm(f => ({ ...f, alert_type: type }))}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                                                    form.alert_type === type
                                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                        : 'bg-white/3 border-white/8 text-slate-400 hover:border-white/20'
                                                }`}
                                            >
                                                <Icon className={`w-4 h-4 ${info.color}`} />
                                                {info.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Threshold */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Umbral</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        value={form.threshold_value}
                                        onChange={e => setForm(f => ({ ...f, threshold_value: e.target.value }))}
                                        placeholder="Ej. 5"
                                        className="w-full bg-white/5 border border-white/10 text-slate-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500/50"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Unidad</label>
                                    <select
                                        value={form.threshold_unit}
                                        onChange={e => setForm(f => ({ ...f, threshold_unit: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 text-slate-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500/50"
                                    >
                                        <option value="mm">mm</option>
                                        <option value="°C">°C</option>
                                        <option value="días">días</option>
                                        <option value="%">%</option>
                                    </select>
                                </div>
                            </div>

                            {/* Notification toggles */}
                            <div className="space-y-2.5">
                                <label className="block text-xs font-semibold text-slate-400">Notificar por</label>

                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div
                                        onClick={() => setForm(f => ({ ...f, notify_inapp: !f.notify_inapp }))}
                                        className={`w-10 h-5 rounded-full transition-colors ${form.notify_inapp ? 'bg-emerald-500' : 'bg-white/10'} relative flex-shrink-0`}
                                    >
                                        <span className={`block w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${form.notify_inapp ? 'left-5' : 'left-0.5'}`} />
                                    </div>
                                    <span className="text-sm text-slate-300">In-App</span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div
                                        onClick={() => setForm(f => ({ ...f, notify_whatsapp: !f.notify_whatsapp }))}
                                        className={`w-10 h-5 rounded-full transition-colors ${form.notify_whatsapp ? 'bg-emerald-500' : 'bg-white/10'} relative flex-shrink-0`}
                                    >
                                        <span className={`block w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${form.notify_whatsapp ? 'left-5' : 'left-0.5'}`} />
                                    </div>
                                    <span className="text-sm text-slate-300">WhatsApp</span>
                                </label>
                            </div>

                            {/* WhatsApp number — visible only when toggle is on */}
                            {form.notify_whatsapp && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Número WhatsApp</label>
                                    <input
                                        type="tel"
                                        value={form.whatsapp_number}
                                        onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))}
                                        placeholder="+591 7xxxxxxx"
                                        className="w-full bg-white/5 border border-white/10 text-slate-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500/50"
                                    />
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm font-semibold hover:bg-white/5 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Crear Alerta
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AlertsPage;
