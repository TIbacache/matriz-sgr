# Plan de desarrollo — SGR

**Equipo**: Origami SpA (2 personas) · **Plan en Planner**: `DesarrolloSW-MuniLS-OrigamiSpA`
**Actualizado**: 8 de septiembre de 2026 · **Estado del software**: `v0.15.0-control-actividad`, 332 comprobaciones en verde

Este documento es la vista humana del plan; el mismo contenido en formato tabla está en [plan-desarrollo.csv](plan-desarrollo.csv). Las fechas son **editables**: se cambian aquí y en el CSV, o se arrastran directamente en Planner.

## Cómo se carga en Planner

👉 **A mano, siguiendo [entrega/guia-planner-hector.pdf](entrega/guia-planner-hector.pdf)**: seis tandas con el contenido exacto de cada tarjeta, repartibles entre los dos.

**No es por elección.** Se intentó automatizarlo con [`scripts/cargar-plan-planner.ps1`](../scripts/cargar-plan-planner.ps1) y el tenant de INACAP tiene desactivado el consentimiento de usuario para *Microsoft Graph Command Line Tools*, la aplicación que usa cualquier script contra Microsoft 365: el inicio de sesión termina en «Need admin approval», incluso pidiendo solo el permiso mínimo. El script se conserva funcionando y el diagnóstico completo está en [guia-cargar-planner.md](guia-cargar-planner.md).

El tablero **no está vacío**: Héctor ya creó ocho tareas y no se tocan. Qué se corrigió del plan viejo y qué criterio de la rúbrica cuelga de qué tarea está en [entrega/planner-delta.md](entrega/planner-delta.md).

## Reparto de trabajo

Dos personas, con especialización parcial para no pisarse:

| | Foco principal |
|---|---|
| **A** (Tomás) | Backend, base de datos, cálculo del cumplimiento, seguridad, CI/CD |
| **B** (Héctor) | Frontend, documentación formal, pruebas, infraestructura del piloto |
| **Ambos** | Reuniones con el cliente y los PO, integración, pruebas de usabilidad, piloto |

Ajustable: la columna `Responsable` del CSV acepta `A`, `B` o `Ambos`. Para la entrega del 15 de septiembre el reparto es por artefacto y está en la [sección 6 del plan de la entrega](plan-entrega-15-septiembre.md).

## Calendario por sprints

Sprints de dos semanas. Considera los feriados chilenos del período (18–19 sep Fiestas Patrias, 12 oct, 31 oct, 1 nov, 8 dic).

| Sprint | Fechas | Foco | Estado |
|---|---|---|---|
| **0** | 11 – 25 ago | Ámbito, levantamiento con el cliente, documentación base | ✅ hecho |
| **1** | 26 ago – 8 sep | Requerimientos oficiales, modelo v2 y **todo el desarrollo del núcleo** | ✅ hecho, con adelanto |
| **2** | 9 – 22 sep | **Entrega de Análisis y Diseño (15 sep)** y validación con los PO ⚠ semana del 18 | 🟠 en curso |
| **3** | 23 sep – 6 oct | Plan de pruebas, pruebas en marco formal (Jest/RTL), CI | ⏳ |
| **4** | 7 – 20 oct | RF pendientes: ajustes, tablero personal, vista por cargos, exportación, comentarios, alertas | ⏳ |
| **5** | 21 oct – 3 nov | API de ausencias, catálogos y parámetros; en paralelo, Docker de producción y CI/CD | ⏳ |
| **6** | 4 – 17 nov | Integración, pruebas de seguridad y de carga; VPS y respaldos | ⏳ |
| **7** | 18 nov – 1 dic | Usabilidad, corrección de hallazgos, manuales, capacitación | ⏳ |
| **Cierre** | 2 – 12 dic | Piloto, ajustes, documentación final y entrega | ⏳ |

**Nota sobre el adelanto**: el sprint 1 absorbió lo que el plan original repartía entre los sprints 3 y 5. El modelo de datos v2, la API del registro y la validación, las metas por funcionario, la ficha personal, la bandeja del verificador, la ficha del vecino, la atención social, el dashboard y el control de actividad **están construidos y verificados**, con quince etiquetas de versión entre el 1 y el 6 de septiembre. Lo que queda se concentra en **documentar lo construido** (sprint 2), **pruebas en marco formal** (sprint 3), **los RF que quedaron fuera del núcleo** (sprint 4) y **la puesta en producción**.

## Tareas por bucket

Leyenda de estado: ✅ Completado · 🟠 En curso · ⏳ Pendiente

### Ámbito

| Tarea | Vence | Resp. | Estado |
|---|---|---|---|
| Reunión de levantamiento con el cliente | 25 ago | Ambos | ✅ |
| Documento maestro del proyecto | 25 ago | A | ✅ |
| Procesar transcripción y clasificar requerimientos | 26 ago | A | ✅ |
| Definir restricciones (costo cero y stack) | 25 ago | Ambos | ✅ |
| Definir roles del equipo y canal con los PO | 15 sep | Ambos | 🟠 |
| Consultas abiertas al docente (13) | 15 sep | A | 🟠 |
| Registro de riesgos y supuestos | 22 sep | B | 🟠 |
| Acta de constitución y alcance | 22 sep | B | ⏳ |
| Recibir parametrización de columnas del cliente | 30 sep | A | 🟠 |

### Requisitos de análisis o software

| Tarea | Vence | Resp. | Estado |
|---|---|---|---|
| Diagrama de contexto y actores (v1, agosto) | 25 ago | A | ✅ |
| Casos de uso por actor (v1, agosto) | 25 ago | A | ✅ |
| Historias de usuario propias con criterios de aceptación (v1) | 25 ago | A | ✅ |
| Modelo entidad-relación inicial (v1, agosto) | 25 ago | A | ✅ |
| Backlog priorizado del producto | 25 ago | A | ✅ |
| Requerimientos oficiales del PDF (38 RF, 18 RNF, 13 RN, 10 CA) | 31 ago | A | ✅ |
| Historias de usuario oficiales (31) | 31 ago | A | ✅ |
| Especificación de requisitos no funcionales | 31 ago | B | ✅ |
| Historias del modelo por funcionario | 1 sep | A | ✅ |
| Matriz de trazabilidad requisitos–historias–pruebas | 15 sep | B | 🟠 |
| Validación de requisitos con los PO | 22 sep | Ambos | ⏳ |

### Diseño

| Tarea | Vence | Resp. | Estado |
|---|---|---|---|
| Sistema de diseño visual (DESIGN.md) | 25 ago | A | ✅ |
| Arquitectura de solución y despliegue | 25 ago | A | ✅ |
| Diseño de la API REST y contrato de eventos | 25 ago | A | ✅ |
| Diagrama de secuencia del tiempo real | 25 ago | A | ✅ |
| Diseño de seguridad: roles y multi-tenancy | 26 ago | A | ✅ |
| Modelo de datos v2 (metas por funcionario, evidencias, atenciones) | 1 sep | A | ✅ |
| Identidad visual de la Municipalidad de La Serena | 2 sep | A | ✅ |
| Decisiones técnicas registradas (15 ADR) | 6 sep | A | ✅ |
| Wireframes y diseño de las pantallas | 6 sep | B | ✅ |
| **Diagrama de Requerimientos** | **15 sep** | A | 🟠 |
| Plan de pruebas (estrategia y casos) | 13 oct | B | ⏳ |

> Las cinco tareas que Héctor creó en este depósito (GIT, Diseño MockUps, Modelo Entidad-Relación, Diagramas UML, Diagramas de Clase) **no están en el CSV a propósito**: ya existen en el tablero y el script las omitiría. Están en la tabla de la [sección 5 de planner-delta.md](entrega/planner-delta.md), con el criterio de la rúbrica que cubre cada una.

### Desarrollo

| Tarea | Vence | Resp. | Estado |
|---|---|---|---|
| Repositorio, Docker y PostgreSQL | 25 ago | A | ✅ |
| Autenticación JWT, bcrypt y roles | 25 ago | A | ✅ |
| CRUD de unidades, categorías y tareas | 25 ago | A | ✅ |
| Socket.io con rooms, presencia y rate limiting | 25 ago | A | ✅ |
| Frontend: autenticación, layout y tema | 25 ago | A | ✅ |
| Tubo de trabajo con drag and drop y tiempo real | 25 ago | A | ✅ |
| Formulario de nueva tarea | 26 ago | A | ✅ |
| Dashboard BI con ECharts (v1) | 26 ago | A | ✅ |
| Migrar el modelo de datos v2 a la base | 1 sep | A | ✅ `v0.2.0` |
| Bloque A: API del registro y la validación | 1 sep | A | ✅ `v0.3.0` |
| Ficha personal del funcionario | 1 sep | A | ✅ `v0.4.0` |
| Bandeja del verificador | 1 sep | A | ✅ `v0.5.0` |
| Bloque A2: metas y ponderadores por funcionario | 1 sep | A | ✅ `v0.6.0` |
| Pantalla de configuración de metas | 1 sep | A | ✅ `v0.7.0` |
| Identidad visual de La Serena en la interfaz | 2 sep | A | ✅ `v0.8.x` |
| Entregables visuales para Planner y GitHub | 2 sep | A | ✅ `v0.9.0` |
| Ficha del vecino y trazabilidad entre delegaciones | 3 sep | A | ✅ `v0.10.0` |
| Bloque A3: rutas heredadas endurecidas | 3 sep | A | ✅ `v0.11.0` |
| Bloque B4: atención social y sus tres gestiones | 3 sep | A | ✅ `v0.12.0` |
| Bloque B5: la solicitud del vecino en el tubo | 3 sep | A | ✅ `v0.13.0` |
| Motor de cumplimiento por funcionario | 4 sep | A | ✅ |
| Bloque C: el dashboard sobre el motor v2 | 4 sep | A | ✅ `v0.14.0` |
| Control de actividad de usuarios | 6 sep | A | ✅ `v0.15.0` |
| Seed de datos ficticios | 6 sep | A | ✅ |
| API de ausencias, catálogos y parámetros | 3 nov | A | ⏳ |
| API de ajustes por felicitación y reclamo (RF-025) | 10 nov | A | ⏳ |
| Tablero personal del funcionario (RF-028) | 10 nov | B | ⏳ |
| Vista global por cargos (RF-031) | 10 nov | B | ⏳ |
| Exportación de informes (RF-033) | 10 nov | B | ⏳ |
| Comentarios sobre una actividad (RF-035) | 10 nov | A | ⏳ |
| Alertas de inactividad (RF-037) | 17 nov | B | ⏳ |

### Pruebas

| Tarea | Vence | Resp. | Estado |
|---|---|---|---|
| Verificador de RUT (`npm run verificar:rut`) | 1 sep | A | ✅ |
| Verificador de los mockups sin red (`npm run verificar:mockups`) | 2 sep | A | ✅ |
| Verificador de integración del backend (`npm run smoke`, 21) | 6 sep | A | ✅ |
| Verificador de la API del modelo v2 (`npm run verificar:api`, 191) | 6 sep | A | ✅ |
| Verificador del motor de cumplimiento (`npm run verificar:calculo`, 37) | 6 sep | A | ✅ |
| Verificador de contraste y tokens (`npm run verificar:contraste`, 83) | 6 sep | A | ✅ |
| Capturas de contraste con las seis cuentas | 6 sep | A | ✅ |
| Pruebas unitarias del backend (Jest) | 27 oct | A | ⏳ |
| Integrar los verificadores en CI | 27 oct | A | ⏳ |
| Pruebas de componentes del frontend (RTL) | 3 nov | B | ⏳ |
| Pruebas de integración extremo a extremo | 17 nov | Ambos | ⏳ |
| Pruebas de seguridad | 17 nov | A | ⏳ |
| Pruebas de carga y rendimiento | 17 nov | B | ⏳ |
| Pruebas de usabilidad con usuarios reales | 24 nov | Ambos | ⏳ |
| Corrección de hallazgos | 1 dic | Ambos | ⏳ |

**Las cuatro que suman 332**: 21 (smoke) + 191 (API v2) + 37 (cálculo) + 83 (contraste). Corren a mano hoy; llevarlas a CI es la tarea del sprint 3.

### Piloto e implementación

| Tarea | Vence | Resp. | Estado |
|---|---|---|---|
| Docker Compose de producción | 27 oct | A | ⏳ |
| CI/CD con GitHub Actions y ghcr.io | 3 nov | A | ⏳ |
| VPS con reverse proxy, HTTPS y firewall | 10 nov | B | ⏳ |
| Respaldos y prueba de restauración | 17 nov | B | ⏳ |
| Manual de usuario simplificado | 24 nov | B | ⏳ |
| Capacitación a la delegación piloto | 1 dic | Ambos | ⏳ |
| Ejecución del piloto | 8 dic | Ambos | ⏳ |
| Retroalimentación del piloto y ajustes | 8 dic | Ambos | ⏳ |
| Manual técnico y de despliegue | 9 dic | A | ⏳ |
| Presentación y entrega final | 10 dic | Ambos | ⏳ |

## Ruta crítica y dependencias

La ruta crítica **cambió**. En agosto pasaba por la parametrización que el cliente debía enviar; hoy pasa por la evaluación del 15 de septiembre.

```
Entrega de Análisis y Diseño (15 sep)
        ↓
Validación de requisitos con los PO (22 sep)
        ↓
Plan de pruebas (13 oct) → Pruebas en marco formal y CI (27 oct)
        ↓
RF pendientes: ajustes, tablero personal, exportación, comentarios, alertas (10 nov)
        ↓
Docker de producción + VPS (10 nov)
        ↓
Pruebas de integración, seguridad y usabilidad (24 nov)
        ↓
Piloto (8 dic) → Entrega final (10 dic)
```

**Ya no hay ninguna tarea bloqueada por el cliente.** Los catálogos, códigos y fórmulas se extrajeron de las capturas de la planilla en producción ([estructura-planilla-real.md](estructura-planilla-real.md)) y viven en `CatalogoItem`; falta la confirmación formal, que es una consulta abierta, no un bloqueo.

**El riesgo real de este sprint es otro**: de los 100 puntos de la evaluación del 15 de septiembre, **85 dependen de artefactos de análisis y diseño**, y solo 10 del software, que es lo único terminado. El detalle criterio por criterio está en [plan-entrega-15-septiembre.md](plan-entrega-15-septiembre.md).
