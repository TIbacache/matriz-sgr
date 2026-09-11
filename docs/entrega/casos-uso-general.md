# Caso de uso general — SGR

**Criterio 3 de la rúbrica — 10 puntos.** 10 de septiembre de 2026 · Equipo Origami SpA

Las **funcionalidades principales** del sistema, con su frontera, los **seis actores** del PDF del proyecto y las relaciones UML entre casos. Es el eslabón que va después del [diagrama de requerimientos](requerimientos.md) y antes de las doce fichas del criterio 4.

> «El diagrama de requerimientos identifica **qué necesita** el sistema; el caso de uso general muestra las **funcionalidades principales**; el caso de uso detallado describe cada funcionalidad **paso a paso**.»
> — *Relación entre los artefactos*, del profesor Jorge Cortés

Aquí no se detallan flujos: eso es el criterio 4. Lo que este documento tiene que dejar cerrado es **quién hace qué**, **dónde termina el sistema** y **qué comportamiento se comparte o se ramifica**.

---

## 1. Qué pide la rúbrica, y dónde está

La [rúbrica §5.3](../rubrica-entrega-15-septiembre.md) exige cinco cosas. Ninguna se da por obvia:

| Lo que pide | Dónde está |
|---|---|
| Frontera del sistema claramente identificada | El rectángulo **SGR — Sistema de Gestión de Resultados** del §4. Los actores quedan fuera; los casos, dentro |
| Actores principales y secundarios correctamente nombrados | §3, con los seis nombres del PDF. Los secundarios se tratan en §3.1: **no hay**, y se explica por qué |
| Casos de uso principales, sin detallar flujos internos | Los doce óvalos del §4. Ningún paso, ninguna condición dentro del óvalo |
| Relaciones actor–caso de uso y uso adecuado de «include», «extend» o generalización | Las relaciones actor–caso en §5, los tres `«include»` en §7 y los seis `«extend»` en §8. La generalización se descarta con motivo en §3.2 |
| Correspondencia con los RF definidos | La tabla del §6, que es la misma columna «Caso de uso» de la [tabla de trazabilidad del criterio 2](requerimientos.md) leída al revés |

---

## 2. Cómo se lee

| Relación | Significa | Cuándo se usa |
|---|---|---|
| Actor → caso de uso | El actor **ejecuta** ese caso | Siempre que el rol inicia la funcionalidad |
| `«include»` | El caso base ejecuta **siempre** al incluido | Comportamiento compartido: sin él, el caso base no se completa |
| `«extend»` | El caso extendido ocurre **solo si** se cumple una condición | Caminos condicionales y de excepción |

**La dirección de la flecha no es un detalle.** En `«include»` va del caso base al incluido: el base sabe que lo necesita. En `«extend»` va **del caso de extensión al caso base**: el base se completa sin enterarse de que la extensión existe. Es la diferencia entre «esto siempre pasa» y «esto a veces pasa», y es lo que la rúbrica mira cuando dice «uso adecuado».

**Los estereotipos van en inglés a propósito.** Son notación de UML, no texto: por la misma razón no se traducen `+` de público ni `1..*` de cardinalidad. La convención completa está en [puml/_estilo.md](puml/_estilo.md).

---

## 3. Los seis actores

Del PDF del proyecto §3. La tercera columna es el nombre técnico del rol en el código, que **no siempre coincide con el municipal**: es la equivalencia que hay que tener a mano al leer el diagrama de clases y el DER.

| Actor | Qué hace en el sistema | Rol en el código |
|---|---|---|
| **Administrador** | Configura delegaciones, usuarios, cargos, catálogos, períodos, metas y ponderaciones | `admin` |
| **Coordinador del sistema** | Supervisa la operación transversal, revisa indicadores y resuelve criterios | `supervisor` |
| **Delegado o jefatura** | Consulta su delegación, asigna y revisa compromisos | `gerente` |
| **Funcionario** | Registra actividades, compromisos, atenciones, contactos y evidencias | `usuario` |
| **Verificador** | Revisa evidencias, valida o rechaza y deja trazabilidad | `verificador` |
| **Usuario de consulta** | Accede a tableros e informes, sin modificar | `consulta` |

**El Verificador tiene un solo caso de uso, y es a propósito.** RNF-005 exige segregación de funciones: quien valida la evidencia no puede ser quien la registró. Por eso CU-03 rechaza además que alguien valide lo propio aunque su rol se lo permita (CU-E3), y por eso el Verificador no aparece en el tubo ni en las fichas de vecinos.

### 3.1 No hay actores secundarios, y hay que decirlo

La rúbrica pide «actores principales **y secundarios**, si aplica». En SGR **no aplica**, y no por omisión:

- **No hay sistemas externos.** El proyecto tiene una restricción de **costo cero** (regla 13): no hay pasarela de pago, ni servicio de correo, ni integración con el Registro Civil o el SII. El RUT se valida con **módulo 11 calculado localmente** (ADR-001), y las evidencias se guardan en almacenamiento propio.
- **El «Sistema» no se dibuja como actor en la frontera.** La tabla de trazabilidad del criterio 2 pone «Sistema» en la columna de actor de RF-014, RF-020, RF-022 y otros, porque el PDF del proyecto lo escribe así. Pero dibujarlo como muñeco **afuera** de la frontera contradiría la frontera misma: el sistema no interactúa consigo desde fuera.

  Eso no lo borra del vocabulario. En la **ficha** de un caso que ejecuta el servidor sin intervención humana —generar el código, auditar, validar— el actor principal **es el Sistema**, tal como lo escribe el docente en «Relación entre los artefactos» para sus casos *Buscar Empleado* y *Validar Datos de Empleado*. Es la misma distinción de siempre: quién **ejecuta** un paso no es lo mismo que quién está **fuera** del sistema pidiéndole algo.

Cuando exista integración —RF-033 exportación, RNF-016 interoperabilidad— aparecerá el primer actor secundario. Los dos están declarados **fuera de esta iteración** en [requerimientos.md §13](requerimientos.md).

### 3.2 Por qué no se dibuja generalización entre actores

**Decisión tomada y confirmada.** Los seis roles **no forman una jerarquía**: son conjuntos que se solapan.

- El **Verificador** valida evidencias, pero no ve el tubo ni las fichas de vecinos: no es «un Funcionario con más permisos».
- El **Coordinador** ve el panel de actividad y también el **Administrador**, pero ninguno de los dos hereda del otro.
- El **Usuario de consulta** ve el tablero consolidado, que el **Funcionario** también ve, y sin embargo no puede registrar nada.

Dibujar una generalización afirmaría una herencia que el código no cumple, y la coherencia entre artefactos es el criterio transversal de la rúbrica. La rúbrica pide «`«include»`, `«extend»` **o** generalización» —las tres son alternativas—, y las dos primeras están usadas de verdad: tres «include» y seis «extend».

---

## 4. El diagrama general

![Caso de uso general](puml/09-casos-uso-general.png)

> Fuente: [`puml/09-casos-uso-general.puml`](puml/09-casos-uso-general.puml) — se edita ahí y se regenera.

**Los casos van agrupados por los mismos cinco módulos (M1 a M5) del diagrama de requerimientos.** Sin agrupar, los doce quedaban en una columna y el dibujo se leía como una lista; agrupados, la correspondencia entre artefactos queda a la vista. Los seis actores van todos a la izquierda: repartirlos a ambos lados de la frontera hacía que PlantUML mandara tres al fondo, con flechas cruzando el diagrama entero.

---

## 5. Quién ejecuta qué

La matriz actor ↔ caso de uso, que es la misma información de las flechas del diagrama en forma de tabla — más fácil de comprobar campo por campo.

| Caso de uso | Funcionario | Verificador | Delegado | Coordinador | Administrador | Consulta |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| CU-01 · Registrar actividad diaria | ● | | | | | |
| CU-02 · Adjuntar evidencia | ● | | | | | |
| CU-03 · Validar o rechazar una evidencia | | ● | | | | |
| CU-04 · Configurar metas y ponderadores | | | | ● | ● | |
| CU-05 · Consultar la ficha personal | ● | | | | | |
| CU-06 · Registrar un compromiso en el tubo | ● | | ● | | | |
| CU-07 · Mover un compromiso de estado | ● | | ● | | | |
| CU-08 · Registrar una atención social | ● | | | | | |
| CU-09 · Consultar el tablero consolidado | | | ● | | | ● |
| CU-10 · Anular una actividad con motivo | ● | | ● | | | |
| CU-11 · Buscar el historial de un vecino | ● | | | ● | | |
| CU-12 · Controlar la actividad de usuarios | | | | ● | ● | |

**Los seis actores del PDF aparecen.** Ninguno queda suelto y ninguno concentra todo.

### 5.1 Quién más puede, y por qué no está dibujado

El diagrama muestra el **actor principal** de cada caso —quien lo inicia en la operación diaria—, no el listado completo de quién tiene permiso. Son cosas distintas y conviene poder responderlo:

| Caso | Además puede | Con qué alcance |
|---|---|---|
| CU-03 | Coordinador y Administrador | El mismo, y con la misma prohibición de validar lo propio (RNF-005) |
| CU-09 | Funcionario, Coordinador y Administrador | El semáforo consolidado lo ve todo el mundo; el libro de cada delegación **no** (confirmado por el cliente) |
| CU-10 | Coordinador y Administrador | Sin restricción de delegación; el Delegado, solo en la suya |
| CU-11 | Delegado | Lo de otra delegación viaja **reducido**: fecha, delegación, tipo y estado (ADR-012) |

Y al revés, que es lo que más importa por el marco legal chileno, **quién recibe 403 con el motivo escrito**:

- **CU-11**, la ficha del vecino: **Verificador y Usuario de consulta**. Son datos personales de vecinos (ADR-012).
- **CU-12**, el control de actividad: **todos salvo Administrador y Coordinador**. Son datos de desempeño de funcionarios públicos, y por proporcionalidad el acceso es el más restringido del sistema (ADR-015).

No es un error de permisos: es mínimo privilegio, y está modelado como CU-E5.

---

## 6. Los doce casos y su correspondencia con los RF

Los identificadores vienen de la guía del 1 de septiembre; se conservan para no reescribir lo que el equipo ya leyó. La columna «Pantalla» es la exigencia de la [decisión D-2](../plan-entrega-15-septiembre.md): cada caso de uso tiene una pantalla, o el mapa CU → mockup queda con huecos.

| ID | Caso de uso | Módulo | RF y reglas | Pantalla |
|---|---|---|---|---|
| CU-01 | Registrar actividad diaria | M2 | RF-009, RF-010, RF-011 | [`03-ficha`](../mockups/03-ficha.png) |
| CU-02 | Adjuntar evidencia a una actividad | M2 | RF-012, RNF-017 | [`03-ficha`](../mockups/03-ficha.png) |
| CU-03 | Validar o rechazar una evidencia | M2 | RF-013, RF-014, RNF-005 | [`04-verificacion`](../mockups/04-verificacion.png) |
| CU-04 | Configurar metas y ponderadores | M1 | RF-006, RF-007, RN-001 | [`05-metas`](../mockups/05-metas.png) |
| CU-05 | Consultar la ficha personal y el semáforo | M2 | RF-008, RF-023, RF-026, RF-027 | [`03-ficha`](../mockups/03-ficha.png) |
| CU-06 | Registrar un compromiso del vecino en el tubo | M3 | RF-004, RF-010, RF-016, RF-017 | [`02-tubo`](../mockups/02-tubo.png) |
| CU-07 | Mover un compromiso de estado | M3 | RF-018, RF-019, RF-034 | [`02-tubo`](../mockups/02-tubo.png) |
| CU-08 | Registrar una atención social y sus gestiones | M2 | RF-004, RF-015, CA-04 | [`03-ficha`](../mockups/03-ficha.png), modal del caso |
| CU-09 | Consultar el tablero consolidado | M4 | RF-022, RF-024, RF-029 | [`07-dashboard`](../mockups/07-dashboard.png) |
| CU-10 | Anular una actividad con motivo | M5 | RF-036, RN-009 | [`03-ficha`](../mockups/03-ficha.png) |
| CU-11 | Buscar el historial de un vecino entre delegaciones | M5 | RF-032, CA-04 | [`06-vecino`](../mockups/06-vecino.png) |
| CU-12 | Controlar la actividad de usuarios | M4 | RF-030 | [`08-actividad`](../mockups/08-actividad.png) |

**La correspondencia es bidireccional y hay que poder recorrerla en los dos sentidos.** La columna «Caso de uso» de la [tabla de trazabilidad del criterio 2](requerimientos.md) dice, para cada RF, qué caso lo cumple; esta tabla dice, para cada caso, qué RF cubre. Si una de las dos cambia, la otra cambia el mismo día.

> **Los doce casos salen de lo construido, no del catálogo completo de RF** (decisión D-2). Los siete RF declarados fuera de alcance —RF-025, RF-028, RF-031, RF-033, RF-035, RF-037 y el cierre automático de RF-020— no tienen caso de uso aquí, y por eso aparecen con **borde punteado** en el diagrama de requerimientos. Ese diagrama dice qué necesita el sistema; este dice qué se puede ejecutar hoy.

---

## 7. Los casos incluidos («include»)

Comportamiento **compartido**: el caso base no se completa sin él.

| ID | Caso incluido | Lo incluyen | Qué hace | Requisito |
|---|---|---|---|---|
| **CU-I1** | Validar los datos del registro | CU-01, CU-06 | Obligatoriedad, **formato** (RUT con módulo 11, teléfono chileno) y **coherencia**: la fecha dentro del período, el ítem perteneciente al cargo del funcionario | RF-010, ADR-001 |
| **CU-I2** | Generar el código único de la actividad | CU-01 | El servidor genera el correlativo por área y día, con bloqueo para que dos registros simultáneos no obtengan el mismo. **Es inmutable**: hay un trigger en la base que lo impide | RF-011, ADR-004 |
| **CU-I3** | Registrar en la bitácora de auditoría | Todas las operaciones que escriben, más CU-11 y CU-12 | Usuario, fecha, acción, entidad, valor anterior y valor nuevo | RNF-008, RF-036, ADR-006 |

**CU-I3 no se dibuja en el diagrama general.** Lo incluyen las diez operaciones que escriben, **más CU-11 y CU-12, que se auditan aunque solo consulten** —abrir la ficha de un vecino deja registro, porque es un dato personal (Leyes 19.628 / 21.719)—. Diez flechas hacia el mismo óvalo dirían menos que la nota que lleva el diagrama. Aparece en el diagrama de cada caso de uso, en el criterio 4.

---

## 8. Los casos de extensión («extend»)

Van en **un diagrama aparte**, y es una decisión, no una omisión: son caminos condicionales y de excepción, y sumarlos al general lo llenan de ramas que solo ocurren a veces. Los `«include»` sí están en el general, porque son comportamiento compartido y ahí se ve la reutilización.

![Casos de extensión](puml/10-casos-uso-extensiones.png)

> Fuente: [`puml/10-casos-uso-extensiones.puml`](puml/10-casos-uso-extensiones.puml) — se edita ahí y se regenera.

La ficha corta es la que usa el ejemplo del docente para los casos de extensión: `ID | Nombre | Tipo | Caso base | Condición | Resultado`.

| ID | Nombre | Tipo | Caso base | Condición | Resultado |
|---|---|---|---|---|---|
| **CU-E1** | Avisar posible atención duplicada | `«extend»` | CU-01, CU-06, CU-11 | Al registrar: el vecino ya registra atenciones o compromisos en **otra** delegación. En la ficha: dos hechos de la misma clasificación dentro de la **ventana de duplicidad** | Aviso **ámbar** con las delegaciones y los hechos que lo componen. **No bloquea**: informa. Es el control que el cliente vino a buscar (ADR-008, CA-04) |
| **CU-E2** | Exigir observación de la decisión | `«extend»` | CU-03 | La decisión no es «aprobar» | La validación se rechaza hasta que haya observación escrita. Rechazar sin decir por qué no es trazabilidad (RF-013) |
| **CU-E3** | Rechazar la validación propia | `«extend»` | CU-03 | Quien valida es quien registró la actividad o cargó la evidencia | Se deniega con el motivo: segregación de funciones (RNF-005) |
| **CU-E4** | Informar conflicto de versión | `«extend»` | CU-04, CU-07, CU-10 | La versión enviada ya no es la vigente: alguien más guardó primero | **409**, con el estado actual y sin sobrescribir. La pantalla lo dice; nunca revierte en silencio (RF-034, CA-08, ADR-005) |
| **CU-E5** | Denegar por alcance con el motivo escrito | `«extend»` | CU-11, CU-12 | El rol no alcanza ese dato: en CU-11, Verificador y Usuario de consulta; en CU-12, **todos salvo Administrador y Coordinador** | **403** con el motivo redactado, no un «sin permisos» a secas. Es una decisión legal, no de interfaz (ADR-012, ADR-015) |
| **CU-E6** | Informar delegación sin medición | `«extend»` | CU-09 | La delegación no tiene a nadie con metas configuradas | Se informa **«sin medición»**, nunca 0%. Un 0% diría que trabajaron y no cumplieron; la verdad es que no hay nada que medir (ADR-014) |

**CU-E4 y CU-E5 son transversales, como CU-I3.** El conflicto de versión puede ocurrir en **cualquier** operación que escriba llevando su `version`, y la denegación por alcance en cualquiera que toque un dato restringido. En el diagrama se dibujan sobre los casos base donde el sistema los produce hoy; escribir una flecha por cada write convertiría el dibujo en una maraña sin decir nada nuevo.

**Los seis son escenarios alternativos que el mockup tiene que representar** (decisión D-3), y desde el criterio 8 lo están: el mapa completo es el §8.1.

---

## 8.1 El mapa CU → mockup de los escenarios alternativos

La [rúbrica §6](../rubrica-entrega-15-septiembre.md) no pide solo las pantallas del camino feliz: «los mockups deben representar las pantallas necesarias para ejecutar los casos de uso **y también contemplar los escenarios alternativos modelados**». Esta es la casilla de cada uno.

**Ninguna de estas imágenes es un dibujo.** Salen de la aplicación real corriendo: el escenario se **produce** —se escribe en el campo, se aprieta el botón, y para el conflicto de versión una segunda sesión guarda primero— y recién entonces se captura. Si en la pantalla aparece un 403, es porque el servidor lo devolvió.

| ID | Escenario | Mockup | Qué se ve |
|---|---|---|---|
| **CU-I1** | Validar los datos del registro | [`09-alt-datos-invalidos`](../mockups/09-alt-datos-invalidos.png) | **Formato**: el teléfono no válido avisa junto al campo, al salir de él. **Obligatoriedad**: sin «Actividad o solicitud» el botón Registrar no se habilita |
| **CU-I2** | Generar el código único | [`03-ficha`](../mockups/03-ficha.png) | **Sin pantalla propia, y es correcto**: el código no se pide, lo genera el servidor. Se ve ya asignado en cada fila de la ficha |
| **CU-I3** | Registrar en la bitácora | — | **Sin pantalla — RF-036 pendiente (desvío D-c)**. Se audita todo write crítico, pero la pantalla para *leer* la bitácora no está construida. No se le dibuja un mockup: sería describir un sistema que no existe |
| **CU-E1** | Avisar posible atención duplicada | [`10-alt-duplicidad`](../mockups/10-alt-duplicidad.png) | El aviso ámbar con las delegaciones y los hechos que lo componen, y la ventana de comparación declarada como provisional |
| **CU-E2** | Exigir observación de la decisión | [`11-alt-observacion-obligatoria`](../mockups/11-alt-observacion-obligatoria.png) | Rechazar sin escribir por qué: el aviso aparece y el foco vuelve al campo. Ni siquiera sale la petición |
| **CU-E3** | Rechazar la validación propia | [`12-alt-validacion-propia`](../mockups/12-alt-validacion-propia.png) | El coordinador subió esa evidencia —lo dice «Subida por»— y el servidor le responde **403** con RNF-005 escrito |
| **CU-E4** | Informar conflicto de versión | [`13-alt-conflicto-version`](../mockups/13-alt-conflicto-version.png) | **409** real: otra sesión guardó primero. La corrección no se pierde ni se sobrescribe, y se ofrece «Ver lo vigente» |
| **CU-E5** | Denegar por alcance · ficha del vecino | [`14-alt-alcance-vecino`](../mockups/14-alt-alcance-vecino.png) | El verificador queda fuera, con el motivo redactado y las leyes citadas — no un «sin permisos» a secas |
| **CU-E5** | Denegar por alcance · control de actividad | [`15-alt-alcance-actividad`](../mockups/15-alt-alcance-actividad.png) | El mismo caso desde el otro lado: a un funcionario el panel le responde 403 y la pantalla muestra **ese** texto |
| **CU-E6** | Informar delegación sin medición | [`16-alt-sin-medicion`](../mockups/16-alt-sin-medicion.png) | La Pampa se informa **sin medición**, nunca 0%, y se dice dónde se corrige (ADR-014) |
| *(ADR-012)* | Alcance reducido entre delegaciones | [`17-alt-alcance-reducido`](../mockups/17-alt-alcance-reducido.png) | No es uno de los nueve, pero es el mismo tipo de escenario: para un delegado, la atención de otra delegación viaja con su fecha, su delegación y su tipo, sin el detalle |

**Dos de los nueve no tienen imagen propia, y las dos ausencias son decisiones argumentadas**, no huecos: CU-I2 porque el código no es una pantalla sino un dato que ya se ve en la ficha, y CU-I3 porque **la pantalla no existe todavía**. Inventarle un mockup a RF-036 lo habría hecho desaparecer del listado de lo que falta, que es exactamente lo contrario de lo que un artefacto de análisis tiene que lograr.

⚠ **CU-E3 exigió un dato deliberado en el seed.** Las tres cuentas que validan no tienen cargo, así que ninguna de las evidencias sembradas les pertenecía y el 403 era **incomprobable en la demostración**. Se armó por el lado de *quién sube*, no de quién registra: el coordinador carga la evidencia de un funcionario —un flujo que la API ya admite— y por eso no puede validarla. Es la misma clase de dato a propósito que La Pampa sin medición (ADR-014) y que la funcionaria con metas y cero actividades (ADR-015).

---

## 9. Dos correcciones que salieron de revisar el código

El [plan §4](../plan-entrega-15-septiembre.md) definió los casos incluidos y de extensión el 6 de septiembre, antes de dibujarlos. Al contrastarlos con el código —que es lo que la regla 1 del proyecto exige antes de escribir— aparecieron dos diferencias. Se corrigen aquí y quedan registradas, porque cambiar un artefacto sin decirlo es exactamente lo que rompe la coherencia:

**1. CU-I1 se llamaba «Validar RUT y teléfono» y ahora es «Validar los datos del registro».**
Un `«include»` significa que el caso base ejecuta **siempre** al incluido. Y validar el RUT no siempre ocurre: una actividad puede registrarse sin vecino asociado, y el alta del tubo **no pide RUT** —la planilla real no tiene esa columna y el solicitante puede ser una organización—. Lo que sí ocurre siempre en los dos casos base es la validación de obligatoriedad, formato y coherencia, que es literalmente lo que dice RF-010. El RUT y el teléfono son **ejemplos dentro** de ese caso, no su definición.

**2. CU-E1 extiende también a CU-11.**
El plan le daba dos casos base (CU-01 y CU-06) y la [tabla de trazabilidad del criterio 2](requerimientos.md) lo trazaba a CU-11. Las dos tenían razón a medias: el aviso existe en los **tres**, con dos formas distintas. Al registrar (CU-01, CU-06) avisa si la persona ya tiene registros en otra delegación, sin ventana de tiempo. En la ficha del vecino (CU-11) aplica la **ventana de duplicidad** que sale del parámetro y agrupa las coincidencias por clasificación. Se modela como **una** extensión con tres casos base, porque es la misma regla de negocio mirada en dos momentos.

> ⚠ La **ventana de duplicidad** todavía espera respuesta del docente: es la [consulta abierta nº 12](../requerimientos-oficiales.md). El parámetro existe y es configurable (ADR-007), pero su valor no está confirmado, y el sistema lo declara en la respuesta en vez de fingir que sí lo está.

---

## 10. Consistencia con los demás artefactos

La rúbrica evalúa la coherencia como criterio transversal. Estas son las correspondencias que hay que poder defender frente a una pregunta:

| Este documento dice | Y tiene que coincidir con |
|---|---|
| Seis actores, con su nombre municipal y su rol técnico | Los seis del [diagrama de requerimientos](requerimientos.md) y la tabla de cuentas de [estado-proyecto.md §1](../estado-proyecto.md) |
| Doce casos de uso con su ID | Las **doce fichas** del criterio 4, una por cada uno |
| Cada caso con sus RF | La columna «Caso de uso» de la tabla de trazabilidad del criterio 2, leída al revés |
| Cada caso con su pantalla | Las ocho pantallas de [docs/mockups/](../mockups/) y el mapa CU → mockup del informe |
| Los seis `«extend»` | Los **escenarios alternativos** del mockup (decisión D-3) y los flujos alternativos de las fichas |
| «Solo lo validado suma» en CU-03 | El motor de cumplimiento del diagrama de clases |
| «Código único e inmutable» en CU-I2 | La restricción de la entidad de evidencia en el DER y en el script SQL |

---

## 11. Cómo se regenera

**La fuente de cada diagrama es su archivo `.puml`** en [puml/](puml/). Los PNG se generan desde ahí y **nunca se editan a mano**:

```powershell
cd frontend
npm run puml -- ../docs/entrega/puml          # comprueba que compilan y actualiza los enlaces
npm run puml -- ../docs/entrega/puml --png    # además descarga los PNG
```

Sin `--png` el script no toca la red: el enlace al editor de plantuml.com se calcula localmente. El índice con los enlaces está en [puml/README.md](puml/README.md).

Los `.png` hacen falta porque en Planner se adjuntan archivos, y porque el docente pidió que el trabajo se vea también en GitHub, donde Markdown no ejecuta diagramas.
