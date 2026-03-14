import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MapPin, 
  Activity, 
  Package, 
  LogOut,
  ChevronRight,
  Leaf
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuth();

    const menuItems = [
        { name: 'Inicio', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Propiedades', path: '/properties', icon: MapPin },
        { name: 'Cultivos', path: '/crops', icon: Activity },
        { name: 'Inventario', path: '/inventory', icon: Package },
    ];

    const isActive = (path: string) => location.pathname.startsWith(path);

    return (
        <aside className="w-64 h-screen bg-[#0f172a] border-r border-white/10 flex flex-col fixed left-0 top-0 z-30 shadow-2xl skew-selector">
            {/* Logo */}
            <div className="p-8 pb-4">
                <div className="flex items-center space-x-3 mb-8">
                    <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
                        <Leaf className="text-white w-6 h-6" />
                    </div>
                    <span className="text-2xl font-bold tracking-tighter text-white">
                        Agro<span className="text-emerald-500">X</span>
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-2 mt-4">
                {menuItems.map((item) => (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                            isActive(item.path)
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                        }`}
                    >
                        <div className="flex items-center space-x-3">
                            <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive(item.path) ? 'text-emerald-500' : 'text-slate-500'}`} />
                            <span className="font-semibold text-sm">{item.name}</span>
                        </div>
                        {isActive(item.path) && <ChevronRight className="w-4 h-4 text-emerald-500/50" />}
                    </button>
                ))}
            </nav>

            {/* User Profile & Logout */}
            <div className="p-4 mt-auto border-t border-white/5 bg-slate-900/40 backdrop-blur-md">
                <div className="flex items-center space-x-3 mb-4 px-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 font-bold uppercase">
                        {user?.first_name?.charAt(0) || 'P'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-200 truncate">{user?.first_name} {user?.last_name}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Plan {user?.role === 'ADMIN' ? 'Admin' : 'Productor'}</p>
                    </div>
                </div>
                
                <button
                    onClick={logout}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-300 group"
                >
                    <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-semibold">Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
