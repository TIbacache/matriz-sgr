# Matriz SGR

Sistema multi-tenant de gestión territorial para municipalidades y empresas: tubo de trabajo kanban en tiempo real, metas trimestrales con cumplimiento ponderado, semáforos y dashboards BI.

**Equipo**: Origami SpA · **Stack**: React + TypeScript · Node.js + Express + Socket.io · PostgreSQL + Prisma · Docker

## Documentación

| Documento | Contenido |
|---|---|
| [Documento_Maestro_Matriz_SGR.md](Documento_Maestro_Matriz_SGR.md) | Especificación completa del proyecto |
| [DESIGN.md](DESIGN.md) | Guía visual normativa (tipografías, paleta, componentes, lista negra) |
| [docs/diagramas.md](docs/diagramas.md) | Contexto, casos de uso, ERD y secuencia de tiempo real |
| [docs/historias-usuario.md](docs/historias-usuario.md) | 8 épicas, 20 historias con criterios de aceptación |
| [docs/restricciones-y-pendientes.md](docs/restricciones-y-pendientes.md) | Restricciones del equipo, bloqueos y riesgos |
| [docs/backlog-planner.csv](docs/backlog-planner.csv) | Backlog para cargar en Microsoft Planner |

## Estructura

```
/backend    Node.js + Express + Socket.io + Prisma
/frontend   React + TypeScript + dnd-kit + ECharts (Fase 3)
/infra      Docker Compose de producción, Caddy, CI/CD (Fase 5)
/docs       Diagramas, historias, backlog
/scripts    Utilidades (carga de backlog en Planner)
```

## Desarrollo local

Requisitos: Node.js 20+, Docker Desktop.

```powershell
# 1. Base de datos
docker compose up -d

# 2. Backend (http://localhost:4000)
cd backend
copy .env.example .env
npm install
npx prisma migrate dev
npm run dev

# 3. Frontend (http://localhost:5173) — desde Fase 3
cd frontend
npm install
npm run dev
```

## Puertos

| Servicio | Puerto |
|---|---|
| Frontend (Vite dev) | 5173 |
| Backend API + Socket.io | 4000 |
| PostgreSQL | 5432 |
