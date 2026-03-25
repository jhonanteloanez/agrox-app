import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  CalendarDays, ChevronLeft, ChevronRight, AlertCircle,
  Loader2, X, ClipboardList
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ── Types ─────────────────────────────────────────────────────────────────────

type EventType = 'ACTIVIDAD' | 'HITO_FENOLOGICO' | 'RECORDATORIO' | 'ALERTA';

interface CalendarEvent {
  event_id: string;
  title: string;
  event_date: string;
  event_type: EventType;
  description: string | null;
  activity_id: string | null;
  crop_id: string | null;
}

// ── Style maps ────────────────────────────────────────────────────────────────

const EVENT_STYLES: Record<EventType, { dot: string; badge: string; label: string }> = {
  ACTIVIDAD:        { dot: 'bg-emerald-400', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', label: 'Actividad' },
  HITO_FENOLOGICO:  { dot: 'bg-blue-400',    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/20',           label: 'Hito Fenológico' },
  RECORDATORIO:     { dot: 'bg-yellow-400',  badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',     label: 'Recordatorio' },
  ALERTA:           { dot: 'bg-red-400',     badge: 'bg-red-500/15 text-red-400 border-red-500/20',              label: 'Alerta' },
};

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ── Component ─────────────────────────────────────────────────────────────────

const CalendarPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${token}`,
  }), [token]);

  // ── Fetch events ────────────────────────────────────────────────────────────

  const fetchEvents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/api/activities`,
        { headers: authHeaders }
      );
      const data = await res.json();
      if (res.ok) {
        const mapped = (data.data || []).map((a: any) => ({
          event_id: a.activity_id || Math.random().toString(),
          title: a.title,
          event_date: a.scheduled_date,
          event_type: 'ACTIVIDAD',
          description: a.description,
          activity_id: a.activity_id,
          crop_id: a.crop_id
        }));
        setEvents(mapped);
      } else {
        setError(data.error || 'Error al cargar el calendario.');
      }
    } catch {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  }, [token, authHeaders]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ── Navigation ──────────────────────────────────────────────────────────────

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  // ── Calendar grid ───────────────────────────────────────────────────────────

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Events indexed by day number
  const eventsByDay = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    for (const ev of events) {
      const d = new Date(ev.event_date);
      // Adjust for timezone offset to avoid off-by-one
      const day = d.getUTCDate();
      if (!map[day]) map[day] = [];
      map[day].push(ev);
    }
    return map;
  }, [events]);

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];

  const today = now.getFullYear() === year && now.getMonth() === month ? now.getDate() : -1;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-inter relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-900/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <button onClick={() => navigate('/activities')} className="flex items-center space-x-2 text-slate-400 hover:text-violet-400 transition-colors mb-4 group">
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm">Volver a Actividades</span>
            </button>
            <div className="flex items-center space-x-3 mb-2">
              <div className="bg-violet-500/10 p-2 rounded-lg border border-violet-500/20">
                <CalendarDays className="text-violet-400 w-5 h-5" />
              </div>
              <h2 className="text-violet-400 font-semibold tracking-widest uppercase text-sm">Planificación</h2>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Calendario</h1>
          </div>

          <button
            onClick={() => navigate('/activities')}
            className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 py-3 rounded-xl border border-white/10 flex items-center space-x-2 active:scale-[0.98] transition-all"
          >
            <ClipboardList className="w-5 h-5 text-violet-400" />
            <span>Ver Actividades</span>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center space-x-2 mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" /><span className="text-sm">{error}</span>
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
            <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-xl font-bold">{MONTHS[month]}</h2>
              <p className="text-slate-500 text-sm">{year}</p>
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
          ) : (
            <div className="p-4">
              {/* Days of week header */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS_OF_WEEK.map(d => (
                  <div key={d} className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells before first day */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {/* Day cells */}
                {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
                  const dayEvents = eventsByDay[day] || [];
                  const isToday = day === today;
                  const isSelected = day === selectedDay;
                  const hasEvents = dayEvents.length > 0;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      className={`relative min-h-[52px] p-1.5 rounded-xl text-left transition-all flex flex-col ${
                        isSelected
                          ? 'bg-violet-500/20 border border-violet-500/30'
                          : isToday
                          ? 'bg-white/5 border border-violet-500/40'
                          : hasEvents
                          ? 'hover:bg-white/5 border border-transparent'
                          : 'hover:bg-white/[0.03] border border-transparent'
                      }`}
                    >
                      <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                        isToday ? 'bg-violet-500 text-white' : 'text-slate-300'
                      }`}>
                        {day}
                      </span>

                      {/* Event dots — max 3 visible */}
                      {hasEvents && (
                        <div className="flex flex-wrap gap-0.5 mt-auto">
                          {dayEvents.slice(0, 3).map((ev, idx) => (
                            <span
                              key={idx}
                              className={`w-1.5 h-1.5 rounded-full ${EVENT_STYLES[ev.event_type]?.dot || 'bg-slate-400'}`}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-[9px] text-slate-500 font-bold">+{dayEvents.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="px-6 py-4 border-t border-white/5 flex flex-wrap gap-4">
            {(Object.entries(EVENT_STYLES) as [EventType, typeof EVENT_STYLES[EventType]][]).map(([type, style]) => (
              <div key={type} className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                <span className="text-[10px] text-slate-500 font-medium">{style.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected day panel */}
        {selectedDay !== null && (
          <div className="mt-6 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">
                {selectedDay} de {MONTHS[month]}, {year}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedEvents.length === 0 ? (
              <p className="text-slate-500 text-sm">No hay eventos programados para este día.</p>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map(ev => (
                  <div
                    key={ev.event_id}
                    className={`flex items-start space-x-3 p-3 rounded-xl border ${EVENT_STYLES[ev.event_type]?.badge || ''}`}
                  >
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${EVENT_STYLES[ev.event_type]?.dot || 'bg-slate-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{ev.title}</p>
                      {ev.description && (
                        <p className="text-xs opacity-70 mt-0.5 line-clamp-2">{ev.description}</p>
                      )}
                      <span className={`mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest ${EVENT_STYLES[ev.event_type]?.badge}`}>
                        {EVENT_STYLES[ev.event_type]?.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarPage;
