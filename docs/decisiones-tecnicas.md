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
