# Estado del proyecto — Matriz SGR

**Actualizado**: 25 de agosto de 2026 (fin de Fase 3)
Este documento es la fuente de verdad del avance. Se actualiza al cerrar cada fase.

## Resumen por fases

| Fase | Estado | Contenido |
|---|---|---|
| 1. Documentación y diseño | ✅ Completa | DESIGN.md, diagramas, historias, backlog Planner |
| 2. Backend y configuración | ✅ Completa | API + Socket.io + Prisma + Postgres Docker |
| 3. Frontend | ✅ Completa* | Vite + React + TS, auth, kanban dnd-kit, presencia. *Falta formulario de crear tarea (ver Fase 3) |
| 4. BI y Dashboards | ⬜ Pendiente | ECharts: gauges, heatmap, radar, KPI cards + tests |
| 5. Despliegue | ⬜ Pendiente | CI/CD GitHub Actions, VPS, Caddy, backups |

## Fase 2 — qué quedó funcionando (verificado)

- **Repo privado**: https://github.com/TIbacache/matriz-sgr (rama `main`).
- **Postgres 16** en Docker (`docker compose up -d` en la raíz, contenedor `matriz-sgr-db`, puerto 5432, volumen persistente `matriz_sgr_pgdata`).
- **2 migraciones Prisma** aplicadas: `init` (tablas) y `vista_cumplimiento` (vista materializada con índice único para `REFRESH ... CONCURRENTLY`).
- **Seed demo** (`npx prisma db seed`): Municipalidad Demo, 3 delegaciones, 4 pilares, 18 tareas, metas 2026-Q3 con ponderadores 0.25. Password de todos: `matriz123`. Usuarios: `admin@demo.cl`, `supervisora@demo.cl`, `delegado.norte@demo.cl` (gerente de Norte), `delegada.centro@demo.cl` (gerente de Centro), `funcionario1@demo.cl`, `funcionaria2@demo.cl`.
- **Smoke test de integración**: `npm run smoke` en `/backend` (servidor corriendo) → 7/7 PASS. Cubre: rechazo de handshake sin token, 403 tarea ajena, join a room, presencia, rechazo unidad ajena, PATCH propio, evento en room.
- **Build limpio**: `npm run build` (tsc estricto) sin errores.

### Contrato de la API (puerto 4000)

Auth: header `Authorization: Bearer <JWT>`. El JWT lleva `{userId, organizationId, rol, nombre}`. Todo endpoint filtra por el `organizationId` del token; recursos de otro tenant → **404**.

| Endpoint | Roles | Notas |
|---|---|---|
| `GET /` y `GET /health` | público | Índice y healthcheck |
| `POST /auth/login` | público | `{email, password, organizationId?}`. Multi-org sin elegir → 409 con lista. 401 genérico |
| `GET /auth/me` | todos | Incluye organización y `configuracionTerminologia` |
| `GET /unidades` | todos | — |
| `POST/PATCH/DELETE /unidades[/:id]` | admin, supervisor | — |
| `GET /categorias` | todos | Orden por `ordenPrioridad` |
| `POST/PATCH/DELETE /categorias[/:id]` | admin, supervisor | DELETE con tareas/metas → 409 |
| `GET /tareas?unidad=<id>` | todos | También es la recuperación post-reconexión (HU-3.4) |
| `POST /tareas` | admin, supervisor, gerente | Gerente solo en su delegación (unidad.responsableId) |
| `PATCH /tareas/:id` | según alcance | usuario: solo `responsableId` propio; gerente: su unidad; lo dispara el drag & drop |
| `DELETE /tareas/:id` | admin, supervisor, gerente | — |
| `GET /metas[?trimestre=2026-Q3]` | todos | — |
| `PUT /metas` | admin, supervisor | Upsert por (unidad, categoría, trimestre). Suma ponderadores > 1 → 422; respuesta incluye `sumaPonderadores` |
| `PATCH /metas/:id/avance` | admin, supervisor, gerente (su unidad) | — |
| `GET /kpis/cumplimiento[?trimestre=]` | todos | Lee la vista materializada. Campos: `unidad_nombre, categoria_nombre, trimestre, cumplimiento_categoria, ponderador, cumplimiento_total, semaforo_color` |
| `POST /kpis/recalcular` | admin, supervisor | Refresca la vista a demanda (además del cron, cada 10 min por defecto) |

### Contrato de Socket.io (mismo puerto 4000)

- Conexión: `io(url, { auth: { token: <JWT> } })` — sin token válido el handshake se **rechaza**.
- Al conectar, el servidor mete al socket en `org:<organizationId>` automáticamente.
- Cliente emite `unidad:join` con `unidadId` (ack `boolean`) → entra a `unidad:<id>`. **Ojo**: el servidor emite `presencia:actualizada` ANTES de responder el ack; registrar el listener antes del join.
- Eventos que emite el servidor:
  - room unidad: `tarea:creada`, `tarea:actualizada`, `tarea:eliminada` ({id}), `presencia:actualizada` ({unidadId, conectados: [{userId, nombre, rol}]})
  - room org: `unidad:creada/actualizada/eliminada`, `categoria:creada/actualizada/eliminada`, `meta:actualizada/eliminada`, `cumplimiento:recalculado`
- Límites: 10 msg/s por socket (exceso se descarta; reincidencia desconecta), payload máx 100KB.
- Todo write pasa por `emitEvent()` de `src/services/broadcast.ts` (regla HU-8.2: endpoint nuevo de escritura debe emitir o justificar).

### Decisiones de Fase 2 (no re-discutir sin motivo)

1. Backend en **TypeScript estricto** (`npm run build` debe pasar siempre).
2. `tareas.estado` es **string libre**, no enum: columnas del kanban configurables por tenant (hoy: `pendiente`, `en_proceso`, `realizado`).
3. No hay columna de **orden intra-columna** en tareas: el kanban ordena por `fechaCompromiso`. Si se pide orden manual, agregar columna `orden` + migración.
4. Ponderadores: se rechaza solo si la suma **supera** 1 (se cargan de a uno); la UI debe advertir mientras sea < 1 usando `sumaPonderadores` de la respuesta.
5. IDs son `String @default(uuid())` → columna **text** en Postgres, no tipo `uuid` (no castear `::uuid` en SQL crudo).
6. `req.params.id` se normaliza con `String()` (Express 5 lo tipa `string | string[]` con middleware intercalado).
7. Token en el frontend: `localStorage` (decisión de Fase 3; refresh token queda para más adelante si el profesor lo exige).

## Fase 3 — qué quedó funcionando

- **Stack**: Vite 7 + React 18 + TS estricto, CSS3 plano con tokens de DESIGN.md (`src/styles/tokens.css` es la traducción literal). Fuentes por Google Fonts (Space Grotesk + Public Sans). Sin Tailwind, sin UI kits, sin Inter.
- **Auth**: `AuthContext` con login, JWT en `localStorage` (clave `matriz.auth`), logout automático ante cualquier 401 (`api.setOnUnauthorized`). Carga terminología del tenant desde `/auth/me` (HU-1.3 parcial: los textos de unidad usan el término configurado).
- **Rutas**: `/login`, `/` (tubo), `/dashboard` (placeholder Fase 4). Sin token → redirect a login.
- **Kanban (HU-3.1)**: dnd-kit con `useDraggable`/`useDroppable` (NO sortable: no hay orden intra-columna, decisión Fase 2 nº3; columnas ordenan por fechaCompromiso). PointerSensor + TouchSensor (móvil OK). Actualización optimista con revert + toast de 5s si el PATCH falla. DragOverlay con rotación 2° y sombra-2 según DESIGN.
- **Tiempo real**: hook `useUnidadSocket` — join al room en cada `connect` (el servidor no recuerda rooms de sockets caídos), **recarga completa de tareas al reconectar** (HU-3.4), handlers idempotentes por id (el PATCH y el evento pueden llegar en cualquier orden).
- **Permisos en UI (HU-3.3)**: `puedeMoverTarea` espejo del backend (que sigue siendo la autoridad); gerente en unidad ajena ve banner "Solo lectura" y tarjetas no arrastrables.
- **Presencia (HU-6.1)**: barra con avatares de conectados, actualizada por `presencia:actualizada`.
- Build verificado: `npm run build` limpio, 0 vulnerabilidades npm, bundle ~90KB gzip.

### Decisiones de Fase 3

8. **React 18.3 (no 19)**: `echarts-for-react` aún declara peers hasta 18; evita `--legacy-peer-deps` en Fase 4.
9. **fetch, no axios**: el spec permitía ambos; una dependencia menos.
10. **echarts/echarts-for-react NO instalados aún**: se agregan en Fase 4 para resolver sus peers de una vez.
11. Colores de categoría: paleta fija de 6 tonos apagados en `src/lib/kanban.ts`, asignados por `ordenPrioridad`.

### Rediseño visual v1.1 (post-Fase 3, referencia ebus-test)

El usuario aportó su app https://ebus-test.vercel.app como referencia de diseño. Evaluación tecnología por tecnología (decisión persistente — no re-evaluar sin motivo):

| Tecnología de ebus | ¿Se adopta? | Cómo/por qué |
|---|---|---|
| Sistema de tokens en 2 capas + dark mode | ✅ | Portado a CSS puro en `tokens.css` (`:root` claro + `[data-theme="oscuro"]`). Es la pieza clave y no necesita Tailwind. |
| Receta de acabado (tabular-nums, ::selection, scrollbars, focus-visible) | ✅ | En `base.css`, global. |
| 4 keyframes + curva única `cubic-bezier(0.16,1,0.3,1)` | ✅ | Adaptados: pulso-crítico (vencidas/rojo), pulso-vivo (presencia), entrada en cascada, brillo skeleton. |
| Primitiva única `.card` + hover lift | ✅ | En `base.css`; kanban con su propio radio 6px. |
| Anti-parpadeo de tema (script inline + localStorage) | ✅ | En `index.html`, clave `matriz.tema`, sync entre pestañas. |
| lucide-react | ✅ | Instalado; DESIGN.md ya nombraba Lucide. |
| General Sans (Fontshare, gratis) | ✅ | Nuevo cuerpo; Space Grotesk se queda en títulos (par propio = menos genérico que la referencia). |
| motion (lib) | ⏳ Fase 4 | Solo para counter-up de KPIs y overlays, como en la receta original ("Motion solo 6 archivos"). |
| Tailwind v4 | ❌ | Documento Maestro manda CSS3 + DESIGN.md. Se adoptó su ARQUITECTURA de tokens, no la herramienta. |
| Next.js / Vercel | ❌ | El profesor exige backend Express+Socket.io propio y despliegue VPS+Docker. Vite se queda. |
| Recharts | ❌ | ECharts es mandatorio (heatmap matrix, gauges y radar nativos). |

Además: metáfora central propia (ebus tiene el electrocardiograma; nosotros el **semáforo**, con marca ●▲■), sidebar colapsable 240↔64px (CSS width transition, sin JS de animación), tema oscuro completo, login rediseñado. DESIGN.md subido a v1.1 con todo esto como norma.

### Pendiente dentro de Fase 3 (detectado al cerrar)

- **Formulario "Nueva tarea" en la UI** (parte de HU-3.2; el endpoint POST /tareas ya existe y está probado). Requiere además un `GET /usuarios` en el backend para elegir responsable (hoy no existe ese endpoint). → Primera tarea al retomar (antes o durante Fase 4).
- Editar/eliminar tarea desde la UI (modal de detalle) — mismo bloque de trabajo que el punto anterior.

## Cabos sueltos conocidos (no bloqueantes)

- `npm audit`: 3 vulnerabilidades high en `deepmerge-ts` vía el **CLI de Prisma** (devDependency, no llega a producción). Se resuelve solo cuando Prisma actualice; no forzar `audit fix --force` (haría downgrade).
- Warning de Prisma: `package.json#prisma` deprecado → migrar a `prisma.config.ts` cuando se toque Prisma de nuevo.
- Seed: los 3 totales de cumplimiento dan 73% (amarillo) porque rota los mismos avances; los colores por categoría sí varían. Si se quiere demo más vistosa, variar avances en `prisma/seed.ts`.
- El servidor dev suele quedar corriendo en background de la sesión de Claude (`tsx watch`); si el puerto 4000 está ocupado al levantar, ya hay una instancia viva.

## Requerimientos reales de la reunión con el cliente

**[anotaciones-clase.md](anotaciones-clase.md)** es la **biblia de requerimientos**: procesa apuntes + la transcripción completa (1h41m) de la reunión con etiquetas [CONFIRMADO]/[HIPÓTESIS]/[AMBIGUO]. **Leerlo antes de tocar el modelo o el cálculo.** Lo esencial:
- 🔓 **El "Objetivo al día" YA NO ESTÁ BLOQUEADO**: `dias_efectivos = 90 − licencia − vacaciones − compensatorios − emergencia`; `objetivo_al_dia = dias_transcurridos / dias_efectivos × 100`. La meta se prorratea por días trabajados.
- ✅ **Correcciones del 26-08-2026 (aplicadas y con smoke test 13/13)**: vista `cumplimiento_v2` con umbrales del cliente (verde ≥100 / naranjo 60-99 / rojo <60 sobre el avance relativo al objetivo del día, tope 150% por ítem); libros privados por delegación (`services/alcance.ts`, `puedeVerLibro`) con semáforo consolidado visible por todos; seed con las 6 delegaciones y pilares reales; membresía con `unidadTerritorialId` y `cargo`. Login demo: `javier.godoy@demo.cl`, `jf.labra@demo.cl`, `delegado.centro@demo.cl`, `territorial1.centro@demo.cl` (todos `matriz123`).
- 🆕 **La medición es por persona** (cargo → funciones → metas), y **nada suma hasta que el supervisor valida** poniendo el punto tras revisar la foto verificadora.
- Cifras confirmadas: reclamo −20%, felicitación +10% (máx. 1/mes), emergencia = meta con ponderador 5%, mínimo esperado 80%.
- Product Owners = los profesores; los requerimientos se canalizan por ellos.

## Pendientes bloqueados por terceros

(Detalle en [restricciones-y-pendientes.md](restricciones-y-pendientes.md))

1. **Planner**: sin acceso al plan de Origami SpA todavía → ejecutar `scripts/crear-backlog-planner.ps1` cuando llegue.
2. **Columnas de asistencia** (licencia, vacaciones, compensatorios, días totales, "objetivo al día"): sin definición de profesores. **CRÍTICO: no inventar el cálculo**; la tabla del semáforo mostrará esas columnas como "pendiente de definición".
3. **Matriz de roles definitiva**: hoy rige la del Documento Maestro §4; ajustes solo tocarán `src/middleware/roles.ts` y los checks de alcance en controladores.

## Restricción permanente

**Costo cero**: solo herramientas gratuitas (Google Fonts, GitHub free, ghcr.io). Único gasto autorizado al final: una VPS (AWS/Hostinger) si es imprescindible para la entrega.
