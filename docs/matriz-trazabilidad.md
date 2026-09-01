# Matriz de trazabilidad — SGR

**Exigida por el PDF (§15.1)**: *"Cada equipo deberá mantener una matriz con: HU, requisito relacionado, tarea o commit, caso de prueba, resultado, responsable y enlace a la evidencia. **Una historia no se considera terminada si no puede demostrarse su trazabilidad.**"*

**Actualizada**: 31 de agosto de 2026 · **Se actualiza en cada cierre de sprint.**

Estado: ✅ terminada y demostrable · 🟡 implementada sin prueba automatizada · ⬜ no iniciada

---

## 1. Épicas oficiales → estado

| Épica | Historias | ✅ | 🟡 | ⬜ |
|---|---|---|---|---|
| EP-01 Registro y gestión de actividades | HU-01…04 | 0 | 1 | 3 |
| EP-02 Medición y desempeño | HU-05…08 | 1 | 2 | 1 |
| EP-03 Evidencias y verificación | HU-09…11 | 0 | 0 | 3 |
| EP-04 Agenda colectiva y compromisos | HU-12…15 | 1 | 2 | 1 |
| EP-05 Monitoreo y control de gestión | HU-16…19 | 2 | 1 | 1 |
| EP-06 Reportabilidad | HU-20…22 | 0 | 1 | 2 |
| EP-07 Plataforma colaborativa | HU-23…25 | 0 | 2 | 1 |
| EP-08 Administración, seguridad y trazabilidad | HU-26…31 | 1 | 1 | 4 |
| **Total** | **31** | **5** | **10** | **16** |

---

## 2. Matriz detallada

Los commits se identifican por su hash corto en `TIbacache/matriz-sgr`. Las pruebas `smoke-N` corresponden a las verificaciones de `backend/scripts/smoke-realtime.mjs` (`npm run smoke`).

| HU oficial | Requisitos | Nuestra HU | Implementación (commit) | Prueba | Resultado | Resp. | Estado |
|---|---|---|---|---|---|---|---|
| HU-01 Registro de actividades | RF-009, RF-010, RF-014, RF-022 | — | — | — | — | A | ⬜ |
| HU-02 Registro de compromisos ciudadanos | RF-016…021 | HU-3.2 | `91e8fcb` `b5e7eff` `backend/src/routes/tareas.routes.ts` · `frontend/src/components/NuevaTareaModal.tsx` | smoke-16, smoke-17 | PASS | A | 🟡 falta solicitante/territorio/INT-EXT |
| HU-03 Registro de servicios entregados | RF-004, RF-015 | — | — | — | — | B | ⬜ |
| HU-04 Administración de funciones por cargo | RF-003, RF-006, RF-007 | — | Parcial: `cargo` en `OrganizationMember` (`8de89a5`) | — | — | A | ⬜ |
| HU-05 Definición de metas | RF-005…007 | HU-4.1 | `91e8fcb` `backend/src/routes/metas.routes.ts` | — | — | A | 🟡 falta versionado y período |
| HU-06 Seguimiento de avance | RF-008, RF-022, RF-023, RF-028 | HU-4.3 | `metas.routes.ts` (PATCH avance) | — | — | A | 🟡 falta panel personal |
| HU-07 Cálculo automático de cumplimiento | RF-023…026 | HU-4.2 | `8de89a5` migración `vista_cumplimiento_v2` | smoke-7 | PASS (`objetivo=62 relativo=161.4`) | A | ✅ |
| HU-08 Desempeño organizacional | RF-029, RF-031 | HU-5.1, HU-5.3 | `b5e7eff` `frontend/src/pages/DashboardPage.tsx` | verificación visual | OK | A | 🟡 falta vista por cargos |
| HU-09 Evidencia fotográfica | RF-012, RNF-017 | — | — | — | — | B | ⬜ |
| HU-10 Códigos verificadores | RF-011 | — | Diseño en [ADR-004](decisiones-tecnicas.md) | — | — | B | ⬜ |
| HU-11 Validación de actividades | RF-013, RF-014, RF-036 | — | — | — | — | A | ⬜ |
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
| HU-23 Trabajo colaborativo en línea | RF-034, RNF-003 | HU-3.1, HU-6.1 | `91e8fcb` Socket.io rooms + presencia | smoke-10, smoke-13 | PASS | A | 🟡 falta bloqueo optimista |
| HU-24 Comunicación entre delegaciones | RF-035 | — | — | — | — | B | ⬜ |
| HU-25 Adaptación continua | RF-038 | HU-2.2 | CRUD de categorías | — | — | A | 🟡 sin versionado |
| HU-26 Administración de delegaciones, usuarios y roles | RF-001, RF-002, RNF-004, RNF-005 | HU-1.1, HU-1.2, HU-2.1, HU-3.3 | `91e8fcb` auth + `8de89a5` alcance.ts | smoke-1…5, smoke-8, smoke-11 | PASS | A | ✅ |
| HU-27 Administración de catálogos | RF-004 | HU-2.2 | `categorias.routes.ts` | — | — | A | 🟡 falta desactivación |
| HU-28 Administración de períodos | RF-005, RN-013 | — | — | — | — | A | ⬜ |
| HU-29 Búsqueda y filtros | RF-032 | HU-5.2 | Filtros del dashboard | visual | OK | B | 🟡 |
| HU-30 Auditoría de cambios | RF-036, RNF-008 | — | Diseño en [ADR-006](decisiones-tecnicas.md) | — | — | A | ⬜ |
| HU-31 Alertas operativas | RF-037 | — | — | — | — | B | ⬜ |

---

## 3. Verificaciones automatizadas vigentes

`npm run smoke` en `/backend` — **17/17 PASS** al 26-08-2026:

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

⚠ **Brecha de pruebas**: no hay pruebas unitarias (Jest) ni de componentes (RTL). El PDF (§14.3) exige unitarias de fórmulas y validadores, integración, aceptación Dado/Cuando/Entonces, seguridad y usabilidad. Es el mayor riesgo de la entrega.

---

## 4. Cómo se mantiene

1. Cada commit que implemente una historia la **referencia en el mensaje** (`HU-16`, `RF-027`).
2. Al cerrar sprint se actualiza este archivo: commit, prueba y resultado.
3. Una historia pasa a ✅ **solo** cuando existe prueba automatizada que la verifica.
4. Las evidencias de prueba se guardan en `docs/evidencias/` (por crear en Fase 5).
