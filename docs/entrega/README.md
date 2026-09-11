# Entrega del 15 de septiembre — Análisis y Diseño

Los artefactos de la **primera evaluación** (100 puntos, ocho criterios). Este archivo es el estado: qué está listo, qué falta y dónde está cada cosa.

**Actualizado**: 11 de septiembre de 2026 · rama `entrega/analisis-diseno`

- El plan de trabajo está en [../plan-entrega-15-septiembre.md](../plan-entrega-15-septiembre.md).
- La rúbrica transcrita, en [../rubrica-entrega-15-septiembre.md](../rubrica-entrega-15-septiembre.md). Los dos PDF originales del docente están versionados en `docs/`.

---

## Estado por criterio

| # | Criterio | Pts | Estado | Artefacto |
|---|---|---|---|---|
| 1 | Planner | 15 | 🟠 **Preparado, falta cargarlo** | **El tablero y su captura** (van al [informe §10](informe.md)) · instructivo interno: [guia-planner-hector.pdf](guia-planner-hector.pdf) · [planner-delta.md](planner-delta.md) |
| 2 | Diagramas de requerimientos | 10 | ✅ **Hecho** | [requerimientos.md](requerimientos.md) · [puml/](puml/) |
| 3 | Caso de uso general | 10 | ✅ **Hecho** | [casos-uso-general.md](casos-uso-general.md) · [puml/09](puml/09-casos-uso-general.puml) y [puml/10](puml/10-casos-uso-extensiones.puml) |
| 4 | Casos de uso específicos + fichas | 20 | ✅ **Hecho** | [casos-uso-detalle.md](casos-uso-detalle.md) · [puml/11](puml/11-cu-01.puml) a [puml/22](puml/22-cu-12.puml) |
| 5 | Diagrama de clases | 15 | ✅ **Hecho** | [clases.md](clases.md) · [puml/23](puml/23-clases-panorama.puml) a [puml/27](puml/27-clases-servicios.puml) |
| 6 | DER MySQL | 10 | ✅ **Hecho** | [der.md](der.md) · [puml/28](puml/28-der-general.puml) a [puml/32](puml/32-der-plataforma.puml) |
| 7 | Script SQL | 10 | ✅ **Hecho** | [script-sql.md](script-sql.md) · [sgr-mysql.sql](sgr-mysql.sql) |
| 8 | Mockup funcional + Git | 10 | ✅ **Hecho** | [../mockups/](../mockups/) · mapa CU → mockup en [casos-uso-general.md §8.1](casos-uso-general.md) |
| — | Informe de la entrega | — | ✅ **Hecho** | [informe.md](informe.md) · [informe.pdf](informe.pdf) |

**100 de 100 puntos cubiertos, y el informe escrito.** Queda **cargar el Planner** (criterio 1), que es trabajo a mano, y la captura del tablero que va en el §10 del informe.

> 🔴 **Y queda una cosa que no es documentación: esta rama no está publicada en GitHub.** `origin` tiene `main` y dos ramas viejas; **`entrega/analisis-diseno` existe solo en el computador de trabajo**, y `main` no contiene `docs/entrega/` en absoluto. La rúbrica §2 exige «enlace del repositorio incorporado y acceso asegurado al docente», y el informe enlaza al repositorio: mientras la rama no se publique, **ese enlace no lleva a ninguno de estos artefactos**. Es el único punto de la entrega que puede costar puntos en todos los criterios a la vez.

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

### Cómo quedó el criterio 7 (cerrado el 10 de septiembre)

**Un script y un documento**: [sgr-mysql.sql](sgr-mysql.sql) y [script-sql.md](script-sql.md). 22 tablas, 52 claves foráneas, 8 enumerados, 11 `UNIQUE`, 5 `CHECK`, 3 disparadores y datos de prueba ficticios.

**Se ejecutó de verdad, en tres motores, y eso es lo que más cuesta y más vale.** La rúbrica §5.7 exige que el script corra sin errores de sintaxis ni de integridad referencial, así que se corrió entero en contenedores desechables de **MySQL 8.0.46**, **MariaDB 10.4.34** y **MariaDB 11.4.13**. Resultado idéntico en los tres: **cero errores**, 22 tablas, 52 FK (37 `CASCADE` / 7 `RESTRICT` / 8 `SET NULL`), 3 disparadores y 11 `UNIQUE`; y **reejecutable**, porque empieza con `DROP DATABASE IF EXISTS`. Además se probaron **trece sentencias que deben fallar** —los tres disparadores, los cinco `CHECK`, tres `RESTRICT`, la 1:1 y el RUT repetido— y las trece fallaron con el error correcto **en los tres motores**. La evidencia está en [script-sql.md §6](script-sql.md).

**Se probó en MariaDB porque XAMPP no trae MySQL, trae MariaDB**, y es lo más probable que tenga a mano quien revise. Corre sin cambiarle una línea; solo cambian el número de error de un `CHECK` (`4025` en vez de `3819`) y que MariaDB agrega tres `CHECK` propios, porque su tipo `JSON` es un `LONGTEXT` con `json_valid()` encima —más estricto, no menos.

- **Las FK conservan el nombre de Prisma** (`tabla_columna_fkey`). No es cosmético: es lo que deja seguir una restricción del script hasta la migración que la creó, y lo que hace comprobable la correspondencia.
- **Los `INSERT` no son decorativos: son la prueba de integridad referencial.** Recorren las 22 tablas y las 52 FK, así que un error de referencias hace fallar el bloque.
- **El verificador compara columna por columna**, en los dos sentidos, además de las tablas y las FK. Es lo que separa un script que «tiene las 22 tablas» de uno que describe el mismo modelo.

⚠ **Dos cosas que la ejecución real corrigió**, y que a ojo no se habrían visto:

1. **Los `UNIQUE` son 11, no 9.** El DER decía «nueve» contando filas de una tabla en vez de restricciones: `users` aporta dos (`email` y `rut`), y `atenciones_sociales` aporta la que hace la 1:1. Ya está corregido en [der.md §12.3](der.md).
2. **El disparador del código tenía que dejar pasar la anulación.** Se probó explícitamente: cambiar `actividades.codigo` falla, pero anular la actividad con motivo funciona. Un disparador que bloqueara todo `UPDATE` rompería RF-011 en vez de protegerlo.

**Requisito declarado: MySQL 8.0.16+ o MariaDB 10.2.3+.** Antes de esas versiones los `CHECK` se analizan y **se ignoran en silencio**, y acá sostienen el formato del RUT, la coherencia de las fechas del período y el rango del ponderador.

⚠ **Si se importa por phpMyAdmin en vez de por línea de comandos**, conviene comprobar que los tres disparadores se hayan creado: el manejo de `DELIMITER` depende de la versión. La consulta que lo verifica está en [script-sql.md §9](script-sql.md).

### Cómo quedó el criterio 8 (cerrado el 10 de septiembre)

**Diecisiete pantallas**, cada una en `.html` autocontenido y `.png`, en [../mockups/](../mockups/): las **ocho del camino feliz** que ya existían y **nueve escenarios alternativos** nuevos. El mapa CU → mockup —que es la casilla que la rúbrica busca— está en [casos-uso-general.md §8.1](casos-uso-general.md).

La exigencia que lo obliga es la [rúbrica §6](../rubrica-entrega-15-septiembre.md): «los mockups deben representar las pantallas necesarias para ejecutar los casos de uso **y también contemplar los escenarios alternativos modelados**». Los modelados son los tres `«include»` y los seis `«extend»` del §7 y §8.

**Lo que cambió en la herramienta** (`frontend/scripts/mockups.mjs`), y es el motivo de que esto sea demostrable y no decorativo:

- **Un hook `acciones({ page, api })`** que corre entre el `goto` y la captura. `page` es la pestaña real, así que el escenario se produce **operando la aplicación**: se escribe en el campo, se sale de él, se aprieta el botón. `api` es una **segunda sesión** contra el backend, que es lo que permite provocar un conflicto de versión de verdad —alguien más guardó primero, que es literalmente la condición de CU-E4—.
- **Un `foco`**, selector opcional que recorta el PNG a una franja de ancho completo alrededor del mensaje. Un aviso de campo obligatorio dentro de una ficha de 9.000 px es ilegible en GitHub, y el aviso *es* el entregable. El `.html` sigue completo.
- **Si el elemento de `foco` no aparece, el script revienta.** Un escenario que no se produjo y se guarda igual como página entera es un entregable que miente, y nadie lo notaría hasta la corrección.

**Dos de los nueve no tienen imagen, y las dos ausencias están argumentadas** en el mapa: CU-I2 porque el código único no es una pantalla sino un dato que ya se ve en `03-ficha`, y **CU-I3 porque la pantalla no existe** — es el desvío D-c, RF-036. Dibujarle un mockup habría hecho desaparecer del artefacto justo lo que falta construir.

⚠ **CU-E3 obligó a tocar el seed, y es el único cambio de código de producto de esta tanda.** La regla de segregación de funciones (RNF-005) era **incomprobable en la demostración**: las tres cuentas que validan no tienen cargo, así que ninguna de las 2.058 evidencias sembradas les pertenecía y el 403 no podía producirse. Se armó por el lado de **quién sube** la evidencia, no de quién registra la actividad: el coordinador carga la evidencia de una funcionaria —un flujo que la API ya admite, porque el nivel central puede editar cualquier actividad— y por eso no puede validarla. Cero filas nuevas: cambia un campo de una evidencia que ya existía. Es la misma clase de dato deliberado que **La Pampa sin medición** (ADR-014) y que **la funcionaria con metas y cero actividades** (ADR-015).

Y un cambio menor de interfaz que ese escenario dejó a la vista: **la bandeja no decía quién había subido la evidencia**. Sin ese dato, el 403 aparecía en pantalla sin nada que lo explicara —y, peor, un verificador no tenía cómo saber que la evidencia era suya—. Se agregó el campo «Subida por» al detalle.

**El verificador de la entrega crece a 311 comprobaciones** (eran 262). Las nuevas cierran el círculo en los dos sentidos: cada `«include»` y cada `«extend»` tiene su casilla en el mapa, cada casilla apunta a un PNG que existe **y que `mockups.mjs` genera**, y cada escenario que el script produce está en el mapa. Una casilla que nombra una imagen huérfana se cae sola en cuanto alguien vuelva a correr el generador.

### Cómo quedó el informe (cerrado el 10 de septiembre)

**[informe.md](informe.md), y su [PDF](informe.pdf) para adjuntar en Planner.** Es el documento paraguas: reúne los ocho criterios y, sobre todo, **las cuatro tablas de trazabilidad**, que es donde se juega el criterio transversal.

Las cuatro no se inventaron: se cruzaron desde los artefactos que ya existían —RF → CU desde [requerimientos.md §12](requerimientos.md), CU → mockup desde [casos-uso-general.md §6 y §8.1](casos-uso-general.md), y CU → clase y CU → tabla **invirtiendo** la tabla de [clases.md §10](clases.md), que está escrita al revés—.

Tres decisiones de contenido:

- **La tabla CU → clase lleva además el servicio**, y por eso se gana su lugar al lado de CU → tabla en vez de ser la misma tabla dos veces. La correspondencia clase ↔ tabla es 1:1 por construcción; lo que cambia entre las dos secciones es que una muestra **dónde vive el comportamiento** y la otra **dónde viven los datos**.
- **La columna de servicios sale del endpoint, no del archivo.** Un módulo de rutas atiende varios casos de uso —`actividades.routes.ts` sostiene CU-01, CU-02, CU-08 y CU-10—, así que atribuirle a cada caso todos los servicios que el archivo importa habría sobreestimado la dependencia. Se revisó línea por línea: CU-01 no usa `ServicioConcurrencia` porque el alta crea y no actualiza.
- **El informe dice lo que falta**, no solo lo que hay: los cuatro desvíos, los siete RF fuera de alcance y las catorce consultas abiertas tienen su sección. Un informe que presenta el código como si fuera el requisito vuelve invisible el incumplimiento, y el docente pidió explícitamente que las ambigüedades se documenten.

⚠ **Queda un hueco marcado a propósito**: la **captura del Planner** del §10. No se puede llenar hasta que el tablero esté cargado, y está señalado en el documento para que no pase inadvertido.

**El verificador sube a 343 comprobaciones** (eran 311). Las nuevas atan el informe a sus fuentes, que es su riesgo propio: copiar una tabla no deja rastro de su origen. Comprueban que los 38 RF del informe tracen **exactamente** a los mismos casos de uso que el criterio 2, que las tres tablas de casos cubran los doce, que **ninguna clase ni tabla nombrada exista solo en el informe**, que cada imagen enlazada exista y que los cuatro desvíos y la decisión D-1 sigan declarados.

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

**343 comprobaciones**, sin tocar la red: la trazabilidad RF ↔ CU en los dos sentidos, que los diagramas digan lo mismo que los documentos, los seis actores con su rol técnico, que cada caso de uso tenga una pantalla y que esa pantalla exista, **que cada escenario alternativo tenga su casilla en el mapa CU → mockup y que esa casilla apunte a un PNG que el generador produce**, y la convención de [puml/_estilo.md](puml/_estilo.md) en los treinta y dos diagramas (Arial, ningún rojo institucional, PNG generado, entrada en el índice). Además compara el diagrama de clases contra `schema.prisma` en los dos sentidos —ninguna clase inventada, ningún modelo sin dibujar—, **el DER contra las migraciones** —las 52 claves foráneas de [der.md §9](der.md), una por una, con su `ON DELETE`— y **el script SQL contra el esquema**: las 22 tablas, sus columnas una por una en los dos sentidos, las 52 FK, el orden de creación, los 3 disparadores y los 5 `CHECK`.

⚠ **Estas 343 no se suman a las 332 del software.** Son cosas distintas: las 332 comprueban que el sistema funciona; estas 343, que los artefactos de la entrega dicen lo mismo entre sí.

Los bloques de los criterios que faltan **se activan solos** cuando su artefacto existe, y no fallan mientras no exista. Sale con código 1 si algo se cae, así que sirve para CI cuando lo haya.

### Los PDF se generan del Markdown

**El `.md` es para GitHub y el PDF es para Planner**, y los dos salen de la misma fuente. En GitHub el Markdown se renderiza con sus tablas y sus diagramas; adjunto a una tarjeta de Planner se leería como texto plano. Por eso cada documento de criterio tiene su PDF, y **la lista de cuáles está en el script**, no en la memoria de nadie:

```powershell
cd frontend
npm run pdf:entrega                           # los 8 PDF de la entrega, a docs/entrega/
npm run pdf -- ../docs/entrega/<archivo>.md   # uno suelto
```

Dos cosas que el generador hace y conviene saber, porque cambian lo que ve quien abre el PDF:

- **Reescribe los enlaces relativos a URL absolutas de GitHub, apuntando a `main`.** Un `[texto](requerimientos.md)` funciona en GitHub y **no** en un PDF abierto en otro computador; el modo de fallar es traicionero, porque al autor le anda (el PDF está junto a los archivos que nombra). Apunta a `main` a propósito: un PDF se entrega, y sus enlaces tienen que seguir vivos cuando la rama en que se generó ya no exista. Para un documento de una rama sin mergear, `SGR_REPO_REF=<rama> npm run pdf:entrega`.
- **Recorta las capturas muy altas a su parte superior**, con el pie diciéndolo. La ficha del vecino mide 11.249 px: entera en una página se encoge a una tira de 115 px de ancho.

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
| [informe.md](informe.md) · [informe.pdf](informe.pdf) | **El informe.** El documento paraguas: el caso, los ocho criterios, **las cuatro tablas de trazabilidad**, las decisiones, los desvíos y las consultas abiertas |
| `*.pdf` | **Lo que se adjunta al Planner.** Un PDF por documento de criterio, más el informe y el del mockup. Se regeneran todos con `npm run pdf:entrega` |
| [requerimientos.md](requerimientos.md) | **Criterio 2.** Los 38 RF y 18 RNF por módulo y épica, con actores y trazados a los CU |
| [casos-uso-general.md](casos-uso-general.md) | **Criterio 3.** La frontera, los seis actores, los doce casos con sus RF y su pantalla, y las nueve relaciones `«include»` y `«extend»` |
| [casos-uso-detalle.md](casos-uso-detalle.md) | **Criterio 4.** Las doce fichas de la rúbrica §5.4, cada una anclada al texto oficial de su RF, con su diagrama |
| [clases.md](clases.md) | **Criterio 5.** Las 22 clases del dominio y los 12 servicios, en 5 diagramas, con la tabla clase ↔ tabla ↔ caso de uso |
| [der.md](der.md) | **Criterio 6.** Las 22 tablas en MySQL, en 5 diagramas, con las 52 claves foráneas y su `ON DELETE`, las cardinalidades y las restricciones |
| [script-sql.md](script-sql.md) | **Criterio 7.** Cómo está armado el script, la traducción a MySQL y la evidencia de que se ejecuta |
| [sgr-mysql.sql](sgr-mysql.sql) | **Criterio 7.** El script en sí: 22 tablas, 52 FK, 3 disparadores y datos de prueba ficticios |
| [puml/](puml/) | Los `.puml` y sus PNG. La fuente de todo diagrama de la entrega |
| [guia-planner-hector.pdf](guia-planner-hector.pdf) | **Interno, no se entrega.** Cómo cargar las 87 tareas a mano, en seis tandas. La evidencia del criterio 1 es el tablero y su captura |
| [guia-planner-hector.md](guia-planner-hector.md) | La fuente del PDF anterior. Se edita acá y se regenera |
| [planner-delta.md](planner-delta.md) | Qué se corrigió del plan viejo, y qué criterio cuelga de qué tarea |
