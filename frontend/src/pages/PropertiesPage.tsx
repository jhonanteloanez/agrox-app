import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  MapPin, Plus, X, Eye, Trash2, ChevronLeft, AlertCircle, CheckCircle, Loader2
} from 'lucide-react';

interface Property {
  property_id: string;
  name: string;
  department: string;
  municipality: string;
  community: string | null;
  centroid_lat: number | null;
  centroid_lon: number | null;
  area_m2: number;
  climate_radius_km: number;
  status: string;
  created_at: string;
}

interface PolygonPoint { lat: string; lon: string; }

const API = 'http://localhost:3001';

const PropertiesPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [community, setCommunity] = useState('');
  const [radius, setRadius] = useState('10');
  const [polygonText, setPolygonText] = useState('');
  const [formError, setFormError] = useState('');

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/properties`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setProperties(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (token) fetchProperties(); }, [token]);

  const resetForm = () => {
    setName(''); setDepartment(''); setMunicipality('');
    setCommunity(''); setRadius('10'); setPolygonText(''); setFormError('');
  };

  const parsePolygon = (): PolygonPoint[] | null => {
    const lines = polygonText.trim().split('\n').filter(l => l.trim() !== '');
    if (lines.length < 3) { setFormError('El polígono necesita al menos 3 puntos (uno por línea).'); return null; }
    const pts: PolygonPoint[] = [];
    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim());
      if (parts.length !== 2) { setFormError(`Formato inválido en la línea: "${line}". Use: lat, lon`); return null; }
      const [lat, lon] = parts;
      if (isNaN(Number(lat)) || Number(lat) < -90 || Number(lat) > 90) {
        setFormError(`Latitud inválida: ${lat}. Debe estar entre -90 y 90.`); return null;
      }
      if (isNaN(Number(lon)) || Number(lon) < -180 || Number(lon) > 180) {
        setFormError(`Longitud inválida: ${lon}. Debe estar entre -180 y 180.`); return null;
      }
      pts.push({ lat, lon });
    }
    return pts;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(''); setError('');

    if (!name.trim()) return setFormError('El nombre es obligatorio.');
    if (!department.trim()) return setFormError('El departamento es obligatorio.');
    if (!municipality.trim()) return setFormError('El municipio es obligatorio.');
    const r = Number(radius);
    if (isNaN(r) || r < 5 || r > 100) return setFormError('El radio debe estar entre 5 y 100 km.');
    const polygon = parsePolygon();
    if (!polygon) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/properties`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: name.trim(), department: department.trim(),
          municipality: municipality.trim(),
          community: community.trim() || null,
          climate_radius_km: r,
          polygon: polygon.map(p => ({ lat: Number(p.lat), lon: Number(p.lon) })),
        }),
      });
      const data = await res.json();
      if (!res.ok) return setFormError(data.error || 'Error al crear la propiedad.');
      setSuccess('¡Propiedad registrada exitosamente!');
      setShowForm(false);
      resetForm();
      fetchProperties();
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setFormError('Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, propName: string) => {
    if (!window.confirm(`¿Eliminar la propiedad "${propName}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API}/api/properties/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Error al eliminar.');
      setSuccess('Propiedad eliminada.');
      fetchProperties();
      setTimeout(() => setSuccess(''), 3000);
    } catch { setError('Error de conexión.'); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-inter relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-900/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 text-slate-400 hover:text-emerald-400 transition-colors mb-4 group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm">Volver al Dashboard</span>
            </button>
            <div className="flex items-center space-x-3 mb-2">
              <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                <MapPin className="text-emerald-500 w-5 h-5" />
              </div>
              <h2 className="text-emerald-500 font-semibold tracking-widest uppercase text-sm">RF09</h2>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Propiedades Registradas</h1>
            <p className="text-slate-400 mt-1 text-sm">{properties.length} propiedad{properties.length !== 1 ? 'es' : ''} activa{properties.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => { setShowForm(true); resetForm(); }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-emerald-900/40 flex items-center space-x-2 active:scale-[0.98] transition-all group self-start md:self-auto"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            <span>Registrar Propiedad</span>
          </button>
        </div>

        {/* Alerts */}
        {success && (
          <div className="flex items-center space-x-2 mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}
        {error && (
          <div className="flex items-center space-x-2 mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Property List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">Sin propiedades aún</h3>
            <p className="text-slate-500 text-sm max-w-xs">Registra tu primera propiedad agrícola haciendo clic en el botón de arriba.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {properties.map(prop => (
              <div
                key={prop.property_id}
                className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                    <MapPin className="text-emerald-500 w-5 h-5" />
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full border uppercase tracking-wider ${prop.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-700 text-slate-400 border-white/5'}`}>
                    {prop.status === 'ACTIVE' ? 'Activa' : prop.status}
                  </span>
                </div>

                <h3 className="font-bold text-lg mb-1 truncate">{prop.name}</h3>
                <p className="text-slate-400 text-sm mb-3">
                  {prop.department}{prop.municipality ? ` · ${prop.municipality}` : ''}
                  {prop.community ? ` · ${prop.community}` : ''}
                </p>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Área</p>
                    <p className="text-sm font-bold text-white">{Number(prop.area_m2).toLocaleString()} m²</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Radio</p>
                    <p className="text-sm font-bold text-white">{prop.climate_radius_km} km</p>
                  </div>
                </div>

                <div className="flex space-x-2 pt-4 border-t border-white/5">
                  <button
                    onClick={() => navigate(`/properties/${prop.property_id}`)}
                    className="flex-1 flex items-center justify-center space-x-1.5 bg-slate-800/60 hover:bg-emerald-600/20 border border-white/5 hover:border-emerald-500/30 text-slate-300 hover:text-emerald-400 py-2 rounded-xl text-sm font-medium transition-all"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Ver detalle</span>
                  </button>
                  <button
                    onClick={() => handleDelete(prop.property_id, prop.name)}
                    disabled={deletingId === prop.property_id}
                    className="flex items-center justify-center p-2 bg-slate-800/60 hover:bg-red-600/20 border border-white/5 hover:border-red-500/30 text-slate-400 hover:text-red-400 rounded-xl transition-all disabled:opacity-50"
                    title="Eliminar propiedad"
                  >
                    {deletingId === prop.property_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Property Slide-in Panel */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />

          {/* Panel */}
          <div className="w-full max-w-lg bg-[#0f172a] border-l border-white/10 flex flex-col overflow-y-auto shadow-2xl">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <div>
                <h2 className="text-lg font-bold">Registrar Propiedad</h2>
                <p className="text-slate-400 text-xs mt-0.5">Completa los datos de la unidad productiva</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Panel Form */}
            <form onSubmit={handleCreate} className="flex-1 px-6 py-6 space-y-5">
              {formError && (
                <div className="flex items-start space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Nombre <span className="text-red-400">*</span>
                </label>
                <input
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="Ej. Finca Norte"
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
                />
              </div>

              {/* Department & Municipality */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Departamento <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={department} onChange={e => setDepartment(e.target.value)}
                    placeholder="Ej. Santa Cruz"
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Municipio <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={municipality} onChange={e => setMunicipality(e.target.value)}
                    placeholder="Ej. San Julián"
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Community */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Comunidad <span className="text-slate-600">(opcional)</span></label>
                <input
                  value={community} onChange={e => setCommunity(e.target.value)}
                  placeholder="Ej. Villa 21"
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
                />
              </div>

              {/* Climate Radius */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Radio Climático (km) <span className="text-red-400">*</span>
                  <span className="text-slate-600 normal-case ml-1">· entre 5 y 100</span>
                </label>
                <input
                  type="number" min="5" max="100"
                  value={radius} onChange={e => setRadius(e.target.value)}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
                />
              </div>

              {/* Polygon */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Polígono Geográfico <span className="text-red-400">*</span>
                  <span className="text-slate-600 normal-case ml-1">· un par lat, lon por línea (mín. 3 puntos)</span>
                </label>
                <textarea
                  value={polygonText} onChange={e => setPolygonText(e.target.value)}
                  rows={6}
                  placeholder={`-17.500, -63.200\n-17.500, -63.100\n-17.600, -63.100\n-17.600, -63.200`}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm font-mono resize-none"
                />
                <p className="text-slate-600 text-xs">El polígono se cierra automáticamente si el último punto difiere del primero.</p>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-emerald-900/30 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>{submitting ? 'Guardando...' : 'Registrar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertiesPage;
