import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Package, Plus, X, ChevronLeft, AlertCircle, CheckCircle, Loader2,
  ListPlus, ArrowDownRight, ArrowUpRight, Search, FileText, Calendar, Tag
} from 'lucide-react';

interface InventoryItem {
  item_id: number;
  name: string;
  category: string;
  unit: string;
  description: string;
  quantity: number | string;
  min_stock: number | string;
  expiration_date: string | null;
}

interface InventoryRequest {
  request_id: number;
  item_name: string;
  quantity: number | string;
  unit: string;
  status: string;
  notes: string;
  created_at: string;
  created_by_name: string;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const InventoryPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  // State
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [requests, setRequests] = useState<InventoryRequest[]>([]);
  const [planCode, setPlanCode] = useState<'P1' | 'P2'>('P1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'stock' | 'requests'>('stock');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showItemForm, setShowItemForm] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState<InventoryItem | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Data
  const [itemFormData, setItemFormData] = useState({
    name: '', category: '', unit: '', description: '', quantity: '', min_stock: '', expiration_date: ''
  });
  const [movementFormData, setMovementFormData] = useState({
    type: 'ENTRADA', quantity: '', notes: '', crop_id: ''
  });
  const [requestFormData, setRequestFormData] = useState({
    item_name: '', quantity: '', unit: '', notes: ''
  });

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  }), [token]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/inventory`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      
      if (res.ok) {
        setItems(data.data || []);
        setPlanCode(data.plan_code || 'P1');
        
        // Fetch requests if P2
        if (data.plan_code === 'P2') {
          const reqRes = await fetch(`${API}/api/inventory/requests`, { headers: { Authorization: `Bearer ${token}` } });
          const reqData = await reqRes.json();
          if (reqRes.ok) {
            setRequests(reqData.data || []);
          }
        }
      } else {
        setError(data.error || 'Error al cargar el inventario.');
      }
    } catch (e) {
      console.error(e);
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!itemFormData.name || !itemFormData.category || !itemFormData.unit || !itemFormData.quantity || !itemFormData.min_stock) {
      return setError('Todos los campos marcados con * son obligatorios.');
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/inventory`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          ...itemFormData,
          quantity: parseFloat(itemFormData.quantity),
          min_stock: parseFloat(itemFormData.min_stock)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess('Ítem registrado exitosamente.');
      setShowItemForm(false);
      setItemFormData({ name: '', category: '', unit: '', description: '', quantity: '', min_stock: '', expiration_date: '' });
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message || 'Error al registrar ítem.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showMovementForm) return;

    if (!movementFormData.quantity || Number(movementFormData.quantity) <= 0) {
      return setError('La cantidad debe ser mayor a 0');
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/inventory/${showMovementForm.item_id}/movement`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          ...movementFormData,
          quantity: parseFloat(movementFormData.quantity)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess('Movimiento registrado correctamente.');
      setShowMovementForm(null);
      setMovementFormData({ type: 'ENTRADA', quantity: '', notes: '', crop_id: '' });
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message || 'Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requestFormData.item_name || !requestFormData.quantity || !requestFormData.unit) {
      return setError('Nombre, cantidad y unidad son requeridos.');
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/inventory/requests`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          ...requestFormData,
          quantity: parseFloat(requestFormData.quantity)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess('Solicitud creada exitosamente.');
      setShowRequestForm(false);
      setRequestFormData({ item_name: '', quantity: '', unit: '', notes: '' });
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message || 'Error al crear solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStockStatus = (item: InventoryItem) => {
    const qty = Number(item.quantity);
    const min = Number(item.min_stock);
    
    if (qty <= min) {
      return <span className="flex items-center space-x-1 text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20"><AlertCircle className="w-3 h-3" /> <span>Stock Bajo</span></span>;
    }
    
    if (item.expiration_date) {
      const days = (new Date(item.expiration_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
      if (days > 0 && days <= 30) {
        return <span className="flex items-center space-x-1 text-xs font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20"><Calendar className="w-3 h-3" /> <span>Vence Pronto</span></span>;
      }
    }
    
    return <span className="flex items-center space-x-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20"><CheckCircle className="w-3 h-3" /> <span>Adecuado</span></span>;
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-inter relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <button onClick={() => navigate('/dashboard')} className="flex items-center space-x-2 text-slate-400 hover:text-emerald-400 transition-colors mb-4 group">
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm">Volver al Dashboard</span>
            </button>
            <div className="flex items-center space-x-3 mb-2">
              <div className="bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
                <Package className="text-indigo-400 w-5 h-5" />
              </div>
              <h2 className="text-indigo-400 font-semibold tracking-widest uppercase text-sm">Control de Insumos</h2>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Inventario</h1>
          </div>
          <div className="flex space-x-3">
            {planCode === 'P2' && (
              <button
                onClick={() => { setShowRequestForm(true); setError(''); }}
                className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 py-3 rounded-xl border border-white/10 flex items-center space-x-2 active:scale-[0.98] transition-all"
              >
                <FileText className="w-5 h-5" />
                <span className="hidden sm:inline">Nueva Solicitud</span>
              </button>
            )}
            <button
              onClick={() => { setShowItemForm(true); setError(''); }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-indigo-900/40 flex items-center space-x-2 active:scale-[0.98] transition-all group"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              <span>Nuevo Ítem</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation for P2 */}
        {planCode === 'P2' && (
          <div className="flex space-x-4 mb-6 border-b border-white/10">
            <button
              onClick={() => setActiveTab('stock')}
              className={`pb-3 font-semibold text-sm transition-colors relative ${activeTab === 'stock' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Stock Actual
              {activeTab === 'stock' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`pb-3 font-semibold text-sm transition-colors relative flex items-center space-x-2 ${activeTab === 'requests' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <span>Solicitudes</span>
              {requests.filter(r => r.status === 'PENDING').length > 0 && (
                <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{requests.filter(r => r.status === 'PENDING').length}</span>
              )}
              {activeTab === 'requests' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
            </button>
          </div>
        )}

        {/* Alerts */}
        {success && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 animate-in fade-in slide-in-from-top-4">
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

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : activeTab === 'stock' ? (
          <>
            {/* Search */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 mb-8 flex items-center">
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar ítem por nombre o categoría..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800/50 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
              </div>
            </div>

            {/* Inventory Table */}
            {filteredItems.length === 0 ? (
              <div className="bg-slate-900/20 border border-white/5 rounded-3xl p-20 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-indigo-500/5 rounded-full flex items-center justify-center mb-6 border border-indigo-500/10">
                  <Package className="w-10 h-10 text-indigo-500/50" />
                </div>
                <h3 className="text-xl font-bold text-slate-300">No hay ítems en el inventario</h3>
                <p className="text-slate-500 mt-2">Registra tu primer insumo para llevar el control.</p>
              </div>
            ) : (
              <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/5">
                        <th className="px-6 py-4 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Producto / Categoría</th>
                        <th className="px-6 py-4 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Stock Disponible</th>
                        <th className="px-6 py-4 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Vencimiento</th>
                        <th className="px-6 py-4 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Estado</th>
                        <th className="px-6 py-4 font-semibold text-slate-400 uppercase tracking-wider text-[10px] text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredItems.map(item => (
                        <tr key={item.item_id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-200">{item.name}</div>
                            <div className="flex items-center space-x-1.5 mt-1">
                              <Tag className="w-3 h-3 text-indigo-500/50" />
                              <span className="text-xs text-slate-500 uppercase tracking-tight">{item.category}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-mono text-lg font-bold text-indigo-300">
                              {item.quantity} <span className="text-xs text-slate-500 font-sans">{item.unit}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {item.expiration_date ? (
                              <div className="text-slate-400 text-xs">
                                {new Date(item.expiration_date).toLocaleDateString()}
                              </div>
                            ) : (
                              <span className="text-slate-600 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">{getStockStatus(item)}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                setShowMovementForm(item);
                                setMovementFormData({ type: 'ENTRADA', quantity: '', notes: '', crop_id: '' });
                              }}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 ml-auto transition-all"
                            >
                              <ListPlus className="w-3.5 h-3.5" />
                              <span>Movimiento</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Requests Tab (P2 only) */
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
            {requests.length === 0 ? (
               <div className="p-12 text-center text-slate-500">No hay solicitudes registradas.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5">
                      <th className="px-6 py-4 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Fecha / Solicitante</th>
                      <th className="px-6 py-4 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Insumo</th>
                      <th className="px-6 py-4 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Cantidad</th>
                      <th className="px-6 py-4 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Estado</th>
                      <th className="px-6 py-4 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {requests.map(req => (
                      <tr key={req.request_id} className="hover:bg-white/[0.02]">
                        <td className="px-6 py-4">
                          <div className="text-slate-200">{new Date(req.created_at).toLocaleDateString()}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{req.created_by_name}</div>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-200">{req.item_name}</td>
                        <td className="px-6 py-4 font-mono text-indigo-300">{req.quantity} <span className="text-xs text-slate-500 font-sans">{req.unit}</span></td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest ${
                            req.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                            req.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400 max-w-[200px] truncate">{req.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Item Modal */}
      {showItemForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowItemForm(false)} />
          <div className="relative w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">Nuevo Ítem de Inventario</h3>
                <p className="text-xs text-slate-500">Registra un nuevo producto o insumo</p>
              </div>
              <button onClick={() => setShowItemForm(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleCreateItem} className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nombre del Insumo *</label>
                <input required type="text" value={itemFormData.name} onChange={e => setItemFormData({...itemFormData, name: e.target.value})} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Categoría *</label>
                  <select required value={itemFormData.category} onChange={e => setItemFormData({...itemFormData, category: e.target.value})} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none">
                    <option value="">Seleccionar...</option>
                    <option value="Semillas">Semillas</option>
                    <option value="Fertilizantes">Fertilizantes</option>
                    <option value="Agroquímicos">Agroquímicos</option>
                    <option value="Herramientas">Herramientas</option>
                    <option value="Empaque">Empaque</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Unidad de Medida *</label>
                  <input required placeholder="ej. kg, L, un" type="text" value={itemFormData.unit} onChange={e => setItemFormData({...itemFormData, unit: e.target.value})} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Stock Inicial *</label>
                  <input required min="0" step="0.01" type="number" value={itemFormData.quantity} onChange={e => setItemFormData({...itemFormData, quantity: e.target.value})} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Stock Mínimo (Alerta) *</label>
                  <input required min="0" step="0.01" type="number" value={itemFormData.min_stock} onChange={e => setItemFormData({...itemFormData, min_stock: e.target.value})} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fecha de Vencimiento</label>
                <input type="date" value={itemFormData.expiration_date} onChange={e => setItemFormData({...itemFormData, expiration_date: e.target.value})} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Descripción</label>
                <textarea rows={2} value={itemFormData.description} onChange={e => setItemFormData({...itemFormData, description: e.target.value})} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none" />
              </div>

              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={() => setShowItemForm(false)} className="flex-1 py-3 text-slate-400 hover:bg-slate-800 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center space-x-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <span>Guardar</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movement Modal */}
      {showMovementForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMovementForm(null)} />
          <div className="relative w-full max-w-sm bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl p-6">
            <h3 className="text-lg font-bold mb-1">Registrar Movimiento</h3>
            <p className="text-slate-500 text-xs mb-6 truncate">{showMovementForm.name} ({showMovementForm.quantity} {showMovementForm.unit} disp.)</p>
            
            <form onSubmit={handleCreateMovement} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800/50 rounded-xl mb-4">
                <button type="button" onClick={() => setMovementFormData({...movementFormData, type: 'ENTRADA'})} className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center space-x-1 transition-all ${movementFormData.type === 'ENTRADA' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                  <ArrowDownRight className="w-3.5 h-3.5" /> <span>Entrada</span>
                </button>
                <button type="button" onClick={() => setMovementFormData({...movementFormData, type: 'SALIDA'})} className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center space-x-1 transition-all ${movementFormData.type === 'SALIDA' || movementFormData.type === 'CONSUMO_CULTIVO' ? 'bg-red-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                  <ArrowUpRight className="w-3.5 h-3.5" /> <span>Salida</span>
                </button>
              </div>

              {movementFormData.type !== 'ENTRADA' && (
                <div className="flex items-center space-x-2 text-xs text-slate-400 mb-2">
                  <input type="checkbox" id="is_crop" checked={movementFormData.type === 'CONSUMO_CULTIVO'} onChange={e => setMovementFormData({...movementFormData, type: e.target.checked ? 'CONSUMO_CULTIVO' : 'SALIDA'})} className="rounded border-white/20 bg-slate-800" />
                  <label htmlFor="is_crop">Consumo por Cultivo</label>
                </div>
              )}

              {movementFormData.type === 'CONSUMO_CULTIVO' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ID de Cultivo</label>
                  <input placeholder="Aplica al cultivo ID..." type="number" value={movementFormData.crop_id} onChange={e => setMovementFormData({...movementFormData, crop_id: e.target.value})} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cantidad ({showMovementForm.unit}) *</label>
                <input required min="0.01" step="0.01" type="number" value={movementFormData.quantity} onChange={e => setMovementFormData({...movementFormData, quantity: e.target.value})} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none text-xl font-mono" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Observaciones</label>
                <textarea rows={2} value={movementFormData.notes} onChange={e => setMovementFormData({...movementFormData, notes: e.target.value})} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none" />
              </div>

              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={() => setShowMovementForm(null)} className="flex-1 py-2 text-slate-400 hover:text-white transition-colors">Cancelar</button>
                <button type="submit" disabled={submitting} className={`flex-1 py-2 font-bold rounded-xl text-white ${movementFormData.type === 'ENTRADA' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}>
                  {submitting ? '...' : (movementFormData.type === 'ENTRADA' ? 'Ingresar Stock' : 'Extraer Stock')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Modal (P2 only) */}
      {showRequestForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRequestForm(false)} />
          <div className="relative w-full max-w-sm bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl p-6">
            <h3 className="text-lg font-bold mb-1">Solicitar Insumo</h3>
            <p className="text-slate-500 text-xs mb-6">Solicita a la cooperativa que abastezca un producto</p>
            
            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nombre del Insumo *</label>
                <input required type="text" value={requestFormData.item_name} onChange={e => setRequestFormData({...requestFormData, item_name: e.target.value})} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cantidad *</label>
                  <input required min="1" step="any" type="number" value={requestFormData.quantity} onChange={e => setRequestFormData({...requestFormData, quantity: e.target.value})} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Unidad *</label>
                  <input required placeholder="kg, L, sacos..." type="text" value={requestFormData.unit} onChange={e => setRequestFormData({...requestFormData, unit: e.target.value})} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Justificación / Notas</label>
                <textarea rows={2} value={requestFormData.notes} onChange={e => setRequestFormData({...requestFormData, notes: e.target.value})} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none" />
              </div>

              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={() => setShowRequestForm(false)} className="flex-1 py-2 text-slate-400 hover:text-white transition-colors">Cancelar</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl">
                  {submitting ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
