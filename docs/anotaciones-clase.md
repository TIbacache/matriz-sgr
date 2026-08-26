# Anotaciones de la reunión de requerimientos — procesadas

**Fuente**: apuntes de clase de la reunión con el cliente (Javier, ex-delegado Avenida del Mar) + respuestas a preguntas de alumnos + anotaciones post-reunión. Archivo original: `AnotacionesReunionRequerimientos.md` (del usuario). Existe además una **grabación de 1h43m** de la reunión completa, aún sin transcribir.

**Método**: cada punto lleva etiqueta. Solo lo **[CONFIRMADO]** puede tocar código. Lo **[HIPÓTESIS]** y **[AMBIGUO]** espera validación. **NADA de este documento se implementa hasta que se decida explícitamente.**

---

## 1. Lo que ya construimos y la reunión CONFIRMA ✔

| Punto | Estado en el sistema |
|---|---|
| Estados del tubo: pendiente / en proceso / realizado; fecha vencida en rojo | ✔ Implementado (kanban + `tarea-card-fecha--vencida`) |
| Libro por delegación; otras delegaciones ven en solo lectura; campos que solo edita admin | ✔ Rooms por unidad + gerente solo-lectura en unidad ajena; matriz de roles |
| Colaborativo en vivo, 24/7, móvil y desktop, reemplazar Google Drive | ✔ Socket.io + dnd-kit táctil + responsive |
| Ver quién está trabajando en el momento (Efecto Hawthorne) | ✔ Presencia en vivo |
| La meta la crea un rol de supervisión | ✔ `PUT /metas` solo admin/supervisor |
| Gerencia con resumen/semáforo general de cada delegación | ✔ Diseñado para Fase 4 (dashboard supervisor) |
| Cumplimiento ponderado: ponderador × meta trimestre × avance → % → total | ✔ Vista materializada (estructura general correcta) |
| Multi-tenant vendible a cualquier muni o empresa | ✔ Arquitectura multi-tenant con terminología configurable |
| Escala: ~26 personas por delegación, ~40 usuarios aprox | ✔ Dentro de lo dimensionado (20-100) |

## 2. [CONFIRMADO] pero CONTRADICE lo construido — cambios a aplicar al retomar ⚠

1. **Umbrales y colores del semáforo** (respuesta directa del cliente):
   - **Verde: ≥ 100%** · **Naranjo: 60–100%** · **Rojo: ≤ 60%**. Además, **bajo 80% le "ponen el ojo"** a la persona (umbral de vigilancia, no de color).
   - Lo nuestro (verde ≥80 / amarillo 50-79 / rojo <50) **está mal**. Cambiar: CASE de la vista materializada, DESIGN.md §3.1 y texto de HU-4.2/5.1. El color "amarillo" pasa a llamarse **naranjo** (el hex `#B87E00` ámbar ya es compatible visualmente; renombrar token es opcional, los umbrales son lo importante).
2. **Los 4 pilares reales** (encuesta a delegados): **Seguridad** (inspectores, resguardo, anticipación de delitos), **Diserco** (basura, áreas verdes, poda, maquinaria, caminos), **Social/Dideco** (ayudas, giftcards, certificados, bonos), **Organizaciones comunitarias** (juntas de vecinos). Nuestro seed usa nombres inventados → actualizar seed.
   - **Ojo**: los pilares tienen **distinta prioridad por delegación** (hoy `ordenPrioridad` es por organización → ver pregunta P4).
3. **Las 6 delegaciones reales de La Serena**: Centro, Rural, Antena, Pampa, Avenida del Mar, Las Compañías → usar en el seed.

## 3. [CONFIRMADO] NUEVO — no construido aún, requiere diseño 🆕

**El hallazgo estructural**: la unidad de medición NO es solo la delegación — es **la persona**. En el Google Sheet actual: 1 planilla por delegación, **1 pestaña por funcionario**, cada funcionario con **sus propias funciones y sus propias metas**. El semáforo (Área, Responsable, Licencia, Vacaciones, Compensatorios, Días totales, Objetivo al día, Avance, Color) es una tabla **por persona** dentro de la delegación. Nuestro modelo mide por (unidad × categoría); falta el nivel funcionario.

Requerimientos nuevos confirmados en la reunión:

1. **Metas por funcionario** además de por delegación; el semáforo individual muestra quién va bajo la línea diaria esperada.
2. **Solicitudes de vecinos con trazabilidad** ("sistema de tickets"): el caso crítico del niño que pidió regalo de navidad en 5 delegaciones distintas → los vecinos se identifican por **RUT**, la trazabilidad debe cruzar delegaciones. Click en un requerimiento → **modal con la trazabilidad completa**. Búsqueda por RUT → nombre. Canales de entrada: WhatsApp, correo, libro de reclamos.
3. **Una solicitud = un resultado**: lo extra que se haga no suma puntaje ("nos sirve que metan el gol, no que jueguen bonito"; "si vendió cuchuflí pero no estaba en las metas, no cuenta").
4. **Anti-trampa de emergencias**: separar trabajo de **emergencia** vs **normal** para que las emergencias no inflen el puntaje ("la gente es pilla y le buscará el truco").
5. **Workflow de aprobación**: cuando un usuario modifica algo, **el supervisor debe aceptar el cambio** antes de que cuente.
6. **Evidencias fotográficas**: subir fotos como verificadores; el supervisor marca **"Revisado"**; título con iniciales del área; **galería de fotos por evento**; debe ser **extremadamente simple** (muchos usuarios no manejan planillas).
7. **Felicitaciones y reclamos como ítems medidos**: cada uno con ponderador, meta trimestre, avance y % — entran al **cumplimiento total ponderado** junto a la gestión. Supervisor/gerente con modal para registrar felicitaciones (idea de QR: evaluar factibilidad).
8. **Sistema de alertas a usuarios** (semáforos y KPIs).
9. **Fichas con campos obligatorios** (solicitudes).
10. **RUT y datos personales** (indicación del profesor): RUT como identificador único de personas (formato `15027946-1` o con puntos — definir normalización), nombres y apellidos paterno/materno **en columnas separadas**, fechas bien tipadas. Decisión técnica nuestra (a validar): PK sigue siendo UUID (surrogate), RUT como columna `UNIQUE NOT NULL` normalizada **sin puntos, con guión y DV**, validada con módulo 11, formateada solo en UI — cumple el requisito del profesor ("el dato que nunca cambia") sin acoplar FKs a un dato externo.
11. **BI navegable**: "pinchar informe y que busque la información y saque el semáforo" (drill-down desde el gráfico).

## 4. [AMBIGUO] — no actuar, preguntar 🌫

- "Cuando crear usuario esté funcional ahí se puede cobrar la base de datos" — ¿se refiere a poblar la BD real? ¿a un modelo de cobro por usuario? Sin acción.
- "~40 personas" — ¿total del sistema o usuarios simultáneos? (una sola delegación ya tendría 26).
- "Objetivo al día": sigue **PROHIBIDO inventar la fórmula** (regla CLAUDE.md nº5). Las columnas Licencia/Vacaciones/Compensatorios/Días totales sugieren prorrateo de la meta por días hábiles efectivos, pero la fórmula exacta la debe dar el cliente/profesor.

## 5. Impacto en el ERD (borrador para discutir — NO implementar)

Entidades nuevas probables: `funcionarios` (persona con RUT, nombres/apellidos separados, vínculo a unidad y área/pilar) · `metas_funcionario` · `vecinos` (RUT único, cross-delegación) · `solicitudes` (ticket: vecino, canal, delegación, responsable, tipo normal/emergencia, estado, resultado único) · `solicitud_historial` (trazabilidad) · `evidencias` (foto, revisadoPor, evento) · `felicitaciones`/`reclamos` medibles · `asistencia` (licencia/vacaciones/compensatorios por persona/periodo) · `aprobaciones` (cambios pendientes de visto bueno del supervisor) · prioridad de pilar por delegación.

Relación `solicitud → tarea`: la solicitud del vecino puede generar tareas en el tubo (la tarea es interna, la solicitud es la cara externa con trazabilidad).

## 6. Preguntas para el profesor / cliente (ordenadas por urgencia)

1. **Fórmula exacta de "Objetivo al día"**: ¿cómo se descuentan licencias/vacaciones/compensatorios de los días hábiles y cómo se prorratea la meta del trimestre al día de hoy?
2. **Estructura exacta de la planilla por persona**: ¿pueden compartir el Google Sheet (o captura de una pestaña) para ver columnas y filas reales?
3. **Semáforo**: confirmar verde ≥100 / naranjo 60-100 / rojo ≤60. ¿Se muestra por persona, por área, por delegación, o los tres niveles? ¿El "ojo" del 80% es visual (otro indicador) o solo criterio de gestión?
4. **Prioridad de pilares por delegación**: ¿cambia los ponderadores del cálculo o es solo orden de despliegue?
5. **Metas por funcionario vs por delegación**: ¿el cumplimiento de la delegación es el promedio de sus personas, o hay metas propias de delegación además?
6. **Aprobación del supervisor**: ¿qué cambios exactamente requieren visto bueno (avances, evidencias, todo)? ¿Qué pasa con el dato mientras está pendiente?
7. **Emergencias**: ¿cómo puntúan? ¿0, ponderador propio, categoría aparte?
8. **Felicitaciones/reclamos**: ¿quién los registra y con qué ponderador? ¿El QR es requisito o idea?
9. **Evidencias**: ¿tamaño/cantidad de fotos, es obligatoria por tipo de tarea?
10. **RUT**: ¿formato de almacenamiento preferido para la evaluación (sin puntos con guión vs con puntos)?

## 7. Regla de cierre

Cuando llegue una respuesta (profesor, cliente o la transcripción de la grabación), se actualiza este archivo: la etiqueta cambia a [CONFIRMADO] o [DESCARTADO], y solo entonces se planifica el cambio en schema/UI. Este documento es el buffer entre "lo que se dijo" y "lo que se construye".
