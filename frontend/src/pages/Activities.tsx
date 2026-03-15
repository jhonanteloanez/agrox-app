import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList, Plus, X, ChevronLeft, AlertCircle, CheckCircle,
  Loader2, ChevronDown, Trash2, Tag, Calendar
} from 'lucide-react';

const API = 'http://localhost:3001';

// ── Types ─────────────────────────────────────────────────────────────────────

type ActivityStatus = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA';
type ActivityType = 'RIEGO' | 'FERTILIZACION' | 'FUMIGACION' | 'COSECHA' | 'OTRO';

interface Activity {
  activity_id: string;
  title: string;
  activity_type: ActivityType;
  status: ActivityStatus;
  scheduled_date: string;
  completed_date: string | null;
  description: string | null;
  notes: string | null;
  crop_id: string | null;
  plot_id: string | null;
  assigned_to: string | null;
}

// ── Style maps ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<ActivityStatus, string> = {
  PENDIENTE:    'bg-slate-500/10 text-slate-400 border-slate-500/20',
  EN_PROGRESO:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  COMPLETADA:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  CANCELADA:    'bg-red-500/10 text-red-400 border-red-500/20',
};

const STATUS_LABEL: Record<ActivityStatus, string> = {
  PENDIENTE:   'Pendiente',
  EN_PROGRESO: 'En Progreso',
  COMPLETADA:  'Completada',
  CANCELADA:   'Cancelada',
};

const TYPE_STYLES: Record<ActivityType, string> = {
  RIEGO:         'bg-blue-500/10 text-blue-400 border-blue-500/20',
  FERTILIZACION: 'bg-green-500/10 text-green-400 border-green-500/20',
  FUMIGACION:    'bg-orange-500/10 text-orange-400 border-orange-500/20',
  COSECHA:       'bg-amber-500/10 text-amber-400 border-amber-500/20',
  OTRO:          'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const STATUS_FILTERS: (ActivityStatus | 'TODAS')[] = ['TODAS', 'PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA'];
const NEXT_STATUS: Record<ActivityStatus, ActivityStatus | null> = {
  PENDIENTE:   'EN_PROGRESO',
  EN_PROGRESO: 'COMPLETADA',
  COMPLETADA:  null,
  CANCELADA:   null,
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });

// ── Component ─────────────────────────────────────────────────────────────────

const ActivitiesPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | 'TODAS'>('TODAS');

  // Modals
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState<Activity | null>(null);

  // Form
  const defaultForm = {
    title: '', activity_type: 'RIEGO' as ActivityType, scheduled_date: '',
    crop_id: '', plot_id: '', description: '', assigned_to: '', notes: '',
  };
  const [form, setForm] = useState(defaultForm);
  const [statusForm, setStatusForm] = useState({ status: '' as ActivityStatus, completed_date: '', notes: '' });

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchActivities = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = statusFilter !== 'TODAS' ? `?status=${statusFilter}` : '';
      const res = await fetch(`${API}/api/activities${params}`, { headers: authHeaders });
      const data = await res.json();
      if (res.ok) setActivities(data.data || []);
      else setError(data.error || 'Error al cargar actividades.');
    } catch {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  }, [token, authHeaders, statusFilter]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const showSuccessMsg = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  // ── Create ──────────────────────────────────────────────────────────────────

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.title || !form.scheduled_date) {
      return setError('Título y fecha programada son obligatorios.');
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/activities`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({
          ...form,
          crop_id: form.crop_id || null,
          plot_id: form.plot_id || null,
          assigned_to: form.assigned_to || null,
          description: form.description || null,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowCreateForm(false);
      setForm(defaultForm);
      showSuccessMsg('Actividad creada y añadida al calendario.');
      fetchActivities();
    } catch (e: any) {
      setError(e.message || 'Error al crear actividad.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Update status ───────────────────────────────────────────────────────────

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showStatusModal) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/activities/${showStatusModal.activity_id}/status`, {
        method: 'PATCH', headers: authHeaders,
        body: JSON.stringify({
          status: statusForm.status,
          completed_date: statusForm.completed_date || null,
          notes: statusForm.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowStatusModal(null);
      showSuccessMsg('Status actualizado correctamente.');
      fetchActivities();
    } catch (e: any) {
      setError(e.message || 'Error al actualizar status.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Quick advance status ────────────────────────────────────────────────────

  const handleQuickAdvance = async (activity: Activity) => {
    const next = NEXT_STATUS[activity.status];
    if (!next) return;
    try {
      const res = await fetch(`${API}/api/activities/${activity.activity_id}/status`, {
        method: 'PATCH', headers: authHeaders,
        body: JSON.stringify({
          status: next,
          completed_date: next === 'COMPLETADA' ? new Date().toISOString().split('T')[0] : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showSuccessMsg(`Actividad marcada como ${STATUS_LABEL[next]}.`);
      fetchActivities();
    } catch (e: any) {
      setError(e.message || 'Error al actualizar.');
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta actividad?')) return;
    try {
      const res = await fetch(`${API}/api/activities/${id}`, { method: 'DELETE', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showSuccessMsg('Actividad eliminada.');
      fetchActivities();
    } catch (e: any) {
      setError(e.message || 'Error al eliminar.');
    }
  };

  const inp = 'w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all';
  const lbl = 'text-[10px] font-bold text-slate-500 uppercase tracking-widest';

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-inter relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-900/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <button onClick={() => navigate('/dashboard')} className="flex items-center space-x-2 text-slate-400 hover:text-violet-400 transition-colors mb-4 group">
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm">Volver al Dashboard</span>
            </button>
            <div className="flex items-center space-x-3 mb-2">
              <div className="bg-violet-500/10 p-2 rounded-lg border border-violet-500/20">
                <ClipboardList className="text-violet-400 w-5 h-5" />
              </div>
              <h2 className="text-violet-400 font-semibold tracking-widest uppercase text-sm">Planificación</h2>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Actividades</h1>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/calendar')}
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 py-3 rounded-xl border border-white/10 flex items-center space-x-2 active:scale-[0.98] transition-all"
            >
              <Calendar className="w-5 h-5 text-violet-400" />
              <span className="hidden sm:inline">Ver Calendario</span>
            </button>
            <button
              onClick={() => { setShowCreateForm(true); setError(''); }}
              className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-violet-900/40 flex items-center space-x-2 active:scale-[0.98] transition-all group"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              <span>Nueva Actividad</span>
            </button>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                statusFilter === f
                  ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                  : 'bg-slate-800/50 text-slate-500 border-white/5 hover:text-slate-300'
              }`}
            >
              {f === 'TODAS' ? 'Todas' : STATUS_LABEL[f as ActivityStatus]}
            </button>
          ))}
        </div>

        {/* Alerts */}
        {success && (
          <div className="flex items-center space-x-2 mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <CheckCircle className="w-5 h-5 shrink-0" /><span className="text-sm">{success}</span>
          </div>
        )}
        {error && (
          <div className="flex items-center space-x-2 mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" /><span className="text-sm">{error}</span>
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-slate-900/20 border border-white/5 rounded-3xl p-20 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-violet-500/5 rounded-full flex items-center justify-center mb-6 border border-violet-500/10">
              <ClipboardList className="w-10 h-10 text-violet-500/50" />
            </div>
            <h3 className="text-xl font-bold text-slate-300">No hay actividades</h3>
            <p className="text-slate-500 mt-2">Crea tu primera actividad para planificar el trabajo.</p>
          </div>
        ) : (
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="px-6 py-4 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Actividad / Tipo</th>
                    <th className="px-6 py-4 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Fecha Programada</th>
                    <th className="px-6 py-4 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Status</th>
                    <th className="px-6 py-4 font-semibold text-slate-400 uppercase tracking-wider text-[10px] text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {activities.map(act => {
                    const next = NEXT_STATUS[act.status];
                    return (
                      <tr key={act.activity_id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-200">{act.title}</div>
                          <span className={`mt-1 inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest ${TYPE_STYLES[act.activity_type] || TYPE_STYLES.OTRO}`}>
                            <Tag className="w-2.5 h-2.5" /><span>{act.activity_type}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-300 text-sm">{fmtDate(act.scheduled_date)}</span>
                          {act.completed_date && (
                            <div className="text-[10px] text-slate-500 mt-0.5">Completada: {fmtDate(act.completed_date)}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest ${STATUS_STYLES[act.status]}`}>
                            {STATUS_LABEL[act.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end space-x-2">
                            {next && (
                              <button
                                onClick={() => handleQuickAdvance(act)}
                                className="px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/20 text-violet-300 rounded-lg text-xs font-semibold transition-all"
                              >
                                → {STATUS_LABEL[next]}
                              </button>
                            )}
                            <button
                              onClick={() => { setShowStatusModal(act); setStatusForm({ status: act.status, completed_date: '', notes: '' }); }}
                              className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-all"
                              title="Cambiar status"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(act.activity_id)}
                              className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: Nueva Actividad ────────────────────────────────────────────── */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateForm(false)} />
          <div className="relative w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">Nueva Actividad</h3>
                <p className="text-xs text-slate-500">Se añadirá automáticamente al calendario</p>
              </div>
              <button onClick={() => setShowCreateForm(false)} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-1.5">
                <label className={lbl}>Título *</label>
                <input required type="text" placeholder="ej. Riego del lote norte" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })} className={inp} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={lbl}>Tipo de Actividad *</label>
                  <select value={form.activity_type} onChange={e => setForm({ ...form, activity_type: e.target.value as ActivityType })} className={inp}>
                    <option value="RIEGO">Riego</option>
                    <option value="FERTILIZACION">Fertilización</option>
                    <option value="FUMIGACION">Fumigación</option>
                    <option value="COSECHA">Cosecha</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={lbl}>Fecha Programada *</label>
                  <input required type="date" value={form.scheduled_date}
                    onChange={e => setForm({ ...form, scheduled_date: e.target.value })} className={inp} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={lbl}>ID Cultivo (opcional)</label>
                  <input type="number" placeholder="ej. 3" value={form.crop_id}
                    onChange={e => setForm({ ...form, crop_id: e.target.value })} className={inp} />
                </div>
                <div className="space-y-1.5">
                  <label className={lbl}>ID Parcela (opcional)</label>
                  <input type="text" placeholder="uuid..." value={form.plot_id}
                    onChange={e => setForm({ ...form, plot_id: e.target.value })} className={inp} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={lbl}>Descripción</label>
                <textarea rows={2} value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} className={`${inp} resize-none`} />
              </div>

              <div className="space-y-1.5">
                <label className={lbl}>Notas</label>
                <textarea rows={2} value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })} className={`${inp} resize-none`} />
              </div>

              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={() => setShowCreateForm(false)} className="flex-1 py-3 text-slate-400 hover:bg-slate-800 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl flex items-center justify-center">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Actividad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Cambiar Status ─────────────────────────────────────────────── */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowStatusModal(null)} />
          <div className="relative w-full max-w-sm bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl p-6">
            <h3 className="text-lg font-bold mb-1">Cambiar Status</h3>
            <p className="text-slate-500 text-xs mb-6 truncate">{showStatusModal.title}</p>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800/50 rounded-xl">
                {(['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA'] as ActivityStatus[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusForm({ ...statusForm, status: s })}
                    className={`py-2 px-3 text-[10px] font-bold rounded-lg transition-all uppercase tracking-widest ${
                      statusForm.status === s
                        ? s === 'COMPLETADA' ? 'bg-emerald-500 text-white'
                        : s === 'EN_PROGRESO' ? 'bg-yellow-500 text-black'
                        : s === 'CANCELADA' ? 'bg-red-500 text-white'
                        : 'bg-slate-500 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>

              {statusForm.status === 'COMPLETADA' && (
                <div className="space-y-1.5">
                  <label className={lbl}>Fecha de Completado</label>
                  <input type="date" value={statusForm.completed_date}
                    onChange={e => setStatusForm({ ...statusForm, completed_date: e.target.value })}
                    className={inp} />
                </div>
              )}

              <div className="space-y-1.5">
                <label className={lbl}>Notas de cierre (opcional)</label>
                <textarea rows={2} value={statusForm.notes}
                  onChange={e => setStatusForm({ ...statusForm, notes: e.target.value })}
                  className={`${inp} resize-none`} />
              </div>

              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={() => setShowStatusModal(null)} className="flex-1 py-2 text-slate-400 hover:text-white transition-colors">Cancelar</button>
                <button type="submit" disabled={submitting || !statusForm.status} className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl">
                  {submitting ? '...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivitiesPage;
