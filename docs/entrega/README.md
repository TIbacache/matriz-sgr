# Entrega del 15 de septiembre — Análisis y Diseño

Los artefactos de la **primera evaluación** (100 puntos, ocho criterios). Este archivo es el estado: qué está listo, qué falta y dónde está cada cosa.

**Actualizado**: 9 de septiembre de 2026 · rama `entrega/analisis-diseno`

- El plan de trabajo está en [../plan-entrega-15-septiembre.md](../plan-entrega-15-septiembre.md).
- La rúbrica transcrita, en [../rubrica-entrega-15-septiembre.md](../rubrica-entrega-15-septiembre.md). Los dos PDF originales del docente están versionados en `docs/`.

---

## Estado por criterio

| # | Criterio | Pts | Estado | Artefacto |
|---|---|---|---|---|
| 1 | Planner | 15 | 🟠 **Preparado, falta cargarlo** | [guia-planner-hector.pdf](guia-planner-hector.pdf) · [planner-delta.md](planner-delta.md) |
| 2 | Diagramas de requerimientos | 10 | ✅ **Hecho** | [requerimientos.md](requerimientos.md) · [puml/](puml/) |
| 3 | Caso de uso general | 10 | 🟠 **Empezado** | [puml/09-casos-uso-general.puml](puml/09-casos-uso-general.puml) |
| 4 | Casos de uso específicos + fichas | 20 | 🔴 Pendiente | — |
| 5 | Diagrama de clases | 15 | 🔴 Pendiente | — |
| 6 | DER MySQL | 10 | 🔴 Pendiente | — |
| 7 | Script SQL | 10 | 🔴 Pendiente | — |
| 8 | Mockup funcional + Git | 10 | 🟢 Hecho, faltan escenarios alternativos | [../mockups/](../mockups/) |
| — | Informe de la entrega | — | 🔴 Pendiente | — |

**25 de 100 puntos cubiertos.** El criterio 4 es el más caro y el más vacío.

### Dónde quedó el criterio 3 (para retomar)

El **diagrama general está listo y revisado**: [puml/09-casos-uso-general.puml](puml/09-casos-uso-general.puml). Cumple los cinco puntos que la rúbrica pide en su §5.3 — frontera explícita, los seis actores del PDF §3 con su nombre, los doce casos sin flujos internos, las relaciones actor–caso de uso y los `«include»`.

Se rehizo tres veces, y las dos correcciones vale la pena no repetirlas:

- **Los casos van agrupados por los mismos cinco módulos (M1 a M5) del diagrama de requerimientos.** Sin agrupar, los doce quedaban en una columna y el dibujo se leía como una lista. Agrupados, además, la correspondencia entre artefactos queda a la vista, que es el criterio transversal de la rúbrica.
- **Los seis actores van todos a la izquierda.** Se probó repartirlos a ambos lados de la frontera y PlantUML mandó tres al fondo, con flechas cruzando el diagrama entero.

Falta:

1. Un **segundo diagrama con los seis `«extend»`** (CU-E1 a CU-E6), definidos en el [plan §4](../plan-entrega-15-septiembre.md). Van aparte porque son caminos condicionales y de excepción: sumarlos al general lo llena de ramas que solo ocurren a veces. Los `«include»` sí están en el general, porque son comportamiento compartido y ahí se ve la reutilización.
2. El documento **`casos-uso-general.md`** que los envuelve, con la tabla actor ↔ caso de uso y la correspondencia con los RF.

⚠ **Decisión pendiente de confirmar**: *no* se dibuja generalización entre actores. Los seis roles no forman una jerarquía sino conjuntos que se solapan (el Verificador valida pero no ve el tubo; el Coordinador ve el panel de actividad y el Administrador también). Dibujar una herencia afirmaría algo que el código no cumple. La rúbrica pide «include», «extend» **o** generalización, y las dos primeras están cubiertas.

**CU-I3 (auditar) no se dibuja en el general**: lo incluyen las diez operaciones que escriben, más CU-11 y CU-12, que se auditan aunque solo consulten. Diez flechas al mismo óvalo dirían menos que la nota que lleva el diagrama. Va en el diagrama de cada caso de uso, en el criterio 4.

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
- **Las 13 consultas abiertas al docente**: no se responden por cuenta propia ([requerimientos-oficiales §10](../requerimientos-oficiales.md)).

---

## Archivos de esta carpeta

| Archivo | Qué es |
|---|---|
| [requerimientos.md](requerimientos.md) | **Criterio 2.** Los 38 RF y 18 RNF por módulo y épica, con actores y trazados a los CU |
| [puml/](puml/) | Los `.puml` y sus PNG. La fuente de todo diagrama de la entrega |
| [guia-planner-hector.pdf](guia-planner-hector.pdf) | **Criterio 1.** Cómo cargar las 87 tareas a mano, en seis tandas |
| [guia-planner-hector.md](guia-planner-hector.md) | La fuente del PDF anterior. Se edita acá y se regenera |
| [planner-delta.md](planner-delta.md) | Qué se corrigió del plan viejo, y qué criterio cuelga de qué tarea |
