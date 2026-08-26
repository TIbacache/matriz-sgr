# Requerimientos del cliente — Matriz SGR

**Fuentes**:
1. `AnotacionesReunionRequerimientos.md` — apuntes de clase del equipo.
2. Transcripción TurboScribe — buena calidad, solo los primeros 30 min.
3. Transcripción Word con timestamps — **completa (1h41m)**, más errores de audio pero cubre todo el Q&A. Los timestamps citados abajo son de esta.
4. Aclaraciones del usuario (25-08-2026).

**Método**: **[CONFIRMADO]** = dicho por el cliente, puede tocar código. **[HIPÓTESIS]** = inferencia nuestra, necesita una línea de confirmación. **[AMBIGUO]** = no actuar.

**Cliente**: Javier Godoy, coordinador de las delegaciones municipales de La Serena. **Juan Francisco Labra**: su colega coordinador, autor de los Google Sheets, **es el supervisor y quien puede editar todo**.

---

## 1. 🔓 DESBLOQUEADO: las fórmulas del semáforo

Esto resuelve el bloqueo que arrastrábamos desde la Fase 1.

### 1.1 Días efectivos (el descuento de asistencia) — [CONFIRMADO] 01:05:31–01:09:42

> *"colocamos licencia, vacaciones, emergencias... nosotros le descontamos en los días que supuestamente son 90 días, entonces van a ser de 80"*
> *"los días trabajados van a ser los días medidos"*
> *"ya tuviste 10 días de urgencia, le descuentas 10 días, entonces tu 100% no va a ser el cien, tu 100% va a ser si llegas al 80"*

```
dias_totales    = 90 (el trimestre)
dias_efectivos  = 90 − licencia − vacaciones − compensatorios − emergencia
```

La meta se **prorratea**: quien trabajó 80 de 90 días alcanza su 100% con el 80% de la meta original. Razón declarada: *"tratamos de ser justos"* (en la empresa privada no lo harían, es una decisión deliberada del cliente).

### 1.2 Objetivo al día — [CONFIRMADO] 00:35:17–00:35:55

> *"esto es trimestral, por lo cual son 90 días. aquí vamos en el día número 85, con lo cual cada uno debería llegar a un 93 para ir al día"*

```
objetivo_al_dia = (dias_transcurridos / dias_efectivos) × 100
```

Es el porcentaje que **deberías llevar hoy** para terminar el trimestre en 100%.

### 1.3 Color del semáforo — [CONFIRMADO umbrales] 00:48:16 · [HIPÓTESIS FUERTE la normalización]

Umbrales, textual:
> *"de 100 para arriba siempre es verde"* · *"entre 100 y 60 es amarillo o naranja"* · *"de 60 para abajo es [rojo]"*

**Verde ≥ 100% · Naranjo 60–99% · Rojo < 60%**

**La clave (hipótesis fuerte)**: ese porcentaje **no es el avance crudo, es el avance comparado con el objetivo al día**. Evidencia: en 00:35:55 el objetivo del día era 93 y dice *"111% va en verde, 98% va en verde, todos van sobre 93; [el] que tiene 82% ya cayó"*. Un 98% crudo sería naranjo según los umbrales, pero él lo llama verde porque supera el 93 del día. Entonces:

```
% semáforo = (cumplimiento_ponderado_actual / objetivo_al_dia) × 100
```

Con eso todo cuadra: 98/93 = 105% → verde · 82/93 = 88% → naranjo · 111/93 = 119% → verde.
**→ Pregunta 1 al profesor**: confirmar esta normalización.

### 1.4 Tope de sobrecumplimiento: 150% — [CONFIRMADO] 01:24:26–01:25:20

> *"tenemos cumplimientos mínimos y cumplimientos máximos... si usted me cumple con un 180%... nosotros limitamos, eso está a 150"*
> *"cumplimientos equilibrados, porque no sacamos nada con que estés cumpliendo en atención de usuario cuando la persona que quiere que le saques un árbol... no lo vayas a hacer"*

**Tope por ítem: 150%.** Existe para forzar cumplimiento **equilibrado** entre metas, no reventar una sola. ⚠ Nuestra vista materializada topea en 100% (`LEAST(..., 1)`) → debe ser `LEAST(..., 1.5)`.

### 1.5 Mínimo esperado: 80% — [CONFIRMADO] 01:25:28–01:26:15

> *"al fin del período es 80% el mínimo, lo que esperamos, que se saque una nota 6"* · *"si es bajo el 80% uno ya empieza a ponerle ojo a la persona"* · *"bajo el 75%... ¿será bueno para este puesto o hay que reubicarlo?"*

No es un color: es **umbral de gestión** (a quién acompañar). Podría mostrarse como línea de referencia en los gráficos.

### 1.6 Felicitaciones y reclamos — [CONFIRMADO cifras] 01:02:14

> *"el reclamo te quita un 20% y la felicitación les da un 10, con un máximo de una felicitación mensual, porque hay gente que viene y dice 'oiga, por qué no me deja una felicitación' y se llenan con 10 felicitaciones"*

**Reclamo −20% · Felicitación +10% · tope 1 felicitación por mes y persona.**
[AMBIGUO]: si son puntos porcentuales sobre el total, o ítems con su propio ponderador (los apuntes sugieren lo segundo). → **Pregunta 2**.

Registro: llegan por **WhatsApp, correo o libro de reclamos**; *"alguien lo tiene que colocar ahí, y en este caso tendría que ser el jefe"*. Campos: fecha, nombre del usuario, contacto, sector, situación, trabajador señalado.

### 1.7 Emergencias: el anti-trampa — [CONFIRMADO] 01:09:46–01:10:41

> *"hay gente que se aprovecha de la emergencia y hace mil cosas. Entonces para que esas mil cosas igual le sumen, pero tampoco le sumen mil, nosotros colocamos la opción de emergencia"*
> *"le coloco todas las emergencias que tuvo, tuvo 10, entonces su meta era 10 y cumple el 100%, **pero yo le pido solamente el 5% de ponderación**"*

La emergencia **es una meta más, con ponderador 5%**. Así el trabajo de emergencia suma algo pero no infla el total. Además, los días de emergencia se descuentan de los días efectivos (§1.1). Cita del cliente que resume la filosofía: *"los chilenos son pillos y siempre le buscan el truco al sistema"*.

---

## 2. ⚠ Correcciones a lo YA implementado

| Qué | Implementado | Correcto | Dónde |
|---|---|---|---|
| Umbrales del semáforo | verde ≥80 / amarillo 50-79 / rojo <50 | **verde ≥100 / naranjo 60-99 / rojo <60**, normalizado contra el objetivo al día | migración `vista_cumplimiento`, DESIGN.md §3.1 |
| Tope por ítem | 100% (`LEAST(...,1)`) | **150%** (`LEAST(...,1.5)`) | misma migración |
| Días del período | no existe | descuento de licencia/vacaciones/compensatorios/emergencia | tabla `asistencia` nueva |
| Visibilidad entre delegaciones | gerente ve otras en solo lectura | ⚠ **el cliente dice lo contrario** (ver §5) | `tareas.routes.ts` |
| Nombres del seed | pilares y delegaciones inventados | los reales (§3.1) | `prisma/seed.ts` |

---

## 3. Estructura real del sistema

### 3.1 Datos reales para el seed — [CONFIRMADO]

- **6 delegaciones**: Centro, Rural, La Antena, La Pampa, Avenida del Mar, Las Compañías.
- **4 pilares** (de una encuesta, se repiten en todas): **Seguridad** (inspectores municipales, resguardo, anticipación de delitos) · **DISERCO** (Dirección de Servicios a la Comunidad: basura, áreas verdes, poda, maquinaria, caminos) · **Social/DIDECO** (ayudas, giftcards, certificados universitarios, bonos) · **Organizaciones Comunitarias** (juntas de vecinos).
- **Prioridad y contenido varían por delegación** — 00:13:35: en La Pampa DISERCO va primero por áreas verdes (*"es lo más arbolado"*); en La Antena DISERCO es basura; en el Centro DISERCO es *"limpieza y rayado"*. Centro/Rural agregan un 5º: **Patrimonio**.
- **Puestos con pestaña personal** (00:51:49, textual): apoyo administrativo, **coordinador de DISERCO**, territorial 1 a 4, gestión social 1 y 2. Más el delegado y un segundo a cargo *"que hace el control"* mientras el delegado sale a terreno.
- **Escala**: ~26 personas en Las Compañías; **~40 usuarios** usarán el sistema.

### 3.2 La abstracción central: cargo → funciones → metas — [CONFIRMADO] 00:59:16

> *"esta es la empresa cualquiera y ustedes tienen los cargos —chofer, cocinero— el cargo y el nombre de la persona que ocupa ese cargo, y después por cada cargo tienen funciones"*

Esta es la clave de la multi-tenencia: **cargo** (puesto) → **funciones** (lo que ese cargo hace) → **metas** (cuánto de cada función en el trimestre). Sirve igual para un municipio que para una empresa de servicios.

Ejemplos reales de metas por cargo:
- *Apoyo administrativo* (00:52:12): atención al usuario, **llamadas preventivas** (*"una vez que se atendió a la persona, uno la llama a la semana: 'señora Rosita, ¿le fueron a cortar el...?' y si dice que no, todavía podemos rescatar a esa persona"*), informe de inventario, informe de relación.
- *Territorial* (00:59:43): atención al público, visitas y reuniones, conformación de directivas, gestión de talleres.
- *DISERCO*: talleres de limpieza y reciclaje (12 al trimestre = 1 por semana), operativos de limpieza, informes semanales.
- *Transversal*: **soluciones de ingreso al tubo** — las solicitudes que uno ingresó y resolvió se contabilizan *"para motivar que ellos trabajen ingresando solicitudes"*.

### 3.3 Tubo ↔ pestaña personal ↔ metas — [CONFIRMADO] 01:20:22

Confirmada la **opción (a)**: son registros distintos y ligados. El tubo tiene lo que hay que hacer; la pestaña personal registra lo realizado (venga del tubo o sea una función propia del cargo, como "atención al usuario"). **Y lo realizado no vale hasta que el supervisor lo valida**, textual:

> *"Acá generalmente tienen cero... **cuando yo le coloco el número uno acá, me quedan verdes** y este uno se multiplica por la gestión que está haciendo y me sube arriba a la atención de usuario y me da los puntos, y vamos sumando"*
> *"Hay veces que nos llaman: 'oye, pero no me han revisado para que me den los puntos'"*

Es decir: la actividad entra con **0 puntos**; el supervisor (Juan Francisco) pone el 1 y recién ahí suma a la meta. Ese "1" es el gate de todo el sistema de medición.

### 3.4 Evidencia fotográfica y código verificador — [CONFIRMADO] 01:11:41, 01:31:22

- Al ingresar la fecha, **el sistema genera un código** correlativo único: **iniciales del área + número** (ej. `COS-22` para DISERCO/coserco). *"No se repite."*
- El funcionario sube la foto **nombrada con ese código** y marca "imagen verificadora sí/no".
- El supervisor busca por código, revisa, y marca **"rev"** → la celda queda verde y **se otorga el punto**.
- Solo **fotos** (PNG/JPG, sacadas del teléfono), **no video**.
- Pedido explícito del cliente: *"si dentro de la misma planilla quieren que tenga fotos, subo la foto y de ahí mismo pinchar, eliminamos la otra pantalla del verificador... simplificar, mientras más fácil mejor"* → **galería de fotos por evento, con histórico**.
- Motivo: *"tenemos un montón de usuarios que no manejan planilla"*. La usabilidad es requisito, no lujo.

### 3.5 Ficha de solicitud — [CONFIRMADO] 01:19:00

Campos: **RUT (obligatorio, bloquea el avance si falta** — *"de nada me sirve colocar que atendí a alguien si no tengo RUT"*), nombre, teléfono, sector, problemática/qué quiere, **categoría y subcategoría**, interés **externo/interno**, delegación, responsable, fecha de compromiso, avances, estado.

Taxonomía real del área Social (00:55:25):
- Tipo de primer ingreso: informe · gestión de subsidio · gestión social · otra gestión.
- Tipos de informe: aporte económico, aporte material, institución (servicios para universidades), exención de pago de aseo, orientación social.
- Subsidios: IPS, PGU, SAP, SUF, actas de entrega.

**Múltiples visitas por solicitud** (00:56:52): *"un asistente social puede tener cuatro visitas: primero la persona pide información, vuelve con el carnet, después se le entrega"*. Se registra **fecha comprometida vs. fecha real** — *"una cosa es la fecha que digo que voy y otra la fecha que voy"* — para medir el tiempo total entre solicitud y entrega.

**Una solicitud = un resultado** (01:35:16): lo que se derive a otra área no suma al territorial.

### 3.6 Trazabilidad y modal — [CONFIRMADO] 01:12:47 (pedido del profesor, aceptado)

> *"Que mis alumnos, cuando hagan clic a ese requerimiento, aparezca un modal con la ficha completa y la evidencia de todo lo que traza esa solicitud"*

Motivo de negocio (de los apuntes): el niño que pidió el mismo regalo de navidad en 5 delegaciones distintas. La trazabilidad por RUT debe cruzar delegaciones.

### 3.7 Indicador de "último ingreso" — [CONFIRMADO] 01:06:44 🆕

Indicador que no teníamos y que el cliente valora mucho:

> *"saqué otro indicador que es importante: el último ingreso en la pestaña. Aquí tenemos personas que llevan 27 días, 49 días sin ingresar información... están en rojo los que no ingresan"*

Columnas: fecha de hoy · fecha de inicio de la medición · última fecha de ingreso · **diferencia en días**. Mide adopción del sistema, no cumplimiento. Su argumento: *"la delegación ingresó 963 solicitudes, son 17 al día; si me demoro 4 minutos en ingresar un dato y atiendo 3 personas al día, son 12 minutos. ¿Cómo alguien me va a decir que no tiene 12 minutos?"*

### 3.8 Inmutabilidad y campos bloqueados — [CONFIRMADO] 01:18:00

> *"idealmente, cuando la persona hace algún ingreso, después no pueda borrarlo... aunque se anotó aquí, no se pueda editar"*
> *"yo tengo algunos sectores que no pueden cambiar, solamente yo, para evitar que me cambien fórmulas"*
> *"la gente arma columnas aparte donde ella cree que puede colocar cosas y nos desarma todo el sistema"*

→ Registros **append-only** una vez validados; estructura (metas, ponderadores, fórmulas) solo editable por admin/supervisor. En un sistema con campos fijos esto se resuelve solo: *"apartan los campos hechos, entonces no van a poder hacer columnas de más"*.

### 3.9 Aprobación en standby — [CONFIRMADO] 01:19:34

Propuesto por el profesor y aceptado por el cliente:
> *"La persona completa una ficha, la sube, y esa **queda en standby hasta que el supervisor la acepte**; una vez aceptada se sube al sistema"* → *"Claro, entonces ahí tienen otro rol"*

### 3.10 Comunicación dentro del sistema — [CONFIRMADO] 01:41:24 (de la 1ª transcripción)

> *"no me manden WhatsApp, no me llamen: colóquenme en la celda que tiene problema un comentario. 'Don Juan, esto no lo entiendo', 'Don Juan, agrándeme la celda'. Yo lo veo de manera inmediata y lo resuelvo"*

→ **Comentarios contextuales** sobre las filas/celdas, como canal oficial de dudas.

---

## 4. Reglas de negocio confirmadas

1. **Trabajo fuera de las metas no cuenta** — el "cuchuflí". Textual (01:28:11): *"no nos sirve jugar bonito, la paro de taquito, la paro de pecho. No nos sirve: nos sirve el gol. Y el gol es que haya visitado a la junta de vecinos, no que le sirva galletitas"* (caso real: una territorial anotó *"apoyo en dejar galletitas para la reunión"* bajo la meta "visitas y reuniones").
2. **La meta la fija el nivel de supervisión** (00:53:39): *"las metas las colocamos nosotros en base a un presupuesto"*. El funcionario no crea metas.
3. **La fecha de compromiso la pone el propio funcionario** (00:31:46), consultando al área ejecutora. Su valor real: poder llamar al vecino **antes** de que venza — *"lo que no puede pasar es que él esté esperando y nadie nunca lo llamó"*.
4. **Vencida solo si no está realizada** (00:49:53): *"si esa fecha que pasó está realizada, no hay problema, se realizó en la fecha"*. ✔ Ya implementado así.
5. **El delegado revisa lo que está por vencer, no lo hecho** (00:31:10): *"cuando revisa el tubo no se preocupa por lo que está hecho, se preocupa por lo que está por vencer"*.
6. **Metas variables por trimestre** (00:40:20): útiles escolares se disparan en marzo, otras cosas para el 18 de septiembre. Hay que **comparar el mismo trimestre entre años** (Q3-2025 vs Q3-2026), no trimestres consecutivos.
7. **Reunión semanal del tubo** con todos los funcionarios, caso por caso, para coordinar apoyos entre pares.
8. **Datos desde cero** (01:22:52): *"tiene que partir de cero"*, sin migración; se parte con usuarios de prueba tipo "Juan Pérez".

---

## 5. Roles y visibilidad

Jerarquía declarada (01:16:12): **Alcaldesa/Gerencia** (perfil de resumen consolidado de todas las delegaciones) → **Coordinación** (Javier y Juan Francisco: control total, editan lo bloqueado, validan puntos) → **Delegado** → **Funcionario**.

⚠ **CONTRADICCIÓN A RESOLVER** — visibilidad entre delegaciones:
- Apuntes del equipo: *"las delegaciones pueden ver los libros de las otras delegaciones"*.
- Transcripción 00:37:11, textual: *"Cada delegación tiene un libro, **no se pueden ver entre ellos**, pero cada integrante de la delegación puede ver todo el libro"*.

Nuestra implementación siguió los apuntes (gerente ve otras delegaciones en solo lectura). Si vale la transcripción, hay que cerrarlo. Matiz posible: el **semáforo consolidado** sí sería visible por todos (alimenta la "sana competencia" y el Efecto Hawthorne), mientras que el **libro/tubo** de cada delegación es privado. → **Pregunta 3**.

---

## 6. Proceso del proyecto — [CONFIRMADO] 01:00:23

- **Product Owners = los profesores**. Todos los requerimientos se canalizan a través de ellos, no directo al cliente: *"para que no se vuelva 100 requerimientos bajo 100 canales"*.
- Validación **por sprint** con el docente.
- El equipo designa **un representante**.
- El cliente asistirá *"cada 15 días"* si puede (prioriza emergencias reales: *"si aparece una lluvia, ellos tienen que responder a los vecinos"*).
- **Pendiente de entrega del cliente**: la parametrización/estados de cada ticket, los nombres exactos de las columnas, y el PPT (requiere autorización).
- Visión comercial: *"piénsenlo para una empresa, esto es aplicable a cualquier empresa"* + *"imagínate venderle a todas las municipalidades"*.

---

## 7. Requisitos no funcionales — [CONFIRMADO]

- **Colaborativo en vivo** (01:02:43): *"conviene que sea en vivo, en línea"* — no negociable, reemplaza Google Drive. La alcaldesa debe poder preguntar *"¿cómo va La Antena?"* y verlo al momento.
- **Web responsive, no app nativa** (01:39:45): *"tiene que estar disponible en ambiente web, se tiene que abrir en el navegador"*, en celular y computador.
- **24/7** por exigencia académica; el cliente relativiza (*"si se cae una hora, la gente esperará"*), pero el profesor lo mantiene como requisito de la tríada de seguridad (disponibilidad).
- **Simplicidad extrema**: el público objetivo no maneja planillas.

---

## 8. Preguntas abiertas (para el profesor, como PO)

1. **Semáforo**: ¿el % que se colorea es el avance **normalizado contra el objetivo al día** (§1.3)? Es la fórmula central del sistema.
2. **Felicitaciones/reclamos**: ¿−20% y +10% son puntos porcentuales sobre el cumplimiento total, o ítems con ponderador propio dentro de la matriz?
3. **Visibilidad entre delegaciones**: ¿libros privados por delegación (transcripción) o visibles en lectura (apuntes)? ¿Y el semáforo consolidado, quién lo ve?
4. **Nombres exactos de columnas** de la planilla y **parametrización de estados del ticket** (el cliente se comprometió a enviarlos).
5. **Emergencia**: ¿los días de emergencia se descuentan *además* de que la emergencia sea una meta al 5%, o es una cosa u otra?
6. **Tope 150%**: ¿es por ítem o sobre el total? ¿Se bloquea la carga al llegar al tope (idea de un alumno) o solo deja de sumar?
7. **Metas por funcionario vs. delegación**: ¿el cumplimiento de la delegación es el promedio de sus personas, o tiene metas propias?
8. **RUT**: formato de almacenamiento preferido para la evaluación.

## 9. Regla de cierre

Cuando llegue una respuesta, se actualiza este archivo (la etiqueta cambia a [CONFIRMADO] o [DESCARTADO]) y **solo entonces** se planifica el cambio en schema/UI. Este documento es el buffer entre "lo que se dijo" y "lo que se construye".
