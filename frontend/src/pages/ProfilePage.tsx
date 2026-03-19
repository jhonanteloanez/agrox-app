import React, { useState, useEffect } from 'react';
import { User, Lock, Save, Key, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:3001';

interface ProfileData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  phone: string | null;
  status: string;
  created_at: string;
  plan_code: string;
}

type Msg = { type: 'success' | 'error'; text: string };

const ProfilePage: React.FC = () => {
  const { token, user: authUser, login } = useAuth();

  const [activeTab, setActiveTab] = useState<'info' | 'security'>('info');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Info form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoMsg, setInfoMsg] = useState<Msg | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<Msg | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setProfile(data);
        setFirstName(data.first_name);
        setLastName(data.last_name);
        setPhone(data.phone || '');
      } catch (err: any) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token]);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoMsg(null);
    setInfoSaving(true);
    try {
      const res = await fetch(`${API}/api/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(prev => (prev ? { ...prev, ...data } : null));
      // Sync AuthContext so sidebar name updates immediately
      if (authUser && token) {
        login(token, { ...authUser, first_name: data.first_name, last_name: data.last_name });
      }
      setInfoMsg({ type: 'success', text: 'Perfil actualizado correctamente' });
    } catch (err: any) {
      setInfoMsg({ type: 'error', text: err.message || 'Error al actualizar el perfil' });
    } finally {
      setInfoSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: 'Las contraseñas nuevas no coinciden' });
      return;
    }
    if (newPassword.length < 8) {
      setPwdMsg({ type: 'error', text: 'La nueva contraseña debe tener mínimo 8 caracteres' });
      return;
    }
    setPwdSaving(true);
    try {
      const res = await fetch(`${API}/api/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwdMsg({ type: 'success', text: 'Contraseña actualizada correctamente' });
    } catch (err: any) {
      setPwdMsg({ type: 'error', text: err.message || 'Error al cambiar la contraseña' });
    } finally {
      setPwdSaving(false);
    }
  };

  const planLabel = profile?.plan_code === 'P2' ? 'Cooperativa' : 'Individual';
  const planBadge =
    profile?.plan_code === 'P2'
      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center space-x-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl font-bold uppercase">
          {profile?.first_name?.charAt(0) || 'U'}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">
            {profile?.first_name} {profile?.last_name}
          </h2>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${planBadge}`}>
              Plan {profile?.plan_code} — {planLabel}
            </span>
            <span className="text-xs text-slate-500">@{profile?.username}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-slate-900/40 p-1 rounded-xl border border-white/5">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'info'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Información Personal</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'security'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Seguridad</span>
        </button>
      </div>

      {/* Tab: Información Personal */}
      {activeTab === 'info' && (
        <div className="bg-slate-900/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <form onSubmit={handleSaveInfo} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  Apellido
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                Teléfono
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Ej: +591 70000000"
                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                Email{' '}
                <span className="text-slate-600 normal-case font-normal">(no editable)</span>
              </label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full bg-slate-800/20 border border-white/5 rounded-xl px-4 py-3 text-slate-500 text-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                Usuario{' '}
                <span className="text-slate-600 normal-case font-normal">(no editable)</span>
              </label>
              <input
                type="text"
                value={profile?.username || ''}
                disabled
                className="w-full bg-slate-800/20 border border-white/5 rounded-xl px-4 py-3 text-slate-500 text-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                Miembro desde
              </label>
              <p className="text-sm text-slate-400 px-1">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('es-BO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '—'}
              </p>
            </div>

            {infoMsg && (
              <div
                className={`flex items-center space-x-2 p-3 rounded-xl text-sm ${
                  infoMsg.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}
              >
                {infoMsg.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{infoMsg.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={infoSaving}
              className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200"
            >
              {infoSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{infoSaving ? 'Guardando...' : 'Guardar cambios'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab: Seguridad */}
      {activeTab === 'security' && (
        <div className="bg-slate-900/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <form onSubmit={handleChangePassword} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                Contraseña actual
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                Nueva contraseña
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                minLength={8}
                required
                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
              <p className="text-xs text-slate-600 mt-1 px-1">Mínimo 8 caracteres</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                Confirmar nueva contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            {pwdMsg && (
              <div
                className={`flex items-center space-x-2 p-3 rounded-xl text-sm ${
                  pwdMsg.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}
              >
                {pwdMsg.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{pwdMsg.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={pwdSaving}
              className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200"
            >
              {pwdSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Key className="w-4 h-4" />
              )}
              <span>{pwdSaving ? 'Cambiando...' : 'Cambiar contraseña'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
