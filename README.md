# SGR — Sistema de Gestión de Resultados

Aplicación web multi-tenant para la gestión de resultados de delegaciones municipales: registro de actividades con evidencia validada, agenda colectiva (tubo de trabajo) en tiempo real, metas con cumplimiento ponderado, semáforo diario y tableros BI.

Proyecto integrador INACAP · **Equipo**: Origami SpA
**Stack**: React + TypeScript · Node.js + Express + Socket.io · PostgreSQL + Prisma · Docker

## Documentación

### Especificación (lo que se evalúa)

| Documento | Contenido |
|---|---|
| **[docs/requerimientos-oficiales.md](docs/requerimientos-oficiales.md)** | **38 RF, 18 RNF, 13 reglas, 10 criterios y 31 historias del PDF de los profesores, con el estado de cumplimiento de cada uno.** Su **§10** son las 12 consultas abiertas al docente: qué dice cada fuente, qué hicimos mientras tanto y qué cambia con la respuesta |
| [docs/estructura-planilla-real.md](docs/estructura-planilla-real.md) | Columnas, catálogos, códigos y fórmulas extraídos de la planilla en producción |
| [docs/matriz-trazabilidad.md](docs/matriz-trazabilidad.md) | HU ↔ requisito ↔ commit ↔ prueba (exigida por los profesores) |
| [docs/decisiones-tecnicas.md](docs/decisiones-tecnicas.md) | 15 ADR: RUT, fechas, nombres, códigos, concurrencia, auditoría, parámetros, trazabilidad, ítems, tipografía, los dos rojos, la ficha del vecino (ADR-012), las tres gestiones (ADR-013), la consolidación por delegación (ADR-014) y el control de actividad (ADR-015) |

### Diseño y desarrollo

| Documento | Contenido |
|---|---|
| [DESIGN.md](DESIGN.md) | Guía visual normativa: identidad de la Municipalidad de La Serena (§10), tipografías, paleta, accesibilidad, criterios por pantalla, lista negra |
| [docs/estado-proyecto.md](docs/estado-proyecto.md) | Estado por fase, contrato de API y Socket.io, deuda técnica |
| **[docs/siguiente-sesion.md](docs/siguiente-sesion.md)** | **Qué sigue, en qué orden, cabos sueltos y trampas del entorno** |
| **[docs/plan-entrega-15-septiembre.md](docs/plan-entrega-15-septiembre.md)** | **Plan de la primera evaluación**: la rúbrica criterio por criterio, las decisiones tomadas, los 12 casos de uso y el reparto |
| [docs/rubrica-entrega-15-septiembre.md](docs/rubrica-entrega-15-septiembre.md) | La rúbrica oficial y el ejemplo del docente, transcritos |
| [docs/prompt-siguiente-sesion.md](docs/prompt-siguiente-sesion.md) | Prompt listo para abrir una sesión nueva sin perder contexto |
| [docs/diagramas.md](docs/diagramas.md) | Contexto, casos de uso, ERD y secuencia de tiempo real |
| [docs/anotaciones-clase.md](docs/anotaciones-clase.md) | Requerimientos del cliente con citas de la reunión |
| [docs/historias-usuario.md](docs/historias-usuario.md) | Historias propias del equipo (subordinadas a las 31 oficiales) |
| [docs/restricciones-y-pendientes.md](docs/restricciones-y-pendientes.md) | Restricciones, bloqueos y riesgos |

### Gestión

| Documento | Contenido |
|---|---|
| [docs/plan-desarrollo.md](docs/plan-desarrollo.md) | Plan del ciclo de vida por sprints, calendario y ruta crítica |
| **[docs/mockups/](docs/mockups/)** | **Las ocho pantallas, en `.html` autocontenido (para adjuntar en Planner) y `.png` (para verlas aquí en GitHub).** Generadas desde la aplicación real |
| [docs/diagramas/](docs/diagramas/) | Los diagramas de [diagramas.md](docs/diagramas.md) exportados a PNG, para adjuntar |
| [docs/plan-desarrollo.csv](docs/plan-desarrollo.csv) | El plan en formato tabla: 87 tareas con fecha, responsable, estado y prioridad |
| **[docs/entrega/](docs/entrega/)** | **Los artefactos de la evaluación del 15 de septiembre.** Ver su [índice](docs/entrega/README.md) |
| **[docs/entrega/guia-planner-hector.pdf](docs/entrega/guia-planner-hector.pdf)** | **Cargar las 87 tareas en Planner**, en seis tandas con el contenido exacto de cada tarjeta |
| [docs/guia-cargar-planner.md](docs/guia-cargar-planner.md) | La ruta automatizada y por qué INACAP no la permite |
| [Documento_Maestro_Matriz_SGR.md](Documento_Maestro_Matriz_SGR.md) | Visión inicial del equipo (histórico, superado en parte) |

## Estructura

```
/backend    Node.js + Express + Socket.io + Prisma
/frontend   React + TypeScript + dnd-kit + ECharts (Fase 3)
/infra      Docker Compose de producción, Caddy, CI/CD (Fase 5)
/docs       Diagramas, historias, backlog
/scripts    Utilidades (carga de backlog en Planner)
```

## Desarrollo local

Requisitos: Node.js 20+, Docker Desktop.

```powershell
# 1. Base de datos
docker compose up -d

# 2. Backend (http://localhost:4000)
cd backend
copy .env.example .env
npm install
npx prisma migrate dev
npm run dev

# 3. Frontend (http://localhost:5173) — desde Fase 3
cd frontend
npm install
npm run dev
```

## Cuentas de demostración

Todas con contraseña `matriz123`, una por cada rol del PDF §3. Los datos son **100% ficticios** y deben seguir siéndolo.

| Correo | Rol | Se le dice | Qué se prueba con esta cuenta |
|---|---|---|---|
| `admin@sgr.demo` | `admin` | Administrador | Configuración completa, reapertura de períodos |
| `coordinador@sgr.demo` | `supervisor` | Coordinador | Metas, validación y nivel central |
| `verificador@sgr.demo` | `verificador` | Verificador | Bandeja de verificación (transversal, **sin libro**) |
| `consulta@sgr.demo` | `consulta` | Usuario de consulta | Solo lectura del consolidado |
| `delegado.centro@sgr.demo` | `gerente` | Delegado | Libro y tubo de su delegación |
| `territorial.centro@sgr.demo` | `usuario` | Funcionario | Ficha personal y registro diario |

La lista completa (13 cuentas con su cargo y delegación) está en [docs/estado-proyecto.md §1](docs/estado-proyecto.md), que es la **fuente única**. Las cuentas `@demo.cl` de las Fases 2 y 3 ya no existen.

## Puertos

| Servicio | Puerto |
|---|---|
| Frontend (Vite dev) | 5173 |
| Backend API + Socket.io | 4000 |
| PostgreSQL | 5432 |

## Verificación

Cinco suites automatizadas, **332 comprobaciones** (249 del backend + 83 de contraste del frontend), todas en verde. Cada una cita el requisito que demuestra; el detalle está en [docs/matriz-trazabilidad.md §3](docs/matriz-trazabilidad.md).

```powershell
cd backend
npm run build              # TypeScript estricto: debe pasar antes de cada commit
npm run verificar:calculo  # 37 · fórmulas del cálculo, semáforo, parámetros, consolidación y control de actividad
npm run verificar:rut      # 16 RUT del seed + normalización (requiere base)
npm run dev                # las dos siguientes necesitan el servidor arriba
npm run smoke              # 21 · tiempo real, permisos, visibilidad por delegación y semáforo consolidado
npm run verificar:api      # 191 · registro, evidencia, validación, metas, ficha del vecino, atención social, tubo, tablero consolidado, concurrencia y auditoría

cd frontend
npm run verificar:contraste          # 83 · WCAG AA en los dos temas, los dos rojos separados, sin hex fuera de tokens
node scripts/capturas.mjs capturas   # cada pantalla con las seis cuentas (--movil, --solo=login,ficha); servers arriba
```

## Las pantallas

Las ocho pantallas, generadas desde la aplicación real: **[docs/mockups/](docs/mockups/)**. Ahí se ven todas en imagen (GitHub no ejecuta HTML) y se descarga el `.html` de cada una, que abre con doble clic sin servidores ni base de datos.

```powershell
cd frontend
npm run mockups            # regenera .html + .png (con los servidores arriba)
npm run verificar:mockups  # los abre desde file:// con la red bloqueada
npm run diagramas          # exporta los diagramas mermaid a PNG
```

## Estrategia de ramas y versiones

Exigida por el PDF §15 (entregable 01). El principio: **`main` es siempre lo que se le puede mostrar al docente**, y todo bloque cerrado deja una etiqueta a la que volver.

| Rama | Para qué |
|---|---|
| `main` | Estado demostrable. Solo recibe merges de ramas terminadas y verificadas |
| `feat/<bloque>` | Un bloque de trabajo del [plan](docs/siguiente-sesion.md) (ej. `feat/bloque-a-api-registro-validacion`) |
| `fix/<asunto>` | Corrección puntual sobre `main` |
| `docs/<asunto>` | Documentación que no acompaña a código |

**Ciclo de un bloque**

1. `git checkout -b feat/<bloque>` desde `main`.
2. Commits convencionales **en español, citando la HU y el RF** (`feat(evidencias): HU-10 RF-011 código verificador inmutable`).
3. Antes de fusionar: `npm run build` en backend y frontend, y las cuatro suites en verde.
4. `git merge --no-ff feat/<bloque>` — el `--no-ff` conserva el bloque como una unidad en el historial, que es lo que permite revertirlo entero de un solo comando.
5. Etiqueta anotada en el merge: `git tag -a v0.X.0-<bloque> -m "…"`. **La rama no se borra** hasta la entrega final: es la evidencia de cómo se construyó.

**Volver atrás**

```powershell
git tag -n                              # etiquetas y su descripción
git revert -m 1 <hash-del-merge>        # deshace el bloque conservando la historia (preferido)
git reset --hard v0.2.0-modelo-v2       # vuelve al estado anterior (solo si aún no se compartió)
```

| Etiqueta | Estado que congela |
|---|---|
| `v0.2.0-modelo-v2` | Modelo de datos v2 migrado y verificado, sin API |
| `v0.3.0-bloque-a` | API del registro y la validación (EP-01 + EP-03), 95 comprobaciones en verde |
| `v0.4.0-ficha-personal` | Ficha personal (RF-008): la pestaña personal con registro, evidencia y anulación |
| `v0.5.0-bandeja-verificador` | Bandeja del verificador (RF-013, HU-11): el ciclo evidencia → validación → puntaje, completo en pantalla |
| `v0.5.1-bandeja-orden` | Corrección: la cola muestra lo recién subido (orden configurable y paginación explícita) |
| `v0.5.2-tubo-vacio-explicado` | Corrección: el tubo resuelve su carga y explica el vacío a los roles sin delegación |
| `v0.6.0-metas-funcionario` | API de metas por funcionario (RF-006, RF-007, RN-001), 126 comprobaciones en verde |
| `v0.7.0-pantalla-metas` | Pantalla de configuración de metas (HU-05), bloqueo optimista en el guardado del conjunto y alcance del selector por rol |
| `v0.7.1-metas-privacidad` | Corrección: solo la jefatura ve las metas de otros (consulta abierta nº 11) |
| `v0.8.0-identidad-la-serena` | Identidad visual de la Municipalidad de La Serena (DESIGN §10): tokens, barra heráldica, login con el faro, Libre Franklin, ADR-010 y ADR-011, verificación de contraste y capturas por rol |
| `v0.8.1-vida-en-pantalla` | Dos regímenes de movimiento (DESIGN §3.6): el faro gira e ilumina el mar, marcador del menú deslizante, cifras que cuentan y hover en todo lo clickeable |
| `v0.8.2-faro-y-escena` | El faro redibujado a partir del real (ventanas encendidas, galería, linterna, torreones) sin recorte, y la escena de La Serena en la barra: San Francisco, jarro pato, La Recova, El Miliciano, papayo, faro, camanchaca y greca diaguita |
| `v0.8.3-mar-completo` | Corrección: el mar del login llega a los bordes del panel en cualquier ancho (escritorio ancho, normal y móvil) |
| `v0.10.0-ficha-vecino` | Ficha del vecino (`/vecinos`): búsqueda por RUT y nombre, historial cruzando delegaciones, aviso de posible atención duplicada y alcance por rol como decisión legal (ADR-012) |
| `v0.11.0-rutas-endurecidas` | `/tareas`, `/unidades` y `/categorias` con `version` → 409 y auditoría (CA-08 y CA-09), y RF-001: dar de baja una delegación la desactiva en vez de borrarla |
| `v0.12.0-atencion-social` | Atención social con sus tres gestiones (RF-015, ADR-013): el servidor decide el casillero, no el cliente. **CA-04 cerrado de punta a punta** |
| `v0.13.0-solicitud-en-el-tubo` | La solicitud del vecino en el tubo (RF-016, RF-017): INT/EXT, solicitante, territorio, área de apoyo y el vínculo opcional con la ficha. **EP-01 completa** |
| `v0.14.0-dashboard-v2` | El tablero sobre el motor por funcionario (RF-029, ADR-014) y **la eliminación del cálculo v1**: vista materializada, tabla `metas`, `/metas`, `/kpis/cumplimiento` y el cron. RF-024 y RF-027 cerrados; CA-06 verificado |
| `v0.15.0-control-actividad` | Control de actividad de usuarios (RF-030, HU-19): quién registró, **quién no** y quién está en la plataforma ahora, para admin y coordinador. Presencia a nivel de organización en un room propio del nivel central y acceso auditado ([ADR-015](docs/decisiones-tecnicas.md)) |
