import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Layers, Plus, X, ChevronLeft, AlertCircle, CheckCircle, Loader2,
  Filter, Search, Calendar, MapPin, Tag, Activity, Archive
} from 'lucide-react';

interface Crop {
  crop_id: number;
  plot_id: string;
  product_id: number;
  product_name: string;
  plot_name: string;
  property_name: string;
  planting_date: string;
  estimated_harvest_date: string;
  actual_harvest_date: string | null;
  status: string;
  growth_stage: string | null;
  area_ha: number;
  notes: string | null;
}

interface Product {
  product_id: number;
  name: string;
  scientific_name: string | null;
  category: string;
}

interface Plot {
  plot_id: string;
  name: string;
  property_id: string;
  property_name?: string;
}


interface Stage {
  stage: string;
  stage_order: number;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const CropsPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlPlotId = searchParams.get('plot_id');

  // List state
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters state
  const [filterPlot, setFilterPlot] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form / Modal state
  const [showForm, setShowForm] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState<Crop | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Catalog / Dependencies
  const [products, setProducts] = useState<Product[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [productStages, setProductStages] = useState<Stage[]>([]);

  // Registration Form State
  const [formData, setFormData] = useState({
    plot_id: '',
    product_id: '',
    planting_date: new Date().toISOString().split('T')[0],
    area_ha: '',
    estimated_harvest_date: '',
    notes: ''
  });
  const [formError, setFormError] = useState('');

  // Status Modal State
  const [statusData, setStatusData] = useState({
    status: '',
    growth_stage: '',
    notes: ''
  });

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  }), [token]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterPlot) params.append('plot_id', filterPlot);
      if (filterStatus) params.append('status', filterStatus);
      if (searchQuery) params.append('q', searchQuery);
      params.append('include_deleted', 'true');

      const [cropsRes, plotsRes, productsRes] = await Promise.all([
        fetch(`${API}/api/crops?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/plots`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/crops/products`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (cropsRes.ok) {
        const data = await cropsRes.json();
        setCrops(data.data || []);
      }
      if (plotsRes.ok) setPlots(await plotsRes.json());
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.data || []);
      }

    } catch (e) {
      console.error(e);
      setError('Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  }, [token, filterPlot, filterStatus, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle URL parameters for initial filter and form
  useEffect(() => {
    if (urlPlotId) {
      setFilterPlot(urlPlotId);
      setFormData(prev => ({ ...prev, plot_id: urlPlotId }));
    }
  }, [urlPlotId]);

  // Load stages when product changes (form or modal)
  useEffect(() => {
    const productId = showStatusModal?.product_id || formData.product_id;
    if (productId) {
      fetch(`${API}/api/crops/products/${productId}/stages`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setProductStages(data.data || []))
        .catch(console.error);
    } else {
      setProductStages([]);
    }
  }, [formData.product_id, showStatusModal?.product_id, token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    if (!formData.plot_id || !formData.product_id || !formData.planting_date || !formData.area_ha) {
      return setFormError('Todos los campos marcados con * son obligatorios.');
    }

    if (Number(formData.area_ha) <= 0) {
      return setFormError('El área debe ser mayor a 0 ha.');
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/crops`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          ...formData,
          product_id: parseInt(formData.product_id),
          area_ha: parseFloat(formData.area_ha)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) return setFormError('Ya existe un ciclo activo en este lote.');
        if (res.status === 422) return setFormError(data.error || 'Etapas fenológicas no configuradas para este producto.');
        return setFormError(data.error || 'Error al registrar cultivo.');
      }

      setSuccess('¡Cultivo registrado exitosamente!');
      setShowForm(false);
      setFormData({
        plot_id: '',
        product_id: '',
        planting_date: new Date().toISOString().split('T')[0],
        area_ha: '',
        estimated_harvest_date: '',
        notes: ''
      });
      fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setFormError('Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showStatusModal) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/crops/${showStatusModal.crop_id}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify(statusData)
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Error al actualizar estado.');
      } else {
        setSuccess('Estado actualizado correctamente.');
        setShowStatusModal(null);
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch {
      setError('Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (id: number) => {
    if (!window.confirm('¿Estás seguro de archivar este ciclo de cultivo?')) return;
    
    try {
      const res = await fetch(`${API}/api/crops/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Error al archivar.');
      } else {
        setSuccess('Ciclo archivado.');
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch {
      setError('Error de conexión.');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Activo':
      case 'En crecimiento': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Planificado': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Cosechado/Finalizado': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Cerrado': return 'bg-slate-700 text-slate-400 border-white/5';
      default: return 'bg-slate-700 text-slate-400 border-white/5';
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-inter relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-900/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
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
                <Layers className="text-emerald-500 w-5 h-5" />
              </div>
              <h2 className="text-emerald-500 font-semibold tracking-widest uppercase text-sm">Registro de Cultivos</h2>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              {filterPlot && plots.find(p => p.plot_id === filterPlot) 
                ? `Cultivos de ${plots.find(p => p.plot_id === filterPlot)?.name}` 
                : 'Ciclos de Cultivo'}
            </h1>
          </div>
          <button
            onClick={() => { setShowForm(true); setFormError(''); }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-emerald-900/40 flex items-center space-x-2 active:scale-[0.98] transition-all group self-start md:self-auto"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            <span>Nuevo Cultivo</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 mb-8 flex flex-wrap items-center gap-4">
          {filterPlot && (
            <button 
              onClick={() => {
                setFilterPlot('');
                setFormData(prev => ({ ...prev, plot_id: '' }));
              }}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
            >
              <X className="w-3 h-3" />
              <span>Limpiar filtro de lote</span>
            </button>
          )}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por producto..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/50 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={filterPlot}
              onChange={e => setFilterPlot(e.target.value)}
              className="bg-slate-800/50 border border-white/5 rounded-xl px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">Todos los lotes</option>
              {plots.map(p => (
                <option key={p.plot_id} value={p.plot_id}>{p.name}</option>
              ))}
            </select>
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-800/50 border border-white/5 rounded-xl px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">Todos los estados</option>
            <option value="Planificado">Planificado</option>
            <option value="En crecimiento">En crecimiento</option>
            <option value="Cosechado/Finalizado">Cosechado</option>
            <option value="Cerrado">Cerrado</option>
          </select>
        </div>

        {/* Alerts */}
        {success && (
          <div className="flex items-center space-x-2 mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 animate-in fade-in slide-in-from-top-4">
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

        {/* Crops Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : crops.length === 0 ? (
          <div className="bg-slate-900/20 border border-white/5 rounded-3xl p-20 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-emerald-500/5 rounded-full flex items-center justify-center mb-6 border border-emerald-500/10">
              <Activity className="w-10 h-10 text-emerald-500/50" />
            </div>
            <h3 className="text-xl font-bold text-slate-300">No hay cultivos registrados</h3>
            <p className="text-slate-500 max-w-sm mt-2">Empieza a gestionar tus ciclos productivos registrando tu primer cultivo.</p>
            <button onClick={() => setShowForm(true)} className="mt-8 text-emerald-500 font-semibold hover:text-emerald-400 transition-colors">
              Registrar cultivo ahora →
            </button>
          </div>
        ) : (
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="px-6 py-4 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Producto / Variedad</th>
                    <th className="px-6 py-4 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Lote / Ubicación</th>
                    <th className="px-6 py-4 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Fecha Siembra</th>
                    <th className="px-6 py-4 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Área (ha)</th>
                    <th className="px-6 py-4 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Estado / Etapa</th>
                    <th className="px-6 py-4 font-semibold text-slate-400 uppercase tracking-wider text-[10px] text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {crops.map(crop => (
                    <tr key={crop.crop_id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-200">{crop.product_name}</div>
                        <div className="text-[10px] text-slate-500 uppercase mt-0.5 tracking-tight">ID: {crop.crop_id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1.5 text-slate-300">
                          <MapPin className="w-3 h-3 text-emerald-500/50" />
                          <span>{crop.plot_name}</span>
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-[150px]">{crop.property_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300">{new Date(crop.planting_date).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono text-emerald-400">{crop.area_ha} ha</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1.5">
                          <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-widest ${getStatusBadgeClass(crop.status)}`}>
                            {crop.status}
                          </span>
                          {crop.growth_stage && (
                            <span className="text-xs text-slate-400 flex items-center space-x-1">
                              <Activity className="w-3 h-3 text-blue-500/50" />
                              <span>{crop.growth_stage}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setShowStatusModal(crop);
                              setStatusData({
                                status: crop.status,
                                growth_stage: crop.growth_stage || '',
                                notes: ''
                              });
                            }}
                            className="p-2 bg-slate-800 hover:bg-emerald-600/20 border border-white/5 text-slate-400 hover:text-emerald-400 rounded-lg transition-all"
                            title="Cambiar estado"
                          >
                            <Activity className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleArchive(crop.crop_id)}
                            className="p-2 bg-slate-800 hover:bg-red-600/20 border border-white/5 text-slate-400 hover:text-red-400 rounded-lg transition-all"
                            title="Archivar"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Registration Slide-over */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex overflow-hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative ml-auto w-full max-w-lg bg-[#0f172a] border-l border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Registrar Nuevo Cultivo</h2>
                <p className="text-slate-500 text-xs mt-1">Inicia un nuevo ciclo productivo en tu lote</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
                  <Tag className="w-3 h-3 mr-1" /> Producto Agrícola *
                </label>
                <select
                  value={formData.product_id}
                  onChange={e => setFormData({ ...formData, product_id: e.target.value })}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:outline-none transition-all"
                >
                  <option value="">Seleccione un producto</option>
                  {products.map(p => (
                    <option key={p.product_id} value={p.product_id}>{p.name} {p.scientific_name ? `(${p.scientific_name})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
                  <MapPin className="w-3 h-3 mr-1" /> Lote de Cultivo *
                </label>
                <select
                  value={formData.plot_id}
                  onChange={e => setFormData({ ...formData, plot_id: e.target.value })}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:outline-none transition-all"
                >
                  <option value="">Seleccione un lote</option>
                  {plots.map(p => (
                    <option key={p.plot_id} value={p.plot_id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
                    <Calendar className="w-3 h-3 mr-1" /> Fecha Siembra *
                  </label>
                  <input
                    type="date"
                    value={formData.planting_date}
                    onChange={e => setFormData({ ...formData, planting_date: e.target.value })}
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Área (ha) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.area_ha}
                    onChange={e => setFormData({ ...formData, area_ha: e.target.value })}
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fecha Est. Cosecha</label>
                <input
                  type="date"
                  value={formData.estimated_harvest_date}
                  onChange={e => setFormData({ ...formData, estimated_harvest_date: e.target.value })}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Notas / Observaciones</label>
                <textarea
                  placeholder="Detalles adicionales del proceso de siembra..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:outline-none transition-all resize-none"
                />
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 border border-white/10 rounded-xl font-semibold text-slate-400 hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center space-x-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  <span>{submitting ? 'Guardando...' : 'Registrar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowStatusModal(null)} />
          <div className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl p-6">
            <h3 className="text-lg font-bold mb-1">Actualizar Estado</h3>
            <p className="text-slate-500 text-xs mb-6 truncate">{showStatusModal.product_name} en {showStatusModal.plot_name}</p>
            
            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estado del Ciclo</label>
                <select
                  value={statusData.status}
                  onChange={e => setStatusData({ ...statusData, status: e.target.value })}
                  className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2 text-sm focus:outline-none"
                >
                  <option value="Planificado">Planificado</option>
                  <option value="En crecimiento">En crecimiento</option>
                  <option value="Cosechado/Finalizado">Cosechado/Finalizado</option>
                  <option value="Cerrado">Cerrado</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Etapa de Crecimiento</label>
                <select
                  value={statusData.growth_stage}
                  onChange={e => setStatusData({ ...statusData, growth_stage: e.target.value })}
                  className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2 text-sm focus:outline-none"
                >
                  <option value="">Ninguna</option>
                  {productStages.map(s => (
                    <option key={s.stage} value={s.stage}>{s.stage}</option>
                  ))}
                  <option value="otro">Otro (Manual)</option>
                </select>
              </div>

              {statusData.growth_stage === 'otro' && (
                  <input
                    type="text"
                    placeholder="Nombre de etapa manual"
                    onChange={e => setStatusData({ ...statusData, growth_stage: e.target.value })}
                    className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2 text-sm mt-2 focus:outline-none"
                  />
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Notas de Cambio</label>
                <textarea
                  value={statusData.notes}
                  onChange={e => setStatusData({ ...statusData, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2 text-sm focus:outline-none resize-none"
                  rows={2}
                />
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(null)}
                  className="flex-1 py-2 text-slate-400 text-sm hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all"
                >
                  {submitting ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CropsPage;
