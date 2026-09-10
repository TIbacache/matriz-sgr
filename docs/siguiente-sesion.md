# Siguiente sesión — qué sigue y en qué orden

**Actualizado**: 10 de septiembre de 2026 (criterios 3, 4 y 5 de la entrega: casos de uso y diagrama de clases)

Este documento existe para que una sesión nueva retome sin perder contexto. **Se actualiza al terminar cada bloque de trabajo.**

---

## 1. Dónde estamos

| Capa | Estado |
|---|---|
| Documentación y especificación | ✅ Completa y contrastada con el PDF oficial |
| Backend v1 (auth, tubo, KPIs, tiempo real) | ✅ Funcionando, 18/18 verificaciones · **rutas endurecidas** (Bloque A3): `version` → 409 y auditoría en `/tareas`, `/unidades` y `/categorias` |
| **Modelo de datos v2** (16 entidades) | ✅ Migrado y verificado, 21/21 |
| **API del modelo v2** (Bloques A, A2, A3, B3, B4 y C) | ✅ Períodos, cargos, ítems, **metas por funcionario**, actividades, evidencias, validación, cumplimiento **y su consolidado por delegación**, **ficha del vecino**, **atención social con sus 3 gestiones** y las rutas heredadas endurecidas |
| API pendiente del modelo v2 | ⬜ `Ajuste`, `Comentario`, `Ausencia`, CRUD de catálogos y de parámetros |
| Pantallas del modelo v2 | ✅ Ficha personal, bandeja del verificador, configuración de metas, **ficha del vecino** y **dashboard**; faltan las de administración (períodos, cargos, catálogos) |
| **Cálculo único** | ✅ El Bloque C eliminó la vista materializada v1, la tabla `metas`, `/metas`, `/kpis/cumplimiento` y el cron. Ya no hay dos verdades |
| **Identidad visual de La Serena** (DESIGN §10) | ✅ Bloque D0: tokens, barra, login, tipografía; 83 comprobaciones de contraste y capturas de los seis roles |
| Pruebas en marco formal (Jest/RTL) + CI | ⬜ No existen |
| Despliegue (Fase 5) | ⬜ No iniciado |
| **Entrega del 15 de septiembre** (análisis y diseño) | 🟠 **70 de 100 puntos.** Criterio 1 preparado, criterios 2 a 5 hechos; faltan el DER (6), el script (7) y el informe. Estado detallado en **[entrega/README.md](entrega/README.md)** |

Cumplimiento contra los 38 RF oficiales: **23 ✅ · 8 🟡 · 7 ⬜** (antes del Bloque A: 5 · 13 · 20). El **Bloque C** cerró RF-024 y RF-027: el tope y los umbrales del semáforo dejaron de estar escritos en SQL. **CA-04, CA-08 y CA-09 en ✅**: el A3 cerró los dos de concurrencia y auditoría, el B4 el caso social con sus tres gestiones, y el B5 la solicitud del vecino en el tubo — con él **EP-01 queda completa**. El eje **actividad → código → evidencia → validación → puntaje** funciona de extremo a extremo, la configuración de **cargo → ítems → metas** que lo alimenta también, y desde el Bloque B3 el sistema además **detecta a la misma persona atendida en varias delegaciones**, que es lo que el cliente vino a buscar.

## 2. Antes de escribir una línea: auditar

Es la regla 1 de CLAUDE.md y el error más caro sería ignorarla. En este punto del proyecto **el modelo ya existe**, así que:

1. Leer el requisito en [requerimientos-oficiales.md](requerimientos-oficiales.md) (RF y criterio de aceptación).
2. Revisar si la entidad **ya está** en `backend/prisma/schema.prisma` — casi siempre sí. **No crear tablas nuevas sin comprobarlo.**
3. Revisar si hay un servicio que ya lo resuelve (`parametros`, `auditoria`, `codigos`, `cumplimiento`, `alcance`, `broadcast`).
4. Revisar las columnas reales en [estructura-planilla-real.md](estructura-planilla-real.md) antes de inventar campos.
5. Correr `npm run build`, `npm run smoke` y `npm run verificar:calculo` **antes** de empezar, para saber de qué base se parte. Si el bloque toca la UI, también `npm run verificar:contraste` (frontend).
6. **Toda pantalla nueva nace con la identidad de DESIGN §10 y §3.3**: `--marca`/`--acento` fuera de las zonas de datos, `--seleccion` para lo activo dentro de una tabla, marca ●▲■ en `mono` sobre rojo, y se mira con las seis cuentas (`node scripts/capturas.mjs`) antes de darla por buena.

## 3. Orden recomendado

### ~~Bloque A — API del registro y la validación (EP-01 + EP-03)~~ ✅ TERMINADO (`b1f3e75`)

Los siete puntos del plan quedaron construidos y verificados (`npm run verificar:api` → 57/57). El contrato completo está en [estado-proyecto.md §3](estado-proyecto.md). Resumen:

1. ✅ `/periodos` con cierre y **reapertura solo de admin, con motivo en la bitácora** (RF-005, RN-013, HU-28).
2. ✅ `/cargos` e `/items`, que se **desactivan en vez de borrarse** (RF-003, HU-04).
3. ✅ `POST /actividades` con código generado por el servidor, RUT y teléfono normalizados, ítem validado contra el cargo y alerta de trazabilidad del vecino (RF-009…011, ADR-008).
4. ✅ `POST /actividades/:id/evidencias` — cuerpo crudo, formato del catálogo, tamaño del parámetro, ruta derivada del código (RF-012, RNF-017).
5. ✅ `POST /evidencias/:id/validacion` con tres decisiones y segregación de funciones (RF-013, RF-014, RNF-005).
6. ✅ `GET /cumplimiento/:periodoId` expone el motor v2 con los parámetros usados y su marca `confirmado`.
7. ✅ `version` → 409 y `auditoria` en todos los writes del modelo v2.

**Lo que quedó fuera**: la API de `MetaItem` (hecha en el Bloque A2, abajo), `Ajuste` (RF-025), `AtencionSocial` (RF-015), `Comentario` (RF-035), `Ausencia`, y el CRUD de catálogos y parámetros.

### ~~Bloque A2 — Metas por funcionario (RF-006, RF-007, RN-001)~~ ✅ TERMINADO (`de68901`)

`/metas-item` abre la entidad `MetaItem`, que existía desde el modelo v2 pero solo se poblaba por seed. Contrato completo en [estado-proyecto.md §3.1](estado-proyecto.md). Lo esencial:

- `GET` con alcance por delegación y un `resumen` que trae `sumaPonderadores`, `cumpleRN001` y `faltante` — la pantalla debe poder decir "falta 15%" antes de guardar.
- `POST` rechaza **superar** el 100%; `PUT` (conjunto completo de una persona) exige el **100% exacto**, en transacción. Son las dos caras de RN-001.
- `DELETE` protegido: no se quita la meta de un ítem que ya acumuló avance aprobado (RN-009, CA-01).
- `PATCH` con `version` → 409, auditoría en todo write y eventos `meta_item:*` + `cumplimiento:cambiado`.

⚠ **`/metas` (v1, unidad × categoría) y `/metas-item` (v2, funcionario × ítem × período) son cosas distintas.** Convergen en el Bloque C.

⚠ **Bug preexistente que destapó**: `services/auditoria.ts` perdía **en silencio** todo evento con un `Prisma.Decimal` (arrastraba su `constructor` al Json y Prisma rechazaba el insert; como la bitácora nunca lanza, no había aviso). Corregido, con verificación de regresión. La API de parámetros (RF-038, también `Decimal`) habría tropezado con lo mismo.

### ~~Bloque B2 — Pantalla de configuración de metas (HU-05)~~ ✅ TERMINADO

`/metas` (`frontend/src/pages/MetasPage.tsx`). Detalle en [estado-proyecto.md §6.4](estado-proyecto.md) y criterios en [DESIGN §8.2](../DESIGN.md). Lo esencial: totalizador siempre visible, todos los ítems del cargo a la vista, guardado del conjunto con `PUT`, reparto en partes iguales a un clic, y lo que ya sumó puntaje no se puede quitar.

Cerró de paso dos huecos: el `PUT` no comparaba `version` (CA-08) y el selector ofrecía personas que el servidor rechaza (regla 9). El segundo lo encontró una verificación nueva que prueba **los seis roles**, no un solo camino feliz — vale la pena repetir ese patrón en cada pantalla.

⚠ **Lo que le falta**: la prueba **visual** con las seis cuentas. Está verificado el contrato que consume, no la vista.

### Bloque B — Pantallas (RF-008, HU-06, HU-11)

- ✅ **Ficha personal** (`/ficha`): cabecera con semáforo, tabla de ítems y registro diario con subida de evidencia, vista de la foto y anulación con motivo. Detalle en [estado-proyecto.md §6.2](estado-proyecto.md).
- ✅ **Bandeja del verificador** (`/verificacion`): cola, foto grande, tres decisiones, teclado `J`/`K`/`Enter` y aviso de trabajo nuevo en vivo. Detalle en [estado-proyecto.md §6.3](estado-proyecto.md).
- ✅ **Ficha del vecino** (`/vecinos`) — ver el bloque B3 más abajo.

**Cuidados**: la subida de evidencia **no es multipart** (el cuerpo es el archivo, `Content-Type` = su MIME, nombre opcional en `?nombre=`); los PATCH exigen `version` y devuelven 409 con el registro vigente, así que la UI necesita el aviso "otra persona modificó esto" (CA-08); y una actividad validada no se edita: se **anula con motivo**. Reutilizar `ChipSemaforo`, `.tabla-sgr` y `useUnidadSocket` en vez de escribir otros.

### ~~Bloque D0 — Rediseño visual con la identidad de La Serena~~ ✅ TERMINADO (`d6e6dbf`, `v0.8.0-identidad-la-serena`)

Las dos decisiones que estaban abiertas quedaron en **ADR-010** (Libre Franklin + General Sans en pantalla, Arial en lo impreso) y **ADR-011** (los dos rojos se separan por rol, zona y forma; el semáforo no cambió). El equipo eligió además el faro en SVG duotono y la frase «Lo que se atiende, se registra; lo que se registra, avanza». Detalle en [DESIGN §10](../DESIGN.md) y [estado-proyecto §6.0](estado-proyecto.md).

Dejó dos herramientas que valen para todo lo que venga: `npm run verificar:contraste` (83 comprobaciones sobre `tokens.css`) y `node scripts/capturas.mjs` (cada pantalla con las seis cuentas, dos temas, escritorio y móvil). Las capturas encontraron cinco cosas que ninguna prueba de API habría visto, tres de ellas desbordes a 390px que ya existían.

⚠ **Lo que dejó abierto**: la ficha del rol consulta habla de una "fila de arriba" que ese rol no tiene; la barra muestra el rol técnico ("Supervisor", "Gerente") y no el municipal; el nombre de la organización se trunca a 240px. Están en [estado-proyecto §9](estado-proyecto.md).

### ~~Bloque D1 — Vida en pantalla~~ ✅ TERMINADO (`v0.8.1-vida-en-pantalla`, `v0.8.2-faro-y-escena`)

El equipo pidió que la app "se mueva sin que la toquen": loops visibles con períodos que no rimen y feedback en todo lo clickeable. Se resolvió con **dos regímenes de movimiento** ([DESIGN §3.6](../DESIGN.md)): *ambiente* en login y barra, *estado* en los datos (cifra hero que cuenta, chip crítico que late), y hover en cada botón, enlace, campo, fila y gauge. Sin Tailwind: CSS + `motion/react`. Todo con apagado por `prefers-reduced-motion`.

La segunda vuelta (`v0.8.2`) salió de la revisión del equipo con la foto del faro real: la linterna se recortaba (el contenedor usaba `slice` con altura fija; ahora `aspect-ratio` + `meet`) y el faro se redibujó con las ventanas en hilera encendidas, la galería almenada, la linterna de vidrio y los torreones del fuerte. Y la barra dejó de ser "puras iglesias": es una escena de La Serena con San Francisco, el jarro pato y la greca diaguita, la cúpula de La Recova, El Miliciano, el papayo y el faro.

**Regla para lo que venga**: toda pantalla nueva nace con el feedback de hover de `base.css` (le sale gratis si usa `.btn-*`, `.campo`, `.tabla-sgr`) y **no** agrega ambiente en zonas de datos.

### ~~Bloque B3 — Ficha del vecino~~ ✅ TERMINADO (`v0.10.0-ficha-vecino`)

El control que el cliente vino a buscar. Tres endpoints (`GET /vecinos?q=`, `GET /vecinos/:id`, `PATCH /vecinos/:id`), un servicio (`services/vecinos.ts`), una pantalla (`/vecinos`) y una migración. Contrato en [estado-proyecto.md §3.1](estado-proyecto.md), pantalla en [§6.5](estado-proyecto.md), decisión legal en **[ADR-012](decisiones-tecnicas.md)**.

Lo que decidió y conviene no reabrir:

- **Ver el hecho y ver el detalle son dos preguntas distintas.** El historial cruza delegaciones siempre; el detalle de una atención ajena viaja reducido. Así se cumplen a la vez la regla del cliente (el libro es privado) y CA-04 (la secuencia consultable).
- **Rige lo restrictivo**: `verificador` y `consulta` reciben 403 **con el motivo escrito**. Documentado como **consulta abierta nº 12**, la única sobre datos de terceros.
- **Se audita el acceso** (`consultar`), no la búsqueda incremental. Nueva acción en el enum, con migración.
- La ventana de duplicidad es el parámetro `ventana_duplicidad_dias` (30 días, sin confirmar). **Ningún número en el código.**
- El seed arma el caso emblemático **a propósito**: 94 actividades a nombre de tres vecinos ficticios, repartidas de forma determinista para que el mismo ítem le toque al mismo vecino en Centro y en Rural.

⚠ **Lo que dejó abierto**: el historial trae hasta 500 hechos de una vez y la pantalla los pinta todos — falta paginar, como ya se hizo en la bandeja. Y CA-04 sigue en 🟡 hasta que exista la API de `AtencionSocial` con sus tres gestiones (RF-015, HU-03).

### ~~Bloque A3 — Endurecer las rutas heredadas~~ ✅ TERMINADO (`v0.11.0-rutas-endurecidas`)

`/tareas`, `/unidades` y `/categorias` pasaron a tener lo que ya tenía el modelo v2: bloqueo optimista con `version` → 409 (CA-08) y auditoría de todo write (CA-09). **Los dos criterios de aceptación quedaron en ✅.** Detalle del contrato en [estado-proyecto §3.2](estado-proyecto.md) y la pantalla en [§6.1](estado-proyecto.md).

Lo que decidió y conviene no reabrir:

- **El `PATCH` exige `version`, sin excepción para el drag & drop.** Mover una tarjeta es un write como cualquier otro, y el tubo es la pantalla donde más gente escribe a la vez: era justo la que sobrescribía en silencio. Una petición sin `version` responde 400.
- **Ante un 409, la pantalla no revierte: recarga y avisa.** Revertir al estado anterior inventaría un valor que ya no es el vigente. El aviso es **persistente** (no un toast) y nombra la tarjeta.
- **La bitácora del tubo distingue `cambiar_estado` de `actualizar`**, para poder reconstruir el recorrido de una tarjeta sin confundirlo con un cambio de texto.
- **RF-001 estaba incumplido y nadie lo había notado**: `DELETE /unidades/:id` borraba de verdad, con actividades, metas y tareas colgando de la delegación. El esquema ya tenía la columna `activo` desde el modelo v2 y la ruta la ignoraba. Ahora desactiva, es idempotente, y las inactivas se consultan con `?incluirInactivas=1`. **Vale la pena revisar si hay más columnas del modelo v2 que ninguna ruta usa.**
- `CategoriaGestion` era la última entidad editable sin `version`: migración `20260903190000_endurecer_rutas_heredadas`.

⚠ **Lo que dejó abierto**: `TareaHistorial` sigue sin usarse. RF-018 pide un **historial de transición** y la auditoría no lo reemplaza (es interna, no una vista para la persona usuaria). Junto con la alerta, es lo que le falta a CA-03.

### ~~Bloque B4 — La atención social y sus tres gestiones~~ ✅ TERMINADO (`v0.12.0-atencion-social`)

**CA-04 queda cerrado de punta a punta** — el criterio de aceptación más caro de la especificación. La entidad `AtencionSocial` existía desde el modelo v2 con las nueve columnas de la planilla; lo que faltaba era abrirla sin perder por el camino la única propiedad que CA-04 exige: que la secuencia esté **garantizada**. Contrato en [estado-proyecto §3.1](estado-proyecto.md), pantallas en [§6.2 y §6.5](estado-proyecto.md), y la decisión en **[ADR-013](decisiones-tecnicas.md)**.

Lo que decidió y conviene no reabrir:

- **El servidor decide en qué casillero cae cada gestión, no el cliente.** `POST /atenciones-sociales/:id/gestiones` recibe el valor y sus fechas, nunca el número. Es lo que impide saltarse la primera, registrar una cuarta o llenar las tres de una vez. Si el cliente eligiera el casillero, la secuencia sería una promesa y no un hecho demostrable.
- **Cada gestión solo admite sus propias fechas.** Una fecha en el campo equivocado es un dato falso que después nadie sabe interpretar.
- **La atención es 1:1 con la actividad y exige un vecino identificado.** Una segunda atención sobre la misma actividad es un duplicado (409), no un avance; sin `personaUsuariaId` no hay caso que seguir ni duplicidad que detectar (422, RN-012).
- **La observación se anexa, no se pisa.** La planilla tiene una sola columna para todo el caso; sobrescribirla borraría el relato que explica por qué el caso avanzó como avanzó.
- **`proyectar()` es la única forma en que la atención sale del backend** —del alta, del avance y de dentro de una actividad—. Dos formas del mismo concepto obligan a la pantalla a saber de dónde vino cada una.
- **Alcance por rol (ADR-013, hereda ADR-012)**: `verificador` y `consulta` reciben 403 con el motivo escrito; desde otra delegación viaja el **avance** del caso pero no su contenido. Abrir un caso se audita como `consultar` y avanzarlo como `cambiar_estado`.
- **El seed arma el caso a propósito**: 45 atenciones repartidas en las tres etapas, 4 completas, y la misma vecina con caso social en Centro y en Rural. Los datos de demostración son parte del entregable.

⚠ **Lo que dejó abierto**: **corregir una gestión ya registrada** no está resuelto — el `PATCH` solo toca la cabecera. Si el cliente lo pide, habrá que decidir entre corregirla con bloqueo optimista o anular la actividad y registrar otra, como con las validaciones aprobadas (consulta abierta nº 8). Y no se exige que el ítem de la actividad sea del área SOCIAL: la especificación no lo dice y no se inventó (regla 16).

### ~~Bloque B5 — La solicitud del vecino en el tubo~~ ✅ TERMINADO (`v0.13.0-solicitud-en-el-tubo`)

Cerró **RF-016 y RF-017**, y con ellos **HU-02 y la épica EP-01 completa**. No era una mejora deseable: era un agujero de trazabilidad que hacía parecer roto lo que funcionaba. Contrato en [estado-proyecto §3.2](estado-proyecto.md) y la pantalla en [§6.1](estado-proyecto.md).

Lo que decidió y conviene no reabrir:

- **No se pide RUT en el tubo.** La planilla real del cliente no tiene esa columna ([estructura-planilla-real §6](estructura-planilla-real.md)): `SOLICITANTE` es texto libre y muchos compromisos son internos. Exigirlo contradiría la fuente 2 y trabaría el registro rápido que el cliente pidió. El seed lo demuestra a propósito: uno de los compromisos externos lo pide una **organización**, que no tiene RUT ni ficha.
- **El vínculo con la ficha del vecino es opcional**, y es lo que lleva el compromiso a su historial. Forzarlo convertiría el tubo en un registro de personas que la ley no pide (finalidad y proporcionalidad, regla 18).
- **INT/EXT son dos opciones explícitas, no una casilla.** "No marcado" no es lo mismo que "es trabajo interno", y en la planilla la columna siempre tiene un valor. Una solicitud externa **sin solicitante se rechaza con 422**: sin eso, INT/EXT no significaba nada.
- **El formulario no crece para el caso frecuente**: los cuatro campos de la solicitud aparecen solo al marcar "Externa".
- **La regla del solicitante vale hacia adelante, no hacia atrás.** `Tarea.interesExterno` tiene `@default(true)` desde el modelo v2, así que **todas las tareas anteriores a este bloque son "externas" sin solicitante**. Exigírselo al corregirlas dejaba el tubo entero bloqueado —ni siquiera se podía arrastrar una tarjeta—; lo destaparon tres verificaciones del Bloque A3 al ponerse en rojo. Ahora la regla solo aplica si el cuerpo **toca** `interesExterno` o `solicitante`.
- **El alta avisa la duplicidad igual que la ficha personal** (ADR-008): un compromiso y una atención son dos hechos de la misma persona, y el control solo sirve si avisa en los dos sitios donde se registra algo a su nombre.

⚠ **Lo que dejó abierto**: `zod` 4 rechaza los UUID que no cumplen la versión y variante de la RFC (`1111…1111` da 400, no 404). Es correcto —mal formado es 400— pero conviene saberlo al escribir pruebas. Y apareció un cabo suelto real: **no se declara `color-scheme`**, así que los controles nativos se pintan en claro también en el tema oscuro; aquí se rodeó marcando la opción elegida en el contenedor, pero la causa afecta a todos los formularios.

### ~~Bloque C — Migrar el dashboard al cálculo v2~~ ✅ TERMINADO

El dashboard consume `GET /cumplimiento/:periodoId/consolidado` y **la v1 ya no existe**: se eliminaron la vista materializada, la tabla `metas`, el modelo `Meta`, las rutas `/metas`, `/kpis/cumplimiento` y `/kpis/recalcular`, y el cron de recálculo (migración `20260903230000_eliminar_cumplimiento_v1`). Contrato en [estado-proyecto §3.1](estado-proyecto.md), pantalla en [§6.6](estado-proyecto.md), decisión en **[ADR-014](decisiones-tecnicas.md)**.

Lo que decidió y conviene no reabrir:

- **La delegación es el promedio simple de sus funcionarios.** Cada plan personal ya suma el 100% de sus ponderadores (RN-001), así que las personas son comparables; ponderar por cantidad de ítems premiaría a quien tiene más ítems asignados, que es configuración y no mérito.
- **Sin medición no es 0%.** Una delegación sin nadie con metas viaja en `sinMedicion` y la pantalla la nombra. Pintarla de rojo inventaría un incumplimiento y taparía el aviso que importa: que ahí no hay nadie configurado. Es además la primera pieza del «quién **no** ha ingresado» de RF-030.
- **El segundo eje es el área del cargo, no la categoría del tubo.** `CategoriaGestion` (Seguridad, DISERCO, Social…) clasifica compromisos del tubo y no tiene relación con lo que se le mide a una persona: el mapa cruzaba dos cosas distintas. Ahora es `Cargo.area`, como agrupa la planilla real.
- **La celda del mapa se juzga contra su propio objetivo del día**, igual que el gauge de al lado. Antes el gauge se coloreaba contra el objetivo y la celda contra un 100% fijo: dos formas de la misma pantalla podían contradecirse.
- **La proyección al cierre se calcula en el backend con el tope del parámetro.** Estaba en el frontend con un `Math.min(…, 150)` escrito a mano: un valor de negocio en la capa de presentación (prohibido por la regla 3 y ADR-007).
- **Se elimina, no se depreca.** Mientras las dos fuentes existan, cualquiera puede leer la equivocada y ninguna prueba lo detecta. Es exactamente lo que pasó: ver abajo.

⚠ **Lo que destapó la auditoría, y es la lección del bloque**: el dashboard llevaba semanas mostrando **24 filas fósiles**. La tabla `metas` no la poblaba ningún seed desde que se reescribió, y su columna `avance` no la actualizaba ningún proceso. También seguían vivas en la base las **10 cuentas `@demo.cl`** que la documentación daba por borradas desde la Fase 2 —el seed las creaba con `upsert`, así que dejar de nombrarlas nunca las quitó—, y una comprobación del smoke pasaba **gracias a ellas** (buscaba el cargo «Territorial 1», que solo existía ahí). El seed ahora borra a quien no esté en su lista `EQUIPO`.

⚠ **Lo que dejó abierto**: `GET /cumplimiento/:periodoId` sigue devolviendo el detalle por funcionario a todos los roles. El consolidado del tablero no lo necesita, pero el detalle individual roza la **consulta abierta nº 11** (si un funcionario ve las cifras de sus pares). Anotado, no cambiado en silencio.

### Bloque D — Pruebas formales y CI

Jest para el backend (las 21 verificaciones de `verificar-cumplimiento.ts` son la base: portarlas), RTL para el frontend, y ambas más el smoke en GitHub Actions. Cubrir las cinco categorías del PDF §14.3.

### Bloque E — Despliegue (Fase 5)

Docker de producción, CI/CD a ghcr.io, VPS con Caddy y HTTPS, respaldos.

## 4. Cabos sueltos concretos

**Orden acordado el 1 de septiembre, actualizado el 3**: primero el rediseño (Bloques D0 y D1, ✅ el 2 de septiembre), después la ficha del vecino (B3, ✅), el endurecimiento de las rutas heredadas (A3, ✅), la atención social (B4, ✅), la solicitud en el tubo (B5, ✅) y el **Bloque C** (✅), que dejó un solo cálculo en el sistema.

**Lo que sigue, en este orden** (acordado el 3 de septiembre al cerrar el Bloque C):

1. **El Planner** — el docente dijo que **solo** revisará el Planner: lo que no esté adjunto ahí no se evalúa. ⚠ **El tablero ya existe y no está vacío**: lo construyó Héctor con los siete depósitos de la plantilla y cinco tareas de la entrega (GIT, MockUps, MER, UML, Clases) con vencimiento 15/9. Lo que falta es la tarea del **diagrama de requerimientos** y poblar **Desarrollo y Pruebas**, que están vacíos y hacen parecer que el desarrollo no empezó. **Estado al 9 de septiembre**: el CSV quedó reescrito (87 tareas, ninguna bloqueada, sin títulos que choquen con los de Héctor), y **la carga va a mano** con [entrega/guia-planner-hector.pdf](entrega/guia-planner-hector.pdf), en seis tandas. ⚠ **No intentar automatizarlo otra vez**: INACAP tiene desactivado el consentimiento de usuario para *Microsoft Graph Command Line Tools*, así que cualquier script de PowerShell contra Microsoft 365 muere en «Need admin approval», incluso pidiendo solo `Tasks.ReadWrite`. Probado y documentado en [guia-cargar-planner.md](guia-cargar-planner.md). Detalle en [entrega/planner-delta.md](entrega/planner-delta.md).
2. **Entrega del 15 de septiembre** — plan operativo completo en **[plan-entrega-15-septiembre.md](plan-entrega-15-septiembre.md)**, escrito contra la rúbrica oficial (100 pts, 8 criterios). Lo esencial: **85 de los 100 puntos dependen de artefactos que hoy no existen o describen el modelo v1**, y solo 10 dependen del software, que es lo que está terminado. Hay que crear de cero el diagrama de requerimientos, el de clases y los 12 casos de uso con sus fichas, y rehacer el caso de uso general y el DER. El script se pide en **MySQL** y el sistema corre en PostgreSQL: decisión D-1 del plan y **consulta abierta nº 13**.
3. ~~**Panel de actividad de usuarios** (RF-030, HU-19)~~ ✅ **terminado el 4 de septiembre**: `/actividad` responde las tres preguntas del docente —quién registró, **quién no** y quién está conectado—, con presencia a nivel de organización y alcance restringido a admin y coordinador ([ADR-015](decisiones-tecnicas.md)).
4. **Bloque D — pruebas formales y CI**, y después el **Bloque E — despliegue**.

Los cabos sueltos de prioridad Media (abajo) se toman cuando toquen el archivo que los contiene, no como bloque propio.

### 4.bis Tres desvíos entre el requerimiento y el código, encontrados al escribir las fichas

Salieron de contrastar cada caso de uso con su RF oficial (criterio 4 de la entrega, 10 de septiembre). **No son decisiones de diseño: son incumplimientos**, y están declarados como tales en [entrega/casos-uso-detalle.md](entrega/casos-uso-detalle.md) en vez de disimularse describiendo el código como si fuera el requisito.

| # | RF | Qué pide | Qué hay | Costo estimado |
|---|---|---|---|---|
| **D-a** | **RF-016** | La creación de compromisos del tubo es del **Funcionario** y del Delegado | `POST /tareas` la restringe a `admin`, `supervisor` y `gerente`: el funcionario **mueve** sus compromisos pero no puede **crearlos**. La restricción viene de la matriz de permisos del Documento Maestro —la fuente más baja de la jerarquía— y quedó por encima del RF sin que nadie lo decidiera | Bajo: un rol más en `requireRol`, más la prueba de alcance |
| **D-b** | **RF-018** y **RF-019** | Cuatro estados (Ingresado → Pendiente → En proceso → Realizado) con **historial de transiciones**; alertas de «próximo a vencer» y «realizado fuera de plazo» | Tres estados y solo se marcan los vencidos. ⚠ **`tarea_historial` existe y el seed la llena, pero `src/` nunca escribe en ella**: el historial se ve poblado en la demo y no se llenaría en uso real. El recorrido se reconstruye desde la bitácora | Bajo para el historial (un `create` en el PATCH de tareas); medio para los estados y las alertas |
| **D-c** | **RF-036** | Trazabilidad **consultable** | Se audita todo write crítico, pero falta la pantalla para leer la bitácora | Medio: una pantalla nueva con filtros |

**D-a es el más barato y el que más se nota**, porque contradice el uso diario que el cliente describió. Conviene resolverlo antes de que el desvío se consolide como si fuera la regla.

| Cabo | Dónde | Prioridad |
|---|---|---|
| ~~**Endurecer `/tareas`, `/unidades` y `/categorias`** con `version` → 409 y auditoría~~ → **resuelto** en el Bloque A3, junto con RF-001 (la baja de una delegación la desactiva) y el aviso de conflicto en el tubo. Las que sí mueren siguen siendo `/metas` v1 y `/kpis/cumplimiento` — ver [estado-proyecto §3.2](estado-proyecto.md) | — | ✅ |
| ~~🔴 **El tubo no puede enlazar al vecino**~~ → **resuelto** en el Bloque B5: INT/EXT, solicitante, territorio, área de apoyo y el vínculo opcional con la ficha, con la verificación que comprueba que el compromiso aparece en el historial del vecino | — | ✅ |
| **No se declara `color-scheme`**: los controles nativos (radios, casillas, fechas) se pintan en claro también en el tema oscuro. El B5 lo rodeó marcando la opción elegida en el contenedor, pero la causa afecta a todos los formularios | `tokens.css` | Media |
| **`TareaHistorial` sin usar**: RF-018 pide historial de transición y la bitácora de auditoría no lo reemplaza (es interna). Con la alerta, es lo que le falta a CA-03 | `tareas.routes.ts` | Media |
| ~~Roles `verificador` y `consulta` sin uso~~ → resuelto: se aplican en validación y en el alcance de la bandeja | — | ✅ |
| ~~Falta la API de `MetaItem`~~ → **resuelta** en el Bloque A2; ~~falta su pantalla~~ → **resuelta** en el Bloque B2 (`/metas`) | — | ✅ |
| ~~`PUT /metas-item` no aplica bloqueo optimista~~ → **resuelto** en el Bloque B2: cada meta existente debe traer su `version` | — | ✅ |
| ~~Falta la prueba visual de `/metas` con las seis cuentas~~ → **hecha**: encontró tres cosas, la mayor que un funcionario veía las metas de sus pares. Detalle en [estado-proyecto.md](estado-proyecto.md) | — | ✅ |
| **Ley 21.663 de ciberseguridad y Leyes 19.628 / 21.719 de datos personales**: reflejadas ya en **ADR-012**, en la consulta nº 12 y en el código de `/vecinos` (alcance por rol, detalle reducido, auditoría del acceso, rectificación). Falta llevarlas a los **RNF** del documento de requerimientos y al resto de las rutas | documentación y RNF | Media |
| ~~Dos cálculos conviviendo (vista v1 y motor v2)~~ → **resuelto** en el Bloque C: la vista, la tabla `metas`, `/metas`, `/kpis/cumplimiento`, `/kpis/recalcular` y el cron se eliminaron. `GET /kpis/tubo` se queda: nunca dependió de ese cálculo | — | ✅ |
| **Auditar si hay más columnas del modelo v2 que ninguna ruta usa.** El A3 encontró `UnidadTerritorial.activo` contradicha por su propio `DELETE`; el **Bloque C** encontró lo simétrico: una tabla entera (`metas`) que ninguna escritura mantenía. **Buscar tablas y columnas sin dueño, no solo sin lector** | `schema.prisma` contra `src/routes/` y `prisma/seed.ts` | Media |
| ~~El frontend no consume el modelo v2~~ → la ficha ya consume períodos, cumplimiento, actividades, evidencias y catálogos | `frontend/src/pages/FichaPage.tsx` | ✅ |
| ~~Dos tablas con el mismo propósito: `.tabla-detalle` y `.tabla-sgr`~~ → **resuelto** en el Bloque C: el dashboard usa `.tabla-sgr`, y `.tabla-orden`, `.tabla-fila--activa` y `.tabla-clickeable` pasaron a `base.css` como modificadores suyos | — | ✅ |
| ~~Sin endpoint de búsqueda de `PersonaUsuaria`~~ → **resuelto** en el Bloque B3: `/vecinos` con búsqueda por RUT y nombre, historial cruzado, aviso de duplicidad y rectificación de datos | — | ✅ |
| ~~**Las 3 gestiones de `AtencionSocial`** (RF-015, HU-03)~~ → **resueltas** en el Bloque B4: API, modal del caso en la ficha personal y el caso con su avance en el historial del vecino. **CA-04 cerrado** | — | ✅ |
| **Corregir una gestión ya registrada** no está resuelto: el `PATCH` solo toca la cabecera del caso. Decisión pendiente entre corregir con bloqueo optimista o anular y registrar de nuevo (ADR-013, consulta abierta nº 8) | `atenciones-sociales.routes.ts` | Media |
| El historial del vecino no pagina: trae hasta 500 hechos y la pantalla los pinta todos. Misma lección que la bandeja | `vecinos.routes.ts`, `VecinosPage.tsx` | Media |
| ~~El dashboard filtra por el string `2026-Q3`, no por `periodoId`~~ → **resuelto** en el Bloque C | — | ✅ |
| `Comentario` y `Ajuste` sin API ni pantalla | backend y frontend | Media |
| ~~**Panel de control de actividad de usuarios** (RF-030, HU-19)~~ → **resuelto** el 4 de septiembre: `/actividad` con las tres preguntas del docente, presencia por organización en un room propio del nivel central, umbral configurable y auditoría del acceso. La ambigüedad de «ingresar» queda **documentada como supuesto**, no resuelta en silencio ([ADR-015](decisiones-tecnicas.md), [requerimientos §9.ter](requerimientos-oficiales.md)) | — | ✅ |
| **Alerta automática cuando alguien cruza el umbral** (RF-037): el panel avisa en pantalla, pero no envía nada a nadie. Es la mitad que le falta a HU-19 y comparte diseño con las alertas de HU-31 | backend | Media |
| Alertas (RF-037, HU-31) sin diseñar | — | Media |
| Exportación de informes (RF-033, HU-20) sin implementar | — | Media |
| ~~Sin estrategia de ramas documentada~~ → **resuelta**: [README §Estrategia de ramas y versiones](../README.md), con etiquetas de rollback por bloque | README | ✅ |
| **El Planner existe pero no cuenta el trabajo hecho**: Desarrollo, Pruebas y Piloto vacíos, y sin tarea para el diagrama de requerimientos. El docente dijo que SOLO revisará el Planner (clase del 1-09-2026), así que lo que no esté adjunto ahí no se evalúa. ⚠ El CSV de 58 tareas está desfasado y sus títulos chocan con los de Héctor: reconciliar antes de cargar | `docs/plan-desarrollo.csv`, Planner | **Alta** |
| **Entrega del 15 de septiembre**: plan operativo en [plan-entrega-15-septiembre.md](plan-entrega-15-septiembre.md), contra la rúbrica oficial. La [guía en .docx](Guia-Entregables-15-septiembre.docx) es del 1 de septiembre (`v0.7.1`) y quedó desfasada: sirve su paso a paso y su ficha de ejemplo de CU-03, no su estado | documentación | **Alta, con fecha** |
| 🔴 **`docs/diagramas.md` describe el modelo v1**: `metas`, la vista materializada, el cron y umbrales «50-79» que nunca existieron. Cuatro diagramas del 25 de agosto. Presentarlos en la entrega sería describir un sistema que no es el nuestro | `docs/diagramas.md` | **Alta** |
| **No existe diagrama de clases** (15 pts de la rúbrica) ni **casos de uso con ficha** (20 pts). Es el 35% de la nota de la primera evaluación | `docs/entrega/` | **Alta** |
| ~~`README.md` dice «11 ADR»~~ ✅ **corregido**, dice 15. Sigue pendiente: `historias-usuario.md` está en las 20 historias propias sin decir que **las 31 oficiales mandan** sobre ellas | `docs/historias-usuario.md` | Media |
| **El anti-trampa de las emergencias funciona a medias.** El cliente lo pidió expresamente (reunión 01:09:46: *"hay gente que se aprovecha de la emergencia y hace mil cosas"*) y tiene tres palancas: el **tope por ítem** ✅, la **emergencia como ítem al 5%** ✅ y el **descuento de los días de emergencia** del objetivo al día — que el motor sí aplica, pero **`Ausencia` no tiene API ni pantalla**, así que hoy esos días solo se cargan en la base. Es la pieza que falta para que el control sea usable. Consulta abierta nº 14 | `Ausencia`, sin ruta | **Alta** |
| Falta alternativa por teclado en el drag & drop (dnd-kit `KeyboardSensor`) | `KanbanBoard.tsx` | Media |
| **`GET /cumplimiento/:periodoId` entrega el detalle por funcionario a todos los roles.** El consolidado del tablero no lo necesita, pero el detalle individual roza la consulta abierta nº 11. Detectado en el Bloque C, anotado y no cambiado en silencio | `cumplimiento.routes.ts` | Media |
| **El seed tarda ~15 minutos**: genera y escribe ~2.400 PNG de evidencia uno por uno. Se arregla escribiendo en paralelo; no bloquea nada, pero conviene saberlo antes de correrlo | `prisma/seed.ts` | Baja |
| `npm audit`: 3 vulnerabilidades en el CLI de Prisma (dev, no producción) | — | Baja |

## 5. Las 14 consultas al docente

Están en [requerimientos-oficiales.md §10](requerimientos-oficiales.md), con tabla de impacto al inicio. **No inventar respuestas.** Mientras no lleguen, los valores viven en `parametro` con `confirmado: false`. Cinco nacieron construyendo: la **8** (si una aprobación puede revertirse), la **9** (si el verificador es transversal o por delegación), la **10** (antivirus y retención de evidencias, RNF-017 — la única que puede implicar costo), la **11** (si un funcionario ve las metas de sus pares) y la **12** (quién consulta la ficha del vecino y con qué ventana se avisa la duplicidad — la única sobre datos de **terceros**, y la de mayor peso legal). Las dos que más impactan en el cálculo:

1. **Felicitación y reclamo**: el PDF dice −20% y −30%; la planilla muestra +10% (máx. 3) y −20%; el audio decía "+10, máx. 1 mensual".
2. **Tope de 150%**: la planilla lo declara en el encabezado pero muestra valores de 154% y 206% sin recortar. ¿Se aplica o solo se informa?

Cuando lleguen: cambiar el valor en `parametro`, poner `confirmado: true`, y actualizar la fila correspondiente en `requerimientos-oficiales.md §10`. **Sin tocar código.**

## 6. Trampas del entorno (ya nos costaron tiempo)

- **`prisma migrate dev` es interactivo y falla aquí.** Usar `migrate diff` + `migrate deploy` (receta en CLAUDE.md).
- **PowerShell agrega BOM** con `Out-File -Encoding utf8`; Postgres rechaza el archivo. Escribir con `UTF8Encoding($false)`.
- **`Get-Content` + `Set-Content` sobre un archivo con acentos lo corrompe.** PowerShell 5.1 lo lee como ANSI y lo reescribe mal: `código` queda `cÃ³digo`. Pasó al actualizar los conteos de CLAUDE.md y README.md, y se arregló con `git checkout -- <archivo>`. **Para editar documentación usar las herramientas de edición, no reemplazos por consola.**
- **`prisma generate` falla si el servidor dev está corriendo** (bloquea el `.dll` del motor). Detenerlo antes.
- **Here-strings de PowerShell con comillas dobles rompen `git commit -m`.** Usar `git commit -F archivo.txt`.
- **`git merge -m` con here-string también falla** (a veces git recibe una palabra suelta del mensaje como si fuera una rama, y la etiqueta termina en el commit equivocado). Receta segura: `git merge --no-ff --no-commit <rama>` y después `git commit -F archivo.txt`. **Etiquetar solo después de comprobar con `git log --oneline -1` que el merge existe.**
- **El puerto 4000 puede quedar ocupado por un `tsx watch` huérfano de una sesión anterior**, y es peor de lo que parece: `npm run dev` muere con `EADDRINUSE` **en su log, no en pantalla**, el proceso viejo sigue respondiendo (recompila solo, así que hasta los endpoints nuevos funcionan) y uno depura sin ver ningún log. Pasó al construir el Bloque A2 y costó una vuelta entera. Receta:
  ```powershell
  Get-NetTCPConnection -LocalPort 4000 -State Listen | Select-Object OwningProcess
  Stop-Process -Id <pid> -Force
  ```
  Si una verificación falla de forma inexplicable, **lo primero es confirmar de quién es el servidor que responde**.

  ⚠ **Matar al que escucha no basta**: quien escucha es el *hijo* que `tsx watch` lanza, y el vigilante lo **respawnea** en segundo o dos. Pasó otra vez en el Bloque A3, con un `tsx watch` del día anterior. Hay que subir al padre y matar el árbol:
  ```powershell
  $p = (Get-NetTCPConnection -LocalPort 4000 -State Listen).OwningProcess
  Get-CimInstance Win32_Process -Filter "ProcessId=$p" | Select-Object ParentProcessId, CommandLine
  Stop-Process -Id <hijo>,<padre> -Force
  ```
  La señal de que quedó uno vivo es que `npm run dev` muere con `EADDRINUSE` **en su log** y `curl /health` responde 200 igual.
- **`npm run verificar:api` necesita el servidor corriendo** (como el smoke) y toca la base: crea un período, un cargo, ítems, actividades y una evidencia, y **los borra al terminar**. Si se interrumpe a la mitad, quedan datos de prueba: `npx prisma db seed` los limpia.
- **Probar cada pantalla con los seis roles, no solo con el propio.** Dos errores reales aparecieron así: el tubo se quedaba cargando para siempre con el verificador (no tiene delegación) y la bandeja escondía lo recién subido. Ninguna prueba automatizada los habría visto: son de pantalla.
- **El seed deja 88 evidencias pendientes**: cualquier cosa que se registre al probar cae al final de la cola de la bandeja. Para verla, usar el orden **"Recientes primero"**. Toda lista nueva que se construya debe decir "N de TOTAL" y paginar; una lista que oculta el resto en silencio hace creer que el sistema perdió el dato (pasó, y quedó cubierto con dos verificaciones).
- Al agregar un parámetro nuevo a `services/parametros.ts` hay que **volver a sembrar** (`npx prisma db seed`) o el endpoint que lo lee falla con "parámetro no configurado".
- **El 5173 también deja huérfanos**: un `vite` de una sesión de una semana atrás seguía sirviendo. Misma receta que el 4000 (`Get-NetTCPConnection -LocalPort 5173 -State Listen` → `Stop-Process`).
- **`scripts/capturas.mjs` usa `playwright-core` con `channel: "msedge"`**: no descarga navegador (costo cero) y necesita los dos servidores arriba. Se corre desde `frontend/` (un script en otra carpeta no resuelve el paquete). Las capturas van a una carpeta fuera del repo: **no se commitean** (pesan y podrían mostrar datos).
- **Un elemento `position: absolute` "oculto" (`.sr-only`) sin ancestro `relative` ensancha el documento** aunque esté dentro de una envoltura con scroll. Se ve solo en móvil y solo midiendo: la captura sale más ancha que el viewport.
- **Un aviso que marca de más deja de avisar.** El de duplicidad marcaba por nombre de delegación y, como las dos estaban implicadas, pintaba 21 de 35 hitos: una señal que cubre media pantalla se lee como fondo. Ahora el backend devuelve las claves de los hechos implicados. Vale para cualquier resaltado: **señalar el hecho, no la categoría a la que pertenece**.
- **Un dato que nadie regenera es peor que un dato que falta.** El dashboard mostró durante semanas 24 filas de la tabla `metas` que ningún seed poblaba y ninguna escritura mantenía, y las cuentas `@demo.cl` seguían en la base meses después de que la documentación las diera por borradas (el seed las creaba con `upsert`: dejar de nombrarlas no las quita). Peor todavía, **una comprobación del smoke pasaba gracias a esos fósiles**. Al auditar, comprobar contra la base, no contra el documento: `SELECT count(*)` cuesta diez segundos.
- **`tsx watch` deja huérfanos que se acumulan.** Al abrir el Bloque C había **cinco** vigilantes vivos de sesiones anteriores peleando por el 4000, ninguno escuchando. Antes de levantar el servidor, listar los `node.exe` y matar el árbol completo, no solo al que escucha.
- **Los datos de demostración son parte del entregable.** El caso que la especificación pide demostrar (CA-04) hay que armarlo a propósito en el seed, con su reparto y sus fechas pensados. La primera versión asignaba el vecino en `n % 12 === 0` y, como `n` es el día del período, todas las primeras atenciones caían el mismo día: la línea de tiempo era un muro de «1 jul 2026». No lo habría visto ninguna prueba de API.
- **En flex, un SVG cede antes que un párrafo.** El icono del aviso se aplastaba a un hilo en móvil. `flex-shrink: 0` en todo icono que acompañe a un texto largo.
- **Una pantalla que nace vacía necesita una URL que la llene** para poder capturarla o generar su mockup. `/vecinos` acepta `?q=` y `?id=`, que además sirven para compartir el enlace de una ficha.
- **El contraste no se juzga a ojo**: 4.1:1 y 4.5:1 se ven iguales. `npm run verificar:contraste` antes de cada merge que toque `tokens.css` o un color de texto.
- **Un mockup .html no se da por bueno hasta abrirlo desde `file://` sin red**: ECharts pinta en `<canvas>` y esos píxeles **no** sobreviven a serializar el HTML (el tablero salía con las tarjetas vacías). Se convierte cada canvas a `<img>` **conservando su `style`**, porque ECharts apila capas absolutas y sin eso el heatmap pierde las celdas. Lo cubre `npm run verificar:mockups`.
- **Un SVG de escena que sangra hasta los bordes necesita `meet` + `aspect-ratio` para no recortarse, y entonces el "suelo" (mar, tierra) debe extenderse fuera del viewBox** con `overflow: visible`; si no, a un ancho distinto del que se probó aparece un rectángulo. Probar el arte a 1900, 1440 y 390 px, no a uno solo.

## 7. Definición de terminado

Una historia está terminada cuando:
1. Cumple su criterio de aceptación del PDF (Dado/Cuando/Entonces).
2. Tiene **verificación automatizada** que lo demuestra.
3. Está en [matriz-trazabilidad.md](matriz-trazabilidad.md) con commit, prueba y resultado.
4. `npm run build` pasa en backend y frontend.
5. Si toca la UI, cumple DESIGN.md (incluida §8.1 accesibilidad y §3.3 los dos rojos), pasa `npm run verificar:contraste` y se miró con las seis cuentas (`scripts/capturas.mjs`).
