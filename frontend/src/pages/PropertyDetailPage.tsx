import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, ChevronLeft, Ruler, Radio, Calendar, Hash, Loader2, AlertCircle, Plus, X, Edit2, Trash2, CheckCircle, Layers } from 'lucide-react';

interface PropertyDetail {
  property_id: string;
  organization_id: string;
  name: string;
  alias: string | null;
  department: string;
  municipality: string;
  community: string | null;
  address: string | null;
  centroid_lat: number | null;
  centroid_lon: number | null;
  area_m2: number;
  elevation_m: number | null;
  climate_radius_km: number;
  status: string;
  polygon_wkt: string | null;
  created_at: string;
  updated_at: string;
}

interface Lot {
  lot_id: string;
  property_id: string;
  name: string;
  area_m2: number;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const API = 'http://localhost:3001';

/** Parse WKT POLYGON((...)) into an array of {lat, lon} pairs */
function parseWKT(wkt: string | null): { lat: number; lon: number }[] {
  if (!wkt) return [];
  const match = wkt.match(/POLYGON\s*\(\(([^)]+)\)/i);
  if (!match) return [];
  return match[1].split(',').map(pair => {
    const [lon, lat] = pair.trim().split(' ').map(Number);
    return { lat, lon };
  });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-3 border-b border-white/5 last:border-0">
      <span className="text-xs uppercase tracking-wider text-slate-500 sm:w-44 shrink-0">{label}</span>
      <span className="text-sm text-white font-medium">{value ?? <span className="text-slate-600">—</span>}</span>
    </div>
  );
}

const PropertyDetailPage: React.FC = () => {
  const { token, user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Lot state
  const [lots, setLots] = useState<Lot[]>([]);
  const [lotsLoading, setLotsLoading] = useState(true);
  const [showLotForm, setShowLotForm] = useState(false);
  const [editingLot, setEditingLot] = useState<Lot | null>(null);
  const [deletingLotId, setDeletingLotId] = useState<string | null>(null);
  const [lotFormError, setLotFormError] = useState('');
  const [lotSuccess, setLotSuccess] = useState('');
  const [lotSubmitting, setLotSubmitting] = useState(false);

  // Lot Form Fields
  const [lotName, setLotName] = useState('');
  const [lotArea, setLotArea] = useState('');
  const [lotStatus, setLotStatus] = useState('ACTIVE');
  const [lotDesc, setLotDesc] = useState('');

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchLots = async () => {
    setLotsLoading(true);
    try {
      const res = await fetch(`${API}/api/properties/${id}/lots`, { headers: authHeaders });
      if (res.ok) setLots(await res.json());
    } catch (e) { console.error(e); }
    finally { setLotsLoading(false); }
  };

  useEffect(() => {
    if (!token || !id) return;

    const fetchProperty = async () => {
      try {
        const res = await fetch(`${API}/api/properties/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error || 'No se pudo cargar la propiedad.');
        } else {
          setProperty(await res.json());
        }
      } catch {
        setError('Error de conexión.');
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
    fetchLots();
  }, [token, id]);

  const resetLotForm = () => {
    setLotName(''); setLotArea(''); setLotStatus('ACTIVE'); setLotDesc(''); setLotFormError('');
  };

  const handleEditLot = (lot: Lot) => {
    setEditingLot(lot);
    setLotName(lot.name);
    setLotArea(lot.area_m2.toString());
    setLotStatus(lot.status);
    setLotDesc(lot.description || '');
    setShowLotForm(true);
  };

  const handleLotSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLotFormError('');
    setLotSuccess('');

    if (!lotName.trim()) return setLotFormError('El nombre es obligatorio.');
    const area = Number(lotArea);
    if (isNaN(area) || area <= 0) return setLotFormError('El área debe ser mayor a 0 m².');

    setLotSubmitting(true);
    try {
      const isEdit = !!editingLot;
      const url = isEdit ? `${API}/api/properties/${id}/lots/${editingLot.lot_id}` : `${API}/api/properties/${id}/lots`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: lotName.trim(),
          area_m2: area,
          status: lotStatus,
          description: lotDesc.trim() || null
        }),
      });
      const data = await res.json();
      if (!res.ok) return setLotFormError(data.error || 'Error al guardar el lote.');
      
      setLotSuccess(isEdit ? 'Lote actualizado.' : 'Lote registrado.');
      setShowLotForm(false);
      resetLotForm();
      fetchLots();
      setTimeout(() => setLotSuccess(''), 3000);
    } catch (err) {
      setLotFormError('Error de conexión.');
    } finally {
      setLotSubmitting(false);
    }
  };

  const handleLotDelete = async (lotId: string, name: string) => {
    if (!window.confirm(`¿Eliminar el lote "${name}"? Esta acción no se puede deshacer.`)) return;
    setDeletingLotId(lotId);
    try {
      const res = await fetch(`${API}/api/properties/${id}/lots/${lotId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) return setLotFormError(data.error || 'Error al eliminar.');
      
      setLotSuccess('Lote eliminado.');
      fetchLots();
      setTimeout(() => setLotSuccess(''), 3000);
    } catch (err) {
      setLotFormError('Error de conexión.');
    } finally {
      setDeletingLotId(null);
    }
  };

  const coords = property ? parseWKT(property.polygon_wkt) : [];

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-inter relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-900/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Back */}
        <button
          onClick={() => navigate('/properties')}
          className="flex items-center space-x-2 text-slate-400 hover:text-emerald-400 transition-colors mb-8 group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">Volver a Propiedades</span>
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center space-x-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : property && (
          <>
            {/* Title */}
            <div className="flex items-start justify-between mb-8 gap-4">
              <div className="flex items-center space-x-4">
                <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
                  <MapPin className="text-emerald-500 w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{property.name}</h1>
                  {property.alias && <p className="text-slate-400 text-sm mt-0.5">"{property.alias}"</p>}
                </div>
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full border uppercase tracking-wider shrink-0 mt-1 ${property.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-700 text-slate-400 border-white/5'}`}>
                {property.status === 'ACTIVE' ? 'Activa' : property.status}
              </span>
            </div>

            {/* Stats Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { icon: <Ruler className="w-4 h-4" />, label: 'Área', value: `${Number(property.area_m2).toLocaleString()} m²` },
                { icon: <Radio className="w-4 h-4" />, label: 'Radio Climático', value: `${property.climate_radius_km} km` },
                { icon: <MapPin className="w-4 h-4" />, label: 'Puntos Polígono', value: coords.length > 0 ? `${coords.length - 1} vértices` : '—' },
                { icon: <Hash className="w-4 h-4" />, label: 'Elevación', value: property.elevation_m ? `${property.elevation_m} m` : '—' },
              ].map(({ icon, label, value }) => (
                <div key={label} className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center">
                  <div className="flex items-center justify-center text-emerald-500 mb-2">{icon}</div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-base font-bold">{value}</p>
                </div>
              ))}
            </div>

            {/* Detail Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Location Info */}
              <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4">Ubicación</h3>
                <InfoRow label="Departamento" value={property.department} />
                <InfoRow label="Municipio" value={property.municipality} />
                <InfoRow label="Comunidad" value={property.community} />
                <InfoRow label="Dirección" value={property.address} />
                {property.centroid_lat != null && (
                  <InfoRow label="Centroide" value={`${Number(property.centroid_lat).toFixed(6)}, ${Number(property.centroid_lon).toFixed(6)}`} />
                )}
              </div>

              {/* Record Info */}
              <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4">Registro</h3>
                <InfoRow label="ID" value={<span className="text-xs font-mono text-slate-400">{property.property_id}</span>} />
                <InfoRow label="Organización" value={<span className="text-xs font-mono text-slate-400">{property.organization_id}</span>} />
                <InfoRow
                  label="Creada el"
                  value={
                    <span className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(property.created_at).toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </span>
                  }
                />
                <InfoRow
                  label="Actualizada"
                  value={<span>{new Date(property.updated_at).toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' })}</span>}
                />
              </div>
            </div>

            {/* Polygon Coordinates */}
            {coords.length > 0 && (
              <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4">
                  Polígono Geográfico · {coords.length - 1} vértice{coords.length - 1 !== 1 ? 's' : ''}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
                  {coords.slice(0, -1).map((pt, i) => (
                    <div key={i} className="bg-slate-800/50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-slate-500 mb-1">P{i + 1}</p>
                      <p className="text-xs font-mono text-slate-300">{pt.lat.toFixed(6)}</p>
                      <p className="text-xs font-mono text-slate-400">{pt.lon.toFixed(6)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lots Section */}
            <div className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Lotes ({lots.length})</h2>
                  <p className="text-sm text-slate-400 mt-1">Gestión de áreas de cultivo</p>
                </div>
                {user?.role === 'PRODUCTOR' && (
                  <button
                    onClick={() => { setEditingLot(null); resetLotForm(); setShowLotForm(true); }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-900/40 flex items-center space-x-2 active:scale-[0.98] transition-all text-sm group"
                  >
                    <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                    <span>Registrar Lote</span>
                  </button>
                )}
              </div>

              {lotSuccess && (
                <div className="flex items-center space-x-2 mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <span className="text-sm">{lotSuccess}</span>
                </div>
              )}

              {lotsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                </div>
              ) : lots.length === 0 ? (
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-10 text-center">
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MapPin className="w-6 h-6 text-slate-500" />
                  </div>
                  <h3 className="text-md font-semibold text-slate-300 mb-1">Sin lotes aún</h3>
                  <p className="text-slate-500 text-sm">
                    {user?.role === 'PRODUCTOR' ? 'Registra el primer lote de esta propiedad.' : 'Esta propiedad aún no tiene lotes.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lots.map(lot => (
                    <div key={lot.lot_id} className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:border-emerald-500/30 transition-all group">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                            <MapPin className="text-emerald-500 w-4 h-4" />
                          </div>
                          <h3 className="font-bold text-md truncate">{lot.name}</h3>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${lot.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-700 text-slate-400 border-white/5'}`}>
                          {lot.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Área</p>
                        <p className="text-sm font-bold text-white mb-2">{Number(lot.area_m2).toLocaleString()} m²</p>
                        {lot.description && (
                          <p className="text-sm text-slate-400 line-clamp-2">{lot.description}</p>
                        )}
                      </div>

                      {user?.role === 'PRODUCTOR' && (
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                          <button
                            onClick={() => navigate(`/crops?plot_id=${lot.lot_id}`)}
                            className="flex-1 min-w-[80px] flex items-center justify-center space-x-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 py-1.5 rounded-xl text-xs font-medium transition-all"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Cultivos</span>
                          </button>
                          <button
                            onClick={() => handleEditLot(lot)}
                            className="flex-1 min-w-[80px] flex items-center justify-center space-x-1.5 bg-slate-800/60 hover:bg-white/5 border border-white/5 text-slate-300 hover:text-white py-1.5 rounded-xl text-xs font-medium transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => handleLotDelete(lot.lot_id, lot.name)}
                            disabled={deletingLotId === lot.lot_id}
                            className="flex items-center justify-center p-1.5 bg-slate-800/60 hover:bg-red-600/20 border border-white/5 hover:border-red-500/30 text-slate-400 hover:text-red-400 rounded-xl transition-all disabled:opacity-50"
                            title="Eliminar lote"
                          >
                            {deletingLotId === lot.lot_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </>
        )}
      </div>

      {/* Lot Slide-in Panel */}
      {showLotForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setShowLotForm(false)} />
          <div className="w-full max-w-lg bg-[#0f172a] border-l border-white/10 flex flex-col overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <div>
                <h2 className="text-lg font-bold">{editingLot ? 'Editar Lote' : 'Registrar Lote'}</h2>
                <p className="text-slate-400 text-xs mt-0.5">{property?.name}</p>
              </div>
              <button onClick={() => setShowLotForm(false)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleLotSave} className="flex-1 px-6 py-6 space-y-5">
              {lotFormError && (
                <div className="flex items-start space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{lotFormError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Nombre <span className="text-red-400">*</span>
                </label>
                <input
                  value={lotName} onChange={e => setLotName(e.target.value)}
                  placeholder="Ej. Lote Sur"
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Área (m²) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number" step="0.01" min="0.01"
                    value={lotArea} onChange={e => setLotArea(e.target.value)}
                    placeholder="Ej. 10000"
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Estado</label>
                  <select
                    value={lotStatus} onChange={e => setLotStatus(e.target.value)}
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm appearance-none"
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Descripción <span className="text-slate-600">(opcional)</span></label>
                <textarea
                  value={lotDesc} onChange={e => setLotDesc(e.target.value)}
                  rows={4}
                  placeholder="Detalles sobre el lote, tipo de suelo, etc."
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm resize-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLotForm(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={lotSubmitting}
                  className="flex-1 flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-emerald-900/30 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {lotSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingLot ? <CheckCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{lotSubmitting ? 'Guardando...' : editingLot ? 'Actualizar' : 'Registrar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PropertyDetailPage;
