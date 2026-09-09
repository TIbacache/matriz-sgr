# Prompt para abrir una sesión nueva

Copiar y pegar tal cual. Se mantiene corto a propósito: **no repite lo que ya está en los documentos**, los señala. Actualizarlo al cerrar cada bloque, junto con [siguiente-sesion.md](siguiente-sesion.md).

**Última actualización**: 6 de septiembre de 2026 · `main` en la etiqueta `v0.15.0-control-actividad`
**Lo que abre**: la **entrega del 15 de septiembre** (primera evaluación de Análisis y Diseño, 100 pts) y, antes que nada, el **Planner**. El código está terminado para esta entrega; lo que falta son los artefactos de análisis y diseño.

---

```
Continuamos el proyecto SGR (Sistema de Gestión de Resultados), en
c:\Users\zgf\Documents\Scripts\matriz-sgr.

Esta sesión NO es de código: es la entrega del 15 de septiembre, que es de
análisis y diseño. La rúbrica lo dice literal: "Para esta entrega no se
evaluará conexión con base de datos ni consumo de API". De 100 puntos, 85
dependen de artefactos que hoy no existen o describen un modelo que ya no
existe, y solo 10 dependen del software, que es lo único terminado.

LEE PRIMERO, EN ESTE ORDEN:

1. docs/plan-entrega-15-septiembre.md — EL PLAN DE ESTA SESIÓN. Tiene la
   rúbrica criterio por criterio contra lo que hay, las tres decisiones
   tomadas (D-1 MySQL, D-2 alcance de los CU, D-3 escenarios alternativos),
   los 12 casos de uso ya elegidos con su actor y su pantalla, el orden de
   trabajo y el reparto entre las dos personas. Todo lo demás es apoyo.
2. docs/rubrica-entrega-15-septiembre.md — LA RÚBRICA TRANSCRITA: los ocho
   criterios con su puntaje, la ficha mínima de cada caso de uso, la condición
   de los 10 mínimos, la validación de consistencia DER↔script y la cadena de
   artefactos que espera el docente. ⚠ Los PDF originales (la rúbrica y
   "Relación entre los artefactos") llegaron por chat y NO están en el
   repositorio: si los tienes, guárdalos en docs/ y contrástalos.
3. CLAUDE.md — reglas del proyecto y estado real del código.
4. docs/requerimientos-oficiales.md — los 38 RF, 18 RNF, 13 RN, 10 CA y 31 HU.
   Su §10 son las 13 consultas abiertas: NO inventar esas respuestas.
5. docs/estado-proyecto.md — cuentas y roles (§1), contrato de la API (§3) y
   las pantallas (§6). Es de dónde salen los nombres que deben coincidir en
   todos los artefactos.
6. docs/Guia-Entregables-15-septiembre.docx — es del 1 de septiembre (v0.7.1)
   y su estado está desfasado, PERO su §10.4 tiene la ficha de CU-03 ya
   redactada, que sirve de plantilla para las otras once.

ANTES DE TOCAR NADA, comprueba el estado real (Docker arriba):
      cd backend && npm run build && npm run verificar:calculo
      npm run dev   (en otra terminal)
      npm run smoke && npm run verificar:api
      cd frontend && npm run build && npm run verificar:contraste
Deben dar 332 comprobaciones en verde (21 + 37 + 191 + 83).

⚠ Si Docker Desktop no está corriendo, `docker compose up -d` falla con
"open //./pipe/dockerDesktopLinuxEngine". Hay que iniciarlo y esperar al motor.
⚠ Antes de levantar el backend, busca `tsx watch` huérfanos: llegaron a ser
CINCO peleando por el 4000 y ninguno escuchando. Matar al hijo no basta, el
vigilante lo respawnea: hay que subir al padre (receta en siguiente-sesion §6).
⚠ El seed tarda ~15 minutos. No lo corras "por si acaso": `SELECT count(*)`
primero.

TAREA — en este orden, porque las dependencias importan (el diagrama de
requerimientos define los CU, los CU definen las clases y las pantallas, y el
DER define el script; hacerlo al revés obliga a rehacer):

  1. CARGAR EL PLANNER. 15 puntos, no depende de nada y sin él la nota tiene
     techo: el docente dijo que SOLO revisará el Planner. Están las 58 tareas
     en docs/plan-desarrollo.csv, el script scripts/cargar-plan-planner.ps1 y
     la guía docs/guia-cargar-planner.md. La rúbrica pide backlog priorizado,
     épicas, historias, responsables, estados diferenciados, fechas/hitos,
     prioridad y captura del tablero.

  2. DIAGRAMA DE REQUERIMIENTOS (10 pts). No existe. Los 38 RF y 18 RNF con
     código único, agrupados por épica, relacionados con actores y módulos, y
     trazados a los CU. Mermaid tiene `requirementDiagram`, que es lo más
     cercano a la notación del ejemplo del docente («requirement», «refine»,
     «deriveReqt»). Los RF sin implementar (RF-025, 028, 031, 033, 035, 037)
     SÍ van, marcados como no implementados: aquí se muestra el alcance.

  3. CASO DE USO GENERAL (10 pts). Rehacer: el actual tiene 4 actores de 6 y
     casos del modelo v1. Frontera del sistema explícita, los SEIS actores del
     PDF §3 (Administrador, Coordinador, Delegado, Funcionario, Verificador,
     Usuario de consulta) y los ~12 casos principales, sin flujos internos.

  4. LOS 12 CASOS DE USO ESPECÍFICOS (20 pts — el criterio más caro y el más
     vacío). Están ELEGIDOS en el plan §4, con actor, RF y pantalla: CU-01 a
     CU-12, más tres «include» (CU-I1 validar RUT, CU-I2 generar código,
     CU-I3 auditar) y seis «extend» (CU-E1 aviso de duplicidad, CU-E2 exigir
     observación, CU-E3 rechazar validación propia, CU-E4 conflicto 409,
     CU-E5 denegar por alcance con motivo, CU-E6 delegación sin medición).
     Cada uno necesita SU diagrama y SU ficha con los campos exactos de la
     rúbrica: ID, nombre, objetivo, actor principal, actores secundarios,
     precondiciones, disparador, flujo principal numerado, flujos
     alternativos, excepciones, postcondiciones y reglas/requisitos.
     Los flujos NO se inventan: salen del código y de las verificaciones que
     ya existen. Ejemplo: las excepciones de CU-03 son literalmente las
     comprobaciones de verificar-api-v2.ts sobre validación.

  5. DIAGRAMA DE CLASES (15 pts). No existe. Mermaid `classDiagram` con
     visibilidad (+/-/#), atributos tipados, métodos y multiplicidades. Que
     los nombres coincidan con los del DER y los CU: la rúbrica evalúa esa
     coherencia como criterio transversal.

  6. DER (10 pts). Rehacer contra backend/prisma/schema.prisma: son 16
     entidades, no las 7 del diagrama actual. Y el actual incluye `metas` y
     `cumplimiento_ponderado_vista`, que SE ELIMINARON en el Bloque C.

  7. SCRIPT SQL (10 pts) + su verificador. Ver decisión D-1 del plan: se
     entrega MySQL traducido desde el esquema real, declarando las
     equivalencias de tipos, y queda como consulta abierta nº 13. Escribir
     además un script que compruebe contra schema.prisma que no falta ni
     sobra ninguna tabla ni FK — la rúbrica valida esa consistencia a mano y
     nosotros la verificamos, que es más barato y no se olvida.

  8. MOCKUP (10 pts, lo más fuerte que hay). Están las 8 pantallas. Falta lo
     que el mapa del docente llama escenarios alternativos: modales de error,
     avisos y estados vacíos. Tres ya son capturables (aviso de duplicidad,
     403 con motivo escrito, delegación sin medición); el resto hay que
     producirlos ampliando frontend/scripts/mockups.mjs con una lista de
     ESCENARIOS, cada uno anclado al CU cuyo flujo alternativo representa.

  9. INFORME de la entrega con las cuatro tablas de trazabilidad
     (RF→CU, CU→mockup, CU→clase, CU→tabla), el enlace al repositorio y la
     captura del Planner.

 10. DOCUMENTACIÓN VIVA que quedó desfasada y que la rúbrica castiga por
     incoherencia: docs/diagramas.md (retirarlo o rehacerlo apuntando a
     docs/entrega/), README.md (dice "11 ADR" y son 15; y la tabla de
     documentos), docs/historias-usuario.md (decir que las 31 oficiales
     mandan sobre las 20 propias), matriz-trazabilidad.md (agregar columna CU)
     y estado-proyecto.md.

 11. AL CERRAR: publicar el estado del sistema para el compañero, que no tiene
     cuenta de Claude. Generarlo como PDF versionado en el repositorio
     (docs/entrega/estado-del-sistema.pdf) con el mismo pipeline de
     playwright-core + Edge que ya produce los mockups — `page.pdf()` — y
     actualizar además el artifact
     https://claude.ai/code/artifact/187f3aea-a27a-41f4-a4c9-6d6d3f02d185
     El PDF debe permitirle DISEÑAR LOS DIAGRAMAS ÉL MISMO: entidades con sus
     campos y relaciones, servicios con sus responsabilidades, actores, roles
     y alcances, las pantallas y qué hace cada una, y los 12 CU con su flujo.
     No es un resumen ejecutivo: es material de trabajo.

LO QUE NO SE TOCA EN ESTA SESIÓN (para que nadie lo abra "ya que estamos"):
- RF-025 ajustes, RF-028 tablero personal, RF-031 vista por cargos,
  RF-033 exportación, RF-035 comentarios, RF-037 alertas.
- Bloque D (Jest, RTL, CI) y Bloque E (despliegue).
- Los cabos sueltos Media: color-scheme, TareaHistorial (RF-018), paginación
  del historial del vecino, corregir una gestión registrada, y el alcance de
  GET /cumplimiento/:periodoId.
- Las 13 consultas abiertas: NO se responden por cuenta propia.

Reglas no negociables (están en CLAUDE.md, se repiten porque son las que más
se olvidan):
- Ningún valor de negocio en el código: todo sale de `parametro` o de
  `CatalogoItem`. Prohibido fijar 90/91 días.
- Datos ficticios sin excepción, también en diagramas y fichas (regla 12).
- Marco legal chileno: Ley 21.663 y Leyes 19.628 / 21.719. Finalidad,
  proporcionalidad y mínimo privilegio.
- Todo PATCH aplica bloqueo optimista con `version` → 409; todo write crítico
  audita; todo write emite su evento. Endpoint mudo = bug.
- Multi-tenant: toda query filtra por organizationId del JWT; recurso ajeno
  → 404, identificador mal formado → 400.
- Documentar al cerrar, en el archivo que corresponda. No dejarlo para el
  final.
- Flujo de git: rama por bloque → verificar en verde → documentar →
  git merge --no-ff → etiqueta anotada vX.Y.Z-<bloque> → push. En PowerShell,
  `git commit -F archivo.txt` y `git merge --no-commit` + `git commit -F`:
  los mensajes con here-string rompen ambos comandos. Y NUNCA editar
  documentación con Get-Content + Set-Content: corrompe los acentos.
- Nada de atribución de herramientas de IA en etiquetas, PR ni entregables.

Contexto que NO hay que volver a derivar (y que los diagramas viejos
contradicen, así que ojo al copiar de ellos):
- HAY UN SOLO CÁLCULO (Bloque C). `services/cumplimiento.ts` mide por
  FUNCIONARIO y `consolidarPeriodo()` lo agrega por delegación y por área del
  cargo. La vista materializada `cumplimiento_ponderado_vista`, la tabla
  `metas`, el modelo `Meta`, `/metas`, `/kpis/cumplimiento`,
  `/kpis/recalcular` y el cron SE ELIMINARON. `GET /kpis/tubo` se queda.
- Los umbrales del semáforo son 100% y 60% del OBJETIVO AL DÍA, y salen de
  `parametro`. Nunca fueron "verde ≥80, amarillo 50-79, rojo <50": eso está
  en docs/diagramas.md y está mal.
- La delegación es el PROMEDIO SIMPLE de sus funcionarios, y una sin nadie con
  metas NO cumple 0%: no tiene medición (ADR-014). La Pampa está así A
  PROPÓSITO en el seed.
- EL PANEL DE ACTIVIDAD ACOMPAÑA, NO VIGILA (ADR-015). Cuenta lo REGISTRADO
  (no solo lo validado), solo entran admin y coordinador con el motivo escrito
  en el 403, la presencia de organización va por el room `org:<id>:central`,
  se muestra un punto de "está ahora" sin minutos acumulados, y abrirlo se
  audita. `apoyo.companias@sgr.demo` tiene metas y CERO actividades a
  propósito: es el caso que RF-030 pide demostrar. No "arreglarlo".
- Son SEIS actores (el PDF §3), no cuatro: el diagrama de casos de uso actual
  se quedó en Admin, Supervisor, Gerente y Usuario, y faltan el Verificador y
  el Usuario de consulta. Y el nombre técnico no es el municipal: `supervisor`
  se dice "Coordinador" y `gerente` se dice "Delegado".
- El modelo tiene 16 entidades: Organization, User, OrganizationMember,
  UnidadTerritorial, CategoriaGestion, Tarea, Periodo, Parametro, Cargo,
  ItemMedicion, MetaItem, PersonaUsuaria, Actividad, Evidencia, Validacion,
  AtencionSocial, Ausencia, Ajuste, CatalogoItem, TareaHistorial, Comentario
  y Auditoria. La fuente es backend/prisma/schema.prisma, no los diagramas.
- La identidad visual está cerrada (Bloques D0 y D1) y no se reabre.
- CA-04, CA-06, CA-08 y CA-09 están CERRADOS. EP-01 está COMPLETA.
- El alcance de los datos de un vecino es una decisión LEGAL: ADR-012 y
  ADR-013. No ampliarlo sin respuesta a la consulta nº 12.

Trabaja por artefacto y al cerrar cada uno dame un informe breve (qué se hizo,
qué falta, decisiones, riesgos) y espera aprobación.
```
