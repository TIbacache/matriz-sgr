# Siguiente sesión — qué sigue y en qué orden

**Actualizado**: 1 de septiembre de 2026 · Último commit: `33bafc4`

Este documento existe para que una sesión nueva retome sin perder contexto. **Se actualiza al terminar cada bloque de trabajo.**

---

## 1. Dónde estamos

| Capa | Estado |
|---|---|
| Documentación y especificación | ✅ Completa y contrastada con el PDF oficial |
| Backend v1 (auth, tubo, KPIs, tiempo real) | ✅ Funcionando, 17/17 verificaciones |
| **Modelo de datos v2** (16 entidades) | ✅ Migrado y verificado, 21/21 |
| **API del modelo v2** | ⬜ **No existe** ← aquí se retoma |
| Pantallas del modelo v2 | ⬜ No existen (criterios ya fijados en DESIGN §8.2) |
| Pruebas en marco formal (Jest/RTL) + CI | ⬜ No existen |
| Despliegue (Fase 5) | ⬜ No iniciado |

Cumplimiento contra los 38 RF oficiales: **5 ✅ · 13 🟡 · 20 ⬜**. La brecha se concentra en el eje **actividad → código → evidencia → validación → puntaje** (épicas EP-01 y EP-03), que es el corazón del sistema.

## 2. Antes de escribir una línea: auditar

Es la regla 1 de CLAUDE.md y el error más caro sería ignorarla. En este punto del proyecto **el modelo ya existe**, así que:

1. Leer el requisito en [requerimientos-oficiales.md](requerimientos-oficiales.md) (RF y criterio de aceptación).
2. Revisar si la entidad **ya está** en `backend/prisma/schema.prisma` — casi siempre sí. **No crear tablas nuevas sin comprobarlo.**
3. Revisar si hay un servicio que ya lo resuelve (`parametros`, `auditoria`, `codigos`, `cumplimiento`, `alcance`, `broadcast`).
4. Revisar las columnas reales en [estructura-planilla-real.md](estructura-planilla-real.md) antes de inventar campos.
5. Correr `npm run build`, `npm run smoke` y `npm run verificar:calculo` **antes** de empezar, para saber de qué base se parte.

## 3. Orden recomendado

### Bloque A — API del registro y la validación (EP-01 + EP-03) ← empezar aquí

Es lo que desbloquea todo lo demás y lo que más pesa en la evaluación.

1. **`GET/POST /periodos`** + cierre y reapertura (RF-005, RN-013, HU-28). Sin período abierto no se puede registrar nada, así que va primero.
2. **`GET/POST/PATCH /cargos` e `/items`** (RF-003, HU-04).
3. **`POST /actividades`** (RF-009, RF-010, HU-01): valida con Zod, normaliza el RUT con `lib/rut.ts`, genera el código con `services/codigos.ts`, audita con `services/auditoria.ts` y emite su evento con `emitEvent()`.
4. **`POST /actividades/:id/evidencias`** (RF-012, HU-09): subida de archivo. Definir formatos y tamaño máximo como parámetros (RNF-017). Guardar en disco local con nombre seguro derivado del código, **nunca el nombre que envía el cliente**.
5. **`POST /evidencias/:id/validacion`** (RF-013, RF-014, HU-11): aprobar, rechazar o solicitar corrección. Solo rol `verificador`, `supervisor` o `admin`. Audita y recalcula.
6. **`GET /cumplimiento/:periodoId`**: expone `services/cumplimiento.ts`, que ya está construido y probado.

**Cuidados de este bloque**:
- Aplicar `version` (409 en conflicto) en todo PATCH — la columna existe pero **ningún endpoint la usa todavía**.
- Llamar a `auditoria` en cada write crítico — el servicio existe pero **ningún controlador lo llama todavía**.
- Las actividades validadas **no se editan**: se anulan con motivo y se crea una nueva (ADR-006).

### Bloque B — Pantallas (RF-008, HU-06, HU-11)

Ficha personal, formulario de actividad con evidencia, bandeja del verificador. Criterios de diseño **ya fijados** en [DESIGN.md §8.2](../DESIGN.md) — leerlos antes de maquetar.

### Bloque C — Migrar el dashboard al cálculo v2

Hoy el dashboard lee la **vista materializada v1** (por delegación, con umbrales y tope fijos en SQL). Debe pasar a consumir el motor por funcionario. Al terminar, **eliminar la vista v1** para que no queden dos verdades.

### Bloque D — Pruebas formales y CI

Jest para el backend (las 21 verificaciones de `verificar-cumplimiento.ts` son la base: portarlas), RTL para el frontend, y ambas más el smoke en GitHub Actions. Cubrir las cinco categorías del PDF §14.3.

### Bloque E — Despliegue (Fase 5)

Docker de producción, CI/CD a ghcr.io, VPS con Caddy y HTTPS, respaldos.

## 4. Cabos sueltos concretos

| Cabo | Dónde | Prioridad |
|---|---|---|
| `services/auditoria.ts` existe pero **ningún controlador lo llama** | rutas del backend | Alta |
| Columna `version` creada pero **ningún endpoint la compara** | rutas del backend | Alta |
| Roles `verificador` y `consulta` en el enum, pero `requireRol` no los usa en ninguna ruta | `middleware/roles.ts` y rutas | Alta |
| Dos cálculos conviviendo (vista v1 y motor v2) | `jobs/cumplimiento.ts` vs `services/cumplimiento.ts` | Alta |
| El dashboard filtra por el string `2026-Q3`, no por `periodoId` | `frontend/src/lib/dashboard.ts` | Media |
| `Comentario`, `AtencionSocial` y `Ajuste` sin API ni pantalla | backend y frontend | Media |
| Alertas (RF-037, HU-31) sin diseñar | — | Media |
| Exportación de informes (RF-033, HU-20) sin implementar | — | Media |
| Sin estrategia de ramas documentada (la exige el PDF §15, entregable 01) | README | Media |
| El plan del Planner (`docs/plan-desarrollo.csv`) **aún no se ha cargado** | `scripts/cargar-plan-planner.ps1` | Media |
| Falta alternativa por teclado en el drag & drop (dnd-kit `KeyboardSensor`) | `KanbanBoard.tsx` | Media |
| `npm audit`: 3 vulnerabilidades en el CLI de Prisma (dev, no producción) | — | Baja |

## 5. Las 7 consultas al docente

Están en [requerimientos-oficiales.md §10](requerimientos-oficiales.md). **No inventar respuestas.** Mientras no lleguen, los valores viven en `parametro` con `confirmado: false`. Las dos que más impactan:

1. **Felicitación y reclamo**: el PDF dice −20% y −30%; la planilla muestra +10% (máx. 3) y −20%; el audio decía "+10, máx. 1 mensual".
2. **Tope de 150%**: la planilla lo declara en el encabezado pero muestra valores de 154% y 206% sin recortar. ¿Se aplica o solo se informa?

Cuando lleguen: cambiar el valor en `parametro`, poner `confirmado: true`, y actualizar la fila correspondiente en `requerimientos-oficiales.md §10`. **Sin tocar código.**

## 6. Trampas del entorno (ya nos costaron tiempo)

- **`prisma migrate dev` es interactivo y falla aquí.** Usar `migrate diff` + `migrate deploy` (receta en CLAUDE.md).
- **PowerShell agrega BOM** con `Out-File -Encoding utf8`; Postgres rechaza el archivo. Escribir con `UTF8Encoding($false)`.
- **`prisma generate` falla si el servidor dev está corriendo** (bloquea el `.dll` del motor). Detenerlo antes.
- **Here-strings de PowerShell con comillas dobles rompen `git commit -m`.** Usar `git commit -F archivo.txt`.
- El puerto 4000 puede quedar ocupado por un `tsx watch` huérfano de una sesión anterior: revisar con `Get-Process node`.

## 7. Definición de terminado

Una historia está terminada cuando:
1. Cumple su criterio de aceptación del PDF (Dado/Cuando/Entonces).
2. Tiene **verificación automatizada** que lo demuestra.
3. Está en [matriz-trazabilidad.md](matriz-trazabilidad.md) con commit, prueba y resultado.
4. `npm run build` pasa en backend y frontend.
5. Si toca la UI, cumple DESIGN.md (incluida §8.1 accesibilidad).
