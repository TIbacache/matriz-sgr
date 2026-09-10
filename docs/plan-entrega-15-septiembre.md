# Plan de la entrega del 15 de septiembre — Análisis y Diseño

**Versión**: 1.0 · **Fecha**: 6 de septiembre de 2026 · **Estado del software**: `v0.15.0-control-actividad`, 332 comprobaciones en verde

Este documento **reemplaza como plan operativo** a [Guia-Entregables-15-septiembre.docx](Guia-Entregables-15-septiembre.docx), que se escribió el 1 de septiembre contra `v0.7.1` y ya no conoce cuatro bloques de trabajo. La guía sigue sirviendo para dos cosas: su paso a paso por entregable y su ejemplo desarrollado de CU-03. Todo lo demás se lee aquí.

Fuentes que mandan, en orden:

1. **[Rúbrica oficial](Entrega_15_Septiembre_Semana_Analisis_Diseno_Rubrica.pdf)** y **[Relación entre los artefactos](Relación%20entre%20los%20artefactos.pdf)** — los PDF del profesor, versionados en `docs/`. Transcritos y resumidos en **[rubrica-entrega-15-septiembre.md](rubrica-entrega-15-septiembre.md)**: 100 puntos, 8 criterios, la ficha mínima de cada CU y la cadena de artefactos.
2. [requerimientos-oficiales.md](requerimientos-oficiales.md) — los 38 RF, 18 RNF, 13 RN, 10 CA y 31 HU del PDF del proyecto.

---

## 1. La rúbrica, criterio por criterio, contra lo que hay hoy

| # | Criterio | Pts | Qué hay hoy | Veredicto |
|---|---|---|---|---|
| 1 | **Planner / Jira** | 15 | El CSV quedó reescrito contra el estado real: **87 tareas**, ninguna bloqueada, con la tarea que faltaba del diagrama de requerimientos. Falta cargarlo en el tablero | 🟠 **Preparado, sin cargar.** INACAP no deja automatizarlo: va a mano con [entrega/guia-planner-hector.pdf](entrega/guia-planner-hector.pdf). Ver §1.bis |
| 2 | **Diagramas de requerimientos** | 10 | **[entrega/requerimientos.md](entrega/requerimientos.md)**: los 38 RF y 18 RNF por módulo y por épica, con actores y trazados a los CU, en 8 diagramas PlantUML | ✅ **Hecho** (9-09-2026) |
| 3 | **Caso de uso general** | 10 | `diagramas.md §2`, del 25 de agosto: 4 actores de 6, 12 casos del modelo v1, sin frontera ni «include»/«extend» | 🟠 **En curso.** Rehacer en PlantUML |
| 4 | **Casos de uso específicos + fichas (mín. 10)** | 20 | **Cero fichas.** La guía propone 10 CU con actor y RF, y desarrolla CU-03 como plantilla | 🔴 El criterio más caro y el más vacío |
| 5 | **Diagrama de clases** | 15 | **No existe** | 🔴 Hay que crearlo de cero |
| 6 | **DER MySQL** | 10 | `diagramas.md §3`: 7 tablas del modelo **v1**, con `metas` y la vista materializada que **se eliminaron** en el Bloque C. El modelo real tiene 16 entidades | 🔴 Está mal, no solo incompleto |
| 7 | **Script SQL** | 10 | **No existe.** El esquema real es PostgreSQL vía Prisma | 🔴 Ver decisión D-1 |
| 8 | **Mockup funcional + Git** | 10 | 8 pantallas navegables, README con tecnologías e instrucciones, repositorio ordenado | 🟢 **Es lo más fuerte que tenemos.** Faltan los escenarios alternativos |

**Lectura del cuadro**: de 100 puntos, **85 dependen de artefactos de análisis y diseño que hoy no existen o están obsoletos**, y solo 10 dependen del software, que es justamente lo que está terminado. La entrega no se juega en el código: se juega en documentar lo construido.

> **Avance al 9 de septiembre de 2026**: cerrados los criterios **1** (preparado, falta cargarlo a mano) y **2**. Quedan **75 puntos** en artefactos por construir, y el más caro sigue siendo el 4, con 20.

---

## 1.bis El Planner real, y por qué el plan de carga ya no sirve tal cual

El tablero `P2-C1/DesarrolloSW-MuniLS-OrigamiSpA` **no está vacío**. Tiene los siete depósitos de la plantilla del profesor y ocho tareas:

| Depósito | Tareas |
|---|---|
| Ámbito | — |
| Requisitos de análisis o software | ✅ Presentación Profesor |
| **Diseño** | **GIT** (0/1) · **Diseño MockUps** (0/3) · **Modelo Entidad-Relación** (0/3) · **Diagramas UML** (0/1) · **Diagramas de Clase** (0/1) — las cinco con vencimiento **15/9** y responsables asignados |
| Desarrollo | — |
| Pruebas | — |
| Piloto e implementación | — |
| Etapas Terminadas | ✅ Entrega de Requerimientos funcionales-No funcionales · ✅ Presentación Problemática (marcada urgente) |

Eso cambia tres cosas del plan:

**1. El problema no es que el tablero esté vacío: es que dice algo que no es cierto.** Desarrollo, Pruebas y Piloto sin una sola tarea describen un proyecto que todavía no empieza a construir, cuando hay **quince bloques cerrados, 332 comprobaciones en verde y quince etiquetas de versión**. La rúbrica pide «backlog del proyecto organizado y priorizado» y «estados de trabajo claramente diferenciados»: un tablero que solo muestra la entrega en curso deja fuera el 80% del trabajo hecho, y es justo lo que da los 15 puntos.

**2. Falta la tarea del diagrama de requerimientos.** Las cinco tareas de Diseño cubren GIT (criterio 8), mockups (8), MER (6 y 7), UML (3 y 4) y clases (5). **El criterio 2 —Diagramas de requerimientos, 10 puntos— no tiene tarea que lo represente.**

**3. El CSV del 1 de septiembre no se podía cargar tal cual.** El script es idempotente *por título exacto*, y los títulos del CSV no coincidían con los que escribió Héctor: «Modelo entidad-relación inicial» (CSV) contra «Modelo Entidad-Relacion» (tablero) eran la misma tarea con dos nombres, y habrían quedado las dos. Además marcaba como Bloqueado el modelo de datos v2 y las historias por funcionario, que están construidos y verificados. **Corregido el 8 de septiembre**: el CSV quedó reescrito con 87 tareas, ninguna bloqueada y sin títulos que choquen. Y la carga pasó a ser a mano, con lo que el riesgo del acento desaparece.

**Qué hacer entonces**:

- **Conservar sus cinco tareas de Diseño**: están bien planteadas, tienen fecha y responsables, y son exactamente los entregables de la rúbrica.
- **Agregar la que falta**: «Diagrama de Requerimientos», mismo depósito, misma fecha.
- **Poblar Desarrollo y Pruebas con lo ya hecho, marcado como Completado**, para que el tablero cuente la verdad: modelo v2, API del registro y la validación, metas por funcionario, ficha personal, bandeja del verificador, identidad visual, ficha del vecino, rutas endurecidas, atención social, solicitud en el tubo, dashboard v2, control de actividad y los siete verificadores.
- **Estados**: Planner básico solo tiene *No iniciada / En curso / Completada*, y la rúbrica menciona cuatro («Por hacer, En desarrollo, En revisión, Finalizado»). Se cubre con **etiquetas de color** para «En revisión», y se explica en el informe. No es un problema real, pero conviene decirlo antes de que lo pregunten.
- **Capturar el tablero** una vez poblado: la rúbrica pide la captura y el enlace.

> **Decisión del 9 de septiembre — se carga a mano, porque INACAP no deja automatizarlo.** `plan-desarrollo.csv` quedó reescrito contra el estado real (87 tareas, ninguna bloqueada, sin títulos que choquen con los de Héctor), pero el script no puede cargarlo: el tenant de INACAP tiene desactivado el consentimiento de usuario para *Microsoft Graph Command Line Tools*, y el inicio de sesión termina en «Need admin approval» incluso pidiendo solo `Tasks.ReadWrite`. Se descartó que fuera un permiso concreto o el intermediario de cuentas de Windows: está bloqueada la aplicación entera. La ruta es **[entrega/guia-planner-hector.pdf](entrega/guia-planner-hector.pdf)**, seis tandas con el contenido exacto de cada tarjeta. El diagnóstico completo queda en [guia-cargar-planner.md](guia-cargar-planner.md), porque «por qué no lo automatizaron» es una pregunta que hay que poder responder.

> ⚠ **El desfase no es casual.** Los diagramas son del 25 de agosto y describen el modelo v1: `metas` por unidad × categoría, la vista materializada `cumplimiento_ponderado_vista`, un cron que la refresca y umbrales «verde ≥80, amarillo 50-79, rojo <50». Nada de eso existe desde el Bloque C, y los umbrales nunca fueron esos. **Presentar esos diagramas sería entregar un sistema que no es el nuestro**, y el criterio transversal de la rúbrica es precisamente la coherencia entre artefactos.

---

## 2. Decisiones que hay que tomar antes de dibujar

### D-1 · El script y el DER se piden en MySQL; el sistema corre en PostgreSQL

La rúbrica lo dice dos veces y con puntaje: «DER – Diagrama Entidad–Relación **para MySQL**» (10 pts) y «Script de base de datos **MySQL**» (10 pts), con una validación cruzada explícita: *«Toda FK representada en el DER debe existir en el script SQL»*.

**Decisión**: se entrega el script MySQL como **artefacto de modelado**, traducido fielmente desde `backend/prisma/schema.prisma`, y se declara en el informe que la implementación usa PostgreSQL 16. No se migra el sistema: migrar por una rúbrica sería cambiar la arquitectura de un producto que funciona para aprobar un criterio de formato.

Qué cambia en la traducción, y hay que dejarlo escrito:

| PostgreSQL (real) | MySQL (entregable) | Por qué |
|---|---|---|
| `uuid` con `gen_random_uuid()` | `CHAR(36)` con `UUID()` en `DEFAULT` o en la aplicación | MySQL no tiene tipo UUID nativo hasta 8.0 y aun ahí es binario |
| `jsonb` (`configuracion_terminologia`) | `JSON` | MySQL 5.7+ lo soporta, sin operadores de índice |
| Enums de Prisma (`Rol`, `EstadoPeriodo`…) | `ENUM(...)` de MySQL | Equivalente directo |
| `TIMESTAMPTZ` | `DATETIME` + nota de que la aplicación guarda UTC | MySQL no almacena la zona |
| Triggers de inmutabilidad (auditoría, código) | `BEFORE UPDATE` / `BEFORE DELETE` con `SIGNAL SQLSTATE` | Equivalente funcional |
| `CHECK` de RUT, fechas y metas | `CHECK` (MySQL 8.0.16+) | Se declara la versión mínima |
| Índice de expresión para el nombre (ADR-003) | Columna generada + índice | MySQL no indexa expresiones arbitrarias |

**Consulta abierta nº 13** para el docente: si se acepta un script PostgreSQL —que es el que ejecuta el sistema real— o si se exige MySQL aunque el proyecto no lo use. Mientras no responda, **se entregan los dos**: el MySQL porque lo pide la rúbrica y el de Prisma porque es el que corre.

### D-2 · Los casos de uso salen de lo construido, no del catálogo completo de RF

El ejemplo del docente cierra con un **mapa de trazabilidad CU → mockup**: cada caso de uso debe tener su pantalla. Si se documentan casos de uso de funciones que no existen (exportar informes, pantalla de auditoría, administración de catálogos), ese mapa queda con huecos y el criterio transversal de coherencia se cae.

**Decisión**: los 12 CU específicos se eligen entre lo que **tiene pantalla y prueba automatizada**. Los RF sin pantalla (RF-025 ajustes, RF-033 exportación, RF-035 comentarios, RF-037 alertas) aparecen en el **diagrama de requerimientos** —donde sí corresponde mostrar el alcance completo— marcados como no implementados en esta iteración.

### D-3 · Los escenarios alternativos también son mockup

El mapa del docente incluye «Modal de error», «Mensaje de búsqueda sin resultados», «Modal de advertencia». Nuestros 8 mockups muestran el camino feliz de cada pantalla. Tres de los escenarios alternativos ya son capturables porque están en pantalla (aviso de duplicidad, 403 con el motivo escrito, delegación sin medición); el resto hay que producirlos.

**Decisión**: `scripts/mockups.mjs` se extiende con una lista de **escenarios**, no solo de pantallas, y cada escenario se ancla al CU cuyo flujo alternativo representa.

---

## 3. Qué se resuelve en esta entrega

### 3.1 Lo primero, y sin ello nada cuenta

- **Completar el Planner** (15 pts) según §1.bis: conservar lo que hay, agregar la tarea del diagrama de requerimientos, poblar Desarrollo y Pruebas con lo ya construido y capturar el tablero. El docente dijo que solo revisará el Planner: **un entregable que no está adjunto ahí no se evalúa**, y cada artefacto de esta entrega debe quedar colgado de su tarea.

### 3.2 Artefactos nuevos (los 85 puntos restantes)

| Artefacto | Archivo | Reemplaza a |
|---|---|---|
| Diagrama de requerimientos (RF + RNF, jerárquico) | `docs/entrega/requerimientos.md` → PNG | — (nuevo) |
| Caso de uso general con frontera y 6 actores | `docs/entrega/casos-uso-general.md` → PNG | `diagramas.md §2` |
| 12 diagramas de CU específicos + 12 fichas | `docs/entrega/casos-uso/CU-XX-*.md` | — (nuevo) |
| Diagrama de clases | `docs/entrega/clases.md` → PNG | — (nuevo) |
| DER MySQL (16 entidades reales) | `docs/entrega/der-mysql.md` → PNG | `diagramas.md §3` |
| Script MySQL ejecutable | `docs/entrega/sgr-mysql.sql` | — (nuevo) |
| Mockups con escenarios alternativos | `docs/mockups/` (ampliado) | — (se amplía) |
| Informe de la entrega, con las tablas de trazabilidad | `docs/entrega/informe.md` | — (nuevo) |
| Estado del sistema en PDF para el equipo | `docs/entrega/estado-del-sistema.pdf` | — (nuevo) |

### 3.3 Qué RF, RNF y HU «se resuelven»

Hay que separar dos cosas que se confunden fácil:

**No se implementa ningún RF nuevo.** Esta entrega es de análisis y diseño; la rúbrica es explícita: *«Para esta entrega no se evaluará conexión con base de datos ni consumo de API»*. El estado de implementación queda como está: **23 ✅ · 8 🟡 · 7 ⬜**.

**Sí se documentan y se hacen trazables**, que es lo que la rúbrica evalúa:

| Qué | Cuáles | Dónde queda |
|---|---|---|
| **RF documentados con actor, módulo y trazabilidad a CU** | Los **38** | Diagrama de requerimientos + tabla del informe |
| **RNF documentados igual** | Los **18** | Ídem. RNF-005, RNF-008, RNF-012, RNF-015 y RNF-017 son los que tienen evidencia verificable |
| **HU llevadas al Planner con responsable y estado** | Las **31** oficiales | Planner (criterio 1) |
| **RF cubiertos por los 12 CU específicos** | RF-001, 002, 005, 006, 007, 008, 009, 010, 011, 012, 013, 014, 015, 016, 017, 018, 022, 023, 026, 027, 029, 030, 032, 034, 036 | Fichas de CU |
| **Entregables del PDF §15 que se cierran** | **02 Análisis** y **03 Diseño** | Informe |
| **Exigencia §15.1 (matriz de trazabilidad)** | Ya existe y se amplía con la columna CU | `matriz-trazabilidad.md` |

### 3.4 Pendientes del repositorio que esta entrega sí resuelve

| Pendiente | Por qué se resuelve ahora |
|---|---|
| **El Planner no refleja el trabajo hecho** (Desarrollo, Pruebas y Piloto vacíos) y le falta la tarea del diagrama de requerimientos | Es el criterio 1 de la rúbrica, 15 pts |
| **`docs/diagramas.md` describe el modelo v1** | Es el criterio 6, y presentarlo sería incoherente |
| **No hay diagrama de clases** | Es el criterio 5 (15 pts) |
| **No hay casos de uso** | Es el criterio 4 (20 pts) |
| **README dice «11 ADR»** (son 15) y `historias-usuario.md` sigue en las 20 historias propias | Consistencia entre artefactos, que es el criterio transversal |
| **`Guia-Entregables-15-septiembre.docx` quedó desfasada** | Se marca como histórica y se apunta a este plan |

### 3.5 Qué NO se toca en esta sesión

Se dice explícitamente para que nadie lo abra «ya que estamos»:

- **RF-025** (ajustes por felicitación/reclamo), **RF-028** (tablero personal), **RF-031** (vista global por cargos), **RF-033** (exportación), **RF-035** (comentarios), **RF-037** (alertas).
- **Bloque D** (Jest, RTL, CI) y **Bloque E** (despliegue).
- Los cabos sueltos de prioridad Media: `color-scheme`, `TareaHistorial` (RF-018), paginación del historial del vecino, corrección de una gestión ya registrada, alcance de `GET /cumplimiento/:periodoId`.
- **Las 14 consultas abiertas al docente**: no se responden por cuenta propia. Se suma la nº 13 (MySQL).

---

## 4. Los 12 casos de uso

Se conservan los identificadores que ya propuso la guía del 1 de septiembre, para no reescribir lo que el equipo ya leyó, y se corrigen dos: CU-11 deja de ser opcional (la ficha del vecino está construida y es el caso emblemático del cliente) y se agrega CU-12 (control de actividad, que el docente pidió en clase).

| ID | Caso de uso | Actor principal | RF | Pantalla del mockup |
|---|---|---|---|---|
| CU-01 | Registrar actividad diaria | Funcionario | RF-009, RF-010, RF-011 | `03-ficha` |
| CU-02 | Adjuntar evidencia a una actividad | Funcionario | RF-012, RNF-017 | `03-ficha` |
| CU-03 | Validar o rechazar una evidencia | Verificador | RF-013, RF-014, RNF-005 | `04-verificacion` |
| CU-04 | Configurar metas y ponderadores | Administrador / Coordinador | RF-006, RF-007, RN-001 | `05-metas` |
| CU-05 | Consultar la ficha personal y el semáforo | Funcionario | RF-008, RF-022, RF-026 | `03-ficha` |
| CU-06 | Registrar un compromiso del vecino en el tubo | Funcionario / Delegado | RF-016, RF-017 | `02-tubo` |
| CU-07 | Mover un compromiso de estado | Funcionario / Delegado | RF-018, RF-019 | `02-tubo` |
| CU-08 | Registrar una atención social y sus gestiones | Funcionario | RF-015, CA-04 | `03-ficha` (modal del caso) |
| CU-09 | Consultar el tablero consolidado | Delegado / Usuario de consulta | RF-027, RF-029 | `07-dashboard` |
| CU-10 | Anular una actividad con motivo | Funcionario / Jefatura | RN-009, RF-036 | `03-ficha` |
| CU-11 | Buscar el historial de un vecino entre delegaciones | Funcionario / Coordinador | RF-032, CA-04 | `06-vecino` |
| CU-12 | Controlar la actividad de usuarios | Administrador / Coordinador | RF-030 | `08-actividad` |

**Casos incluidos y de extensión** (los que dan puntos en el criterio 4, porque muestran «include» y «extend» de verdad):

| ID | Tipo | Caso base | Condición / resultado |
|---|---|---|---|
| CU-I1 | «include» | CU-01, CU-06 | **Validar RUT y teléfono** (ADR-001, RF-010) |
| CU-I2 | «include» | CU-01 | **Generar el código único de la actividad** (RF-011, inmutable) |
| CU-I3 | «include» | transversal a todo write | **Registrar en la bitácora de auditoría** (RNF-008, RF-036) |
| CU-E1 | «extend» | CU-01, CU-06 | **Avisar posible atención duplicada** entre delegaciones (ADR-008) — el caso que el cliente vino a buscar |
| CU-E2 | «extend» | CU-03 | **Exigir observación** cuando la decisión no es aprobar (RF-013) |
| CU-E3 | «extend» | CU-03 | **Rechazar validación propia** por segregación de funciones (RNF-005) |
| CU-E4 | «extend» | CU-07, CU-04 | **Informar conflicto de versión** (409) sin sobrescribir (CA-08, ADR-005) |
| CU-E5 | «extend» | CU-11, CU-12 | **Denegar por alcance** con el motivo escrito (ADR-012, ADR-015) |
| CU-E6 | «extend» | CU-09 | **Informar delegación sin medición** en vez de 0% (ADR-014) |

**Cobertura de actores**: Funcionario (CU-01, 02, 05, 06, 07, 08, 10, 11), Verificador (CU-03), Administrador (CU-04, CU-12), Coordinador (CU-04, CU-11, CU-12), Delegado (CU-06, 07, 09), Usuario de consulta (CU-09). **Los seis actores del PDF §3 aparecen.**

---

## 5. Orden de trabajo

Las dependencias importan: el diagrama de requerimientos define los CU, los CU definen las clases y las pantallas, y el DER define el script. Hacerlo en otro orden obliga a rehacer.

1. **Cargar el Planner.** No depende de nada y sin él la nota tiene techo. Va a mano con [entrega/guia-planner-hector.pdf](entrega/guia-planner-hector.pdf), en seis tandas repartibles entre los dos; los adjuntos y la captura van después, a medida que cada artefacto queda listo.
2. **Diagrama de requerimientos** (38 RF + 18 RNF agrupados por épica, con `requirementDiagram` de mermaid, que es lo más cercano a la notación del ejemplo del docente).
3. **Caso de uso general**: frontera, 6 actores, ~12 casos, sin flujos internos.
4. **Los 12 diagramas específicos + sus 12 fichas**, con la estructura exacta de la rúbrica (ID, nombre, objetivo, actor principal, secundarios, precondiciones, disparador, flujo principal, alternativos, excepciones, postcondiciones, reglas). La ficha de CU-03 ya está redactada en la guía del 1 de septiembre: sirve de plantilla.
5. **Diagrama de clases**: servicios y entidades del backend con visibilidad, atributos tipados, métodos y multiplicidades. Que los nombres coincidan con los del DER y los CU.
6. **DER MySQL** desde `schema.prisma`: 16 entidades, PK, FK, cardinalidades, tipos MySQL.
7. **Script MySQL** + **verificador de consistencia** que compruebe, contra `schema.prisma`, que no falta ni sobra ninguna tabla ni FK. La rúbrica valida esa consistencia a mano; nosotros la comprobamos con un script, que es más barato y no se olvida.
8. **Escenarios alternativos del mockup** y regeneración de los 8 existentes.
9. **Informe** con las tablas de trazabilidad (RF→CU, CU→mockup, CU→clase, CU→tabla) y los enlaces al repositorio y al Planner.
10. **Actualizar la documentación viva**: `diagramas.md` (o retirarlo apuntando a `docs/entrega/`), README (15 ADR, no 11), `historias-usuario.md` (marcar que las 31 oficiales mandan), `matriz-trazabilidad.md` (columna CU) y `estado-proyecto.md`.
11. **Publicar el estado del sistema en PDF** para el compañero, con el mismo pipeline de Playwright que ya genera los mockups (`page.pdf()`), y **actualizar el artifact** para quien tenga acceso.

---

## 6. Reparto entre dos personas

El trabajo se corta por artefacto, no por archivo, para que nadie espere a nadie:

| Persona | Se lleva | Por qué |
|---|---|---|
| **A** (Tomás) | Diagrama de requerimientos (2), caso de uso general (3), informe (9) | Es la cadena «qué necesita el sistema» y no toca código |
| **B** (Héctor) | Clases (5), DER (6), script MySQL (7) | Es la cadena «cómo está construido» y sale del esquema real. **Ya tiene esas tres tareas creadas en el Planner** |
| **Ambos** | **La carga del Planner (1)**, repartiéndose las seis tandas de [la guía](entrega/guia-planner-hector.pdf) | Son unas dos horas y media a mano, y las tandas son independientes. La 6 —etiqueta, adjuntos, captura— conviene dejarla para el final, cuando los artefactos existan |
| **Ambos** | Las 12 fichas de CU (4) — seis cada uno, con la misma plantilla | Es el criterio más caro (20 pts) y el más divisible |
| **Quien tenga el entorno arriba** | Escenarios del mockup (8) y el PDF de estado (11) | Necesitan los dos servidores y la base sembrada |

---

## 7. Comprobación final, antes de entregar

- [ ] El Planner refleja el trabajo real: Desarrollo y Pruebas dejaron de estar vacíos, existe la tarea del diagrama de requerimientos, y hay captura del tablero y enlace.
- [ ] Cada artefacto de la entrega está adjunto o enlazado desde su tarea de Planner.
- [ ] Cada RF y RNF tiene código único y aparece en el diagrama de requerimientos.
- [ ] El caso de uso general muestra la frontera del sistema y los seis actores.
- [ ] Hay **al menos 10** CU específicos con diagrama **y** ficha completa. Son 12.
- [ ] Cada CU de la tabla tiene su pantalla o su modal en `docs/mockups/`.
- [ ] El diagrama de clases usa los mismos nombres que el DER y que los CU.
- [ ] Toda FK del DER existe en el script, y toda tabla del script está en el DER — **comprobado por el verificador, no a ojo**.
- [ ] El script se ejecuta en MySQL sin errores.
- [ ] El README explica qué es el proyecto, con qué está hecho y cómo se ejecuta el mockup **sin base de datos**.
- [ ] Ningún artefacto menciona `metas`, `cumplimiento_ponderado_vista`, el cron ni umbrales «50-79».
- [ ] Todos los datos visibles son ficticios (regla 12).
- [ ] Nada en la entrega atribuye el trabajo a una herramienta de IA.
