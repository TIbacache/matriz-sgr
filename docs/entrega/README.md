# Entrega del 15 de septiembre — Análisis y Diseño

Los artefactos de la **primera evaluación** (100 puntos, ocho criterios). Este archivo es el estado: qué está listo, qué falta y dónde está cada cosa.

**Actualizado**: 10 de septiembre de 2026 · rama `entrega/analisis-diseno`

- El plan de trabajo está en [../plan-entrega-15-septiembre.md](../plan-entrega-15-septiembre.md).
- La rúbrica transcrita, en [../rubrica-entrega-15-septiembre.md](../rubrica-entrega-15-septiembre.md). Los dos PDF originales del docente están versionados en `docs/`.

---

## Estado por criterio

| # | Criterio | Pts | Estado | Artefacto |
|---|---|---|---|---|
| 1 | Planner | 15 | 🟠 **Preparado, falta cargarlo** | [guia-planner-hector.pdf](guia-planner-hector.pdf) · [planner-delta.md](planner-delta.md) |
| 2 | Diagramas de requerimientos | 10 | ✅ **Hecho** | [requerimientos.md](requerimientos.md) · [puml/](puml/) |
| 3 | Caso de uso general | 10 | ✅ **Hecho** | [casos-uso-general.md](casos-uso-general.md) · [puml/09](puml/09-casos-uso-general.puml) y [puml/10](puml/10-casos-uso-extensiones.puml) |
| 4 | Casos de uso específicos + fichas | 20 | ✅ **Hecho** | [casos-uso-detalle.md](casos-uso-detalle.md) · [puml/11](puml/11-cu-01.puml) a [puml/22](puml/22-cu-12.puml) |
| 5 | Diagrama de clases | 15 | ✅ **Hecho** | [clases.md](clases.md) · [puml/23](puml/23-clases-panorama.puml) a [puml/27](puml/27-clases-servicios.puml) |
| 6 | DER MySQL | 10 | ✅ **Hecho** | [der.md](der.md) · [puml/28](puml/28-der-general.puml) a [puml/32](puml/32-der-plataforma.puml) |
| 7 | Script SQL | 10 | 🔴 Pendiente | — |
| 8 | Mockup funcional + Git | 10 | 🟢 Hecho, faltan escenarios alternativos | [../mockups/](../mockups/) |
| — | Informe de la entrega | — | 🔴 Pendiente | — |

**80 de 100 puntos cubiertos.** Queda el **script SQL** (criterio 7), los escenarios alternativos del mockup y el informe.

### Cómo quedó el criterio 3 (cerrado el 10 de septiembre)

Son **dos diagramas y un documento**, y el documento es el que se entrega: [casos-uso-general.md](casos-uso-general.md).

- **[puml/09-casos-uso-general.puml](puml/09-casos-uso-general.puml)** — la frontera, los seis actores del PDF §3, los doce casos sin flujos internos, las relaciones actor–caso de uso y los `«include»`. Cumple los cinco puntos de la rúbrica §5.3.
- **[puml/10-casos-uso-extensiones.puml](puml/10-casos-uso-extensiones.puml)** — los seis `«extend»`, con su caso base y su condición entre corchetes.

Cuatro decisiones que **no conviene rediscutir**, porque cada una costó un rehecho:

- **Los casos van agrupados por los mismos cinco módulos (M1 a M5) del diagrama de requerimientos.** Sin agrupar, los doce quedaban en una columna y el dibujo se leía como una lista. Agrupados, además, la correspondencia entre artefactos queda a la vista, que es el criterio transversal de la rúbrica.
- **Los seis actores van todos a la izquierda.** Se probó repartirlos a ambos lados de la frontera y PlantUML mandó tres al fondo, con flechas cruzando el diagrama entero.
- **Los `«extend»` van en un diagrama aparte.** Son caminos condicionales: sumarlos al general lo llenaban de ramas que solo ocurren a veces. Los `«include»` sí están en el general, porque son comportamiento compartido y ahí se ve la reutilización.
- **No se dibuja generalización entre actores** (decisión confirmada). Los seis roles no forman una jerarquía sino conjuntos que se solapan: el Verificador valida pero no ve el tubo; el Coordinador ve el panel de actividad y el Administrador también. Dibujar una herencia afirmaría algo que el código no cumple. La rúbrica pide «include», «extend» **o** generalización, y las dos primeras están usadas de verdad: tres «include» y seis «extend». El argumento está redactado en [casos-uso-general.md §3.2](casos-uso-general.md) por si lo preguntan.

**CU-I3 (auditar) no se dibuja en el general**: lo incluyen las diez operaciones que escriben, más CU-11 y CU-12, que se auditan aunque solo consulten. Diez flechas al mismo óvalo dirían menos que la nota que lleva el diagrama. Va en el diagrama de cada caso de uso, en el criterio 4.

⚠ **Dos correcciones al [plan §4](../plan-entrega-15-septiembre.md) salieron de contrastarlo con el código**, y el criterio 4 tiene que partir de ellas, no del plan:

1. **CU-I1 ya no es «Validar RUT y teléfono» sino «Validar los datos del registro»** (obligatoriedad, formato y coherencia — RF-010). Un `«include»` se ejecuta *siempre*, y validar el RUT no siempre ocurre: una actividad puede no llevar vecino, y el alta del tubo **no pide RUT**.
2. **CU-E1 tiene tres casos base, no dos**: CU-01, CU-06 **y CU-11**. El aviso existe en el alta (`alertaTrazabilidad`, sin ventana de tiempo) y en la ficha del vecino (con la ventana de duplicidad del parámetro). Es la misma regla en dos momentos.

### Cómo quedó el criterio 4 (cerrado el 10 de septiembre)

**Doce fichas y doce diagramas**, en [casos-uso-detalle.md](casos-uso-detalle.md) y en `puml/11-cu-01` a `puml/22-cu-12`. La rúbrica exige diez como mínimo; presentar menos deja el criterio en «Insuficiente» con tope de 7 de 20.

Tres decisiones de forma, tomadas contra el PDF **«Relación entre los artefactos»** después de leerlo entero:

- **La ficha es la de la rúbrica §5.4, no la del ejemplo del docente.** El cuadro que él muestra es más corto: no pide Objetivo, Actores secundarios, Disparador, Flujos alternativos ni Excepciones. La rúbrica es el instrumento que pone la nota, así que se entregan sus doce campos, más las dos filas del ejemplo (`Casos incluidos`, `Casos de extensión`) porque no cuestan nada y dejan las relaciones UML también en texto.
- **El «caso de uso detallado» del docente es un diagrama de casos de uso**, no un diagrama de actividad: su Imagen 4 muestra un caso con su actor, sus incluidos y sus extensiones. Los doce siguen esa forma.
- **En el diagrama no van notas explicativas.** La rúbrica pide el detalle en la **ficha textual**; el diagrama muestra las relaciones. Las notas que tenía el borrador de CU-01 se movieron a la ficha.

⚠ **Las fichas declaran tres desvíos entre el requerimiento y el código.** No se disimulan: un artefacto que describe el código como si fuera el requisito vuelve invisible el incumplimiento.

| Desvío | Qué pide el RF | Qué hay hoy |
|---|---|---|
| **CU-06** | **RF-016** asigna la creación de compromisos al **Funcionario** y al Delegado | El alta está restringida a jefatura y nivel central. El funcionario mueve sus compromisos, pero no los crea. Viene de la matriz de permisos del Documento Maestro, que es la fuente más baja de la jerarquía y quedó por encima del RF sin que nadie lo decidiera |
| **CU-07** | **RF-018** pide cuatro estados con historial de transiciones y **RF-019** alertas de «próximo a vencer» y «fuera de plazo» | Tres estados y solo se marcan los vencidos. ⚠ **`tarea_historial` existe y el seed la llena, pero la aplicación nunca escribe en ella**: en la demostración el historial se ve poblado y en uso real no se llenaría. El recorrido se reconstruye desde la bitácora |
| **CU-10** | **RF-036** pide trazabilidad consultable | Se audita todo write crítico, pero **falta la pantalla** para leer la bitácora |

Los tres están en [../siguiente-sesion.md §4.bis](../siguiente-sesion.md) con su costo estimado, para que no se pierdan cuando pase la entrega.

### Cómo quedó el criterio 5 (cerrado el 10 de septiembre)

**Cinco diagramas y un documento**: [clases.md](clases.md) y `puml/23-clases-panorama` a `puml/27-clases-servicios`.

**Sale de dos fuentes, y hay que mantener las dos.** La rúbrica §6.1 evalúa seis cosas y cada fuente sola falla en tres:

- `backend/prisma/schema.prisma` da las 22 entidades con atributos, tipos y multiplicidades — pero **no tiene una sola operación**.
- `backend/src/services/` y `backend/src/routes/` dan las operaciones con su nombre real — pero no tienen atributos ni multiplicidades.

Tres decisiones que no conviene rediscutir:

- **Son 22 clases y 22 tablas, no 16.** Las 16 son las de la migración v2; faltaban las 6 de plataforma: `Organization`, `User`, `OrganizationMember`, `UnidadTerritorial`, `CategoriaGestion` y `Tarea`. **El DER lleva las 22.**
- **No se dibuja herencia**, porque la rúbrica la pide solo con justificación y aquí no la hay: los seis roles son valores de un enumerado que se solapan. Es **la misma decisión** que la de no dibujar generalización entre actores en el criterio 3: cambiar una obliga a cambiar la otra.
- **La visibilidad va como `+ - #`**, no como iconos de color. PlantUML usa iconos salvo que se le fije `classAttributeIconSize 0`, y la rúbrica pide los signos.

Tres clases van con **borde punteado** porque tienen tabla y no comportamiento: `Ajuste` (RF-025), `Comentario` (RF-035) y `TareaHistorial`.

### Cómo quedó el criterio 6 (cerrado el 10 de septiembre)

**Cinco diagramas y un documento**: [der.md](der.md) y `puml/28-der-general` a `puml/32-der-plataforma`. **22 tablas, 52 claves foráneas y 8 enumerados.**

- **El mapa general (28) muestra las 22 tablas y las 52 FK; los otros cuatro traen el detalle de campos y tipos.** Entre esos cuatro cubren las 22 sin repetir ninguna: cuando uno necesita una tabla que se detalla en otro, la dibuja reducida a su `id` con el estereotipo `«en NN-der-…»`. El verificador comprueba que ninguna tabla se quede sin ese detalle.
- **Las 20 relaciones de `organization_id` van en gris claro** en el mapa general. Es la misma relación repetida veinte veces y, en negro, tapa el modelo. Están todas, y estarán una por una en el script.
- **Las 52 FK se extrajeron de las migraciones**, no se transcribieron. Es lo que permite afirmar que no falta ni sobra ninguna, y es la mitad del trato que la rúbrica pide para el criterio 7 («toda FK del DER debe existir en el script»).
- **Notación crow's foot (`entity` + `||--o{`), no cajas de clase.** El DER y el diagrama de clases son artefactos distintos y se evalúan por separado; entregar dos veces el mismo dibujo con otro título es la forma más barata de perder los dos.

⚠ **Un hallazgo nuevo, que apareció al extraer las FK una por una**: `periodos.cerrado_por_id` **debería ser clave foránea a `users` y no lo es**. No estaba declarado en ninguna parte. Se deja igual en el DER —el artefacto describe el sistema que hay— y queda anotado como corrección posterior en [../siguiente-sesion.md §4.bis](../siguiente-sesion.md). El caso análogo, `ajustes.registrado_por_id`, sí la tiene con `RESTRICT`.

**Y una decisión de traducción que hay que poder defender**: `timestamptz` → `DATETIME(3)` **pierde la zona horaria**. El equivalente fiel en MySQL sería `TIMESTAMP`, pero su rango termina en 2038. Se elige `DATETIME(3)` y se declara que la aplicación guarda todo instante en UTC ([der.md §12.1](der.md)).

---

## Lo que hay que saber para retomar

### El Planner no se puede automatizar

INACAP tiene desactivado el consentimiento de usuario para *Microsoft Graph Command Line Tools*, así que **ningún script de PowerShell puede cargar el tablero**. Se probó con el permiso mínimo (`Tasks.ReadWrite`) y con código de dispositivo: siempre termina en «Need admin approval». El diagnóstico completo está en [../guia-cargar-planner.md](../guia-cargar-planner.md), y no conviene volver a intentarlo.

La carga va **a mano**, con [guia-planner-hector.pdf](guia-planner-hector.pdf): seis tandas, unas 2 h 30 en total, repartibles entre los dos. El contenido de cada tarjeta ya está escrito en [../plan-desarrollo.csv](../plan-desarrollo.csv) (87 tareas, ninguna bloqueada).

Y hay algo que **ningún script haría de todos modos**: la etiqueta del cuarto estado, **adjuntar cada artefacto a su tarea**, la captura y el enlace. El docente dijo que solo revisará el Planner, así que lo que no esté adjunto ahí no se evalúa. Es la tanda 6 de la guía.

### Los diagramas se hacen en PlantUML

La fuente es el `.puml` en [puml/](puml/); el PNG se genera desde él y nunca se edita a mano:

```powershell
cd frontend
npm run puml -- ../docs/entrega/puml --png
```

Sin `--png` no toca la red: el enlace al editor de plantuml.com se calcula localmente. El índice con los enlaces está en [puml/README.md](puml/README.md) y la convención —idioma, paleta, tipografía— en [puml/_estilo.md](puml/_estilo.md).

**No usar mermaid para estos diagramas.** Su `requirementDiagram` parte el texto cada 30 caracteres cortando palabras a la mitad, y sus `id` no admiten guiones sin comillas. Se probó y se rehizo.

### La coherencia entre artefactos se comprueba con script

La rúbrica evalúa la trazabilidad entre requerimientos, casos de uso, clases, entidades y pantallas como **criterio transversal**: un artefacto correcto pero incoherente con los demás pierde puntos en varios criterios a la vez. Revisarlo a ojo cada vez que algo cambia no escala.

```powershell
cd frontend
npm run verificar:entrega
```

**237 comprobaciones**, sin tocar la red: la trazabilidad RF ↔ CU en los dos sentidos, que los diagramas digan lo mismo que los documentos, los seis actores con su rol técnico, que cada caso de uso tenga una pantalla y que esa pantalla exista, y la convención de [puml/_estilo.md](puml/_estilo.md) en los treinta y dos diagramas (Arial, ningún rojo institucional, PNG generado, entrada en el índice). Además compara el diagrama de clases contra `schema.prisma` en los dos sentidos —ninguna clase inventada, ningún modelo sin dibujar— y **el DER contra las migraciones**: las 52 claves foráneas de [der.md §9](der.md), una por una, con su `ON DELETE`.

⚠ **Estas 237 no se suman a las 332 del software.** Son cosas distintas: las 332 comprueban que el sistema funciona; estas 237, que los artefactos de la entrega dicen lo mismo entre sí.

Los bloques de los criterios que faltan **se activan solos** cuando su artefacto existe, y no fallan mientras no exista. Sale con código 1 si algo se cae, así que sirve para CI cuando lo haya.

### Los PDF se generan del Markdown

```powershell
cd frontend
npm run pdf -- ../docs/entrega/<archivo>.md
```

Sale en Arial, que es lo que la norma gráfica municipal exige para documentos (ADR-010). El `.md` es la fuente: editar el PDF a mano lo desincroniza.

---

## Decisiones tomadas, para no rediscutirlas

| Decisión | Cuál | Dónde está el detalle |
|---|---|---|
| **D-1** | El DER y el script se entregan en **MySQL** traducidos desde el esquema real, declarando las equivalencias de tipos. No se migra el sistema, que corre en PostgreSQL. Es la consulta abierta nº 13 | [plan §2](../plan-entrega-15-septiembre.md) |
| **D-2** | Los 12 casos de uso salen de lo **construido**, no del catálogo completo de RF: cada uno debe tener su pantalla, o el mapa CU → mockup queda con huecos | [plan §2](../plan-entrega-15-septiembre.md) |
| **D-3** | Los **escenarios alternativos** (modales de error, avisos, estados vacíos) también son mockup, y se anclan al CU cuyo flujo alternativo representan | [plan §2](../plan-entrega-15-septiembre.md) |
| **Idioma** | Todo en español salvo los **estereotipos**, que conservan su nombre estándar de UML/SysML porque son notación, no texto, y así los muestra el documento del docente. Se probó traducirlos y se revirtió | [puml/_estilo.md](puml/_estilo.md) |
| **Alcance** | Los **7 RF pendientes** aparecen en el diagrama de requerimientos, con borde punteado. El diagrama dice qué necesita el sistema, no qué alcanzamos a construir | [requerimientos.md §13](requerimientos.md) |

---

## Lo que NO se toca en esta entrega

Para que nadie lo abra «ya que estamos»:

- **RF-025** ajustes, **RF-028** tablero personal, **RF-031** vista por cargos, **RF-033** exportación, **RF-035** comentarios, **RF-037** alertas.
- **Bloque D** (Jest, RTL, CI) y **Bloque E** (despliegue).
- Los cabos sueltos de prioridad Media listados en [../siguiente-sesion.md](../siguiente-sesion.md).
- **Las 14 consultas abiertas al docente**: no se responden por cuenta propia ([requerimientos-oficiales §10](../requerimientos-oficiales.md)).

---

## Archivos de esta carpeta

| Archivo | Qué es |
|---|---|
| [requerimientos.md](requerimientos.md) | **Criterio 2.** Los 38 RF y 18 RNF por módulo y épica, con actores y trazados a los CU |
| [casos-uso-general.md](casos-uso-general.md) | **Criterio 3.** La frontera, los seis actores, los doce casos con sus RF y su pantalla, y las nueve relaciones `«include»` y `«extend»` |
| [casos-uso-detalle.md](casos-uso-detalle.md) | **Criterio 4.** Las doce fichas de la rúbrica §5.4, cada una anclada al texto oficial de su RF, con su diagrama |
| [clases.md](clases.md) | **Criterio 5.** Las 22 clases del dominio y los 12 servicios, en 5 diagramas, con la tabla clase ↔ tabla ↔ caso de uso |
| [der.md](der.md) | **Criterio 6.** Las 22 tablas en MySQL, en 5 diagramas, con las 52 claves foráneas y su `ON DELETE`, las cardinalidades y las restricciones |
| [puml/](puml/) | Los `.puml` y sus PNG. La fuente de todo diagrama de la entrega |
| [guia-planner-hector.pdf](guia-planner-hector.pdf) | **Criterio 1.** Cómo cargar las 87 tareas a mano, en seis tandas |
| [guia-planner-hector.md](guia-planner-hector.md) | La fuente del PDF anterior. Se edita acá y se regenera |
| [planner-delta.md](planner-delta.md) | Qué se corrigió del plan viejo, y qué criterio cuelga de qué tarea |
