# Prompt para abrir una sesión nueva

Copiar y pegar tal cual. Se mantiene corto a propósito: **no repite lo que ya está en los documentos**, los señala. Actualizarlo al cerrar cada bloque, junto con [siguiente-sesion.md](siguiente-sesion.md).

**Última actualización**: 2 de septiembre de 2026 · `main` en la etiqueta `v0.9.0-entregables-visuales`
**Bloque que abre**: B3 — ficha del vecino (ADR-008, CA-04, RF-032).

---

```
Continuamos el proyecto SGR (Sistema de Gestión de Resultados), en
c:\Users\zgf\Documents\Scripts\matriz-sgr.

ANTES DE ESCRIBIR CÓDIGO, audita en este orden (regla 1 del proyecto: varias
entidades ya existen sin API o sin pantalla, y duplicar algo sería el error
más caro):

1. CLAUDE.md — reglas del proyecto y estado real del código.
2. docs/siguiente-sesion.md — qué sigue, cabos sueltos y trampas del entorno.
   El Bloque B3 (ficha del vecino) es el que abre.
3. docs/requerimientos-oficiales.md — la especificación que se evalúa: RF-032
   (búsqueda), CA-04 (la secuencia completa del caso del vecino), HU-03 y
   HU-29. Su §10 son las 11 consultas abiertas al docente: NO inventar esas
   respuestas.
4. docs/decisiones-tecnicas.md — ADR-008 (la persona usuaria es única por
   organización, no por delegación: eso es lo que hace detectable el caso del
   niño que pidió el mismo regalo en cinco delegaciones), ADR-001 (RUT),
   ADR-003 (nombres), y ADR-010/ADR-011 (la identidad visual ya decidida).
5. DESIGN.md — §8.2 «Ficha del vecino y trazabilidad» tiene los criterios
   fijados antes de construirla; §3.3 y §8.11 dicen dónde puede y dónde no
   puede ir el rojo institucional; §10.7 cómo se verifica lo visual.
6. docs/estado-proyecto.md — cuentas y roles (§1), contrato de la API (§3),
   las pantallas y por qué son así (§6), las 30 decisiones tomadas (§7) y lo
   que aprendimos probando (§8).

Verifica el estado real con Docker arriba (docker compose up -d):
      cd backend && npm run build && npm run verificar:calculo
      npm run dev   (en otra terminal)
      npm run smoke && npm run verificar:api
      cd frontend && npm run build && npm run verificar:contraste
Deben dar 216 comprobaciones en verde (17 + 21 + 95 + 83). Si algo falla,
repórtalo antes de avanzar. Si `npm run dev` no arranca, revisa si el 4000 o
el 5173 los tiene un proceso huérfano (receta en siguiente-sesion.md §6), y
si Prisma no conecta, lo más probable es que el contenedor de Postgres esté
detenido: `docker compose up -d` y esperar a que responda `pg_isready`.

Al terminar la pantalla, regenera los entregables visuales y verifícalos:
      cd frontend && npm run mockups && npm run verificar:mockups
La ficha del vecino se suma a docs/mockups/ con su .html y su .png, y se
adjunta a la tarea de Planner (regla 19: lo que no está en Planner no se
evalúa, y el frontend además debe verse en GitHub).

TAREA — Bloque B3: la ficha del vecino.

  Es el control que el cliente vino a buscar: la misma persona atendida en
  varias delegaciones. Piezas:
   1. Endpoint de búsqueda de PersonaUsuaria por RUT (y por nombre, con el
      índice de expresión del ADR-003), con alcance por rol y multi-tenant.
      Auditar primero: la entidad existe, el helper de RUT existe, el índice
      existe; lo que falta es la ruta. Antes de decidir quién puede buscar,
      leer la Ley 19.628/21.719 en CLAUDE.md regla 18: rige lo restrictivo y
      se documenta como consulta si hay duda.
   2. Historial de la persona cruzando delegaciones, con la delegación de
      cada atención, y el aviso ámbar cuando hay atenciones del mismo tipo en
      distintas delegaciones dentro de la ventana configurable (parametro,
      nunca un número en el código). El aviso informa; no bloquea ni acusa.
   3. Pantalla /vecinos: buscador arriba con resultado inmediato, línea de
      tiempo vertical, aviso explícito. Nace con la identidad nueva: marca
      ●▲■ mono sobre rojo, --seleccion dentro de la tabla, nada de --acento
      en una zona de datos.
   4. Verificaciones en backend/scripts/verificar-api-v2.ts (incluida la de
      los seis roles), captura con las seis cuentas, y la fila en
      docs/matriz-trazabilidad.md.

Reglas no negociables (están en CLAUDE.md, se repiten porque son las que más
se olvidan):
- Ningún valor de negocio en el código: todo sale de `parametro` o de
  `CatalogoItem`. Prohibido fijar 90/91 días.
- Marco legal chileno: Ley 21.663 de ciberseguridad y Leyes 19.628 / 21.719
  de datos personales. La ficha del vecino es la pantalla con más datos
  personales del sistema: finalidad, proporcionalidad y mínimo privilegio.
- Todo PATCH aplica bloqueo optimista con `version` y responde 409; todo
  write crítico audita; todo write emite su evento. Endpoint mudo = bug.
- Multi-tenant: toda query filtra por organizationId del JWT; recurso ajeno
  → 404, identificador mal formado → 400.
- Una historia no está terminada sin prueba: extiende verificar-api-v2.ts y
  actualiza docs/matriz-trazabilidad.md con commit, prueba y resultado.
- Probar cada pantalla con los seis roles: `node scripts/capturas.mjs` en
  frontend lo hace en un comando. Mirar las capturas, no solo generarlas.
- Todo cambio de color pasa por `npm run verificar:contraste`.
- Documentar al cerrar cada bloque en el archivo que corresponda (CLAUDE.md,
  DESIGN.md, README.md, docs/*, memoria). No dejarlo para el final.
- Flujo de git: rama por bloque → verificar en verde → documentar →
  git merge --no-ff → etiqueta anotada vX.Y.Z-<bloque> → push. En PowerShell,
  `git commit -F archivo.txt` y `git merge --no-commit` + `git commit -F`:
  los mensajes con here-string rompen ambos comandos. Y NUNCA editar
  documentación con Get-Content + Set-Content: corrompe los acentos.
- Nada de atribución de herramientas de IA en etiquetas, PR ni entregables.

Contexto que NO hay que volver a derivar:
- La identidad visual está cerrada (Bloques D0 y D1): Libre Franklin +
  General Sans, los dos rojos separados por rol/zona/forma, faro en SVG que
  gira e ilumina el mar (dibujado a partir del real), la escena de La Serena
  en la barra (San Francisco, jarro pato, La Recova, El Miliciano, papayo,
  faro, camanchaca y greca diaguita), frase
  «Lo que se atiende, se registra; lo que se registra, avanza», y dos
  regímenes de movimiento (DESIGN §3.6): ambiente solo en login y barra,
  estado en los datos, hover en todo lo clickeable. No reabrir. Sin Tailwind.
- "v1" no significa obsoleto. /tareas (el tubo, EP-04), /unidades (RF-001) y
  /categorias sostienen requisitos vigentes y hay que endurecerlas. Las que
  mueren son /metas v1 y /kpis/cumplimiento (con el Bloque C).
- El docente dijo que SOLO revisará el Planner. El plan de 58 tareas sigue
  sin cargar y eso es bloqueante para la evaluación, no deuda técnica.
- La entrega del 15 de septiembre (mockups, MER, modelo de datos, diagrama de
  clases, UML, historias, 10 casos de uso) tiene su guía en
  docs/Guia-Entregables-15-septiembre.docx. En pausa hasta la rúbrica escrita.
- Precisiones del docente en clase, en requerimientos-oficiales §9.ter:
  (a) admin y coordinador deben ver quién ingresó, quién NO ingresó y quién
      está trabajando ahora (RF-030, HU-19). Las piezas existen; falta el
      panel. "Ingresar" es ambiguo y un panel de conexión es monitoreo de
      personas — finalidad y proporcionalidad, no vigilancia.
  (b) la mayoría de las fórmulas de ponderación son REGLA DE TRES SIMPLE.
      Las dos excepciones legítimas son el ítem inverso y el tope configurable.

Trabaja por bloques y al cerrar cada uno dame un informe breve (qué se hizo,
qué falta, decisiones, riesgos) y espera aprobación.
```
