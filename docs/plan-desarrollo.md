# Plan de desarrollo — Matriz SGR

**Equipo**: Origami SpA (2 personas) · **Plan en Planner**: `DesarrolloSW-MuniLS-OrigamiSpA`
**Actualizado**: 26 de agosto de 2026

Este documento es la vista humana del plan; la fuente cargable es [plan-desarrollo.csv](plan-desarrollo.csv), que se sube con [`scripts/cargar-plan-planner.ps1`](../scripts/cargar-plan-planner.ps1). Las fechas son **editables**: se cambian en el CSV y se recarga, o se arrastran directamente en Planner.

## Cómo cargarlo

👉 **Paso a paso detallado en [guia-cargar-planner.md](guia-cargar-planner.md)** (incluye qué esperar en pantalla y los errores frecuentes).

Resumen para quien ya conoce PowerShell, desde la raíz del repositorio:

```powershell
# 1. Una sola vez: módulos y permiso de ejecución en esta sesión
Install-Module Microsoft.Graph.Authentication, Microsoft.Graph.Planner -Scope CurrentUser -Force
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

# 2. Simular primero (no escribe nada, muestra qué crearía)
.\scripts\cargar-plan-planner.ps1 -SoloSimular

# 3. Cargar de verdad (los correos son opcionales, para asignar responsables)
.\scripts\cargar-plan-planner.ps1 -EmailA tu@correo.cl -EmailB companero@correo.cl
```

El script solo pide el permiso `Tasks.ReadWrite`, que un usuario normal puede aprobar por sí mismo, y es re-ejecutable: omite las tareas que ya existen, así que después de editar el CSV se puede volver a correr para agregar solo lo nuevo.

## Reparto de trabajo

Dos personas, con especialización parcial para no pisarse:

| | Foco principal |
|---|---|
| **A** | Backend, base de datos, cálculo del cumplimiento, seguridad, CI/CD |
| **B** | Frontend, documentación formal, pruebas, infraestructura del piloto |
| **Ambos** | Reuniones con el cliente y los PO, integración, pruebas de usabilidad, piloto |

Ajustable: la columna `Responsable` del CSV acepta `A`, `B` o `Ambos`.

## Calendario por sprints

Sprints de dos semanas. Considera los feriados chilenos del período (18–19 sep Fiestas Patrias, 12 oct, 31 oct, 1 nov, 8 dic).

| Sprint | Fechas | Foco |
|---|---|---|
| **0** (hecho) | 11 – 25 ago | Ámbito, levantamiento con el cliente, documentación base |
| **1** | 26 ago – 8 sep | Cerrar entregables formales de Ámbito y arrancar Requisitos |
| **2** | 9 – 22 sep | Requisitos no funcionales, trazabilidad, validación con PO ⚠ semana del 18 |
| **3** | 23 sep – 6 oct | Diseño: modelo de datos v2, wireframes pendientes, plan de pruebas |
| **4** | 7 – 20 oct | Desarrollo del modelo por funcionario y ficha de solicitud |
| **5** | 21 oct – 3 nov | Evidencias y aprobación; en paralelo, Docker producción y CI/CD |
| **6** | 4 – 17 nov | Integración, pruebas de seguridad, carga; VPS y respaldos |
| **7** | 18 nov – 1 dic | Usabilidad, corrección de hallazgos, manuales, capacitación |
| **Cierre** | 2 – 12 dic | Piloto, ajustes, documentación final y entrega |

**Nota importante sobre el adelanto**: gran parte de Desarrollo ya está construida (fases 1 a 4 del proyecto: backend completo, tubo de trabajo, dashboard BI). El plan refleja eso con tareas al 100%. El trabajo real que queda se concentra en **lo que el cliente aún no define**, **pruebas** y **puesta en producción**.

## Tareas por bucket

Leyenda de estado: ✅ Completado · ⏳ Pendiente · ⛔ Bloqueado por el cliente

### Ámbito

| Tarea | Vence | Resp. | Estado |
|---|---|---|---|
| Reunión de levantamiento con el cliente | 25 ago | Ambos | ✅ |
| Documento maestro del proyecto | 25 ago | A | ✅ |
| Procesar transcripción y clasificar requerimientos | 26 ago | A | ✅ |
| Definir restricciones (costo cero y stack) | 25 ago | Ambos | ✅ |
| Acta de constitución y alcance | 4 sep | B | ⏳ |
| Definir roles del equipo y canal con los PO | 1 sep | Ambos | ⏳ |
| Registro de riesgos y supuestos | 8 sep | B | ⏳ |
| Recibir parametrización de columnas del cliente | 15 sep | A | ⛔ |

### Requisitos de análisis o software

| Tarea | Vence | Resp. | Estado |
|---|---|---|---|
| Diagrama de contexto y actores | 25 ago | A | ✅ |
| Casos de uso por actor | 25 ago | A | ✅ |
| Historias de usuario con criterios de aceptación | 25 ago | A | ✅ |
| Modelo entidad-relación inicial | 25 ago | A | ✅ |
| Backlog priorizado del producto | 25 ago | A | ✅ |
| Especificación de requisitos no funcionales | 15 sep | B | ⏳ |
| Matriz de trazabilidad requisitos–historias–pruebas | 22 sep | B | ⏳ |
| Historias del modelo por funcionario | 22 sep | A | ⛔ |
| Validación de requisitos con los PO | 22 sep | Ambos | ⏳ |

### Diseño

| Tarea | Vence | Resp. | Estado |
|---|---|---|---|
| Sistema de diseño visual (DESIGN.md) | 25 ago | A | ✅ |
| Arquitectura de solución y despliegue | 25 ago | A | ✅ |
| Diseño de la API REST y contrato de eventos | 25 ago | A | ✅ |
| Diagrama de secuencia del tiempo real | 25 ago | A | ✅ |
| Diseño de seguridad: roles y multi-tenancy | 26 ago | A | ✅ |
| Modelo de datos v2 (asistencia, evidencias, solicitudes) | 6 oct | A | ⛔ |
| Wireframes de pantallas pendientes | 6 oct | B | ⏳ |
| Plan de pruebas (estrategia y casos) | 13 oct | B | ⏳ |

### Desarrollo

| Tarea | Vence | Resp. | Estado |
|---|---|---|---|
| Repositorio, Docker y PostgreSQL | 25 ago | A | ✅ |
| Autenticación JWT, bcrypt y roles | 25 ago | A | ✅ |
| CRUD de unidades, categorías, tareas y metas | 25 ago | A | ✅ |
| Socket.io con rooms, presencia y rate limiting | 25 ago | A | ✅ |
| Cumplimiento ponderado y job de recálculo | 26 ago | A | ✅ |
| Frontend: autenticación, layout y tema | 25 ago | A | ✅ |
| Tubo de trabajo con drag and drop y tiempo real | 25 ago | A | ✅ |
| Dashboard BI con ECharts | 26 ago | A | ✅ |
| Formulario de nueva tarea | 26 ago | A | ✅ |
| Modelo por funcionario (metas y asistencia) | 20 oct | A | ⛔ |
| Ficha de solicitud con RUT y trazabilidad | 20 oct | B | ⛔ |
| Evidencias fotográficas con código verificador | 3 nov | B | ⛔ |
| Flujo de aprobación del supervisor | 3 nov | A | ⛔ |
| Felicitaciones y reclamos ponderados | 10 nov | A | ⛔ |
| Indicador de último ingreso y alertas | 17 nov | B | ⏳ |

### Pruebas

| Tarea | Vence | Resp. | Estado |
|---|---|---|---|
| Pruebas unitarias del backend (Jest) | 27 oct | A | ⏳ |
| Pruebas de componentes del frontend (RTL) | 3 nov | B | ⏳ |
| Integrar el smoke test en CI | 27 oct | A | ⏳ |
| Pruebas de integración extremo a extremo | 17 nov | Ambos | ⏳ |
| Pruebas de seguridad | 17 nov | A | ⏳ |
| Pruebas de carga y rendimiento | 17 nov | B | ⏳ |
| Pruebas de usabilidad con usuarios reales | 24 nov | Ambos | ⏳ |
| Corrección de hallazgos | 1 dic | Ambos | ⏳ |

### Piloto e implementación

| Tarea | Vence | Resp. | Estado |
|---|---|---|---|
| Docker Compose de producción | 27 oct | A | ⏳ |
| CI/CD con GitHub Actions y ghcr.io | 3 nov | A | ⏳ |
| VPS con reverse proxy, HTTPS y firewall | 10 nov | B | ⏳ |
| Respaldos y prueba de restauración | 17 nov | B | ⏳ |
| Manual de usuario simplificado | 24 nov | B | ⏳ |
| Manual técnico y de despliegue | 9 dic | A | ⏳ |
| Capacitación a la delegación piloto | 1 dic | Ambos | ⏳ |
| Ejecución del piloto | 8 dic | Ambos | ⏳ |
| Retroalimentación del piloto y ajustes | 8 dic | Ambos | ⏳ |
| Presentación y entrega final | 10 dic | Ambos | ⏳ |

## Ruta crítica y dependencias

```
Parametrización del cliente (15 sep)
        ↓
Historias del modelo por funcionario (22 sep)
        ↓
Modelo de datos v2 (6 oct)
        ↓
Modelo por funcionario + Ficha de solicitud (20 oct)
        ↓
Evidencias + Aprobación del supervisor (3 nov)
        ↓
Pruebas de integración y usabilidad (24 nov)
        ↓
Piloto (8 dic) → Entrega (10 dic)
```

**Seis tareas de Desarrollo están bloqueadas** por la parametrización de columnas que el cliente debe enviar vía los profesores. Si no llega antes del **15 de septiembre**, la ruta crítica se corre y hay que decidir con los PO: reducir alcance (entregar el sistema sin la ficha de solicitud de vecino) o mover la fecha del piloto.

Mientras tanto **no hay tiempo muerto**: los sprints 1 a 3 están llenos de trabajo que no depende del cliente (entregables formales de Ámbito y Requisitos, plan de pruebas, wireframes) y la infraestructura del piloto (Docker producción, CI/CD, VPS) tampoco depende de él, por lo que puede adelantarse si el bloqueo se extiende.
