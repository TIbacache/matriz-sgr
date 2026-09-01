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
| RF-003 | Configurar cargos y funciones: asociar a cada cargo los ítems medidos | ⬜ | Entidad `cargo` + `item_medicion` |
| RF-004 | Catálogo de actividades, servicios, atenciones y subatenciones por área | ⬜ | Catálogos reales ya levantados en [estructura-planilla-real.md](estructura-planilla-real.md) §4 |
| RF-005 | Configurar períodos: inicio, término, estado y **días computables** | ⬜ | Hoy derivamos el trimestre del string `2026-Q3` → **debe pasar a tabla** |
| RF-006 | Configurar ponderaciones por ítem, cargo y período | 🟡 | Validamos suma ≤ 100% en metas por unidad; falta por cargo/ítem |
| RF-007 | Configurar metas y umbrales, **versionado**, rige desde el período | ⬜ | Falta versionado (RF-038) |

### 3.2 Registro personal y evidencias

| ID | Requerimiento | Estado | Nota |
|---|---|---|---|
| RF-008 | Ficha personal: funcionario, cargo, delegación, ítems, metas, avance, ponderado | ⬜ | Es la "pestaña personal". Pantalla central que falta |
| RF-009 | Registrar actividades (fecha, actividad, acción, contacto, teléfono, ítem, ingreso a tubo) | ⬜ | Columnas exactas en estructura-planilla-real §3 |
| RF-010 | Validar campos: obligatoriedad, formatos, coherencia | 🟡 | Zod en el backend; falta validación de RUT y teléfono |
| RF-011 | Generar código de evidencia único e **inmutable** | ⬜ | Formato definido en [ADR-004](decisiones-tecnicas.md) |
| RF-012 | Asociar evidencia (foto) al código, con fecha y autor de carga | ⬜ | |
| RF-013 | Validar evidencia: aprobar, rechazar o **solicitar corrección**, con observación | ⬜ | Tres decisiones, no dos |
| RF-014 | Solo lo validado suma al avance | ⬜ | Regla central del sistema de puntos |
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
| RF-022 | Calcular avance con actividades **válidas** por ítem, funcionario, delegación y período | 🟡 | Hoy por unidad y categoría, sin nivel funcionario ni validación |
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
| RF-032 | Buscar y filtrar por delegación, área, funcionario, cargo, período, ítem, estado, fechas | 🟡 | Dashboard filtra por trimestre y delegación |
| RF-033 | Generar y **exportar informes** conservando filtros y encabezados | ⬜ | |
| RF-034 | Trabajo simultáneo sin sobrescritura | 🟡 | Socket.io sí; falta **bloqueo optimista** ([ADR-005](decisiones-tecnicas.md)) |
| RF-035 | Comentarios/observaciones asociados a registros | ⬜ | Petición literal del cliente |
| RF-036 | **Trazabilidad** de altas, modificaciones, validaciones y cambios de estado | ⬜ | Tabla `auditoria` ([ADR-006](decisiones-tecnicas.md)) |
| RF-037 | Alertas por vencimientos, evidencias pendientes, ausencia de registros, avance bajo | ⬜ | |
| RF-038 | **Versionar parámetros**: los cambios no alteran períodos cerrados | ⬜ | |

**Resumen: 38 RF → 5 ✅ · 13 🟡 · 20 ⬜**

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
| RNF-008 | **Auditoría** | Usuario, fecha, origen, acción, **valor anterior y nuevo**, protegido contra alteración | ⬜ |
| RNF-009 | Privacidad | Minimizar datos personales, restringir visualización, definir conservación y eliminación | ⬜ |
| RNF-010 | Respaldo | RPO 24 h, RTO 4 h | ⬜ Fase 5 |
| RNF-011 | Usabilidad | Etiquetas comprensibles, validación contextual, filtros consistentes | ✅ |
| RNF-012 | **Accesibilidad** | Navegación por teclado, contraste suficiente, textos alternativos | 🟡 contraste validado; falta auditoría de teclado |
| RNF-013 | Compatibilidad | Chrome y Edge, escritorio y móvil | 🟡 falta prueba explícita en Edge |
| RNF-014 | Escalabilidad | Nuevas delegaciones, cargos, actividades, períodos y usuarios sin rediseñar | ✅ multi-tenant |
| RNF-015 | Mantenibilidad | Metas, ponderadores, estados, catálogos y umbrales **sin cambios de código** | ⬜ ADR-007 |
| RNF-016 | Interoperabilidad | Exportación estructurada e integración futura | ⬜ |
| RNF-017 | Gestión de evidencias | Formatos, tamaño máximo, **antivirus**, metadatos, acceso, retención, eliminación segura | ⬜ |
| RNF-018 | Monitoreo | Métricas y alertas sobre errores, integraciones, capacidad y tareas automáticas | ⬜ |

---

## 5. Reglas de negocio (13)

| ID | Regla | Estado |
|---|---|---|
| RN-001 | Ponderadores de un cargo y período suman **100%** | 🟡 validado por unidad, falta por cargo |
| RN-002 | Meta > 0; ítems porcentuales declaran su fórmula | ⬜ ver [ADR-009](decisiones-tecnicas.md) |
| RN-003 | Avance = actividades **válidas** del ítem en el período | ⬜ |
| RN-004 | % cumplimiento = avance / meta × 100 | ✅ |
| RN-005 | Ponderado = ponderador × % cumplimiento; **máximo 150% por confirmar** | 🟡 parametrizar |
| RN-006 | Umbral mínimo colectivo **80%**, configurable | 🟡 |
| RN-007 | Meta esperada al día = días transcurridos computables / días totales computables × 100 | ✅ |
| RN-008 | Semáforo: verde ≥ esperado; ámbar ≥ 60% del esperado y < esperado; rojo < 60% | ✅ **verificado con los datos reales de la planilla** |
| RN-009 | Solo una validación **aprobada** otorga el punto | ⬜ |
| RN-010 | Códigos de evidencia únicos e inmutables | ⬜ ADR-004 |
| RN-011 | Felicitaciones/reclamos **parametrizables** — el PDF menciona −20% y −30%, requiere definición oficial | ⬜ ⚠ la planilla muestra +10% (máx 3) y −20% |
| RN-012 | Atención social: hasta 3 gestiones por persona, con fechas y resultados por etapa | ⬜ |
| RN-013 | Períodos cerrados no se modifican salvo reapertura autorizada y auditada | ⬜ |

---

## 6. Criterios de aceptación integrales (10)

| ID | Escenario | Estado |
|---|---|---|
| CA-01 | Registro validado suma **una vez** y actualiza tableros | ⬜ |
| CA-02 | Evidencia rechazada conserva observación y no aporta puntaje | ⬜ |
| CA-03 | Compromiso vencido se destaca, mantiene historial y genera alerta | 🟡 se destaca; faltan historial y alerta |
| CA-04 | Caso social con 3 gestiones y secuencia consultable | ⬜ |
| CA-05 | Al cambiar fecha o avance se recalculan meta acumulada y semáforo | ✅ |
| CA-06 | Totales del tablero coinciden con el detalle filtrado | ✅ |
| CA-07 | Un funcionario no modifica datos de otra delegación | ✅ verificado en smoke test |
| CA-08 | Dos usuarios registran a la vez sin perder ni sobrescribir sin advertencia | 🟡 |
| CA-09 | Cada modificación crítica rastreable a usuario, fecha, valor anterior y nuevo | ⬜ |
| CA-10 | Período cerrado no alterable; reapertura autorizada y auditada | ⬜ |

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
- 🟡 Administración básica de usuarios, cargos, catálogos, períodos, metas y ponderaciones
- ⬜ Registro de actividades con identificador único, evidencia y flujo de validación
- 🟡 Agenda colectiva con responsables, estados, plazos e **historial de cambios**
- ✅ Cálculo de avance, cumplimiento ponderado, meta esperada al día y semáforo
- 🟡 Panel **personal** y resumen de delegación con filtros y acceso al detalle
- ⬜ Informe o exportación básica y **auditoría de operaciones críticas**

**Brecha principal**: todo el eje **actividad → código → evidencia → validación → puntaje**, que es el corazón del sistema, y el **nivel funcionario**. Nuestro avance está en la agenda colectiva y el cálculo consolidado.

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

El PDF exige documentar las ambigüedades en vez de resolverlas en silencio. Estas son:

1. **Ajustes por felicitación y reclamo**: el PDF (RN-011) menciona −20% y −30%; la planilla muestra **+10% (máx. 3)** y **−20%**; el audio dijo "+10, máximo 1 mensual". ¿Cuál rige?
2. **Objetivo al día por persona**: en la planilla el cuadro global marca 61,54% (56 de 91 días) pero la tabla usa 50,55% por persona. ¿Se descuentan los días no trabajados del **numerador** (días transcurridos de la persona) manteniendo el denominador total? Es lo que sugieren los datos.
3. **Tope de 150%**: el encabezado lo declara pero la planilla muestra 154% y 206% sin recortar. ¿Se aplica o solo se informa?
4. **Estado "Ingresado"**: ¿es un estado real previo a "Pendiente", o el total de ingresados como aparece en el resumen colectivo?
5. **Roles Verificador y Usuario de consulta**: ¿son perfiles independientes o funciones del Coordinador?
6. **Ítems de dirección inversa** ("Pendientes en tubo menor a 10%"): ¿la fórmula `meta/avance` es la correcta?
7. **Multi-tenant**: nuestro sistema soporta varias organizaciones (el cliente pidió que fuera vendible a cualquier municipio o empresa). ¿Se evalúa como valor agregado o se prefiere una sola organización?
