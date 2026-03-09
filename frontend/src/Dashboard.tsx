// React import removed to fix unused warning
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import {
  Sprout,
  Tractor,
  Droplets,
  ThermometerSun,
  Map,
  Leaf,
  Bell,
  Search,
  UserCircle
} from 'lucide-react';

const yieldData = [
  { month: 'Ene', y2025: 4000, y2026: 4400 },
  { month: 'Feb', y2025: 3500, y2026: 3800 },
  { month: 'Mar', y2025: 5000, y2026: 5200 },
  { month: 'Abr', y2025: 4800, y2026: 5100 },
  { month: 'May', y2025: 6000, y2026: 6300 },
  { month: 'Jun', y2025: 5500, y2026: 5900 },
];

const phenologyData = [
  { stage: 'Siembra', crops: 12 },
  { stage: 'Crec. Veg.', crops: 25 },
  { stage: 'Floración', crops: 40 },
  { stage: 'Fructificación', crops: 18 },
  { stage: 'Cosecha', crops: 5 },
];

const StatCard = ({ title, value, icon: Icon, trend }: { title: string, value: string, icon: any, trend: string }) => (
  <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-6 flex items-start justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
      <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
      <p className="text-xs font-medium text-primary mt-2 flex items-center">
        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        {trend} vs mes anterior
      </p>
    </div>
    <div className="bg-primary/10 p-3 rounded-lg text-primary">
      <Icon size={24} />
    </div>
  </div>
);

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">

      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-border">
          <div className="bg-primary p-2 rounded-lg text-primary-foreground">
            <Sprout size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">AgroX</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {[
            { name: 'Dashboard', icon: Map, active: true },
            { name: 'Propiedades', icon: Tractor },
            { name: 'Cultivos', icon: Leaf },
            { name: 'Clima', icon: ThermometerSun },
            { name: 'Riego', icon: Droplets },
          ].map((item) => (
            <a
              key={item.name}
              href="#"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${item.active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
            >
              <item.icon size={20} />
              {item.name}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">

        {/* Header */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between px-8">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar parcelas, cultivos, organizaciones..."
              className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border border-card"></span>
            </button>
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
              <UserCircle size={20} />
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8 space-y-8 max-w-7xl mx-auto">

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Vista General</h1>
              <p className="text-muted-foreground mt-1">Bienvenido de nuevo, Administrador. Así está el estado de tus propiedades.</p>
            </div>
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2">
              <Leaf size={16} />
              Nuevo Cultivo
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Parcelas Activas" value="142" icon={Map} trend="+12.5%" />
            <StatCard title="Cultivos en Curso" value="48" icon={Leaf} trend="+4.1%" />
            <StatCard title="Producción Est. (Ton)" value="12,450" icon={Tractor} trend="+18.2%" />
            <StatCard title="Alertas Climáticas" value="3" icon={ThermometerSun} trend="-50.0%" />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Chart 1 */}
            <div className="bg-card border border-border rounded-xl shadow-sm p-6 line-chart-container">
              <div className="mb-4">
                <h3 className="text-lg font-semibold tracking-tight">Rendimiento Histórico</h3>
                <p className="text-sm text-muted-foreground">Comparativa de toneladas cosechadas 2025 vs 2026</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={yieldData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="y2025" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="y2026" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--card))" }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2 */}
            <div className="bg-card border border-border rounded-xl shadow-sm p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold tracking-tight">Etapas Fenológicas Actuales</h3>
                <p className="text-sm text-muted-foreground">Distribución de cultivos por etapa de crecimiento</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={phenologyData} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 500 }} />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="crops" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
