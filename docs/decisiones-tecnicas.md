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
