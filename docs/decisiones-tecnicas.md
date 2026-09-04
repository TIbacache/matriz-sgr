# Decisiones técnicas (ADR) — Matriz SGR

Registro de decisiones de arquitectura y modelado. Formato: contexto → decisión → justificación → consecuencias. Se documentan aquí porque el PDF de los profesores exige registrar las decisiones y porque el criterio de revisión evalúa "el equipo explica decisiones, limitaciones y aprendizajes con precisión técnica" (§15.2).

---

## ADR-001 — Almacenamiento y uso del RUT

### Contexto
El profesor recomienda guardar el RUT como `15027946-1` o `15.027.946-1` y plantea usarlo como **clave foránea** de personas, "ya que es el único dato que nunca cambia". En la planilla real aparece como `17,721,947-9` (formato numérico de Google Sheets sobre `17.721.947-9`) y hay datos sucios (`216944`, `No tiene`).

### Decisión

**1. Un solo formato canónico en la base: sin puntos, con guion, DV en mayúscula.**

```
Guardado en BD:  17721947-9   ·  15027946-1  ·  9438201-K
Mostrado en UI:  17.721.947-9 ·  15.027.946-1 ·  9.438.201-K
Entrada:         se acepta cualquier variante y se normaliza al guardar
```

Columna `rut` de tipo `VARCHAR(12)`, `UNIQUE`, `NOT NULL`, con `CHECK` de formato. Se guarda además `rut_numero INT` (el cuerpo sin DV) indexado, para ordenar y buscar por rango sin castear.

**2. El RUT NO es la clave foránea. Es clave natural única; la PK es subrogada (UUID).**

### Justificación

Sobre el formato: guardar con puntos obliga a limpiar en cada comparación, búsqueda e índice (`REPLACE(rut,'.','')` invalida el uso del índice y hace lentas las consultas). Guardar solo el número pierde el dígito verificador, que es el que permite validar. **El formato canónico sin puntos con guion conserva toda la información, permite comparación e índice directos, y el formateo con puntos es una función de presentación de una línea** — se programa una vez, en la capa de UI, no en cada consulta.

Sobre la clave foránea, respetuosamente discrepo de la recomendación, y esta es la razón técnica:

| Criterio | RUT como FK | UUID como PK + RUT único |
|---|---|---|
| Si el RUT se corrige (error de digitación, rectificación del Registro Civil, extranjero que pasa de pasaporte a RUT definitivo) | Hay que actualizar **todas** las tablas que lo referencian, en cascada | Se corrige **una celda**; las relaciones no se tocan |
| Personas sin RUT chileno (extranjeros, vecinos sin cédula) | No se pueden registrar: la PK no admite nulos | Se registran con `rut` nulo y se completa después |
| Tamaño del índice y de cada FK | 12 bytes de texto por referencia, en millones de filas | 16 bytes binarios, comparación entera |
| Exposición de datos personales | El RUT viaja en cada URL y cada payload (`/actividades/17721947-9`) → dato personal expuesto, problema con RNF-009 (privacidad) | El identificador público no revela nada |
| Datos sucios en la carga inicial | Un `216944` inválido rompe la integridad referencial | Entra, se marca para corrección, no rompe nada |

El profesor tiene razón en el fondo — **el RUT es el identificador natural de la persona y por eso lleva restricción `UNIQUE`**, que es exactamente lo que garantiza que no haya dos fichas para el mismo vecino, y es lo que habilita la trazabilidad entre delegaciones. La diferencia es de *forma*: se usa como **clave natural única**, no como clave foránea propagada. Es la práctica estándar (surrogate key + natural key constraint) y no pierde ninguna garantía.

**3. Validación con módulo 11 obligatoria** al ingresar (RF-010). Un RUT con DV incorrecto no se guarda.

### Consecuencias
- Una función `normalizarRut()` y una `formatearRut()` en un módulo compartido; nunca formateo disperso.
- Búsqueda "por RUT" del vecino (pedida explícitamente por el cliente) resuelta con índice único.
- La trazabilidad cruzada entre delegaciones (el caso del niño que pidió el mismo regalo en 5 delegaciones) se apoya en esta unicidad.

---

## ADR-002 — Fechas y horas

### Contexto
La planilla mezcla formatos (`1/7/26`, `06/07/2026`, `26 ago 2026`). Los cálculos del semáforo dependen de "hoy" y de días transcurridos. Chile tiene cambio de horario (UTC−4 / UTC−3).

### Decisión

| Caso | Tipo | Razón |
|---|---|---|
| Fecha de actividad, compromiso, visita, entrega | `DATE` | Es un día calendario, no un instante. Guardar `TIMESTAMP` provoca que "1/7 a las 23:00 en Chile" se guarde como "2/7 UTC" y corra el día. |
| Creación, modificación, validación, auditoría | `TIMESTAMPTZ` | Son instantes reales; se guardan en UTC y se muestran en `America/Santiago`. |
| Inicio y término de período | `DATE` | Define días computables. |

- **Formato de intercambio: ISO 8601** (`2026-07-01`, `2026-07-01T14:30:00Z`) en toda la API. Nunca `dd/mm/aaaa` en JSON.
- El formato chileno (`01-07-2026`) es **solo presentación**, con `Intl.DateTimeFormat("es-CL")`.
- **"Hoy" se calcula en el servidor** con zona `America/Santiago`, nunca con la fecha del navegador: si no, dos usuarios verían semáforos distintos.
- Los días transcurridos se calculan sobre `DATE` (aritmética exacta), sin horas de por medio.

---

## ADR-003 — Nombres y apellidos

### Contexto
El profesor plantea la duda de separar o concatenar. La planilla los tiene juntos (`Patricia Jimenez Rojas`, `Victoria Castillo (CAM)`) e incluso con anotaciones dentro del nombre.

### Decisión

**Guardar separado, exponer concatenado — y que el concatenado no se programe más de una vez.**

```
nombres           VARCHAR   NOT NULL   -- "María José"
apellido_paterno  VARCHAR   NOT NULL   -- "Jimenez"
apellido_materno  VARCHAR              -- "Rojas" (opcional: extranjeros)
```

La regla de concatenación se escribe **una sola vez**, en `backend/src/lib/persona.ts` (`nombreCompleto`, `nombreFormal`, `iniciales`), y se aplica en la capa de serialización. Ningún componente ni consulta la vuelve a escribir.

Para **buscar** por nombre completo sin duplicar el dato, la migración crea un **índice de expresión** en PostgreSQL:

```sql
CREATE INDEX personas_usuarias_nombre_completo
  ON personas_usuarias ((nombres || ' ' || apellido_paterno || ' ' || COALESCE(apellido_materno, '')));
```

> **Nota de implementación del Bloque B3** (3 de septiembre de 2026): al construir la búsqueda de la ficha del vecino apareció el límite del índice de arriba. Es un btree sobre la expresión **tal cual**, así que sirve para comparar cadenas exactas pero no para el `LIKE` de prefijo sin distinguir mayúsculas, que es como busca una persona ("maldo" para *Maldonado*). La migración `20260903120000` agrega el par que sí lo resuelve, sobre la **misma** expresión:
>
> ```sql
> CREATE INDEX personas_usuarias_nombre_busqueda
>   ON personas_usuarias (
>     lower(nombres || ' ' || apellido_paterno || ' ' || COALESCE(apellido_materno, ''))
>     text_pattern_ops
>   );
> ```
>
> `GET /vecinos?q=` consulta esa expresión y no las columnas sueltas: la regla de concatenación sigue escrita una sola vez. El "contiene" (`%texto%`) no usa índice y hace recorrido secuencial; a la escala de una base municipal de vecinos es irrelevante, y decirlo aquí es más honesto que dejar creer que toda búsqueda es indexada.

> **Nota de implementación** (por qué no una columna generada): la primera versión de este ADR proponía `GENERATED ALWAYS AS ... STORED`. Se descartó porque Prisma no modela columnas generadas y cada `prisma migrate` las detecta como deriva del esquema, lo que rompería las migraciones del equipo. El índice de expresión da la misma capacidad de búsqueda indexada sin ese costo, y el helper cumple el objetivo de escribir la regla una sola vez.

### Justificación
Separar es obligatorio para ordenar por apellido, buscar por apellido y generar informes formales ("Apellido, Nombre"). Concatenar en cada consulta o en cada componente del frontend es exactamente el "programar de más" que se busca evitar: la columna generada elimina esa repetición y garantiza que todos vean la misma cadena. Guardar solo el nombre completo sería irreversible (separar "de la Fuente Ramírez" después es imposible de forma confiable).

El apellido materno es **opcional**: personas extranjeras suelen no tenerlo. Hacerlo obligatorio impediría registrar vecinos reales.

---

## ADR-004 — Código verificador de evidencias

### Contexto
La planilla genera códigos como `SOC71310` = prefijo + mes + día + correlativo, y renombra la foto a `COS7711REV.jpeg` para marcarla revisada. RF-011 exige que el código sea **único e inmutable**; RN-010 que la relación con la evidencia sea 1:1 o 1:N.

### Decisión

```
Formato:  {PREFIJO_AREA}-{AAAAMMDD}-{CORRELATIVO:04}
Ejemplo:  SOC-20260713-0010
```

- **Inmutable**: se genera al crear la actividad y no cambia nunca (columna sin UPDATE permitido).
- **Único**: garantizado por restricción `UNIQUE` en base, no por lógica de aplicación.
- El estado "revisado" **NO se codifica en el nombre del archivo**: vive en la tabla `validacion` (verificador, fecha, decisión, observación), como exige RF-013.

### Justificación
El formato actual es **ambiguo**: `COS7711` puede leerse como mes 7 / día 7 / correlativo 11, o mes 7 / día 71 / correlativo 1. Con `AAAAMMDD` y correlativo de ancho fijo la lectura es única, además de **ordenable alfabéticamente igual que cronológicamente**, que facilita búsquedas y listados. Se conserva el prefijo de área porque es lo que las personas ya reconocen y buscan.

Poner el estado en el nombre del archivo (`...REV.jpeg`) obliga a renombrar para cambiar de estado, pierde el historial (quién y cuándo revisó) e impide "solicitar corrección" como tercer estado. Separar dato de estado es lo que permite cumplir RF-013 y la auditoría de RNF-008.

---

## ADR-005 — Concurrencia sin sobrescritura silenciosa

### Contexto
RF-034, RNF-003, HU-23 y CA-08 exigen que dos usuarios trabajen a la vez "sin pérdida, duplicación ni sobrescritura silenciosa".

### Decisión
**Bloqueo optimista con número de versión.** Cada tabla editable lleva `version INT`. El `UPDATE` incluye `WHERE id = ? AND version = ?` e incrementa la versión; si afecta 0 filas, alguien más ya modificó el registro → se responde **409 Conflict** con la versión vigente y la UI ofrece recargar o combinar.

### Justificación
El bloqueo pesimista (bloquear la fila mientras alguien edita) es inviable con delegados en terreno y conexiones inestables: una pestaña abandonada dejaría el registro bloqueado. El optimista no bloquea nada, detecta el conflicto en el momento exacto de guardar y **avisa en vez de sobrescribir**, que es literalmente lo que pide CA-08. El tiempo real por Socket.io reduce la probabilidad de conflicto (los cambios se ven al instante), pero **no la elimina**: la versión es la garantía.

---

## ADR-006 — Auditoría e inmutabilidad

### Contexto
RNF-008, RF-036 y HU-30 exigen conservar usuario, fecha, acción, entidad, **valor anterior y valor nuevo**, protegido contra alteración. RN-013 y HU-28: los períodos cerrados no se modifican.

### Decisión
- Tabla `auditoria` **solo-inserción**: sin `UPDATE` ni `DELETE` para ningún rol de aplicación (se revoca el permiso en la base, no solo en el código).
- Se registra: usuario, instante, acción, entidad, id, `valor_anterior JSONB`, `valor_nuevo JSONB`, IP y origen.
- Las actividades ya validadas quedan **no editables** (el cliente lo pidió: *"cuando la persona hace algún ingreso, después no pueda borrarlo"*). Corregir significa **anular con motivo y crear una nueva**, no sobrescribir.
- Cerrar un período congela sus resultados; reabrir exige rol autorizado y queda auditado.

### Justificación
Una auditoría que el propio sistema puede modificar no es auditoría. Revocar el permiso a nivel de base es lo que la vuelve confiable frente a un bug o a un abuso desde la aplicación. Anular-y-recrear en vez de editar preserva la historia real de lo ocurrido, que es justamente lo que se audita.

---

## ADR-007 — Parámetros configurables, nunca constantes en el código

### Contexto
El PDF es explícito: el período **no** se codifica en 90/91 días fijos; el tope de 150% "debe ser configurable"; el umbral de 80% "configurable por período"; y los ajustes por felicitación/reclamo "no se codifican con valores fijos hasta que exista una regla parametrizada y aprobada" (RN-011, §13.1). RNF-015 exige poder ajustar metas, ponderadores, estados, catálogos y umbrales **sin cambios de código**.

### Decisión
Todo valor de negocio vive en la tabla `parametro`, con vigencia por período y versión:

| Parámetro | Valor inicial | Fuente |
|---|---|---|
| `tope_cumplimiento_item` | 150% | RN-005, observado en planilla (declarado, no aplicado) |
| `umbral_minimo_colectivo` | 80% | RN-006 |
| `semaforo_verde` | ≥ 100% del objetivo al día | RN-008, verificado con datos reales |
| `semaforo_naranjo` | ≥ 60% y < 100% | ídem |
| `ajuste_felicitacion` | +10%, tope 3 por período | Planilla (diapositiva 6) — **pendiente de aprobación formal** |
| `ajuste_reclamo` | −20% | ídem (⚠ el PDF menciona −20% y −30%: **requiere definición oficial**) |

Cambiar un parámetro **no altera períodos cerrados** (RF-038): las versiones se guardan con vigencia.

### Consecuencias
⚠ La migración actual `vista_cumplimiento_v2` tiene `LEAST(..., 1.5)` y los umbrales escritos en el SQL. **Debe refactorizarse para leer de `parametro`** antes de la entrega. Registrado como deuda técnica en [estado-proyecto.md](estado-proyecto.md).

---

## ADR-008 — Trazabilidad de la persona usuaria entre delegaciones

### Contexto
Caso real del cliente: un niño pidió el mismo regalo de Navidad en 5 delegaciones distintas (la del papá, la del abuelo, donde vive…) y el sistema no lo detectaba. El PDF lo eleva a requisito: RF-032 (búsqueda), CA-04 (secuencia completa del caso) y HU-03 ("sin duplicar el caso principal").

### Decisión
- `persona_usuaria` es **una sola tabla a nivel de organización**, con `rut` único — **no** por delegación.
- Toda actividad, atención y compromiso referencia esa persona.
- La ficha del vecino muestra su **historial completo cruzando delegaciones**, con el aviso correspondiente cuando hay atenciones del mismo tipo en distintos territorios dentro de una ventana de tiempo configurable.
- El libro/tubo sigue siendo privado por delegación, pero **la búsqueda por RUT de una persona alerta de la duplicidad** — es exactamente el control que el cliente necesita.

### Justificación
Si la persona se modelara dentro de cada delegación, el caso del niño sería indetectable por diseño: cinco fichas distintas, ninguna relacionada. La unicidad por RUT a nivel de organización es lo que convierte la trazabilidad en una propiedad del modelo, no en un reporte que alguien debe recordar ejecutar.

---

## ADR-009 — Tipo y dirección de los ítems de medición

### Contexto
La planilla real tiene ítems de **cantidad** (240 atenciones), de **porcentaje** (Soluciones al ingreso al tubo: meta 80%) y de **dirección inversa** (Pendientes en tubo menor a 10%: meta 10%, avance 11% → 50% de cumplimiento, no 110%).

### Decisión
`item_medicion` lleva:
- `tipo`: `cantidad` | `porcentaje`
- `direccion`: `mayor_mejor` (por defecto) | `menor_mejor`

```
mayor_mejor  → cumplimiento = avance / meta
menor_mejor  → cumplimiento = meta / avance   (acotado)
```
En ambos casos se aplica el tope configurable del ADR-007.

### Justificación
Sin esto, "Pendientes en tubo menor a 10%" premiaría al funcionario por tener más pendientes, invirtiendo el incentivo. RN-002 ya anticipa que "los ítems porcentuales deberán declarar su fórmula específica"; el atributo `direccion` es la forma declarativa y configurable de cumplirlo sin escribir un caso especial por ítem.

---

## ADR-010 — Tipografía de pantalla frente a la norma de Arial

### Contexto
El manual «Normas Gráficas La Serena 2019» dice: *«Como fuente tipográfica para la elaboración de documentos internos, se solicita el uso del tipo Arial»*. No dice nada de aplicaciones web. DESIGN §10.3 dejó la decisión abierta: forzar Arial en pantalla entrega un producto genérico, que es lo contrario del desafío del bloque; ignorar la norma sería no conocerla. El par vigente hasta este ADR era Space Grotesk (títulos) + General Sans (cuerpo).

### Decisión (2 de septiembre de 2026)

| Ámbito | Fuente | Por qué |
|---|---|---|
| **Documentos e informes exportados** (PDF, impresión, planillas que salen del sistema) | **Arial**, con `Liberation Sans` y `Helvetica` como equivalentes métricos | Es donde la norma aplica literalmente. En `base.css`, `@media print` cambia el cuerpo a `--font-documento`; la exportación de informes (RF-033) hereda la misma pila. |
| **Pantalla — cuerpo, tablas, formularios** | **General Sans** (se mantiene) | Palo seco humanista sin contraste marcado —la misma familia visual que el manual pide para el logotipo—, con cifras tabulares, probada en las tablas densas de la ficha y en móvil. Ya estaba cargada: cero costo. |
| **Pantalla — títulos y cifras de KPI** | **Libre Franklin** (reemplaza a Space Grotesk) | Franklin Gothic es el idioma de la señalética cívica y del diario impreso: da peso institucional e histórico sin verse tecnológico. Space Grotesk junto al rojo luminoso `#DB0032` se leería como marca de fintech, y los valores que el propio municipio declara son *histórica, tradicional, patrimonial*. Libre Franklin es libre (Google Fonts, OFL), variable y liviana. |

Se cargan solo los pesos que se usan (Libre Franklin 500/700/800; General Sans 400/500/600) con `font-display: swap`. La ficha personal, que se abre desde un teléfono en terreno, no espera por las fuentes.

### Consecuencias
- `--font-titulo` pasa a Libre Franklin; `--font-cuerpo` no cambia; nace `--font-documento` (Arial) para todo lo que sale del sistema.
- Inter sigue prohibida (DESIGN §8.1).
- Si el docente o el municipio exigen Arial también en pantalla, el cambio es de un token: la decisión es reversible sin tocar componentes.

---

## ADR-011 — Convivencia del rojo institucional con el rojo del semáforo

### Contexto
La norma municipal fija el rojo luminoso `#DB0032` como color corporativo principal, con el heráldico `#8A0007` y el rojo oscuro `#971A3A` como variantes. El sistema ya tiene un rojo con significado propio: `--estado-rojo #C0392B`, que dice *«avance relativo bajo 60%»*. Si la marca y la alarma comparten color, el semáforo —que es el dato que el cliente vino a buscar— deja de leerse. DESIGN §10.2 lo declara el riesgo real del bloque y §10.5 prohíbe tocar el semáforo.

### Decisión (2 de septiembre de 2026)

Los dos rojos se separan por **rol, zona y forma**, no por matiz, y el semáforo no cambia.

1. **Rol**: el rojo institucional es *identidad e interacción*; el rojo del semáforo es *dato*. Ningún token cumple los dos papeles.
   - `--marca` (`#DB0032`) y `--marca-profundo` (`#8A0007`): identidad y estructura — barra lateral, wordmark, título de sección, panel del login.
   - `--acento` (`#DB0032`), `--acento-hover`, `--btn-bg`: lo interactivo — botón primario, enlaces, navegación activa, anillo de foco.
   - `--estado-rojo`, `--estado-rojo-bg`, `--estado-rojo-texto`: **sin cambio**, exclusivamente para el estado crítico.
2. **Zona**: el rojo institucional **nunca aparece dentro de una zona de datos** (tablas, chips, gauges, heatmap, tarjetas del tubo, series de gráficos). Lo que en una zona de datos significa *«esto es lo seleccionado / lo actual»* usa los tokens nuevos `--seleccion` y `--seleccion-bg`, derivados del negro profundo del manual, no del rojo. La rampa ordinal del tubo (`--tubo-*`) y los colores de categoría (`--cat-*`) tampoco usan rojo: el único rojo que un gráfico puede pintar es el del estado.
3. **Forma**: el rojo institucional aparece como tipografía, como fondo sólido de la barra o del botón, o como anillo de foco; **nunca como el par fondo pálido + texto fuerte** que es la firma visual del chip de estado. Y el estado crítico nunca aparece sin su marca ■ o su texto (DESIGN §8.7), así que aunque los dos rojos coincidan en una pantalla, la forma los distingue antes que el color.
4. **Tema oscuro**: el rojo luminoso vibra sobre carbón y no alcanza 4.5:1 como texto (3.5:1). Como texto y foco se eleva a `#FF4D6D`; como fondo de botón con texto blanco conserva `#DB0032`, que sí cumple. El heráldico se profundiza para la barra.
5. **Verificación con script, no a ojo**: `npm run verificar:contraste` (frontend) comprueba cada par texto/fondo de ambos temas contra WCAG AA y, además, que la distancia perceptual (ΔE CIE76) entre `--acento` y `--estado-rojo` no baje de un umbral. Un cambio de token que acerque los dos rojos hace fallar la verificación.

### Justificación
DESIGN §10.2 ofrecía como último recurso «bajar la saturación del estado antes que tocar la marca». No hizo falta: los dos rojos no compiten porque nunca ocupan el mismo lugar ni la misma forma. Cambiar `#C0392B` habría obligado a revalidar los tres tokens de estado en los dos temas y a explicar al cliente por qué su rojo cambió, para ganar unos grados de matiz que la separación por zona hace innecesarios.

### Consecuencias
- Nacen `--marca`, `--marca-profundo`, `--marca-oscuro`, `--seleccion`, `--seleccion-bg`, `--barra-*` (tokens de la barra lateral) y `--cat-1..6`. Los hex sueltos de `lib/kanban.ts` desaparecen.
- El radar del dashboard, que pintaba su serie con `--acento`, pasa a un neutro de datos: una serie en rojo institucional violaría el punto 2.
- Regla para revisiones: si un PR pinta `--acento` o `--marca` dentro de `.tabla-sgr`, un chip, un gráfico o una tarjeta del tubo, se rechaza (se agrega a DESIGN §8).

---

## ADR-012 — Quién consulta la ficha del vecino, y con qué detalle

### Contexto
El Bloque B3 construye la pantalla con **más datos personales identificados** del sistema: nombre, RUT, teléfono, dirección y el historial completo de atenciones de una persona, cruzando delegaciones (ADR-008). Tres fuentes tiran en direcciones distintas y ninguna resuelve sola:

- **El cliente** fue tajante: *"cada delegación tiene un libro, no se pueden ver entre ellos, pero cada integrante de la delegación puede ver todo el libro de la suya"* (reunión 00:37:11). Eso protege el libro, pero si se aplicara literal a la ficha del vecino, el caso del niño que pidió el mismo regalo en cinco delegaciones seguiría siendo indetectable, que es justo lo que el cliente vino a resolver.
- **El PDF** define seis actores (§3) sin decir cuál accede a datos de vecinos. Al Usuario de consulta lo describe sobre *"tableros e informes"*; al Verificador, sobre *"revisar evidencias, validar o rechazar"*. RNF-004 y RNF-005 piden control por rol y mínimo privilegio.
- **La ley chilena** (Leyes 19.628 y 21.719 de datos personales, Ley 21.663 de ciberseguridad) impone finalidad, proporcionalidad, mínimo privilegio y **trazabilidad del acceso**. Es la fuente más específica de las tres y la única con consecuencias fuera de la evaluación.

### Decisión (3 de septiembre de 2026)

**1. Quién entra.** Cuatro de los seis roles:

| Rol | Ficha del vecino | Por qué |
|---|---|---|
| `admin`, `supervisor` | ✅ completa | Configuran y supervisan la operación; necesidad de conocer evidente |
| `gerente`, `usuario` | ✅ con detalle reducido fuera de su delegación | Atienden a la persona: sin la ficha no pueden hacer su trabajo |
| `verificador` | ⛔ 403 | Segregación de funciones (RNF-005): valida que una evidencia respalde una actividad, y para eso **no necesita saber a quién se atendió** |
| `consulta` | ⛔ 403 | El PDF lo define sobre tableros e informes, que son **agregados**. Un dato agregado no requiere identidad |

El 403 **explica el motivo** y ofrece la alternativa (el dashboard), en vez de dejar una pantalla en blanco o un 404 mudo.

**2. Qué se ve.** El historial **cruza delegaciones siempre** —ocultarlo destruiría el control— pero lo que viaja de una delegación ajena es *reducido*: fecha, delegación, tipo de atención, estado y el código de evidencia. Nunca la descripción, la acción, el contacto ni quién atendió. La pantalla **dice cuántas filas están reducidas y por qué**.

**3. Qué se audita.** Abrir la ficha de una persona identificada queda en la bitácora con la acción nueva `consultar` (usuario, fecha, a quién, cuántos hechos, si hubo aviso). **La búsqueda incremental no se audita**: registrar cada tecleo llenaría la bitácora de ruido sin decir nada.

**4. Qué se puede corregir.** `PATCH /vecinos/:id` con bloqueo optimista. Rectificar un dato personal inexacto es un derecho del titular (Ley 19.628 art. 6). Lo hace el nivel central, o quien atendió a esa persona **en su propia delegación**. El RUT no se edita desde la pantalla: es la llave que une el historial y reasignarlo fusionaría dos historias; el servidor lo rechaza con 409 si ya pertenece a otra persona.

**5. La ventana del aviso es un parámetro**, `ventana_duplicidad_dias` (30 días, `confirmado: false`), no un número en el código (ADR-007).

### Justificación
Ante fuentes que se contradicen, rige lo restrictivo y la ambigüedad se documenta (regla 18 del proyecto y §10 de los requerimientos). Dar acceso de más a `consulta` o al `verificador` sería irreversible en la práctica: los datos ya vistos no se "des-ven". Restringir de más, en cambio, se corrige con una línea el día que el docente responda la **consulta nº 12**, y mientras tanto ninguna historia queda bloqueada.

La distinción entre *ver el hecho* y *ver el detalle* es lo que permite cumplir a la vez la regla del cliente (el libro es privado) y el requisito del PDF (CA-04, la secuencia consultable). No es un punto medio de compromiso: es que son dos preguntas distintas —*"¿esta persona ya fue atendida?"* y *"¿qué dice el registro de esa atención?"*— y solo la primera necesita cruzar delegaciones.

### Consecuencias
- Nace la acción `consultar` en el enum `AccionAuditoria` (migración `20260903120000`). La bitácora deja de registrar solo escrituras y pasa a responder también *"quién consultó a quién"*.
- `ROLES_FICHA_VECINO` vive en `backend/src/services/vecinos.ts` y su espejo en `frontend/src/lib/vecinos.ts`; el menú lateral no ofrece la entrada a quien no puede entrar. **El servidor sigue siendo la autoridad**: el espejo del frontend es cortesía, no seguridad.
- Si el docente responde que el rol de consulta debe acceder, el cambio es un elemento en un arreglo y su espejo. No toca modelo, ni migración, ni el resto de la API.
- Queda registrado como **consulta abierta nº 12** en [requerimientos-oficiales.md §10](requerimientos-oficiales.md), con sus dos preguntas concretas: quién accede, y cuál es la ventana de duplicidad.

---

## ADR-013 — Las tres gestiones son un avance, no tres campos

### Contexto
RF-015 pide *"atención social con hasta 3 gestiones para el mismo usuario"* y CA-04 exige que esa secuencia sea **consultable**. La planilla real del cliente ([estructura-planilla-real §4](estructura-planilla-real.md)) lo resuelve como lo que es —una hoja de cálculo—: nueve columnas planas en la misma fila (`PRIMERA GESTIÓN`, `FECHA PROGRAMADA A VISITA`, `Observación`, `SEGUNDA GESTIÓN`, `FECHA DE VISITA`, `FECHA ENTREGA INFORME`, `TERCERA GESTIÓN`, `FECHA ENTREGA BENEFICIO`). La entidad `AtencionSocial` se modeló desde ahí y conserva esas columnas.

El problema aparece al abrirlas por API. Si el cliente elige en qué columna escribe, la "secuencia" deja de existir: se puede registrar la tercera gestión sin la primera, poner la fecha de entrega del beneficio junto a la gestión inicial, o rellenar las tres de una vez. Nada de eso lo impide el esquema, y **una secuencia que el sistema no garantiza no es demostrable**, que es exactamente lo que CA-04 pide demostrar.

Al mismo tiempo, la atención social es la información **más sensible** del sistema: la situación socioeconómica de un vecino identificado. ADR-012 ya fijó el criterio para la ficha del vecino; falta decidir cómo se hereda aquí.

### Decisión (3 de septiembre de 2026)

**1. El servidor decide el casillero, no el cliente.** `POST /atenciones-sociales/:id/gestiones` recibe el valor de la gestión y sus fechas, **no su número**. El servidor deduce cuál toca de lo ya registrado (`siguienteGestion`), la coloca y devuelve `gestionRegistrada`. No hay forma de saltarse la primera ni de registrar una cuarta: el tope es del requisito, no del formulario.

**2. Cada gestión solo admite sus propias fechas.** Mandar `fechaEntregaBeneficio` en la gestión 1 responde 422 con la lista de las que sí acepta. Guardarla en el campo que no le corresponde produciría un dato falso que después nadie sabría interpretar.

**3. El avance se deduce de los datos, no de un contador.** `gestionesRegistradas` y `estado` (`abierta` / `cerrada`) se calculan de las tres columnas cada vez. Un contador aparte puede desincronizarse; las columnas, no.

**4. La atención es 1:1 con la actividad, y solo existe con un vecino identificado.** Se crea colgada de ella (`POST /actividades/:id/atencion-social`), igual que la evidencia: así no puede nacer huérfana ni apuntar a la actividad de otra delegación. Una segunda atención sobre la misma actividad responde 409 —eso es un duplicado, no un avance—, y sin `personaUsuariaId` responde 422, porque sin persona no hay caso que seguir ni duplicidad que detectar (RN-012, ADR-008).

**5. La observación se anexa, no se sobrescribe.** La planilla tiene una sola columna `Observación` para todo el caso. Al avanzar, lo escrito se agrega debajo con su número de gestión. Pisarla borraría el relato, que es lo único que explica *por qué* el caso avanzó como avanzó.

**6. Alcance por rol: hereda ADR-012 y lo aprieta un punto.**

| Rol | Detalle del caso social | Por qué |
|---|---|---|
| `admin`, `supervisor` | ✅ completo | Igual que la ficha del vecino |
| `gerente`, `usuario` | ✅ en su delegación; fuera de ella **solo el avance** | Atienden el caso; para no duplicar la ayuda basta saber que existe y en qué va |
| `verificador` | ⛔ 403 con el motivo escrito | Valida que la foto corresponda al código: para eso **no necesita saber si la persona pidió una caja de alimentos** |
| `consulta` | ⛔ 403 con el motivo escrito | Trabaja con agregados; un agregado no requiere identidad |

En el historial del vecino, una atención de otra delegación viaja con `gestionesRegistradas` y `estado` pero con `tipoAtencion`, `subAtencion` y las gestiones **vacíos**. Abrir un caso queda en la bitácora como `consultar`, y avanzarlo como `cambiar_estado` —no como `actualizar`— para poder reconstruir la secuencia sin confundirla con una corrección de texto.

**7. Los cinco desplegables salen de `CatalogoItem`** (`tipo_atencion`, `sub_atencion`, `gestion_1`, `gestion_2`, `gestion_3`), y el de cada gestión se valida contra **su** catálogo: la tercera gestión no ofrece "visita terreno" porque en la planilla del cliente tampoco lo ofrece. Ninguna lista vive en el código (RF-004, ADR-007).

### Justificación
La alternativa —exponer las nueve columnas y confiar en que la pantalla las llene en orden— es más barata y más fiel a la planilla, pero traslada al formulario una regla que es del requisito. El día que alguien llame la API desde otro cliente, o que la pantalla cambie, la secuencia se rompe en silencio. Poner la regla en el servidor cuesta una función (`siguienteGestion`) y hace que CA-04 sea **demostrable con una prueba** y no con una promesa.

Sobre el punto 6: el verificador es el caso que más se discutió. Necesita ver la actividad para validar su evidencia, y el sistema se la muestra; lo que no le muestra es el detalle socioeconómico, que no interviene en la decisión que él toma. Ante la duda sobre un dato sensible rige lo restrictivo (regla 18), y ampliarlo después es una línea.

### Consecuencias
- La secuencia queda garantizada por el servidor: `POST /gestiones` con la primera ausente coloca la primera, no la tercera; y con las tres hechas responde 422.
- `proyectar()` en `backend/src/services/atencion-social.ts` es la **única** forma en que la atención sale del backend —del alta, del avance y de dentro de una actividad—; dos formas del mismo concepto obligarían a la pantalla a saber de dónde vino cada una.
- La pantalla no tiene selector de "número de gestión", y eso es deliberado: sería la forma de dejar que el usuario rompa la secuencia. Cambia de campos según la etapa (DESIGN §8.2).
- Corregir una gestión ya registrada **no está resuelto**: `PATCH` solo toca la cabecera. Si el cliente pide corregir una gestión mal escrita, la decisión será si se corrige con bloqueo optimista o si se anula la actividad y se registra otra, como con las validaciones aprobadas (consulta abierta nº 8). Queda anotado, no inventado.

---

## ADR-014 — La delegación es el promedio de su gente, y "sin medición" no es 0%

### Contexto
El sistema tuvo dos cálculos de cumplimiento conviviendo desde la Fase 3:

1. **`cumplimiento_ponderado_vista`** (v1): una vista materializada que medía **por delegación**, sobre la tabla `metas` (unidad × categoría × trimestre), refrescada por cron. Alimentaba el dashboard. El tope de 150% y los umbrales del semáforo (100 / 60) estaban **escritos dentro del SQL**.
2. **`services/cumplimiento.ts`** (v2): el motor por **funcionario** (cargo → ítems → metas), que es el que exige la especificación (RF-022 a RF-027) y el que lee los umbrales de la tabla `parametro`.

Convivir tenía un costo que se hizo visible al auditar el Bloque C: la tabla `metas` **no la poblaba ningún seed** desde que se reescribió con datos ficticios, y su columna `avance` no la actualizaba ningún proceso —solo un `PATCH` manual—. El dashboard llevaba semanas mostrando 24 filas fósiles de una versión anterior del seed: cifras que ya no se podían reproducir en una base limpia. Además, el tope y los umbrales dentro del SQL contradicen RF-024, RF-027 y RNF-015, que los exigen configurables.

Migrar el tablero al motor v2 obliga a responder una pregunta que la v1 nunca tuvo que responder, porque medía delegaciones directamente: **¿cómo se pasa de personas a delegación?**

### Decisión (4 de septiembre de 2026)

**1. La delegación es el promedio simple del cumplimiento final de sus funcionarios.** No una suma ponderada por cantidad de ítems, ni por metas, ni por actividades registradas. El plan de cada persona ya suma el 100% de sus propios ponderadores (RN-001), así que las personas son magnitudes comparables entre sí; ponderar por volumen premiaría a quien tiene más ítems asignados, que es una decisión de configuración y no un mérito.

**2. El objetivo al día de la delegación también es el promedio de los de su gente.** Cada persona descuenta **sus** ausencias (RN-007), así que dos delegaciones del mismo período pueden tener objetivos distintos. Usar los días calendario para la delegación —como hacía la v1— borraría justamente el descuento que la planilla real muestra.

**3. Una delegación sin nadie con metas configuradas NO cumple 0%: no tiene medición.** Viaja en `sinMedicion`, separada de `delegaciones`, y la pantalla la nombra. Pintarla de rojo sería inventar un dato —nadie incumplió nada— y, peor, taparía el aviso que de verdad importa: que ahí no hay nadie configurado. Es además la primera pieza del "quién **no** ha ingresado" que pide RF-030.

**4. El segundo eje del tablero es el área del cargo, no la categoría del tubo.** El mapa de calor y el radar cruzan delegación × `Cargo.area` (`T OO CC`, `SOCIAL`, `APOY ADM`, `COSERCO`, `P Y C`), que es como agrupa la planilla real ([estructura-planilla-real §1](estructura-planilla-real.md)). Antes el eje era `CategoriaGestion` —Seguridad, DISERCO, Social (DIDECO)…—, que son las categorías del **tubo de trabajo**: no tienen relación con lo que se le mide a una persona, así que el mapa cruzaba dos cosas distintas y el número de la celda no significaba lo que su fila decía.

**5. Cada celda del mapa se juzga contra su propio objetivo.** El área muestra su **avance relativo** (cumplimiento ÷ objetivo al día × 100), no el cumplimiento crudo, y su color sale de `calcularSemaforo()` con los umbrales del parámetro. Así el mapa dice lo mismo que los gauges; antes la celda se coloreaba contra un 100% fijo mientras el gauge de al lado se coloreaba contra el objetivo del día, y las dos formas podían contradecirse en pantalla.

**6. La proyección al cierre se calcula en el backend, con el tope del parámetro.** Era una función del frontend (`lib/dashboard.ts`) con un `Math.min(…, 150)` escrito a mano: un valor de negocio en la capa de presentación, prohibido por ADR-007 y por la regla 3 del proyecto.

**7. Se elimina la v1 completa**, no se deja en desuso: la vista materializada, la tabla `metas`, el modelo `Meta`, las rutas `GET /kpis/cumplimiento`, `POST /kpis/recalcular` y `/metas`, y el cron que refrescaba la vista (migración `20260903230000_eliminar_cumplimiento_v1`). `GET /kpis/tubo` sobrevive porque nunca dependió de ese cálculo, y `UnidadTerritorial` y `CategoriaGestion` se quedan porque sostienen el tubo (RF-001, EP-04).

### Justificación
La alternativa al promedio simple era ponderar por el tamaño del equipo o por la carga de metas. Se descartó porque introduce un segundo sistema de ponderadores encima del que ya define RN-001, y porque haría que el número de la delegación cambiara al reconfigurar metas sin que nadie trabaje distinto. El promedio es además el que se puede explicar en una frase a la persona medida, que es el criterio que el cliente usó toda la reunión.

Sobre eliminar en vez de deprecar: mientras las dos existan, cualquiera puede leer la equivocada y ninguna prueba lo detectaría —es exactamente lo que pasó durante semanas con las 24 filas fósiles—. Un cálculo que nadie puede reproducir no es una fuente de respaldo, es una trampa.

### Consecuencias
- El dashboard filtra por `periodoId` (RF-005) y no por el string `2026-Q3`, que era un formato inventado por la v1 y no correspondía a ninguna entidad.
- Ya no hay nada que "recalcular": el motor se ejecuta al consultarlo. El botón del tablero pasó a ser **Actualizar**, disponible para todos los roles, y hay aviso en vivo cuando una validación aprobada mueve el puntaje (`cumplimiento:cambiado`).
- El cálculo pesa más por petición que leer una vista materializada. Con los datos actuales (22 miembros, ~2.000 actividades) la respuesta es inmediata; si el volumen creciera, la solución es cachear el resultado del motor v2, **no** revivir una segunda verdad en SQL.
- Los datos de demostración tuvieron que crecer: medir personas dejaba cuatro de las seis delegaciones sin nadie configurado. Se sumaron funcionarios a tres de ellas y **La Pampa se deja a propósito sin medición**, para que el estado del punto 3 se pueda mostrar.
- Queda **fuera de este bloque**: `GET /cumplimiento/:periodoId` sigue devolviendo el detalle por funcionario a todos los roles. El consolidado no lo necesita, pero el detalle individual roza la consulta abierta nº 11 (si un funcionario ve las cifras de sus pares). Se anota, no se cambia en silencio.
