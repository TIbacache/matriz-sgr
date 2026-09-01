# Siguiente sesión — qué sigue y en qué orden

**Actualizado**: 1 de septiembre de 2026 (cierre del Bloque A) · Último commit de código: `b1f3e75` (rama `feat/bloque-a-api-registro-validacion`)

Este documento existe para que una sesión nueva retome sin perder contexto. **Se actualiza al terminar cada bloque de trabajo.**

---

## 1. Dónde estamos

| Capa | Estado |
|---|---|
| Documentación y especificación | ✅ Completa y contrastada con el PDF oficial |
| Backend v1 (auth, tubo, KPIs, tiempo real) | ✅ Funcionando, 17/17 verificaciones |
| **Modelo de datos v2** (16 entidades) | ✅ Migrado y verificado, 21/21 |
| **API del modelo v2** (Bloque A) | ✅ Períodos, cargos, ítems, actividades, evidencias, validación y cumplimiento — 57/57 |
| API pendiente del modelo v2 | ⬜ `MetaItem`, `Ajuste`, `AtencionSocial`, `Comentario`, `Ausencia`, catálogos y parámetros |
| Pantallas del modelo v2 | ⬜ No existen ← **aquí se retoma** (criterios ya fijados en DESIGN §8.2) |
| Pruebas en marco formal (Jest/RTL) + CI | ⬜ No existen |
| Despliegue (Fase 5) | ⬜ No iniciado |

Cumplimiento contra los 38 RF oficiales: **13 ✅ · 16 🟡 · 9 ⬜** (antes del Bloque A: 5 · 13 · 20). El eje **actividad → código → evidencia → validación → puntaje** ya funciona de extremo a extremo por API; lo que falta de él es la interfaz.

## 2. Antes de escribir una línea: auditar

Es la regla 1 de CLAUDE.md y el error más caro sería ignorarla. En este punto del proyecto **el modelo ya existe**, así que:

1. Leer el requisito en [requerimientos-oficiales.md](requerimientos-oficiales.md) (RF y criterio de aceptación).
2. Revisar si la entidad **ya está** en `backend/prisma/schema.prisma` — casi siempre sí. **No crear tablas nuevas sin comprobarlo.**
3. Revisar si hay un servicio que ya lo resuelve (`parametros`, `auditoria`, `codigos`, `cumplimiento`, `alcance`, `broadcast`).
4. Revisar las columnas reales en [estructura-planilla-real.md](estructura-planilla-real.md) antes de inventar campos.
5. Correr `npm run build`, `npm run smoke` y `npm run verificar:calculo` **antes** de empezar, para saber de qué base se parte.

## 3. Orden recomendado

### ~~Bloque A — API del registro y la validación (EP-01 + EP-03)~~ ✅ TERMINADO (`b1f3e75`)

Los siete puntos del plan quedaron construidos y verificados (`npm run verificar:api` → 57/57). El contrato completo está en [estado-proyecto.md §API del modelo v2](estado-proyecto.md). Resumen:

1. ✅ `/periodos` con cierre y **reapertura solo de admin, con motivo en la bitácora** (RF-005, RN-013, HU-28).
2. ✅ `/cargos` e `/items`, que se **desactivan en vez de borrarse** (RF-003, HU-04).
3. ✅ `POST /actividades` con código generado por el servidor, RUT y teléfono normalizados, ítem validado contra el cargo y alerta de trazabilidad del vecino (RF-009…011, ADR-008).
4. ✅ `POST /actividades/:id/evidencias` — cuerpo crudo, formato del catálogo, tamaño del parámetro, ruta derivada del código (RF-012, RNF-017).
5. ✅ `POST /evidencias/:id/validacion` con tres decisiones y segregación de funciones (RF-013, RF-014, RNF-005).
6. ✅ `GET /cumplimiento/:periodoId` expone el motor v2 con los parámetros usados y su marca `confirmado`.
7. ✅ `version` → 409 y `auditoria` en todos los writes del modelo v2.

**Lo que quedó fuera y hay que hacer**: la API de `MetaItem` (meta y ponderador por funcionario, RF-007), `Ajuste` (RF-025), `AtencionSocial` (RF-015), `Comentario` (RF-035), `Ausencia`, y el CRUD de catálogos y parámetros. Sin la de `MetaItem`, las metas solo se cargan por seed.

### Bloque B — Pantallas (RF-008, HU-06, HU-11) ← **empezar aquí**

Ficha personal, formulario de actividad con evidencia, bandeja del verificador. Criterios de diseño **ya fijados** en [DESIGN.md §8.2](../DESIGN.md) — leerlos antes de maquetar. La API ya existe entera: no hace falta backend nuevo para estas tres pantallas.

**Cuidados**: la subida de evidencia **no es multipart** (el cuerpo es el archivo, `Content-Type` = su MIME, nombre opcional en `?nombre=`); los PATCH exigen `version` y devuelven 409 con el registro vigente, así que la UI necesita el aviso "otra persona modificó esto" (CA-08); y una actividad validada no se edita: la UI debe ofrecer **anular con motivo**.

### Bloque C — Migrar el dashboard al cálculo v2

Hoy el dashboard lee la **vista materializada v1** (por delegación, con umbrales y tope fijos en SQL). Debe pasar a consumir el motor por funcionario. Al terminar, **eliminar la vista v1** para que no queden dos verdades.

### Bloque D — Pruebas formales y CI

Jest para el backend (las 21 verificaciones de `verificar-cumplimiento.ts` son la base: portarlas), RTL para el frontend, y ambas más el smoke en GitHub Actions. Cubrir las cinco categorías del PDF §14.3.

### Bloque E — Despliegue (Fase 5)

Docker de producción, CI/CD a ghcr.io, VPS con Caddy y HTTPS, respaldos.

## 4. Cabos sueltos concretos

| Cabo | Dónde | Prioridad |
|---|---|---|
| ~~`auditoria` sin llamadas~~ → resuelto en el modelo v2; **las rutas v1 (`/tareas`, `/metas`, `/unidades`, `/categorias`) siguen sin auditar** | rutas v1 | Media |
| ~~`version` sin comparar~~ → resuelto en el modelo v2; **las rutas v1 siguen sin bloqueo optimista** | rutas v1 | Media |
| ~~Roles `verificador` y `consulta` sin uso~~ → resuelto: se aplican en validación y en el alcance de la bandeja | — | ✅ |
| Falta la API de `MetaItem`: sin ella las metas por funcionario solo se cargan por seed | backend | Alta |
| Dos cálculos conviviendo (vista v1 y motor v2) | `jobs/cumplimiento.ts` vs `services/cumplimiento.ts` | Alta |
| El frontend aún no consume ningún endpoint del modelo v2 | `frontend/src/lib/` | Alta |
| El dashboard filtra por el string `2026-Q3`, no por `periodoId` | `frontend/src/lib/dashboard.ts` | Media |
| `Comentario`, `AtencionSocial` y `Ajuste` sin API ni pantalla | backend y frontend | Media |
| Alertas (RF-037, HU-31) sin diseñar | — | Media |
| Exportación de informes (RF-033, HU-20) sin implementar | — | Media |
| ~~Sin estrategia de ramas documentada~~ → **resuelta**: [README §Estrategia de ramas y versiones](../README.md), con etiquetas de rollback por bloque | README | ✅ |
| El plan del Planner (`docs/plan-desarrollo.csv`) **aún no se ha cargado** | `scripts/cargar-plan-planner.ps1` | Media |
| Falta alternativa por teclado en el drag & drop (dnd-kit `KeyboardSensor`) | `KanbanBoard.tsx` | Media |
| `npm audit`: 3 vulnerabilidades en el CLI de Prisma (dev, no producción) | — | Baja |

## 5. Las 10 consultas al docente

Están en [requerimientos-oficiales.md §10](requerimientos-oficiales.md), con tabla de impacto al inicio. **No inventar respuestas.** Mientras no lleguen, los valores viven en `parametro` con `confirmado: false`. Tres nacieron en el Bloque A: la **8** (si una aprobación puede revertirse), la **9** (si el verificador es transversal o por delegación) y la **10** (antivirus y retención de evidencias, RNF-017 — la única que puede implicar costo). Las dos que más impactan en el cálculo:

1. **Felicitación y reclamo**: el PDF dice −20% y −30%; la planilla muestra +10% (máx. 3) y −20%; el audio decía "+10, máx. 1 mensual".
2. **Tope de 150%**: la planilla lo declara en el encabezado pero muestra valores de 154% y 206% sin recortar. ¿Se aplica o solo se informa?

Cuando lleguen: cambiar el valor en `parametro`, poner `confirmado: true`, y actualizar la fila correspondiente en `requerimientos-oficiales.md §10`. **Sin tocar código.**

## 6. Trampas del entorno (ya nos costaron tiempo)

- **`prisma migrate dev` es interactivo y falla aquí.** Usar `migrate diff` + `migrate deploy` (receta en CLAUDE.md).
- **PowerShell agrega BOM** con `Out-File -Encoding utf8`; Postgres rechaza el archivo. Escribir con `UTF8Encoding($false)`.
- **`prisma generate` falla si el servidor dev está corriendo** (bloquea el `.dll` del motor). Detenerlo antes.
- **Here-strings de PowerShell con comillas dobles rompen `git commit -m`.** Usar `git commit -F archivo.txt`.
- El puerto 4000 puede quedar ocupado por un `tsx watch` huérfano de una sesión anterior: revisar con `Get-Process node`.
- **`npm run verificar:api` necesita el servidor corriendo** (como el smoke) y toca la base: crea un período, un cargo, ítems, actividades y una evidencia, y **los borra al terminar**. Si se interrumpe a la mitad, quedan datos de prueba: `npx prisma db seed` los limpia.
- Al agregar un parámetro nuevo a `services/parametros.ts` hay que **volver a sembrar** (`npx prisma db seed`) o el endpoint que lo lee falla con "parámetro no configurado".

## 7. Definición de terminado

Una historia está terminada cuando:
1. Cumple su criterio de aceptación del PDF (Dado/Cuando/Entonces).
2. Tiene **verificación automatizada** que lo demuestra.
3. Está en [matriz-trazabilidad.md](matriz-trazabilidad.md) con commit, prueba y resultado.
4. `npm run build` pasa en backend y frontend.
5. Si toca la UI, cumple DESIGN.md (incluida §8.1 accesibilidad).
