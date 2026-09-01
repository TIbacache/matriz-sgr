# Prompt para abrir una sesión nueva

Copiar y pegar tal cual. Se mantiene corto a propósito: **no repite lo que ya está en los documentos**, los señala. Actualizarlo al cerrar cada bloque, junto con [siguiente-sesion.md](siguiente-sesion.md).

**Última actualización**: 1 de septiembre de 2026 · `main` en la etiqueta `v0.7.1-metas-privacidad`
**Bloque que abre**: D0 — rediseño visual con la identidad de la Municipalidad de La Serena.

---

```
Continuamos el proyecto SGR (Sistema de Gestión de Resultados), en
c:\Users\zgf\Documents\Scripts\matriz-sgr.

Esta sesión es de DISEÑO. El software funciona; lo que falta es que se vea
como debe verse.

ANTES DE ESCRIBIR CÓDIGO, audita en este orden (regla 1 del proyecto: varias
entidades ya existen sin API o sin pantalla, y duplicar algo sería el error
más caro):

1. CLAUDE.md — reglas del proyecto y estado real del código.
2. DESIGN.md — normativo para todo el frontend. Su §10 es EL ENCARGO DE ESTA
   SESIÓN: identidad municipal, dirección creativa y los siete límites que no
   se pueden cruzar. Su §8.1 (accesibilidad) y §8.2 (criterios por pantalla)
   siguen vigentes y no se renegocian.
3. docs/estado-proyecto.md — cuentas y roles (§1), contrato de la API (§3),
   las cinco pantallas y por qué son así (§6), las 23 decisiones tomadas (§7)
   y lo que aprendimos probando (§8).
4. docs/siguiente-sesion.md — qué sigue, cabos sueltos y trampas del entorno.
5. docs/requerimientos-oficiales.md — la especificación que se evalúa. Su §10
   son las 11 consultas abiertas al docente y su §9.bis las instrucciones
   verbales sin rúbrica: NO inventar esas respuestas.

Verifica el estado real con Docker arriba (docker compose up -d):
      cd backend && npm run build && npm run verificar:calculo
      npm run dev   (en otra terminal)
      npm run smoke && npm run verificar:api
      cd frontend && npm run build
Deben dar 133 comprobaciones en verde (17 + 21 + 95). Si algo falla,
repórtalo antes de avanzar. Si `npm run dev` no arranca, revisa si el puerto
4000 o el 5173 los tiene un proceso huérfano: responde igual y te deja
depurando sin ver logs (receta en docs/siguiente-sesion.md §6).

TAREA — Bloque D0: rediseño visual, siguiendo DESIGN §10.

  La norma gráfica de la Municipalidad de La Serena manda sí o sí, y dentro
  de ella el diseño es nuestro. El desafío es que sea innovador, moderno, muy
  amigable, reactivo y animado donde el movimiento signifique algo. Cumplir
  la norma es el piso, no el techo: entregar algo que solo cumpla y sea
  sobrio es no haber hecho el trabajo.

  Los valores del manual oficial 2019 ya están verificados y no hay que
  volver a buscarlos (rojo institucional #DB0032, heráldico #8A0007, rojo
  oscuro #971A3A, negro profundo, Arial en documentos). Están en DESIGN §10.1
  junto con los cinco valores de identidad que declara el propio municipio:
  histórica, tradicional, patrimonial, turística y calidad de vida.

  Orden sugerido:
   1. Resolver las DOS decisiones abiertas antes de tocar CSS:
      - la tipografía de pantalla (DESIGN §10.3);
      - cómo conviven el rojo institucional y el rojo del semáforo sin que el
        semáforo deje de leerse (DESIGN §10.2). Es el riesgo real del bloque.
      Ambas se registran como ADR en docs/decisiones-tecnicas.md.
   2. tokens.css y base.css: la identidad nueva, en los dos temas.
   3. Login: es donde la identidad se juega. La propuesta del equipo es la
      costa de La Serena con el Faro Monumental en transparencia (DESIGN
      §10.4). El faro orienta, que es lo que hace el sistema.
   4. Las cinco pantallas: /, /ficha, /verificacion, /metas, /dashboard.
      Los gráficos leen los tokens vivos y deberían seguir el cambio solos.
   5. Probar CADA pantalla con las SEIS cuentas y mirar las capturas.

Reglas no negociables (están en CLAUDE.md, se repiten porque son las que más
se olvidan):
- Contraste antes que atmósfera: ninguna imagen de fondo baja el texto de
  4.5:1. Si el faro compromete la lectura, se atenúa el faro.
- El semáforo verde/naranjo/rojo NO se toca: es dato, no identidad. Y nunca
  se comunica solo con color (marca ●▲■ o texto, siempre).
- prefers-reduced-motion se respeta; toda animación nueva entra con su
  apagado. El movimiento significa estado, no decora.
- Peso: la ficha se abre desde un teléfono en terreno. Nada pesado en la
  ruta crítica.
- El escudo municipal NO se usa sin autorización: el Artículo 3 del propio
  reglamento exige el visto bueno del Departamento de Comunicaciones
  Estratégicas. Se aplican paleta y tipografía; identidad propia del
  proyecto, declarando que es un ejercicio académico con datos ficticios.
- Ningún valor de negocio en el código: todo sale de `parametro` o de
  `CatalogoItem`. Prohibido fijar 90/91 días.
- Todo PATCH aplica bloqueo optimista con `version` y responde 409; todo
  write crítico audita; todo write emite su evento. Endpoint mudo = bug.
- Multi-tenant: toda query filtra por organizationId del JWT; recurso ajeno
  → 404, identificador mal formado → 400.
- Una historia no está terminada sin prueba: extiende
  backend/scripts/verificar-api-v2.ts (o el smoke) y actualiza
  docs/matriz-trazabilidad.md con commit, prueba y resultado.
- Probar cada pantalla con los seis roles, no solo con el propio: los cuatro
  errores reales del proyecto salieron así (docs/estado-proyecto.md §8).
- Documentar al cerrar cada bloque en el archivo que corresponda (CLAUDE.md,
  DESIGN.md, README.md, docs/*, memoria). No dejarlo para el final.
- Flujo de git: rama por bloque → verificar en verde → documentar →
  git merge --no-ff → etiqueta anotada vX.Y.Z-<bloque> → push. En PowerShell,
  `git commit -F archivo.txt` y `git merge --no-commit` + `git commit -F`:
  los mensajes con here-string rompen ambos comandos. Y NUNCA editar
  documentación con Get-Content + Set-Content: corrompe los acentos.
- Nada de atribución de herramientas de IA en etiquetas, PR ni entregables.

Contexto que NO hay que volver a derivar:
- "v1" no significa obsoleto. /tareas (el tubo, EP-04), /unidades (RF-001) y
  /categorias sostienen requisitos vigentes y hay que endurecerlas. Las que
  mueren son /metas v1 y /kpis/cumplimiento (con el Bloque C).
- El docente dijo que SOLO revisará el Planner. El plan de 58 tareas sigue
  sin cargar y eso es bloqueante para la evaluación, no deuda técnica.
- La entrega del 15 de septiembre (mockups, MER, modelo de datos, diagrama de
  clases, UML, historias, 10 casos de uso) tiene su guía en
  docs/Guia-Entregables-15-septiembre.docx. Está en pausa hasta que el
  docente publique la rúbrica escrita.
- Ficha del vecino, endurecer rutas y Bloque C quedan DESPUÉS del rediseño,
  por decisión del equipo: construirlas antes obligaría a rehacerlas.

Trabaja por bloques y al cerrar cada uno dame un informe breve (qué se hizo,
qué falta, decisiones, riesgos) y espera aprobación.
```
