# Estado del proyecto — SGR

**Actualizado**: 1 de septiembre de 2026 · `main` en `v0.7.1-metas-privacidad`
**Verificación**: 133 comprobaciones automatizadas en verde (17 smoke + 21 cálculo + 95 API)

Este documento es la fuente de verdad del avance. Se actualiza al cerrar cada bloque.
Lo vigente está arriba; el registro histórico de las fases, al final.

---

## 1. Cuentas de demostración y roles — FUENTE ÚNICA

⚠ **Las únicas cuentas válidas son las `@sgr.demo` del seed v2.** Las `@demo.cl` de las Fases 2 y 3 se borraron al reescribir el seed con datos ficticios; si un documento, script o captura las menciona, está desactualizado. Contraseña de todas: `matriz123`.

**Roles**: el enum tiene seis, que son los seis actores del PDF §3. El nombre técnico **no coincide con el cargo municipal**: lo que el cliente llama "coordinador" es el rol `supervisor`, y "delegado" es `gerente`. En código va el enum; en pantalla, la palabra del municipio.

| Correo (`@sgr.demo`) | Nombre ficticio | Rol (enum) | Se le dice | Cargo | Delegación |
|---|---|---|---|---|---|
| `admin` | Ana Contreras Bravo | `admin` | Administrador | — | nivel central |
| `coordinador` | Carlos Miranda Soto | `supervisor` | Coordinador | — | nivel central |
| `verificador` | Valeria Ortega Lillo | `verificador` | Verificador | — | transversal (sin libro) |
| `consulta` | Camila Fuentes Rivas | `consulta` | Usuario de consulta | — | sin libro |
| `delegado.centro` | Diego Salinas Peña | `gerente` | Delegado | — | Centro |
| `delegado.rural` | Daniela Aguirre Mella | `gerente` | Delegado | — | Rural |
| `apoyo.centro` | Paula Herrera Vidal | `usuario` | Funcionario | Apoyo Administrativo | Centro |
| `territorial.centro` | Gabriel Muñoz Reyes | `usuario` | Funcionario | Territorial OO.CC. 1 | Centro |
| `social.centro` | Javiera Cáceres Núñez | `usuario` | Funcionario | Gestor Social 1 | Centro |
| `diserco.centro` | Rodrigo Valenzuela Pino | `usuario` | Funcionario | Coordinador DISERCO | Centro |
| `planificacion.centro` | Elena Tapia Godoy | `usuario` | Funcionario | Planificación y Control | Centro |
| `territorial.rural` | Ignacio Bustos Farías | `usuario` | Funcionario | Territorial OO.CC. 1 | Rural |
| `social.rural` | Marcela Rojas Leiva | `usuario` | Funcionario | Gestor Social 1 | Rural |

Las **siete personas con cargo** son las únicas que tienen metas y aparecen en el cálculo: sin cargo no hay ítems, y sin ítems no hay medición.

**Para probar con los seis roles** (regla que ya detectó tres errores reales): `admin@` · `coordinador@` · `verificador@` · `consulta@` · `delegado.centro@` · `territorial.centro@`.

---

## 2. Estado en una página

| Capa | Estado |
|---|---|
| Documentación y especificación | ✅ Completa y contrastada con el PDF oficial |
| Modelo de datos (16 entidades v2) | ✅ Migrado, con garantías en la base |
| API del modelo v2 | ✅ Períodos, cargos, ítems, metas, actividades, evidencias, validación, cumplimiento y catálogos |
| Pantallas | ✅ Tubo, ficha personal, bandeja, configuración de metas, dashboard |
| Identidad visual de La Serena (DESIGN §10) | ✅ Tokens, barra, login con el faro, tipografía; verificada por script y con capturas de los seis roles |
| Tiempo real | ✅ Socket.io con rooms por delegación y organización |
| Dashboard sobre el motor v2 | 🟡 Aún lee la vista materializada v1 (Bloque C) |
| Pantallas de administración | 🟡 Falta períodos, cargos y catálogos |
| Ficha del vecino | ⬜ Necesita endpoint de búsqueda de `PersonaUsuaria` |
| Informes, exportación y alertas | ⬜ |
| Pruebas formales (Jest/RTL) y CI | ⬜ |
| Despliegue | ⬜ |

**Contra los 38 RF oficiales: 16 ✅ · 13 🟡 · 9 ⬜** (al recibir la especificación: 5 · 13 · 20).

El eje **actividad → código → evidencia → validación → puntaje** funciona de extremo a extremo, y la configuración que lo alimenta (**cargo → ítems → metas**) también.

---

## 3. Contrato de la API (puerto 4000)

Auth: header `Authorization: Bearer <JWT>`. El token lleva `{userId, organizationId, rol, nombre}`. **Toda consulta filtra por el `organizationId` del token; un recurso de otro tenant responde 404, nunca 403.**

### 3.1 Núcleo del modelo v2

| Endpoint | Roles | Notas |
|---|---|---|
| `GET /periodos[?estado=abierto]` · `GET /periodos/:id` | todos | Devuelve `diasTotales`, `diasTranscurridos` y `porcentajeTranscurrido` **calculados desde las fechas** (prohibido fijar 90/91) |
| `POST /periodos` | admin, supervisor | Rechaza solapamiento (422) y nombre duplicado (422) |
| `PATCH /periodos/:id` | admin, supervisor | Exige `version`; período cerrado → 422 |
| `POST /periodos/:id/cierre` | admin, supervisor | `{version}`. Congela el período (RN-013) |
| `POST /periodos/:id/reapertura` | **solo admin** | `{version, motivo}` — el motivo queda en la bitácora (RN-013, CA-10) |
| `GET /cargos[?incluirInactivos=1]` · `GET /items[?cargo=]` | todos | El funcionario necesita ver qué se le mide (RF-008) |
| `POST/PATCH /cargos` · `POST/PATCH /items` | admin, supervisor | No hay DELETE: se desactiva. `PATCH` exige `version`. El `cargoId` de un ítem no se mueve |
| `GET /metas-item?periodo=&funcionario=&item=` | todos, **acotado por delegación** | `{total, metas, resumen}`. El resumen trae `sumaPonderadores`, `cumpleRN001` y `faltante` |
| `POST /metas-item` | admin, supervisor | Rechaza **superar** el 100% (422 con `disponible`). Valida meta > 0, ítem del cargo, ítem activo, duplicado y período abierto |
| `PATCH /metas-item/:id` | admin, supervisor | Solo meta y ponderador. Exige `version` → 409 |
| `DELETE /metas-item/:id` | admin, supervisor | Protegido si el ítem ya acumuló avance aprobado → 422 (RN-009) |
| `PUT /metas-item` | admin, supervisor | Conjunto completo de una persona, en transacción, **exigiendo el 100% exacto**. Cada meta existente debe traer su `version` → 409 |
| `GET /actividades?periodo=&funcionario=&item=&unidad=&fechaDesde=&fechaHasta=&limite=&desde=` | todos, acotado por delegación | Paginado. Delegación ajena → 404 |
| `POST /actividades` | usuario, gerente, supervisor, admin | La delegación se deriva de la membresía. Valida período abierto, fecha dentro del período, ítem del cargo, RUT y teléfono. Devuelve `alertaTrazabilidad` si esa persona ya fue atendida en otra delegación |
| `PATCH /actividades/:id` | autor, jefatura, nivel central | Exige `version`. Con evidencia **aprobada** → 422 con `accionSugerida` |
| `POST /actividades/:id/anulacion` | ídem | `{version, motivo}` — baja lógica, deja de sumar |
| `POST /actividades/:id/evidencias?nombre=` | ídem | **Cuerpo = archivo crudo**, `Content-Type` = su MIME. Formato → catálogo (415); tamaño → parámetro (413) |
| `GET /evidencias?estado=&periodo=&unidad=&orden=&limite=&desde=` | todos; el verificador ve todas | Cola paginada, con "N de TOTAL" |
| `GET /evidencias/:id` · `GET /evidencias/:id/archivo` | ídem | El archivo pasa por autorización, no es estático |
| `POST /evidencias/:id/validacion` | verificador, supervisor, admin | `{decision, observacion}`. Tres decisiones; observación obligatoria si no aprueba; **nadie valida lo propio**; una aprobación no se re-decide |
| `GET /cumplimiento/:periodoId[?unidad=&funcionario=]` | todos | Motor v2 por funcionario + `parametros` usados con su marca `confirmado` + `resumen` por semáforo |
| `GET /catalogos?catalogo=` | todos | Solo lectura. El CRUD de HU-27 está pendiente |
| `GET /usuarios[?unidad=]` | todos | Directorio con `cargo` y **`cargoId`** — es lo que dice qué ítems se le miden |

### 3.2 Rutas heredadas del modelo v1

⚠ **No todas son obsoletas.** Tres sostienen requisitos oficiales vigentes y hay que **endurecerlas**; dos están muertas y hay que **borrarlas**.

| Endpoint | Veredicto | Por qué |
|---|---|---|
| `GET/POST/PATCH/DELETE /tareas` | **Se queda — endurecer** | Es el tubo de trabajo: EP-04, RF-016 a RF-021, HU-12 a HU-15. `Tarea` tiene campos v2 y su `TareaHistorial` (RF-018). Le falta `version` → 409 y auditoría |
| `GET/POST/PATCH/DELETE /unidades` | **Se queda — endurecer** | Delegaciones, RF-001. La usan cuatro pantallas. Le falta `version` y auditoría |
| `GET/POST/PATCH/DELETE /categorias` | **Se queda — endurecer** | Clasificación del tubo. Podría converger a `CatalogoItem` más adelante |
| `GET/PUT/PATCH /metas` (unidad × categoría × trimestre) | **Muere — borrar** | Reemplazada por `/metas-item`. **El frontend ya no la llama.** No se puede borrar todavía porque la vista materializada v1 depende de la tabla `Meta` |
| `GET /kpis/cumplimiento` · `POST /kpis/recalcular` | **Muere con el Bloque C** | Lee la vista materializada v1, por delegación y con umbrales fijos en SQL |
| `GET /kpis/tubo` | **Se queda** | Conteos agregados del tubo; es independiente del cálculo v1 |

## 4. Contrato de Socket.io (mismo puerto)

- Conexión: `io(url, { auth: { token } })` — sin token válido el handshake se **rechaza**.
- Al conectar, el socket entra automáticamente a `org:<organizationId>`.
- El cliente emite `unidad:join` con `unidadId` (ack booleano) → entra a `unidad:<id>`. **Ojo**: el servidor emite `presencia:actualizada` ANTES del ack; registrar el listener antes del join.
- Límites: 10 mensajes/s por socket, payload máximo 100 KB.

| Room | Eventos |
|---|---|
| `unidad:<id>` | `tarea:creada/actualizada/eliminada`, `presencia:actualizada`, `actividad:creada/actualizada/anulada`, `evidencia:creada`, `validacion:registrada`, `meta_item:creada/actualizada/eliminada` |
| `org:<id>` | `unidad:*`, `categoria:*`, `meta:actualizada/eliminada`, `periodo:creado/actualizado/cerrado/reabierto`, `cargo:*`, `item:*`, `evidencia:pendiente`, `cumplimiento:cambiado`, `cumplimiento:recalculado` |

Todas las cargas de `meta_item:*` llevan `periodoId` y `funcionarioId` **en la raíz**: es lo único que el oyente necesita para saber si le toca releer.

**Regla**: todo write pasa por `emitEvent()` de `services/broadcast.ts`. Endpoint mudo = bug.

---

## 5. Modelo de datos

Migración `20260901120000_modelo_v2_especificacion_oficial`: **16 entidades** que cubren la especificación oficial.

| Entidad | Cubre |
|---|---|
| `Periodo` | RF-005 · fechas configurables, días calculados, cierre auditado |
| `Parametro` | RF-038 · RNF-015 · valores de negocio fuera del código, con vigencia por período |
| `Cargo` + `ItemMedicion` | RF-003 · la abstracción cargo → ítems, con `tipo` y `direccion` |
| `MetaItem` | RF-007 · meta y ponderador por **funcionario**, ítem y período |
| `Actividad` | RF-009 · RF-011 · el registro diario, con código único e inmutable |
| `Evidencia` + `Validacion` | RF-012 a RF-014 · RN-009 · solo lo aprobado suma |
| `PersonaUsuaria` | RUT único **por organización** → trazabilidad entre delegaciones |
| `AtencionSocial` | RF-015 · RN-012 · las tres gestiones del área social |
| `Ausencia` | días descontados del objetivo al día, por persona |
| `Ajuste` | RF-025 · felicitaciones y reclamos, parametrizados |
| `CatalogoItem` | RF-004 · catálogos que se desactivan sin borrar historia |
| `Tarea` + `TareaHistorial` | RF-016 a RF-021 · la agenda colectiva y su historial |
| `Comentario` | RF-035 · observaciones contextuales |
| `Auditoria` | RNF-008 · RF-036 · **solo-inserción, garantizado por triggers** |

Además: `version` para bloqueo optimista en toda tabla editable, y los roles `verificador` y `consulta`.

### 5.1 Garantías en la base, no solo en el código

Lo que Prisma no expresa, agregado por SQL en la migración:

- Triggers que **rechazan `UPDATE` y `DELETE` sobre `auditoria`**. Verificado: la operación falla.
- Trigger que **impide cambiar `actividades.codigo`** (RF-011).
- `CHECK` de formato canónico de RUT en `users` y `personas_usuarias`. Verificado: rechaza `17.721.947-9` con puntos.
- `CHECK` de fechas coherentes en `periodos`, y de meta > 0 y ponderador en rango.
- Índice único `(periodo, ítem, funcionario)` en `metas_item`, que sostiene RN-001.

### 5.2 Utilidades y servicios

`lib/rut.ts` · `lib/fechas.ts` · `lib/persona.ts` · `lib/telefono.ts`
`services/`: `parametros`, `auditoria`, `codigos`, `cumplimiento` (motor por funcionario), `concurrencia`, `alcance`, `almacenamiento`, `broadcast`.

### 5.3 Seed

100% ficticio: 6 delegaciones, 5 cargos con sus ítems y ponderadores que suman 100%, 8 catálogos, 13 personas, 3 vecinos, 16 tareas con historial y **1.129 actividades con evidencia y validación**. Regenera lo transaccional en cada corrida; los datos maestros van con upsert.

⚠ Al agregar un parámetro nuevo a `services/parametros.ts` hay que **volver a sembrar**, o el endpoint que lo lee falla con "parámetro no configurado".

---

## 6. Las pantallas

Todas siguen los criterios que **DESIGN §8.2 fijó antes** de construirlas, y desde el Bloque D0 llevan la identidad de la Municipalidad de La Serena (DESIGN §10).

### 6.0 Identidad (Bloque D0, 02-09-2026) — DESIGN §10, ADR-010, ADR-011

- **Login** (`/login`): dos paneles. Heráldico con la marca, la frase del producto y el Faro Monumental en SVG (`components/FaroSerena.tsx`); formulario sobre superficie sólida. El haz del faro barre **solo mientras autentica**. Declara ejercicio académico sin escudo.
- **Barra lateral** sobre el heráldico, marca ●▲■ en un solo tono, wordmark **SGR**. En móvil es la cabecera.
- **Tipografía**: Libre Franklin + General Sans en pantalla; Arial en `@media print`.
- **Los dos rojos** no se mezclan: `--marca`/`--acento` fuera de las zonas de datos; ahí lo seleccionado es `--seleccion` y el único rojo es el del estado.
- **Verificación**: `npm run verificar:contraste` (83/83) y `node scripts/capturas.mjs` (seis cuentas × dos temas × escritorio y móvil).
- **Vida (Bloque D1, 02-09-2026, DESIGN §3.6)**: dos regímenes de movimiento. *Ambiente* en las zonas de identidad: el faro del login gira e ilumina el mar, olas a tres velocidades, estrellas y astro; la barra lleva una escena de La Serena —San Francisco, jarro pato diaguita, cúpula de La Recova, El Miliciano, papayo, faro con ventanas encendidas, cerros, camanchaca y greca diaguita— (`SiluetaSerena`); el marcador del menú se desliza (motion `layoutId`). *Estado* en las zonas de datos: la cifra hero cuenta (`useContador`), el chip hero late en rojo. Feedback de hover en todo lo clickeable. Períodos primos, solo transform/opacity, apagado global con `prefers-reduced-motion` y `MotionConfig`.

### 6.1 Tubo de trabajo (`/`) — EP-04

Kanban con dnd-kit, tiempo real y presencia. Actualización optimista con reversión y aviso si el PATCH falla. Permisos espejo del backend (que sigue siendo la autoridad). El libro es **privado por delegación**; el verificador no tiene libro y ve un vacío que lo explica.

⚠ Pendiente de accesibilidad: falta la alternativa por teclado del arrastrar y soltar (`KeyboardSensor` de dnd-kit).

### 6.2 Ficha personal (`/ficha`) — RF-008, HU-06

La pantalla más importante: la "pestaña personal" de la planilla. Tres bloques: cabecera con semáforo y una cifra hero, tabla de ítems medidos, y registro de actividades con la fila de alta **siempre visible arriba** (registrar es lo que estas personas hacen varias veces al día).

- **Ningún dato se calcula en el cliente**: todo viene de `GET /cumplimiento/:periodoId`. Incluso "hoy" se deriva del período que devuelve el servidor.
- Formatos aceptados y tamaño máximo se anuncian **antes** de elegir el archivo.
- La evidencia no se enlaza con un `src` directo: el endpoint exige JWT, así que se descarga por fetch y se muestra desde un object URL que se revoca al cerrar.
- Al llegar `validacion:registrada` recarga cumplimiento y actividades **juntos**, para que la cifra de arriba y el estado de la fila nunca cuenten cosas distintas.

### 6.3 Bandeja del verificador (`/verificacion`) — RF-013, HU-11

Aquí el punto se otorga o se niega. Es una **lista de trabajo, no un tablero**: cola a la izquierda, foto grande a la derecha, tres acciones equidistantes.

- Tres decisiones: aprobar · solicitar corrección · rechazar. Las dos últimas exigen observación.
- **Teclado completo** con las teclas visibles en pantalla: `J` siguiente, `K` anterior, `Enter` aprobar.
- Orden según el estado: lo pendiente de más antiguo a más nuevo (es una cola); lo decidido al revés (es un historial). Selector para invertirlo.
- Paginación explícita con "N de TOTAL" y "Cargar más".
- `evidencia:pendiente` muestra un aviso, **no recarga sola**: mover la cola bajo el cursor de quien decide es la forma más rápida de provocar un error.

### 6.4 Configuración de metas (`/metas`) — RF-006, RF-007, HU-05

Donde se decide qué se le mide a cada persona y con qué peso.

- **La suma es el protagonista**: totalizador con cifra, barra y texto que dice en todo momento `cuadrado en 100%` · `falta 15%` · `se pasa por 8%`.
- **Todos los ítems del cargo se muestran**, tengan meta o no: uno oculto es uno que nadie recuerda repartir.
- Se guarda el conjunto con un `PUT`, no fila por fila.
- **Repartir 100% en partes iguales** a un clic, con el redondeo en el último ítem.
- Lo que ya sumó puntaje no se puede quitar: casilla desactivada con su razón. El dato sale de `GET /cumplimiento`, sin endpoint nuevo.
- Solo la jefatura ve las metas de otros (ver consulta abierta nº 11).

### 6.5 Dashboard (`/dashboard`) — EP-05

ECharts modular con carga perezosa: gauges por delegación, heatmap semántico con escala discreta del semáforo, dumbbell de proyección, radar en énfasis, tubo apilado y tabla ordenable. Filtros cruzados: al hacer clic en cualquier gráfico se filtra todo. Todos los gráficos leen los tokens vivos y cambian con el tema sin recargar.

⚠ **Aún lee la vista materializada v1** (por delegación, con umbrales fijos en SQL). Migrarlo al motor v2 es el Bloque C.

### 6.6 Piezas reutilizables

`ChipSemaforo` (obliga a poner símbolo + texto, nunca solo color) · `MarcaSemaforo` (con `mono` para zonas de identidad) · `FaroSerena` · `.tabla-sgr` · `.btn-peligro` (contorno) · `.btn-tabla` · `useUnidadSocket` · `useOrgSocket` · `useArchivoEvidencia` · `useTokens` (los gráficos leen los tokens vivos; `colorCategoria()` devuelve `var(--cat-N)`).

⚠ Deuda: `.tabla-detalle` del dashboard y `.tabla-sgr` son dos tablas con el mismo propósito. Convergen en el Bloque C.

---

## 7. Decisiones tomadas (no re-discutir sin motivo)

**Arquitectura y datos**

1. Backend en TypeScript estricto: `npm run build` debe pasar siempre.
2. `tareas.estado` es string libre, no enum: las columnas del kanban son configurables por tenant.
3. No hay orden intra-columna en el kanban: se ordena por `fechaCompromiso`.
4. IDs `uuid` en columna **text**, no tipo `uuid` de Postgres (no castear `::uuid` en SQL crudo).
5. `req.params.id` se normaliza con `String()` (Express 5 lo tipa `string | string[]`).
6. Token en `localStorage` (clave `matriz.auth`); refresh token queda para más adelante.

**Frontend**

7. React 18.3, no 19: `echarts-for-react` declara peers hasta 18.
8. `fetch`, no axios: una dependencia menos.
9. CSS3 plano con los tokens de DESIGN.md. Sin Tailwind, sin UI kits.
10. Colores de categoría: 6 tokens `--cat-1..6` asignados por `ordenPrioridad`, ninguno rojo.

**Identidad (Bloque D0)**

24. **Libre Franklin + General Sans en pantalla; Arial en lo impreso y exportado** (ADR-010). Si el municipio exigiera Arial en pantalla, es un token.
25. **Los dos rojos se separan por rol, zona y forma, no por matiz** (ADR-011). El semáforo no cambió. `--marca`/`--acento` nunca dentro de una zona de datos; ahí, `--seleccion`.
26. **El wordmark es "SGR"**, el producto. "Matriz SGR" es la planilla del cliente.
27. **La frase del producto es una sola**: «Lo que se atiende, se registra; lo que se registra, avanza». Los microtextos nuevos deben sonar a ella.
28. **El escudo municipal no se usa** sin visto bueno del Departamento de Comunicaciones Estratégicas (Artículo 3 del reglamento). El login lo declara.
29. **El movimiento significa estado**: el haz del faro barre solo mientras el sistema autentica. Toda animación nueva entra con su apagado en `prefers-reduced-motion`.
30. **Todo cambio visual pasa por `verificar:contraste` y por las capturas de los seis roles** antes de fusionarse.
31. **Dos regímenes de movimiento** (DESIGN §3.6): *ambiente* solo en las zonas de identidad (login, barra), con períodos primos, nunca debajo de un texto; *estado* en las zonas de datos. La lista negra 9 se reescribió así.
32. **Sin Tailwind, también para la animación**: todo lo de ambiente es CSS (`@keyframes`) y lo que CSS no hace lo hace `motion/react`, que ya estaba en el proyecto. La evaluación tecnología por tecnología no se reabre.
33. **`MotionConfig reducedMotion="user"`** en la raíz y red de seguridad global en `base.css`: ninguna animación, de CSS o de la librería, sobrevive a `prefers-reduced-motion`.

**Registro y validación**

11. **Subida de evidencia sin multipart**: el cuerpo es el archivo crudo. Evita una dependencia y el nombre del cliente nunca llega al disco — la ruta se deriva del código inmutable.
12. **El tope de subida tiene dos capas**: `LIMITE_SUBIDA_HTTP` (env, infraestructura) y `evidencia_tamano_max_mb` (parámetro de negocio).
13. **Una aprobación es final**: cambiarla alteraría un puntaje ya contabilizado. Para corregir se anula la actividad y se registra otra.
14. **El verificador ve todas las delegaciones**, pero **solo para evidencias**: no se amplió su acceso al libro ni al tubo.
15. **Los períodos no se solapan**: si lo hicieran, una actividad caería en dos y se contaría dos veces.
16. **La anulación se audita como `eliminar`**: la fila permanece, deja de sumar y conserva su motivo.

**Metas**

17. **Dos exigencias para RN-001**: el alta unitaria rechaza *superar* el 100%; el `PUT` del conjunto exige el 100% *exacto*. Cargando de a una es imposible pasar por el 100% sin estar antes por debajo; un conjunto completo que no cuadra sí es un error.
18. **La tolerancia de RN-001 es `0.0001`**, el ULP de `Decimal(5,4)`. No es valor de negocio (el 100% lo fija la regla), así que no va a `parametro`.
19. **Una meta con avance aprobado no se quita**, ni por `DELETE` ni dejándola fuera de un `PUT`.
20. **El versionado que pide RF-007 es el período**: la meta cuelga de `periodoId`, así que reconfigurar el trimestre siguiente nunca toca el cerrado.

**Contratos e interfaz**

21. **Todas las cargas de `meta_item:*` llevan `periodoId` y `funcionarioId` en la raíz.**
22. **Un selector no ofrece lo que el servidor va a rechazar.** Vale para toda lista de elección: se filtra por el mismo alcance que aplica el backend, y si queda vacía se explica por qué.
23. **Multi-tenant**: un recurso ajeno o inexistente responde 404. Un identificador mal formado responde 400 (es sintaxis, no alcance).

---

## 8. Lo que aprendimos probando (errores reales, no hipotéticos)

Ninguno lo detectó una prueba automatizada: todos aparecieron recorriendo el flujo o mirando la pantalla con cuentas distintas. El patrón se repite lo suficiente como para dejarlo escrito.

| Error | Qué se veía | Causa | Corrección |
|---|---|---|---|
| Lo recién subido no aparecía en la bandeja | Parecía que el registro se había perdido | La cola cargaba 50 ordenadas por antigüedad y **no decía cuántas quedaban fuera**; con 88 pendientes, lo nuevo caía en la posición 87 | Orden configurable, contador "N de TOTAL", "Cargar más" y aviso que lleva a lo reciente. Dos verificaciones de regresión |
| El tubo no cargaba nunca para el verificador | Esqueleto infinito y selector vacío | `cargarTareas` salía antes de apagar el indicador cuando no había delegación visible | Se resuelve el estado de carga siempre, se ocultan los controles sin sentido, y el vacío **explica su causa** |
| Un funcionario veía las metas de sus pares | Gabriel abría `/metas` y aparecía la medición de Elena | La pantalla nueva era más permisiva que `/ficha`, que ya lo impedía | Solo la jefatura ve las de otros. Consulta abierta nº 11 por su lado legal |
| La bitácora perdía eventos **en silencio** | Nada. Ese era el problema | `limpiar()` recorría un `Prisma.Decimal` como objeto plano y arrastraba su `constructor`; Prisma rechazaba el insert y, como la bitácora no lanza por diseño, el evento desaparecía | Decimal, Date, bigint y Buffer se convierten antes de recorrerlos. Verificación de regresión |
| La ficha desbordaba a 663px en un teléfono de 390 | Scroll horizontal en la pantalla que más se abre en terreno | El `<input type="file">` oculto con `.sr-only` es `position: absolute` sin ancestro posicionado: su posición estática quedaba a la derecha de la tabla, **fuera de la envoltura con scroll**, y ensanchaba el documento entero. Lo encontró la captura móvil (era más ancha que el viewport) | `.btn-archivo` y `.tabla-envoltura` con `position: relative`. Los selectores con opciones largas y la barra móvil, a ancho completo |
| Tres textos bajo 4.5:1 desde hacía semanas | Nada visible: eran legibles "a ojo" | Usaban la marca de estado (`--estado-rojo`, `--estado-amarillo`) como color de texto en vez de la variante `-texto` | Los encontró el script de contraste en su primera corrida. A ojo no se ve la diferencia entre 4.1:1 y 4.5:1 |
| La linterna del faro no se veía; después, "una lámina nublando el mar" | Primero el faro cortado por arriba; al arreglarlo, el mar como un rectángulo inset en el panel | `preserveAspectRatio="slice"` con altura fija recortaba el viewBox por arriba. Al pasar a `meet` + `aspect-ratio`, el dibujo quedó más angosto que el panel y el rectángulo del mar (del ancho exacto del viewBox) dejó ver el fondo a los lados, mientras las olas —que ya desbordaban— seguían hasta el borde | El mar, el promontorio y las olas se extienden 800 unidades fuera del viewBox por cada lado; `overflow: visible` en el SVG y `hidden` en el contenedor. Verificado a 1900, 1440 y 390 px |

**Cinco reglas que salieron de aquí:**

1. **Ningún esqueleto perpetuo, y todo vacío explica su causa** y ofrece la acción que sí corresponde a ese rol.
2. **Probar cada pantalla con los seis roles**, no solo con el propio. Ahora `scripts/capturas.mjs` lo hace en un comando.
3. **Un servicio que traga sus errores necesita una prueba que mire el resultado**, no la ausencia de excepción.
4. **El contraste se mide, no se mira**: `verificar:contraste` antes de cada merge.
5. **Todo lo que se posiciona en absoluto necesita un ancestro `relative`**, aunque esté "oculto": lo oculto para la vista sigue ocupando espacio para el scroll.

---

## 9. Deuda técnica y pendientes

| Pendiente | Dónde | Prioridad |
|---|---|---|
| 🔴 **El plan del Planner no está cargado** y el docente dijo que solo revisará el Planner | `scripts/cargar-plan-planner.ps1` | Bloqueante |
| Bloque C: migrar el dashboard al motor v2 y **eliminar la vista materializada v1** | `jobs/cumplimiento.ts`, `dashboard.ts` | Alta |
| La ficha del rol consulta dice "usa la fila de arriba para registrar" y no hay fila (ese rol no registra): el vacío debe explicar su causa, no señalar algo que no existe | `FichaPage.tsx` | Media |
| El rol se muestra con el nombre técnico ("Supervisor", "Gerente") en la barra; el municipio dice "Coordinador" y "Delegado". La terminología por tenant ya existe (`configuracionTerminologia`) | `Layout.tsx` `ROL_LABEL` | Media |
| El nombre de la organización se trunca en la barra de 240px ("Municipalidad Demo (datos fi…") | `layout.css` | Baja |
| Las evidencias del seed no tienen archivo en disco: la bandeja muestra "No se pudo abrir el archivo (410)" con datos demo | seed | Baja (solo demo) |
| Endurecer `/tareas`, `/unidades` y `/categorias` con `version` → 409 y auditoría | rutas heredadas | Alta |
| Borrar `/metas` v1 y su tabla `Meta` (bloqueado por la vista v1) | `metas.routes.ts` | Media, tras el Bloque C |
| Ficha del vecino: falta el endpoint de búsqueda de `PersonaUsuaria` | backend y frontend | Media |
| API de `Ajuste`, `AtencionSocial`, `Comentario`, `Ausencia` y CRUD de catálogos y parámetros | backend | Media |
| Pantallas de administración: períodos, cargos, catálogos | frontend | Media |
| Alternativa por teclado en el arrastrar y soltar (RNF-012) | `KanbanBoard.tsx` | Media |
| `.tabla-detalle` y `.tabla-sgr`: dos tablas con el mismo propósito | `dashboard.css` vs `base.css` | Media |
| El dashboard filtra por el string `2026-Q3`, no por `periodoId` | `lib/dashboard.ts` | Media |
| Alertas (RF-037) y exportación de informes (RF-033) | — | Media |
| Pruebas en marco formal (Jest/RTL) y CI | — | Media |
| Despliegue: Docker de producción, VPS, Caddy, respaldos | — | Baja hasta la entrega |
| `npm audit`: 3 vulnerabilidades en el CLI de Prisma (dev, no producción) | — | Baja |
| Warning de Prisma: `package.json#prisma` deprecado → migrar a `prisma.config.ts` | — | Baja |

---

## 10. Bloqueos externos y consultas abiertas

- **11 consultas al docente** en [requerimientos-oficiales.md §10](requerimientos-oficiales.md), con qué dice cada fuente, qué hicimos mientras tanto y qué cambia con la respuesta. Las nº 1 y 3 viven en `parametro` con `confirmado: false` y se corrigen sin tocar código.
- **Instrucciones verbales sin rúbrica** en [§9.bis](requerimientos-oficiales.md): diagrama de clases, 10 casos de uso, y que solo se revisará el Planner. Se contrastan cuando se publique la rúbrica.
- **Columnas de asistencia** (licencia, vacaciones, compensatorios): sin definición. **No inventar el cálculo.**
- **Matriz de roles definitiva**: hoy rige la del Documento Maestro §4; los ajustes solo tocan `middleware/roles.ts` y los checks de alcance.
- **RNF-017 pide antivirus** sobre las evidencias. Fuera de alcance por la restricción de costo cero; está declarado, no oculto.

## 11. Restricciones permanentes

- **Costo cero**: solo herramientas gratuitas. Único gasto autorizado al final: una VPS si es imprescindible.
- **Datos ficticios obligatorios**: prohibido cargar datos reales de ciudadanos o funcionarios en repo, base o capturas.
- **Marco legal chileno**: Ley 21.663 de ciberseguridad y Leyes 19.628 / 21.719 de datos personales. El sistema trata datos de vecinos y de desempeño de funcionarios de un organismo público.

---

## 12. Registro histórico de fases

Se conserva para trazabilidad; **lo vigente está arriba**.

| Fase | Cerrada | Qué dejó |
|---|---|---|
| 1. Documentación y diseño | ✅ | DESIGN.md, diagramas, historias, backlog |
| 2. Backend y configuración | ✅ | Express + Socket.io + Prisma + Postgres en Docker, auth multi-tenant, smoke test |
| 3. Frontend | ✅ | Vite + React + TS, auth, kanban dnd-kit, presencia, tokens de DESIGN |
| 4. BI y dashboards | ✅ | ECharts modular, filtros cruzados, KPI tiles |
| 5. Despliegue | ⬜ | CI/CD, VPS, Caddy, respaldos |

**Rediseño visual v1.1** (post-Fase 3): el usuario aportó [ebus-test.vercel.app](https://ebus-test.vercel.app) como referencia. Se adoptó su **arquitectura de tokens en dos capas**, la receta de acabado (tabular-nums, `::selection`, scrollbars, `focus-visible`), cuatro keyframes con una curva única, la primitiva `.card`, el anti-parpadeo de tema y lucide-react. Se rechazaron Tailwind, Next.js y Recharts, por mandato del Documento Maestro y del PDF. Metáfora propia: el **semáforo** con marca ●▲■.

**⚠ Cambio de línea base — 31 de agosto de 2026**: los profesores entregaron la especificación formal (38 RF, 18 RNF, 13 RN, 10 CA, 31 historias) y la presentación del cliente con las capturas de la planilla real. Eso redefinió el alcance: **la unidad de medición es el funcionario**, no la delegación, y el eje actividad → evidencia → validación → puntaje pasó a ser el corazón del sistema. El modelo v2 y todo lo construido desde entonces responden a ese cambio.
