import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout, Plus, Building2, Map as MapIcon, Layers } from 'lucide-react';

interface OrgData {
    name: string;
    type: string;
}

const Dashboard: React.FC = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [orgData, setOrgData] = useState<OrgData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [propertyCount, setPropertyCount] = useState<number | null>(null);

    useEffect(() => {
        if (!token) return;

        const fetchOrgData = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/org/my-org', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setOrgData(data);
                }
            } catch (error) {
                console.error('Error fetching org data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        const fetchPropertyCount = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/properties', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setPropertyCount(Array.isArray(data) ? data.length : 0);
                }
            } catch (error) {
                console.error('Error fetching properties:', error);
            }
        };

        fetchOrgData();
        fetchPropertyCount();
    }, [token]);

    return (
        <div className="min-h-screen bg-[#0f172a] text-white font-inter relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/20 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-900/20 blur-[120px] rounded-full"></div>

            {/* Main Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                    <div>
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                                <Layout className="text-emerald-500 w-6 h-6" />
                            </div>
                            <h2 className="text-emerald-500 font-semibold tracking-widest uppercase text-sm">Panel de Control</h2>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                            Bienvenido, <span className="text-emerald-400">{user?.first_name} {user?.last_name}</span>
                        </h1>
                        <div className="flex items-center space-x-4 text-slate-400">
                            {isLoading ? (
                                <div className="h-4 w-32 bg-slate-800 animate-pulse rounded"></div>
                            ) : (
                                <div className="flex items-center bg-slate-800/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/5">
                                    <Building2 className="w-4 h-4 mr-2 text-emerald-500/70" />
                                    <span className="text-sm font-medium">{orgData?.name || 'Cargando...'}</span>
                                    <span className="mx-2 text-slate-600">•</span>
                                    <span className="text-xs uppercase tracking-wider text-emerald-500/80 font-bold">{orgData?.type || 'P1'}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/properties')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-emerald-900/40 flex items-center space-x-2 active:scale-[0.98] transition-all group"
                    >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                        <span>Nueva Propiedad</span>
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Card: Propiedades — clickable, shows real count */}
                    <button
                        onClick={() => navigate('/properties')}
                        className="bg-slate-900/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl hover:border-emerald-500/30 transition-all group text-left"
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                                <MapIcon className="text-emerald-500 w-8 h-8" />
                            </div>
                            <span className="bg-slate-800 text-slate-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-tighter border border-white/5">
                                Total
                            </span>
                        </div>
                        <h3 className="text-slate-400 font-medium mb-1">Propiedades Registradas</h3>
                        <div className="flex items-baseline space-x-2">
                            {propertyCount === null ? (
                                <div className="h-12 w-16 bg-slate-800 animate-pulse rounded-lg"></div>
                            ) : (
                                <span className="text-5xl font-bold">{propertyCount}</span>
                            )}
                            <span className="text-slate-500 text-sm">unidades</span>
                        </div>
                        <div className="mt-8 pt-6 border-t border-white/5">
                            <p className="text-slate-500 text-sm group-hover:text-emerald-500/70 transition-colors">
                                {propertyCount === 0 ? 'No se han registrado propiedades aún.' : 'Ver todas las propiedades →'}
                            </p>
                        </div>
                    </button>

                    {/* Placeholder Card: Lotes */}
                    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl hover:border-emerald-500/30 transition-all group">
                        <div className="flex items-start justify-between mb-6">
                            <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                                <Layers className="text-emerald-500 w-8 h-8" />
                            </div>
                            <span className="bg-slate-800 text-slate-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-tighter border border-white/5">
                                En gestión
                            </span>
                        </div>
                        <h3 className="text-slate-400 font-medium mb-1">Lotes Activos</h3>
                        <div className="flex items-baseline space-x-2">
                            <span className="text-5xl font-bold">0</span>
                            <span className="text-slate-500 text-sm">parcelas</span>
                        </div>
                        <div className="mt-8 pt-6 border-t border-white/5">
                            <p className="text-slate-500 text-sm">Comienza agregando tu primera propiedad.</p>
                        </div>
                    </div>

                    {/* Quick Start Card */}
                    <div className="bg-emerald-600/10 backdrop-blur-xl border border-emerald-500/20 p-8 rounded-3xl flex flex-col justify-center items-center text-center">
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                            <Plus className="text-emerald-400 w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-emerald-400">¡Comienza ahora!</h3>
                        <p className="text-slate-400 text-sm mb-6">Configura tu primera unidad productiva para empezar a trazar tus cultivos.</p>
                        <button
                            onClick={() => navigate('/properties')}
                            className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors uppercase tracking-widest text-xs"
                        >
                            Registrar propiedad →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
