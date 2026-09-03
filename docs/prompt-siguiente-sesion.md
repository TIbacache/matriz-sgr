# Prompt para abrir una sesión nueva

Copiar y pegar tal cual. Se mantiene corto a propósito: **no repite lo que ya está en los documentos**, los señala. Actualizarlo al cerrar cada bloque, junto con [siguiente-sesion.md](siguiente-sesion.md).

**Última actualización**: 3 de septiembre de 2026 · `main` en la etiqueta `v0.10.0-ficha-vecino`
**Bloque que abre**: B4 — las tres gestiones de la atención social (RF-015, HU-03), que es lo único que le falta a CA-04.

---

```
Continuamos el proyecto SGR (Sistema de Gestión de Resultados), en
c:\Users\zgf\Documents\Scripts\matriz-sgr.

ANTES DE ESCRIBIR CÓDIGO, audita en este orden (regla 1 del proyecto: varias
entidades ya existen sin API o sin pantalla, y duplicar algo sería el error
más caro):

1. CLAUDE.md — reglas del proyecto y estado real del código.
2. docs/siguiente-sesion.md — qué sigue, cabos sueltos y trampas del entorno.
3. docs/requerimientos-oficiales.md — la especificación que se evalúa: RF-015
   (atención social con hasta 3 gestiones), RF-004 (catálogos), CA-04 (la
   secuencia completa del caso del vecino) y HU-03. Su §10 son las 12
   consultas abiertas al docente: NO inventar esas respuestas.
4. docs/estructura-planilla-real.md §4 — las columnas REALES de la atención
   social en la planilla del cliente. La entidad AtencionSocial se modeló
   desde ahí; antes de agregar un campo, comprobar que no exista.
5. docs/decisiones-tecnicas.md — ADR-008 (la persona usuaria es única por
   organización), ADR-012 (quién consulta la ficha del vecino y con qué
   detalle: la atención social hereda ese criterio), ADR-006 (auditoría) y
   ADR-007 (nada de valores de negocio en el código).
6. DESIGN.md — §8.2 tiene los criterios de las pantallas; la ficha del vecino
   ya está construida y la atención social se cuelga de ahí. §3.3 dice dónde
   puede y dónde no puede ir el rojo institucional; §10.7, cómo se verifica.
7. docs/estado-proyecto.md — cuentas y roles (§1), contrato de la API (§3),
   las pantallas y por qué son así (§6), las 39 decisiones tomadas (§7) y lo
   que aprendimos probando (§8).

Verifica el estado real con Docker arriba (docker compose up -d):
      cd backend && npm run build && npm run verificar:calculo
      npm run dev   (en otra terminal)
      npm run smoke && npm run verificar:api
      cd frontend && npm run build && npm run verificar:contraste
Deben dar 234 comprobaciones en verde (17 + 21 + 113 + 83). Si algo falla,
repórtalo antes de avanzar. Si `npm run dev` no arranca, revisa si el 4000 o
el 5173 los tiene un proceso huérfano (receta en siguiente-sesion.md §6), y
si Prisma no conecta, lo más probable es que el contenedor de Postgres esté
detenido: `docker compose up -d` y esperar a que responda `pg_isready`.

TAREA — Bloque B4: la atención social y sus tres gestiones.

  CA-04 pide "caso social con 3 gestiones y secuencia consultable". La
  secuencia ya es consultable (Bloque B3, pantalla /vecinos). Falta el caso.
  Piezas:
   1. API de AtencionSocial. LA ENTIDAD YA EXISTE en el esquema con todas sus
      columnas (tipo, sub-atención, requiere visita, primera/segunda/tercera
      gestión, fechas de visita, informe y entrega de beneficio). Es 1:1 con
      Actividad. Lo que falta es la ruta: alta, edición con `version` → 409,
      y las tres gestiones como avance, no como tres registros sueltos.
      Los tipos y sub-atenciones salen de CatalogoItem (tipo_atencion,
      sub_atencion, gestion_1, gestion_2, gestion_3), nunca de una lista en
      el código.
   2. Que la atención social aparezca en el historial del vecino (/vecinos):
      hoy la línea de tiempo muestra actividades y compromisos. Una atención
      social con sus gestiones es lo que cierra CA-04 de punta a punta.
   3. Pantalla o bloque en la ficha personal para registrar y avanzar las
      gestiones, con la identidad de DESIGN §3.3 (zona de datos: nada de
      --acento ni --marca; lo seleccionado es --seleccion).
   4. Verificaciones en backend/scripts/verificar-api-v2.ts (incluida la de
      los seis roles), captura con las seis cuentas, y la fila en
      docs/matriz-trazabilidad.md.

  ALTERNATIVA, si el equipo prefiere otro orden: endurecer las rutas
  heredadas (/tareas, /unidades, /categorias) con `version` → 409 y
  auditoría. Está marcada como prioridad Alta desde hace dos bloques y es lo
  que le falta a CA-08 y CA-09 para pasar de 🟡 a ✅. Preguntar antes de
  elegir; no decidirlo en silencio.

Reglas no negociables (están en CLAUDE.md, se repiten porque son las que más
se olvidan):
- Ningún valor de negocio en el código: todo sale de `parametro` o de
  `CatalogoItem`. Prohibido fijar 90/91 días.
- Marco legal chileno: Ley 21.663 de ciberseguridad y Leyes 19.628 / 21.719
  de datos personales. La atención social es la información MÁS sensible del
  sistema (situación socioeconómica de un vecino): finalidad, mínimo
  privilegio y el criterio ya fijado en ADR-012.
- Todo PATCH aplica bloqueo optimista con `version` y responde 409; todo
  write crítico audita; todo write emite su evento. Endpoint mudo = bug.
- Multi-tenant: toda query filtra por organizationId del JWT; recurso ajeno
  → 404, identificador mal formado → 400.
- Una historia no está terminada sin prueba: extiende verificar-api-v2.ts y
  actualiza docs/matriz-trazabilidad.md con commit, prueba y resultado.
- Probar cada pantalla con los seis roles: `node scripts/capturas.mjs` en
  frontend lo hace en un comando. Mirar las capturas, no solo generarlas.
- Todo cambio de color pasa por `npm run verificar:contraste`.
- Al terminar la pantalla, regenerar los entregables visuales:
      cd frontend && npm run mockups && npm run verificar:mockups
  (regla 19: lo que no está en Planner no se evalúa, y el frontend además
  debe verse en GitHub).
- Documentar al cerrar el bloque en el archivo que corresponda (CLAUDE.md,
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
  gira e ilumina el mar, la escena de La Serena en la barra, la frase
  «Lo que se atiende, se registra; lo que se registra, avanza», y dos
  regímenes de movimiento (DESIGN §3.6): ambiente solo en login y barra,
  estado en los datos, hover en todo lo clickeable. No reabrir. Sin Tailwind.
- La ficha del vecino está cerrada (Bloque B3) y su alcance por rol es una
  decisión LEGAL, no de comodidad: ADR-012. `verificador` y `consulta` no
  entran; para `gerente` y `usuario` el detalle de una atención de otra
  delegación viaja reducido; abrir una ficha se audita con la acción
  `consultar`. No ampliarlo sin que el docente responda la consulta nº 12.
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
