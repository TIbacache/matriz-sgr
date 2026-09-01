# Estructura real de la planilla SGR

**Fuente**: capturas de pantalla de la planilla Google Sheets en producción, incluidas en `PRESENTACIÓN MATRIZ REGIMIENTORESULTADO (1).pptx` (diapositivas 5 a 19). Extraídas y leídas el 31-08-2026.

> Esto **desbloquea** el pendiente "parametrización de columnas" que arrastrábamos desde la Fase 1. Ya no hace falta pedirlo al cliente: está en las capturas del PPT que enviaron los profesores.

---

## 1. Pestañas del libro de una delegación (diapositiva 5)

`RURAL` · `TUBO` · `T OC` · `G. SOCIAL` · `AP ADM` · `SUP DISERCO` · `COOR DISERCO` · `PROY COM` · `PLAN y CON` · `G. SEG` · `RECLAMOS` · `SEMAFORO` · 🔒`RESUMEN`

- La 1ª pestaña es la **delegación** (aquí "RURAL"); la 2ª es el **TUBO** (agenda colectiva); luego **una pestaña por cargo**; después **RECLAMOS**, **SEMAFORO** y **RESUMEN** (esta última con candado = solo el coordinador).
- Otra delegación (diapositiva 8) muestra `GES SOC 1`, `GES SOC 2`, `GES SOC 3`, `COOR DISERCO`, `PLAN y…` → **la cantidad de pestañas por cargo varía según la dotación de cada delegación**.

## 2. Pestaña personal — bloque de medición (diapositiva 6)

Encabezado: `ORG COM | CATHERINE CONTRERAS | TERRITORIAL OO.CC. | (Cumplimiento Mínimo 80%)`
→ área, nombre del funcionario, cargo y el umbral mínimo visible en pantalla.

| ITEM | PONDERADOR | META TRIMESTRE | AVANCE ACTUAL | % DE CUMPLIMIENTO | CUMPLIMIENTO PONDERADO |
|---|---|---|---|---|---|
| Atención de usuario teléfono y presencial | 10% | 45 | 11 | 24% | 2,4% |
| Visitas, reuniones con organizaciones | 15% | 24 | 3 | 13% | 1,9% |
| Conformación de directivas definitiva | 25% | 2 | 0 | 0% | 0,0% |
| Gestión de talleres y actividades | 15% | 24 | 6 | 25% | 3,8% |
| Emergencia | 5% | 8 | 8 | 100% | 5,0% |
| Soluciones al ingreso al tubo | 30% | 80% | 100,00% | 125% | 37,5% |
| **CUMPLIMIENTO TOTAL PONDERADO** | **100%** | 95 | 28 | | **50,6%** |
| Felicitaciones **MAX 3** | 10% | 3 | 0 | 0 | 0% |
| Reclamos | **−20%** | 0 | 0 | 0% | 0% |
| **CUMPLIMIENTO TOTAL PONDERADO** | | | | | **50,6%** |

**Hallazgos:**
1. Los ponderadores de los ítems suman exactamente **100%** (10+15+25+15+5+30). Coincide con RN-001.
2. **Felicitaciones y reclamos van FUERA del 100%**, como filas de ajuste bajo el total: felicitación **+10% con tope de 3** por período (⚠ el audio decía "1 mensual"; la planilla dice MAX 3 — prevalece la planilla), reclamo **−20%**.
3. **Emergencia es un ítem más, con ponderador 5%** ✔ (coincide con la reunión).
4. **"Soluciones al ingreso al tubo" es un ítem PORCENTUAL**: meta 80%, avance 100%, cumplimiento 125%. No es un conteo → el sistema necesita **tipo de ítem** (cantidad vs porcentaje).

## 3. Pestaña personal — registro de actividades (diapositivas 6 y 7)

| Nº | FECHA | ACTIVIDAD/SOLICITUD/PROBLEMA | ACCIÓN | (NOMBRE DE) CONTACTO | FONO | INGRESO A TUBO | ITEM | CÓDIGO (FOTO/NUEVO) | IMAGEN VERIF | verificador válido | resultado |
|---|---|---|---|---|---|---|---|---|---|---|---|

- `INGRESO A TUBO`: SI/NO → enlaza la actividad con la agenda colectiva (RF-009).
- `ITEM`: desplegable con los ítems del cargo → así la actividad suma al ítem correcto.
- `IMAGEN VERIF`: SI/NO.
- `verificador válido` y `resultado`: **1/0**. Es el "punto" que otorga el supervisor. Con `resultado = 1` la actividad suma al avance (RN-009, RF-014).

## 4. Pestaña del área SOCIAL — hasta 3 gestiones (diapositiva 8)

| Nº | FECHA INGRESO | TIPO ATENCIÓN | SUB ATENCIÓN | USUARIO | RUT | TELÉFONO | REQUIERE VISITA | INGRESO AL TUBO | PRIMERA GESTIÓN | FECHA PROGRAMADA A VISITA | Observación | SEGUNDA GESTIÓN | FECHA DE VISITA | FECHA ENTREGA INFORME | TERCERA GESTIÓN | FECHA ENTREGA BENEFICIO | CÓDIGO | IMAGEN VERIF | verificador válido | resultado |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

Confirma RF-015, RN-012 y CA-04 (tres gestiones para el mismo usuario, con fechas diferenciadas).

### Catálogos reales (desplegables)

- **TIPO ATENCIÓN**: Informes sociales · Gestión de subsidios · Derivación · Otras gestiones sociales · Entrega emergencia · Otros
- **SUB ATENCIÓN**: Informe aporte económico · Informe aporte material · Informe institución · Exención pago aseo domiciliario · Orientación social · IPS · PGU · SAP · SUF · Otros · Acta de entrega
- **1ª GESTIÓN**: Atención social a usuario presencial · Entrega informe · Visita terreno · Emergencia · Otras gestiones
- **2ª GESTIÓN**: Entrega beneficio · Entrega informe · Visita terreno · Emergencia · Otros
- **3ª GESTIÓN**: Entrega beneficio · Entrega informe · Emergencia · Otros

**RUT tal como se ve en la planilla**: `17,721,947-9`, `9,949,583-9`, `18,751,581-5`, `4,655,666-6`, `10,880,910-8`. Las comas son formato numérico de Google Sheets: el dato real es `17.721.947-9`. Hay datos sucios reales (`216944` como teléfono, `No tiene`) → la validación de entrada es indispensable (RF-010, RNF-007).

## 5. Códigos verificadores (diapositivas 9 y 10)

Códigos observados: `ORC711`, `ORC722`, `COM1761`, `COM1762`, `COM1773`, `COM1787`, `SOC763`, `SOC764`, `SOC775`, `SOC71310`, `COS724`, `COS7711`, `COS7814`.

**Patrón deducido**: `PREFIJO_ÁREA + MES + DÍA + CORRELATIVO` (ej. `SOC` + `7` + `13` + `10` = `SOC71310`).

Archivos en Drive, en carpetas **por delegación** (`VERIFICADOR COMPAÑIAS`, `VERIFICADOR AV MAR`, `VERIFICADOR RURAL`, `VERIFICADOR CENTRO`, `VERIFICADORES PAMPA`, propietario Juan Francisco Labra Lobos): `COS724REV.jpeg`, `COS7711REV.jpeg`, `COS7814REV.jpeg`.

⚠ **El sufijo `REV` en el nombre del archivo marca "revisado"**. Y el patrón de código es **ambiguo** (`COS7711` puede leerse mes 7/día 7/corr 11 o mes 7/día 71/corr 1). Ver la decisión [ADR-004](decisiones-tecnicas.md) sobre cómo lo resolvemos sin perder legibilidad.

## 6. Tubo de trabajo (diapositiva 13)

| Nº | FECHA SOLICITUD | ACTIVIDAD/SOLICITUD/PROBLEMA | INT/EXT | SOLICITANTE | TERRITORIO | RESPONSABLE | FECHA DE COMPROMISO | MES | ÁREA/PERSONA APOYO | AVANCE, OBSERVACIONES | ESTATUS | UNIDAD |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

- `INT/EXT` confirmado como campo (interés interno o externo).
- `TERRITORIO`: desplegable con sectores (Latorre, Toqui, Zorrilla…).
- `ESTATUS`: Pendiente · En proceso · Realizado (+ **Ingresado** según RF-018).
- El trabajo hecho se **tacha**; lo urgente/vencido se pinta en rojo.
- `ÁREA/PERSONA APOYO`: el área municipal de respaldo (Tránsito, DISERCO, Alumbrado Público, Área Mujeres, Sección Aseo…).

### Resumen colectivo del tubo (diapositiva 14)

| Colaborador | INGRESADO | PENDIENTE | EN PROCESO | REALIZADO | % REALIZADO |
|---|---|---|---|---|---|
| Alberto Barrientos | 6 | 2 | 2 | 2 | 33,33% |
| Patricia Jimenez Rojas | 4 | 0 | 0 | 4 | 100,00% |
| Victoria Castillo (CAM) | 12 | 1 | 10 | 1 | 8,33% |
| **TOTALES** | **45** | 5 | 20 | 20 | **44,44%** |

**INGRESADO = total** (5+20+20 = 45). `% REALIZADO = REALIZADO / INGRESADO`. Ese porcentaje alimenta el ítem "Soluciones al ingreso al tubo" de la pestaña personal.

## 7. Pestaña SEMÁFORO (diapositivas 15 a 17) — la fórmula, con datos reales

| ÁREA | RESPONSABLE | OBJETIVO AL DÍA DE HOY | 60% | AVANCE | 🚦 |
|---|---|---|---|---|---|
| Gestor Social 1 | Devora Cortes | 50,55% | 30,3% | 116,9% | 🟢 |
| Gestor Social 4 | Patricia Jimenez Rojas | 50,55% | 30,3% | 93,6% | 🟢 |
| Gestor Social 3 | | 50,55% | 30,3% | 57,2% | 🟢 |
| Gestor Social 2 | Marite Veliz | 50,55% | 30,3% | 56,1% | 🟢 |
| Planificación y Gestión | Erika Miles | 50,55% | 30,3% | 49,4% | 🟠 |
| Coor Serv. Comu | Alberto Barrientos | 50,55% | 30,3% | 17,5% | 🔴 |
| Apoyo Administrativo | Alejandro Vega | 50,55% | 30,3% | 46,1% | 🟠 |
| Gestor Social 5 | Fernanda Lamas | 50,55% | 30,3% | 37,1% | 🟠 |
| Territorial OO.CC. 3 | Victoria Castillo (CAM) | 50,55% | 30,3% | 21,9% | 🔴 |
| Territorial OO.CC. 2 | Katherine Bozzo | **39,56%** | **23,7%** | 15,5% | 🔴 |
| Territorial OO.CC. 1 | Luis Bolados | 50,55% | 30,3% | 18,0% | 🔴 |
| Territorial OO.CC. 4 | Daniela Rodríguez | 50,55% | 30,3% | 7,1% | 🔴 |
| **PROMEDIO** | | 50,55% | 30,33% | **44,70%** | 🟠 |

**La regla queda demostrada con datos** (y coincide con RN-008 del PDF):
```
verde   : avance >= objetivo_al_dia
naranjo : avance >= objetivo_al_dia × 0,60  y  avance < objetivo_al_dia
rojo    : avance <  objetivo_al_dia × 0,60
```
La columna "60%" es literalmente `objetivo_al_dia × 0,6` (50,55 × 0,6 = 30,33 ✓ · 39,56 × 0,6 = 23,7 ✓).

**El objetivo al día es POR PERSONA**: Katherine Bozzo tiene 39,56% mientras el resto tiene 50,55% → sus días computables son menores (licencia/vacaciones/compensatorios). Confirma el descuento por asistencia.

### Cuadro del período (diapositivas 17 y 19)

| Campo | Valor |
|---|---|
| Fecha inicio | 1/07/2026 |
| Fecha término | 30/09/2026 |
| Días totales | **91** |
| Día actual (26 ago 2026) | 56 |
| Días al cierre | 35 |
| Porcentaje diario | **1,10%** (= 100 / 91) |
| Meta según avance del día | 61,54% (= 56 × 1,10) |

⚠ El período **se configura con fechas y el sistema calcula los días** — nunca 90 fijos (línea base académica §13.1 del PDF; aquí son 91).

**Discrepancia observada**: el cuadro global marca 61,54% para 56 días, pero la tabla usa 50,55% por persona (≈ 46 días computables). Es coherente con el descuento individual de días no trabajados. → Confirmar con el docente la fórmula exacta de días computables por persona.

## 8. Resumen de delegación (diapositiva 18)

| ÁREA | RESPONSABLE | AVANCE | 🚦 | último ingreso | días desde último ingreso | Nº INGRESOS | INGRESOS DIARIOS |
|---|---|---|---|---|---|---|---|
| Gestor Social 1 | Araceli Hernández | 126,7% | 🟢 | 26/08/2026 | 0 | 426 | 7,61 |
| Gestor Social 3 | Sofía Velasquez | 109,3% | 🟢 | 26/08/2026 | 0 | 317 | 5,66 |
| Prof. Planif. y Control | María Ángeles González | 95,7% | 🟢 | 26/08/2026 | 0 | 160 | 2,86 |
| Territorial OO.CC. 1 | Gloria Araya | 64,8% | 🟢 | 26/08/2026 | 0 | 88 | 1,57 |
| Gestor Social 2 | Ximena Pía Ibaceta | 64,5% | 🟢 | 26/08/2026 | 0 | 404 | 7,21 |
| Coordinador DISERCO | Reinaldo Soto | 61,0% | 🟢 | 26/08/2026 | 0 | 147 | 2,63 |
| Apoyo Administrativo | Patricia Rojas | 27,4% | 🟠 | 26/08/2026 | 0 | 100 | 1,79 |
| **DELEGACIÓN** | | **78,50%** (meta 50,60%) | 🟢 | | | **1.642** | **29,32** |

Confirma RF-030 / HU-19 (último ingreso, días sin ingreso, cantidad y promedio diario).

📊 **Dato de dimensionamiento**: **1.642 registros por delegación y trimestre**; con 6 delegaciones ≈ **10.000 actividades por trimestre**, ~40.000 al año. El rendimiento exigido (RNF-002: 2 s en registro, 5 s en tableros) debe probarse contra ese volumen, no contra el seed actual.

## 9. Ponderación consolidada por cargo (diapositiva 19)

Delegación Compañías, ítems reales agrupados por cargo (ponderador · meta · avance · % · ponderado):

- **APOYO ADM**: Atención de usuario 6%·240·213·89%·5,3% · Llamadas preventivas a usuarios 5%·90·0·0% · Informe de inventarios 3%·1·1·100%·3,0% · Informe a comunicaciones 5%·12·2·17%·0,8%
- **TERRITORIAL OO.CC.**: Atención de usuario 5%·240·47·20% · Visitas y reuniones con organizaciones 4%·96·25·26% · Conformación de directivas 5%·13·7·54%·2,7% · Gestión de talleres 5%·24·2,58·11%
- **COSERCO**: Informes 3%·15·1·7% · Operativos 4%·36·8·22% · Talleres 4%·12·0·0% · Terreno 4%·24·0·0% · Atención requerimiento usuario 5%·24·3·13%
- **SOCIAL**: Atención social presencial 5%·360·411·**114%**·5,7% · Visita social en terreno 5%·48·74·**154%**·7,7% · Entrega informe 4%·120·56·47% · Entrega beneficio 4%·32·66·**206%**·8,3%
- **PLANIFICACIÓN Y CONTROL**: Reunión semanal con el equipo 4%·12·2·17% · Solución de problemas a usuarios 4%·8·6·75%·3,0% · Soluciones de ingresos al tubo 5%·80%·49%·61% · **Pendientes en tubo menor a 10%** 5%·10%·11%·**50%** · Emergencia 5%·276·276·100%·5,0%
- **CUMPLIMIENTO TOTAL PONDERADO: 100% → 53,88%**

**Dos hallazgos críticos:**
1. El encabezado dice "% DE CUMPLIMIENTO **MAX 150%**", pero hay valores de **154%** y **206%** sin recortar: en la planilla el tope **está declarado pero no aplicado**. Por eso el PDF (RN-005) pide que sea **parámetro configurable**, no una constante.
2. **"Pendientes en tubo menor a 10%" es un ítem INVERSO**: meta 10% (máximo tolerado), avance 11% → 50% de cumplimiento. No es `avance/meta`. El sistema necesita **dirección del ítem** (mayor es mejor / menor es mejor), tal como anticipa RN-002.

## 10. Dotación real de una delegación (Compañías)

Delegado · Apoyo Administrativo (Evelin Rubio Suárez) · Territorial OO.CC. 1 a 4 (Luis Bolados, Katherine Bozzo, Victoria Castillo, Daniela Rodríguez) · Gestor Social 1 a 5 (Devora Cortes, Marite Veliz, —, Patricia Jimenez Rojas, Fernanda Lamas) · Prof. Planif. y Control (Erika Miles) · Coordinador DISERCO (Alberto Barrientos).

→ **Los cargos se numeran** (Territorial 1..4, Gestor Social 1..5) y **puede haber cargos vacantes**. El modelo debe permitir cargo sin titular.

---

## 11. Qué implica para nuestro modelo de datos

| Hallazgo | Consecuencia |
|---|---|
| Ítems por **cargo**, metas por **funcionario** | Entidades `cargo`, `item_medicion`, `meta` (funcionario × ítem × período) |
| Ítems de tipo cantidad **y** porcentaje, y de dirección normal **e inversa** | `item_medicion.tipo` y `.direccion` |
| Felicitaciones/reclamos fuera del 100%, con tope | Entidad `ajuste` parametrizada (RN-011: valores **no** se codifican fijos) |
| Período con fechas y días calculados | Entidad `periodo` (RF-005); prohibido fijar 90/91 en código |
| Días computables **por persona** | Entidad `asistencia` (licencia, vacaciones, compensatorios, emergencia) |
| Actividad con código único e inmutable + validación | `actividad`, `evidencia`, `validacion` |
| Hasta 3 gestiones por atención social | `atencion_social` con gestiones 1..3 y sus fechas |
| Solicitante identificado por RUT, cruzando delegaciones | `persona_usuaria` con RUT único → **trazabilidad** |
| Catálogos que se desactivan sin borrar historia | `catalogo` + `catalogo_item.vigente` |
| Todo cambio auditable | `auditoria` (RNF-008) |
| Parámetros versionados por período | `version_parametro` (RF-038) |
