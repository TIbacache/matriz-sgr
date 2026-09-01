# Documento Maestro — Proyecto Matriz SGR

**Versi贸n**: 1.0  
**Fecha**: 25 de agosto de 2026  
**Estado**: ⚠ **DOCUMENTO HISTÓRICO — SUPERADO EN PARTE**

> **Nota de vigencia (31-08-2026)**: este documento se redactó *antes* de que los profesores entregaran la especificación formal. Sigue siendo válido como visión, arquitectura y stack, pero **donde contradiga al PDF oficial, manda el PDF**.
>
> **La especificación vigente es [docs/requerimientos-oficiales.md](docs/requerimientos-oficiales.md)** (38 RF, 18 RNF, 13 reglas de negocio, 10 criterios de aceptación y 31 historias), complementada por [docs/estructura-planilla-real.md](docs/estructura-planilla-real.md).
>
> Puntos de este documento **corregidos** por la especificación oficial:
> - **Semáforo**: aquí se propuso verde ≥80% / amarillo 50-79% / rojo <50%. Lo correcto es **verde ≥ objetivo al día · ámbar ≥ 60% del objetivo y < objetivo · rojo < 60% del objetivo** (RN-008, verificado con los datos reales de la planilla).
> - **Unidad de medición**: aquí era la delegación. En realidad es **el funcionario** (cargo → ítems → metas); la delegación es la consolidación.
> - **Período**: aquí se asumía "trimestre" fijo. Debe ser **configurable con fecha de inicio y término**, y está prohibido fijar 90/91 días en el código.
> - **Faltaban por completo**: el eje actividad → código → evidencia → validación → puntaje, la auditoría con valor anterior/nuevo, el versionado de parámetros y los roles **Verificador** y **Usuario de consulta**.
> - **Los 4 pilares** no son la estructura de medición: son áreas. Lo que se mide son los **ítems por cargo** (ver estructura-planilla-real §9).

---

## 1. Contexto y problema de negocio

### Objetivo general

Implementar un modelo de gesti贸n que mejore la eficiencia de las delegaciones municipales (o unidades territoriales equivalentes en empresas) mediante seguimiento de tareas, detecci贸n de cuellos de botella y aumento de la satisfacci贸n del usuario, reduciendo la tasa de reclamos que llega a la alcald铆a o direcci贸n general.

### Problema actual

- El 65% del tiempo del jefe de gabinete y el 30% de la alcaldesa se consume en reclamos menores que podr铆an resolverse a nivel territorial.
- No existe estandarizaci贸n entre delegaciones, ni herramienta de seguimiento de tareas, ni medici贸n de resultados de gesti贸n.
- Los vecinos sienten que sus necesidades no son tomadas en cuenta, lo que genera m谩s molestias y presi贸n sobre la autoridad m谩xima.

### Soluci贸n propuesta

Un sistema multi-tenant (una sola instancia para m煤ltiples municipalidades/empresas) que permita:

- Estandarizar la estructura de delegaciones/unidades territoriales.
- Definir puntos de inter茅s medibles (categor铆as de gesti贸n configurables).
- Gestionar tareas en un "tubo de trabajo" tipo kanban con drag and drop.
- Medir metas trimestrales con cumplimiento ponderado.
- Visualizar sem谩foros de cumplimiento por 谩rea y por delegaci贸n.
- Generar dashboards con heatmaps, KPIs y gr谩ficos de avance.

---

## 2. Arquitectura t茅cnica final

### Arquitectura elegida: **Arquitectura B (Socket.io puro)**

**Decisi贸n**: Aunque la Arquitectura A (h铆brida con Supabase Realtime) es m谩s simple y robusta para producci贸n, el profesor solicit贸 expl铆citamente usar Socket.io como ejercicio acad茅mico. A la escala del proyecto (6 delegaciones, ~20-100 usuarios simult谩neos), Socket.io funciona bien sin limitaciones de rendimiento.

### Stack completo

| Capa | Tecnolog铆a |
|---|---|
| Frontend | React + TypeScript + CSS3 |
| Drag and drop | dnd-kit (no react-beautiful-dnd, deprecado) |
| Visualizaci贸n/BI | Apache ECharts (via `echarts-for-react`) |
| Backend | Node.js + Express + Socket.io |
| Base de datos | PostgreSQL (contenedor Docker propio) |
| ORM | Prisma o Sequelize |
| Autenticaci贸n | JWT + bcrypt (implementaci贸n propia) |
| Orquestaci贸n | Docker + Docker Compose |
| CI/CD | GitHub Actions + GitHub Container Registry (ghcr.io) |
| Despliegue | VPS (8 GB RAM, 4 vCPU, 40 GB NVMe) |
| Reverse proxy | Caddy o Nginx + Let's Encrypt |
| Gesti贸n de proyecto | Microsoft Planner (integrado con dominio universitario) |
| Entorno de desarrollo | Visual Studio Code + Claude Code (modo agente) |

### Diagrama de arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│ GitHub → GitHub Actions → ghcr.io → deploy SSH                │
└───────────────────────────┬────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ VPS (Docker Compose)                                           │
│ Caddy/Nginx (HTTPS)                                             │
│  ├── app.dominio.cl → Frontend                                  │
│  └── api.dominio.cl → Node.js/Express + Socket.io               │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ Frontend React + TS + CSS3                                │    │
│ │  ├── dnd-kit → drag & drop del tubo de trabajo             │    │
│ │  ├── echarts-for-react → heatmaps, gauges, KPIs, radar     │    │
│ │  ├── axios/fetch → API REST propia                         │    │
│ │  └── socket.io-client → todo el tiempo real (datos+presencia)│  │
│ └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ Servidor Node.js + Express + Socket.io                    │    │
│ │  ├── API REST (CRUD tareas, metas, unidades)               │    │
│ │  ├── Auth propia (JWT + bcrypt, roles en middleware)       │    │
│ │  ├── Prisma/Sequelize (ORM)                                │    │
│ │  ├── Job cron → recalcula vistas de cumplimiento ponderado │    │
│ │  └── Emite eventos manuales tras cada write (io.emit)      │    │
│ └───────────────────────┬─────────────────────────────────┘    │
│                          ▼                                       │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ Postgres (contenedor propio)                               │    │
│ │  - Sin RLS autom谩tica; permisos verificados en Express      │    │
│ │  - Vistas materializadas de cumplimiento (cron manual)      │    │
│ └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### Modelo de datos multi-tenant

```sql
organizations
  id, nombre, tipo (municipio/empresa), configuracion_terminologia (jsonb)

organization_members
  id, organization_id, user_id, rol (admin/supervisor/gerente/usuario)

unidades_territoriales   -- antes "delegaciones"
  id, organization_id, nombre, responsable_id

categorias_gestion       -- antes "los 4 pilares", ahora configurable
  id, organization_id, nombre, orden_prioridad

tareas (tubo de trabajo)
  id, organization_id, unidad_territorial_id, categoria_id, estado, fecha_compromiso, responsable_id

metas
  id, organization_id, unidad_territorial_id, categoria_id, meta_trimestre, avance, ponderador

-- Vistas materializadas (recalculadas por cron job)
cumplimiento_ponderado_vista
  organization_id, unidad_territorial_id, categoria_id, cumplimiento_total, semaforo_color
```

**Nota**: Cada tabla lleva `organization_id` para aislamiento multi-tenant. La seguridad se verifica en el middleware de Express, no en la base de datos (no hay RLS autom谩tica como en Supabase).

---

## 3. Funcionalidades clave

### 3.1 Tubo de trabajo (kanban con drag and drop)

- Columnas: Pendiente, En proceso, Realizado (configurables).
- Drag and drop con **dnd-kit** (no react-beautiful-dnd, deprecado y sin soporte t谩ctil).
- Al soltar una tarjeta, se dispara un `UPDATE` en la tabla `tareas` y se emite un evento Socket.io para sincronizar a todos los conectados.
- Actualizaci贸n optimista: la tarjeta se mueve visualmente al instante, y si el `UPDATE` falla, se revierte y se muestra un aviso.

### 3.2 Sem谩foro de cumplimiento

- Gauge charts con ECharts para visualizar el estado (verde/amarillo/rojo) por 谩rea/delegaci贸n.
- C谩lculo de cumplimiento ponderado: metas trimestrales 脳 ponderador 脳 avance real.
- Tabla con columnas: 脕rea, Responsable, Licencia, Vacaciones, Compensatorios, D铆as totales, Objetivo al d铆a, Avance, Color de sem谩foro.

### 3.3 Heatmaps y KPIs

- Heatmap matrix (ECharts) para ver qu茅 combinaci贸n territorio-categor铆a tiene m谩s reclamos o menor cumplimiento.
- Gr谩ficos de barras/l铆neas para comparar meta vs. avance real por 铆tem.
- Radar chart para comparar los 4 pilares entre delegaciones.

### 3.4 Presencia en vivo (Efecto Hawthorne)

- Socket.io rooms por unidad territorial.
- Al conectar, el usuario reporta "estoy en l铆nea" en su delegaci贸n.
- Los delegados ven en tiempo real qui茅nes est谩n conectados y trabajando.

---

## 4. Roles y permisos

| Rol | Permisos |
|---|---|
| **Admin** | Acceso total a todas las organizaciones, puede editar configuraci贸n global, ver todos los libros, editar campos bloqueados. |
| **Supervisor** | Ve todas las delegaciones de una organizaci贸n, edita metas y ponderadores, ve sem谩foros consolidados. |
| **Gerente (Delegado)** | Ve y edita solo su delegaci贸n, puede ver libros de otras delegaciones (lectura), coordina el tubo de trabajo semanal. |
| **Usuario (Funcionario)** | Ve y edita solo sus propias tareas, reporta avances, no ve otras delegaciones. |

**Nota**: Esta matriz puede ajustarse cuando el profesor entregue la definici贸n final de roles.

---

## 5. Dise帽o visual (no gen茅rico, no "AI slop")

### Qu茅 evitar expl铆citamente

- Fuente Inter como 煤nica tipograf铆a.
- Gradiente morado-azul o beige/crema con acento naranja.
- Tarjetas redondeadas anidadas sin jerarqu铆a visual.
- 脥conos decorativos sin prop贸sito, emojis de "sparkle".
- Componentes de librer铆a sin personalizaci贸n (el "test del componente por defecto").

### Qu茅 usar en su lugar

**Tipograf铆a**:
- T铆tulos: **Space Grotesk** o **GT America** (tiene car谩cter sin ser informal).
- Cuerpo: **Public Sans** o **IBM Plex Sans** (legibles, no Inter).
- Alternativa: serif revival para headings + sans-serif limpia para cuerpo.

**Paleta**:
- Construir alrededor del sistema de sem谩foros (rojo/amarillo/verde) como elemento central de identidad.
- Evitar el "tech blue" gen茅rico de dashboards SaaS.
- Usar combinaciones inesperadas con intenci贸n (ej. morado-lima, verde-coral) si se requiere color adicional.

**Jerarqu铆a**:
- Definir radios de borde, sombras y espaciado en un archivo `DESIGN.md` que Claude Code debe seguir estrictamente.
- Incluir ejemplos de referencia y una lista de "qu茅 NO usar" en el prompt.

---

## 6. Flujo de trabajo y metodolog铆a

### Enfoque: 脕gil iterativo (no waterfall)

No esperar a que los profesores definan todos los detalles antes de empezar. Con el 70% del contexto ya definido, se puede avanzar en:

1. **Diagrama de contexto y actores** — qui茅nes interact煤an con el sistema.
2. **Casos de uso** — qu茅 puede hacer cada actor.
3. **Historias de usuario** — formato "Como [rol], quiero [acci贸n], para [beneficio]" con criterios de aceptaci贸n.
4. **Diagrama entidad-relaci贸n (ERD)** — esqueleto de tablas ya definido, ajustable cuando lleguen columnas exactas.
5. **Wireframes/mockups** — pantallas clave (tubo con drag and drop, dashboard con heatmaps, sem谩foro).
6. **Backlog priorizado en Microsoft Planner** — dividido en 茅picas y sprints.

### Gesti贸n de proyecto

- **Microsoft Planner** (integrado con dominio universitario) para seguimiento con el profesor.
- Claude Code debe poder crear tareas/historias directamente en Planner v铆a Microsoft Graph API (o MCP de Microsoft 365 si est谩 disponible).

---

## 7. Pr贸ximos pasos inmediatos

1. **Armar diagramas de casos de uso** con los actores ya identificados (admin, supervisor, gerente, usuario).
2. **Redactar primer lote de historias de usuario** (5-10 茅picas principales) con criterios de aceptaci贸n.
3. **Documentar ERD inicial** (tablas ya definidas, dejar abierto para columnas exactas cuando el profesor las env铆e).
4. **Crear archivo `DESIGN.md`** con especificaci贸n visual expl铆cita (tipograf铆as, paleta, jerarqu铆a, "qu茅 NO usar").
5. **Preparar prompt de arranque para Claude Code** (integrando todo lo anterior + Jira/Planner + VS Code).

---

## 8. Elementos guardados para el prompt final de Claude Code

- **Gesti贸n de proyecto**: Microsoft Planner (dominio universitario).
- **Entorno**: VS Code + Claude Code (modo agente).
- **Integraci贸n**: Claude Code debe crear tareas/historias en Planner v铆a Graph API.
- **Stack**: React + TS + CSS3, Node.js + Express + Socket.io, PostgreSQL, dnd-kit, ECharts, Docker, GitHub Actions, VPS.
- **Modelo**: Multi-tenant con `organization_id` y terminolog铆a configurable.
- **Dise帽o**: No gen茅rico, especificado en `DESIGN.md` (tipograf铆as nombradas, paleta, jerarqu铆a, prohibiciones expl铆citas).
- **Metodolog铆a**: 脕gil iterativo, empezar con diagramas/casos de uso/historias, luego dise帽o, desarrollo, testing.

---

## 9. Consideraciones de seguridad y producci贸n

### Autenticaci贸n en Socket.io

- Validar JWT en el handshake, antes de aceptar cualquier evento.
- Rechazar conexiones sin token v谩lido.
- No confiar en el socket por defecto.

### Broadcast manual y centralizado

- Cada write en la base de datos debe emitir su propio evento Socket.io.
- Centralizar la l贸gica de broadcast en una sola funci贸n de servicio (no repetir en cada controlador).
- Si un endpoint nuevo no emite evento, ese cambio queda "mudo" para otros usuarios.

### Reconexi贸n y p茅rdida de eventos

- Los delegados en terreno tendr谩n cortes de red constantes.
- Socket.io reconecta autom谩ticamente, pero se debe implementar un mecanismo de "recuperaci贸n": al reconectar, volver a pedir el estado completo del tubo en vez de solo esperar el pr贸ximo evento.

### Rooms por unidad territorial

- Separar las salas de Socket.io por delegaci贸n para no reenviar cada evento a todos los usuarios de las 6 unidades.
- Si no se hace bien desde el dise帽o, luego es m谩s dif铆cil de refactorizar.

### Rate limiting y l铆mite de payload

- Limitar mensajes por segundo por socket.
- Limitar el tama帽o m谩ximo de cada mensaje.
- Evita que un cliente con errores en bucle sature el servidor.

---

## 10. Estrategia de despliegue

### VPS recomendado

- **M铆nimo**: 8 GB RAM, 4 vCPU, 40 GB NVMe.
- **Proveedor**: Hetzner, DigitalOcean o Vultr (desde ~10-25 USD/mes).
- **SO**: Ubuntu 22.04 LTS o similar.

### Docker Compose

- Un `docker-compose.yml` para el backend (Node.js + Express + Socket.io).
- Un `docker-compose.yml` para PostgreSQL (con volumen persistente).
- Un `docker-compose.yml` para Caddy/Nginx (reverse proxy + HTTPS).
- Todos los contenedores en una red Docker compartida.

### CI/CD con GitHub Actions

- Workflow que se dispara con cada push a `main`.
- Build de la imagen Docker del frontend y backend.
- Push a GitHub Container Registry (ghcr.io).
- SSH al VPS con llave privada guardada como secret.
- Ejecutar `docker compose pull && docker compose up -d`.
- Health check post-despliegue; rollback autom谩tico si falla.

### Backups

- `pg_dumpall` programado cada noche.
- Guardar backups fuera del mismo VPS (otro proveedor de almacenamiento).
- Probar restauraci贸n al menos una vez al mes en un contenedor descartable.

---

**Fin del documento maestro**