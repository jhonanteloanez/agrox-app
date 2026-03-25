# AgroX 🌱

Plataforma SaaS multi-tenant para gestión agrícola en Bolivia, orientada a productores individuales y cooperativas de Santa Cruz.

[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.38.4-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)

## ✨ Características

- **🏢 Multi-tenant**: Arquitectura SaaS con aislamiento completo por organización
- **🔐 RBAC**: Control de acceso basado en roles (Admin, Productor, Miembro)
- **📊 Dashboard**: Panel de control con métricas en tiempo real
- **🌾 Gestión Agrícola**: Cultivos, propiedades, lotes y actividades
- **📈 Análisis Económico**: Costos, ingresos, rentabilidad y precios de referencia
- **📦 Inventario**: Gestión de insumos con movimientos y solicitudes
- **📅 Calendario**: Planificación de actividades agrícolas
- **⚙️ Configuración**: Perfil, notificaciones, organización y preferencias
- **📱 Responsive**: Diseño adaptativo para desktop y móvil
- **🌙 Dark Mode**: Tema oscuro profesional con colores emerald

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** + **Vite** - Framework moderno y rápido
- **TypeScript** - Tipado estático para mayor robustez
- **Tailwind CSS** - Estilos utilitarios con tema personalizado
- **Lucide React** - Iconografía consistente y moderna
- **React Router** - Navegación SPA
- **Axios** - Cliente HTTP para APIs
- **Recharts** - Gráficos y visualizaciones

### Backend
- **Node.js** + **Express** - API RESTful escalable
- **TypeScript** - Tipado completo del backend
- **Prisma** - ORM moderno con migraciones
- **JWT** - Autenticación stateless
- **CORS** - Configuración de origen cruzado
- **bcrypt** - Hashing de contraseñas

### Base de Datos
- **PostgreSQL** - Base de datos relacional robusta
- **Supabase** - Plataforma como servicio con hosting
- **Row Level Security (RLS)** - Seguridad a nivel de fila
- **Funciones PL/pgSQL** - Lógica de negocio en BD

## 📁 Estructura del Proyecto

```
agrox-app/
├── backend/
│   ├── src/
│   │   ├── index.ts           # Servidor principal y rutas
│   │   ├── prisma.ts          # Configuración Prisma + RLS
│   │   ├── routes/            # Rutas por módulo
│   │   │   ├── crops.ts
│   │   │   ├── inventory.ts
│   │   │   ├── economic.ts
│   │   │   └── activities.ts
│   │   └── scripts/           # Utilidades y debugging
│   ├── prisma/
│   │   └── schema.prisma      # Esquema de BD
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Configuración de rutas
│   │   ├── main.tsx           # Punto de entrada
│   │   ├── components/        # Componentes reutilizables
│   │   │   ├── Layout.tsx     # Layout principal
│   │   │   ├── Sidebar.tsx    # Navegación lateral
│   │   │   └── ProtectedRoute.tsx
│   │   ├── pages/             # Páginas principales
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Settings.tsx   # ⚡ NUEVO
│   │   │   ├── Crops.tsx
│   │   │   └── ...
│   │   ├── context/           # Contextos React
│   │   │   └── AuthContext.tsx
│   │   └── index.css          # Estilos globales
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── handoff_notes.md           # Notas de desarrollo
└── README.md
```

## 🚀 Inicio Rápido

### Prerrequisitos
- **Node.js 18+** - Runtime de JavaScript
- **Cuenta Supabase** - Base de datos PostgreSQL como servicio
- **Git** - Control de versiones

### 1. Clonar el Repositorio
```bash
git clone https://github.com/jhonanteloanez/agrox-app.git
cd agrox-app
```

### 2. Configurar Backend
```bash
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
```

Edita `backend/.env`:
```env
DATABASE_URL="postgresql://user:password@host:5432/postgres?schema=public"
JWT_SECRET="tu-secreto-jwt-super-seguro-aqui"
PORT=3001
```

### 3. Configurar Frontend
```bash
cd ../frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

### 4. Ejecutar Backend
```bash
# Desde directorio backend/
npm run dev
```

### 5. Acceder a la Aplicación
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## 📋 Módulos y Funcionalidades

| Módulo | Ruta | Estado | Descripción |
|--------|------|--------|-------------|
| 🏠 **Dashboard** | `/dashboard` | ✅ | Panel con métricas y estadísticas |
| 🏡 **Propiedades** | `/properties` | ✅ | Gestión de fincas y terrenos |
| 🌾 **Cultivos** | `/crops` | ✅ | Seguimiento de siembras y cosechas |
| 📦 **Inventario** | `/inventory` | ✅ | Control de insumos y materiales |
| 💰 **Económico** | `/economic` | ✅ | Costos, ingresos y rentabilidad |
| 📝 **Actividades** | `/activities` | ✅ | Planificación de tareas agrícolas |
| 📅 **Calendario** | `/calendar` | ✅ | Vista calendario de actividades |
| ⚙️ **Configuración** | `/settings` | ✅ | Perfil, notificaciones, organización |
| 🌤️ **Alertas** | `/alerts` | 🔜 | Alertas climáticas y notificaciones |
| 📊 **Reportes** | `/reports` | 🔜 | Análisis y reportes avanzados |

### ⚙️ Módulo de Configuración (Nuevo)

El módulo de configuración incluye 5 secciones principales:

1. **👤 Perfil**: Actualizar nombre, apellido, email y teléfono
2. **🔒 Contraseña**: Cambiar contraseña con validación
3. **🔔 Notificaciones**: Configurar alertas in-app y WhatsApp
4. **🏢 Organización**: Gestionar datos de la empresa/cooperativa
5. **🎨 Apariencia**: Tema y preferencias visuales

## 🔐 Planes de Suscripción

### P1 - Productor Individual
- ✅ Usuario único
- ✅ Acceso completo a recursos personales
- ✅ Dashboard básico
- ✅ Gestión agrícola completa
- ✅ Soporte básico

### P2 - Cooperativa/Equipo
- ✅ Múltiples usuarios con roles
- ✅ Gestión de permisos RBAC
- ✅ Solicitudes de inventario
- ✅ Reportes avanzados
- ✅ Soporte prioritario

## 🔧 Variables de Entorno

### Backend (.env)
```env
# Base de datos
DATABASE_URL="postgresql://user:password@host:5432/postgres?schema=public"

# Autenticación
JWT_SECRET="tu-secreto-jwt-super-seguro-aqui"

# Servidor
PORT=3001
```

### Frontend (.env)
```env
VITE_API_URL="http://localhost:3001"
```

## 📡 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `GET /api/auth/profile` - Obtener perfil
- `PUT /api/auth/profile` - Actualizar perfil
- `POST /api/auth/change-password` - Cambiar contraseña

### Gestión
- `GET /api/dashboard` - Estadísticas del dashboard
- `GET /api/properties` - Lista de propiedades
- `GET /api/crops` - Lista de cultivos
- `GET /api/inventory` - Items de inventario
- `GET /api/economic/*` - Datos económicos
- `GET /api/activities` - Lista de actividades

### Configuración
- `PUT /api/auth/notifications` - Actualizar preferencias
- `GET /api/organization` - Datos de organización
- `PUT /api/organization` - Actualizar organización

## 🏗️ Arquitectura

### Patrón de Diseño
- **Clean Architecture**: Separación clara de responsabilidades
- **Repository Pattern**: Abstracción de acceso a datos
- **Service Layer**: Lógica de negocio centralizada
- **Middleware Pattern**: Autenticación y validación

### Seguridad
- **JWT Authentication**: Tokens stateless con expiración
- **Password Hashing**: bcrypt para contraseñas
- **Row Level Security**: Políticas RLS en PostgreSQL
- **Input Validation**: Validación en frontend y backend
- **CORS**: Configuración restrictiva de orígenes

### Base de Datos
- **Funciones PL/pgSQL**: Lógica de negocio en BD (`fn_*`)
- **Triggers**: Auditoría automática de cambios
- **Views**: Optimización de consultas complejas
- **Indexes**: Rendimiento optimizado
- **Migrations**: Versionado de esquema

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'feat: añade nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

### Convenciones de Commit
- `feat:` - Nueva funcionalidad
- `fix:` - Corrección de bug
- `docs:` - Cambios en documentación
- `style:` - Cambios de estilo/formato
- `refactor:` - Refactorización de código
- `test:` - Añadir/modificar tests

## 📝 Notas Técnicas

- **BigInt Serialization**: Todos los IDs BigInt se serializan como strings para compatibilidad JSON
- **Timezone Handling**: Fechas almacenadas en UTC, mostradas en zona horaria local
- **File Uploads**: Imágenes de perfil almacenadas en Supabase Storage
- **Real-time**: WebSockets para notificaciones en tiempo real (planeado)
- **Caching**: Redis para sesiones y caché de consultas (planeado)

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👥 Equipo

- **Desarrollador Principal**: [Tu Nombre]
- **Diseño UI/UX**: Inspirado en dashboards modernos
- **Arquitectura**: Clean Architecture + Domain-Driven Design

---

**AgroX** - Transformando la agricultura boliviana con tecnología moderna 🌾🇧🇴

