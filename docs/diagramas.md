# Diagramas — Matriz SGR

**Versión**: 1.0 · **Fecha**: 25 de agosto de 2026
Formato Mermaid: se renderiza directo en GitHub/VS Code (extensión Markdown Preview Mermaid).

---

## 1. Diagrama de contexto y actores

```mermaid
flowchart TB
    subgraph externos["Actores"]
        ADM["Admin<br/>(plataforma)"]
        SUP["Supervisor<br/>(alcaldía / gerencia general)"]
        GER["Gerente / Delegado<br/>(unidad territorial)"]
        USR["Usuario / Funcionario"]
    end

    subgraph sistema["Matriz SGR (multi-tenant)"]
        API["API REST<br/>Node.js + Express"]
        WS["Tiempo real<br/>Socket.io (rooms por unidad)"]
        BI["Dashboards BI<br/>ECharts"]
        CRON["Cron job<br/>recalcula cumplimiento ponderado"]
    end

    subgraph infra["Infraestructura"]
        PG[("PostgreSQL<br/>aislamiento por organization_id")]
        GH["GitHub Actions → ghcr.io → VPS"]
        PL["Microsoft Planner<br/>(Graph API)"]
    end

    ADM -->|configura organizaciones,<br/>terminología y roles| API
    SUP -->|define metas y ponderadores,<br/>ve semáforos consolidados| API
    GER -->|gestiona tubo de trabajo<br/>de su delegación| API
    USR -->|reporta avance de<br/>sus tareas| API

    API <--> PG
    API -->|emite eventos tras cada write| WS
    WS -->|sincroniza kanban y presencia| GER
    WS -->|sincroniza kanban y presencia| USR
    CRON --> PG
    BI -->|consume /kpis| API
    API -.->|crea/actualiza tareas de proyecto| PL
    GH -.->|despliega| sistema
```

---

## 2. Casos de uso por actor

```mermaid
flowchart LR
    ADM(["Admin"])
    SUP(["Supervisor"])
    GER(["Gerente/Delegado"])
    USR(["Usuario/Funcionario"])

    subgraph UC["Matriz SGR"]
        uc1(["Gestionar organizaciones<br/>y terminología por tenant"])
        uc2(["Gestionar miembros y roles"])
        uc3(["Configurar categorías de gestión<br/>y unidades territoriales"])
        uc4(["Definir metas trimestrales<br/>y ponderadores"])
        uc5(["Ver semáforo consolidado<br/>de todas las delegaciones"])
        uc6(["Ver dashboards<br/>(heatmap, KPIs, radar)"])
        uc7(["Gestionar tubo de trabajo<br/>(crear/asignar/mover tareas)"])
        uc8(["Ver libros de otras delegaciones<br/>(solo lectura)"])
        uc9(["Mover sus tareas y<br/>reportar avance"])
        uc10(["Ver presencia en vivo<br/>de su delegación"])
        uc11(["Autenticarse (JWT)"])
        uc12(["Editar campos bloqueados /<br/>configuración global"])
    end

    ADM --- uc1 & uc2 & uc12
    ADM --- uc5
    SUP --- uc3 & uc4 & uc5 & uc6
    GER --- uc7 & uc8 & uc10
    GER --- uc6
    USR --- uc9 & uc10
    ADM & SUP & GER & USR --- uc11
```

Notas de alcance por rol (resumen de la matriz de permisos del documento maestro):

| Caso de uso | Admin | Supervisor | Gerente | Usuario |
|---|---|---|---|---|
| Configuración global / terminología | ✔ | — | — | — |
| Metas y ponderadores | ✔ | ✔ | — | — |
| Semáforos consolidados (toda la org) | ✔ | ✔ | lectura | — |
| Tubo de trabajo de su delegación | ✔ | ✔ | ✔ | solo sus tareas |
| Libros de otras delegaciones | ✔ | ✔ | lectura | — |
| Presencia en vivo | ✔ | ✔ | ✔ | ✔ |

---

## 3. Diagrama entidad-relación (ERD)

```mermaid
erDiagram
    organizations ||--o{ organization_members : "tiene"
    organizations ||--o{ unidades_territoriales : "tiene"
    organizations ||--o{ categorias_gestion : "define"
    organizations ||--o{ tareas : "aísla"
    organizations ||--o{ metas : "aísla"
    users ||--o{ organization_members : "pertenece via"
    users ||--o{ unidades_territoriales : "responsable de"
    users ||--o{ tareas : "responsable de"
    unidades_territoriales ||--o{ tareas : "contiene"
    unidades_territoriales ||--o{ metas : "mide"
    categorias_gestion ||--o{ tareas : "clasifica"
    categorias_gestion ||--o{ metas : "clasifica"

    organizations {
        uuid id PK
        text nombre
        text tipo "municipio | empresa"
        jsonb configuracion_terminologia "alcaldesa/delegacion/pilares por tenant"
        timestamptz created_at
    }

    users {
        uuid id PK
        text email UK
        text password_hash "bcrypt"
        text nombre
        timestamptz created_at
    }

    organization_members {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        text rol "admin | supervisor | gerente | usuario"
    }

    unidades_territoriales {
        uuid id PK
        uuid organization_id FK
        text nombre
        uuid responsable_id FK "users.id"
    }

    categorias_gestion {
        uuid id PK
        uuid organization_id FK
        text nombre
        int orden_prioridad
    }

    tareas {
        uuid id PK
        uuid organization_id FK
        uuid unidad_territorial_id FK
        uuid categoria_id FK
        text titulo
        text descripcion
        text estado "pendiente | en_proceso | realizado (configurable)"
        date fecha_compromiso
        uuid responsable_id FK
        timestamptz updated_at
    }

    metas {
        uuid id PK
        uuid organization_id FK
        uuid unidad_territorial_id FK
        uuid categoria_id FK
        text trimestre "ej. 2026-Q3"
        numeric meta_trimestre
        numeric avance
        numeric ponderador "0..1, suman 1 por unidad"
    }

    cumplimiento_ponderado_vista {
        uuid organization_id "vista materializada"
        uuid unidad_territorial_id
        uuid categoria_id
        numeric cumplimiento_total "sum(avance/meta * ponderador)"
        text semaforo_color "verde >=80, amarillo 50-79, rojo <50"
    }
```

Decisiones registradas:
- **Toda tabla lleva `organization_id`** (incluso las que podrían derivarlo por FK) para que el middleware de Express filtre por tenant sin joins y los índices compuestos `(organization_id, ...)` sean directos.
- `users` es global (un email puede pertenecer a varias organizaciones vía `organization_members`); el rol vive en la membresía, no en el usuario.
- `cumplimiento_ponderado_vista` es **vista materializada** refrescada por cron (no trigger) según la arquitectura B del documento maestro.
- Columnas exactas de asistencia (licencia, vacaciones, compensatorios, días totales) quedan **pendientes de la definición del profesor**; se agregarán como tabla `asistencia` o columnas en `metas` sin romper el esquema.

---

## 4. Secuencia: drag & drop con actualización optimista + tiempo real

```mermaid
sequenceDiagram
    actor U1 as Usuario A (arrastra)
    participant FE as Frontend A
    participant API as Express API
    participant PG as PostgreSQL
    participant IO as Socket.io
    actor U2 as Usuario B (misma delegación)

    U1->>FE: suelta tarjeta en "En proceso"
    FE->>FE: mueve tarjeta (optimista)
    FE->>API: PATCH /tareas/:id {estado}
    API->>API: valida JWT + rol + organization_id
    API->>PG: UPDATE tareas SET estado
    PG-->>API: OK
    API->>IO: emitEvent(room unidad, "tarea_actualizada", tarea)
    IO-->>U2: tarea_actualizada → UI se sincroniza
    API-->>FE: 200 OK
    Note over FE: si el PATCH falla →<br/>revierte tarjeta + toast de error
    Note over IO,U2: al reconectar, el cliente pide<br/>GET /tareas (estado completo),<br/>no espera el próximo evento
```
