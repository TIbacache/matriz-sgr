# SGR — Sistema de Gestión de Resultados

Aplicación web multi-tenant para la gestión de resultados de delegaciones municipales: registro de actividades con evidencia validada, agenda colectiva (tubo de trabajo) en tiempo real, metas con cumplimiento ponderado, semáforo diario y tableros BI.

Proyecto integrador INACAP · **Equipo**: Origami SpA
**Stack**: React + TypeScript · Node.js + Express + Socket.io · PostgreSQL + Prisma · Docker

## Documentación

### Especificación (lo que se evalúa)

| Documento | Contenido |
|---|---|
| **[docs/requerimientos-oficiales.md](docs/requerimientos-oficiales.md)** | **38 RF, 18 RNF, 13 reglas, 10 criterios y 31 historias del PDF de los profesores, con el estado de cumplimiento de cada uno.** Su **§10** son las 10 consultas abiertas al docente: qué dice cada fuente, qué hicimos mientras tanto y qué cambia con la respuesta |
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

## Verificación

Cuatro suites automatizadas, **107 comprobaciones**, todas en verde. Cada una cita el requisito que demuestra; el detalle está en [docs/matriz-trazabilidad.md §3](docs/matriz-trazabilidad.md).

```powershell
cd backend
npm run build              # TypeScript estricto: debe pasar antes de cada commit
npm run verificar:calculo  # 21 · fórmulas del cálculo, semáforo, parámetros
npm run verificar:rut      # 16 RUT del seed + normalización (requiere base)
npm run dev                # las dos siguientes necesitan el servidor arriba
npm run smoke              # 17 · tiempo real, permisos y visibilidad por delegación
npm run verificar:api      # 69 · registro, evidencia, validación, concurrencia y auditoría
```

## Estrategia de ramas y versiones

Exigida por el PDF §15 (entregable 01). El principio: **`main` es siempre lo que se le puede mostrar al docente**, y todo bloque cerrado deja una etiqueta a la que volver.

| Rama | Para qué |
|---|---|
| `main` | Estado demostrable. Solo recibe merges de ramas terminadas y verificadas |
| `feat/<bloque>` | Un bloque de trabajo del [plan](docs/siguiente-sesion.md) (ej. `feat/bloque-a-api-registro-validacion`) |
| `fix/<asunto>` | Corrección puntual sobre `main` |
| `docs/<asunto>` | Documentación que no acompaña a código |

**Ciclo de un bloque**

1. `git checkout -b feat/<bloque>` desde `main`.
2. Commits convencionales **en español, citando la HU y el RF** (`feat(evidencias): HU-10 RF-011 código verificador inmutable`).
3. Antes de fusionar: `npm run build` en backend y frontend, y las cuatro suites en verde.
4. `git merge --no-ff feat/<bloque>` — el `--no-ff` conserva el bloque como una unidad en el historial, que es lo que permite revertirlo entero de un solo comando.
5. Etiqueta anotada en el merge: `git tag -a v0.X.0-<bloque> -m "…"`. **La rama no se borra** hasta la entrega final: es la evidencia de cómo se construyó.

**Volver atrás**

```powershell
git tag -n                              # etiquetas y su descripción
git revert -m 1 <hash-del-merge>        # deshace el bloque conservando la historia (preferido)
git reset --hard v0.2.0-modelo-v2       # vuelve al estado anterior (solo si aún no se compartió)
```

| Etiqueta | Estado que congela |
|---|---|
| `v0.2.0-modelo-v2` | Modelo de datos v2 migrado y verificado, sin API |
| `v0.3.0-bloque-a` | API del registro y la validación (EP-01 + EP-03), 95 comprobaciones en verde |
| `v0.4.0-ficha-personal` | Ficha personal (RF-008): la pestaña personal con registro, evidencia y anulación |
| `v0.5.0-bandeja-verificador` | Bandeja del verificador (RF-013, HU-11): el ciclo evidencia → validación → puntaje, completo en pantalla |
| `v0.5.1-bandeja-orden` | Corrección: la cola muestra lo recién subido (orden configurable y paginación explícita) |
