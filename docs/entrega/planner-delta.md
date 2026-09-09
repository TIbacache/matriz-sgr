# Planner: qué cargar, qué tocar a mano y qué coordinar con Héctor

**Criterio 1 de la rúbrica — 15 puntos.** Fecha: 8 de septiembre de 2026.

> El docente dijo en la clase del 1 de septiembre que **solo revisará el Planner**. Un entregable que está en el repositorio pero no adjunto o enlazado desde una tarea del tablero **no se evalúa**. Por eso este documento no termina en «cargar las tareas»: termina en «cada artefacto cuelga de su tarea».

---

## 1. De dónde partimos

El tablero `DesarrolloSW-MuniLS-OrigamiSpA` **no está vacío**: lo construyó Héctor y tiene los siete depósitos de la plantilla del profesor y ocho tareas.

| Depósito | Tareas que ya existen |
|---|---|
| Ámbito | — |
| Requisitos de análisis o software | Presentación Profesor |
| **Diseño** | GIT (0/1) · Diseño MockUps (0/3) · Modelo Entidad-Relación (0/3) · Diagramas UML (0/1) · Diagramas de Clase (0/1) — las cinco con vencimiento 15/9 y responsable |
| Desarrollo | — |
| Pruebas | — |
| Piloto e implementación | — |
| Etapas Terminadas | Entrega de Requerimientos funcionales-No funcionales · Presentación Problemática |

El problema no es que falte el tablero: es que **dice algo que no es cierto**. Desarrollo y Pruebas vacíos describen un proyecto que todavía no empieza a construir, cuando hay quince bloques cerrados, quince etiquetas de versión y **332 comprobaciones automáticas en verde**. La rúbrica paga «backlog organizado y priorizado» y «estados claramente diferenciados»; un tablero que solo muestra la entrega en curso deja fuera el grueso del trabajo.

---

## 2. Qué se corrigió en el repositorio (ya hecho)

`docs/plan-desarrollo.csv` era del 1 de septiembre y **no se podía cargar tal cual**. Quedó reescrito:

| Problema del CSV viejo | Corrección |
|---|---|
| 8 tareas en **Bloqueado**, seis de ellas ya construidas y verificadas | No queda ninguna en Bloqueado. Modelo v2, metas por funcionario, ficha de solicitud, evidencias con código y aprobación del supervisor pasan a **Completado**, con su etiqueta de versión en la nota |
| El título «Modelo entidad-relación inicial» chocaba con «Modelo Entidad-Relación» de Héctor, y el script deduplica **por título exacto**: habrían quedado las dos | Renombrado a «Modelo entidad-relación inicial (v1, agosto)», que además es lo que de verdad es: el ERD de 7 tablas superado por el modelo v2 |
| «Cumplimiento ponderado y job de recálculo» describía la vista materializada y el cron **eliminados en el Bloque C** | Reemplazado por «Motor de cumplimiento por funcionario», con la nota de que hay un solo cálculo (ADR-014) |
| «CRUD de unidades, categorías, tareas y **metas**» nombraba la tabla `Meta` de v1, que ya no existe | Renombrado a «CRUD de unidades, categorías y tareas» |
| Desarrollo no tenía ninguna de las trece piezas construidas entre el 31 de agosto y el 6 de septiembre | Agregadas una por una, con su etiqueta (`v0.2.0` … `v0.15.0`) y su recuento de comprobaciones |
| Pruebas no tenía nada, cuando existen siete verificadores que corren hoy | Agregados los siete como **Completado**, con su comando y su número de comprobaciones |
| Faltaba la tarea del **diagrama de requerimientos** (criterio 2, 10 pts) | Agregada en Diseño, con vencimiento 15/9 |
| Los RF fuera de alcance no aparecían como backlog | RF-025, RF-028, RF-031, RF-033, RF-035 y RF-037 quedan como **Pendiente**, para que se vea el alcance completo y qué queda fuera de esta entrega |

**Resultado**: 87 tareas — 53 Completado, 6 En curso, 28 Pendiente. Sin títulos duplicados y validado con `Import-Csv` tal como lo lee el script.

También se endureció `scripts/cargar-plan-planner.ps1`: acepta el estado **«En revisión»** (75%) y **avisa** si un estado o una prioridad del CSV no está en su tabla, en vez de crear la tarea sin avance y sin prioridad en silencio.

---

## 3. Cómo se carga: a mano, porque INACAP no deja automatizarlo

La decisión se movió tres veces en dos días. Conviene dejar el rastro completo, porque la pregunta «¿por qué no lo automatizaron?» tiene respuesta y hay que poder darla:

1. **8 de septiembre** — se decide cargar **a mano**: Héctor pidió aportar y aprender, y 87 tareas de un golpe se saltan la parte donde se entiende cómo se organiza el proyecto.
2. **8 de septiembre** — Héctor libera esa ruta y se vuelve al **script**. Como es una escritura masiva sobre un tablero compartido, se le agrega `-Deshacer`.
3. **9 de septiembre** — **el script no es viable en INACAP.** Se vuelve a la carga a mano, esta vez por obligación.

### Qué pasó exactamente

El tenant de INACAP tiene desactivado el consentimiento de usuario para **Microsoft Graph Command Line Tools**, la aplicación que usa cualquier script de PowerShell contra Microsoft 365. El inicio de sesión termina siempre en *«Need admin approval»*.

Se descartaron una por una las explicaciones más simples:

| Se probó | Resultado |
|---|---|
| Con `-EmailA`/`-EmailB`, que agregan `User.ReadBasic.All` | Bloqueado. Cabía pensar que era ese permiso |
| **Sin** los correos, pidiendo solo `Tasks.ReadWrite` —el mínimo, que en un tenant normal aprueba el propio usuario— | **Bloqueado igual**: no es el permiso, es la aplicación |
| Con código de dispositivo, evitando la ventana nativa de Windows | Mismo bloqueo, así que tampoco era el intermediario de cuentas |

Desbloquearlo exige que un administrador de INACAP conceda consentimiento a esa aplicación para todo el tenant. No es una gestión razonable a una semana de la entrega.

👉 **La ruta es [guia-planner-hector.pdf](guia-planner-hector.pdf)**: seis tandas con el contenido exacto de cada tarjeta, repartibles entre los dos.

El script y su documentación ([../guia-cargar-planner.md](../guia-cargar-planner.md)) se conservan: dejan constancia de lo que se intentó, y servirían tal cual en un tenant donde el consentimiento esté permitido.

---

## 4. Los cuatro pasos que ninguna ruta automatiza

Ni el script ni el CSV pueden con esto. Están desarrollados en la **tanda 6** de la guía.

| Paso | Qué es |
|---|---|
| **Etiqueta «En revisión»** | Planner básico solo tiene No iniciada / En curso / Completada. La rúbrica menciona cuatro estados. Se cubre con una **etiqueta de color** llamada «En revisión» y se explica en el informe |
| **Adjuntar cada artefacto a su tarea** | Es la condición del docente: lo que no está adjunto, no se evalúa. Ver la tabla del punto 5 |
| **Captura del tablero** | La pide la rúbrica, junto con el enlace directo. Se toma con los seis depósitos visibles, ya poblados. Conviene además una captura de la vista Gráficos, que evidencia responsables y estados de un vistazo |
| **Enlace directo al plan** | Va en el informe, junto a la captura |

---

## 5. Cada criterio de la rúbrica tiene que tener su tarea y su adjunto

Esta tabla es la lista de comprobación final: si una fila queda sin adjunto, ese criterio no se evalúa.

| # | Criterio | Pts | Tarea del tablero | Qué se adjunta o enlaza |
|---|---|---|---|---|
| 1 | Planner | 15 | (el tablero mismo) | Captura del tablero poblado y enlace directo, en el informe |
| 2 | Diagramas de requerimientos | 10 | **Diagrama de Requerimientos** (nueva) | `docs/entrega/requerimientos.md` y su PNG |
| 3 | Caso de uso general | 10 | Diagramas UML | `docs/entrega/casos-uso-general.md` y su PNG |
| 4 | Casos de uso específicos + fichas | 20 | Diagramas UML | Los 12 diagramas y las 12 fichas de `docs/entrega/casos-uso/` |
| 5 | Diagrama de clases | 15 | Diagramas de Clase | `docs/entrega/clases.md` y su PNG |
| 6 | DER MySQL | 10 | Modelo Entidad-Relación | `docs/entrega/der-mysql.md` y su PNG |
| 7 | Script SQL | 10 | Modelo Entidad-Relación | `docs/entrega/sgr-mysql.sql` |
| 8 | Mockup funcional + Git | 10 | Diseño MockUps · GIT | Los `.html` autocontenidos de `docs/mockups/` y el enlace al repositorio |

**Dos criterios cuelgan de una sola tarea de Héctor** (el 3 y el 4 de «Diagramas UML»; el 6 y el 7 de «Modelo Entidad-Relación»). Funciona, porque las dos traen checklist. Pero el criterio 4 vale 20 puntos —el más caro de la rúbrica— y hoy es un ítem de checklist dentro de otra tarea.

---

## 6. Las decisiones que quedan en manos de Héctor

Carga él el tablero, así que estas cuatro las resuelve él. Están planteadas también en la guía, en el punto donde toca decidirlas:

1. **Los 12 casos de uso, ¿tarea propia o checklist de «Diagramas UML»?** Recomendación: tarea propia, «Casos de uso específicos y fichas (12)», porque son 20 de los 100 puntos y porque son el trabajo que se reparte entre los dos.
2. **El script SQL, ¿tarea propia o checklist de «Modelo Entidad-Relación»?** Recomendación: checklist, porque el DER y el script se hacen juntos y los valida la misma persona.
3. **«Diseño MockUps» (de Héctor) y «Wireframes y diseño de las pantallas» (del CSV) se parecen.** No son lo mismo: la primera es el entregable del 15/9 y la segunda es el diseño de las 8 pantallas ya construidas. Si a Héctor le parece confuso, la segunda se renombra o se archiva.
4. **Los responsables del CSV** siguen el reparto de la sección 6 del plan de la entrega: A = Tomás (Planner, requerimientos, caso de uso general, informe), B = Héctor (clases, DER, script). Confirmar antes de cargar con los correos.

---

## 7. Estado de este paso

Hecho en el repositorio:

- [x] `docs/plan-desarrollo.csv` reescrito contra el estado real: 87 tareas, ninguna bloqueada, sin choques de título
- [x] `docs/plan-desarrollo.md` actualizado como vista humana del mismo plan
- [x] `docs/entrega/guia-planner-hector.pdf` — el contenido exacto de las 87 tarjetas, en seis tandas (fuente: el `.md` del mismo nombre; se regenera con `cd frontend && npm run guia:planner`)
- [x] `docs/guia-cargar-planner.md` — constancia de la ruta automatizada y de por qué INACAP no la permite
- [x] `scripts/cargar-plan-planner.ps1` — se conserva funcionando, con `-Deshacer` y código de dispositivo, por si el proyecto cambia de tenant

Pendiente en el tablero, y va a mano siguiendo la guía:

- [ ] **Tanda 1** — Diseño: la tarea que falta, el mapa de criterios y las listas de comprobación (~25 min)
- [ ] **Tanda 2** — Desarrollo: las 31 tareas, 24 de ellas ya terminadas (~45 min)
- [ ] **Tanda 3** — Pruebas: las 15 tareas, con las 332 comprobaciones (~20 min)
- [ ] **Tanda 4** — Ámbito y Requisitos al día (~25 min)
- [ ] **Tanda 5** — Piloto e implementación (~15 min)
- [ ] **Tanda 6** — Etiqueta, adjuntos, captura y enlace (~20 min)

> Nada de esto se puede hacer desde el repositorio: exige iniciar sesión en Planner con la cuenta INACAP. Si el tiempo aprieta, el orden que más rinde es **1 → 2 → 6**. Las tandas son independientes, así que se pueden repartir entre los dos.
