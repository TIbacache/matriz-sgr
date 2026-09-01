# SGR — Sistema de Gestión de Resultados

Aplicación web multi-tenant para la gestión de resultados de delegaciones municipales: registro de actividades con evidencia validada, agenda colectiva (tubo de trabajo) en tiempo real, metas con cumplimiento ponderado, semáforo diario y tableros BI.

Proyecto integrador INACAP · **Equipo**: Origami SpA
**Stack**: React + TypeScript · Node.js + Express + Socket.io · PostgreSQL + Prisma · Docker

## Documentación

### Especificación (lo que se evalúa)

| Documento | Contenido |
|---|---|
| **[docs/requerimientos-oficiales.md](docs/requerimientos-oficiales.md)** | **38 RF, 18 RNF, 13 reglas, 10 criterios y 31 historias del PDF de los profesores, con el estado de cumplimiento de cada uno** |
| [docs/estructura-planilla-real.md](docs/estructura-planilla-real.md) | Columnas, catálogos, códigos y fórmulas extraídos de la planilla en producción |
| [docs/matriz-trazabilidad.md](docs/matriz-trazabilidad.md) | HU ↔ requisito ↔ commit ↔ prueba (exigida por los profesores) |
| [docs/decisiones-tecnicas.md](docs/decisiones-tecnicas.md) | ADR: RUT, fechas, nombres, códigos, concurrencia, auditoría, parámetros |

### Diseño y desarrollo

| Documento | Contenido |
|---|---|
| [DESIGN.md](DESIGN.md) | Guía visual normativa (tipografías, paleta, accesibilidad, pantallas pendientes, lista negra) |
| [docs/estado-proyecto.md](docs/estado-proyecto.md) | Estado por fase, contrato de API y Socket.io, deuda técnica |
| **[docs/siguiente-sesion.md](docs/siguiente-sesion.md)** | **Qué sigue, en qué orden, cabos sueltos y trampas del entorno** |
| [docs/diagramas.md](docs/diagramas.md) | Contexto, casos de uso, ERD y secuencia de tiempo real |
| [docs/anotaciones-clase.md](docs/anotaciones-clase.md) | Requerimientos del cliente con citas de la reunión |
| [docs/historias-usuario.md](docs/historias-usuario.md) | Historias propias del equipo (subordinadas a las 31 oficiales) |
| [docs/restricciones-y-pendientes.md](docs/restricciones-y-pendientes.md) | Restricciones, bloqueos y riesgos |

### Gestión

| Documento | Contenido |
|---|---|
| [docs/plan-desarrollo.md](docs/plan-desarrollo.md) | Plan del ciclo de vida por sprints, calendario y ruta crítica |
| [docs/plan-desarrollo.csv](docs/plan-desarrollo.csv) | Fuente cargable del plan en Microsoft Planner |
| [docs/guia-cargar-planner.md](docs/guia-cargar-planner.md) | Guía paso a paso para cargar el plan en Planner |
| [Documento_Maestro_Matriz_SGR.md](Documento_Maestro_Matriz_SGR.md) | Visión inicial del equipo (histórico, superado en parte) |

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
