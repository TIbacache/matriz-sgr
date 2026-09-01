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
- **[docs/decisiones-tecnicas.md](docs/decisiones-tecnicas.md)** — 9 ADR: RUT, fechas, nombres, códigos, concurrencia, auditoría, parámetros, trazabilidad, tipo/dirección de ítems.
- **[docs/matriz-trazabilidad.md](docs/matriz-trazabilidad.md)** — HU ↔ requisito ↔ commit ↔ prueba. **Exigida por los profesores.**
- **[DESIGN.md](DESIGN.md)** — normativo para todo el frontend. Un PR que viole su §8 se rechaza.
- **[docs/siguiente-sesion.md](docs/siguiente-sesion.md)** — qué sigue, con su orden y sus trampas.
- [docs/prompt-siguiente-sesion.md](docs/prompt-siguiente-sesion.md) — prompt listo para abrir una sesión nueva. **Se actualiza al cerrar cada bloque.**

## Estado del código (1 de septiembre de 2026)

**Construido y verificado** (108 comprobaciones en verde):
- Backend Express + Socket.io + Prisma, multi-tenant, auth JWT por rol.
- Tubo de trabajo (kanban dnd-kit) con tiempo real, presencia y libro privado por delegación.
- Dashboard BI con ECharts (gauges, heatmap, proyección, radar, tabla) y filtros cruzados.
- **Modelo v2 completo**: 16 entidades de la especificación oficial, con triggers de inmutabilidad de auditoría y código, y CHECKs de RUT, fechas y metas.
- **API del modelo v2 (Bloque A)**: `/periodos` (con cierre y reapertura auditada), `/cargos`, `/items`, `/actividades` (código inmutable, anulación con motivo), evidencias, `/evidencias/:id/validacion` y `GET /cumplimiento/:periodoId`. Con `version` → 409 y auditoría en cada write. Contrato en [docs/estado-proyecto.md](docs/estado-proyecto.md).
- **Ficha personal `/ficha`** (RF-008): cabecera con semáforo, tabla de ítems, registro en línea, subida y vista de evidencia, anulación con motivo. Es la pantalla más importante del sistema.
- **Bandeja del verificador `/verificacion`** (RF-013, HU-11): cola, foto grande, tres decisiones con observación obligatoria y teclado `J`/`K`/`Enter`. Solo la ven verificador, supervisor y admin.
- Utilidades `lib/rut.ts`, `lib/fechas.ts`, `lib/persona.ts`, `lib/telefono.ts`; servicios `parametros`, `auditoria`, `codigos`, `cumplimiento`, `concurrencia`, `almacenamiento`.
- Seed 100% ficticio con 1.126 actividades validadas.

**Lo que NO existe todavía** — ver [docs/siguiente-sesion.md](docs/siguiente-sesion.md):
- **Ficha del vecino** (ADR-008): necesita un endpoint de búsqueda de `PersonaUsuaria` que todavía no existe.
- API de `MetaItem` (metas por funcionario), `Ajuste`, `AtencionSocial`, `Comentario`, `Ausencia`, catálogos y parámetros.
- Las rutas **v1** (`/tareas`, `/metas`, `/unidades`, `/categorias`) siguen sin auditar y sin `version`.
- El dashboard aún usa la **vista materializada v1** (por delegación, con umbrales fijos en SQL), no el motor v2 por funcionario.
- Pruebas en marco formal (Jest/RTL) y CI. Despliegue (Fase 5).

⚠ **Convivencia de dos cálculos**: `cumplimiento_ponderado_vista` (v1, por delegación, alimenta el dashboard) y `services/cumplimiento.ts` (v2, por funcionario, es el correcto según la especificación). El objetivo es que el v2 reemplace al v1; hasta entonces, **no tocar uno asumiendo que el otro cambia**.

## Comandos

```powershell
docker compose up -d          # Postgres 16 (raíz del repo)

cd backend
npm run dev                   # API + Socket.io en :4000 (tsx watch)
npm run build                 # tsc estricto — debe pasar antes de commit
npm run smoke                 # 17 verificaciones de integración (server corriendo)
npm run verificar:calculo     # 21 verificaciones del motor de cálculo
npm run verificar:api         # 70 verificaciones de la API v2 (server corriendo)
npm run verificar:rut         # RUT del seed + casos de normalización
npx prisma db seed            # datos demo ficticios (regenera lo transaccional)
npx prisma generate           # tras cambiar el esquema; falla si el server dev está corriendo

cd frontend
npm run dev                   # UI en :5173 (Vite)
npm run build                 # tsc + vite build
```

**Trampa conocida de migraciones**: `prisma migrate dev` es interactivo y falla en esta sesión. Usar:
```powershell
npx prisma migrate diff --from-schema-datasource prisma\schema.prisma --to-schema-datamodel prisma\schema.prisma --script > migration.sql
# quitar el BOM que agrega PowerShell antes de aplicar, y luego:
npx prisma migrate deploy
```

Cuentas demo (todas `matriz123`): `admin@sgr.demo` · `coordinador@sgr.demo` · `verificador@sgr.demo` · `consulta@sgr.demo` · `delegado.centro@sgr.demo` · `territorial.centro@sgr.demo`.

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
14. **Frontend**: CSS3 plano con los tokens de DESIGN.md (sin Tailwind, sin Inter, sin UI kits por defecto). dnd-kit, ECharts, accesible por teclado y con contraste validado (RNF-012, DESIGN §8.1).
15. **Una historia no está terminada sin prueba**: al implementarla se actualiza [docs/matriz-trazabilidad.md](docs/matriz-trazabilidad.md) con commit, caso de prueba y resultado.
16. **Las ambigüedades se documentan, no se inventan**: hay 10 consultas abiertas al docente en [requerimientos-oficiales.md §10](docs/requerimientos-oficiales.md). Si aparece otra, se agrega ahí, con el mismo formato: qué dice cada fuente, qué hicimos mientras tanto y qué cambia con la respuesta.
17. Puertos: API 4000, frontend 5173, Postgres 5432. Los puertos 3000/8000/27017 los ocupa otro proyecto Docker ("talia") — no tocarlos.
