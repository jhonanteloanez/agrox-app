# AgroX

Plataforma SaaS multi-tenant para gestión agrícola en Bolivia, orientada a productores individuales y cooperativas de Santa Cruz.

## Stack Tecnológico

- **Frontend:** React + Vite + TypeScript + Tailwind CSS + Lucide React
- **Backend:** Node.js + Express + TypeScript + Prisma
- **Base de datos:** PostgreSQL vía Supabase
- **Autenticación:** JWT personalizado con roles RBAC

## Estructura del Proyecto

agrox-app/
├── backend/
│ ├── src/
│ │ ├── routes/
│ │ ├── middleware/
│ │ └── index.ts
│ ├── prisma/
│ │ └── schema.prisma
│ └── .env
└── frontend/
├── src/
│ ├── pages/
│ ├── components/
│ └── App.tsx
└── vite.config.ts


## Setup

### Requisitos
- Node.js 18+
- Cuenta en Supabase con el schema aplicado

### Backend
```bash
cd backend
npm install

Crea .env en /backend:
DATABASE_URL="postgresql://user:password@host:5432/postgres?schema=public"
JWT_SECRET="tu-secreto-aqui"
PORT=3001

Frontend
cd frontend
npm install
npm run dev

Frontend en http://localhost:5173

Modulos
| Módulo             | Ruta        | Estado |
| ------------------ | ----------- | ------ |
| Dashboard          | /dashboard  | ✅      |
| Propiedades        | /properties | ✅      |
| Lotes              | /plots      | ✅      |
| Cultivos           | /crops      | ✅      |
| Inventario         | /inventory  | ✅      |
| Módulo Económico   | /economic   | ✅      |
| Actividades        | /activities | ✅      |
| Calendario         | /calendar   | ✅      |
| Alertas Climáticas | /alerts     | 🔜     |
| Notificaciones     | —           | 🔜     |
| Reportes           | —           | 🔜     |

Planes de Suscripción
P1 — Productor Solo: usuario único, acceso completo a sus recursos

P2 — Cooperativa: múltiples usuarios con roles, gestión de asientos y solicitudes de inventario

Variables de Entorno

| Variable     | Descripción                            |
| ------------ | -------------------------------------- |
| DATABASE_URL | Cadena de conexión Supabase/PostgreSQL |
| JWT_SECRET   | Secreto para firmar tokens JWT         |
| PORT         | Puerto del backend (default: 3001)     |

Notas
Todas las operaciones de DB usan funciones PL/pgSQL (fn_*) en Supabase

BigInt serializado en todas las respuestas para compatibilidad con JSON

RLS habilitado en todas las tablas

