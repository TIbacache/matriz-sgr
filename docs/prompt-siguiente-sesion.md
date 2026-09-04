# Prompt para abrir una sesión nueva

Copiar y pegar tal cual. Se mantiene corto a propósito: **no repite lo que ya está en los documentos**, los señala. Actualizarlo al cerrar cada bloque, junto con [siguiente-sesion.md](siguiente-sesion.md).

**Última actualización**: 4 de septiembre de 2026 · `main` en la etiqueta `v0.14.0-dashboard-v2`
**Lo que abre**: el **Planner** (bloqueante para la evaluación) y la **entrega del 15 de septiembre**. El código quedó con un solo cálculo: el Bloque C cerró la deuda técnica más cara.

---

```
Continuamos el proyecto SGR (Sistema de Gestión de Resultados), en
c:\Users\zgf\Documents\Scripts\matriz-sgr.

ANTES DE ESCRIBIR CÓDIGO, audita en este orden (regla 1 del proyecto: varias
entidades ya existen sin API o sin pantalla, y duplicar algo sería el error
más caro):

1. CLAUDE.md — reglas del proyecto y estado real del código.
2. docs/siguiente-sesion.md — §4 abre con el orden acordado (Planner →
   entrega del 15 → panel RF-030 → pruebas formales) y la tabla de cabos
   sueltos; §6 son las trampas del entorno, que ya costaron horas.
3. docs/requerimientos-oficiales.md — la especificación que se evalúa. Su §10
   son las 12 consultas abiertas al docente: NO inventar esas respuestas.
   §9.bis y §9.ter son las instrucciones que dio en clase, sin rúbrica.
4. docs/estado-proyecto.md — cuentas y roles (§1), contrato de la API (§3),
   las pantallas y por qué son así (§6), las decisiones tomadas (§7) y lo que
   aprendimos probando (§8).
5. docs/decisiones-tecnicas.md — 14 ADR. Los más recientes: ADR-012 y ADR-013
   (quién ve datos de un vecino: decisión legal, no de comodidad) y ADR-014
   (cómo se consolida una delegación).
6. DESIGN.md — normativo para todo el frontend. §8.2 los criterios de cada
   pantalla, §3.3 dónde puede ir el rojo institucional, §10.7 cómo se verifica.

Verifica el estado real con Docker arriba (docker compose up -d):
      cd backend && npm run build && npm run verificar:calculo
      npm run dev   (en otra terminal)
      npm run smoke && npm run verificar:api
      cd frontend && npm run build && npm run verificar:contraste
Deben dar 314 comprobaciones en verde (21 + 32 + 178 + 83). Si algo falla,
repórtalo antes de avanzar.

⚠ Antes de levantar el backend, mira si hay `tsx watch` huérfanos: en la
sesión del Bloque C había CINCO vivos de días anteriores, peleando por el
4000 y ninguno escuchando. Matar al hijo no basta, el vigilante lo respawnea:
hay que subir al padre (receta exacta en siguiente-sesion.md §6).

⚠ El seed tarda ~15 minutos (genera y escribe ~2.000 PNG de evidencia uno por
uno). No lo corras "por si acaso": corre `SELECT count(*)` primero.

TAREA — en este orden, acordado al cerrar el Bloque C:

  1. EL PLANNER. Bloqueante y no depende de nada del código. El docente dijo
     que SOLO revisará el Planner: lo que no esté adjunto ahí no se evalúa,
     por mucho que esté en el repositorio. Receta en docs/guia-cargar-planner.md
     y scripts/cargar-plan-planner.ps1. El plan de 58 tareas sigue sin cargar.

  2. ENTREGA DEL 15 DE SEPTIEMBRE: mockups, MER, modelo de datos, diagrama de
     clases, diagramas UML, historias y 10 casos de uso. Guía paso a paso en
     docs/Guia-Entregables-15-septiembre.docx. Ojo: el dashboard cambió con el
     Bloque C, así que hay que REGENERAR los mockups
     (cd frontend && npm run mockups && npm run verificar:mockups) y los
     diagramas (npm run diagramas) antes de adjuntar nada.

  3. PANEL DE ACTIVIDAD DE USUARIOS (RF-030, HU-19), pedido expresamente por
     el docente en clase: quién ingresó, quién NO y quién está trabajando
     ahora, para admin y coordinador. Las piezas existen (`ultimoIngreso`,
     `diasSinIngreso`, `totalIngresos`, `promedioDiario`, presencia por
     socket) y el Bloque C dejó la primera en pantalla: el tablero ya nombra
     a las delegaciones SIN MEDICIÓN. Falta el "quién no ha ingresado" por
     persona y una presencia a nivel de organización.
     ⚠ "Ingresar" es ambiguo (iniciar sesión vs. registrar trabajo) y un panel
     de conexión es monitoreo de personas trabajadoras: finalidad y
     proporcionalidad, no vigilancia (regla 18, requerimientos §9.ter).

  4. BLOQUE D — pruebas en marco formal (Jest para el backend portando las 32
     comprobaciones de verificar-cumplimiento.ts, RTL para el frontend) y CI
     en GitHub Actions. Después el BLOQUE E — despliegue.

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
- Documentar al cerrar el bloque en el archivo que corresponda (CLAUDE.md,
  DESIGN.md, README.md, docs/*, memoria). No dejarlo para el final.
- Flujo de git: rama por bloque → verificar en verde → documentar →
  git merge --no-ff → etiqueta anotada vX.Y.Z-<bloque> → push. En PowerShell,
  `git commit -F archivo.txt` y `git merge --no-commit` + `git commit -F`:
  los mensajes con here-string rompen ambos comandos. Y NUNCA editar
  documentación con Get-Content + Set-Content: corrompe los acentos.
- Nada de atribución de herramientas de IA en etiquetas, PR ni entregables.

Contexto que NO hay que volver a derivar:
- HAY UN SOLO CÁLCULO (Bloque C). `services/cumplimiento.ts` mide por
  funcionario y `consolidarPeriodo()` lo agrega por delegación y por área del
  cargo. La vista materializada v1, la tabla `metas`, `/metas`,
  `/kpis/cumplimiento`, `/kpis/recalcular` y el cron SE ELIMINARON. No
  revivirlos: si el volumen obliga a cachear, se cachea el resultado del
  motor (ADR-014). `GET /kpis/tubo` se queda.
- La delegación es el PROMEDIO SIMPLE de sus funcionarios, y una delegación
  sin nadie con metas NO cumple 0%: no tiene medición y se informa aparte
  (ADR-014). La Pampa está sin medición A PROPÓSITO en el seed, para poder
  mostrarlo.
- El eje del mapa de calor es `Cargo.area`, no `CategoriaGestion`: las
  categorías son del TUBO y no tienen relación con lo que se le mide a una
  persona.
- La identidad visual está cerrada (Bloques D0 y D1): Libre Franklin +
  General Sans, los dos rojos separados por rol/zona/forma, faro en SVG que
  gira e ilumina el mar, la escena de La Serena en la barra, la frase
  «Lo que se atiende, se registra; lo que se registra, avanza», y dos
  regímenes de movimiento (DESIGN §3.6). No reabrir. Sin Tailwind.
- CA-04 está CERRADO (Bloque B4): el caso social con sus tres gestiones
  existe, avanza y se consulta cruzando delegaciones. La regla que lo
  sostiene es ADR-013: el servidor decide en qué casillero cae cada gestión,
  no el cliente. No agregar un selector de "número de gestión".
- EP-01 está COMPLETA (Bloque B5): el tubo captura INT/EXT, solicitante,
  territorio, área de apoyo y el vínculo OPCIONAL con la ficha del vecino. No
  se pide RUT en el tubo —la planilla real no tiene esa columna y el
  solicitante puede ser una organización—.
- CA-06, CA-08 y CA-09 están CERRADOS. CA-06 lo cerró el Bloque C con la
  comprobación de que el total del tablero coincide con el detalle filtrado.
- El alcance de los datos de un vecino es una decisión LEGAL, no de
  comodidad: ADR-012 y ADR-013. No ampliarlo sin que el docente responda la
  consulta nº 12.
- Precisiones del docente en clase, en requerimientos-oficiales §9.ter:
  (a) admin y coordinador deben ver quién ingresó, quién NO y quién está
      trabajando ahora (RF-030, HU-19);
  (b) la mayoría de las fórmulas de ponderación son REGLA DE TRES SIMPLE.
      Las dos excepciones legítimas son el ítem inverso y el tope configurable.

CABOS SUELTOS que conviene tomar cuando se toque su archivo (no como bloque
propio; la lista completa está en siguiente-sesion.md §4):
- `GET /cumplimiento/:periodoId` devuelve el detalle POR FUNCIONARIO a todos
  los roles. El tablero no lo necesita, pero roza la consulta abierta nº 11.
- No se declara `color-scheme`: los controles nativos se pintan en claro
  también en el tema oscuro.
- `TareaHistorial` sigue sin usarse (RF-018, es lo que le falta a CA-03).
- El historial del vecino no pagina (trae hasta 500 hechos).
- Corregir una gestión ya registrada de una atención social (ADR-013).

Trabaja por bloques y al cerrar cada uno dame un informe breve (qué se hizo,
qué falta, decisiones, riesgos) y espera aprobación.
```
