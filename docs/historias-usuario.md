# Historias de usuario — Matriz SGR

**Versión**: 1.0 · **Fecha**: 25 de agosto de 2026
Formato: "Como [rol], quiero [acción], para [beneficio]" + criterios Given/When/Then.
Prioridad: **P1** = MVP obligatorio · **P2** = segunda iteración · **P3** = deseable.

---

## Épica E1 — Autenticación y multi-tenancy

### HU-1.1 (P1) Inicio de sesión
**Como** funcionario de cualquier rol, **quiero** iniciar sesión con email y contraseña, **para** acceder solo a los datos de mi organización.

- **Dado** un usuario registrado, **cuando** envía credenciales válidas a `POST /auth/login`, **entonces** recibe un JWT con `user_id`, `organization_id` y `rol`, con expiración definida.
- **Dado** una contraseña incorrecta, **cuando** intenta iniciar sesión, **entonces** recibe 401 con mensaje genérico (sin revelar si el email existe).
- **Dado** un JWT expirado o ausente, **cuando** llama a cualquier endpoint protegido o abre el handshake de Socket.io, **entonces** la conexión se rechaza.

### HU-1.2 (P1) Aislamiento por organización
**Como** admin de la plataforma, **quiero** que cada consulta filtre por `organization_id` en el middleware, **para** que ningún tenant vea datos de otro.

- **Dado** un usuario de la organización A, **cuando** solicita una tarea de la organización B por ID directo, **entonces** recibe 404 (no 403, para no revelar existencia).
- **Dado** cualquier endpoint de escritura, **cuando** el payload trae un `organization_id` distinto al del token, **entonces** la petición se rechaza.

### HU-1.3 (P2) Terminología configurable
**Como** admin, **quiero** configurar la terminología del tenant (delegación/sucursal, alcaldesa/gerenta general, pilares/categorías), **para** que el sistema sirva a municipios y empresas.

- **Dado** una organización tipo "empresa", **cuando** el admin guarda `configuracion_terminologia`, **entonces** el frontend muestra esos términos en menús, títulos y dashboards sin redeploy.

---

## Épica E2 — Estructura organizacional

### HU-2.1 (P1) Gestionar unidades territoriales
**Como** supervisor, **quiero** crear y editar unidades territoriales con su responsable, **para** estandarizar la estructura de delegaciones.

- **Dado** un supervisor autenticado, **cuando** crea una unidad con nombre y responsable, **entonces** la unidad queda disponible en tubo, metas y dashboards.
- **Dado** un gerente o usuario, **cuando** intenta crear/editar unidades, **entonces** recibe 403.

### HU-2.2 (P1) Gestionar categorías de gestión
**Como** supervisor, **quiero** definir las categorías de gestión (los "pilares") con orden de prioridad, **para** medir lo que la organización decida.

- **Dado** un supervisor, **cuando** crea/reordena categorías, **entonces** kanban, metas y heatmap reflejan el nuevo orden.

---

## Épica E3 — Tubo de trabajo (kanban)

### HU-3.1 (P1) Mover tarea con drag & drop en tiempo real
**Como** delegado, **quiero** arrastrar una tarea de "Pendiente" a "En proceso", **para** actualizar su estado y que toda mi delegación vea el cambio al instante.

- **Dado** el tablero de mi delegación, **cuando** suelto una tarjeta en otra columna, **entonces** la tarjeta se mueve al instante (optimista) y se envía `PATCH /tareas/:id`.
- **Dado** que el PATCH falla, **cuando** llega el error, **entonces** la tarjeta vuelve a su columna original y se muestra un toast de error.
- **Dado** otro usuario conectado a la misma unidad (room de Socket.io), **cuando** el UPDATE se confirma, **entonces** su tablero se actualiza en < 1s sin recargar.
- **Dado** un usuario de otra delegación, **cuando** ocurre el cambio, **entonces** NO recibe el evento (rooms aislados).

### HU-3.2 (P1) Crear y asignar tareas
**Como** delegado, **quiero** crear tareas con categoría, fecha compromiso y responsable, **para** coordinar el trabajo semanal de mi unidad.

- **Dado** el formulario de tarea, **cuando** guardo con campos obligatorios (título, categoría, unidad), **entonces** la tarjeta aparece en "Pendiente" para todos los conectados de la unidad.
- **Dado** una fecha compromiso vencida, **cuando** se renderiza la tarjeta, **entonces** la fecha se muestra en rojo (`--estado-rojo`).

### HU-3.3 (P1) Alcance por rol en el tubo
**Como** funcionario, **quiero** mover solo mis propias tareas, **para** respetar la matriz de permisos.

- **Dado** un usuario rol "usuario", **cuando** intenta mover una tarea de otro responsable, **entonces** el backend responde 403 y el frontend revierte.
- **Dado** un gerente, **cuando** abre el tablero de otra delegación, **entonces** lo ve en modo solo lectura (drag deshabilitado).

### HU-3.4 (P2) Recuperación tras reconexión
**Como** delegado en terreno con señal inestable, **quiero** que al reconectarse el sistema recargue el estado completo del tubo, **para** no quedar con un tablero desactualizado.

- **Dado** una desconexión de Socket.io, **cuando** el cliente reconecta, **entonces** solicita `GET /tareas?unidad=X` completo y reemplaza el estado local antes de volver a escuchar eventos.

---

## Épica E4 — Metas y cumplimiento ponderado

### HU-4.1 (P1) Definir metas trimestrales con ponderadores
**Como** supervisor, **quiero** fijar metas por unidad y categoría con un ponderador, **para** que el cumplimiento refleje las prioridades.

- **Dado** el formulario de metas, **cuando** guardo metas cuyo conjunto de ponderadores de una unidad no suma 1 (100%), **entonces** el sistema lo advierte y no permite guardar.
- **Dado** un gerente o usuario, **cuando** intenta editar metas o ponderadores, **entonces** recibe 403.

### HU-4.2 (P1) Cálculo de cumplimiento ponderado
**Como** supervisor, **quiero** que el sistema calcule `Σ(avance/meta × ponderador)` por unidad, **para** comparar delegaciones con una sola cifra.

- **Dado** metas con avance registrado, **cuando** corre el cron de recálculo, **entonces** la vista materializada se refresca y expone `cumplimiento_total`, `objetivo_al_dia`, `avance_relativo` y `semaforo_color` (tope 150% por ítem).
- **Dado** el avance relativo al objetivo del día, **cuando** es ≥ 100% / 60–99% / < 60%, **entonces** el color es verde / naranjo / rojo (umbrales del cliente, reunión 00:48:16).

### HU-4.3 (P2) Reportar avance
**Como** funcionario, **quiero** registrar el avance de mis ítems de meta, **para** que el semáforo refleje la realidad sin esperar a la reunión semanal.

- **Dado** un avance guardado, **cuando** el cron siguiente recalcula, **entonces** el dashboard del supervisor muestra el nuevo valor sin intervención manual.

---

## Épica E5 — Dashboards y BI

### HU-5.1 (P1) Semáforo por unidad (gauges)
**Como** supervisor, **quiero** ver un gauge por delegación con su color de semáforo, **para** detectar de un vistazo dónde intervenir.

- **Dado** `GET /kpis/cumplimiento`, **cuando** carga el dashboard, **entonces** se renderiza un gauge ECharts por unidad con el par color/fondo definido en DESIGN.md, en < 2s con 1000+ tareas.
- **Dado** la tabla de detalle, **cuando** se muestra, **entonces** incluye: Área, Responsable, Licencia, Vacaciones, Compensatorios, Días totales, Objetivo al día, Avance, Color.

### HU-5.2 (P1) Heatmap territorio × categoría
**Como** supervisor, **quiero** un heatmap con unidades en Y y categorías en X, **para** ubicar la combinación con peor cumplimiento o más reclamos.

- **Dado** el heatmap, **cuando** paso el cursor por una celda, **entonces** el tooltip muestra unidad, categoría, valor y color según la paleta secuencial de DESIGN.md.

### HU-5.3 (P2) Radar de pilares y tarjetas KPI
**Como** supervisor, **quiero** un radar que compare las categorías entre delegaciones y tarjetas KPI (tareas pendientes, cumplimiento promedio, delegaciones en rojo), **para** preparar el comité semanal en minutos.

- **Dado** el dashboard, **cuando** carga, **entonces** las tarjetas KPI muestran cifras con `tabular-nums` y variación vs. trimestre anterior.

---

## Épica E6 — Presencia en vivo (Efecto Hawthorne)

### HU-6.1 (P2) Ver quién está conectado
**Como** delegado, **quiero** ver en tiempo real qué funcionarios de mi unidad están en línea, **para** coordinar el trabajo del momento.

- **Dado** un usuario que conecta y autentica su socket, **cuando** entra al room de su unidad, **entonces** todos los del room ven su presencia en < 500ms.
- **Dado** una desconexión (cierre o pérdida de red), **cuando** el socket cae, **entonces** su indicador desaparece para el resto en < 500ms tras el timeout de Socket.io.
- **Dado** un socket sin JWT válido en el handshake, **cuando** intenta conectar, **entonces** se rechaza antes de aceptar cualquier evento.

---

## Épica E7 — Infraestructura y despliegue

### HU-7.1 (P1) Entorno local reproducible
**Como** desarrollador, **quiero** levantar todo con `docker compose up`, **para** que cualquier integrante del equipo trabaje igual.

- **Dado** un clon limpio del repo, **cuando** ejecuto compose con el `.env` de ejemplo, **entonces** frontend, backend y PostgreSQL quedan corriendo y las migraciones de Prisma aplicadas.

### HU-7.2 (P2) CI/CD a VPS
**Como** equipo, **queremos** que cada push a `main` construya imágenes, las publique en ghcr.io y despliegue por SSH al VPS con health check y rollback, **para** entregar sin pasos manuales.

- **Dado** un push a `main`, **cuando** el workflow termina, **entonces** el VPS corre la nueva versión o, si el health check falla, la versión anterior sigue activa.

### HU-7.3 (P3) Backups verificados
**Como** admin, **quiero** `pg_dumpall` nocturno con copia fuera del VPS y restauración probada mensualmente, **para** no descubrir en la emergencia que el backup no sirve.

---

## Épica E8 — Seguridad de tiempo real

### HU-8.1 (P2) Rate limiting y límites de payload
**Como** operador del sistema, **quiero** limitar mensajes por segundo (10/s por socket) y tamaño máximo (100KB), **para** que un cliente con errores en bucle no sature el servidor.

- **Dado** un socket que excede el límite, **cuando** envía el mensaje N+1 en el mismo segundo, **entonces** el mensaje se descarta y, si reincide, el socket se desconecta con motivo registrado.

### HU-8.2 (P1) Broadcast centralizado
**Como** desarrollador, **quiero** una única función `emitEvent(room, event, data)` usada por todos los controladores, **para** que ningún endpoint de escritura quede "mudo".

- **Dado** un endpoint nuevo de escritura, **cuando** pasa la revisión de código, **entonces** debe invocar `emitEvent` o justificar explícitamente por qué no emite.

---

## Resumen de priorización

| Prioridad | Historias |
|---|---|
| **P1 (MVP)** | 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3, 4.1, 4.2, 5.1, 5.2, 7.1, 8.2 |
| **P2** | 1.3, 3.4, 4.3, 5.3, 6.1, 7.2, 8.1 |
| **P3** | 7.3 |
