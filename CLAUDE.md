# CLAUDE.md — SGR (Sistema de Gestión de Resultados)

Proyecto integrador INACAP del equipo **Origami SpA** (2 personas). Caso: delegaciones municipales de La Serena. Repo privado: TIbacache/matriz-sgr. La herramienta actual del cliente se llama "Matriz SGR" (Google Sheets); el producto a construir es **SGR**.

## Jerarquía de fuentes (si dos se contradicen, gana la de arriba)

1. **[docs/requerimientos-oficiales.md](docs/requerimientos-oficiales.md)** — 38 RF, 18 RNF, 13 RN, 10 CA y 31 historias del PDF de los profesores. **Es la especificación que se evalúa.**
2. **[docs/estructura-planilla-real.md](docs/estructura-planilla-real.md)** — columnas, catálogos, códigos y fórmulas extraídos de las capturas de la planilla en producción.
3. [docs/anotaciones-clase.md](docs/anotaciones-clase.md) — reunión con el cliente (citas con timestamp).
4. [Documento_Maestro_Matriz_SGR.md](Documento_Maestro_Matriz_SGR.md) — visión inicial del equipo (anterior al PDF; ver su nota de vigencia).

Regla del PDF: *"si una historia contradice un requerimiento formal, prevalece el requerimiento y debe registrarse la decisión. Las ambigüedades no se resuelven en silencio: se documentan como supuestos o consultas al docente."*

## Leer antes de trabajar

- **[docs/estado-proyecto.md](docs/estado-proyecto.md)** — estado por fase, contrato de API y Socket.io, deuda técnica. Actualizar al cerrar cada fase.
- **[docs/decisiones-tecnicas.md](docs/decisiones-tecnicas.md)** — 12 ADR: RUT, fechas, nombres, códigos, concurrencia, auditoría, parámetros, trazabilidad, tipo/dirección de ítems, tipografía, los dos rojos, y **quién consulta la ficha del vecino (ADR-012)**.
- **[docs/matriz-trazabilidad.md](docs/matriz-trazabilidad.md)** — HU ↔ requisito ↔ commit ↔ prueba. **Exigida por los profesores.**
- **[DESIGN.md](DESIGN.md)** — normativo para todo el frontend. Un PR que viole su §8 se rechaza.
- **[docs/siguiente-sesion.md](docs/siguiente-sesion.md)** — qué sigue, con su orden y sus trampas.
- [docs/prompt-siguiente-sesion.md](docs/prompt-siguiente-sesion.md) — prompt listo para abrir una sesión nueva. **Se actualiza al cerrar cada bloque.**

## Estado del código (3 de septiembre de 2026)

**Construido y verificado** (171 comprobaciones del backend + 83 de contraste del frontend, todas en verde):
- **Identidad visual de La Serena (Bloques D0 y D1, DESIGN §10 y §3.6)**: tokens en los dos temas, barra heráldica con una escena de La Serena (San Francisco, jarro pato diaguita, La Recova, El Miliciano, papayo, faro, camanchaca, greca), login con el Faro Monumental en SVG —dibujado a partir del real— que gira e ilumina el mar, Libre Franklin + General Sans (ADR-010), los dos rojos separados por rol, zona y forma (ADR-011), frase del producto, **dos regímenes de movimiento** (ambiente solo en login y barra; estado en los datos) y hover en todo lo clickeable. Verificada con `npm run verificar:contraste` y con capturas de las seis cuentas (`scripts/capturas.mjs`).
- Backend Express + Socket.io + Prisma, multi-tenant, auth JWT por rol.
- Tubo de trabajo (kanban dnd-kit) con tiempo real, presencia y libro privado por delegación.
- Dashboard BI con ECharts (gauges, heatmap, proyección, radar, tabla) y filtros cruzados.
- **Modelo v2 completo**: 16 entidades de la especificación oficial, con triggers de inmutabilidad de auditoría y código, y CHECKs de RUT, fechas y metas.
- **API del modelo v2 (Bloque A)**: `/periodos` (con cierre y reapertura auditada), `/cargos`, `/items`, `/actividades` (código inmutable, anulación con motivo), evidencias, `/evidencias/:id/validacion` y `GET /cumplimiento/:periodoId`. Con `version` → 409 y auditoría en cada write. Contrato en [docs/estado-proyecto.md](docs/estado-proyecto.md).
- **API de metas por funcionario (Bloque A2)**: `/metas-item` — meta y ponderador por funcionario, ítem y período (RF-006, RF-007). RN-001 exigida en sus dos formas: el alta unitaria rechaza superar el 100%, el `PUT` del conjunto exige el 100% exacto. **Ojo: `/metas` es el modelo v1 (unidad × categoría) y `/metas-item` el v2 (funcionario × ítem × período); no son lo mismo.**
- **Ficha personal `/ficha`** (RF-008): cabecera con semáforo, tabla de ítems, registro en línea, subida y vista de evidencia, anulación con motivo. Es la pantalla más importante del sistema.
- **Bandeja del verificador `/verificacion`** (RF-013, HU-11): cola, foto grande, tres decisiones con observación obligatoria y teclado `J`/`K`/`Enter`. Solo la ven verificador, supervisor y admin.
- **Ficha del vecino `/vecinos`** (ADR-008, ADR-012, RF-032, CA-04, HU-29): búsqueda por RUT o nombre, historial **cruzando delegaciones** y aviso ámbar de posible atención duplicada. Es el control que el cliente vino a buscar. Su alcance por rol es una decisión legal (ADR-012): `verificador` y `consulta` reciben 403 con el motivo, y para `gerente` y `usuario` el detalle de una atención ajena viaja reducido. Abrir una ficha se **audita** (acción `consultar`).
- **Rutas heredadas endurecidas (Bloque A3)**: `/tareas`, `/unidades` y `/categorias` aplican `version` → 409 y auditan todo write, igual que el modelo v2. **CA-08 y CA-09 quedaron completos.** El tubo avisa el conflicto en pantalla en vez de revertir en silencio, y `DELETE /unidades/:id` **desactiva** en vez de borrar (RF-001, que estaba incumplido).
- **Configuración de metas `/metas`** (RF-006, RF-007, HU-05): totalizador de RN-001 siempre visible, todos los ítems del cargo, guardado del conjunto con `PUT`, reparto en partes iguales y protección de lo que ya sumó puntaje. Solo la editan admin y supervisor.
- Utilidades `lib/rut.ts`, `lib/fechas.ts`, `lib/persona.ts`, `lib/telefono.ts`; servicios `parametros`, `auditoria`, `codigos`, `cumplimiento`, `concurrencia`, `almacenamiento`.
- Seed 100% ficticio con 1.126 actividades validadas.

**Lo que NO existe todavía** — ver [docs/siguiente-sesion.md](docs/siguiente-sesion.md):
- **Las tres gestiones de `AtencionSocial`** (RF-015, HU-03): la entidad existe y la trazabilidad de la persona ya funciona; falta la API. Es lo único que le queda a CA-04.
- 🔴 **El formulario del tubo no captura al solicitante** (RF-016, RF-017, Bloque B5): `interesExterno`, `solicitante`, `territorio`, `areaApoyo` y `personaUsuariaId` están en el esquema y los llena el seed, pero el `tareaSchema` no los acepta. Como `services/vecinos.ts` **sí** lee `tarea.personaUsuariaId`, una tarea externa creada desde la aplicación no aparece en la ficha del vecino: la trazabilidad parece rota sin estarlo. **No pedir RUT en el tubo** — la planilla real no lo tiene ahí (estructura-planilla-real §6).
- API de `Ajuste`, `Comentario`, `Ausencia`, catálogos y parámetros.
- El dashboard aún usa la **vista materializada v1** (por delegación, con umbrales fijos en SQL), no el motor v2 por funcionario.
- Pruebas en marco formal (Jest/RTL) y CI. Despliegue (Fase 5).
- Panel de actividad de usuarios (RF-030, HU-19), pedido por el docente en clase.

⚠ **"v1" no significa "obsoleto".** `/tareas` (el tubo: EP-04, RF-016 a RF-021), `/unidades` (RF-001) y `/categorias` sostienen requisitos oficiales vigentes y **ya están endurecidas** (Bloque A3): `version` → 409 y auditoría en las tres. Las que sí mueren son `/metas` v1 (unidad × categoría — el frontend ya no la llama) y `/kpis/cumplimiento`, que se van con el Bloque C. Detalle en [docs/estado-proyecto.md §3.2](docs/estado-proyecto.md).

⚠ **Convivencia de dos cálculos**: `cumplimiento_ponderado_vista` (v1, por delegación, alimenta el dashboard) y `services/cumplimiento.ts` (v2, por funcionario, es el correcto según la especificación). El objetivo es que el v2 reemplace al v1; hasta entonces, **no tocar uno asumiendo que el otro cambia**.

## Comandos

```powershell
docker compose up -d          # Postgres 16 (raíz del repo)

cd backend
npm run dev                   # API + Socket.io en :4000 (tsx watch)
npm run build                 # tsc estricto — debe pasar antes de commit
npm run smoke                 # 18 verificaciones de integración (server corriendo)
npm run verificar:calculo     # 21 verificaciones del motor de cálculo
npm run verificar:api         # 132 verificaciones de la API v2 (server corriendo)
npm run verificar:rut         # RUT del seed + casos de normalización
npx prisma db seed            # datos demo ficticios (regenera lo transaccional)
npx prisma generate           # tras cambiar el esquema; falla si el server dev está corriendo

cd frontend
npm run dev                   # UI en :5173 (Vite)
npm run build                 # tsc + vite build
npm run verificar:contraste   # 83 comprobaciones WCAG de tokens.css en los dos temas + hex fuera de tokens
node scripts/capturas.mjs <carpeta> [--movil] [--solo=login,ficha]   # capturas con las seis cuentas (servers arriba)
npm run mockups               # .html autocontenido + .png de las 7 pantallas → docs/mockups (servers arriba)
npm run verificar:mockups     # abre los .html desde file:// con la red bloqueada
npm run diagramas             # exporta los mermaid de docs/diagramas.md a PNG → docs/diagramas
```

⚠ **Vite huérfano en 5173**: igual que el 4000, un `vite` de una sesión anterior puede seguir sirviendo. `Get-NetTCPConnection -LocalPort 5173 -State Listen` y `Stop-Process` antes de levantar el propio.

**Trampa conocida de migraciones**: `prisma migrate dev` es interactivo y falla en esta sesión. Usar:
```powershell
npx prisma migrate diff --from-schema-datasource prisma\schema.prisma --to-schema-datamodel prisma\schema.prisma --script > migration.sql
# quitar el BOM que agrega PowerShell antes de aplicar, y luego:
npx prisma migrate deploy
```

Cuentas demo (todas `matriz123`), una por rol para la prueba de los seis: `admin@sgr.demo` · `coordinador@sgr.demo` · `verificador@sgr.demo` · `consulta@sgr.demo` · `delegado.centro@sgr.demo` · `territorial.centro@sgr.demo`.

⚠ **Solo existen las `@sgr.demo`.** Las `@demo.cl` de las Fases 2 y 3 se borraron al reescribir el seed; si algo las menciona, está desactualizado. Las 13 cuentas con su rol, cargo y delegación están en [docs/estado-proyecto.md §1](docs/estado-proyecto.md) — **esa tabla es la fuente única**. Ahí también está la equivalencia entre el rol técnico y el nombre municipal: `supervisor` = "coordinador", `gerente` = "delegado".

## Reglas del proyecto

1. **Auditar antes de implementar.** Leer el requisito en `requerimientos-oficiales.md`, revisar si el modelo ya lo cubre y comprobar el estado real del código antes de escribir. Varias entidades ya existen sin API: crear una tabla duplicada sería el error más caro.
2. **Metodología**: trabajar por fases; al cerrar una, informe breve (qué se hizo / qué falta / decisiones / riesgos) y esperar aprobación. Commits en español, convencionales, **referenciando la HU y el RF** (ej. `feat(evidencias): HU-10 RF-011 código verificador inmutable`).
3. **Nada de valores de negocio en el código.** Períodos, topes (150%), umbrales (80%, 60%) y ajustes van en la tabla `parametro` con vigencia, vía `services/parametros.ts` (RNF-015, RF-038, ADR-007). **Prohibido fijar 90/91 días.**
4. **Solo lo validado suma.** Una actividad aporta al avance únicamente con validación aprobada (RN-009, RF-014). El código de evidencia es único e **inmutable** (RF-011, con trigger en la base). Nadie valida lo propio (RNF-005) y una aprobación no se revierte: se anula la actividad con motivo (consulta abierta nº 8).
5. **Todo write emite su evento** vía `emitEvent()` de `services/broadcast.ts` (rooms `unidad:<id>`, `org:<id>`). Endpoint mudo = bug.
6. **Todo write crítico se audita** con `services/auditoria.ts`: usuario, fecha, acción, entidad, valor anterior y nuevo (RNF-008, ADR-006). Los períodos cerrados no se modifican.
7. **Concurrencia**: bloqueo optimista con `version`; conflicto → **409**, nunca sobrescritura silenciosa (RF-034, CA-08, ADR-005).
8. **Multi-tenant**: toda query filtra por `organizationId` del JWT; recurso de otro tenant responde **404**. Toda tabla nueva lleva `organization_id`.
9. **Visibilidad**: el libro/tubo es privado por delegación; el semáforo consolidado lo ven todos (confirmado por el cliente, reunión 00:37:11).
10. **RUT, fechas y nombres**: usar siempre `lib/rut.ts`, `lib/fechas.ts` y `lib/persona.ts`. RUT canónico `17721947-9` con módulo 11 (la PK es UUID, el RUT **no** es FK). Fechas `DATE` para días y `TIMESTAMPTZ` para instantes, ISO 8601 en la API, **"hoy" se calcula en el servidor**. Nombres separados, concatenados solo por el helper.
11. **Trazabilidad de la persona usuaria**: `PersonaUsuaria` es única por organización (RUT único), **no por delegación** — detecta el caso del vecino que pide lo mismo en varias delegaciones (ADR-008).
12. **Datos ficticios obligatorios**: prohibido cargar datos reales de ciudadanos o funcionarios en repo, base o capturas (§Condiciones del caso del PDF).
13. **Costo cero**: sin dependencias ni servicios de pago. VPS solo al final si es imprescindible.
14. **Frontend**: CSS3 plano con los tokens de DESIGN.md (sin Tailwind, sin Inter, sin UI kits por defecto). dnd-kit, ECharts, accesible por teclado y con contraste validado por script (RNF-012, DESIGN §8.1, `npm run verificar:contraste`). **La identidad gráfica de la Municipalidad de La Serena es normativa y está implementada** (DESIGN §10, ADR-010, ADR-011): rojo institucional `#DB0032`, heráldico `#8A0007`, Libre Franklin + General Sans en pantalla, Arial en lo impreso. **El rojo institucional nunca entra en una zona de datos** (tablas, chips, gráficos): ahí lo seleccionado es `--seleccion` y el único rojo es `--estado-rojo`. Todo cambio visual se mira con las seis cuentas (`scripts/capturas.mjs`).
15. **Una historia no está terminada sin prueba**: al implementarla se actualiza [docs/matriz-trazabilidad.md](docs/matriz-trazabilidad.md) con commit, caso de prueba y resultado.
16. **Las ambigüedades se documentan, no se inventan**: hay 12 consultas abiertas al docente en [requerimientos-oficiales.md §10](docs/requerimientos-oficiales.md). Si aparece otra, se agrega ahí, con el mismo formato: qué dice cada fuente, qué hicimos mientras tanto y qué cambia con la respuesta.
17. Puertos: API 4000, frontend 5173, Postgres 5432. Los puertos 3000/8000/27017 los ocupa otro proyecto Docker ("talia") — no tocarlos.
18. **Marco legal chileno**: el sistema trata datos personales de vecinos y de desempeño de funcionarios de un organismo público. Aplican la **Ley 21.663 de ciberseguridad** y las **Leyes 19.628 / 21.719 de protección de datos personales**: finalidad, proporcionalidad, mínimo privilegio y trazabilidad. Ante la duda sobre quién puede ver un dato de desempeño, rige lo restrictivo y se documenta como consulta.
19. **El docente solo revisará el Planner** (clase del 1-09-2026). Un entregable que está en el repositorio pero no adjunto o enlazado desde una tarea de Planner, no se evalúa. **Y dijo también que el frontend debe verse en GitHub.** Por eso todo entregable visual se produce en dos formatos: `.html` autocontenido para adjuntar en Planner y `.png` para que se vea en GitHub, donde Markdown no ejecuta HTML. Están en [docs/mockups/](docs/mockups/) y [docs/diagramas/](docs/diagramas/), y se regeneran con `npm run mockups` y `npm run diagramas`.
