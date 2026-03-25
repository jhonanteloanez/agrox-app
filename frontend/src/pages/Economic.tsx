import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  DollarSign, Plus, X, ChevronLeft, AlertCircle, CheckCircle,
  Loader2, TrendingUp, TrendingDown, BarChart3, Tag, Calendar
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ── Types ────────────────────────────────────────────────────────────────────

interface Income {
  income_id: string;
  description: string;
  amount: number | string;
  currency: string;
  income_date: string;
  category: string;
  notes: string | null;
  crop_id: string | null;
  plot_id: string | null;
}

interface Cost {
  cost_id: string;
  description: string;
  amount: number | string;
  currency: string;
  cost_date: string;
  category: string;
  notes: string | null;
  crop_id: string | null;
  plot_id: string | null;
  inventory_item_id: string | null;
}

interface Rentability {
  total_income: number | string;
  total_cost: number | string;
  profit: number | string;
}

interface PriceReference {
  price_id: string;
  crop_name: string;
  price: number | string;
  currency: string;
  source: string;
  source_url: string | null;
  reference_date: string;
  notes: string | null;
}

type Tab = 'income' | 'costs' | 'rentability' | 'prices';

// ── Category badge colors ─────────────────────────────────────────────────────

const INCOME_CATEGORY_COLORS: Record<string, string> = {
  VENTA:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  SUBSIDIO: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  OTRO:     'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const COST_CATEGORY_COLORS: Record<string, string> = {
  INSUMO:     'bg-orange-500/10 text-orange-400 border-orange-500/20',
  MANO_OBRA:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  MAQUINARIA: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  OTRO:       'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (value: number | string, currency = 'BOB') =>
  `${currency} ${Number(value).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });

// ── Component ─────────────────────────────────────────────────────────────────

const EconomicPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>('income');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [rentability, setRentability] = useState<Rentability>({ total_income: 0, total_cost: 0, profit: 0 });
  const [prices, setPrices] = useState<PriceReference[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);

  // Modals
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showCostForm, setShowCostForm] = useState(false);
  const [showPriceForm, setShowPriceForm] = useState(false);

  // Form data
  const defaultIncomeForm = { description: '', amount: '', currency: 'BOB', income_date: '', category: 'VENTA', notes: '', crop_id: '', plot_id: '' };
  const defaultCostForm = { description: '', amount: '', currency: 'BOB', cost_date: '', category: 'INSUMO', notes: '', crop_id: '', plot_id: '', inventory_item_id: '' };
  const defaultPriceForm = { crop_name: '', price: '', currency: 'BOB', source: 'MANUAL', source_url: '', reference_date: '', notes: '' };

  const [incomeForm, setIncomeForm] = useState(defaultIncomeForm);
  const [costForm, setCostForm] = useState(defaultCostForm);
  const [priceForm, setPriceForm] = useState(defaultPriceForm);

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  // ── Fetch all ───────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [incRes, costRes, rentRes, priceRes, cropsRes, plotsRes] = await Promise.all([
        fetch(`${API}/api/economic/income`, { headers: authHeaders }),
        fetch(`${API}/api/economic/costs`, { headers: authHeaders }),
        fetch(`${API}/api/economic/rentability`, { headers: authHeaders }),
        fetch(`${API}/api/economic/prices`, { headers: authHeaders }),
        fetch(`${API}/api/crops?status=Activo`, { headers: authHeaders }),
        fetch(`${API}/api/plots`, { headers: authHeaders }),
      ]);

      const [incData, costData, rentData, priceData, cropsData, plotsData] = await Promise.all([
        incRes.json(), costRes.json(), rentRes.json(), priceRes.json(), cropsRes.json(), plotsRes.json(),
      ]);

      if (incRes.ok) setIncomes(incData.data || []);
      if (costRes.ok) setCosts(costData.data || []);
      if (rentRes.ok) setRentability(rentData.data || { total_income: 0, total_cost: 0, profit: 0 });
      if (priceRes.ok) setPrices(priceData.data || []);
      if (cropsRes.ok) setCrops(cropsData.data || []);
      if (plotsRes.ok) setPlots(plotsData || []);
    } catch {
      setError('Error de conexión al cargar datos económicos.');
    } finally {
      setLoading(false);
    }
  }, [token, authHeaders]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const showSuccessMsg = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  // ── Submit income ───────────────────────────────────────────────────────────

  const handleCreateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!incomeForm.description || !incomeForm.amount || !incomeForm.income_date) {
      return setError('Descripción, monto y fecha son obligatorios.');
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/economic/income`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({
          ...incomeForm,
          amount: parseFloat(incomeForm.amount),
          crop_id: incomeForm.crop_id || null,
          plot_id: incomeForm.plot_id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowIncomeForm(false);
      setIncomeForm(defaultIncomeForm);
      showSuccessMsg('Ingreso registrado correctamente.');
      fetchAll();
    } catch (e: any) {
      setError(e.message || 'Error al registrar ingreso.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Submit cost ─────────────────────────────────────────────────────────────

  const handleCreateCost = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!costForm.description || !costForm.amount || !costForm.cost_date) {
      return setError('Descripción, monto y fecha son obligatorios.');
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/economic/costs`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({
          ...costForm,
          amount: parseFloat(costForm.amount),
          crop_id: costForm.crop_id || null,
          plot_id: costForm.plot_id || null,
          inventory_item_id: costForm.inventory_item_id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowCostForm(false);
      setCostForm(defaultCostForm);
      showSuccessMsg('Costo registrado correctamente.');
      fetchAll();
    } catch (e: any) {
      setError(e.message || 'Error al registrar costo.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Submit price ────────────────────────────────────────────────────────────

  const handleCreatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!priceForm.crop_name || !priceForm.price || !priceForm.reference_date) {
      return setError('Cultivo, precio y fecha son obligatorios.');
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/economic/prices`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({
          ...priceForm,
          price: parseFloat(priceForm.price),
          source_url: priceForm.source_url || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowPriceForm(false);
      setPriceForm(defaultPriceForm);
      showSuccessMsg('Precio de referencia registrado.');
      fetchAll();
    } catch (e: any) {
      setError(e.message || 'Error al registrar precio.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Shared input class ──────────────────────────────────────────────────────

  const inp = 'w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all';
  const lbl = 'text-[10px] font-bold text-slate-500 uppercase tracking-widest';

  // ── Render ──────────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string }[] = [
    { key: 'income', label: 'Ingresos' },
    { key: 'costs', label: 'Costos' },
    { key: 'rentability', label: 'Rentabilidad' },
    { key: 'prices', label: 'Precios de Referencia' },
  ];

  const profit = Number(rentability.profit);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-inter relative overflow-hidden">
      {/* Glow blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-green-900/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <button onClick={() => navigate('/dashboard')} className="flex items-center space-x-2 text-slate-400 hover:text-emerald-400 transition-colors mb-4 group">
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm">Volver al Dashboard</span>
            </button>
            <div className="flex items-center space-x-3 mb-2">
              <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                <DollarSign className="text-emerald-400 w-5 h-5" />
              </div>
              <h2 className="text-emerald-400 font-semibold tracking-widest uppercase text-sm">Gestión Financiera</h2>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Módulo Económico</h1>
          </div>

          {/* Action buttons per tab */}
          <div>
            {activeTab === 'income' && (
              <button onClick={() => { setShowIncomeForm(true); setError(''); }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-emerald-900/40 flex items-center space-x-2 active:scale-[0.98] transition-all group">
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                <span>Nuevo Ingreso</span>
              </button>
            )}
            {activeTab === 'costs' && (
              <button onClick={() => { setShowCostForm(true); setError(''); }}
                className="bg-red-600 hover:bg-red-500 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-red-900/40 flex items-center space-x-2 active:scale-[0.98] transition-all group">
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                <span>Nuevo Costo</span>
              </button>
            )}
            {activeTab === 'prices' && (
              <button onClick={() => { setShowPriceForm(true); setError(''); }}
                className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-amber-900/40 flex items-center space-x-2 active:scale-[0.98] transition-all group">
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                <span>Nuevo Precio</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-6 mb-8 border-b border-white/10">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`pb-3 font-semibold text-sm transition-colors relative whitespace-nowrap ${
                activeTab === t.key ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.label}
              {activeTab === t.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />}
            </button>
          ))}
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

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* ── TAB: INGRESOS ─────────────────────────────────────────── */}
            {activeTab === 'income' && (
              incomes.length === 0 ? (
                <EmptyState icon={<TrendingUp className="w-10 h-10 text-emerald-500/50" />}
                  title="No hay ingresos registrados"
                  subtitle="Registra tus primeras ventas o subsidios." />
              ) : (
                <EconomicTable
                  headers={['Descripción / Categoría', 'Monto', 'Fecha', 'Cultivo']}
                  rows={incomes.map(i => ({
                    key: i.income_id,
                    cells: [
                      <div>
                        <div className="font-bold text-slate-200">{i.description}</div>
                        <span className={`mt-1 inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest ${INCOME_CATEGORY_COLORS[i.category] || INCOME_CATEGORY_COLORS.OTRO}`}>
                          <Tag className="w-2.5 h-2.5" /><span>{i.category}</span>
                        </span>
                      </div>,
                      <span className="font-mono text-lg font-bold text-emerald-300">{fmt(i.amount, i.currency)}</span>,
                      <span className="text-slate-400 text-xs">{fmtDate(i.income_date)}</span>,
                      <span className="text-slate-500 text-xs">{i.crop_id ? `#${i.crop_id}` : '—'}</span>,
                    ],
                  }))}
                />
              )
            )}

            {/* ── TAB: COSTOS ──────────────────────────────────────────── */}
            {activeTab === 'costs' && (
              costs.length === 0 ? (
                <EmptyState icon={<TrendingDown className="w-10 h-10 text-red-500/50" />}
                  title="No hay costos registrados"
                  subtitle="Registra tus primeros gastos de producción." />
              ) : (
                <EconomicTable
                  headers={['Descripción / Categoría', 'Monto', 'Fecha', 'Cultivo']}
                  rows={costs.map(c => ({
                    key: c.cost_id,
                    cells: [
                      <div>
                        <div className="font-bold text-slate-200">{c.description}</div>
                        <span className={`mt-1 inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest ${COST_CATEGORY_COLORS[c.category] || COST_CATEGORY_COLORS.OTRO}`}>
                          <Tag className="w-2.5 h-2.5" /><span>{c.category.replace('_', ' ')}</span>
                        </span>
                      </div>,
                      <span className="font-mono text-lg font-bold text-red-300">{fmt(c.amount, c.currency)}</span>,
                      <span className="text-slate-400 text-xs">{fmtDate(c.cost_date)}</span>,
                      <span className="text-slate-500 text-xs">{c.crop_id ? `#${c.crop_id}` : '—'}</span>,
                    ],
                  }))}
                />
              )
            )}

            {/* ── TAB: RENTABILIDAD ────────────────────────────────────── */}
            {activeTab === 'rentability' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <RentCard
                  label="Total Ingresos"
                  value={fmt(rentability.total_income)}
                  icon={<TrendingUp className="w-6 h-6 text-emerald-400" />}
                  color="emerald"
                />
                <RentCard
                  label="Total Costos"
                  value={fmt(rentability.total_cost)}
                  icon={<TrendingDown className="w-6 h-6 text-red-400" />}
                  color="red"
                />
                <div className={`bg-slate-900/40 backdrop-blur-xl border rounded-2xl p-6 flex flex-col gap-4 ${
                  profit >= 0 ? 'border-emerald-500/20' : 'border-red-500/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm font-semibold uppercase tracking-widest">Ganancia Neta</span>
                    <BarChart3 className={`w-6 h-6 ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
                  </div>
                  <div className={`text-3xl font-bold font-mono ${profit >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {fmt(rentability.profit)}
                  </div>
                  <span className={`self-start text-xs font-bold px-3 py-1 rounded-full border ${
                    profit >= 0
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {profit >= 0 ? 'RENTABLE' : 'EN PÉRDIDA'}
                  </span>
                </div>
              </div>
            )}

            {/* ── TAB: PRECIOS ─────────────────────────────────────────── */}
            {activeTab === 'prices' && (
              prices.length === 0 ? (
                <EmptyState icon={<DollarSign className="w-10 h-10 text-amber-500/50" />}
                  title="No hay precios de referencia"
                  subtitle="Registra precios de mercado para comparar tu rentabilidad." />
              ) : (
                <EconomicTable
                  headers={['Cultivo', 'Precio', 'Fuente', 'Fecha']}
                  rows={prices.map(p => ({
                    key: p.price_id,
                    cells: [
                      <span className="font-bold text-slate-200">{p.crop_name}</span>,
                      <span className="font-mono text-lg font-bold text-amber-300">{fmt(p.price, p.currency)}</span>,
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest ${
                        p.source === 'API'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}>{p.source}</span>,
                      <span className="text-slate-400 text-xs flex items-center space-x-1">
                        <Calendar className="w-3 h-3" /><span>{fmtDate(p.reference_date)}</span>
                      </span>,
                    ],
                  }))}
                />
              )
            )}
          </>
        )}
      </div>

      {/* ── MODAL: Nuevo Ingreso ──────────────────────────────────────────────── */}
      {showIncomeForm && (
        <Modal title="Nuevo Ingreso" subtitle="Registra una venta, subsidio u otro ingreso" onClose={() => setShowIncomeForm(false)}>
          <form onSubmit={handleCreateIncome} className="p-6 space-y-4 overflow-y-auto">
            <div className="space-y-1.5">
              <label className={lbl}>Descripción *</label>
              <input required type="text" placeholder="ej. Venta de soya — lote 2" value={incomeForm.description}
                onChange={e => setIncomeForm({ ...incomeForm, description: e.target.value })} className={inp} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={lbl}>Monto *</label>
                <input required min="0.01" step="0.01" type="number" value={incomeForm.amount}
                  onChange={e => setIncomeForm({ ...incomeForm, amount: e.target.value })} className={inp} />
              </div>
              <div className="space-y-1.5">
                <label className={lbl}>Moneda *</label>
                <select value={incomeForm.currency} onChange={e => setIncomeForm({ ...incomeForm, currency: e.target.value })} className={inp}>
                  <option value="BOB">BOB</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={lbl}>Categoría *</label>
                <select value={incomeForm.category} onChange={e => setIncomeForm({ ...incomeForm, category: e.target.value })} className={inp}>
                  <option value="VENTA">Venta</option>
                  <option value="SUBSIDIO">Subsidio</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={lbl}>Fecha *</label>
                <input required type="date" value={incomeForm.income_date}
                  onChange={e => setIncomeForm({ ...incomeForm, income_date: e.target.value })} className={inp} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={lbl}>Cultivo (opcional)</label>
                <select value={incomeForm.crop_id} onChange={e => setIncomeForm({ ...incomeForm, crop_id: e.target.value })} className={inp}>
                  <option value="">Ninguno</option>
                  {crops.map((c: any) => (
                    <option key={c.crop_id} value={c.crop_id}>{c.product_name} - {c.plot_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={lbl}>Parcela / Lote (opcional)</label>
                <select value={incomeForm.plot_id} onChange={e => setIncomeForm({ ...incomeForm, plot_id: e.target.value })} className={inp}>
                  <option value="">Ninguna</option>
                  {plots.map((p: any) => (
                    <option key={p.plot_id} value={p.plot_id}>{p.name} - {p.property_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={lbl}>Notas</label>
              <textarea rows={2} value={incomeForm.notes}
                onChange={e => setIncomeForm({ ...incomeForm, notes: e.target.value })} className={`${inp} resize-none`} />
            </div>

            <ModalActions submitting={submitting} onCancel={() => setShowIncomeForm(false)} color="emerald" label="Guardar Ingreso" />
          </form>
        </Modal>
      )}

      {/* ── MODAL: Nuevo Costo ────────────────────────────────────────────────── */}
      {showCostForm && (
        <Modal title="Nuevo Costo" subtitle="Registra un gasto de producción" onClose={() => setShowCostForm(false)}>
          <form onSubmit={handleCreateCost} className="p-6 space-y-4 overflow-y-auto">
            <div className="space-y-1.5">
              <label className={lbl}>Descripción *</label>
              <input required type="text" placeholder="ej. Compra de fertilizante urea" value={costForm.description}
                onChange={e => setCostForm({ ...costForm, description: e.target.value })} className={inp} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={lbl}>Monto *</label>
                <input required min="0.01" step="0.01" type="number" value={costForm.amount}
                  onChange={e => setCostForm({ ...costForm, amount: e.target.value })} className={inp} />
              </div>
              <div className="space-y-1.5">
                <label className={lbl}>Moneda *</label>
                <select value={costForm.currency} onChange={e => setCostForm({ ...costForm, currency: e.target.value })} className={inp}>
                  <option value="BOB">BOB</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={lbl}>Categoría *</label>
                <select value={costForm.category} onChange={e => setCostForm({ ...costForm, category: e.target.value })} className={inp}>
                  <option value="INSUMO">Insumo</option>
                  <option value="MANO_OBRA">Mano de Obra</option>
                  <option value="MAQUINARIA">Maquinaria</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={lbl}>Fecha *</label>
                <input required type="date" value={costForm.cost_date}
                  onChange={e => setCostForm({ ...costForm, cost_date: e.target.value })} className={inp} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={lbl}>Cultivo (opcional)</label>
                <select value={costForm.crop_id} onChange={e => setCostForm({ ...costForm, crop_id: e.target.value })} className={inp}>
                  <option value="">Ninguno</option>
                  {crops.map((c: any) => (
                    <option key={c.crop_id} value={c.crop_id}>{c.product_name} - {c.plot_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={lbl}>Parcela / Lote (opcional)</label>
                <select value={costForm.plot_id} onChange={e => setCostForm({ ...costForm, plot_id: e.target.value })} className={inp}>
                  <option value="">Ninguna</option>
                  {plots.map((p: any) => (
                    <option key={p.plot_id} value={p.plot_id}>{p.name} - {p.property_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5 mt-4">
               <label className={lbl}>ID Ítem Inventario (opcional)</label>
               <input type="number" placeholder="ej. 12" value={costForm.inventory_item_id}
                 onChange={e => setCostForm({ ...costForm, inventory_item_id: e.target.value })} className={inp} />
            </div>

            <div className="space-y-1.5">
              <label className={lbl}>Notas</label>
              <textarea rows={2} value={costForm.notes}
                onChange={e => setCostForm({ ...costForm, notes: e.target.value })} className={`${inp} resize-none`} />
            </div>

            <ModalActions submitting={submitting} onCancel={() => setShowCostForm(false)} color="red" label="Guardar Costo" />
          </form>
        </Modal>
      )}

      {/* ── MODAL: Nuevo Precio ───────────────────────────────────────────────── */}
      {showPriceForm && (
        <Modal title="Nuevo Precio de Referencia" subtitle="Registra un precio de mercado para un cultivo" onClose={() => setShowPriceForm(false)}>
          <form onSubmit={handleCreatePrice} className="p-6 space-y-4 overflow-y-auto">
            <div className="space-y-1.5">
              <label className={lbl}>Cultivo *</label>
              <input required type="text" placeholder="ej. Soya, Maíz, Trigo" value={priceForm.crop_name}
                onChange={e => setPriceForm({ ...priceForm, crop_name: e.target.value })} className={inp} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={lbl}>Precio *</label>
                <input required min="0.01" step="0.01" type="number" value={priceForm.price}
                  onChange={e => setPriceForm({ ...priceForm, price: e.target.value })} className={inp} />
              </div>
              <div className="space-y-1.5">
                <label className={lbl}>Moneda *</label>
                <select value={priceForm.currency} onChange={e => setPriceForm({ ...priceForm, currency: e.target.value })} className={inp}>
                  <option value="BOB">BOB</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={lbl}>Fuente *</label>
                <select value={priceForm.source} onChange={e => setPriceForm({ ...priceForm, source: e.target.value })} className={inp}>
                  <option value="MANUAL">Manual</option>
                  <option value="API">API</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={lbl}>Fecha de Referencia *</label>
                <input required type="date" value={priceForm.reference_date}
                  onChange={e => setPriceForm({ ...priceForm, reference_date: e.target.value })} className={inp} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={lbl}>URL de Fuente (opcional)</label>
              <input type="url" placeholder="https://..." value={priceForm.source_url}
                onChange={e => setPriceForm({ ...priceForm, source_url: e.target.value })} className={inp} />
            </div>

            <div className="space-y-1.5">
              <label className={lbl}>Notas</label>
              <textarea rows={2} value={priceForm.notes}
                onChange={e => setPriceForm({ ...priceForm, notes: e.target.value })} className={`${inp} resize-none`} />
            </div>

            <ModalActions submitting={submitting} onCancel={() => setShowPriceForm(false)} color="amber" label="Guardar Precio" />
          </form>
        </Modal>
      )}
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; subtitle: string }> = ({ icon, title, subtitle }) => (
  <div className="bg-slate-900/20 border border-white/5 rounded-3xl p-20 flex flex-col items-center text-center">
    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/5">{icon}</div>
    <h3 className="text-xl font-bold text-slate-300">{title}</h3>
    <p className="text-slate-500 mt-2">{subtitle}</p>
  </div>
);

const EconomicTable: React.FC<{
  headers: string[];
  rows: { key: string; cells: React.ReactNode[] }[];
}> = ({ headers, rows }) => (
  <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b border-white/5 bg-white/5">
            {headers.map(h => (
              <th key={h} className="px-6 py-4 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map(row => (
            <tr key={row.key} className="hover:bg-white/[0.02] transition-colors">
              {row.cells.map((cell, i) => (
                <td key={i} className="px-6 py-4">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const RentCard: React.FC<{ label: string; value: string; icon: React.ReactNode; color: 'emerald' | 'red' }> = ({ label, value, icon, color }) => (
  <div className={`bg-slate-900/40 backdrop-blur-xl border rounded-2xl p-6 flex flex-col gap-4 ${
    color === 'emerald' ? 'border-emerald-500/20' : 'border-red-500/20'
  }`}>
    <div className="flex items-center justify-between">
      <span className="text-slate-400 text-sm font-semibold uppercase tracking-widest">{label}</span>
      {icon}
    </div>
    <div className={`text-3xl font-bold font-mono ${color === 'emerald' ? 'text-emerald-300' : 'text-red-300'}`}>{value}</div>
  </div>
);

const Modal: React.FC<{ title: string; subtitle: string; onClose: () => void; children: React.ReactNode }> = ({ title, subtitle, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <div className="relative w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
      <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
      </div>
      {children}
    </div>
  </div>
);

const ModalActions: React.FC<{ submitting: boolean; onCancel: () => void; color: 'emerald' | 'red' | 'amber'; label: string }> = ({ submitting, onCancel, color, label }) => {
  const btnColor = {
    emerald: 'bg-emerald-600 hover:bg-emerald-500',
    red: 'bg-red-600 hover:bg-red-500',
    amber: 'bg-amber-600 hover:bg-amber-500',
  }[color];

  return (
    <div className="pt-4 flex space-x-3">
      <button type="button" onClick={onCancel} className="flex-1 py-3 text-slate-400 hover:bg-slate-800 rounded-xl transition-colors">
        Cancelar
      </button>
      <button type="submit" disabled={submitting} className={`flex-1 py-3 ${btnColor} text-white font-bold rounded-xl flex items-center justify-center`}>
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : label}
      </button>
    </div>
  );
};

export default EconomicPage;
