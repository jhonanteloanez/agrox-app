import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Lock,
  Bell,
  Building2,
  Palette,
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle,
  Mail,
  Phone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface TabType {
  id: 'profile' | 'password' | 'notifications' | 'organization' | 'theme';
  label: string;
  icon: React.ReactNode;
}

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications' | 'organization' | 'theme'>('profile');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // ─── Profile Tab State ──────────────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: '',
  });
  const [originalProfile, setOriginalProfile] = useState(profileForm);

  // ─── Password Tab State ─────────────────────────────────────────────────────
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // ─── Notifications Tab State ────────────────────────────────────────────────
  const [notifications, setNotifications] = useState({
    notify_inapp: true,
    notify_whatsapp: false,
    whatsapp_number: '',
    alert_types: ['PRECIPITA', 'TEMP', 'HUMEDAD'],
  });

  // ─── Organization Tab State ────────────────────────────────────────────────
  const [orgForm, setOrgForm] = useState({
    name: '',
    type: 'P1',
    climate_radius_km: 10,
  });

  // ─── Theme Tab State ──────────────────────────────────────────────────────
  const [theme, setTheme] = useState('dark');

  // Fetch initial data on mount
  useEffect(() => {
    if (token) {
      fetchUserData();
      fetchOrgData();
    }
  }, [token]);

  const fetchUserData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/auth/profile`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setProfileForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
        });
        setOriginalProfile({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
        });
      }
    } catch (e) {
      console.error('Failed to fetch user data:', e);
    }
  }, [token, authHeaders]);

  const fetchOrgData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/organization`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setOrgForm({
          name: data.name || '',
          type: data.type || 'P1',
          climate_radius_km: data.climate_radius_km || 10,
        });
      }
    } catch (e) {
      console.error('Failed to fetch organization data:', e);
    }
  }, [token, authHeaders]);

  // ─── Form Handlers ─────────────────────────────────────────────────────────

  const showSuccessMsg = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  const showErrorMsg = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(''), 4000);
  };

  const handleUpdateProfile = async () => {
    if (!profileForm.first_name?.trim() || !profileForm.last_name?.trim()) {
      showErrorMsg('El nombre y apellido son obligatorios');
      return;
    }
    if (!profileForm.email?.trim()) {
      showErrorMsg('El email es obligatorio');
      return;
    }

    if (JSON.stringify(profileForm) === JSON.stringify(originalProfile)) {
      showErrorMsg('No hay cambios para guardar');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/profile`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(profileForm),
      });

      if (res.ok) {
        setOriginalProfile(profileForm);
        showSuccessMsg('Perfil actualizado correctamente');
      } else {
        const data = await res.json();
        showErrorMsg(data.error || 'Error al actualizar perfil');
      }
    } catch (e) {
      showErrorMsg('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password) {
      showErrorMsg('Complete todos los campos');
      return;
    }
    if (passwordForm.new_password.length < 8) {
      showErrorMsg('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showErrorMsg('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/change-password`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      });

      if (res.ok) {
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
        showSuccessMsg('Contraseña cambiada correctamente');
      } else {
        const data = await res.json();
        showErrorMsg(data.error || 'Error al cambiar contraseña');
      }
    } catch (e) {
      showErrorMsg('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/notifications`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(notifications),
      });

      if (res.ok) {
        showSuccessMsg('Preferencias de notificaciones actualizadas');
      } else {
        const data = await res.json();
        showErrorMsg(data.error || 'Error al actualizar notificaciones');
      }
    } catch (e) {
      showErrorMsg('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrganization = async () => {
    if (!orgForm.name?.trim()) {
      showErrorMsg('El nombre de la organización es obligatorio');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/organization`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(orgForm),
      });

      if (res.ok) {
        showSuccessMsg('Organización actualizada correctamente');
      } else {
        const data = await res.json();
        showErrorMsg(data.error || 'Error al actualizar organización');
      }
    } catch (e) {
      showErrorMsg('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // ─── UI Components ─────────────────────────────────────────────────────────

  const tabs: TabType[] = [
    { id: 'profile', label: 'Perfil', icon: <User className="w-5 h-5" /> },
    { id: 'password', label: 'Contraseña', icon: <Lock className="w-5 h-5" /> },
    { id: 'notifications', label: 'Notificaciones', icon: <Bell className="w-5 h-5" /> },
    { id: 'organization', label: 'Organización', icon: <Building2 className="w-5 h-5" /> },
    { id: 'theme', label: 'Apariencia', icon: <Palette className="w-5 h-5" /> },
  ];

  const inputClass = 'w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300';
  const labelClass = 'block text-sm font-semibold text-slate-300 mb-2';
  const btnPrimary = 'flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50';
  const btnSecondary = 'flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-all duration-300';

  return (
    <div className="pl-8 pr-8 py-8 min-h-screen">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </button>
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Configuración</h1>
            <p className="text-slate-400 text-sm mt-1">Gestiona tu cuenta y preferencias</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-emerald-300 text-sm font-medium">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Tabs Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden sticky top-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setSuccess('');
                  setError('');
                  setActiveTab(tab.id);
                }}
                className={`w-full flex items-center space-x-3 px-6 py-4 border-b border-white/5 transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-l-emerald-500'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.icon}
                <span className="font-semibold text-sm">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="lg:col-span-3">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Perfil Personal</h3>
                  <p className="text-slate-400 text-sm">Actualiza tu información de usuario</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Nombre</label>
                    <input
                      type="text"
                      value={profileForm.first_name}
                      onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                      placeholder="Tu nombre"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Apellido</label>
                    <input
                      type="text"
                      value={profileForm.last_name}
                      onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                      placeholder="Tu apellido"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 pointer-events-none" />
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      placeholder="tu@email.com"
                      className={`${inputClass} pl-12`}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Teléfono (opcional)</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 pointer-events-none" />
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="+591 XXX XXX XXX"
                      className={`${inputClass} pl-12`}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleUpdateProfile}
                    disabled={loading}
                    className={btnPrimary}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    <span>Guardar Cambios</span>
                  </button>
                  <button
                    onClick={() => setProfileForm(originalProfile)}
                    className={btnSecondary}
                  >
                    Descartar
                  </button>
                </div>
              </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Cambiar Contraseña</h3>
                  <p className="text-slate-400 text-sm">Actualiza tu contraseña de manera segura</p>
                </div>

                <div>
                  <label className={labelClass}>Contraseña Actual</label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                      placeholder="Ingresa tu contraseña actual"
                      className={inputClass}
                    />
                    <button
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300"
                    >
                      {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Nueva Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      placeholder="Mínimo 8 caracteres"
                      className={inputClass}
                    />
                    <button
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300"
                    >
                      {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Confirmar Nueva Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                      placeholder="Repite la nueva contraseña"
                      className={inputClass}
                    />
                    <button
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <p className="text-blue-300 text-sm">
                    💡 <strong>Recomendación:</strong> Usa una contraseña única y segura con mayúsculas, números y símbolos.
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleChangePassword}
                    disabled={loading}
                    className={btnPrimary}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    <span>Cambiar Contraseña</span>
                  </button>
                  <button
                    onClick={() => setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })}
                    className={btnSecondary}
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Preferencias de Notificaciones</h3>
                  <p className="text-slate-400 text-sm">Personaliza cómo deseas recibir alertas</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-white/10 hover:border-emerald-500/30 transition-colors">
                    <div>
                      <p className="font-semibold text-white">Notificaciones en Aplicación</p>
                      <p className="text-slate-400 text-sm mt-1">Recibe alertas dentro de AgroX</p>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, notify_inapp: !notifications.notify_inapp })}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                        notifications.notify_inapp ? 'bg-emerald-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          notifications.notify_inapp ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-white/10 hover:border-emerald-500/30 transition-colors">
                    <div>
                      <p className="font-semibold text-white">Notificaciones por WhatsApp</p>
                      <p className="text-slate-400 text-sm mt-1">Recibe alertas urgentes por WhatsApp</p>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, notify_whatsapp: !notifications.notify_whatsapp })}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                        notifications.notify_whatsapp ? 'bg-emerald-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          notifications.notify_whatsapp ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {notifications.notify_whatsapp && (
                    <div>
                      <label className={labelClass}>Número de WhatsApp</label>
                      <input
                        type="tel"
                        value={notifications.whatsapp_number}
                        onChange={(e) => setNotifications({ ...notifications, whatsapp_number: e.target.value })}
                        placeholder="+591 70000000"
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <p className="font-semibold text-white mb-3">Tipos de Alertas</p>
                  <div className="space-y-2">
                    {['PRECIPITA', 'TEMP', 'HUMEDAD'].map((type) => (
                      <label key={type} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={notifications.alert_types.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNotifications({ ...notifications, alert_types: [...notifications.alert_types, type] });
                            } else {
                              setNotifications({ ...notifications, alert_types: notifications.alert_types.filter(t => t !== type) });
                            }
                          }}
                          className="w-5 h-5 rounded accent-emerald-600"
                        />
                        <span className="text-slate-300 font-medium">
                          {type === 'PRECIPITA' && 'Precipitación'}
                          {type === 'TEMP' && 'Temperatura'}
                          {type === 'HUMEDAD' && 'Humedad'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleUpdateNotifications}
                    disabled={loading}
                    className={btnPrimary}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    <span>Guardar Preferencias</span>
                  </button>
                </div>
              </div>
            )}

            {/* Organization Tab */}
            {activeTab === 'organization' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Configuración de Organización</h3>
                  <p className="text-slate-400 text-sm">Administra los datos de tu organización</p>
                </div>

                <div>
                  <label className={labelClass}>Nombre de Organización</label>
                  <input
                    type="text"
                    value={orgForm.name}
                    onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                    placeholder="Nombre de tu empresa o asociación"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Tipo de Plan</label>
                  <select value={orgForm.type} onChange={(e) => setOrgForm({ ...orgForm, type: e.target.value })} className={inputClass}>
                    <option value="P1">Plan Productor (P1)</option>
                    <option value="P2">Plan Profesional (P2)</option>
                    <option value="P3">Plan Empresarial (P3)</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Radio de Alertas Climáticas (km)</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={orgForm.climate_radius_km}
                    onChange={(e) => setOrgForm({ ...orgForm, climate_radius_km: parseInt(e.target.value) })}
                    placeholder="5 - 100"
                    className={inputClass}
                  />
                  <p className="text-slate-500 text-xs mt-2">Rango de búsqueda para datos climáticos</p>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                  <p className="text-emerald-300 text-sm">
                    ✓ Tu organización tiene acceso a todas las funcionalidades premium.
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleUpdateOrganization}
                    disabled={loading}
                    className={btnPrimary}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </div>
            )}

            {/* Theme Tab */}
            {activeTab === 'theme' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Apariencia</h3>
                  <p className="text-slate-400 text-sm">Personaliza la interfaz de AgroX</p>
                </div>

                <div>
                  <p className="font-semibold text-white mb-4">Tema de Color</p>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setTheme('dark')}
                      className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                        theme === 'dark'
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-white/10 bg-slate-800/50 hover:border-emerald-500/30'
                      }`}
                    >
                      <div className="w-8 h-8 rounded bg-[#0f172a] mx-auto mb-3" />
                      <p className="text-white font-semibold">Oscuro</p>
                      <p className="text-slate-400 text-xs mt-2">Modo por defecto</p>
                    </button>

                    <button
                      onClick={() => setTheme('light')}
                      disabled
                      className="p-6 rounded-xl border-2 border-white/10 bg-slate-800/50 opacity-50 cursor-not-allowed"
                    >
                      <div className="w-8 h-8 rounded bg-white mx-auto mb-3" />
                      <p className="text-white font-semibold">Claro</p>
                      <p className="text-slate-400 text-xs mt-2">Próximamente</p>
                    </button>
                  </div>
                </div>

                <div>
                  <p className="font-semibold text-white mb-4">Color de Acento</p>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { name: 'Esmeralda', color: 'bg-emerald-500' },
                      { name: 'Azul', color: 'bg-blue-500' },
                      { name: 'Púrpura', color: 'bg-purple-500' },
                      { name: 'Rosa', color: 'bg-pink-500' },
                    ].map((accent) => (
                      <button
                        key={accent.name}
                        disabled
                        className="flex flex-col items-center space-y-2 p-4 rounded-xl border-2 border-white/10 hover:border-white/20 opacity-75 cursor-not-allowed"
                      >
                        <div className={`w-8 h-8 rounded-full ${accent.color}`} />
                        <p className="text-slate-400 text-xs">{accent.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">
                    Actualmente estamos usando el tema Oscuro con color Esmeralda. Las personalizaciones adicionales estarán disponibles próximamente.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-8 p-6 rounded-xl border border-red-500/30 bg-red-500/5">
        <h3 className="text-red-400 font-bold mb-3">Zona de Peligro</h3>
        <button
          onClick={() => {
            if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
              logout();
              navigate('/login');
            }
          }}
          className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-all duration-300"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
