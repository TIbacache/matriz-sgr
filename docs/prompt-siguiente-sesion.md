# Prompt para abrir una sesión nueva

Copiar y pegar tal cual. Se mantiene corto a propósito: **no repite lo que ya está en los documentos**, los señala. Actualizarlo al cerrar cada bloque, junto con [siguiente-sesion.md](siguiente-sesion.md).

**Última actualización**: 1 de septiembre de 2026 · `main` en la etiqueta `v0.6.0-metas-funcionario`

---

```
Continuamos el proyecto SGR (Sistema de Gestión de Resultados), en
c:\Users\zgf\Documents\Scripts\matriz-sgr.

ANTES DE ESCRIBIR CÓDIGO, audita en este orden (regla 1 del proyecto: varias
entidades ya existen sin API, y crear una tabla o un endpoint duplicado sería
el error más caro):

1. CLAUDE.md — reglas del proyecto y estado real del código.
2. docs/siguiente-sesion.md — qué sigue, cabos sueltos, trampas del entorno y
   definición de terminado.
3. docs/requerimientos-oficiales.md — la especificación que se evalúa (38 RF,
   18 RNF, 13 RN, 10 CA, 31 historias). Su §10 son las 10 consultas abiertas
   al docente: NO inventar esas respuestas.
4. docs/estado-proyecto.md — contrato de la API v2, eventos de Socket.io y las
   decisiones ya tomadas por bloque (no re-discutirlas sin motivo).
5. DESIGN.md — normativo para todo el frontend. Un PR que viole su §8 se
   rechaza. §8.2 tiene los criterios de las pantallas que faltan.
6. backend/prisma/schema.prisma — 16 entidades del modelo v2 ya migradas.

Verifica el estado real ejecutando, con Docker arriba (docker compose up -d):
      cd backend && npm run build && npm run verificar:calculo
      npm run dev   (en otra terminal)
      npm run smoke && npm run verificar:api
      cd frontend && npm run build
Deben dar 126 comprobaciones en verde (17 + 21 + 88). Si algo falla,
repórtalo antes de avanzar. Si `npm run dev` no arranca, revisa si el puerto
4000 lo tiene un tsx watch huérfano: el proceso viejo responde igual y te deja
depurando sin ver logs (receta en docs/siguiente-sesion.md §6).

TAREA: [elegir una del bloque de pendientes de docs/siguiente-sesion.md §3.
 Orden recomendado hoy:
   1. Pantalla de configuración de metas (HU-05): la API `/metas-item` ya
      existe y `PUT` guarda el conjunto cuadrado al 100% de una sola vez.
      Falta la interfaz que use `GET /cargos` para ofrecer los ítems.
   2. Ficha del vecino (ADR-008, CA-04): primero el endpoint de búsqueda de
      PersonaUsuaria por RUT, que no existe; después la pantalla con el
      historial cruzando delegaciones.
   3. Endurecer las rutas v1 (/tareas, /metas, /unidades, /categorias) con
      `version` → 409 y auditoría, que hoy tienen distinto estándar que el
      modelo v2 (CA-08, CA-09, RNF-008).
   4. Bloque C: migrar el dashboard al motor v2 por funcionario y eliminar la
      vista materializada v1, para que no queden dos verdades.]

Reglas no negociables (están en CLAUDE.md, se repiten porque son las que más
se olvidan):
- Ningún valor de negocio en el código: todo sale de `parametro` o de
  `CatalogoItem`, vía services/parametros.ts. Prohibido fijar 90/91 días.
- Todo PATCH aplica bloqueo optimista con `version` y responde 409 en
  conflicto; todo write crítico llama a services/auditoria.ts; todo write
  emite su evento con emitEvent(). Endpoint mudo = bug.
- Multi-tenant: toda query filtra por organizationId del JWT; recurso ajeno
  → 404.
- Usar lib/rut.ts, lib/fechas.ts, lib/persona.ts y lib/telefono.ts; no
  reimplementarlos. "Hoy" se calcula en el servidor.
- Una historia no está terminada sin prueba: extiende
  backend/scripts/verificar-api-v2.ts (o el smoke) y actualiza
  docs/matriz-trazabilidad.md con commit, prueba y resultado.
- Probar cada pantalla con los seis roles, no solo con el propio: los dos
  últimos errores reales (bandeja y tubo) solo se veían así.
- Documentar al cerrar cada bloque en el archivo que corresponda (CLAUDE.md,
  DESIGN.md, README.md, docs/*, memoria). No dejarlo para el final.
- Flujo de git: rama por bloque → verificar en verde → documentar →
  git merge --no-ff → etiqueta anotada vX.Y.Z-<bloque> → push. En PowerShell,
  `git commit -F archivo.txt` y `git merge --no-commit` + `git commit -F`:
  los mensajes con here-string rompen ambos comandos.
- Nada de atribución de herramientas de IA en etiquetas, PR ni entregables.

Trabaja por bloques y al cerrar cada uno dame un informe breve (qué se hizo,
qué falta, decisiones, riesgos) y espera aprobación.
```
