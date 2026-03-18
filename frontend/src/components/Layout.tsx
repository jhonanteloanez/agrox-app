import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';

const ROUTE_TITLES: Record<string, string> = {
    '/dashboard':  'Inicio',
    '/properties': 'Propiedades',
    '/crops':      'Cultivos',
    '/inventory':  'Inventario',
    '/economic':   'Económico',
    '/activities': 'Actividades',
    '/calendar':   'Calendario',
    '/alerts':     'Alertas Climáticas',
};

const Layout: React.FC = () => {
    const location = useLocation();
    const title = Object.entries(ROUTE_TITLES).find(([path]) =>
        location.pathname.startsWith(path)
    )?.[1] ?? 'AgroX';

    return (
        <div className="flex min-h-screen bg-[#0f172a]">
            {/* Fixed Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <main className="flex-1 ml-64 relative min-h-screen">
                {/* Background Decorative Element for all pages */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
                    <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-900/10 blur-[120px] rounded-full"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-slate-900/40 blur-[120px] rounded-full"></div>
                </div>

                {/* Top Navbar */}
                <div className="relative z-20 flex items-center justify-between px-8 py-4 border-b border-white/5 bg-[#0f172a]/60 backdrop-blur-md">
                    <h1 className="text-lg font-bold text-white">{title}</h1>
                    <NotificationBell />
                </div>

                <div className="relative z-10">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
