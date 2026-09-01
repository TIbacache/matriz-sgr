# CLAUDE.md — SGR (Sistema de Gestión de Resultados)

Proyecto integrador INACAP del equipo **Origami SpA** (2 personas). Caso: delegaciones municipales de La Serena. Repo privado: TIbacache/matriz-sgr. La herramienta actual del cliente se llama "Matriz SGR" (Google Sheets); el producto a construir es **SGR**.

## Jerarquía de fuentes (si dos se contradicen, gana la de arriba)

1. **[docs/requerimientos-oficiales.md](docs/requerimientos-oficiales.md)** — 38 RF, 18 RNF, 13 RN, 10 CA y 31 historias del PDF de los profesores. **Es la especificación que se evalúa.**
2. **[docs/estructura-planilla-real.md](docs/estructura-planilla-real.md)** — columnas, catálogos, códigos y fórmulas extraídos de las capturas de la planilla en producción.
3. [docs/anotaciones-clase.md](docs/anotaciones-clase.md) — reunión con el cliente (citas con timestamp).
4. [Documento_Maestro_Matriz_SGR.md](Documento_Maestro_Matriz_SGR.md) — visión inicial del equipo (anterior al PDF; ver su nota de vigencia).

Regla del PDF: *"si una historia contradice un requerimiento formal, prevalece el requerimiento y debe registrarse la decisión. Las ambigüedades no se resuelven en silencio: se documentan como supuestos o consultas al docente."*

## Leer antes de trabajar

- **[docs/estado-proyecto.md](docs/estado-proyecto.md)** — estado por fase, contrato de API y Socket.io, decisiones, deuda técnica. Actualizar al cerrar cada fase.
- **[docs/decisiones-tecnicas.md](docs/decisiones-tecnicas.md)** — ADR: RUT, fechas, nombres, códigos de evidencia, concurrencia, auditoría, parámetros.
- **[docs/matriz-trazabilidad.md](docs/matriz-trazabilidad.md)** — HU ↔ requisito ↔ commit ↔ prueba. **Exigida por los profesores.**
- **[DESIGN.md](DESIGN.md)** — normativo para todo el frontend. Un PR que viole su §8 se rechaza.
- [docs/plan-desarrollo.md](docs/plan-desarrollo.md) — sprints y fechas del Planner.

## Comandos

```powershell
docker compose up -d          # Postgres 16 (raíz del repo)
cd backend
npm run dev                   # API + Socket.io en :4000 (tsx watch)
npm run build                 # tsc estricto — debe pasar antes de commit
npm run smoke                 # 17 verificaciones de integración (server corriendo)
npx prisma migrate dev        # migraciones
npx prisma db seed            # datos demo
cd frontend
npm run dev                   # UI en :5173 (Vite)
npm run build                 # tsc + vite build
```

## Reglas del proyecto

1. **Metodología**: trabajar por fases; al cerrar una, informe breve (qué se hizo / qué falta / decisiones / riesgos) y esperar aprobación. Commits en español, convencionales, **referenciando la HU y el RF** que implementan (ej. `feat(evidencias): HU-10 RF-011 código verificador inmutable`).
2. **Nada de valores de negocio en el código.** Períodos, topes (150%), umbrales (80%, 60%), ajustes por felicitación/reclamo y estados van en tabla `parametro` con vigencia (RNF-015, RF-038, ADR-007). **Prohibido fijar 90/91 días.**
3. **Solo lo validado suma.** Una actividad aporta al avance únicamente con validación aprobada (RN-009, RF-014). El código de evidencia es único e **inmutable** (RF-011).
4. **Todo write emite su evento** vía `emitEvent()` de `backend/src/services/broadcast.ts` (rooms `unidad:<id>`, `org:<id>`). Endpoint mudo = bug.
5. **Todo write crítico se audita**: usuario, fecha, acción, entidad, valor anterior y nuevo, en tabla solo-inserción (RNF-008, ADR-006). Los períodos cerrados no se modifican.
6. **Concurrencia**: bloqueo optimista con `version` en toda tabla editable; conflicto → 409, nunca sobrescritura silenciosa (RF-034, CA-08, ADR-005).
7. **Multi-tenant**: toda query filtra por `organizationId` del JWT; recurso de otro tenant responde **404**. Toda tabla nueva lleva `organization_id`.
8. **Visibilidad**: el libro/tubo es privado por delegación; el semáforo consolidado lo ven todos (confirmado por el cliente, reunión 00:37:11).
9. **RUT**: se guarda canónico `17721947-9` (sin puntos, con guion, DV mayúscula), `UNIQUE`, validado con módulo 11; **la PK es UUID, el RUT no es FK** (ADR-001). Fechas: `DATE` para días, `TIMESTAMPTZ` para instantes, ISO 8601 en la API, "hoy" se calcula en el servidor (ADR-002). Nombres separados con columna generada `nombre_completo` (ADR-003).
10. **Trazabilidad de la persona usuaria**: `persona_usuaria` es única por organización (RUT único), **no por delegación** — es lo que detecta el caso del vecino que pide lo mismo en varias delegaciones (ADR-008).
11. **Datos ficticios obligatorios**: prohibido cargar datos reales de ciudadanos o funcionarios en repo, base o capturas (§Condiciones del caso del PDF).
12. **Costo cero**: sin dependencias ni servicios de pago. VPS solo al final si es imprescindible.
13. **Frontend**: CSS3 plano con los tokens de DESIGN.md (sin Tailwind, sin Inter, sin UI kits por defecto). dnd-kit para drag & drop, ECharts para gráficos, accesible por teclado y con contraste validado (RNF-012).
14. **Una historia no está terminada sin prueba**: al implementarla se actualiza [docs/matriz-trazabilidad.md](docs/matriz-trazabilidad.md) con commit, caso de prueba y resultado.
15. Puertos: API 4000, frontend 5173, Postgres 5432. Los puertos 3000/8000/27017 los ocupa otro proyecto Docker ("talia") — no tocarlos.
