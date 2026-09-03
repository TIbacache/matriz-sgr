# Prompt para abrir una sesión nueva

Copiar y pegar tal cual. Se mantiene corto a propósito: **no repite lo que ya está en los documentos**, los señala. Actualizarlo al cerrar cada bloque, junto con [siguiente-sesion.md](siguiente-sesion.md).

**Última actualización**: 3 de septiembre de 2026 · `main` en la etiqueta `v0.12.0-atencion-social`
**Bloque que abre**: B5 — la solicitud del vecino en el tubo (RF-016, RF-017). No es una mejora: es un agujero de trazabilidad que hace parecer roto algo que funciona.

---

```
Continuamos el proyecto SGR (Sistema de Gestión de Resultados), en
c:\Users\zgf\Documents\Scripts\matriz-sgr.

ANTES DE ESCRIBIR CÓDIGO, audita en este orden (regla 1 del proyecto: varias
entidades ya existen sin API o sin pantalla, y duplicar algo sería el error
más caro):

1. CLAUDE.md — reglas del proyecto y estado real del código.
2. docs/siguiente-sesion.md — §3 tiene el Bloque B5 con su plan completo, y
   §4 y §6 los cabos sueltos y las trampas del entorno.
3. docs/requerimientos-oficiales.md — la especificación que se evalúa:
   RF-016 (compromisos internos o externos), RF-017 (solicitante, territorio,
   responsable, área de apoyo, fecha comprometida), RF-018 a RF-021 y CA-03.
   Su §10 son las 12 consultas abiertas al docente: NO inventar esas
   respuestas.
4. docs/estructura-planilla-real.md §6 — las columnas REALES del tubo. Fíjate
   en lo que NO tienen: no hay columna RUT. SOLICITANTE es texto libre y
   muchos compromisos son internos.
5. docs/decisiones-tecnicas.md — ADR-008 (la persona usuaria es única por
   organización), ADR-012 y ADR-013 (quién ve qué de un vecino y con qué
   detalle), ADR-005 (concurrencia) y ADR-007 (nada de valores de negocio en
   el código).
6. DESIGN.md — §8.2 tiene los criterios de las pantallas construidas; §3.3
   dice dónde puede y dónde no puede ir el rojo institucional; §10.7, cómo se
   verifica.
7. docs/estado-proyecto.md — cuentas y roles (§1), contrato de la API (§3),
   las pantallas y por qué son así (§6), las decisiones tomadas (§7) y lo que
   aprendimos probando (§8).

Verifica el estado real con Docker arriba (docker compose up -d):
      cd backend && npm run build && npm run verificar:calculo
      npm run dev   (en otra terminal)
      npm run smoke && npm run verificar:api
      cd frontend && npm run build && npm run verificar:contraste
Deben dar 278 comprobaciones en verde (18 + 21 + 156 + 83). Si algo falla,
repórtalo antes de avanzar. Si `npm run dev` muere con EADDRINUSE mientras
`curl localhost:4000/health` responde 200, hay un `tsx watch` huérfano: matar
al hijo NO basta, el vigilante lo respawnea — hay que subir al proceso padre
(receta exacta en siguiente-sesion.md §6). Si Prisma no conecta, lo más
probable es que el contenedor de Postgres esté detenido.

TAREA — Bloque B5: la solicitud del vecino en el tubo.

  EL HECHO: `backend/src/services/vecinos.ts` ya LEE `tarea.personaUsuariaId`
  y la línea de tiempo del vecino muestra sus compromisos del tubo. Pero
  NINGUNA PANTALLA PUEDE CREAR ESE VÍNCULO: ni el `tareaSchema` de
  `tareas.routes.ts` ni `NuevaTareaModal.tsx` aceptan un solo campo del
  solicitante. Solo el seed los llena. Si el docente crea una tarea externa
  desde la aplicación y después busca a ese vecino, el compromiso no aparece,
  y la conclusión razonable sería que la trazabilidad no funciona. Funciona;
  falta el formulario que la alimenta.

  LO QUE NO HAY QUE HACER: pedir RUT obligatorio en el tubo. Contradiría la
  planilla real (fuente 2) y trabaría el registro rápido que el cliente pidió.

  Piezas (todo el modelo YA EXISTE — comprobarlo antes de crear nada):
   1. `INT/EXT` como interruptor (`Tarea.interesExterno`, ya modelado) →
      RF-016.
   2. Si es interna, nada más: el formulario no crece para el caso frecuente.
   3. Si es externa: `solicitante` (texto libre, obligatorio), `territorio`
      (del catálogo `territorio`, YA SEMBRADO, nunca de una lista en el
      código) y `areaApoyo` → RF-017.
   4. Buscador OPCIONAL de vecino que reutiliza `GET /vecinos?q=` del Bloque
      B3 para enlazar `personaUsuariaId`. Opcional a propósito: un
      solicitante puede ser una organización, y forzar la ficha convertiría
      el tubo en un registro de personas que la ley no pide (regla 18).
   5. Extender el `tareaSchema`, exponer los campos en el `GET`, mostrarlos
      en la tarjeta y en el detalle, y VERIFICAR QUE UN COMPROMISO CREADO POR
      API APARECE EN LA FICHA DEL VECINO. Esa es la comprobación que cierra
      el agujero, no la de que el campo se guarda.
   6. Verificaciones en backend/scripts/verificar-api-v2.ts (incluida la de
      los seis roles), captura con las seis cuentas, y la fila en
      docs/matriz-trazabilidad.md.

  ALTERNATIVA, si el equipo prefiere otro orden: el Bloque C (migrar el
  dashboard al motor v2 y eliminar la vista materializada v1, para que no
  queden dos verdades). Preguntar antes de elegir; no decidirlo en silencio.

Reglas no negociables (están en CLAUDE.md, se repiten porque son las que más
se olvidan):
- Ningún valor de negocio en el código: todo sale de `parametro` o de
  `CatalogoItem`. Prohibido fijar 90/91 días.
- Marco legal chileno: Ley 21.663 de ciberseguridad y Leyes 19.628 / 21.719
  de datos personales. Finalidad, proporcionalidad y mínimo privilegio.
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
  regímenes de movimiento (DESIGN §3.6). No reabrir. Sin Tailwind.
- CA-04 está CERRADO (Bloque B4): el caso social con sus tres gestiones
  existe, avanza y se consulta cruzando delegaciones. La regla que lo
  sostiene es ADR-013: el servidor decide en qué casillero cae cada gestión,
  no el cliente. No agregar un selector de "número de gestión".
- CA-08 y CA-09 están CERRADOS (Bloque A3): las tres rutas heredadas
  (/tareas, /unidades, /categorias) comparan `version` → 409 y auditan. El
  tubo avisa el conflicto en pantalla en vez de revertir en silencio.
- El alcance de los datos de un vecino es una decisión LEGAL, no de
  comodidad: ADR-012 y ADR-013. `verificador` y `consulta` no entran; desde
  otra delegación viaja el hecho y el avance, no el contenido. No ampliarlo
  sin que el docente responda la consulta nº 12.
- "v1" no significa obsoleto. Las que mueren son /metas v1 y
  /kpis/cumplimiento, con el Bloque C.
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
