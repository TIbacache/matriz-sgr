# Estado del proyecto — Matriz SGR

**Actualizado**: 25 de agosto de 2026 (fin de Fase 3)
Este documento es la fuente de verdad del avance. Se actualiza al cerrar cada fase.

## Resumen por fases

| Fase | Estado | Contenido |
|---|---|---|
| 1. Documentación y diseño | ✅ Completa | DESIGN.md, diagramas, historias, backlog Planner |
| 2. Backend y configuración | ✅ Completa | API + Socket.io + Prisma + Postgres Docker |
| 3. Frontend | ✅ Completa | Vite + React + TS, auth, kanban dnd-kit, presencia, formulario Nueva tarea |
| 4. BI y Dashboards | ✅ Completa | ECharts modular: gauges, heatmap semántico, dumbbell de proyección, radar énfasis, tubo apilado, tabla WCAG + KPI tiles con counter-up |
| 5. Despliegue | ⬜ Pendiente | CI/CD GitHub Actions, VPS, Caddy, backups + tests formales (Jest/RTL) |

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

## Fase 4 — qué quedó funcionando (26-08-2026)

**Dashboard BI interactivo** en `/dashboard`, construido con el método de la skill dataviz (cada forma elegida por el trabajo que hace, colores validados por script, nunca a ojo):

- **Fila única de filtros** (trimestre + delegación + recalcular para admin/supervisor) que alcanza todo lo de abajo; el refetch conserva el marco a opacidad reducida (sin parpadeo de skeleton).
- **Cross-filtering**: click en un gauge, celda del heatmap, barra del tubo o fila de la tabla selecciona la delegación y filtra/resalta todo el tablero.
- **KPI row** (4 stat tiles con counter-up de `motion`, en cascada, apagado con `prefers-reduced-motion`): avance relativo, delegaciones en verde, proyección al cierre, tareas vencidas. Cifras display en proporcionales (tabular-nums solo en la tabla).
- **Gauges por delegación** (mandato del doc maestro): avance relativo sobre bandas fijas del semáforo.
- **Heatmap delegación × pilar** con escala semántica DISCRETA del semáforo (visualMap piecewise = el modelo mental del cliente), valor rotulado en celda, gap de 2px de superficie.
- **Dumbbell de proyección** "hoy → cierre a ritmo actual" (un tono, dos intensidades, rampa `--tubo-*` validada `--ordinal` en ambos temas) con referencias en Meta 100% y Ojo 80%.
- **Radar en énfasis**: delegación seleccionada (acento) vs promedio org (gris) — nunca 6 series.
- **Tubo apilado** por delegación con rampa ordinal (estados = etapas ordenadas, no categorías) y vencidas en tooltip.
- **Tabla detalle ordenable** = la "table view" WCAG: todo valor legible sin hover, chips ●▲■ + texto con tokens `--estado-*-texto` (4.5:1 validado). Nota visible: columnas de asistencia pendientes de la definición del cliente.
- ECharts **modular** + `DashboardPage` con carga perezosa: app base 94KB gzip, chunk del dashboard 251KB solo al entrar. Todos los gráficos leen los tokens vivos (`useTokens` + MutationObserver): cambian con el tema sin recargar.

**Formulario "Nueva tarea"** (cierra HU-3.2): modal desde el tubo (admin/supervisor/gerente en su delegación), responsable elegido del directorio `GET /usuarios?unidad=` (nuevo endpoint con cargo), sincronizado por socket. **Deliberadamente NO se construyó la ficha completa de solicitud de vecino** (RUT, categoría/subcategoría, canal): espera la parametrización de columnas del cliente — regla de no inventar contenedores.

Backend nuevo: `GET /usuarios` (directorio con cargos), `GET /kpis/tubo` (conteos agregados por estado + vencidas; público como el semáforo, sin detalle del libro). Smoke test ampliado a **17 checks, 17/17 PASS**.

Tokens nuevos en `tokens.css`: `--estado-*-texto` (contraste 4.5:1 para texto pequeño) y rampa `--tubo-1/2/3` (ordinal petróleo, validada en claro y oscuro).

## Cabos sueltos conocidos (no bloqueantes)

- `npm audit`: 3 vulnerabilidades high en `deepmerge-ts` vía el **CLI de Prisma** (devDependency, no llega a producción). Se resuelve solo cuando Prisma actualice; no forzar `audit fix --force` (haría downgrade).
- Warning de Prisma: `package.json#prisma` deprecado → migrar a `prisma.config.ts` cuando se toque Prisma de nuevo.
- Seed: los 3 totales de cumplimiento dan 73% (amarillo) porque rota los mismos avances; los colores por categoría sí varían. Si se quiere demo más vistosa, variar avances en `prisma/seed.ts`.
- El servidor dev suele quedar corriendo en background de la sesión de Claude (`tsx watch`); si el puerto 4000 está ocupado al levantar, ya hay una instancia viva.

## ⚠ CAMBIO DE LÍNEA BASE — 31 de agosto de 2026

Los profesores entregaron la **especificación formal** (`Guia_Proyecto_Software_SGR_Alumnos.pdf`, 30 páginas) y la **presentación del cliente** (20 diapositivas con capturas de la planilla real). Esto **redefine el alcance**:

- **[docs/requerimientos-oficiales.md](requerimientos-oficiales.md) pasa a ser LA especificación**: 38 RF, 18 RNF, 13 reglas de negocio, 10 criterios de aceptación y **31 historias oficiales** (nuestras 20 quedan subordinadas). Cumplimiento actual: **5 ✅ · 13 🟡 · 20 ⬜** de los RF.
- **[docs/estructura-planilla-real.md](estructura-planilla-real.md)**: las capturas del PPT contenían la **parametrización de columnas** que llevábamos semanas esperando. Ya no hay que pedírsela al cliente.
- **La unidad de medición es el FUNCIONARIO**, no la delegación: cargo → ítems → metas por persona. Nuestro modelo mide por unidad × categoría → **falta todo el nivel funcionario**.
- **RN-008 confirmado con datos reales**: verde ≥ objetivo al día · ámbar ≥ 60% del objetivo · rojo < 60%. Nuestra implementación es correcta ✔
- **Brecha mayor**: el eje **actividad → código → evidencia → validación → puntaje** (EP-01 y EP-03 completas) no existe todavía, y es el corazón del sistema.
- **[docs/decisiones-tecnicas.md](decisiones-tecnicas.md)**: 9 ADR nuevos (RUT, fechas, nombres, códigos, concurrencia, auditoría, parámetros, trazabilidad de personas, tipo/dirección de ítems).
- **[docs/matriz-trazabilidad.md](matriz-trazabilidad.md)**: exigida por el PDF. *"Una historia no se considera terminada si no puede demostrarse su trazabilidad."*

## Modelo de datos v2 — implementado (1 de septiembre de 2026)

Migración `20260901120000_modelo_v2_especificacion_oficial`: **16 entidades nuevas** que cubren la brecha estructural de la especificación oficial.

| Entidad | Cubre |
|---|---|
| `Periodo` | RF-005 · fechas configurables, días calculados, cierre auditado |
| `Parametro` | RF-038 · RNF-015 · ADR-007 · valores de negocio fuera del código, con vigencia por período |
| `Cargo` + `ItemMedicion` | RF-003 · la abstracción cargo → ítems → metas, con `tipo` y `direccion` (ADR-009) |
| `MetaItem` | RF-007 · meta y ponderador por **funcionario**, ítem y período |
| `Actividad` | RF-009 · RF-011 · el registro diario, con código único e inmutable |
| `Evidencia` + `Validacion` | RF-012 · RF-013 · RF-014 · RN-009 · solo lo aprobado suma |
| `PersonaUsuaria` | ADR-008 · RUT único por organización → trazabilidad entre delegaciones |
| `AtencionSocial` | RF-015 · RN-012 · las tres gestiones del área social |
| `Ausencia` | días descontados del objetivo al día, por persona |
| `Ajuste` | RF-025 · felicitaciones y reclamos, con valores parametrizados |
| `CatalogoItem` | RF-004 · catálogos que se desactivan sin borrar historia |
| `TareaHistorial` | RF-018 · historial de transiciones con autor y observación |
| `Comentario` | RF-035 · observaciones contextuales |
| `Auditoria` | RNF-008 · RF-036 · **solo-inserción, garantizado por triggers** |

Además: `version` para bloqueo optimista (ADR-005) en toda tabla editable, roles `verificador` y `consulta` (PDF §3), y campos v2 en `Tarea` (INT/EXT, solicitante, territorio, área de apoyo, fuera de plazo).

**Garantías en la base, no solo en el código** (lo que Prisma no expresa, agregado por SQL en la migración):
- Triggers que rechazan `UPDATE` y `DELETE` sobre `auditoria` — verificado: la operación falla con el mensaje de RNF-008.
- Trigger que impide cambiar `actividades.codigo` (RF-011).
- `CHECK` de formato canónico de RUT en `users` y `personas_usuarias` — verificado: rechaza `17.721.947-9` con puntos.
- `CHECK` de fechas coherentes en `periodos` y de meta > 0 y ponderador en rango (RN-002).

**Utilidades nuevas**: `lib/rut.ts` (normalizar, validar módulo 11, formatear), `lib/fechas.ts` ("hoy" en zona de Chile, días del período), `lib/persona.ts` (ADR-003), `services/parametros.ts`, `services/auditoria.ts`, `services/codigos.ts`, `services/cumplimiento.ts` (motor de cálculo **por funcionario**).

**Seed reescrito con datos 100% ficticios** (cumple la prohibición del PDF): 6 delegaciones, 5 cargos con sus ítems reales y ponderadores que suman 100%, 8 catálogos, 13 personas, 3 vecinos, 16 tareas con historial y **1.126 actividades con evidencia y validación**. Se regenera lo transaccional en cada corrida; los datos maestros van con upsert.

**Verificación: 38 comprobaciones automatizadas, todas en verde.**
- `npm run smoke` → 17/17 (tiempo real, permisos, visibilidad)
- `npm run verificar:calculo` → 21/21 (fórmulas RN-004/005/008, ítem inverso, tope, parámetros, RN-001, RN-009, códigos únicos, trazabilidad del vecino)
- `npm run verificar:rut` → 16 RUT ficticios válidos + casos de normalización

Dos de esas comprobaciones detectaron errores reales durante el desarrollo (ponderadores que sumaban 0,95 y un vecino sin trazabilidad por datos obsoletos), que quedaron corregidos.

### Deuda técnica que abre este cambio

| Deuda | Origen | Prioridad |
|---|---|---|
| ~~Umbrales y tope fijos en SQL~~ → el **motor nuevo** (`services/cumplimiento.ts`) los lee de `parametro`. Falta migrar la vista materializada v1, que aún los tiene fijos y sigue alimentando el dashboard actual | RNF-015, RF-038 | Alta |
| ~~El período se deriva del string `2026-Q3`~~ → existe la tabla `Periodo`; falta que la **vista materializada y el dashboard** la usen en vez del string | RF-005, §13.1 | Alta |
| ~~Falta bloqueo optimista~~ → columna `version` creada; falta **aplicarla en los endpoints** (comparar y devolver 409) | RF-034, CA-08 | Alta |
| ~~Falta tabla `auditoria`~~ → creada y protegida por triggers; falta **llamarla desde los controladores** | RNF-008, RF-036 | Alta |
| ~~El seed usa nombres reales~~ → **resuelto**: seed 100% ficticio | §Condiciones del caso | ✅ |
| ~~Faltan roles Verificador y Usuario de consulta~~ → **resuelto**: en el enum y en el seed. Falta aplicarlos en `requireRol` | §3 Actores | Media |
| **Faltan las rutas API del modelo v2** (actividades, evidencias, validación, períodos, cargos, ítems, ajustes) y sus pantallas | EP-01, EP-03 | Alta |
| Sin pruebas unitarias (Jest) ni de componentes (RTL) | §14.3 | Alta |
| Falta alternativa por teclado en el drag & drop | RNF-012, DESIGN §8.1 | Media |

## Requerimientos reales de la reunión con el cliente

**[anotaciones-clase.md](anotaciones-clase.md)** es la **biblia de requerimientos**: procesa apuntes + la transcripción completa (1h41m) de la reunión con etiquetas [CONFIRMADO]/[HIPÓTESIS]/[AMBIGUO]. **Leerlo antes de tocar el modelo o el cálculo.** Lo esencial:
- 🔓 **El "Objetivo al día" YA NO ESTÁ BLOQUEADO**: `dias_efectivos = 90 − licencia − vacaciones − compensatorios − emergencia`; `objetivo_al_dia = dias_transcurridos / dias_efectivos × 100`. La meta se prorratea por días trabajados.
- ✅ **Correcciones del 26-08-2026 (aplicadas y con smoke test 13/13)**: vista `cumplimiento_v2` con umbrales del cliente (verde ≥100 / naranjo 60-99 / rojo <60 sobre el avance relativo al objetivo del día, tope 150% por ítem); libros privados por delegación (`services/alcance.ts`, `puedeVerLibro`) con semáforo consolidado visible por todos; seed con las 6 delegaciones y pilares reales; membresía con `unidadTerritorialId` y `cargo`. Login demo: `javier.godoy@demo.cl`, `jf.labra@demo.cl`, `delegado.centro@demo.cl`, `territorial1.centro@demo.cl` (todos `matriz123`).
- 🆕 **La medición es por persona** (cargo → funciones → metas), y **nada suma hasta que el supervisor valida** poniendo el punto tras revisar la foto verificadora.
- Cifras confirmadas: reclamo −20%, felicitación +10% (máx. 1/mes), emergencia = meta con ponderador 5%, mínimo esperado 80%.
- Product Owners = los profesores; los requerimientos se canalizan por ellos.

## Pendientes bloqueados por terceros

(Detalle en [restricciones-y-pendientes.md](restricciones-y-pendientes.md))

1. ~~**Planner**: sin acceso~~ **RESUELTO 26-08-2026**: plan `DesarrolloSW-MuniLS-OrigamiSpA` disponible con la plantilla del profesor. Plan de 58 tareas del ciclo de vida completo en [plan-desarrollo.md](plan-desarrollo.md), cargable con `scripts/cargar-plan-planner.ps1`.
2. **Columnas de asistencia** (licencia, vacaciones, compensatorios, días totales, "objetivo al día"): sin definición de profesores. **CRÍTICO: no inventar el cálculo**; la tabla del semáforo mostrará esas columnas como "pendiente de definición".
3. **Matriz de roles definitiva**: hoy rige la del Documento Maestro §4; ajustes solo tocarán `src/middleware/roles.ts` y los checks de alcance en controladores.

## Restricción permanente

**Costo cero**: solo herramientas gratuitas (Google Fonts, GitHub free, ghcr.io). Único gasto autorizado al final: una VPS (AWS/Hostinger) si es imprescindible para la entrega.
