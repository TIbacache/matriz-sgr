# CLAUDE.md — Matriz SGR

Sistema multi-tenant de gestión territorial (kanban en tiempo real + metas ponderadas + semáforos BI). Proyecto universitario del equipo Origami SpA. Repo privado: TIbacache/matriz-sgr.

## Leer antes de trabajar

- **[docs/estado-proyecto.md](docs/estado-proyecto.md)** — estado por fase, contrato completo de API y Socket.io, decisiones tomadas, cabos sueltos. LA fuente de verdad; actualizarla al cerrar cada fase.
- **[DESIGN.md](DESIGN.md)** — normativo para TODO el frontend (tipografías, tokens, lista negra). Un PR que viole su §8 se rechaza.
- [docs/restricciones-y-pendientes.md](docs/restricciones-y-pendientes.md) — bloqueos por terceros y restricción de costo cero.
- [docs/historias-usuario.md](docs/historias-usuario.md) — criterios de aceptación (HU-x.y referenciadas en commits y código).

## Comandos

```powershell
docker compose up -d          # Postgres 16 (raíz del repo)
cd backend
npm run dev                   # API + Socket.io en :4000 (tsx watch)
npm run build                 # tsc estricto — debe pasar siempre antes de commit
npm run smoke                 # test integración tiempo real/permisos (server corriendo)
npx prisma migrate dev        # migraciones
npx prisma db seed            # datos demo (login: admin@demo.cl / matriz123)
cd frontend
npm run dev                   # UI en :5173 (Vite)
```

## Reglas del proyecto

1. **Metodología**: trabajar por fases; al cerrar una fase, informe breve (qué se hizo / qué falta / decisiones / riesgos) y esperar aprobación. Commits en español, convencionales, referenciando HU cuando aplique.
2. **Todo write en la API debe emitir su evento** vía `emitEvent()` de `backend/src/services/broadcast.ts` (rooms: `unidad:<id>`, `org:<id>`). Endpoint mudo = bug.
3. **Multi-tenant**: toda query filtra por `organizationId` del JWT; recurso de otro tenant responde **404**. Toda tabla nueva lleva `organization_id`.
4. **Costo cero**: no introducir dependencias/servicios de pago. VPS solo al final.
5. **No inventar el cálculo de "Objetivo al día"** ni las columnas de asistencia: están pendientes de los profesores (mostrar "pendiente de definición").
6. **Frontend**: CSS3 plano con los tokens de DESIGN.md (sin Tailwind, sin Inter, sin UI kits por defecto). dnd-kit para drag & drop, ECharts para gráficos.
7. Puertos: API 4000, frontend 5173, Postgres 5432. Los puertos 3000/8000/27017 los ocupa otro proyecto Docker ("talia") — no tocarlos.
