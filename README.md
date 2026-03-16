AgroX
Plataforma SaaS multi-tenant para gestión agrícola en Bolivia, orientada a productores individuales y cooperativas de Santa Cruz.

Stack Tecnológico
Frontend: React + Vite + TypeScript + Tailwind CSS + Lucide React

Backend: Node.js + Express + TypeScript + Prisma

Base de datos: PostgreSQL vía Supabase

Autenticación: JWT personalizado con roles RBAC

Estructura del Proyecto
text
agrox-app/
├── backend/
│   ├── src/
│   │   ├── routes/         # Endpoints REST
│   │   ├── middleware/      # Auth, validaciones
│   │   └── index.ts        # Entry point
│   ├── prisma/
│   │   └── schema.prisma
│   └── .env
└── frontend/
    ├── src/
    │   ├── pages/          # Vistas principales
    │   ├── components/     # Componentes reutilizables
    │   └── App.tsx
    └── vite.config.ts
Setup
Requisitos
Node.js 18+

Cuenta en Supabase con el schema aplicado

Backend
bash
cd backend
npm install
Crea un archivo .env en /backend:

text
DATABASE_URL="postgresql://user:password@host:5432/postgres?schema=public"
JWT_SECRET="tu-secreto-aqui"
PORT=3001
bash
npx prisma generate
npm run dev
Frontend
bash
cd frontend
npm install
npm run dev
Frontend disponible en http://localhost:5173

Módulos Implementados
Módulo	Ruta	Estado
Dashboard	/dashboard	✅
Propiedades	/properties	✅
Lotes	/plots	✅
Cultivos	/crops	✅
Inventario	/inventory	✅
Módulo Económico	/economic	✅
Actividades	/activities	✅
Calendario	/calendar	✅
Alertas Climáticas	/alerts	🔜
Notificaciones	—	🔜
Reportes	—	🔜
Planes de Suscripción
P1 — Productor Solo: usuario único, acceso completo a sus recursos

P2 — Cooperativa: múltiples usuarios con roles (Owner, Productor, Operador, Solo Lectura), gestión de asientos y solicitudes de inventario

Variables de Entorno
Variable	Descripción
DATABASE_URL	Cadena de conexión Supabase/PostgreSQL
JWT_SECRET	Secreto para firmar tokens JWT
PORT	Puerto del backend (default: 3001)
Notas
Los modelos en prisma/schema.prisma coinciden estrictamente con el schema SQL de Supabase

Todas las operaciones de base de datos usan funciones PL/pgSQL (fn_*) definidas en Supabase

BigInt serializado en todas las respuestas para compatibilidad con JSON

RLS habilitado en todas las tablas

