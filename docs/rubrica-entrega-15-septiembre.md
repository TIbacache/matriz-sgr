# Rúbrica oficial de la primera evaluación — Análisis y Diseño

**Fuente**: `Entrega_15_Septiembre_Semana_Analisis_Diseno_Rubrica.pdf` y `Relación entre los artefactos.pdf`, entregados por el profesor Jorge Cortés.
**Transcrito el 6 de septiembre de 2026.** Los PDF originales llegaron por chat y **no estaban en el repositorio**: si los tienes, guárdalos en `docs/` junto a este archivo. Mientras tanto, esto es lo que manda.

> ⚠ Esto es una transcripción de lo que exige la evaluación, no una interpretación del equipo. Donde el equipo decidió algo, se dice y se remite a [plan-entrega-15-septiembre.md](plan-entrega-15-septiembre.md).

---

## 1. Objetivo y criterio transversal

> «Consolidar el análisis y diseño técnico de la solución antes de avanzar a etapas de integración y desarrollo completo.»

**Criterio transversal de coherencia** (está en un recuadro destacado del PDF):

> «Los artefactos no deben presentarse como piezas aisladas. Debe existir trazabilidad entre requerimientos, casos de uso, clases, entidades de base de datos y pantallas del mockup, cuando corresponda.»

Es el criterio que atraviesa toda la rúbrica: un diagrama correcto pero incoherente con los demás pierde puntos en varios criterios a la vez.

## 2. Condiciones generales

- **Formato del informe**: formato institucional, ordenado por secciones.
- **Repositorio Git**: enlace incorporado y **acceso asegurado al docente**. Debe contener el mockup funcional y, de ser posible, los archivos editables de los diagramas.
- **Legibilidad**: resolución suficiente para leer actores, relaciones, atributos, claves y cardinalidades.
- **Identificación**: códigos consistentes — `RF-01`, `RNF-01`, `CU-01`…
- **Evidencias**: capturas del Planner/Jira y del mockup, más los enlaces.
- **Consistencia**: nombres de módulos, entidades, actores y funciones homogéneos **en todos los artefactos**.

## 3. Alcance del mockup

> «El prototipo se evaluará por navegación, fluidez de interfaces, distribución de elementos, validación de campos y uso apropiado de librerías externas. **No se exige integración con base de datos ni consumo de API para esta entrega.**»

Nuestro mockup excede lo pedido (es la aplicación real). Eso no da puntos extra, pero tampoco resta: lo que se evalúa es lo de arriba.

---

## 4. Los ocho criterios y su puntaje

| Criterio | Pts | Qué evidencia se evalúa |
|---|---|---|
| Planner / Jira | **15** | Backlog, épicas/tareas, responsables, estados, prioridad, hitos y captura del tablero |
| Diagramas de requerimientos | **10** | RF/RNF identificados, relación con actores y módulos, trazabilidad hacia funcionalidades |
| Caso de uso general | **10** | Actores, frontera del sistema, casos principales y relaciones UML |
| Casos de uso específicos + especificaciones | **20** | **Mínimo 10**, con diagrama y ficha: flujos, pre/postcondiciones, excepciones y trazabilidad |
| Diagrama de clases | **15** | Clases, atributos, métodos, relaciones, multiplicidades y coherencia con las funcionalidades |
| DER MySQL | **10** | Entidades, PK, FK, cardinalidades, campos y coherencia relacional |
| Script SQL | **10** | `.sql` ejecutable, tablas, PK/FK, tipos, restricciones y consistencia con el DER |
| Mockup funcional + Git | **10** | Navegación, fluidez, distribución visual, validaciones, librerías, código versionado y README |
| **Total** | **100** | |

### Condición mínima explícita

> «Se exigen al menos 10 casos de uso específicos. **Si se presentan menos de 10, el criterio correspondiente quedará en nivel "Insuficiente", con un máximo de 7/20 puntos.**»

### Validación de consistencia explícita

> «Toda FK representada en el DER debe existir en el script SQL. Del mismo modo, las tablas creadas en el script deben corresponder al modelo presentado en el informe.»

---

## 5. Qué pide cada entregable, en detalle

### 5.1 Planner / Jira (15 pts)

- Backlog organizado y priorizado.
- Épicas y/o módulos principales.
- Historias de usuario, tareas o actividades asociadas a cada épica.
- **Responsables asignados** por tarea o historia.
- Estados claramente diferenciados: *Por hacer, En desarrollo, En revisión, Finalizado*.
- Fechas, hitos o sprints.
- Prioridad y dependencias relevantes.
- **Captura del tablero y enlace directo.**

### 5.2 Diagramas de requerimientos (10 pts)

- RF y RNF con **códigos únicos**.
- Requerimientos relacionados con **actores, módulos o procesos**.
- Dependencias, agrupaciones o relaciones entre requisitos.
- **Concordancia con el caso de uso general y con los específicos.**
- Sin requisitos ambiguos: cada uno debe ser una necesidad verificable.

El PDF muestra una tabla de ejemplo con columnas: `ID | Requerimiento | Actor | Módulo | Trazabilidad`.

Y el documento de artefactos muestra la notación esperada: bloques `«requirement»` con `Id` y `Text`, unidos por `«refine»` y `«deriveReqt»`, donde una épica se descompone en requisitos más específicos.

### 5.3 Caso de uso general (10 pts)

- **Frontera del sistema** claramente identificada.
- Actores principales y secundarios correctamente nombrados.
- Casos de uso principales, **sin detallar flujos internos**.
- Relaciones actor–caso de uso y uso adecuado de «include», «extend» o generalización.
- Correspondencia con los RF definidos.

### 5.4 Casos de uso específicos (20 pts) — ficha mínima obligatoria

Cada caso necesita **su diagrama** y **su ficha textual completa**:

| Campo | Contenido requerido |
|---|---|
| ID | `CU-01` |
| Nombre | Nombre funcional del caso de uso |
| Objetivo | Resultado que debe lograr el usuario o sistema |
| Actor principal | Quien inicia o ejecuta el caso |
| Actores secundarios | Actores o sistemas de apoyo, si aplica |
| Precondiciones | Condiciones previas |
| Disparador | Evento que inicia el caso |
| Flujo principal | Secuencia normal de pasos **numerados** |
| Flujos alternativos | Variantes válidas del flujo principal |
| Excepciones | Errores o condiciones que impiden completarlo |
| Postcondiciones | Estado esperado al finalizar |
| Reglas / requisitos relacionados | RF, RNF o reglas de negocio vinculadas |

Para los casos de **extensión**, el ejemplo del docente usa una ficha más corta: `ID | Nombre | Tipo | Caso base | Condición | Resultado`.

### 5.5 Diagrama de clases (15 pts)

- Clases del dominio y/o componentes relevantes.
- Atributos significativos **con tipo de dato**.
- **Métodos u operaciones** relacionados con las responsabilidades de la clase.
- **Visibilidad** (+, -, #) cuando se use UML formal.
- Asociaciones **con multiplicidades**.
- Herencia, composición o agregación **solo cuando haya justificación**.
- Nombres coherentes con los casos de uso y con el modelo de datos.

### 5.6 DER MySQL (10 pts)

- Entidades correctamente nombradas.
- **PK** en cada tabla que lo requiera.
- **FK** y relaciones.
- Cardinalidades **1:1, 1:N y N:M** representadas correctamente.
- **Tablas asociativas** para resolver N:M cuando corresponda.
- Campos y **tipos compatibles con MySQL**.
- Restricciones básicas, sin redundancias innecesarias.

### 5.7 Script SQL (10 pts)

- Creación de la base o selección explícita del esquema.
- `CREATE TABLE` **ordenadas correctamente** (dependencias de FK).
- PK y FK definidas.
- Tipos apropiados.
- `NOT NULL`, `UNIQUE`, `DEFAULT` y demás restricciones cuando corresponda.
- Índices adicionales si el diseño los justifica.
- `INSERT` de prueba **opcionales pero recomendados**.
- **Debe ejecutarse sin errores de sintaxis ni de integridad referencial.**

### 5.8 Mockup funcional + Git (10 pts)

- Navegación funcional entre pantallas.
- Flujo de interfaz comprensible y consistente.
- Distribución adecuada de elementos y formularios.
- **Validación de campos obligatorios, formatos y mensajes básicos.**
- Uso de librerías externas cuando aporten.
- Código organizado y versionado.
- **README con descripción, tecnologías e instrucciones para ejecutar el mockup.**
- Enlace del repositorio en el informe.

---

## 6. La cadena de artefactos que espera el docente

Del documento «Relación entre los artefactos»:

> «El diagrama de requerimientos identifica **qué necesita** el sistema; el caso de uso general muestra las **funcionalidades principales**; el caso de uso detallado describe cada funcionalidad **paso a paso**; y el cuadro de descripción **documenta formalmente** esos detalles en una plantilla estructurada.»

```
Requerimientos → Casos de Uso → Casos de Uso Detallados → Cuadros de Descripción → Mockups / Prototipos
```

Y cierra con la exigencia que más nos afecta:

> «Los mockups deben representar las pantallas necesarias para ejecutar los casos de uso del diagrama **y también contemplar los escenarios alternativos modelados**.»

Su mapa de trazabilidad de ejemplo emparejaba cada caso con su pantalla **o con su modal**: «Modal de error», «Modal de advertencia», «Mensajes de campos obligatorios», «Mensaje de búsqueda sin resultados». Por eso el plan de la entrega trata los escenarios alternativos como parte del mockup y no como un extra (decisión D-3).

---

## 7. Lo que esta rúbrica cambia respecto de lo que creíamos

| Creíamos | Dice la rúbrica |
|---|---|
| «Mockups, MER, modelo de datos, diagrama de clases, UML, historias y 10 casos de uso» | Ocho criterios con puntaje, y **el DER y el script se piden en MySQL** |
| El mockup es el entregable fuerte | Vale **10 de 100**. Los artefactos de análisis valen 85 |
| Diez casos de uso | Diez es el **mínimo para no caer en Insuficiente**, y hay que traer diagrama **y** ficha completa de cada uno |
| Las historias de usuario son un entregable aparte | Van dentro del criterio **Planner** (15 pts), con responsable y estado |
| Basta con el camino feliz en las pantallas | Los **escenarios alternativos** también deben estar representados |
