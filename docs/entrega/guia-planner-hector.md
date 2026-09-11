# Guía para completar el Planner — paso a paso

**Para**: quien cargue el tablero · **Entrega**: 15 de septiembre de 2026 · **Vale**: 15 de los 100 puntos de la evaluación

> **Este documento NO se entrega.** Es material de trabajo interno: un instructivo para cargar el tablero. La evidencia del criterio 1 es **el tablero mismo y su captura**, que van en el [informe §10](informe.md). El nombre del archivo conserva su destinatario original y no significa que sea de alguien en particular.

> **Esta es la única ruta: el tablero se carga a mano.** Se intentó automatizarlo con un script de PowerShell y **INACAP no lo permite**: el tenant tiene desactivado el consentimiento de usuario para *Microsoft Graph Command Line Tools*, que es la aplicación que usa cualquier script contra Microsoft 365, y el inicio de sesión termina en «Need admin approval». Se probó con el permiso mínimo y con código de dispositivo; el bloqueo es de la aplicación completa. El detalle está en [../guia-cargar-planner.md](../guia-cargar-planner.md).
>
> Que quede claro para cuando pregunten: **no es que no quisimos automatizarlo**. Está escrito, probado y documentado por qué no se pudo.

Esta guía es para que armes el tablero **tú**, tarea por tarea, entendiendo qué estás poniendo y por qué.

Está partida en **seis tandas** que se pueden hacer en días distintos y repartir entre los dos. Cada una dice cuánto demora y qué se gana con ella. Si el tiempo aprieta, la tanda 1 y la tanda 6 son las que no se pueden saltar.

---

## 0. Antes de empezar: qué está evaluando el profesor

El profesor dijo en la clase del 1 de septiembre que **solo va a revisar el Planner**. No va a abrir el repositorio por su cuenta. Eso significa dos cosas:

1. Un entregable que existe en GitHub pero **no está adjunto ni enlazado desde una tarea del tablero, no se evalúa**.
2. El tablero no es un trámite: es el lugar donde se demuestra que el proyecto está organizado.

La rúbrica pide, con estas palabras:

| Lo que pide | Cómo se ve en Planner |
|---|---|
| Backlog organizado y priorizado | Tareas repartidas en depósitos, con prioridad puesta |
| Épicas o módulos principales | Los depósitos: Ámbito, Requisitos, Diseño, Desarrollo, Pruebas, Piloto |
| Tareas asociadas a cada épica | Que ningún depósito quede vacío |
| **Responsables asignados** | Cada tarea con una cara asignada |
| Estados claramente diferenciados | Por hacer / En desarrollo / En revisión / Finalizado |
| Fechas, hitos o sprints | Fecha de inicio y de vencimiento en cada tarea |
| Prioridad y dependencias | El campo Prioridad, y el orden dentro del depósito |
| **Captura del tablero y enlace** | Una foto del tablero terminado, que va en el informe |

### El problema que vamos a arreglar

El tablero hoy tiene **ocho tareas**: las cinco tuyas del depósito Diseño, la presentación en Requisitos y las dos de Etapas Terminadas. Están bien hechas y **no se tocan**.

Lo que falla es lo que **no** está: **Desarrollo y Pruebas están vacíos**. Un profesor que abre ese tablero ve un proyecto que todavía no ha empezado a programar. La realidad es otra: hay **quince bloques de trabajo cerrados**, **quince versiones etiquetadas** entre el 1 y el 6 de septiembre y **332 comprobaciones automáticas que corren y pasan**. Nada de eso se ve.

Esa diferencia entre lo que hicimos y lo que el tablero cuenta es exactamente lo que resta puntos. Las tandas 2 y 3 son las que la cierran.

---

## 1. Vocabulario de Planner (5 minutos, se lee una vez)

Planner usa nombres propios para cosas simples. Vale la pena tenerlos claros porque la rúbrica usa otros y hay que traducir.

| En Planner se llama | Es | En la rúbrica se llama |
|---|---|---|
| **Depósito** (bucket) | Cada columna del tablero | Épica o módulo |
| **Tarea** | Cada tarjeta | Tarea o historia de usuario |
| **Progreso** | No iniciada / En curso / Completada | Estado |
| **Prioridad** | Urgente / Importante / Media / Baja | Prioridad |
| **Etiqueta** | Una marca de color con nombre, hasta 25 por plan | (la usamos para el cuarto estado) |
| **Lista de comprobación** | Sub-puntos dentro de una tarea | Subtareas |
| **Datos adjuntos** | Archivos o enlaces colgados de la tarea | Evidencias |
| **Fecha de inicio / vencimiento** | Las dos fechas de la tarjeta | Fechas e hitos |

### El detalle de los cuatro estados

La rúbrica menciona cuatro estados: *Por hacer, En desarrollo, En revisión, Finalizado*. **Planner básico solo tiene tres**: No iniciada, En curso, Completada.

No es un problema, pero hay que resolverlo a propósito y decirlo:

| Estado de la rúbrica | Cómo lo representamos |
|---|---|
| Por hacer | Progreso = **No iniciada** |
| En desarrollo | Progreso = **En curso** |
| **En revisión** | Progreso = En curso **+ etiqueta de color «En revisión»** |
| Finalizado | Progreso = **Completada** |

La etiqueta se crea una sola vez (tanda 6) y se explica en el informe. Si no lo explicáramos, parecería que nos faltó un estado.

---

## 2. Cómo se crea una tarea bien hecha

Este es el patrón. Todas las tareas de esta guía se crean igual, así que conviene hacer la primera con calma.

**Paso a paso, en `tasks.office.com` → plan `DesarrolloSW-MuniLS-OrigamiSpA`:**

1. En el depósito que corresponda, clic en **+** (arriba de la columna).
2. Escribe el **título**. Cópialo **tal cual** de las tablas de esta guía: los títulos son la forma en que el profesor cruza el tablero con el informe, y también la forma en que evitamos tareas duplicadas.
3. Clic en **Agregar tarea**. Se crea la tarjeta.
4. Abre la tarjeta recién creada y completa, en este orden:
   - **Asignar a**: la persona de la columna «Quién» de la tabla.
   - **Progreso**: el de la columna «Progreso».
   - **Prioridad**: la de la columna «Prioridad».
   - **Fecha de inicio** y **Fecha de vencimiento**: las de las columnas de fecha.
   - **Notas**: el texto de la columna «Qué escribir en las notas».
5. Cierra la tarjeta. Se guarda sola.

> **Por qué las notas importan.** El título dice *qué*. Las notas dicen *qué se hizo y dónde está la prueba*. Cuando el profesor abra una tarea marcada como Completada y no encuentre nada que lo respalde, esa tarea no le va a sumar. Por eso casi todas las notas de esta guía terminan nombrando un archivo, un comando o una etiqueta de versión.

**Un ejemplo completo**, para que se vea armado:

```
Título:      Bandeja del verificador
Asignar a:   Tomás
Progreso:    Completada
Prioridad:   Urgente
Inicio:      01-09-2026
Vencimiento: 01-09-2026
Notas:       Etiqueta v0.5.0-bandeja-verificador. RF-013, RF-014 y HU-11.
             Cola de evidencias, foto grande, tres decisiones con observación
             obligatoria y atajos de teclado J/K/Enter. Nadie valida lo propio.
```

---

## 3. Tanda 1 — Diseño: la entrega del 15 de septiembre

⏱ **~25 minutos.** Es la tanda que **no se puede saltar**: aquí es donde se ve que cada criterio de la rúbrica tiene dueño.

### 3.1 Primero, la tarea que falta

Tus cinco tareas de Diseño cubren cinco de los ocho criterios. **Falta una**, y vale 10 puntos: nadie tiene asignado el diagrama de requerimientos.

Créala igual que en el patrón del punto 2:

| Campo | Valor |
|---|---|
| **Título** | `Diagrama de Requerimientos` |
| Depósito | Diseño |
| Quién | Tomás |
| Progreso | En curso |
| Prioridad | Urgente |
| Inicio | 08-09-2026 |
| Vencimiento | 15-09-2026 |
| Notas | Criterio 2 de la rúbrica, 10 puntos. Los 38 RF y 18 RNF con código único, agrupados por épica, relacionados con actores y módulos, y trazados a los casos de uso. Los RF sin implementar van marcados como tales, para que se vea el alcance completo. |

### 3.2 Después, el mapa de criterios

Esto es lo más útil que puedes dejar en el tablero, y es puro entendimiento: **que cada uno de los ocho criterios tenga una tarea que lo respalde**. Así quedan repartidos hoy:

| # | Criterio de la rúbrica | Pts | Tarea del tablero |
|---|---|---|---|
| 1 | Planner | 15 | (el tablero mismo) |
| 2 | Diagramas de requerimientos | 10 | **Diagrama de Requerimientos** ← la que acabas de crear |
| 3 | Caso de uso general | 10 | Diagramas UML |
| 4 | **Casos de uso específicos + fichas** | **20** | Diagramas UML |
| 5 | Diagrama de clases | 15 | Diagramas de Clase |
| 6 | DER MySQL | 10 | Modelo Entidad-Relación |
| 7 | Script SQL | 10 | Modelo Entidad-Relación |
| 8 | Mockup funcional + Git | 10 | Diseño MockUps · GIT |

Fíjate en algo: **el criterio 4 vale 20 puntos, más que cualquier otro, y hoy es un punto de la lista de comprobación dentro de «Diagramas UML»**. Lo mismo pasa con el 6 y el 7, que comparten «Modelo Entidad-Relación».

**Decisión tuya** (el tablero es tan tuyo como nuestro):

- **Recomendado**: crear una tarea aparte, `Casos de uso específicos y fichas (12)`, en Diseño, vencimiento 15-09-2026, asignada a **los dos**, prioridad Urgente. Son 20 puntos y es el trabajo que nos repartimos entre ambos, seis fichas cada uno.
- **El script SQL sí conviene dejarlo** como punto de la lista de comprobación de «Modelo Entidad-Relación»: el DER y el script se hacen juntos y los revisa la misma persona.

### 3.3 Listas de comprobación en tus cinco tareas

Tus tareas tienen listas de comprobación empezadas (0/1, 0/3…). Vale la pena dejarlas completas, porque muestran las dependencias que la rúbrica pide ver. Sugerencia de contenido:

**GIT** (0/1)
- [ ] README con descripción, tecnologías e instrucciones para ejecutar el mockup
- [ ] Enlace del repositorio incorporado en el informe
- [ ] Acceso al repositorio dado al docente

**Diseño MockUps** (0/3)
- [ ] Las 17 pantallas en `.html` autocontenido para adjuntar aquí (8 del camino feliz y 9 escenarios alternativos)
- [ ] Las 17 pantallas en `.png` para que se vean en GitHub
- [ ] Escenarios alternativos: modales de error, avisos y estados vacíos

**Modelo Entidad-Relación** (0/3)
- [ ] DER con las **22 tablas** reales, con PK, FK y cardinalidades
- [ ] Script MySQL ejecutable, con las tablas en orden de dependencia
- [ ] Comprobar que toda FK del DER existe en el script

**Diagramas UML** (0/1)
- [ ] Caso de uso general con la frontera del sistema y los 6 actores
- [ ] 12 casos de uso específicos, cada uno con su diagrama
- [ ] 12 fichas con los campos que exige la rúbrica

**Diagramas de Clase** (0/1)
- [ ] Clases con visibilidad, atributos tipados y métodos
- [ ] Multiplicidades en las asociaciones
- [ ] Nombres que coincidan con los del DER y los casos de uso

> **Por qué esto suma.** La rúbrica evalúa «dependencias relevantes». Una lista de comprobación es la forma más simple de mostrar que una tarea grande se descompone en pasos concretos, y de que se vea cuánto de ella está hecho.

---

## 4. Tanda 2 — Desarrollo: contar lo que ya está construido

⏱ **~45 minutos, 31 tareas.** Es la tanda que más cambia la nota, porque hoy ese depósito está vacío.

Todas van en el depósito **Desarrollo**. Las 24 primeras van con **Progreso = Completada**.

> **Antes de empezar**: en Planner, una tarea marcada Completada se va al fondo de la columna y aparece tachada. Eso está bien: es lo que muestra el avance real. No la borres ni la muevas.

### 4.1 Lo construido en agosto (las bases)

Inicio y vencimiento son el mismo día en todas. Todas **Completada** y asignadas a **Tomás**.

| Título (copiar tal cual) | Fecha | Prioridad | Qué escribir en las notas |
|---|---|---|---|
| Configurar repositorio, Docker y PostgreSQL | 25-08 | Importante | Repositorio privado en GitHub, docker-compose con volumen persistente y Prisma. |
| Backend: autenticación JWT, bcrypt y roles | 25-08 | Urgente | Login multi-organización, middleware de auth y autorización por rol. |
| Backend: CRUD de unidades, categorías y tareas | 25-08 | Importante | Con validación y alcance por rol. La baja de una delegación la desactiva, no la borra (RF-001). |
| Backend: Socket.io con rooms, presencia y rate limiting | 25-08 | Importante | JWT en el handshake, rooms por delegación, 10 mensajes por segundo y payload de 100KB. |
| Frontend: autenticación, layout y tema | 25-08 | Importante | Contexto de auth, barra lateral colapsable y tema claro/oscuro sin parpadeo. |
| Frontend: tubo de trabajo con drag and drop y tiempo real | 25-08 | Urgente | dnd-kit, actualización optimista con reversión y recuperación tras reconexión. |
| Formulario de nueva tarea | 26-08 | Media | Modal con responsable del directorio y sincronización por socket. |
| Frontend: dashboard BI con ECharts (v1) | 26-08 | Media | Gauges, mapa de calor, proyección, radar, tubo apilado, tabla y filtros cruzados. Reconstruido sobre el motor v2 en el Bloque C. |

### 4.2 Lo construido en septiembre (los quince bloques)

Aquí está el grueso de lo que el tablero no cuenta. Todas **Completada**, **Tomás**, inicio y vencimiento el mismo día.

| Título (copiar tal cual) | Fecha | Prioridad | Qué escribir en las notas |
|---|---|---|---|
| Migrar el modelo de datos v2 a la base | 01-09 | Urgente | Etiqueta v0.2.0-modelo-v2. 16 entidades, triggers de inmutabilidad de auditoría y de código, y CHECK de RUT, fechas y metas. 38 comprobaciones. |
| Bloque A: API del registro y la validación | 01-09 | Urgente | Etiqueta v0.3.0-bloque-a. Periodos con cierre y reapertura auditada, cargos, ítems, actividades con código inmutable, evidencias y validación con tres decisiones. 95 comprobaciones. |
| Ficha personal del funcionario | 01-09 | Urgente | Etiqueta v0.4.0-ficha-personal. RF-008 y HU-06. Cabecera con semáforo, tabla de ítems, registro en línea, subida de evidencia y anulación con motivo. Es la pantalla más importante del sistema. |
| Bandeja del verificador | 01-09 | Urgente | Etiqueta v0.5.0-bandeja-verificador. RF-013, RF-014 y HU-11. Cola, foto grande, tres decisiones con observación obligatoria y teclado J/K/Enter. Nadie valida lo propio. |
| Bloque A2: metas y ponderadores por funcionario | 01-09 | Urgente | Etiqueta v0.6.0-metas-funcionario. RF-006 y RF-007. RN-001 exigida en sus dos formas: el alta unitaria rechaza superar el 100 por ciento y el guardado del conjunto exige el 100 exacto. |
| Pantalla de configuración de metas | 01-09 | Importante | Etiquetas v0.7.0-pantalla-metas y v0.7.1-metas-privacidad. HU-05. Totalizador de RN-001 siempre visible y protección de lo que ya sumó puntaje. Un funcionario no ve las metas de sus pares. |
| Identidad visual de La Serena en la interfaz | 02-09 | Importante | Etiquetas v0.8.0 a v0.8.3. Barra heráldica con la escena de La Serena, login con el Faro Monumental en SVG, dos regímenes de movimiento y los dos rojos separados por rol y zona. |
| Entregables visuales para Planner y GitHub | 02-09 | Importante | Etiqueta v0.9.0-entregables-visuales. Cada pantalla se produce en .html autocontenido para adjuntar en Planner y en .png para que se vea en GitHub. |
| Ficha del vecino y trazabilidad entre delegaciones | 03-09 | Urgente | Etiqueta v0.10.0-ficha-vecino. RF-032, CA-04 y HU-29. Búsqueda por RUT o nombre, historial cruzando delegaciones y aviso de posible atención duplicada. Es el control que el cliente vino a buscar. |
| Bloque A3: rutas heredadas endurecidas | 03-09 | Importante | Etiqueta v0.11.0-rutas-endurecidas. Conflicto de versión a 409 y auditoría en /tareas, /unidades y /categorias. CA-08 y CA-09 completos. 254 comprobaciones. |
| Bloque B4: atención social y sus tres gestiones | 03-09 | Urgente | Etiqueta v0.12.0-atencion-social. RF-015, HU-03, CA-04 y ADR-013. La atención avanza por peldaños y el servidor decide el casillero. CA-04 cerrado de punta a punta. 278 comprobaciones. |
| Bloque B5: la solicitud del vecino en el tubo | 03-09 | Urgente | Etiqueta v0.13.0-solicitud-en-el-tubo. RF-016 y RF-017. INT o EXT, solicitante, territorio, área de apoyo y vínculo opcional con la ficha del vecino. EP-01 completa. 290 comprobaciones. |
| Motor de cumplimiento por funcionario | 04-09 | Urgente | Mide por funcionario y se consolida por delegación y por área del cargo. Un solo cálculo, sin una segunda verdad en SQL (ADR-014). |
| Bloque C: el dashboard sobre el motor v2 | 04-09 | Urgente | Etiqueta v0.14.0-dashboard-v2. Gauges, mapa de calor por área del cargo, proyección, radar y tabla con filtros cruzados. Una delegación sin nadie con metas se informa como sin medición, no como 0 por ciento. |
| Control de actividad de usuarios | 06-09 | Importante | Etiqueta v0.15.0-control-actividad. RF-030, HU-19 y ADR-015. Quién registró, quién no y quién está conectado ahora. Acompaña, no vigila. Solo admin y coordinador, y abrir el panel se audita. |
| Seed de datos ficticios | 06-09 | Importante | 23 personas ficticias, 14 con cargo medido, y unas 2.000 actividades con evidencia y validación. Prohibido cargar datos reales. Deja una delegación sin medición a propósito. |

> **Por qué las notas nombran la etiqueta de versión.** Cada `v0.X.0` es un punto del repositorio al que se puede volver. Si el profesor pregunta «¿cuándo se hizo esto y cómo lo compruebo?», la respuesta está en la nota. Eso es trazabilidad, que es el criterio que atraviesa toda la rúbrica.

### 4.3 Lo que falta por construir (el backlog real)

Estas siete van con **Progreso = No iniciada**. Muestran el alcance completo del proyecto y, sobre todo, **qué queda fuera de esta entrega**, que es información que la rúbrica valora.

| Título (copiar tal cual) | Vence | Quién | Prioridad | Qué escribir en las notas |
|---|---|---|---|---|
| API de ausencias, catálogos y parámetros | 03-11 | Tomás | Importante | Las entidades Ausencia, CatalogoItem y Parametro existen en el modelo v2 y se usan, pero no tienen API de administración. |
| API de ajustes por felicitación y reclamo (RF-025) | 10-11 | Tomás | Media | La entidad Ajuste existe en el modelo v2 sin API. El tope sale del parámetro vigente. Fuera del alcance de la entrega del 15 de septiembre. |
| Tablero personal del funcionario (RF-028) | 10-11 | Héctor | Media | Fuera del alcance de la entrega del 15 de septiembre. Aparece en el diagrama de requerimientos marcado como no implementado. |
| Vista global por cargos (RF-031) | 10-11 | Héctor | Media | Fuera del alcance de la entrega del 15 de septiembre. Aparece en el diagrama de requerimientos marcado como no implementado. |
| Exportación de informes (RF-033) | 10-11 | Héctor | Media | Fuera del alcance de la entrega del 15 de septiembre. Aparece en el diagrama de requerimientos marcado como no implementado. |
| Comentarios sobre una actividad (RF-035) | 10-11 | Tomás | Media | La entidad Comentario existe en el modelo v2 sin API. Fuera del alcance de la entrega del 15 de septiembre. |
| Alertas de inactividad (RF-037) | 17-11 | Héctor | Media | Días sin registrar por funcionario. El umbral sale del parámetro, nunca del código. Fuera del alcance de la entrega del 15 de septiembre. |

Para estas siete, la **fecha de inicio** es **14-10-2026** salvo la de ausencias, que empieza el mismo día, y la de alertas, que empieza el 14-10 también. Si Planner te obliga a elegir, con poner solo el vencimiento basta.

---

## 5. Tanda 3 — Pruebas: las 332 comprobaciones

⏱ **~20 minutos, 15 tareas.** El otro depósito vacío.

Esto es lo que más sorprende al que mira el tablero: **hay 332 comprobaciones automáticas que corren y pasan**, y hoy no aparecen por ningún lado.

Las siete primeras van **Completada**, **Tomás**, depósito **Pruebas**.

| Título (copiar tal cual) | Fecha | Prioridad | Qué escribir en las notas |
|---|---|---|---|
| Verificador de RUT | 01-09 | Media | `npm run verificar:rut`. Módulo 11 sobre los RUT del seed y casos de normalización. |
| Verificador de los mockups sin red | 02-09 | Media | `npm run verificar:mockups`. Abre los .html con la red bloqueada, para comprobar que son autocontenidos. |
| Verificador de integración del backend (smoke) | 06-09 | Importante | `npm run smoke`. **21 comprobaciones** de extremo a extremo contra el servidor levantado, incluidos los eventos de socket. |
| Verificador de la API del modelo v2 | 06-09 | Urgente | `npm run verificar:api`. **191 comprobaciones**: alcance por rol, bloqueo optimista, auditoría, aislamiento multi-tenant y reglas de negocio. |
| Verificador del motor de cumplimiento | 06-09 | Urgente | `npm run verificar:calculo`. **37 comprobaciones** del cálculo por funcionario, su consolidación por delegación y el control de actividad. |
| Verificador de contraste y tokens del frontend | 06-09 | Importante | `npm run verificar:contraste`. **83 comprobaciones** WCAG en los dos temas, más la comprobación de que no hay ningún color fuera de los tokens. |
| Capturas de contraste con las seis cuentas | 06-09 | Media | Todo cambio visual se mira con las seis cuentas de prueba, en escritorio y en móvil. |

> **21 + 191 + 37 + 83 = 332.** Ese número conviene tenerlo a mano: es la respuesta corta a «¿cómo saben que funciona?».

Y estas ocho van **No iniciada**:

| Título (copiar tal cual) | Vence | Quién | Prioridad | Qué escribir en las notas |
|---|---|---|---|---|
| Pruebas unitarias del backend (Jest) | 27-10 | Tomás | Importante | Llevar las 249 comprobaciones propias del backend a un marco formal. Controladores, middleware, cálculo de cumplimiento y difusión. |
| Integrar los verificadores en CI | 27-10 | Tomás | Importante | Las 332 comprobaciones ya corren a mano. Falta ejecutarlas en GitHub Actions en cada push. |
| Pruebas de componentes del frontend (RTL) | 03-11 | Héctor | Importante | Kanban, semáforo, mapa de calor, formularios y contexto de auth. |
| Pruebas de integración extremo a extremo | 17-11 | Los dos | Importante | Crear una actividad, subir evidencia, validarla y ver el semáforo moverse en otro usuario. |
| Pruebas de seguridad | 17-11 | Tomás | Urgente | Aislamiento multi-tenant, escalamiento de privilegios por rol, JWT inválido o expirado y rate limiting. Marco legal chileno: Ley 21.663 y Leyes 19.628 y 21.719. |
| Pruebas de carga y rendimiento | 17-11 | Héctor | Importante | Dashboard bajo 2 segundos con más de 1000 actividades. Presencia bajo 500 milisegundos. |
| Pruebas de usabilidad con usuarios reales | 24-11 | Los dos | Urgente | Crítico. El cliente advirtió que muchos funcionarios no manejan planillas. Medir el tiempo de subir una evidencia desde el teléfono. |
| Corrección de hallazgos | 01-12 | Los dos | Importante | Registrar hallazgos, priorizar, corregir y reejecutar la regresión. |

---

## 6. Tanda 4 — Ámbito y Requisitos: poner al día lo que cambió

⏱ **~25 minutos, 20 tareas.** Menos urgente que las anteriores, pero es donde se ve el trabajo de análisis.

### 6.1 Depósito Ámbito

Las cuatro primeras van **Completada**:

| Título | Fecha | Quién | Prio | Notas |
|---|---|---|---|---|
| Reunión de levantamiento con el cliente (Muni La Serena) | 25-08 | Los dos | Importante | Reunión de 1h41m con Javier Godoy. Grabación transcrita, con citas y marcas de tiempo. |
| Documento maestro del proyecto | 25-08 | Tomás | Importante | Visión inicial del equipo. Superado por el PDF de los profesores en la jerarquía de fuentes. |
| Procesar transcripción y clasificar requerimientos | 26-08 | Tomás | Urgente | Etiquetas CONFIRMADO / HIPÓTESIS / AMBIGUO con marcas de tiempo. |
| Definir restricciones del proyecto (costo cero y stack) | 25-08 | Los dos | Importante | Solo herramientas gratuitas. VPS solo si es imprescindible. |

Estas cuatro van **En curso** (y en la tanda 6 les pondremos la etiqueta si corresponde):

| Título | Vence | Quién | Prio | Notas |
|---|---|---|---|---|
| Definir roles del equipo y canal con Product Owners | 15-09 | Los dos | Importante | Los PO son los profesores y el canal es este Planner. Falta la cadencia formal de validación por sprint. |
| Consultas abiertas al docente | 15-09 | Tomás | Importante | 13 consultas registradas. No se responden por cuenta propia: se documentan como supuestos o preguntas. La 13 es el script MySQL frente a PostgreSQL. |
| Registro de riesgos y supuestos | 22-09 | Héctor | Media | Los riesgos aceptados ya están escritos. Falta la matriz probabilidad/impacto con mitigaciones. |
| Recibir parametrización de columnas y estados del cliente | 30-09 | Tomás | Importante | **Ya no bloquea.** Los catálogos se extrajeron de las capturas de la planilla real y viven en la tabla de catálogo. Falta la confirmación formal del cliente. |

Y esta va **No iniciada**:

| Título | Vence | Quién | Prio | Notas |
|---|---|---|---|---|
| Acta de constitución y alcance del proyecto | 22-09 | Héctor | Importante | Entregable formal, aún no redactado. Objetivo, alcance incluido y excluido, entregables, criterios de éxito, equipo. |

> **Ojo con esta**: «Recibir parametrización del cliente» estaba marcada como bloqueante y **ya no lo es**. Dejarla como bloqueo daría a entender que el proyecto está detenido esperando al cliente, cuando en realidad se resolvió sacando los catálogos de las capturas de la planilla en producción.

### 6.2 Depósito Requisitos de análisis o software

Estas nueve van **Completada**, asignadas a **Tomás** salvo donde se indique:

| Título | Fecha | Prio | Notas |
|---|---|---|---|
| Diagrama de contexto y actores (v1, agosto) | 25-08 | Media | Cuatro actores del modelo v1. Superado por el caso de uso general de la entrega, que lleva los seis actores del PDF. |
| Casos de uso por actor (v1, agosto) | 25-08 | Media | Diagrama y matriz de alcance por rol. Superado por los 12 casos de uso específicos de la entrega del 15 de septiembre. |
| Historias de usuario propias con criterios de aceptación (v1) | 25-08 | Media | 8 épicas y 20 historias. Quedan como historia del proyecto, subordinadas a las 31 oficiales. |
| Modelo entidad-relación inicial (v1, agosto) | 25-08 | Media | ERD de 7 tablas. Superado por el modelo v2 de 16 entidades y por el DER de la entrega. |
| Backlog priorizado del producto | 25-08 | Media | 13 historias P1 forman el MVP. |
| Requerimientos oficiales del PDF (38 RF, 18 RNF, 13 RN, 10 CA) | 31-08 | Urgente | Es la especificación que se evalúa y manda sobre el documento maestro del equipo. |
| Historias de usuario oficiales (31) | 31-08 | Importante | Las 31 del PDF mandan sobre las 20 propias. Si una historia contradice un requerimiento formal, prevalece el requerimiento y se registra la decisión. |
| Especificación de requisitos no funcionales *(Héctor)* | 31-08 | Importante | Los 18 RNF, con evidencia verificable en RNF-005, RNF-008, RNF-012, RNF-015 y RNF-017. |
| Historias del modelo por funcionario | 01-09 | Urgente | Ya no está bloqueada. Metas por funcionario, evidencias y validación del verificador están construidas y verificadas. |

Una **En curso** y una **No iniciada**:

| Título | Vence | Quién | Progreso | Prio | Notas |
|---|---|---|---|---|---|
| Matriz de trazabilidad requisitos - historias - pruebas | 15-09 | Héctor | En curso | Importante | Ya existe con historia, requisito, commit y prueba. Falta la columna de caso de uso que pide la entrega. |
| Validación de requisitos con Product Owners | 22-09 | Los dos | No iniciada | Importante | Revisión formal con los profesores tras la entrega del 15 de septiembre. |

### 6.3 Las que faltan en Diseño

Además de la que creaste en la tanda 1, el depósito Diseño necesita el trabajo de diseño ya hecho. Todas **Completada**, **Tomás** salvo la última:

| Título | Fecha | Prio | Notas |
|---|---|---|---|
| Sistema de diseño visual (DESIGN.md) | 25-08 | Importante | Tipografías, paleta del semáforo, tokens, tema oscuro, sistema de movimiento y lista negra. |
| Arquitectura de solución y diagrama de despliegue | 25-08 | Importante | Frontend, backend, PostgreSQL y reverse proxy, con Socket.io puro. |
| Diseño de la API REST y contrato de eventos | 25-08 | Importante | Contrato completo documentado. |
| Diagrama de secuencia del tiempo real | 25-08 | Media | Flujo de arrastrar y soltar con actualización optimista y difusión por rooms. |
| Diseño de seguridad: roles, permisos y multi-tenancy | 26-08 | Urgente | Aislamiento por organización, JWT en el handshake y libros privados por delegación. |
| Modelo de datos v2 (metas por funcionario, evidencias, atenciones) | 01-09 | Importante | Ya no está bloqueado. 16 entidades con triggers de inmutabilidad y restricciones de RUT, fechas y metas. |
| Identidad visual de la Municipalidad de La Serena | 02-09 | Importante | Normativa. Rojo institucional y heráldico separados por rol, zona y forma. Libre Franklin y General Sans en pantalla, Arial en lo impreso. |
| Decisiones técnicas registradas (15 ADR) | 06-09 | Importante | Cada decisión con su contexto, su alternativa descartada y su consecuencia. |
| Wireframes y diseño de las pantallas *(Héctor)* | 06-09 | Media | Las 8 pantallas están diseñadas y construidas; el mockup entrega 17 capturas (8 del camino feliz y 9 escenarios alternativos). |

Y una **No iniciada**:

| Título | Vence | Quién | Prio | Notas |
|---|---|---|---|---|
| Plan de pruebas (estrategia y casos) | 13-10 | Héctor | Importante | Alcance, tipos de prueba, criterios de entrada y salida, ambiente y responsables. Debe recoger las 332 comprobaciones que ya corren. |

---

## 7. Tanda 5 — Piloto e implementación

⏱ **~15 minutos, 10 tareas.** Todas **No iniciada**, depósito **Piloto e implementación**.

Es el depósito que muestra que el proyecto tiene plan hasta el final, no solo hasta la entrega.

| Título | Vence | Quién | Prio | Notas |
|---|---|---|---|---|
| Docker Compose de producción | 27-10 | Tomás | Importante | Imágenes de frontend y backend, red compartida, variables de entorno y secretos. |
| CI/CD con GitHub Actions y ghcr.io | 03-11 | Tomás | Importante | Build, publicación de imágenes, despliegue por SSH, health check y reversión automática. |
| VPS con reverse proxy, HTTPS y firewall | 10-11 | Héctor | Importante | Caddy o Nginx con Let's Encrypt. Cerrar todo salvo 80, 443 y SSH. |
| Script de respaldos y prueba de restauración | 17-11 | Héctor | Media | Respaldo nocturno, copia fuera del VPS y restauración probada en un contenedor descartable. |
| Manual de usuario simplificado | 24-11 | Héctor | Urgente | Con capturas, orientado a usuarios sin manejo de planillas. Guía corta para subir evidencia desde el teléfono. |
| Capacitación a la delegación piloto | 01-12 | Los dos | Importante | Sesión práctica con el equipo de una delegación. Registrar dudas y fricciones. |
| Ejecución del piloto en una delegación | 08-12 | Los dos | Urgente | Uso real durante dos semanas, con acompañamiento y registro de incidencias. |
| Retroalimentación del piloto y ajustes | 08-12 | Los dos | Importante | Consolidar la retroalimentación, priorizar ajustes rápidos y aplicarlos. |
| Manual técnico y de despliegue | 09-12 | Tomás | Importante | Instalación local, despliegue, variables de entorno, respaldos y resolución de problemas. |
| Presentación y entrega final | 10-12 | Los dos | Urgente | Demostración funcional, documentación completa y repositorio entregado. |

---

## 8. Tanda 6 — El acabado

⏱ **~20 minutos.** Es la otra tanda que **no se puede saltar**: sin ella, el trabajo de las cinco anteriores no se evalúa.

### 8.1 Crear la etiqueta «En revisión»

1. Abre cualquier tarea.
2. Busca **Etiquetas** (a la derecha, son cuadritos de colores).
3. Elige un color libre y escribe encima: `En revisión`.
4. Aplícala a las tareas que estén terminadas pero esperando revisión de la otra persona.

Aprovecha de crear dos etiquetas más, que ayudan a leer el tablero de un vistazo:

- `Entrega 15-sep` — para las siete tareas que se entregan el 15.
- `Bloqueado` — no la usamos hoy (no hay nada bloqueado), pero existir muestra que el tablero contempla el caso.

### 8.2 Adjuntar cada artefacto a su tarea

**Este es el paso que decide si el trabajo se evalúa o no.** Cuando cada artefacto esté listo, se abre su tarea y se cuelga ahí:

1. Abre la tarea.
2. **Datos adjuntos → Agregar datos adjuntos**.
3. Elige **Vínculo** (para apuntar al archivo en GitHub) o **Archivo** (para subir el `.html` o el `.png`).
4. Ponle un nombre que se entienda: no `diagrama.png`, sino `Diagrama de requerimientos - RF y RNF`.

Guía de qué va en cada tarea:

| Tarea | Qué se le adjunta |
|---|---|
| Diagrama de Requerimientos | El diagrama en `.png` y el enlace al archivo fuente |
| Diagramas UML | El caso de uso general y los 12 casos específicos |
| Casos de uso específicos y fichas *(si la creas)* | Las 12 fichas |
| Diagramas de Clase | El diagrama de clases en `.png` |
| Modelo Entidad-Relación | El DER en `.png` y el script `.sql` |
| Diseño MockUps | Los `.html` autocontenidos de las 17 pantallas |
| GIT | El enlace al repositorio y al README |

> **Por qué en dos formatos.** El `.html` autocontenido se abre desde Planner sin internet y se ve tal cual. El `.png` es para GitHub, donde el Markdown no ejecuta HTML. El profesor dijo que el frontend tiene que verse en GitHub, así que hacen falta los dos.

### 8.3 La captura del tablero

Cuando esté todo cargado:

1. Abre el plan en **vista Tablero** (no en Cuadrícula ni Gráficos).
2. Achica el zoom del navegador (`Ctrl` + `-`) hasta que se vean **los seis depósitos** con tareas.
3. Captura la pantalla completa.
4. Guárdala como `docs/entrega/planner-tablero.png` y pásala para el informe.

Aprovecha de sacar también una captura de la vista **Gráficos**: muestra el reparto por estado y por persona, y es una forma barata de evidenciar «responsables asignados» y «estados diferenciados» de un solo vistazo.

### 8.4 El enlace

Copia el enlace directo del plan (barra del navegador, o **… → Copiar vínculo al plan**) y pásalo: va en el informe, junto a la captura.

---

## 9. Lista de comprobación final

Recórrela antes de dar el tablero por listo:

- [ ] Existe la tarea **Diagrama de Requerimientos** (era el único criterio sin dueño)
- [ ] **Ningún depósito está vacío** — Desarrollo y Pruebas eran los que fallaban
- [ ] Cada tarea tiene **responsable** asignado
- [ ] Cada tarea tiene **fecha de vencimiento**
- [ ] Cada tarea tiene **prioridad**
- [ ] Las tareas terminadas están en **Completada**, no en «En curso al 90%»
- [ ] Existe la etiqueta **«En revisión»** y está explicada en el informe
- [ ] Los ocho criterios de la rúbrica tienen una tarea que los respalde (tabla del punto 3.2)
- [ ] Cada artefacto terminado está **adjunto o enlazado** desde su tarea
- [ ] Hay **captura del tablero** y **enlace directo** para el informe
- [ ] Ninguna tarea nombra `metas` de la versión vieja, la vista materializada ni el cron: **eso se eliminó** y mencionarlo contradice al resto de los entregables

---

## 10. Dudas que van a salir

**¿Y si me equivoco al crear una tarea?**
Nada es irreversible. Se edita el título, se cambia el depósito arrastrando, o se borra desde el menú `…` de la tarjeta. Planner guarda solo, no hay botón de deshacer general, pero tampoco hay nada que se rompa.

**¿Tengo que hacer las seis tandas de una vez?**
No. Están cortadas para hacerse por separado. El orden que más rinde si el tiempo es corto: **tanda 1 → tanda 2 → tanda 6**. Con esas tres, el tablero ya cuenta la verdad y los artefactos quedan colgados.

**¿Por qué hay tareas ya terminadas? ¿No es hacer trampa cargarlas ahora?**
No: el trabajo está hecho y fechado en el repositorio. Cada tarea Completada lleva en sus notas la etiqueta de versión (`v0.2.0` … `v0.15.0`), que es el punto exacto del historial donde se puede comprobar. Cargarlas ahora es documentar, no inventar. Lo que sí sería un error es dejar el tablero diciendo que no hemos empezado.

**¿Y si prefiero cargar todo de una en vez de a mano?**
No se puede, y no por falta de ganas: existe `scripts/cargar-plan-planner.ps1`, que lee `docs/plan-desarrollo.csv` y crearía las 87 tareas de un golpe, pero **INACAP bloquea la aplicación que necesita para conectarse**. El 9 de septiembre de 2026 se probó con el permiso mínimo y con código de dispositivo, y siempre termina en «Need admin approval»: solo un administrador de INACAP podría concedérselo, para todo el tenant. El script queda en el repositorio con su documentación, por si el proyecto se mueve algún día a otra cuenta.

**¿De dónde salen los textos de las notas?**
De `docs/plan-desarrollo.csv`, que es la misma fuente que usa el script. Si prefieres copiar y pegar desde ahí en vez de desde esta guía, es exactamente el mismo contenido.

**Me tocó una tarea que no entiendo qué significa.**
Pregunta antes de escribirla. Una nota que dice algo que no es cierto es peor que una tarea sin nota: el criterio transversal de la rúbrica es la **coherencia entre artefactos**, y una contradicción resta en varios criterios a la vez.

---

## 11. Dónde queda cada cosa

| Archivo | Para qué |
|---|---|
| Esta guía | Cómo cargar el tablero a mano, tanda por tanda |
| `docs/plan-desarrollo.csv` | El mismo contenido en formato tabla, por si prefieres copiar de ahí |
| `docs/plan-desarrollo.md` | La vista humana del plan completo, con el calendario por sprints y la ruta crítica |
| `docs/entrega/planner-delta.md` | Qué se corrigió del plan viejo y por qué, y el mapa criterio → tarea |
| `docs/rubrica-entrega-15-septiembre.md` | La rúbrica transcrita, con los ocho criterios y sus puntajes |
| `docs/plan-entrega-15-septiembre.md` | El plan de toda la entrega, no solo del Planner |
