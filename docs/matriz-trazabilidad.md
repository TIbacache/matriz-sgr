# Matriz de trazabilidad — SGR

**Exigida por el PDF (§15.1)**: *"Cada equipo deberá mantener una matriz con: HU, requisito relacionado, tarea o commit, caso de prueba, resultado, responsable y enlace a la evidencia. **Una historia no se considera terminada si no puede demostrarse su trazabilidad.**"*

**Actualizada**: 1 de septiembre de 2026 (Bloque B2 — pantalla de configuración de metas) · **Se actualiza en cada cierre de sprint.**

Estado: ✅ terminada y demostrable · 🟡 implementada sin prueba automatizada · ⬜ no iniciada

---

## 1. Épicas oficiales → estado

| Épica | Historias | ✅ | 🟡 | ⬜ |
|---|---|---|---|---|
| EP-01 Registro y gestión de actividades | HU-01…04 | 2 | 1 | 1 |
| EP-02 Medición y desempeño | HU-05…08 | 2 | 2 | 0 |
| EP-03 Evidencias y verificación | HU-09…11 | 3 | 0 | 0 |
| EP-04 Agenda colectiva y compromisos | HU-12…15 | 1 | 3 | 0 |
| EP-05 Monitoreo y control de gestión | HU-16…19 | 2 | 1 | 1 |
| EP-06 Reportabilidad | HU-20…22 | 0 | 1 | 2 |
| EP-07 Plataforma colaborativa | HU-23…25 | 1 | 1 | 1 |
| EP-08 Administración, seguridad y trazabilidad | HU-26…31 | 3 | 2 | 1 |
| **Total** | **31** | **14** | **11** | **6** |

Salto del Bloque A (commit `b1f3e75`): **EP-03 queda completa** y EP-01 pasa de 0 a 2 historias demostrables. Lo que falta de EP-01 son pantallas y el registro de servicios (HU-03), no la API.

Salto del Bloque A2 (commit `de68901`): **HU-05 queda demostrable** — las metas y ponderadores por funcionario ya se configuran por API, con RN-001 verificada en sus dos formas (no superar el 100% al cargar de a una; cuadrar exacto al cargar el conjunto).

Salto del Bloque B2: **HU-05 queda completa con su pantalla** (`/metas`), y con ella el ciclo configurar → registrar → validar → medir se recorre entero por interfaz. Aparecen dos verificaciones de un tipo nuevo: las que prueban **el contrato con los seis roles** en vez de un solo camino feliz. La segunda destapó un fallo real antes de que llegara a la vista.

---

## 2. Matriz detallada

Los commits se identifican por su hash corto en `TIbacache/matriz-sgr`. Las pruebas `smoke-N` corresponden a `backend/scripts/smoke-realtime.mjs` (`npm run smoke`); las `api:"…"` son verificaciones nombradas de `backend/scripts/verificar-api-v2.ts` (`npm run verificar:api`) y las `calculo-N` de `verificar-cumplimiento.ts`.

| HU oficial | Requisitos | Nuestra HU | Implementación (commit) | Prueba | Resultado | Resp. | Estado |
|---|---|---|---|---|---|---|---|
| HU-01 Registro de actividades | RF-009, RF-010, RF-014, RF-022 | — | `b1f3e75` `backend/src/routes/actividades.routes.ts` · **pantalla** `frontend/src/components/ficha/FilaNuevaActividad.tsx` | api:"RF-009 registrar actividad", "no se puede sumar a un ítem de otro cargo", "fecha fuera del período", "RUT inválido", "teléfono inválido" | PASS (5/5) | A | ✅ |
| HU-02 Registro de compromisos ciudadanos | RF-016…021 | HU-3.2 | `91e8fcb` `b5e7eff` `backend/src/routes/tareas.routes.ts` · `frontend/src/components/NuevaTareaModal.tsx` | smoke-16, smoke-17 | PASS | A | 🟡 falta solicitante/territorio/INT-EXT |
| HU-03 Registro de servicios entregados | RF-004, RF-015 | — | — | — | — | B | ⬜ |
| HU-04 Administración de funciones por cargo | RF-003, RF-006, RF-007 | — | `b1f3e75` `backend/src/routes/cargos.routes.ts` (`/cargos` y `/items`) · `de68901` `metas-item.routes.ts` | api:"RF-003 GET /cargos con sus ítems", "crear cargo", "duplicado rechazado", "ADR-009 tipo y dirección", "se desactivan, no se borran", "no se fija meta de un ítem que no es del cargo del funcionario" | PASS (6/6) | A | ✅ falta la pantalla de configuración |
| HU-05 Definición de metas | RF-005…007, RN-001, RN-002 | HU-4.1 | `91e8fcb` `metas.routes.ts` (v1, por unidad) + `b1f3e75` períodos + **`de68901` `backend/src/routes/metas-item.routes.ts`** (meta y ponderador por funcionario) | api:"RF-007 se configura la meta y el ponderador de un funcionario por ítem y período", "RN-002 una meta de 0 se rechaza", "RN-001 los ponderadores no pueden superar el 100%", "RN-001 mientras no llegue al 100% la respuesta lo dice", "RN-001 la carga en lote exige el 100% exacto: 50% se rechaza", "RN-001 la carga en lote deja al funcionario cuadrado en 100%", "RF-007 no se duplica la meta de un mismo ítem, funcionario y período", "RF-007 una meta sin avance validado se puede quitar y la suma se recalcula", "RN-009/CA-01 no se borra la meta de un ítem que ya acumuló avance aprobado", "RN-013/RF-007 un período cerrado no admite cambios de metas", "RNF-005 un funcionario no configura sus propias metas", "Regla 9 las metas de otra delegación no se leen (404)", "RF-008 el funcionario sí ve lo que se le mide, con la suma y cuánto falta", "CA-08/ADR-005 editar una meta con versión vieja → 409", "Multi-tenant: período inexistente → 404", "CA-08 la carga en lote sin las versiones vigentes → 409", "CA-08 la carga en lote con una versión vieja → 409 y no aplica nada", "HU-05 los seis roles cargan la pantalla de metas sin error", "RNF-005 los otros cuatro roles reciben 403 al configurar", "Regla 9 lo que el selector ofrece a cada rol es lo que ese rol puede consultar", "HU-05 lo que se configura en la pantalla es exactamente lo que el motor mide" | PASS (20/20) | A | ✅ API y **pantalla** `frontend/src/pages/MetasPage.tsx` (`b2`); falta prueba de componente (Bloque D) |
| HU-06 Seguimiento de avance | RF-008, RF-022, RF-023, RF-028 | HU-4.3 | `b1f3e75` `GET /cumplimiento/:periodoId?funcionario=` · **ficha personal** `frontend/src/pages/FichaPage.tsx` | api:"RF-022 el cálculo por funcionario se expone por API", "RF-008 la ficha de una persona trae sus ítems, metas y semáforo", "el registro personal se lee paginado", "las anuladas se ven solo si se piden" | PASS (4/4 sobre el contrato que consume) | A | 🟡 pantalla construida; falta prueba de componente (Bloque D) |
| HU-07 Cálculo automático de cumplimiento | RF-023…026 | HU-4.2 | `8de89a5` migración `vista_cumplimiento_v2` | smoke-7 | PASS (`objetivo=62 relativo=161.4`) | A | ✅ |
| HU-08 Desempeño organizacional | RF-029, RF-031 | HU-5.1, HU-5.3 | `b5e7eff` `frontend/src/pages/DashboardPage.tsx` | verificación visual | OK | A | 🟡 falta vista por cargos |
| HU-09 Evidencia fotográfica | RF-012, RNF-017 | — | `b1f3e75` `POST /actividades/:id/evidencias` + `services/almacenamiento.ts` · **subida y galería** `components/ficha/TablaActividades.tsx`, `VistaEvidencia.tsx` | api:"RF-012 subir evidencia asociada al código", "formato no permitido (415)", "tamaño máximo (413)", "la ruta la deriva el servidor", "descarga por endpoint controlado", "RF-004 los formatos salen del catálogo" | PASS (6/6) | B | ✅ antivirus declarado fuera de alcance |
| HU-10 Códigos verificadores | RF-011 | — | `91f1917` `services/codigos.ts` + trigger · `b1f3e75` uso en el alta | api:"RF-011 código no ambiguo" (`TOO-20260715-0004`), "el correlativo avanza"; calculo-19, calculo-20 | PASS | B | ✅ |
| HU-11 Validación de actividades | RF-013, RF-014, RF-036 | — | `b1f3e75` `backend/src/routes/evidencias.routes.ts` · **bandeja** `frontend/src/pages/BandejaPage.tsx` | api:"la evidencia entra a la bandeja", "rechazar exige observación", "tres decisiones", "no valida su propia evidencia", "el punto se suma solo tras la aprobación", "una aprobada no se re-decide", "la bandeja entrega lo que la pantalla necesita", "lo aprobado sale de la cola", "permite revisar lo ya decidido", "una anulada desaparece", "filtra por delegación" | PASS (11/11) | A | ✅ falta prueba de componente (Bloque D) |
| HU-12 Agenda compartida | RF-016, RF-017 | HU-3.1 | `91e8fcb` `3eeb705` kanban dnd-kit + Socket.io | smoke-12, smoke-13 | PASS | A | ✅ |
| HU-13 Actualización de estados | RF-018, RF-036 | HU-3.1 | `tareas.routes.ts` PATCH | smoke-12 | PASS | A | 🟡 falta historial de transición |
| HU-14 Seguimiento de compromisos | RF-019, RF-021, RF-037 | HU-5.1 | `b5e7eff` `GET /kpis/tubo`, vencidas | smoke-15 | PASS (`vencidas=2`) | A | 🟡 faltan "próximo a vencer" y alertas |
| HU-15 Continuidad operativa | RF-017, RF-036 | — | Lectura del tubo por delegación | smoke-2 | PASS | B | 🟡 falta reasignación con motivo |
| HU-16 Semáforo de cumplimiento | RF-026, RF-027 | HU-4.2, HU-5.1 | `8de89a5` vista v2 + `b5e7eff` GaugeGrid | smoke-6, smoke-7 | PASS (verde/naranjo/rojo) | A | ✅ |
| HU-17 Comparación esperado vs real | RF-023, RF-026, RF-027 | HU-5.1 | `b5e7eff` `avance_relativo` + ProyeccionChart | smoke-7 | PASS | A | ✅ |
| HU-18 Resumen ejecutivo | RF-028, RF-029, RF-031 | HU-5.1…5.3 | `b5e7eff` DashboardPage completo | visual | OK | A | 🟡 falta tablero personal |
| HU-19 Control de actividad de usuarios | RF-030, RF-037 | — | — | — | — | B | ⬜ |
| HU-20 Generación de informes | RF-032, RF-033 | — | Filtros del dashboard | — | — | B | 🟡 falta exportación |
| HU-21 Funcionarios rezagados | RF-027, RF-029, RF-037 | HU-5.3 | Tabla ordenable + línea "Ojo 80%" | visual | OK | B | ⬜ sin alerta |
| HU-22 Brechas de productividad | RF-031, RF-038 | — | — | — | — | B | ⬜ |
| HU-23 Trabajo colaborativo en línea | RF-034, RNF-003 | HU-3.1, HU-6.1 | `91e8fcb` Socket.io rooms + presencia · `b1f3e75` `services/concurrencia.ts` | smoke-10, smoke-13; api:"CA-08 edición con versión vieja → 409", "PATCH de actividad con versión errada → 409" | PASS | A | ✅ en el modelo v2; las rutas v1 aún no comparan `version` |
| HU-24 Comunicación entre delegaciones | RF-035 | — | — | — | — | B | ⬜ |
| HU-25 Adaptación continua | RF-038 | HU-2.2 | CRUD de categorías | — | — | A | 🟡 sin versionado |
| HU-26 Administración de delegaciones, usuarios y roles | RF-001, RF-002, RNF-004, RNF-005 | HU-1.1, HU-1.2, HU-2.1, HU-3.3 | `91e8fcb` auth + `8de89a5` alcance.ts | smoke-1…5, smoke-8, smoke-11 | PASS | A | ✅ |
| HU-27 Administración de catálogos | RF-004 | HU-2.2 | `categorias.routes.ts` · `GET /catalogos` (lectura, alimenta los formularios) | api:"RF-004 los formatos de evidencia salen del catálogo", "el catálogo coincide con lo que el servidor acepta" | PASS (2/2) | A | 🟡 solo lectura: falta el CRUD y la desactivación desde la UI |
| HU-28 Administración de períodos | RF-005, RN-013 | — | `b1f3e75` `backend/src/routes/periodos.routes.ts` | api:"días calculados desde las fechas", "solapados rechazados", "cierre", "un período cerrado no se modifica", "la reapertura exige autorización y motivo", "el motivo queda en la bitácora" | PASS (8/8) | A | ✅ falta la pantalla |
| HU-29 Búsqueda y filtros | RF-032 | HU-5.2 | Filtros del dashboard | visual | OK | B | 🟡 |
| HU-30 Auditoría de cambios | RF-036, RNF-008 | — | `91f1917` tabla + triggers · `b1f3e75` `auditarDesde()` en cada write crítico del modelo v2 · `de68901` corrección de los valores `Decimal` que se perdían en silencio | api:"el ciclo del período queda auditado con valor anterior y nuevo", "la validación queda auditada con usuario", "configurar metas queda auditado (crear, actualizar y eliminar)", "los importes Decimal quedan legibles en la bitácora (regresión)" | PASS (4/4) | A | ✅ falta auditar las rutas v1 y la pantalla de consulta |
| HU-31 Alertas operativas | RF-037 | — | — | — | — | B | ⬜ |

---

## 2.1 Modelo v2 — base implementada (commit `91f1917`, 01-09-2026)

El modelo de datos de las historias pendientes ya existe y está verificado; falta la capa de API y las pantallas. Estado de los cimientos:

| Requisito | Base implementada | Verificación | Falta |
|---|---|---|---|
| RF-003 Cargos e ítems | `Cargo`, `ItemMedicion` con `tipo` y `direccion` + **API `b1f3e75`** | calculo-3, calculo-4; api (5 checks) | pantalla |
| RF-005 Períodos | `Periodo` con fechas y días calculados + **API con cierre y reapertura `b1f3e75`** | calculo-13; api (8 checks) | pantalla |
| RF-007 Metas por funcionario | `MetaItem` | calculo-15 (RN-001: ponderadores suman 100%) | **API y pantalla** |
| RF-009/011 Actividades y código | `Actividad` + `services/codigos.ts` + **API `b1f3e75`** | calculo-19, calculo-20; api (11 checks) | pantalla |
| RF-012/013/014 Evidencias y validación | `Evidencia`, `Validacion` + **API `b1f3e75`** | calculo-17; api (11 checks) | bandeja en pantalla; antivirus fuera de alcance (declarado) |
| RF-024/026/027 Cálculo y semáforo | `services/cumplimiento.ts` + **`GET /cumplimiento/:periodoId`** | calculo-1 a 10, 16; api (4 checks) | migrar el dashboard del cálculo v1 al v2 (Bloque C) |
| RF-025 Ajustes | `Ajuste` + parámetros | calculo-11, calculo-12 | API y pantalla |
| RF-036 / RNF-008 Auditoría | `Auditoria` + triggers + **`auditarDesde()` en los controladores v2** | api (2 checks: ciclo del período y validación) | auditar las rutas v1; pantalla de consulta |
| RF-038 Parámetros | `Parametro` con vigencia | calculo-11; api ("devuelve los parámetros y marca los no confirmados") | pantalla de configuración |
| ADR-008 Trazabilidad del vecino | `PersonaUsuaria` con RUT único + **alerta al registrar** | calculo-21; api ("se detecta a la misma persona en otra delegación", "no se duplicó la ficha") | ficha con historial cruzado |

## 3. Verificaciones automatizadas vigentes

**108 comprobaciones, todas en verde** al 01-09-2026 (38 previas + 70 de la API v2, que incluyen las del contrato de la ficha personal y de la bandeja del verificador).

### `npm run verificar:calculo` — 21/21

Pruebas unitarias de las fórmulas (lo que el PDF §14.3 exige como cobertura mínima) más comprobaciones de integración sobre datos sembrados:

| # | Verificación | Cubre |
|---|---|---|
| 1 | Cumplimiento = avance/meta | RN-004 |
| 2 | Tope configurable recorta 206% a 150% | RN-005 |
| 3-4 | Ítem inverso: penaliza exceso (11 sobre meta 10 → 90,9%) y premia estar bajo | ADR-009, RN-002 |
| 5 | Meta cero no divide por cero | RN-002 |
| 6-8 | Los tres colores del semáforo | RN-008 |
| 9-10 | **Casos reales de la planilla**: 98 vs 50,55 → verde · 15,5 vs 39,56 → rojo | RN-008 |
| 11-12 | Parámetros leídos de base y marcados los no confirmados | RF-038, ADR-007 |
| 13 | Días del período calculados desde las fechas | RF-005 |
| 14 | El cálculo produce resultados por funcionario | RF-022 |
| 15 | Ponderadores suman 100% por funcionario | RN-001 |
| 16 | Las ausencias producen objetivo al día distinto por persona | RN-007 |
| 17 | Solo las actividades con validación aprobada suman | RN-009, RF-014 |
| 18 | El semáforo produce más de un color con datos reales | RF-027 |
| 19-20 | 1.126 códigos únicos con formato no ambiguo | RF-011, RN-010 |
| 21 | Un vecino es rastreable entre delegaciones | ADR-008, CA-04 |

### `npm run verificar:rut` — 16 RUT + casos de normalización

Valida los RUT ficticios del seed con módulo 11 y comprueba que se normalicen `17.721.947-9` y `17,721,947-9` (el formato de Google Sheets) y se rechacen un DV incorrecto y el dato sucio `216944` que aparece en la planilla real. Cubre RF-010 y ADR-001.

### `npm run smoke` — 17/17

| # | Verificación | Cubre |
|---|---|---|
| 1 | Handshake de socket sin token rechazado | RNF-004, HU-26 |
| 2 | Funcionaria ve el libro de su delegación | RNF-005, CA-07 |
| 3 | Funcionaria NO ve el libro de otra delegación | CA-07, HU-26 |
| 4 | `GET /tareas` de otra delegación → 404 | CA-07 |
| 5 | Funcionaria sí ve el semáforo consolidado | RF-029 |
| 6 | El semáforo produce verde, naranjo y rojo | RN-008, HU-16 |
| 7 | La vista expone `objetivo_al_dia` y `avance_relativo` | RN-007, RF-026, HU-17 |
| 8 | Usuario no puede mover tarea ajena (403) | RNF-005, CA-07 |
| 9-11 | Join al room propio OK; a otra delegación rechazado | RF-034, CA-07 |
| 10 | Presencia en vivo | HU-23 |
| 12-13 | Mover tarea propia y su evento en tiempo real | RF-018, HU-12, HU-13 |
| 14 | `GET /usuarios` con cargos | RF-002 |
| 15 | `GET /kpis/tubo` agregado con vencidas | RF-019, RF-021 |
| 16-17 | Crear tarea y su evento | RF-016, HU-02 |

### `npm run verificar:api` — 70/70 (Bloques A y B)

Integración de extremo a extremo sobre el servidor corriendo, con las seis cuentas demo. Crea un período, un cargo, ítems, actividades, una evidencia y sus validaciones, y **limpia todo al terminar**.

| Bloque | Comprobaciones | Cubre |
|---|---|---|
| Períodos (12) | días calculados desde las fechas (90 para 1/1–31/3/2027), solapamiento rechazado, funcionario sin permiso, **409 por versión vieja**, cierre, cerrado no editable, reapertura solo de admin y con motivo, ciclo completo auditado, motivo en la bitácora, lectura por rol consulta | RF-005, RF-010, RN-013, CA-08, CA-09, CA-10, RNF-005, RNF-008 |
| Cargos e ítems (6) | cargos con sus ítems, alta, duplicado rechazado, ítem con `tipo`+`direccion`, desactivación con incremento de versión, funcionario sin permiso | RF-003, RF-006, ADR-009, RNF-005 |
| Actividades (16) | alta, código no ambiguo, delegación derivada de la membresía, correlativo, ítem de otro cargo rechazado, fecha fuera del período, RUT sucio (`216944`) y teléfono inválidos, RUT normalizado, **alerta de la misma persona en otra delegación**, ficha no duplicada, 409 por versión, corrección previa a validar, verificador y consulta sin permiso de registro, libro ajeno → 404 | RF-009, RF-010, RF-011, RN-010, ADR-001, ADR-008, CA-04, CA-07, CA-08 |
| Evidencias (5) | formato fuera del catálogo → 415, tamaño sobre el parámetro → 413, ruta derivada del código, nombre `../../etc/passwd.jpg` saneado, descarga por endpoint controlado | RF-012, RNF-017 |
| Validación (11) | nadie valida lo propio, consulta no valida, rechazo sin observación → 400, corrección solicitada, aprobación, **el punto suma solo al aprobar y una sola vez**, aprobada no se re-decide, validada no se edita, anulación con motivo, lo anulado deja de sumar, validación auditada | RF-013, RF-014, RN-003, RN-009, CA-01, CA-02, CA-09, RNF-005, ADR-006 |
| Cumplimiento (5) | cálculo por funcionario expuesto, días del período, parámetros con marca `confirmado`, semáforo visible por el rol consulta, tenant ajeno → 404 | RF-022…RF-027, RF-038, ADR-007 |
| Contrato de la ficha personal (5) | los formatos salen del catálogo y coinciden con lo que aplica el 415, registro paginado por período y funcionario, las anuladas solo si se piden, la ficha de una persona trae ítems, metas y semáforo | RF-004, RF-008, HU-06 |
| Contrato de la bandeja (7) | la cola entrega código, funcionario y delegación en cada fila; **lo recién subido es alcanzable en la primera página con `orden=recientes`**; **la cola pagina sin repetir**; lo aprobado sale de pendientes; lo decidido se revisa con lo más reciente primero; una actividad anulada desaparece; filtra por delegación | RF-013, RF-014, RF-032, RN-003, HU-11 |

Las dos comprobaciones en negrita son **regresiones**: nacieron de un error real encontrado probando el ciclo completo (una evidencia recién subida caía en la posición 87 de la cola y no se veía en pantalla).

⚠ **Brecha de pruebas que queda**: las 108 comprobaciones cubren fórmulas, validadores, integración, concurrencia, auditoría y seguridad de acceso, pero **no están en un marco formal** (Jest / RTL) ni corren en CI, y faltan las de componentes del frontend y las de usabilidad. El PDF §14.3 exige las cinco categorías. Sigue siendo un riesgo de la entrega, aunque bastante menor que antes.

---

## 4. Cómo se mantiene

1. Cada commit que implemente una historia la **referencia en el mensaje** (`HU-16`, `RF-027`).
2. Al cerrar sprint se actualiza este archivo: commit, prueba y resultado.
3. Una historia pasa a ✅ **solo** cuando existe prueba automatizada que la verifica.
4. Las evidencias de prueba se guardan en `docs/evidencias/` (por crear en Fase 5).
