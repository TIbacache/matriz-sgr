# Requerimientos oficiales — Guía INACAP

**Fuente**: `Guia_Proyecto_Software_SGR_Alumnos.pdf` (INACAP, v1.0, 31-08-2026, 30 páginas) + `PRESENTACIÓN MATRIZ REGIMIENTORESULTADO (1).pptx` (20 diapositivas).

> **Este documento manda.** Regla de interpretación del PDF (§Condiciones del caso): *"Si una historia contradice un requerimiento formal, prevalece el requerimiento y debe registrarse la decisión. Las ambigüedades no se resuelven silenciosamente: se documentan como supuestos o consultas al docente."*
>
> Jerarquía de fuentes: **PDF oficial > planilla real (PPT) > transcripción de la reunión > apuntes de clase.**

Estado: ✅ implementado · 🟡 parcial · ⬜ pendiente

---

## 1. Cambio de nombre y encuadre

El proyecto se llama oficialmente **SGR — Sistema de Gestión de Resultados**. "Matriz SGR" es el nombre de la herramienta actual en Google Sheets. Mantenemos `matriz-sgr` como nombre del repositorio (ya está publicado) y usamos **SGR** en la interfaz y los entregables.

**Producto esperado**: aplicación web responsiva con frontend, lógica de negocio, API/backend, base de datos y **almacenamiento controlado de evidencias**. El stack lo propone el equipo sujeto a aprobación docente ✔ (el nuestro cumple: React+TS / Node+Express+Socket.io / PostgreSQL / Docker).

⚠ **Datos**: *"Solo se utilizarán datos ficticios o anonimizados. Está prohibido cargar información real de ciudadanos o funcionarios."* → Nuestro seed usa nombres reales tomados de las capturas (Javier Godoy, Juan Francisco Labra). **Debe reemplazarse por datos ficticios antes de la entrega.** Registrado como deuda técnica.

---

## 2. Actores (§3) vs. nuestros roles

| Actor del PDF | Responsabilidad | Nuestro rol |
|---|---|---|
| Administrador | Configura delegaciones, usuarios, cargos, catálogos, períodos, metas, ponderaciones y permisos | `admin` ✅ |
| Coordinador del sistema | Supervisa la operación transversal, revisa indicadores, resuelve criterios | `supervisor` ✅ |
| Delegado o jefatura | Consulta su delegación, asigna y revisa compromisos | `gerente` ✅ |
| Funcionario | Registra actividades, compromisos, avances, contactos, servicios y evidencias | `usuario` ✅ |
| **Verificador** | Revisa evidencias, valida o rechaza y deja trazabilidad | ⬜ **falta** |
| **Usuario de consulta** | Accede a tableros e informes, sin modificar | ⬜ **falta** |

→ Faltan **dos roles**. El verificador puede coincidir con el supervisor, pero el PDF los separa como funciones distintas ("segregación de funciones", RNF-005). Decisión: agregar ambos al enum `Rol`.

---

## 3. Requerimientos funcionales (38)

### 3.1 Configuración organizacional y de medición

| ID | Requerimiento | Estado | Nota |
|---|---|---|---|
| RF-001 | Administrar delegaciones (crear, modificar, activar, desactivar) | 🟡 | Falta activar/desactivar (hoy se elimina) |
| RF-002 | Administrar usuarios y roles (estado, cargo, delegación, uno o más roles) | 🟡 | Existe membresía con cargo y unidad; falta **múltiples roles** y estado, y la UI de administración |
| RF-003 | Configurar cargos y funciones: asociar a cada cargo los ítems medidos | ✅ | `GET/POST/PATCH /cargos` y `/items` (`b1f3e75`). Falta la pantalla |
| RF-004 | Catálogo de actividades, servicios, atenciones y subatenciones por área | 🟡 | `GET /catalogos` alimenta la UI con los valores **vigentes** (los formatos de evidencia ya salen de ahí); falta el CRUD y la desactivación (HU-27) |
| RF-005 | Configurar períodos: inicio, término, estado y **días computables** | ✅ | `/periodos` con cierre y reapertura auditada (`b1f3e75`); los días se calculan desde las fechas |
| RF-006 | Configurar ponderaciones por ítem, cargo y período | ✅ | `GET/POST/PATCH/DELETE/PUT /metas-item` (`de68901`). El ítem debe ser del cargo del funcionario; la respuesta siempre informa la suma y cuánto falta. Falta la pantalla |
| RF-007 | Configurar metas y umbrales, **versionado**, rige desde el período | ✅ | `de68901`. El versionado **es el período**: la meta cuelga de `periodoId`, así que reconfigurar el trimestre siguiente nunca toca el cerrado (RN-013). Los umbrales viven en `parametro` (RF-038). Falta la pantalla |

### 3.2 Registro personal y evidencias

| ID | Requerimiento | Estado | Nota |
|---|---|---|---|
| RF-008 | Ficha personal: funcionario, cargo, delegación, ítems, metas, avance, ponderado | ✅ | Pantalla `/ficha` con los tres bloques de DESIGN §8.2 y registro en línea. Falta prueba de componente (Bloque D) |
| RF-009 | Registrar actividades (fecha, actividad, acción, contacto, teléfono, ítem, ingreso a tubo) | ✅ | `POST /actividades` (`b1f3e75`); falta la pantalla |
| RF-010 | Validar campos: obligatoriedad, formatos, coherencia | ✅ | Zod + RUT (`lib/rut.ts`), teléfono (`lib/telefono.ts`), fecha dentro del período, ítem del cargo |
| RF-011 | Generar código de evidencia único e **inmutable** | ✅ | `services/codigos.ts` + trigger; verificado en `verificar:api` |
| RF-012 | Asociar evidencia (foto) al código, con fecha y autor de carga | ✅ | `POST /actividades/:id/evidencias`; ruta derivada del código, nunca del nombre del cliente |
| RF-013 | Validar evidencia: aprobar, rechazar o **solicitar corrección**, con observación | ✅ | `POST /evidencias/:id/validacion`; observación obligatoria si no se aprueba |
| RF-014 | Solo lo validado suma al avance | ✅ | Verificado de punta a punta: el avance sube solo tras aprobar, y una sola vez |
| RF-015 | Atención social con **hasta 3 gestiones** para el mismo usuario | ⬜ | Columnas en estructura-planilla-real §4 |

### 3.3 Agenda colectiva (nuestro "tubo")

| ID | Requerimiento | Estado | Nota |
|---|---|---|---|
| RF-016 | Crear compromisos derivados de solicitudes internas o externas | ✅ | Campo INT/EXT pendiente |
| RF-017 | Asignar solicitante, territorio, responsable, área de apoyo, fecha comprometida | 🟡 | Faltan solicitante, territorio y área de apoyo |
| RF-018 | Estados **Ingresado → Pendiente → En proceso → Realizado** con transiciones controladas | 🟡 | Tenemos 3 estados; falta "Ingresado" e **historial de transición** |
| RF-019 | Controlar plazos: próximos a vencer, vencidos, realizados fuera de plazo | 🟡 | Marcamos vencidos; faltan "próximo a vencer" y "fuera de plazo" |
| RF-020 | El cierre de compromisos alimenta el indicador **una sola vez** | ⬜ | Es el ítem "Soluciones al ingreso al tubo" |
| RF-021 | Resumen colectivo por funcionario y estado con % realizado | ⬜ | Diapositiva 14 |

### 3.4 Cálculos, semáforos y tableros

| ID | Requerimiento | Estado | Nota |
|---|---|---|---|
| RF-022 | Calcular avance con actividades **válidas** por ítem, funcionario, delegación y período | ✅ | `GET /cumplimiento/:periodoId` expone el motor v2 por funcionario. El **dashboard** aún lee la vista v1 (Bloque C) |
| RF-023 | % de cumplimiento = avance / meta | ✅ | |
| RF-024 | Cumplimiento ponderado respetando el **máximo configurado** | 🟡 | Tope 150% está fijo en SQL → parametrizar ([ADR-007](decisiones-tecnicas.md)) |
| RF-025 | Incentivos y penalizaciones parametrizables (felicitaciones, reclamos) | ⬜ | Con motivo, valor, responsable y efecto |
| RF-026 | Meta esperada al día según días transcurridos y duración | ✅ | `objetivo_al_dia` en la vista v2 |
| RF-027 | Semáforo verde/ámbar/rojo con **umbrales configurables** | 🟡 | Regla correcta; umbrales fijos en SQL |
| RF-028 | Tablero **personal** con metas, avance, evidencias y compromisos | ⬜ | |
| RF-029 | Tablero de delegación consolidado | ✅ | Dashboard actual |
| RF-030 | Actividad reciente: último ingreso, días sin ingreso, cantidad, promedio diario | ⬜ | Diapositiva 18 |
| RF-031 | Vista global por cargos | ⬜ | Diapositiva 19 |

### 3.5 Consulta, colaboración y administración

| ID | Requerimiento | Estado | Nota |
|---|---|---|---|
| RF-032 | Buscar y filtrar por delegación, área, funcionario, cargo, período, ítem, estado, fechas | 🟡 | `/actividades` filtra por período, funcionario, ítem, delegación y rango de fechas; la bandeja por estado, período y delegación; el dashboard por trimestre y delegación. Falta **búsqueda por texto y por RUT** |
| RF-033 | Generar y **exportar informes** conservando filtros y encabezados | ⬜ | |
| RF-034 | Trabajo simultáneo sin sobrescritura | 🟡 | Socket.io + **bloqueo optimista con 409** en todo el modelo v2 (`services/concurrencia.ts`); falta aplicarlo en las rutas v1 |
| RF-035 | Comentarios/observaciones asociados a registros | ⬜ | Petición literal del cliente |
| RF-036 | **Trazabilidad** de altas, modificaciones, validaciones y cambios de estado | 🟡 | `auditarDesde()` en cada write crítico del modelo v2; faltan las rutas v1 y la pantalla de consulta |
| RF-037 | Alertas por vencimientos, evidencias pendientes, ausencia de registros, avance bajo | 🟡 | Existe el evento `evidencia:pendiente` y la bandeja; falta el motor de alertas |
| RF-038 | **Versionar parámetros**: los cambios no alteran períodos cerrados | 🟡 | `parametro` con vigencia por período y resolución período → organización; falta su CRUD |

**Resumen: 38 RF → 16 ✅ · 13 🟡 · 9 ⬜** (antes del Bloque A: 5 ✅ · 13 🟡 · 20 ⬜; tras el Bloque A: 14 ✅ · 15 🟡 · 9 ⬜)

---

## 4. Requerimientos no funcionales (18)

| ID | Atributo | Exigencia | Estado |
|---|---|---|---|
| RNF-001 | Disponibilidad | 99,5% mensual (por validar), registrar indisponibilidades | ⬜ |
| RNF-002 | Rendimiento | Registro y consulta ≤ **2 s**; tableros ≤ **5 s** | 🟡 probar con volumen real (~10.000 actividades/trimestre) |
| RNF-003 | Concurrencia | Sin pérdida, duplicación ni sobrescritura silenciosa | 🟡 falta versión optimista |
| RNF-004 | Autenticación | Identidad individual; se **recomienda** directorio institucional y MFA | ✅ JWT+bcrypt (MFA queda fuera de alcance, declarado) |
| RNF-005 | Autorización | Por rol, delegación, función y operación; mínimo privilegio y **segregación de funciones** | ✅ |
| RNF-006 | Confidencialidad | Cifrado en tránsito y protección de evidencias | 🟡 HTTPS en Fase 5 |
| RNF-007 | Integridad | Validar formatos, relaciones, duplicados y cambios concurrentes | 🟡 |
| RNF-008 | **Auditoría** | Usuario, fecha, origen, acción, **valor anterior y nuevo**, protegido contra alteración | 🟡 aplicada en el modelo v2 (con IP y ruta de origen); faltan las rutas v1 |
| RNF-009 | Privacidad | Minimizar datos personales, restringir visualización, definir conservación y eliminación | ⬜ |
| RNF-010 | Respaldo | RPO 24 h, RTO 4 h | ⬜ Fase 5 |
| RNF-011 | Usabilidad | Etiquetas comprensibles, validación contextual, filtros consistentes | ✅ |
| RNF-012 | **Accesibilidad** | Navegación por teclado, contraste suficiente, textos alternativos | 🟡 contraste validado; falta auditoría de teclado |
| RNF-013 | Compatibilidad | Chrome y Edge, escritorio y móvil | 🟡 falta prueba explícita en Edge |
| RNF-014 | Escalabilidad | Nuevas delegaciones, cargos, actividades, períodos y usuarios sin rediseñar | ✅ multi-tenant |
| RNF-015 | Mantenibilidad | Metas, ponderadores, estados, catálogos y umbrales **sin cambios de código** | 🟡 todo lo del modelo v2 sale de `parametro` y de catálogos; falta la pantalla de configuración |
| RNF-016 | Interoperabilidad | Exportación estructurada e integración futura | ⬜ |
| RNF-017 | Gestión de evidencias | Formatos, tamaño máximo, **antivirus**, metadatos, acceso, retención, eliminación segura | 🟡 formatos (catálogo), tamaño (parámetro), metadatos y acceso controlado ✔ · **antivirus fuera de alcance por costo cero (declarado)**; retención sin definir |
| RNF-018 | Monitoreo | Métricas y alertas sobre errores, integraciones, capacidad y tareas automáticas | ⬜ |

---

## 5. Reglas de negocio (13)

| ID | Regla | Estado |
|---|---|---|
| RN-001 | Ponderadores de un cargo y período suman **100%** | ✅ exigido por funcionario en `/metas-item` (`de68901`): el alta unitaria rechaza superar el 100%, la carga en lote exige el 100% exacto, y toda respuesta trae `sumaPonderadores`, `cumpleRN001` y `faltante` |
| RN-002 | Meta > 0; ítems porcentuales declaran su fórmula | ✅ meta > 0 rechazada en la API y por `CHECK` en la base; `tipo` y `direccion` del ítem declaran la fórmula ([ADR-009](decisiones-tecnicas.md)) |
| RN-003 | Avance = actividades **válidas** del ítem en el período | ✅ verificado: lo anulado y lo no aprobado no suman |
| RN-004 | % cumplimiento = avance / meta × 100 | ✅ |
| RN-005 | Ponderado = ponderador × % cumplimiento; **máximo 150% por confirmar** | 🟡 parametrizar |
| RN-006 | Umbral mínimo colectivo **80%**, configurable | 🟡 |
| RN-007 | Meta esperada al día = días transcurridos computables / días totales computables × 100 | ✅ |
| RN-008 | Semáforo: verde ≥ esperado; ámbar ≥ 60% del esperado y < esperado; rojo < 60% | ✅ **verificado con los datos reales de la planilla** |
| RN-009 | Solo una validación **aprobada** otorga el punto | ✅ verificado de punta a punta (avance 7 → 8 solo al aprobar) |
| RN-010 | Códigos de evidencia únicos e inmutables | ✅ ADR-004, con trigger en base y correlativo bajo bloqueo |
| RN-011 | Felicitaciones/reclamos **parametrizables** — el PDF menciona −20% y −30%, requiere definición oficial | ⬜ ⚠ la planilla muestra +10% (máx 3) y −20% |
| RN-012 | Atención social: hasta 3 gestiones por persona, con fechas y resultados por etapa | ⬜ |
| RN-013 | Períodos cerrados no se modifican salvo reapertura autorizada y auditada | ✅ cerrado → 422 en edición, alta de actividad y validación; reapertura solo de admin, con motivo en la bitácora |

---

## 6. Criterios de aceptación integrales (10)

| ID | Escenario | Estado |
|---|---|---|
| CA-01 | Registro validado suma **una vez** y actualiza tableros | ✅ verificado; emite `cumplimiento:cambiado` al aprobar. La actualización **visual** del tablero llega con el Bloque C |
| CA-02 | Evidencia rechazada conserva observación y no aporta puntaje | ✅ la observación es obligatoria al rechazar o pedir corrección |
| CA-03 | Compromiso vencido se destaca, mantiene historial y genera alerta | 🟡 se destaca; faltan historial y alerta |
| CA-04 | Caso social con 3 gestiones y secuencia consultable | ⬜ |
| CA-05 | Al cambiar fecha o avance se recalculan meta acumulada y semáforo | ✅ |
| CA-06 | Totales del tablero coinciden con el detalle filtrado | ✅ |
| CA-07 | Un funcionario no modifica datos de otra delegación | ✅ verificado en smoke test |
| CA-08 | Dos usuarios registran a la vez sin perder ni sobrescribir sin advertencia | 🟡 409 con la versión y el registro vigentes en todo el modelo v2; falta en las rutas v1 y el aviso en la UI |
| CA-09 | Cada modificación crítica rastreable a usuario, fecha, valor anterior y nuevo | 🟡 verificado en el modelo v2; faltan las rutas v1 |
| CA-10 | Período cerrado no alterable; reapertura autorizada y auditada | ✅ verificado (8 comprobaciones del ciclo del período) |

---

## 7. Product Backlog oficial: 8 épicas, 31 historias

| Épica | Nombre | Historias | Mínimo P1 |
|---|---|---|---|
| EP-01 | Registro y gestión de actividades | HU-01 a HU-04 | 3 |
| EP-02 | Medición y desempeño | HU-05 a HU-08 | 3 |
| EP-03 | Evidencias y verificación | HU-09 a HU-11 | 3 |
| EP-04 | Agenda colectiva y compromisos | HU-12 a HU-15 | 3 |
| EP-05 | Monitoreo y control de gestión | HU-16 a HU-19 | 3 |
| EP-06 | Reportabilidad y toma de decisiones | HU-20 a HU-22 | 1 |
| EP-07 | Plataforma colaborativa | HU-23 a HU-25 | 2 |
| EP-08 | Administración, seguridad y trazabilidad | HU-26 a HU-31 | 5 |

⚠ **Nuestras 20 historias propias (HU-1.1 … HU-8.2) quedan subordinadas a estas 31 oficiales.** El mapeo vive en [matriz-trazabilidad.md](matriz-trazabilidad.md).

---

## 8. Alcance mínimo exigido (MVP, §13.2)

- ✅ Autenticación y autorización por rol y delegación
- 🟡 Administración básica de usuarios, cargos, catálogos, períodos, metas y ponderaciones — cargos, ítems y períodos ✔ por API; faltan metas por funcionario y las pantallas
- ✅ Registro de actividades con identificador único, evidencia y flujo de validación — **completo por API**, falta la pantalla
- 🟡 Agenda colectiva con responsables, estados, plazos e **historial de cambios**
- ✅ Cálculo de avance, cumplimiento ponderado, meta esperada al día y semáforo
- ✅ Panel **personal** (ficha `/ficha`) y resumen de delegación con filtros y acceso al detalle
- 🟡 Informe o exportación básica y **auditoría de operaciones críticas** — auditoría ✔ en el modelo v2; exportación ⬜

**Brecha principal restante**: la **bandeja del verificador** (HU-11 en pantalla) y la migración del dashboard al cálculo por funcionario. La API del eje está construida y verificada (`b1f3e75`) y la ficha personal con su registro y su subida de evidencia ya funciona.

---

## 9. Entregables exigidos (§15)

| Nº | Entregable | Estado |
|---|---|---|
| 01 | Repositorio: código, historial, **estrategia de ramas**, .gitignore, README | 🟡 falta estrategia de ramas documentada |
| 02 | Análisis: backlog priorizado, supuestos, decisiones, alcance MVP, trazabilidad | 🟡 falta la matriz |
| 03 | Diseño: prototipo, arquitectura lógica, modelo de datos, diagramas de interacción | ✅ |
| 04 | Implementación: app ejecutable, BD, migraciones, configuración, **datos ficticios** | 🟡 seed con nombres reales → cambiar |
| 05 | Pruebas: plan, casos, resultados y evidencias (funcionales, integración, seguridad) | ⬜ |
| 06 | Documentación: manual de instalación/despliegue, manual de usuario, decisiones técnicas | 🟡 ADR ✅, manuales ⬜ |
| 07 | Demostración: presentación, recorrido de historias, resultados y limitaciones | ⬜ |

### Lista de comprobación previa a la entrega (§15.3)

- [ ] La aplicación se instala siguiendo el README
- [ ] **No hay contraseñas ni datos reales** en repositorio, base ni capturas ⚠
- [ ] Las cuentas de demostración tienen roles diferenciados
- [ ] Los cálculos se verifican con un conjunto de datos conocido
- [ ] Las historias presentadas tienen prueba y evidencia trazable
- [ ] Las limitaciones conocidas están declaradas, no ocultas
- [ ] Todos los integrantes conocen el producto y pueden explicar su aporte

---

## 10. Consultas para el docente

El PDF exige documentar las ambigüedades en vez de resolverlas en silencio. **Esta lista es la que se lleva a la reunión.**

Cómo leerla: cada consulta dice qué dice cada fuente, **qué hicimos mientras tanto** y **qué cambia cuando llegue la respuesta**. Ninguna está bloqueando el desarrollo: las nº 1 y 3 viven en la tabla `parametro` con `confirmado: false` y se corrigen sin tocar código; las demás son decisiones provisionales acotadas a un archivo. La nº 10 es la única que puede implicar un costo.

| Nº | Consulta | Impacto si cambia la respuesta |
|---|---|---|
| 1 | Valor de felicitación y reclamo | Un `UPDATE` en `parametro` |
| 2 | Cómo se prorratea el objetivo al día | Fórmula en `services/cumplimiento.ts` |
| 3 | ¿El tope de 150% se aplica o solo se informa? | Un `UPDATE` en `parametro` |
| 4 | ¿"Ingresado" es estado o total? | Columna del kanban |
| 5 | ¿Verificador y consulta son perfiles propios? | Ya implementados como perfiles |
| 6 | Fórmula del ítem inverso | Una función, ya aislada (ADR-009) |
| 7 | ¿El multi-tenant suma o estorba? | Ninguno técnico; sí de presentación |
| 8 | ¿Una aprobación puede revertirse? | Quitar una guarda en la validación |
| 9 | ¿El verificador es transversal o por delegación? | Una línea en `services/alcance.ts` |
| 10 | Antivirus y retención de evidencias (RNF-017) | Infraestructura y costo |

1. **Ajustes por felicitación y reclamo**: el PDF (RN-011) menciona −20% y −30%; la planilla muestra **+10% (máx. 3)** y **−20%**; el audio dijo "+10, máximo 1 mensual". ¿Cuál rige?
2. **Objetivo al día por persona**: en la planilla el cuadro global marca 61,54% (56 de 91 días) pero la tabla usa 50,55% por persona. ¿Se descuentan los días no trabajados del **numerador** (días transcurridos de la persona) manteniendo el denominador total? Es lo que sugieren los datos.
3. **Tope de 150%**: el encabezado lo declara pero la planilla muestra 154% y 206% sin recortar. ¿Se aplica o solo se informa?
4. **Estado "Ingresado"**: ¿es un estado real previo a "Pendiente", o el total de ingresados como aparece en el resumen colectivo?
5. **Roles Verificador y Usuario de consulta**: ¿son perfiles independientes o funciones del Coordinador?
6. **Ítems de dirección inversa** ("Pendientes en tubo menor a 10%"): ¿la fórmula `meta/avance` es la correcta?
7. **Multi-tenant**: nuestro sistema soporta varias organizaciones (el cliente pidió que fuera vendible a cualquier municipio o empresa). ¿Se evalúa como valor agregado o se prefiere una sola organización?
8. **¿Una validación aprobada puede revertirse?** (surgida al implementar RF-013/RF-014). El PDF no lo dice. Nuestra decisión provisional: **no** — la aprobación es definitiva porque su punto ya está contabilizado (CA-01) y revertirla cambiaría en silencio un resultado ya publicado; para corregir se **anula la actividad con motivo** y se registra una nueva (ADR-006). Si el docente indica que el verificador puede rectificar, basta con permitir una validación posterior: el modelo ya guarda el historial completo de decisiones.

9. **¿El Verificador es transversal o hay uno por delegación?** (surgida al implementar RF-013 y la bandeja de HU-11).

   - **Lo que dice cada fuente**: el PDF (§3) define al Verificador como "revisa evidencias, valida o rechaza y deja trazabilidad", **sin decir sobre qué ámbito**. El cliente, en cambio, fue tajante con que *el libro de cada delegación es privado y no se ven entre ellas* (reunión 00:37:11). RNF-005 pide mínimo privilegio y segregación de funciones, que tiran en direcciones opuestas: transversal es mejor segregación, por delegación es menos privilegio.
   - **Qué hicimos mientras tanto**: el verificador ve la **bandeja de evidencias de todas las delegaciones**, porque si no, nadie podría validar las de una delegación sin verificador propio y el avance quedaría congelado. Pero su acceso **no se amplió a nada más**: no ve el libro de actividades ni el tubo de ninguna delegación. Está en `services/alcance.ts`, en una función aparte (`unidadesParaVerificacion`) precisamente para poder cambiarlo sin tocar el resto.
   - **Qué cambia con la respuesta**: si son verificadores por delegación, se les asigna `unidadTerritorialId` en la membresía (la columna ya existe) y esa función pasa a devolver sus unidades. Es una línea de código y datos; **no hay migración ni cambio de modelo**.
   - **Pregunta concreta**: ¿un verificador único revisa las evidencias de todo el municipio, o cada delegación valida las propias? Y si es lo segundo, ¿quién valida cuando esa persona está ausente?

10. **Antivirus y retención de evidencias (RNF-017)** — es el único punto de la especificación que hoy **no** cumplimos, y preferimos declararlo antes que dejarlo pasar.

    - **Lo que exige RNF-017**: "formatos, tamaño máximo, **antivirus**, metadatos, acceso, **retención**, eliminación segura".
    - **Qué sí está implementado** (defensa en profundidad, verificado con 5 comprobaciones): lista blanca de tipos MIME en el catálogo `formato_evidencia`; tamaño máximo en el parámetro `evidencia_tamano_max_mb`; **el nombre en disco lo deriva el servidor del código inmutable de la actividad**, nunca el que envía el cliente (probado con `../../etc/passwd.jpg`); los archivos viven fuera del árbol público y se descargan por un endpoint autenticado, no como estáticos; y nada se ejecuta ni se interpreta.
    - **Por qué falta el antivirus**: no es un problema de licencia — ClamAV es libre y gratuito. Es de **hardware**: su demonio necesita cerca de 1 GB de RAM solo para mantener las firmas en memoria, más de lo que da la VPS mínima que contempla nuestra restricción de costo cero, y actualizar firmas exige salida a internet y una tarea programada.
    - **Preguntas concretas**: (a) ¿se exige antivirus **operativo** para la evaluación, o basta con declarar la mitigación anterior como limitación conocida? (b) Si se exige, ¿se autoriza el gasto de una VPS con 2 GB de RAM, o se acepta un análisis **diferido** (la evidencia queda en cuarentena y no se puede validar hasta pasar el análisis)? (c) ¿Qué **política de retención y eliminación** de evidencias espera? RNF-009 pide "definir conservación y eliminación" y hoy no tenemos plazo definido: sin ese dato no podemos programar el borrado, y borrar por nuestra cuenta sería peor que no borrar.
